export type AdminServiceState = 'available' | 'checking' | 'unavailable';

export type AdminServiceStatus = {
  id: string;
  name: string;
  status: AdminServiceState;
  indicator: string;
};

export type AdminIntegrationSetting = {
  id: string;
  label: string;
  value: string;
  source: string;
};

export type AdminConnectionCheck = {
  id: string;
  service: string;
  status: AdminServiceState;
  latency: string;
};

export type AdminSystemInfoItem = {
  id: string;
  label: string;
  value: string;
};

export type AdminWorkMode = {
  current: 'Standalone' | 'Embedded';
  available: Array<'Standalone' | 'Embedded'>;
  description: string;
};

export const adminIntegrationSettings: AdminIntegrationSetting[] = [
  {
    id: 'identity-service-url',
    label: 'Identity Service URL',
    value: 'http://localhost:5101',
    source: 'runtime config',
  },
  {
    id: 'sql-module-api-url',
    label: 'SQL Module API URL',
    value: 'http://localhost:5001',
    source: 'runtime config',
  },
  {
    id: 'base-path',
    label: 'Base Path',
    value: '/',
    source: 'runtime config',
  },
];

export const adminConnectionChecks: AdminConnectionCheck[] = [
  { id: 'identity', service: 'Identity Service', status: 'available', latency: '24ms' },
  { id: 'sql-module-api', service: 'SQL Module API', status: 'available', latency: '31ms' },
  { id: 'database', service: 'База данных', status: 'checking', latency: '88ms' },
];

export const adminWorkMode: AdminWorkMode = {
  current: 'Standalone',
  available: ['Standalone', 'Embedded'],
  description:
    'Режим определяет, запускается ли SQL-модуль самостоятельно или встраивается в родительскую систему тестирования.',
};

export const adminSystemInfo: AdminSystemInfoItem[] = [
  { id: 'frontend-version', label: 'Версия интерфейса', value: '0.0.0-local' },
  { id: 'environment', label: 'Окружение', value: 'Development' },
  { id: 'last-updated', label: 'Последнее обновление', value: '2026-07-20 14:30' },
  { id: 'build', label: 'Build', value: 'local-dev' },
];

export function getAdminServiceStatusLabel(status: AdminServiceState) {
  if (status === 'available') {
    return 'Доступен';
  }

  if (status === 'checking') {
    return 'Проверяется';
  }

  return 'Недоступен';
}

export function getAdminServiceStatusColor(status: AdminServiceState) {
  if (status === 'available') {
    return 'green';
  }

  if (status === 'checking') {
    return 'yellow';
  }

  return 'red';
}
