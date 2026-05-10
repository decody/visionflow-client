'use client';

import { ROUTES } from '@visionflow/routes';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Timer,
} from 'lucide-react';
import Link from 'next/link';

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './qna-list-page.module.css';

type StatusKey = 'pending' | 'done';
type CategoryKey = 'ad-visuals' | 'data-dashboard' | 'web-app' | 'web-3d';
type SlaKey = 'safe' | 'warn' | 'overdue' | 'done';

const STATUS_TABS = [
  { count: 247, key: 'all' as const, label: '전체' },
  { count: 8, key: 'pending' as const, label: '답변 대기' },
  { count: 231, key: 'done' as const, label: '답변 완료' },
  { count: 47, key: 'private' as const, label: '비밀글', icon: Lock },
];

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  'ad-visuals': '광고 이미지',
  'data-dashboard': '데이터 대시보드',
  'web-3d': '웹 3D',
  'web-app': '웹/앱 개발',
};

type Inquiry = {
  assignee: { initial: string; name: string } | null;
  author: { initial: string; name: string };
  category: CategoryKey;
  createdAbsolute: string;
  createdRelative: string;
  excerpt: string;
  id: string;
  org: string;
  private?: boolean;
  sla: { kind: SlaKey; label: string };
  status: StatusKey;
  title: string;
};

const INQUIRIES: ReadonlyArray<Inquiry> = [
  {
    assignee: null,
    author: { initial: '윤', name: '윤서연' },
    category: 'ad-visuals',
    createdAbsolute: '오늘 14:32',
    createdRelative: '3시간 전',
    excerpt: '시즌 캠페인용 LoRA 학습 가능 여부와 채널 4종 동시 운영 시 비용',
    id: 'Q-2604',
    org: 'Brand K',
    sla: { kind: 'safe', label: '20h 28m' },
    status: 'pending',
    title: '제품 광고 이미지 30컷 견적 문의드립니다',
  },
  {
    assignee: null,
    author: { initial: '익', name: '익명' },
    category: 'data-dashboard',
    createdAbsolute: '오늘 11:15',
    createdRelative: '6시간 전',
    excerpt: '🔒 비밀번호로 보호된 글입니다',
    id: 'Q-2603',
    org: '',
    private: true,
    sla: { kind: 'safe', label: '17h 45m' },
    status: 'pending',
    title: '[비밀글] 사내 데이터 BI 구축 제안',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '박', name: '박지훈' },
    category: 'web-app',
    createdAbsolute: '어제 16:48',
    createdRelative: '1일 전',
    excerpt: '기존 CRA 프로젝트가 있는데 점진 이전이 가능할까요?',
    id: 'Q-2602',
    org: 'CTO @ TechCo',
    sla: { kind: 'warn', label: '4h 12m' },
    status: 'pending',
    title: 'Next.js 14 App Router 마이그레이션 가능 여부',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '이', name: '이수민' },
    category: 'web-3d',
    createdAbsolute: '어제 10:22',
    createdRelative: '1일 전',
    excerpt: '아이폰 12 미니 기준 성능 보장이 가능한지 문의드립니다.',
    id: 'Q-2601',
    org: 'CO Furniture',
    sla: { kind: 'warn', label: '12h 03m' },
    status: 'pending',
    title: '제품 3D 컨피규레이터 — 모바일 60fps 가능한가요?',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '익', name: '익명' },
    category: 'ad-visuals',
    createdAbsolute: '5/4 15:30',
    createdRelative: '2일 전',
    excerpt: '🔒 비밀번호로 보호된 글입니다',
    id: 'Q-2600',
    org: '',
    private: true,
    sla: { kind: 'overdue', label: '−12h 잘림' },
    status: 'pending',
    title: '[비밀글] NDA 사전 검토가 필요한 캐릭터 작업',
  },
  {
    assignee: null,
    author: { initial: '정', name: '정유나' },
    category: 'data-dashboard',
    createdAbsolute: '5/4 09:14',
    createdRelative: '2일 전',
    excerpt: '운영팀 외부 출근 시 태블릿으로 검토하는 시나리오입니다.',
    id: 'Q-2599',
    org: 'Greenday',
    sla: { kind: 'overdue', label: '−18h 잘림' },
    status: 'pending',
    title: '50만 행 그리드, 모바일에서도 60fps 유지 가능한가요?',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    author: { initial: '한', name: '한지원' },
    category: 'web-app',
    createdAbsolute: '5/3 14:00',
    createdRelative: '3일 전',
    excerpt: 'Strapi와의 결정적 차이점이 무엇인가요?',
    id: 'Q-2598',
    org: 'PM @ Startup',
    sla: { kind: 'done', label: '5/3 18:32' },
    status: 'done',
    title: 'CMS 자체 개발 vs 외부 솔루션 비교',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '오', name: '오현수' },
    category: 'ad-visuals',
    createdAbsolute: '5/2 11:45',
    createdRelative: '4일 전',
    excerpt: '약사법 준수 의약품 광고에서도 사용 가능한지요?',
    id: 'Q-2597',
    org: 'Pharma Co',
    sla: { kind: 'done', label: '5/2 14:20' },
    status: 'done',
    title: 'Flux.1 Pro Commercial 라이선스 안전한가요?',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '신', name: '신유진' },
    category: 'web-3d',
    createdAbsolute: '5/1 09:20',
    createdRelative: '5일 전',
    excerpt: '향후 ROI 검토 위해 로드맵 알려주세요.',
    id: 'Q-2596',
    org: 'Studio M',
    sla: { kind: 'done', label: '5/1 12:45' },
    status: 'done',
    title: 'Web 3D 데모 환경 — 향후 로드맵 공개 예정인가요?',
  },
];

