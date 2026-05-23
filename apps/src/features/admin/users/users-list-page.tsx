'use client';

import { ROUTES } from '@visionflow/routes';
import type { IUser, UserRole, UserStatus } from '@visionflow/shared';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
  AllCommunityModule,
  ModuleRegistry,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import {
  Avatar,
  Button,
  Card,
  Flex,
  Input,
  Select,
  Statistic,
  Tabs,
  Tooltip,
} from 'antd';
import {
  Clock3,
  Download,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import Loading from '@/components/loading/page';
import { useUsersListQuery } from '@/hooks/admin/users/usersQuery';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canManageUsers } from '@/lib/admin-permissions';
import { useTopbar } from '@/components/layout/topbar-context';
import styles from './users-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type RoleFilter = UserRole | 'all';
type StatusFilter = UserStatus | 'all';
type UserRow = IUser;

const ROLE_LABEL: Record<UserRole, string> = {
  SuperAdmin: 'SuperAdmin',
  admin: 'admin',
  Viewer: 'Viewer',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: '활성',
  inactive: '비활성',
  pending_invite: '초대 대기',
};

const ROLE_OPTIONS: { label: string; value: RoleFilter }[] = [
  { label: '전체 역할', value: 'all' },
  { label: 'SuperAdmin', value: 'SuperAdmin' },
  { label: 'admin', value: 'admin' },
  { label: 'Viewer', value: 'Viewer' },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: '전체 상태', value: 'all' },
  { label: '활성', value: 'active' },
  { label: '비활성', value: 'inactive' },
  { label: '초대 대기', value: 'pending_invite' },
];

const STATUS_TABS: ReadonlyArray<{
  key: StatusFilter;
  label: string;
}> = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '활성' },
  { key: 'inactive', label: '비활성' },
  { key: 'pending_invite', label: '초대 대기' },
];

