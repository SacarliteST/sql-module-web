import { Alert, Group, Pagination, Select, Skeleton, Stack, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { StudentDatabaseSchema } from '../model/student-schema';
import { mapStudentApiError, StudentErrorAlert } from '../../student-errors';
import { getStudentTaskTableRows } from '../api/student-table-rows';

type RowsResponse = Awaited<ReturnType<typeof getStudentTaskTableRows>>;
export type TableRowsLoader = (tableId: string, offset: number, limit: number, signal?: AbortSignal) => Promise<RowsResponse>;

const PAGE_SIZE = 25;

type Props = {
  schema: StudentDatabaseSchema;
  taskId?: string;
  queryKey?: readonly unknown[];
  loadRows?: TableRowsLoader;
};

export function StudentTableData({ schema, taskId, queryKey, loadRows }: Props) {
  const [tableId, setTableId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const tableOptions = useMemo(
    () => (schema.tables ?? []).flatMap((table) => table.id
      ? [{ value: table.id, label: table.name || 'Таблица без названия' }]
      : []),
    [schema.tables],
  );

  useEffect(() => setPage(1), [tableId]);

  const query = useQuery({
    queryKey: [...(queryKey ?? ['student-task-table-rows', taskId]), tableId, page],
    queryFn: ({ signal }) => loadRows
      ? loadRows(tableId!, (page - 1) * PAGE_SIZE, PAGE_SIZE, signal)
      : getStudentTaskTableRows(taskId!, tableId!, (page - 1) * PAGE_SIZE, PAGE_SIZE, signal),
    enabled: Boolean((taskId || loadRows) && tableId),
    retry: false,
  });

  const response = query.data;
  const error = query.isError
    ? mapStudentApiError(undefined, query.error)
    : response && response.status !== 200
      ? mapStudentApiError(response.status, response.data)
      : null;
  const rows = response?.status === 200 ? response.data : null;
  const pageCount = rows ? Math.max(1, Math.ceil(rows.count / PAGE_SIZE)) : 1;

  return <Stack gap="md">
    <div>
      <Title order={3} size="h5">Данные таблиц</Title>
      <Text c="dimmed" size="sm">Выберите таблицу, чтобы посмотреть опубликованные учебные строки. Изменение данных недоступно.</Text>
    </div>
    <Select
      clearable
      data={tableOptions}
      label="Таблица"
      onChange={setTableId}
      placeholder="Выберите таблицу"
      searchable
      value={tableId}
    />
    {!tableId ? <Alert color="blue">Данные загружаются только после выбора таблицы.</Alert> : null}
    {query.isPending && tableId ? <Skeleton height={180} radius="sm" /> : null}
    {error ? <StudentErrorAlert error={error} onRetry={error.canRetry ? () => void query.refetch() : undefined} /> : null}
    {rows ? <>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">Строк: {rows.count}</Text>
        <Text c="dimmed" size="xs">Только чтение</Text>
      </Group>
      {rows.columns.length && rows.items.length ? <Table.ScrollContainer minWidth={Math.max(640, rows.columns.length * 180)}>
        <Table highlightOnHover striped withColumnBorders withTableBorder>
          <Table.Thead bg="gray.1"><Table.Tr>{rows.columns.map((column) => <Table.Th key={column.id}>
            {column.name}<Text c="dimmed" size="xs">{column.physicalTypeName}</Text>
          </Table.Th>)}</Table.Tr></Table.Thead>
          <Table.Tbody>{rows.items.map((row) => <Table.Tr key={row.id}>{rows.columns.map((column) => {
            const cell = row.cells[column.id];
            return <Table.Td key={column.id}>{cell?.isNull ? <Text c="dimmed" fs="italic">NULL</Text> : <Text ff="monospace" size="sm">{cell?.value ?? ''}</Text>}</Table.Td>;
          })}</Table.Tr>)}</Table.Tbody>
        </Table>
      </Table.ScrollContainer> : <Text c="dimmed" size="sm">В таблице пока нет строк.</Text>}
      {pageCount > 1 ? <Pagination total={pageCount} value={page} onChange={setPage} /> : null}
    </> : null}
  </Stack>;
}
