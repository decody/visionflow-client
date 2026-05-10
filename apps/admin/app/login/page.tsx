import type { Metadata } from 'next';

import { LoginPage } from '../../src/features/login/login-page';

export const metadata: Metadata = {
  description: 'VisionFlow 운영자 전용 로그인',
  title: '로그인 — VisionFlow Admin',
};

export default function Login() {
  return <LoginPage />;
}
