import type { Metadata } from 'next';

import { QuoteRequestDetailPage } from '../../../../src/features/quote-request/quote-request-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 견적 문의 상세 — 견적서 작성',
  title: '견적 문의 상세 — VisionFlow Admin',
};

export default async function QuoteRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuoteRequestDetailPage id={id} />;
}
