'use client';

import { LoginBrandPage } from './login-brand-page';
import { LoginFormPage } from './login-form-page';
import styles from './login-page.module.css';

export function LoginPage() {
  return (
    <div className={styles.shell}>
      <LoginBrandPage />
      <LoginFormPage />
    </div>
  );
}
