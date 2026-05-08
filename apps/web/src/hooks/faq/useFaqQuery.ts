 'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, type IFaq } from '@visionflow/shared';

const fetchFaqList = async (): Promise<IFaq[]> => {
  const { data } = await apiClient.get<IFaq[] | null>('faq');

  return data ?? [];
};

export const useFaqListQuery = () => {
  return useQuery<IFaq[]>({
    gcTime: Infinity,
    queryKey: ['faq-list'],
    queryFn: fetchFaqList,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
