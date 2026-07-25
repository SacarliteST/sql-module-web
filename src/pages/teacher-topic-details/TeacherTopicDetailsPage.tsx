import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type {
  DbmsDictionaryResponse,
  HttpValidationProblemDetails,
  ProblemDetails,
  SqlQueryResponse,
  SqlTaskResponse,
  TargetDbResponse,
  TopicResponse,
} from '../../api/sqlmodule/model';
import { useGetAllTargetDbs } from '../../api/sqlmodule/schema/schema';
import {
  useGetAllSqlQueries,
  useGetAllSqlTasks,
  useGetAllTopics,
  useGetTopicById,
} from '../../api/sqlmodule/training/training';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

type TopicView = {
  id: string;
  title: string;
  parentTopicId: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type TopicTaskView = {
  id: string;
  title: string;
  database: string;
  dbms: string;
  difficultyLevel: number | null;
  attempts: string;
  updatedAt: string;
};

function normalizeTopic(topic: TopicResponse): TopicView | null {
  if (!topic.id) {
    return null;
  }

  return {
    id: topic.id,
    title: topic.topicName?.trim() || 'Без названия',
    parentTopicId: topic.parentTopicId ?? null,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Не указано';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
  }).format(date);
}

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback: string,
): string {
  return problem?.detail?.trim() || problem?.title?.trim() || fallback;
}

function buildEntityMap<T extends { id?: string }>(items: T[]): Map<string, T> {
  return new Map(
    items
      .filter((item) => item.id)
      .map((item) => [item.id as string, item]),
  );
}

function countDescendants(topicId: string, topics: TopicView[]): number {
  const children = topics.filter((topic) => topic.parentTopicId === topicId);

  return children.reduce(
    (count, child) => count + 1 + countDescendants(child.id, topics),
    0,
  );
}

function getDbmsName(dbms?: DbmsDictionaryResponse): string {
  return dbms?.dbmsName?.trim() || dbms?.dbmsSystemName?.trim() || 'СУБД не указана';
}

function normalizeTask(
  task: SqlTaskResponse,
  sqlQueryById: Map<string, SqlQueryResponse>,
  targetDbById: Map<string, TargetDbResponse>,
  dbmsById: Map<string, DbmsDictionaryResponse>,
): TopicTaskView | null {
  if (!task.id) {
    return null;
  }

  const sqlQuery = task.sqlQueryId ? sqlQueryById.get(task.sqlQueryId) : undefined;
  const targetDb = sqlQuery?.targetDbId ? targetDbById.get(sqlQuery.targetDbId) : undefined;
  const dbms = targetDb?.dbmsId ? dbmsById.get(targetDb.dbmsId) : undefined;

  return {
    id: task.id,
    title: task.taskName?.trim() || 'Без названия',
    database: targetDb?.dbName?.trim() || 'База не указана',
    dbms: getDbmsName(dbms),
    difficultyLevel: task.difficultyLevel ?? null,
    attempts: 'н/д',
    updatedAt: formatDate(task.updatedAt ?? task.createdAt),
  };
}

function DifficultyIndicator({ value }: { value: number | null }) {
  const normalizedValue = value && value > 0 ? Math.min(value, 5) : 0;

  return (
    <Group gap={4} wrap="nowrap">
      <Group gap={3} wrap="nowrap">
        {Array.from({ length: 5 }).map((_, index) => (
          <Box
            key={index}
            h={10}
            w={10}
            bg={index < normalizedValue ? '#0d6efd' : '#dee2e6'}
            style={{ borderRadius: '50%' }}
          />
        ))}
      </Group>
      <Text c="dimmed" size="sm">
        {normalizedValue || 'н/д'}
      </Text>
    </Group>
  );
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'blue' | 'gray' | 'orange';
  value: string | number;
}) {
  const toneColor = tone === 'blue' ? '#0d6efd' : tone === 'orange' ? '#b16000' : '#6c757d';
  const toneBackground = tone === 'blue' ? '#e7f1ff' : tone === 'orange' ? '#fff3e0' : '#f1f3f5';

  return (
    <AppCard p="md" shadow="xs">
      <Group gap="md" wrap="nowrap">
        <Box
          h={40}
          w={40}
          bg={toneBackground}
          c={toneColor}
          style={{
            alignItems: 'center',
            borderRadius: 6,
            display: 'flex',
            fontWeight: 700,
            justifyContent: 'center',
          }}
        >
          {label.slice(0, 1)}
        </Box>
        <Stack gap={0}>
          <Text c="dimmed" size="sm">
            {label}
          </Text>
          <Text fw={700} size="xl">
            {value}
          </Text>
        </Stack>
      </Group>
    </AppCard>
  );
}

