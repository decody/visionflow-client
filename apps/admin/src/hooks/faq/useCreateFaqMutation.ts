import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type ICreateFaqRequest, type IFaq } from '@visionflow/shared';

export const useCreateFaqMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ICreateFaqRequest) => {
      const now = new Date().toISOString();

      const { data } = await apiClient.post<IFaq>('faq', {
        ...values,
        createdAt: now,
        updatedAt: now,
        is_visible: values.is_visible ?? false,
      });

      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['faq-list'],
      });
    },
  });
};
