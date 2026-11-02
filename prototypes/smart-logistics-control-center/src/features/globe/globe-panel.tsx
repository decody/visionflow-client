'use client';

/**
 * 글로브 패널 — DeckGL(WebGL)은 클라이언트 전용이라 SSR을 끄고 동적 로드한다.
 * 로딩 중에는 정적 글로브 마크를 보여 레이아웃 점프를 막는다.
 */

import dynamic from 'next/dynamic';

const GlobeView3D = dynamic(() => import('./globe-view').then((m) => m.GlobeView3D), {
  ssr: false,
  loading: () => (
    <div className="globe-loading">
      <div className="globe-mark" aria-hidden />
      <p>글로브 로딩…</p>
    </div>
  ),
});

export function GlobePanel() {
  return <GlobeView3D />;
}
