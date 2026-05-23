import type { Metadata } from 'next';

import { SearchPage } from '@/features/web/search/search-page';

export const metadata: Metadata = {
  title: 'AI Chat Search — VisionFlow',
  description:
    'VisionFlow의 AI 챗봇 검색 기능으로 궁금한 점을 빠르고 쉽게 찾아보세요. 서비스와 관련된 FAQ, 공지, 자료를 한 번에 안내해드립니다.',
};

export default function Search() {
  return <SearchPage />;
}
