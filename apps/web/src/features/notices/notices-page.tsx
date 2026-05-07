'use client';

import { useNoticeListQuery } from '@/hooks/notices/useNoticeQuery';
import styles from './notices-page.module.css';

export function NoticesPage() {
  const { data: notices = [], isError, isLoading } = useNoticeListQuery();
  console.log(notices)
  return (
    <main
      aria-busy={isLoading}
      className={styles.page}
      data-notice-count={notices.length}
      data-notice-status={isError ? 'error' : 'ready'}
    >
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Notice</p>
          <h1 className={styles.title}>공지사항</h1>
          <p className={styles.description}>
            VisionFlow의 서비스 운영 소식과 업데이트 안내를 확인하세요.
          </p>
        </div>

        {/* <div aria-label="공지 요약" className={styles.summaryGrid}>
          {noticeSummaryItems.map((item: NoticeSummaryItem) => (
            <div className={styles.summaryItem} key={item.label}>
              <strong className={styles.summaryValue}>{item.value}</strong>
              <span className={styles.summaryLabel}>{item.label}</span>
            </div>
          ))}
        </div> */}
      </header>

      {/* <section aria-label="공지 목록" className={styles.noticeList}>
        {notices.map((notice) => (
          <article className={styles.noticeItem} key={`${notice.category}-${notice.date}`}>
            <div className={styles.noticeBody}>
              <div className={styles.noticeMeta}>
                <span className={styles.badge}>{notice.category}</span>
                <time dateTime={toDateTimeValue(notice.date)}>{notice.date}</time>
              </div>
              <h2 className={styles.noticeTitle}>{notice.title}</h2>
              <p className={styles.noticeText}>{notice.description}</p>
            </div>
          </article>
        ))}
      </section> */}
    </main>
  );
}