export function UsersListPage() {
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchText, setSearchText] = useState('');
  const { data: users = [], isLoading } = useUsersListQuery();
  const role = useCurrentUserRole();
  const canInviteUser = canManageUsers(role);

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '운영' },
        { label: '사용자 관리' },
      ],
    }),
    [],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return users
      .filter((row) => {
        if (statusFilter !== 'all' && row.status !== statusFilter) {
          return false;
        }

        if (roleFilter !== 'all' && row.role !== roleFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          row.name,
          row.email,
          row.role,
          row.status,
          row.last_login_ip,
          row.last_login_location,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch),
          );
      })
      .sort((a, b) => getTime(b.created_at) - getTime(a.created_at));
  }, [roleFilter, searchText, statusFilter, users]);

  const statusCounts = useMemo(
    () =>
      STATUS_TABS.reduce<Record<StatusFilter, number>>(
        (acc, tab) => {
          acc[tab.key] =
            tab.key === 'all'
              ? users.length
              : users.filter((row) => row.status === tab.key).length;
          return acc;
        },
        { active: 0, all: 0, inactive: 0, pending_invite: 0 },
      ),
    [users],
  );

  const columnDefs = useMemo<ColDef<UserRow>[]>(
    () => [
      {
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.userCell}>
              <Avatar
                className={styles.avatar}
                style={{
                  backgroundColor: data.avatar_color || '#1677ff',
                }}
              >
                {getInitial(data.name)}
              </Avatar>
              <div className={styles.userMeta}>
                <Link
                  className={styles.userName}
                  href={ROUTES.ADMIN.USERS.DETAIL(data.id)}
                >
                  {data.name}
                </Link>
                <span>{data.email}</span>
              </div>
            </div>
          );
        },
        field: 'name',
        flex: 1,
        headerName: '사용자',
        minWidth: 280,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<UserRow, UserRole>) =>
          value ? <RoleTag role={value} /> : null,
        field: 'role',
        headerName: '역할',
        maxWidth: 140,
        minWidth: 120,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<UserRow, UserStatus>) =>
          value ? <StatusTag status={value} /> : null,
        field: 'status',
        headerName: '상태',
        maxWidth: 140,
        minWidth: 120,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) => {
          if (!data) {
            return null;
          }

          return (
            <div className={styles.loginCell}>
              <span>{formatDateTime(data.last_login_at)}</span>
              <small>
                {data.last_login_ip || '-'}
                {data.last_login_location
                  ? ` · ${data.last_login_location}`
                  : ''}
              </small>
            </div>
          );
        },
        colId: 'lastLogin',
        headerName: '최근 로그인',
        minWidth: 220,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<UserRow, string>) => (
          <div className={styles.dateCell}>
            <span>{formatDate(value)}</span>
          </div>
        ),
        field: 'created_at',
        headerName: '생성일',
        maxWidth: 160,
        minWidth: 140,
      },
      {
        cellRenderer: ({
          value,
        }: ICellRendererParams<UserRow, string>) => (
          <div className={styles.dateCell}>
            <span>{formatDate(value)}</span>
          </div>
        ),
        field: 'updated_at',
        headerName: '수정일',
        maxWidth: 160,
        minWidth: 140,
      },
      {
        cellRenderer: ({ data }: ICellRendererParams<UserRow>) => {
          if (!data) {
            return null;
          }

          return (
            <Tooltip title="사용자 상세">
              <Link
                aria-label={`${data.name} 상세 보기`}
                className={styles.iconLink}
                href={ROUTES.ADMIN.USERS.DETAIL(data.id)}
              >
                <MoreHorizontal aria-hidden="true" size={16} />
              </Link>
            </Tooltip>
          );
        },
        colId: 'actions',
        headerName: '',
        maxWidth: 76,
        minWidth: 64,
        sortable: false,
      },
    ],
    [],
  );

  const defaultColDef = useMemo<ColDef<UserRow>>(
    () => ({
      filter: false,
      resizable: true,
      sortable: true,
      suppressMovable: true,
    }),
    [],
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className={styles.page}>
      <Flex
        align="flex-start"
        className={styles.pageHeader}
        justify="space-between"
      >
        <div>
          <h1 className={styles.title}>사용자 관리</h1>
          <p className={styles.description}>
            관리자 계정의 역할, 초대 상태, 최근 로그인 정보를
            확인합니다.
          </p>
        </div>
        <Flex gap={8} wrap="wrap">
          <Button icon={<Download size={14} />}>CSV 내보내기</Button>
          {canInviteUser ? (
            <Button
              href={ROUTES.ADMIN.USERS.INVITE}
              icon={<Plus size={14} />}
              type="primary"
            >
              사용자 초대
            </Button>
          ) : null}
        </Flex>
      </Flex>

      <div className={styles.summaryGrid}>
        <Card>
          <Statistic
            prefix={<Users size={18} />}
            title="전체 사용자"
            value={users.length}
          />
        </Card>
        <Card>
          <Statistic
            prefix={<UserCheck size={18} />}
            title="활성 사용자"
            value={statusCounts.active}
          />
        </Card>
        <Card>
          <Statistic
            prefix={<Mail size={18} />}
            title="초대 대기"
            value={statusCounts.pending_invite}
          />
        </Card>
        <Card>
          <Statistic
            prefix={<ShieldCheck size={18} />}
            title="SuperAdmin"
            value={
              users.filter((row) => row.role === 'SuperAdmin').length
            }
          />
        </Card>
      </div>

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

      <Card className={styles.tableCard}>
        <Flex className={styles.toolbar} gap={12} wrap="wrap">
          <Input
            allowClear
            className={styles.searchInput}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="이름, 이메일, IP, 위치 검색"
            prefix={<Search aria-hidden="true" size={14} />}
            value={searchText}
          />
          <Select<RoleFilter>
            className={styles.filterSelect}
            onChange={setRoleFilter}
            options={ROLE_OPTIONS}
            value={roleFilter}
          />
          <Select<StatusFilter>
            className={styles.filterSelect}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            value={statusFilter}
          />
        </Flex>

        <div className={styles.tableHeader}>
          <strong>사용자 목록</strong>
          <span>
            <Clock3 aria-hidden="true" size={13} />
            {filteredRows.length.toLocaleString()}명 표시 중
          </span>
        </div>

        <div className={styles.tableWrap}>
          <div className={`ag-theme-quartz ${styles.grid}`}>
            <AgGridReact<UserRow>
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              noRowsOverlayComponent={() => (
                <div className={styles.emptyState}>
                  조건에 맞는 사용자가 없습니다.
                </div>
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
        </div>
      </Card>
    </div>
  );
}

function RoleTag({ role }: { role: UserRole }) {
  return (
    <span className={`${styles.roleBadge} ${styles[`role_${role}`]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

function StatusTag({ status }: { status: UserStatus }) {
  return (
    <span
      className={`${styles.statusBadge} ${styles[`status_${status}`]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

function getTime(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatDate(value?: string | null) {
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

function formatDateTime(value?: string | null) {
  if (!value) {
    return '로그인 기록 없음';
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
    year: 'numeric',
  }).format(date);
}
