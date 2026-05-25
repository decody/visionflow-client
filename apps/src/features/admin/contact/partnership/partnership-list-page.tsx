'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  IPartnershipInquiry,
  PartnershipInquiryStatus,
  PartnershipInquiryType,
} from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tabs, message } from 'antd';
import {
  Check,
  Download,
  Handshake,
  Paperclip,
  Search,
  Timer,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import Loading from '@/components/loading/page';
import { useTopbar } from '@/components/layout/topbar-context';
import {
  usePartnershipListQuery,
  useUpdatePartnershipMutation,
} from '@/hooks/admin/contact/partnership/usePartnershipQuery';
import styles from './partnership-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type StatusFilter = PartnershipInquiryStatus | 'all';
type DateFilter = 'all' | 'last7' | 'last30';
type TypeFilter = PartnershipInquiryType | 'all';

const STATUS_TABS: ReadonlyArray<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'reviewing', label: '검토 중' },
  { key: 'approved', label: '승인' },
  { key: 'rejected', label: '거절' },
];

const STATUS_LABEL: Record<PartnershipInquiryStatus, string> = {
  approved: '승인',
  pending: '대기',
  rejected: '거절',
  reviewing: '검토 중',
};

const PARTNERSHIP_TYPE_LABEL: Record<PartnershipInquiryType, string> = {
  content_partner: '콘텐츠 파트너',
  etc: '기타',
  outsourcing: '외주 협력',
  reseller: '리셀러',
  tech_partner: '기술 파트너',
};

const COMPANY_SIZE_LABEL: Record<IPartnershipInquiry['company_size'], string> = {
  '1': '1인',
  '2-10': '2-10인',
  '11-50': '11-50인',
  '50+': '50인 이상',
};

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: '전체 기간', value: 'all' },
  { label: '최근 7일', value: 'last7' },
  { label: '최근 30일', value: 'last30' },
];

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: '전체 유형', value: 'all' },
  { label: '외주 협력', value: 'outsourcing' },
  { label: '리셀러', value: 'reseller' },
  { label: '기술 파트너', value: 'tech_partner' },
  { label: '콘텐츠 파트너', value: 'content_partner' },
  { label: '기타', value: 'etc' },
];

const STATUS_OPTIONS = STATUS_TABS.filter(
  (tab): tab is { key: PartnershipInquiryStatus; label: string } =>
    tab.key !== 'all',
).map((tab) => ({ label: tab.label, value: tab.key }));

