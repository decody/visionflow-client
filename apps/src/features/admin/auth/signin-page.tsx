'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Eye,
  Info,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import SigninSso from '@/features/admin/auth/signin-sso';
import styles from './signin-page.module.css';

type StepStatus = 'done' | 'active' | 'pending';

const ONBOARDING_STEPS: ReadonlyArray<{
  description: string;
  status: StepStatus;
  step: string;
  title: string;
}> = [
  {
    description: 'SuperAdmin이 보낸 초대 토큰을 자동 인증',
    status: 'done',
    step: '01',
    title: '초대 확인',
  },
  {
    description: '이름·패스워드 설정 (12자 + 특수문자)',
    status: 'active',
    step: '02',
    title: '계정 정보 입력',
  },
  {
    description: 'TOTP 앱으로 6자리 코드 — Sales·SuperAdmin 필수',
    status: 'pending',
    step: '03',
    title: '2단계 인증 설정',
  },
  {
    description: '서비스 약관 + 개인정보 처리방침 동의',
    status: 'pending',
    step: '04',
    title: '약관 동의 후 시작',
  },
];

const PASSWORD_RULES: ReadonlyArray<{
  done: boolean;
  hint?: boolean;
  text: string;
}> = [
  { done: true, text: '최소 12자 이상' },
  { done: true, text: '대문자 + 소문자 포함' },
  { done: true, text: '숫자 1개 이상' },
  { done: true, text: '특수문자 1개 이상 (!@#$ 등)' },
  { done: false, hint: true, text: '90일마다 만료 (자동 알림)' },
];

const TOTP_DIGITS = ['4', '8', '2', '|', '', ''] as const;

const CONSENT_ITEMS: ReadonlyArray<{
  action: string;
  defaultChecked: boolean;
  label: string;
  required: boolean;
}> = [
  { action: '전문 보기', defaultChecked: true, label: '서비스 이용약관 동의', required: true },
  { action: '전문 보기', defaultChecked: true, label: '개인정보 처리방침 동의', required: true },
  { action: '내용 확인', defaultChecked: true, label: '감사 로그 기록 정책 안내', required: true },
  {
    action: '',
    defaultChecked: false,
    label: '운영 알림 수신 (Slack·이메일)',
    required: false,
  },
];

