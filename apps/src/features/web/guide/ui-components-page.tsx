'use client';

import { FaqPage } from '@/components/common/faq/page';
import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';

function CustomHeader() {
  return <div>asdf</div>;
}

export function UiComponentsPage() {
  const { data: faqs = [] } = useFaqListQuery();

  return (
    <FaqPage
      category="contact"
      faqs={faqs}
      isOpen={2}
      headerSlot={<CustomHeader />}
    />
  );
}
