import type { Metadata } from 'next';

import { WorkPortfolioDetailPage } from '../../../../src/features/work-portfolio/work-portfolio-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Work 케이스 상세 — 편집',
  title: 'Work 케이스 상세 — VisionFlow Admin',
};

export default async function WorkPortfolioDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkPortfolioDetailPage id={id} />;
}
