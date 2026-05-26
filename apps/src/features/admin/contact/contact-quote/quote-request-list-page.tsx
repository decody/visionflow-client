'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  IQuoteInquiry,
  QuoteInquiryStatus,
} from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tabs, message } from 'antd';
import {
  Check,
  Download,
  FileText,
  Search,
  Send,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
import Loading from '@/components/loading/page';
import {
  useQuoteRequestListQuery,
  useUpdateQuoteRequestMutation,
} from '@/hooks/admin/contact/quote/useQuoteRequestQuery';
import styles from './quote-request-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type StatusFilter = QuoteInquiryStatus | 'all';
type DateFilter = 'all' | 'last7' | 'last30';

const STATUS_TABS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '신규' },
  { key: 'reviewing', label: '검토/발송' },
  { key: 'completed', label: '수주' },
  { key: 'rejected', label: '종료' },
];

const STATUS_LABEL: Record<QuoteInquiryStatus, string> = {
  completed: '수주',
  pending: '신규',
  rejected: '종료',
  reviewing: '검토/발송',
};

const STATUS_OPTIONS = STATUS_TABS.filter(
  (tab): tab is { key: QuoteInquiryStatus; label: string } =>
    tab.key !== 'all',
).map((tab) => ({ label: tab.label, value: tab.key }));

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: '전체 기간', value: 'all' },
  { label: '최근 7일', value: 'last7' },
  { label: '최근 30일', value: 'last30' },
];