export function SigninPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<'KO' | 'EN'>('KO');

  return (
    <div className={styles.shell}>
      <section className={styles.brand} aria-hidden="true">
        <div className={styles.brandGrid} />
        <div className={styles.brandGlow1} />
        <div className={styles.brandGlow2} />
        <div className={styles.brandGlow3} />

        <header className={styles.brandHeader}>
          <span className={styles.logoMark}>VF</span>
          <span className={styles.logoName}>VISIONFLOW</span>
          <span className={styles.logoBadge}>ADMIN</span>
        </header>

        <div className={styles.brandHero}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            초대 수락 · 계정 등록
          </p>
          <h1 className={styles.brandTitle}>
            환영합니다,
            <br />팀에 합류해주세요.
          </h1>
          <p className={styles.brandLead}>
            SuperAdmin이 보낸 초대 링크로 가입을 시작했습니다. 계정을 만들면 즉시 권한이
            활성화됩니다.
          </p>
        </div>

        <ol className={styles.stepList}>
          {ONBOARDING_STEPS.map((step) => (
            <li className={`${styles.step} ${styles[`step_${step.status}`]}`} key={step.step}>
              <span className={styles.stepBadge}>
                {step.status === 'done' ? (
                  <Check aria-hidden="true" size={16} strokeWidth={3} />
                ) : (
                  step.step
                )}
              </span>
              <span className={styles.stepBody}>
                <strong className={styles.stepTitle}>{step.title}</strong>
                <span className={styles.stepDesc}>{step.description}</span>
              </span>
              {step.status === 'done' ? <span className={styles.status_done}>완료</span> : null}
              {step.status === 'active' ? (
                <span className={styles.status_active}>
                  <span className={styles.status_active_dot} />
                  진행중
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        <footer className={styles.brandFooter}>
          <span>© 2026 VisionFlow Inc.</span>
          <nav className={styles.brandFooterNav} aria-label="legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Status</a>
          </nav>
        </footer>
      </section>

      <main className={styles.formArea}>
        <nav className={styles.topNav} aria-label="페이지 보조">
          <div className={styles.langSwitch}>
            <button
              aria-pressed={language === 'KO'}
              className={language === 'KO' ? styles.langActive : styles.langInactive}
              onClick={() => setLanguage('KO')}
              type="button"
            >
              KO
            </button>
            <span aria-hidden="true">/</span>
            <button
              aria-pressed={language === 'EN'}
              className={language === 'EN' ? styles.langActive : styles.langInactive}
              onClick={() => setLanguage('EN')}
              type="button"
            >
              EN
            </button>
          </div>
          <Link className={styles.backLink} href={ROUTES.ADMIN.LOGIN}>
            <ArrowLeft aria-hidden="true" size={14} />
            로그인 페이지
          </Link>
        </nav>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>계정 등록</h2>
            <p className={styles.formSubtitle}>
              초대 토큰이 확인되었습니다. 아래 정보를 입력해주세요.
            </p>
          </header>

          <aside className={styles.inviteCard}>
            <span aria-hidden="true" className={styles.inviteIcon}>
              <Mail size={20} />
            </span>
            <div className={styles.inviteBody}>
              <div className={styles.inviteHeadRow}>
                <strong className={styles.inviteFrom}>이대표 (SuperAdmin) 님의 초대</strong>
                <span className={styles.roleBadge}>admin</span>
              </div>
              <p className={styles.inviteRole}>Work 케이스 작성·관리 권한으로 초대받았습니다</p>
              <p className={styles.inviteExpire}>
                <Clock aria-hidden="true" size={11} />
                토큰 만료까지 23시간 14분 남음
              </p>
            </div>
          </aside>

          <div className={styles.field}>
            <div className={styles.fieldHead}>
              <label className={styles.label} htmlFor="signin-email">
                이메일
              </label>
              <span className={styles.lockedHint}>
                <Lock aria-hidden="true" size={10} />
                초대 토큰에서 자동 입력됨
              </span>
            </div>
            <div className={`${styles.inputWrap} ${styles.inputLocked}`}>
              <Mail aria-hidden="true" className={styles.inputIcon} size={16} />
              <input
                aria-readonly
                className={styles.input}
                defaultValue="park.seojun@visionflow.kr"
                id="signin-email"
                name="email"
                readOnly
                type="email"
              />
              <span className={styles.ssoBadgeInline}>
                <Check aria-hidden="true" size={11} strokeWidth={3} />
                SSO 가능
              </span>
            </div>
            <p className={styles.hintText}>
              <span aria-hidden="true">💡</span>
              @visionflow.kr 도메인은 Social Workspace SSO로 바로 가입할 수도 있습니다 →
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signin-name">
              이름 (표시용) <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrap}>
              <User aria-hidden="true" className={styles.inputIcon} size={16} />
              <input
                autoComplete="name"
                className={styles.input}
                defaultValue="박서준"
                id="signin-name"
                name="displayName"
                placeholder="표시할 이름"
                type="text"
              />
            </div>
            <p className={styles.hintText}>댓글·감사 로그·할당 화면에 표시됩니다</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="signin-password">
              패스워드 <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWrap}>
              <KeyRound aria-hidden="true" className={styles.inputIcon} size={16} />
              <input
                autoComplete="new-password"
                className={styles.input}
                id="signin-password"
                name="password"
                placeholder="••••••••••••••"
                type={showPassword ? 'text' : 'password'}
              />
              <button
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                aria-pressed={showPassword}
                className={styles.iconAction}
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                <Eye aria-hidden="true" size={16} />
              </button>
            </div>
            <div className={styles.strengthBar} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={75}>
              <span className={styles.strengthFill} style={{ width: '75%' }} />
            </div>
            <div className={styles.strengthMeta}>
              <span>강도</span>
              <span className={styles.strengthLevel}>강함</span>
            </div>

            <div className={styles.policy}>
              <p className={styles.policyHead}>패스워드 정책</p>
              <ul className={styles.policyList}>
                {PASSWORD_RULES.map((rule) => (
                  <li
                    className={`${styles.policyItem} ${rule.hint ? styles.policyItemHint : ''}`}
                    key={rule.text}
                  >
                    <span aria-hidden="true" className={styles.policyMark}>
                      {rule.hint ? <Info size={11} /> : <Check size={10} strokeWidth={3} />}
                    </span>
                    {rule.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <section className={styles.totp}>
            <header className={styles.totpHeader}>
              <span aria-hidden="true" className={styles.totpIcon}>
                <ShieldCheck size={16} />
              </span>
              <div className={styles.totpHead}>
                <strong className={styles.totpTitle}>2단계 인증 (TOTP)</strong>
                <p className={styles.totpDesc}>
                  admin 역할은 선택 — Sales·SuperAdmin은 필수
                </p>
              </div>
              <span className={styles.totpBadge}>선택 권장</span>
            </header>
            <div className={styles.totpBody}>
              <div aria-label="QR 코드 자리표시" className={styles.qrPlaceholder} role="img">
                <QrPattern />
              </div>
              <div className={styles.totpInputs}>
                <div className={styles.totpInputsHead}>
                  <p className={styles.totpInputsTitle}>Google Authenticator로 QR 스캔</p>
                  <a className={styles.smallLink} href="#">
                    나중에 설정 →
                  </a>
                </div>
                <p className={styles.totpInputsHint}>앱에 표시된 6자리 코드를 아래 입력</p>
                <div aria-label="6자리 인증 코드" className={styles.totpDigits} role="group">
                  {TOTP_DIGITS.map((digit, index) =>
                    digit === '|' ? (
                      <span aria-hidden="true" className={styles.totpCaret} key="caret">
                        |
                      </span>
                    ) : (
                      <span
                        className={`${styles.totpDigit} ${digit ? styles.totpDigitFilled : ''}`}
                        key={`d-${index}`}
                      >
                        {digit}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.consent}>
            <p className={styles.consentTitle}>약관 동의</p>
            <ul className={styles.consentList}>
              {CONSENT_ITEMS.map((item) => (
                <li className={styles.consentItem} key={item.label}>
                  <label className={styles.checkbox}>
                    <input
                      className={styles.checkboxInput}
                      defaultChecked={item.defaultChecked}
                      type="checkbox"
                    />
                    <span aria-hidden="true" className={styles.checkboxBox} />
                    <span className={styles.consentLabel}>
                      {item.label}
                      <span
                        className={
                          item.required ? styles.consentRequired : styles.consentOptional
                        }
                      >
                        {item.required ? '필수' : '선택'}
                      </span>
                    </span>
                  </label>
                  {item.action ? (
                    <a className={styles.smallLink} href="#">
                      {item.action}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <button className={styles.submit} type="submit">
            <span>계정 만들고 시작하기</span>
            <ArrowRight aria-hidden="true" size={18} />
          </button>

          {/* SSO 회원가입 */}
          <SigninSso />

          <aside className={styles.afterSignup}>
            <span aria-hidden="true" className={styles.afterSignupIcon}>
              <Info size={14} />
            </span>
            <div>
              <strong className={styles.afterSignupTitle}>가입 후 적용 사항</strong>
              <p className={styles.afterSignupBody}>
                · 8시간 비활동 시 자동 로그아웃 · 7일마다 재인증 필요 · 등록·로그인·권한 변경
                시도는 모두 감사 로그에 기록됩니다
              </p>
            </div>
          </aside>

          <p className={styles.help}>
            초대받지 않은 계정은 가입할 수 없습니다.{' '}
            <a className={styles.helpLink} href="#">
              IT 담당자에게 문의 →
            </a>
          </p>
        </form>
      </main>
    </div>
  );
}

function QrPattern() {
  return (
    <svg
      aria-hidden="true"
      className={styles.qrPattern}
      height={108}
      viewBox="0 0 108 108"
      width={108}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#ffffff" height={108} width={108} />
      {/* 3 corner finder patterns */}
      {[
        { x: 8, y: 8 },
        { x: 76, y: 8 },
        { x: 8, y: 76 },
      ].map((corner) => (
        <g key={`${corner.x}-${corner.y}`}>
          <rect fill="#0f172a" height={24} width={24} x={corner.x} y={corner.y} />
          <rect fill="#ffffff" height={16} width={16} x={corner.x + 4} y={corner.y + 4} />
          <rect fill="#0f172a" height={8} width={8} x={corner.x + 8} y={corner.y + 8} />
        </g>
      ))}
      {/* sparse data dots */}
      {[
        [40, 12],
        [48, 12],
        [56, 16],
        [64, 12],
        [40, 20],
        [56, 24],
        [64, 24],
        [12, 40],
        [20, 44],
        [28, 40],
        [40, 40],
        [48, 44],
        [56, 40],
        [64, 44],
        [76, 40],
        [88, 40],
        [96, 44],
        [16, 56],
        [32, 56],
        [44, 56],
        [56, 56],
        [68, 60],
        [80, 56],
        [92, 56],
        [40, 76],
        [48, 76],
        [56, 80],
        [64, 76],
        [76, 76],
        [88, 80],
        [44, 88],
        [56, 92],
        [68, 88],
        [76, 92],
        [88, 88],
        [96, 92],
      ].map(([x, y]) => (
        <rect fill="#0f172a" height={4} key={`${x}-${y}`} width={4} x={x} y={y} />
      ))}
    </svg>
  );
}
