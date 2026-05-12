import type { ReactNode } from 'react';

import { AdminShellConditional } from '@/components/layout/admin-shell-conditional';

export default function AdminGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminShellConditional>{children}</AdminShellConditional>;
}
