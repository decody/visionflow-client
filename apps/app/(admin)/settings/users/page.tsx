import type { Metadata } from 'next';

import { RoleGuard } from '@/components/auth/role-guard';
import { UsersListPage } from '@/features/users/users-list-page';
import { USER_MANAGER_ROLES } from '@/lib/admin-permissions';
import { ROUTES } from '@visionflow/routes';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 사용자 관리 — 역할·2FA·세션 현황',
  title: '사용자 관리 — VisionFlow Admin',
};

export default function Users() {
  return (
    <RoleGuard
      allowedRoles={USER_MANAGER_ROLES}
      fallbackPath={ROUTES.ADMIN.HOME}
    >
      <UsersListPage />
    </RoleGuard>
  );
}
