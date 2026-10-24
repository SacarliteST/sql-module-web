import { Button, Stack, Text } from '@mantine/core';
import { useRef, useState } from 'react';
import type { SessionFinalizationResponse, StudentSessionStateResponse } from '../../../api/sqlmodule/model';
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
  const [confirmOpened, setConfirmOpened] = useState(false);
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

  const finalize = async () => {
    if (mutation.isPending) return;
    const key = pendingKey.current ?? crypto.randomUUID();
    pendingKey.current = key;
    setConfirmOpened(false);
    setError('');
    try {
      const response = await mutation.mutateAsync({ headers: { 'Idempotency-Key': key } });
      if (response.status !== 200) {
        pendingKey.current = null;
        if (response.status === 409 || response.status === 422) onFinalized();
        setError(mapStudentApiError(response.status, response.data));
        return;
      }
      pendingKey.current = null;
      setResult(response.data);
      onFinalized();
      if (response.data.canReturnToEducation) await returnToEducation(response.data);
    } catch {
      setError('Ответ сервера неизвестен. Повторите завершение: будет использован тот же ключ операции.');
    }
  };

  const passed = session.bestScore >= passingScore;
  const confirmMessage = passed
    ? `Лучший результат: ${session.bestScore} из 100. Использовано попыток: ${session.attemptsUsed}. Результат будет передан в Scoodle.`
    : `Лучший результат: ${session.bestScore} из 100. Проходной балл: ${passingScore}. Осталось попыток: ${session.attemptsRemaining ?? 'без ограничения'}. После завершения отправлять решения будет нельзя.`;

  return <Stack align="flex-end" gap="xs">
    {(session.canFinalize || isFinal) ? <Button loading={mutation.isPending} onClick={() => isFinal ? void finalize() : setConfirmOpened(true)}>
      {isFinal ? 'Получить итог и вернуться' : 'Завершить задание'}
    </Button> : null}
    {result && !result.canReturnToEducation ? <Text c="orange" size="xs">Задание завершено. Результат ожидает передачи платформе.</Text> : null}
    {error ? typeof error === 'string' ? <Text c="red" size="xs">{error}</Text> : <StudentErrorAlert error={error} /> : null}
    <ConfirmModal
      opened={confirmOpened}
      title={passed ? 'Завершить задание?' : 'Завершить задание досрочно?'}
      message={confirmMessage}
      confirmLabel={passed ? 'Завершить и вернуться' : `Завершить с результатом ${session.bestScore}`}
      confirmColor={passed ? 'blue' : 'orange'}
      loading={mutation.isPending}
      onCancel={() => setConfirmOpened(false)}
      onConfirm={() => void finalize()}
    />
  </Stack>;
}
