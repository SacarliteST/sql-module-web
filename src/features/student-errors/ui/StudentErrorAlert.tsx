import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import type { StudentErrorView } from '../model/student-api-error';

export function StudentErrorAlert({ error, onRetry }: { error: StudentErrorView; onRetry?: () => void }) {
  return <Alert color={error.color} title={error.title}>
    <Stack gap="xs">
      <Text size="sm">{error.message}</Text>
      {error.traceId ? <Text c="dimmed" size="xs">Код обращения: {error.traceId}</Text> : null}
      {error.canRetry && onRetry ? <Group><Button size="xs" variant="light" onClick={onRetry}>Повторить</Button></Group> : null}
    </Stack>
  </Alert>;
}
