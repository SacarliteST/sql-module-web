import { Alert, Badge, Button, Divider, Grid, Group, List, Skeleton, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { SubmitAttemptResponse } from '../../api/sqlmodule/model';
import { useGetStudentTaskById } from '../../api/sqlmodule/student/student';
import { SqlCodeEditor } from '../../features/sql-tasks';
import { RecentStudentAttempts, StudentAttemptResult, SubmitStudentAttempt } from '../../features/student-attempts';
import { StudentContourTabs } from '../../features/student-contour';
import { useStudentSqlDraft } from '../../features/student-drafts';
import { mapStudentApiError, StudentErrorAlert, type StudentErrorView } from '../../features/student-errors';
import { StudentTaskSchema } from '../../features/student-schema';
import {
  clearActiveLaunchContext,
  clearActiveTokens,
  getActiveLaunchContext,
  resetActiveTokenProvider,
  useSessionStore,
} from '../../session';
import { formatStudentDifficulty } from '../../shared/lib/student-display';
import { AppCard, ConfirmModal, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

const MAX_TRANSFERRED_SQL_LENGTH = 50_000;

type SqlTransfer = { sourceAttemptId: string; sql: string; taskId: string };
type TransferStatus = { kind: 'applied' | 'cancelled' | 'invalid'; taskId: string };

function parseSqlTransfer(value: unknown, taskId: string): { kind: 'none' } | { kind: 'invalid' } | { kind: 'valid'; transfer: SqlTransfer } {
  if (typeof value !== 'object' || value === null) return { kind: 'none' };
  if (!('initialSql' in value) && !('sourceAttemptId' in value)) return { kind: 'none' };
  const initialSql = 'initialSql' in value ? value.initialSql : undefined;
  const sourceAttemptId = 'sourceAttemptId' in value ? value.sourceAttemptId : undefined;
  if (typeof initialSql !== 'string' || !initialSql.trim() || initialSql.length > MAX_TRANSFERRED_SQL_LENGTH) return { kind: 'invalid' };
  if (typeof sourceAttemptId !== 'string' || !sourceAttemptId.trim()) return { kind: 'invalid' };
  return { kind: 'valid', transfer: { sourceAttemptId, sql: initialSql, taskId } };
}

function StudentTaskLoading() {
  return <Page><Stack gap="lg">
    <Skeleton height={20} width={280} />
    <Skeleton height={72} radius="sm" />
    <Grid>
      <Grid.Col span={{ base: 12, md: 8 }}><Skeleton height={260} radius="sm" /></Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}><Skeleton height={260} radius="sm" /></Grid.Col>
    </Grid>
  </Stack></Page>;
}

type TaskUnavailableProps = { catalogUrl: string; error: StudentErrorView; retry: () => void };

function TaskUnavailable({ catalogUrl, error, retry }: TaskUnavailableProps) {
  return <Page><Stack gap="md">
    <StudentErrorAlert error={error} onRetry={error.canRetry ? retry : undefined} />
    <Group>{error.status === 401 ? <Button component={Link} to="/login">Войти</Button> : null}<Button component={Link} to={catalogUrl} variant="default">Вернуться в каталог</Button></Group>
  </Stack></Page>;
}

export function StudentTaskPage() {
  const { taskId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const catalogSearch = searchParams.toString();
  const catalogUrl = `/student/tasks${catalogSearch ? `?${catalogSearch}` : ''}`;
  const transferState = parseSqlTransfer(location.state, taskId);
  const studentId = useSessionStore((state) => state.user?.id);
  const clearSession = useSessionStore((state) => state.clearSession);
  const draft = useStudentSqlDraft({ studentId, taskId });
  const consumedLocationKey = useRef<string | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<SqlTransfer | null>(null);
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null);
  const [transferConfirmOpened, transferConfirm] = useDisclosure(false);
  const [lastAttempt, setLastAttempt] = useState<SubmitAttemptResponse | null>(null);
  const query = useGetStudentTaskById(taskId, { query: { enabled: Boolean(taskId), retry: false } });
  const response = query.data;
  const taskError = query.isError
    ? mapStudentApiError(undefined, query.error)
    : response && response.status !== 200 ? mapStudentApiError(response.status, response.data) : !response && !query.isPending ? mapStudentApiError() : null;

  useEffect(() => setLastAttempt(null), [taskId]);
  useEffect(() => {
    if (transferState.kind === 'none' || query.isPending || consumedLocationKey.current === location.key) return;
    consumedLocationKey.current = location.key;
    void navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null });

    if (transferState.kind === 'invalid') {
      setTransferStatus({ kind: 'invalid', taskId });
      return;
    }
    if (response?.status !== 200) {
      setTransferStatus({ kind: 'invalid', taskId });
      return;
    }

    const transfer = transferState.transfer;
    if (draft.value.trim() && draft.value !== transfer.sql) {
      setPendingTransfer(transfer);
      transferConfirm.open();
      return;
    }
    draft.setValue(transfer.sql);
    setTransferStatus({ kind: 'applied', taskId });
  }, [draft.setValue, draft.value, location.hash, location.key, location.pathname, location.search, navigate, query.isPending, response, taskId, transferConfirm, transferState]);

  const confirmTransfer = () => {
    if (pendingTransfer?.taskId === taskId) {
      draft.setValue(pendingTransfer.sql);
      setTransferStatus({ kind: 'applied', taskId });
    }
    setPendingTransfer(null);
    transferConfirm.close();
  };
  const cancelTransfer = () => {
    setPendingTransfer(null);
    setTransferStatus({ kind: 'cancelled', taskId });
    transferConfirm.close();
  };

  const handleAttemptResult = async (result: SubmitAttemptResponse) => {
    setLastAttempt(result);

    if (!result.isCorrect) return;

    const launchContext = getActiveLaunchContext();
    if (!launchContext) return;

    clearActiveLaunchContext();
    await clearActiveTokens();
    clearSession();
    resetActiveTokenProvider();
    window.location.assign(launchContext.returnUrl);
  };

  if (query.isPending) return <StudentTaskLoading />;
  if (taskError) return <TaskUnavailable catalogUrl={catalogUrl} error={taskError} retry={() => void query.refetch()} />;
  if (!response || response.status !== 200) return null;

  const task = response.data;
  const limits = task.executionLimits;

  return <Page><Stack gap="lg">
    <PageBreadcrumbs items={[
      { label: 'Главная', to: '/' },
      { label: 'Студент', to: '/student' },
      { label: 'Задания', to: catalogUrl },
      { label: task.taskName || 'Задание' },
    ]} />
    <PageHeader
      title={task.taskName || 'SQL-задание'}
      description="Изучите условие, подготовьте read-only SQL-запрос и отправьте его на проверку."
      actions={<Button component={Link} to={catalogUrl} variant="default">Назад к каталогу</Button>}
    />
    <StudentContourTabs />
    {transferStatus?.taskId === taskId && transferStatus.kind === 'applied' ? <Alert color="blue" title="SQL загружен из истории">Текст выбранной попытки подставлен один раз. Reload не заменит более свежий черновик.</Alert> : null}
    {transferStatus?.taskId === taskId && transferStatus.kind === 'cancelled' ? <Alert color="yellow" title="Перенос отменён">Текущий черновик оставлен без изменений.</Alert> : null}
    {transferStatus?.taskId === taskId && transferStatus.kind === 'invalid' ? <Alert color="yellow" title="SQL не перенесён">Данные перехода из истории устарели или имеют неверный формат.</Alert> : null}
    {draft.restored ? <Alert color="blue" title="Черновик восстановлен">Локальный SQL-черновик этого задания восстановлен для текущего студента.</Alert> : null}
    {draft.storageError ? <Alert color="yellow" title="Черновик не сохраняется">{draft.storageError}</Alert> : null}
    <Group gap="xs">
      {task.topicName ? <Badge variant="light">{task.topicName}</Badge> : null}
      {task.difficultyLevel ? <Badge color="orange" variant="light">{formatStudentDifficulty(task.difficultyLevel)}</Badge> : null}
      {task.dbmsName ? <Badge color="gray" variant="outline">{task.dbmsName}</Badge> : null}
    </Group>
    <Grid align="stretch">
      <Grid.Col span={{ base: 12, md: 8 }}><AppCard h="100%"><Stack gap="md">
        <Title order={2} size="h4">Условие</Title><Divider />
        <Text style={{ whiteSpace: 'pre-wrap' }}>{task.taskText || 'Условие задания не указано.'}</Text>
      </Stack></AppCard></Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}><AppCard h="100%"><Stack gap="md">
        <Title order={2} size="h4">Правила выполнения</Title>
        <List spacing="xs" size="sm">
          <List.Item>Используйте один read-only SQL-запрос.</List.Item>
          <List.Item>Изменение схемы и учебных данных недоступно.</List.Item>
          {limits?.timeoutSeconds ? <List.Item>Лимит времени: {limits.timeoutSeconds} сек.</List.Item> : null}
          {limits?.maxRows ? <List.Item>В результате проверяется до {limits.maxRows} строк.</List.Item> : null}
          {limits?.maxSqlLength ? <List.Item>Максимальная длина SQL: {limits.maxSqlLength} символов.</List.Item> : null}
        </List>
        {!limits ? <Text c="dimmed" size="sm">Дополнительные серверные лимиты не указаны.</Text> : null}
      </Stack></AppCard></Grid.Col>
    </Grid>
    <StudentTaskSchema taskId={taskId} />
    <Grid>
      <Grid.Col span={{ base: 12, md: 7 }}><AppCard h="100%"><Stack gap="md">
        <SqlCodeEditor
          ariaLabel="SQL-решение задания"
          description="Напишите read-only SQL. Shift+Alt+F — форматирование, Ctrl+F — поиск. Проверка выполняется на сервере."
          label="Ваше решение"
          maxLength={limits?.maxSqlLength}
          onChange={draft.setValue}
          required
          value={draft.value}
        />
        <Text aria-live="polite" c={draft.status === 'error' ? 'red' : 'dimmed'} role="status" size="xs">
          {draft.status === 'saving' ? 'Сохранение черновика…' : draft.status === 'saved' ? 'Черновик сохранён локально' : 'Черновик сохраняется только на этом устройстве'}
        </Text>
        <Divider />
        <SubmitStudentAttempt
          maxSqlLength={limits?.maxSqlLength}
          onSubmissionStart={() => setLastAttempt(null)}
          onResult={(result) => void handleAttemptResult(result)}
          sql={draft.value}
          taskId={taskId}
        />
      </Stack></AppCard></Grid.Col>
      <Grid.Col span={{ base: 12, md: 5 }}><AppCard h="100%">{lastAttempt
        ? <StudentAttemptResult result={lastAttempt} />
        : <EmptyState title="Результат проверки" description="Здесь появится безопасный вердикт и фактический результат после отправки решения." />}
      </AppCard></Grid.Col>
    </Grid>
    <AppCard><RecentStudentAttempts currentSql={draft.value} onUseSql={draft.setValue} taskId={taskId} /></AppCard>
    <ConfirmModal
      confirmColor="blue"
      confirmLabel="Подставить"
      message="Сохранённый локальный черновик будет заменён SQL выбранной попытки. После выбора перенос нельзя повторить через reload."
      opened={transferConfirmOpened}
      title="Заменить текущий черновик?"
      onCancel={cancelTransfer}
      onConfirm={confirmTransfer}
    />
  </Stack></Page>;
}
