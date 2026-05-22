'use client';

import { LoginBrandPage } from './login-brand-page';
import {
  LoginFormPage,
  type LoginAccessMode,
} from './login-form-page';
import styles from './login-page.module.css';

export function LoginPage({
  initialAccessMode,
  ssoError,
}: {
  initialAccessMode?: LoginAccessMode;
  ssoError?: string | null;
}) {
  return (
    <div className={styles.shell}>
      <LoginBrandPage />
      <LoginFormPage
        initialAccessMode={initialAccessMode}
        ssoError={ssoError}
      />
    </div>
  );
}
