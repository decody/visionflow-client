import type { Metadata } from 'next';

import { ContactQuotePage } from '@/features/web/contact/contact-quote/contact-quote-page';

export const metadata: Metadata = {
  title: '견적 문의 — VisionFlow',
  description:
    '프로젝트 견적 요청 — 서비스·웹·앱·3D/AI·콘텐츠 등 개발/기획/디자인·운영까지 무엇이든 문의 주세요. 1~3 영업일 내에 담당자가 직접 답변 드립니다.',
};

export default function ContactQuote() {
  return <ContactQuotePage />;
}
