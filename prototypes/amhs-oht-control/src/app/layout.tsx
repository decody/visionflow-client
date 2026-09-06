import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Factory AMHS/OHT Control — VisionFlow Prototype',
  description:
    '반도체 FAB의 OHT·AGV·Rail을 실내 좌표계 위에서 실시간 관제하는 VisionFlow 포트폴리오 프로토타입.',
  openGraph: {
    title: 'Smart Factory AMHS/OHT Control',
    description:
      '실내 좌표계 + 고밀도 OHT + LOD. WebSocket 델타 파이프라인과 WebGL 렌더링을 다루는 관제 프로토타입.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
