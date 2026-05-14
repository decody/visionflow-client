import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type IQuickInquiry } from '@visionflow/shared';

type QuickInquiryApiRow = IQuickInquiry & {
  createdAt?: string;
  repliedAt?: string | null;
  repliedBy?: string | null;
  replyContent?: string | null;
  updatedAt?: string;
};

export type SendQuickReplyPayload = {
  inquiryId: string;
  repliedBy?: string | null;
  replyContent: string;
  subject: string;
  to: string;
};

const normalizeQuick = (quick: QuickInquiryApiRow): IQuickInquiry => ({
  ...quick,
  created_at: quick.created_at ?? quick.createdAt ?? '',
  replied_at: quick.replied_at ?? quick.repliedAt ?? null,
  replied_by: quick.replied_by ?? quick.repliedBy ?? null,
  reply_content: quick.reply_content ?? quick.replyContent ?? null,
  updated_at: quick.updated_at ?? quick.updatedAt ?? '',
});

export const useSendQuickReplyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendQuickReplyPayload) => {
      const { data } = await apiClient.invoke<QuickInquiryApiRow>(
        'send-quick-inquiry-reply',
        payload,
      );

      return normalizeQuick(data);
    },
    onSuccess: async (updatedQuick) => {
      queryClient.setQueryData<IQuickInquiry[]>(
        ['quick-list'],
        (oldQuicks = []) =>
          oldQuicks.map((quick) =>
            String(quick.id) === String(updatedQuick.id)
              ? updatedQuick
              : quick,
          ),
      );

      await queryClient.invalidateQueries({
        queryKey: ['quick-list'],
      });
    },
  });
};
