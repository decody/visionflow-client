import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import styles from '../home-page.module.css';

export function CtaSection() {
  return (
    <section className={styles.cta}>
      <div aria-hidden="true" className={styles.ctaOrb1} />
      <div aria-hidden="true" className={styles.ctaOrb2} />
      <div aria-hidden="true" className={styles.ctaGrid} />
      <div className={styles.ctaInner}>
        <span className={styles.ctaEyebrow}>
          <span aria-hidden="true" className={styles.ctaEyebrowDot} />
          Start Your Project
        </span>
        <h2 className={styles.ctaTitle}>지금 시작해보세요</h2>
        <p className={styles.ctaSub}>
          아이디어 단계여도 좋습니다. 30분 무료 상담으로 가능성을 먼저
          확인해보세요.
        </p>
        <div className={styles.ctaButtons}>
          <Link
            className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}
            href={ROUTES.CONTACT.ROOT}
          >
            무료 견적 받기 <span aria-hidden="true">→</span>
          </Link>
          <Link
            className={`${styles.ctaButton} ${styles.ctaButtonGhost}`}
            href={ROUTES.KAKAO}
          >
            <span aria-hidden="true">💬</span> 카카오톡 문의
          </Link>
        </div>
        <ul className={styles.ctaTrust}>
          <li>✓ 1영업일 응답</li>
          <li>✓ 무료 진단</li>
          <li>✓ NDA 사전 가능</li>
        </ul>
      </div>
    </section>
  );
}
