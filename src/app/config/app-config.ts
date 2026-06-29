export type AppMode = 'standalone' | 'embedded';

export type AppConfig = {
  sqlModuleApiUrl: string;
  identityApiUrl?: string;
  basePath?: string;
  mode: AppMode;
};
