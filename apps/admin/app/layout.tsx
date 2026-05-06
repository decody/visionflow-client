import 'antd/dist/reset.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '../src/styles/global.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '../src/components/query-provider';

export const metadata: Metadata = {
  description: 'VisionFlow admin console',
  title: 'VisionFlow Admin',
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
