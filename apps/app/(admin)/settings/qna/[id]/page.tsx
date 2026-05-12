import type { Metadata } from 'next';

import { QnaDetailPage } from '@/features/qna/qna-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS Q&A 상세 — 답변 작성 및 처리',
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
