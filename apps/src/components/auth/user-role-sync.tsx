'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { useUserRoleStore } from '@/stores/user-role-store';

export function UserRoleSync() {
  const { data: session, status } = useSession();
  const setRole = useUserRoleStore((state) => state.setRole);
  const clearRole = useUserRoleStore((state) => state.clearRole);
  const role = session?.user?.role ?? null;

  useEffect(() => {
    if (role) {
      setRole(role);
      return;
    }

    if (status === 'unauthenticated') {
      clearRole();
    }
  }, [clearRole, role, setRole, status]);

  return null;
}
