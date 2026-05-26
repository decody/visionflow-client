'use client';

import { ROUTES } from '@visionflow/routes';
import {
  BarChart3,
  Briefcase,
  FileQuestionMarkIcon,
  FileText,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  MessageCircleQuestionMarkIcon,
  MessageSquareWarningIcon,
  MessagesSquare,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { useAdminAlarmsQuery } from '@/hooks/admin/alarms/useAdminAlarmsQuery';
import { useQuickListQuery } from '@/hooks/admin/contact/quick/useQuickQuery';
import { usePartnershipListQuery } from '@/hooks/admin/contact/partnership/usePartnershipQuery';
import { LogoMark } from '../brand/logo-mark';
import styles from './admin-shell.module.css';

type NavItem = {
  badgeKey?: 'generalInquiryPending' | 'partnershipPending' | 'quotePending';
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
      {
        href: ROUTES.ADMIN.HOME,
        icon: LayoutDashboard,
        label: 'Dashboard',
      },
      { href: '#analytics', icon: BarChart3, label: 'Analytics' },
    ],
  },
  {
    title: 'CONTENTS',
    items: [
      {
        badge: 12,
        href: ROUTES.ADMIN.QNA.ROOT,
        icon: MessageCircleQuestionMarkIcon,
        label: 'Q&A',
      },
      {
        badgeKey: 'partnershipPending',
        href: ROUTES.ADMIN.PARTNERSHIP.ROOT,
        icon: Handshake,
        label: 'Partnership',
      },
      {
        badgeKey: 'generalInquiryPending',
        href: ROUTES.ADMIN.GENERAL_INQUIRY.ROOT,
        icon: MessagesSquare,
        label: 'General Inquiry',
      },
      {
        badgeKey: 'quotePending',
        href: ROUTES.ADMIN.QUOTE_REQUEST.ROOT,
        icon: FileText,
        label: 'Quote Request',
      },
      {
        href: ROUTES.ADMIN.WORK_PORTFOLIO.ROOT,
        icon: Briefcase,
        label: 'Work Portfolio',
      },
      {
        href: ROUTES.ADMIN.FAQ.ROOT,
        icon: FileQuestionMarkIcon,
        label: 'FAQ',
      },
      {
        href: ROUTES.ADMIN.NOTICE.ROOT,
        icon: MessageSquareWarningIcon,
        label: 'Notice',
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        href: ROUTES.ADMIN.USERS.ROOT,
        icon: Users,
        label: '사용자 관리',
      },
      { href: '#settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export function AdminHeader() {
  const pathname = usePathname();
  const { data: quicks } = useQuickListQuery();
  const { data: partnerships } = usePartnershipListQuery();
  const { data: alarms } = useAdminAlarmsQuery();
  const pendingGeneralInquiryCount = useMemo(
    () =>
      Array.isArray(quicks)
        ? quicks.filter((quick) => quick.status === 'pending').length
        : 0,
    [quicks],
  );
  const pendingPartnershipCount = useMemo(
    () =>
      Array.isArray(partnerships)
        ? partnerships.filter(
            (partnership) => partnership.status === 'pending',
          ).length
        : 0,
    [partnerships],
  );

  const getBadge = (item: NavItem) => {
    if (item.badgeKey === 'generalInquiryPending') {
      return pendingGeneralInquiryCount;
    }

    if (item.badgeKey === 'partnershipPending') {
      return pendingPartnershipCount;
    }

    if (item.badgeKey === 'quotePending') {
      return alarms?.counts.quotePending ?? 0;
    }

    return item.badge ?? 0;
  };

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
            <span className={styles.brandSubtitle}>
              Content Manager
            </span>
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
                  const badge = getBadge(item);
                  const isActive =
                    item.href === ROUTES.ADMIN.HOME
                      ? pathname === ROUTES.ADMIN.HOME
                      : typeof pathname === 'string' &&
                        pathname.startsWith(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={isActive ? 'page' : undefined}
                        className={styles.navLink}
                        href={item.href}
                      >
                        <Icon
                          aria-hidden="true"
                          size={18}
                          strokeWidth={1.8}
                        />
                        <span className={styles.navLabel}>
                          {item.label}
                        </span>
                        {badge ? (
                          <span className={styles.navBadge}>
                            {badge}
                          </span>
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
            <span className={styles.profileEmail}>
              admin@visionflow.kr
            </span>
          </span>
        </div>
      </aside>
    </header>
  );
}
