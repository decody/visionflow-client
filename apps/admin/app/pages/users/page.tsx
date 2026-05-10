import type { Metadata } from 'next';

import { UsersListPage } from '../../../src/features/users/users-list-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 사용자 관리 — 역할·2FA·세션 현황',
  title: '사용자 관리 — VisionFlow Admin',
};

export default function Users() {
  return <UsersListPage />;
}
