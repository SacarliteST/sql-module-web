import {
  Badge,
  Button,
  Group,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGetStudentTasks } from '../../../api/sqlmodule/student/student';
import { formatStudentDifficulty } from '../../../shared/lib/student-display';
import { mapStudentApiError, StudentErrorAlert } from '../../student-errors';
import { AppCard, EmptyState } from '../../../shared/ui';

const PAGE_SIZE = 9;
const SEARCH_DELAY_MS = 350;

type StudentTaskCatalogProps = {
  topicId?: string;
  topicName?: string;
};

function readPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function readDifficulty(value: string | null) {
  const difficulty = Number(value);
  return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : undefined;
}

export function StudentTaskCatalog({ topicId, topicName }: StudentTaskCatalogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlName = searchParams.get('name')?.trim() ?? '';
  const page = readPage(searchParams.get('page'));
  const difficulty = readDifficulty(searchParams.get('difficulty'));
  const [searchValue, setSearchValue] = useState(urlName);
  const [debouncedSearch] = useDebouncedValue(searchValue.trim(), SEARCH_DELAY_MS);

  useEffect(() => setSearchValue(urlName), [urlName]);
  useEffect(() => {
    if (debouncedSearch === urlName) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('name', debouncedSearch); else next.delete('name');
    next.delete('page');
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams, urlName]);

  const queryParams = useMemo(() => ({
    TopicId: topicId,
    Name: urlName || undefined,
    DifficultyLevel: difficulty,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  }), [difficulty, page, topicId, urlName]);
  const tasksQuery = useGetStudentTasks(queryParams);
  const response = tasksQuery.data;
  const pageData = response?.status === 200 ? response.data : null;
  const errorView = tasksQuery.isError
    ? mapStudentApiError(undefined, tasksQuery.error)
    : response && response.status !== 200 ? mapStudentApiError(response.status, response.data) : null;
  const total = pageData?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!pageData || page <= pageCount) return;
    const next = new URLSearchParams(searchParams);
    if (pageCount > 1) next.set('page', String(pageCount)); else next.delete('page');
    setSearchParams(next, { replace: true });
  }, [page, pageCount, pageData, searchParams, setSearchParams]);

  const setFilter = (key: 'difficulty' | 'page', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  };
  const resetFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('name');
    next.delete('difficulty');
    next.delete('page');
    setSearchValue('');
    setSearchParams(next, { replace: true });
  };
  const hasFilters = Boolean(urlName || difficulty);

  return <Stack gap="md">
    <Stack gap={4}>
      <Title order={2} size="h4">{topicName || 'Все опубликованные задания'}</Title>
      <Text c="dimmed" size="sm">Задания загружаются постранично из защищённого student API.</Text>
    </Stack>
    <Group align="flex-end" grow wrap="wrap">
      <TextInput
        label="Поиск по названию"
        placeholder="Например, выборка сотрудников"
        value={searchValue}
        onChange={(event) => setSearchValue(event.currentTarget.value)}
      />
      <Select
        clearable
        label="Сложность"
        placeholder="Любая"
        data={[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: formatStudentDifficulty(value) }))}
        value={difficulty ? String(difficulty) : null}
        onChange={(value) => setFilter('difficulty', value)}
      />
      <Button disabled={!hasFilters && !searchValue} variant="default" onClick={resetFilters}>Сбросить фильтры</Button>
    </Group>

    {tasksQuery.isPending ? <SimpleGrid cols={{ base: 1, lg: 2 }}><Skeleton height={210} radius="sm" /><Skeleton height={210} radius="sm" /></SimpleGrid> : null}
    {errorView ? <StudentErrorAlert error={errorView} onRetry={() => void tasksQuery.refetch()} /> : null}
    {pageData && !pageData.items?.length ? <EmptyState title="Задания не найдены" description={hasFilters ? 'Измените или сбросьте фильтры.' : 'В этой теме пока нет доступных опубликованных заданий.'} /> : null}
    {pageData?.items?.length ? <>
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {pageData.items.map((task, index) => <AppCard key={task.id ?? `${page}-${index}`} h="100%">
          <Stack gap="sm" h="100%">
            <Group gap="xs">
              {task.topicName ? <Badge variant="light">{task.topicName}</Badge> : null}
              {task.difficultyLevel ? <Badge color="orange" variant="light">{formatStudentDifficulty(task.difficultyLevel)}</Badge> : null}
              {task.dbmsName ? <Badge color="gray" variant="outline">{task.dbmsName}</Badge> : null}
            </Group>
            <Title order={3} size="h4">{task.taskName || 'Задание без названия'}</Title>
            <Text c="dimmed" lineClamp={4} size="sm">{task.taskTextPreview || 'Краткое условие не указано.'}</Text>
            <Button
              component={Link}
              disabled={!task.id}
              mt="auto"
              to={task.id ? { pathname: `/student/tasks/${task.id}`, search: searchParams.toString() } : '#'}
            >Открыть задание</Button>
          </Stack>
        </AppCard>)}
      </SimpleGrid>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">Найдено: {total}</Text>
        {pageCount > 1 ? <Pagination value={page} total={pageCount} onChange={(value) => setFilter('page', value === 1 ? null : String(value))} /> : null}
      </Group>
    </> : null}
  </Stack>;
}
