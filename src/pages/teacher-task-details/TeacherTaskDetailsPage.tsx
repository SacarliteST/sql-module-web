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
import { Link, useParams } from 'react-router-dom';
import type {
  HttpValidationProblemDetails,
  ProblemDetails,
  TeacherTaskAttemptResponse,
} from '../../api/sqlmodule/model';
import { useGetTeacherTaskDetails } from '../../api/sqlmodule/training/training';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

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
    timeStyle: 'short',
  }).format(date);
}

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback: string,
): string {
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

  if (attempt.status === 0) {
    return 'В очереди';
  }

  if (attempt.status === 1) {
    return 'Выполняется';
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

function getPublicationStatus(status?: number): { color: string; label: string } {
  if (status === 1) {
    return { color: 'green', label: 'Опубликовано' };
  }

  if (status === 2) {
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
  const { taskId = '', topicId = '' } = useParams<{
    taskId: string;
    topicId: string;
  }>();

  const detailsQuery = useGetTeacherTaskDetails(taskId, {
    query: {
      enabled: Boolean(taskId),
      retry: false,
    },
  });
  const detailsResponse = detailsQuery.data;
  const task = detailsResponse?.status === 200 ? detailsResponse.data : null;
  const apiError =
    detailsResponse && detailsResponse.status !== 200 ? detailsResponse.data : null;
  const sqlQuery = task?.sqlQuery;
  const targetDb = task?.targetDb;
  const attempts = task?.lastAttempts ?? [];
  const publication = getPublicationStatus(task?.publicationStatus);

  const taskTitle = task?.taskName?.trim() || 'Детали задания';
  const topicTitle = task?.topicName?.trim() || 'Тема не указана';
  const resolvedTopicId = task?.topicId ?? topicId;
  const databaseName = targetDb?.dbName?.trim() || 'База не указана';
  const dbmsName = getDbmsName(targetDb?.dbmsName);

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
              <Button disabled variant="light">
                Изменить
              </Button>
              <Button disabled variant="light">
                Настроить проверку
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
            <MetricCard label="Последнее изменение" value={formatDate(task.updatedAt)} />
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
                        preview
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
                        <Text size="sm">{formatDate(task.createdAt)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          Обновлено
                        </Text>
                        <Text size="sm">{formatDate(task.updatedAt)}</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="dimmed" size="sm">
                          Автор
                        </Text>
                        <Text size="sm">{shortId(task.createdById)}</Text>
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
                          <Table.Td>{formatDate(attempt.finishedAt)}</Table.Td>
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
    </Page>
  );
}
