import { Alert, Button, Code, Divider, Group, List, Stack, Text, Title } from '@mantine/core';
import { useGetBankHint, useGetBankSolution } from '../../../api/sqlmodule/student/student';
import { AppCard, SafeMarkdown } from '../../../shared/ui';

type Props = {
  taskId: string;
};

export function StudentBankHelp({ taskId }: Props) {
  const hintQuery = useGetBankHint(taskId, { query: { enabled: false, retry: false } });
  const solutionQuery = useGetBankSolution(taskId, { query: { enabled: false, retry: false } });
  const hintResponse = hintQuery.data;
  const solutionResponse = solutionQuery.data;
  const hint = hintResponse?.status === 200 ? hintResponse.data : null;
  const solution = solutionResponse?.status === 200 ? solutionResponse.data : null;

  return <AppCard><Stack gap="md">
    <Stack gap={2}>
      <Title order={2} size="h4">Помощь по заданию</Title>
      <Text c="dimmed" size="sm">Подсказка откроется после неуспешной попытки, разбор — после успешной.</Text>
    </Stack>
    <Group>
      <Button loading={hintQuery.isFetching} variant="default" onClick={() => void hintQuery.refetch()}>Показать подсказку</Button>
      <Button loading={solutionQuery.isFetching} variant="light" onClick={() => void solutionQuery.refetch()}>Показать решение</Button>
    </Group>
    {hintResponse && hintResponse.status !== 200 ? <Alert color="yellow" title="Подсказка пока недоступна">Сначала отправьте хотя бы одну неуспешную попытку по этому заданию.</Alert> : null}
    {solutionResponse && solutionResponse.status !== 200 ? <Alert color="yellow" title="Решение пока недоступно">Наберите проходной балл, после чего разбор можно будет открыть здесь.</Alert> : null}
    {hint ? <Stack gap="sm">
      <Divider label={`Подсказка после попытки № ${hint.attemptNumber ?? '—'}`} />
      {hint.autoHints?.length ? <List spacing="xs">{hint.autoHints.map((item, index) => <List.Item key={`${item.group ?? 'hint'}-${index}`}>{item.message}</List.Item>)}</List> : null}
      {hint.authorHint ? <SafeMarkdown>{hint.authorHint}</SafeMarkdown> : null}
    </Stack> : null}
    {solution ? <Stack gap="sm">
      <Divider label="Разбор решения" />
      <Code block>{solution.sqlText || 'Эталонный SQL не указан.'}</Code>
      {solution.explanation ? <SafeMarkdown>{solution.explanation}</SafeMarkdown> : null}
    </Stack> : null}
  </Stack></AppCard>;
}
