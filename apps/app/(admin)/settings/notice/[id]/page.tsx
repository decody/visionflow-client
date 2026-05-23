import type { Metadata } from 'next';

import { NoticeDetailPage } from '@/features/admin/notices/notice-detail-page';

export const metadata: Metadata = {
  title: '공지사항 상세 — VisionFlow Admin',
  description: '등록된 공지사항의 공개 정보와 본문을 확인합니다.',
};

export default function NoticeDetail() {
  return <NoticeDetailPage />;
}
