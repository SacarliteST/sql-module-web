import { Button, Code, Divider, Group, List, Stack, Text, Title } from '@mantine/core';
import { useGetBankHint, useGetBankSolution } from '../../../api/sqlmodule/student/student';
import { mapStudentApiError, problemCode, StudentErrorAlert, type StudentErrorView } from '../../student-errors';
import { AppCard, SafeMarkdown } from '../../../shared/ui';

type Props = {
  taskId: string;
};

export function StudentBankHelp({ taskId }: Props) {
  const hintMutation = useGetBankHint({ mutation: { retry: false } });
  const solutionMutation = useGetBankSolution({ mutation: { retry: false } });
  const hintResponse = hintMutation.data;
  const solutionResponse = solutionMutation.data;
  const hint = hintResponse?.status === 200 ? hintResponse.data : null;
  const solution = solutionResponse?.status === 200 ? solutionResponse.data : null;
  const hintError = hintMutation.isError
    ? mapStudentApiError(undefined, hintMutation.error)
    : hintResponse && hintResponse.status !== 200
      ? mapBankHelpError(hintResponse.status, hintResponse.data)
      : null;
  const solutionError = solutionMutation.isError
    ? mapStudentApiError(undefined, solutionMutation.error)
    : solutionResponse && solutionResponse.status !== 200
      ? mapBankHelpError(solutionResponse.status, solutionResponse.data)
      : null;

  return <AppCard><Stack gap="md">
    <Stack gap={2}>
      <Title order={2} size="h4">Помощь по заданию</Title>
      <Text c="dimmed" size="sm">Подсказка откроется после неуспешной попытки, разбор — после успешной.</Text>
    </Stack>
    <Group>
      <Button loading={hintMutation.isPending} variant="default" onClick={() => hintMutation.mutate({ taskId })}>Показать подсказку</Button>
      <Button loading={solutionMutation.isPending} variant="light" onClick={() => solutionMutation.mutate({ taskId })}>Показать решение</Button>
    </Group>
    {hintError ? <StudentErrorAlert error={hintError} onRetry={hintError.canRetry ? () => hintMutation.mutate({ taskId }) : undefined} /> : null}
    {solutionError ? <StudentErrorAlert error={solutionError} onRetry={solutionError.canRetry ? () => solutionMutation.mutate({ taskId }) : undefined} /> : null}
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

function mapBankHelpError(
  status: number,
  problem: unknown,
): StudentErrorView {
  const code = problemCode(problem);
  if (status === 409 && code === 'TaskBank.HintAttemptRequired') {
    return {
      canRetry: false,
      color: 'yellow',
      status,
      title: 'Подсказка пока недоступна',
      message: 'Сначала отправьте хотя бы одну неуспешную попытку по этому заданию.',
    };
  }

  if (status === 409 && code === 'TaskBank.SolutionDisabled') {
    return {
      canRetry: false,
      color: 'yellow',
      status,
      title: 'Разбор отключён',
      message: 'Преподаватель отключил показ эталонного решения для этого задания.',
    };
  }

  if (status === 409 && code === 'TaskBank.SolutionAttemptRequired') {
    return {
      canRetry: false,
      color: 'yellow',
      status,
      title: 'Решение пока недоступно',
      message: 'Наберите проходной балл, после чего разбор можно будет открыть здесь.',
    };
  }

  return mapStudentApiError(status, problem);
}
