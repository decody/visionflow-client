import type { Metadata } from 'next';

import { NoticeListPage } from '@/features/admin/notices/notice-list-page';

export const metadata: Metadata = {
  title: '공지사항 관리 — VisionFlow Admin',
  description: '등록된 공지사항과 공개 상태를 확인합니다.',
};

export default function Notice() {
  return <NoticeListPage />;
}
