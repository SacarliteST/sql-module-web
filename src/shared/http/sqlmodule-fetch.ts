import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import { useSessionStore } from '../../session/store';
import { createAuthorizationHeader } from './auth-header';
import { executeRuntimeFetch } from './create-runtime-fetch';

export function sqlmoduleFetch<TResponse>(
  url: string,
  options?: RequestInit,
): Promise<TResponse> {
  const { sqlModuleApiUrl } = getRuntimeConfig();
  const { accessToken } = useSessionStore.getState();

  return executeRuntimeFetch<TResponse>(sqlModuleApiUrl, url, {
    ...options,
    headers: {
      ...createAuthorizationHeader(accessToken),
      ...options?.headers,
    },
  });
}
