import type { Metadata } from 'next';

import { RoleGuard } from '@/components/auth/role-guard';
import { UsersDetailPage } from '@/features/users/users-detail-page';
import { ROUTES } from '@visionflow/routes';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 사용자 상세 — 권한·세션·감사 로그',
  title: '사용자 상세 — VisionFlow Admin',
};

export default async function UsersDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RoleGuard
      allowedRoles={['SuperAdmin']}
      fallbackPath={ROUTES.ADMIN.HOME}
    >
      <UsersDetailPage id={id} />
    </RoleGuard>
  );
}
