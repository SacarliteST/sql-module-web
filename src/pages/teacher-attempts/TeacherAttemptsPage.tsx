import {
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExecutionStatus } from '../../api/sqlmodule/model';
import type { AttemptListItemResponse } from '../../api/sqlmodule/model';
import {
  useGetAllAttempts,
  useGetAttemptStudentFilterOptions,
  useGetAttemptTaskFilterOptions,
  useGetAttemptTopicFilterOptions,
} from '../../api/sqlmodule/training/training';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { formatAuditDateTime } from '../../shared/lib/teacher-audit';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

const PAGE_SIZE = 20;
const FILTER_OPTIONS_LIMIT = 50;
const SEARCH_DELAY_MS = 300;

type SelectOption = { value: string; label: string };

function mergeOptions(items: SelectOption[], selected: SelectOption | null): SelectOption[] {
  const options = new Map(items.map((item) => [item.value, item]));
  if (selected) options.set(selected.value, selected);
  return [...options.values()];
}

function unavailableOption(id: string, label: string): SelectOption | null {
  return id ? { value: id, label } : null;
}

function readPage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function readStatus(value: string | null): ExecutionStatus | undefined {
  return value && Object.values(ExecutionStatus).includes(value as ExecutionStatus)
    ? value as ExecutionStatus
    : undefined;
}

