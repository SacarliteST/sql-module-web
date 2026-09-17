import { Alert, Badge, Group, Stack, Text } from '@mantine/core';
import type { SubmitAttemptResponse } from '../../../api/sqlmodule/model';
import { SubmitAttemptResponseReason, SubmitAttemptResponseStatus } from '../../../api/sqlmodule/model';
import { formatStudentAttemptStatus } from '../../../shared/lib/student-display';
import { getHintGroupLabel, getValidationCheckKindLabel, getValidationCheckStatusLabel } from '../../../entities/sql-task';
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
  if (result.score !== null) return result.isPassed ? 'green' : 'blue';
  return result.isCorrect ? 'green' : 'blue';
}

export function StudentAttemptResult({ result }: { result: SubmitAttemptResponse }) {
  const verdict = verdictFor(result);
  const hasScoring = result.score !== null && result.bestScore !== null && result.passingScore !== null;

  return <Stack gap="md">
    <Alert aria-live="polite" color={hasScoring ? result.isPassed ? 'green' : 'yellow' : verdict.color} role="status" title={hasScoring ? result.isPassed ? 'Проходной балл достигнут' : 'Попытка оценена' : verdict.title}>{hasScoring ? `Эта попытка: ${result.score} из 100. Лучший результат: ${result.bestScore} из 100. Проходной балл: ${result.passingScore}.` : verdict.description}</Alert>
    <Group gap="xs">
      {hasScoring ? <Badge color={result.isPassed ? 'green' : 'yellow'} variant="light">{result.isPassed ? 'Задание пройдено' : 'Порог не достигнут'}</Badge> : typeof result.isCorrect === 'boolean'
        ? <Badge color={result.isCorrect ? 'green' : 'red'} variant="light">{result.isCorrect ? 'Верно' : 'Неверно'}</Badge>
        : <Badge color="gray" variant="light">Корректность не определена</Badge>}
      <Badge color={statusColor(result)} variant="light">Статус: {formatStudentAttemptStatus(result.status)}</Badge>
      {hasScoring && result.attemptNumber !== null ? <Badge variant="outline">Попытка №{result.attemptNumber}</Badge> : null}
      {result.rowCount !== null && result.rowCount !== undefined ? <Badge color="gray" variant="outline">Обработано строк: {result.rowCount}</Badge> : null}
      {result.durationMs !== null && result.durationMs !== undefined ? <Badge color="gray" variant="outline">{result.durationMs} мс</Badge> : null}
    </Group>

    {hasScoring ? <Stack gap="xs">
      <Text size="sm">Использовано попыток: {result.attemptsUsed ?? '—'} · Осталось: {result.attemptsRemaining ?? 'без лимита'}</Text>
      {result.checks?.length ? <Stack gap={4}><Text fw={600} size="sm">Показанные критерии</Text>{result.checks.map((check, index) => <Group key={`${check.kind}-${index}`} gap="xs"><Badge color={check.status === 'Passed' ? 'green' : check.status === 'Failed' ? 'red' : 'gray'} variant="light">{getValidationCheckStatusLabel(check.status)}</Badge><Text size="sm">{getValidationCheckKindLabel(check.kind)}: {check.awardedScore} из {check.weight} баллов{check.message ? ` — ${check.message}` : ''}</Text></Group>)}</Stack> : <Text c="dimmed" size="sm">Детализация критериев скрыта преподавателем.</Text>}
      {result.hints?.length ? <Stack gap={4}><Text fw={600} size="sm">Подсказки</Text>{result.hints.map((hint, index) => <Text key={`${hint.group}-${index}`} size="sm">{getHintGroupLabel(hint.group)}: {hint.message}</Text>)}</Stack> : null}
      {result.publicError ? <Alert color="red">{result.publicError}</Alert> : null}
      {result.canSubmit === false ? <Text c="dimmed" size="sm">Новые отправки в этом прохождении недоступны.</Text> : null}
    </Stack> : null}

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
