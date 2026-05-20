'use client';

import { ROUTES } from '@visionflow/routes';
import {
  Activity,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  Download,
  Eye,
  Globe,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './users-list-page.module.css';

type RoleKey = 'super_admin' | 'sales' | 'operator' | 'viewer';
type StatusKey = 'active' | 'inactive' | 'pending';
type TwoFactor = 'totp' | 'off' | 'none';

const ROLE_LABEL: Record<RoleKey, string> = {
  operator: 'Operator',
  sales: 'Sales',
  super_admin: 'SuperAdmin',
  viewer: 'Viewer',
};

type RoleFilter = {
  count: number;
  emoji: string;
  key: RoleKey | 'all';
  label: string;
};

const ROLE_FILTERS: ReadonlyArray<RoleFilter> = [
  { count: 12, emoji: '', key: 'all', label: '전체' },
  { count: 1, emoji: '🛡', key: 'super_admin', label: 'SuperAdmin' },
  { count: 3, emoji: '💼', key: 'sales', label: 'Sales' },
  { count: 5, emoji: '⚙', key: 'operator', label: 'Operator' },
  { count: 3, emoji: '👁', key: 'viewer', label: 'Viewer' },
];

type User = {
  email: string;
  external?: boolean;
  id: string;
  isMe?: boolean;
  lastLoginAbsolute: string | null;
  lastLoginLocation?: string;
  name: string;
  permission: string;
  role: RoleKey;
  status: StatusKey;
  tokenExpiry?: string;
  tokenInvitedBy?: string;
  twoFactor: TwoFactor;
};

const USERS: ReadonlyArray<User> = [
  {
    email: 'lee.daepyo@visionflow.kr',
    id: 'u-1',
    isMe: true,
    lastLoginAbsolute: '오늘 09:42',
    lastLoginLocation: '서울 사무실 IP',
    name: '이대표',
    permission: '전체 시스템 · 모든 작업',
    role: 'super_admin',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'kim.minji@visionflow.kr',
    id: 'u-2',
    lastLoginAbsolute: '오늘 11:08',
    lastLoginLocation: '서울 사무실 IP',
    name: '김민지',
    permission: '인박스 + Work 읽기',
    role: 'sales',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'park.seojun@visionflow.kr',
    id: 'u-3',
    lastLoginAbsolute: '오늘 10:15',
    lastLoginLocation: '서울 사무실 IP',
    name: '박서준',
    permission: 'Work 작성 + Q&A 답변',
    role: 'operator',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'jung.suyeong@visionflow.kr',
    id: 'u-4',
    lastLoginAbsolute: '어제 18:32',
    lastLoginLocation: '서울 강남구 (재택)',
    name: '정수영',
    permission: '인박스 + Work 읽기',
    role: 'sales',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'choi.yerin@visionflow.kr',
    id: 'u-5',
    lastLoginAbsolute: '오늘 09:55',
    lastLoginLocation: '서울 사무실 IP',
    name: '최예린',
    permission: 'Work 작성 + Q&A 답변',
    role: 'operator',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'han.jihoon@visionflow.kr',
    id: 'u-6',
    lastLoginAbsolute: '2일 전',
    lastLoginLocation: '서울 사무실 IP',
    name: '한지훈',
    permission: 'Work 작성 + Q&A 답변',
    role: 'operator',
    status: 'active',
    twoFactor: 'off',
  },
  {
    email: 'yoon.chaehyun@visionflow.kr',
    id: 'u-7',
    lastLoginAbsolute: '3일 전',
    lastLoginLocation: '서울 사무실 IP',
    name: '윤채현',
    permission: 'Work 작성 + Q&A 답변',
    role: 'operator',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'kang.doyun@visionflow.kr',
    id: 'u-8',
    lastLoginAbsolute: '5일 전',
    lastLoginLocation: '서울 사무실 IP',
    name: '강도윤',
    permission: 'Work 작성 + Q&A 답변',
    role: 'operator',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'sshin@external-pr.co',
    external: true,
    id: 'u-9',
    lastLoginAbsolute: '어제 14:22',
    lastLoginLocation: '경기도 (외부 IP)',
    name: '신가람',
    permission: '읽기 전용',
    role: 'viewer',
    status: 'active',
    twoFactor: 'totp',
  },
  {
    email: 'lee.sumin@visionflow.kr',
    id: 'u-10',
    lastLoginAbsolute: '14일 전',
    name: '이수민 (인턴)',
    permission: '읽기 전용',
    role: 'viewer',
    status: 'inactive',
    twoFactor: 'none',
  },
  {
    email: 'jang.minho@visionflow.kr',
    id: 'u-11',
    lastLoginAbsolute: null,
    name: '미정 · 초대 발송됨',
    permission: '23h 14m 후 만료',
    role: 'operator',
    status: 'pending',
    tokenExpiry: '23h 14m 후 만료',
    tokenInvitedBy: '4월 28일 SuperAdmin이 초대',
    twoFactor: 'none',
  },
  {
    email: 'consultant@partner-co.kr',
    external: true,
    id: 'u-12',
    lastLoginAbsolute: null,
    name: '미정 · 초대 발송됨',
    permission: '4h 12m 후 만료',
    role: 'viewer',
    status: 'pending',
    tokenExpiry: '4h 12m 후 만료',
    tokenInvitedBy: '5월 8일 SuperAdmin이 초대',
    twoFactor: 'none',
  },
];

const KPIS = [
  {
    caption: '활성 10 · 비활성 2',
    icon: UsersIcon,
    label: '전체 사용자',
    tone: 'blue' as const,
    value: '12',
  },
  {
    badge: 'LIVE',
    caption: '현재 로그인 중',
    icon: Activity,
    label: '활성 세션',
    tone: 'green' as const,
    value: '7',
  },
  {
    caption: '11/12 · SuperAdmin·Sales 전원',
    icon: ShieldCheck,
    label: '2FA 적용률',
    tone: 'green' as const,
    value: '92%',
  },
  {
    caption: '24h 안에 만료 (1건)',
    icon: AlertTriangle,
    label: '대기중 초대',
    tone: 'amber' as const,
    value: '2',
  },
];

export function UsersListPage() {
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

  return (
    <div className={styles.page}>
      <section aria-label="요약 지표" className={styles.kpiRow}>
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article className={styles.kpiCard} key={kpi.label}>
              <header className={styles.kpiTop}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                {'badge' in kpi && kpi.badge ? (
                  <span className={styles.kpiBadge}>
                    <span
                      aria-hidden="true"
                      className={styles.kpiBadgeDot}
                    />
                    {kpi.badge}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`${styles.kpiIcon} ${styles[`kpiIcon_${kpi.tone}`]}`}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>
                )}
              </header>
              <div className={styles.kpiValueRow}>
                <strong className={styles.kpiValue}>
                  {kpi.value}
                </strong>
                <span
                  className={`${styles.kpiCaption} ${styles[`kpiCaption_${kpi.tone}`]}`}
                >
                  {kpi.caption}
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>
            사용자 관리
            <span className={styles.pageCount}>12명</span>
          </h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} type="button">
            <Globe aria-hidden="true" size={14} />
            IP 화이트리스트 (3)
          </button>
          <button className={styles.secondaryButton} type="button">
            <Download aria-hidden="true" size={14} />
            CSV
          </button>
        </div>
      </header>

      <div
        className={styles.tabsBar}
        role="tablist"
        aria-label="역할 필터"
      >
        {ROLE_FILTERS.map((tab, index) => (
          <button
            aria-selected={index === 0}
            className={`${styles.tab} ${index === 0 ? styles.tabActive : ''}`}
            key={tab.key}
            role="tab"
            type="button"
          >
            {tab.emoji ? (
              <span aria-hidden="true" className={styles.tabEmoji}>
                {tab.emoji}
              </span>
            ) : null}
            <span
              className={
                tab.key !== 'all' && index !== 0
                  ? `${styles.tabLabel} ${styles[`tabLabel_${tab.key}`]}`
                  : styles.tabLabel
              }
            >
              {tab.label}
            </span>
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search
            aria-hidden="true"
            className={styles.searchIcon}
            size={14}
          />
          <input
            className={styles.searchInput}
            placeholder="이름, 이메일로 검색"
            type="search"
          />
        </label>
        <button className={styles.filterButton} type="button">
          <Shield aria-hidden="true" size={14} />
          2FA 상태
          <ChevronDown aria-hidden="true" size={14} />
        </button>
        <button className={styles.filterButton} type="button">
          <Sparkles aria-hidden="true" size={14} />
          마지막 로그인
          <ChevronDown aria-hidden="true" size={14} />
        </button>
        <button className={styles.filterButton} type="button">
          <UserIcon aria-hidden="true" size={14} />
          상태
          <ChevronDown aria-hidden="true" size={14} />
        </button>
      </div>

      <article className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input aria-label="전체 선택" type="checkbox" />
                </th>
                <th>사용자</th>
                <th>역할</th>
                <th>권한 범위</th>
                <th>
                  마지막 로그인{' '}
                  <ChevronDown
                    aria-hidden="true"
                    size={11}
                    strokeWidth={2.5}
                  />
                </th>
                <th>2FA</th>
                <th>상태</th>
                <th aria-label="action" />
              </tr>
            </thead>
            <tbody>
              {USERS.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>

        <footer className={styles.tableFooter}>
          <div className={styles.pageSize}>
            <span>1–12 / 12명</span>
            <span className={styles.divider}>·</span>
            <span>활성 10 · 초대 대기 2</span>
          </div>
          <p className={styles.bulkHint}>
            <Briefcase aria-hidden="true" size={12} />
            다중 선택 시 일괄 비활성화·역할 변경·삭제 가능
          </p>
        </footer>
      </article>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const initial = user.name.charAt(0);
  const isPending = user.status === 'pending';
  const isInactive = user.status === 'inactive';

  return (
    <tr
      className={
        isPending
          ? styles.rowPending
          : isInactive
            ? styles.rowInactive
            : ''
      }
    >
      <td className={styles.checkboxCell}>
        <input aria-label={`${user.name} 선택`} type="checkbox" />
      </td>
      <td>
        <div className={styles.userCell}>
          <span aria-hidden="true" className={styles.avatar}>
            {isPending ? '✉' : initial}
          </span>
          <div className={styles.userInfo}>
            <div className={styles.userNameRow}>
              {isPending ? (
                <span className={styles.userName}>{user.name}</span>
              ) : (
                <Link
                  className={styles.userName}
                  href={ROUTES.ADMIN.USERS.DETAIL(user.id)}
                >
                  {user.name}
                </Link>
              )}
              {user.isMe ? (
                <span className={styles.meTag}>ME</span>
              ) : null}
              {user.external ? (
                <span className={styles.externalTag}>외부</span>
              ) : null}
            </div>
            <span className={styles.userEmail}>{user.email}</span>
          </div>
        </div>
      </td>
      <td>
        <RoleBadge role={user.role} />
      </td>
      <td>
        <span className={styles.permission}>{user.permission}</span>
      </td>
      <td>
        {isPending ? (
          <span className={styles.tokenExpiry}>
            {user.tokenExpiry}
          </span>
        ) : (
          <div className={styles.lastLoginCell}>
            <span>{user.lastLoginAbsolute}</span>
            {user.lastLoginLocation ? (
              <span className={styles.lastLoginSub}>
                {user.lastLoginLocation}
              </span>
            ) : null}
          </div>
        )}
      </td>
      <td>
        <TwoFactorBadge value={user.twoFactor} />
      </td>
      <td>
        <StatusBadge status={user.status} />
      </td>
      <td className={styles.actionCell}>
        {isPending ? (
          <button className={styles.resendBtn} type="button">
            <RefreshCcw aria-hidden="true" size={12} />
            재전송
          </button>
        ) : (
          <button
            aria-label="더보기"
            className={styles.moreButton}
            type="button"
          >
            <MoreHorizontal aria-hidden="true" size={16} />
          </button>
        )}
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { role: RoleKey }) {
  return (
    <span className={`${styles.roleBadge} ${styles[`role_${role}`]}`}>
      <span aria-hidden="true" className={styles.roleDot} />
      {ROLE_LABEL[role]}
    </span>
  );
}

function TwoFactorBadge({ value }: { value: TwoFactor }) {
  if (value === 'totp') {
    return (
      <span className={`${styles.twoFactorBadge} ${styles.totp}`}>
        <Shield aria-hidden="true" size={10} />
        TOTP
      </span>
    );
  }
  if (value === 'off') {
    return (
      <span className={`${styles.twoFactorBadge} ${styles.off}`}>
        <AlertTriangle aria-hidden="true" size={10} />
        OFF
      </span>
    );
  }
  return <span className={styles.twoFactorEmpty}>—</span>;
}

function StatusBadge({ status }: { status: StatusKey }) {
  if (status === 'active') {
    return (
      <span
        className={`${styles.statusBadge} ${styles.statusActive}`}
      >
        <span aria-hidden="true" className={styles.statusDot} />
        ACTIVE
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span
        className={`${styles.statusBadge} ${styles.statusPending}`}
      >
        <Eye aria-hidden="true" size={10} />
        초대 발송
      </span>
    );
  }
  return (
    <span
      className={`${styles.statusBadge} ${styles.statusInactive}`}
    >
      <span aria-hidden="true" className={styles.statusDot} />
      비활성
    </span>
  );
}
