import type { Metadata } from 'next';

import { ContactGeneralPage } from '@/features/contact-general/contact-general-page';

export const metadata: Metadata = {
  title: '일반 문의 / Q&A — VisionFlow',
  description:
    '서비스 관련 일반 질문이나 Q&A 게시판을 통해 문의해주세요. 비공개 정보가 포함된 경우 비밀글로 작성하시면 NDA 검토 후 답변 드립니다.',
};

export default function ContactGeneral() {
  return <ContactGeneralPage />;
}
