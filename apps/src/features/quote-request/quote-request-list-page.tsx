'use client';

import { ROUTES } from '@visionflow/routes';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Columns3,
  Download,
  Layers,
  MoreHorizontal,
  Search,
  Timer,
} from 'lucide-react';
import Link from 'next/link';

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './quote-request-list-page.module.css';

type StatusKey = 'new' | 'review' | 'sent' | 'negotiating' | 'won' | 'rejected';
type ServiceKey = 'ad-visuals' | 'web-3d' | 'data-dashboard' | 'web-app';
type SlaKey = 'safe' | 'warn' | 'overdue' | 'sent';
type BudgetKind = 'range' | 'confirmed';

type KpiTone = 'red' | 'amber' | 'blue' | 'purple' | 'green';

const KPIS: ReadonlyArray<{
  caption: string;
  delta?: 'up' | 'warn';
  highlight?: boolean;
  label: string;
  tone: KpiTone;
  value: string;
}> = [
  {
    caption: 'SLA 24h 임박',
    delta: 'warn',
    label: 'NEW · 미할당',
    tone: 'red',
    value: '4',
  },
  {
    caption: '+3 전주 대비',
    delta: 'up',
    label: '검토중',
    tone: 'amber',
    value: '8',
  },
  {
    caption: '평균 ₩580만',
    label: '견적 전달',
    tone: 'blue',
    value: '14',
  },
  {
    caption: '체결 임박 3건',
    delta: 'up',
    label: '협상중',
    tone: 'purple',
    value: '6',
  },
  {
    caption: '+22% MoM',
    delta: 'up',
    highlight: true,
    label: '이번 달 수주',
    tone: 'green',
    value: '₩78M',
  },
];

const STATUS_TABS = [
  { count: 342, key: 'all' as const, label: '전체' },
  { count: 4, key: 'new' as const, label: 'NEW', tone: 'red' as const },
  { count: 8, key: 'review' as const, label: '검토', tone: 'amber' as const },
  { count: 14, key: 'sent' as const, label: '견적 전달', tone: 'blue' as const },
  { count: 6, key: 'negotiating' as const, label: '협상', tone: 'purple' as const },
  { count: 180, key: 'won' as const, label: '수주', tone: 'green' as const },
  { count: 130, key: 'rejected' as const, label: '거절', tone: 'gray' as const },
];

const STATUS_LABEL: Record<StatusKey, string> = {
  negotiating: '협상',
  new: 'NEW',
  rejected: '거절',
  review: '검토',
  sent: '전달',
  won: '수주',
};

const SERVICE_LABEL: Record<ServiceKey, string> = {
  'ad-visuals': '광고 이미지',
  'data-dashboard': '데이터 대시보드',
  'web-3d': '웹 3D',
  'web-app': '웹·앱 개발',
};

type Row = {
  assignee: { initial: string; name: string } | null;
  budget: { kind: BudgetKind; value: string };
  contact: { initial: string; name: string; role: string };
  createdAbsolute: string;
  createdRelative: string;
  duration: string;
  id: string;
  org: { domain: string; initial: string; name: string };
  service: ServiceKey;
  sla: { kind: SlaKey; label?: string; sentAt?: string };
  status: StatusKey;
};

