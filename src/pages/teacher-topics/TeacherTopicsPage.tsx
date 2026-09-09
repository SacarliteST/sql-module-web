import {
  Alert,
  Anchor,
  Badge,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type {
  HttpValidationProblemDetails,
  ProblemDetails,
  SqlTaskResponse,
  TopicResponse,
} from '../../api/sqlmodule/model';
import { useGetAllTargetDbs } from '../../api/sqlmodule/schema/schema';
import {
  getGetAllTopicsQueryKey,
  useCreateTopic,
  useGetAllSqlTasks,
  useGetAllTopics,
} from '../../api/sqlmodule/training/training';
import { SqlTaskFormModal } from '../../features/sql-tasks';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { formatAuditDate as formatDate, formatAuditDateTime as formatDateTime } from '../../shared/lib/teacher-audit';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

type TopicTreeItem = {
  id: string;
  title: string;
  parentTopicId: string | null;
  createdAt?: string;
  updatedAt?: string;
  description: string;
  children: TopicTreeItem[];
};

type TeacherTopicTaskView = {
  id: string;
  title: string;
  database: string;
  dbms: string;
  difficulty: string;
  attempts: string;
  updatedAt: string;
};

const ROOT_PARENT_TOPIC_VALUE = '__root__';

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function normalizeTopic(topic: TopicResponse): TopicTreeItem | null {
  if (!topic.id) {
    return null;
  }

  return {
    id: topic.id,
    title: topic.topicName?.trim() || 'Без названия',
    parentTopicId: topic.parentTopicId ?? null,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    description: topic.description?.trim() ?? '',
    children: [],
  };
}

function buildTopicTree(topics: TopicTreeItem[]): TopicTreeItem[] {
  const topicById = new Map<string, TopicTreeItem>(
    topics.map((topic) => [topic.id, { ...topic, children: [] as TopicTreeItem[] }]),
  );
  const roots: TopicTreeItem[] = [];

  topicById.forEach((topic) => {
    const parent = topic.parentTopicId ? topicById.get(topic.parentTopicId) : null;

    if (parent) {
      parent.children.push(topic);
      return;
    }

    roots.push(topic);
  });

  const sortTopics = (items: TopicTreeItem[]) => {
    items.sort((left, right) => left.title.localeCompare(right.title, 'ru'));
    items.forEach((item) => sortTopics(item.children));
  };

  sortTopics(roots);

  return roots;
}

function flattenTopicTree(topics: TopicTreeItem[]): TopicTreeItem[] {
  return topics.flatMap((topic) => [topic, ...flattenTopicTree(topic.children)]);
}

function filterTopicTree(topics: TopicTreeItem[], searchValue: string): TopicTreeItem[] {
  if (!searchValue) {
    return topics;
  }

  return topics
    .map((topic) => {
      const children = filterTopicTree(topic.children, searchValue);
      const topicMatches = topic.title.toLowerCase().includes(searchValue);

      if (!topicMatches && children.length === 0) {
        return null;
      }

      return {
        ...topic,
        children,
      };
    })
    .filter((topic): topic is TopicTreeItem => topic !== null);
}

function countDescendants(topic: TopicTreeItem): number {
  return topic.children.reduce(
    (count, child) => count + 1 + countDescendants(child),
    0,
  );
}

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback = 'Не удалось загрузить темы из SQL Module API.',
): string {
  return (
    problem?.detail?.trim() ||
    problem?.title?.trim() ||
    fallback
  );
}

function normalizeTask(task: SqlTaskResponse): TeacherTopicTaskView | null {
  if (!task.id) {
    return null;
  }

  return {
    id: task.id,
    title: task.taskName?.trim() || 'Без названия',
    database: task.targetDbName?.trim() || 'База не указана',
    dbms: task.dbmsName?.trim() || 'СУБД не указана',
    difficulty: task.difficultyLevel ? `Сложность ${task.difficultyLevel}` : 'Не указана',
    attempts: String(task.attemptsCount ?? 0),
    updatedAt: formatDate(task.updatedAt ?? task.createdAt),
  };
}

