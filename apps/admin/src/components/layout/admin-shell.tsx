import type { ReactNode } from 'react';

import { AdminFooter } from './admin-footer';
import { AdminHeader } from './admin-header';
import styles from './admin-shell.module.css';

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.shell}>
      <AdminHeader />
      <main className={styles.main}>{children}</main>
      <AdminFooter />
    </div>
  );
}
