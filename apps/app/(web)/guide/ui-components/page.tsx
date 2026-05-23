import type { Metadata } from 'next';

import { UiComponentsPage } from '@/features/web/guide/ui-components-page';

export const metadata: Metadata = {
  title: 'UI Components — VisionFlow',
  description: 'VisionFlow UI 컴포넌트 레퍼런스',
};

export default function UIComponents() {
  return <UiComponentsPage />;
}