function TopicTreeButton({
  level,
  onSelect,
  selectedTopicId,
  topic,
}: {
  level: number;
  onSelect: (topicId: string) => void;
  selectedTopicId: string;
  topic: TopicTreeItem;
}) {
  const isSelected = topic.id === selectedTopicId;

  return (
    <>
      <UnstyledButton onClick={() => onSelect(topic.id)} w="100%">
        <Paper
          p="xs"
          radius="sm"
          bg={isSelected ? '#0d6efd' : 'transparent'}
          style={{
            border: '1px solid',
            borderColor: isSelected ? '#0d6efd' : 'transparent',
            cursor: 'pointer',
            marginLeft: level * 14,
          }}
        >
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={600} size="sm" c={isSelected ? 'white' : 'dark'} truncate>
                {topic.title}
              </Text>
              <Text size="xs" c={isSelected ? 'blue.0' : 'dimmed'} truncate>
                {topic.children.length} подтем
              </Text>
            </Stack>
            <Text size="xs" fw={600} c={isSelected ? 'white' : 'dimmed'}>
              {countDescendants(topic)}
            </Text>
          </Group>
        </Paper>
      </UnstyledButton>

      {topic.children.map((child) => (
        <TopicTreeButton
          key={child.id}
          level={level + 1}
          onSelect={onSelect}
          selectedTopicId={selectedTopicId}
          topic={child}
        />
      ))}
    </>
  );
}

