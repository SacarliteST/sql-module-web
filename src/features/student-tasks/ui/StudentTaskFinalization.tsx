import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { useRef, useState } from 'react';
import type { ProgressFinalizationResponse, StudentTaskProgressResponse } from '../../../api/sqlmodule/model';
import { useFinalizeCurrentModuleSession } from '../../../api/sqlmodule/module-integration/module-integration';
import { useFinalizeStudentTaskProgress } from '../../../api/sqlmodule/student/student';
import { getProgressStatusLabel } from '../../../entities/sql-task';
import { clearActiveLaunchContext, clearActiveTokens, getActiveLaunchContext, resetActiveTokenProvider, useSessionStore } from '../../../session';
import { ConfirmModal } from '../../../shared/ui';
import { mapStudentApiError, StudentErrorAlert, type StudentErrorView } from '../../student-errors';

type Props = { taskId: string; progress: StudentTaskProgressResponse; passingScore: number; isPlatformSession: boolean; onFinalized: () => void };

export function StudentTaskFinalization({ taskId, progress, passingScore, isPlatformSession, onFinalized }: Props) {
  const standalone = useFinalizeStudentTaskProgress();
  const platform = useFinalizeCurrentModuleSession();
  const pendingKey = useRef<string | null>(null);
  const [confirmOpened, setConfirmOpened] = useState(false);
  const [result, setResult] = useState<ProgressFinalizationResponse | null>(null);
  const [error, setError] = useState<StudentErrorView | string>('');
  const busy = standalone.isPending || platform.isPending;
  const isFinal = progress.status === 'Completed' || progress.status === 'Expired' || progress.status === 'CompletionPending' || progress.status === 'CompletionFailed';

  const finalize = async () => {
    if (busy) return;
    const key = pendingKey.current ?? crypto.randomUUID();
    pendingKey.current = key;
    setConfirmOpened(false);
    setError('');
    try {
      const response = isPlatformSession
        ? await platform.mutateAsync({ headers: { 'Idempotency-Key': key } })
        : await standalone.mutateAsync({ taskId, headers: { 'Idempotency-Key': key } });
      if (response.status !== 200) {
        pendingKey.current = null;
        if (response.status === 409 || response.status === 422) onFinalized();
        setError(mapStudentApiError(response.status, response.data));
        return;
      }
      pendingKey.current = null;
      setResult(response.data);
      onFinalized();
    } catch {
      setError('Ответ сервера неизвестен. Повторите завершение: будет использован тот же ключ операции.');
    }
  };

  const requestFinalization = () => {
    if (!isFinal && progress.bestScore < passingScore && progress.canSubmit) setConfirmOpened(true);
    else void finalize();
  };

  const returnToEducation = async () => {
    if (!isPlatformSession || !result?.canReturnToEducation) return;
    const context = getActiveLaunchContext();
    if (!context || !result.returnUrl || result.returnUrl !== context.returnUrl) {
      setError('Адрес возврата не совпадает с адресом исходной сессии. Не перенаправляем автоматически.');
      return;
    }
    await clearActiveTokens();
    clearActiveLaunchContext();
    useSessionStore.getState().clearSession();
    resetActiveTokenProvider();
    window.location.assign(context.returnUrl);
  };

  return <Stack gap="sm">
    {isFinal ? <Alert color={progress.status === 'CompletionFailed' ? 'red' : 'blue'}>Прохождение: {getProgressStatusLabel(progress.status)}. Итог: {progress.finalScore ?? progress.bestScore} из 100.</Alert> : null}
    {progress.status === 'Finalizing' ? <Text size="sm">Сервер завершает прохождение. Обновите состояние перед повтором.</Text> : null}
    {result ? <Alert color={result.isPassed ? 'green' : 'yellow'}>Итог подтверждён сервером: {result.finalScore} из 100. {result.isPassed ? 'Порог пройден.' : 'Порог не достигнут.'}</Alert> : null}
    {result?.status === 'CompletionPending' ? <Text size="sm">Результат ожидает передачи платформе.</Text> : null}
    {error ? typeof error === 'string' ? <Alert color="red">{error}</Alert> : <StudentErrorAlert error={error} /> : null}
    <Group>
      {(progress.canFinalize || (isPlatformSession && isFinal)) ? <Button loading={busy} onClick={requestFinalization}>{isFinal ? 'Проверить итог' : 'Завершить прохождение'}</Button> : null}
      {(progress.status === 'Finalizing' || progress.status === 'CompletionPending' || progress.status === 'CompletionFailed') ? <Button variant="default" onClick={onFinalized}>Обновить состояние</Button> : null}
      {isPlatformSession && result?.canReturnToEducation ? <Button variant="default" onClick={() => void returnToEducation()}>Вернуться на платформу</Button> : null}
    </Group>
    <ConfirmModal opened={confirmOpened} title="Завершить прохождение досрочно?" message={`Лучший балл ${progress.bestScore} из 100 ниже проходного (${passingScore}). Оставшиеся попытки станут недоступны; итогом будет лучший балл.`} confirmLabel="Завершить" confirmColor="blue" loading={busy} onCancel={() => setConfirmOpened(false)} onConfirm={() => void finalize()} />
  </Stack>;
}
