import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type {
  DbmsDictionaryResponse,
  HttpValidationProblemDetails,
  TargetDbResponse,
} from '../../api/sqlmodule/model';
import { useGetAllTargetDbs } from '../../api/sqlmodule/schema/schema';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { formatAuditDateTime as formatDateTime } from '../../shared/lib/teacher-audit';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

type TeacherDatabaseView = {
  id: string;
  title: string;
  provider: string;
  description: string;
  isReadOnly: boolean;
  updatedAt?: string;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function getProblemMessage(problem: HttpValidationProblemDetails | null): string {
  return (
    problem?.detail?.trim() ||
    problem?.title?.trim() ||
    'Не удалось загрузить данные из SQL Module API.'
  );
}

function buildDbmsNameMap(dbmsItems: DbmsDictionaryResponse[]): Map<string, string> {
  return new Map(
    dbmsItems
      .filter((dbms) => dbms.id)
      .map((dbms) => [
        dbms.id as string,
        dbms.dbmsName?.trim() || dbms.dbmsSystemName?.trim() || dbms.id || 'Неизвестная СУБД',
      ]),
  );
}

function normalizeTargetDb(
  database: TargetDbResponse,
  dbmsNameById: Map<string, string>,
): TeacherDatabaseView | null {
  if (!database.id) {
    return null;
  }

  return {
    id: database.id,
    title: database.dbName?.trim() || 'Без названия',
    provider: database.dbmsId ? dbmsNameById.get(database.dbmsId) ?? database.dbmsId : 'СУБД не указана',
    description: database.description?.trim() || 'Описание учебной базы пока не заполнено.',
    isReadOnly: Boolean(database.isReadOnly),
    updatedAt: database.updatedAt ?? database.createdAt,
  };
}

export function TeacherDatabasesPage() {
  const [search, setSearch] = useState('');
  const searchValue = normalizeSearch(search);

  const targetDbsQuery = useGetAllTargetDbs(
    { Limit: 100 },
    {
      query: {
        retry: false,
      },
    },
  );

  const dbmsQuery = useGetAllDbmsDictionaries(
    { Limit: 100 },
    {
      query: {
        retry: false,
      },
    },
  );

  const targetDbsResponse = targetDbsQuery.data;
  const targetDbsPage = targetDbsResponse?.status === 200 ? targetDbsResponse.data : null;
  const targetDbsError =
    targetDbsResponse && targetDbsResponse.status !== 200 ? targetDbsResponse.data : null;
  const dbmsResponse = dbmsQuery.data;
  const dbmsPage = dbmsResponse?.status === 200 ? dbmsResponse.data : null;
  const dbmsError = dbmsResponse && dbmsResponse.status !== 200 ? dbmsResponse.data : null;

  const databases = useMemo(() => {
    const dbmsNameById = buildDbmsNameMap(dbmsPage?.items ?? []);

    return (targetDbsPage?.items ?? [])
      .map((database) => normalizeTargetDb(database, dbmsNameById))
      .filter((database): database is TeacherDatabaseView => database !== null)
      .sort((left, right) => left.title.localeCompare(right.title, 'ru'));
  }, [dbmsPage?.items, targetDbsPage?.items]);

  const filteredDatabases = useMemo(() => {
    if (!searchValue) {
      return databases;
    }

    return databases.filter((database) => {
      const title = database.title.toLowerCase();
      const provider = database.provider.toLowerCase();
      const description = database.description.toLowerCase();

      return (
        title.includes(searchValue) ||
        provider.includes(searchValue) ||
        description.includes(searchValue)
      );
    });
  }, [databases, searchValue]);

  const isPending = targetDbsQuery.isPending || dbmsQuery.isPending;
  const isUnavailable = targetDbsQuery.isError || dbmsQuery.isError;
  const apiError = targetDbsError ?? dbmsError;

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Преподаватель', to: '/teacher' },
          { label: 'Учебные базы' },
        ]}
      />

      <Stack gap="md">
        <PageHeader
          title="Учебные базы"
          description="Учебные базы используются как контекст для SQL-заданий и проверок."
          actions={<Button component={Link} to="/teacher/databases/new">Создать базу</Button>}
        />
        <TeacherContourTabs />
      </Stack>

      <Stack gap="md">
        <Group justify="space-between" gap="md" wrap="wrap">
          <Title order={3} size="h5">
            Список учебных баз
          </Title>
          <TextInput
            placeholder="Поиск по базам"
            size="sm"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            w={{ base: '100%', sm: 320 }}
          />
        </Group>

        {isPending ? (
          <AppCard p="md">
            <EmptyState
              title="Загружаем учебные базы"
              description="Получаем список баз и справочник СУБД из SQL Module API."
            />
          </AppCard>
        ) : isUnavailable ? (
          <AppCard p="md">
            <EmptyState
              title="SQL Module API недоступен"
              description="Проверьте, что сервис запущен и runtime config указывает на правильный адрес."
            />
          </AppCard>
        ) : apiError ? (
          <AppCard p="md">
            <Alert color="red" title={apiError.title ?? 'Ошибка загрузки'} variant="light">
              {getProblemMessage(apiError)}
            </Alert>
          </AppCard>
        ) : filteredDatabases.length > 0 ? (
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
            {filteredDatabases.map((database) => (
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
                    <Badge
                      color={database.isReadOnly ? 'gray' : 'green'}
                      radius="sm"
                      variant="light"
                    >
                      {database.isReadOnly ? 'Защищена от изменений' : 'Редактируется'}
                    </Badge>
                  </Group>

                  <Text c="dimmed" size="sm" lineClamp={3}>
                    {database.description}
                  </Text>

                  <Group gap="xs">
                    <Badge color="gray" radius="sm" variant="outline">
                      {database.provider}
                    </Badge>
                    <Badge color="gray" radius="sm" variant="outline">
                      Обновлено: {formatDateTime(database.updatedAt)}
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
        ) : (
          <AppCard p="md">
            <EmptyState
              title="Учебные базы не найдены"
              description="Измените поисковый запрос или создайте новую учебную базу."
            />
          </AppCard>
        )}
      </Stack>
    </Page>
  );
}