export function TeacherTopicsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [createTopicOpened, createTopicModal] = useDisclosure(false);
  const [createTaskOpened, createTaskModal] = useDisclosure(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [newTopicParentId, setNewTopicParentId] = useState<string | null>(ROOT_PARENT_TOPIC_VALUE);
  const [createTopicError, setCreateTopicError] = useState('');
  const searchValue = normalizeSearch(search);

  const topicsQuery = useGetAllTopics(
    { Limit: 100 },
    {
      query: {
        retry: false,
      },
    },
  );

  const response = topicsQuery.data;
  const topicsPage = response?.status === 200 ? response.data : null;
  const apiError = response && response.status !== 200 ? response.data : null;
  const rawTopics = topicsPage?.items ?? [];

  const topicTree = useMemo(() => {
    return buildTopicTree(
      rawTopics
        .map(normalizeTopic)
        .filter((topic): topic is TopicTreeItem => topic !== null),
    );
  }, [rawTopics]);

  const filteredTopicTree = useMemo(() => {
    return filterTopicTree(topicTree, searchValue);
  }, [searchValue, topicTree]);

  const visibleTopics = useMemo(
    () => flattenTopicTree(filteredTopicTree),
    [filteredTopicTree],
  );

  useEffect(() => {
    if (visibleTopics.length === 0) {
      setSelectedTopicId('');
      return;
    }

    const selectedTopicVisible = visibleTopics.some((topic) => topic.id === selectedTopicId);

    if (!selectedTopicVisible) {
      setSelectedTopicId(visibleTopics[0].id);
    }
  }, [selectedTopicId, visibleTopics]);

  const allTopics = useMemo(() => flattenTopicTree(topicTree), [topicTree]);
  const selectedTopic =
    allTopics.find((topic) => topic.id === selectedTopicId) ?? visibleTopics[0] ?? null;
  const selectedParentTopic = selectedTopic?.parentTopicId
    ? allTopics.find((topic) => topic.id === selectedTopic.parentTopicId)
    : null;

  const sqlTasksQuery = useGetAllSqlTasks(
    { Limit: 100, TopicId: selectedTopic?.id },
    {
      query: {
        enabled: Boolean(selectedTopic),
        retry: false,
      },
    },
  );

  const targetDbsQuery = useGetAllTargetDbs(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(selectedTopic),
        retry: false,
      },
    },
  );

  const dbmsQuery = useGetAllDbmsDictionaries(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(selectedTopic),
        retry: false,
      },
    },
  );

  const sqlTasksResponse = sqlTasksQuery.data;
  const sqlTasksPage = sqlTasksResponse?.status === 200 ? sqlTasksResponse.data : null;
  const sqlTasksError =
    sqlTasksResponse && sqlTasksResponse.status !== 200 ? sqlTasksResponse.data : null;

  const targetDbsResponse = targetDbsQuery.data;
  const targetDbsPage = targetDbsResponse?.status === 200 ? targetDbsResponse.data : null;
  const targetDbsError =
    targetDbsResponse && targetDbsResponse.status !== 200 ? targetDbsResponse.data : null;

  const dbmsResponse = dbmsQuery.data;
  const dbmsPage = dbmsResponse?.status === 200 ? dbmsResponse.data : null;
  const dbmsError = dbmsResponse && dbmsResponse.status !== 200 ? dbmsResponse.data : null;

  const topicTasks = useMemo(() => {
    if (!selectedTopic) {
      return [];
    }

    return (sqlTasksPage?.items ?? [])
      .map(normalizeTask)
      .filter((task): task is TeacherTopicTaskView => task !== null)
      .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  }, [
    selectedTopic,
    sqlTasksPage?.items,
  ]);

  const tasksLoading =
    sqlTasksQuery.isPending ||
    targetDbsQuery.isPending ||
    dbmsQuery.isPending;
  const tasksUnavailable =
    sqlTasksQuery.isError ||
    targetDbsQuery.isError ||
    dbmsQuery.isError;
  const tasksApiError = sqlTasksError ?? targetDbsError ?? dbmsError;

  const parentTopicOptions = useMemo(() => {
    return [
      { value: ROOT_PARENT_TOPIC_VALUE, label: 'Корневая тема' },
      ...allTopics.map((topic) => ({
        value: topic.id,
        label: topic.title,
      })),
    ];
  }, [allTopics]);

  const createTopicMutation = useCreateTopic();

  const resetCreateTopicForm = () => {
    setNewTopicName('');
    setNewTopicDescription('');
    setNewTopicParentId(ROOT_PARENT_TOPIC_VALUE);
    setCreateTopicError('');
  };

  const openCreateTopicModal = () => {
    resetCreateTopicForm();
    createTopicModal.open();
  };

  const closeCreateTopicModal = () => {
    if (createTopicMutation.isPending) {
      return;
    }

    createTopicModal.close();
    resetCreateTopicForm();
  };

  const handleCreateTopic = async () => {
    const topicName = newTopicName.trim();

    if (!topicName) {
      setCreateTopicError('Укажите название темы.');
      return;
    }

    setCreateTopicError('');

    try {
      const response = await createTopicMutation.mutateAsync({
        data: {
          topicName,
          parentTopicId:
            newTopicParentId && newTopicParentId !== ROOT_PARENT_TOPIC_VALUE
              ? newTopicParentId
              : null,
          description: newTopicDescription.trim() || null,
        },
      });

      if (response.status === 201) {
        await queryClient.invalidateQueries({
          queryKey: getGetAllTopicsQueryKey({ Limit: 100 }),
        });

        if (response.data.id) {
          setSelectedTopicId(response.data.id);
        }

        createTopicModal.close();
        resetCreateTopicForm();
        return;
      }

      setCreateTopicError(
        getProblemMessage(response.data, 'Не удалось создать тему в SQL Module API.'),
      );
    } catch {
      setCreateTopicError('Не удалось отправить запрос на создание темы.');
    }
  };

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Преподаватель', to: '/teacher' },
          { label: 'Темы' },
        ]}
      />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <PageHeader
            title="Темы"
            description="Создавайте темы курса и наполняйте их SQL-заданиями."
          />
          <TeacherContourTabs />
        </Group>
      </Stack>

      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, md: 3 }}>
          <AppCard p="sm" h="100%">
            <Stack gap="sm">
              <Button onClick={openCreateTopicModal} size="sm" fullWidth>
                Создать тему
              </Button>

              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Поиск тем..."
                size="xs"
              />

              <Divider />

              {topicsQuery.isPending ? (
                <EmptyState
                  title="Загружаем темы"
                  description="Получаем дерево тем из SQL Module API."
                />
              ) : topicsQuery.isError ? (
                <EmptyState
                  title="SQL Module API недоступен"
                  description="Проверьте, что сервис запущен и runtime config указывает на правильный адрес."
                />
              ) : apiError ? (
                <Alert color="red" title={apiError.title ?? 'Ошибка загрузки'} variant="light">
                  {getProblemMessage(apiError)}
                </Alert>
              ) : filteredTopicTree.length > 0 ? (
                <Stack gap={4}>
                  {filteredTopicTree.map((topic) => (
                    <TopicTreeButton
                      key={topic.id}
                      level={0}
                      onSelect={setSelectedTopicId}
                      selectedTopicId={selectedTopic?.id ?? ''}
                      topic={topic}
                    />
                  ))}
                </Stack>
              ) : (
                <EmptyState
                  title="Темы не найдены"
                  description="Измените поисковый запрос или создайте новую тему."
                />
              )}
            </Stack>
          </AppCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }}>
          {selectedTopic ? (
            <Stack gap="md">
              <AppCard p="md">
                <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
                  <Stack gap="sm">
                    <Group gap="xs">
                      <Text size="xl" lh={1}>
                        □
                      </Text>
                      <Title order={2} size="h4">
                        {selectedTopic.title}
                      </Title>
                    </Group>
                    <Text c="dimmed" size="sm">
                      {selectedParentTopic
                        ? `Родительская тема: ${selectedParentTopic.title}`
                        : 'Корневая тема'}
                    </Text>
                    <Text c="dimmed" size="sm">{selectedTopic.description || 'Описание темы не заполнено.'}</Text>
                    <Group gap="xl">
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs" tt="uppercase">
                          Подтем
                        </Text>
                        <Text fw={700}>{selectedTopic.children.length}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs" tt="uppercase">
                          Всего вложенных тем
                        </Text>
                        <Text fw={700}>{countDescendants(selectedTopic)}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs" tt="uppercase">
                          Последнее изменение
                        </Text>
                        <Text fw={700}>{formatDateTime(selectedTopic.updatedAt)}</Text>
                      </Stack>
                    </Group>
                  </Stack>
                  <Button component={Link} to={`/teacher/topics/${selectedTopic.id}`} size="xs" variant="outline">
                    Изменить
                  </Button>
                </Group>
              </AppCard>

              <AppCard p={0}>
                <Stack gap={0}>
                  <Group justify="space-between" p="md" gap="md" wrap="wrap">
                    <Stack gap={2}>
                      <Title order={3} size="h5">
                        Задания темы
                      </Title>
                      <Text c="dimmed" size="xs">
                        Серверная выборка по теме с агрегированными базой, СУБД и числом попыток.
                      </Text>
                    </Stack>
                    <Button onClick={createTaskModal.open} size="xs">
                      Создать задание
                    </Button>
                  </Group>

                  {tasksLoading ? (
                    <EmptyState
                      title="Загружаем задания"
                      description="Получаем задания темы, эталонные запросы, базы и справочник СУБД."
                    />
                  ) : tasksUnavailable ? (
                    <EmptyState
                      title="SQL Module API недоступен"
                      description="Проверьте, что сервис запущен и runtime config указывает на правильный адрес."
                    />
                  ) : tasksApiError ? (
                    <Alert color="red" title={tasksApiError.title ?? 'Ошибка загрузки'} variant="light" m="md">
                      {getProblemMessage(tasksApiError)}
                    </Alert>
                  ) : topicTasks.length > 0 ? (
                    <Table.ScrollContainer minWidth={760}>
                      <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Название задания</Table.Th>
                            <Table.Th>База</Table.Th>
                            <Table.Th>СУБД</Table.Th>
                            <Table.Th>Сложность</Table.Th>
                            <Table.Th>Обновлено</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {topicTasks.map((task) => (
                            <Table.Tr key={task.id}>
                              <Table.Td>
                                <Anchor component={Link} to={`/teacher/topics/${selectedTopic.id}/tasks/${task.id}`}>
                                  {task.title}
                                </Anchor>
                                <Text c="dimmed" size="xs">
                                  Попыток: {task.attempts}
                                </Text>
                              </Table.Td>
                              <Table.Td>{task.database}</Table.Td>
                              <Table.Td>{task.dbms}</Table.Td>
                              <Table.Td>
                                <Badge color="blue" radius="sm" variant="light">
                                  {task.difficulty}
                                </Badge>
                              </Table.Td>
                              <Table.Td>{task.updatedAt}</Table.Td>
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
                </Stack>
              </AppCard>
            </Stack>
          ) : (
            <AppCard p="md">
              <EmptyState
                title="Выберите тему"
                description="После выбора темы здесь появятся описание и задания."
              />
            </AppCard>
          )}
        </Grid.Col>
      </Grid>
      <Modal
        centered
        opened={createTopicOpened}
        onClose={closeCreateTopicModal}
        title="Создать тему"
        size="md"
      >
        <Stack gap="md">
          {createTopicError ? (
            <Alert color="red" title="Не удалось создать тему" variant="light">
              {createTopicError}
            </Alert>
          ) : null}

          <TextInput
            withAsterisk
            label="Название темы"
            placeholder="Например, Оконные функции"
            value={newTopicName}
            onChange={(event) => setNewTopicName(event.currentTarget.value)}
            disabled={createTopicMutation.isPending}
            maxLength={300}
          />

          <Textarea
            label="Описание"
            minRows={3}
            value={newTopicDescription}
            onChange={(event) => setNewTopicDescription(event.currentTarget.value)}
            disabled={createTopicMutation.isPending}
            maxLength={2000}
          />

          <Select
            label="Родительская тема"
            data={parentTopicOptions}
            value={newTopicParentId}
            onChange={setNewTopicParentId}
            disabled={createTopicMutation.isPending}
            searchable
            nothingFoundMessage="Темы не найдены"
          />

          <Group justify="flex-end" gap="sm" mt="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={closeCreateTopicModal}
              disabled={createTopicMutation.isPending}
            >
              Отмена
            </Button>
            <Button onClick={handleCreateTopic} loading={createTopicMutation.isPending}>
              Создать
            </Button>
          </Group>
        </Stack>
      </Modal>
      <SqlTaskFormModal
        mode="create"
        opened={createTaskOpened}
        onClose={createTaskModal.close}
        initialTopicId={selectedTopic?.id}
        topics={topicsPage?.items ?? []}
        targetDbs={targetDbsPage?.items ?? []}
        dbmsDictionaries={dbmsPage?.items ?? []}
        onSaved={(taskId) => {
          if (taskId && selectedTopic?.id) {
            navigate(`/teacher/topics/${selectedTopic.id}/tasks/${taskId}`);
          }
        }}
      />
    </Page>
  );
}
