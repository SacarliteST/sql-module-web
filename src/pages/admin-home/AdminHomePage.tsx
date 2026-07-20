import { Anchor, Badge, Box, Group, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import {
  AdminContourTabs,
  adminActivityEvents,
  adminOverviewMetrics,
  adminServiceStatuses,
  getAdminEventToneColor,
  getAdminServiceStatusColor,
  getAdminServiceStatusLabel,
} from '../../features/admin-contour';
import { AppCard, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function AdminHomePage() {
  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Администратор', to: '/admin' },
          { label: 'Обзор' },
        ]}
      />

      <Stack gap="md">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <PageHeader
            title="Обзор системы"
            description="Состояние пользователей, сервисов и основных сущностей SQL-модуля."
          />
        </Group>
        <AdminContourTabs />
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
        {adminOverviewMetrics.map((metric) => (
          <AppCard key={metric.id} p="md">
            <Stack gap={4}>
              <Text c="dimmed" size="sm">
                {metric.label}
              </Text>
              {metric.to ? (
                <Anchor component={Link} to={metric.to} c="dark" underline="never">
                  <Title order={3} size="h4">
                    {metric.value}
                  </Title>
                </Anchor>
              ) : (
                <Title order={3} size="h4">
                  {metric.value}
                </Title>
              )}
            </Stack>
          </AppCard>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <AppCard p={0}>
          <Stack gap={0}>
            <Group justify="space-between" p="md" gap="md" wrap="wrap">
              <Title order={3} size="h5">
                Состояние сервисов
              </Title>
              <Text c="dimmed" size="xs">
                Мок-данные
              </Text>
            </Group>

            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Сервис</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Метрика</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {adminServiceStatuses.map((service) => (
                  <Table.Tr key={service.id}>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {service.name}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getAdminServiceStatusColor(service.status)} radius="sm" variant="light">
                        {getAdminServiceStatusLabel(service.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" size="sm">
                        {service.indicator}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </AppCard>

        <AppCard p="md">
          <Stack gap="md">
            <Group justify="space-between" gap="md" wrap="wrap">
              <Title order={3} size="h5">
                Последние события
              </Title>
              <Anchor component={Link} to="/admin/events" size="sm">
                Все события
              </Anchor>
            </Group>

            <Stack gap="sm">
              {adminActivityEvents.map((event) => (
                <Group key={event.id} align="flex-start" gap="sm" wrap="nowrap">
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
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Stack>
        </AppCard>
      </SimpleGrid>
    </Page>
  );
}
