'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CircleDot,
  FileEdit,
  Globe,
  IdCard,
  Image as ImageIcon,
  Lock,
  LogOut,
  MessageCircle,
  Power,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  Users as UsersIcon,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './users-detail-page.module.css';

type RoleKey = 'super_admin' | 'sales' | 'operator' | 'viewer';

const ROLE_OPTIONS: ReadonlyArray<{
  count: string;
  current?: boolean;
  description: string;
  emoji: string;
  key: RoleKey;
  label: string;
}> = [
  {
    count: '1명',
    description: '전체 시스템 · 사용자 관리',
    emoji: '🛡',
    key: 'super_admin',
    label: 'SuperAdmin',
  },
  {
    count: '3명',
    description: '인박스 응대 · 답변',
    emoji: '💼',
    key: 'sales',
    label: 'Sales',
  },
  {
    count: '5명 · 현재',
    current: true,
    description: 'Work 작성 · Q&A 답변',
    emoji: '⚙',
    key: 'operator',
    label: 'Operator',
  },
  {
    count: '',
    description: '읽기 전용 · 외부 협력자',
    emoji: '👁',
    key: 'viewer',
    label: 'Viewer',
  },
];

type AccessKey = 'allow' | 'deny' | 'read';

const ACCESS_LABEL: Record<AccessKey, string> = {
  allow: '✓ 허용',
  deny: '✕ 차단',
  read: '◐ 읽기만',
};

const PERMISSIONS: ReadonlyArray<{
  highRisk?: boolean;
  operator: AccessKey;
  resource: string;
  sales: AccessKey;
  superAdmin: AccessKey;
  viewer: AccessKey;
}> = [
  {
    operator: 'read',
    resource: '견적 인박스 — 상태 변경·답변',
    sales: 'allow',
    superAdmin: 'allow',
    viewer: 'read',
  },
  {
    operator: 'read',
    resource: '제휴 인박스 — 모든 작업',
    sales: 'allow',
    superAdmin: 'allow',
    viewer: 'deny',
  },
  {
    highRisk: true,
    operator: 'deny',
    resource: 'Q&A — 비밀글 평문 조회',
    sales: 'allow',
    superAdmin: 'allow',
    viewer: 'deny',
  },
  {
    operator: 'allow',
    resource: 'Work 케이스 — 생성·수정',
    sales: 'read',
    superAdmin: 'allow',
    viewer: 'read',
  },
  {
    operator: 'deny',
    resource: 'Work 케이스 — 클라이언트 공개 단계 변경',
    sales: 'deny',
    superAdmin: 'allow',
    viewer: 'deny',
  },
  {
    operator: 'deny',
    resource: '사용자 관리 (역할 부여·회수)',
    sales: 'deny',
    superAdmin: 'allow',
    viewer: 'deny',
  },
  {
    operator: 'read',
    resource: 'SLA 대시보드 — 조회',
    sales: 'read',
    superAdmin: 'allow',
    viewer: 'deny',
  },
  {
    operator: 'allow',
    resource: '미디어 — 업로드·삭제',
    sales: 'read',
    superAdmin: 'allow',
    viewer: 'deny',
  },
];

const TABS = [
  { active: true, key: 'overview', label: '개요' },
  { key: 'permissions', label: '권한 & 역할' },
  { count: 'high', key: 'audit', label: '감사' },
  { key: 'activity', label: '활동 로그' },
  { key: 'session', label: '세션 & 보안' },
  { key: 'notification', label: '알림 설정' },
  { danger: true, key: 'danger', label: '⚠ 위험 구역' },
];

const STATS = [
  { delta: '+2 발행', label: 'Work 작성', value: '24' },
  { delta: '오늘 5건', label: 'Q&A 답변', value: '47' },
  { delta: '7일 22건', label: '댓글', value: '22' },
  { delta: '/ 30일', label: '로그인 일수', value: '28' },
];

