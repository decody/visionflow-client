import type { Metadata } from 'next';

import { WorkPortfolioCreatePage } from '@/features/work-portfolio/work-portfolio-create-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Work 케이스 등록',
  title: '새 케이스 작성 — VisionFlow Admin',
};

export default function WorkPortfolioNew() {
  return <WorkPortfolioCreatePage />;
}
