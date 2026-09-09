import { Badge, Button, Group, Skeleton, Stack, Table, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetStudentAttempts } from '../../../api/sqlmodule/student/student';
import { ConfirmModal } from '../../../shared/ui';
import { mapStudentApiError, StudentErrorAlert } from '../../student-errors';

type Props = { currentSql: string; onUseSql: (sql: string) => void; taskId: string };

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU');
}

export function RecentStudentAttempts({ currentSql, onUseSql, taskId }: Props) {
  const query = useGetStudentAttempts({ TaskId: taskId, Offset: 0, Limit: 5 });
  const response = query.data;
  const pageData = response?.status === 200 ? response.data : null;
  const errorView = query.isError
    ? mapStudentApiError(undefined, query.error)
    : response && response.status !== 200 ? mapStudentApiError(response.status, response.data) : null;
  const [confirmOpened, confirmModal] = useDisclosure(false);
  const [pendingSql, setPendingSql] = useState('');

  const requestUseSql = (sql: string) => {
    if (!sql || sql === currentSql) return;
    if (currentSql.trim()) {
      setPendingSql(sql);
      confirmModal.open();
      return;
    }
    onUseSql(sql);
  };
  const confirmUseSql = () => {
    onUseSql(pendingSql);
    setPendingSql('');
    confirmModal.close();
  };

  return <Stack gap="md">
    <Group justify="space-between">
      <Stack gap={2}><Title order={2} size="h4">Последние попытки</Title><Text c="dimmed" size="sm">Пять последних решений по этому заданию.</Text></Stack>
      <Button component={Link} size="xs" variant="default" to={`/student/attempts?taskId=${encodeURIComponent(taskId)}`}>Вся история</Button>
    </Group>
    {query.isPending ? <Stack><Skeleton height={42} /><Skeleton height={42} /></Stack> : null}
    {errorView ? <StudentErrorAlert error={errorView} onRetry={() => void query.refetch()} /> : null}
    {pageData && !pageData.items?.length ? <Text c="dimmed" size="sm">Попыток по этому заданию пока нет.</Text> : null}
    {pageData?.items?.length ? <Table.ScrollContainer minWidth={720}><Table highlightOnHover striped>
      <Table.Caption>Пять последних попыток по текущему заданию</Table.Caption>
      <Table.Thead><Table.Tr><Table.Th>Время</Table.Th><Table.Th>Результат</Table.Th><Table.Th>Строки</Table.Th><Table.Th>Длительность</Table.Th><Table.Th /></Table.Tr></Table.Thead>
      <Table.Tbody>{pageData.items.map((attempt, index) => <Table.Tr key={attempt.id ?? index}>
        <Table.Td><Text size="sm">{formatDate(attempt.startedAt)}</Text></Table.Td>
        <Table.Td>{typeof attempt.isCorrect === 'boolean' ? <Badge color={attempt.isCorrect ? 'green' : 'red'} variant="light">{attempt.isCorrect ? 'Верно' : 'Неверно'}</Badge> : <Badge color="gray" variant="light">Без вердикта</Badge>}</Table.Td>
        <Table.Td>{attempt.rowCount ?? '—'}</Table.Td>
        <Table.Td>{attempt.durationMs !== null && attempt.durationMs !== undefined ? `${attempt.durationMs} мс` : '—'}</Table.Td>
        <Table.Td ta="right"><Button disabled={!attempt.submittedSql || attempt.submittedSql === currentSql} size="xs" variant="subtle" onClick={() => requestUseSql(attempt.submittedSql ?? '')}>Подставить SQL</Button></Table.Td>
      </Table.Tr>)}</Table.Tbody>
    </Table></Table.ScrollContainer> : null}
    <ConfirmModal
      confirmColor="blue"
      confirmLabel="Подставить"
      message="Текущий текст в редакторе будет заменён SQL выбранной попытки."
      opened={confirmOpened}
      title="Заменить SQL в редакторе?"
      onCancel={() => { setPendingSql(''); confirmModal.close(); }}
      onConfirm={confirmUseSql}
    />
  </Stack>;
}
