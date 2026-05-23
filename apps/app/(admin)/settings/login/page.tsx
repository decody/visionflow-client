import type { Metadata } from 'next';

import { LoginPage } from '@/features/admin/auth/login-page';
import type { LoginAccessMode } from '@/features/admin/auth/login-form-page';

export const metadata: Metadata = {
  description: 'VisionFlow 운영자 전용 로그인',
  title: '로그인 — VisionFlow Admin',
};

type LoginSearchParams = Promise<{
  error?: string | string[];
  mode?: string | string[];
}>;

function getInitialAccessMode(mode: string | string[] | undefined) {
  const value = Array.isArray(mode) ? mode[0] : mode;

  return value === 'partner' ? 'partner' : 'sso';
}

export default async function Login({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const params = await searchParams;
  const initialAccessMode: LoginAccessMode = getInitialAccessMode(
    params.mode,
  );
  const error = Array.isArray(params.error)
    ? params.error[0]
    : params.error;

  return (
    <LoginPage
      initialAccessMode={initialAccessMode}
      ssoError={error ?? null}
    />
  );
}