const RECENT_ACTIVITY = [
  {
    description: '#W-2891 — Brand 1.5 시즌 캠페인',
    icon: FileEdit,
    note: 'draft → pending_review',
    time: '오늘 10:42',
    title: 'Work 케이스 수정',
    tone: 'blue' as const,
  },
  {
    description: '서울 사무실 IP · Chrome on Mac',
    icon: LogOut,
    note: '2FA 인증 완료',
    time: '오늘 09:18',
    title: '로그인',
    tone: 'green' as const,
  },
  {
    description: '#Q-2604 — 윤서연 견적 문의',
    icon: MessageCircle,
    note: '답변 발송 + 자동 메일 발송',
    time: '어제 18:32',
    title: 'Q&A 답변 등록',
    tone: 'purple' as const,
  },
  {
    description: '#Q-2598 — NDA 케이스',
    icon: Lock,
    note: '사유: NDA 검토를 위한 평문 확인',
    time: '어제 14:15',
    title: 'Q&A 비밀글 평문 조회',
    tone: 'red' as const,
  },
  {
    description: 'brand15_hero_4k.webp',
    icon: ImageIcon,
    note: '24MB · work-hero 카테고리',
    time: '5/7',
    title: '미디어 업로드',
    tone: 'amber' as const,
  },
];

