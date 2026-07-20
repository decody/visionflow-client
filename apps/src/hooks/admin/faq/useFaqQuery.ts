'use client';

import { useQuery } from '@tanstack/react-query';
import type { IFaq } from '@visionflow/shared';

// 관리자 FAQ 목록(숨김 포함)은 NextAuth 인증 게이트웨이(/api/admin/faq)를 거쳐
// Spring 백엔드로 위임된다. Next 라우트가 camel/snake 케이스를 모두 채워준다.
const fetchFaqList = async (): Promise<IFaq[]> => {
  const response = await fetch('/api/admin/faq');

  if (!response.ok) {
    throw new Error('FAQ 목록을 불러오지 못했습니다.');
  }

  return (await response.json()) as IFaq[];
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
