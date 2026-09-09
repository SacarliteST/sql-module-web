import { Alert, Badge, Code, Group, ScrollArea, Stack, Table, Text, Title } from '@mantine/core';

const UI_ROW_LIMIT = 200;

export type StudentAttemptResultGridProps = {
  actualColumns?: string[] | null;
  actualRows?: ((string | null)[])[] | null;
  isResultTruncated?: boolean;
  resultRowLimit?: number | null;
  returnedRowCount?: number | null;
};

function ResultCell({ cell, exists }: { cell: string | null | undefined; exists: boolean }) {
  if (!exists) return <Text c="dimmed" fs="italic" size="sm">нет значения</Text>;
  if (cell === null) return <Code c="violet">NULL</Code>;
  if (cell === '') return <Text c="dimmed" fs="italic" size="sm">пустая строка</Text>;
  return <Text ff="monospace" size="sm" style={{ whiteSpace: 'pre-wrap' }}>{cell}</Text>;
}

export function StudentAttemptResultGrid({
  actualColumns,
  actualRows,
  isResultTruncated,
  resultRowLimit,
  returnedRowCount,
}: StudentAttemptResultGridProps) {
  const columns = actualColumns ?? [];
  const rows = actualRows ?? [];
  const visibleRows = rows.slice(0, UI_ROW_LIMIT);
  const hiddenByUi = rows.length - visibleRows.length;
  const hasExtraCells = rows.some((row) => row.length > columns.length);
  const savedRows = returnedRowCount ?? rows.length;

  return <Stack gap="md">
    <Group gap="xs">
      <Badge color="gray" variant="outline">Сохранено строк: {savedRows}</Badge>
      {resultRowLimit !== null && resultRowLimit !== undefined
        ? <Badge color="gray" variant="outline">Лимит результата: {resultRowLimit}</Badge>
        : null}
    </Group>

    {isResultTruncated ? (
      <Alert color="yellow" title="Результат усечён сервером">
        Сохранена только разрешённая часть результата{resultRowLimit ? ` — не более ${resultRowLimit} строк` : ''}.
      </Alert>
    ) : null}
    {hiddenByUi > 0 ? <Alert color="blue" title="Ограничение отображения">На экране показаны первые {UI_ROW_LIMIT} строк из {rows.length}. Полный сохранённый результат не запрашивается повторно.</Alert> : null}
    {hasExtraCells ? <Alert color="yellow" title="Часть ячеек скрыта">Некоторые строки содержат больше значений, чем объявлено колонок. Значения без колонки не отображаются.</Alert> : null}

    <Stack gap="xs">
      <Title order={3} size="h5">Фактический результат</Title>
      {!columns.length ? <Text c="dimmed" size="sm">Запрос не вернул табличных колонок.</Text> : !rows.length ? <Text c="dimmed" size="sm">Запрос выполнился, но не вернул строк.</Text> : (
        <ScrollArea h={420} type="auto">
          <Table highlightOnHover stickyHeader striped withColumnBorders withTableBorder miw={Math.max(520, columns.length * 180)}>
            <Table.Caption>Фактические строки и колонки выполненного SQL-запроса</Table.Caption>
            <Table.Thead><Table.Tr>{columns.map((column, columnIndex) => <Table.Th key={`${column}-${columnIndex}`}>{column || `Колонка ${columnIndex + 1}`}</Table.Th>)}</Table.Tr></Table.Thead>
            <Table.Tbody>{visibleRows.map((row, rowIndex) => <Table.Tr key={rowIndex}>
              {columns.map((_, columnIndex) => <Table.Td key={columnIndex}><ResultCell cell={row[columnIndex]} exists={columnIndex < row.length} /></Table.Td>)}
            </Table.Tr>)}</Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  </Stack>;
}
