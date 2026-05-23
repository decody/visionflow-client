import type { Metadata } from 'next';

import { FaqWritePage } from '@/features/admin/faq/faq-write-page';

export const metadata: Metadata = {
  title: 'FAQ 등록 — VisionFlow Admin',
  description: '자주 묻는 질문과 답변을 작성합니다.',
};

export default function FaqWrite() {
  return <FaqWritePage />;
}
