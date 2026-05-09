import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import styles from './web-header.module.css';

const navItems = [
  { href: ROUTES.WEB_3D, label: 'Web 3D' },
  { href: ROUTES.AD_VISUALS, label: 'Ad Visuals' },
  { href: ROUTES.WEB_APP, label: 'Web & App' },
  { href: ROUTES.DASHBOARD, label: 'Dashboard' },
  { href: ROUTES.WORK, label: 'Work' },

  { href: ROUTES.CONTACT, label: 'Contact' },
  { href: ROUTES.NOTICES.ROOT, label: '공지사항' },

  { href: '/pages/guide/design-system', label: 'design' },
];

export function WebHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          aria-label="VisionFlow home"
          className={styles.brand}
          href={ROUTES.HOME}
        >
          <span aria-hidden="true" className={styles.logoMark}>
            <span className={styles.logoGreen} />
            <span className={styles.logoBlack} />
          </span>
          <span className={styles.logoText}>VISIONFLOW</span>
        </Link>

        <nav aria-label="Primary navigation" className={styles.nav}>
          {navItems.map((item) => (
            <Link
              className={styles.navLink}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className={styles.cta} href={ROUTES.CONTACT}>
          무료 견적 받기
        </Link>
      </div>
    </header>
  );
}
