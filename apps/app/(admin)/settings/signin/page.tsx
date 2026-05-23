import type { Metadata } from 'next';

import { SigninPage } from '@/features/admin/auth/signin-page';

export const metadata: Metadata = {
  description: '초대 토큰을 통한 VisionFlow 운영자 계정 등록',
  title: '계정 등록 — VisionFlow Admin',
};

export default function Signin() {
  return <SigninPage />;
}
