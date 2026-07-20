import { Button, SimpleGrid, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useSessionStore, type UserRole } from '../../session';
import { AppCard, EmptyState, Page, PageHeader } from '../../shared/ui';

type ContourCard = {
  role: UserRole;
  title: string;
  description: string;
  to: string;
};

const contours: ContourCard[] = [
  {
    role: 'Admin',
    title: 'Администратор',
    description: 'Служебный контур для системных функций и будущего управления справочниками.',
    to: '/admin',
  },
  {
    role: 'Teacher',
    title: 'Преподаватель',
    description: 'Подготовка учебных баз, тем, эталонных запросов и SQL-заданий.',
    to: '/teacher',
  },
  {
    role: 'Student',
    title: 'Студент',
    description: 'Переход к учебным SQL-заданиям и будущей истории попыток.',
    to: '/student',
  },
];

function canOpenContour(userRoles: UserRole[], contourRole: UserRole): boolean {
  return userRoles.includes('Admin') || userRoles.includes(contourRole);
}

export function HomePage() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const availableContours = contours.filter((contour) => canOpenContour(user?.roles ?? [], contour.role));

  if (status !== 'authenticated') {
    return (
      <Page>
        <PageHeader
          title="SQL Module"
          description="Выберите доступный контур работы после входа в систему."
        />
        <AppCard>
          <EmptyState
            title="Нужно войти в систему"
            description="После входа приложение покажет контуры, доступные вашей роли."
            actions={
              <Button component={Link} to="/login">
                Войти
              </Button>
            }
          />
        </AppCard>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="SQL Module"
        description="Выберите доступный контур работы."
      />

      {availableContours.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {availableContours.map((contour) => (
            <AppCard key={contour.to}>
              <Text fw={600}>{contour.title}</Text>
              <Text c="dimmed" mt="xs" size="sm">
                {contour.description}
              </Text>
              <Button component={Link} mt="md" size="sm" to={contour.to}>
                Открыть
              </Button>
            </AppCard>
          ))}
        </SimpleGrid>
      ) : (
        <AppCard>
          <EmptyState
            title="Нет доступных контуров"
            description="В токене пользователя нет роли Admin, Teacher или Student."
          />
        </AppCard>
      )}
    </Page>
  );
}
