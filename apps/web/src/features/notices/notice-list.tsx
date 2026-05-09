'use client';

import type { INotice } from '@visionflow/shared';
import { Pin } from 'lucide-react';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import styles from './notices-page.module.css';

interface NoticeListProps {
  notices: INotice[];
  getCategoryLabel: (category: string) => string;
  isLoading?: boolean;
}

export function NoticeList({
  notices,
  getCategoryLabel,
  isLoading = false,
}: NoticeListProps) {
  if (isLoading) {
    return (
      <ul
        aria-busy="true"
        aria-label="Loading notice list"
        className={styles.noticeList}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <li key={index} className={styles.skeletonItem}>
            <span className={styles.skeletonMeta} />
            <span className={styles.skeletonTitle} />
            <span className={styles.skeletonText} />
          </li>
        ))}
      </ul>
    );
  }

  if (notices.length === 0) {
    return (
      <div className={styles.stateBox}>
        <strong>검색 결과가 없습니다.</strong>
        <span>다른 검색어로 다시 찾아보세요.</span>
      </div>
    );
  }

  return (
    <ul className={styles.noticeList}>
      {notices.map((notice) => (
        <li key={notice.id}>
          <Link
            href={ROUTES.NOTICES.DETAIL(String(notice.id))}
            className={styles.noticeItem}
          >
            <div className={styles.noticeBody}>
              <div className={styles.noticeMeta}>
                <span className={styles.badge}>
                  {getCategoryLabel(notice.category)}
                </span>
                {notice.isImportant ? (
                  <span className={styles.pinBadge}>
                    <Pin aria-hidden="true" size={13} />
                    중요
                  </span>
                ) : null}
                <time dateTime={notice.date}>{notice.date}</time>
              </div>
              <h2 className={styles.noticeTitle}>{notice.title}</h2>
              {notice.description ? (
                <p className={styles.noticeText}>
                  {notice.description}
                </p>
              ) : null}
            </div>
            <span aria-hidden="true" className={styles.noticeArrow}>
              &rarr;
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
