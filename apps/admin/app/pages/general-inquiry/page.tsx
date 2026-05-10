import type { Metadata } from 'next';

import { GeneralInquiryListPage } from '../../../src/features/general-inquiry/general-inquiry-list-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 일반 문의 관리',
  title: '일반 문의 — VisionFlow Admin',
};

export default function GeneralInquiry() {
  return <GeneralInquiryListPage />;
}
