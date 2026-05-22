import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ICreateFaqRequest, IFaq } from '@visionflow/shared';

const normalizeFaq = (faq: IFaq): IFaq => ({
  ...faq,
  isVisible: faq.isVisible ?? faq.is_visible,
  is_visible: faq.is_visible ?? faq.isVisible,
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

export const useUpdateFaqMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      values,
      faqId,
    }: {
      values: ICreateFaqRequest;
      faqId: string;
    }) => {
      const now = new Date().toISOString();

      const payload = {
        ...values,
        is_visible: values.is_visible ?? values.isVisible ?? false,
        updatedAt: now,
      };

      const response = await fetch(`/api/admin/faq/${faqId}`, {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      });

      const data = (await response.json()) as
        | IFaq
        | { details?: unknown; message?: string };

      if (!response.ok) {
        throw new Error(
          'message' in data && data.message
            ? data.message
            : 'FAQ 수정 중 오류가 발생했습니다.',
        );
      }

      return data as IFaq;
    },
    onSuccess: async (updatedFaq) => {
      const normalizedFaq = normalizeFaq(updatedFaq);

      queryClient.setQueryData<IFaq[]>(
        ['faq-list'],
        (oldFaqs = []) => upsertFaq(oldFaqs, normalizedFaq),
      );

      queryClient.setQueryData<IFaq[]>(
        ['faq-list', 'visible'],
        (oldFaqs = []) => {
          if (normalizedFaq.is_visible === true) {
            return upsertFaq(oldFaqs, normalizedFaq);
          }

          return oldFaqs.filter(
            (faq) => String(faq.id) !== String(normalizedFaq.id),
          );
        },
      );

      await queryClient.invalidateQueries({ queryKey: ['faq-list'] });
      await queryClient.invalidateQueries({
        queryKey: ['faq-list', 'visible'],
      });
    },
  });
};
