import {
  Alert,
  Badge,
  Box,
  Button,
  Code,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type {
  HttpValidationProblemDetails,
  ProblemDetails,
  TeacherTaskAttemptResponse,
} from '../../api/sqlmodule/model';
import {
  TeacherTaskAttemptResponseStatus,
  TeacherTaskDetailsResponsePublicationStatus,
} from '../../api/sqlmodule/model';
import { useGetAllTargetDbs } from '../../api/sqlmodule/schema/schema';
import {
  getGetAllSqlTasksQueryKey,
  getGetTeacherTaskDetailsQueryKey,
  useArchiveSqlTask,
  useDeleteSqlTask,
  useGetAllTopics,
  useGetTeacherTaskDetails,
  usePublishSqlTask,
} from '../../api/sqlmodule/training/training';
import { SqlQueryValidationPreview, SqlTaskFormModal } from '../../features/sql-tasks';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { formatAuditActor, formatAuditDateTime } from '../../shared/lib/teacher-audit';
import {
  AppCard,
  ConfirmModal,
  EmptyState,
  Page,
  PageBreadcrumbs,
  PageHeader,
} from '../../shared/ui';

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback: string,
): string {
  if (problem && 'errors' in problem && problem.errors) {
    const validationMessages = Object.values(problem.errors).flat();

    if (validationMessages.length > 0) {
      return validationMessages.join(' ');
    }
  }

  const violationMessages = problem?.violations
    ?.map((violation) => violation.message?.trim())
    .filter((message): message is string => Boolean(message));

  if (violationMessages?.length) {
    return violationMessages.join(' ');
  }

  return problem?.detail?.trim() || problem?.title?.trim() || fallback;
}

function getDbmsName(dbmsName?: string | null, systemName?: string | null): string {
  return dbmsName?.trim() || systemName?.trim() || 'СУБД не указана';
}

function getAttemptStatusLabel(attempt: TeacherTaskAttemptResponse): string {
  if (attempt.isCorrect === true) {
    return 'Верно';
  }

  if (attempt.isCorrect === false) {
    return 'Ошибка';
  }

  if (attempt.status === TeacherTaskAttemptResponseStatus.Error) {
    return 'Ошибка';
  }

  if (attempt.status === TeacherTaskAttemptResponseStatus.TimedOut) {
    return 'Таймаут';
  }

  return 'Проверено';
}

function getAttemptStatusColor(attempt: TeacherTaskAttemptResponse): string {
  if (attempt.isCorrect === true) {
    return 'green';
  }

  if (attempt.isCorrect === false) {
    return 'red';
  }

  return 'gray';
}

function formatDuration(value?: number | null): string {
  if (value === null || value === undefined) {
    return 'н/д';
  }

  return `${value} мс`;
}

function shortId(value?: string | null): string {
  if (!value) {
    return 'н/д';
  }

  return value.length > 8 ? value.slice(0, 8) : value;
}

function getPublicationStatus(status?: string): { color: string; label: string } {
  if (status === TeacherTaskDetailsResponsePublicationStatus.Published) {
    return { color: 'green', label: 'Опубликовано' };
  }

  if (status === TeacherTaskDetailsResponsePublicationStatus.Archived) {
    return { color: 'gray', label: 'В архиве' };
  }

  return { color: 'yellow', label: 'Черновик' };
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <AppCard p="md" shadow="xs">
      <Stack gap={4}>
        <Text c="dimmed" size="xs" tt="uppercase">
          {label}
        </Text>
        <Text fw={700}>{value}</Text>
      </Stack>
    </AppCard>
  );
}

