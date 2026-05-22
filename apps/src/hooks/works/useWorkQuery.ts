import { useQuery } from '@tanstack/react-query';
import { apiClient, type WorkRow } from '@visionflow/shared';

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

const fetchWorkList = async (): Promise<WorkRow[]> => {
  const { data } = await apiClient.get<WorkRow[] | null>('works');

  return (data ?? []).map(normalizeWork);
};

const fetchWork = async (workId: string): Promise<WorkRow | null> => {
  const { data } = await apiClient.get<WorkRow | null>(`works/${workId}`);

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
