import { Button, Stack, Text } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SubmitAttemptResponse } from '../../../api/sqlmodule/model';
import { useSubmitAttempt } from '../../../api/sqlmodule/training/training';
import { mapStudentApiError, StudentErrorAlert, type StudentErrorView } from '../../student-errors';

type SubmitStudentAttemptProps = {
  maxSqlLength?: number;
  onSubmissionStart?: () => void;
  onResult: (result: SubmitAttemptResponse) => void;
  sql: string;
  taskId: string;
};

type PendingSubmission = {
  idempotencyKey: string;
  sql: string;
  taskId: string;
};

function problemCode(value: unknown) {
  if (typeof value !== 'object' || value === null || !('code' in value)) return undefined;
  return typeof value.code === 'string' ? value.code : undefined;
}

export function SubmitStudentAttempt({ maxSqlLength, onResult, onSubmissionStart, sql, taskId }: SubmitStudentAttemptProps) {
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
  }, [sql, taskId]);

  const submit = async () => {
    if (submissionLock.current || !normalizedSql || tooLong) return;
    submissionLock.current = true;
    setSubmitting(true);
    setMessage(null);
    setHasUncertainSubmission(false);
    onSubmissionStart?.();
    try {
      const previous = pendingSubmission.current;
      const idempotencyKey = previous?.sql === sql && previous.taskId === taskId
        ? previous.idempotencyKey
        : crypto.randomUUID();
      pendingSubmission.current = { idempotencyKey, sql, taskId };
      const response = await mutation.mutateAsync({
        data: { taskId, submittedSql: sql },
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      pendingSubmission.current = null;
      if (response.status !== 201) {
        const code = problemCode(response.data);
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
      disabled={!normalizedSql || tooLong}
      loading={submitting}
      onClick={() => void submit()}
    >{submitting ? 'Запрос выполняется' : hasUncertainSubmission ? 'Повторить отправку безопасно' : 'Отправить решение'}</Button>
  </Stack>;
}
