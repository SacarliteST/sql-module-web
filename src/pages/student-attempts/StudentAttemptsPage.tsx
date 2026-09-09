import { Badge, Button, Group, Pagination, Select, SimpleGrid, Skeleton, Stack, Table, Text, TextInput } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GetStudentAttemptsStatus } from '../../api/sqlmodule/model';
import { useGetStudentAttempts, useGetStudentTasks } from '../../api/sqlmodule/student/student';
import { StudentAttemptDetailsDrawer } from '../../features/student-attempts';
import { StudentContourTabs } from '../../features/student-contour';
import { mapStudentApiError, StudentErrorAlert } from '../../features/student-errors';
import { buildStudentTopicTree, flattenStudentTopicTree, useStudentTopics } from '../../features/student-topics';
import { formatStudentAttemptReason, formatStudentAttemptStatus } from '../../shared/lib/student-display';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

const PAGE_SIZE = 20;

function readPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function asDateTime(value: string | null, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

function statusColor(status?: string) {
  if (status === GetStudentAttemptsStatus.Succeeded) return 'green';
  if (status === GetStudentAttemptsStatus.TimedOut) return 'yellow';
  return 'red';
}

export function StudentAttemptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const page = readPage(searchParams.get('page'));
  const topicId = searchParams.get('topicId') || undefined;
  const taskId = searchParams.get('taskId') || undefined;
  const statusValue = searchParams.get('status');
  const status = Object.values(GetStudentAttemptsStatus).find((value) => value === statusValue);
  const correctValue = searchParams.get('correct');
  const isCorrect = correctValue === 'true' ? true : correctValue === 'false' ? false : undefined;
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  const topicsQuery = useStudentTopics();
  const topicTree = useMemo(() => buildStudentTopicTree(topicsQuery.data ?? []), [topicsQuery.data]);
  const topics = useMemo(() => flattenStudentTopicTree(topicTree), [topicTree]);
  const taskOptionsQuery = useGetStudentTasks({ TopicId: topicId, Offset: 0, Limit: 100 });
  const taskOptionsResponse = taskOptionsQuery.data;
  const topicsErrorView = topicsQuery.isError ? mapStudentApiError(undefined, topicsQuery.error) : null;
  const taskOptionsErrorView = taskOptionsQuery.isError
    ? mapStudentApiError(undefined, taskOptionsQuery.error)
    : taskOptionsResponse && taskOptionsResponse.status !== 200 ? mapStudentApiError(taskOptionsResponse.status, taskOptionsResponse.data) : null;
  const taskOptions = taskOptionsResponse?.status === 200 ? taskOptionsResponse.data.items ?? [] : [];
  const taskSelectData = taskOptions.filter((task) => task.id).map((task) => ({ value: task.id!, label: task.taskName || task.id! }));
  if (taskId && !taskSelectData.some((item) => item.value === taskId)) taskSelectData.unshift({ value: taskId, label: `Задание ${taskId}` });

  const attemptsQuery = useGetStudentAttempts({
    TaskId: taskId,
    TopicId: topicId,
    Status: status,
    IsCorrect: isCorrect,
    DateFrom: asDateTime(dateFrom),
    DateTo: asDateTime(dateTo, true),
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });
  const response = attemptsQuery.data;
  const pageData = response?.status === 200 ? response.data : null;
  const errorView = attemptsQuery.isError
    ? mapStudentApiError(undefined, attemptsQuery.error)
    : response && response.status !== 200 ? mapStudentApiError(response.status, response.data) : null;
  const total = pageData?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (!pageData || page <= pageCount) return;
    const next = new URLSearchParams(searchParams);
    if (pageCount > 1) next.set('page', String(pageCount)); else next.delete('page');
    setSearchParams(next, { replace: true });
  }, [page, pageCount, pageData, searchParams, setSearchParams]);

  const setFilter = (key: string, value: string | null, clearTask = false) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (clearTask) next.delete('taskId');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };
  const setPage = (value: number) => {
    const next = new URLSearchParams(searchParams);
    if (value > 1) next.set('page', String(value)); else next.delete('page');
    setSearchParams(next, { replace: true });
  };
  const resetFilters = () => setSearchParams({}, { replace: true });
  const hasFilters = Boolean(topicId || taskId || status || correctValue || dateFrom || dateTo);

  return <Page><Stack gap="lg">
    <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Студент', to: '/student' }, { label: 'Мои попытки' }]} />
    <PageHeader title="Мои попытки" description="История решений текущего студента — от новых к старым." />
    <StudentContourTabs />
    <AppCard><Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Select clearable searchable label="Тема" placeholder="Все темы" data={topics.map((topic) => ({ value: topic.id, label: `${'— '.repeat(topic.depth)}${topic.topicName || 'Без названия'}` }))} disabled={topicsQuery.isPending} value={topicId ?? null} onChange={(value) => setFilter('topicId', value, true)} />
        <Select clearable searchable label="Задание" placeholder="Все задания" data={taskSelectData} disabled={taskOptionsQuery.isPending} value={taskId ?? null} onChange={(value) => setFilter('taskId', value)} />
        <Select clearable label="Статус" placeholder="Любой" data={Object.values(GetStudentAttemptsStatus).map((value) => ({ value, label: formatStudentAttemptStatus(value) }))} value={status ?? null} onChange={(value) => setFilter('status', value)} />
        <Select clearable label="Вердикт" placeholder="Любой" data={[{ value: 'true', label: 'Верно' }, { value: 'false', label: 'Неверно' }]} value={correctValue} onChange={(value) => setFilter('correct', value)} />
        <TextInput label="Дата от" type="date" value={dateFrom ?? ''} onChange={(event) => setFilter('dateFrom', event.currentTarget.value || null)} />
        <TextInput label="Дата до" type="date" value={dateTo ?? ''} onChange={(event) => setFilter('dateTo', event.currentTarget.value || null)} />
      </SimpleGrid>
      <Group justify="flex-end"><Button disabled={!hasFilters} variant="default" onClick={resetFilters}>Сбросить фильтры</Button></Group>
    </Stack></AppCard>
    {topicsErrorView ? <StudentErrorAlert error={topicsErrorView} onRetry={() => void topicsQuery.refetch()} /> : null}
    {taskOptionsErrorView ? <StudentErrorAlert error={taskOptionsErrorView} onRetry={() => void taskOptionsQuery.refetch()} /> : null}

    {attemptsQuery.isPending ? <AppCard><Stack><Skeleton height={48} /><Skeleton height={48} /><Skeleton height={48} /></Stack></AppCard> : null}
    {errorView ? <StudentErrorAlert error={errorView} onRetry={() => void attemptsQuery.refetch()} /> : null}
    {pageData && !pageData.items?.length ? <AppCard><EmptyState title="Попыток не найдено" description={hasFilters ? 'Измените или сбросьте фильтры.' : 'Отправьте первое решение, и оно появится здесь.'} /></AppCard> : null}
    {pageData?.items?.length ? <AppCard><Stack gap="md">
      <Table.ScrollContainer minWidth={980}><Table highlightOnHover striped withTableBorder>
        <Table.Caption>История попыток текущего студента</Table.Caption>
        <Table.Thead><Table.Tr><Table.Th>Задание</Table.Th><Table.Th>Время</Table.Th><Table.Th>Статус</Table.Th><Table.Th>Вердикт</Table.Th><Table.Th>Строки</Table.Th><Table.Th>Длительность</Table.Th><Table.Th /></Table.Tr></Table.Thead>
        <Table.Tbody>{pageData.items.map((attempt, index) => <Table.Tr key={attempt.id ?? `${page}-${index}`}>
          <Table.Td><Text fw={500} size="sm">{attempt.taskName || 'Задание без названия'}</Text><Text c="dimmed" size="xs">{attempt.topicName || 'Тема не указана'}</Text></Table.Td>
          <Table.Td><Text size="sm">{formatDate(attempt.startedAt)}</Text></Table.Td>
          <Table.Td><Badge color={statusColor(attempt.status)} variant="light">{formatStudentAttemptStatus(attempt.status)}</Badge></Table.Td>
          <Table.Td><Badge color={typeof attempt.isCorrect !== 'boolean' ? 'gray' : attempt.isCorrect ? 'green' : 'red'} variant="light">{formatStudentAttemptReason(attempt.reason)}</Badge></Table.Td>
          <Table.Td>{attempt.rowCount ?? '—'}</Table.Td><Table.Td>{attempt.durationMs !== null && attempt.durationMs !== undefined ? `${attempt.durationMs} мс` : '—'}</Table.Td>
          <Table.Td><Button disabled={!attempt.id} size="xs" variant="subtle" onClick={() => setSelectedAttemptId(attempt.id ?? null)}>Открыть</Button></Table.Td>
        </Table.Tr>)}</Table.Tbody></Table>
      </Table.ScrollContainer>
      <Group justify="space-between"><Text c="dimmed" size="sm">Найдено: {total}</Text>{pageCount > 1 ? <Pagination total={pageCount} value={page} onChange={setPage} /> : null}</Group>
    </Stack></AppCard> : null}
    <StudentAttemptDetailsDrawer attemptId={selectedAttemptId} onClose={() => setSelectedAttemptId(null)} />
  </Stack></Page>;
}