export function TeacherTaskDetailsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { taskId = '', topicId = '' } = useParams<{
    taskId: string;
    topicId: string;
  }>();
  const [editTaskOpened, editTaskModal] = useDisclosure(false);
  const [publishOpened, publishModal] = useDisclosure(false);
  const [deleteOpened, deleteModal] = useDisclosure(false);
  const [archiveOpened, archiveModal] = useDisclosure(false);
  const [publishError, setPublishError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [archiveError, setArchiveError] = useState('');
  const publishMutation = usePublishSqlTask();
  const deleteMutation = useDeleteSqlTask();
  const archiveMutation = useArchiveSqlTask();

  const detailsQuery = useGetTeacherTaskDetails(taskId, {
    query: {
      enabled: Boolean(taskId),
      retry: false,
    },
  });
  const topicsQuery = useGetAllTopics(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(taskId),
        retry: false,
      },
    },
  );
  const targetDbsQuery = useGetAllTargetDbs(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(taskId),
        retry: false,
      },
    },
  );
  const dbmsQuery = useGetAllDbmsDictionaries(
    { Limit: 100 },
    {
      query: {
        enabled: Boolean(taskId),
        retry: false,
      },
    },
  );
  const detailsResponse = detailsQuery.data;
  const task = detailsResponse?.status === 200 ? detailsResponse.data : null;
  const apiError =
    detailsResponse && detailsResponse.status !== 200 ? detailsResponse.data : null;
  const topicsResponse = topicsQuery.data;
  const topicsPage = topicsResponse?.status === 200 ? topicsResponse.data : null;
  const targetDbsResponse = targetDbsQuery.data;
  const targetDbsPage = targetDbsResponse?.status === 200 ? targetDbsResponse.data : null;
  const dbmsResponse = dbmsQuery.data;
  const dbmsPage = dbmsResponse?.status === 200 ? dbmsResponse.data : null;
  const sqlQuery = task?.sqlQuery;
  const targetDb = task?.targetDb;
  const attempts = task?.lastAttempts ?? [];
  const publication = getPublicationStatus(task?.publicationStatus);
  const canPublish = Boolean(task?.canPublish);

  const taskTitle = task?.taskName?.trim() || 'Детали задания';
  const topicTitle = task?.topicName?.trim() || 'Тема не указана';
  const resolvedTopicId = task?.topicId ?? topicId;
  const databaseName = targetDb?.dbName?.trim() || 'База не указана';
  const dbmsName = getDbmsName(targetDb?.dbmsName);

  const openPublishModal = () => {
    setPublishError('');
    publishModal.open();
  };

  const handlePublish = async () => {
    if (!task?.taskId) {
      return;
    }

    setPublishError('');

    try {
      const response = await publishMutation.mutateAsync({ id: task.taskId });

      if (response.status === 200) {
        await queryClient.invalidateQueries({
          queryKey: getGetTeacherTaskDetailsQueryKey(task.taskId),
        });
        await queryClient.invalidateQueries({
          queryKey: getGetAllSqlTasksQueryKey({ Limit: 100 }),
        });
        await detailsQuery.refetch();
        publishModal.close();
        return;
      }

      setPublishError(
        getProblemMessage(response.data, 'Не удалось опубликовать задание.'),
      );
    } catch {
      setPublishError('Не удалось отправить запрос на публикацию в SQL Module API.');
    }
  };

  const openDeleteModal = () => {
    setDeleteError('');
    deleteModal.open();
  };

  const handleDelete = async () => {
    if (!task?.taskId) {
      return;
    }

    try {
      const response = await deleteMutation.mutateAsync({ id: task.taskId });

      if (response.status !== 204) {
        setDeleteError(getProblemMessage(response.data, 'Не удалось удалить задание.'));
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: getGetAllSqlTasksQueryKey({ Limit: 100 }),
      });
      navigate(`/teacher/topics/${resolvedTopicId}`);
    } catch {
      setDeleteError('Не удалось отправить запрос на удаление в SQL Module API.');
    }
  };

  const handleArchive = async () => {
    if (!task?.taskId) return;
    setArchiveError('');
    const response = await archiveMutation.mutateAsync({ id: task.taskId });
    if (response.status !== 200) { setArchiveError(getProblemMessage(response.data, 'Не удалось архивировать задание.')); return; }
    archiveModal.close();
    await detailsQuery.refetch();
    await queryClient.invalidateQueries({ queryKey: getGetAllSqlTasksQueryKey({ Limit: 100 }) });
  };

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Преподаватель', to: '/teacher' },
          { label: 'Темы', to: '/teacher/topics' },
          { label: topicTitle, to: `/teacher/topics/${resolvedTopicId}` },
          { label: taskTitle },
        ]}
      />

      <Stack gap="md">
        <PageHeader
          title={taskTitle}
          description={`Тема: ${topicTitle}`}
          actions={
            <>
              <Button disabled={!task?.canEditTask} variant="light" onClick={editTaskModal.open}>
                Изменить
              </Button>
              <Button
                disabled={!canPublish}
                loading={publishMutation.isPending}
                onClick={openPublishModal}
              >
                Опубликовать
              </Button>
              <Button disabled={!task?.canEditReferenceQuery} variant="light" onClick={editTaskModal.open}>
                Эталон и проверка
              </Button>
              <Button disabled={!task?.canArchive} variant="outline" onClick={() => { setArchiveError(''); archiveModal.open(); }}>
                Архивировать
              </Button>
              <Button color="red" disabled={!task?.canDelete} variant="outline" onClick={openDeleteModal}>
                Удалить
              </Button>
              <Button
                component={Link}
                disabled={!targetDb?.targetDbId}
                to={targetDb?.targetDbId ? `/teacher/databases/${targetDb.targetDbId}` : '#'}
              >
                Открыть базу
              </Button>
            </>
          }
        />
        <TeacherContourTabs />
      </Stack>

      {publishError ? (
        <Alert color="red" title="Не удалось опубликовать задание" variant="light">
          {publishError}
        </Alert>
      ) : null}
      {task?.lifecycleRestriction ? <Alert color="yellow" title="Ограничение действий">{task.lifecycleRestriction}</Alert> : null}
      {task?.referenceQueryEditRestriction ? <Alert color="yellow" title="Эталон нельзя изменить">{task.referenceQueryEditRestriction}</Alert> : null}

      {detailsQuery.isPending ? (
        <AppCard p="md">
          <EmptyState
            title="Загружаем задание"
            description="Получаем задание, эталонный запрос, учебную базу и последние попытки."
          />
        </AppCard>
      ) : detailsQuery.isError ? (
        <AppCard p="md">
          <EmptyState
            title="SQL Module API недоступен"
            description="Проверьте, что сервис запущен и runtime config указывает на правильный адрес."
          />
        </AppCard>
      ) : apiError ? (
        <AppCard p="md">
          <Alert color="red" title={apiError.title ?? 'Ошибка загрузки'} variant="light">
            {getProblemMessage(apiError, 'Не удалось загрузить детали задания.')}
          </Alert>
        </AppCard>
      ) : task ? (
        <Stack gap="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 5 }} spacing="md">
            <MetricCard label="Сложность" value={`${task.difficultyLevel ?? 'н/д'} из 5`} />
            <MetricCard label="Учебная база" value={databaseName} />
            <MetricCard label="СУБД" value={dbmsName} />
            <MetricCard label="Попыток" value={String(task.attemptsCount ?? attempts.length)} />
            <MetricCard label="Последнее изменение" value={formatAuditDateTime(task.updatedAt)} />
          </SimpleGrid>

          <Grid gutter="xl" align="flex-start">
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Stack gap="md">
                <AppCard p={0}>
                  <Stack gap={0}>
                    <Group p="md" style={{ borderBottom: '1px solid #dee2e6' }}>
                      <Title order={2} size="h5">
                        Условие задания
                      </Title>
                    </Group>
                    <Text p="md">
                      {task.description?.trim() || 'Условие задания не заполнено.'}
                    </Text>
                  </Stack>
                </AppCard>

                <AppCard p={0}>
                  <Stack gap={0}>
                    <Group justify="space-between" p="md" style={{ borderBottom: '1px solid #dee2e6' }}>
                      <Title order={2} size="h5">
                        Эталонный SQL-запрос
                      </Title>
                      <Badge color="gray" radius="sm" variant="light">
                        read-only sandbox
                      </Badge>
                    </Group>
                    <Box bg="#1f2933" p="md">
                      <Code
                        block
                        c="gray.1"
                        bg="transparent"
                        style={{
                          fontFamily: 'JetBrains Mono, Consolas, monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {sqlQuery?.sqlText?.trim() || '-- Эталонный SQL-запрос не указан'}
                      </Code>
                    </Box>
                    <Group p="md" gap="sm">
                      <Badge color={sqlQuery?.isRequiredColumnOrder ? 'green' : 'gray'} radius="sm" variant="light">
                        Порядок колонок: {sqlQuery?.isRequiredColumnOrder ? 'строгий' : 'свободный'}
                      </Badge>
                      <Badge color={sqlQuery?.isRequiredRowOrder ? 'green' : 'gray'} radius="sm" variant="light">
                        Порядок строк: {sqlQuery?.isRequiredRowOrder ? 'строгий' : 'свободный'}
                      </Badge>
                    </Group>
                    <Box p="md" pt={0}>
                      <SqlQueryValidationPreview
                        queryText={sqlQuery?.sqlText}
                        targetDbId={targetDb?.targetDbId}
                      />
                    </Box>
                  </Stack>
                </AppCard>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 4 }}>
              <Stack gap="md">
                <AppCard p="md">
                  <Stack gap="md">
                    <Title order={2} size="h5">
                      Контекст выполнения
                    </Title>
                    <Stack gap={4}>
                      <Text c="dimmed" size="xs" tt="uppercase">
                        База
                      </Text>
                      <Text fw={600}>{databaseName}</Text>
                      <Text c="dimmed" size="sm">
                        {dbmsName}
                      </Text>
                    </Stack>
                    <Stack gap={4}>
                      <Text c="dimmed" size="xs" tt="uppercase">
                        Таблицы
                      </Text>
                      <Text c="dimmed" size="sm">
                        {(targetDb?.tables ?? []).length > 0
                          ? targetDb?.tables
                              ?.map((table) => `${table.tableName} (${table.columnsCount ?? 0})`)
                              .join(', ')
                          : 'В учебной базе нет таблиц.'}
                      </Text>
                    </Stack>
                    <Button
                      component={Link}
                      disabled={!targetDb?.targetDbId}
                      to={
                        targetDb?.targetDbId
                          ? `/teacher/databases/${targetDb.targetDbId}/schema`
                          : '#'
                      }
                      variant="outline"
                    >
                      Открыть схему
                    </Button>
                  </Stack>
                </AppCard>

                <AppCard p="md">
                  <Stack gap="md">
                    <Title order={2} size="h5">
                      Статус
                    </Title>
                    <Group>
                      <Badge color={publication.color} radius="sm" variant="light">
                        {publication.label}
                      </Badge>
                    </Group>
                    <Stack gap={6}>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          Создано
                        </Text>
                        <Text size="sm">{formatAuditDateTime(task.createdAt)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          Обновлено
                        </Text>
                        <Text size="sm">{formatAuditDateTime(task.updatedAt)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          Автор
                        </Text>
                        <Text size="sm">{formatAuditActor(task.createdByName, task.createdById)}</Text>
                      </Group>
                    </Stack>
                  </Stack>
                </AppCard>
              </Stack>
            </Grid.Col>
          </Grid>

          <Stack gap="md">
            <Title order={2} size="h4">
              Последние попытки
            </Title>
            <AppCard p={0}>
              {attempts.length > 0 ? (
                <Table.ScrollContainer minWidth={760}>
                  <Table striped highlightOnHover>
                    <Table.Thead bg="#f3f4f5">
                      <Table.Tr>
                        <Table.Th>Студент</Table.Th>
                        <Table.Th>Статус</Table.Th>
                        <Table.Th>Время выполнения</Table.Th>
                        <Table.Th>Дата</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {attempts.map((attempt) => (
                        <Table.Tr key={attempt.attemptId}>
                          <Table.Td>
                            {attempt.studentName?.trim() || shortId(attempt.studentId)}
                          </Table.Td>
                          <Table.Td>
                            <Badge color={getAttemptStatusColor(attempt)} radius="sm" variant="light">
                              {getAttemptStatusLabel(attempt)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{formatDuration(attempt.durationMs)}</Table.Td>
                          <Table.Td>{formatAuditDateTime(attempt.finishedAt)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <EmptyState
                  title="Попыток пока нет"
                  description="После отправки решений студентами здесь появится краткая история."
                />
              )}
            </AppCard>
          </Stack>
        </Stack>
      ) : (
        <AppCard p="md">
          <EmptyState
            title="Задание не найдено"
            description="Вернитесь к теме и выберите существующее задание."
          />
        </AppCard>
      )}
      <SqlTaskFormModal
        mode="edit"
        opened={editTaskOpened}
        onClose={editTaskModal.close}
        initialTopicId={resolvedTopicId}
        task={task}
        topics={topicsPage?.items ?? []}
        targetDbs={targetDbsPage?.items ?? []}
        dbmsDictionaries={dbmsPage?.items ?? []}
        onSaved={() => {
          void detailsQuery.refetch();
        }}
      />
      <ConfirmModal
        opened={archiveOpened}
        title="Архивировать задание"
        message="Задание перестанет быть активным для новых прохождений. История попыток сохранится."
        confirmLabel="Архивировать"
        loading={archiveMutation.isPending}
        onCancel={archiveModal.close}
        onConfirm={() => void handleArchive()}
      >{archiveError ? <Alert color="red">{archiveError}</Alert> : null}</ConfirmModal>
      <ConfirmModal
        opened={publishOpened}
        title="Опубликовать задание"
        message="После публикации задание станет доступно студентам в разрешённых сценариях. Backend проверит эталонный результат, учебную базу и наличие попыток."
        confirmLabel="Опубликовать"
        confirmColor="blue"
        loading={publishMutation.isPending}
        onCancel={publishModal.close}
        onConfirm={() => void handlePublish()}
      >
        <Stack gap={4}>
          <Text c="dimmed" size="sm">
            Если эталонный SQL-запрос ещё не имеет проверенного результата, публикация будет
            отклонена.
          </Text>
          {publishError ? (
            <Alert color="red" title="Публикация отклонена" variant="light">
              {publishError}
            </Alert>
          ) : null}
        </Stack>
      </ConfirmModal>
      <ConfirmModal
        opened={deleteOpened}
        title="Удалить задание"
        message="Задание можно удалить только при отсутствии попыток. Это действие нельзя отменить."
        confirmLabel="Удалить"
        confirmColor="red"
        loading={deleteMutation.isPending}
        onCancel={deleteModal.close}
        onConfirm={() => void handleDelete()}
      >
        {deleteError ? (
          <Alert color="red" title="Удаление отклонено" variant="light">
            {deleteError}
          </Alert>
        ) : null}
      </ConfirmModal>
    </Page>
  );
}
