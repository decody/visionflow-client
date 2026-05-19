import type { ReactNode } from 'react';

import { AuthSessionProvider } from '@/components/auth-session-provider';
import { AdminShellConditional } from '@/components/layout/admin-shell-conditional';

export default function AdminGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthSessionProvider>
      <AdminShellConditional>{children}</AdminShellConditional>
    </AuthSessionProvider>
  );
}
