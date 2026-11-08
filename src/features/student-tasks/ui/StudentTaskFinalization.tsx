import { Button, Stack, Text } from '@mantine/core';
import { useRef, useState } from 'react';
import {
  LearningEpisodeFinalizationMode,
  type LearningEpisodeFinalizationMode as FinalizationMode,
  type SessionFinalizationResponse,
  type StudentSessionStateResponse,
} from '../../../api/sqlmodule/model';
import { useFinalizeCurrentModuleSession } from '../../../api/sqlmodule/module-integration/module-integration';
import { clearActiveLaunchContext, clearActiveTokens, getActiveLaunchContext, resetActiveTokenProvider, useSessionStore } from '../../../session';
import { ConfirmModal } from '../../../shared/ui';
import { mapStudentApiError, StudentErrorAlert, type StudentErrorView } from '../../student-errors';

type Props = {
  session: StudentSessionStateResponse;
  passingScore: number;
  onFinalized: () => void;
};

export function StudentTaskFinalization({ session, passingScore, onFinalized }: Props) {
  const mutation = useFinalizeCurrentModuleSession();
  const pendingKey = useRef<string | null>(null);
  const pendingMode = useRef<FinalizationMode | null>(null);
  const [confirmationMode, setConfirmationMode] = useState<FinalizationMode | null>(null);
  const [result, setResult] = useState<SessionFinalizationResponse | null>(null);
  const [error, setError] = useState<StudentErrorView | string>('');
  const isFinal = session.status !== 'Active';

  const returnToEducation = async (finalizationResult: SessionFinalizationResponse | null = result) => {
    if (!finalizationResult?.canReturnToEducation) return;
    const context = getActiveLaunchContext();
    if (!context || !finalizationResult.returnUrl || finalizationResult.returnUrl !== context.returnUrl) {
      setError('Адрес возврата не совпадает с адресом исходной сессии. Не перенаправляем автоматически.');
      return;
    }
    await clearActiveTokens();
    clearActiveLaunchContext();
    useSessionStore.getState().clearSession();
    resetActiveTokenProvider();
    window.location.assign(context.returnUrl);
  };

  const finalize = async (mode: FinalizationMode) => {
    if (mutation.isPending) return;
    const canReuseKey = pendingMode.current === mode && pendingKey.current;
    const key = canReuseKey ? pendingKey.current! : crypto.randomUUID();
    pendingKey.current = key;
    pendingMode.current = mode;
    setConfirmationMode(null);
    setError('');
    try {
      const response = await mutation.mutateAsync({
        data: { mode },
        headers: { 'Idempotency-Key': key },
      });
      if (response.status !== 200) {
        pendingKey.current = null;
        pendingMode.current = null;
        if (response.status === 409 || response.status === 422) onFinalized();
        setError(mapStudentApiError(response.status, response.data));
        return;
      }
      pendingKey.current = null;
      pendingMode.current = null;
      setResult(response.data);
      onFinalized();
      if (response.data.canReturnToEducation) await returnToEducation(response.data);
    } catch {
      setError('Ответ сервера неизвестен. Повторите завершение: будет использован тот же ключ операции.');
    }
  };

  const isAccepting = confirmationMode === LearningEpisodeFinalizationMode.AcceptPartialResult;
  const confirmMessage = isAccepting
    ? `Лучший результат: ${session.bestScore} из 100. Проходной балл: ${passingScore}. После завершения отправлять решения будет нельзя.`
    : 'Текущий учебный эпизод будет завершён как неуспешный. Полученный результат не будет принят.';

  return <Stack align="flex-end" gap="xs">
    {isFinal ? <Button loading={mutation.isPending} onClick={() => void finalize(LearningEpisodeFinalizationMode.AcceptPartialResult)}>
      Получить итог и вернуться
    </Button> : null}
    {session.canFinalize && !isFinal ? <>
      {session.attemptsUsed > 0 ? <Button loading={mutation.isPending} onClick={() => setConfirmationMode(LearningEpisodeFinalizationMode.AcceptPartialResult)}>
        Завершить с лучшим результатом и вернуться
      </Button> : null}
      <Button color="red" loading={mutation.isPending} variant="light" onClick={() => setConfirmationMode(LearningEpisodeFinalizationMode.Abandon)}>
        Отказаться и вернуться
      </Button>
    </> : null}
    {result && !result.canReturnToEducation ? <Text c="orange" size="xs">Задание завершено. Результат ожидает передачи платформе.</Text> : null}
    {error ? typeof error === 'string' ? <Text c="red" size="xs">{error}</Text> : <StudentErrorAlert error={error} /> : null}
    <ConfirmModal
      opened={confirmationMode !== null}
      title={isAccepting ? 'Принять лучший результат?' : 'Отказаться от задания?'}
      message={confirmMessage}
      confirmLabel={isAccepting ? 'Завершить и вернуться' : 'Отказаться и вернуться'}
      confirmColor={isAccepting ? 'blue' : 'red'}
      loading={mutation.isPending}
      onCancel={() => setConfirmationMode(null)}
      onConfirm={() => confirmationMode && void finalize(confirmationMode)}
    />
  </Stack>;
}
