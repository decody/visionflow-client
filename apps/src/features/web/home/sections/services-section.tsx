import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

interface ServiceCard {
  category: string;
  title: string;
  desc: string;
  tags: string[];
  badge: string;
  href: string;
  visual: 'web3d' | 'adVisual' | 'webApp' | 'dashboard';
}

const services: ServiceCard[] = [
  {
    category: '웹 3D',
    title: '화면에 깊이를 더하다',
    desc: '제품을 360°로, 공간을 인터랙티브하게. 웹 브라우저 안에서 펼쳐지는 3D 경험을 설계합니다.',
    tags: ['Three.js', '컨피규레이터', '가상 쇼룸', 'AR 미리보기'],
    badge: '3D · INTERACTIVE',
    href: ROUTES.WEB_3D,
    visual: 'web3d',
  },
  {
    category: '광고 이미지',
    title: '클릭을 부르는 한 장',
    desc: '제품 컷부터 캠페인 키 비주얼까지. AI로 빠르게, 브랜드 톤은 일관되게.',
    tags: ['이커머스 상세컷', 'SNS 멀티 비율', '4K 고해상도', '톤 학습'],
    badge: '100+ VARIATIONS',
    href: ROUTES.AD_VISUALS,
    visual: 'adVisual',
  },
  {
    category: '웹 · 앱 개발',
    title: '기획부터 배포까지 한 팀',
    desc: '랜딩페이지부터 이커머스, 모바일 앱까지. Next.js와 React Native 기반의 최신 스택.',
    tags: ['Next.js 14', 'React Native', 'SEO 최적화', 'CMS 연동'],
    badge: 'END-TO-END BUILD',
    href: ROUTES.WEB_APP,
    visual: 'webApp',
  },
  {
    category: '데이터 대시보드',
    title: '데이터를 보는 가장 명확한 방법',
    desc: 'BI 대시보드, 운영 어드민, 실시간 모니터링까지. AG Grid 기반 엔터프라이즈급 품질.',
    tags: ['AG Grid', 'Ant Design', '실시간', '권한 관리'],
    badge: 'REAL-TIME ANALYTICS',
    href: ROUTES.DASHBOARD,
    visual: 'dashboard',
  },
];

const SERVICE_VISUALS: Record<ServiceCard['visual'], string> = {
  web3d: '/images/services/visual-web3d.png',
  adVisual: '/images/services/visual-ad.png',
  webApp: '/images/services/visual-webapp.png',
  dashboard: '/images/services/visual-dashboard.png',
};

export function ServicesSection() {
  return (
    <section className={styles.services}>
      <Container>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>Services</span>
          <h2 className={styles.sectionTitle}>
            한 팀이 책임지는 4가지 라인업
          </h2>
          <p className={styles.sectionSub}>
            AI를 도구로, 사람의 디렉션으로. 4개 영역을 모두 같은 디자인
            언어로 만듭니다.
          </p>
        </header>
        <ul className={styles.servicesGrid}>
          {services.map((s) => (
            <li className={styles.serviceItem} key={s.title}>
              <Link className={styles.serviceCard} href={s.href}>
                <div className={styles.serviceVisual}>
                  <img
                    alt=""
                    aria-hidden="true"
                    className={styles.serviceVisualImg}
                    src={SERVICE_VISUALS[s.visual]}
                  />
                </div>
                <div className={styles.serviceBody}>
                  <div className={styles.serviceTopRow}>
                    <span className={styles.serviceCat}>{s.category}</span>
                    <span aria-hidden="true" className={styles.serviceArrow}>
                      <svg fill="none" height={14} viewBox="0 0 14 14" width={14} xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7H11M7 11L11 7L7 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </span>
                  </div>
                  <h3 className={styles.serviceTitle}>{s.title}</h3>
                  <p className={styles.serviceDesc}>{s.desc}</p>
                  <div className={styles.serviceTags}>
                    {s.tags.map((t) => (
                      <span className={styles.serviceTag} key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
