import type { Metadata } from 'next';

import { WebAppPage } from '@/features/web/web-app/web-app-page';

export const metadata: Metadata = {
  title: 'Web & App 개발 — VisionFlow',
  description:
    'AI로 만든 콘텐츠가 진짜로 통하게. 랜딩페이지부터 풀스택 앱까지 한 팀이 책임집니다.',
};

export default function Page() {
  return <WebAppPage />;
}
