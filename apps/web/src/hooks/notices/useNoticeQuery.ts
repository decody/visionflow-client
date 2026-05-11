import { useQuery } from '@tanstack/react-query';
import { apiClient, type INotice, type INoticeListResponse } from '@visionflow/shared';

type NoticeRpcResponse = {
  totalCount: number;
  limit: number;
  offset: number;
  data: INotice[];
};

const fetchNoticeList = async (): Promise<INoticeListResponse> => {
  const { data } = await apiClient.rpc<NoticeRpcResponse | null>('get_notices');

  return {
    total_count: data?.totalCount ?? 0,
    limit: data?.limit ?? 0,
    offset: data?.offset ?? 0,
    data: data?.data ?? [],
  };
};

const fetchNotice = async (
  noticeId: string,
): Promise<INotice | null> => {
  const { data } = await apiClient.get<INotice | null>(
    `notices/${noticeId}`,
  );

  return data ?? null;
};

export const useNoticeListQuery = () => {
  return useQuery<INoticeListResponse>({
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
