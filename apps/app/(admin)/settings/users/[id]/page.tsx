import type { Metadata } from 'next';

import { RoleGuard } from '@/components/auth/role-guard';
import { UsersInvitePage } from '@/features/admin/users/users-invite-page';
import { USER_MANAGER_ROLES } from '@/lib/admin-permissions';
import { ROUTES } from '@visionflow/routes';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 새 사용자 초대 — 역할·인증·환영 메시지',
  title: '새 사용자 초대 — VisionFlow Admin',
};

export default function UsersInvite() {
  return (
    <RoleGuard
      allowedRoles={USER_MANAGER_ROLES}
      fallbackPath={ROUTES.ADMIN.HOME}
    >
      <UsersInvitePage />
    </RoleGuard>
  );
}
