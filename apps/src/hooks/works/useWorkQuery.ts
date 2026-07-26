import { useQuery } from '@tanstack/react-query';
import { type WorkRow } from '@visionflow/shared';

const normalizeRoles = (roles: unknown) => {
  if (Array.isArray(roles)) {
    return roles.filter((role): role is string => typeof role === 'string');
  }

  if (typeof roles === 'string') {
    return roles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeWork = (work: WorkRow): WorkRow => ({
  ...work,
  roles: normalizeRoles((work as unknown as { roles?: unknown }).roles),
});

// 공개 works 조회를 같은 오리진 Next 라우트(BFF)로 보낸다. 라우트가 Spring 공개 API에 위임한다.
// (기존 apiClient는 브라우저에서 Supabase REST를 직접 호출했음 → 제거.)
const fetchWorkList = async (): Promise<WorkRow[]> => {
  const response = await fetch('/api/works');

  if (!response.ok) {
    throw new Error('Failed to load works.');
  }

  const data = (await response.json()) as WorkRow[] | null;

  return (data ?? []).map(normalizeWork);
};

const fetchWork = async (workId: string): Promise<WorkRow | null> => {
  const response = await fetch(`/api/works/${encodeURIComponent(workId)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to load work.');
  }

  const data = (await response.json()) as WorkRow | null;

  return data ? normalizeWork(data) : null;
};

export const useWorkListQuery = () => {
  return useQuery<WorkRow[]>({
    queryKey: ['works-list'],
    queryFn: fetchWorkList,
  });
};

export const useWorkViewQuery = (workId: string) => {
  return useQuery<WorkRow | null>({
    enabled: Boolean(workId),
    queryKey: ['work', workId],
    queryFn: () => fetchWork(workId),
  });
};
