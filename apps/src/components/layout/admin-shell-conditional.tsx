'use client';

import { ROUTES } from '@visionflow/routes';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { RoleGuard } from '@/components/auth/role-guard';
import { ADMIN_PAGE_ROLES } from '@/lib/admin-permissions';
import { AdminShell } from './admin-shell';

const SHELL_FREE_PREFIXES: ReadonlyArray<string> = [ROUTES.ADMIN.LOGIN, ROUTES.ADMIN.SIGNIN];

const TOPBAR_FREE_PREFIXES: ReadonlyArray<string> = [`${ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}/`];

export function AdminShellConditional({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const skipShell = SHELL_FREE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (skipShell) {
    return <>{children}</>;
  }

  const hideTopbar = TOPBAR_FREE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  return (
    <RoleGuard
      allowedRoles={ADMIN_PAGE_ROLES}
      fallbackPath={ROUTES.ADMIN.LOGIN}
    >
      <AdminShell hideTopbar={hideTopbar}>{children}</AdminShell>
    </RoleGuard>
  );
}
