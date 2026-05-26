import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IQuoteInquiry } from '@visionflow/shared';

type QuoteInquiryApiRow = IQuoteInquiry & {
  createdAt?: string;
  updatedAt?: string;
};

export type SendQuotePayload = {
  inquiryId: number | string;
  quoteContent: string;
};

const normalizeQuoteInquiry = (item: QuoteInquiryApiRow): IQuoteInquiry => ({
  ...item,
  attached_files: Array.isArray(item.attached_files) ? item.attached_files : [],
  created_at: item.created_at ?? item.createdAt ?? '',
  preferred_contact_methods: Array.isArray(item.preferred_contact_methods)
    ? item.preferred_contact_methods
    : [],
  reference_urls: Array.isArray(item.reference_urls) ? item.reference_urls : [],
  service_categories: Array.isArray(item.service_categories)
    ? item.service_categories
    : [],
  updated_at: item.updated_at ?? item.updatedAt ?? '',
});

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

  if (body && typeof body === 'object' && 'message' in body) {
    throw new Error(String(body.message));
  }

  throw new Error(typeof body === 'string' ? body : response.statusText);
};

export const useSendQuoteMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendQuotePayload) => {
      const response = await fetch('/api/admin/quote-requests/reply', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      await assertResponseSuccess(response);

      return normalizeQuoteInquiry(
        (await response.json()) as QuoteInquiryApiRow,
      );
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData<IQuoteInquiry[]>(
        ['quote-request-list'],
        (current = []) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
      );

      await queryClient.invalidateQueries({
        queryKey: ['quote-request-list'],
      });
    },
  });
};
