import styles from './web-shell.module.css';

export function WebFooter() {
  return (
    <footer className={styles.footer}>
      <span className={styles.footerText}>VisionFlow realtime operations</span>
      <nav aria-label="Web footer navigation" className={styles.footerLinks}>
        <a href="/ui/guide/design-system">Design System</a>
        <a href="/ui/guide/ui-components">UI Components</a>
      </nav>
    </footer>
  );
}
