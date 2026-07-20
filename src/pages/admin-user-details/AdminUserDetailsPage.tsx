import {
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AdminContourTabs,
  adminUserActivities,
  adminUsers,
  type AdminUserRole,
  getAdminEventToneColor,
  getAdminUserStatusColor,
  getAdminUserStatusLabel,
} from '../../features/admin-contour';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

const roleDescriptions: Record<AdminUserRole, string> = {
  Admin: 'Полный доступ к системе, пользователям и административным настройкам.',
  Teacher: 'Доступ к созданию учебных материалов, заданий и учебных баз.',
  Student: 'Доступ к прохождению курсов, решению задач и просмотру статистики.',
};

const roleOrder: AdminUserRole[] = ['Admin', 'Teacher', 'Student'];

export function AdminUserDetailsPage() {
  const { userId } = useParams();
  const user = adminUsers.find((item) => item.id === userId);
  const [selectedRoles, setSelectedRoles] = useState<AdminUserRole[]>(user?.roles ?? []);

  const userActivities = useMemo(() => {
    if (!user) {
      return [];
    }

    return adminUserActivities.filter((event) => event.userId === user.id).slice(0, 5);
  }, [user]);

  const toggleRole = (role: AdminUserRole) => {
    setSelectedRoles((currentRoles) =>
      currentRoles.includes(role)
        ? currentRoles.filter((currentRole) => currentRole !== role)
        : [...currentRoles, role],
    );
  };

  if (!user) {
    return (
      <Page>
        <PageBreadcrumbs
          items={[
            { label: 'Главная', to: '/' },
            { label: 'Администратор', to: '/admin' },
            { label: 'Пользователи', to: '/admin/users' },
            { label: 'Пользователь не найден' },
          ]}
        />
        <AppCard>
          <EmptyState
            title="Пользователь не найден"
            description="Проверьте ссылку или вернитесь к списку пользователей."
          />
          <Group justify="center" mt="md">
            <Button component={Link} to="/admin/users" variant="outline">
              К списку пользователей
            </Button>
          </Group>
        </AppCard>
      </Page>
    );
  }

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Администратор', to: '/admin' },
          { label: 'Пользователи', to: '/admin/users' },
          { label: user.email },
        ]}
      />

      <Stack gap="md">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <PageHeader title="Карточка пользователя" description={user.email} />
          <Button component={Link} to="/admin/users" size="sm" variant="outline">
            Назад к списку
          </Button>
        </Group>
        <AdminContourTabs />
      </Stack>

      <Grid gutter="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <AppCard p="md">
              <Stack gap="md">
                <Title order={3} size="h5">
                  Основная информация
                </Title>
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Text c="dimmed" size="xs" tt="uppercase">
                      Имя пользователя
                    </Text>
                    <Text fw={600}>{user.name}</Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Text c="dimmed" size="xs" tt="uppercase">
                      Email
                    </Text>
                    <Text fw={600}>{user.email}</Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Text c="dimmed" size="xs" tt="uppercase">
                      Статус
                    </Text>
                    <Badge color={getAdminUserStatusColor(user.status)} radius="sm" variant="dot">
                      {getAdminUserStatusLabel(user.status)}
                    </Badge>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Text c="dimmed" size="xs" tt="uppercase">
                      Дата создания
                    </Text>
                    <Text fw={600}>{user.createdAt}</Text>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Text c="dimmed" size="xs" tt="uppercase">
                      Последний вход
                    </Text>
                    <Text fw={600}>{user.lastLogin}</Text>
                  </Grid.Col>
                </Grid>
              </Stack>
            </AppCard>

            <AppCard p="md">
              <Stack gap="md">
                <Group justify="space-between" align="center" gap="md" wrap="wrap">
                  <Title order={3} size="h5">
                    Роли доступа
                  </Title>
                  <Button size="xs" disabled>
                    Сохранить роли
                  </Button>
                </Group>

                <Stack gap="sm">
                  {roleOrder.map((role) => (
                    <Box
                      key={role}
                      p="sm"
                      style={{
                        border: '1px solid #dee2e6',
                        borderRadius: 4,
                        background: '#ffffff',
                      }}
                    >
                      <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
                        <Stack gap={4}>
                          <Text fw={600}>{role}</Text>
                          <Text c="dimmed" size="sm">
                            {roleDescriptions[role]}
                          </Text>
                        </Stack>
                        <Switch
                          checked={selectedRoles.includes(role)}
                          onChange={() => toggleRole(role)}
                          aria-label={`Переключить роль ${role}`}
                        />
                      </Group>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </AppCard>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <AppCard p="md">
              <Stack gap="md">
                <Title order={3} size="h5">
                  Активность
                </Title>

                <Stack gap="sm">
                  {userActivities.map((event, index) => (
                    <Box key={event.id}>
                      <Group align="flex-start" gap="sm" wrap="nowrap">
                        <Box
                          mt={6}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 8,
                            background: `var(--mantine-color-${getAdminEventToneColor(event.tone)}-6)`,
                            flex: '0 0 auto',
                          }}
                        />
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={600} size="sm">
                            {event.title}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {event.description}
                          </Text>
                          <Text c="dimmed" size="xs">
                            {event.occurredAt}
                          </Text>
                        </Stack>
                      </Group>
                      {index < userActivities.length - 1 ? <Divider mt="sm" /> : null}
                    </Box>
                  ))}
                </Stack>

                <Anchor component={Link} to={`/admin/users/${user.id}/activity`} size="sm">
                  Показать все
                </Anchor>
              </Stack>
            </AppCard>

            <AppCard p="md" style={{ borderColor: '#f1aeb5' }}>
              <Stack gap="md">
                <Stack gap={4}>
                  <Title order={3} size="h5" c="red">
                    Опасные действия
                  </Title>
                  <Text c="dimmed" size="sm">
                    Блокировка пользователя временно ограничит доступ к системе и учебным материалам.
                  </Text>
                </Stack>
                <Button color="red" disabled>
                  Заблокировать пользователя
                </Button>
              </Stack>
            </AppCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </Page>
  );
}
