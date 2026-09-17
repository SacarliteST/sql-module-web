import { Alert, Badge, Button, Code, Drawer, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useGetStudentAttemptById } from '../../../api/sqlmodule/student/student';
import { AttemptScoringDetails } from '../../../entities/attempt/ui/AttemptScoringDetails';
import { formatStudentAttemptReason, formatStudentAttemptStatus } from '../../../shared/lib/student-display';
import { mapStudentApiError, StudentErrorAlert } from '../../student-errors';
import { StudentAttemptSnapshot } from './StudentAttemptSnapshot';

type Props = { attemptId: string | null; onClose: () => void };

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

export function StudentAttemptDetailsDrawer({ attemptId, onClose }: Props) {
  const query = useGetStudentAttemptById(attemptId ?? '', { query: { enabled: Boolean(attemptId), retry: false } });
  const response = query.data;
  const attempt = response?.status === 200 ? response.data : null;
  const errorView = query.isError
    ? mapStudentApiError(undefined, query.error)
    : response && response.status !== 200 ? mapStudentApiError(response.status, response.data) : null;

  return <Drawer opened={Boolean(attemptId)} position="right" size="lg" title="Моя попытка" onClose={onClose}>
    {query.isPending ? <Stack><Skeleton height={80} /><Skeleton height={220} /></Stack> : null}
    {errorView ? <StudentErrorAlert error={errorView} onRetry={() => void query.refetch()} /> : null}
    {attempt ? <Stack gap="md">
      <Stack gap={4}>
        <Title order={2} size="h4">{attempt.taskName || 'SQL-задание'}</Title>
        <Text c="dimmed" size="sm">{attempt.topicName || 'Тема не указана'}</Text>
      </Stack>
      <Group gap="xs">
        {!attempt.scoring && typeof attempt.isCorrect === 'boolean'
          ? <Badge color={attempt.isCorrect ? 'green' : 'red'} variant="light">{attempt.isCorrect ? 'Верно' : 'Неверно'}</Badge>
          : <Badge color="gray" variant="light">Без вердикта</Badge>}
        <Badge variant="outline">{formatStudentAttemptStatus(attempt.status)}</Badge>
        {attempt.reason ? <Badge color="gray" variant="light">{formatStudentAttemptReason(attempt.reason)}</Badge> : null}
      </Group>
      {attempt.scoring ? <AttemptScoringDetails scoring={attempt.scoring} /> : null}
      <Text size="sm">Начало: {formatDate(attempt.startedAt)}</Text>
      {attempt.finishedAt ? <Text size="sm">Завершение: {formatDate(attempt.finishedAt)}</Text> : null}
      <Group gap="xs">
        {attempt.rowCount !== null && attempt.rowCount !== undefined ? <Badge color="gray" variant="outline">Обработано строк: {attempt.rowCount}</Badge> : null}
        {attempt.durationMs !== null && attempt.durationMs !== undefined ? <Badge color="gray" variant="outline">{attempt.durationMs} мс</Badge> : null}
      </Group>
      <Stack gap="xs"><Title order={3} size="h5">Отправленный SQL</Title><Code block>{attempt.submittedSql || 'SQL не сохранён'}</Code></Stack>
      {attempt.publicError ? <Alert color="red" title="Ошибка выполнения">{attempt.publicError}</Alert> : null}
      <StudentAttemptSnapshot
        actualColumns={attempt.actualColumns}
        actualRows={attempt.actualRows}
        isResultTruncated={attempt.isResultTruncated}
        resultRowLimit={attempt.resultRowLimit}
        resultSnapshotExpiresAt={attempt.resultSnapshotExpiresAt}
        resultSnapshotState={attempt.resultSnapshotState}
        returnedRowCount={attempt.returnedRowCount}
      />
      {attempt.taskId ? <Button component={Link} to={`/student/tasks/${attempt.taskId}`} state={{ initialSql: attempt.submittedSql ?? '', sourceAttemptId: attempt.id }}>Подставить SQL и открыть задание</Button> : null}
    </Stack> : null}
  </Drawer>;
}
