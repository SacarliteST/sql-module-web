import { Accordion, Alert, Badge, Group, Skeleton, Stack, Text } from '@mantine/core';
import { getTargetDbTableRows } from '../../../api/sqlmodule/schema-data/schema-data';
import type { StudentTaskSchemaResponse } from '../../../api/sqlmodule/model';
import { useGetTargetDbSchema } from '../../../api/sqlmodule/schema/schema';
import { StudentTableData } from '../../student-schema/ui/StudentTableData';

export function TargetDbSchemaPreview({ targetDbId }: { targetDbId: string }) {
  const schemaQuery = useGetTargetDbSchema(targetDbId, {
    query: { enabled: Boolean(targetDbId), retry: false, staleTime: 60_000 },
  });
  const response = schemaQuery.data;
  const schema = response?.status === 200 ? response.data : null;
  if (schemaQuery.isPending) return <Skeleton height={220} radius="sm" />;
  if (!schema) return <Alert color="red">Не удалось загрузить схему учебной базы.</Alert>;
  if (!schema.tables.length) return <Alert color="blue">В учебной базе пока нет таблиц.</Alert>;
  const readonlySchema: StudentTaskSchemaResponse = {
    databaseName: schema.dbName,
    tables: schema.tables.map((table) => ({
      id: table.id,
      name: table.name,
      description: table.description,
      columns: table.columns.map((column) => ({
        id: column.id,
        name: column.name,
        dataType: column.physicalTypeName,
        isPrimaryKey: column.isPrimaryKey,
        isNullable: !column.isRequired,
      })),
    })),
  };

  return <Stack gap="md">
    <Group gap="xs">
      <Badge variant="light">{schema.dbName}</Badge>
      <Badge color="gray" variant="light">Таблиц: {schema.tables.length}</Badge>
      <Badge color="green" variant="light">Только чтение</Badge>
    </Group>
    <Accordion variant="contained">
      {schema.tables.map((item) => <Accordion.Item key={item.id} value={item.id}>
        <Accordion.Control>{item.name} · {item.columns.length} колонок</Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            {item.description ? <Text c="dimmed" size="sm">{item.description}</Text> : null}
            {item.columns.map((column) => <Text key={column.id} size="sm">
              <Text component="span" fw={600}>{column.name}</Text> — {column.physicalTypeName}
              {column.isPrimaryKey ? ' · PK' : ''}{column.isRequired ? ' · NOT NULL' : ' · NULL'}
            </Text>)}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>)}
    </Accordion>
    <StudentTableData
      schema={readonlySchema}
      queryKey={['teacher-target-db-table-rows', targetDbId]}
      loadRows={(tableId, offset, limit, signal) => getTargetDbTableRows(targetDbId, tableId, { offset, limit }, { signal })}
    />
  </Stack>;
}