export function TeacherTopicDetailsPage() {
  const { topicId = '' } = useParams<{ topicId: string }>();

  const topicQuery = useGetTopicById(topicId, {
    query: {
      enabled: Boolean(topicId),
      retry: false,
    },
  });
  const topicsQuery = useGetAllTopics(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(topicId),
        retry: false,
      },
    },
  );
  const sqlTasksQuery = useGetAllSqlTasks(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(topicId),
        retry: false,
      },
    },
  );
  const sqlQueriesQuery = useGetAllSqlQueries(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(topicId),
        retry: false,
      },
    },
  );
  const targetDbsQuery = useGetAllTargetDbs(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(topicId),
        retry: false,
      },
    },
  );
  const dbmsQuery = useGetAllDbmsDictionaries(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(topicId),
        retry: false,
      },
    },
  );

  const topicResponse = topicQuery.data;
  const topic = topicResponse?.status === 200 ? normalizeTopic(topicResponse.data) : null;
  const topicError = topicResponse && topicResponse.status !== 200 ? topicResponse.data : null;

  const topicsResponse = topicsQuery.data;
  const topicsPage = topicsResponse?.status === 200 ? topicsResponse.data : null;
  const topicsError = topicsResponse && topicsResponse.status !== 200 ? topicsResponse.data : null;

  const sqlTasksResponse = sqlTasksQuery.data;
  const sqlTasksPage = sqlTasksResponse?.status === 200 ? sqlTasksResponse.data : null;
  const sqlTasksError =
    sqlTasksResponse && sqlTasksResponse.status !== 200 ? sqlTasksResponse.data : null;

  const sqlQueriesResponse = sqlQueriesQuery.data;
  const sqlQueriesPage = sqlQueriesResponse?.status === 200 ? sqlQueriesResponse.data : null;
  const sqlQueriesError =
    sqlQueriesResponse && sqlQueriesResponse.status !== 200 ? sqlQueriesResponse.data : null;

  const targetDbsResponse = targetDbsQuery.data;
  const targetDbsPage = targetDbsResponse?.status === 200 ? targetDbsResponse.data : null;
  const targetDbsError =
    targetDbsResponse && targetDbsResponse.status !== 200 ? targetDbsResponse.data : null;

  const dbmsResponse = dbmsQuery.data;
  const dbmsPage = dbmsResponse?.status === 200 ? dbmsResponse.data : null;
  const dbmsError = dbmsResponse && dbmsResponse.status !== 200 ? dbmsResponse.data : null;

  const allTopics = useMemo(() => {
    return (topicsPage?.items ?? [])
      .map(normalizeTopic)
      .filter((item): item is TopicView => item !== null);
  }, [topicsPage?.items]);

  const childTopics = useMemo(() => {
    if (!topic) {
      return [];
    }

    return allTopics
      .filter((item) => item.parentTopicId === topic.id)
      .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  }, [allTopics, topic]);

  const parentTopic = topic?.parentTopicId
    ? allTopics.find((item) => item.id === topic.parentTopicId)
    : null;

  const topicTasks = useMemo(() => {
    if (!topic) {
      return [];
    }

    const sqlQueryById = buildEntityMap(sqlQueriesPage?.items ?? []);
    const targetDbById = buildEntityMap(targetDbsPage?.items ?? []);
    const dbmsById = buildEntityMap(dbmsPage?.items ?? []);

    return (sqlTasksPage?.items ?? [])
      .filter((task) => task.topicId === topic.id)
      .map((task) => normalizeTask(task, sqlQueryById, targetDbById, dbmsById))
      .filter((task): task is TopicTaskView => task !== null)
      .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  }, [dbmsPage?.items, sqlQueriesPage?.items, sqlTasksPage?.items, targetDbsPage?.items, topic]);

  const directTaskCountByTopicId = useMemo(() => {
    const countByTopicId = new Map<string, number>();

    (sqlTasksPage?.items ?? []).forEach((task) => {
      if (!task.topicId) {
        return;
      }

      countByTopicId.set(task.topicId, (countByTopicId.get(task.topicId) ?? 0) + 1);
    });

    return countByTopicId;
  }, [sqlTasksPage?.items]);

  const isLoading =
    topicQuery.isPending ||
    topicsQuery.isPending ||
    sqlTasksQuery.isPending ||
    sqlQueriesQuery.isPending ||
    targetDbsQuery.isPending ||
    dbmsQuery.isPending;
  const isUnavailable =
    topicQuery.isError ||
    topicsQuery.isError ||
    sqlTasksQuery.isError ||
    sqlQueriesQuery.isError ||
    targetDbsQuery.isError ||
    dbmsQuery.isError;
  const apiError =
    topicError ?? topicsError ?? sqlTasksError ?? sqlQueriesError ?? targetDbsError ?? dbmsError;

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Преподаватель', to: '/teacher' },
          { label: 'Темы', to: '/teacher/topics' },
          { label: topic?.title ?? 'Детали темы' },
        ]}
      />

      <Stack gap="md">
        <PageHeader
          title={topic?.title ?? 'Детали темы'}
          description={
            topic
              ? parentTopic
                ? `Родительская тема: ${parentTopic.title}`
                : 'Корневая тема'
              : 'Загрузка данных темы из SQL Module API.'
          }
          actions={
            <>
              <Button disabled variant="light">
                Изменить
              </Button>
              <Button disabled variant="light">
                Создать подтему
              </Button>
              <Button component={Link} disabled={!topic} to={topic ? `/teacher/topics/${topic.id}/tasks/new` : '#'}>
                Создать задание
              </Button>
            </>
          }
        />
        <TeacherContourTabs />
      </Stack>

      {isLoading ? (
        <AppCard p="md">
          <EmptyState
            title="Загружаем тему"
            description="Получаем тему, подтемы, задания и связанные учебные базы."
          />
        </AppCard>
      ) : isUnavailable ? (
        <AppCard p="md">
          <EmptyState
            title="SQL Module API недоступен"
            description="Проверьте, что сервис запущен и runtime config указывает на правильный адрес."
          />
        </AppCard>
      ) : apiError ? (
        <AppCard p="md">
          <Alert color="red" title={apiError.title ?? 'Ошибка загрузки'} variant="light">
            {getProblemMessage(apiError, 'Не удалось загрузить детали темы.')}
          </Alert>
        </AppCard>
      ) : topic ? (
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
            <MetricCard label="Подтем" tone="blue" value={childTopics.length} />
            <MetricCard
              label="Всего вложенных тем"
              tone="gray"
              value={countDescendants(topic.id, allTopics)}
            />
            <MetricCard label="Заданий" tone="orange" value={topicTasks.length} />
            <MetricCard label="Последнее изменение" tone="gray" value={formatDate(topic.updatedAt)} />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <Stack gap="md">
              <Title order={3} size="h4">
                Подтемы
              </Title>
              {childTopics.length > 0 ? (
                <Stack gap="sm">
                  {childTopics.map((childTopic) => (
                    <AppCard key={childTopic.id} p="md" shadow="xs">
                      <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
                        <Stack gap={6}>
                          <Anchor
                            component={Link}
                            to={`/teacher/topics/${childTopic.id}`}
                            fw={600}
                            c="dark"
                            underline="never"
                          >
                            {childTopic.title}
                          </Anchor>
                          <Group gap="md">
                            <Text c="dimmed" size="sm">
                              {directTaskCountByTopicId.get(childTopic.id) ?? 0} заданий
                            </Text>
                            <Text c="dimmed" size="sm">
                              {formatDate(childTopic.updatedAt)}
                            </Text>
                          </Group>
                        </Stack>
                        <Badge color="gray" radius="sm" variant="light">
                          Подтема
                        </Badge>
                      </Group>
                    </AppCard>
                  ))}
                </Stack>
              ) : (
                <AppCard p="md">
                  <EmptyState
                    title="Подтем пока нет"
                    description="Создание подтемы будет подключено отдельной итерацией."
                  />
                </AppCard>
              )}
            </Stack>

            <Stack gap="md">
              <Group justify="space-between" gap="md" wrap="wrap">
                <Title order={3} size="h4">
                  Задания темы
                </Title>
                <Button disabled size="xs" variant="light">
                  Фильтры
                </Button>
              </Group>

              <AppCard p={0}>
                {topicTasks.length > 0 ? (
                  <Table.ScrollContainer minWidth={720}>
                    <Table highlightOnHover withColumnBorders={false}>
                      <Table.Thead bg="#f3f4f5">
                        <Table.Tr>
                          <Table.Th>Название</Table.Th>
                          <Table.Th>База / СУБД</Table.Th>
                          <Table.Th>Сложность</Table.Th>
                          <Table.Th ta="right">Обновлено</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {topicTasks.map((task) => (
                          <Table.Tr key={task.id}>
                            <Table.Td>
                              <Anchor component={Link} to={`/teacher/topics/${topic.id}/tasks/${task.id}`}>
                                {task.title}
                              </Anchor>
                              <Text c="dimmed" size="xs">
                                Попыток: {task.attempts}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{task.database}</Text>
                              <Text c="dimmed" size="sm">
                                {task.dbms}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <DifficultyIndicator value={task.difficultyLevel} />
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text c="dimmed" size="sm">
                                {task.updatedAt}
                              </Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                ) : (
                  <EmptyState
                    title="В теме пока нет заданий"
                    description="Создайте первое SQL-задание для выбранной темы."
                  />
                )}
              </AppCard>
            </Stack>
          </SimpleGrid>

          <AppCard p="xl">
            <Stack gap="sm">
              <Title order={3} size="h5">
                Описание темы
              </Title>
              <Text c="dimmed" maw={860}>
                Описание темы пока не хранится в текущем ответе SQL Module API. После добавления
                поля в контракт здесь появится рабочее описание для преподавателя.
              </Text>
            </Stack>
          </AppCard>
        </Stack>
      ) : (
        <AppCard p="md">
          <EmptyState
            title="Тема не найдена"
            description="Вернитесь к списку тем и выберите существующую тему."
          />
        </AppCard>
      )}
    </Page>
  );
}
