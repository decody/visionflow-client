import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Dior Gallery — Web 3D Study',
  description: 'An independent VisionFlow Web3D portfolio prototype.',
  openGraph: {
    title: 'Dior Gallery — A Visionflow Web3D Study',
    description: 'Four spatial chapters exploring archive, craft, color, and dream through responsive WebGL.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dior Gallery — A Visionflow Web3D Study',
    description: 'An independent conceptual Web3D exhibition by Visionflow.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
