import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

const KR_SERVICES = [
  ['✓ 토스', '✓ 카카오페이'],
  ['✓ 네이버 SEO', '✓ KakaoTalk'],
  ['✓ 한국어 i18n', '✓ K-이커머스'],
];

function KrMarketIllust() {
  return (
    <div className={styles.whyKrVisual}>
      <span className={styles.whyVisualEyebrow}>KR-FIRST</span>
      {KR_SERVICES.map((row, i) => (
        <div className={styles.whyKrRow} key={i}>
          {row.map((label) => (
            <span className={styles.whyKrTag} key={label}>
              <svg fill="none" height={10} viewBox="0 0 10 10" width={10}>
                <circle cx="5" cy="5" fill="rgba(0,79,255,0.12)" r="5" />
                <path d="M3 5l1.5 1.5L7 3.5" stroke="#004fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              </svg>
              {label.replace('✓ ', '')}
            </span>
          ))}
        </div>
      ))}
      <span className={styles.whyVisualSub}>국내 도메인 깊은 이해</span>
    </div>
  );
}

const whyCards = [
  {
    no: '01',
    title: 'End-to-End 풀스택',
    desc: '기획·디자인·AI 제작·웹 개발·운영까지. 한 팀이 책임지니 외주 단계마다 발생하던 커뮤니케이션 손실이 사라집니다.',
    image: '/images/why/why-01-flow.png',
  },
  {
    no: '02',
    title: 'Korean Market Fit',
    desc: '국내 마케팅·이커머스·교육 도메인에 대한 깊은 이해. 토스·카카오페이·네이버 SEO까지 현장에서 통하는 결과물을 만듭니다.',
    image: '/images/why/why-02-kr.png',
  },
  {
    no: '03',
    title: 'AI 도구 + 사람 디렉션',
    desc: 'AI는 빠른 생산을 위한 도구. 디자이너와 개발자가 디렉션하고, 결과물의 최종 책임은 우리 팀이 집니다.',
    image: '/images/why/why-03-ai.png',
  },
];

export function WhySection() {
  return (
    <section className={styles.why}>
      <Container>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>Why VisionFlow</span>
          <h2 className={styles.sectionTitle}>
            왜 VisionFlow를 선택해야 하나요?
          </h2>
          <p className={styles.sectionSub}>
            다른 곳과 다른 3가지 이유. 외주가 아닌 디지털 파트너십을
            추구합니다.
          </p>
        </header>
        <ul className={styles.whyGrid}>
          {whyCards.map((w) => (
            <li className={styles.whyItem} key={w.no}>
              <article className={styles.whyCard}>
                <div className={styles.whyVisual}>
                  <img
                    alt=""
                    aria-hidden="true"
                    className={styles.whyVisualImg}
                    src={w.image}
                  />
                </div>
                <div className={styles.whyBody}>
                  <span className={styles.whyNo}>{w.no}</span>
                  <h3 className={styles.whyTitle}>{w.title}</h3>
                  <p className={styles.whyDesc}>{w.desc}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
