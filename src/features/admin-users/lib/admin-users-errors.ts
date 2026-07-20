import type {
  ProblemDetails,
  ValidationProblemDetails,
} from "../../../api/identity/model";

export type AdminUsersApiProblem = ProblemDetails | ValidationProblemDetails;

export class AdminUsersApiError extends Error {
  readonly status: number;
  readonly problem: AdminUsersApiProblem;

  constructor(status: number, problem: AdminUsersApiProblem) {
    super(getAdminUsersErrorMessage(problem, status));
    this.name = "AdminUsersApiError";
    this.status = status;
    this.problem = problem;
  }
}

export const isValidationProblemDetails = (
  problem: AdminUsersApiProblem,
): problem is ValidationProblemDetails => {
  return "errors" in problem;
};

export const getAdminUsersErrorMessage = (
  problem: AdminUsersApiProblem,
  fallbackStatus?: number,
): string => {
  if (problem.detail) {
    return problem.detail;
  }

  if (problem.title) {
    return problem.title;
  }

  if (fallbackStatus === 401) {
    return "Необходимо войти в систему повторно.";
  }

  if (fallbackStatus === 403) {
    return "Недостаточно прав для выполнения действия.";
  }

  if (fallbackStatus === 404) {
    return "Пользователь не найден.";
  }

  if (fallbackStatus === 409) {
    return "Действие конфликтует с текущим состоянием пользователя.";
  }

  if (fallbackStatus === 422) {
    return "Проверьте корректность заполнения формы.";
  }

  return "Не удалось выполнить действие.";
};

export const getAdminUsersFieldErrors = (
  error: unknown,
): Record<string, string[]> => {
  if (
    error instanceof AdminUsersApiError &&
    isValidationProblemDetails(error.problem)
  ) {
    return error.problem.errors;
  }

  return {};
};

