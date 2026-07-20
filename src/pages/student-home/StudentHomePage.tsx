import { Button } from '@mantine/core';
import { AppCard, ContourHeader, EmptyState, Page, PageBreadcrumbs } from '../../shared/ui';

export function StudentHomePage() {
  return (
    <Page>
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Студент' }]} />
      <ContourHeader
        title="Контур студента"
        description="Рабочая область для будущего выбора SQL-заданий, решения и просмотра попыток."
        modeLabel="Заглушка"
        actions={<Button disabled>Открыть задания</Button>}
      />

      <AppCard>
        <EmptyState
          title="Учебные задания будут подключены следующим шагом"
          description="Следующая итерация добавит дерево материалов: Темы -> Базы -> Задания. В этом промте API и дерево не подключаются."
        />
      </AppCard>
    </Page>
  );
}
