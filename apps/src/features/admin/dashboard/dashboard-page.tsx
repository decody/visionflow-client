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
  MoreHorizontal,
  PenLine,
  Reply,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
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
type InquiryFilter = 'all' | 'qna' | 'partnership' | 'quote';
type StatusKey = 'pending' | 'in_progress' | 'done';
type CategoryKey = 'qna' | 'partnership' | 'quote' | 'general';

const DATE_RANGE_TABS: ReadonlyArray<{ key: DateRange; label: string }> = [
  { key: 'today', label: '오늘' },
  { key: '7d', label: '7일' },
  { key: '30d', label: '30일' },
  { key: 'year', label: '연간' },
];

const KPIS: ReadonlyArray<{
  delta: { direction: 'up' | 'down'; label: string; value: string };
  icon: LucideIcon;
  label: string;
  tone: 'blue' | 'red' | 'green' | 'purple';
  value: string;
}> = [
  {
    delta: { direction: 'up', label: '지난주 대비', value: '12.5%' },
    icon: HelpCircle,
    label: '전체 문의',
    tone: 'blue',
    value: '1,284',
  },
  {
    delta: { direction: 'down', label: '지난주 대비', value: '8.2%' },
    icon: TrendingUp,
    label: '미답변 문의',
    tone: 'red',
    value: '28',
  },
  {
    delta: { direction: 'up', label: '지난주 대비', value: '23.4%' },
    icon: UserPlus,
    label: '신규 사용자',
    tone: 'green',
    value: '342',
  },
  {
    delta: { direction: 'up', label: '지난주 대비', value: '4.0%' },
    icon: Folder,
    label: '진행중 프로젝트',
    tone: 'purple',
    value: '17',
  },
];

const LINE_DATA = [
  { date: '5/4', generalInquiry: 60, partnership: 80, qna: 120, quote: 40 },
  { date: '5/5', generalInquiry: 75, partnership: 90, qna: 140, quote: 50 },
  { date: '5/6', generalInquiry: 70, partnership: 85, qna: 130, quote: 55 },
  { date: '5/7', generalInquiry: 90, partnership: 100, qna: 160, quote: 50 },
  { date: '5/8', generalInquiry: 95, partnership: 110, qna: 180, quote: 55 },
  { date: '5/9', generalInquiry: 85, partnership: 105, qna: 160, quote: 60 },
  { date: '5/10', generalInquiry: 100, partnership: 125, qna: 200, quote: 50 },
];

const DONUT_DATA: ReadonlyArray<{
  count: number;
  fill: string;
  name: string;
  percent: string;
}> = [
  { count: 539, fill: '#004fff', name: 'Q&A', percent: '42%' },
  { count: 359, fill: '#a855f7', name: 'Partnership', percent: '28%' },
  { count: 231, fill: '#03c75a', name: 'Quote', percent: '18%' },
  { count: 155, fill: '#94a3b8', name: 'General', percent: '12%' },
];

const TOTAL_INQUIRIES = 28;

const INQUIRY_TABS: ReadonlyArray<{ count: number; key: InquiryFilter; label: string }> = [
  { count: TOTAL_INQUIRIES, key: 'all', label: '전체' },
  { count: 12, key: 'qna', label: 'Q&A' },
  { count: 5, key: 'partnership', label: 'Partnership' },
  { count: 3, key: 'quote', label: 'Quote' },
];

const STATUS_LABEL: Record<StatusKey, string> = {
  done: '완료',
  in_progress: '진행중',
  pending: '대기',
};

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  general: 'General',
  partnership: 'Partnership',
  qna: 'Q&A',
  quote: 'Quote',
};

