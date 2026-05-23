import type { Metadata } from 'next';

import { NoticesPage } from '@/features/web/notices/notices-page';

export const metadata: Metadata = {
  title: '공지사항 — VisionFlow',
  description: 'VisionFlow 서비스 공지사항을 확인합니다.',
};

export default function Notices() {
  return <NoticesPage />;
}
