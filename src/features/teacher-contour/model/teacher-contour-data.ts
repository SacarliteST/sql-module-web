export type TeacherTopic = {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  taskCount: number;
  databaseCount: number;
  updatedAt: string;
};

export type TeacherTask = {
  id: string;
  topicId: string;
  title: string;
  database: string;
  dbms: string;
  status: 'draft' | 'published';
  attempts: number;
  updatedAt: string;
};

export type TeacherDatabase = {
  id: string;
  title: string;
  provider: 'PostgreSQL' | 'SQL Server' | 'MySQL';
  description: string;
  tableCount: number;
  taskCount: number;
  status: 'draft' | 'ready';
  updatedAt: string;
};

export const teacherTopics: TeacherTopic[] = [
  {
    id: 'sql-basics',
    title: 'Основы SQL',
    description: 'Первичные навыки выборки, фильтрации и сортировки данных.',
    status: 'published',
    taskCount: 4,
    databaseCount: 2,
    updatedAt: '18.07.2026',
  },
  {
    id: 'joins',
    title: 'Соединения и объединения',
    description: 'JOIN, UNION и работа с несколькими таблицами.',
    status: 'published',
    taskCount: 6,
    databaseCount: 3,
    updatedAt: '14.07.2026',
  },
  {
    id: 'optimization',
    title: 'Оптимизация производительности',
    description: 'Индексы, планы выполнения и базовые приемы оптимизации.',
    status: 'draft',
    taskCount: 3,
    databaseCount: 1,
    updatedAt: '09.07.2026',
  },
  {
    id: 'transactions',
    title: 'Транзакции и блокировки',
    description: 'Изоляция, фиксация изменений и конкурирующие операции.',
    status: 'draft',
    taskCount: 2,
    databaseCount: 1,
    updatedAt: '04.07.2026',
  },
];

export const teacherTasks: TeacherTask[] = [
  {
    id: 'select-employees',
    topicId: 'sql-basics',
    title: 'Базовый SELECT из таблицы сотрудников',
    database: 'UniversityDB',
    dbms: 'PostgreSQL',
    status: 'published',
    attempts: 28,
    updatedAt: '18.07.2026',
  },
  {
    id: 'hire-date-filter',
    topicId: 'sql-basics',
    title: 'Фильтрация по дате найма',
    database: 'UniversityDB',
    dbms: 'PostgreSQL',
    status: 'published',
    attempts: 19,
    updatedAt: '17.07.2026',
  },
  {
    id: 'column-aliases',
    topicId: 'sql-basics',
    title: 'Использование псевдонимов колонок',
    database: 'HR Sandbox',
    dbms: 'SQL Server',
    status: 'draft',
    attempts: 0,
    updatedAt: '15.07.2026',
  },
  {
    id: 'order-results',
    topicId: 'sql-basics',
    title: 'Сортировка результатов',
    database: 'UniversityDB',
    dbms: 'PostgreSQL',
    status: 'published',
    attempts: 34,
    updatedAt: '12.07.2026',
  },
];

export const teacherDatabases: TeacherDatabase[] = [
  {
    id: 'university-db',
    title: 'UniversityDB',
    provider: 'PostgreSQL',
    description: 'Учебная база с факультетами, студентами, группами и оценками.',
    tableCount: 8,
    taskCount: 7,
    status: 'ready',
    updatedAt: '18.07.2026',
  },
  {
    id: 'hr-sandbox',
    title: 'HR Sandbox',
    provider: 'SQL Server',
    description: 'Сотрудники, отделы, должности и история найма.',
    tableCount: 5,
    taskCount: 4,
    status: 'ready',
    updatedAt: '16.07.2026',
  },
  {
    id: 'shop-training',
    title: 'ShopTraining',
    provider: 'MySQL',
    description: 'Заказы, клиенты, товары и платежи для задач на агрегацию.',
    tableCount: 6,
    taskCount: 2,
    status: 'draft',
    updatedAt: '10.07.2026',
  },
];

export function getStatusLabel(status: TeacherTopic['status'] | TeacherTask['status'] | TeacherDatabase['status']) {
  if (status === 'published') {
    return 'Опубликовано';
  }

  if (status === 'ready') {
    return 'Готова';
  }

  return 'Черновик';
}

export function getStatusColor(status: TeacherTopic['status'] | TeacherTask['status'] | TeacherDatabase['status']) {
  if (status === 'published' || status === 'ready') {
    return 'green';
  }

  return 'gray';
}