const ROWS: ReadonlyArray<Row> = [
  {
    assignee: null,
    budget: { kind: 'range', value: '₩500–800만' },
    contact: { initial: '윤', name: '윤서연', role: 'CMO' },
    createdAbsolute: '오늘 14:32',
    createdRelative: '3시간 전',
    duration: '6주',
    id: 'Q-2891',
    org: { domain: 'sl-cosmetics.com', initial: '에', name: '에스엘 코스메틱' },
    service: 'ad-visuals',
    sla: { kind: 'safe', label: '20h 28m' },
    status: 'new',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    budget: { kind: 'range', value: '₩2,000–3,500만' },
    contact: { initial: '이', name: '이수민', role: 'Product Lead' },
    createdAbsolute: '오늘 10:15',
    createdRelative: '7시간 전',
    duration: '12주',
    id: 'Q-2890',
    org: { domain: 'furnico.kr', initial: 'F', name: 'Furnico Living' },
    service: 'web-3d',
    sla: { kind: 'safe', label: '17h 22m' },
    status: 'new',
  },
  {
    assignee: null,
    budget: { kind: 'range', value: '₩1,500–2,200만' },
    contact: { initial: '정', name: '정유나', role: 'CTO' },
    createdAbsolute: '어제 16:48',
    createdRelative: '1일 전',
    duration: '8주',
    id: 'Q-2889',
    org: { domain: 'greenday.co.kr', initial: 'G', name: 'Greenday Logistics' },
    service: 'data-dashboard',
    sla: { kind: 'warn', label: '4h 12m' },
    status: 'new',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    budget: { kind: 'range', value: '₩4,500–6,000만' },
    contact: { initial: '박', name: '박지훈', role: 'CTO' },
    createdAbsolute: '어제 10:22',
    createdRelative: '1일 전',
    duration: '16주',
    id: 'Q-2888',
    org: { domain: 'techco.kr', initial: 'T', name: 'TechCo Korea' },
    service: 'web-app',
    sla: { kind: 'overdue', label: '−2h 잘림' },
    status: 'review',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    budget: { kind: 'range', value: '₩300–500만' },
    contact: { initial: '오', name: '오현수', role: 'Brand Director' },
    createdAbsolute: '5/4 11:24',
    createdRelative: '2일 전',
    duration: '4주',
    id: 'Q-2887',
    org: { domain: 'pharma-co.kr', initial: 'P', name: 'Pharma Co' },
    service: 'ad-visuals',
    sla: { kind: 'overdue', label: '−1d 6h' },
    status: 'review',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    budget: { kind: 'confirmed', value: '₩2,800만' },
    contact: { initial: '이', name: '이지은', role: 'COO' },
    createdAbsolute: '5/3 14:00',
    createdRelative: '3일 전',
    duration: '10주',
    id: 'Q-2886',
    org: { domain: 'northern.kr', initial: 'N', name: 'Northern Insights' },
    service: 'data-dashboard',
    sla: { kind: 'sent', sentAt: '5/3 18:32' },
    status: 'sent',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    budget: { kind: 'confirmed', value: '₩3,200만' },
    contact: { initial: '신', name: '신유진', role: 'Founder' },
    createdAbsolute: '5/2 09:20',
    createdRelative: '4일 전',
    duration: '14주',
    id: 'Q-2885',
    org: { domain: 'studio-m.io', initial: 'S', name: 'Studio M' },
    service: 'web-3d',
    sla: { kind: 'sent', sentAt: '5/2 15:48' },
    status: 'negotiating',
  },
  {
    assignee: { initial: '김', name: '김민지' },
    budget: { kind: 'confirmed', value: '₩5,800만' },
    contact: { initial: '한', name: '한도윤', role: 'PM' },
    createdAbsolute: '5/1 13:42',
    createdRelative: '5일 전',
    duration: '18주',
    id: 'Q-2884',
    org: { domain: 'brandstory.kr', initial: 'B', name: 'Brand Story Co.' },
    service: 'web-app',
    sla: { kind: 'sent', sentAt: '5/4 11:20' },
    status: 'won',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    budget: { kind: 'range', value: '₩200만' },
    contact: { initial: '최', name: '최영호', role: 'Producer' },
    createdAbsolute: '4/29 17:05',
    createdRelative: '7일 전',
    duration: '2주',
    id: 'Q-2883',
    org: { domain: 'quantumvisual.io', initial: 'Q', name: 'Quantum Visual' },
    service: 'ad-visuals',
    sla: { kind: 'sent', sentAt: '5/2 10:45' },
    status: 'rejected',
  },
];

const PAGINATION = ['1', '2', '3', '4', '5', '⋯', '18'];

