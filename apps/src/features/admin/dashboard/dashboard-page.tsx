'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  Folder,
  HelpCircle,
  type LucideIcon,
  PenLine,
  Reply,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
import { usePartnershipListQuery } from '@/hooks/admin/contact/partnership/usePartnershipQuery';
import { useQuickListQuery } from '@/hooks/admin/contact/quick/useQuickQuery';
import { useQuoteRequestListQuery } from '@/hooks/admin/contact/quote/useQuoteRequestQuery';
import { useUsersListQuery } from '@/hooks/admin/users/usersQuery';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './dashboard-page.module.css';

type DateRange = 'today' | '7d' | '30d' | 'year';
type InquiryFilter = 'all' | CategoryKey;
type StatusKey = 'pending' | 'in_progress' | 'done';
type CategoryKey = 'partnership' | 'quote' | 'general';

const DATE_RANGE_TABS: ReadonlyArray<{
  key: DateRange;
  label: string;
}> = [
  { key: 'today', label: '오늘' },
  { key: '7d', label: '7일' },
  { key: '30d', label: '30일' },
  { key: 'year', label: '연간' },
];

type KpiItem = {
  delta: { direction: 'up' | 'down'; label: string; value: string };
  icon: LucideIcon;
  label: string;
  tone: 'blue' | 'red' | 'green' | 'purple';
  value: string;
};

type DonutDatum = {
  count: number;
  fill: string;
  name: string;
  percent: string;
};

const STATUS_LABEL: Record<StatusKey, string> = {
  done: '완료',
  in_progress: '진행중',
  pending: '대기',
};

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  general: '일반',
  partnership: '제휴',
  quote: '견적',
};

const CATEGORY_LINKS: Record<CategoryKey, string> = {
  general: ROUTES.ADMIN.GENERAL_INQUIRY.ROOT,
  partnership: ROUTES.ADMIN.PARTNERSHIP.ROOT,
  quote: ROUTES.ADMIN.QUOTE_REQUEST.ROOT,
};

type InquiryRow = {
  category: CategoryKey;
  createdAt: string;
  date: string;
  href: string;
  id: number | string;
  org: string;
  requester: string;
  status: StatusKey;
  title: string;
};

type RecentUser = {
  email: string;
  initial: string;
  name: string;
  org: string;
  registered: string;
};

const QUICK_ACTIONS: ReadonlyArray<{
  href: string;
  icon: LucideIcon;
  label: string;
  tone: 'indigo' | 'pink' | 'amber' | 'cyan';
}> = [
  {
    href: ROUTES.ADMIN.NOTICE.WRITE(),
    icon: PenLine,
    label: '공지사항',
    tone: 'indigo',
  },
  {
    href: ROUTES.ADMIN.GENERAL_INQUIRY.ROOT,
    icon: Reply,
    label: '일반문의',
    tone: 'pink',
  },
  {
    href: ROUTES.ADMIN.WORK_PORTFOLIO.ROOT,
    icon: Briefcase,
    label: '포트폴리오',
    tone: 'amber',
  },
  {
    href: ROUTES.ADMIN.USERS.ROOT,
    icon: BarChart3,
    label: '사용자 관리',
    tone: 'cyan',
  },
];

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  general: '#94a3b8',
  partnership: '#a855f7',
  quote: '#03c75a',
};

const getRangeDays = (range: DateRange) => {
  if (range === 'today') return 1;
  if (range === '30d') return 30;
  if (range === 'year') return 365;
  return 7;
};

const getDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatChartLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatRelativeDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    day: 'numeric',
    month: 'short',
  });
};

const toDashboardStatus = (status: string): StatusKey => {
  if (status === 'pending') return 'pending';
  if (status === 'reviewing' || status === 'processing')
    return 'in_progress';
  return 'done';
};

const getInitial = (name: string, email: string) => {
  const source = name.trim() || email.trim();
  return source.slice(0, 1).toUpperCase() || '?';
};

