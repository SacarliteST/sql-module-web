import { Button, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { StudentContourTabs } from '../../features/student-contour';
import { AppCard, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

const sections = [
  { title: 'Доступные задания', description: 'Выберите тему и откройте опубликованное SQL-задание.', to: '/student/tasks' },
  { title: 'Мои попытки', description: 'Вернитесь к своим решениям и результатам проверки.', to: '/student/attempts' },
] as const;

export function StudentHomePage() {
  return (
    <Page><Stack gap="lg">
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Студент' }]} />
      <PageHeader title="Рабочая область студента" description="Решайте опубликованные SQL-задания и просматривайте свои попытки." />
      <StudentContourTabs />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {sections.map((section) => <AppCard key={section.to}><Stack align="flex-start" gap="sm">
          <Title order={3} size="h5">{section.title}</Title>
          <Text c="dimmed" size="sm">{section.description}</Text>
          <Button component={Link} size="xs" to={section.to} variant="outline">Открыть</Button>
        </Stack></AppCard>)}
      </SimpleGrid>
    </Stack></Page>
  );
}
