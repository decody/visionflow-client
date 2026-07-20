'use client';

import { useQuery } from '@tanstack/react-query';
import type { IFaq } from '@visionflow/shared';

// 공개 FAQ는 Spring 백엔드(/api/faq, is_visible=true)로 위임하는 Next 라우트에서 가져온다.
// Next 라우트가 이미 camelCase/snake_case를 모두 채워주므로 별도 정규화가 필요 없다.
const fetchFaqList = async (): Promise<IFaq[]> => {
  const response = await fetch('/api/faq');

  if (!response.ok) {
    throw new Error('FAQ를 불러오지 못했습니다.');
  }

  const data = (await response.json()) as IFaq[];

  return data.filter((faq) => faq.is_visible === true);
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
