import { FormIcon } from 'lucide-react';
import styles from './page.module.css';

export default function UIComponents() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <span aria-hidden="true" className={styles.titleIcon}>
            <FormIcon size={34} color='#004FFF' />
          </span>
          UI Components
        </h1>
      </header>
    </main>
  )
}