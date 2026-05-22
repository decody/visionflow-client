'use client';

import { ROUTES } from '@visionflow/routes';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  Mail,
  Send,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useTopbar } from '../../components/layout/topbar-context';
import styles from './users-invite-page.module.css';

type RoleKey = 'super_admin' | 'admin' | 'viewer';

const ROLE_OPTIONS: ReadonlyArray<{
  bullets: ReadonlyArray<string>;
  description: string;
  emoji: string;
  key: RoleKey;
  label: string;
  notice?: string;
  notice2?: string;
}> = [
  {
    bullets: [
      '모든 인박스 전체 권한',
      'Work 발행 + 공개단계 변경',
      '사용자 관리 + 시스템 설정',
    ],
    description: '전체 시스템 · 사용자 관리',
    emoji: '🛡',
    key: 'super_admin',
    label: 'SuperAdmin',
    notice: '현재 1명',
    notice2: '⚠ 신중히',
  },
  {
    bullets: [
      'Work 케이스 생성·편집',
      'Q&A 답변 + 미디어 업로드',
      '인박스 읽기 전용',
    ],
    description: 'Work 작성 · Q&A 답변',
    emoji: '⚙',
    key: 'admin',
    label: 'admin',
    notice: '현재 5명',
  },
  {
    bullets: [
      '모든 콘텐츠 읽기만',
      '쓰기 + 다운로드 불가',
      'Q&A 비밀글 조회 불가',
    ],
    description: '읽기 전용 · 외부 협력자',
    emoji: '👁',
    key: 'viewer',
    label: 'Viewer',
  },
];

const TOKEN_TIMELINE = [
  {
    active: true,
    label: '발송',
    sub: '지금',
    tone: 'primary' as const,
  },
  {
    label: '리마인더 메일',
    sub: '12h 후 미수락',
    tone: 'amber' as const,
  },
  { label: '경고 알림', sub: '20h 후', tone: 'amber' as const },
  {
    label: '토큰 자동 폐기',
    sub: '24h 후 만료',
    tone: 'danger' as const,
  },
];

