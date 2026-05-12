import type { Metadata } from 'next';

import { UsersInvitePage } from '@/features/users/users-invite-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 새 사용자 초대 — 역할·인증·환영 메시지',
  title: '새 사용자 초대 — VisionFlow Admin',
};

export default function UsersInvite() {
  return <UsersInvitePage />;
}
