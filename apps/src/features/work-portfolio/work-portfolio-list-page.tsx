'use client';

import { ROUTES } from '@visionflow/routes';
import type { WorkRow } from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  Alert,
  Button,
  Card,
  Flex,
  Input,
  Modal,
  Select,
  Statistic,
  Tabs,
  Tag,
  message,
} from 'antd';
import { BriefcaseBusiness, Download, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import Loading from '@/components/loading/page';
import { useDeleteWorkMutation } from '@/hooks/works/useWorkMutation';
import { useWorkListQuery } from '@/hooks/works/useWorkQuery';
import { useUserRoleStore } from '@/stores/user-role-store';
import { useTopbar } from '../../components/layout/topbar-context';
import styles from './work-portfolio-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type SizeFilter = WorkRow['size'] | 'all';
type WorkAdminRow = WorkRow & {
  createdAt?: string;
  linkLabel?: string | null;
  linkUrl?: string | null;
};

const SIZE_LABEL: Record<WorkRow['size'], string> = {
  short: '일반',
  tall: '강조',
};

export function WorkPortfolioListPage() {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const deleteWorkMutation = useDeleteWorkMutation();
  const {
    data: works = [],
    error: worksError,
    isError: isWorksError,
    isLoading,
  } = useWorkListQuery();
  const role = useUserRoleStore((state) => state.role);
  const canManageWork = role === 'SuperAdmin' || role === 'Operator';

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '콘텐츠' },
        { label: 'Work 포트폴리오' },
      ],
    }),
    [],
  );

  const rows = useMemo<WorkAdminRow[]>(
    () => (Array.isArray(works) ? works : []),
    [works],
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.category).filter(Boolean))).map(
        (category) => ({ label: category, value: category }),
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (sizeFilter !== 'all' && row.size !== sizeFilter) {
          return false;
        }

        if (categoryFilter !== 'all' && row.category !== categoryFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          row.title,
          row.category,
          row.industry,
          row.linkLabel,
          row.linkUrl,
          ...(row.roles ?? []),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      })
      .sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a));
  }, [categoryFilter, rows, searchText, sizeFilter]);

  const sizeCounts = useMemo(
    () => ({
      all: rows.length,
      short: rows.filter((row) => row.size === 'short').length,
      tall: rows.filter((row) => row.size === 'tall').length,
    }),
    [rows],
  );

  const handleDeleteWork = useCallback(
    (work: WorkAdminRow) => {
      modal.confirm({
        cancelText: '취소',
        content: `"${work.title || '제목 없음'}" Work를 삭제하시겠습니까? 삭제 후에는 목록에서 제거됩니다.`,
        okText: '삭제',
        okType: 'danger',
        title: 'Work 삭제 확인',
        onOk: async () => {
          try {
            await deleteWorkMutation.mutateAsync(String(work.id));
            messageApi.success('Work를 삭제했습니다.');
          } catch (error) {
            messageApi.error(
              error instanceof Error
                ? error.message
                : 'Work 삭제 중 오류가 발생했습니다.',
            );
          }
        },
      });
    },
    [deleteWorkMutation, messageApi, modal],
  );

  const columnDefs = useMemo<ColDef<WorkAdminRow>[]>(
    () => [
      {
        cellRenderer: ({ data }: ICellRendererParams<WorkAdminRow>) => {
          if (!data) {
            return null;
          }

          const title = data.title || '(제목 없음)';

          return (
            <div className={styles.titleCell}>
              <Link
                className={styles.titleLink}
                href={ROUTES.ADMIN.WORK_PORTFOLIO.DETAIL(data.id)}
              >
                {title}
              </Link>
              <span className={styles.subText}>
                {data.linkUrl || data.image || '연결 URL 없음'}
              </span>
            </div>
          );
        },
        field: 'title',
        flex: 1,
        headerName: '프로젝트',
        minWidth: 320,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<WorkAdminRow, string>) => (
          <Tag color="blue">{value || '-'}</Tag>
        ),
        field: 'category',
        headerName: '카테고리',
        maxWidth: 160,
        minWidth: 130,
      },
      {
        field: 'industry',
        headerName: '산업',
        maxWidth: 160,
        minWidth: 130,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<WorkAdminRow>) => (
          <div className={styles.roleCell}>
            {(data?.roles ?? []).slice(0, 3).map((role) => (
              <Tag key={role}>{role}</Tag>
            ))}
          </div>
        ),
        colId: 'roles',
        headerName: '역할',
        minWidth: 220,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<WorkAdminRow, WorkRow['size']>) =>
          value ? (
            <Tag color={value === 'tall' ? 'gold' : 'default'}>
              {SIZE_LABEL[value]}
            </Tag>
          ) : (
            '-'
          ),
        field: 'size',
        headerName: '노출',
        maxWidth: 120,
        minWidth: 100,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<WorkAdminRow>) =>
          formatDate(data ? getCreatedAt(data) : undefined),
        colId: 'createdAt',
        headerName: '등록일',
        maxWidth: 150,
        minWidth: 130,
      },
      ...(canManageWork
        ? [
            {
              cellRenderer: ({ data }: ICellRendererParams<WorkAdminRow>) => {
                if (!data) {
                  return null;
                }

                return (
                  <Button
                    danger
                    icon={<Trash2 size={14} />}
                    loading={deleteWorkMutation.isPending}
                    onClick={() => handleDeleteWork(data)}
                    size="small"
                    type="text"
                  >
                    삭제
                  </Button>
                );
              },
              colId: 'actions',
              headerName: '관리',
              maxWidth: 100,
              minWidth: 90,
              sortable: false,
            },
          ]
        : []),
    ],
    [canManageWork, deleteWorkMutation.isPending, handleDeleteWork],
  );

  const defaultColDef = useMemo<ColDef<WorkAdminRow>>(
    () => ({
      autoHeight: true,
      filter: false,
      resizable: true,
      sortable: true,
      suppressMovable: true,
    }),
    [],
  );

  const handleExportCsv = () => {
    const headers = ['ID', '제목', '카테고리', '산업', '역할', '노출', '등록일'];
    const csvRows = filteredRows.map((row) => [
      row.id,
      row.title,
      row.category,
      row.industry,
      row.roles.join(' / '),
      SIZE_LABEL[row.size],
      formatDate(getCreatedAt(row)),
    ]);

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
    link.download = 'work-portfolio.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (isWorksError) {
    return (
      <section className={styles.page}>
        <Alert
          description={
            worksError instanceof Error
              ? worksError.message
              : 'Supabase 연결 또는 권한 설정을 확인해 주세요.'
          }
          message="Work 데이터를 불러오지 못했습니다."
          showIcon
          type="error"
        />
      </section>
    );
  }

  return (
    <section className={styles.page}>
      {messageContextHolder}
      {modalContextHolder}
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <h1 className={styles.title}>Work 포트폴리오</h1>
          <p className={styles.description}>
            웹사이트에 노출되는 Work 사례를 등록하고 관리합니다.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<Download size={14} />} onClick={handleExportCsv}>
            CSV 내보내기
          </Button>
          {canManageWork ? (
            <Link href={ROUTES.ADMIN.WORK_PORTFOLIO.CREATE}>
            <Button icon={<Plus size={14} />} type="primary">
              Work 작성
            </Button>
            </Link>
          ) : null}
        </div>
      </Flex>

      <div className={styles.summaryGrid}>
        <Card>
          <Statistic title="전체 프로젝트" value={rows.length} />
        </Card>
        <Card>
          <Statistic title="강조 노출" value={sizeCounts.tall} />
        </Card>
        <Card>
          <Statistic title="일반 노출" value={sizeCounts.short} />
        </Card>
        <Card>
          <Statistic
            prefix={<BriefcaseBusiness size={18} />}
            title="카테고리"
            value={categories.length}
          />
        </Card>
      </div>

      <Tabs
        activeKey={sizeFilter}
        items={[
          { key: 'all', label: `전체 ${sizeCounts.all}` },
          { key: 'tall', label: `강조 ${sizeCounts.tall}` },
          { key: 'short', label: `일반 ${sizeCounts.short}` },
        ]}
        onChange={(key) => setSizeFilter(key as SizeFilter)}
      />

      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <Input
            allowClear
            className={styles.searchInput}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="제목, 카테고리, 산업, 역할 검색"
            prefix={<Search size={14} />}
            value={searchText}
          />
          <Select
            className={styles.categorySelect}
            onChange={setCategoryFilter}
            options={[{ label: '전체 카테고리', value: 'all' }, ...categories]}
            value={categoryFilter}
          />
        </div>
        <div className={`ag-theme-quartz ${styles.grid}`}>
          <AgGridReact<WorkAdminRow>
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            noRowsOverlayComponent={() => (
              <div className={styles.emptyState}>표시할 Work가 없습니다.</div>
            )}
            pagination
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            rowData={filteredRows}
            rowHeight={72}
            rowSelection="multiple"
            theme="legacy"
          />
        </div>
      </Card>
    </section>
  );
}

function getCreatedAt(row: WorkAdminRow) {
  return row.createdAt ?? row.created_at;
}

function getCreatedAtTime(row: WorkAdminRow) {
  const value = getCreatedAt(row);
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
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
