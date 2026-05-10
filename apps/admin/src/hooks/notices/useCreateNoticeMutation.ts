import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  type ICreateNoticeRequest,
  type INotice,
} from '@visionflow/shared';

const normalizeNotice = (notice: INotice): INotice => ({
  ...notice,
  createdAt: notice.createdAt,
  updatedAt: notice.updatedAt,
});

export const useCreateNoticeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ICreateNoticeRequest) => {
      const now = new Date().toISOString();

      const { data } = await apiClient.post<INotice>('notices', {
        ...values,
        category: values.category,
        contentHtml: values.contentHtml ?? null,
        description: values.description,
        isImportant: values.isImportant ?? false,
        isPublished: values.isPublished ?? true,
        title: values.title,
        createdAt: now,
      });

      return data;
    },
    onSuccess: async (createdNotice) => {
      const normalizedNotice = normalizeNotice(createdNotice);

      queryClient.setQueryData<INotice[]>(
        ['notices-list'],
        (oldNotices = []) => {
          const exists = oldNotices.some(
            (notice) =>
              String(notice.id) === String(normalizedNotice.id),
          );

          if (exists) {
            return oldNotices.map((notice) =>
              String(notice.id) === String(normalizedNotice.id)
                ? normalizedNotice
                : notice,
            );
          }

          return [normalizedNotice, ...oldNotices];
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ['notices-list'],
      });
    },
  });
};
