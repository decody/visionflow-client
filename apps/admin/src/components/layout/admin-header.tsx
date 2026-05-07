'use client';

import { useWorkspaceStore } from '@visionflow/shared';

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
      <div className={styles.topbar}>
        <div>
          <h2 className={styles.title}>Admin Console</h2>
          <p className={styles.subtitle}>Pipeline health and model operations</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} type="button">
            Export
          </button>
          <button className={styles.primaryButton} type="button">
            New Pipeline
          </button>
        </div>
      </div>
    </header>
  );
}
