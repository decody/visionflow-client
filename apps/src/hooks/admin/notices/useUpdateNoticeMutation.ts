import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ICreateNoticeRequest,
  type INotice,
} from '@visionflow/shared';
import dayjs from 'dayjs';

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

      const response = await fetch(`/api/admin/notices/${noticeId}`, {
        body: JSON.stringify({
          ...values,
          category: values.category,
          contentHtml: values.contentHtml ?? null,
          date: dayjs().format('YYYY-MM-DD'),
          description: values.description,
          isImportant: values.isImportant ?? false,
          isPublished: values.isPublished ?? true,
          title: values.title,
          updatedAt: now,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      });

      const data = (await response.json()) as
        | INotice
        | { details?: unknown; message?: string };

      if (!response.ok) {
        throw new Error(
          'message' in data && data.message
            ? data.message
            : '공지사항 수정 중 오류가 발생했습니다.',
        );
      }

      return data as INotice;
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
