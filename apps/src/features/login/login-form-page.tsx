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
import { useState } from 'react';

import styles from './login-page.module.css';

export function LoginFormPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [language, setLanguage] = useState<'KO' | 'EN'>('KO');

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

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <header className={styles.formHeader}>
          <h2 className={styles.formTitle}>로그인</h2>
          <p className={styles.formSubtitle}>
            VisionFlow 운영자만 접근 가능한 페이지입니다.
          </p>
        </header>

        <section className={styles.ssoBlock}>
          <div className={styles.ssoBadge}>
            <span aria-hidden="true">✓</span>
            RECOMMENDED · 사내 직원
          </div>
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
          <p className={styles.ssoHint}>
            Google Workspace 또는 네이버 계정으로 로그인할 수 있습니다
          </p>
        </section>

        <div className={styles.divider}>
          <span>또는 외부 협력자</span>
        </div>

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
              id="login-email"
              name="email"
              placeholder="name@example.com"
              type="email"
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHead}>
            <label className={styles.label} htmlFor="login-password">
              패스워드
            </label>
            <a className={styles.smallLink} href="#">
              잊으셨나요?
            </a>
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
              id="login-password"
              name="password"
              placeholder="••••••••••••"
              type={showPassword ? 'text' : 'password'}
            />
            <button
              aria-label={
                showPassword ? '비밀번호 숨기기' : '비밀번호 표시'
              }
              aria-pressed={showPassword}
              className={styles.iconAction}
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              <Eye aria-hidden="true" size={16} />
            </button>
          </div>
        </div>

        <div className={styles.toggleRow}>
          <label className={styles.checkbox}>
            <input
              className={styles.checkboxInput}
              name="remember"
              type="checkbox"
            />
            <span aria-hidden="true" className={styles.checkboxBox} />
            <span>7일간 로그인 유지</span>
          </label>
          <span className={styles.twoFa}>
            <Shield aria-hidden="true" size={12} />
            2FA 다음 단계
          </span>
        </div>

        <button className={styles.submit} type="submit">
          <span>로그인</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>

        <aside className={styles.policy}>
          <span aria-hidden="true" className={styles.policyIcon}>
            <Info size={14} />
          </span>
          <div>
            <strong className={styles.policyTitle}>보안 정책</strong>
            <p className={styles.policyBody}>
              SuperAdmin·Sales 역할은 TOTP 2단계 인증이 필수입니다.
              8시간 비활동 시 자동 로그아웃 · 모든 로그인 시도는 감사
              로그에 기록됩니다.
            </p>
          </div>
        </aside>

        <p className={styles.help}>
          계정 문제가 있으신가요?{' '}
          <a className={styles.helpLink} href="#">
            IT 담당자에게 문의 →
          </a>
        </p>
      </form>
    </main>
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
