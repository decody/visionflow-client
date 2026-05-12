'use client';
import { Container } from '@/components/common/container';
import { ROUTES } from '@visionflow/routes';
import { sanitizeContentHtml } from '@visionflow/shared';
import { ArrowLeft, CalendarDays, Pin } from 'lucide-react';
import Link from 'next/link';
import { useNoticeViewQuery } from '@/hooks/notices/useNoticeQuery';
import styles from './notice-detail-page.module.css';
const categoryLabels = {
    Guide: '공지',
    Service: '서비스',
    Update: '업데이트',
    Event: '이벤트',
};
const getCategoryLabel = (category) => categoryLabels[category] ?? category;
export function NoticeDetailPage({ noticeId, }) {
    const { data: notice, isError, isLoading, } = useNoticeViewQuery(noticeId);
    if (isLoading) {
        return (<main className={styles.page}>
        <Container>
          <div className={styles.skeletonHeader}>
            <span className={styles.skeletonMeta}/>
            <span className={styles.skeletonTitle}/>
            <span className={styles.skeletonText}/>
          </div>
          <div className={styles.skeletonBody}>
            <span />
            <span />
            <span />
            <span />
          </div>
        </Container>
      </main>);
    }
    if (isError || !notice) {
        return (<main className={styles.page}>
        <Container>
          <div className={styles.stateBox}>
            <strong>공지사항을 찾을 수 없습니다.</strong>
            <span>삭제되었거나 잘못된 경로로 접근했습니다.</span>
            <Link className={styles.primaryLink} href={ROUTES.NOTICES.ROOT}>
              목록으로 돌아가기
            </Link>
          </div>
        </Container>
      </main>);
    }
    const sanitizedContentHtml = sanitizeContentHtml(notice.contentHtml ?? '');
    const hasContentHtml = Boolean(sanitizedContentHtml.trim());
    return (<main className={styles.page}>
      <Container>
        <nav aria-label="breadcrumb" className={styles.topBar}>
          <Link className={styles.backLink} href={ROUTES.NOTICES.ROOT}>
            <ArrowLeft aria-hidden="true" size={18}/>
            목록으로
          </Link>
        </nav>

        <article className={styles.article}>
          <header className={styles.header}>
            <div className={styles.metaRow}>
              <span className={styles.badge}>
                {getCategoryLabel(notice.category)}
              </span>
              {notice.isImportant ? (<span className={styles.pinBadge}>
                  <Pin aria-hidden="true" size={14}/>
                  중요
                </span>) : null}
              <span className={styles.date}>
                <CalendarDays aria-hidden="true" size={15}/>
                <time dateTime={notice.date}>{notice.date}</time>
              </span>
            </div>
            <h1 className={styles.title}>{notice.title}</h1>
            {notice.description ? (<p className={styles.description}>
                {notice.description}
              </p>) : null}
          </header>

          <div className={styles.divider}/>

          {hasContentHtml ? (<div className={styles.content} dangerouslySetInnerHTML={{
                __html: sanitizedContentHtml,
            }}/>) : (<div className={styles.content}>
              <p>
                {notice.description ?? '등록된 상세 내용이 없습니다.'}
              </p>
            </div>)}
        </article>

        <div className={styles.footerNav}>
          <Link className={styles.listButton} href={ROUTES.NOTICES.ROOT}>
            공지 목록
          </Link>
        </div>
      </Container>
    </main>);
}
