'use client';

import { useWorkspaceStore } from '../../stores/workspace-store';
import styles from './admin-shell.module.css';

export function AdminHeader() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

  return (
    <header className={styles.header}>
      <aside className={styles.sidebar}>
        <h1 className={styles.brand}>VisionFlow</h1>
        <div className={styles.segmented} role="group" aria-label="Workspace">
          <button
            aria-pressed={activeWorkspace === 'production'}
            className={styles.segment}
            type="button"
            onClick={() => setActiveWorkspace('production')}
          >
            Prod
          </button>
          <button
            aria-pressed={activeWorkspace === 'staging'}
            className={styles.segment}
            type="button"
            onClick={() => setActiveWorkspace('staging')}
          >
            Stage
          </button>
        </div>
      </aside>
    </header>
  );
}
