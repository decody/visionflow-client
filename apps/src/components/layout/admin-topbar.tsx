'use client';

import { ROUTES } from '@visionflow/routes';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Fragment, useState } from 'react';

import { useAdminAlarmsQuery } from '@/hooks/admin/alarms/useAdminAlarmsQuery';
import { usePartnershipListQuery } from '@/hooks/admin/contact/partnership/usePartnershipQuery';
import { useQuickListQuery } from '@/hooks/admin/contact/quick/useQuickQuery';
import { useQuoteRequestListQuery } from '@/hooks/admin/contact/quote/useQuoteRequestQuery';
import { useAdminQnaListQuery } from '@/hooks/admin/qna/useQnaQuery';
import styles from './admin-shell.module.css';
import { useTopbarConfig } from './topbar-context';

export function AdminTopbar() {
  const [isAlarmOpen, setIsAlarmOpen] = useState(false);
  const { action, breadcrumb } = useTopbarConfig();
  const { data: session } = useSession();
  const { data: alarms } = useAdminAlarmsQuery();
  const { data: quicks } = useQuickListQuery();
  const { data: partnerships } = usePartnershipListQuery();
  const { data: quoteRequests } = useQuoteRequestListQuery();
  const { data: qnas } = useAdminQnaListQuery({ limit: 500, offset: 0, status: 'all' });
  const lastIndex = breadcrumb.length - 1;
  const userName = session?.user?.name ?? session?.user?.email ?? '관리자';
  const alarmItems = alarms?.items ?? [];

  const generalCount = Array.isArray(quicks)
    ? quicks.filter((q) => q.status === 'pending').length
    : alarms?.counts.generalPending ?? 0;
  const partnershipCount = Array.isArray(partnerships)
    ? partnerships.filter((p) => p.status === 'pending').length
    : alarms?.counts.partnershipPending ?? 0;
  const quoteCount = Array.isArray(quoteRequests)
    ? quoteRequests.filter((q) => q.status === 'pending').length
    : alarms?.counts.quotePending ?? 0;
  const qnaCount = Array.isArray(qnas?.data)
    ? qnas.data.filter((q) => !q.is_notice && !q.answer?.trim() && q.status !== 'done' && q.status !== 'resolved').length
    : alarms?.counts.qnaPending ?? 0;
  const alarmCount = generalCount + partnershipCount + quoteCount + qnaCount;

  const alarmSummary = [
    { count: generalCount, href: ROUTES.ADMIN.GENERAL_INQUIRY.ROOT, label: '일반' },
    { count: quoteCount, href: ROUTES.ADMIN.QUOTE_REQUEST.ROOT, label: '견적' },
    { count: partnershipCount, href: ROUTES.ADMIN.PARTNERSHIP.ROOT, label: '제휴' },
    { count: qnaCount, href: ROUTES.ADMIN.QNA.ROOT, label: 'Q&A' },
  ];

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
              <div className={styles.notifSummary} aria-label="알람 요약">
                {alarmSummary.map((summary) => (
                  <Link
                    className={styles.notifSummaryItem}
                    href={summary.href}
                    key={summary.label}
                    onClick={() => setIsAlarmOpen(false)}
                  >
                    <span>{summary.label}</span>
                    <strong>{summary.count.toLocaleString()}</strong>
                  </Link>
                ))}
              </div>
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
              ) : null}
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
