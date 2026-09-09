import { Badge, Box, Select, Text, UnstyledButton } from '@mantine/core';
import type { FlatStudentTopic, StudentTopicNode } from '../model';
import styles from './StudentTopicTree.module.css';

type Props = {
  flatTopics: FlatStudentTopic[];
  nodes: StudentTopicNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function TopicBranch({ nodes, selectedId, onSelect, depth = 0 }: Omit<Props, 'flatTopics'> & { depth?: number }) {
  return <>{nodes.map((node) => <div key={node.topic.id}>
    <UnstyledButton
      aria-current={selectedId === node.topic.id ? 'page' : undefined}
      className={`${styles.item} ${selectedId === node.topic.id ? styles.active : ''}`}
      onClick={() => onSelect(node.topic.id)}
      style={{ paddingLeft: 10 + depth * 18 }}
    >
      <span className={styles.row}>
        <span className={styles.label}>{node.topic.topicName || 'Тема без названия'}</span>
        <Badge size="sm" variant="light">{node.topic.publishedTasksCount ?? 0}</Badge>
      </span>
    </UnstyledButton>
    {node.children.length ? <TopicBranch nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} /> : null}
  </div>)}</>;
}

export function StudentTopicTree({ flatTopics, nodes, selectedId, onSelect }: Props) {
  const total = flatTopics.reduce((sum, topic) => sum + (topic.publishedTasksCount ?? 0), 0);
  return <>
    <Box hiddenFrom="sm">
      <Select
        aria-label="Выберите тему"
        data={[
          { value: '__all__', label: `Все темы (${total})` },
          ...flatTopics.map((topic) => ({ value: topic.id, label: `${'— '.repeat(topic.depth)}${topic.topicName || 'Тема без названия'} (${topic.publishedTasksCount ?? 0})` })),
        ]}
        onChange={(value) => onSelect(value === '__all__' ? null : value)}
        searchable
        value={selectedId ?? '__all__'}
      />
    </Box>
    <Box visibleFrom="sm" className={styles.tree}>
      <UnstyledButton className={`${styles.item} ${selectedId === null ? styles.active : ''}`} onClick={() => onSelect(null)}>
        <span className={styles.row}><Text component="span" fw={600} size="sm">Все темы</Text><Badge size="sm" variant="light">{total}</Badge></span>
      </UnstyledButton>
      <TopicBranch nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
    </Box>
  </>;
}
