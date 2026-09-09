import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import { getActiveAccessToken } from '../../session/providers';
import { createAuthorizationHeader } from './auth-header';
import { executeRuntimeFetch } from './create-runtime-fetch';

export async function sqlmoduleFetch<TResponse>(
  url: string,
  options?: RequestInit,
): Promise<TResponse> {
  const { sqlModuleApiUrl } = getRuntimeConfig();
  const accessToken = await getActiveAccessToken();

  return await executeRuntimeFetch<TResponse>(sqlModuleApiUrl, url, {
    ...options,
    headers: {
      ...createAuthorizationHeader(accessToken),
      ...options?.headers,
    },
  });
}
