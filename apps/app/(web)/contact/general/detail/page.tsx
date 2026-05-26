import type { Metadata } from 'next';

import { ContactGeneralDetailPage } from '@/features/web/contact/contact-general/detail/contact-general-detail-page';

export const metadata: Metadata = {
  title: 'AI 광고 이미지 100컷 작업 평균 기간 — VisionFlow',
  description:
    'Q&A 게시글 상세. 답변완료 — 100컷 규모 작업 일정·단가 안내.',
};

export default function ContactGeneralDetail() {
  return <ContactGeneralDetailPage />;
}
