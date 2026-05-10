import type { ReactNode } from 'react';

import { AdminHeader } from './admin-header';
import styles from './admin-shell.module.css';
import { AdminTopbar } from './admin-topbar';

export function AdminShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.shell}>
      <AdminHeader />
      <div className={styles.contentColumn}>
        <AdminTopbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
