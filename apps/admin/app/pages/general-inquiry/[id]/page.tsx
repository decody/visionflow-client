import type { Metadata } from 'next';

import { GeneralInquiryDetailPage } from '../../../../src/features/general-inquiry/general-inquiry-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 일반 문의 상세 — 답변 작성',
  title: '일반 문의 상세 — VisionFlow Admin',
};

export default async function GeneralInquiryDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GeneralInquiryDetailPage id={id} />;
}
