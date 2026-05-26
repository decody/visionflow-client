'use client';

import { ROUTES } from '@visionflow/routes';
import type { IQna } from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Input, Select, Tabs, message, Modal } from 'antd';
import {
  CalendarDays,
  Lock,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
import Loading from '@/components/loading/page';
import {
  useAdminQnaListQuery,
  useDeleteQnaMutation,
} from '@/hooks/admin/qna/useQnaQuery';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canManageContent } from '@/lib/admin-permissions';
import styles from './qna-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type StatusFilter = 'all' | 'pending' | 'done' | 'private';
type DateFilter = 'all' | 'last7' | 'last30';

const DATE_OPTIONS = [
  { label: '최근 30일', value: 'last30' },
  { label: '최근 7일', value: 'last7' },
  { label: '전체 기간', value: 'all' },
];

const FILTER_OPTIONS = [
  { label: '전체 필터', value: 'all' },
  { label: '비밀글', value: 'private' },
  { label: '답변 대기', value: 'pending' },
];

const EMPTY_QNAS: IQna[] = [];

const getTitle = (qna: IQna) =>
  qna.title?.trim() || qna.question?.trim() || '제목 없음';

const getContent = (qna: IQna) =>
  qna.content?.trim() || qna.question?.trim() || '';

const getAuthor = (qna: IQna) =>
  qna.author_name?.trim() || qna.authorName?.trim() || '익명';

const getInitial = (qna: IQna) => getAuthor(qna).slice(0, 1);

const isSecret = (qna: IQna) => qna.is_secret === true || qna.isSecret === true;

const isDone = (qna: IQna) =>
  qna.answer?.trim() ||
  qna.status === 'done' ||
  qna.status === 'resolved';

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const isInDateRange = (qna: IQna, filter: DateFilter) => {
  if (filter === 'all') {
    return true;
  }

  const value = qna.created_at ?? qna.createdAt;
  const time = value ? new Date(value).getTime() : 0;

  if (!time || Number.isNaN(time)) {
    return false;
  }

  const days = filter === 'last7' ? 7 : 30;
  const boundary = Date.now() - days * 24 * 60 * 60 * 1000;

  return time >= boundary;
};

