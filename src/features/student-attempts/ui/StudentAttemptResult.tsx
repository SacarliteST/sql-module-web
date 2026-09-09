import { Alert, Badge, Group, Stack } from '@mantine/core';
import type { SubmitAttemptResponse } from '../../../api/sqlmodule/model';
import { SubmitAttemptResponseReason, SubmitAttemptResponseStatus } from '../../../api/sqlmodule/model';
import { formatStudentAttemptStatus } from '../../../shared/lib/student-display';
import { StudentAttemptSnapshot } from './StudentAttemptSnapshot';

type Verdict = { color: 'green' | 'red' | 'yellow'; description: string; title: string };

function verdictFor(result: SubmitAttemptResponse): Verdict {
  switch (result.reason) {
    case SubmitAttemptResponseReason.Ok:
      return { color: 'green', title: 'Решение верное', description: 'Результат запроса совпадает с ожидаемым.' };
    case SubmitAttemptResponseReason.ColumnMismatch:
      return { color: 'red', title: 'Неверный набор колонок', description: 'Набор или порядок колонок отличается.' };
    case SubmitAttemptResponseReason.RowCountMismatch:
      return { color: 'red', title: 'Неверное количество строк', description: 'Количество строк отличается.' };
    case SubmitAttemptResponseReason.ValueMismatch:
      return { color: 'red', title: 'Значения отличаются', description: 'Значения или порядок строк отличаются.' };
    case SubmitAttemptResponseReason.SqlError:
      return { color: 'red', title: 'Запрос не выполнен', description: result.publicError?.trim() || 'SQL-запрос завершился безопасной ошибкой.' };
    case SubmitAttemptResponseReason.Timeout:
      return { color: 'yellow', title: 'Превышен лимит времени', description: 'Запрос выполнялся дольше допустимого времени.' };
    case SubmitAttemptResponseReason.NotRun:
      return { color: 'yellow', title: 'Проверка не выполнена', description: 'Запрос не был запущен в учебной среде.' };
    case SubmitAttemptResponseReason.ResultLimitExceeded:
      return {
        color: 'yellow',
        title: 'Слишком большой результат',
        description: result.publicError?.trim() || 'Запрос вернул больше строк, чем разрешено для проверки. Уточните условие и ограничьте результат.',
      };
    default:
      return {
        color: 'yellow',
        title: 'Неизвестный результат проверки',
        description: 'Сервер вернул неподдерживаемый результат. Обновите страницу или обратитесь к преподавателю.',
      };
  }
}

function statusColor(result: SubmitAttemptResponse) {
  if (result.status === SubmitAttemptResponseStatus.TimedOut) return 'yellow';
  if (result.status === SubmitAttemptResponseStatus.Error) return 'red';
  return result.isCorrect ? 'green' : 'blue';
}

export function StudentAttemptResult({ result }: { result: SubmitAttemptResponse }) {
  const verdict = verdictFor(result);

  return <Stack gap="md">
    <Alert aria-live="polite" color={verdict.color} role="status" title={verdict.title}>{verdict.description}</Alert>
    <Group gap="xs">
      {typeof result.isCorrect === 'boolean'
        ? <Badge color={result.isCorrect ? 'green' : 'red'} variant="light">{result.isCorrect ? 'Верно' : 'Неверно'}</Badge>
        : <Badge color="gray" variant="light">Корректность не определена</Badge>}
      <Badge color={statusColor(result)} variant="light">Статус: {formatStudentAttemptStatus(result.status)}</Badge>
      {result.rowCount !== null && result.rowCount !== undefined ? <Badge color="gray" variant="outline">Обработано строк: {result.rowCount}</Badge> : null}
      {result.durationMs !== null && result.durationMs !== undefined ? <Badge color="gray" variant="outline">{result.durationMs} мс</Badge> : null}
    </Group>

    <StudentAttemptSnapshot
      actualColumns={result.actualColumns}
      actualRows={result.actualRows}
      isResultTruncated={result.isResultTruncated}
      resultRowLimit={result.resultRowLimit}
      resultSnapshotExpiresAt={result.resultSnapshotExpiresAt}
      resultSnapshotState={result.resultSnapshotState}
      returnedRowCount={result.returnedRowCount}
    />
  </Stack>;
}
