import type { StudentTopicResponse } from '../../../api/sqlmodule/model';

export type StudentTopic = StudentTopicResponse & { id: string };
export type StudentTopicNode = { topic: StudentTopic; children: StudentTopicNode[] };
export type FlatStudentTopic = StudentTopic & { depth: number };

function byName(left: StudentTopicNode, right: StudentTopicNode) {
  return (left.topic.topicName || '').localeCompare(right.topic.topicName || '', 'ru') || left.topic.id.localeCompare(right.topic.id);
}

function participatesInCycle(id: string, parentById: Map<string, string | null>): boolean {
  const visited = new Set<string>();
  let current: string | null | undefined = id;
  while (current && parentById.has(current)) {
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentById.get(current);
  }
  return false;
}

export function buildStudentTopicTree(items: StudentTopicResponse[]): StudentTopicNode[] {
  const topics = items.filter((item): item is StudentTopic => Boolean(item.id));
  const nodes = new Map<string, StudentTopicNode>(
    topics.map((topic) => [topic.id, { topic, children: [] }]),
  );
  const parentById = new Map(topics.map((topic) => [topic.id, topic.parentTopicId ?? null]));
  const roots: StudentTopicNode[] = [];

  for (const topic of topics) {
    const node = nodes.get(topic.id)!;
    const parentId = topic.parentTopicId;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (!parent || parentId === topic.id || participatesInCycle(topic.id, parentById)) roots.push(node);
    else parent.children.push(node);
  }

  const sortNodes = (entries: StudentTopicNode[]) => {
    entries.sort(byName);
    entries.forEach((entry) => sortNodes(entry.children));
  };
  sortNodes(roots);
  return roots;
}

export function flattenStudentTopicTree(nodes: StudentTopicNode[], depth = 0): FlatStudentTopic[] {
  return nodes.flatMap((node) => [
    { ...node.topic, depth },
    ...flattenStudentTopicTree(node.children, depth + 1),
  ]);
}
