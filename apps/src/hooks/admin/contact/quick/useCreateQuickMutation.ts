import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type IQuickInquiry } from '@visionflow/shared';

type QuickInquiryApiRow = IQuickInquiry & {
  createdAt?: string;
  updatedAt?: string;
};

const normalizeQuick = (quick: QuickInquiryApiRow): IQuickInquiry => ({
  ...quick,
  created_at: quick.created_at ?? quick.createdAt ?? '',
  updated_at: quick.updated_at ?? quick.updatedAt ?? '',
});

export const useCreateQuickMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      email,
      subject,
      content,
    }: Pick<
      IQuickInquiry,
      'name' | 'email' | 'subject' | 'content'
    >) => {
      const now = new Date().toISOString();
      const { data } = await apiClient.post<QuickInquiryApiRow>(
        '/quick_inquiries',
        {
          name,
          email,
          subject,
          content,
          status: 'pending',
          created_at: now,
          updated_at: now,
        },
      );

      return data;
    },
    onSuccess: async (createdQuick) => {
      const normalizedQuick = normalizeQuick(createdQuick);
      queryClient.setQueryData<IQuickInquiry[]>(
        ['quick-list'],
        (oldQuicks = []) => {
          const exists = oldQuicks.some(
            (quick) =>
              String(quick.id) === String(normalizedQuick.id),
          );

          if (exists) {
            return oldQuicks.map((quick) =>
              String(quick.id) === String(normalizedQuick.id)
                ? normalizedQuick
                : quick,
            );
          }

          return [normalizedQuick, ...oldQuicks];
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ['quick-list'],
      });
    },
  });
};
