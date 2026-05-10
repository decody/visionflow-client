import type { Metadata } from 'next';

import { PartnershipListPage } from '../../../src/features/partnership/partnership-list-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 제휴 문의 관리',
  title: '제휴 문의 — VisionFlow Admin',
};

export default function Partnership() {
  return <PartnershipListPage />;
}
