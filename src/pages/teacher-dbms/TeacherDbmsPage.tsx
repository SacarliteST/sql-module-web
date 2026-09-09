import { Alert, Badge, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function TeacherDbmsPage() {
  const query = useGetAllDbmsDictionaries({ Limit: 100 });
  const response = query.data;
  const items = response?.status === 200 ? response.data.items ?? [] : [];
  return (
    <Page><Stack gap="lg">
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель', to: '/teacher' }, { label: 'Каталог СУБД' }]} />
      <PageHeader title="Каталог СУБД" description="Движки, доступные при создании учебных баз." />
      <TeacherContourTabs />
      {(query.isError || (response && response.status !== 200)) ? <Alert color="red">Не удалось загрузить каталог СУБД.</Alert> : null}
      {query.isPending ? <AppCard><Text c="dimmed">Загрузка каталога...</Text></AppCard> : items.length ? <SimpleGrid cols={{ base: 1, md: 2 }}>{items.map((dbms) => <AppCard key={dbms.id}><Stack gap="xs"><Group justify="space-between"><Title order={4}>{dbms.dbmsName?.trim() || dbms.dbmsSystemName?.trim() || 'СУБД'}</Title><Group gap="xs"><Badge color={dbms.isActive ? 'green' : 'gray'} variant="light">{dbms.isActive ? 'Активна' : 'Отключена'}</Badge><Badge color={dbms.isAvailable ? 'green' : 'red'} variant="light">{dbms.isAvailable ? 'Доступна' : 'Недоступна'}</Badge></Group></Group><Text size="sm" c="dimmed">{dbms.dbmsSystemName || 'Системное имя не указано'} · порт {dbms.defaultPort ?? '—'}</Text><Text size="sm">Образ: {dbms.dockerImage || 'не указан'}</Text><Text size="sm">База по умолчанию: {dbms.defaultDatabase || '—'}</Text>{dbms.unavailableReason ? <Alert color="yellow">{dbms.unavailableReason}</Alert> : null}<Text size="xs" c="dimmed">{dbms.canManageCatalog ? 'Управление разрешено политикой backend' : 'Каталог доступен только для чтения'}</Text></Stack></AppCard>)}</SimpleGrid> : <AppCard><EmptyState title="Каталог пуст" description="Backend не вернул доступные СУБД." /></AppCard>}
    </Stack></Page>
  );
}
