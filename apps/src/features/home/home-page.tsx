'use client';

import { FaqPage } from '@/components/common/faq/page';
import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import { useWorkListQuery } from '@/hooks/works/useWorkQuery';
import { CtaSection } from './sections/cta-section';
import { FeaturedWorkSection } from './sections/featured-work-section';
import { HeroSection } from './sections/hero-section';
import { LogosSection } from './sections/logos-section';
import { ProcessSection } from './sections/process-section';
import { ServicesSection } from './sections/services-section';
import { StatsSection } from './sections/stats-section';
import { TestimonialsSection } from './sections/testimonials-section';
import { WhySection } from './sections/why-section';

export function HomePage() {
  // 자주하는 질문
  const { data: faqs = [] } = useFaqListQuery();
  const { data: worksData = [] } = useWorkListQuery();

  return (
    <>
      <HeroSection />
      <ServicesSection />
      <WhySection />
      <FeaturedWorkSection works={worksData} />
      <StatsSection works={worksData} />
      <ProcessSection />
      <LogosSection />
      <TestimonialsSection />

      {/* 자주하는 질문 */}
      <FaqPage faqs={faqs} />

      <CtaSection />
    </>
  );
}
