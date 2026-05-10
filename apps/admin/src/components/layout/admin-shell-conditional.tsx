'use client';

import { ROUTES } from '@visionflow/routes';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminShell } from './admin-shell';

const SHELL_FREE_PREFIXES: ReadonlyArray<string> = [ROUTES.ADMIN.LOGIN, ROUTES.ADMIN.SIGNIN];

export function AdminShellConditional({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const skipShell = SHELL_FREE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (skipShell) {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
