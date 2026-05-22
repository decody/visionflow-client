import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ICreateNoticeRequest,
  type INotice,
  type INoticeListResponse,
} from '@visionflow/shared';
import dayjs from 'dayjs';

const normalizeNotice = (notice: INotice): INotice => ({
  ...notice,
  createdAt: notice.createdAt,
  updatedAt: notice.updatedAt,
});

const sortNotices = (notices: INotice[]) => {
  return [...notices].sort((a, b) => {
    if (a.isImportant !== b.isImportant) {
      return Number(b.isImportant) - Number(a.isImportant);
    }

    return (b.date ?? '').localeCompare(a.date ?? '');
  });
};

const upsertNotice = (notices: INotice[], nextNotice: INotice) => {
  const exists = notices.some(
    (notice) => String(notice.id) === String(nextNotice.id),
  );

  if (exists) {
    return sortNotices(
      notices.map((notice) =>
        String(notice.id) === String(nextNotice.id) ? nextNotice : notice,
      ),
    );
  }

  return sortNotices([nextNotice, ...notices]);
};

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
        ['admin', 'notices-list'],
        (oldNotices = []) => upsertNotice(oldNotices, normalizedNotice),
      );

      if (normalizedNotice.isPublished) {
        queryClient.setQueryData<INoticeListResponse>(
          ['notices-list'],
          (oldResponse) => {
            if (!oldResponse) {
              return oldResponse;
            }

            const nextNotices = upsertNotice(
              oldResponse.data,
              normalizedNotice,
            );

            return {
              ...oldResponse,
              total_count:
                oldResponse.total_count +
                (nextNotices.length > oldResponse.data.length ? 1 : 0),
              data: nextNotices,
            };
          },
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ['admin', 'notices-list'],
      });
      await queryClient.invalidateQueries({ queryKey: ['notices-list'] });
    },
  });
};
