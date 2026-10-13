'use client';

import 'overlayscrollbars/overlayscrollbars.css';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import type { ReactNode } from 'react';

/**
 * 페이지 전체 스크롤 호스트(네이티브 스크롤바 대체) — OverlayScrollbars.
 * 데스크톱에서는 shell이 뷰포트에 꽉 차 스크롤이 생기지 않고,
 * 화면이 좁아 내용이 뷰포트를 넘으면 이 오버레이 스크롤바가 처리한다.
 */
export function AppScroll({ children }: { children: ReactNode }) {
  return (
    <OverlayScrollbarsComponent
      className="app-scroll"
      defer
      options={{ scrollbars: { theme: 'os-theme-light', autoHide: 'leave', autoHideDelay: 400 } }}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
