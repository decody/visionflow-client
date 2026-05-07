import '@visionflow/ui/styles/fonts.css';
import '@visionflow/ui/styles/tokens.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import 'antd/dist/reset.css';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '../src/components/query-provider';

export const metadata: Metadata = {
  description: 'VisionFlow realtime computer vision operations dashboard',
  title: 'VisionFlow',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
