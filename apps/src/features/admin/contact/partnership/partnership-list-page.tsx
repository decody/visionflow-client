'use client';

import { ROUTES } from '@visionflow/routes';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Filter,
  Handshake,
  type LucideIcon,
  MoreHorizontal,
  Search,
  Timer,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { useTopbar } from '@/components/layout/topbar-context';
import styles from './partnership-list-page.module.css';

type StatusKey = 'new' | 'progress' | 'negotiating' | 'closed' | 'rejected';
type DealType = 'reseller' | 'tech' | 'content' | 'outsourcing';
type SlaKey = 'safe' | 'warn' | 'overdue' | 'done';

const KPIS: ReadonlyArray<{
  caption: string;
  delta?: { direction: 'up' | 'down'; label: string };
  icon: LucideIcon;
  label: string;
  tone: 'blue' | 'amber' | 'green' | 'gray';
  value: string;
}> = [
  {
    caption: '+2 전주 대비',
    delta: { direction: 'up', label: '+2' },
    icon: Handshake,
    label: '신규 제휴',
    tone: 'blue',
    value: '3',
  },
  {
    caption: 'Negotiating',
    icon: TrendingUp,
    label: '진행 중',
    tone: 'amber',
    value: '14',
  },
  {
    caption: '체결률 21%',
    delta: { direction: 'up', label: '↑' },
    icon: Check,
    label: '체결 (이번 분기)',
    tone: 'green',
    value: '7',
  },
  {
    caption: 'SLA 72h 기준',
    icon: Timer,
    label: '평균 응답',
    tone: 'gray',
    value: '14h',
  },
];

const STATUS_TABS = [
  { count: 124, key: 'all' as const, label: '전체' },
  { count: 3, key: 'new' as const, label: 'NEW' },
  { count: 14, key: 'progress' as const, label: '진행' },
  { count: 8, key: 'negotiating' as const, label: '협상' },
  { count: 67, key: 'closed' as const, label: '체결' },
  { count: 32, key: 'rejected' as const, label: '거절' },
];

const STATUS_LABEL: Record<StatusKey, string> = {
  closed: '체결',
  negotiating: '협상',
  new: 'NEW',
  progress: '진행',
  rejected: '거절',
};

const DEAL_LABEL: Record<DealType, string> = {
  content: '콘텐츠',
  outsourcing: '외주',
  reseller: '리셀러',
  tech: '기술',
};

type Row = {
  assignee: { initial: string; name: string } | null;
  contact: { initial: string; name: string; role: string };
  createdAbsolute: string;
  createdRelative: string;
  dealType: DealType;
  domain: string;
  id: string;
  org: { initial: string; name: string };
  size: string;
  sla: { kind: SlaKey; label: string };
  status: StatusKey;
};

const ROWS: ReadonlyArray<Row> = [
  {
    assignee: null,
    contact: { initial: '강', name: '강민호', role: 'Director · CSO' },
    createdAbsolute: '오늘 11:08',
    createdRelative: '6시간 전',
    dealType: 'reseller',
    domain: 'hybrid-sol.kr',
    id: 'P-1247',
    org: { initial: 'H', name: '하이브리드 솔루션즈' },
    size: '11–50인',
    sla: { kind: 'safe', label: '2d 18h' },
    status: 'new',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    contact: { initial: 'A', name: 'Alex Chen', role: 'CTO' },
    createdAbsolute: '오늘 09:32',
    createdRelative: '8시간 전',
    dealType: 'tech',
    domain: 'pixelforge.io',
    id: 'P-1246',
    org: { initial: 'P', name: 'Pixel Forge Studio' },
    size: '2–10인',
    sla: { kind: 'safe', label: '2d 16h' },
    status: 'new',
  },
  {
    assignee: null,
    contact: { initial: '윤', name: '윤지원', role: '제휴 매니저' },
    createdAbsolute: '어제 16:22',
    createdRelative: '1일 전',
    dealType: 'content',
    domain: 'mediahaus.co.kr',
    id: 'P-1245',
    org: { initial: 'M', name: 'Mediahaus Korea' },
    size: '50+인',
    sla: { kind: 'warn', label: '1d 22h' },
    status: 'new',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    contact: { initial: '박', name: '박서아', role: '대표' },
    createdAbsolute: '어제 10:15',
    createdRelative: '1일 전',
    dealType: 'outsourcing',
    domain: 'studio-k.kr',
    id: 'P-1244',
    org: { initial: 'S', name: 'Studio K' },
    size: '1인',
    sla: { kind: 'warn', label: '1d 14h' },
    status: 'progress',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    contact: { initial: 'H', name: 'Hiroshi Tanaka', role: 'BD Lead' },
    createdAbsolute: '5/4 14:50',
    createdRelative: '2일 전',
    dealType: 'reseller',
    domain: 'cloudbase.asia',
    id: 'P-1243',
    org: { initial: 'C', name: 'Cloudbase Asia' },
    size: '50+인',
    sla: { kind: 'overdue', label: '−6h 잘림' },
    status: 'progress',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    contact: { initial: '정', name: '정성훈', role: 'Founder · CTO' },
    createdAbsolute: '5/3 11:24',
    createdRelative: '3일 전',
    dealType: 'tech',
    domain: 'voltage.dev',
    id: 'P-1242',
    org: { initial: 'V', name: 'Voltage Labs' },
    size: '2–10인',
    sla: { kind: 'overdue', label: '−1d 12h' },
    status: 'negotiating',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    contact: { initial: '이', name: '이지은', role: 'COO' },
    createdAbsolute: '5/2 09:18',
    createdRelative: '4일 전',
    dealType: 'reseller',
    domain: 'northern.kr',
    id: 'P-1241',
    org: { initial: 'N', name: 'Northern Insights' },
    size: '11–50인',
    sla: { kind: 'done', label: '5/4 16:00' },
    status: 'closed',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    contact: { initial: '한', name: '한도윤', role: '제휴팀장' },
    createdAbsolute: '5/1 13:42',
    createdRelative: '5일 전',
    dealType: 'content',
    domain: 'brandstory.kr',
    id: 'P-1240',
    org: { initial: 'B', name: 'Brand Story Co.' },
    size: '11–50인',
    sla: { kind: 'done', label: '5/3 11:20' },
    status: 'closed',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    contact: { initial: '최', name: '최영호', role: 'Producer' },
    createdAbsolute: '4/29 17:05',
    createdRelative: '7일 전',
    dealType: 'outsourcing',
    domain: 'quantumvisual.io',
    id: 'P-1239',
    org: { initial: 'Q', name: 'Quantum Visual' },
    size: '1인',
    sla: { kind: 'done', label: '5/2 10:45' },
    status: 'rejected',
  },
];

