import type { Metadata } from 'next';

import { ContactPartnershipPage } from '@/features/web/contact/contact-partnership/contact-partnership-page';

export const metadata: Metadata = {
  title: '제휴 문의 — VisionFlow',
  description:
    '외주 협력사·리셀러·기술 파트너·콘텐츠 파트너 — 사업 협력을 함께할 동료를 찾습니다. 1~3 영업일 내에 사업총괄이 직접 검토 후 답변 드립니다.',
};

export default function ContactPartnership() {
  return <ContactPartnershipPage />;
}
