import type { Metadata } from 'next';

import { ContactGeneralWritePage } from '@/features/contact/contact-general/contact-general-write-page';

export const metadata: Metadata = {
  title: 'Q&A 등록 | VisionFlow',
  description:
    'VisionFlow 일반 문의 Q&A 게시판에 질문을 등록합니다.',
};

export default function ContactGeneralWrite() {
  return <ContactGeneralWritePage />;
}
