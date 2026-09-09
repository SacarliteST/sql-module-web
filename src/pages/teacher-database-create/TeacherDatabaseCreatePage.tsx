import { Alert, Button, Group, SegmentedControl, Select, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAllDbmsDictionaries } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type { HttpValidationProblemDetails, ProblemDetails } from '../../api/sqlmodule/model';
import { createTargetDbFromDdl, useCreateTargetDb, useValidateTargetDbDdl } from '../../api/sqlmodule/schema/schema';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { AppCard, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

function problemMessage(problem: ProblemDetails | HttpValidationProblemDetails | null, fallback: string) {
  const violations = problem?.violations?.map((item) => item.message).filter(Boolean);
  if (violations?.length) return violations.join(' ');
  if (problem && 'errors' in problem && problem.errors) {
    const messages = Object.values(problem.errors).flat();
    if (messages.length > 0) return messages.join(' ');
  }
  return problem?.detail?.trim() || problem?.title?.trim() || fallback;
}

export function TeacherDatabaseCreatePage() {
  const navigate = useNavigate();
  const dbmsQuery = useGetAllDbmsDictionaries({ Limit: 100 });
  const createMutation = useCreateTargetDb();
  const validateDdlMutation = useValidateTargetDbDdl();
  const [dbmsId, setDbmsId] = useState('');
  const [dbName, setDbName] = useState('');
  const [description, setDescription] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [creationMode, setCreationMode] = useState<'visual' | 'ddl'>('visual');
  const [ddlScript, setDdlScript] = useState('');
  const [ddlValidation, setDdlValidation] = useState('');
  const [creatingFromDdl, setCreatingFromDdl] = useState(false);
  const [error, setError] = useState('');
  const response = dbmsQuery.data;
  const dbmsItems = response?.status === 200 ? response.data.items ?? [] : [];
  const dbmsOptions = dbmsItems
    .filter((item) => item.id && item.isActive !== false && item.isAvailable !== false)
    .map((item) => ({ value: item.id as string, label: item.dbmsName?.trim() || item.dbmsSystemName?.trim() || 'Без названия' }));

  const handleCreate = async () => {
    if (!dbmsId || !dbName.trim()) {
      setError('Выберите СУБД и укажите название базы.');
      return;
    }
    if (creationMode === 'ddl') {
      if (!ddlScript.trim()) { setError('Введите DDL-скрипт создания схемы.'); return; }
      setCreatingFromDdl(true);
      try {
        const result = await createTargetDbFromDdl({ dbmsId, dbName: dbName.trim(), description: description.trim() || null, isReadOnly, ddlScript: ddlScript.trim() }, { 'Idempotency-Key': crypto.randomUUID() });
        if (result.status !== 201) { setError(problemMessage(result.data, 'Не удалось создать учебную базу из DDL.')); return; }
        const targetDbId = result.data.targetDbId ?? result.data.schema?.targetDbId;
        navigate(targetDbId ? `/teacher/databases/${targetDbId}/schema` : '/teacher/databases');
      } finally { setCreatingFromDdl(false); }
      return;
    }
    setError('');
    const result = await createMutation.mutateAsync({ data: { dbmsId, dbName: dbName.trim(), description: description.trim() || null, isReadOnly } });
    if (result.status !== 201) {
      setError(problemMessage(result.data, 'Не удалось создать учебную базу.'));
      return;
    }
    if (result.data.id) navigate(`/teacher/databases/${result.data.id}/schema`);
    else navigate('/teacher/databases');
  };

  const handleValidateDdl = async () => {
    if (!dbmsId || !dbName.trim() || !ddlScript.trim()) { setError('Выберите СУБД, укажите название базы и введите DDL-скрипт.'); return; }
    setError(''); setDdlValidation('');
    const result = await validateDdlMutation.mutateAsync({ data: { dbmsId, dbName: dbName.trim(), ddlScript: ddlScript.trim() } });
    if (result.status !== 200) { setError(problemMessage(result.data, 'DDL-скрипт не прошёл проверку.')); return; }
    const warnings = result.data.warnings?.length ? ` Предупреждения: ${result.data.warnings.join(' ')}` : '';
    setDdlValidation(`DDL корректен. Таблиц: ${result.data.detectedTables ?? 0}, связей: ${result.data.detectedRelationships ?? 0}.${warnings}`);
  };

  return (
    <Page>
      <Stack gap="lg">
        <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель', to: '/teacher' }, { label: 'Учебные базы', to: '/teacher/databases' }, { label: 'Создание' }]} />
        <PageHeader title="Создание учебной базы" description="Создайте изолированную базу-песочницу для схемы, данных и SQL-заданий." />
        <TeacherContourTabs />
        <AppCard maw={720}>
          <Stack gap="md">
            {error ? <Alert color="red">{error}</Alert> : null}
            {dbmsQuery.isError || (response && response.status !== 200) ? <Alert color="red">Не удалось загрузить каталог СУБД.</Alert> : null}
            <Select label="СУБД" withAsterisk searchable data={dbmsOptions} value={dbmsId} disabled={createMutation.isPending || creatingFromDdl} onChange={(value) => { setDbmsId(value ?? ''); setDdlValidation(''); }} />
            <TextInput label="Название базы" withAsterisk value={dbName} maxLength={200} disabled={createMutation.isPending || creatingFromDdl} onChange={(event) => { setDbName(event.currentTarget.value); setDdlValidation(''); }} />
            <Textarea label="Описание" value={description} minRows={3} autosize disabled={createMutation.isPending} onChange={(event) => setDescription(event.currentTarget.value)} />
            <div><Text fw={500} size="sm" mb={6}>Способ создания схемы</Text><SegmentedControl fullWidth value={creationMode} data={[{ value: 'visual', label: 'В визуальном редакторе' }, { value: 'ddl', label: 'Из DDL-скрипта' }]} disabled={createMutation.isPending} onChange={(value) => { setCreationMode(value as 'visual' | 'ddl'); setError(''); }} /></div>
            {creationMode === 'visual' ? <Alert color="blue" variant="light">Будет создана пустая учебная БД. Таблицы и связи можно составить на следующем шаге в редакторе схемы.</Alert> : <Stack gap="sm"><Textarea label="DDL-скрипт" withAsterisk description="Разрешены CREATE TABLE, CREATE INDEX и добавление FK. DML, DCL и административные команды будут отклонены." placeholder={'CREATE TABLE students (\n  id INTEGER PRIMARY KEY,\n  name VARCHAR(200) NOT NULL\n);'} value={ddlScript} disabled={creatingFromDdl} onChange={(event) => { setDdlScript(event.currentTarget.value); setDdlValidation(''); }} minRows={14} autosize styles={{ input: { fontFamily: 'monospace' } }} />{ddlValidation ? <Alert color="green">{ddlValidation}</Alert> : null}<Group justify="flex-start"><Button variant="light" loading={validateDdlMutation.isPending} disabled={creatingFromDdl} onClick={() => void handleValidateDdl()}>Проверить DDL</Button></Group></Stack>}
            <Switch
              checked={isReadOnly}
              label="Защитить схему и данные от изменений"
              description="Включайте после настройки базы. SQL студента всегда выполняется в read-only sandbox независимо от этого переключателя."
              disabled={createMutation.isPending || creatingFromDdl}
              onChange={(event) => setIsReadOnly(event.currentTarget.checked)}
            />
            {isReadOnly ? (
              <Alert color="yellow" variant="light">
                После создания преподаватель не сможет менять схему и учебные данные,
                пока не отключит защиту в карточке базы.
              </Alert>
            ) : null}
            <Group justify="flex-end"><Button variant="default" disabled={creatingFromDdl} onClick={() => navigate('/teacher/databases')}>Отмена</Button><Button loading={createMutation.isPending || creatingFromDdl} onClick={() => void handleCreate()}>{creationMode === 'ddl' ? 'Создать из DDL' : 'Создать базу'}</Button></Group>
          </Stack>
        </AppCard>
      </Stack>
    </Page>
  );
}
