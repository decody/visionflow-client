import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, } from '@visionflow/shared';
import dayjs from 'dayjs';
const normalizeNotice = (notice) => ({
    ...notice,
    updatedAt: notice.updatedAt,
});
export const useUpdateNoticeMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ values, noticeId, }) => {
            const now = new Date().toISOString();
            const { data } = await apiClient.patch(`notices/${noticeId}`, {
                ...values,
                category: values.category,
                contentHtml: values.contentHtml ?? null,
                date: dayjs().format('YYYY-MM-DD'),
                description: values.description,
                isImportant: values.isImportant ?? false,
                isPublished: values.isPublished ?? true,
                title: values.title,
                updatedAt: now,
            });
            return data;
        },
        onSuccess: async (updatedNotice, { noticeId }) => {
            const normalizedNotice = normalizeNotice(updatedNotice);
            queryClient.setQueryData(['notices-list'], (oldNotices = []) => {
                return oldNotices.map((notice) => String(notice.id) === String(normalizedNotice.id)
                    ? normalizedNotice
                    : notice);
            });
            queryClient.setQueryData(['notice', noticeId], normalizedNotice);
            await queryClient.invalidateQueries({
                queryKey: ['notices-list'],
            });
            await queryClient.invalidateQueries({
                queryKey: ['notice', noticeId],
            });
        },
    });
};
