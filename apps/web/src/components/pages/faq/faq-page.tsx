'use client';

import { Container } from '@/components/common/container';
import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import { IFaq } from '@/types/faq';
import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import styles from './faq-page.module.css';

export function Collapse({ faqs }: { faqs: IFaq[] }) {
  return (
    <ul className={styles.faqList}>
      {faqs.map((f, i) => (
        <li className={styles.faqItem} key={f.question}>
          <details className={styles.faqDetails} open={f.open}>
            <summary
              className={`${styles.faqQ} ${f.open ? styles.faqQActive : ''}`}
            >
              <span className={styles.faqNum}>
                Q{String(i + 1).padStart(2, '0')}
              </span>
              <span className={styles.faqQText}>{f.question}</span>
              <span
                aria-hidden="true"
                className={styles.faqToggle}
              >
                {f.open ? '−' : '+'}
              </span>
            </summary>
            {f.answer ? (
              <div className={styles.faqA}>
                <hr className={styles.faqDivider} />
                <p className={styles.faqText}>{f.answer}</p>
              </div>
            ) : null}
          </details>
        </li>
      ))}
    </ul>
  );
}

export function FaqPage() {
  const { data: faqs = [] } = useFaqListQuery();

  return (
    <section className={styles.faq}>
      <Container>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>FAQ</span>
          <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
          <p className={styles.sectionSub}>
            미팅 전에 미리 답변해 드립니다. 더 궁금한 점은 카카오톡
            채널로 바로 문의 가능합니다.
          </p>
        </header>
        <Collapse faqs={faqs} />
        <div className={styles.faqHelp}>
          <div className={styles.faqHelpText}>
            <strong>답을 못 찾으셨나요?</strong>
            <span>
              카카오톡 채널로 바로 문의하시면 1영업일 안에
              답변드립니다.
            </span>
          </div>
          <Link className={styles.faqHelpBtn} href={ROUTES.KAKAO}>
            카카오톡 1:1 문의
          </Link>
        </div>
      </Container>
    </section>
  );
}
