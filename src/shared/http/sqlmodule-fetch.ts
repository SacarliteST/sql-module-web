import { getRuntimeConfig } from '../../app/config/runtime-config-registry';
import { executeRuntimeFetch } from './create-runtime-fetch';

export function sqlmoduleFetch<TResponse>(
  url: string,
  options?: RequestInit,
): Promise<TResponse> {
  const { sqlModuleApiUrl } = getRuntimeConfig();

  return executeRuntimeFetch<TResponse>(sqlModuleApiUrl, url, options);
}
