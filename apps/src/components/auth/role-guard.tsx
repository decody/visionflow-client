'use client';

import type { UserRole } from '@visionflow/shared';
import { message } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';

import Loading from '@/components/loading/page';
import { hasAllowedRole, normalizeUserRole } from '@/lib/admin-permissions';
import { useUserRoleStore } from '@/stores/user-role-store';

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallbackPath: string;
};

export function RoleGuard({
  allowedRoles,
  children,
  fallbackPath,
}: RoleGuardProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const setRole = useUserRoleStore((state) => state.setRole);
  const clearRole = useUserRoleStore((state) => state.clearRole);
  const role = normalizeUserRole(session?.user?.role);
  const isAllowed = hasAllowedRole(role, allowedRoles);

  useEffect(() => {
    if (role) {
      setRole(role);
    } else if (status === 'unauthenticated') {
      clearRole();
    }
  }, [clearRole, role, setRole, status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(fallbackPath);
      return;
    }

    if (status !== 'authenticated' || isAllowed) {
      return;
    }

    message.error('접근 권한이 없습니다.');
    router.replace(fallbackPath);
  }, [fallbackPath, isAllowed, router, status]);

  if (status === 'loading' || status !== 'authenticated' || !isAllowed) {
    return <Loading />;
  }

  return children;
}
