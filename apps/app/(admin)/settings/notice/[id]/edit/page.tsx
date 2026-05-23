import type { Metadata } from 'next';

import { NoticeEditPage } from '@/features/admin/notices/notice-edit-page';

export const metadata: Metadata = {
  title: '공지사항 수정 — VisionFlow Admin',
  description: '등록된 공지사항 내용을 수정합니다.',
};

export default function NoticeEdit() {
  return <NoticeEditPage />;
}