const getGreetingDate = () =>
  new Date().toLocaleDateString('ko-KR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  });

const getRecentPreviewRows = (rows: InquiryRow[]) => {
  const pinnedRows = (['general', 'partnership', 'quote'] as const)
    .map((category) => rows.find((row) => row.category === category))
    .filter((row): row is InquiryRow => Boolean(row));
  const pinnedIds = new Set(pinnedRows.map((row) => row.id));
  const remainingRows = rows
    .filter((row) => !pinnedIds.has(row.id))
    .slice(0, Math.max(0, 8 - pinnedRows.length));

  return [...pinnedRows, ...remainingRows]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
    .slice(0, 8);
};

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [inquiryFilter, setInquiryFilter] =
    useState<InquiryFilter>('all');
  const { data: quicks = [] } = useQuickListQuery();
  const { data: partnerships = [] } = usePartnershipListQuery();
  const { data: quoteRequests = [] } = useQuoteRequestListQuery();
  const { data: users = [] } = useUsersListQuery();

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: 'Dashboard' },
      ],
    }),
    [],
  );

  const inquiryRows = useMemo<InquiryRow[]>(
    () =>
      [
        ...quicks.map((quick) => ({
          category: 'general' as const,
          createdAt: quick.created_at,
          date: formatRelativeDate(quick.created_at),
          href: ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(quick.id),
          id: `quick-${quick.id}`,
          org: quick.email,
          requester: quick.name,
          status: toDashboardStatus(quick.status),
          title: quick.subject || quick.content,
        })),
        ...partnerships.map((partnership) => ({
          category: 'partnership' as const,
          createdAt: partnership.created_at,
          date: formatRelativeDate(partnership.created_at),
          href: ROUTES.ADMIN.PARTNERSHIP.DETAIL(partnership.id),
          id: `partnership-${partnership.id}`,
          org: partnership.company_name,
          requester: partnership.contact_name,
          status: toDashboardStatus(partnership.status),
          title: partnership.proposal_content,
        })),
        ...quoteRequests.map((quote) => ({
          category: 'quote' as const,
          createdAt: quote.created_at,
          date: formatRelativeDate(quote.created_at),
          href: ROUTES.ADMIN.QUOTE_REQUEST.DETAIL(quote.id),
          id: `quote-${quote.id}`,
          org: quote.company_name,
          requester: quote.contact_name,
          status: toDashboardStatus(quote.status),
          title: quote.project_description,
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      ),
    [partnerships, quicks, quoteRequests],
  );

  const recentInquiries = useMemo(
    () => getRecentPreviewRows(inquiryRows),
    [inquiryRows],
  );
  const totalInquiries = inquiryRows.length;
  const pendingInquiries = inquiryRows.filter(
    (row) => row.status === 'pending',
  ).length;
  const inProgressInquiries = inquiryRows.filter(
    (row) => row.status === 'in_progress',
  ).length;

  const inquiryTabs = useMemo(
    () => [
      { count: totalInquiries, key: 'all' as const, label: '전체' },
      {
        count: inquiryRows.filter((row) => row.category === 'general')
          .length,
        key: 'general' as const,
        label: '일반',
      },
      {
        count: inquiryRows.filter(
          (row) => row.category === 'partnership',
        ).length,
        key: 'partnership' as const,
        label: '제휴',
      },
      {
        count: inquiryRows.filter((row) => row.category === 'quote')
          .length,
        key: 'quote' as const,
        label: '견적',
      },
    ],
    [inquiryRows, totalInquiries],
  );

  const donutData = useMemo<DonutDatum[]>(() => {
    const rows = [
      {
        count: inquiryRows.filter((row) => row.category === 'general')
          .length,
        fill: CATEGORY_COLORS.general,
        name: 'General',
      },
      {
        count: inquiryRows.filter(
          (row) => row.category === 'partnership',
        ).length,
        fill: CATEGORY_COLORS.partnership,
        name: 'Partnership',
      },
      {
        count: inquiryRows.filter((row) => row.category === 'quote')
          .length,
        fill: CATEGORY_COLORS.quote,
        name: 'Quote',
      },
    ];

    return rows.map((row) => ({
      ...row,
      percent:
        totalInquiries > 0
          ? `${Math.round((row.count / totalInquiries) * 100)}%`
          : '0%',
    }));
  }, [inquiryRows, totalInquiries]);

  const lineData = useMemo(() => {
    const days = getRangeDays(dateRange);
    const now = new Date();
    const buckets = Array.from(
      { length: Math.min(days, 30) },
      (_, index) => {
        const date = new Date(now);
        date.setDate(
          now.getDate() - (Math.min(days, 30) - index - 1),
        );
        const key = date.toISOString().slice(0, 10);
        return {
          date: formatChartLabel(key),
          generalInquiry: 0,
          key,
          partnership: 0,
          quote: 0,
        };
      },
    );

    const bucketMap = new Map(
      buckets.map((bucket) => [bucket.key, bucket]),
    );

    quicks.forEach((quick) => {
      const bucket = bucketMap.get(getDateKey(quick.created_at));
      if (bucket) bucket.generalInquiry += 1;
    });
    partnerships.forEach((partnership) => {
      const bucket = bucketMap.get(
        getDateKey(partnership.created_at),
      );
      if (bucket) bucket.partnership += 1;
    });
    quoteRequests.forEach((quote) => {
      const bucket = bucketMap.get(getDateKey(quote.created_at));
      if (bucket) bucket.quote += 1;
    });

    return buckets;
  }, [dateRange, partnerships, quicks, quoteRequests]);

  const chartMaxValue = useMemo(() => {
    const maxValue = Math.max(
      0,
      ...lineData.flatMap((row) => [
        row.generalInquiry,
        row.partnership,
        row.quote,
      ]),
    );

    return Math.max(4, Math.ceil(maxValue / 4) * 4);
  }, [lineData]);

  const chartTicks = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) =>
        Math.round((chartMaxValue / 4) * index),
      ),
    [chartMaxValue],
  );

  const chartDonutData = useMemo(
    () =>
      totalInquiries > 0
        ? donutData
        : [
            {
              count: 1,
              fill: '#e5eaf0',
              name: 'Empty',
              percent: '0%',
            },
          ],
    [donutData, totalInquiries],
  );

  const recentUsers = useMemo<RecentUser[]>(
    () =>
      [...users]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        )
        .slice(0, 5)
        .map((user) => ({
          email: user.email,
          initial: getInitial(user.name, user.email),
          name: user.name || user.email,
          org: user.role,
          registered: formatRelativeDate(user.created_at),
        })),
    [users],
  );

  const kpis = useMemo<KpiItem[]>(
    () => [
      {
        delta: { direction: 'up', label: '전체 누적', value: 'Live' },
        icon: HelpCircle,
        label: '전체 문의',
        tone: 'blue',
        value: totalInquiries.toLocaleString(),
      },
      {
        delta: {
          direction: 'down',
          label: '처리 필요',
          value: 'Now',
        },
        icon: TrendingUp,
        label: '미답변 문의',
        tone: 'red',
        value: pendingInquiries.toLocaleString(),
      },
      {
        delta: { direction: 'up', label: '등록 계정', value: 'Live' },
        icon: UserPlus,
        label: '관리자 사용자',
        tone: 'green',
        value: users.length.toLocaleString(),
      },
      {
        delta: {
          direction: 'up',
          label: '검토/처리중',
          value: 'Live',
        },
        icon: Folder,
        label: '진행중 문의',
        tone: 'purple',
        value: inProgressInquiries.toLocaleString(),
      },
    ],
    [
      inProgressInquiries,
      pendingInquiries,
      totalInquiries,
      users.length,
    ],
  );

  const filteredInquiries =
    inquiryFilter === 'all'
      ? recentInquiries
      : inquiryRows
          .filter((row) => row.category === inquiryFilter)
          .slice(0, 8);
  const inquiryViewAllHref =
    inquiryFilter === 'all' ? null : CATEGORY_LINKS[inquiryFilter];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>대시보드</h1>
          <p className={styles.greeting}>
            {getGreetingDate()} · 오늘의 운영 현황을 확인하세요
          </p>
        </div>

        <div
          className={styles.dateFilter}
          role="tablist"
          aria-label="기간 선택"
        >
          {DATE_RANGE_TABS.map((tab) => (
            <button
              aria-selected={dateRange === tab.key}
              className={`${styles.dateTab} ${
                dateRange === tab.key ? styles.dateTabActive : ''
              }`}
              key={tab.key}
              onClick={() => setDateRange(tab.key)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <section aria-label="주요 지표" className={styles.kpiRow}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article className={styles.kpiCard} key={kpi.label}>
              <header className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <span
                  aria-hidden="true"
                  className={`${styles.kpiIcon} ${styles[`kpiIcon_${kpi.tone}`]}`}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
              </header>
              <strong className={styles.kpiValue}>{kpi.value}</strong>
              <div className={styles.kpiDelta}>
                <span
                  className={`${styles.deltaBadge} ${
                    kpi.delta.direction === 'up'
                      ? styles.deltaUp
                      : styles.deltaDown
                  }`}
                >
                  {kpi.delta.direction === 'up' ? (
                    <ArrowUpRight
                      aria-hidden="true"
                      size={12}
                      strokeWidth={2.5}
                    />
                  ) : (
                    <ArrowDownRight
                      aria-hidden="true"
                      size={12}
                      strokeWidth={2.5}
                    />
                  )}
                  {kpi.delta.value}
                </span>
                <span className={styles.deltaLabel}>
                  {kpi.delta.label}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.chartRow}>
        <article className={styles.chartCard}>
          <header className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>문의 추이</h2>
              <p className={styles.cardSubtitle}>
                선택한 기간의 카테고리별 문의 접수 현황
              </p>
            </div>
            <ul className={styles.legend}>
              {[
                { color: CATEGORY_COLORS.general, label: 'General' },
                { color: '#a855f7', label: 'Partnership' },
                { color: '#03c75a', label: 'Quote' },
              ].map((item) => (
                <li className={styles.legendItem} key={item.label}>
                  <span
                    aria-hidden="true"
                    className={styles.legendDot}
                    style={{ background: item.color }}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </header>
          <div className={styles.chartArea}>
            <ResponsiveContainer height={260} width="100%">
              <LineChart
                data={lineData}
                margin={{ bottom: 8, left: -10, right: 12, top: 8 }}
              >
                <CartesianGrid
                  stroke="#eef0f4"
                  strokeDasharray="0"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  fontSize={12}
                  stroke="#94a3b8"
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  allowDecimals={false}
                  domain={[0, chartMaxValue]}
                  fontSize={12}
                  stroke="#94a3b8"
                  tickLine={false}
                  ticks={chartTicks}
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e8eef2',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="generalInquiry"
                  dot={{ r: 4, strokeWidth: 0 }}
                  name="General"
                  stroke={CATEGORY_COLORS.general}
                  strokeWidth={2.5}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="partnership"
                  dot={{ r: 4, strokeWidth: 0 }}
                  name="Partnership"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  type="monotone"
                />
                <Line
                  activeDot={{ r: 5 }}
                  dataKey="quote"
                  dot={{ r: 4, strokeWidth: 0 }}
                  name="Quote"
                  stroke="#03c75a"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.chartCardSecondary}>
          <header className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>카테고리별 분포</h2>
              <p className={styles.cardSubtitle}>
                전체 {totalInquiries.toLocaleString()}건
              </p>
            </div>
          </header>
          <div className={styles.donutBody}>
            <div className={styles.donutWrap}>
              <ResponsiveContainer height={200} width={200}>
                <PieChart>
                  <Pie
                    data={chartDonutData}
                    dataKey="count"
                    endAngle={-270}
                    innerRadius={64}
                    outerRadius={92}
                    paddingAngle={2}
                    startAngle={90}
                    stroke="none"
                  >
                    {chartDonutData.map((entry) => (
                      <Cell fill={entry.fill} key={entry.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutCenter}>
                <strong>{totalInquiries.toLocaleString()}</strong>
                <span>Total</span>
              </div>
            </div>
            <ul className={styles.donutLegend}>
              {donutData.map((entry) => (
                <li
                  className={styles.donutLegendRow}
                  key={entry.name}
                >
                  <span
                    aria-hidden="true"
                    className={styles.donutDot}
                    style={{ background: entry.fill }}
                  />
                  <div className={styles.donutLegendCol}>
                    <span className={styles.donutLegendName}>
                      {entry.name}
                    </span>
                    <span className={styles.donutLegendCount}>
                      {entry.count}건
                    </span>
                  </div>
                  <span
                    className={styles.donutDash}
                    aria-hidden="true"
                  />
                  <span className={styles.donutPercent}>
                    {entry.percent}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className={styles.bottomRow}>
        <article className={styles.tableCard}>
          <header className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>최근 문의</h2>
              <p className={styles.cardSubtitle}>
                답변 대기중인 문의를 확인하고 처리하세요
              </p>
            </div>
            <div className={styles.tableTabs} role="tablist">
              {inquiryTabs.map((tab) => (
                <button
                  aria-selected={inquiryFilter === tab.key}
                  className={`${styles.tableTab} ${
                    inquiryFilter === tab.key
                      ? styles.tableTabActive
                      : ''
                  }`}
                  key={tab.key}
                  onClick={() => setInquiryFilter(tab.key)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  <span className={styles.tableTabCount}>
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          </header>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>CATEGORY</th>
                  <th>TITLE</th>
                  <th>REQUESTER</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th aria-label="action" />
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span
                        className={`${styles.categoryBadge} ${
                          styles[`category_${row.category}`]
                        }`}
                      >
                        {CATEGORY_LABEL[row.category]}
                      </span>
                    </td>
                    <td
                      className={styles.titleCell}
                      title={row.title}
                    >
                      {row.title}
                    </td>
                    <td>
                      <div className={styles.requesterCell}>
                        <strong>{row.requester}</strong>
                        <span>{row.org}</span>
                      </div>
                    </td>
                    <td className={styles.dateCell}>{row.date}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[`status_${row.status}`]
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={styles.statusDot}
                        />
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <Link
                        className={styles.detailButton}
                        href={row.href}
                      >
                        상세보기
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td className={styles.emptyCell} colSpan={6}>
                      표시할 문의가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <footer className={styles.tableFooter}>
            <span>
              전체 {totalInquiries.toLocaleString()}건 중{' '}
              {filteredInquiries.length}건 표시
            </span>
            {inquiryViewAllHref ? (
              <Link
                className={styles.viewAllButton}
                href={inquiryViewAllHref}
              >
                전체보기
                <ArrowRight aria-hidden="true" size={14} />
              </Link>
            ) : null}
          </footer>
        </article>

        <div className={styles.rightCol}>
          <article className={styles.usersCard}>
            <header className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>신규 가입자</h2>
                <p className={styles.cardSubtitle}>
                  최근 24시간 내 가입한 사용자
                </p>
              </div>
            </header>
            <ul className={styles.userList}>
              {recentUsers.map((user) => (
                <li className={styles.userRow} key={user.email}>
                  <span
                    aria-hidden="true"
                    className={styles.userAvatar}
                  >
                    {user.initial}
                  </span>
                  <div className={styles.userInfo}>
                    <p className={styles.userTopRow}>
                      <strong>{user.name}</strong>
                      <span aria-hidden="true">·</span>
                      <span className={styles.userOrg}>
                        {user.org}
                      </span>
                    </p>
                    <p className={styles.userEmail}>{user.email}</p>
                  </div>
                  <span className={styles.userTime}>
                    {user.registered}
                  </span>
                </li>
              ))}
              {recentUsers.length === 0 ? (
                <li className={styles.userEmpty}>
                  등록된 사용자가 없습니다.
                </li>
              ) : null}
            </ul>
          </article>

          <article className={styles.quickCard}>
            <header className={styles.quickHeader}>
              <h2 className={styles.quickTitle}>빠른 작업</h2>
              <span className={styles.shortcutHint}>⌘ K</span>
            </header>
            <ul className={styles.quickGrid}>
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.label}>
                    <Link
                      className={styles.quickItem}
                      href={action.href}
                    >
                      <span
                        aria-hidden="true"
                        className={`${styles.quickIcon} ${
                          styles[`quickIcon_${action.tone}`]
                        }`}
                      >
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      <span className={styles.quickLabel}>
                        {action.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
