import type { Metadata } from 'next';

import { ContactGeneralDetailClientPage } from '@/features/web/contact/contact-general/detail/contact-general-detail-client-page';

export const metadata: Metadata = {
  title: 'Q&A 상세 — VisionFlow',
  description: 'VisionFlow Q&A 게시글 상세',
};

export default async function ContactGeneralDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ContactGeneralDetailClientPage id={id} />;
}
