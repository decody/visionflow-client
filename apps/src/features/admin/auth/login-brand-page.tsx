import styles from './login-page.module.css';

const STAT_CARDS = [
  { caption: '채널', label: '통합 인박스', value: '4' },
  { caption: '24h 응답', label: 'SLA 준수', value: '95%' },
  { caption: '필드 폼', label: 'Work 빌더', value: '24' },
  { caption: 'append-only', label: '감사 로그', value: '∞' },
] as const;

export function LoginBrandPage() {
  return (
    <section className={styles.brand} aria-hidden="true">
      <div className={styles.brandGrid} />
      <div className={styles.brandGlow1} />
      <div className={styles.brandGlow2} />
      <div className={styles.brandGlow3} />

      <header className={styles.brandHeader}>
        <span className={styles.logoMark}>VF</span>
        <span className={styles.logoName}>VISIONFLOW</span>
        <span className={styles.logoBadge}>ADMIN</span>
      </header>

      <div className={styles.brandHero}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          CMS · Operations Console
        </p>
        <h1 className={styles.brandTitle}>
          운영의 모든 것이
          <br />한 화면에서.
        </h1>
        <p className={styles.brandLead}>
          견적·제휴·일반·Q&A 4채널 인박스, Work 케이스 발행, SLA
          모니터링, 감사 로그까지 — VisionFlow가 직접 만들어 운영하는
          어드민 콘솔.
        </p>
      </div>

      <ul className={styles.statGrid}>
        {STAT_CARDS.map((stat) => (
          <li className={styles.statCard} key={stat.label}>
            <span className={styles.statDot} />
            <strong className={styles.statValue}>{stat.value}</strong>
            <span className={styles.statLabel}>{stat.label}</span>
            <span className={styles.statCaption}>{stat.caption}</span>
          </li>
        ))}
      </ul>

      <footer className={styles.brandFooter}>
        <span>© 2026 VisionFlow Inc.</span>
        <nav className={styles.brandFooterNav} aria-label="legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Status</a>
        </nav>
      </footer>
    </section>
  );
}
