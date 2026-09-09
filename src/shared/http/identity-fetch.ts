import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import { getActiveAccessToken } from '../../session/providers';
import { createAuthorizationHeader } from './auth-header';
import { executeRuntimeFetch } from './create-runtime-fetch';

export async function identityFetch<TResponse>(
  url: string,
  options?: RequestInit,
): Promise<TResponse> {
  const { identityApiUrl } = getRuntimeConfig();
  const accessToken = await getActiveAccessToken();

  if (!identityApiUrl) {
    throw new Error('identityApiUrl is not configured');
  }

  return await executeRuntimeFetch<TResponse>(identityApiUrl, url, {
    ...options,
    headers: {
      ...createAuthorizationHeader(accessToken),
      ...options?.headers,
    },
  });
}
