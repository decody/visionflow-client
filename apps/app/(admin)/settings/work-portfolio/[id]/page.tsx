import type { Metadata } from 'next';

import { WorkPortfolioDetailPage } from '@/features/work-portfolio/work-portfolio-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Work 포트폴리오 상세 및 수정',
  title: 'Work 상세 | VisionFlow Admin',
};

export default async function WorkPortfolioDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkPortfolioDetailPage id={id} />;
}
