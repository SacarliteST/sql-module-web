import {
  Alert,
  Anchor,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type {
  DbmsDictionaryResponse,
  HttpValidationProblemDetails,
  ProblemDetails,
  PublicationStatus,
  SqlQueryResponse,
  TargetDbResponse,
  TeacherTaskDetailsResponse,
  TopicResponse,
} from '../../../api/sqlmodule/model';
import { PublicationStatus as PublicationStatusValue } from '../../../api/sqlmodule/model';
import {
  getGetAllSqlTasksQueryKey,
  getGetTeacherTaskDetailsQueryKey,
  useCreateSqlTask,
  useUpdateSqlTask,
} from '../../../api/sqlmodule/training/training';
import { SqlQueryValidationPreview } from './SqlQueryValidationPreview';
import { SqlPreview } from './SqlPreview';

type TopicOption = {
  value: string;
  label: string;
};

type SqlTaskFormModalMode = 'create' | 'edit';

type SqlTaskFormModalProps = {
  opened: boolean;
  mode: SqlTaskFormModalMode;
  onClose: () => void;
  initialTopicId?: string;
  task?: TeacherTaskDetailsResponse | null;
  topics?: TopicResponse[];
  sqlQueries?: SqlQueryResponse[];
  targetDbs?: TargetDbResponse[];
  dbmsDictionaries?: DbmsDictionaryResponse[];
  onSaved?: (taskId?: string) => void;
};

type FormValues = {
  taskName: string;
  topicId: string;
  sqlQueryId: string;
  difficultyLevel: string;
  publicationStatus: string;
  taskText: string;
};

const DEFAULT_VALUES: FormValues = {
  difficultyLevel: '1',
  publicationStatus: String(PublicationStatusValue.NUMBER_0),
  sqlQueryId: '',
  taskName: '',
  taskText: '',
  topicId: '',
};

function getProblemMessage(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
  fallback: string,
): string {
  if (!problem) {
    return fallback;
  }

  if ('errors' in problem && problem.errors) {
    const validationMessages = Object.values(problem.errors).flat();

    if (validationMessages.length > 0) {
      return validationMessages.join(' ');
    }
  }

  return problem.detail?.trim() || problem.title?.trim() || fallback;
}

function normalizeTopicOption(topic: TopicResponse): TopicOption | null {
  if (!topic.id) {
    return null;
  }

  return {
    value: topic.id,
    label: topic.topicName?.trim() || 'Без названия',
  };
}

function getDbmsName(dbms?: DbmsDictionaryResponse | null): string {
  return dbms?.dbmsName?.trim() || dbms?.dbmsSystemName?.trim() || 'СУБД не указана';
}

function getPublicationStatusLabel(status: PublicationStatus): string {
  if (status === PublicationStatusValue.NUMBER_1) {
    return 'Опубликовано';
  }

  if (status === PublicationStatusValue.NUMBER_2) {
    return 'В архиве';
  }

  return 'Черновик';
}

function getInitialValues(
  mode: SqlTaskFormModalMode,
  initialTopicId?: string,
  task?: TeacherTaskDetailsResponse | null,
): FormValues {
  if (mode === 'edit' && task) {
    return {
      difficultyLevel: String(task.difficultyLevel ?? 1),
      publicationStatus: String(task.publicationStatus ?? PublicationStatusValue.NUMBER_0),
      sqlQueryId: task.sqlQuery?.sqlQueryId ?? '',
      taskName: task.taskName?.trim() ?? '',
      taskText: task.description?.trim() ?? '',
      topicId: task.topicId ?? initialTopicId ?? '',
    };
  }

  return {
    ...DEFAULT_VALUES,
    topicId: initialTopicId ?? '',
  };
}

export function SqlTaskFormModal({
  dbmsDictionaries = [],
  initialTopicId,
  mode,
  onClose,
  onSaved,
  opened,
  sqlQueries = [],
  targetDbs = [],
  task,
  topics = [],
}: SqlTaskFormModalProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateSqlTask();
  const updateMutation = useUpdateSqlTask();
  const [values, setValues] = useState<FormValues>(() =>
    getInitialValues(mode, initialTopicId, task),
  );
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const isEditMode = mode === 'edit';
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const currentPublicationStatus =
    task?.publicationStatus ?? PublicationStatusValue.NUMBER_0;
  const attemptsCount = task?.attemptsCount ?? task?.lastAttempts?.length ?? 0;
  const isPublishedTask = currentPublicationStatus === PublicationStatusValue.NUMBER_1;
  const canUpdateLinks =
    isEditMode &&
    currentPublicationStatus === PublicationStatusValue.NUMBER_0 &&
    attemptsCount === 0;

  useEffect(() => {
    if (opened) {
      setValues(getInitialValues(mode, initialTopicId, task));
      setFormError('');
      setFieldErrors({});
    }
  }, [initialTopicId, mode, opened, task]);

  const topicOptions = useMemo(() => {
    return topics
      .map(normalizeTopicOption)
      .filter((item): item is TopicOption => item !== null)
      .sort((left, right) => left.label.localeCompare(right.label, 'ru'));
  }, [topics]);

  const targetDbById = useMemo(() => {
    return new Map(
      targetDbs
        .filter((targetDb) => targetDb.id)
        .map((targetDb) => [targetDb.id as string, targetDb]),
    );
  }, [targetDbs]);

  const dbmsById = useMemo(() => {
    return new Map(
      dbmsDictionaries
        .filter((dbms) => dbms.id)
        .map((dbms) => [dbms.id as string, dbms]),
    );
  }, [dbmsDictionaries]);

  const selectedSqlQuery = useMemo(() => {
    const selectedFromList =
      sqlQueries.find((query) => query.id === values.sqlQueryId) ?? null;

    if (selectedFromList) {
      return selectedFromList;
    }

    if (isEditMode && task?.sqlQuery && values.sqlQueryId === task.sqlQuery.sqlQueryId) {
      return {
        id: task.sqlQuery.sqlQueryId,
        queryText: task.sqlQuery.sqlText,
        strictColumnOrder: task.sqlQuery.isRequiredColumnOrder,
        strictRowOrder: task.sqlQuery.isRequiredRowOrder,
        targetDbId: task.targetDb?.targetDbId,
      } satisfies SqlQueryResponse;
    }

    return null;
  }, [isEditMode, sqlQueries, task, values.sqlQueryId]);

  const selectedTargetDb = selectedSqlQuery?.targetDbId
    ? targetDbById.get(selectedSqlQuery.targetDbId)
    : null;
  const selectedDbms = selectedTargetDb?.dbmsId ? dbmsById.get(selectedTargetDb.dbmsId) : null;
  const editTargetDb = isEditMode && !selectedTargetDb ? task?.targetDb : null;
  const databaseName =
    editTargetDb?.dbName?.trim() || selectedTargetDb?.dbName?.trim() || 'База не указана';
  const dbmsName = editTargetDb?.dbmsName?.trim() || getDbmsName(selectedDbms);

  const sqlQueryOptions = useMemo(() => {
    return sqlQueries
      .filter((query) => query.id)
      .map((query) => {
        const preview = query.queryText?.replace(/\s+/g, ' ').trim() || 'SQL-запрос без текста';
        const targetDb = query.targetDbId ? targetDbById.get(query.targetDbId) : null;

        return {
          value: query.id as string,
          label: targetDb?.dbName ? `${targetDb.dbName}: ${preview}` : preview,
        };
      });
  }, [sqlQueries, targetDbById]);

  const publicationOptions = [
    ...(isPublishedTask
      ? [
          {
            value: String(PublicationStatusValue.NUMBER_1),
            label: getPublicationStatusLabel(PublicationStatusValue.NUMBER_1),
          },
        ]
      : [
          {
            value: String(PublicationStatusValue.NUMBER_0),
            label: getPublicationStatusLabel(PublicationStatusValue.NUMBER_0),
          },
          {
            value: String(PublicationStatusValue.NUMBER_2),
            label: getPublicationStatusLabel(PublicationStatusValue.NUMBER_2),
          },
        ]),
  ];

  const setValue = (field: keyof FormValues, value: string | null) => {
    setValues((current) => ({
      ...current,
      [field]: value ?? '',
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.taskName.trim()) {
      nextErrors.taskName = 'Название обязательно';
    }

    if (!values.topicId) {
      nextErrors.topicId = 'Выберите тему';
    }

    if ((!isEditMode || canUpdateLinks) && !values.sqlQueryId) {
      nextErrors.sqlQueryId = 'Выберите эталонный SQL-запрос';
    }

    if (!values.taskText.trim()) {
      nextErrors.taskText = 'Условие задания обязательно';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setFormError('');

    const publicationStatus = (
      isEditMode
        ? Number(values.publicationStatus)
        : PublicationStatusValue.NUMBER_0
    ) as PublicationStatus;

    try {
      if (isEditMode && task?.taskId) {
        const response = await updateMutation.mutateAsync({
          id: task.taskId,
          data: {
            difficultyLevel: Number(values.difficultyLevel),
            publicationStatus,
            sqlQueryId: values.sqlQueryId || null,
            taskName: values.taskName.trim(),
            taskText: values.taskText.trim(),
            topicId: values.topicId || null,
          },
        });

        if (response.status === 204) {
          await queryClient.invalidateQueries({
            queryKey: getGetTeacherTaskDetailsQueryKey(task.taskId),
          });
          await queryClient.invalidateQueries({
            queryKey: getGetAllSqlTasksQueryKey({ Limit: 100 }),
          });
          onSaved?.(task.taskId);
          onClose();
          return;
        }

        setFormError(getProblemMessage(response.data, 'Не удалось обновить задание.'));
        return;
      }

      const response = await createMutation.mutateAsync({
        data: {
          difficultyLevel: Number(values.difficultyLevel),
          publicationStatus,
          sqlQueryId: values.sqlQueryId,
          taskName: values.taskName.trim(),
          taskText: values.taskText.trim(),
          topicId: values.topicId,
        },
      });

      if (response.status === 201) {
        await queryClient.invalidateQueries({
          queryKey: getGetAllSqlTasksQueryKey({ Limit: 100 }),
        });
        onSaved?.(response.data.id);
        onClose();
        return;
      }

      setFormError(getProblemMessage(response.data, 'Не удалось создать задание.'));
    } catch {
      setFormError('Не удалось отправить запрос в SQL Module API.');
    }
  };

  return (
    <Modal
      centered
      opened={opened}
      onClose={closeModal}
      size="xl"
      title={
        <Stack gap={4}>
          <Group gap="xs" wrap="wrap">
            <Title order={2} size="h4">
              {isEditMode ? 'Редактирование задания' : 'Создание задания'}
            </Title>
            <Badge color="blue" radius="sm" variant="light">
              Режим: {isEditMode ? 'редактирование' : 'создание'}
            </Badge>
            <Badge color="gray" radius="sm" variant="outline">
              Одна форма для двух сценариев
            </Badge>
          </Group>
          <Text c="dimmed" size="sm">
            Заполните условие, выберите эталонный запрос и сохраните задание как черновик
          </Text>
        </Stack>
      }
    >
      <Stack gap="md">
        {formError ? (
          <Alert color="red" title="Не удалось сохранить задание" variant="light">
            {formError}
          </Alert>
        ) : null}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TextInput
            withAsterisk
            label="Название задания"
            placeholder="Например, Простой выбор всех полей"
            value={values.taskName}
            error={fieldErrors.taskName}
            disabled={isSaving}
            maxLength={300}
            onChange={(event) => setValue('taskName', event.currentTarget.value)}
          />
          <Select
            withAsterisk
            label="Тема"
            data={topicOptions}
            value={values.topicId}
            error={fieldErrors.topicId}
            disabled={isSaving || (isEditMode && !canUpdateLinks)}
            searchable
            nothingFoundMessage="Темы не найдены"
            onChange={(value) => setValue('topicId', value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Stack gap={6}>
            <Text fw={500} size="sm">
              Уровень сложности
            </Text>
            <SegmentedControl
              fullWidth
              data={['1', '2', '3', '4', '5']}
              value={values.difficultyLevel}
              disabled={isSaving}
              onChange={(value) => setValue('difficultyLevel', value)}
            />
          </Stack>
          {isEditMode ? (
            <Stack gap={6}>
              <Text fw={500} size="sm">
                Статус
              </Text>
              <SegmentedControl
                fullWidth
                data={publicationOptions}
                value={values.publicationStatus}
                disabled={isSaving || isPublishedTask}
                onChange={(value) => setValue('publicationStatus', value)}
              />
              <Text c="dimmed" size="xs">
                Публикация выполняется отдельным действием на странице задания
              </Text>
            </Stack>
          ) : (
            <Alert color="blue" title="Новое задание создаётся как черновик" variant="light">
              Опубликовать его можно будет после сохранения, через отдельную кнопку на странице
              задания.
            </Alert>
          )}
        </SimpleGrid>

        <Textarea
          withAsterisk
          label="Условие задания"
          placeholder="Опишите задачу для студента..."
          value={values.taskText}
          error={fieldErrors.taskText}
          disabled={isSaving}
          minRows={4}
          autosize
          onChange={(event) => setValue('taskText', event.currentTarget.value)}
        />

        <Stack gap="sm">
          <Group justify="space-between" gap="sm" wrap="wrap">
            <Text fw={500} size="sm">
              Эталонный SQL-запрос
            </Text>
            <Anchor component="button" type="button" size="sm" c="blue" disabled>
              Создать новый запрос
            </Anchor>
          </Group>

          {isEditMode && !canUpdateLinks ? (
            <Alert color="gray" variant="light">
              Связи задания можно менять только у черновика без попыток. Для опубликованных,
              архивных заданий и заданий с попытками тема и эталонный запрос доступны только для
              просмотра.
            </Alert>
          ) : null}

          {!isEditMode || canUpdateLinks ? (
            <Select
              withAsterisk
              data={sqlQueryOptions}
              value={values.sqlQueryId}
              error={fieldErrors.sqlQueryId}
              disabled={isSaving}
              searchable
              placeholder="Выберите эталонный запрос"
              nothingFoundMessage="SQL-запросы не найдены"
              onChange={(value) => setValue('sqlQueryId', value)}
            />
          ) : null}

          <SqlPreview sql={selectedSqlQuery?.queryText} />
          <SqlQueryValidationPreview
            disabled={isSaving}
            queryText={selectedSqlQuery?.queryText}
            targetDbId={selectedSqlQuery?.targetDbId}
          />

          <Group gap="xs" wrap="wrap">
            <Badge color="gray" radius="sm" variant="light">
              Учебная база: {databaseName}
            </Badge>
            <Badge color="gray" radius="sm" variant="light">
              СУБД: {dbmsName}
            </Badge>
            <Badge color={selectedSqlQuery?.strictColumnOrder ? 'green' : 'gray'} radius="sm" variant="light">
              Порядок колонок: {selectedSqlQuery?.strictColumnOrder ? 'строгий' : 'свободный'}
            </Badge>
            <Badge color={selectedSqlQuery?.strictRowOrder ? 'green' : 'gray'} radius="sm" variant="light">
              Порядок строк: {selectedSqlQuery?.strictRowOrder ? 'строгий' : 'свободный'}
            </Badge>
          </Group>
        </Stack>

        <Divider />

        <Group justify="space-between" gap="md" wrap="wrap">
          <Text c="dimmed" size="sm">
            Задание можно опубликовать после проверки эталонного запроса
          </Text>
          <Group gap="sm">
            <Button variant="default" onClick={closeModal} disabled={isSaving}>
              Отмена
            </Button>
            <Button onClick={() => void handleSubmit()} loading={isSaving}>
              {isEditMode ? 'Сохранить' : 'Создать черновик'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
