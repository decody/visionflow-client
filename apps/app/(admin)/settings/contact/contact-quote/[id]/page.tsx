import type { Metadata } from 'next';

import { QuoteRequestDetailPage } from '@/features/admin/contact/contact-quote/quote-request-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 견적 문의 상세',
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
