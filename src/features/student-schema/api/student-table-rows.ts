import type { HttpValidationProblemDetails, ProblemDetails, TableRowsResponse } from '../../../api/sqlmodule/model';
import { sqlmoduleFetch } from '../../../shared/http/sqlmodule-fetch';

export type StudentTableRowsResponse =
  | { data: TableRowsResponse; headers: Headers; status: 200 }
  | { data: ProblemDetails | HttpValidationProblemDetails; headers: Headers; status: 401 | 403 | 404 | 422 };

export function getStudentTaskTableRows(
  taskId: string,
  tableId: string,
  offset: number,
  limit: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  return sqlmoduleFetch<StudentTableRowsResponse>(
    `/api/v1/student/tasks/${taskId}/tables/${tableId}/rows?${params}`,
    { method: 'GET', signal },
  );
}
