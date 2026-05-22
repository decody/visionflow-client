import type { Metadata } from 'next';

import { RoleGuard } from '@/components/auth/role-guard';
import { WorkPortfolioDetailPage } from '@/features/work-portfolio/work-portfolio-detail-page';
import { ROUTES } from '@visionflow/routes';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Work 포트폴리오 수정',
  title: 'Work 수정 | VisionFlow Admin',
};

export default async function WorkPortfolioEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RoleGuard
      allowedRoles={['SuperAdmin', 'admin']}
      fallbackPath={ROUTES.ADMIN.WORK_PORTFOLIO.DETAIL(id)}
    >
      <WorkPortfolioDetailPage id={id} />
    </RoleGuard>
  );
}
