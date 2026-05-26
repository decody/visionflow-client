import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type IQuickInquiry } from '@visionflow/shared';

type QuickInquiryApiRow = IQuickInquiry & {
  createdAt?: string;
  updatedAt?: string;
};

type CreateQuickPayload = Pick<
  IQuickInquiry,
  'name' | 'email' | 'subject' | 'content'
>;

type CreateQuickContext = {
  optimisticId: string;
  previousQuicks?: IQuickInquiry[];
};

const normalizeQuick = (quick: QuickInquiryApiRow): IQuickInquiry => ({
  ...quick,
  created_at: quick.created_at ?? quick.createdAt ?? '',
  updated_at: quick.updated_at ?? quick.updatedAt ?? '',
});

export const useCreateQuickMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QuickInquiryApiRow,
    Error,
    CreateQuickPayload,
    CreateQuickContext
  >({
    mutationFn: async ({
      name,
      email,
      subject,
      content,
    }: CreateQuickPayload) => {
      const response = await fetch('/api/quick-inquiries', {
        body: JSON.stringify({
          content,
          email,
          name,
          subject,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create quick inquiry.');
      }

      const data = (await response.json()) as QuickInquiryApiRow;

      return data;
    },
    onError: (_error, _payload, context) => {
      if (context?.previousQuicks) {
        queryClient.setQueryData(
          ['quick-list'],
          context.previousQuicks,
        );
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: ['quick-list'],
      });

      const previousQuicks =
        queryClient.getQueryData<IQuickInquiry[]>(['quick-list']);
      const now = new Date().toISOString();
      const optimisticQuick: IQuickInquiry = {
        content: payload.content,
        created_at: now,
        email: payload.email,
        id: `quick-${Date.now()}`,
        name: payload.name,
        status: 'pending',
        subject: payload.subject || null,
        updated_at: now,
      };

      queryClient.setQueryData<IQuickInquiry[]>(
        ['quick-list'],
        (oldQuicks = []) => [optimisticQuick, ...oldQuicks],
      );

      return {
        optimisticId: optimisticQuick.id,
        previousQuicks,
      };
    },
    onSuccess: (createdQuick, _payload, context) => {
      const normalizedQuick = normalizeQuick(createdQuick);
      queryClient.setQueryData<IQuickInquiry[]>(
        ['quick-list'],
        (oldQuicks = []) => {
          const exists = oldQuicks.some(
            (quick) =>
              String(quick.id) === String(normalizedQuick.id) ||
              String(quick.id) === String(context?.optimisticId),
          );

          if (exists) {
            return oldQuicks.map((quick) =>
              String(quick.id) === String(normalizedQuick.id) ||
              String(quick.id) === String(context?.optimisticId)
                ? normalizedQuick
                : quick,
            );
          }

          return [normalizedQuick, ...oldQuicks];
        },
      );

      void queryClient.invalidateQueries({
        queryKey: ['quick-list'],
        refetchType: 'none',
      });
      void queryClient.invalidateQueries({
        queryKey: ['admin-alarms'],
      });
    },
  });
};
