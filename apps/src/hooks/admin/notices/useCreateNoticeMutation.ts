import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ICreateNoticeRequest,
  type INotice,
} from '@visionflow/shared';
import dayjs from 'dayjs';

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

      const response = await fetch('/api/admin/notices', {
        body: JSON.stringify({
          ...values,
          category: values.category,
          contentHtml: values.contentHtml ?? null,
          date: dayjs().format('YYYY-MM-DD'),
          description: values.description,
          isImportant: values.isImportant ?? false,
          isPublished: values.isPublished ?? true,
          title: values.title,
          createdAt: now,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const data = (await response.json()) as
        | INotice
        | { details?: unknown; message?: string };

      if (!response.ok) {
        throw new Error(
          'message' in data && data.message
            ? data.message
            : '공지사항 등록 중 오류가 발생했습니다.',
        );
      }

      return data as INotice;
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
