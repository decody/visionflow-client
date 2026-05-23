import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

interface Testimonial {
  body: string;
  author: string;
  role: string;
  category: string;
  initial: string;
  avatarColor: string;
}

const testimonials: Testimonial[] = [
  {
    body: '광고 이미지 100컷을 일주일 안에 받았는데 브랜드 톤이 일관됐습니다. AI를 쓴다는 게 이런 거구나 싶었어요.',
    author: '김민지',
    role: '마케팅 리드 · 뷰티 스타트업 K',
    category: '광고 이미지',
    initial: '김',
    avatarColor: '#f28c59',
  },
  {
    body: '디자인부터 개발, 운영까지 한 팀이 책임지니 커뮤니케이션 시간이 정말 줄어듭니다. 내부에 개발팀 둔 느낌이에요.',
    author: '이준호',
    role: 'CTO · EdTech Startup',
    category: '웹·앱 개발',
    initial: '이',
    avatarColor: '#4d8cd9',
  },
  {
    body: '대시보드를 만들면서 어떤 지표를 보여줘야 할지부터 같이 고민해줬어요. 외주가 아니라 컨설팅에 가까웠습니다.',
    author: '박서연',
    role: 'PO · Fintech Co.',
    category: '데이터 대시보드',
    initial: '박',
    avatarColor: '#4db28c',
  },
];

export function TestimonialsSection() {
  return (
    <section className={styles.testimonials}>
      <Container>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>Testimonials</span>
          <h2 className={styles.sectionTitle}>
            실제 사용해본 분들의 이야기
          </h2>
          <p className={styles.sectionSub}>
            의사결정자들이 직접 남긴 후기. 가공 없이 그대로 옮겼습니다.
          </p>
        </header>
        <ul className={styles.tGrid}>
          {testimonials.map((t) => (
            <li className={styles.tItem} key={t.author}>
              <article className={styles.tCard}>
                <span aria-hidden="true" className={styles.tQuote}>
                  “
                </span>
                <p className={styles.tText}>{t.body}</p>
                <div className={styles.tAuthor}>
                  <span
                    aria-hidden="true"
                    className={styles.tAvatar}
                    style={{ background: t.avatarColor }}
                  >
                    {t.initial}
                  </span>
                  <div className={styles.tAuthorText}>
                    <strong>{t.author}</strong>
                    <span>{t.role}</span>
                  </div>
                  <span className={styles.tCategory}>{t.category}</span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
