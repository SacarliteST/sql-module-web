import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type {
  HttpValidationProblemDetails,
  ProblemDetails,
  SqlTaskResponse,
  TopicResponse,
} from '../../api/sqlmodule/model';
import { PublicationStatus } from '../../api/sqlmodule/model';
import { useGetAllTargetDbs } from '../../api/sqlmodule/schema/schema';
import {
  useGetAllSqlTasks,
  useGetAllTopics,
  useGetTopicById,
  useCreateTopic,
  useDeleteTopic,
  useMoveTopic,
  useUpdateTopic,
} from '../../api/sqlmodule/training/training';
import { SqlTaskFormModal } from '../../features/sql-tasks';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { formatAuditDate as formatDate } from '../../shared/lib/teacher-audit';
import { AppCard, ConfirmModal, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

type TopicView = {
  id: string;
  title: string;
  parentTopicId: string | null;
  description: string;
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
    description: topic.description?.trim() ?? '',
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
  };
}

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback: string,
): string {
  return problem?.detail?.trim() || problem?.title?.trim() || fallback;
}

function countDescendants(topicId: string, topics: TopicView[]): number {
  const children = topics.filter((topic) => topic.parentTopicId === topicId);

  return children.reduce(
    (count, child) => count + 1 + countDescendants(child.id, topics),
    0,
  );
}

