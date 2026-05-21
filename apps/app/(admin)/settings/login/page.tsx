import type { Metadata } from 'next';

import { LoginPage } from '@/features/login/login-page';
import type { LoginAccessMode } from '@/features/login/login-form-page';

export const metadata: Metadata = {
  description: 'VisionFlow 운영자 전용 로그인',
  title: '로그인 — VisionFlow Admin',
};

type LoginSearchParams = Promise<{
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

  return <LoginPage initialAccessMode={initialAccessMode} />;
}
