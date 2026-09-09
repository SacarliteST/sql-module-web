import { Button, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { AppCard, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

const sections = [
  {
    title: 'Темы и задания',
    description: 'Иерархия учебных тем, задания и встроенные эталонные решения.',
    to: '/teacher/topics',
  },
  {
    title: 'Учебные базы',
    description: 'Базы, схемы и тестовые данные для выполнения SQL-запросов.',
    to: '/teacher/databases',
  },
  {
    title: 'Попытки студентов',
    description: 'Результаты выполнения заданий и отправленный студентами SQL.',
    to: '/teacher/attempts',
  },
  {
    title: 'Каталог СУБД',
    description: 'Доступные движки, физические типы и параметры схем.',
    to: '/teacher/dbms',
  },
] as const;

export function TeacherHomePage() {
  return (
    <Page>
      <Stack gap="lg">
        <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель' }]} />
        <PageHeader
          title="Рабочая область преподавателя"
          description="Подготовка учебных баз, SQL-заданий и контроль результатов студентов."
        />
        <TeacherContourTabs />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {sections.map((section) => (
            <AppCard key={section.to}>
              <Stack align="flex-start" gap="sm">
                <Title order={3} size="h5">
                  {section.title}
                </Title>
                <Text c="dimmed" size="sm">
                  {section.description}
                </Text>
                <Button component={Link} to={section.to} size="xs" variant="outline">
                  Открыть
                </Button>
              </Stack>
            </AppCard>
          ))}
        </SimpleGrid>
      </Stack>
    </Page>
  );
}
