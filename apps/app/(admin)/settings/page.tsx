import type { Metadata } from 'next';

import { DashboardPage } from '@/features/admin/dashboard/dashboard-page';

export const metadata: Metadata = {
  description: 'VisionFlow CMS 운영자 대시보드',
  title: '대시보드 — VisionFlow Admin',
};

export default function Home() {
  return <DashboardPage />;
}
