import type {
  SubmitAttemptResponseReason,
  SubmitAttemptResponseStatus,
} from '../../api/sqlmodule/model';

const attemptStatusLabels = {
  Succeeded: 'Выполнено',
  Error: 'Ошибка',
  TimedOut: 'Превышено время',
} satisfies Record<SubmitAttemptResponseStatus, string>;

const attemptReasonLabels = {
  Ok: 'Решение верное',
  ColumnMismatch: 'Колонки отличаются',
  RowCountMismatch: 'Число строк отличается',
  ValueMismatch: 'Значения отличаются',
  SqlError: 'Ошибка SQL',
  Timeout: 'Лимит времени',
  NotRun: 'Проверка не выполнена',
  ResultLimitExceeded: 'Превышен лимит строк',
} satisfies Record<SubmitAttemptResponseReason, string>;

export function formatStudentAttemptStatus(value?: string | null): string {
  if (!value) return 'Статус не указан';
  return value in attemptStatusLabels
    ? attemptStatusLabels[value as keyof typeof attemptStatusLabels]
    : 'Неизвестный статус';
}

export function formatStudentAttemptReason(value?: string | null): string {
  if (!value) return 'Результат не указан';
  return value in attemptReasonLabels
    ? attemptReasonLabels[value as keyof typeof attemptReasonLabels]
    : 'Неизвестный результат';
}

export function formatStudentDifficulty(value?: number | null): string {
  return Number.isInteger(value) && value !== undefined && value !== null && value >= 1 && value <= 5
    ? `Сложность ${value}`
    : 'Сложность не указана';
}
