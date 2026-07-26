import type { Metadata } from 'next';

import { RoleGuard } from '@/components/auth/role-guard';
import { UsersDetailPage } from '@/features/admin/users/users-detail-page';
import { USER_MANAGER_ROLES } from '@/lib/admin-permissions';
import { ROUTES } from '@visionflow/routes';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 사용자 상세 — 역할·상태·보안',
  title: '사용자 상세 — VisionFlow Admin',
};

export default async function UserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <RoleGuard
      allowedRoles={USER_MANAGER_ROLES}
      fallbackPath={ROUTES.ADMIN.HOME}
    >
      <UsersDetailPage id={id} />
    </RoleGuard>
  );
}
