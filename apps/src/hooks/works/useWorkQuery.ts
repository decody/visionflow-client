import { useQuery } from '@tanstack/react-query';
import { apiClient, type WorkRow } from '@visionflow/shared';

const fetchWorkList = async (): Promise<WorkRow[]> => {
  const { data } = await apiClient.get<WorkRow[] | null>('works');

  return data ?? [];
};

const fetchWork = async (workId: string): Promise<WorkRow | null> => {
  const { data } = await apiClient.get<WorkRow | null>(`works/${workId}`);

  return data ?? null;
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