const INQUIRIES: ReadonlyArray<{
  category: CategoryKey;
  date: string;
  id: number;
  org: string;
  requester: string;
  status: StatusKey;
  title: string;
}> = [
  {
    category: 'qna',
    date: '5분 전',
    id: 1,
    org: '삼성전자',
    requester: '김상훈',
    status: 'pending',
    title: '3D 컨피규레이터 도입 비용 문의',
  },
  {
    category: 'partnership',
    date: '32분 전',
    id: 2,
    org: 'LG디스플레이',
    requester: '이지영',
    status: 'in_progress',
    title: 'AI 비전 솔루션 협업 제안',
  },
  {
    category: 'quote',
    date: '2시간 전',
    id: 3,
    org: '스타트업 A',
    requester: '박민수',
    status: 'pending',
    title: '랜딩페이지 + 백엔드 구축 견적',
  },
  {
    category: 'qna',
    date: '4시간 전',
    id: 4,
    org: 'Hyundai Motors',
    requester: 'Sarah Kim',
    status: 'done',
    title: 'Web 3D 서비스 데모 요청',
  },
  {
    category: 'general',
    date: '어제',
    id: 5,
    org: '개인',
    requester: '최예진',
    status: 'done',
    title: '채용 관련 일반 문의',
  },
  {
    category: 'partnership',
    date: '어제',
    id: 6,
    org: 'Naver Cloud',
    requester: 'Daniel Lee',
    status: 'in_progress',
    title: '리브랜딩 프로젝트 미팅 요청',
  },
];

const RECENT_USERS: ReadonlyArray<{
  email: string;
  initial: string;
  name: string;
  org: string;
  registered: string;
}> = [
  {
    email: 'sumin@example.com',
    initial: '정',
    name: '정수민',
    org: '카카오엔터프라이즈',
    registered: '방금 전',
  },
  {
    email: 'mike.c@globaltech.io',
    initial: 'M',
    name: 'Mike Chen',
    org: 'GlobalTech',
    registered: '12분 전',
  },
  {
    email: 'jaeho.y@startup.kr',
    initial: '윤',
    name: '윤재호',
    org: 'Startup B',
    registered: '1시간 전',
  },
  {
    email: 'lina@design.studio',
    initial: 'L',
    name: 'Lina Park',
    org: 'Design Studio',
    registered: '3시간 전',
  },
  {
    email: 'jinho@toss.im',
    initial: '박',
    name: '박진호',
    org: 'Toss',
    registered: '5시간 전',
  },
];

const QUICK_ACTIONS: ReadonlyArray<{
  icon: LucideIcon;
  label: string;
  tone: 'indigo' | 'pink' | 'amber' | 'cyan';
}> = [
  { icon: PenLine, label: '새 글 작성', tone: 'indigo' },
  { icon: Reply, label: '답변 작성', tone: 'pink' },
  { icon: Briefcase, label: '포트폴리오', tone: 'amber' },
  { icon: BarChart3, label: '통계 보기', tone: 'cyan' },
];

