import type { Metadata } from 'next';

import { FaqEditPage } from '@/features/admin/faq/faq-edit-page';

export const metadata: Metadata = {
  title: 'FAQ 수정 — VisionFlow Admin',
  description: '등록된 FAQ 질문과 답변을 수정합니다.',
};

export default function FaqEdit() {
  return <FaqEditPage />;
}