export function QuoteRequestListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchText, setSearchText] = useState('');

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '고객 문의' },
        { label: '견적 문의' },
      ],
    }),
    [],
  );

  const { data, isLoading } = useQuoteRequestListQuery();
  const updateMutation = useUpdateQuoteRequestMutation();
  const requests = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const rows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const now = new Date();

    return requests
      .filter((row) => {
        if (statusFilter !== 'all' && row.status !== statusFilter) {
          return false;
        }

        if (dateFilter !== 'all') {
          const createdAt = new Date(row.created_at);
          const rangeStart = new Date(now);
          rangeStart.setDate(now.getDate() - (dateFilter === 'last7' ? 7 : 30));

          if (Number.isNaN(createdAt.getTime()) || createdAt < rangeStart) {
            return false;
          }
        }

        if (!normalizedSearch) {
          return true;
        }

        const meta = getQuoteMeta(row);

        return [
          row.company_name,
          row.contact_name,
          row.email,
          row.phone,
          meta.service,
          meta.timeline,
          meta.detail,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      })
      .sort(
        (a, b) =>
          getCreatedAtTime(b.created_at) - getCreatedAtTime(a.created_at),
      );
  }, [dateFilter, requests, searchText, statusFilter]);

  const statusCounts = useMemo(() => {
    return STATUS_TABS.reduce<Record<StatusFilter, number>>(
      (acc, tab) => {
        acc[tab.key] =
          tab.key === 'all'
            ? requests.length
            : requests.filter((row) => row.status === tab.key).length;
        return acc;
      },
      { all: 0, completed: 0, pending: 0, rejected: 0, reviewing: 0 },
    );
  }, [requests]);

  const handleStatusChange = useCallback(
    async (id: number | string, status: QuoteInquiryStatus) => {
      try {
        await updateMutation.mutateAsync({ id, status });
        messageApi.success('견적 문의 상태를 변경했습니다.');
      } catch (error) {
        messageApi.error(
          error instanceof Error
            ? error.message
            : '상태 변경에 실패했습니다.',
        );
      }
    },
    [messageApi, updateMutation],
  );

  const handleExportCsv = () => {
    const headers = [
      '상태',
      '회사명',
      '담당자',
      '이메일',
      '연락처',
      '서비스',
      '규모',
      '일정',
      '프로젝트 설명',
      '접수일',
      '수정일',
    ];
    const csvRows = rows.map((row) => {
      const meta = getQuoteMeta(row);

      return [
        STATUS_LABEL[row.status],
        row.company_name,
        row.contact_name,
        row.email,
        row.phone ?? '',
        meta.service,
        meta.timeline,
        meta.detail,
        row.created_at,
        row.updated_at,
      ];
    });
    const csv = [headers, ...csvRows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','),
      )
      .join('\n');
    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quote-requests.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const columnDefs = useMemo<ColDef<IQuoteInquiry>[]>(
    () => [
      {
        cellRenderer: ({
          data,
          value,
        }: ICellRendererParams<
          IQuoteInquiry,
          IQuoteInquiry['status']
        >) =>
          data && value ? (
            <Select<QuoteInquiryStatus>
              className={styles.statusSelect}
              disabled={updateMutation.isPending}
              onChange={(nextStatus) =>
                void handleStatusChange(data.id, nextStatus)
              }
              options={STATUS_OPTIONS}
              popupMatchSelectWidth={false}
              size="small"
              value={value}
            />
          ) : null,
        field: 'status',
        headerName: '상태',
        maxWidth: 150,
        minWidth: 140,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQuoteInquiry>) =>
          data ? (
            <Link
              className={styles.companyCell}
              href={ROUTES.ADMIN.QUOTE_REQUEST.DETAIL(data.id)}
            >
              <span aria-hidden="true" className={styles.companyAvatar}>
                {getInitial(data.company_name)}
              </span>
              <span className={styles.companyInfo}>
                <strong>{data.company_name}</strong>
                <span>{data.reference_urls[0] || '참고 URL 없음'}</span>
              </span>
            </Link>
          ) : null,
        field: 'company_name',
        flex: 1,
        headerName: '회사',
        minWidth: 280,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQuoteInquiry>) => {
          if (!data) {
            return null;
          }

          const meta = getQuoteMeta(data);

          return (
            <div className={styles.contactCell}>
              <span aria-hidden="true" className={styles.contactAvatar}>
                {getInitial(data.contact_name)}
              </span>
              <div>
                <strong>{data.contact_name}</strong>
                <span>{data.email}</span>
              </div>
              <span className={styles.serviceBadge}>{meta.service || '-'}</span>
            </div>
          );
        },
        colId: 'contact',
        headerName: '담당자 / 서비스',
        minWidth: 300,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQuoteInquiry>) => {
          const meta = data ? getQuoteMeta(data) : null;

          return meta ? (
            <div className={styles.budgetCell}>
              <strong>{meta.scale || '-'}</strong>
              <span>{meta.timeline || '-'}</span>
            </div>
          ) : null;
        },
        colId: 'budget',
        headerName: '예산 / 일정',
        maxWidth: 220,
        minWidth: 180,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQuoteInquiry>) => {
          const meta = data ? getQuoteMeta(data) : null;

          return meta ? (
            <div className={styles.proposalCell}>{meta.detail || '-'}</div>
          ) : null;
        },
        colId: 'detail',
        flex: 1,
        headerName: '요청 내용',
        minWidth: 340,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQuoteInquiry>) =>
          data ? (
            <div className={styles.dateCell}>
              <span>{formatDate(data.created_at)}</span>
              <span className={styles.dateRelative}>
                {formatRelativeDate(data.created_at)}
              </span>
            </div>
          ) : null,
        colId: 'createdAt',
        headerName: '접수일',
        maxWidth: 150,
        minWidth: 130,
      },
    ],
    [handleStatusChange, updateMutation.isPending],
  );

  const defaultColDef = useMemo<ColDef<IQuoteInquiry>>(
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
      {contextHolder}
      <header className={styles.titleRow}>
        <div>
          <h1 className={styles.pageTitle}>
            견적 문의
            <span className={styles.totalCount}>
              {requests.length.toLocaleString()}건
            </span>
          </h1>
        </div>
        <button
          className={styles.secondaryButton}
          onClick={handleExportCsv}
          type="button"
        >
          <Download aria-hidden="true" size={14} />
          CSV 내보내기
        </button>
      </header>

      <section aria-label="요약 지표" className={styles.kpiRow}>
        <KpiCard
          caption="전체 접수 건수"
          icon={<FileText aria-hidden="true" size={16} />}
          label="전체 문의"
          tone="blue"
          value={requests.length.toLocaleString()}
        />
        <KpiCard
          caption="검토 시작 전"
          icon={<Timer aria-hidden="true" size={16} />}
          label="신규"
          tone="amber"
          value={statusCounts.pending.toLocaleString()}
        />
        <KpiCard
          caption="검토 또는 견적 발송"
          icon={<Send aria-hidden="true" size={16} />}
          label="진행중"
          tone="purple"
          value={statusCounts.reviewing.toLocaleString()}
        />
        <KpiCard
          caption="수주 처리"
          icon={<Check aria-hidden="true" size={16} />}
          label="수주"
          tone="green"
          value={statusCounts.completed.toLocaleString()}
        />
      </section>

      <Tabs
        activeKey={statusFilter}
        className={styles.statusTabs}
        items={STATUS_TABS.map((tab) => ({
          key: tab.key,
          label: (
            <span className={styles.tabLabel}>
              <span>{tab.label}</span>
              <span className={styles.tabCount}>{statusCounts[tab.key]}</span>
            </span>
          ),
        }))}
        onChange={(key) => setStatusFilter(key as StatusFilter)}
      />

      <div className={styles.toolbar}>
        <Input
          allowClear
          className={styles.searchInputAntd}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="회사명, 담당자, 서비스, 요청 내용으로 검색"
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
            <strong>견적 문의 목록</strong>
            <span>{rows.length.toLocaleString()}건 표시 중</span>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<IQuoteInquiry>
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              loading={isLoading}
              noRowsOverlayComponent={() => (
                <div className={styles.emptyState}>
                  조건에 맞는 견적 문의가 없습니다.
                </div>
              )}
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              rowData={rows}
              rowHeight={78}
              rowSelection="multiple"
              theme="legacy"
            />
          </div>
        </div>
      </article>
    </div>
  );
}

