'use client';

import { Container } from '@/components/common/container';
import { ChevronDown, Megaphone, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useNoticeListQuery } from '@/hooks/notices/useNoticeQuery';
import { NoticeList } from './notice-list';
import styles from './notices-page.module.css';

const NOTICES_PER_PAGE = 5;

const categoryLabels: Record<string, string> = {
  Guide: '공지',
  Service: '점검',
  Update: '업데이트',
  Event: '이벤트',
};

const getCategoryLabel = (category: string) =>
  categoryLabels[category] ?? category;

export function NoticesPage() {
  const { data: noticeResponse, isLoading } = useNoticeListQuery();
  const notices = noticeResponse?.data ?? [];

  const [searchKeyword, setSearchKeyword] = useState('');
  const [visibleCount, setVisibleCount] = useState(NOTICES_PER_PAGE);
  const importantCount = notices.filter(
    (notice) => notice.isImportant,
  ).length;
  const normalizedSearchKeyword = searchKeyword.trim().toLowerCase();
  const searchableNotices = useMemo(() => {
    return notices.map((notice) => ({
      ...notice,
      searchableText: [
        getCategoryLabel(notice.category),
        notice.category,
        notice.title,
        notice.description ?? '',
        notice.date,
      ]
        .join(' ')
        .toLowerCase(),
    }));
  }, [notices]);

  const filteredNotices = useMemo(() => {
    if (!normalizedSearchKeyword) {
      return notices;
    }

    return searchableNotices.filter((notice) =>
      notice.searchableText.includes(normalizedSearchKeyword),
    );
  }, [normalizedSearchKeyword, notices, searchableNotices]);
  const hasSearchKeyword = normalizedSearchKeyword.length > 0;
  const visibleNotices = filteredNotices.slice(0, visibleCount);
  const hasMoreNotices = visibleCount < filteredNotices.length;

  useEffect(() => {
    setVisibleCount(NOTICES_PER_PAGE);
  }, [normalizedSearchKeyword]);

  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Notice</span>
            <h1 className={styles.title}>공지사항</h1>
            <p className={styles.description}>
              VisionFlow의 서비스 운영 소식과 업데이트 안내를
              확인하세요.
            </p>
            <div
              aria-label="공지 요약"
              className={styles.summaryGrid}
            >
              <div className={styles.summaryItem}>
                <strong className={styles.summaryValue}>
                  {notices.length}
                </strong>
                <span className={styles.summaryLabel}>
                  게시된 공지
                </span>
              </div>
              <div className={styles.summaryItem}>
                <strong className={styles.summaryValue}>
                  {importantCount}
                </strong>
                <span className={styles.summaryLabel}>중요 공지</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.listSection}>
        <Container>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>
              <span className={styles.listIcon}>
                <Megaphone aria-hidden="true" size={18} />
              </span>
              <h2>공지 목록</h2>
            </div>
            <div className={styles.listControls}>
              <span className={styles.listCount}>
                {hasSearchKeyword
                  ? `${filteredNotices.length} / ${notices.length}건`
                  : `총 ${notices.length}건`}
              </span>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>
                  <Search aria-hidden="true" size={16} />
                </span>
                <input
                  aria-label="공지 검색"
                  onChange={(event) =>
                    setSearchKeyword(event.target.value)
                  }
                  placeholder="공지 검색"
                  type="search"
                  value={searchKeyword}
                />
                {hasSearchKeyword ? (
                  <button
                    aria-label="검색어 지우기"
                    className={styles.clearSearch}
                    onClick={() => setSearchKeyword('')}
                    type="button"
                  >
                    <X aria-hidden="true" size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <NoticeList
            getCategoryLabel={getCategoryLabel}
            isLoading={isLoading}
            notices={visibleNotices}
          />

          {!isLoading && hasMoreNotices ? (
            <div className={styles.loadMoreWrap}>
              <button
                className={styles.loadMore}
                onClick={() =>
                  setVisibleCount((count) => count + NOTICES_PER_PAGE)
                }
                type="button"
              >
                <ChevronDown aria-hidden="true" size={18} />
                더보기
                <span className={styles.loadMoreMeta}>
                  {visibleNotices.length} / {filteredNotices.length}
                </span>
              </button>
            </div>
          ) : null}
        </Container>
      </section>
    </>
  );
}