export function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [inquiryFilter, setInquiryFilter] = useState<InquiryFilter>('all');

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: 'Dashboard' },
      ],
    }),
    [],
  );

  const filteredInquiries =
    inquiryFilter === 'all'
      ? INQUIRIES
      : INQUIRIES.filter((row) => row.category === inquiryFilter);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>대시보드</h1>
          <p className={styles.greeting}>
            2026년 5월 10일 일요일 · 안녕하세요, Admin Kim님 <span aria-hidden="true">👋</span>
          </p>
        </div>

        <div className={styles.dateFilter} role="tablist" aria-label="기간 선택">
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
                  <Icon size={18} strokeWidth={2} />
                </span>
              </header>
              <strong className={styles.kpiValue}>{kpi.value}</strong>
              <div className={styles.kpiDelta}>
                <span
                  className={`${styles.deltaBadge} ${
                    kpi.delta.direction === 'up' ? styles.deltaUp : styles.deltaDown
                  }`}
                >
                  {kpi.delta.direction === 'up' ? (
                    <ArrowUpRight aria-hidden="true" size={12} strokeWidth={2.5} />
                  ) : (
                    <ArrowDownRight aria-hidden="true" size={12} strokeWidth={2.5} />
                  )}
                  {kpi.delta.value}
                </span>
                <span className={styles.deltaLabel}>{kpi.delta.label}</span>
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
              <p className={styles.cardSubtitle}>최근 7일간 카테고리별 문의 접수 현황</p>
            </div>
            <ul className={styles.legend}>
              {[
                { color: '#004fff', label: 'Q&A' },
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
              <LineChart data={LINE_DATA} margin={{ bottom: 8, left: -10, right: 12, top: 8 }}>
                <CartesianGrid stroke="#eef0f4" strokeDasharray="0" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="date"
                  fontSize={12}
                  stroke="#94a3b8"
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  domain={[0, 200]}
                  fontSize={12}
                  stroke="#94a3b8"
                  tickLine={false}
                  ticks={[0, 50, 100, 150, 200]}
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
                  dataKey="qna"
                  dot={{ r: 4, strokeWidth: 0 }}
                  name="Q&A"
                  stroke="#004fff"
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
              <p className={styles.cardSubtitle}>전체 1,284건</p>
            </div>
          </header>
          <div className={styles.donutBody}>
            <div className={styles.donutWrap}>
              <ResponsiveContainer height={200} width={200}>
                <PieChart>
                  <Pie
                    data={[...DONUT_DATA]}
                    dataKey="count"
                    endAngle={-270}
                    innerRadius={64}
                    outerRadius={92}
                    paddingAngle={2}
                    startAngle={90}
                    stroke="none"
                  >
                    {DONUT_DATA.map((entry) => (
                      <Cell fill={entry.fill} key={entry.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.donutCenter}>
                <strong>1,284</strong>
                <span>Total</span>
              </div>
            </div>
            <ul className={styles.donutLegend}>
              {DONUT_DATA.map((entry) => (
                <li className={styles.donutLegendRow} key={entry.name}>
                  <span
                    aria-hidden="true"
                    className={styles.donutDot}
                    style={{ background: entry.fill }}
                  />
                  <div className={styles.donutLegendCol}>
                    <span className={styles.donutLegendName}>{entry.name}</span>
                    <span className={styles.donutLegendCount}>{entry.count}건</span>
                  </div>
                  <span className={styles.donutDash} aria-hidden="true" />
                  <span className={styles.donutPercent}>{entry.percent}</span>
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
              <p className={styles.cardSubtitle}>답변 대기중인 문의를 확인하고 처리하세요</p>
            </div>
            <div className={styles.tableTabs} role="tablist">
              {INQUIRY_TABS.map((tab) => (
                <button
                  aria-selected={inquiryFilter === tab.key}
                  className={`${styles.tableTab} ${
                    inquiryFilter === tab.key ? styles.tableTabActive : ''
                  }`}
                  key={tab.key}
                  onClick={() => setInquiryFilter(tab.key)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                  <span className={styles.tableTabCount}>({tab.count})</span>
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
                    <td className={styles.titleCell}>{row.title}</td>
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
                        <span aria-hidden="true" className={styles.statusDot} />
                        {STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className={styles.actionCell}>
                      <button className={styles.detailButton} type="button">
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className={styles.tableFooter}>
            <span>
              전체 {TOTAL_INQUIRIES}건 중 1-{filteredInquiries.length}건 표시
            </span>
            <button className={styles.viewAllButton} type="button">
              전체보기
              <ArrowRight aria-hidden="true" size={14} />
            </button>
          </footer>
        </article>

        <div className={styles.rightCol}>
          <article className={styles.usersCard}>
            <header className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>신규 가입자</h2>
                <p className={styles.cardSubtitle}>최근 24시간 내 가입한 사용자</p>
              </div>
              <button aria-label="더보기" className={styles.moreButton} type="button">
                <MoreHorizontal aria-hidden="true" size={16} />
              </button>
            </header>
            <ul className={styles.userList}>
              {RECENT_USERS.map((user) => (
                <li className={styles.userRow} key={user.email}>
                  <span aria-hidden="true" className={styles.userAvatar}>
                    {user.initial}
                  </span>
                  <div className={styles.userInfo}>
                    <p className={styles.userTopRow}>
                      <strong>{user.name}</strong>
                      <span aria-hidden="true">·</span>
                      <span className={styles.userOrg}>{user.org}</span>
                    </p>
                    <p className={styles.userEmail}>{user.email}</p>
                  </div>
                  <span className={styles.userTime}>{user.registered}</span>
                </li>
              ))}
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
                    <button className={styles.quickItem} type="button">
                      <span
                        aria-hidden="true"
                        className={`${styles.quickIcon} ${
                          styles[`quickIcon_${action.tone}`]
                        }`}
                      >
                        <Icon size={18} strokeWidth={1.8} />
                      </span>
                      <span className={styles.quickLabel}>{action.label}</span>
                    </button>
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