function KpiCard({
  caption,
  icon,
  label,
  tone,
  value,
}: {
  caption: string;
  icon: ReactNode;
  label: string;
  tone: 'amber' | 'blue' | 'green' | 'purple';
  value: string;
}) {
  return (
    <article className={styles.kpiCard}>
      <header className={styles.kpiTop}>
        <span className={`${styles.kpiLabel} ${styles[`kpiLabel_${tone}`]}`}>
          {label}
        </span>
        <span className={`${styles.kpiMiniIcon} ${styles[`kpiMiniIcon_${tone}`]}`}>
          {icon}
        </span>
      </header>
      <div className={styles.kpiValueRow}>
        <strong className={styles.kpiValue}>{value}</strong>
        <span className={styles.kpiCaption}>{caption}</span>
      </div>
    </article>
  );
}

function getQuoteMeta(row: IQuoteInquiry) {
  return {
    detail: row.project_description,
    responseChannel: row.preferred_contact_methods
      .map(formatContactMethod)
      .join(', '),
    scale: formatProjectScale(row.project_scale),
    service: row.service_categories.map(formatServiceCategory).join(', '),
    timeline: formatStartDate(row.preferred_start_date),
  };
}

function formatServiceCategory(value: string) {
  const labels: Record<string, string> = {
    '3d': '웹 3D',
    ad_image: '광고 이미지',
    dashboard: '데이터 대시보드',
    web_app: '웹·앱 개발',
    web_dev: '웹 개발',
  };

  return labels[value] ?? value;
}

function formatProjectScale(value: string) {
  const labels: Record<string, string> = {
    large: '대형',
    medium: '중형',
    small: '소형',
  };

  return labels[value] ?? value;
}

function formatStartDate(value: string) {
  const labels: Record<string, string> = {
    '1month': '1개월 내',
    '3months': '3개월 내',
    asap: 'ASAP',
    open: '미정',
  };

  return labels[value] ?? value;
}

function formatContactMethod(value: string) {
  const labels: Record<string, string> = {
    email: '이메일',
    kakao: '카카오톡',
    meeting: '화상미팅',
    phone: '전화',
  };

  return labels[value] ?? value;
}

function getInitial(value?: string) {
  return value?.trim().slice(0, 1).toUpperCase() || '?';
}

function getCreatedAtTime(value?: string) {
  const time = value ? new Date(value).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
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

