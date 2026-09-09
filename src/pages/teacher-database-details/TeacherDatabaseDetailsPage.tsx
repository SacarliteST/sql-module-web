import { Alert, Badge, Button, Group, Modal, Stack, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGetDbmsDictionaryById } from '../../api/sqlmodule/dbms-catalog/dbms-catalog';
import type { HttpValidationProblemDetails, ProblemDetails } from '../../api/sqlmodule/model';
import { getGetAllTargetDbsQueryKey, useDeleteTargetDb, useGetTargetDbById, useGetTargetDbSchema, useUpdateTargetDb } from '../../api/sqlmodule/schema/schema';
import { TeacherContourTabs } from '../../features/teacher-contour';
import { formatAuditDateTime } from '../../shared/lib/teacher-audit';
import { AppCard, ConfirmModal, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

function problemMessage(problem: ProblemDetails | HttpValidationProblemDetails | null, fallback: string) {
  if (problem && 'errors' in problem && problem.errors) {
    const messages = Object.values(problem.errors).flat();
    if (messages.length > 0) return messages.join(' ');
  }
  return problem?.detail?.trim() || problem?.title?.trim() || fallback;
}

export function TeacherDatabaseDetailsPage() {
  const { targetDbId = '' } = useParams<{ targetDbId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpened, editModal] = useDisclosure(false);
  const [deleteOpened, deleteModal] = useDisclosure(false);
  const query = useGetTargetDbById(targetDbId, { query: { enabled: Boolean(targetDbId), retry: false } });
  const response = query.data;
  const database = response?.status === 200 ? response.data : null;
  const dbmsQuery = useGetDbmsDictionaryById(database?.dbmsId ?? '', { query: { enabled: Boolean(database?.dbmsId), retry: false } });
  const schemaQuery = useGetTargetDbSchema(targetDbId, { query: { enabled: Boolean(targetDbId), retry: false } });
  const dbmsResponse = dbmsQuery.data;
  const dbms = dbmsResponse?.status === 200 ? dbmsResponse.data : null;
  const schemaResponse = schemaQuery.data;
  const schema = schemaResponse?.status === 200 ? schemaResponse.data : null;
  const updateMutation = useUpdateTargetDb();
  const deleteMutation = useDeleteTargetDb();
  const [dbName, setDbName] = useState('');
  const [description, setDescription] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editOpened && database) {
      setDbName(database.dbName?.trim() ?? '');
      setDescription(database.description?.trim() ?? '');
      setIsReadOnly(database.isReadOnly ?? true);
      setError('');
    }
  }, [database, editOpened]);

  const handleUpdate = async () => {
    if (!database?.id || !dbName.trim()) { setError('Введите название базы.'); return; }
    const result = await updateMutation.mutateAsync({ id: database.id, data: { dbName: dbName.trim(), description: description.trim() || null, isReadOnly } });
    if (result.status !== 204) { setError(problemMessage(result.data, 'Не удалось изменить базу.')); return; }
    await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: getGetAllTargetDbsQueryKey({ Limit: 100 }) })]);
    editModal.close();
  };

  const handleDelete = async () => {
    if (!database?.id) return;
    const result = await deleteMutation.mutateAsync({ id: database.id });
    if (result.status !== 204) { setError(problemMessage(result.data, 'Не удалось удалить базу.')); return; }
    await queryClient.invalidateQueries({ queryKey: getGetAllTargetDbsQueryKey({ Limit: 100 }) });
    navigate('/teacher/databases');
  };

  return (
    <Page>
      <Stack gap="lg">
        <PageBreadcrumbs items={[{ label: 'Главная', to: '/' }, { label: 'Преподаватель', to: '/teacher' }, { label: 'Учебные базы', to: '/teacher/databases' }, { label: database?.dbName?.trim() || 'Детали' }]} />
        <PageHeader title={database?.dbName?.trim() || 'Учебная база'} description={database?.description?.trim() || 'Описание не заполнено'} actions={<Group gap="sm"><Button disabled={!database} variant="light" onClick={editModal.open}>Изменить</Button><Button component={Link} to={`/teacher/databases/${targetDbId}/schema`} variant="outline">Схема</Button><Button component={Link} to={`/teacher/databases/${targetDbId}/data`} variant="outline">Данные</Button><Button color="red" disabled={!schema?.capabilities.canDeleteTargetDb} title={schema?.capabilities.deleteTargetDbBlockReason ?? undefined} variant="outline" onClick={deleteModal.open}>Удалить</Button></Group>} />
        <TeacherContourTabs />
        {error ? <Alert color="red">{error}</Alert> : null}
        {query.isPending ? <AppCard><Text c="dimmed">Загрузка базы...</Text></AppCard> : database ? (
          <AppCard><Stack gap="sm"><Group gap="xs"><Badge color="blue" variant="light">{dbms?.dbmsName?.trim() || dbms?.dbmsSystemName?.trim() || 'СУБД не указана'}</Badge><Badge color={dbms?.isAvailable ? 'green' : 'red'} variant="light">{dbms?.isAvailable ? 'Движок доступен' : 'Движок недоступен'}</Badge><Badge color={database.isReadOnly ? 'gray' : 'green'} variant="light">{database.isReadOnly ? 'Защищена от изменений' : 'Редактируется'}</Badge></Group>{dbms?.unavailableReason ? <Alert color="yellow">{dbms.unavailableReason}</Alert> : null}{schema?.capabilities.deleteTargetDbBlockReason ? <Alert color="yellow">{schema.capabilities.deleteTargetDbBlockReason}</Alert> : null}<Text size="sm">Идентификатор: {database.id}</Text><Text size="sm" c="dimmed">Создана: {formatAuditDateTime(database.createdAt)}</Text></Stack></AppCard>
        ) : <AppCard><EmptyState title="База не найдена" description="Вернитесь к списку учебных баз." /></AppCard>}
      </Stack>
      <Modal opened={editOpened} onClose={editModal.close} title="Изменить учебную базу" centered><Stack gap="md">{error ? <Alert color="red">{error}</Alert> : null}<TextInput label="Название" withAsterisk value={dbName} onChange={(event) => setDbName(event.currentTarget.value)} /><Textarea label="Описание" value={description} onChange={(event) => setDescription(event.currentTarget.value)} /><Switch checked={isReadOnly} label="Защитить схему и данные от изменений" description="Не влияет на student sandbox: запросы студентов всегда выполняются только для чтения." onChange={(event) => setIsReadOnly(event.currentTarget.checked)} /><Group justify="flex-end"><Button variant="default" onClick={editModal.close}>Отмена</Button><Button loading={updateMutation.isPending} onClick={() => void handleUpdate()}>Сохранить</Button></Group></Stack></Modal>
      <ConfirmModal opened={deleteOpened} title="Удалить учебную базу" message="Удаление может быть отклонено, если база используется схемой, эталоном или заданием." confirmLabel="Удалить" confirmColor="red" loading={deleteMutation.isPending} onCancel={deleteModal.close} onConfirm={() => void handleDelete()}>{error ? <Alert color="red">{error}</Alert> : null}</ConfirmModal>
    </Page>
  );
}