export function QuoteRequestListPage() {
  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '인박스' },
        { label: '견적 문의' },
      ],
    }),
    [],
  );

  return (
    <div className={styles.page}>
      <section aria-label="요약 지표" className={styles.kpiRow}>
        {KPIS.map((kpi) => (
          <article
            className={`${styles.kpiCard} ${kpi.highlight ? styles.kpiCardHighlight : ''}`}
            key={kpi.label}
          >
            <header className={styles.kpiTop}>
              <span className={`${styles.kpiLabel} ${styles[`kpiLabel_${kpi.tone}`]}`}>
                {kpi.label}
              </span>
              {kpi.delta === 'up' ? (
                <span className={styles.kpiArrowUp} aria-hidden="true">
                  ↑
                </span>
              ) : kpi.delta === 'warn' ? (
                <AlertTriangle aria-hidden="true" className={styles.kpiArrowWarn} size={12} />
              ) : null}
            </header>
            <div className={styles.kpiValueRow}>
              <strong className={styles.kpiValue}>{kpi.value}</strong>
              <span className={styles.kpiCaption}>{kpi.caption}</span>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.titleRow}>
        <h1 className={styles.pageTitle}>
          견적 문의<span className={styles.totalCount}>342건</span>
        </h1>
        <div className={styles.viewControls}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${styles.viewBtnActive}`} type="button">
              <Columns3 aria-hidden="true" size={14} />
              테이블
            </button>
            <button className={styles.viewBtn} type="button">
              <Layers aria-hidden="true" size={14} />
              칸반
            </button>
          </div>
          <button className={styles.secondaryButton} type="button">
            <Download aria-hidden="true" size={14} />
            CSV 내보내기
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.tabsBar} role="tablist" aria-label="상태">
          {STATUS_TABS.map((tab, index) => (
            <button
              aria-selected={index === 0}
              className={`${styles.tab} ${index === 0 ? styles.tabActive : ''}`}
              key={tab.key}
              role="tab"
              type="button"
            >
              {'tone' in tab && tab.tone ? (
                <span
                  aria-hidden="true"
                  className={`${styles.tabDot} ${styles[`tabDot_${tab.tone}`]}`}
                />
              ) : null}
              <span>{tab.label}</span>
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>
        <label className={styles.searchField}>
          <Search aria-hidden="true" className={styles.searchIcon} size={14} />
          <input
            className={styles.searchInput}
            placeholder="회사명, 담당자, 서비스로 검색"
            type="search"
          />
        </label>
        <button className={styles.filterButton} type="button">
          <Layers aria-hidden="true" size={14} />
          서비스 (4)
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
                <th>서비스</th>
                <th>회사</th>
                <th>담당자</th>
                <th>예산</th>
                <th>일정</th>
                <th>
                  접수일 <ChevronDown aria-hidden="true" size={11} strokeWidth={2.5} />
                </th>
                <th>담당</th>
                <th>SLA (24h)</th>
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
                      className={`${styles.statusBadge} ${
                        styles[`status_${row.status}`]
                      }`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.serviceBadge} ${
                        styles[`svc_${row.service.replace('-', '_')}`]
                      }`}
                    >
                      {SERVICE_LABEL[row.service]}
                    </span>
                  </td>
                  <td>
                    <Link
                      className={styles.companyCell}
                      href={ROUTES.ADMIN.QUOTE_REQUEST.DETAIL(row.id)}
                    >
                      <span aria-hidden="true" className={styles.companyAvatar}>
                        {row.org.initial}
                      </span>
                      <span className={styles.companyInfo}>
                        <strong>{row.org.name}</strong>
                        <span>{row.org.domain}</span>
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
                  <td className={styles.budgetCell}>
                    <strong>{row.budget.value}</strong>
                    {row.budget.kind === 'confirmed' ? (
                      <span className={styles.budgetConfirmed}>
                        <Check aria-hidden="true" size={10} strokeWidth={3} />
                        확정
                      </span>
                    ) : (
                      <span className={styles.budgetRange}>범위 추정</span>
                    )}
                  </td>
                  <td>
                    <span className={styles.durationPill}>
                      <Timer aria-hidden="true" size={11} />
                      {row.duration}
                    </span>
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
            <span>· 1–9 / 342건</span>
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

function SlaBadge({ sla }: { sla: { kind: SlaKey; label?: string; sentAt?: string } }) {
  if (sla.kind === 'sent') {
    return (
      <span className={styles.slaSent}>
        <span className={styles.slaSentTop}>
          <Check aria-hidden="true" size={10} strokeWidth={3} />
          전달
        </span>
        <span className={styles.slaSentTime}>{sla.sentAt}</span>
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
    <span className={`${styles.slaBadge} ${styles.sla_safe}`}>{sla.label}</span>
  );
}
