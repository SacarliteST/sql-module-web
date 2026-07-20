import {
  Anchor,
  Badge,
  Button,
  Divider,
  Grid,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getStatusColor,
  getStatusLabel,
  teacherTasks,
  teacherTopics,
  TeacherContourTabs,
} from '../../features/teacher-contour';
import { AppCard, EmptyState, Page, PageBreadcrumbs, PageHeader } from '../../shared/ui';

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function TeacherTopicsPage() {
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(teacherTopics[0]?.id ?? '');
  const searchValue = normalizeSearch(search);

  const filteredTopics = useMemo(() => {
    if (!searchValue) {
      return teacherTopics;
    }

    return teacherTopics.filter((topic) => {
      const title = topic.title.toLowerCase();
      const description = topic.description.toLowerCase();

      return title.includes(searchValue) || description.includes(searchValue);
    });
  }, [searchValue]);

  useEffect(() => {
    if (filteredTopics.length === 0) {
      return;
    }

    const selectedTopicVisible = filteredTopics.some((topic) => topic.id === selectedTopicId);

    if (!selectedTopicVisible) {
      setSelectedTopicId(filteredTopics[0].id);
    }
  }, [filteredTopics, selectedTopicId]);

  const selectedTopic = filteredTopics.find((topic) => topic.id === selectedTopicId) ?? filteredTopics[0];
  const selectedTopicTasks = selectedTopic
    ? teacherTasks.filter((task) => task.topicId === selectedTopic.id)
    : [];

  return (
    <Page>
      <PageBreadcrumbs
        items={[
          { label: 'Главная', to: '/' },
          { label: 'Преподаватель', to: '/teacher' },
          { label: 'Темы' },
        ]}
      />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-end" gap="md" wrap="wrap">
          <PageHeader
            title="Темы"
            description="Создавайте темы курса и наполняйте их SQL-заданиями."
          />
          <TeacherContourTabs />
        </Group>
      </Stack>

      <Grid gutter="md" align="stretch">
        <Grid.Col span={{ base: 12, md: 3 }}>
          <AppCard p="sm" h="100%">
            <Stack gap="sm">
              <Button component={Link} to="/teacher/topics/new" size="sm" fullWidth>
                Создать тему
              </Button>

              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Поиск тем..."
                size="xs"
              />

              <Divider />

              {filteredTopics.length > 0 ? (
                <Stack gap={4}>
                  {filteredTopics.map((topic) => {
                    const isSelected = topic.id === selectedTopic?.id;

                    return (
                      <UnstyledButton key={topic.id} onClick={() => setSelectedTopicId(topic.id)} w="100%">
                        <Paper
                          p="xs"
                          radius="sm"
                          bg={isSelected ? '#0d6efd' : 'transparent'}
                          style={{
                            border: '1px solid',
                            borderColor: isSelected ? '#0d6efd' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <Group justify="space-between" gap="xs" wrap="nowrap">
                            <Stack gap={2} style={{ minWidth: 0 }}>
                              <Text fw={600} size="sm" c={isSelected ? 'white' : 'dark'} truncate>
                                {topic.title}
                              </Text>
                              <Text size="xs" c={isSelected ? 'blue.0' : 'dimmed'} truncate>
                                {topic.taskCount} заданий
                              </Text>
                            </Stack>
                            <Text size="xs" fw={600} c={isSelected ? 'white' : 'dimmed'}>
                              {topic.databaseCount}
                            </Text>
                          </Group>
                        </Paper>
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              ) : (
                <EmptyState
                  title="Темы не найдены"
                  description="Измените поисковый запрос или создайте новую тему."
                />
              )}
            </Stack>
          </AppCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }}>
          {selectedTopic ? (
            <Stack gap="md">
              <AppCard p="md">
                <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
                  <Stack gap="sm">
                    <Group gap="xs">
                      <Text size="xl" lh={1}>
                        □
                      </Text>
                      <Title order={2} size="h4">
                        {selectedTopic.title}
                      </Title>
                      <Badge color={getStatusColor(selectedTopic.status)} radius="sm" variant="light">
                        {getStatusLabel(selectedTopic.status)}
                      </Badge>
                    </Group>
                    <Text c="dimmed" size="sm">
                      {selectedTopic.description}
                    </Text>
                    <Group gap="xl">
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs" tt="uppercase">
                          Заданий
                        </Text>
                        <Text fw={700}>{selectedTopic.taskCount}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs" tt="uppercase">
                          Последнее изменение
                        </Text>
                        <Text fw={700}>{selectedTopic.updatedAt}</Text>
                      </Stack>
                      <Stack gap={0}>
                        <Text c="dimmed" size="xs" tt="uppercase">
                          Учебные базы
                        </Text>
                        <Text fw={700}>{selectedTopic.databaseCount}</Text>
                      </Stack>
                    </Group>
                  </Stack>
                  <Button component={Link} to={`/teacher/topics/${selectedTopic.id}`} size="xs" variant="outline">
                    Изменить
                  </Button>
                </Group>
              </AppCard>

              <AppCard p={0}>
                <Stack gap={0}>
                  <Group justify="space-between" p="md" gap="md" wrap="wrap">
                    <Title order={3} size="h5">
                      Задания темы
                    </Title>
                    <Button component={Link} to={`/teacher/topics/${selectedTopic.id}/tasks/new`} size="xs">
                      Создать задание
                    </Button>
                  </Group>

                  <Table striped highlightOnHover withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Название задания</Table.Th>
                        <Table.Th>База</Table.Th>
                        <Table.Th>СУБД</Table.Th>
                        <Table.Th>Сложность</Table.Th>
                        <Table.Th>Обновлено</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {selectedTopicTasks.map((task) => (
                        <Table.Tr key={task.id}>
                          <Table.Td>
                            <Anchor component={Link} to={`/teacher/topics/${selectedTopic.id}/tasks/${task.id}`}>
                              {task.title}
                            </Anchor>
                            <Text c="dimmed" size="xs">
                              Попыток: {task.attempts}
                            </Text>
                          </Table.Td>
                          <Table.Td>{task.database}</Table.Td>
                          <Table.Td>{task.dbms}</Table.Td>
                          <Table.Td>
                            <Badge color={getStatusColor(task.status)} radius="sm" variant="light">
                              {getStatusLabel(task.status)}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{task.updatedAt}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  <Text ta="center" c="dimmed" size="xs" p="sm">
                    Конец списка заданий по теме
                  </Text>
                </Stack>
              </AppCard>
            </Stack>
          ) : (
            <AppCard p="md">
              <EmptyState
                title="Выберите тему"
                description="После выбора темы здесь появятся описание и задания."
              />
            </AppCard>
          )}
        </Grid.Col>
      </Grid>
    </Page>
  );
}
