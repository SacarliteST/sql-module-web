import type { AppConfig } from './app-config';

export function readStandaloneConfig(): AppConfig {
  return {
    sqlModuleApiUrl: import.meta.env.VITE_SQLMODULE_API_URL ?? 'http://localhost:5000',
    identityApiUrl: import.meta.env.VITE_IDENTITY_API_URL ?? 'http://localhost:5001',
    basePath: import.meta.env.VITE_BASE_PATH ?? '/',
    mode: 'standalone',
  };
}
