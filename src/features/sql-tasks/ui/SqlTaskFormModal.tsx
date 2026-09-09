import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DbmsDictionaryResponse,
  HttpValidationProblemDetails,
  ProblemDetails,
  PublicationStatus,
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
  useUpdateTaskReferenceQuery,
} from '../../../api/sqlmodule/training/training';
import { SqlCodeEditor } from './SqlCodeEditor';
import { SqlQueryValidationPreview } from './SqlQueryValidationPreview';

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
  targetDbs?: TargetDbResponse[];
  dbmsDictionaries?: DbmsDictionaryResponse[];
  onSaved?: (taskId?: string) => void;
};

type FormValues = {
  taskName: string;
  topicId: string;
  targetDbId: string;
  queryText: string;
  strictColumnOrder: boolean;
  strictRowOrder: boolean;
  difficultyLevel: string;
  publicationStatus: string;
  taskText: string;
};

type FormField = keyof FormValues;
type FieldErrors = Partial<Record<FormField, string>>;

const DEFAULT_VALUES: FormValues = {
  difficultyLevel: '1',
  publicationStatus: PublicationStatusValue.Draft,
  queryText: '',
  strictColumnOrder: false,
  strictRowOrder: false,
  targetDbId: '',
  taskName: '',
  taskText: '',
  topicId: '',
};

const BACKEND_FIELD_MAP: Record<string, FormField> = {
  difficultylevel: 'difficultyLevel',
  publicationstatus: 'publicationStatus',
  querytext: 'queryText',
  referencequeryquerytext: 'queryText',
  referencequerystrictcolumnorder: 'strictColumnOrder',
  referencequerystrictroworder: 'strictRowOrder',
  referencequerytargetdbid: 'targetDbId',
  strictcolumnorder: 'strictColumnOrder',
  strictroworder: 'strictRowOrder',
  targetdbid: 'targetDbId',
  taskname: 'taskName',
  tasktext: 'taskText',
  topicid: 'topicId',
};

function normalizeFieldPath(path: string): string {
  return path.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

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

  const violationMessages = problem.violations
    ?.map((violation) => violation.message?.trim())
    .filter((message): message is string => Boolean(message));

  if (violationMessages?.length) {
    return violationMessages.join(' ');
  }

  return problem.detail?.trim() || problem.title?.trim() || fallback;
}

