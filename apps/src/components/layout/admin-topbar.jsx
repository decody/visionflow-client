'use client';
import { ROUTES } from '@visionflow/routes';
import { Bell, LogOut, UserRound } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Fragment } from 'react';
import styles from './admin-shell.module.css';
import { useTopbarConfig } from './topbar-context';
export function AdminTopbar() {
    const { action, breadcrumb } = useTopbarConfig();
    const { data: session } = useSession();
    const lastIndex = breadcrumb.length - 1;
    const userName = session?.user?.name ?? session?.user?.email ?? '관리자';
    return (<header className={styles.topbar}>
      <nav aria-label="현재 위치" className={styles.breadcrumb}>
        {breadcrumb.map((item, index) => {
            const isLast = index === lastIndex;
            const className = isLast ? styles.breadcrumbCurrent : styles.breadcrumbStep;
            return (<Fragment key={`${item.label}-${index}`}>
              {index > 0 ? (<span aria-hidden="true" className={styles.breadcrumbSep}>
                  /
                </span>) : null}
              {item.href && !isLast ? (<Link className={className} href={item.href}>
                  {item.label}
                </Link>) : (<span className={className}>{item.label}</span>)}
            </Fragment>);
        })}
      </nav>

      <div className={styles.topActions}>
        <button aria-label="알림" className={styles.notifButton} type="button">
          <Bell aria-hidden="true" size={18} strokeWidth={1.8}/>
          <span aria-hidden="true" className={styles.notifDot}/>
        </button>
        <div className={styles.currentUser} title={userName}>
          <UserRound aria-hidden="true" size={16} strokeWidth={1.8}/>
          <span>{userName}</span>
        </div>
        <button aria-label="로그아웃" className={styles.logoutButton} onClick={() => void signOut({ callbackUrl: ROUTES.ADMIN.LOGIN })} type="button">
          <LogOut aria-hidden="true" size={16} strokeWidth={1.8}/>
          <span>Logout</span>
        </button>
        {action}
      </div>
    </header>);
}
