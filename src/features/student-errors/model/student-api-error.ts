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

export function mapStudentApiError(status?: number, problem?: unknown): StudentErrorView {
  const problemRecord = asRecord(problem);
  const resolvedStatus = status ?? (typeof problemRecord?.status === 'number' ? problemRecord.status : undefined);
  const traceId = safeTraceId(problem);
  switch (resolvedStatus) {
    case 401: return { canRetry: false, color: 'red', status: 401, title: 'Сессия завершилась', message: 'Войдите снова, чтобы продолжить работу.', traceId };
    case 403: return { canRetry: false, color: 'red', status: 403, title: 'Нет доступа', message: 'Материал недоступен для вашей роли или учебного контекста.', traceId };
    case 404: return { canRetry: false, color: 'red', status: 404, title: 'Материал недоступен', message: 'Запись не найдена, удалена или больше не опубликована.', traceId };
    case 409: return { canRetry: true, color: 'yellow', status: 409, title: 'Данные ещё не готовы', message: 'Среда, эталон или состояние задания изменились. Повторите позже.', traceId };
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
