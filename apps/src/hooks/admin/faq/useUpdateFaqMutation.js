import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, } from '@visionflow/shared';
const normalizeFaq = (faq) => ({
    ...faq,
    is_visible: faq.is_visible ?? faq.isVisible,
    updated_at: faq.updated_at ?? faq.updatedAt,
});
export const useUpdateFaqMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ values, faqId, }) => {
            const now = new Date().toISOString();
            const payload = {
                ...values,
                updatedAt: now,
                is_visible: values.is_visible ?? false,
            };
            const { data } = await apiClient.patch(`faq/${faqId}`, payload);
            return data;
        },
        onSuccess: async (updatedFaq) => {
            const normalizedFaq = normalizeFaq(updatedFaq);
            queryClient.setQueryData(['faq-list'], (oldFaqs = []) => {
                return oldFaqs.map((faq) => String(faq.id) === String(normalizedFaq.id)
                    ? normalizedFaq
                    : faq);
            });
            await queryClient.invalidateQueries({ queryKey: ['faq-list'] });
        },
    });
};
