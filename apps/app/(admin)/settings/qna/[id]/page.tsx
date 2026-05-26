import type { Metadata } from 'next';

import { QnaDetailPage } from '@/features/admin/qna/qna-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Q&A 게시판 상세',
  title: 'Q&A 상세 — VisionFlow Admin',
};

export default async function QnaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QnaDetailPage id={id} />;
}
