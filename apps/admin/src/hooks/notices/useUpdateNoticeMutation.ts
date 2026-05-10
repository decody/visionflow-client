import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  type ICreateNoticeRequest,
  type INotice,
} from '@visionflow/shared';

const normalizeNotice = (notice: INotice): INotice => ({
  ...notice,
  updatedAt: notice.updatedAt,
});

export const useUpdateNoticeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      noticeId,
    }: {
      values: ICreateNoticeRequest;
      noticeId: string;
    }) => {
      const now = new Date().toISOString();

      const { data } = await apiClient.patch<INotice>(`notices/${noticeId}`, {
        ...values,
        category: values.category,
        contentHtml: values.contentHtml ?? null,
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

      queryClient.setQueryData<INotice[]>(
        ['notices-list'],
        (oldNotices = []) => {
          return oldNotices.map((notice) =>
            String(notice.id) === String(normalizedNotice.id)
              ? normalizedNotice
              : notice,
          );
        },
      );
      queryClient.setQueryData<INotice>(
        ['notice', noticeId],
        normalizedNotice,
      );

      await queryClient.invalidateQueries({
        queryKey: ['notices-list'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['notice', noticeId],
      });
    },
  });
};
