'use client';

import type { UserRole } from '@visionflow/shared';
import { useSession } from 'next-auth/react';

import { normalizeUserRole } from '@/lib/admin-permissions';
import { useUserRoleStore } from '@/stores/user-role-store';

export function useCurrentUserRole(): UserRole | null {
  const { data: session } = useSession();
  const storedRole = useUserRoleStore((state) => state.role);

  return normalizeUserRole(session?.user?.role) ?? normalizeUserRole(storedRole);
}
