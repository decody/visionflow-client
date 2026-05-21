'use client';

import { ROUTES } from '@visionflow/routes';
import type { IQna } from '@visionflow/shared';
import { Eye, Lock, MessageCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Container } from '@/components/common/container';
import {
  useQnaListQuery,
  useQnaNoticeListQuery,
} from '@/hooks/qna/useQnaQuery';
import styles from '../contact/contact-general/contact-general-page.module.css';

type CategoryChip = {
  active: boolean;
  count?: number;
  label: string;
};

type PostStatus = 'pending' | 'inProgress' | 'done';

type BoardPost = {
  author: string;
  category: string;
  date: string;
  detailHref: string;
  id: number | string;
  isNew?: boolean;
  isNotice?: boolean;
  locked?: boolean;
  no: number;
  replies: number;
  status?: PostStatus;
  title: string;
  views: number;
};

const ALL_CATEGORY = '전체';
const NOTICE_CATEGORY = '공지';
const DEFAULT_CATEGORY = '서비스 일반';
const DEFAULT_AUTHOR = '익명';
const PAGE_SIZE = 10;
const PUBLIC_DETAIL_PATH = `${ROUTES.CONTACT.ROOT}/general/detail`;
const SECRET_DETAIL_PATH = `${ROUTES.CONTACT.ROOT}/general/detail/secret`;
const KNOWN_CATEGORIES = [DEFAULT_CATEGORY] as const;
const EMPTY_QNAS: IQna[] = [];

const statusLabel: Record<PostStatus, string> = {
  done: '답변 완료',
  inProgress: '진행중',
  pending: '답변 대기',
};

const statusClass: Record<PostStatus, string> = {
  done: 'statusDone',
  inProgress: 'statusInProgress',
  pending: 'statusPending',
};

