import { useQuery } from '@tanstack/react-query';
import type { StudentTopicResponse } from '../../../api/sqlmodule/model';
import { getStudentTopics } from '../../../api/sqlmodule/student/student';
import { createStudentRequestError } from '../../student-errors';

const PAGE_SIZE = 100;

async function loadStudentTopics(signal: AbortSignal): Promise<StudentTopicResponse[]> {
  const topics: StudentTopicResponse[] = [];
  let offset = 0;

  while (true) {
    const response = await getStudentTopics({ Offset: offset, Limit: PAGE_SIZE }, { signal });
    if (response.status !== 200) throw createStudentRequestError(response.status, response.data);
    const page = response.data.items ?? [];
    topics.push(...page);
    const total = response.data.count ?? topics.length;
    if (!page.length || topics.length >= total) return topics;
    offset += page.length;
  }
}

export function useStudentTopics() {
  return useQuery({
    queryKey: ['student', 'topics', 'all'],
    queryFn: ({ signal }) => loadStudentTopics(signal),
    staleTime: 60_000,
  });
}
