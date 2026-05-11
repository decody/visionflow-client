import type { ReactNode } from 'react';

import { WebShell } from '@/components/layout/web-shell';

export default function WebGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <WebShell>{children}</WebShell>;
}
