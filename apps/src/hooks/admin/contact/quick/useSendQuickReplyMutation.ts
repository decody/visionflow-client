import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type IQuickInquiry } from '@visionflow/shared';

type QuickInquiryApiRow = IQuickInquiry & {
  createdAt?: string;
  repliedAt?: string | null;
  repliedBy?: string | null;
  replyContent?: string | null;
  updatedAt?: string;
};

type SendQuickReplyResponse =
  | QuickInquiryApiRow
  | {
      data?: QuickInquiryApiRow;
      inquiry?: QuickInquiryApiRow;
    };

export type SendQuickReplyPayload = {
  inquiryId: string;
  replyContent: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const getQuickFromResponse = (
  response: SendQuickReplyResponse,
): QuickInquiryApiRow => {
  if (!isRecord(response)) {
    throw new Error('답변 처리 결과를 확인할 수 없습니다.');
  }

  if (isRecord(response.inquiry)) {
    return response.inquiry as QuickInquiryApiRow;
  }

  if (isRecord(response.data)) {
    return response.data as QuickInquiryApiRow;
  }

  return response as QuickInquiryApiRow;
};

const parseResponseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const assertResponseSuccess = async (response: Response) => {
  if (response.ok) {
    return;
  }

  const body = await parseResponseBody(response);

  if (isRecord(body)) {
    const message =
      typeof body.message === 'string' ? body.message : response.statusText;
    const details =
      typeof body.details === 'string' ? ` (${body.details})` : '';

    throw new Error(`${message}${details}`);
  }

  throw new Error(typeof body === 'string' ? body : response.statusText);
};

const normalizeQuick = (quick: QuickInquiryApiRow): IQuickInquiry => ({
  ...quick,
  created_at: quick.created_at ?? quick.createdAt ?? '',
  replied_at: quick.replied_at ?? quick.repliedAt ?? null,
  replied_by: quick.replied_by ?? quick.repliedBy ?? null,
  reply_content: quick.reply_content ?? quick.replyContent ?? null,
  updated_at: quick.updated_at ?? quick.updatedAt ?? '',
});

const assertReplyCompleted = (
  quick: IQuickInquiry,
  payload: SendQuickReplyPayload,
) => {
  if (!quick.id) {
    throw new Error(
      '답변 처리 결과에 문의 정보가 없습니다. 서버 API 응답을 확인해 주세요.',
    );
  }

  if (String(quick.id) !== String(payload.inquiryId)) {
    throw new Error(
      `답변 처리 결과의 문의 ID가 일치하지 않습니다. 요청: ${payload.inquiryId}, 응답: ${quick.id}`,
    );
  }

  if (quick.status !== 'completed') {
    throw new Error('답변 처리가 완료되지 않았습니다. 메일 발송 결과를 확인해 주세요.');
  }

  if (!quick.replied_at || quick.reply_content !== payload.replyContent) {
    throw new Error('답변 메일 발송 또는 문의 상태 업데이트가 완료되지 않았습니다.');
  }
};

export const useSendQuickReplyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendQuickReplyPayload) => {
      const response = await fetch('/api/admin/quick-inquiries/reply', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      await assertResponseSuccess(response);

      const data = (await parseResponseBody(
        response,
      )) as SendQuickReplyResponse;
      const updatedQuick = normalizeQuick(getQuickFromResponse(data));

      assertReplyCompleted(updatedQuick, payload);

      return updatedQuick;
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