export function QnaWebListPage() {
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORY);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { data: qnaNoticeResponse, isLoading: isQnaNoticeLoading } =
    useQnaNoticeListQuery();
  const qnaNotices = qnaNoticeResponse ?? EMPTY_QNAS;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const visibleNoticeQnas = useMemo(
    () =>
      qnaNotices
        .filter((qna) => isVisibleQna(qna))
        .filter((qna) =>
          matchesNoticeFilter(qna, activeCategory, normalizedSearchTerm),
        ),
    [activeCategory, normalizedSearchTerm, qnaNotices],
  );
  const qnaPageSize =
    activeCategory === NOTICE_CATEGORY
      ? 0
      : Math.max(0, PAGE_SIZE - visibleNoticeQnas.length);
  const offset =
    qnaPageSize > 0 ? (currentPage - 1) * qnaPageSize : 0;
  const { data: qnaResponse, isLoading: isQnaLoading } =
    useQnaListQuery({
      limit: qnaPageSize,
      offset,
    });
  const qnas = qnaResponse?.data ?? EMPTY_QNAS;
  const qnaTotalCount = qnaResponse?.total_count ?? 0;

  const categories = useMemo<CategoryChip[]>(() => {
    const counts = [...qnaNotices, ...qnas].reduce<
      Map<string, number>
    >((acc, qna) => {
      const category = isQnaNotice(qna)
        ? NOTICE_CATEGORY
        : getCategory(qna);
      acc.set(category, (acc.get(category) ?? 0) + 1);
      return acc;
    }, new Map());
    const labels = new Set([
      NOTICE_CATEGORY,
      ...KNOWN_CATEGORIES,
      ...counts.keys(),
    ]);

    return [
      {
        active: activeCategory === ALL_CATEGORY,
        count: qnaTotalCount + qnaNotices.length,
        label: ALL_CATEGORY,
      },
      ...Array.from(labels).map((label) => ({
        active: activeCategory === label,
        count:
          label === DEFAULT_CATEGORY
            ? qnaTotalCount
            : counts.get(label),
        label,
      })),
    ];
  }, [activeCategory, qnaNotices, qnaTotalCount, qnas]);

  const posts = useMemo(() => {
    const noticePosts = visibleNoticeQnas.map((qna) =>
      toQnaPost(qna, 0),
    );
    const qnaPosts = qnas
      .filter((qna) => isVisibleQna(qna))
      .filter((qna) => {
        const title = getTitle(qna);
        const answer = getStringField(qna, ['answer']) ?? '';
        const categoryMatches =
          activeCategory === ALL_CATEGORY ||
          getCategory(qna) === activeCategory;
        const searchMatches =
          !normalizedSearchTerm ||
          title.toLowerCase().includes(normalizedSearchTerm) ||
          answer.toLowerCase().includes(normalizedSearchTerm) ||
          getCategory(qna)
            .toLowerCase()
            .includes(normalizedSearchTerm);

        return categoryMatches && searchMatches;
      })
      .map((qna, index) =>
        toQnaPost(qna, Math.max(1, qnaTotalCount - offset - index)),
      );

    return [...noticePosts, ...qnaPosts].slice(0, PAGE_SIZE);
  }, [
    activeCategory,
    normalizedSearchTerm,
    offset,
    qnaTotalCount,
    qnas,
    visibleNoticeQnas,
  ]);

  const visibleNoticeCount = visibleNoticeQnas.length;
  const pageCountBasis =
    activeCategory === NOTICE_CATEGORY
      ? visibleNoticeCount / PAGE_SIZE
      : qnaPageSize > 0 &&
          (activeCategory === ALL_CATEGORY ||
            activeCategory === DEFAULT_CATEGORY) &&
          !normalizedSearchTerm
        ? qnaTotalCount / qnaPageSize
        : posts.length / PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(pageCountBasis));
  const isLoading = isQnaLoading || isQnaNoticeLoading;

  return (
    <section className={styles.board} id="board">
      <Container>
        <div className={styles.boardToolbar}>
          <div className={styles.categoryGroup}>
            {categories.map((category) => (
              <button
                className={`${styles.categoryChip} ${category.active ? styles.categoryChipActive : ''}`}
                key={category.label}
                onClick={() => {
                  setActiveCategory(category.label);
                  setCurrentPage(1);
                }}
                type="button"
              >
                {category.label}
                {category.count !== undefined ? (
                  <span className={styles.categoryCount}>
                    {category.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className={styles.boardSpacer} />
          <div className={styles.searchBox}>
            <Search
              aria-hidden="true"
              className={styles.searchIcon}
              size={14}
            />
            <input
              aria-label="Q&A 검색"
              className={styles.searchInput}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="검색어를 입력하세요"
              type="search"
              value={searchTerm}
            />
          </div>
          <Link
            className={styles.boardWrite}
            href={`${ROUTES.CONTACT.ROOT}/general/write`}
          >
            <span aria-hidden="true">+</span>
            글쓰기
          </Link>
        </div>

        <div className={styles.table} role="table">
          <div className={styles.thead} role="row">
            <span className={styles.thCenter}>No</span>
            <span>제목</span>
            <span className={styles.thCenter}>작성자</span>
            <span className={styles.thCenter}>작성일</span>
            <span className={styles.thCenter}>조회</span>
            <span className={styles.thCenter}>댓글</span>
          </div>
          {isLoading ? (
            <BoardStateRow message="Q&A를 불러오는 중입니다." />
          ) : null}
          {!isLoading && posts.length === 0 ? (
            <BoardStateRow message="등록된 Q&A가 없습니다." />
          ) : null}
          {!isLoading
            ? posts.map((post) => (
                <div
                  className={`${styles.row} ${post.isNotice ? styles.rowNotice : ''}`}
                  key={post.id}
                  role="row"
                >
                  <span className={styles.cellNo}>
                    {post.isNotice ? (
                      <span className={styles.noticeBadge}>공지</span>
                    ) : (
                      post.no
                    )}
                  </span>
                  <span className={styles.cellTitle}>
                    {post.status ? (
                      <span
                        className={`${styles.statusBadge} ${styles[statusClass[post.status]]}`}
                      >
                        {statusLabel[post.status]}
                      </span>
                    ) : null}
                    <Link
                      className={`${styles.titleText} ${post.isNotice ? styles.titleTextNotice : ''}`}
                      href={post.detailHref}
                    >
                      {post.title}
                    </Link>
                    {post.locked ? (
                      <Lock
                        aria-hidden="true"
                        size={13}
                        strokeWidth={2.2}
                      />
                    ) : null}
                    {post.isNew ? (
                      <span className={styles.newBadge}>NEW</span>
                    ) : null}
                    {post.replies > 0 ? (
                      <span className={styles.replyCount}>
                        [{post.replies}]
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.cellAuthor}>
                    {post.author}
                  </span>
                  <span className={styles.cellDate}>{post.date}</span>
                  <span className={styles.cellViews}>
                    <span className={styles.boardMetric}>
                      <Eye
                        aria-hidden="true"
                        size={13}
                        strokeWidth={2}
                      />
                      {post.views}
                    </span>
                  </span>
                  <span className={styles.cellReplies}>
                    <span className={styles.boardMetric}>
                      <MessageCircle
                        aria-hidden="true"
                        size={13}
                        strokeWidth={2}
                      />
                      {post.replies}
                    </span>
                  </span>
                </div>
              ))
            : null}
        </div>

        {posts.length > 0 ? (
          <nav aria-label="pagination" className={styles.pagination}>
            <button
              aria-label="Previous page"
              className={`${styles.pageBtn} ${styles.pageBtnNav}`}
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
              }
              type="button"
            >
              &lt;
            </button>
            {Array.from(
              { length: totalPages },
              (_, index) => index + 1,
            ).map((pageNumber) => (
              <button
                className={`${styles.pageBtn} ${pageNumber === currentPage ? styles.pageBtnActive : ''}`}
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              aria-label="Next page"
              className={`${styles.pageBtn} ${styles.pageBtnNav}`}
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1),
                )
              }
              type="button"
            >
              &gt;
            </button>
          </nav>
        ) : null}
      </Container>
    </section>
  );
}

function BoardStateRow({ message }: { message: string }) {
  return (
    <div className={styles.row} role="row">
      <span className={styles.cellNo}>-</span>
      <span className={styles.cellTitle}>
        <span className={styles.titleText}>{message}</span>
      </span>
      <span className={styles.cellAuthor}>-</span>
      <span className={styles.cellDate}>-</span>
      <span className={styles.cellViews}>-</span>
      <span className={styles.cellReplies}>-</span>
    </div>
  );
}

function getCategory(qna: IQna) {
  return qna.category?.trim() || DEFAULT_CATEGORY;
}

function getTitle(qna: IQna) {
  return (
    getStringField(qna, ['title', 'subject', 'question']) ||
    '제목 없음'
  );
}

function toQnaPost(qna: IQna, no: number): BoardPost {
  const locked = getBooleanField(qna, [
    'locked',
    'isLocked',
    'is_secret',
    'isSecret',
  ]);
  const isNotice = isQnaNotice(qna);

  return {
    author: getAuthor(qna),
    category: isNotice ? NOTICE_CATEGORY : getCategory(qna),
    date: formatDate(qna.created_at ?? qna.createdAt),
    detailHref: locked ? SECRET_DETAIL_PATH : PUBLIC_DETAIL_PATH,
    id: qna.id,
    isNew: isNewPost(qna.created_at ?? qna.createdAt),
    isNotice,
    locked,
    no,
    replies:
      getNumberField(qna, ['replies', 'replyCount']) ??
      getReplyCount(qna),
    status: getStatus(qna),
    title: getTitle(qna),
    views: getNumberField(qna, ['views', 'viewCount']) ?? 0,
  };
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getAuthor(qna: IQna) {
  const author =
    getStringField(qna, ['author', 'writer', 'name', 'nickname']) ||
    DEFAULT_AUTHOR;

  return getBooleanField(qna, [
    'locked',
    'isLocked',
    'is_secret',
    'isSecret',
  ])
    ? maskAuthor(author)
    : author;
}

function getReplyCount(qna: IQna) {
  return qna.answer?.trim() ? 1 : 0;
}

function getStatus(qna: IQna): PostStatus {
  const status = getStringField(qna, ['status']);

  if (
    status === 'pending' ||
    status === 'inProgress' ||
    status === 'done'
  ) {
    return status;
  }

  if (status === 'in_progress') {
    return 'inProgress';
  }

  return qna.answer?.trim() ? 'done' : 'pending';
}

function isNewPost(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const diff = Date.now() - date.getTime();

  return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 3;
}

function getBooleanField(qna: IQna, keys: string[]) {
  const record = qna as unknown as Record<string, unknown>;

  return keys.some((key) => record[key] === true);
}

function isQnaNotice(qna: IQna) {
  return getBooleanField(qna, ['is_notice', 'isNotice']);
}

function matchesNoticeFilter(
  qna: IQna,
  activeCategory: string,
  normalizedSearchTerm: string,
) {
  const title = getTitle(qna);
  const answer = getStringField(qna, ['answer']) ?? '';
  const categoryMatches =
    activeCategory === ALL_CATEGORY ||
    activeCategory === NOTICE_CATEGORY;
  const searchMatches =
    !normalizedSearchTerm ||
    title.toLowerCase().includes(normalizedSearchTerm) ||
    answer.toLowerCase().includes(normalizedSearchTerm) ||
    NOTICE_CATEGORY.toLowerCase().includes(normalizedSearchTerm);

  return categoryMatches && searchMatches;
}

function isVisibleQna(qna: IQna) {
  const record = qna as unknown as Record<string, unknown>;
  const visible = record.is_visible ?? record.isVisible;

  return visible !== false;
}

function getNumberField(qna: IQna, keys: string[]) {
  const record = qna as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);

      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function getStringField(qna: IQna, keys: string[]) {
  const record = qna as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function maskAuthor(author: string) {
  if (author.length <= 1) {
    return '*';
  }

  if (author.length === 2) {
    return `${author[0]}*`;
  }

  return `${author[0]}${'*'.repeat(author.length - 2)}${author.at(-1)}`;
}
