import { Alert, Badge, Button, Group, List, Stack, Text, Title } from '@mantine/core';
import { useRef, useState } from 'react';
import { HintGroup, type StudentTaskValidationResponse } from '../../../api/sqlmodule/model';
import { useRestartStudentTaskProgress, useStartStudentTaskProgress } from '../../../api/sqlmodule/student/student';
import { getFinalizationReasonLabel, getProgressStatusLabel, getSqlConstructLabel } from '../../../entities/sql-task';
import { AppCard, ConfirmModal } from '../../../shared/ui';
import { mapStudentApiError, StudentErrorAlert, type StudentErrorView } from '../../student-errors';

type Props = {
  taskId: string;
  validation: StudentTaskValidationResponse | null;
  isPlatformSession: boolean;
  onStarted: () => void;
};

export function StudentTaskValidation({ taskId, validation, isPlatformSession, onStarted }: Props) {
  const startMutation = useStartStudentTaskProgress();
  const restartMutation = useRestartStudentTaskProgress();
  const pendingKey = useRef<string | null>(null);
  const restartKey = useRef<string | null>(null);
  const [error, setError] = useState<StudentErrorView | string | null>(null);
  const [restartOpened, setRestartOpened] = useState(false);

  if (!validation) return null;

  const { hints, progress } = validation;
  const canRestart = Boolean(progress && !progress.canSubmit && (progress.status === 'Completed' || progress.status === 'Expired' || progress.attemptsRemaining === 0));
  const groups = new Set(hints.groups);
  const start = async () => {
    if (isPlatformSession || startMutation.isPending) return;
    const key = pendingKey.current ?? crypto.randomUUID();
    pendingKey.current = key;
    setError('');
    try {
      const response = await startMutation.mutateAsync({ taskId, headers: { 'Idempotency-Key': key } });
      if (response.status !== 200) {
        pendingKey.current = null;
        if (response.status === 409 || response.status === 422) onStarted();
        setError(mapStudentApiError(response.status, response.data));
        return;
      }
      pendingKey.current = null;
      onStarted();
    } catch {
      setError('Ответ сервера не получен. Повтор использует тот же ключ и не создаст второе прохождение.');
    }
  };
  const restart = async () => {
    if (isPlatformSession || restartMutation.isPending) return;
    const key = restartKey.current ?? crypto.randomUUID();
    restartKey.current = key;
    setError(null);
    try {
      const response = await restartMutation.mutateAsync({ taskId, headers: { 'Idempotency-Key': key } });
      if (response.status !== 200) {
        restartKey.current = null;
        if (response.status === 409 || response.status === 422) onStarted();
        setError(mapStudentApiError(response.status, response.data));
        return;
      }
      restartKey.current = null;
      setRestartOpened(false);
      onStarted();
    } catch {
      setError('Ответ сервера не получен. Повторите действие: тот же ключ не создаст два прохождения.');
    }
  };

  return <AppCard><Stack gap="md">
    <Group justify="space-between"><Title order={2} size="h4">Проверка и прохождение</Title>{progress ? <Badge color={progress.canSubmit ? 'blue' : 'gray'} variant="light">{getProgressStatusLabel(progress.status)}</Badge> : <Badge color="yellow" variant="light">Не начато</Badge>}</Group>
    <Group gap="lg"><Text size="sm">Проходной балл: <strong>{validation.passingScore} из 100</strong></Text><Text size="sm">Лучший балл: <strong>{progress?.bestScore ?? 0} из 100</strong></Text><Text size="sm">Попытки: <strong>{progress?.attemptsUsed ?? 0}{validation.maxAttempts === null ? ' использовано, без лимита' : ` из ${validation.maxAttempts} использовано`}</strong></Text></Group>
    {progress ? <Text size="sm">Осталось попыток: {progress.attemptsRemaining ?? 'без лимита'}{progress.isPassed ? ' · Проходной балл достигнут' : ''}</Text> : null}
    {progress?.finalizationReason ? <Text size="sm">Причина завершения: {getFinalizationReasonLabel(progress.finalizationReason)}</Text> : null}
    {!progress && isPlatformSession ? <Alert color="yellow">Платформенное прохождение не найдено. Обновите страницу или повторно откройте задание с платформы; standalone-прохождение здесь не создаётся.</Alert> : null}
    {!progress && !isPlatformSession ? <Button loading={startMutation.isPending} onClick={() => void start()}>Начать прохождение</Button> : null}
    {progress && !progress.canSubmit ? <Alert color="yellow">Отправка SQL сейчас недоступна для этого прохождения.</Alert> : null}
    {canRestart && !isPlatformSession ? <Button variant="default" onClick={() => setRestartOpened(true)}>Начать заново</Button> : null}
    {error ? typeof error === 'string' ? <Alert color="red">{error}</Alert> : <StudentErrorAlert error={error} /> : null}
    {groups.size > 0 ? <Stack gap="xs"><Text fw={600}>Подсказки преподавателя</Text><List spacing="xs" size="sm">
      {groups.has(HintGroup.Result) ? <List.Item>Результат сравнивается с эталоном на основной учебной базе.</List.Item> : null}
      {groups.has(HintGroup.RequiredConstructs) && hints.requiredConstructs.length ? <List.Item>Используйте: {hints.requiredConstructs.map(getSqlConstructLabel).join(', ')}.</List.Item> : null}
      {groups.has(HintGroup.ForbiddenConstructs) && hints.forbiddenConstructs.length ? <List.Item>Не используйте: {hints.forbiddenConstructs.map(getSqlConstructLabel).join(', ')}.</List.Item> : null}
      {groups.has(HintGroup.RequiredTables) && hints.requiredTables.length ? <List.Item>Нужные таблицы: {hints.requiredTables.map((table) => table.name).join(', ')}.</List.Item> : null}
      {groups.has(HintGroup.ForbiddenTables) && hints.forbiddenTables.length ? <List.Item>Не используйте таблицы: {hints.forbiddenTables.map((table) => table.name).join(', ')}.</List.Item> : null}
    </List></Stack> : <Text size="sm" c="dimmed">Подсказки к способу решения скрыты преподавателем.</Text>}
    <ConfirmModal opened={restartOpened} title="Начать новое прохождение?" message="Новое прохождение использует актуальную версию проверки. Старые попытки и результат останутся в истории. Текущий SQL-черновик сохранится на этом устройстве." confirmLabel="Начать заново" confirmColor="blue" loading={restartMutation.isPending} onCancel={() => setRestartOpened(false)} onConfirm={() => void restart()} />
  </Stack></AppCard>;
}
