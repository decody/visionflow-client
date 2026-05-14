'use client';

import { ROUTES } from '@visionflow/routes';
import type { IQuickInquiryListResponse } from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tabs } from 'antd';
import { Check, Download } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { useQuickListQuery } from '@/hooks/admin/contact/quick/useQuickQuery';
import { useTopbar } from '../../components/layout/topbar-context';
import styles from './general-inquiry-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type QuickInquiry = IQuickInquiryListResponse['data'][number];
type StatusKey = 'unanswered' | 'reviewed' | 'done';
type CategoryFilter = 'all';
type DateFilter = 'all' | 'last7' | 'last30';

const STATUS_TABS = [
  { count: 0, key: 'all' as const, label: '전체' },
  { count: 0, key: 'unanswered' as const, label: '미답변' },
  { count: 0, key: 'reviewed' as const, label: '확인' },
  { count: 0, key: 'done' as const, label: '답변 완료' },
];

const STATUS_LABEL: Record<StatusKey, string> = {
  done: '완료',
  reviewed: '확인',
  unanswered: '미답변',
};

const QUICK_STATUS_TO_ROW_STATUS: Record<
  QuickInquiry['status'],
  StatusKey
> = {
  in_progress: 'reviewed',
  pending: 'unanswered',
  resolved: 'done',
};

const STATUS_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: '전체 상태', value: 'all' },
];

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: '최근 30일', value: 'last30' },
  { label: '최근 7일', value: 'last7' },
  { label: '전체 기간', value: 'all' },
];

type Row = {
  author: { initial: string; name: string };
  createdAbsolute: string;
  createdRelative: string;
  email: string;
  excerpt: string;
  id: string;
  reply: { absolute: string; lapse: string } | null;
  status: StatusKey;
  title: string;
};

export function GeneralInquiryListPage() {
  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '인박스' },
        { label: '일반 문의' },
      ],
    }),
    [],
  );

  const { data: quickResponse } = useQuickListQuery();
  const rows = useMemo(
    () =>
      (quickResponse?.data ?? []).map((quick) => quickToRow(quick)),
    [quickResponse?.data],
  );

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<Row, StatusKey | undefined>) => (
          <span
            className={`${styles.statusBadge} ${
              value ? styles[`status_${value}`] : ''
            }`}
          >
            {value ? STATUS_LABEL[value] : '-'}
          </span>
        ),
        field: 'status',
        headerName: '상태',
        maxWidth: 110,
        minWidth: 100,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Row>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.titleCell}>
              <Link
                className={styles.titleLink}
                href={ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(data.id)}
              >
                {data.title}
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
        cellRenderer: ({ data }: ICellRendererParams<Row>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.authorCell}>
              <span aria-hidden="true" className={styles.avatar}>
                {data.author.initial}
              </span>
              <strong>{data.author.name}</strong>
            </div>
          );
        },
        colId: 'author',
        headerName: '작성자',
        maxWidth: 150,
        minWidth: 130,
      },
      {
        cellClass: styles.emailCell,
        field: 'email',
        headerName: '이메일',
        maxWidth: 250,
        minWidth: 210,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Row>) => {
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
        headerName: '접수일',
        maxWidth: 140,
        minWidth: 120,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<Row>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.replyCell}>
              {data.reply ? (
                <>
                  <span className={styles.replyDone}>
                    <Check
                      aria-hidden="true"
                      size={11}
                      strokeWidth={2.5}
                    />
                    {data.reply.absolute}
                  </span>
                  <span className={styles.replyLapse}>
                    {data.reply.lapse}
                  </span>
                </>
              ) : (
                <span className={styles.replyDash}>-</span>
              )}
            </div>
          );
        },
        colId: 'reply',
        headerName: '답변일',
        maxWidth: 140,
        minWidth: 120,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<Row>>(
    () => ({
      autoHeight: true,
      filter: false,
      resizable: true,
      sortable: false,
    }),
    [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            일반 문의
            <span className={styles.totalCount}>
              {quickResponse?.total_count ?? 0}건
            </span>
          </h1>
        </div>
        <button className={styles.secondaryButton} type="button">
          <Download aria-hidden="true" size={14} />
          CSV 내보내기
        </button>
      </header>

      <Tabs
        className={styles.statusTabs}
        defaultActiveKey="all"
        items={STATUS_TABS.map((tab) => ({
          key: tab.key,
          label: (
            <span className={styles.tabLabel}>
              <span>{tab.label}</span>
              <span className={styles.tabCount}>{tab.count}</span>
            </span>
          ),
        }))}
      />

      <div className={styles.toolbar}>
        <Input.Search
          allowClear
          className={styles.searchInput}
          placeholder="제목, 작성자, 이메일로 검색"
        />
        <Select<CategoryFilter>
          className={styles.filterSelect}
          defaultValue="all"
          options={STATUS_OPTIONS}
        />
        <Select<DateFilter>
          className={styles.filterSelect}
          defaultValue="last30"
          options={DATE_OPTIONS}
        />
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<Row>
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              rowData={rows}
              rowHeight={64}
              rowSelection="multiple"
              theme="legacy"
            />
          </div>
        </div>
      </article>
    </div>
  );
}

function quickToRow(quick: QuickInquiry): Row {
  const status = QUICK_STATUS_TO_ROW_STATUS[quick.status];

  return {
    author: {
      initial: getInitial(quick.name),
      name: quick.name || '익명',
    },
    createdAbsolute: formatDate(quick.created_at),
    createdRelative: formatRelativeDate(quick.created_at),
    email: quick.email,
    excerpt: quick.content.trim() || '-',
    id: quick.id,
    reply:
      status === 'done'
        ? {
            absolute: formatDate(quick.updated_at),
            lapse: '-',
          }
        : null,
    status,
    title: quick.subject?.trim() || '(제목 없음)',
  };
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const diffMinutes = Math.floor(
    (Date.now() - date.getTime()) / 1000 / 60,
  );

  if (diffMinutes < 1) {
    return '방금 전';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  return `${Math.floor(diffHours / 24)}일 전`;
}