export function UsersInvitePage() {
  const [emails, setEmails] = useState<ReadonlyArray<string>>([
    'lee.juhyun@visionflow.kr',
  ]);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState<RoleKey>('admin');
  const [welcomeMessage, setWelcomeMessage] = useState(
    `홍길동님, VisionFlow 운영 팀에 오신 것을 환영합니다. 시즌 캠페인 운영 + Q&A 답변을 맡아주실 예정입니다. 첫 출근 전까지 가입 완료 부탁드려요. — 노대표`,
  );

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '운영' },
        { href: ROUTES.ADMIN.USERS.ROOT, label: '사용자 관리' },
        { label: '새 사용자 초대' },
      ],
    }),
    [],
  );

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().replace(/[,;\s]+$/, '');
    if (trimmed && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
    }
    setEmailInput('');
  };

  const handleRemoveEmail = (target: string) => {
    setEmails(emails.filter((email) => email !== target));
  };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link
          className={styles.backLink}
          href={ROUTES.ADMIN.USERS.ROOT}
        >
          <ArrowLeft aria-hidden="true" size={14} />
          사용자 관리
        </Link>
        <h1 className={styles.pageTitle}>새 사용자 초대</h1>
        <span className={styles.statusPill}>
          <span aria-hidden="true" className={styles.statusDot} />
          미발송
        </span>
        <div className={styles.topbarActions}>
          <button className={styles.ghostButton} type="button">
            <Upload aria-hidden="true" size={13} />
            일괄 초대 (CSV)
          </button>
          <Link
            className={styles.cancelLink}
            href={ROUTES.ADMIN.USERS.ROOT}
          >
            취소
          </Link>
          <button className={styles.primaryButton} type="button">
            <Send aria-hidden="true" size={13} />
            초대 메일 발송
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <Step
            number="01"
            title="초대할 이메일"
            hint="한 번에 여러 명 초대하려면 쉼표로 구분"
          >
            <div className={styles.emailField}>
              <Mail
                aria-hidden="true"
                className={styles.emailFieldIcon}
                size={16}
              />
              <div className={styles.emailChips}>
                {emails.map((email) => (
                  <span className={styles.emailChip} key={email}>
                    {email}
                    {email.endsWith('@visionflow.kr') ? (
                      <span className={styles.ssoTag}>SSO</span>
                    ) : null}
                    <button
                      aria-label={`${email} 제거`}
                      className={styles.chipRemove}
                      onClick={() => handleRemoveEmail(email)}
                      type="button"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <input
                  className={styles.emailInput}
                  onBlur={handleAddEmail}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  placeholder="이메일 추가…"
                  type="email"
                  value={emailInput}
                />
              </div>
            </div>
            <div className={styles.fieldStatus}>
              <span className={styles.fieldStatusOk}>
                <Check size={12} />
                {emails.length}명 추가됨
              </span>
              <ul className={styles.fieldHints}>
                <li>@visionflow.kr 도메인 자동 SSO 연동</li>
                <li>외부 도메인은 패스워드 + 2FA 자동 적용</li>
              </ul>
            </div>
          </Step>

          <Step
            number="02"
            title="역할 선택"
            hint="4단계 RBAC · §2.2 권한 매트릭스 기준"
          >
            <div className={styles.roleGrid}>
              {ROLE_OPTIONS.map((option) => (
                <button
                  aria-pressed={role === option.key}
                  className={`${styles.roleCard} ${
                    role === option.key ? styles.roleCardActive : ''
                  }`}
                  key={option.key}
                  onClick={() => setRole(option.key)}
                  type="button"
                >
                  <header className={styles.roleHeader}>
                    <span
                      aria-hidden="true"
                      className={styles.roleEmoji}
                    >
                      {option.emoji}
                    </span>
                    <strong className={styles.roleLabel}>
                      {option.label}
                    </strong>
                    {option.notice ? (
                      <span className={styles.roleNotice}>
                        {option.notice}
                      </span>
                    ) : null}
                  </header>
                  <p className={styles.roleDesc}>
                    {option.description}
                  </p>
                  <ul className={styles.roleBullets}>
                    {option.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  {option.notice2 ? (
                    <span className={styles.roleWarn}>
                      {option.notice2}
                    </span>
                  ) : null}
                  {role === option.key ? (
                    <span className={styles.roleCheck}>
                      <Check aria-hidden="true" size={11} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </Step>

          <Step
            number="03"
            title="인증 방식"
            hint="이메일 도메인에 따라 자동 결정"
          >
            <div className={styles.authStack}>
              <div
                className={`${styles.authRow} ${styles.authRowOk}`}
              >
                <span aria-hidden="true" className={styles.authIcon}>
                  G
                </span>
                <div className={styles.authBody}>
                  <strong>Google Workspace SSO</strong>
                  <p>
                    @visionflow.kr 도메인 → 패스워드 입력 없이 1-click
                    가입
                  </p>
                </div>
                <span className={styles.authBadge}>자동 감지</span>
              </div>
              {/* <div className={styles.authRow}>
                <span
                  aria-hidden="true"
                  className={`${styles.authIcon} ${styles.authIconSecure}`}
                >
                  <ShieldCheck size={14} />
                </span>
                <div className={styles.authBody}>
                  <strong>2FA TOTP — admin은 선택</strong>
                  <p>SuperAdmin은 필수 적용 · 가입 시 설정</p>
                </div>
              </div> */}
            </div>
          </Step>

          <Step
            number="04"
            title="환영 메시지 (선택)"
            hint="초대 메일에 함께 발송 · Markdown 일부 지원"
          >
            <textarea
              className={styles.welcomeTextarea}
              maxLength={500}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={5}
              value={welcomeMessage}
            />
            <div className={styles.welcomeMeta}>
              <span className={styles.welcomeHint}>
                💡 **굵게**, *기울임*, [링크](url) 지원 ·
                이미지·HTML은 차단됨
              </span>
              <span className={styles.welcomeCount}>
                {welcomeMessage.length} / 500자
              </span>
            </div>
          </Step>
        </div>

        <aside className={styles.previewColumn}>
          <header className={styles.previewHeader}>
            <h2 className={styles.previewTitle}>실시간 미리보기</h2>
            <span className={styles.syncBadge}>
              <Sparkles aria-hidden="true" size={11} />
              SYNC
            </span>
          </header>
          <div className={styles.previewTabs}>
            <button
              className={`${styles.previewTab} ${styles.previewTabActive}`}
              type="button"
            >
              <Mail aria-hidden="true" size={12} />
              초대 메일
            </button>
            {/* <button className={styles.previewTab} type="button">
              🌐 가입 페이지
            </button> */}
          </div>

          <article className={styles.emailPreview}>
            <header className={styles.emailPreviewHead}>
              <p className={styles.emailService}>
                Gmail · 받은편지함
              </p>
              <p className={styles.emailSubject}>
                VisionFlow Admin 초대 —{' '}
                {role.toUpperCase().replace('_', '')} 권한
              </p>
              <p className={styles.emailMeta}>
                받는사람: {emails[0] ?? '—'} · 1분 전
              </p>
            </header>
            <div className={styles.emailBody}>
              <div className={styles.emailBrand}>
                <span aria-hidden="true" className={styles.emailLogo}>
                  V
                </span>
                <strong>ADMIN</strong>
              </div>
              <h3 className={styles.emailGreeting}>
                {emails[0]?.split('@')[0]?.split('.').pop() ??
                  '홍길동'}
                님, 팀에 합류해주세요
              </h3>
              <p className={styles.emailIntro}>
                VisionFlow Admin 콘솔에 초대되었습니다.
                <br />
                아래 정보를 확인하고 초대를 수락해주세요.
              </p>
              <dl className={styles.emailFacts}>
                <div>
                  <dt>초대 발신자</dt>
                  {/* <dd>{user?.name ?? '—'} (SuperAdmin)</dd> */}
                </div>
                <div>
                  <dt>부여될 역할</dt>
                  <dd>{role.toUpperCase().replace('_', '')}</dd>
                </div>
                <div>
                  <dt>토큰 만료</dt>
                  <dd>24시간 후 (5월 11일 11:42)</dd>
                </div>
              </dl>
              <button className={styles.emailCta} type="button">
                초대 수락하고 가입하기
                <ArrowRight aria-hidden="true" size={14} />
              </button>
              {welcomeMessage ? (
                <div className={styles.emailNote}>
                  <p className={styles.emailNoteTitle}>
                    노대표님의 메시지
                  </p>
                  <p className={styles.emailNoteBody}>
                    {welcomeMessage}
                  </p>
                </div>
              ) : null}
            </div>
          </article>

          <article className={styles.auditCard}>
            <header className={styles.auditHeader}>
              <span aria-hidden="true" className={styles.auditDot} />
              <strong>발송과 동시에 감사 로그 기록</strong>
            </header>
            <code className={styles.auditCode}>
              user.invite_sent · 노대표(SuperAdmin) ·{' '}
              {role.toUpperCase().replace('_', '')} 역할로{' '}
              {emails.length}명 초대
            </code>
            <p className={styles.auditNote}>
              메일 발송 + 24h 토큰 생성 + 토큰 만료 시 자동 회수
            </p>
          </article>

          <article className={styles.timelineCard}>
            <header className={styles.timelineHeader}>
              <Bell aria-hidden="true" size={13} />
              <strong>24h 토큰 라이프사이클</strong>
            </header>
            <ol className={styles.timelineList}>
              {TOKEN_TIMELINE.map((step, index) => (
                <li
                  className={`${styles.timelineItem} ${
                    step.active ? styles.timelineItemActive : ''
                  }`}
                  key={step.label}
                >
                  <span
                    aria-hidden="true"
                    className={`${styles.timelineMarker} ${styles[`timelineMarker_${step.tone}`]}`}
                  >
                    {step.active ? <Check size={11} /> : index + 1}
                  </span>
                  <div className={styles.timelineBody}>
                    <strong>{step.label}</strong>
                    <span>{step.sub}</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.timelineHint}>
              <AlertTriangle aria-hidden="true" size={12} />
              만료 후에도 사용자 관리 페이지에서 ↻ 재전송 가능 · 새
              24h 토큰 발급
            </p>
          </article>
        </aside>
      </div>
    </div>
  );
}

function Step({
  children,
  hint,
  number,
  title,
}: {
  children: React.ReactNode;
  hint: string;
  number: string;
  title: string;
}) {
  return (
    <section className={styles.step}>
      <header className={styles.stepHeader}>
        <span className={styles.stepNumber}>{number}</span>
        <div>
          <h2 className={styles.stepTitle}>{title}</h2>
          <p className={styles.stepHint}>{hint}</p>
        </div>
      </header>
      <div className={styles.stepBody}>{children}</div>
    </section>
  );
}
