import { useQuery } from '@tanstack/react-query';
import { apiClient, type INotice } from '@visionflow/shared';

const fetchNoticeList = async (): Promise<INotice[]> => {
  const { data } = await apiClient.get<INotice[] | null>('notices', {
    order: 'is_important.desc,date.desc',
  });

  return data ?? [];
};

const fetchNotice = async (
  noticeId: string,
): Promise<INotice | null> => {
  const { data } = await apiClient.get<INotice | null>(
    `notices/${noticeId}`,
    {
      p_limit: 5,
      p_offset: 0,
    },
  );

  return data ?? null;
};

export const useNoticeListQuery = () => {
  return useQuery<INotice[]>({
    queryKey: ['notices-list'],
    queryFn: fetchNoticeList,
  });
};

export const useNoticeViewQuery = (noticeId: string) => {
  return useQuery<INotice | null>({
    enabled: Boolean(noticeId),
    queryKey: ['notice', noticeId],
    queryFn: () => fetchNotice(noticeId),
  });
};