function getProblemFieldErrors(
  problem: ProblemDetails | HttpValidationProblemDetails | null,
): FieldErrors {
  if (!problem) {
    return {};
  }

  const result: FieldErrors = {};

  if ('errors' in problem && problem.errors) {
    Object.entries(problem.errors).forEach(([path, messages]) => {
      const field = BACKEND_FIELD_MAP[normalizeFieldPath(path)];
      const message = messages.find((item) => item.trim())?.trim();

      if (field && message) {
        result[field] = message;
      }
    });
  }

  problem.violations?.forEach((violation) => {
    const field = violation.path
      ? BACKEND_FIELD_MAP[normalizeFieldPath(violation.path)]
      : undefined;
    const message = violation.message?.trim();

    if (field && message) {
      result[field] = message;
    }
  });

  return result;
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
  if (status === PublicationStatusValue.Published) {
    return 'Опубликовано';
  }

  if (status === PublicationStatusValue.Archived) {
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
      publicationStatus: String(task.publicationStatus ?? PublicationStatusValue.Draft),
      queryText: task.sqlQuery?.sqlText?.trim() ?? '',
      strictColumnOrder: task.sqlQuery?.isRequiredColumnOrder ?? false,
      strictRowOrder: task.sqlQuery?.isRequiredRowOrder ?? false,
      targetDbId: task.targetDb?.targetDbId ?? '',
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

function getReferenceSignature(values: FormValues): string {
  return `${values.targetDbId}\n${values.queryText.trim()}`;
}

export function SqlTaskFormModal({
  dbmsDictionaries = [],
  initialTopicId,
  mode,
  onClose,
  onSaved,
  opened,
  targetDbs = [],
  task,
  topics = [],
}: SqlTaskFormModalProps) {
  const queryClient = useQueryClient();
  const createMutation = useCreateSqlTask();
  const updateMutation = useUpdateSqlTask();
  const updateReferenceMutation = useUpdateTaskReferenceQuery();
  const [values, setValues] = useState<FormValues>(() =>
    getInitialValues(mode, initialTopicId, task),
  );
  const [validatedReferenceSignature, setValidatedReferenceSignature] = useState('');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isEditMode = mode === 'edit';
  const isSaving =
    createMutation.isPending || updateMutation.isPending || updateReferenceMutation.isPending;
  const currentPublicationStatus = task?.publicationStatus ?? PublicationStatusValue.Draft;
  const attemptsCount = task?.attemptsCount ?? task?.lastAttempts?.length ?? 0;
  const isPublishedTask = currentPublicationStatus === PublicationStatusValue.Published;
  const canUpdateTopic =
    isEditMode &&
    currentPublicationStatus === PublicationStatusValue.Draft &&
    attemptsCount === 0;
  const canEditTask = !isEditMode || task?.canEditTask !== false;
  const canEditReferenceQuery = !isEditMode || task?.canEditReferenceQuery === true;

  useEffect(() => {
    if (opened) {
      const initialValues = getInitialValues(mode, initialTopicId, task);
      setValues(initialValues);
      setValidatedReferenceSignature(
        mode === 'edit' ? getReferenceSignature(initialValues) : '',
      );
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

  const dbmsById = useMemo(() => {
    return new Map(
      dbmsDictionaries
        .filter((dbms) => dbms.id)
        .map((dbms) => [dbms.id as string, dbms]),
    );
  }, [dbmsDictionaries]);

  const targetDbOptions = useMemo(() => {
    const options = targetDbs
      .filter((targetDb) => targetDb.id)
      .map((targetDb) => {
        const dbms = targetDb.dbmsId ? dbmsById.get(targetDb.dbmsId) : null;
        return {
          value: targetDb.id as string,
          label: `${targetDb.dbName?.trim() || 'Без названия'} · ${getDbmsName(dbms)}`,
        };
      });

    if (
      task?.targetDb?.targetDbId &&
      !options.some((option) => option.value === task.targetDb?.targetDbId)
    ) {
      options.push({
        value: task.targetDb.targetDbId,
        label: `${task.targetDb.dbName?.trim() || 'Без названия'} · ${task.targetDb.dbmsName?.trim() || 'СУБД не указана'}`,
      });
    }

    return options.sort((left, right) => left.label.localeCompare(right.label, 'ru'));
  }, [dbmsById, targetDbs, task]);

  const selectedTargetDb = useMemo(
    () => targetDbs.find((targetDb) => targetDb.id === values.targetDbId) ?? null,
    [targetDbs, values.targetDbId],
  );
  const selectedDbms = selectedTargetDb?.dbmsId
    ? dbmsById.get(selectedTargetDb.dbmsId)
    : null;
  const databaseName =
    selectedTargetDb?.dbName?.trim() || task?.targetDb?.dbName?.trim() || 'База не указана';
  const dbmsName =
    getDbmsName(selectedDbms) !== 'СУБД не указана'
      ? getDbmsName(selectedDbms)
      : task?.targetDb?.dbmsName?.trim() || 'СУБД не указана';

  const publicationOptions = [
    ...(isPublishedTask
      ? [
          {
            value: PublicationStatusValue.Published,
            label: getPublicationStatusLabel(PublicationStatusValue.Published),
          },
        ]
      : [
          {
            value: PublicationStatusValue.Draft,
            label: getPublicationStatusLabel(PublicationStatusValue.Draft),
          },
          {
            value: PublicationStatusValue.Archived,
            label: getPublicationStatusLabel(PublicationStatusValue.Archived),
          },
        ]),
  ];

  const referenceSignature = getReferenceSignature(values);
  const initialReferenceSignature =
    mode === 'edit' ? getReferenceSignature(getInitialValues(mode, initialTopicId, task)) : '';
  const isReferenceValidated =
    Boolean(referenceSignature) &&
    (validatedReferenceSignature === referenceSignature ||
      initialReferenceSignature === referenceSignature);
  const initialValues = getInitialValues(mode, initialTopicId, task);
  const referenceChanged =
    values.targetDbId !== initialValues.targetDbId ||
    values.queryText.trim() !== initialValues.queryText.trim() ||
    values.strictColumnOrder !== initialValues.strictColumnOrder ||
    values.strictRowOrder !== initialValues.strictRowOrder;

  const setValue = <K extends FormField>(field: K, value: FormValues[K]) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const handleValidationChange = useCallback(
    (isValid: boolean) => {
      setValidatedReferenceSignature(isValid ? referenceSignature : '');
    },
    [referenceSignature],
  );

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!values.taskName.trim()) {
      nextErrors.taskName = 'Название обязательно';
    }

    if (!values.topicId) {
      nextErrors.topicId = 'Выберите тему';
    }

    if (!values.taskText.trim()) {
      nextErrors.taskText = 'Условие задания обязательно';
    }

    if ((!isEditMode || canEditReferenceQuery) && !values.targetDbId) {
      nextErrors.targetDbId = 'Выберите учебную базу';
    }

    if ((!isEditMode || canEditReferenceQuery) && !values.queryText.trim()) {
      nextErrors.queryText = 'Введите эталонный SQL-запрос';
    }

    if ((!isEditMode || referenceChanged) && canEditReferenceQuery && !isReferenceValidated) {
      nextErrors.queryText = 'Проверьте эталонный SQL после последнего изменения';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const applyProblem = (
    problem: ProblemDetails | HttpValidationProblemDetails | null,
    fallback: string,
  ) => {
    setFieldErrors((current) => ({ ...current, ...getProblemFieldErrors(problem) }));
    setFormError(getProblemMessage(problem, fallback));
  };

  const closeModal = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const invalidateTaskQueries = async (taskId?: string) => {
    await queryClient.invalidateQueries({
      queryKey: getGetAllSqlTasksQueryKey({ Limit: 100 }),
    });

    if (taskId) {
      await queryClient.invalidateQueries({
        queryKey: getGetTeacherTaskDetailsQueryKey(taskId),
      });
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setFormError('');

    try {
      if (isEditMode && task?.taskId) {
        const publicationStatus = values.publicationStatus as PublicationStatus;
        const taskResponse = await updateMutation.mutateAsync({
          id: task.taskId,
          data: {
            difficultyLevel: Number(values.difficultyLevel),
            publicationStatus,
            taskName: values.taskName.trim(),
            taskText: values.taskText.trim(),
            topicId: values.topicId || null,
          },
        });

        if (taskResponse.status !== 204) {
          applyProblem(taskResponse.data, 'Не удалось обновить задание.');
          return;
        }

        if (referenceChanged && canEditReferenceQuery) {
          const referenceResponse = await updateReferenceMutation.mutateAsync({
            id: task.taskId,
            data: {
              queryText: values.queryText.trim(),
              strictColumnOrder: values.strictColumnOrder,
              strictRowOrder: values.strictRowOrder,
              targetDbId: values.targetDbId,
            },
          });

          if (referenceResponse.status !== 200) {
            await invalidateTaskQueries(task.taskId);
            applyProblem(
              referenceResponse.data,
              'Данные задания сохранены, но эталонное решение обновить не удалось.',
            );
            return;
          }
        }

        await invalidateTaskQueries(task.taskId);
        onSaved?.(task.taskId);
        onClose();
        return;
      }

      const response = await createMutation.mutateAsync({
        data: {
          difficultyLevel: Number(values.difficultyLevel),
          referenceQuery: {
            queryText: values.queryText.trim(),
            strictColumnOrder: values.strictColumnOrder,
            strictRowOrder: values.strictRowOrder,
            targetDbId: values.targetDbId,
          },
          taskName: values.taskName.trim(),
          taskText: values.taskText.trim(),
          topicId: values.topicId,
        },
      });

      if (response.status === 201) {
        await invalidateTaskQueries(response.data.id);
        onSaved?.(response.data.id);
        onClose();
        return;
      }

      applyProblem(response.data, 'Не удалось создать задание.');
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
          </Group>
          <Text c="dimmed" size="sm">
            Задание и его эталонное решение редактируются в одном рабочем окне
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
            disabled={isSaving || !canEditTask}
            maxLength={300}
            onChange={(event) => setValue('taskName', event.currentTarget.value)}
          />
          <Select
            withAsterisk
            label="Тема"
            data={topicOptions}
            value={values.topicId}
            error={fieldErrors.topicId}
            disabled={isSaving || (isEditMode && !canUpdateTopic)}
            searchable
            nothingFoundMessage="Темы не найдены"
            onChange={(value) => setValue('topicId', value ?? '')}
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
              disabled={isSaving || !canEditTask}
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
              Опубликовать его можно после сохранения через отдельное действие.
            </Alert>
          )}
        </SimpleGrid>

        <Textarea
          withAsterisk
          label="Условие задания"
          placeholder="Опишите задачу для студента..."
          value={values.taskText}
          error={fieldErrors.taskText}
          disabled={isSaving || !canEditTask}
          minRows={4}
          autosize
          onChange={(event) => setValue('taskText', event.currentTarget.value)}
        />

        <Divider label="Эталонное решение" labelPosition="left" />

        {isEditMode && !canEditReferenceQuery ? (
          <Alert color="gray" title="Эталон доступен только для просмотра" variant="light">
            {task?.referenceQueryEditRestriction?.trim() ||
              'Изменение эталонного решения запрещено текущим состоянием задания.'}
          </Alert>
        ) : null}

        <Select
          withAsterisk
          label="Учебная база"
          description="База, в которой выполняется эталонный SELECT"
          data={targetDbOptions}
          value={values.targetDbId}
          error={fieldErrors.targetDbId}
          disabled={isSaving || !canEditReferenceQuery}
          searchable
          nothingFoundMessage="Учебные базы не найдены"
          onChange={(value) => setValue('targetDbId', value ?? '')}
        />

        <Group gap="xs" wrap="wrap">
          <Badge color="gray" radius="sm" variant="light">
            Учебная база: {databaseName}
          </Badge>
          <Badge color="gray" radius="sm" variant="light">
            СУБД: {dbmsName}
          </Badge>
          {selectedTargetDb?.isReadOnly ? (
            <Badge color="green" radius="sm" variant="light">
              Только чтение
            </Badge>
          ) : null}
        </Group>

        <SqlCodeEditor
          ariaLabel="Эталонный SQL-запрос"
          description="Используйте read-only SELECT. Shift+Alt+F — форматирование, Ctrl+F — поиск. Окончательная проверка выполняется SQL Module API."
          label="Эталонный SQL-запрос"
          required
          value={values.queryText}
          error={fieldErrors.queryText}
          disabled={isSaving || !canEditReferenceQuery}
          onChange={(value) => setValue('queryText', value)}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Switch
            checked={values.strictColumnOrder}
            disabled={isSaving || !canEditReferenceQuery}
            label="Строгий порядок колонок"
            description="Колонки должны идти в том же порядке, что в эталоне"
            onChange={(event) => setValue('strictColumnOrder', event.currentTarget.checked)}
          />
          <Switch
            checked={values.strictRowOrder}
            disabled={isSaving || !canEditReferenceQuery}
            label="Строгий порядок строк"
            description="Строки должны идти в том же порядке, что в эталоне"
            onChange={(event) => setValue('strictRowOrder', event.currentTarget.checked)}
          />
        </SimpleGrid>

        {canEditReferenceQuery ? (
          <SqlQueryValidationPreview
            disabled={isSaving}
            queryText={values.queryText}
            targetDbId={values.targetDbId}
            onValidationChange={handleValidationChange}
          />
        ) : null}

        {canEditReferenceQuery && !isReferenceValidated ? (
          <Alert color="yellow" variant="light">
            Проверьте эталонный SQL после последнего изменения базы или текста запроса.
          </Alert>
        ) : null}

        <Divider />

        <Group justify="space-between" gap="md" wrap="wrap">
          <Text c="dimmed" size="sm">
            Эталон принадлежит только этому заданию и не выбирается из общего списка
          </Text>
          <Group gap="sm">
            <Button variant="default" onClick={closeModal} disabled={isSaving}>
              Отмена
            </Button>
            <Button
              disabled={
                (!isEditMode && !isReferenceValidated) ||
                (isEditMode &&
                  referenceChanged &&
                  canEditReferenceQuery &&
                  !isReferenceValidated)
              }
              onClick={() => void handleSubmit()}
              loading={isSaving}
            >
              {isEditMode ? 'Сохранить' : 'Создать черновик'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