export function PartnershipListPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [searchText, setSearchText] = useState('');

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

  const { data, isLoading } = usePartnershipListQuery();
  const updateMutation = useUpdatePartnershipMutation();
  const inquiries = useMemo(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const now = new Date();

    return inquiries
      .filter((row) => {
        if (statusFilter !== 'all' && row.status !== statusFilter) {
          return false;
        }

        if (
          typeFilter !== 'all' &&
          row.partnership_type !== typeFilter
        ) {
          return false;
        }

        if (dateFilter !== 'all') {
          const createdAt = new Date(row.created_at);
          if (Number.isNaN(createdAt.getTime())) {
            return false;
          }

          const rangeStart = new Date(now);
          rangeStart.setDate(
            now.getDate() - (dateFilter === 'last7' ? 7 : 30),
          );

          if (createdAt < rangeStart) {
            return false;
          }
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          row.company_name,
          row.company_url,
          row.contact_name,
          row.contact_email,
          row.contact_position,
          row.proposal_content,
          PARTNERSHIP_TYPE_LABEL[row.partnership_type],
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      })
      .sort(
        (a, b) =>
          getCreatedAtTime(b.created_at) -
          getCreatedAtTime(a.created_at),
      );
  }, [dateFilter, inquiries, searchText, statusFilter, typeFilter]);

  const statusCounts = useMemo(() => {
    return STATUS_TABS.reduce<Record<StatusFilter, number>>(
      (acc, tab) => {
        acc[tab.key] =
          tab.key === 'all'
            ? inquiries.length
            : inquiries.filter((row) => row.status === tab.key)
                .length;
        return acc;
      },
      {
        all: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        reviewing: 0,
      },
    );
  }, [inquiries]);

  const handleStatusChange = useCallback(
    async (id: string, status: PartnershipInquiryStatus) => {
      try {
        await updateMutation.mutateAsync({ id, status });
        messageApi.success('제휴 문의 상태를 변경했습니다.');
      } catch {
        messageApi.error('상태 변경에 실패했습니다.');
      }
    },
    [messageApi, updateMutation],
  );

  const handleExportCsv = () => {
    const headers = [
      '상태',
      '회사명',
      '회사규모',
      '담당자',
      '직책',
      '이메일',
      '연락처',
      '제휴유형',
      '제안내용',
      '회사URL',
      '첨부파일',
      '접수일',
      '수정일',
    ];

    const rows = filteredRows.map((row) => [
      STATUS_LABEL[row.status],
      row.company_name,
      COMPANY_SIZE_LABEL[row.company_size],
      row.contact_name,
      row.contact_position,
      row.contact_email,
      row.contact_phone ?? '',
      PARTNERSHIP_TYPE_LABEL[row.partnership_type],
      row.proposal_content,
      row.company_url ?? '',
      row.attachment_name ?? '',
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
    link.download = 'partnership-inquiries.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const columnDefs = useMemo<ColDef<IPartnershipInquiry>[]>(
    () => [
      {
        cellRenderer: ({
          data,
          value,
        }: ICellRendererParams<
          IPartnershipInquiry,
          IPartnershipInquiry['status']
        >) => {
          if (!data || !value) {
            return null;
          }

          return (
            <Select<PartnershipInquiryStatus>
              className={styles.statusSelect}
              disabled={updateMutation.isPending}
              options={STATUS_OPTIONS}
              popupMatchSelectWidth={false}
              size="small"
              value={value}
              onChange={(nextStatus) =>
                void handleStatusChange(data.id, nextStatus)
              }
            />
          );
        },
        field: 'status',
        headerName: '상태',
        maxWidth: 150,
        minWidth: 140,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IPartnershipInquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <Link
              className={styles.companyCell}
              href={ROUTES.ADMIN.PARTNERSHIP.DETAIL(data.id)}
            >
              <span aria-hidden="true" className={styles.companyAvatar}>
                {getInitial(data.company_name)}
              </span>
              <span className={styles.companyInfo}>
                <strong>{data.company_name}</strong>
                <span>{data.company_url || '-'}</span>
              </span>
            </Link>
          );
        },
        field: 'company_name',
        flex: 1,
        headerName: '회사',
        minWidth: 300,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<
          IPartnershipInquiry,
          PartnershipInquiryType
        >) =>
          value ? (
            <span
              className={`${styles.dealBadge} ${styles[`deal_${value}`]}`}
            >
              {PARTNERSHIP_TYPE_LABEL[value]}
            </span>
          ) : null,
        field: 'partnership_type',
        headerName: '제휴 유형',
        maxWidth: 170,
        minWidth: 150,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IPartnershipInquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.contactCell}>
              <span aria-hidden="true" className={styles.contactAvatar}>
                {getInitial(data.contact_name)}
              </span>
              <div>
                <strong>{data.contact_name}</strong>
                <span>{data.contact_position}</span>
              </div>
            </div>
          );
        },
        colId: 'contact',
        headerName: '담당자',
        maxWidth: 230,
        minWidth: 190,
      },
      {
        field: 'contact_email',
        headerName: '이메일',
        maxWidth: 260,
        minWidth: 220,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<
          IPartnershipInquiry,
          IPartnershipInquiry['company_size']
        >) => (value ? COMPANY_SIZE_LABEL[value] : '-'),
        field: 'company_size',
        headerName: '회사 규모',
        maxWidth: 130,
        minWidth: 110,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IPartnershipInquiry>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.proposalCell}>
              <span>{data.proposal_content.trim() || '-'}</span>
              {data.attachment_url ? (
                <a
                  className={styles.attachmentLink}
                  href={data.attachment_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Paperclip aria-hidden="true" size={12} />
                  {data.attachment_name || '첨부파일'}
                </a>
              ) : null}
            </div>
          );
        },
        field: 'proposal_content',
        flex: 1,
        headerName: '제안 내용',
        minWidth: 360,
      },
      {
        cellRenderer: ({
          data,
        }: ICellRendererParams<IPartnershipInquiry>) => {
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
    ],
    [handleStatusChange, updateMutation.isPending],
  );

  const defaultColDef = useMemo<ColDef<IPartnershipInquiry>>(
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
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            제휴 문의
            <span className={styles.totalCount}>
              {inquiries.length.toLocaleString()}건
            </span>
          </h1>
          <p className={styles.pageDescription}>
            접수된 제휴 제안의 유형, 회사 정보, 검토 상태를 한곳에서
            관리합니다.
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

      <section className={styles.kpiRow} aria-label="요약 지표">
        <article className={styles.kpiCard}>
          <header className={styles.kpiTop}>
            <span className={styles.kpiLabel}>전체 문의</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIcon_blue}`}>
              <Handshake aria-hidden="true" size={16} />
            </span>
          </header>
          <strong className={styles.kpiValue}>
            {inquiries.length.toLocaleString()}
          </strong>
          <p className={styles.kpiCaption}>전체 접수 건수</p>
        </article>
        <article className={styles.kpiCard}>
          <header className={styles.kpiTop}>
            <span className={styles.kpiLabel}>대기</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIcon_amber}`}>
              <Timer aria-hidden="true" size={16} />
            </span>
          </header>
          <strong className={styles.kpiValue}>
            {statusCounts.pending.toLocaleString()}
          </strong>
          <p className={styles.kpiCaption}>검토 시작 전</p>
        </article>
        <article className={styles.kpiCard}>
          <header className={styles.kpiTop}>
            <span className={styles.kpiLabel}>검토 중</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIcon_gray}`}>
              <TrendingUp aria-hidden="true" size={16} />
            </span>
          </header>
          <strong className={styles.kpiValue}>
            {statusCounts.reviewing.toLocaleString()}
          </strong>
          <p className={styles.kpiCaption}>담당자 확인 필요</p>
        </article>
        <article className={styles.kpiCard}>
          <header className={styles.kpiTop}>
            <span className={styles.kpiLabel}>승인</span>
            <span className={`${styles.kpiIcon} ${styles.kpiIcon_green}`}>
              <Check aria-hidden="true" size={16} />
            </span>
          </header>
          <strong className={styles.kpiValue}>
            {statusCounts.approved.toLocaleString()}
          </strong>
          <p className={styles.kpiCaption}>진행 가능 제안</p>
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
          placeholder="회사명, 담당자, 이메일, 제안 내용으로 검색"
          prefix={<Search aria-hidden="true" size={14} />}
          value={searchText}
        />
        <Select<TypeFilter>
          className={styles.filterSelect}
          onChange={setTypeFilter}
          options={TYPE_OPTIONS}
          value={typeFilter}
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
            <strong>제휴 문의 목록</strong>
            <span>
              {filteredRows.length.toLocaleString()}건 표시 중
            </span>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<IPartnershipInquiry>
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              loading={isLoading}
              noRowsOverlayComponent={() => (
                <div className={styles.emptyState}>
                  조건에 맞는 제휴 문의가 없습니다.
                </div>
              )}
              pagination
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              rowData={filteredRows}
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
