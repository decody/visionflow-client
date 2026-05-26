'use client';

import { ROUTES } from '@visionflow/routes';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { useAdminAlarmsQuery } from '@/hooks/admin/alarms/useAdminAlarmsQuery';
import styles from './admin-shell.module.css';
import { useTopbarConfig } from './topbar-context';

export function AdminTopbar() {
  const [isAlarmOpen, setIsAlarmOpen] = useState(false);
  const { action, breadcrumb } = useTopbarConfig();
  const { data: session } = useSession();
  const { data: alarms } = useAdminAlarmsQuery();
  const lastIndex = breadcrumb.length - 1;
  const userName = session?.user?.name ?? session?.user?.email ?? '관리자';
  const alarmItems = alarms?.items ?? [];
  const alarmCount = alarms?.counts.total ?? 0;

  return (
    <header className={styles.topbar}>
      <nav aria-label="현재 위치" className={styles.breadcrumb}>
        {breadcrumb.map((item, index) => {
          const isLast = index === lastIndex;
          const className = isLast ? styles.breadcrumbCurrent : styles.breadcrumbStep;
          return (
            <Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (
                <span aria-hidden="true" className={styles.breadcrumbSep}>
                  /
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link className={className} href={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span className={className}>{item.label}</span>
              )}
            </Fragment>
          );
        })}
      </nav>

      <div className={styles.topActions}>
        <div className={styles.notifWrap}>
          <button
            aria-expanded={isAlarmOpen}
            aria-label="알림"
            className={styles.notifButton}
            onClick={() => setIsAlarmOpen((current) => !current)}
            type="button"
          >
            <Bell aria-hidden="true" size={18} strokeWidth={1.8} />
            {alarmCount > 0 ? (
              <span aria-hidden="true" className={styles.notifDot} />
            ) : null}
          </button>
          {isAlarmOpen ? (
            <section className={styles.notifPanel} aria-label="운영 알람">
              <header className={styles.notifPanelHeader}>
                <strong>운영 알람</strong>
                <span>{alarmCount.toLocaleString()}건</span>
              </header>
              {alarmItems.length > 0 ? (
                <ul className={styles.notifList}>
                  {alarmItems.slice(0, 8).map((item) => (
                    <li key={item.id}>
                      <Link
                        className={styles.notifItem}
                        href={item.href}
                        onClick={() => setIsAlarmOpen(false)}
                      >
                        <span
                          aria-hidden="true"
                          className={`${styles.notifSeverity} ${
                            styles[`notifSeverity_${item.severity}`]
                          }`}
                        />
                        <span className={styles.notifBody}>
                          <strong>{item.title}</strong>
                          <span>{item.message}</span>
                          <time>{formatRelativeDate(item.created_at)}</time>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.notifEmpty}>확인할 알람이 없습니다.</p>
              )}
            </section>
          ) : null}
        </div>
        <div className={styles.currentUser} title={userName}>
          <UserRound aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>{userName}</span>
        </div>
        <button
          aria-label="로그아웃"
          className={styles.logoutButton}
          onClick={() => void signOut({ callbackUrl: ROUTES.ADMIN.LOGIN })}
          type="button"
        >
          <LogOut aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
        {action}
      </div>
    </header>
  );
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${Math.floor(diffHours / 24)}일 전`;
}
