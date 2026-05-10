'use client';

import { ROUTES } from '@visionflow/routes';
import {
  BarChart3,
  Briefcase,
  FileText,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  MessageCircle,
  MessagesSquare,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoMark } from '../brand/logo-mark';
import styles from './admin-shell.module.css';

type NavItem = {
  badge?: number;
  href: string;
  icon: LucideIcon;
  label: string;
};

type NavSection = {
  items: ReadonlyArray<NavItem>;
  title: string;
};

const NAV_SECTIONS: ReadonlyArray<NavSection> = [
  {
    title: 'OVERVIEW',
    items: [
      { href: ROUTES.ADMIN.HOME, icon: LayoutDashboard, label: 'Dashboard' },
      { href: '#analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    title: 'CONTENTS',
    items: [
      { badge: 12, href: ROUTES.ADMIN.QNA.ROOT, icon: MessageCircle, label: 'Q&A' },
      { badge: 5, href: ROUTES.ADMIN.PARTNERSHIP.ROOT, icon: Handshake, label: 'Partnership' },
      { badge: 8, href: ROUTES.ADMIN.GENERAL_INQUIRY.ROOT, icon: MessagesSquare, label: 'General Inquiry' },
      { badge: 3, href: ROUTES.ADMIN.QUOTE_REQUEST.ROOT, icon: FileText, label: 'Quote Request' },
      { href: ROUTES.ADMIN.WORK_PORTFOLIO.ROOT, icon: Briefcase, label: 'Work Portfolio' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { href: ROUTES.ADMIN.USERS.ROOT, icon: Users, label: '사용자 관리' },
      { href: '#settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href={ROUTES.ADMIN.HOME}>
          <div className={styles.brandRow}>
            <LogoMark className={styles.brandMark} />
            <span className={styles.brandName}>VISIONFLOW</span>
          </div>
          <div className={styles.brandSubRow}>
            <span className={styles.brandBadge}>CMS</span>
            <span className={styles.brandSubtitle}>Content Manager</span>
          </div>
        </Link>

        <div className={styles.sidebarDivider} />

        <nav aria-label="관리자 메뉴" className={styles.nav}>
          {NAV_SECTIONS.map((section) => (
            <div className={styles.navSection} key={section.title}>
              <p className={styles.sectionLabel}>{section.title}</p>
              <ul className={styles.navList}>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === ROUTES.ADMIN.HOME
                      ? pathname === ROUTES.ADMIN.HOME
                      : typeof pathname === 'string' && pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={isActive ? 'page' : undefined}
                        className={styles.navLink}
                        href={item.href}
                      >
                        <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                        <span className={styles.navLabel}>{item.label}</span>
                        {item.badge ? (
                          <span className={styles.navBadge}>{item.badge}</span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.sidebarDivider} />

        <div className={styles.profile}>
          <span aria-hidden="true" className={styles.avatar}>
            AK
          </span>
          <span className={styles.profileText}>
            <strong className={styles.profileName}>Admin Kim</strong>
            <span className={styles.profileEmail}>admin@visionflow.kr</span>
          </span>
        </div>
      </aside>
    </header>
  );
}
