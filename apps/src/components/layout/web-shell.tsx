import type { ReactNode } from 'react';

import { WebFooter } from './web-footer';
import { WebHeader } from './web-header';
import styles from './web-shell.module.css';

export function WebShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.shell}>
      <WebHeader />
      <main className={styles.content}>{children}</main>
      <WebFooter />
    </div>
  );
}
