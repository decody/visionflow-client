import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IPartnershipInquiry } from '@visionflow/shared';

type PartnershipInquiryApiRow = IPartnershipInquiry & {
  createdAt?: string;
  updatedAt?: string;
};

type SendPartnershipReplyResponse =
  | PartnershipInquiryApiRow
  | {
      data?: PartnershipInquiryApiRow;
      inquiry?: PartnershipInquiryApiRow;
    };

export type SendPartnershipReplyPayload = {
  inquiryId: string;
  replyContent: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

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

const getInquiryFromResponse = (
  response: SendPartnershipReplyResponse,
): PartnershipInquiryApiRow => {
  if (!isRecord(response)) {
    throw new Error('답신 처리 결과를 확인할 수 없습니다.');
  }

  if (isRecord(response.inquiry)) {
    return response.inquiry as PartnershipInquiryApiRow;
  }

  if (isRecord(response.data)) {
    return response.data as PartnershipInquiryApiRow;
  }

  return response as PartnershipInquiryApiRow;
};

const normalizeInquiry = (
  inquiry: PartnershipInquiryApiRow,
): IPartnershipInquiry => ({
  ...inquiry,
  created_at: inquiry.created_at ?? inquiry.createdAt ?? '',
  updated_at: inquiry.updated_at ?? inquiry.updatedAt ?? '',
});

export const useSendPartnershipReplyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendPartnershipReplyPayload) => {
      const response = await fetch(
        '/api/admin/partnership-inquiries/reply',
        {
          body: JSON.stringify(payload),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        },
      );

      await assertResponseSuccess(response);

      const data = (await parseResponseBody(
        response,
      )) as SendPartnershipReplyResponse;

      return normalizeInquiry(getInquiryFromResponse(data));
    },
    onSuccess: async (updatedInquiry) => {
      queryClient.setQueryData<IPartnershipInquiry[]>(
        ['partnership-list'],
        (current = []) =>
          current.map((inquiry) =>
            String(inquiry.id) === String(updatedInquiry.id)
              ? updatedInquiry
              : inquiry,
          ),
      );

      await queryClient.invalidateQueries({
        queryKey: ['partnership-list'],
      });
    },
  });
};
