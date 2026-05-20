'use client';

import { ROUTES } from '@visionflow/routes';
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
  Tag,
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

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './users-list-page.module.css';

ModuleRegistry.registerModules([AllCommunityModule]);

type UserRole = 'SuperAdmin' | 'Operator' | 'Viewer';
type UserStatus = 'active' | 'inactive' | 'pending_invite';
type RoleFilter = UserRole | 'all';
type StatusFilter = UserStatus | 'all';

type UserRow = {
  avatar_color?: string;
  created_at: string;
  email: string;
  id: string;
  last_login_at: string | null;
  last_login_ip: string | null;
  last_login_location: string | null;
  name: string;
  role: UserRole;
  status: UserStatus;
  updated_at: string;
};

const ROLE_LABEL: Record<UserRole, string> = {
  Operator: 'Operator',
  SuperAdmin: 'SuperAdmin',
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
  { label: 'Operator', value: 'Operator' },
  { label: 'Viewer', value: 'Viewer' },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: '전체 상태', value: 'all' },
  { label: '활성', value: 'active' },
  { label: '비활성', value: 'inactive' },
  { label: '초대 대기', value: 'pending_invite' },
];

const USERS: ReadonlyArray<UserRow> = [
  {
    avatar_color: '#1677ff',
    created_at: '2026-01-05T02:14:00+09:00',
    email: 'admin@visionflow.kr',
    id: '8a8a817e-8a52-42c5-bbe5-2fb21cf4c111',
    last_login_at: '2026-05-20T09:42:00+09:00',
    last_login_ip: '203.0.113.12',
    last_login_location: 'Seoul, KR',
    name: '이대표',
    role: 'SuperAdmin',
    status: 'active',
    updated_at: '2026-05-20T09:42:00+09:00',
  },
  {
    avatar_color: '#13c2c2',
    created_at: '2026-02-18T11:20:00+09:00',
    email: 'operator@visionflow.kr',
    id: '9b433442-d6bb-4212-8fe5-78c240222222',
    last_login_at: '2026-05-19T18:08:00+09:00',
    last_login_ip: '198.51.100.24',
    last_login_location: 'Incheon, KR',
    name: '김민지',
    role: 'Operator',
    status: 'active',
    updated_at: '2026-05-19T18:08:00+09:00',
  },
  {
    avatar_color: '#722ed1',
    created_at: '2026-03-08T15:35:00+09:00',
    email: 'viewer@partner.co.kr',
    id: 'a1839fa4-fc18-42c6-ae47-30ae0f333333',
    last_login_at: '2026-05-12T14:21:00+09:00',
    last_login_ip: '192.0.2.44',
    last_login_location: 'Busan, KR',
    name: '박서준',
    role: 'Viewer',
    status: 'active',
    updated_at: '2026-05-12T14:21:00+09:00',
  },
  {
    avatar_color: '#fa8c16',
    created_at: '2026-04-11T10:10:00+09:00',
    email: 'new.operator@visionflow.kr',
    id: 'bdc63ff6-8218-49c7-8644-012ff4444444',
    last_login_at: null,
    last_login_ip: null,
    last_login_location: null,
    name: '초대 발송',
    role: 'Operator',
    status: 'pending_invite',
    updated_at: '2026-05-20T08:30:00+09:00',
  },
  {
    avatar_color: '#8c8c8c',
    created_at: '2026-01-21T13:05:00+09:00',
    email: 'old.viewer@visionflow.kr',
    id: 'ced53cb5-c2b1-4388-80c5-fc4fa5555555',
    last_login_at: '2026-04-26T16:45:00+09:00',
    last_login_ip: '203.0.113.88',
    last_login_location: 'Daegu, KR',
    name: '최예린',
    role: 'Viewer',
    status: 'inactive',
    updated_at: '2026-05-01T09:00:00+09:00',
  },
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

  useTopbar(
    () => ({
      action: (
        <Link
          className={styles.topbarPrimary}
          href={ROUTES.ADMIN.USERS.INVITE}
        >
          <Plus aria-hidden="true" size={14} strokeWidth={2.4} />
          사용자 초대
        </Link>
      ),
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

    return USERS.filter((row) => {
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
    }).sort((a, b) => getTime(b.created_at) - getTime(a.created_at));
  }, [roleFilter, searchText, statusFilter]);

  const statusCounts = useMemo(
    () =>
      STATUS_TABS.reduce<Record<StatusFilter, number>>(
        (acc, tab) => {
          acc[tab.key] =
            tab.key === 'all'
              ? USERS.length
              : USERS.filter((row) => row.status === tab.key).length;
          return acc;
        },
        { active: 0, all: 0, inactive: 0, pending_invite: 0 },
      ),
    [],
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
        field: 'created_at',
        headerName: '생성일',
        maxWidth: 160,
        minWidth: 140,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        field: 'updated_at',
        headerName: '수정일',
        maxWidth: 160,
        minWidth: 140,
        valueFormatter: ({ value }) => formatDate(value),
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
        <Button icon={<Download size={14} />}>CSV 내보내기</Button>
      </Flex>

      <div className={styles.summaryGrid}>
        <Card>
          <Statistic
            prefix={<Users size={18} />}
            title="전체 사용자"
            value={USERS.length}
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
              USERS.filter((row) => row.role === 'SuperAdmin').length
            }
          />
        </Card>
      </div>

      <Tabs
        activeKey={statusFilter}
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
            rowHeight={70}
            rowSelection="multiple"
            theme="legacy"
          />
        </div>
      </Card>
    </div>
  );
}

function RoleTag({ role }: { role: UserRole }) {
  const color =
    role === 'SuperAdmin'
      ? 'red'
      : role === 'Operator'
        ? 'blue'
        : 'default';

  return <Tag color={color}>{ROLE_LABEL[role]}</Tag>;
}

function StatusTag({ status }: { status: UserStatus }) {
  const color =
    status === 'active'
      ? 'green'
      : status === 'pending_invite'
        ? 'gold'
        : 'default';

  return <Tag color={color}>{STATUS_LABEL[status]}</Tag>;
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
