import { Container } from '@/components/common/container';
import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import styles from './page.module.css';
/*
 FaqPage

 Props
 - faqs: IFaq[] - FAQ 목록 데이터입니다.
 - category?: string - 노출할 FAQ 카테고리입니다. 기본값은 "default"입니다.
 - description?: string - 기본 헤더 하단 설명 문구입니다.
 - headerSlot?: ReactNode - 기본 헤더 대신 렌더링할 커스텀 영역입니다.
 - helpSlot?: ReactNode - 기본 문의 박스 대신 렌더링할 커스텀 영역입니다.
 - isOpen?: number - open되어있는 답변변

 동작
 - faqs 중 category가 일치하는 항목만 보여줍니다.
 - question 기준으로 오름차순 정렬합니다.
 - headerSlot 또는 helpSlot을 전달하면 기본 영역이 대체됩니다.

 사용 예시
 const { data: faqs = [] } = useFaqListQuery();

 <FaqPage
   faqs={faqs}
   category="contact"
   description="자주 묻는 질문을 확인해보세요."
 />
*/
// FAQ를 question 기준으로 오름차순 정렬
function sortFaqs(faqs) {
    return [...faqs].sort((a, b) => (a.question ?? '').localeCompare(b.question ?? '', 'ko'));
}
export function FaqPage({ faqs, category = 'default', description = '미팅 전에 미리 답변해 드립니다. 더 궁금한 점은 카카오톡 채널로 바로 문의 가능합니다.', headerSlot, helpSlot, isOpen = 1 }) {
    const filteredFaqs = sortFaqs(faqs.filter((faq) => {
        const isVisible = faq.is_visible ?? faq.isVisible;
        return isVisible === true && faq.category?.trim() === category;
    }));
    const defaultHeader = (<header className={styles.sectionHead}>
      <span className={styles.eyebrow}>FAQ</span>
      <h2 className={styles.sectionTitle}>자주 묻는 질문</h2>
      {description && <p className={styles.sectionSub}>{description}</p>}
    </header>);
    const defaultHelp = (<div className={styles.faqHelp}>
      <div className={styles.faqHelpText}>
        <strong>답을 못 찾으셨나요?</strong>
        <span>
          카카오톡 채널로 바로 문의하시면 1영업일 안에 답변드립니다.
        </span>
      </div>
      <Link className={styles.faqHelpBtn} href={ROUTES.KAKAO}>
        카카오톡 1:1 문의
      </Link>
    </div>);
    return (<section className={styles.faq}>
      <Container>
        {headerSlot === undefined ? defaultHeader : headerSlot}

        <ul className={styles.faqList}>
          {filteredFaqs.map((f, i) => (<li className={styles.faqItem} key={f.id ?? f.question}>
              <details className={styles.faqDetails} open={i + 1 === isOpen}>
                <summary className={`${styles.faqQ} ${f.open ? styles.faqQActive : ''}`}>
                  <span className={styles.faqNum}>
                    Q{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.faqQText}>{f.question}</span>
                  <span aria-hidden="true" className={styles.faqToggle}/>
                </summary>
                {f.answer ? (<div className={styles.faqA}>
                    <hr className={styles.faqDivider}/>
                    <p className={styles.faqText}>{f.answer}</p>
                  </div>) : null}
              </details>
            </li>))}
        </ul>

        {helpSlot === undefined ? defaultHelp : helpSlot}
      </Container>
    </section>);
}
