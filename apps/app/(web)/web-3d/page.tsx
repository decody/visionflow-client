import type { Metadata } from 'next';

import { Web3dPage } from '@/features/web/web-3d/web-3d-page';

export const metadata: Metadata = {
  title: 'Web 3D · Interactive — VisionFlow',
  description:
    '브라우저 안에서 진짜 만질 수 있는 3D. 제품 360° 뷰어, 가상 쇼룸, 컨피규레이터까지 — 모바일 60fps로 동작합니다.',
};

export default function Page() {
  return <Web3dPage />;
}