export function UsersDetailPage({ id }: { id: string }) {
  const [selectedRole, setSelectedRole] = useState<RoleKey>('operator');

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '운영' },
        { href: ROUTES.ADMIN.USERS.ROOT, label: '사용자 관리' },
        { label: '박서준 (Operator)' },
      ],
    }),
    [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.backLink} href={ROUTES.ADMIN.USERS.ROOT}>
          <ArrowLeft aria-hidden="true" size={14} />
          목록
        </Link>
        <span className={styles.statusOnline}>
          <span aria-hidden="true" className={styles.onlineDot} />
          온라인 · 4분 전
        </span>
        <span className={styles.userId}>
          <UserIcon aria-hidden="true" size={12} />
          ID: usr_park-seojun-7f2a
        </span>
        <div className={styles.topbarActions}>
          <button className={styles.ghostButton} type="button">
            <Power aria-hidden="true" size={13} />
            강제 로그아웃
          </button>
          <button className={styles.ghostButton} type="button">
            <RefreshCcw aria-hidden="true" size={13} />
            2FA 재설정
          </button>
          <button className={`${styles.ghostButton} ${styles.deactivate}`} type="button">
            <Power aria-hidden="true" size={13} />
            비활성화
          </button>
          <button className={styles.primaryButton} type="button">
            <Save aria-hidden="true" size={13} />
            변경사항 저장
          </button>
        </div>
      </header>

      <section className={styles.profileCard}>
        <div className={styles.profileLeft}>
          <div className={styles.avatarWrap}>
            <span aria-hidden="true" className={styles.avatar}>
              박
            </span>
            <button aria-label="아바타 변경" className={styles.avatarEdit} type="button">
              ✎
            </button>
          </div>
          <div className={styles.profileInfo}>
            <h1 className={styles.userName}>박서준</h1>
            <p className={styles.userEmail}>park.seojun@visionflow.kr</p>
            <div className={styles.profileBadges}>
              <span className={styles.profileRole}>OPERATOR</span>
              <span className={styles.ssoBadge}>
                <span aria-hidden="true" className={styles.googleG}>
                  G
                </span>
                Google SSO
              </span>
            </div>
          </div>
        </div>

        <div className={styles.statsBlock}>
          <p className={styles.statsTitle}>활동 통계 (지난 30일)</p>
          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
              <div className={styles.statItem} key={stat.label}>
                <strong className={styles.statValue}>{stat.value}</strong>
                <span className={styles.statLabel}>{stat.label}</span>
                <span className={styles.statDelta}>{stat.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <nav className={styles.tabsBar} aria-label="사용자 상세 섹션">
        {TABS.map((tab) => (
          <button
            aria-current={tab.active ? 'page' : undefined}
            className={`${styles.tab} ${tab.active ? styles.tabActive : ''} ${
              tab.danger ? styles.tabDanger : ''
            }`}
            key={tab.key}
            type="button"
          >
            <span>{tab.label}</span>
            {tab.count ? <span className={styles.tabBadge}>{tab.count}</span> : null}
          </button>
        ))}
      </nav>

      <section className={styles.gridTwoCol}>
        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>계정 정보</h2>
          </header>
          <dl className={styles.infoList}>
            <InfoRow icon={Briefcase} label="직책" value="Senior Operator" />
            <InfoRow icon={UsersIcon} label="팀" value="Content Operations" />
            <InfoRow icon={Calendar} label="입사일" value="2025년 6월 12일" />
            <InfoRow icon={IdCard} label="계정 생성" value="2025-06-12 09:30" />
            <InfoRow icon={CircleDot} label="마지막 로그인" value="오늘 10:15 · 서울 사무실" />
            <InfoRow icon={Globe} label="마지막 IP" value="203.247.156.42" />
          </dl>
        </article>

        <article className={styles.card}>
          <header className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>보안 상태</h2>
          </header>
          <ul className={styles.securityList}>
            <li className={`${styles.securityItem} ${styles.securityOk}`}>
              <Check aria-hidden="true" size={16} />
              <div>
                <strong>2FA TOTP 활성화</strong>
                <span>Google Authenticator</span>
              </div>
            </li>
            <li className={`${styles.securityItem} ${styles.securityOk}`}>
              <Check aria-hidden="true" size={16} />
              <div>
                <strong>Google SSO 연동</strong>
                <span>@visionflow.kr</span>
              </div>
            </li>
            <li className={`${styles.securityItem} ${styles.securityWarn}`}>
              <ShieldCheck aria-hidden="true" size={16} />
              <div>
                <strong>패스워드 만료</strong>
                <span>57일 후 만료 (7/5)</span>
              </div>
            </li>
            <li className={styles.securityItem}>
              <CircleDot aria-hidden="true" size={16} />
              <div>
                <strong>IP 화이트리스트 적용</strong>
                <span>Operator는 미적용</span>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <article className={styles.card}>
        <header className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>역할 변경</h2>
            <p className={styles.cardSubtitle}>
              드롭다운으로 즉시 변경 · 모든 변경은 감사 로그에 high 중요도로 기록됩니다
            </p>
          </div>
        </header>
        <div className={styles.roleGrid}>
          {ROLE_OPTIONS.map((role) => (
            <button
              aria-pressed={selectedRole === role.key}
              className={`${styles.roleCard} ${
                selectedRole === role.key ? styles.roleCardActive : ''
              }`}
              key={role.key}
              onClick={() => setSelectedRole(role.key)}
              type="button"
            >
              <div className={styles.roleHeader}>
                <span aria-hidden="true" className={styles.roleEmoji}>
                  {role.emoji}
                </span>
                <strong className={styles.roleLabel}>{role.label}</strong>
              </div>
              <p className={styles.roleDesc}>{role.description}</p>
              <p className={styles.roleCount}>{role.count}</p>
            </button>
          ))}
        </div>
        <p className={styles.roleNote}>
          ⓘ 본인의 SuperAdmin 권한 회수는 다른 SuperAdmin만 가능합니다 (자기 잠금 방지)
        </p>
      </article>

      <article className={styles.card}>
        <header className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>권한 매트릭스 — Operator</h2>
            <p className={styles.cardSubtitle}>
              4단계 RBAC · 비교를 위해 다른 역할도 함께 표시
            </p>
          </div>
          <div className={styles.matrixLegend}>
            <span className={`${styles.legendChip} ${styles.legendAllow}`}>✓ 허용</span>
            <span className={`${styles.legendChip} ${styles.legendDeny}`}>✕ 차단</span>
            <span className={`${styles.legendChip} ${styles.legendRead}`}>◐ 읽기만</span>
          </div>
        </header>
        <div className={styles.matrixWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.matrixHeadResource}>리소스 / 액션</th>
                <th>SuperAdmin</th>
                <th>Sales</th>
                <th className={styles.matrixHeadCurrent}>Operator (현재)</th>
                <th>Viewer</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm) => (
                <tr key={perm.resource}>
                  <td>
                    {perm.resource}
                    {perm.highRisk ? (
                      <span className={styles.highRisk}>HIGH</span>
                    ) : null}
                  </td>
                  <td>
                    <AccessChip value={perm.superAdmin} />
                  </td>
                  <td>
                    <AccessChip value={perm.sales} />
                  </td>
                  <td className={styles.matrixCellCurrent}>
                    <AccessChip value={perm.operator} />
                  </td>
                  <td>
                    <AccessChip value={perm.viewer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className={styles.card}>
        <header className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>최근 활동 (지난 7일)</h2>
            <p className={styles.cardSubtitle}>
              감사 로그에서 박서준의 액션만 필터링 · 47건 중 5건 표시
            </p>
          </div>
          <button className={styles.linkButton} type="button">
            활동 로그 탭에서 47건 모두 보기 →
          </button>
        </header>
        <ul className={styles.activityList}>
          {RECENT_ACTIVITY.map((item) => {
            const Icon = item.icon;
            return (
              <li className={styles.activityItem} key={`${item.time}-${item.title}`}>
                <span
                  aria-hidden="true"
                  className={`${styles.activityIcon} ${styles[`activityIcon_${item.tone}`]}`}
                >
                  <Icon size={14} />
                </span>
                <div className={styles.activityBody}>
                  <p className={styles.activityTopRow}>
                    <strong>{item.title}</strong>
                    <time className={styles.activityTime}>{item.time}</time>
                  </p>
                  <p className={styles.activityDesc}>{item.description}</p>
                  <p className={styles.activityNote}>{item.note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      <article className={`${styles.card} ${styles.dangerCard}`}>
        <header className={styles.cardHeader}>
          <div>
            <h2 className={`${styles.cardTitle} ${styles.dangerTitle}`}>⚠ 위험 구역</h2>
            <p className={styles.cardSubtitle}>
              아래 작업은 되돌릴 수 없습니다 · 모든 작업은 감사 로그에 high 중요도로 기록됩니다
            </p>
          </div>
        </header>
        <div className={styles.dangerList}>
          <div className={styles.dangerRow}>
            <div>
              <strong>계정 비활성화</strong>
              <p>로그인 차단 · 데이터는 유지 (감사 로그 추적용) · 언제든 복구 가능</p>
            </div>
            <button className={`${styles.dangerBtn} ${styles.dangerBtnSoft}`} type="button">
              <Power aria-hidden="true" size={13} />
              비활성화
            </button>
          </div>
          <div className={styles.dangerRow}>
            <div>
              <strong>계정 삭제</strong>
              <p>
                auth.users 영구 삭제 · 작성 콘텐츠는 “deleted user”로 보존 · 되돌릴 수 없음
              </p>
            </div>
            <button className={`${styles.dangerBtn} ${styles.dangerBtnHard}`} type="button">
              <Trash2 aria-hidden="true" size={13} />
              삭제 요청
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.infoRow}>
      <span aria-hidden="true" className={styles.infoIcon}>
        <Icon size={14} />
      </span>
      <dt className={styles.infoLabel}>{label}</dt>
      <dd className={styles.infoValue}>{value}</dd>
    </div>
  );
}

function AccessChip({ value }: { value: AccessKey }) {
  return (
    <span className={`${styles.accessChip} ${styles[`access_${value}`]}`}>
      {value === 'allow' ? (
        <Check aria-hidden="true" size={11} />
      ) : value === 'deny' ? (
        <X aria-hidden="true" size={11} />
      ) : (
        <CircleDot aria-hidden="true" size={11} />
      )}
      {ACCESS_LABEL[value].slice(2)}
    </span>
  );
}
