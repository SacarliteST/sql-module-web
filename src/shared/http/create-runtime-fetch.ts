import { buildApiUrl } from './build-api-url';
import { clearActiveLaunchContext } from '../../session/launch';
import { clearActiveTokens, resetActiveTokenProvider } from '../../session/providers';
import { useSessionStore } from '../../session/store';

async function handleUnauthorizedResponse() {
  const { status, mode, clearSession, setSessionIssue } = useSessionStore.getState();

  await clearActiveTokens();
  clearActiveLaunchContext();
  resetActiveTokenProvider();

  if (status === 'authenticated') {
    clearSession();
    if (mode === 'handoff') setSessionIssue('handoff-expired');
  }
}

export async function executeRuntimeFetch<TResponse>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(buildApiUrl(baseUrl, path), options);

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