const PAGINATION_PAGES = ['1', '2', '3', '4', '5', '⋯', '13'];

export function QnaListPage() {
  useTopbar(
    () => ({
      action: (
        <button className={styles.topbarPrimary} type="button">
          <Plus aria-hidden="true" size={14} strokeWidth={2.4} />
          공지 등록
        </button>
      ),
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '인박스' },
        { label: 'Q&A 게시판' },
      ],
    }),
    [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            Q&amp;A 게시판
            <span className={styles.totalCount}>247건</span>
          </h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button">
            <Download aria-hidden="true" size={14} strokeWidth={2} />
            CSV 내보내기
          </button>
        </div>
      </header>

      <div className={styles.tabsBar} role="tablist" aria-label="답변 상태">
        {STATUS_TABS.map((tab, index) => {
          const Icon = 'icon' in tab ? tab.icon : null;
          return (
            <button
              aria-selected={index === 0}
              className={`${styles.tab} ${index === 0 ? styles.tabActive : ''}`}
              key={tab.key}
              role="tab"
              type="button"
            >
              {Icon ? <Icon aria-hidden="true" size={12} /> : null}
              <span>{tab.label}</span>
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search aria-hidden="true" className={styles.searchIcon} size={14} />
          <input
            className={styles.searchInput}
            placeholder="제목, 작성자, 카테고리로 검색"
            type="search"
          />
        </label>
        <button className={styles.filterButton} type="button">
          <CalendarDays aria-hidden="true" size={14} />
          최근 30일
          <ChevronDown aria-hidden="true" size={14} />
        </button>
        <button className={styles.filterButton} type="button">
          <SlidersHorizontal aria-hidden="true" size={14} />
          필터
        </button>
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input aria-label="전체 선택" type="checkbox" />
                </th>
                <th className={styles.statusHead}>상태</th>
                <th>카테고리</th>
                <th>제목</th>
                <th>작성자</th>
                <th>
                  작성일 <ChevronDown aria-hidden="true" size={11} strokeWidth={2.5} />
                </th>
                <th>담당자</th>
                <th>SLA</th>
                <th aria-label="action" />
              </tr>
            </thead>
            <tbody>
              {INQUIRIES.map((row) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCell}>
                    <input aria-label={`${row.id} 선택`} type="checkbox" />
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        row.status === 'done' ? styles.status_done : styles.status_pending
                      }`}
                    >
                      {row.status === 'done' ? '완료' : '대기'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.categoryBadge} ${
                        styles[`cat_${row.category.replace('-', '_')}`]
                      }`}
                    >
                      {CATEGORY_LABEL[row.category]}
                    </span>
                  </td>
                  <td className={styles.titleCell}>
                    <Link className={styles.titleLink} href={ROUTES.ADMIN.QNA.DETAIL(row.id)}>
                      {row.private ? (
                        <Lock aria-hidden="true" className={styles.titleLock} size={13} />
                      ) : null}
                      <span className={styles.titleText}>{row.title}</span>
                    </Link>
                    <p className={styles.titleExcerpt}>{row.excerpt}</p>
                  </td>
                  <td>
                    <div className={styles.authorCell}>
                      <span aria-hidden="true" className={styles.avatar}>
                        {row.author.initial}
                      </span>
                      <div className={styles.authorInfo}>
                        <strong>{row.author.name}</strong>
                        {row.org ? <span>{row.org}</span> : null}
                      </div>
                    </div>
                  </td>
                  <td className={styles.dateCell}>
                    <span>{row.createdAbsolute}</span>
                    <span className={styles.dateRelative}>{row.createdRelative}</span>
                  </td>
                  <td>
                    {row.assignee ? (
                      <div className={styles.assigneeCell}>
                        <span aria-hidden="true" className={styles.avatarSmall}>
                          {row.assignee.initial}
                        </span>
                        <span>{row.assignee.name}</span>
                      </div>
                    ) : (
                      <span className={styles.unassigned}>미할당</span>
                    )}
                  </td>
                  <td>
                    <SlaBadge sla={row.sla} />
                  </td>
                  <td className={styles.actionCell}>
                    <button aria-label="더보기" className={styles.moreButton} type="button">
                      <MoreHorizontal aria-hidden="true" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.tableFooter}>
          <div className={styles.pageSize}>
            <span>페이지당</span>
            <button className={styles.pageSizeButton} type="button">
              20개
              <ChevronDown aria-hidden="true" size={12} />
            </button>
            <span>· 1–9 / 247건</span>
          </div>
          <nav aria-label="페이지" className={styles.pagination}>
            <button aria-label="이전" className={styles.pageNav} type="button">
              ‹
            </button>
            {PAGINATION_PAGES.map((page, index) => (
              <button
                aria-current={page === '1' ? 'page' : undefined}
                className={`${styles.pageNum} ${page === '1' ? styles.pageNumActive : ''}`}
                disabled={page === '⋯'}
                key={`${page}-${index}`}
                type="button"
              >
                {page}
              </button>
            ))}
            <button aria-label="다음" className={styles.pageNav} type="button">
              ›
            </button>
          </nav>
        </footer>
      </article>
    </div>
  );
}

function SlaBadge({ sla }: { sla: { kind: SlaKey; label: string } }) {
  if (sla.kind === 'done') {
    return (
      <span className={`${styles.slaBadge} ${styles.sla_done}`}>
        <Check aria-hidden="true" size={11} strokeWidth={2.5} />
        {sla.label}
      </span>
    );
  }

  if (sla.kind === 'overdue') {
    return (
      <span className={`${styles.slaBadge} ${styles.sla_overdue}`}>
        <AlertTriangle aria-hidden="true" size={11} />
        {sla.label}
      </span>
    );
  }

  if (sla.kind === 'warn') {
    return (
      <span className={`${styles.slaBadge} ${styles.sla_warn}`}>
        <Timer aria-hidden="true" size={11} />
        {sla.label}
      </span>
    );
  }

  return (
    <span className={`${styles.slaBadge} ${styles.sla_safe}`}>
      <Timer aria-hidden="true" size={11} />
      {sla.label}
    </span>
  );
}
