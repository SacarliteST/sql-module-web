import { Alert, Badge, Group, List, Stack, Text, Title } from '@mantine/core';
import { HintGroup, type StudentTaskValidationResponse } from '../../../api/sqlmodule/model';
import { getFinalizationReasonLabel, getSessionStatusLabel, getSqlConstructLabel } from '../../../entities/sql-task';
import { AppCard } from '../../../shared/ui';

type Props = {
  validation: StudentTaskValidationResponse | null;
  isPlatformSession: boolean;
};

export function StudentTaskValidation({ validation, isPlatformSession }: Props) {
  if (!validation) return null;

  const { hints, session } = validation;
  const groups = new Set(hints.groups);

  return <AppCard><Stack gap="md">
    <Group justify="space-between">
      <Title order={2} size="h4">Проверка задания</Title>
      {session ? <Badge color={session.canSubmit ? 'blue' : 'gray'} variant="light">{getSessionStatusLabel(session.status)}</Badge> : <Badge color="blue" variant="light">Без ограничений</Badge>}
    </Group>
    <Group gap="lg">
      <Text size="sm">Проходной балл: <strong>{validation.passingScore} из 100</strong></Text>
      {session ? <Text size="sm">Лучший балл: <strong>{session.bestScore} из 100</strong></Text> : null}
      <Text size="sm">Попытки: <strong>{session ? `${session.attemptsUsed}${session.maxAttempts === null ? ' использовано, без лимита' : ` из ${session.maxAttempts} использовано`}` : 'без лимита'}</strong></Text>
    </Group>
    {session ? <Text size="sm">Осталось попыток: {session.attemptsRemaining ?? 'без лимита'}{session.isPassed ? ' · Проходной балл достигнут' : ''}</Text> : null}
    {session?.finalizationReason ? <Text size="sm">Причина завершения: {getFinalizationReasonLabel(session.finalizationReason)}</Text> : null}
    {!session && isPlatformSession ? <Alert color="yellow">Платформенная сессия не найдена. Обновите страницу или повторно откройте задание с платформы.</Alert> : null}
    {session && !session.canSubmit ? <Alert color="yellow">Отправка SQL сейчас недоступна для этой сессии.</Alert> : null}
    {groups.size > 0 ? <Stack gap="xs"><Text fw={600}>Подсказки преподавателя</Text><List spacing="xs" size="sm">
      {groups.has(HintGroup.Result) ? <List.Item>Результат сравнивается с эталоном на основной учебной базе.</List.Item> : null}
      {groups.has(HintGroup.RequiredConstructs) && hints.requiredConstructs.length ? <List.Item>Используйте: {hints.requiredConstructs.map(getSqlConstructLabel).join(', ')}.</List.Item> : null}
      {groups.has(HintGroup.ForbiddenConstructs) && hints.forbiddenConstructs.length ? <List.Item>Не используйте: {hints.forbiddenConstructs.map(getSqlConstructLabel).join(', ')}.</List.Item> : null}
      {groups.has(HintGroup.RequiredTables) && hints.requiredTables.length ? <List.Item>Нужные таблицы: {hints.requiredTables.map((table) => table.name).join(', ')}.</List.Item> : null}
      {groups.has(HintGroup.ForbiddenTables) && hints.forbiddenTables.length ? <List.Item>Не используйте таблицы: {hints.forbiddenTables.map((table) => table.name).join(', ')}.</List.Item> : null}
    </List></Stack> : <Text size="sm" c="dimmed">Подсказки к способу решения скрыты преподавателем.</Text>}
  </Stack></AppCard>;
}
