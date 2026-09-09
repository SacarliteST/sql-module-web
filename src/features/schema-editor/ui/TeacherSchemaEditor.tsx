import { Alert, Badge, Button, Divider, Group, SegmentedControl, Select, Skeleton, Stack, Switch, Text, TextInput, Textarea, Title } from '@mantine/core';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useGetAllParameterDefinitions, useGetAllPhysicalTypes } from '../../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type { ProblemDetails, SchemaChangeResponse, SchemaColumnDraft, SchemaTableDraft, SchemaUpsertRequest, TargetDbSchemaResponse } from '../../../api/sqlmodule/model';
import { applyTargetDbSchema, useGetTargetDbSchema, useValidateTargetDbSchema } from '../../../api/sqlmodule/schema/schema';
import { AppCard, EmptyState } from '../../../shared/ui';

const relationRules = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL'] as const;
const SchemaDiagram = lazy(() => import('../../schema-diagram/ui/SchemaDiagram'));
type ValidationStatus = 'not-validated' | 'stale' | 'valid' | 'invalid';
type SchemaIssue = { path: string; code?: string | null; message: string; severity?: string; affectedRows?: number | null };

function newKey(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function refOf(item: { id?: string | null; tempId?: string | null }) { return item.id ?? item.tempId ?? ''; }
function reorder<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
function problemText(problem: ProblemDetails | null, fallback: string) {
  const violation = problem?.violations?.map((item) => item.message).filter(Boolean).join(' ');
  return violation || problem?.detail?.trim() || problem?.title?.trim() || fallback;
}
function snapshotToDraft(snapshot: TargetDbSchemaResponse): SchemaUpsertRequest {
  return {
    version: snapshot.version,
    tables: snapshot.tables.map((table) => ({ id: table.id, name: table.name, description: table.description, sortOrder: table.sortOrder, columns: table.columns.map((column) => ({ id: column.id, name: column.name, physicalTypeId: column.physicalTypeId, isPrimaryKey: column.isPrimaryKey, isRequired: column.isRequired, sortOrder: column.sortOrder, parameters: column.parameters.map((parameter) => ({ parameterDefinitionId: parameter.parameterDefinitionId, value: parameter.value })) })) })),
    relationships: snapshot.relationships.map((relation) => ({ id: relation.id, name: relation.name, sourceColumnRef: relation.sourceColumnId, targetColumnRef: relation.targetColumnId, deleteRule: relation.deleteRule, updateRule: relation.updateRule })),
  };
}

export function TeacherSchemaEditor({ targetDbId }: { targetDbId: string }) {
  const schemaQuery = useGetTargetDbSchema(targetDbId, { query: { enabled: Boolean(targetDbId), retry: false } });
  const response = schemaQuery.data;
  const snapshot = response?.status === 200 ? response.data : null;
  const physicalTypesQuery = useGetAllPhysicalTypes({ DbmsId: snapshot?.dbmsId, Limit: 100 }, { query: { enabled: Boolean(snapshot?.dbmsId) } });
  const definitionsQuery = useGetAllParameterDefinitions({ Limit: 100 });
  const physicalResponse = physicalTypesQuery.data;
  const definitionsResponse = definitionsQuery.data;
  const physicalTypes = physicalResponse?.status === 200 ? physicalResponse.data.items ?? [] : [];
  const definitions = definitionsResponse?.status === 200 ? definitionsResponse.data.items ?? [] : [];
  const [draft, setDraft] = useState<SchemaUpsertRequest | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [applying, setApplying] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('not-validated');
  const [validatedChanges, setValidatedChanges] = useState<SchemaChangeResponse[]>([]);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [draggedTableIndex, setDraggedTableIndex] = useState<number | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<{ tableIndex: number; columnIndex: number } | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'diagram'>('editor');
  const validateMutation = useValidateTargetDbSchema();

  useEffect(() => { if (snapshot && !dirty) setDraft(snapshotToDraft(snapshot)); }, [snapshot, dirty]);
  const tables = draft?.tables ?? [];
  const relationships = draft?.relationships ?? [];
  const editable = Boolean(snapshot?.capabilities.canEditSchema);
  const allColumns = useMemo(() => tables.flatMap((table) => (table.columns ?? []).map((column) => ({ value: refOf(column), label: `${table.name || 'Таблица'}.${column.name || 'Колонка'}` }))).filter((item) => item.value), [tables]);
  const change = (next: SchemaUpsertRequest) => { setDraft(next); setDirty(true); setValidationStatus('stale'); setValidatedChanges([]); setIssues([]); setSuccess(''); setError(''); };
  const issuesFor = (reference: string) => reference ? issues.filter((issue) => issue.path.includes(`[${reference}]`) || issue.path.includes(reference)) : [];
  const moveTable = (targetIndex: number) => {
    if (draggedTableIndex === null || draggedTableIndex === targetIndex) return;
    change({ ...draft, tables: reorder(tables, draggedTableIndex, targetIndex).map((table, index) => ({ ...table, sortOrder: index })), relationships });
    setDraggedTableIndex(null);
  };
  const moveColumn = (tableIndex: number, targetIndex: number) => {
    if (!draggedColumn || draggedColumn.tableIndex !== tableIndex || draggedColumn.columnIndex === targetIndex) return;
    const columns = reorder(tables[tableIndex].columns ?? [], draggedColumn.columnIndex, targetIndex).map((column, index) => ({ ...column, sortOrder: index }));
    replaceTable(tableIndex, { ...tables[tableIndex], columns });
    setDraggedColumn(null);
  };
  const replaceTable = (tableIndex: number, table: SchemaTableDraft) => change({ ...draft, tables: tables.map((item, index) => index === tableIndex ? table : item), relationships });
  const addTable = () => change({ ...draft, tables: [...tables, { tempId: newKey('table'), name: '', description: null, sortOrder: tables.length, columns: [] }], relationships });
  const removeTable = (index: number) => {
    const refs = new Set((tables[index].columns ?? []).map(refOf));
    change({ ...draft, tables: tables.filter((_, itemIndex) => itemIndex !== index).map((table, itemIndex) => ({ ...table, sortOrder: itemIndex })), relationships: relationships.filter((item) => !refs.has(item.sourceColumnRef ?? '') && !refs.has(item.targetColumnRef ?? '')) });
  };
  const addColumn = (tableIndex: number) => replaceTable(tableIndex, { ...tables[tableIndex], columns: [...(tables[tableIndex].columns ?? []), { tempId: newKey('column'), name: '', physicalTypeId: null, isPrimaryKey: false, isRequired: false, sortOrder: tables[tableIndex].columns?.length ?? 0, parameters: [] }] });
  const replaceColumn = (tableIndex: number, columnIndex: number, column: SchemaColumnDraft) => replaceTable(tableIndex, { ...tables[tableIndex], columns: (tables[tableIndex].columns ?? []).map((item, index) => index === columnIndex ? column : item) });
  const removeColumn = (tableIndex: number, columnIndex: number) => {
    const column = tables[tableIndex].columns?.[columnIndex];
    const reference = column ? refOf(column) : '';
    replaceTable(tableIndex, { ...tables[tableIndex], columns: (tables[tableIndex].columns ?? []).filter((_, index) => index !== columnIndex).map((item, index) => ({ ...item, sortOrder: index })) });
    setDraft((current) => current ? { ...current, relationships: (current.relationships ?? []).filter((item) => item.sourceColumnRef !== reference && item.targetColumnRef !== reference) } : current);
  };
  const setColumnType = (tableIndex: number, columnIndex: number, column: SchemaColumnDraft, physicalTypeId: string | null) => {
    const parameters = definitions.filter((item) => item.physicalTypeId === physicalTypeId && item.id).map((item) => ({ parameterDefinitionId: item.id, value: item.defaultValue ?? null }));
    replaceColumn(tableIndex, columnIndex, { ...column, physicalTypeId, parameters });
  };
  const validate = async () => {
    if (!draft) return;
    setError(''); setSuccess(''); setIssues([]); setValidatedChanges([]);
    const result = await validateMutation.mutateAsync({ id: targetDbId, data: draft });
    if (result.status !== 200) {
      setValidationStatus('invalid');
      setIssues((result.data.violations ?? []).map((item) => ({ path: item.path ?? '', code: item.code, message: item.message ?? 'Ошибка схемы', severity: item.severity, affectedRows: item.affectedRows })));
      setError(problemText(result.data, 'Схема не прошла проверку.'));
      return;
    }
    const destructive = result.data.destructiveChanges ?? [];
    setValidatedChanges(result.data.changes ?? []);
    setIssues(destructive.map((item) => ({ path: item.path, code: item.code, message: item.description, severity: item.severity, affectedRows: item.affectedRows })));
    if (!result.data.isValid || destructive.length > 0) {
      setValidationStatus('invalid');
      setError('Схему нельзя применить: backend обнаружил запрещённые изменения.');
      return;
    }
    setValidationStatus('valid');
    setSuccess(result.data.warnings.length ? `Схема валидна. Предупреждения: ${result.data.warnings.join(' ')}` : 'Схема прошла проверку и готова к применению.');
  };
  const apply = async () => {
    if (!draft || !snapshot) return;
    setApplying(true); setError(''); setSuccess('');
    try {
      const result = await applyTargetDbSchema(targetDbId, draft, { 'If-Match': `"${snapshot.version}"`, 'Idempotency-Key': crypto.randomUUID() });
      if (result.status !== 200) {
        setError(result.status === 412 ? 'Схема была изменена в другом окне. Перезагрузите данные и повторите изменения.' : problemText(result.data, 'Не удалось применить схему.'));
        return;
      }
      setDraft(snapshotToDraft(result.data)); setDirty(false); setValidationStatus('not-validated'); setValidatedChanges([]); setIssues([]); setSuccess('Схема сохранена и применена.'); await schemaQuery.refetch();
    } finally { setApplying(false); }
  };

  if (schemaQuery.isPending) return <AppCard><Text c="dimmed">Загрузка снимка схемы...</Text></AppCard>;
  if (!snapshot || schemaQuery.isError) return <Alert color="red">Не удалось загрузить согласованный снимок схемы.</Alert>;
  if (!draft) return null;

  return <Stack gap="md">
    <AppCard><Group justify="space-between"><div><Title order={3}>{snapshot.dbName}</Title><Text size="sm" c="dimmed">Состояние: {snapshot.state}; версия: {snapshot.version}</Text></div><Group><Badge color={editable ? 'green' : 'gray'}>{editable ? 'Редактирование разрешено' : 'Только чтение'}</Badge>{dirty ? <Badge color="orange">Есть изменения</Badge> : null}</Group></Group>{!editable && snapshot.capabilities.schemaEditBlockReason ? <Alert mt="md" color="yellow">{snapshot.capabilities.schemaEditBlockReason}</Alert> : null}</AppCard>
    {physicalTypesQuery.isError || (physicalResponse && physicalResponse.status !== 200) ? <Alert color="red">Не удалось загрузить типы выбранной СУБД. Выбор типа колонок недоступен.</Alert> : null}
    {error ? <Alert color="red">{error}</Alert> : null}{success ? <Alert color="green">{success}</Alert> : null}
    {validationStatus === 'stale' ? <Alert color="yellow">Схема изменена после последней проверки. Проверьте её повторно перед сохранением.</Alert> : null}
    {(validatedChanges.length > 0 || issues.length > 0) ? <AppCard><Stack gap="sm"><Title order={4}>Результат анализа изменений</Title>{validatedChanges.length > 0 ? <Stack gap={4}><Text fw={600} size="sm" c="green">Разрешённые изменения</Text>{validatedChanges.map((item, index) => <Group key={`${item.path}-${index}`} gap="xs" wrap="nowrap"><Badge color="green" variant="light">{item.kind} {item.entityType}</Badge><Text size="sm">{item.description}{item.affectedRows !== null && item.affectedRows !== undefined ? ` Затронуто строк: ${item.affectedRows}.` : ''}</Text></Group>)}</Stack> : null}{issues.length > 0 ? <Stack gap={4}><Text fw={600} size="sm" c="red">Запрещённые изменения</Text>{issues.map((item, index) => <Group key={`${item.path}-${index}`} gap="xs" align="flex-start" wrap="nowrap"><Badge color="red" variant="light">{item.code || item.severity || 'Ошибка'}</Badge><div><Text size="sm">{item.message}{item.affectedRows !== null && item.affectedRows !== undefined ? ` Затронуто строк: ${item.affectedRows}.` : ''}</Text><Text size="xs" c="dimmed">{item.path}</Text></div></Group>)}</Stack> : null}</Stack></AppCard> : null}
    <SegmentedControl
      aria-label="Режим просмотра схемы"
      data={[{ label: 'Редактор', value: 'editor' }, { label: 'ER-диаграмма', value: 'diagram' }]}
      onChange={(value) => setViewMode(value as 'editor' | 'diagram')}
      value={viewMode}
    />
    {viewMode === 'diagram' ? <Suspense fallback={<Skeleton height={560} radius="md" />}><SchemaDiagram draft={draft} physicalTypes={physicalTypes} /></Suspense> : <>
    {tables.length ? tables.map((table, tableIndex) => { const tableIssues = issuesFor(refOf(table)); return <div key={refOf(table)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveTable(tableIndex)} style={tableIssues.length ? { outline: '2px solid var(--mantine-color-red-6)', borderRadius: 8 } : undefined}><AppCard><Stack gap="md">
      <Group align="flex-end"><div draggable={editable} onDragStart={() => setDraggedTableIndex(tableIndex)} onDragEnd={() => setDraggedTableIndex(null)} style={{ cursor: editable ? 'grab' : 'default', padding: '8px 4px', userSelect: 'none' }} title="Перетащите таблицу">⋮⋮</div><TextInput disabled={!editable} label="Название таблицы" required value={table.name ?? ''} onChange={(event) => replaceTable(tableIndex, { ...table, name: event.currentTarget.value })} style={{ flex: 1 }} /><Button disabled={!editable} color="red" variant="subtle" onClick={() => removeTable(tableIndex)}>Удалить таблицу</Button></Group>
      <Textarea disabled={!editable} label="Описание" value={table.description ?? ''} onChange={(event) => replaceTable(tableIndex, { ...table, description: event.currentTarget.value || null })} />
      {tableIssues.filter((issue) => !issue.path.includes('.columns[')).map((issue, index) => <Alert key={`${issue.path}-${index}`} color="red" py="xs">{issue.message}{issue.affectedRows !== null && issue.affectedRows !== undefined ? ` Затронуто строк: ${issue.affectedRows}.` : ''}</Alert>)}
      <Divider label="Колонки" />
      {(table.columns ?? []).map((column, columnIndex) => { const columnIssues = issuesFor(refOf(column)); return <div key={refOf(column)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveColumn(tableIndex, columnIndex)}><Stack gap="xs" p="sm" style={{ border: `1px solid var(--mantine-color-${columnIssues.length ? 'red-6' : 'gray-3'})`, borderRadius: 6 }}>
        <Group align="flex-end"><div draggable={editable} onDragStart={(event) => { event.stopPropagation(); setDraggedColumn({ tableIndex, columnIndex }); }} onDragEnd={() => setDraggedColumn(null)} style={{ cursor: editable ? 'grab' : 'default', padding: '8px 4px', userSelect: 'none' }} title="Перетащите колонку">⋮⋮</div><TextInput disabled={!editable} label="Название" required value={column.name ?? ''} onChange={(event) => replaceColumn(tableIndex, columnIndex, { ...column, name: event.currentTarget.value })} style={{ flex: 1 }} /><Select disabled={!editable || physicalTypesQuery.isPending} searchable label="Тип выбранной СУБД" description="Только типы, доступные для этой учебной базы" required value={column.physicalTypeId ?? null} data={physicalTypes.filter((item) => item.id && item.dbmsId === snapshot.dbmsId).map((item) => ({ value: item.id as string, label: item.typeName || 'Тип' }))} onChange={(value) => setColumnType(tableIndex, columnIndex, column, value)} style={{ flex: 1 }} /><Button disabled={!editable} color="red" variant="subtle" onClick={() => removeColumn(tableIndex, columnIndex)}>Удалить</Button></Group>
        <Group><Switch disabled={!editable} checked={column.isPrimaryKey ?? false} label="Первичный ключ" onChange={(event) => replaceColumn(tableIndex, columnIndex, { ...column, isPrimaryKey: event.currentTarget.checked, isRequired: event.currentTarget.checked || column.isRequired })} /><Switch disabled={!editable} checked={column.isRequired ?? false} label="NOT NULL" onChange={(event) => replaceColumn(tableIndex, columnIndex, { ...column, isRequired: event.currentTarget.checked })} /></Group>
        {(column.parameters ?? []).map((parameter, parameterIndex) => { const definition = definitions.find((item) => item.id === parameter.parameterDefinitionId); return <TextInput key={parameter.parameterDefinitionId ?? parameterIndex} disabled={!editable} required={definition?.isRequired} label={definition?.displayName || definition?.parameterKey || 'Параметр типа'} value={parameter.value ?? ''} onChange={(event) => replaceColumn(tableIndex, columnIndex, { ...column, parameters: (column.parameters ?? []).map((item, index) => index === parameterIndex ? { ...item, value: event.currentTarget.value || null } : item) })} />; })}
        {columnIssues.map((issue, index) => <Alert key={`${issue.path}-${index}`} color="red" py="xs">{issue.message}{issue.affectedRows !== null && issue.affectedRows !== undefined ? ` Затронуто строк: ${issue.affectedRows}.` : ''}</Alert>)}
      </Stack></div>; })}
      <Button disabled={!editable} variant="light" onClick={() => addColumn(tableIndex)}>Добавить колонку</Button>
    </Stack></AppCard></div>; }) : <AppCard><EmptyState title="Схема пуста" description="Добавьте первую таблицу." /></AppCard>}
    <Button disabled={!editable} variant="outline" onClick={addTable}>Добавить таблицу</Button>
    <AppCard><Stack gap="md"><Group justify="space-between"><Title order={4}>Связи</Title><Button disabled={!editable || allColumns.length < 2} size="xs" variant="light" onClick={() => change({ ...draft, tables, relationships: [...relationships, { tempId: newKey('relationship'), name: '', sourceColumnRef: null, targetColumnRef: null, deleteRule: 'RESTRICT', updateRule: 'NO ACTION' }] })}>Добавить связь</Button></Group>
      {relationships.length ? relationships.map((relation, index) => { const relationIssues = issuesFor(refOf(relation)); return <Stack key={refOf(relation)} gap="xs" p={relationIssues.length ? 'xs' : 0} style={relationIssues.length ? { border: '1px solid var(--mantine-color-red-6)', borderRadius: 6 } : undefined}><Group align="flex-end"><TextInput disabled={!editable} label="Название FK" value={relation.name ?? ''} onChange={(event) => change({ ...draft, tables, relationships: relationships.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.currentTarget.value } : item) })} /><Select disabled={!editable} searchable label="Из колонки" data={allColumns} value={relation.sourceColumnRef ?? null} onChange={(value) => change({ ...draft, tables, relationships: relationships.map((item, itemIndex) => itemIndex === index ? { ...item, sourceColumnRef: value } : item) })} /><Select disabled={!editable} searchable label="В колонку" data={allColumns} value={relation.targetColumnRef ?? null} onChange={(value) => change({ ...draft, tables, relationships: relationships.map((item, itemIndex) => itemIndex === index ? { ...item, targetColumnRef: value } : item) })} /><Select disabled={!editable} label="ON DELETE" data={[...relationRules]} value={relation.deleteRule ?? null} onChange={(value) => change({ ...draft, tables, relationships: relationships.map((item, itemIndex) => itemIndex === index ? { ...item, deleteRule: value } : item) })} /><Select disabled={!editable} label="ON UPDATE" data={[...relationRules]} value={relation.updateRule ?? null} onChange={(value) => change({ ...draft, tables, relationships: relationships.map((item, itemIndex) => itemIndex === index ? { ...item, updateRule: value } : item) })} /><Button disabled={!editable} color="red" variant="subtle" onClick={() => change({ ...draft, tables, relationships: relationships.filter((_, itemIndex) => itemIndex !== index) })}>Удалить</Button></Group>{relationIssues.map((issue, issueIndex) => <Alert key={`${issue.path}-${issueIndex}`} color="red" py="xs">{issue.message}{issue.affectedRows !== null && issue.affectedRows !== undefined ? ` Затронуто строк: ${issue.affectedRows}.` : ''}</Alert>)}</Stack>; }) : <Text size="sm" c="dimmed">Связи не созданы.</Text>}
    </Stack></AppCard>
    <Group justify="flex-end"><Button variant="default" disabled={!dirty || applying} onClick={() => { setDraft(snapshotToDraft(snapshot)); setDirty(false); setValidationStatus('not-validated'); setValidatedChanges([]); setIssues([]); setError(''); setSuccess(''); }}>Отменить изменения</Button><Button variant="light" disabled={!snapshot.capabilities.canValidateSchema || !draft} loading={validateMutation.isPending} onClick={() => void validate()}>Проверить схему</Button><Button disabled={!snapshot.capabilities.canApplySchema || !dirty || validationStatus !== 'valid'} title={validationStatus !== 'valid' ? 'Перед сохранением схема должна успешно пройти проверку' : undefined} loading={applying} onClick={() => void apply()}>Сохранить и применить</Button></Group>
    </>}
  </Stack>;
}
