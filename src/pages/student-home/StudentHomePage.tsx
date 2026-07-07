import { Button, SimpleGrid, Text } from '@mantine/core';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function StudentHomePage() {
  return (
    <Page>
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Студент' }]} />
      <PageHeader
        title="Рабочая область студента"
        description="Здесь будут доступные SQL-задания, редактор решения, проверки и история попыток."
        actions={<Button disabled>Открыть задания</Button>}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <AppCard>
          <Text fw={600}>Доступные задания</Text>
          <Text c="dimmed" mt="xs" size="sm">
            Список опубликованных заданий появится после подключения API сценариев.
          </Text>
        </AppCard>
        <AppCard>
          <Text fw={600}>Последние попытки</Text>
          <Text c="dimmed" mt="xs" size="sm">
            История решений и статусы проверок будут добавлены позже.
          </Text>
        </AppCard>
      </SimpleGrid>

      <AppCard>
        <EmptyState
          title="Учебные задания ещё не подключены"
          description="Сейчас экран подтверждает вход под ролью Student. Реальный процесс решения SQL-заданий добавим отдельной итерацией."
        />
      </AppCard>
    </Page>
  );
}
