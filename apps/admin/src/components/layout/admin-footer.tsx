import styles from './admin-shell.module.css';

export function AdminFooter() {
  return (
    <footer className={styles.footer}>
      <span className={styles.footerText}>VisionFlow Admin Console</span>
      <nav aria-label="Admin footer navigation" className={styles.footerLinks}>
        <a href="/notice">Notices</a>
      </nav>
    </footer>
  );
}
