import type { Metadata } from 'next';

import { WorkPage } from '@/features/web/work/work-page';

export const metadata: Metadata = {
  title: 'Work — VisionFlow',
  description:
    '120+ 프로젝트를 통해 검증된 역량. 각 케이스는 고객이 마주한 문제와 우리가 만든 해결 방식을 담고 있습니다.',
};

export default function Work() {
  return <WorkPage />;
}
