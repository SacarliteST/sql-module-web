import { Alert, Badge, Button, Checkbox, Group, List, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import type { TeacherTaskDetailsResponse } from '../../../api/sqlmodule/model';
import { TeacherTaskDetailsResponseVisibility } from '../../../api/sqlmodule/model';
import { useCloseTaskInBank, useOpenTaskInBank, useUpdateTaskBankContent } from '../../../api/sqlmodule/training/training';
import { AppCard, ConfirmModal } from '../../../shared/ui';
import { MarkdownEditor } from './MarkdownEditor';

type Props = {
  task: TeacherTaskDetailsResponse;
  onChanged: () => Promise<unknown>;
};

export function TaskBankPanel({ task, onChanged }: Props) {
  const [hint, setHint] = useState(task.bankHint ?? '');
  const [explanation, setExplanation] = useState(task.solutionExplanation ?? '');
  const [showSolution, setShowSolution] = useState(task.showSolution ?? true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const openMutation = useOpenTaskInBank();
  const closeMutation = useCloseTaskInBank();
  const contentMutation = useUpdateTaskBankContent();
  const isOpen = task.visibility === TeacherTaskDetailsResponseVisibility.Open;

  useEffect(() => {
    setHint(task.bankHint ?? '');
    setExplanation(task.solutionExplanation ?? '');
    setShowSolution(task.showSolution ?? true);
  }, [task.bankHint, task.showSolution, task.solutionExplanation]);

  const save = async () => {
    if (!task.taskId) return;
    setError('');
    const response = await contentMutation.mutateAsync({ id: task.taskId, data: { bankHint: hint || null, showSolution, solutionExplanation: explanation || null } });
    if (response.status !== 200) { setError(response.data.detail ?? 'Не удалось сохранить материалы банка.'); return; }
    await onChanged();
  };
  const open = async () => {
    if (!task.taskId) return;
    setError('');
    const response = await openMutation.mutateAsync({ id: task.taskId });
    if (response.status !== 200) { setError(response.data.detail ?? 'Задание пока нельзя открыть в банке.'); return; }
    setConfirmOpen(false);
    await onChanged();
  };
  const close = async () => {
    if (!task.taskId) return;
    setError('');
    const response = await closeMutation.mutateAsync({ id: task.taskId });
    if (response.status !== 200) { setError(response.data.detail ?? 'Не удалось закрыть задание в банке.'); return; }
    await onChanged();
  };

  return <AppCard><Stack gap="md">
    <Group justify="space-between">
      <Stack gap={2}><Title order={2} size="h5">Открытый банк</Title><Text c="dimmed" size="sm">Авторские материалы и доступность задания для свободной тренировки.</Text></Stack>
      <Group><Badge color={isOpen ? 'green' : 'gray'}>{isOpen ? `В банке · № ${task.bankNumber ?? '—'}` : 'Не в банке'}</Badge>{isOpen ? <Button color="red" variant="outline" onClick={() => void close()}>Закрыть</Button> : <Button disabled={!task.bankReadiness?.canOpen} onClick={() => setConfirmOpen(true)}>Открыть в банке</Button>}</Group>
    </Group>
    {task.bankReadiness?.blockers?.length ? <Alert color="yellow" title="Что нужно исправить"><List size="sm">{task.bankReadiness.blockers.map((blocker) => <List.Item key={blocker.code}>{blocker.message}</List.Item>)}</List></Alert> : null}
    {error ? <Alert color="red">{error}</Alert> : null}
    <MarkdownEditor label="Авторская подсказка" value={hint} maxLength={4000} onChange={setHint} />
    <Checkbox checked={showSolution} label="Показывать эталонное решение после успешной попытки" onChange={(event) => setShowSolution(event.currentTarget.checked)} />
    <MarkdownEditor label="Пояснение к решению" value={explanation} maxLength={8000} onChange={setExplanation} />
    <Group justify="flex-end"><Button disabled={hint.length > 4000 || explanation.length > 8000} loading={contentMutation.isPending} onClick={() => void save()}>Сохранить материалы</Button></Group>
    <ConfirmModal
      opened={confirmOpen}
      title="Открыть задание всем студентам?"
      message="Задание станет доступно всем студентам без лимита попыток. Если оно используется в контрольной практике курса, студенты смогут прорешать его заранее."
      confirmLabel="Открыть в банке"
      loading={openMutation.isPending}
      onCancel={() => setConfirmOpen(false)}
      onConfirm={() => void open()}
    >{task.bankReadiness?.usedInControl ? <Alert color="red">Модуль уже видел контрольные сессии или попытки по этому заданию.</Alert> : null}</ConfirmModal>
  </Stack></AppCard>;
}
