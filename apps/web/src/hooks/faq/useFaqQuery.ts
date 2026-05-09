'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, type IFaq } from '@visionflow/shared';

const normalizeFaq = (faq: IFaq): IFaq => {
  const isVisible = faq.is_visible ?? faq.isVisible;

  return {
    ...faq,
    isVisible,
    is_visible: isVisible,
    created_at: faq.created_at ?? faq.createdAt,
    updated_at: faq.updated_at ?? faq.updatedAt,
  };
};

const fetchFaqList = async (): Promise<IFaq[]> => {
  const { data } = await apiClient.get<IFaq[] | null>('faq', {
    isVisible: 'eq.true',
  });

  return (data ?? []).map(normalizeFaq).filter((faq) => faq.is_visible === true);
};

export const useFaqListQuery = () => {
  return useQuery<IFaq[]>({
    gcTime: Infinity,
    queryKey: ['faq-list', 'visible'],
    queryFn: fetchFaqList,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
