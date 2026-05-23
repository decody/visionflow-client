import type { Metadata } from 'next';

import { FaqListPage } from '@/features/admin/faq/faq-list-page';

export const metadata: Metadata = {
  title: 'FAQ 관리 — VisionFlow Admin',
  description: '자주 묻는 질문을 등록하고 노출 상태를 관리합니다.',
};

export default function Faq() {
  return <FaqListPage />;
}
