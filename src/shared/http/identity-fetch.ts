import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import { executeRuntimeFetch } from './create-runtime-fetch';

export function identityFetch<TResponse>(
  url: string,
  options?: RequestInit,
): Promise<TResponse> {
  const { identityApiUrl } = getRuntimeConfig();

  if (!identityApiUrl) {
    throw new Error('identityApiUrl is not configured');
  }

  return executeRuntimeFetch<TResponse>(identityApiUrl, url, options);
}
