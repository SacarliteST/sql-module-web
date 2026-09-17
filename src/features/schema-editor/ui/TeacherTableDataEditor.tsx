import { Alert, Button, Checkbox, Group, Pagination, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { ProblemDetails, SchemaColumnResponse, TableCellRequest, TableRowChange, TableRowResponse } from '../../../api/sqlmodule/model';
import { TableRowOperation } from '../../../api/sqlmodule/model';
import { batchTargetDbTableRows, useGetTargetDbTableRows } from '../../../api/sqlmodule/schema-data/schema-data';
import { useGetTargetDbSchema } from '../../../api/sqlmodule/schema/schema';
import { AppCard, EmptyState } from '../../../shared/ui';
import { ForeignKeyCellInput, type ForeignKeyBinding, type LocalForeignKeyOption } from './ForeignKeyCellInput';

const PAGE_SIZE = 25;
type EditableRow = { id?: string; tempId?: string; version?: string; sortOrder: number; cells: Record<string, TableCellRequest>; isNew?: boolean };
function problemText(problem: ProblemDetails | null, fallback: string) { return problem?.violations?.map((item) => item.message).filter(Boolean).join(' ') || problem?.detail?.trim() || problem?.title?.trim() || fallback; }
function toEditable(row: TableRowResponse): EditableRow { return { id: row.id, version: row.version, sortOrder: row.sortOrder, cells: Object.fromEntries(Object.entries(row.cells).map(([key, cell]) => [key, { value: cell.value, isNull: cell.isNull }])) }; }
function isTextColumn(column: SchemaColumnResponse) { return /char|text|string/i.test(column.physicalTypeName); }

export function TeacherTableDataEditor({ targetDbId }: { targetDbId: string }) {
  const queryClient = useQueryClient();
  const schemaQuery = useGetTargetDbSchema(targetDbId, { query: { enabled: Boolean(targetDbId), retry: false } });
  const schemaResponse = schemaQuery.data;
  const schema = schemaResponse?.status === 200 ? schemaResponse.data : null;
  const [tableId, setTableId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const rowsQuery = useGetTargetDbTableRows(targetDbId, tableId ?? '', { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }, { query: { enabled: Boolean(targetDbId && tableId), retry: false } });
  const rowsResponse = rowsQuery.data;
  const pageData = rowsResponse?.status === 200 ? rowsResponse.data : null;
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [deleted, setDeleted] = useState<EditableRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => { if (!tableId && schema?.tables[0]?.id) setTableId(schema.tables[0].id); }, [schema, tableId]);
  useEffect(() => { if (pageData) { setRows(pageData.items.map(toEditable)); setDirtyIds(new Set()); setDeleted([]); } }, [pageData]);
  const columns = pageData?.columns ?? [];
  const pageCount = Math.max(1, Math.ceil((pageData?.count ?? 0) / PAGE_SIZE));
  const canEdit = Boolean(schema?.capabilities.canEditData);
  const hasChanges = rows.some((row) => row.isNew) || dirtyIds.size > 0 || deleted.length > 0;
  const tableOptions = useMemo(() => schema?.tables.map((table) => ({ value: table.id, label: table.name })) ?? [], [schema]);
  const foreignKeys = useMemo(() => {
    const bindings = new Map<string, ForeignKeyBinding>();
    if (!schema) return bindings;
    for (const relationship of schema.relationships) {
      const targetTable = schema.tables.find((table) => table.columns.some((column) => column.id === relationship.targetColumnId));
      const targetColumn = targetTable?.columns.find((column) => column.id === relationship.targetColumnId);
      if (!targetTable || !targetColumn) continue;
      const labelColumn = targetTable.columns.find((column) => column.id !== targetColumn.id && isTextColumn(column));
      bindings.set(relationship.sourceColumnId, {
        targetTableId: targetTable.id,
        targetTableName: targetTable.name,
        targetColumnId: targetColumn.id,
        targetColumnName: targetColumn.name,
        labelColumnId: labelColumn?.id,
      });
    }
    return bindings;
  }, [schema]);
  const markDirty = (row: EditableRow) => { if (!row.isNew && row.id) setDirtyIds((current) => new Set(current).add(row.id as string)); };
  const updateCell = (rowIndex: number, columnId: string, cell: TableCellRequest) => setRows((current) => current.map((row, index) => { if (index !== rowIndex) return row; markDirty(row); return { ...row, cells: { ...row.cells, [columnId]: cell } }; }));
  const addRow = () => setRows((current) => [...current, { tempId: `row-${crypto.randomUUID()}`, sortOrder: (page - 1) * PAGE_SIZE + current.length, isNew: true, cells: Object.fromEntries(columns.map((column) => [column.id, { value: null, isNull: !column.isRequired }])) }]);
  const removeRow = (rowIndex: number) => setRows((current) => { const row = current[rowIndex]; if (row.id) setDeleted((items) => [...items, row]); return current.filter((_, index) => index !== rowIndex); });
  const save = async () => {
    if (!pageData || !tableId) return;
    const creates: TableRowChange[] = rows.filter((row) => row.isNew).map((row) => ({ operation: TableRowOperation.Create, tempId: row.tempId, sortOrder: row.sortOrder, cells: row.cells }));
    const updates: TableRowChange[] = rows.filter((row) => row.id && dirtyIds.has(row.id)).map((row) => ({ operation: TableRowOperation.Update, id: row.id, version: row.version, sortOrder: row.sortOrder, cells: row.cells }));
    const deletes: TableRowChange[] = deleted.map((row) => ({ operation: TableRowOperation.Delete, id: row.id, version: row.version }));
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await batchTargetDbTableRows(targetDbId, tableId, { schemaVersion: pageData.schemaVersion, changes: [...creates, ...updates, ...deletes] }, { 'Idempotency-Key': crypto.randomUUID() });
      if (result.status !== 200) { setError(result.status === 412 ? 'Схема или строки изменились. Перезагрузите страницу таблицы.' : problemText(result.data, 'Не удалось сохранить строки.')); return; }
      setSuccess('Изменения строк сохранены атомарно.'); setDirtyIds(new Set()); setDeleted([]); await rowsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['foreign-key-lookup', targetDbId, tableId] });
    } finally { setSaving(false); }
  };
  const discard = () => { if (pageData) setRows(pageData.items.map(toEditable)); setDirtyIds(new Set()); setDeleted([]); setError(''); setSuccess(''); };

  if (schemaQuery.isPending) return <AppCard><Text c="dimmed">Загрузка схемы...</Text></AppCard>;
  if (!schema) return <Alert color="red">Не удалось загрузить схему базы.</Alert>;
  return <Stack gap="md">
    {!canEdit && schema.capabilities.dataEditBlockReason ? <Alert color="yellow">{schema.capabilities.dataEditBlockReason}</Alert> : null}
    <AppCard><Group justify="space-between" align="flex-end"><Select searchable label="Таблица" placeholder="Выберите таблицу" data={tableOptions} value={tableId} onChange={(value) => { if (hasChanges && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) return; setTableId(value); setPage(1); setError(''); setSuccess(''); }} miw={280} /><Group><Button variant="light" disabled={!canEdit || !tableId || !columns.length} onClick={addRow}>Добавить строку</Button><Button variant="default" disabled={!hasChanges || saving} onClick={discard}>Отменить</Button><Button disabled={!canEdit || !hasChanges} loading={saving} onClick={() => void save()}>Сохранить пакет</Button></Group></Group></AppCard>
    {error ? <Alert color="red">{error}</Alert> : null}{success ? <Alert color="green">{success}</Alert> : null}
    {!tableId ? <AppCard><EmptyState title="Нет таблиц" description="Сначала создайте и примените схему базы." /></AppCard> : rowsQuery.isPending ? <AppCard><Text c="dimmed">Загрузка строк...</Text></AppCard> : !pageData ? <Alert color="red">Не удалось загрузить данные таблицы.</Alert> : <AppCard><Stack><Group justify="space-between"><Title order={4}>Строки таблицы</Title><Text size="sm" c="dimmed">Всего: {pageData.count}</Text></Group><Table.ScrollContainer minWidth={Math.max(700, columns.length * 220)}><Table withTableBorder withColumnBorders highlightOnHover><Table.Thead><Table.Tr>{columns.map((column) => <Table.Th key={column.id}>{column.name}<Text size="xs" c="dimmed">{column.physicalTypeName}{column.isRequired ? ' · NOT NULL' : ''}</Text></Table.Th>)}<Table.Th w={100} /></Table.Tr></Table.Thead><Table.Tbody>{rows.map((row, rowIndex) => <Table.Tr key={row.id ?? row.tempId}>{columns.map((column) => {
      const cell = row.cells[column.id] ?? { value: null, isNull: true };
      const foreignKey = foreignKeys.get(column.id);
      let localOptions: LocalForeignKeyOption[] = [];
      if (foreignKey?.targetTableId === tableId) {
        localOptions = rows.filter((candidate) => candidate.isNew && candidate.tempId !== row.tempId)
          .flatMap((candidate) => {
            const targetCell = candidate.cells[foreignKey.targetColumnId];
            if (!targetCell || targetCell.isNull || !targetCell.value) return [];
            const labelCell = foreignKey.labelColumnId ? candidate.cells[foreignKey.labelColumnId] : null;
            return [{
              key: candidate.tempId as string,
              value: targetCell.value,
              label: labelCell?.value ? `${targetCell.value} — ${labelCell.value}` : targetCell.value,
            }];
          });
      }
      return <Table.Td key={column.id}><Stack gap={4}>{foreignKey
        ? <ForeignKeyCellInput targetDbId={targetDbId} binding={foreignKey} value={cell.value} disabled={!canEdit || Boolean(cell.isNull)} excludedRowId={foreignKey.targetTableId === tableId ? row.id : undefined} localOptions={localOptions} onChange={(selected) => updateCell(rowIndex, column.id, { value: selected, isNull: false })} />
        : <TextInput disabled={!canEdit || Boolean(cell.isNull)} value={cell.value ?? ''} placeholder={cell.isNull ? 'NULL' : ''} onChange={(event) => updateCell(rowIndex, column.id, { value: event.currentTarget.value, isNull: false })} />}
        <Checkbox size="xs" disabled={!canEdit || column.isRequired} checked={Boolean(cell.isNull)} label="NULL" onChange={(event) => updateCell(rowIndex, column.id, { value: event.currentTarget.checked ? null : '', isNull: event.currentTarget.checked })} /></Stack></Table.Td>;
    })}<Table.Td><Button size="xs" color="red" variant="subtle" disabled={!canEdit} onClick={() => removeRow(rowIndex)}>Удалить</Button></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>{!rows.length ? <EmptyState title="Строк нет" description="Добавьте первую учебную строку." /> : null}{pageCount > 1 ? <Pagination value={page} total={pageCount} onChange={(value) => { if (hasChanges && !confirm('Несохранённые изменения будут потеряны. Продолжить?')) return; setPage(value); }} /> : null}</Stack></AppCard>}
  </Stack>;
}
