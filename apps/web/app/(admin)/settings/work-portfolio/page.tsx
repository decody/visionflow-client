import type { Metadata } from 'next';

import { WorkPortfolioListPage } from '@/features/work-portfolio/work-portfolio-list-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Work 케이스 관리',
  title: 'Work 케이스 — VisionFlow Admin',
};

export default function WorkPortfolio() {
  return <WorkPortfolioListPage />;
}
