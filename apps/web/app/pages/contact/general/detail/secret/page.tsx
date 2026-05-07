import type { Metadata } from 'next';

import { ContactGeneralDetailSecretPage } from '@/features/contact-general-detail-secret/contact-general-detail-secret-page';

export const metadata: Metadata = {
  title: '비밀글 보호 — VisionFlow',
  description:
    '비밀글 인증 흐름의 4가지 STATE 시각화: 비밀번호 입력 모달 / 입력 오류 / 인증 후 본문 / 5회 실패 lockout.',
};

export default function ContactGeneralDetailSecret() {
  return <ContactGeneralDetailSecretPage />;
}
