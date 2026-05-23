import type { Metadata } from 'next';

import { QuoteRequestListPage } from '@/features/admin/quote-request/quote-request-list-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 견적 문의 관리',
  title: '견적 문의 — VisionFlow Admin',
};

export default function QuoteRequest() {
  return <QuoteRequestListPage />;
}
