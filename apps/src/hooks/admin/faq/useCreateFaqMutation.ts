import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ICreateFaqRequest, IFaq } from '@visionflow/shared';

const normalizeFaq = (faq: IFaq): IFaq => ({
  ...faq,
  isVisible: faq.isVisible ?? faq.is_visible,
  is_visible: faq.is_visible ?? faq.isVisible,
  created_at: faq.created_at ?? faq.createdAt,
  updated_at: faq.updated_at ?? faq.updatedAt,
});

const sortFaqsByNewest = (faqs: IFaq[]) => {
  return [...faqs].sort((a, b) => {
    const aTime = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.created_at ?? b.createdAt ?? 0).getTime();

    return bTime - aTime;
  });
};

const upsertFaq = (faqs: IFaq[], nextFaq: IFaq) => {
  const exists = faqs.some((faq) => String(faq.id) === String(nextFaq.id));

  if (exists) {
    return sortFaqsByNewest(
      faqs.map((faq) =>
        String(faq.id) === String(nextFaq.id) ? nextFaq : faq,
      ),
    );
  }

  return sortFaqsByNewest([nextFaq, ...faqs]);
};

export const useCreateFaqMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ICreateFaqRequest) => {
      const now = new Date().toISOString();

      const response = await fetch('/api/admin/faq', {
        body: JSON.stringify({
          ...values,
          createdAt: now,
          is_visible: values.is_visible ?? values.isVisible ?? false,
          updatedAt: now,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const data = (await response.json()) as
        | IFaq
        | { details?: unknown; message?: string };

      if (!response.ok) {
        throw new Error(
          'message' in data && data.message
            ? data.message
            : 'FAQ 등록 중 오류가 발생했습니다.',
        );
      }

      return data as IFaq;
    },
    onSuccess: async (createdFaq) => {
      const normalizedFaq = normalizeFaq(createdFaq);

      queryClient.setQueryData<IFaq[]>(['faq-list'], (oldFaqs = []) =>
        upsertFaq(oldFaqs, normalizedFaq),
      );

      if (normalizedFaq.is_visible === true) {
        queryClient.setQueryData<IFaq[]>(
          ['faq-list', 'visible'],
          (oldFaqs = []) => upsertFaq(oldFaqs, normalizedFaq),
        );
      }

      await queryClient.invalidateQueries({
        queryKey: ['faq-list'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['faq-list', 'visible'],
      });
    },
  });
};