function normalizeTask(
  task: SqlTaskResponse,
): TopicTaskView | null {
  if (!task.id) {
    return null;
  }

  return {
    id: task.id,
    title: task.taskName?.trim() || 'Без названия',
    database: task.targetDbName?.trim() || 'База не указана',
    dbms: task.dbmsName?.trim() || 'СУБД не указана',
    difficultyLevel: task.difficultyLevel ?? null,
    attempts: String(task.attemptsCount ?? 0),
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
            bg={index < normalizedValue ? 'indigo.6' : 'gray.3'}
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
  const toneColor = tone === 'blue' ? 'var(--mantine-primary-color-filled)' : tone === 'orange' ? 'var(--mantine-color-orange-8)' : 'var(--mantine-color-gray-6)';
  const toneBackground = tone === 'blue' ? 'var(--mantine-primary-color-light)' : tone === 'orange' ? 'var(--mantine-color-orange-0)' : 'var(--mantine-color-gray-1)';

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
  const navigate = useNavigate();
  const { topicId = '' } = useParams<{ topicId: string }>();
  const [createTaskOpened, createTaskModal] = useDisclosure(false);
  const [editOpened, editModal] = useDisclosure(false);
  const [childOpened, childModal] = useDisclosure(false);
  const [moveOpened, moveModal] = useDisclosure(false);
  const [deleteOpened, deleteModal] = useDisclosure(false);
  const [topicName, setTopicName] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [childName, setChildName] = useState('');
  const [childDescription, setChildDescription] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const [taskNameFilter, setTaskNameFilter] = useState('');
  const [taskDbFilter, setTaskDbFilter] = useState<string | null>(null);
  const [taskDifficultyFilter, setTaskDifficultyFilter] = useState<string | null>(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string | null>(null);
  const updateTopicMutation = useUpdateTopic();
  const createTopicMutation = useCreateTopic();
  const moveTopicMutation = useMoveTopic();
  const deleteTopicMutation = useDeleteTopic();

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
    { Offset: (taskPage - 1) * 20, Limit: 20, TopicId: topicId, Name: taskNameFilter.trim() || undefined, TargetDbId: taskDbFilter || undefined, DifficultyLevel: taskDifficultyFilter ? Number(taskDifficultyFilter) : undefined, PublicationStatus: taskStatusFilter as PublicationStatus | null ?? undefined },
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
  const taskPageCount = Math.max(1, Math.ceil((sqlTasksPage?.count ?? 0) / 20));

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

    return (sqlTasksPage?.items ?? [])
      .map((task) => normalizeTask(task))
      .filter((task): task is TopicTaskView => task !== null)
      .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  }, [sqlTasksPage?.items, topic]);

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
    targetDbsQuery.isPending ||
    dbmsQuery.isPending;
  const isUnavailable =
    topicQuery.isError ||
    topicsQuery.isError ||
    sqlTasksQuery.isError ||
    targetDbsQuery.isError ||
    dbmsQuery.isError;
  const apiError =
    topicError ?? topicsError ?? sqlTasksError ?? targetDbsError ?? dbmsError;

  const isTopicMutationPending =
    updateTopicMutation.isPending ||
    createTopicMutation.isPending ||
    moveTopicMutation.isPending ||
    deleteTopicMutation.isPending;

  const movableParentOptions = useMemo(() => {
    if (!topic) {
      return [];
    }

    const byId = new Map(allTopics.map((item) => [item.id, item]));
    const isDescendant = (candidateId: string) => {
      let current = byId.get(candidateId);
      const visited = new Set<string>();

      while (current?.parentTopicId && !visited.has(current.id)) {
        if (current.parentTopicId === topic.id) {
          return true;
        }
        visited.add(current.id);
        current = byId.get(current.parentTopicId);
      }

      return false;
    };

    return allTopics
      .filter((item) => item.id !== topic.id && !isDescendant(item.id))
      .map((item) => ({ value: item.id, label: item.title }))
      .sort((left, right) => left.label.localeCompare(right.label, 'ru'));
  }, [allTopics, topic]);

  const refreshTopics = async () => {
    await Promise.all([topicQuery.refetch(), topicsQuery.refetch()]);
  };

  const openEdit = () => {
    setTopicName(topic?.title ?? '');
    setTopicDescription(topic?.description ?? '');
    setMutationError('');
    editModal.open();
  };

  const openChild = () => {
    setChildName('');
    setChildDescription('');
    setMutationError('');
    childModal.open();
  };

  const openMove = () => {
    setNewParentId(topic?.parentTopicId ?? null);
    setMutationError('');
    moveModal.open();
  };

  const handleUpdateTopic = async () => {
    if (!topic || !topicName.trim()) {
      setMutationError('Введите название темы.');
      return;
    }

    const response = await updateTopicMutation.mutateAsync({ id: topic.id, data: { topicName: topicName.trim(), description: topicDescription.trim() || null } });
    if (response.status !== 204) {
      setMutationError(getProblemMessage(response.data, 'Не удалось изменить тему.'));
      return;
    }
    await refreshTopics();
    editModal.close();
  };

  const handleCreateChild = async () => {
    if (!topic || !childName.trim()) {
      setMutationError('Введите название подтемы.');
      return;
    }

    const response = await createTopicMutation.mutateAsync({ data: { parentTopicId: topic.id, topicName: childName.trim(), description: childDescription.trim() || null } });
    if (response.status !== 201) {
      setMutationError(getProblemMessage(response.data, 'Не удалось создать подтему.'));
      return;
    }
    await topicsQuery.refetch();
    childModal.close();
  };

  const handleMoveTopic = async () => {
    if (!topic) return;
    const response = await moveTopicMutation.mutateAsync({ id: topic.id, data: { parentTopicId: newParentId } });
    if (response.status !== 204) {
      setMutationError(getProblemMessage(response.data, 'Не удалось переместить тему.'));
      return;
    }
    await refreshTopics();
    moveModal.close();
  };

  const handleDeleteTopic = async () => {
    if (!topic) return;
    const response = await deleteTopicMutation.mutateAsync({ id: topic.id });
    if (response.status !== 204) {
      setMutationError(getProblemMessage(response.data, 'Не удалось удалить тему.'));
      deleteModal.close();
      return;
    }
    navigate('/teacher/topics');
  };

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
              <Button disabled={!topic} variant="light" onClick={openEdit}>
                Изменить
              </Button>
              <Button disabled={!topic} variant="light" onClick={openChild}>
                Создать подтему
              </Button>
              <Button disabled={!topic} variant="light" onClick={openMove}>
                Переместить
              </Button>
              <Button color="red" disabled={!topic} variant="outline" onClick={deleteModal.open}>
                Удалить
              </Button>
              <Button disabled={!topic} onClick={createTaskModal.open}>
                Создать задание
              </Button>
            </>
          }
        />
        <TeacherContourTabs />
        {mutationError && !editOpened && !childOpened && !moveOpened ? (
          <Alert color="red" title="Операция с темой не выполнена">
            {mutationError}
          </Alert>
        ) : null}
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

          <Tabs defaultValue="subtopics" keepMounted={false}>
            <Tabs.List mb="lg">
              <Tabs.Tab value="subtopics">Подтемы</Tabs.Tab>
              <Tabs.Tab value="tasks">Задания</Tabs.Tab>
              <Tabs.Tab value="description">Описание</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="subtopics">
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
                    description="Создайте подтему, чтобы расширить иерархию учебных материалов."
                  />
                </AppCard>
              )}
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="tasks">
              <Stack gap="md">
              <Group justify="space-between" gap="md" wrap="wrap">
                <Title order={3} size="h4">
                  Задания темы
                </Title>
                <Group gap="xs"><TextInput size="xs" placeholder="Название" value={taskNameFilter} onChange={(event) => { setTaskNameFilter(event.currentTarget.value); setTaskPage(1); }} /><Select size="xs" clearable placeholder="База" data={(targetDbsPage?.items ?? []).filter((item) => item.id).map((item) => ({ value: item.id as string, label: item.dbName?.trim() || 'База' }))} value={taskDbFilter} onChange={(value) => { setTaskDbFilter(value); setTaskPage(1); }} /><Select size="xs" clearable placeholder="Сложность" data={['1','2','3','4','5']} value={taskDifficultyFilter} onChange={(value) => { setTaskDifficultyFilter(value); setTaskPage(1); }} /><Select size="xs" clearable placeholder="Статус" data={[{ value: PublicationStatus.Draft, label: 'Черновик' }, { value: PublicationStatus.Published, label: 'Опубликовано' }, { value: PublicationStatus.Archived, label: 'В архиве' }]} value={taskStatusFilter} onChange={(value) => { setTaskStatusFilter(value); setTaskPage(1); }} /></Group>
              </Group>

              <AppCard p={0}>
                {topicTasks.length > 0 ? (
                  <>
                  <Table.ScrollContainer minWidth={720}>
                    <Table highlightOnHover withColumnBorders={false}>
                      <Table.Thead bg="gray.1">
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
                  {taskPageCount > 1 ? <Pagination m="md" value={taskPage} total={taskPageCount} onChange={setTaskPage} /> : null}
                  </>
                ) : (
                  <EmptyState
                    title="В теме пока нет заданий"
                    description="Создайте первое SQL-задание для выбранной темы."
                  />
                )}
              </AppCard>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="description">
              <AppCard p="xl">
                <Stack gap="sm">
                  <Title order={3} size="h5">
                    Описание темы
                  </Title>
                  <Text c="dimmed" maw={860}>
                    {topic.description || 'Описание темы не заполнено.'}
                  </Text>
                </Stack>
              </AppCard>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      ) : (
        <AppCard p="md">
          <EmptyState
            title="Тема не найдена"
            description="Вернитесь к списку тем и выберите существующую тему."
          />
        </AppCard>
      )}
      <SqlTaskFormModal
        mode="create"
        opened={createTaskOpened}
        onClose={createTaskModal.close}
        initialTopicId={topic?.id ?? topicId}
        topics={topicsPage?.items ?? []}
        targetDbs={targetDbsPage?.items ?? []}
        dbmsDictionaries={dbmsPage?.items ?? []}
        onSaved={(taskId) => {
          if (taskId && (topic?.id ?? topicId)) {
            navigate(`/teacher/topics/${topic?.id ?? topicId}/tasks/${taskId}`);
          }
        }}
      />
      <Modal opened={editOpened} onClose={editModal.close} title="Изменить тему" centered>
        <Stack gap="md">
          {mutationError ? <Alert color="red">{mutationError}</Alert> : null}
          <TextInput label="Название" withAsterisk value={topicName} disabled={isTopicMutationPending} onChange={(event) => setTopicName(event.currentTarget.value)} />
          <Textarea label="Описание" minRows={3} value={topicDescription} disabled={isTopicMutationPending} onChange={(event) => setTopicDescription(event.currentTarget.value)} />
          <Group justify="flex-end"><Button variant="default" onClick={editModal.close}>Отмена</Button><Button loading={updateTopicMutation.isPending} onClick={() => void handleUpdateTopic()}>Сохранить</Button></Group>
        </Stack>
      </Modal>
      <Modal opened={childOpened} onClose={childModal.close} title="Создать подтему" centered>
        <Stack gap="md">
          {mutationError ? <Alert color="red">{mutationError}</Alert> : null}
          <TextInput label="Название" withAsterisk value={childName} disabled={isTopicMutationPending} onChange={(event) => setChildName(event.currentTarget.value)} />
          <Textarea label="Описание" minRows={3} value={childDescription} disabled={isTopicMutationPending} onChange={(event) => setChildDescription(event.currentTarget.value)} />
          <Group justify="flex-end"><Button variant="default" onClick={childModal.close}>Отмена</Button><Button loading={createTopicMutation.isPending} onClick={() => void handleCreateChild()}>Создать</Button></Group>
        </Stack>
      </Modal>
      <Modal opened={moveOpened} onClose={moveModal.close} title="Переместить тему" centered>
        <Stack gap="md">
          {mutationError ? <Alert color="red">{mutationError}</Alert> : null}
          <Select label="Новая родительская тема" clearable searchable data={movableParentOptions} value={newParentId} disabled={isTopicMutationPending} placeholder="Корневая тема" onChange={setNewParentId} />
          <Text c="dimmed" size="xs">Очистите поле, чтобы сделать тему корневой. Потомки исключены из списка для защиты от циклов.</Text>
          <Group justify="flex-end"><Button variant="default" onClick={moveModal.close}>Отмена</Button><Button loading={moveTopicMutation.isPending} onClick={() => void handleMoveTopic()}>Переместить</Button></Group>
        </Stack>
      </Modal>
      <ConfirmModal opened={deleteOpened} title="Удалить тему" message="Тему можно удалить только без подтем и заданий. Backend проверит связанные данные." confirmLabel="Удалить" confirmColor="red" loading={deleteTopicMutation.isPending} onCancel={deleteModal.close} onConfirm={() => void handleDeleteTopic()} />
    </Page>
  );
}
