import { AdminHeader } from './admin-header';
import styles from './admin-shell.module.css';
import { AdminTopbar } from './admin-topbar';
import { TopbarProvider } from './topbar-context';
export function AdminShell({ children, hideTopbar, }) {
    return (<TopbarProvider>
      <div className={styles.shell}>
        <AdminHeader />
        <div className={styles.contentColumn}>
          {hideTopbar ? null : <AdminTopbar />}
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </TopbarProvider>);
}