export function TeacherAttemptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<AttemptListItemResponse | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [debouncedStudentSearch] = useDebouncedValue(studentSearch.trim(), SEARCH_DELAY_MS);
  const [debouncedTopicSearch] = useDebouncedValue(topicSearch.trim(), SEARCH_DELAY_MS);
  const [debouncedTaskSearch] = useDebouncedValue(taskSearch.trim(), SEARCH_DELAY_MS);

  const page = readPage(searchParams.get('page'));
  const taskId = searchParams.get('taskId') ?? '';
  const userId = searchParams.get('userId') ?? '';
  const topicId = searchParams.get('topicId') ?? '';
  const status = readStatus(searchParams.get('status'));
  const correctParam = searchParams.get('correct');
  const isCorrect = correctParam === 'true' ? true : correctParam === 'false' ? false : undefined;
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const setFilters = (updates: Record<string, string | null>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      Object.entries(updates).forEach(([name, value]) => {
        if (value) next.set(name, value);
        else next.delete(name);
      });
      if (!Object.hasOwn(updates, 'page')) next.delete('page');
      return next;
    });
  };

  const query = useGetAllAttempts({
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    TaskId: taskId || undefined,
    UserId: userId || undefined,
    TopicId: topicId || undefined,
    Status: status,
    IsCorrect: isCorrect,
    DateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
    DateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
  });

  const studentOptionsQuery = useGetAttemptStudentFilterOptions({
    Search: debouncedStudentSearch || undefined,
    Offset: 0,
    Limit: FILTER_OPTIONS_LIMIT,
  });
  const selectedStudentQuery = useGetAttemptStudentFilterOptions(
    { Id: userId || undefined, Offset: 0, Limit: 1 },
    { query: { enabled: Boolean(userId) } },
  );
  const topicOptionsQuery = useGetAttemptTopicFilterOptions({
    Search: debouncedTopicSearch || undefined,
    Offset: 0,
    Limit: FILTER_OPTIONS_LIMIT,
  });
  const selectedTopicQuery = useGetAttemptTopicFilterOptions(
    { Id: topicId || undefined, Offset: 0, Limit: 1 },
    { query: { enabled: Boolean(topicId) } },
  );
  const taskOptionsQuery = useGetAttemptTaskFilterOptions({
    Search: debouncedTaskSearch || undefined,
    TopicId: topicId || undefined,
    Offset: 0,
    Limit: FILTER_OPTIONS_LIMIT,
  });
  const selectedTaskQuery = useGetAttemptTaskFilterOptions(
    { Id: taskId || undefined, Offset: 0, Limit: 1 },
    { query: { enabled: Boolean(taskId) } },
  );

  const studentOptions = useMemo(() => {
    const response = studentOptionsQuery.data;
    const items = response?.status === 200 ? response.data.items ?? [] : [];
    const selectedResponse = selectedStudentQuery.data;
    const selectedItem = selectedResponse?.status === 200 ? selectedResponse.data.items?.[0] : undefined;
    const mapItem = (item: typeof items[number]): SelectOption | null => {
      if (!item.id) return null;
      const name = item.displayName?.trim() || 'Студент без имени';
      const availableLabel = item.email?.trim() ? `${name} · ${item.email.trim()}` : name;
      return { value: item.id, label: item.isAvailable === false ? `${name} (недоступен)` : availableLabel };
    };
    const selectedFallback = selectedStudentQuery.isPending
      ? unavailableOption(userId, 'Загрузка выбранного студента…')
      : selectedStudentQuery.isError || (selectedResponse && selectedResponse.status !== 200)
        ? unavailableOption(userId, 'Не удалось загрузить выбранного студента')
        : unavailableOption(userId, 'Удалённый или недоступный студент');
    return mergeOptions(
      items.map(mapItem).filter((item): item is SelectOption => Boolean(item)),
      selectedItem ? mapItem(selectedItem) : selectedFallback,
    );
  }, [selectedStudentQuery.data, selectedStudentQuery.isError, selectedStudentQuery.isPending, studentOptionsQuery.data, userId]);

  const topicOptions = useMemo(() => {
    const response = topicOptionsQuery.data;
    const items = response?.status === 200 ? response.data.items ?? [] : [];
    const selectedResponse = selectedTopicQuery.data;
    const selectedItem = selectedResponse?.status === 200 ? selectedResponse.data.items?.[0] : undefined;
    const mapItem = (item: typeof items[number]): SelectOption | null => {
      if (!item.id) return null;
      const name = item.path?.trim() || item.name?.trim() || 'Тема без названия';
      return { value: item.id, label: item.isAvailable === false ? `${name} (недоступна)` : name };
    };
    return mergeOptions(
      items.map(mapItem).filter((item): item is SelectOption => Boolean(item)),
      selectedItem ? mapItem(selectedItem) : unavailableOption(topicId, 'Удалённая или недоступная тема'),
    );
  }, [selectedTopicQuery.data, topicId, topicOptionsQuery.data]);

  const taskOptions = useMemo(() => {
    const response = taskOptionsQuery.data;
    const items = response?.status === 200 ? response.data.items ?? [] : [];
    const selectedResponse = selectedTaskQuery.data;
    const selectedItem = selectedResponse?.status === 200 ? selectedResponse.data.items?.[0] : undefined;
    const mapItem = (item: typeof items[number]): SelectOption | null => {
      if (!item.id) return null;
      const name = item.name?.trim() || 'Задание без названия';
      const label = item.topicName?.trim() ? `${name} · ${item.topicName.trim()}` : name;
      return { value: item.id, label: item.isAvailable === false ? `${name} (недоступно)` : label };
    };
    return mergeOptions(
      items.map(mapItem).filter((item): item is SelectOption => Boolean(item)),
      selectedItem ? mapItem(selectedItem) : unavailableOption(taskId, 'Удалённое или недоступное задание'),
    );
  }, [selectedTaskQuery.data, taskId, taskOptionsQuery.data]);

  const selectedStudentLabel = studentOptions.find((item) => item.value === userId)?.label ?? '';

  const response = query.data;
  const data = response?.status === 200 ? response.data : null;
  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const filterOptionsFailed = [studentOptionsQuery, selectedStudentQuery, topicOptionsQuery, selectedTopicQuery, taskOptionsQuery, selectedTaskQuery]
    .some((item) => item.isError || (item.data && item.data.status !== 200));
  const hasFilters = Boolean(taskId || userId || topicId || status || correctParam || dateFrom || dateTo);

  return (
    <Page>
      <Stack gap="lg">
        <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель', to: '/teacher' }, { label: 'Попытки' }]} />
        <PageHeader title="Попытки студентов" description="Журнал решений с серверной пагинацией и поиском по понятным названиям." />
        <TeacherContourTabs />

        <AppCard>
          <Stack gap="md">
            {filterOptionsFailed ? <Alert color="yellow">Не удалось обновить один из справочников фильтров. Уже выбранные значения сохранены.</Alert> : null}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              <Select clearable searchable label="Студент" description={userId ? `Выбран: ${selectedStudentLabel || 'Загрузка…'}` : undefined} placeholder="Имя или email" nothingFoundMessage="Студенты не найдены" data={studentOptions} value={userId || null} onSearchChange={setStudentSearch} onChange={(value) => setFilters({ userId: value })} />
              <Select clearable searchable label="Тема" placeholder="Название темы" nothingFoundMessage="Темы не найдены" data={topicOptions} value={topicId || null} onSearchChange={setTopicSearch} onChange={(value) => setFilters({ topicId: value, taskId: null })} />
              <Select clearable searchable label="Задание" placeholder="Название задания" nothingFoundMessage="Задания не найдены" data={taskOptions} value={taskId || null} onSearchChange={setTaskSearch} onChange={(value) => setFilters({ taskId: value })} />
              <Select clearable label="Статус" placeholder="Любой" value={status ?? null} data={[{ value: ExecutionStatus.Succeeded, label: 'Завершена' }, { value: ExecutionStatus.Error, label: 'Ошибка' }, { value: ExecutionStatus.TimedOut, label: 'Таймаут' }]} onChange={(value) => setFilters({ status: value })} />
              <Select clearable label="Результат" placeholder="Любой" value={correctParam === 'true' || correctParam === 'false' ? correctParam : null} data={[{ value: 'true', label: 'Верно' }, { value: 'false', label: 'Неверно' }]} onChange={(value) => setFilters({ correct: value })} />
              <Group align="flex-end" grow>
                <TextInput type="date" label="С даты" value={dateFrom} onChange={(event) => setFilters({ dateFrom: event.currentTarget.value || null })} />
                <TextInput type="date" label="По дату" value={dateTo} onChange={(event) => setFilters({ dateTo: event.currentTarget.value || null })} />
              </Group>
            </SimpleGrid>
            <Group justify="flex-end"><Button disabled={!hasFilters} variant="default" onClick={() => setSearchParams({})}>Сбросить все фильтры</Button></Group>
          </Stack>
        </AppCard>

        {(query.isError || (response && response.status !== 200)) ? <Alert color="red">Не удалось загрузить попытки.</Alert> : null}
        <AppCard>
          {query.isPending ? <Text c="dimmed">Загрузка попыток...</Text> : data?.items?.length ? (
            <Stack>
              <Table.ScrollContainer minWidth={900}>
                <Table striped highlightOnHover>
                  <Table.Thead><Table.Tr><Table.Th>Студент</Table.Th><Table.Th>Тема / задание</Table.Th><Table.Th>Результат</Table.Th><Table.Th>Время</Table.Th><Table.Th /></Table.Tr></Table.Thead>
                  <Table.Tbody>{data.items.map((attempt) => (
                    <Table.Tr key={attempt.id}>
                      <Table.Td>{attempt.studentName?.trim() || 'Студент недоступен'}</Table.Td>
                      <Table.Td><Text size="sm">{attempt.taskName?.trim() || 'Задание недоступно'}</Text><Text size="xs" c="dimmed">{attempt.topicName?.trim() || 'Тема не указана'}</Text></Table.Td>
                      <Table.Td><Badge color={attempt.isCorrect ? 'green' : 'red'} variant="light">{attempt.isCorrect ? 'Верно' : 'Неверно'}</Badge></Table.Td>
                      <Table.Td>{formatAuditDateTime(attempt.startedAt ?? attempt.createdAt)}</Table.Td>
                      <Table.Td ta="right"><Button size="xs" variant="subtle" onClick={() => setSelected(attempt)}>Открыть</Button></Table.Td>
                    </Table.Tr>
                  ))}</Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              {pageCount > 1 ? <Pagination value={page} total={pageCount} onChange={(value) => setFilters({ page: value > 1 ? String(value) : null })} /> : null}
            </Stack>
          ) : <EmptyState title="Попыток нет" description="Измените фильтры или дождитесь решений студентов." />}
        </AppCard>
      </Stack>

      <Modal opened={Boolean(selected)} onClose={() => setSelected(null)} title="Детали попытки" size="lg">
        <Stack>
          {selected?.publicError ? <Alert color="red">{selected.publicError}</Alert> : null}
          <Group><Badge color={selected?.isCorrect ? 'green' : 'red'}>{selected?.isCorrect ? 'Верно' : 'Неверно'}</Badge><Text size="sm">Строк: {selected?.rowCount ?? '—'}, время: {selected?.durationMs ?? '—'} мс</Text></Group>
          <Text size="sm" fw={600}>Отправленный SQL</Text>
          <Code block>{selected?.submittedSql || 'SQL не сохранён'}</Code>
          <Text size="sm" c="dimmed">Причина: {String(selected?.reason ?? 'не указана')}</Text>
        </Stack>
      </Modal>
    </Page>
  );
}
