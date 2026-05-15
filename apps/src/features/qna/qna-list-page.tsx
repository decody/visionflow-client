'use client';

import { ROUTES } from '@visionflow/routes';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tabs } from 'antd';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Download,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './qna-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type StatusKey = 'pending' | 'done';
type StatusFilter = 'all' | StatusKey | 'private';
type CategoryKey = 'ad-visuals' | 'data-dashboard' | 'web-app' | 'web-3d';
type SlaKey = 'safe' | 'warn' | 'overdue' | 'done';

const STATUS_TABS: ReadonlyArray<{
  count: number;
  key: StatusFilter;
  label: string;
  icon?: typeof Lock;
}> = [
  { count: 247, key: 'all', label: '전체' },
  { count: 8, key: 'pending', label: '답변 대기' },
  { count: 231, key: 'done', label: '답변 완료' },
  { count: 47, key: 'private', label: '비밀글', icon: Lock },
];

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  'ad-visuals': '광고 이미지',
  'data-dashboard': '데이터 대시보드',
  'web-3d': '웹 3D',
  'web-app': '웹앱 개발',
};

const DATE_OPTIONS = [
  { label: '최근 30일', value: 'last30' },
  { label: '최근 7일', value: 'last7' },
  { label: '전체 기간', value: 'all' },
];

const FILTER_OPTIONS = [
  { label: '전체 필터', value: 'all' },
  { label: '미배정', value: 'unassigned' },
  { label: 'SLA 임박', value: 'sla' },
];

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
    author: { initial: '서', name: '서민준' },
    category: 'ad-visuals',
    createdAbsolute: '오늘 14:32',
    createdRelative: '3시간 전',
    excerpt:
      '시즌 캠페인용 LoRA 학습 가능 여부와 채널 4종 동시 운영 시 비용',
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
    excerpt: '비밀번호로 보호된 글입니다.',
    id: 'Q-2603',
    org: '',
    private: true,
    sla: { kind: 'safe', label: '17h 45m' },
    status: 'pending',
    title: '[비밀글] 사내 데이터 BI 구축 제안',
  },
  {
    assignee: { initial: '김', name: '김민재' },
    author: { initial: '박', name: '박정우' },
    category: 'web-app',
    createdAbsolute: '어제 16:48',
    createdRelative: '1일 전',
    excerpt: '기존 CRA 프로젝트가 있는데 점진 이전도 가능할까요?',
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
    excerpt:
      '아이폰 12 미니 기준 성능 보장이 가능한지 문의드립니다.',
    id: 'Q-2601',
    org: 'CO Furniture',
    sla: { kind: 'warn', label: '12h 03m' },
    status: 'pending',
    title: '제품 3D 컨피규레이터 모바일 60fps 가능한가요?',
  },
  {
    assignee: { initial: '김', name: '김민재' },
    author: { initial: '익', name: '익명' },
    category: 'ad-visuals',
    createdAbsolute: '5/4 15:30',
    createdRelative: '2일 전',
    excerpt: '비밀번호로 보호된 글입니다.',
    id: 'Q-2600',
    org: '',
    private: true,
    sla: { kind: 'overdue', label: '2h 지남' },
    status: 'pending',
    title: '[비밀글] NDA 사전 검토가 필요한 캐릭터 작업',
  },
  {
    assignee: null,
    author: { initial: '정', name: '정유나' },
    category: 'data-dashboard',
    createdAbsolute: '5/4 09:14',
    createdRelative: '2일 전',
    excerpt:
      '대용량 로그를 출근 전 자동 리포트로 검토하는 시나리오입니다.',
    id: 'Q-2599',
    org: 'Greenday',
    sla: { kind: 'overdue', label: '8h 지남' },
    status: 'pending',
    title: '50만 행 그리드 모바일에서도 60fps 유지 가능한가요?',
  },
  {
    assignee: { initial: '김', name: '김민재' },
    author: { initial: '최', name: '최지훈' },
    category: 'web-app',
    createdAbsolute: '5/3 14:00',
    createdRelative: '3일 전',
    excerpt: 'Strapi와 자체 계정의 차이점이 무엇인가요?',
    id: 'Q-2598',
    org: 'PM @ Startup',
    sla: { kind: 'done', label: '5/3 18:32' },
    status: 'done',
    title: 'CMS 자체 개발 vs 헤드리스 도입 비교',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '한', name: '한서현' },
    category: 'ad-visuals',
    createdAbsolute: '5/2 11:45',
    createdRelative: '4일 전',
    excerpt: '제약법 기준 요약형 광고에서도 사용 가능한지요.',
    id: 'Q-2597',
    org: 'Pharma Co',
    sla: { kind: 'done', label: '5/2 14:20' },
    status: 'done',
    title: 'Flux.1 Pro Commercial 라이선스 안전성',
  },
  {
    assignee: { initial: '박', name: '박서준' },
    author: { initial: '윤', name: '윤유진' },
    category: 'web-3d',
    createdAbsolute: '5/1 09:20',
    createdRelative: '5일 전',
    excerpt: '향후 ROI 검토를 위해 로드맵을 알려주세요.',
    id: 'Q-2596',
    org: 'Studio M',
    sla: { kind: 'done', label: '5/1 12:45' },
    status: 'done',
    title: 'Web 3D 데모 환경 도입 후 로드맵 공개 일정',
  },
];

