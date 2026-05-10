import type { Metadata } from 'next';

import { PartnershipDetailPage } from '../../../../src/features/partnership/partnership-detail-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 제휴 문의 상세 — 회신 작성',
  title: '제휴 문의 상세 — VisionFlow Admin',
};

export default async function PartnershipDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PartnershipDetailPage id={id} />;
}
