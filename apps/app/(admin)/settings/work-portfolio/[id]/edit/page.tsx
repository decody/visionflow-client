import type { Metadata } from 'next';

import { WorkPortfolioCreatePage } from '@/features/admin/work-portfolio/work-portfolio-create-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Work 포트폴리오 등록',
  title: 'Work 작성 | VisionFlow Admin',
};

export default function WorkPortfolioWrite() {
  return <WorkPortfolioCreatePage />;
}
