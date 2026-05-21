'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

import { IdleLogout } from '@/components/auth/idle-logout';
import { UserRoleSync } from '@/components/auth/user-role-sync';

export function AuthSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SessionProvider>
      <IdleLogout />
      <UserRoleSync />
      {children}
    </SessionProvider>
  );
}
