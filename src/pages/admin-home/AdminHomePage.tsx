import { Button, SimpleGrid, Text } from '@mantine/core';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function AdminHomePage() {
  return (
    <Page>
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Администратор' }]} />
      <PageHeader
        title="Панель администратора"
        description="Раздел для управления пользователями, ролями и системными справочниками SQL-модуля."
        actions={<Button disabled>Создать пользователя</Button>}
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <AppCard>
          <Text fw={600}>Пользователи</Text>
          <Text c="dimmed" mt="xs" size="sm">
            Таблица пользователей и назначение ролей будут добавлены позже.
          </Text>
        </AppCard>
        <AppCard>
          <Text fw={600}>Справочники</Text>
          <Text c="dimmed" mt="xs" size="sm">
            Настройки СУБД и технические справочники появятся в следующих итерациях.
          </Text>
        </AppCard>
      </SimpleGrid>

      <AppCard>
        <EmptyState
          title="Административные функции ещё не подключены"
          description="Сейчас экран подтверждает вход под ролью Admin. Реальные таблицы и формы подключим отдельными небольшими задачами."
        />
      </AppCard>
    </Page>
  );
}
