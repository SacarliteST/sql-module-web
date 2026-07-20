import {
  Anchor,
  Avatar,
  Badge,
  Button,
  Grid,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  adminUsers,
  AdminContourTabs,
  type AdminUserRole,
  type AdminUserStatus,
  getAdminUserInitials,
  getAdminUserStatusColor,
  getAdminUserStatusLabel,
} from '../../features/admin-contour';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

type RoleFilter = 'all' | AdminUserRole;
type StatusFilter = 'all' | AdminUserStatus;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const searchValue = normalizeSearch(search);

  const filteredUsers = useMemo(() => {
    return adminUsers.filter((user) => {
      const matchesSearch =
        !searchValue ||
        user.name.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue);
      const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchValue, statusFilter]);

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Администратор', to: '/admin' },
          { label: 'Пользователи' },
        ]}
      />

      <Stack gap="md">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <PageHeader
            title="Пользователи"
            description="Поиск пользователей и управление ролями доступа."
          />
          <Button component={Link} to="/admin/users/new" size="sm">
            Создать пользователя
          </Button>
        </Group>
        <AdminContourTabs />
      </Stack>

      <AppCard p="md">
        <Grid gutter="sm">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Поиск"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Поиск по email или имени..."
              size="sm"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Роль"
              value={roleFilter}
              onChange={(value) => setRoleFilter((value ?? 'all') as RoleFilter)}
              data={[
                { value: 'all', label: 'Все роли' },
                { value: 'Admin', label: 'Admin' },
                { value: 'Teacher', label: 'Teacher' },
                { value: 'Student', label: 'Student' },
              ]}
              size="sm"
              allowDeselect={false}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Select
              label="Статус"
              value={statusFilter}
              onChange={(value) => setStatusFilter((value ?? 'all') as StatusFilter)}
              data={[
                { value: 'all', label: 'Все статусы' },
                { value: 'active', label: 'Активен' },
                { value: 'blocked', label: 'Заблокирован' },
              ]}
              size="sm"
              allowDeselect={false}
            />
          </Grid.Col>
        </Grid>
      </AppCard>

      <AppCard p={0}>
        {filteredUsers.length > 0 ? (
          <Stack gap={0}>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Пользователь</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Роли</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Последний вход</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar color="gray" radius="xl" size="sm">
                          {getAdminUserInitials(user.name)}
                        </Avatar>
                        <Text fw={600} size="sm">
                          {user.name}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.email}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {user.roles.map((role) => (
                          <Badge key={role} color="blue" radius="sm" variant="light">
                            {role}
                          </Badge>
                        ))}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getAdminUserStatusColor(user.status)} radius="sm" variant="dot">
                        {getAdminUserStatusLabel(user.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{user.lastLogin}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Anchor component={Link} to={`/admin/users/${user.id}`} size="sm">
                          Открыть
                        </Anchor>
                        <Button component={Link} to={`/admin/users/${user.id}`} size="xs" variant="subtle">
                          Роли
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Group justify="space-between" p="sm" gap="md" wrap="wrap">
              <Text c="dimmed" size="sm">
                Показано 1-{filteredUsers.length} из {adminUsers.length} пользователей
              </Text>
              <Pagination total={3} value={1} size="sm" />
            </Group>
          </Stack>
        ) : (
          <EmptyState
            title="Пользователи не найдены"
            description="Измените поисковый запрос или параметры фильтрации."
          />
        )}
      </AppCard>
    </Page>
  );
}
