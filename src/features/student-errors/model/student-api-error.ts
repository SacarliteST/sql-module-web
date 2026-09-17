import type { HttpValidationProblemDetails, ProblemDetails } from '../../../api/sqlmodule/model';

type Problem = ProblemDetails | HttpValidationProblemDetails | Record<string, unknown> | null | undefined;

export type StudentErrorView = {
  canRetry: boolean;
  color: 'red' | 'yellow';
  message: string;
  status?: number;
  title: string;
  traceId?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function safeTraceId(problem: unknown) {
  const record = asRecord(problem);
  const nestedProblem = asRecord(record?.problem);
  const extensions = asRecord(record?.extensions);
  const nestedExtensions = asRecord(nestedProblem?.extensions);
  for (const source of [record, extensions, nestedProblem, nestedExtensions]) {
    for (const key of ['traceId', 'correlationId', 'requestId']) {
      const value = source?.[key];
      if (typeof value === 'string' && /^[a-zA-Z0-9._:-]{4,128}$/.test(value)) return value;
    }
  }
  return undefined;
}

export function problemCode(problem: unknown): string | undefined {
  const record = asRecord(problem);
  return typeof record?.code === 'string' ? record.code : undefined;
}

export function mapStudentApiError(status?: number, problem?: unknown): StudentErrorView {
  const problemRecord = asRecord(problem);
  const resolvedStatus = status ?? (typeof problemRecord?.status === 'number' ? problemRecord.status : undefined);
  const traceId = safeTraceId(problem);
  const code = problemCode(problem);
  if (resolvedStatus === 409) {
    if (code === 'Progress.AttemptsExhausted') return { canRetry: false, color: 'yellow', status: 409, title: 'Попытки закончились', message: 'Лимит исчерпан. Обновите состояние задания; в standalone-режиме можно начать новое прохождение.', traceId };
    if (code === 'Progress.Closed' || code === 'ModuleSessionClosed') return { canRetry: false, color: 'yellow', status: 409, title: 'Прохождение завершено', message: 'Отправка больше недоступна. Обновите состояние задания и посмотрите итог.', traceId };
    if (code === 'Progress.StillActive') return { canRetry: false, color: 'yellow', status: 409, title: 'Прохождение ещё активно', message: 'Продолжите текущее прохождение или завершите его перед перезапуском.', traceId };
    if (code === 'Progress.ValidationVersionNotPublished' || code === 'TaskValidation.StaleVersion') return { canRetry: false, color: 'yellow', status: 409, title: 'Версия проверки изменилась', message: 'Обновите задание. Для нового прохождения нужна опубликованная версия проверки.', traceId };
    if (code === 'Progress.PlatformFlowRequired' || code === 'ModuleSessionRequired' || code === 'SessionTaskMismatch') return { canRetry: false, color: 'yellow', status: 409, title: 'Платформенная сессия недоступна', message: 'Откройте это задание заново через платформу.', traceId };
    if (code === 'IdempotencyRequestInProgress' || code === 'Progress.ConcurrentReservation') return { canRetry: true, color: 'yellow', status: 409, title: 'Предыдущая отправка выполняется', message: 'Дождитесь завершения и повторите неизменённый SQL с тем же ключом.', traceId };
  }
  if (resolvedStatus === 422 && code === 'Validation.AnalyzerNotSupported') return { canRetry: false, color: 'red', status: 422, title: 'Анализатор не поддерживает СУБД', message: 'Нужна другая конфигурация проверки или поддержка этой СУБД на сервере.', traceId };
  if (resolvedStatus === 503 && code === 'TaskValidation.InfrastructureUnavailable') return { canRetry: true, color: 'yellow', status: 503, title: 'Проверка временно недоступна', message: 'Анализатор или sandbox недоступен. Неизменённый запрос можно повторить позже.', traceId };
  switch (resolvedStatus) {
    case 400: return { canRetry: false, color: 'red', status: 400, title: 'Неверный запрос', message: 'Проверьте данные запроса и повторите действие.', traceId };
    case 401: return { canRetry: false, color: 'red', status: 401, title: 'Сессия завершилась', message: 'Войдите снова, чтобы продолжить работу.', traceId };
    case 403: return { canRetry: false, color: 'red', status: 403, title: 'Нет доступа', message: 'Материал недоступен для вашей роли или учебного контекста.', traceId };
    case 404: return { canRetry: false, color: 'red', status: 404, title: 'Материал недоступен', message: 'Запись не найдена, удалена или больше не опубликована.', traceId };
    case 409: return { canRetry: false, color: 'yellow', status: 409, title: 'Состояние изменилось', message: 'Обновите задание перед повтором действия.', traceId };
    case 422: return { canRetry: false, color: 'red', status: 422, title: 'Некорректный запрос', message: 'Проверьте заполнение и ограничения введённых данных.', traceId };
    case 408:
    case 504: return { canRetry: true, color: 'yellow', status: resolvedStatus, title: 'Время ожидания истекло', message: 'Сервер не успел ответить. Состояние операции может быть неизвестно.', traceId };
    default:
      if (resolvedStatus && resolvedStatus >= 500) return { canRetry: true, color: 'yellow', status: resolvedStatus, title: 'Временная ошибка сервера', message: 'Повторите безопасный запрос позже.', traceId };
      return { canRetry: true, color: 'yellow', status: resolvedStatus, title: 'Не удалось связаться с сервером', message: 'Проверьте подключение и повторите безопасный запрос.', traceId };
  }
}

export function createStudentRequestError(status: number, problem?: Problem) {
  return Object.assign(new Error('Student API request failed'), { problem, status });
}
