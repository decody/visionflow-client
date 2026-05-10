import type { ReactNode } from 'react';

import { AdminHeader } from './admin-header';
import styles from './admin-shell.module.css';
import { AdminTopbar } from './admin-topbar';

export function AdminShell({
  children,
  hideTopbar,
}: Readonly<{ children: ReactNode; hideTopbar?: boolean }>) {
  return (
    <div className={styles.shell}>
      <AdminHeader />
      <div className={styles.contentColumn}>
        {hideTopbar ? null : <AdminTopbar />}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
