import type { Metadata } from 'next';

import { ContactPage } from '@/features/web/contact/contact-page';

export const metadata: Metadata = {
  title: '문의하기 — VisionFlow',
  description:
    '견적 문의부터 제휴까지, 가장 빠른 채널을 선택해 주세요. 영업일 기준 24시간 내에 답변 드립니다.',
};

export default function Contact() {
  return <ContactPage />;
}
