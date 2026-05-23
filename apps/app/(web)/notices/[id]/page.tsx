import type { Metadata } from 'next';

import { NoticeDetailPage } from '@/features/web/notices/notice-detail-page';

export const metadata: Metadata = {
  title: '공지사항 상세 — VisionFlow',
  description: 'VisionFlow 서비스 공지사항 상세 내용을 확인합니다.',
};

interface NoticeViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NoticeViewPage({ params }: NoticeViewPageProps) {
  const { id } = await params;
  return <NoticeDetailPage noticeId={id} />;
}
