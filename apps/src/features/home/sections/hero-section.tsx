import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import styles from '../home-page.module.css';

const heroChips = [
  {
    label: 'Web 3D',
    color: '#8c4dd9',
    rotate: 2,
    top: 560,
    left: 158.92,
  },
  {
    label: 'Ad Visuals',
    color: '#f26659',
    rotate: -1,
    top: 598,
    left: 380,
  },
  {
    label: 'Web & App',
    color: '#338cff',
    rotate: 1,
    top: 600,
    left: 879,
  },
  {
    label: 'Dashboard',
    color: '#33c78c',
    rotate: -2,
    top: 566,
    left: 1100,
  },
];

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div aria-hidden="true" className={styles.heroBackdrop} />
      <div aria-hidden="true" className={styles.heroGlow1} />
      <div aria-hidden="true" className={styles.heroGlow2} />
      <div aria-hidden="true" className={styles.heroGlow3} />
      <div aria-hidden="true" className={styles.heroGrid} />
      <div className={styles.heroCenter}>
        <span className={styles.heroEyebrow}>
          <span aria-hidden="true" className={styles.heroEyebrowDot} />
          AI-powered Digital Studio · 2026 New
        </span>
        <h1 className={styles.heroTitle}>
          AI는 도구,
          <br />
          결과물은 우리의 책임.
        </h1>
        <p className={styles.heroSub}>
          웹 3D, 광고 이미지, 웹·앱, 데이터 대시보드까지 — 한 팀이
          만듭니다.
        </p>
        <div className={styles.heroCtas}>
          <Link
            className={`${styles.heroCta} ${styles.heroCtaPrimary}`}
            href={ROUTES.CONTACT}
          >
            무료 견적 받기 <span aria-hidden="true">→</span>
          </Link>
          <Link
            className={`${styles.heroCta} ${styles.heroCtaGhost}`}
            href={ROUTES.WORK}
          >
            포트폴리오 보기
          </Link>
        </div>
      </div>
      {heroChips.map((c) => (
        <span
          aria-hidden="true"
          className={styles.heroFloatChip}
          key={c.label}
          style={{
            top: `${c.top}px`,
            left: `${c.left}px`,
            transform: `rotate(${c.rotate}deg)`,
          }}
        >
          <span
            className={styles.heroFloatDot}
            style={{ background: c.color }}
          />
          {c.label}
        </span>
      ))}
      <div aria-hidden="true" className={styles.heroScroll}>
        <span className={styles.heroScrollText}>Scroll to explore</span>
        <span className={styles.heroScrollIcon}>↓</span>
      </div>
    </section>
  );
}
