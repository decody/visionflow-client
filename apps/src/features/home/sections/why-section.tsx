import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

const whyCards = [
  {
    no: '01',
    title: 'End-to-End 풀스택',
    desc: '기획·디자인·AI 제작·웹 개발·운영까지. 한 팀이 책임지니 외주 단계마다 발생하던 커뮤니케이션 손실이 사라집니다.',
    eyebrow: 'ONE TEAM',
    sub: '커뮤니케이션 손실 0회',
    icon: 'flow',
  },
  {
    no: '02',
    title: 'Korean Market Fit',
    desc: '국내 마케팅·이커머스·교육 도메인에 대한 깊은 이해. 토스·카카오페이·네이버 SEO까지 현장에서 통하는 결과물을 만듭니다.',
    eyebrow: 'KR-FIRST',
    sub: '국내 도메인 깊은 이해',
    icon: 'kr',
  },
  {
    no: '03',
    title: 'AI 도구 + 사람 디렉션',
    desc: 'AI는 빠른 생산을 위한 도구. 디자이너와 개발자가 디렉션하고, 결과물의 최종 책임은 우리 팀이 집니다.',
    eyebrow: 'AI + HUMAN',
    sub: '결과물의 책임은 사람이',
    icon: 'ai',
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
                  <span className={styles.whyVisualEyebrow}>
                    {w.eyebrow}
                  </span>
                  <div
                    className={`${styles.whyIllust} ${
                      styles[`whyIllust_${w.icon}`] ?? ''
                    }`}
                  />
                  <span className={styles.whyVisualSub}>{w.sub}</span>
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
