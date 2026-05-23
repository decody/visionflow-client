import type { Metadata } from 'next';

import { NoticeWritePage } from '@/features/admin/notices/notice-write-page';

export const metadata: Metadata = {
  title: '공지사항 등록 — VisionFlow Admin',
  description: '사용자에게 노출할 공지사항 내용을 작성합니다.',
};

export default function NoticeWrite() {
  return <NoticeWritePage />;
}
