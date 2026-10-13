import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { AppScroll } from './app-scroll';

export const metadata: Metadata = {
  title: 'Last-mile Delivery Control | VisionFlow Prototype',
  description: 'Real-time delivery operations control center prototype.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppScroll>{children}</AppScroll>
      </body>
    </html>
  );
}