export function QnaListPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('last30');
  const [quickFilter, setQuickFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [messageApi, contextHolder] = message.useMessage();

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '고객센터' },
        { label: 'Q&A 게시판' },
      ],
    }),
    [],
  );

  const role = useCurrentUserRole();
  const canDeleteQna = canManageContent(role);
  const { data, isLoading } = useAdminQnaListQuery({
    keyword,
    limit: 500,
    offset: 0,
  });
  const deleteMutation = useDeleteQnaMutation();
  const qnas = data?.data ?? EMPTY_QNAS;

  const counts = useMemo(
    () => ({
      all: qnas.length,
      done: qnas.filter(isDone).length,
      pending: qnas.filter((qna) => !isDone(qna)).length,
      private: qnas.filter(isSecret).length,
    }),
    [qnas],
  );

  const filteredQnas = useMemo(() => {
    return qnas.filter((qna) => {
      if (!isInDateRange(qna, dateFilter)) {
        return false;
      }

      if (statusFilter === 'pending' && isDone(qna)) {
        return false;
      }

      if (statusFilter === 'done' && !isDone(qna)) {
        return false;
      }

      if (statusFilter === 'private' && !isSecret(qna)) {
        return false;
      }

      if (quickFilter === 'private' && !isSecret(qna)) {
        return false;
      }

      if (quickFilter === 'pending' && isDone(qna)) {
        return false;
      }

      return true;
    });
  }, [dateFilter, qnas, quickFilter, statusFilter]);

  const handleDelete = useCallback((qna: IQna) => {
    Modal.confirm({
      title: 'Q&A를 삭제할까요?',
      content: `"${getTitle(qna)}" 항목이 영구 삭제됩니다.`,
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(qna.id);
          void messageApi.success('Q&A가 삭제되었습니다.');
        } catch (error) {
          void messageApi.error(
            error instanceof Error
              ? error.message
              : 'Q&A 삭제에 실패했습니다.',
          );
        }
      },
    });
  }, [deleteMutation, messageApi]);

  const columnDefs = useMemo<ColDef<IQna>[]>(
    () => [
      {
        cellRenderer: ({ data }: ICellRendererParams<IQna>) => {
          if (!data) {
            return null;
          }

          return (
            <span
              className={`${styles.statusBadge} ${
                isDone(data) ? styles.status_done : styles.status_pending
              }`}
            >
              {isDone(data) ? '완료' : '대기'}
            </span>
          );
        },
        colId: 'status',
        headerName: '상태',
        maxWidth: 96,
        minWidth: 86,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQna>) => {
          if (!data) {
            return null;
          }

          return (
            <span className={styles.categoryBadge}>
              {data.category?.trim() || '서비스 일반'}
            </span>
          );
        },
        field: 'category',
        headerName: '카테고리',
        maxWidth: 150,
        minWidth: 128,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQna>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.titleCell}>
              <Link
                className={styles.titleLink}
                href={ROUTES.ADMIN.QNA.DETAIL(data.id)}
              >
                {isSecret(data) ? (
                  <Lock
                    aria-hidden="true"
                    className={styles.titleLock}
                    size={13}
                  />
                ) : null}
                <span className={styles.titleText}>{getTitle(data)}</span>
              </Link>
              <p className={styles.titleExcerpt}>
                {getContent(data) || '본문 없음'}
              </p>
            </div>
          );
        },
        field: 'title',
        flex: 1,
        headerName: '제목',
        minWidth: 320,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQna>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.authorCell}>
              <span aria-hidden="true" className={styles.avatar}>
                {getInitial(data)}
              </span>
              <div className={styles.authorInfo}>
                <strong>{getAuthor(data)}</strong>
                <span>{isSecret(data) ? '비밀글' : '공개글'}</span>
              </div>
            </div>
          );
        },
        colId: 'author',
        headerName: '작성자',
        maxWidth: 180,
        minWidth: 150,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQna>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.dateCell}>
              <span>{formatDate(data.created_at ?? data.createdAt)}</span>
              <span className={styles.dateRelative}>
                조회 {data.view_count ?? data.viewCount ?? 0}
              </span>
            </div>
          );
        },
        colId: 'createdAt',
        headerName: '작성일',
        maxWidth: 160,
        minWidth: 140,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<IQna>) => {
          if (!data || !canDeleteQna) {
            return null;
          }

          return (
            <button
              aria-label="삭제"
              className={styles.moreButton}
              disabled={deleteMutation.isPending}
              onClick={() => handleDelete(data)}
              type="button"
            >
              <Trash2 aria-hidden="true" size={15} />
            </button>
          );
        },
        colId: 'actions',
        headerName: '',
        maxWidth: 58,
        minWidth: 58,
        sortable: false,
      },
    ],
    [canDeleteQna, deleteMutation.isPending, handleDelete],
  );

  const defaultColDef = useMemo<ColDef<IQna>>(
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
            Q&amp;A 게시판
            <span className={styles.totalCount}>{counts.all}건</span>
          </h1>
        </div>
      </header>

      <Tabs
        activeKey={statusFilter}
        className={styles.tabsBar}
        items={[
          { key: 'all', label: '전체', count: counts.all },
          { key: 'pending', label: '답변 대기', count: counts.pending },
          { key: 'done', label: '답변 완료', count: counts.done },
          { key: 'private', label: '비밀글', count: counts.private, icon: Lock },
        ].map((tab) => {
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
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="제목, 작성자, 카테고리로 검색"
          prefix={<Search aria-hidden="true" size={14} />}
          type="search"
          value={keyword}
        />
        <Select<DateFilter>
          className={styles.dateSelect}
          onChange={setDateFilter}
          options={DATE_OPTIONS}
          prefix={<CalendarDays aria-hidden="true" size={14} />}
          value={dateFilter}
        />
        <Select
          className={styles.filterSelect}
          onChange={setQuickFilter}
          options={FILTER_OPTIONS}
          prefix={<SlidersHorizontal aria-hidden="true" size={14} />}
          value={quickFilter}
        />
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<IQna>
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
              rowData={filteredQnas}
              rowHeight={72}
              theme="legacy"
            />
          </div>
        </div>
      </article>
    </div>
  );
}
