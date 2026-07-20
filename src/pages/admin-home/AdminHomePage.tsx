import { Alert, Anchor, Badge, Group, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useListAuditEvents } from '../../api/identity/audit/audit';
import { useHealth as useIdentityHealth } from '../../api/identity/health/health';
import { UserRole } from '../../api/identity/model';
import { useListUsers } from '../../api/identity/users/users';
import { useGetAllTargetDbs } from '../../api/sqlmodule/schema/schema';
import { useGetAllTopics } from '../../api/sqlmodule/training/training';
import { formatAuditEventType } from '../../entities/audit';
import { formatUserDateTime } from '../../entities/user';
import {
  AdminContourTabs,
  getAdminServiceStatusColor,
  getAdminServiceStatusLabel,
} from '../../features/admin-contour';
import type { AdminServiceState } from '../../features/admin-contour';
import { getAdminUsersErrorPresentation } from '../../features/admin-users';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

type OverviewMetric = {
  id: string;
  label: string;
  value: string;
  to?: string;
};

type ServiceStatusRow = {
  id: string;
  name: string;
  status: AdminServiceState;
  indicator: string;
};

const metricPageSize = 1;

const useRequestDuration = (isFetching: boolean): number | null => {
  const requestStartRef = useRef<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  useEffect(() => {
    if (isFetching && requestStartRef.current === null) {
      requestStartRef.current = performance.now();
      setDurationMs(null);
      return;
    }

    if (!isFetching && requestStartRef.current !== null) {
      setDurationMs(Math.max(0, Math.round(performance.now() - requestStartRef.current)));
      requestStartRef.current = null;
    }
  }, [isFetching]);

  return durationMs;
};

const formatRequestDuration = (
  durationMs: number | null,
  isChecking: boolean,
): string => {
  if (isChecking) {
    return '...';
  }

  return durationMs === null ? 'Нет данных' : `${durationMs} мс`;
};

const formatMetricValue = (
  count: number | null | undefined,
  isPending: boolean,
  isError: boolean,
): string => {
  if (isPending) {
    return '...';
  }

  if (isError || count === undefined || count === null) {
    return 'Ошибка';
  }

  return new Intl.NumberFormat('ru-RU').format(count);
};

