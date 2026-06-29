import type { AppConfig } from './app-config';

type StandaloneRuntimeConfig = Partial<
  Pick<AppConfig, 'sqlModuleApiUrl' | 'identityApiUrl' | 'basePath'>
>;

const runtimeConfigUrl = '/runtime-config.json';

function readEnvConfig(): AppConfig {
  return {
    sqlModuleApiUrl: import.meta.env.VITE_SQLMODULE_API_URL ?? 'http://localhost:5000',
    identityApiUrl: import.meta.env.VITE_IDENTITY_API_URL ?? 'http://localhost:5001',
    basePath: import.meta.env.VITE_BASE_PATH ?? '/',
    mode: 'standalone',
  };
}

async function readRuntimeConfig(): Promise<StandaloneRuntimeConfig> {
  try {
    const response = await fetch(runtimeConfigUrl, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {};
    }

    return (await response.json()) as StandaloneRuntimeConfig;
  } catch {
    return {};
  }
}

export async function readStandaloneConfig(): Promise<AppConfig> {
  const envConfig = readEnvConfig();
  const runtimeConfig = await readRuntimeConfig();

  return {
    ...envConfig,
    ...runtimeConfig,
    sqlModuleApiUrl: runtimeConfig.sqlModuleApiUrl ?? envConfig.sqlModuleApiUrl,
    mode: 'standalone',
  };
}
