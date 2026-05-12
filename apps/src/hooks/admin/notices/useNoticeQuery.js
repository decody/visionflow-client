import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@visionflow/shared';
const fetchNoticeList = async () => {
    const { data } = await apiClient.get('notices', {
        order: 'is_important.desc,date.desc',
    });
    return data ?? [];
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