export function AdminHomePage() {
  const identityHealthQuery = useIdentityHealth({
    query: {
      retry: false,
    },
  });
  const usersQuery = useListUsers(
    {
      Page: 1,
      PageSize: metricPageSize,
    },
    {
      query: {
        retry: false,
      },
    },
  );
  const teachersQuery = useListUsers(
    {
      Page: 1,
      PageSize: metricPageSize,
      Role: UserRole.Teacher,
    },
    {
      query: {
        retry: false,
      },
    },
  );
  const studentsQuery = useListUsers(
    {
      Page: 1,
      PageSize: metricPageSize,
      Role: UserRole.Student,
    },
    {
      query: {
        retry: false,
      },
    },
  );
  const topicsQuery = useGetAllTopics(
    {
      Offset: 0,
      Limit: metricPageSize,
    },
    {
      query: {
        retry: false,
      },
    },
  );
  const targetDbsQuery = useGetAllTargetDbs(
    {
      Offset: 0,
      Limit: metricPageSize,
    },
    {
      query: {
        retry: false,
      },
    },
  );
  const auditQuery = useListAuditEvents(
    {
      Page: 1,
      PageSize: 5,
    },
    {
      query: {
        retry: false,
      },
    },
  );

  const auditResponse = auditQuery.data;
  const auditPage = auditResponse?.status === 200 ? auditResponse.data : null;
  const auditError =
    auditResponse && auditResponse.status !== 200 ? auditResponse.data : null;
  const auditErrorStatus =
    auditResponse && auditResponse.status !== 200 ? auditResponse.status : undefined;
  const auditErrorPresentation = auditError
    ? getAdminUsersErrorPresentation(auditError, auditErrorStatus)
    : null;
  const usersResponse = usersQuery.data;
  const teachersResponse = teachersQuery.data;
  const studentsResponse = studentsQuery.data;
  const topicsResponse = topicsQuery.data;
  const targetDbsResponse = targetDbsQuery.data;
  const identityHealthResponse = identityHealthQuery.data;
  const identityHealthDuration = useRequestDuration(identityHealthQuery.isFetching);
  const topicsDuration = useRequestDuration(topicsQuery.isFetching);
  const targetDbsDuration = useRequestDuration(targetDbsQuery.isFetching);
  const isSqlModuleChecking = topicsQuery.isPending || targetDbsQuery.isPending;
  const isSqlModuleAvailable =
    topicsResponse?.status === 200 && targetDbsResponse?.status === 200;
  const sqlModuleDuration =
    topicsDuration === null && targetDbsDuration === null
      ? null
      : Math.max(topicsDuration ?? 0, targetDbsDuration ?? 0);

  const serviceStatuses: ServiceStatusRow[] = [
    {
      id: 'identity',
      name: 'Identity Service',
      status:
        identityHealthQuery.isPending
          ? 'checking'
          : identityHealthQuery.isError || identityHealthResponse?.status !== 200
            ? 'unavailable'
            : 'available',
      indicator:
        formatRequestDuration(identityHealthDuration, identityHealthQuery.isPending),
    },
    {
      id: 'sql-module-api',
      name: 'SQL Module API',
      status:
        isSqlModuleChecking
          ? 'checking'
          : isSqlModuleAvailable
            ? 'available'
            : 'unavailable',
      indicator:
        formatRequestDuration(sqlModuleDuration, isSqlModuleChecking),
    },
  ];

  const overviewMetrics: OverviewMetric[] = [
    {
      id: 'users',
      label: 'Пользователи',
      value: formatMetricValue(
        usersResponse?.status === 200 ? usersResponse.data.totalCount : undefined,
        usersQuery.isPending,
        usersQuery.isError || Boolean(usersResponse && usersResponse.status !== 200),
      ),
      to: '/admin/users',
    },
    {
      id: 'teachers',
      label: 'Преподаватели',
      value: formatMetricValue(
        teachersResponse?.status === 200 ? teachersResponse.data.totalCount : undefined,
        teachersQuery.isPending,
        teachersQuery.isError || Boolean(teachersResponse && teachersResponse.status !== 200),
      ),
    },
    {
      id: 'students',
      label: 'Студенты',
      value: formatMetricValue(
        studentsResponse?.status === 200 ? studentsResponse.data.totalCount : undefined,
        studentsQuery.isPending,
        studentsQuery.isError || Boolean(studentsResponse && studentsResponse.status !== 200),
      ),
    },
    {
      id: 'topics',
      label: 'Темы',
      value: formatMetricValue(
        topicsResponse?.status === 200 ? topicsResponse.data.count : undefined,
        topicsQuery.isPending,
        topicsQuery.isError || Boolean(topicsResponse && topicsResponse.status !== 200),
      ),
    },
    {
      id: 'target-dbs',
      label: 'Учебные базы',
      value: formatMetricValue(
        targetDbsResponse?.status === 200 ? targetDbsResponse.data.count : undefined,
        targetDbsQuery.isPending,
        targetDbsQuery.isError || Boolean(targetDbsResponse && targetDbsResponse.status !== 200),
      ),
    },
  ];

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
        {overviewMetrics.map((metric) => (
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
                Реальная проверка
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
                {serviceStatuses.map((service) => (
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

            {auditQuery.isPending ? (
              <Text c="dimmed" size="sm">
                Загружаем последние события IdentityService.
              </Text>
            ) : auditQuery.isError ? (
              <Alert color="red" variant="light">
                IdentityService недоступен. Проверьте, что сервис запущен.
              </Alert>
            ) : auditError ? (
              <Alert color="red" title={auditErrorPresentation?.title} variant="light">
                {auditErrorPresentation?.message}
              </Alert>
            ) : auditPage && auditPage.items.length > 0 ? (
              <Stack gap="sm">
                {auditPage.items.map((event) => (
                  <Stack key={event.id} gap={2}>
                    <Group justify="space-between" gap="sm" wrap="nowrap">
                      <Text fw={600} size="sm">
                        {formatAuditEventType(event.eventType)}
                      </Text>
                      <Text c="dimmed" size="xs" ta="right">
                        {formatUserDateTime(event.createdAt)}
                      </Text>
                    </Group>
                    <Text c="dimmed" size="xs">
                      {event.description}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <EmptyState
                title="Событий пока нет"
                description="Когда IdentityService запишет события аудита, они появятся здесь."
              />
            )}
          </Stack>
        </AppCard>
      </SimpleGrid>
    </Page>
  );
}
