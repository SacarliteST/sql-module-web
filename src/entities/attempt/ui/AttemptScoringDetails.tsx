import { Badge, Group, Stack, Text } from '@mantine/core';
import type { AttemptScoringResponse } from '../../../api/sqlmodule/model';
import { getValidationCheckKindLabel, getValidationCheckStatusLabel } from '../../sql-task';

export function AttemptScoringDetails({ scoring }: { scoring: AttemptScoringResponse }) {
  return <Stack gap="xs">
    <Group gap="xs"><Badge color={scoring.isPassed ? 'green' : 'orange'}>{scoring.score} / 100</Badge><Text size="sm">Лучший: {scoring.bestScore}; проходной: {scoring.passingScore}</Text></Group>
    <Text size="sm">Попытка №{scoring.attemptNumber} · использовано {scoring.attemptsUsed} · осталось {scoring.attemptsRemaining ?? 'без лимита'}</Text>
    <Text size="xs" c="dimmed">Версия проверки: {scoring.validationVersionId}</Text>
    {scoring.checks.map((check, index) => <Group key={`${check.kind}-${index}`} justify="space-between" align="flex-start" wrap="nowrap">
      <Stack gap={0}><Text size="sm">{getValidationCheckKindLabel(check.kind)}</Text>{check.message ? <Text size="xs" c="dimmed">{check.message}</Text> : null}</Stack>
      <Badge color={check.status === 'Passed' ? 'green' : 'orange'} variant="light">{getValidationCheckStatusLabel(check.status)} · {check.awardedScore}/{check.weight}</Badge>
    </Group>)}
    {scoring.hints.map((hint, index) => <Text key={index} size="sm" c="dimmed">{hint.message}</Text>)}
  </Stack>;
}
