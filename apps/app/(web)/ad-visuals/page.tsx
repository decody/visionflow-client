import type { Metadata } from 'next';

import { AdVisualsPage } from '@/features/web/ad-visuals/ad-visuals-page';

export const metadata: Metadata = {
  title: '광고 이미지 · AI 비주얼 — VisionFlow',
  description:
    '제품 컷부터 캠페인 키 비주얼까지 — AI로 빠르게 대량 생산하면서도 브랜드 톤은 일관되게. 채널별 규격은 한 번에, 평균 5일 납기.',
};

export default function Page() {
  return <AdVisualsPage />;
}
