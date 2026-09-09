import { Alert, Grid, Skeleton, Stack, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudentContourTabs } from '../../features/student-contour';
import { mapStudentApiError, StudentErrorAlert } from '../../features/student-errors';
import { StudentTaskCatalog } from '../../features/student-tasks';
import { buildStudentTopicTree, flattenStudentTopicTree, StudentTopicTree, useStudentTopics } from '../../features/student-topics';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function StudentTasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topicsQuery = useStudentTopics();
  const topics = topicsQuery.data ?? [];
  const tree = useMemo(() => buildStudentTopicTree(topics), [topics]);
  const flatTopics = useMemo(() => flattenStudentTopicTree(tree), [tree]);
  const requestedTopicId = searchParams.get('topicId');
  const selectedTopic = flatTopics.find((topic) => topic.id === requestedTopicId) ?? null;
  const invalidSelection = Boolean(requestedTopicId && topicsQuery.isSuccess && !selectedTopic);
  const selectTopic = (topicId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (topicId) next.set('topicId', topicId); else next.delete('topicId');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  return <Page><Stack gap="lg">
    <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Студент', to: '/student' }, { label: 'Задания' }]} />
    <PageHeader title="Доступные задания" description="Выберите тему, найдите задание и перейдите к решению." />
    <StudentContourTabs />
    {topicsQuery.isPending ? <Grid><Grid.Col span={{ base: 12, sm: 4, md: 3 }}><Skeleton height={280} radius="sm" /></Grid.Col><Grid.Col span={{ base: 12, sm: 8, md: 9 }}><Skeleton height={280} radius="sm" /></Grid.Col></Grid> : null}
    {topicsQuery.isError ? <StudentErrorAlert error={mapStudentApiError(undefined, topicsQuery.error)} onRetry={() => void topicsQuery.refetch()} /> : null}
    {topicsQuery.isSuccess && !flatTopics.length ? <AppCard><EmptyState title="Доступных тем пока нет" description="Преподаватель ещё не опубликовал задания." /></AppCard> : null}
    {topicsQuery.isSuccess && flatTopics.length ? <>
      {invalidSelection ? <Alert color="yellow" title="Тема недоступна">Выбранная тема больше не существует или не содержит опубликованных заданий. Показаны все темы.</Alert> : null}
      <Grid align="flex-start">
        <Grid.Col span={{ base: 12, sm: 4, md: 3 }}><AppCard><Stack gap="sm"><Title order={2} size="h4">Темы</Title><StudentTopicTree flatTopics={flatTopics} nodes={tree} selectedId={selectedTopic?.id ?? null} onSelect={selectTopic} /></Stack></AppCard></Grid.Col>
        <Grid.Col span={{ base: 12, sm: 8, md: 9 }}><StudentTaskCatalog topicId={selectedTopic?.id} topicName={selectedTopic?.topicName} /></Grid.Col>
      </Grid>
    </> : null}
  </Stack></Page>;
}
