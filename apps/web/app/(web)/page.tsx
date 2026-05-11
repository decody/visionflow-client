import type { Metadata } from 'next';

import { HomePage } from '@/features/home/home-page';

export const metadata: Metadata = {
  title: 'VisionFlow — AI 기반 디지털 스튜디오',
  description:
    'AI는 도구, 결과물은 우리의 책임. 웹 3D, 광고 이미지, 웹·앱, 데이터 대시보드까지 한 팀이 만듭니다.',
};

export default function Home() {
  return <HomePage />;
}
