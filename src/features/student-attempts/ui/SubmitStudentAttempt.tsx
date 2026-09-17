import { Button, Stack, Text } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubmitAttemptResponse } from '../../../api/sqlmodule/model';
import { useSubmitAttempt } from '../../../api/sqlmodule/training/training';
import { mapStudentApiError, problemCode, StudentErrorAlert, type StudentErrorView } from '../../student-errors';

type SubmitStudentAttemptProps = {
  disabled?: boolean;
  maxSqlLength?: number;
  onSubmissionStart?: () => void;
  onResult: (result: SubmitAttemptResponse) => void;
  onStateChanged?: () => void;
  progressId?: string | null;
  sql: string;
  taskId: string;
};

type PendingSubmission = {
  idempotencyKey: string;
  sql: string;
  taskId: string;
  progressId?: string | null;
};

export function SubmitStudentAttempt({ disabled = false, maxSqlLength, onResult, onStateChanged, onSubmissionStart, progressId, sql, taskId }: SubmitStudentAttemptProps) {
  const queryClient = useQueryClient();
  const abortController = useMemo(() => new AbortController(), [taskId]);
  const mutation = useSubmitAttempt({ request: { signal: abortController.signal } });
  const submissionLock = useRef(false);
  const pendingSubmission = useRef<PendingSubmission | null>(null);
  const [hasUncertainSubmission, setHasUncertainSubmission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<StudentErrorView | null>(null);
  const normalizedSql = sql.trim();
  const tooLong = typeof maxSqlLength === 'number' && sql.length > maxSqlLength;

  useEffect(() => () => abortController.abort(), [abortController]);
  useEffect(() => {
    pendingSubmission.current = null;
    setHasUncertainSubmission(false);
    setMessage(null);
  }, [sql, taskId, progressId]);

  const submit = async () => {
    if (submissionLock.current || disabled || !normalizedSql || tooLong) return;
    submissionLock.current = true;
    setSubmitting(true);
    setMessage(null);
    setHasUncertainSubmission(false);
    onSubmissionStart?.();
    try {
      const previous = pendingSubmission.current;
      const idempotencyKey = previous?.sql === sql && previous.taskId === taskId && previous.progressId === progressId
        ? previous.idempotencyKey
        : crypto.randomUUID();
      pendingSubmission.current = { idempotencyKey, sql, taskId, progressId };
      const response = await mutation.mutateAsync({
        data: { taskId, submittedSql: sql },
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      if (response.status !== 201) {
        const code = problemCode(response.data);
        if (response.status === 409 && code === 'IdempotencyRequestInProgress') {
          setHasUncertainSubmission(true);
          setMessage(mapStudentApiError(response.status, response.data));
          return;
        }
        if (response.status === 503 || response.status === 500) {
          setHasUncertainSubmission(true);
          setMessage({ ...mapStudentApiError(response.status, response.data), canRetry: false, message: 'Проверка временно недоступна. Эта попытка не подтверждена. Повторите неизменённый SQL — будет использован тот же ключ отправки.' });
          return;
        }
        pendingSubmission.current = null;
        if (response.status === 409 || response.status === 422) onStateChanged?.();
        if (response.status === 409 && code === 'IdempotencyKeyPayloadMismatch') {
          setMessage({ canRetry: false, color: 'red', status: 409, title: 'Конфликт отправки', message: 'Состав решения изменился. Повторите отправку — для неё будет создан новый ключ.' });
          return;
        }
        if (response.status === 400 && code === 'InvalidIdempotencyKey') {
          setMessage({ canRetry: false, color: 'red', status: 400, title: 'Не удалось идентифицировать отправку', message: 'Обновите страницу и повторите отправку решения.' });
          return;
        }
        setMessage(mapStudentApiError(response.status, response.data));
        return;
      }
      pendingSubmission.current = null;
      onResult(response.data);
      await queryClient.invalidateQueries({ queryKey: ['/api/v1/student/attempts'] });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setHasUncertainSubmission(true);
      setMessage({ ...mapStudentApiError(undefined, error), canRetry: false, title: 'Результат отправки неизвестен', message: 'Связь с сервером прервалась. Проверьте историю или повторите неизменённое решение: повтор использует тот же ключ и не создаст дубликат.' });
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return <Stack gap="xs">
    {!normalizedSql ? <Text c="dimmed" size="sm">Введите SQL-запрос, чтобы отправить решение.</Text> : null}
    {tooLong ? <Text c="red" size="sm">Сократите запрос до {maxSqlLength} символов.</Text> : null}
    {message ? <StudentErrorAlert error={message} /> : null}
    <Button
      disabled={disabled || !normalizedSql || tooLong}
      loading={submitting}
      onClick={() => void submit()}
    >{submitting ? 'Запрос выполняется' : hasUncertainSubmission ? 'Повторить отправку безопасно' : 'Отправить решение'}</Button>
  </Stack>;
}
