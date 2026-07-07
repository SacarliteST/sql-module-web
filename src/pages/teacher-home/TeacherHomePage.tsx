import { Button, SimpleGrid, Text } from '@mantine/core';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function TeacherHomePage() {
  return (
    <Page>
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель' }]} />
      <PageHeader
        title="Рабочая область преподавателя"
        description="Здесь будет подготовка SQL-заданий, схем данных, наборов данных и проверок."
        actions={<Button disabled>Создать задание</Button>}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <AppCard>
          <Text fw={600}>SQL-задания</Text>
          <Text c="dimmed" mt="xs" size="sm">
            Список заданий, публикация и редактирование появятся позже.
          </Text>
        </AppCard>
        <AppCard>
          <Text fw={600}>Схемы данных</Text>
          <Text c="dimmed" mt="xs" size="sm">
            Конструктор схем и тестовых данных будет подключён отдельным шагом.
          </Text>
        </AppCard>
        <AppCard>
          <Text fw={600}>Попытки студентов</Text>
          <Text c="dimmed" mt="xs" size="sm">
            Просмотр результатов и истории решений добавим после базовых сценариев.
          </Text>
        </AppCard>
      </SimpleGrid>

      <AppCard>
        <EmptyState
          title="Инструменты преподавателя ещё не подключены"
          description="Сейчас экран нужен для проверки маршрутизации и единого UI. Следующие промты будут добавлять реальные сценарии."
        />
      </AppCard>
    </Page>
  );
}
