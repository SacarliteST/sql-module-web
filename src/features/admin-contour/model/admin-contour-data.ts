export type AdminUserRole = 'Admin' | 'Teacher' | 'Student';

export type AdminUserStatus = 'active' | 'blocked';

export type AdminOverviewMetric = {
  id: string;
  label: string;
  value: string;
  to?: string;
};

export type AdminServiceState = 'available' | 'checking' | 'unavailable';

export type AdminServiceStatus = {
  id: string;
  name: string;
  status: AdminServiceState;
  indicator: string;
};

export type AdminActivityEvent = {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  roles: AdminUserRole[];
  status: AdminUserStatus;
  createdAt: string;
  lastLogin: string;
};

export type AdminUserActivity = {
  id: string;
  userId: string;
  title: string;
  description: string;
  occurredAt: string;
  tone: AdminActivityEvent['tone'];
};

export const adminOverviewMetrics: AdminOverviewMetric[] = [
  { id: 'users', label: 'Пользователи', value: '1 248', to: '/admin/users' },
  { id: 'teachers', label: 'Преподаватели', value: '42' },
  { id: 'students', label: 'Студенты', value: '1 206' },
  { id: 'topics', label: 'Темы', value: '86' },
  { id: 'databases', label: 'Учебные базы', value: '12' },
];

export const adminServiceStatuses: AdminServiceStatus[] = [
  { id: 'identity', name: 'Identity Service', status: 'available', indicator: '99.9%' },
  { id: 'sql-module-api', name: 'SQL Module API', status: 'available', indicator: '99.4%' },
  { id: 'database', name: 'База данных', status: 'checking', indicator: '88ms' },
  { id: 'background-jobs', name: 'Background Jobs', status: 'unavailable', indicator: 'timeout' },
];

export const adminActivityEvents: AdminActivityEvent[] = [
  {
    id: 'user-created',
    title: 'Создан пользователь @ivanov.a',
    description: 'Сегодня, 14:12 · Identity Service',
    occurredAt: '14:12',
    tone: 'success',
  },
  {
    id: 'teacher-role-assigned',
    title: 'Назначена роль Teacher пользователю @smirnova.m',
    description: 'Сегодня, 10:17 · Admin Portal',
    occurredAt: '10:17',
    tone: 'info',
  },
  {
    id: 'database-created',
    title: 'Создана учебная база UniversityDB',
    description: 'Вчера, 16:40 · SQL Module',
    occurredAt: 'Вчера',
    tone: 'success',
  },
  {
    id: 'jobs-health-failed',
    title: 'Неуспешная проверка Background Jobs',
    description: 'Вчера, 09:05 · Health Check',
    occurredAt: 'Вчера',
    tone: 'danger',
  },
];

export const adminUsers: AdminUser[] = [
  {
    id: 'alexey-kuznetsov',
    name: 'Алексей Кузнецов',
    email: 'a.kuznetsov@scoodle.local',
    roles: ['Admin'],
    status: 'active',
    createdAt: '2026-01-12 14:32',
    lastLogin: '2026-07-20 10:32',
  },
  {
    id: 'maria-smirnova',
    name: 'Мария Смирнова',
    email: 'm.smirnova@scoodle.local',
    roles: ['Teacher'],
    status: 'active',
    createdAt: '2026-02-03 09:10',
    lastLogin: '2026-07-19 09:15',
  },
  {
    id: 'ivan-petrov',
    name: 'Иван Петров',
    email: 'i.petrov@student.local',
    roles: ['Student'],
    status: 'active',
    createdAt: '2026-03-18 16:05',
    lastLogin: '2026-07-17 16:49',
  },
  {
    id: 'elena-novikova',
    name: 'Елена Новикова',
    email: 'e.novikova@student.local',
    roles: ['Student'],
    status: 'blocked',
    createdAt: '2026-04-21 11:28',
    lastLogin: '2026-07-11 11:28',
  },
];

export const adminUserActivities: AdminUserActivity[] = [
  {
    id: 'alexey-login',
    userId: 'alexey-kuznetsov',
    title: 'Вход в систему',
    description: 'Успешная авторизация через Identity Service',
    occurredAt: 'Сегодня, 10:32',
    tone: 'success',
  },
  {
    id: 'alexey-profile',
    userId: 'alexey-kuznetsov',
    title: 'Обновление профиля',
    description: 'Изменены контактные данные администратора',
    occurredAt: 'Вчера, 15:42',
    tone: 'info',
  },
  {
    id: 'alexey-role',
    userId: 'alexey-kuznetsov',
    title: 'Изменение роли',
    description: 'Подтверждена роль Admin',
    occurredAt: '12.07.2026, 09:00',
    tone: 'info',
  },
  {
    id: 'alexey-users',
    userId: 'alexey-kuznetsov',
    title: 'Просмотр списка пользователей',
    description: 'Открыт административный раздел пользователей',
    occurredAt: '10.07.2026, 18:20',
    tone: 'info',
  },
  {
    id: 'alexey-service-check',
    userId: 'alexey-kuznetsov',
    title: 'Проверка сервисов',
    description: 'Запущена проверка Identity Service и SQL Module API',
    occurredAt: '08.07.2026, 13:16',
    tone: 'warning',
  },
  {
    id: 'maria-login',
    userId: 'maria-smirnova',
    title: 'Вход в систему',
    description: 'Преподаватель вошёл в систему',
    occurredAt: '2026-07-19 09:15',
    tone: 'success',
  },
  {
    id: 'maria-role',
    userId: 'maria-smirnova',
    title: 'Изменение роли',
    description: 'Назначена роль Teacher',
    occurredAt: '2026-07-12 11:44',
    tone: 'info',
  },
  {
    id: 'maria-topic',
    userId: 'maria-smirnova',
    title: 'Создание темы',
    description: 'Создана тема "Основы SQL"',
    occurredAt: '2026-07-10 16:30',
    tone: 'success',
  },
  {
    id: 'ivan-login',
    userId: 'ivan-petrov',
    title: 'Вход в систему',
    description: 'Студент вошёл в систему',
    occurredAt: '2026-07-17 16:49',
    tone: 'success',
  },
  {
    id: 'ivan-attempt',
    userId: 'ivan-petrov',
    title: 'Просмотр учебного задания',
    description: 'Открыто задание по теме "Основы SQL"',
    occurredAt: '2026-07-17 16:55',
    tone: 'info',
  },
  {
    id: 'elena-blocked',
    userId: 'elena-novikova',
    title: 'Пользователь заблокирован',
    description: 'Доступ временно ограничен администратором',
    occurredAt: '2026-07-11 11:28',
    tone: 'danger',
  },
  {
    id: 'elena-role',
    userId: 'elena-novikova',
    title: 'Изменение роли',
    description: 'Назначена роль Student',
    occurredAt: '2026-06-30 12:10',
    tone: 'info',
  },
];

export function getAdminUserStatusLabel(status: AdminUserStatus) {
  return status === 'active' ? 'Активен' : 'Заблокирован';
}

export function getAdminUserStatusColor(status: AdminUserStatus) {
  return status === 'active' ? 'green' : 'red';
}

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

export function getAdminEventToneColor(tone: AdminActivityEvent['tone']) {
  if (tone === 'success') {
    return 'green';
  }

  if (tone === 'warning') {
    return 'yellow';
  }

  if (tone === 'danger') {
    return 'red';
  }

  return 'blue';
}

export function getAdminUserInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
