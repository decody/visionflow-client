import { type IFaq } from '@/types/faq';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@visionflow/shared';

const fetchFaqList = async (): Promise<IFaq[]> => {
  const { data } = await apiClient.get<IFaq[] | null>('faq');

  return data ?? [];
};

export const useFaqListQuery = () => {
  return useQuery<IFaq[]>({
    queryKey: ['faq-list'],
    queryFn: fetchFaqList,
  });
};
