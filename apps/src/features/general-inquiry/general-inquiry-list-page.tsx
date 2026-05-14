'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  IQuickInquiry,
  QuickInquiryStatus,
} from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tabs } from 'antd';
import { Check, Clock3, Download, Mail, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import Loading from '@/components/loading/page';
import { useQuickListQuery } from '@/hooks/admin/contact/quick/useQuickQuery';
import { useTopbar } from '../../components/layout/topbar-context';
import styles from './general-inquiry-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type StatusFilter = QuickInquiryStatus | 'all';
type DateFilter = 'all' | 'last7' | 'last30';

const STATUS_TABS: ReadonlyArray<{
  key: StatusFilter;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '미답변' },
  { key: 'in_progress', label: '확인 중' },
  { key: 'resolved', label: '답변 완료' },
];

const STATUS_LABEL: Record<QuickInquiryStatus, string> = {
  in_progress: '확인 중',
  pending: '미답변',
  resolved: '답변 완료',
};

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: '최근 30일', value: 'last30' },
  { label: '최근 7일', value: 'last7' },
  { label: '전체 기간', value: 'all' },
];

export function GeneralInquiryListPage() {
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchText, setSearchText] = useState('');

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '고객 문의' },
        { label: '일반 문의' },
      ],
    }),
    [],
  );

  const { data: quicks = [], isLoading } = useQuickListQuery();
  const quickList = Array.isArray(quicks) ? quicks : [];

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const now = new Date();

    return quickList.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      if (dateFilter !== 'all') {
        const createdAt = new Date(row.created_at);
        if (Number.isNaN(createdAt.getTime())) {
          return false;
        }

        const rangeDays = dateFilter === 'last7' ? 7 : 30;
        const rangeStart = new Date(now);
        rangeStart.setDate(now.getDate() - rangeDays);

        if (createdAt < rangeStart) {
          return false;
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      return [row.subject, row.content, row.name, row.email]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );
    });
  }, [dateFilter, quickList, searchText, statusFilter]);

  const statusCounts = useMemo(() => {
    return STATUS_TABS.reduce<Record<StatusFilter, number>>(
      (acc, tab) => {
        acc[tab.key] =
          tab.key === 'all'
            ? quickList.length
            : quickList.filter((row) => row.status === tab.key)
                .length;
        return acc;
      },
      {
        all: 0,
        in_progress: 0,
        pending: 0,
        resolved: 0,
      },
    );
  }, [quickList]);

  const handleExportCsv = () => {
    const headers = [
      '상태',
      '제목',
      '내용',
      '이름',
      '이메일',
      '접수일',
      '수정일',
    ];

    const rows = filteredRows.map((row) => [
      STATUS_LABEL[row.status],
      row.subject ?? '',
      row.content,
      row.name,
      row.email,
      row.created_at,
      row.updated_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `general-inquiries.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columnDefs = useMemo<ColDef<IQuickInquiry>[]>(
    () => [
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<
          IQuickInquiry,
          IQuickInquiry['status']
        >) => {
          if (!value) {
            return null;
          }

          return (
            <span
              className={`${styles.statusBadge} ${styles[`status_${value}`]}`}
            >
              {STATUS_LABEL[value] ?? value}
            </span>
          );
        },
        field: 'status',
        headerName: '상태',
        maxWidth: 120,
        minWidth: 110,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IQuickInquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.titleCell}>
              <Link
                className={styles.titleLink}
                href={ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(data.id)}
              >
                {data.subject?.trim() || '(제목 없음)'}
              </Link>
              <p className={styles.titleExcerpt}>
                {data.content.trim() || '-'}
              </p>
            </div>
          );
        },
        field: 'subject',
        flex: 1,
        headerName: '문의 내용',
        minWidth: 360,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IQuickInquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.authorCell}>
              <span aria-hidden="true" className={styles.avatar}>
                {getInitial(data.name)}
              </span>
              <div className={styles.authorInfo}>
                <strong>{data.name || '익명'}</strong>
                <span>{data.email || '-'}</span>
              </div>
            </div>
          );
        },
        colId: 'author',
        headerName: '작성자',
        maxWidth: 260,
        minWidth: 220,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IQuickInquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.dateCell}>
              <span>{formatDate(data.created_at)}</span>
              <span className={styles.dateRelative}>
                {formatRelativeDate(data.created_at)}
              </span>
            </div>
          );
        },
        colId: 'createdAt',
        headerName: '접수일',
        maxWidth: 150,
        minWidth: 130,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IQuickInquiry>) => {
          if (!data) {
            return null;
          }

          if (data.status !== 'resolved') {
            return <span className={styles.replyDash}>-</span>;
          }

          return (
            <div className={styles.replyCell}>
              <span className={styles.replyDone}>
                <Check
                  aria-hidden="true"
                  size={11}
                  strokeWidth={2.5}
                />
                완료
              </span>
              <span className={styles.dateRelative}>
                {formatDate(data.updated_at)}
              </span>
            </div>
          );
        },
        colId: 'reply',
        headerName: '답변',
        maxWidth: 150,
        minWidth: 130,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<IQuickInquiry>>(
    () => ({
      autoHeight: true,
      filter: false,
      resizable: true,
      sortable: false,
      suppressMovable: true,
    }),
    [],
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            일반 문의
            <span className={styles.totalCount}>
              {quickList.length.toLocaleString()}건
            </span>
          </h1>
          <p className={styles.pageDescription}>
            홈페이지에서 접수된 일반 문의를 상태별로 확인하고 답변
            진행 상황을 관리합니다.
          </p>
        </div>
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={handleExportCsv}
        >
          <Download aria-hidden="true" size={14} />
          CSV 내보내기
        </button>
      </header>

      <section
        aria-label="일반 문의 요약"
        className={styles.summaryRow}
      >
        <article className={styles.summaryItem}>
          <Mail aria-hidden="true" size={16} />
          <span>전체 문의</span>
          <strong>{quickList.length.toLocaleString()}</strong>
        </article>
        <article className={styles.summaryItem}>
          <Clock3 aria-hidden="true" size={16} />
          <span>미답변</span>
          <strong>{statusCounts.pending.toLocaleString()}</strong>
        </article>
        <article className={styles.summaryItem}>
          <Check aria-hidden="true" size={16} />
          <span>답변 완료</span>
          <strong>{statusCounts.resolved.toLocaleString()}</strong>
        </article>
      </section>

      <Tabs
        activeKey={statusFilter}
        className={styles.statusTabs}
        items={STATUS_TABS.map((tab) => ({
          key: tab.key,
          label: (
            <span className={styles.tabLabel}>
              <span>{tab.label}</span>
              <span className={styles.tabCount}>
                {statusCounts[tab.key]}
              </span>
            </span>
          ),
        }))}
        onChange={(key) => setStatusFilter(key as StatusFilter)}
      />

      <div className={styles.toolbar}>
        <Input
          allowClear
          className={styles.searchInput}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="제목, 내용, 작성자, 이메일로 검색"
          prefix={<Search aria-hidden="true" size={14} />}
          value={searchText}
        />
        <Select<DateFilter>
          className={styles.filterSelect}
          onChange={setDateFilter}
          options={DATE_OPTIONS}
          value={dateFilter}
        />
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <strong>문의 목록</strong>
            <span>
              {filteredRows.length.toLocaleString()}건 표시 중
            </span>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<IQuickInquiry>
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              loading={isLoading}
              noRowsOverlayComponent={() => (
                <div className={styles.emptyState}>
                  조건에 맞는 문의가 없습니다.
                </div>
              )}
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              rowData={filteredRows}
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

function getInitial(name?: string) {
  return name?.trim().slice(0, 1).toUpperCase() || '?';
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
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(date);
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}
