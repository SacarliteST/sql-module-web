import { Accordion, Alert, Badge, Divider, Group, List, Skeleton, Stack, Text, Title } from '@mantine/core';
import { lazy, Suspense } from 'react';
import { useGetStudentTaskSchema } from '../../../api/sqlmodule/student/student';
import { AppCard, EmptyState } from '../../../shared/ui';
import { mapStudentApiError, StudentErrorAlert } from '../../student-errors';
import { schemaColumnPairs, type StudentDatabaseSchema } from '../model/student-schema';
import { StudentTableData } from './StudentTableData';

const StudentSchemaDiagram = lazy(() => import('./StudentSchemaDiagram'));

function TextSchema({ schema }: { schema: StudentDatabaseSchema }) {
  const tableNameById = new Map(
    (schema.tables ?? []).filter((table) => table.id).map((table) => [table.id as string, table.name || 'Таблица без названия']),
  );
  const columnById = new Map<string, { name: string; tableId: string }>();
  for (const table of schema.tables ?? []) {
    if (!table.id) continue;
    for (const column of table.columns ?? []) {
      if (column.id) columnById.set(column.id, { name: column.name || 'Колонка без названия', tableId: table.id });
    }
  }

  return <Stack gap="md">
    {(schema.tables ?? []).map((table, tableIndex) => <Stack gap="xs" key={table.id || `${table.name}-${tableIndex}`}>
      <Group gap="xs">
        <Text fw={700}>{table.name || 'Таблица без названия'}</Text>
        <Badge color="gray" variant="light">{table.columns?.length ?? 0} колонок</Badge>
      </Group>
      {table.description ? <Text c="dimmed" size="sm">{table.description}</Text> : null}
      {table.columns?.length ? <List spacing={4} size="sm">
        {table.columns.map((column, columnIndex) => <List.Item key={column.id || `${column.name}-${columnIndex}`}>
          <Text component="span" fw={600}>{column.name || 'Колонка без названия'}</Text>
          {' — '}{column.dataType || 'тип не указан'}
          {column.isPrimaryKey ? ' · PK' : ''}
          {column.isNullable === false ? ' · NOT NULL' : ' · NULL'}
        </List.Item>)}
      </List> : <Text c="dimmed" size="sm">Колонки не указаны.</Text>}
      {tableIndex < (schema.tables?.length ?? 0) - 1 ? <Divider /> : null}
    </Stack>)}
    {(schema.foreignKeys ?? []).length ? <>
      <Divider />
      <Title order={4} size="h5">Связи</Title>
      <List spacing="xs" size="sm">
        {(schema.foreignKeys ?? []).map((foreignKey, index) => {
          const pairs = schemaColumnPairs(foreignKey);
          return <List.Item key={foreignKey.id || index}>
            <Text component="span" fw={600}>{foreignKey.name || `Внешний ключ ${index + 1}`}</Text>
            <List mt={4} spacing={2}>
              {pairs.map((pair, pairIndex) => {
                const sourceColumn = pair.fromColumnId ? columnById.get(pair.fromColumnId) : undefined;
                const targetColumn = pair.toColumnId ? columnById.get(pair.toColumnId) : undefined;
                const sourceTableId = foreignKey.fromTableId || sourceColumn?.tableId || '';
                const targetTableId = foreignKey.toTableId || targetColumn?.tableId || '';
                return <List.Item key={`${pair.fromColumnId}-${pair.toColumnId}-${pairIndex}`}>
                  {tableNameById.get(sourceTableId) || 'Неизвестная таблица'}.{sourceColumn?.name || 'неизвестная колонка'}
                  {' → '}
                  {tableNameById.get(targetTableId) || 'Неизвестная таблица'}.{targetColumn?.name || 'неизвестная колонка'}
                </List.Item>;
              })}
            </List>
          </List.Item>;
        })}
      </List>
    </> : null}
  </Stack>;
}

export function StudentTaskSchema({ taskId }: { taskId: string }) {
  const query = useGetStudentTaskSchema(taskId, {
    query: { enabled: Boolean(taskId), retry: false, staleTime: 60_000 },
  });

  if (query.isPending) return <AppCard><Stack gap="md"><Skeleton height={24} width={240} /><Skeleton height={420} /></Stack></AppCard>;
  const response = query.data;
  const error = query.isError
    ? mapStudentApiError(undefined, query.error)
    : response && response.status !== 200
      ? mapStudentApiError(response.status, response.data)
      : !response ? mapStudentApiError() : null;
  if (error) {
    return <AppCard><Stack gap="md">
      <Title order={2} size="h4">Схема учебной базы</Title>
      <StudentErrorAlert error={error} onRetry={error.canRetry ? () => void query.refetch() : undefined} />
    </Stack></AppCard>;
  }
  if (!response || response.status !== 200) return null;

  const schema = response.data;
  if (!schema.tables?.length) return <AppCard><EmptyState title="Схема пока пуста" description="В учебной базе не опубликованы таблицы для этого задания." /></AppCard>;

  return <AppCard><Stack gap="md">
    <div>
      <Title order={2} size="h4">Схема учебной базы</Title>
      <Text c="dimmed" mt={4} size="sm">Таблицы, колонки и внешние ключи доступны только для просмотра.</Text>
    </div>
    <Group gap="xs">
      {schema.databaseName ? <Badge variant="light">{schema.databaseName}</Badge> : null}
      {schema.dbms ? <Badge color="gray" variant="outline">{schema.dbms}</Badge> : null}
      <Badge color="gray" variant="light">Таблиц: {schema.tables.length}</Badge>
    </Group>
    <Alert color="blue" title="Навигация по диаграмме">Используйте масштабирование и перемещение области просмотра. Структура всех таблиц также доступна текстом ниже.</Alert>
    <Suspense fallback={<Skeleton height={420} radius="sm" />}><StudentSchemaDiagram schema={schema} /></Suspense>
    <Accordion variant="contained">
      <Accordion.Item value="table-data">
        <Accordion.Control>Посмотреть данные таблиц</Accordion.Control>
        <Accordion.Panel><StudentTableData schema={schema} taskId={taskId} /></Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="text-schema">
        <Accordion.Control>Текстовая структура схемы</Accordion.Control>
        <Accordion.Panel><TextSchema schema={schema} /></Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  </Stack></AppCard>;
}
