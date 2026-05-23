import type { Metadata } from 'next';

import { WorkDetailPage } from '@/features/web/work/work-detail/work-detail-page';

export const metadata: Metadata = {
  title: 'Nordic Furniture 3D Configurator — VisionFlow',
  description:
    '북유럽 가구 브랜드의 온라인 컨피규레이터를 12주 만에 출시. 3D 미리보기로 전환율을 47% 끌어올렸습니다.',
};

export default function WorkDetail() {
  return <WorkDetailPage />;
}
