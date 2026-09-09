import { Alert, List, Stack, Text } from '@mantine/core';

type TeacherBackendPlaceholderProps = {
  title: string;
  description: string;
  expected: string[];
};

export function TeacherBackendPlaceholder({
  description,
  expected,
  title,
}: TeacherBackendPlaceholderProps) {
  return (
    <Alert color="yellow" title={title} variant="light">
      <Stack gap="xs">
        <Text size="sm">{description}</Text>
        <List size="sm" spacing={4}>
          {expected.map((item) => (
            <List.Item key={item}>{item}</List.Item>
          ))}
        </List>
      </Stack>
    </Alert>
  );
}
