import type { INotice } from '@/types/notice';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@visionflow/shared';

const fetchNoticeList = async (): Promise<INotice[]> => {
  const { data } = await apiClient.get<INotice[]>('notices');
  console.log(data);

  return data;
};

export const useNoticeListQuery = () => {
  return useQuery<INotice[]>({
    queryKey: ['notices-list'],
    queryFn: fetchNoticeList,
  });
};
