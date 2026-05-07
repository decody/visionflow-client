'use client';

import { useWorkspaceStore } from '@visionflow/shared';

import styles from './web-shell.module.css';

export function WebHeader() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();

  return (
    <header className={styles.header}>
      <div>
        <h1 className={styles.title}>VisionFlow</h1>
        <p className={styles.subtitle}>Computer vision operations dashboard</p>
      </div>
      <div className={styles.actions}>
        <select
          aria-label="Workspace"
          className={styles.select}
          value={activeWorkspace}
          onChange={(event) => setActiveWorkspace(event.target.value)}
        >
          <option value="production">Production</option>
          <option value="staging">Staging</option>
        </select>
        <button className={styles.primaryButton} type="button">
          Deploy Model
        </button>
      </div>
    </header>
  );
}
