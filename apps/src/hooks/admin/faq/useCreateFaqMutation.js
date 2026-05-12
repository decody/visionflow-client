import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@visionflow/shared';
const normalizeFaq = (faq) => ({
    ...faq,
    is_visible: faq.is_visible ?? faq.isVisible,
    created_at: faq.created_at ?? faq.createdAt,
    updated_at: faq.updated_at ?? faq.updatedAt,
});
export const useCreateFaqMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (values) => {
            const now = new Date().toISOString();
            const { data } = await apiClient.post('faq', {
                ...values,
                createdAt: now,
                updatedAt: now,
                is_visible: values.is_visible ?? false,
            });
            return data;
        },
        onSuccess: async (createdFaq) => {
            const normalizedFaq = normalizeFaq(createdFaq);
            queryClient.setQueryData(['faq-list'], (oldFaqs = []) => {
                const exists = oldFaqs.some((faq) => String(faq.id) === String(normalizedFaq.id));
                if (exists) {
                    return oldFaqs.map((faq) => String(faq.id) === String(normalizedFaq.id)
                        ? normalizedFaq
                        : faq);
                }
                return [normalizedFaq, ...oldFaqs];
            });
            await queryClient.invalidateQueries({
                queryKey: ['faq-list'],
            });
        },
    });
};
