'use client';

import {
  ArrowRight,
  Eye,
  Info,
  KeyRound,
  Mail,
  Shield,
} from 'lucide-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { ROUTES } from '@visionflow/routes';
import styles from './login-page.module.css';

export type LoginAccessMode = 'sso' | 'partner';

export function LoginFormPage({
  initialAccessMode = 'sso',
}: {
  initialAccessMode?: LoginAccessMode;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<'KO' | 'EN'>('KO');
  const [accessMode, setAccessMode] =
    useState<LoginAccessMode>(initialAccessMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const switchAccessMode = (mode: LoginAccessMode) => {
    setAccessMode(mode);

    const params = new URLSearchParams(window.location.search);
    params.set('mode', mode);

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (accessMode !== 'partner') {
      return;
    }

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setLoginError('이메일과 패스워드를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    const params = new URLSearchParams(window.location.search);
    const callbackUrl = getSafeCallbackUrl(params.get('callbackUrl'));
    const result = await signIn('credentials', {
      callbackUrl,
      email: trimmedEmail,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.ok) {
      window.location.assign(result.url ?? callbackUrl);
      return;
    }

    setLoginError(
      '로그인에 실패했습니다. 이메일과 패스워드를 다시 확인해 주세요.',
    );
  };

  return (
    <main className={styles.formArea}>
      <nav className={styles.langSwitch} aria-label="언어 선택">
        <button
          aria-pressed={language === 'KO'}
          className={
            language === 'KO'
              ? styles.langActive
              : styles.langInactive
          }
          onClick={() => setLanguage('KO')}
          type="button"
        >
          KO
        </button>
        <span aria-hidden="true">/</span>
        <button
          aria-pressed={language === 'EN'}
          className={
            language === 'EN'
              ? styles.langActive
              : styles.langInactive
          }
          onClick={() => setLanguage('EN')}
          type="button"
        >
          EN
        </button>
      </nav>

      <form className={styles.form} onSubmit={handleSubmit}>
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>로그인</h2>
          <p className={styles.formSubtitle}>
            VisionFlow 운영자만 접근 가능한 페이지입니다.
          </p>
        </header>

        <div
          className={styles.formTabs}
          aria-label="로그인 방식 선택"
        >
          <button
            aria-pressed={accessMode === 'sso'}
            className={
              accessMode === 'sso'
                ? styles.formTabActive
                : styles.formTab
            }
            onClick={() => switchAccessMode('sso')}
            type="button"
          >
            SSO 인증
          </button>
          <button
            aria-pressed={accessMode === 'partner'}
            className={
              accessMode === 'partner'
                ? styles.formTabActive
                : styles.formTab
            }
            onClick={() => switchAccessMode('partner')}
            type="button"
          >
            외부 협력자
          </button>
        </div>

        {accessMode === 'sso' ? (
          <SsoLoginPage />
        ) : (
          <PartnerLoginPage
            email={email}
            errorMessage={loginError}
            isSubmitting={isSubmitting}
            onChangeEmail={(value) => {
              setEmail(value);
              setLoginError(null);
            }}
            onChangePassword={(value) => {
              setPassword(value);
              setLoginError(null);
            }}
            showPassword={showPassword}
            onTogglePassword={() =>
              setShowPassword((value) => !value)
            }
            password={password}
          />
        )}
      </form>
    </main>
  );
}

function getSafeCallbackUrl(value: string | null) {
  if (!value) {
    return '/settings';
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return '/settings';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/settings';
  }
}

function SsoLoginPage() {
  return (
    <>
      <section
        className={styles.ssoBlock}
        aria-labelledby="sso-login-title"
      >
        <div className={styles.ssoBadge}>
          <span aria-hidden="true">✓</span>
          RECOMMENDED · 사내 직원
        </div>
        <h3 className={styles.panelTitle} id="sso-login-title">
          SSO 인증으로 로그인
        </h3>
        <p className={styles.panelDescription}>
          사내 계정은 Google Workspace, 네이버 또는 카카오 계정으로
          바로 인증합니다.
        </p>
        <button
          className={styles.ssoButton}
          onClick={() =>
            void signIn('google', { callbackUrl: '/settings' })
          }
          type="button"
        >
          <GoogleIcon />
          <span>Google Workspace로 계속하기</span>
        </button>
        <button
          className={styles.ssoButton}
          onClick={() =>
            void signIn('naver', { callbackUrl: '/settings' })
          }
          type="button"
        >
          <NaverIcon />
          <span>네이버로 계속하기</span>
        </button>
        <button
          className={styles.ssoButton}
          type="button"
          onClick={() =>
            void signIn('kakao', { callbackUrl: '/settings' })
          }
        >
          <KakaoIcon />
          <span>카카오로 계속하기</span>
        </button>
        <p className={styles.ssoHint}>
          회사 도메인 계정은 SSO 정책에 따라 접근 권한이 자동
          확인됩니다.
        </p>
      </section>

      <SecurityPolicy />
      <LoginHelp />
    </>
  );
}

function PartnerLoginPage({
  email,
  errorMessage,
  isSubmitting,
  onChangeEmail,
  onChangePassword,
  showPassword,
  onTogglePassword,
  password,
}: {
  email: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
  password: string;
}) {
  return (
    <>
      <section
        className={styles.partnerBlock}
        aria-labelledby="partner-login-title"
      >
        <h3 className={styles.panelTitle} id="partner-login-title">
          외부 협력자 로그인
        </h3>
        <p className={styles.panelDescription}>
          초대받은 협력자는 발급된 이메일과 패스워드로 로그인합니다.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            이메일
          </label>
          <div className={styles.inputWrap}>
            <Mail
              aria-hidden="true"
              className={styles.inputIcon}
              size={16}
            />
            <input
              autoComplete="email"
              className={styles.input}
              disabled={isSubmitting}
              id="login-email"
              name="email"
              onChange={(event) => onChangeEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHead}>
            <label className={styles.label} htmlFor="login-password">
              패스워드
            </label>
            {/* <a className={styles.smallLink} href="#">
              잊으셨나요?
            </a> */}
          </div>
          <div className={styles.inputWrap}>
            <KeyRound
              aria-hidden="true"
              className={styles.inputIcon}
              size={16}
            />
            <input
              autoComplete="current-password"
              className={styles.input}
              disabled={isSubmitting}
              id="login-password"
              name="password"
              onChange={(event) =>
                onChangePassword(event.target.value)
              }
              placeholder="••••••••••••"
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
            <button
              aria-label={
                showPassword ? '비밀번호 숨기기' : '비밀번호 표시'
              }
              aria-pressed={showPassword}
              className={styles.iconAction}
              onClick={onTogglePassword}
              type="button"
            >
              <Eye aria-hidden="true" size={16} />
            </button>
          </div>
        </div>

        <div className={styles.toggleRow}>
          <span className={styles.twoFa}>
            <Shield aria-hidden="true" size={12} />
            8시간 보안 세션
          </span>
          <span className={styles.twoFa}>
            <Shield aria-hidden="true" size={12} />
            2FA 다음 단계
          </span>
        </div>

        {errorMessage ? (
          <p className={styles.formError} role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          className={styles.submit}
          disabled={isSubmitting}
          type="submit"
        >
          <span>{isSubmitting ? '로그인 중' : '로그인'}</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </section>

      <SecurityPolicy />
      <LoginHelp />
    </>
  );
}

function SecurityPolicy() {
  return (
    <aside className={styles.policy}>
      <span aria-hidden="true" className={styles.policyIcon}>
        <Info size={14} />
      </span>
      <div>
        <strong className={styles.policyTitle}>보안 정책</strong>
        <p className={styles.policyBody}>
          {/* SuperAdmin·Operator 역할은 TOTP 2단계 인증이 필수입니다. */}
          8시간 비활동 시 자동 로그아웃 · 모든 로그인 시도는 감사
          로그에 기록됩니다.
        </p>
      </div>
    </aside>
  );
}

function LoginHelp() {
  return (
    <p className={styles.help}>
      계정 문제가 있으신가요?{' '}
      <Link
        className={styles.helpLink}
        href={`${ROUTES.CONTACT.GENERAL}#quick-form`}
      >
        IT 담당자에게 문의 →
      </Link>
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.googleIcon}
      height={20}
      viewBox="0 0 20 20"
      width={20}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.351z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0 0 10 20z"
        fill="#34A853"
      />
      <path
        d="M4.405 11.9a6.005 6.005 0 0 1 0-3.8V5.51H1.064a9.996 9.996 0 0 0 0 8.98L4.405 11.9z"
        fill="#FBBC05"
      />
      <path
        d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.96.99 12.695 0 10 0A9.996 9.996 0 0 0 1.064 5.51L4.405 8.1C5.19 5.736 7.395 3.977 10 3.977z"
        fill="#EA4335"
      />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.googleIcon}
      height={20}
      viewBox="0 0 20 20"
      width={20}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#03C75A" height={20} rx={4} width={20} />
      <path
        d="M5.693 5.661h2.394l2.425 3.724V5.661h2.395v8.678h-2.395l-2.425-3.723v3.723H5.693V5.661z"
        fill="#fff"
      />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg
      aria-hidden="true"
      className={styles.googleIcon}
      height={20}
      viewBox="0 0 20 20"
      width={20}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#FEE500" height={20} rx={4} width={20} />
      <path
        d="M10 5.2c-3.314 0-6 2.088-6 4.664 0 1.665 1.122 3.124 2.809 3.949l-.575 2.102a.215.215 0 0 0 .33.235l2.52-1.673c.3.034.606.052.916.052 3.314 0 6-2.088 6-4.665C16 7.288 13.314 5.2 10 5.2z"
        fill="#000"
        opacity="0.84"
      />
    </svg>
  );
}
