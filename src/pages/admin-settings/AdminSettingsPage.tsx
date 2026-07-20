import {
  Badge,
  Button,
  Code,
  Grid,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  AdminContourTabs,
  adminConnectionChecks,
  adminIntegrationSettings,
  adminSystemInfo,
  adminWorkMode,
  getAdminServiceStatusColor,
  getAdminServiceStatusLabel,
} from '../../features/admin-contour';
import { AppCard, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function AdminSettingsPage() {
  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Администратор', to: '/admin' },
          { label: 'Настройки' },
        ]}
      />

      <Stack gap="md">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <PageHeader
            title="Настройки"
            description="Параметры интеграции и окружения SQL-модуля."
          />
        </Group>
        <AdminContourTabs />
      </Stack>

      <Grid gutter="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <AppCard p="md">
              <Stack gap="md">
                <Group justify="space-between" gap="md" wrap="wrap">
                  <Title order={3} size="h5">
                    Интеграции
                  </Title>
                  <Badge color="gray" radius="sm" variant="light">
                    runtime config
                  </Badge>
                </Group>

                <Stack gap="sm">
                  {adminIntegrationSettings.map((setting) => (
                    <TextInput
                      key={setting.id}
                      label={setting.label}
                      value={setting.value}
                      readOnly
                      size="sm"
                      rightSectionWidth={120}
                      rightSection={
                        <Text c="dimmed" size="xs">
                          {setting.source}
                        </Text>
                      }
                    />
                  ))}
                </Stack>

                <Text c="dimmed" size="xs">
                  Значения показаны только для просмотра. Реальная конфигурация задается через runtime config.
                </Text>
              </Stack>
            </AppCard>

            <AppCard p={0}>
              <Stack gap={0}>
                <Group justify="space-between" p="md" gap="md" wrap="wrap">
                  <Title order={3} size="h5">
                    Проверка подключения
                  </Title>
                  <Button size="xs" disabled>
                    Проверить сервисы
                  </Button>
                </Group>

                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Сервис</Table.Th>
                      <Table.Th>Статус</Table.Th>
                      <Table.Th>Задержка</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {adminConnectionChecks.map((check) => (
                      <Table.Tr key={check.id}>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {check.service}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getAdminServiceStatusColor(check.status)} radius="sm" variant="light">
                            {getAdminServiceStatusLabel(check.status)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text c="dimmed" size="sm">
                            {check.latency}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </AppCard>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <AppCard p="md">
              <Stack gap="md">
                <Title order={3} size="h5">
                  Режим работы
                </Title>

                <Group gap="xs">
                  {adminWorkMode.available.map((mode) => (
                    <Badge
                      key={mode}
                      color={mode === adminWorkMode.current ? 'blue' : 'gray'}
                      radius="sm"
                      variant={mode === adminWorkMode.current ? 'filled' : 'outline'}
                    >
                      {mode}
                    </Badge>
                  ))}
                </Group>

                <Text c="dimmed" size="sm">
                  {adminWorkMode.description}
                </Text>
              </Stack>
            </AppCard>

            <AppCard p="md">
              <Stack gap="md">
                <Title order={3} size="h5">
                  О системе
                </Title>

                <Stack gap="sm">
                  {adminSystemInfo.map((item) => (
                    <Group key={item.id} justify="space-between" gap="md" wrap="nowrap">
                      <Text c="dimmed" size="sm">
                        {item.label}
                      </Text>
                      <Code>{item.value}</Code>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            </AppCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </Page>
  );
}
