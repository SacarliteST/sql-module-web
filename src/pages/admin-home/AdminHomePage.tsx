import { Button } from '@mantine/core';
import { AppCard, ContourHeader, EmptyState, Page, PageBreadcrumbs } from '../../shared/ui';

export function AdminHomePage() {
  return (
    <Page>
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Администратор' }]} />
      <ContourHeader
        title="Контур администратора"
        description="Служебная рабочая область для будущих административных функций SQL-модуля."
        modeLabel="Заглушка"
        actions={<Button disabled>Открыть управление</Button>}
      />

      <AppCard>
        <EmptyState
          title="Административные функции будут добавлены позже"
          description="Сейчас экран нужен для проверки маршрутизации, роли Admin и единого оформления контуров."
        />
      </AppCard>
    </Page>
  );
}
