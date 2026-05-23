import type { Metadata } from 'next';

import { DesignSystemPage } from '@/features/web/guide/design-system-page';

export const metadata: Metadata = {
  title: 'Design System — VisionFlow',
  description: 'VisionFlow 디자인 시스템 토큰 레퍼런스',
};

export default function DesignSystem() {
  return <DesignSystemPage />;
}
