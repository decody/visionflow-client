'use client';
import { ROUTES } from '@visionflow/routes';
import { AlertTriangle, BarChart3, Briefcase, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, LayoutGrid, List, MoreHorizontal, Plus, Star, } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTopbar } from '../../components/layout/topbar-context';
import styles from './work-portfolio-list-page.module.css';
const WORK_CASES = [
    {
        author: { initials: 'KJ', name: '김진자' },
        category: '광고 이미지',
        categoryKey: 'ad',
        client: '에스엘 코스메틱',
        id: '1',
        publishDate: '5/14 예정',
        slug: '/work/brand-15-season-campaign',
        starred: true,
        status: 'draft',
        thumbColor: '#fce7f3',
        title: 'Brand 1.5 — 시즌 캠페인 광고 이미지',
        version: 'v3',
        year: 2026,
    },
    {
        author: { color: 'green', initials: 'PS', name: '박서준' },
        category: '웹 3D',
        categoryKey: 'brand',
        client: 'Furniro Living',
        id: '2',
        publishDate: '미정',
        slug: '/work/furniro-3d-configurator',
        starred: true,
        status: 'draft',
        thumbColor: '#e2e8f0',
        title: 'Furniro 3D 컨피규레이터 — 인테리어 미리보기',
        version: 'v1',
        year: 2025,
    },
    {
        author: { initials: 'KJ', name: '김진자' },
        category: '앱 개발',
        categoryKey: 'dashboard',
        client: 'TechCo',
        id: '3',
        publishDate: '미정',
        slug: '/work/techco-admin-localization',
        starred: false,
        status: 'review',
        thumbColor: '#fef3c7',
        title: 'TechCo 어드민 — 운영 효율화',
        version: 'v2',
        year: 2025,
    },
    {
        author: { color: 'green', initials: 'JB', name: '진보람' },
        category: '데이터 대시보드',
        categoryKey: 'dashboard',
        client: 'Greenday Logis...',
        id: '4',
        publishDate: '미정',
        slug: '/work/greenday-logistics-dashboard',
        starred: false,
        status: 'review',
        thumbColor: '#dbeafe',
        title: 'Greenday 물류 대시보드',
        version: 'v4',
        year: 2025,
    },
    {
        author: { initials: 'KJ', name: '김진자' },
        category: '웹 3D',
        categoryKey: 'ad',
        client: 'Studio M',
        id: '5',
        publishDate: '5/2 발행',
        slug: '/work/studio-m-portfolio',
        starred: true,
        status: 'publish',
        thumbColor: '#ede9fe',
        title: 'Studio M — 인터랙티브 포트폴리오',
        version: 'v9 publish',
        year: 2025,
    },
    {
        author: { color: 'green', initials: 'PS', name: '박서준' },
        category: '광고 이미지',
        categoryKey: 'ad',
        client: 'Pharma Co (NDA)',
        id: '6',
        publishDate: '4/28 발행',
        slug: '/work/pharma-co-campaign',
        starred: false,
        status: 'publish',
        thumbColor: '#fce7f3',
        title: 'Pharma Co — 의약품 광고 캠페인',
        version: 'v3',
        year: 2025,
    },
    {
        author: { initials: 'KJ', name: '김진자' },
        category: '앱 개발',
        categoryKey: 'landing',
        client: 'Brand Story Co.',
        id: '7',
        publishDate: '4/22 발행',
        slug: '/work/brand-story-mobile-app',
        starred: false,
        status: 'publish',
        thumbColor: '#fef9c3',
        title: 'Brand Story Co. 모바일 앱',
        version: 'v3',
        year: 2025,
    },
    {
        author: { color: 'green', initials: 'PS', name: '박서준' },
        category: '데이터 대시보드',
        categoryKey: 'dashboard',
        client: 'Northern Insights',
        id: '8',
        publishDate: '4/15 발행',
        slug: '/work/northern-insights-bi',
        starred: false,
        status: 'publish',
        thumbColor: '#dbeafe',
        title: 'Northern Insights — BI 통합 데이터 대시보드',
        version: 'v6',
        year: 2024,
    },
    {
        author: { initials: 'KJ', name: '김진자' },
        category: '웹 3D',
        categoryKey: 'brand',
        client: 'VisionFlow 자체 IP',
        id: '9',
        publishDate: '3/28 발행',
        slug: '/work/sentry-house-self-ip',
        starred: false,
        status: 'publish',
        thumbColor: '#fef3c7',
        title: 'Sentry House — 자체 IP 케이스',
        version: 'v8',
        year: 2024,
    },
];
const STATUS_LABELS = {
    archive: '아카이브',
    draft: 'DRAFT',
    publish: '발행',
    review: '검토',
};
const STATUS_STYLE = {
    archive: styles.badgeArchive ?? '',
    draft: styles.badgeDraft ?? '',
    publish: styles.badgePublish ?? '',
    review: styles.badgeReview ?? '',
};
const CATEGORY_STYLE = {
    ad: styles.catAd ?? '',
    brand: styles.catBrand ?? '',
    dashboard: styles.catDashboard ?? '',
    landing: styles.catLanding ?? '',
};
const FILTER_TABS = [
    { count: 13, key: 'all', label: '전체' },
    { count: 4, key: 'draft', label: 'Draft' },
    { count: 2, key: 'review', label: '검토 대기' },
    { count: 7, key: 'publish', label: '발행' },
    { count: 0, key: 'archive', label: '아카이브' },
];
export function WorkPortfolioListPage() {
    const [filter, setFilter] = useState('all');
    const [view, setView] = useState('table');
    useTopbar(() => ({
        action: (<Link className={styles.createBtn} href={ROUTES.ADMIN.WORK_PORTFOLIO.CREATE}>
          <Plus size={14}/>+ 새 케이스 작성
        </Link>),
        breadcrumb: [
            { href: ROUTES.ADMIN.HOME, label: '대시보드' },
            { label: '콘텐츠' },
            { label: 'Work 케이스' },
        ],
    }), []);
    const filtered = filter === 'all' ? WORK_CASES : WORK_CASES.filter((c) => c.status === filter);
    return (<div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          Work 케이스
          <span className={styles.pageCount}>53건</span>
        </h1>
      </header>

      {/* KPI */}
      <div className={styles.kpiRow}>
        <div className={`${styles.kpiCard} ${styles.kpiAccentDraft}`}>
          <div className={styles.kpiTopRow}>
            <p className={styles.kpiLabel}>DRAFT 작업중</p>
            <span className={`${styles.kpiIconBadge} ${styles.kpiIconDraft}`}>
              <Briefcase aria-hidden="true" size={16} strokeWidth={2}/>
            </span>
          </div>
          <p className={styles.kpiValue}>4</p>
          <p className={styles.kpiSub}>오늘 작업 중 2건</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiAccentReview}`}>
          <div className={styles.kpiTopRow}>
            <p className={styles.kpiLabel}>검토 대기</p>
            <span className={`${styles.kpiIconBadge} ${styles.kpiIconReview}`}>
              <AlertTriangle aria-hidden="true" size={16} strokeWidth={2}/>
            </span>
          </div>
          <p className={styles.kpiValue}>2</p>
          <p className={`${styles.kpiSub} ${styles.kpiSubReview}`}>SuperAdmin 승인 대기</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiAccentPublish}`}>
          <div className={styles.kpiTopRow}>
            <p className={styles.kpiLabel}>리뷰 후 발행</p>
            <span className={`${styles.kpiIconBadge} ${styles.kpiIconPublish}`}>
              <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2}/>
            </span>
          </div>
          <p className={styles.kpiValue}>3</p>
          <p className={`${styles.kpiSub} ${styles.kpiSubPublish}`}>예정 5/10 · 5/12 · 5/14</p>
        </div>
        <div className={`${styles.kpiCard} ${styles.kpiAccentTotal}`}>
          <div className={styles.kpiTopRow}>
            <p className={styles.kpiLabel}>총 실행 케이스</p>
            <span className={`${styles.kpiIconBadge} ${styles.kpiIconTotal}`}>
              <BarChart3 aria-hidden="true" size={16} strokeWidth={2}/>
            </span>
          </div>
          <p className={styles.kpiValue}>47</p>
          <p className={styles.kpiSub}>평균 3.2일 생산 리드타임</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterTabs}>
          {FILTER_TABS.map((tab) => (<button className={`${styles.filterTab} ${filter === tab.key ? styles.filterTabActive : ''}`} key={tab.key} onClick={() => setFilter(tab.key)} type="button">
              {tab.label}
              <span className={styles.filterCount}>{tab.count}</span>
            </button>))}
        </div>

        <div className={styles.toolbarActions}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${view === 'table' ? styles.viewBtnActive : ''}`} onClick={() => setView('table')} type="button">
              <List size={14}/>
              테이블
            </button>
            <button className={`${styles.viewBtn} ${view === 'gallery' ? styles.viewBtnActive : ''}`} onClick={() => setView('gallery')} type="button">
              <LayoutGrid size={14}/>
              갤러리
            </button>
          </div>
          <button className={styles.actionBtn} type="button">
            <Filter size={13}/>
            필터링
          </button>
          <button className={styles.actionBtn} type="button">
            <Download size={13}/>
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input aria-label="전체 선택" type="checkbox"/>
              </th>
              <th className={styles.starCell}/>
              <th>상태</th>
              <th>케이스</th>
              <th>클라이언트</th>
              <th>카테고리</th>
              <th>연도</th>
              <th>발행일</th>
              <th>버전</th>
              <th>작성자</th>
              <th className={styles.actionCell}/>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (<tr key={item.id}>
                <td className={styles.checkboxCell}>
                  <input aria-label="선택" type="checkbox"/>
                </td>
                <td className={styles.starCell}>
                  <button aria-label={item.starred ? '즐겨찾기 해제' : '즐겨찾기 추가'} className={`${styles.starBtn} ${item.starred ? styles.starBtnActive : ''}`} type="button">
                    <Star fill={item.starred ? 'currentColor' : 'none'} size={14}/>
                  </button>
                </td>
                <td className={styles.statusCell}>
                  <span className={`${styles.badge} ${STATUS_STYLE[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </td>
                <td>
                  <div className={styles.caseInfo}>
                    <span aria-hidden="true" className={styles.caseThumb} style={{ background: item.thumbColor }}/>
                    <div className={styles.caseText}>
                      <Link className={styles.caseTitle} href={ROUTES.ADMIN.WORK_PORTFOLIO.DETAIL(item.id)}>
                        {item.title}
                      </Link>
                      <span className={styles.caseUrl}>{item.slug}</span>
                    </div>
                  </div>
                </td>
                <td>{item.client}</td>
                <td>
                  <span className={`${styles.catPill} ${CATEGORY_STYLE[item.categoryKey] ?? ''}`}>
                    {item.category}
                  </span>
                </td>
                <td>{item.year}</td>
                <td>{item.publishDate}</td>
                <td>{item.version}</td>
                <td>
                  <div className={styles.authorChip}>
                    <span className={`${styles.authorAvatar} ${item.author.color === 'green' ? styles.authorAvatarGreen : ''}`}>
                      {item.author.initials}
                    </span>
                    {item.author.name}
                  </div>
                </td>
                <td className={styles.actionCell}>
                  <button aria-label="옵션" className={styles.iconBtn} type="button">
                    <MoreHorizontal size={14}/>
                  </button>
                </td>
              </tr>))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className={styles.pagination}>
          <div className={styles.pageInfo}>
            <span>페이지당</span>
            <button className={styles.pageSizeBtn} type="button">
              20 <ChevronDown size={12}/>
            </button>
            <span>· 1–9 / 53건</span>
          </div>
          <div className={styles.pageButtons}>
            <button aria-label="이전" className={styles.pageBtn} type="button">
              <ChevronLeft size={14}/>
            </button>
            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`} type="button">
              1
            </button>
            <button className={styles.pageBtn} type="button">
              2
            </button>
            <button className={styles.pageBtn} type="button">
              3
            </button>
            <button aria-label="다음" className={styles.pageBtn} type="button">
              <ChevronRight size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>);
}
