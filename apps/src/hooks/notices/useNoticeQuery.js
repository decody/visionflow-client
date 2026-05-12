import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@visionflow/shared';
const fetchNoticeList = async () => {
    const { data } = await apiClient.rpc('get_notices');
    return {
        total_count: data?.totalCount ?? 0,
        limit: data?.limit ?? 0,
        offset: data?.offset ?? 0,
        data: data?.data ?? [],
    };
};
const fetchNotice = async (noticeId) => {
    const { data } = await apiClient.get(`notices/${noticeId}`);
    return data ?? null;
};
export const useNoticeListQuery = () => {
    return useQuery({
        queryKey: ['notices-list'],
        queryFn: fetchNoticeList,
    });
};
export const useNoticeViewQuery = (noticeId) => {
    return useQuery({
        enabled: Boolean(noticeId),
        queryKey: ['notice', noticeId],
        queryFn: () => fetchNotice(noticeId),
    });
};
