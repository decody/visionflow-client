'use client';

import { ROUTES } from '@visionflow/routes';
import {
  Bell,
  Boxes,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useWorkspaceStore } from '../../stores/workspace-store';
import styles from './admin-shell.module.css';

const NAV_ITEMS = [
  {
    href: ROUTES.ADMIN.DASHBOARD,
    icon: LayoutDashboard,
    label: '대시보드',
  },
  {
    href: ROUTES.ADMIN.FAQ.ROOT,
    icon: HelpCircle,
    label: 'FAQ',
  },
  {
    href: ROUTES.ADMIN.NOTICES,
    icon: Megaphone,
    label: '공지사항',
  },
  {
    href: ROUTES.ADMIN.PRODUCTS.ROOT,
    icon: Boxes,
    label: '상품',
  },
  {
    href: ROUTES.ADMIN.ORDERS.ROOT,
    icon: ClipboardList,
    label: '주문',
  },
];

const WORKSPACES = [
  { label: '운영', value: 'production' },
  { label: '스테이징', value: 'staging' },
];

export function AdminHeader() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <Link href={ROUTES.ADMIN.HOME} className={styles.brand}>
            <span className={styles.brandMark}>VF</span>
            <span>
              <span className={styles.brandName}>VisionFlow</span>
              <span className={styles.brandMeta}>Admin Console</span>
            </span>
          </Link>
          <button className={styles.iconButton} type="button">
            <Bell size={18} strokeWidth={2} aria-hidden="true" />
            <span className={styles.srOnly}>알림</span>
          </button>
        </div>

        <label className={styles.workspaceLabel} htmlFor="workspace-select">
          Workspace
        </label>
        <select
          id="workspace-select"
          className={styles.workspaceSelect}
          onChange={(event) => setActiveWorkspace(event.target.value)}
          value={activeWorkspace}
        >
          {WORKSPACES.map((workspace) => (
            <option key={workspace.value} value={workspace.value}>
              {workspace.label}
            </option>
          ))}
        </select>

        <nav className={styles.nav} aria-label="관리자 메뉴">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (typeof pathname === 'string' &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={styles.navLink}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </header>
  );
}