const PAGINATION = ['1', '2', '3', '4', '⋯', '7'];

export function PartnershipListPage() {
  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '인박스' },
        { label: '제휴 문의' },
      ],
    }),
    [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            제휴 문의<span className={styles.totalCount}>124건</span>
          </h1>
        </div>
        <button className={styles.secondaryButton} type="button">
          <Download aria-hidden="true" size={14} />
          CSV 내보내기
        </button>
      </header>

      <section className={styles.kpiRow} aria-label="요약 지표">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article className={styles.kpiCard} key={kpi.label}>
              <header className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <span
                  aria-hidden="true"
                  className={`${styles.kpiIcon} ${styles[`kpiIcon_${kpi.tone}`]}`}
                >
                  <Icon size={16} strokeWidth={2} />
                </span>
              </header>
              <strong className={styles.kpiValue}>{kpi.value}</strong>
              <p className={styles.kpiCaption}>
                {kpi.delta ? (
                  <span
                    className={`${styles.kpiDelta} ${
                      kpi.delta.direction === 'up' ? styles.deltaUp : ''
                    }`}
                  >
                    ↑
                  </span>
                ) : null}
                {kpi.caption}
              </p>
            </article>
          );
        })}
      </section>

      <div className={styles.tabsBar} role="tablist" aria-label="상태 필터">
        {STATUS_TABS.map((tab, index) => (
          <button
            aria-selected={index === 0}
            className={`${styles.tab} ${index === 0 ? styles.tabActive : ''}`}
            key={tab.key}
            role="tab"
            type="button"
          >
            <span>{tab.label}</span>
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search aria-hidden="true" className={styles.searchIcon} size={14} />
          <input
            className={styles.searchInput}
            placeholder="회사명, 담당자, 제휴 유형 검색"
            type="search"
          />
        </label>
        <button className={styles.filterButton} type="button">
          <Filter aria-hidden="true" size={14} />
          제휴 유형
          <ChevronDown aria-hidden="true" size={14} />
        </button>
        <button className={styles.filterButton} type="button">
          <CalendarDays aria-hidden="true" size={14} />
          최근 30일
          <ChevronDown aria-hidden="true" size={14} />
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
                <th>상태</th>
                <th>제휴 유형</th>
                <th>회사</th>
                <th>담당자</th>
                <th>회사 규모</th>
                <th>
                  접수일 <ChevronDown aria-hidden="true" size={11} strokeWidth={2.5} />
                </th>
                <th>담당</th>
                <th>SLA (3일)</th>
                <th aria-label="action" />
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.id}>
                  <td className={styles.checkboxCell}>
                    <input aria-label={`${row.id} 선택`} type="checkbox" />
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[`status_${row.status}`]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.dealBadge} ${styles[`deal_${row.dealType}`]}`}
                    >
                      {DEAL_LABEL[row.dealType]}
                    </span>
                  </td>
                  <td>
                    <Link
                      className={styles.companyCell}
                      href={ROUTES.ADMIN.PARTNERSHIP.DETAIL(row.id)}
                    >
                      <span aria-hidden="true" className={styles.companyAvatar}>
                        {row.org.initial}
                      </span>
                      <span className={styles.companyInfo}>
                        <strong>{row.org.name}</strong>
                        <span>{row.domain}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <div className={styles.contactCell}>
                      <span aria-hidden="true" className={styles.contactAvatar}>
                        {row.contact.initial}
                      </span>
                      <div>
                        <strong>{row.contact.name}</strong>
                        <span>{row.contact.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className={styles.sizeCell}>{row.size}</td>
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
            <span>· 1–9 / 124건</span>
          </div>
          <nav aria-label="페이지" className={styles.pagination}>
            <button aria-label="이전" className={styles.pageNav} type="button">
              ‹
            </button>
            {PAGINATION.map((page, index) => (
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
