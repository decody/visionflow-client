import type { Metadata } from 'next';

import { FaqDetailPage } from '@/features/admin/faq/faq-detail-page';

export const metadata: Metadata = {
  title: 'FAQ 상세 — VisionFlow Admin',
  description: '등록된 FAQ 내용을 확인합니다.',
};

export default function FaqDetail() {
  return <FaqDetailPage />;
}