export function QnaListPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const rowData = useMemo(() => [...INQUIRIES], []);

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
        { label: '고객센터' },
        { label: 'Q&A 게시판' },
      ],
    }),
    [],
  );

  const columnDefs = useMemo<ColDef<Inquiry>[]>(
    () => [
      {
        cellRenderer: () => (
          <input aria-label="문의 선택" type="checkbox" />
        ),
        colId: 'select',
        headerName: '',
        maxWidth: 54,
        minWidth: 54,
        sortable: false,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <span
              className={`${styles.statusBadge} ${
                data.status === 'done'
                  ? styles.status_done
                  : styles.status_pending
              }`}
            >
              {data.status === 'done' ? '완료' : '대기'}
            </span>
          );
        },
        colId: 'status',
        headerName: '상태',
        maxWidth: 96,
        minWidth: 86,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <span
              className={`${styles.categoryBadge} ${
                styles[`cat_${data.category.replace('-', '_')}`]
              }`}
            >
              {CATEGORY_LABEL[data.category]}
            </span>
          );
        },
        field: 'category',
        headerName: '카테고리',
        maxWidth: 150,
        minWidth: 128,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.titleCell}>
              <Link
                className={styles.titleLink}
                href={ROUTES.ADMIN.QNA.DETAIL(data.id)}
              >
                {data.private ? (
                  <Lock
                    aria-hidden="true"
                    className={styles.titleLock}
                    size={13}
                  />
                ) : null}
                <span className={styles.titleText}>{data.title}</span>
              </Link>
              <p className={styles.titleExcerpt}>{data.excerpt}</p>
            </div>
          );
        },
        field: 'title',
        flex: 1,
        headerName: '제목',
        minWidth: 320,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.authorCell}>
              <span aria-hidden="true" className={styles.avatar}>
                {data.author.initial}
              </span>
              <div className={styles.authorInfo}>
                <strong>{data.author.name}</strong>
                {data.org ? <span>{data.org}</span> : null}
              </div>
            </div>
          );
        },
        colId: 'author',
        headerName: '작성자',
        maxWidth: 190,
        minWidth: 160,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.dateCell}>
              <span>{data.createdAbsolute}</span>
              <span className={styles.dateRelative}>
                {data.createdRelative}
              </span>
            </div>
          );
        },
        colId: 'createdAt',
        headerName: '작성일',
        maxWidth: 128,
        minWidth: 112,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return data.assignee ? (
            <div className={styles.assigneeCell}>
              <span aria-hidden="true" className={styles.avatarSmall}>
                {data.assignee.initial}
              </span>
              <span>{data.assignee.name}</span>
            </div>
          ) : (
            <span className={styles.unassigned}>미할당</span>
          );
        },
        colId: 'assignee',
        headerName: '담당자',
        maxWidth: 150,
        minWidth: 128,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Inquiry>) => {
          if (!data) {
            return null;
          }

          return <SlaBadge sla={data.sla} />;
        },
        colId: 'sla',
        headerName: 'SLA',
        maxWidth: 130,
        minWidth: 112,
      },
      {
        cellRenderer: () => (
          <button
            aria-label="더보기"
            className={styles.moreButton}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" size={16} />
          </button>
        ),
        colId: 'actions',
        headerName: '',
        maxWidth: 58,
        minWidth: 58,
        sortable: false,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<Inquiry>>(
    () => ({
      autoHeight: true,
      filter: false,
      resizable: true,
      sortable: false,
      suppressMovable: true,
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

      <Tabs
        activeKey={statusFilter}
        className={styles.tabsBar}
        items={STATUS_TABS.map((tab) => {
          const Icon = tab.icon;

          return {
            key: tab.key,
            label: (
              <span className={styles.tabLabel}>
                {Icon ? <Icon aria-hidden="true" size={12} /> : null}
                <span>{tab.label}</span>
                <span className={styles.tabCount}>{tab.count}</span>
              </span>
            ),
          };
        })}
        onChange={(key) => setStatusFilter(key as StatusFilter)}
      />

      <div className={styles.toolbar}>
        <Input
          allowClear
          className={styles.searchInput}
          placeholder="제목, 작성자, 카테고리로 검색"
          prefix={<Search aria-hidden="true" size={14} />}
          type="search"
        />
        <Select
          className={styles.dateSelect}
          defaultValue="last30"
          options={DATE_OPTIONS}
          prefix={<CalendarDays aria-hidden="true" size={14} />}
        />
        <Select
          className={styles.filterSelect}
          defaultValue="all"
          options={FILTER_OPTIONS}
          prefix={<SlidersHorizontal aria-hidden="true" size={14} />}
        />
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<Inquiry>
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              noRowsOverlayComponent={() => (
                <div className={styles.emptyState}>
                  표시할 Q&amp;A가 없습니다.
                </div>
              )}
              pagination
              paginationPageSize={20}
              paginationPageSizeSelector={[20, 50, 100]}
              rowData={rowData}
              rowHeight={72}
              rowSelection="multiple"
              theme="legacy"
            />
          </div>
        </div>
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
