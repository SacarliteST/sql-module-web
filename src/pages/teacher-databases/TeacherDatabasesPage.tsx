import { Anchor, Badge, Button, Group, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import {
  getStatusColor,
  getStatusLabel,
  teacherDatabases,
  TeacherContourTabs,
} from '../../features/teacher-contour';
import { AppCard, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

export function TeacherDatabasesPage() {
  return (
    <Page>
      <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель' }]} />

      <Stack gap="md">
        <PageHeader
          title="Контур преподавателя"
          description="Учебные базы используются как контекст для SQL-заданий и проверок."
          actions={<Button component={Link} to="/teacher/databases/new">Создать базу</Button>}
        />
        <TeacherContourTabs />
      </Stack>

      <Stack gap="md">
        <Group justify="space-between" gap="md" wrap="wrap">
          <Title order={3} size="h5">
            Учебные базы
          </Title>
          <TextInput placeholder="Поиск по базам" size="sm" w={{ base: '100%', sm: 320 }} />
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          {teacherDatabases.map((database) => (
            <AppCard key={database.id} p="md" shadow="xs">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start" gap="sm">
                  <Stack gap={2}>
                    <Anchor
                      component={Link}
                      to={`/teacher/databases/${database.id}`}
                      fw={700}
                      c="dark"
                      underline="never"
                    >
                      {database.title}
                    </Anchor>
                    <Text c="dimmed" size="sm">
                      {database.provider}
                    </Text>
                  </Stack>
                  <Badge color={getStatusColor(database.status)} radius="sm" variant="light">
                    {getStatusLabel(database.status)}
                  </Badge>
                </Group>

                <Text c="dimmed" size="sm" lineClamp={3}>
                  {database.description}
                </Text>

                <Group gap="xs">
                  <Badge color="gray" radius="sm" variant="outline">
                    {database.tableCount} таблиц
                  </Badge>
                  <Badge color="gray" radius="sm" variant="outline">
                    {database.taskCount} заданий
                  </Badge>
                  <Badge color="gray" radius="sm" variant="outline">
                    {database.updatedAt}
                  </Badge>
                </Group>

                <Group gap="xs" mt="xs">
                  <Button component={Link} to={`/teacher/databases/${database.id}`} size="xs" variant="outline">
                    Открыть
                  </Button>
                  <Button component={Link} to={`/teacher/databases/${database.id}/schema`} size="xs" variant="light">
                    Схема
                  </Button>
                </Group>
              </Stack>
            </AppCard>
          ))}
        </SimpleGrid>
      </Stack>
    </Page>
  );
}
