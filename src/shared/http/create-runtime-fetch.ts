import { buildApiUrl } from './build-api-url';
import { canRefreshActiveSession, refreshSession } from './refresh-session';
import { clearActiveLaunchContext } from '../../session/launch';
import { clearActiveTokens, resetActiveTokenProvider } from '../../session/providers';
import { useSessionStore } from '../../session/store';

async function handleUnauthorizedResponse() {
  // Есть refresh-токен — судьбу сессии решает refreshSession (сбрасывает только при отказе сервера).
  if (canRefreshActiveSession()) {
    return;
  }

  const { status, mode, clearSession, setSessionIssue } = useSessionStore.getState();

  await clearActiveTokens();
  clearActiveLaunchContext();
  resetActiveTokenProvider();

  if (status === 'authenticated') {
    clearSession();
    if (mode === 'handoff') setSessionIssue('handoff-expired');
  }
}

function readBearer(options?: RequestInit): string | null {
  const value = new Headers(options?.headers).get('Authorization');
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length) : null;
}

async function fetchWithRefresh(url: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(url, options);

  const sentToken = readBearer(options);
  if (response.status !== 401 || !sentToken || !canRefreshActiveSession()) {
    return response;
  }

  // Другой запрос мог уже обновить токен — тогда просто повторяем с новым.
  const refreshed =
    useSessionStore.getState().accessToken !== sentToken || (await refreshSession(sentToken));
  if (!refreshed) {
    return response;
  }

  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${useSessionStore.getState().accessToken}`);
  return fetch(url, { ...options, headers });
}

export async function executeRuntimeFetch<TResponse>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<TResponse> {
  const response = await fetchWithRefresh(buildApiUrl(baseUrl, path), options);

  if (response.status === 401) {
    await handleUnauthorizedResponse();
  }

  const responseBody = [204, 205, 304].includes(response.status) ? null : await response.text();
  const data = responseBody ? JSON.parse(responseBody) : {};

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as TResponse;
}
