import type { Metadata } from 'next';

import { DashboardPage } from '@/features/web/dashboard/dashboard-page';

export const metadata: Metadata = {
  title: '데이터 대시보드 · 운영 어드민 — VisionFlow',
  description:
    'BI 대시보드, 운영 어드민, 실시간 모니터링까지 — 50만 행도 끊김 없이 다루는 엔터프라이즈급 화면을 KPI 설계부터 운영 인계까지 한 팀이 책임집니다.',
};

export default function Page() {
  return <DashboardPage />;
}
