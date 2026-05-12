import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import styles from './web-footer.module.css';

const serviceLinks = [
  { href: ROUTES.WEB_3D, label: '웹 3D' },
  { href: ROUTES.AD_VISUALS, label: '광고 이미지' },
  { href: ROUTES.WEB_APP, label: '웹/앱 개발' },
  { href: ROUTES.DASHBOARD, label: '데이터 대시보드' },
];

const companyLinks = [
  { href: ROUTES.ABOUT, label: 'About' },
  { href: ROUTES.WORK, label: 'Work' },
  { href: ROUTES.CONTACT, label: '문의하기' },
  { href: ROUTES.KAKAO, label: '카카오톡 채널' },
];

const tagline = 'AI 기반 디지털 스튜디오';
const serviceTitle = '서비스';
const companyTitle = '회사';
const termsLabel = '이용약관';
const privacyLabel = '개인정보 처리방침';

export function WebFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <Link aria-label="VisionFlow home" className={styles.brand} href={ROUTES.HOME}>
              <span aria-hidden="true" className={styles.logoMark}>
                <span className={styles.logoGreen} />
                <span className={styles.logoBlack} />
              </span>
              <span className={styles.logoText}>VISIONFLOW</span>
            </Link>
            <p className={styles.tagline}>{tagline}</p>
          </div>

          <nav aria-label="Footer service navigation" className={styles.linkGroup}>
            <h2 className={styles.groupTitle}>{serviceTitle}</h2>
            {serviceLinks.map((item) => (
              <Link className={styles.footerLink} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Footer company navigation" className={styles.linkGroup}>
            <h2 className={styles.groupTitle}>{companyTitle}</h2>
            {companyLinks.map((item) => (
              <Link className={styles.footerLink} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>&copy; 2026 VisionFlow. All rights reserved.</p>
          <nav aria-label="Footer legal navigation" className={styles.legalLinks}>
            <Link href={ROUTES.TERMS}>{termsLabel}</Link>
            <Link href={ROUTES.PRIVACY}>{privacyLabel}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
