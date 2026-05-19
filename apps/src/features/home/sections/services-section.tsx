import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

interface ServiceCard {
  category: string;
  title: string;
  desc: string;
  tags: string[];
  gradient: string;
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
    gradient: 'linear-gradient(165deg, #8c6bd9 0%, #4d2e99 73%)',
    badge: '3D · INTERACTIVE',
    href: ROUTES.WEB_3D,
    visual: 'web3d',
  },
  {
    category: '광고 이미지',
    title: '클릭을 부르는 한 장',
    desc: '제품 컷부터 캠페인 키 비주얼까지. AI로 빠르게, 브랜드 톤은 일관되게.',
    tags: [
      '이커머스 상세컷',
      'SNS 멀티 비율',
      '4K 고해상도',
      '톤 학습',
    ],
    gradient: 'linear-gradient(165deg, #ffa659 0%, #f24d4d 73%)',
    badge: '100+ VARIATIONS',
    href: ROUTES.AD_VISUALS,
    visual: 'adVisual',
  },
  {
    category: '웹 · 앱 개발',
    title: '기획부터 배포까지 한 팀',
    desc: '랜딩페이지부터 이커머스, 모바일 앱까지. Next.js와 React Native 기반의 최신 스택.',
    tags: ['Next.js 14', 'React Native', 'SEO 최적화', 'CMS 연동'],
    gradient: 'linear-gradient(165deg, #4d99f2 0%, #1a4da6 73%)',
    badge: 'END-TO-END BUILD',
    href: ROUTES.WEB_APP,
    visual: 'webApp',
  },
  {
    category: '데이터 대시보드',
    title: '데이터를 보는 가장 명확한 방법',
    desc: 'BI 대시보드, 운영 어드민, 실시간 모니터링까지. AG Grid 기반 엔터프라이즈급 품질.',
    tags: ['AG Grid', 'Ant Design', '실시간', '권한 관리'],
    gradient: 'linear-gradient(165deg, #4dd9a6 0%, #1a8066 73%)',
    badge: 'REAL-TIME ANALYTICS',
    href: ROUTES.DASHBOARD,
    visual: 'dashboard',
  },
];

const renderServiceVisual = (visual: ServiceCard['visual']) => {
  switch (visual) {
    case 'web3d':
      return (
        <div className={styles.visualStage3d}>
          <span className={`${styles.visualDot} ${styles.visualDotA}`} />
          <span className={`${styles.visualDot} ${styles.visualDotB}`} />
          <span className={`${styles.visualDot} ${styles.visualDotC}`} />
          <svg
            aria-hidden="true"
            className={styles.cubeSvg}
            viewBox="0 0 360 190"
          >
            <g className={styles.cubeLayerBack}>
              <path d="M112 44H298V145H112z" />
              <path d="M62 78H248V178H62z" />
              <path d="M112 44 62 78" />
              <path d="M298 44 248 78" />
              <path d="M298 145 248 178" />
              <path d="M112 145 62 178" />
            </g>
            <g className={styles.cubeLayerFront}>
              <path d="M62 78H248V178H62z" />
              <path d="M112 44H298V145H112z" />
              <path d="M112 44V145" />
              <path d="M248 78V178" />
              <path d="M62 78 112 44" />
              <path d="M248 78 298 44" />
              <path d="M248 178 298 145" />
            </g>
          </svg>
        </div>
      );
    case 'adVisual':
      return (
        <div className={styles.visualStageAd}>
          <div className={`${styles.adCard} ${styles.adCardOne}`}>
            <span />
            <span />
          </div>
          <div className={`${styles.adCard} ${styles.adCardTwo}`}>
            <span />
            <span />
          </div>
          <div className={`${styles.adCard} ${styles.adCardThree}`}>
            <span />
            <span />
          </div>
          {[styles.meteorOne, styles.meteorTwo, styles.meteorThree].map(
            (meteorClass) => (
              <span
                aria-hidden="true"
                className={`${styles.meteor} ${meteorClass}`}
                key={meteorClass}
              >
                <svg className={styles.sparkleSvg} viewBox="0 0 48 48">
                  <path d="M24 3 29.2 18.8 45 24 29.2 29.2 24 45 18.8 29.2 3 24 18.8 18.8z" />
                </svg>
              </span>
            ),
          )}
        </div>
      );
    case 'webApp':
      return (
        <div className={styles.visualStageWebApp}>
          <svg
            aria-hidden="true"
            className={styles.browserSvg}
            viewBox="0 0 390 220"
          >
            <rect
              className={styles.browserShell}
              height="184"
              rx="8"
              width="270"
              x="34"
              y="18"
            />
            <path className={styles.browserBar} d="M34 42H304" />
            <circle cx="52" cy="30" r="3" />
            <circle cx="65" cy="30" r="3" />
            <circle cx="78" cy="30" r="3" />
            <path className={styles.codeLineWide} d="M58 76H154" />
            <path className={styles.codeLineLong} d="M58 96H216" />
            <path className={styles.codeLineMedium} d="M58 116H194" />
            <rect
              className={styles.codeButton}
              height="18"
              rx="4"
              width="50"
              x="58"
              y="140"
            />
          </svg>
          <svg
            aria-hidden="true"
            className={styles.phoneSvg}
            viewBox="0 0 92 160"
          >
            <rect
              className={styles.phoneShell}
              height="138"
              rx="14"
              width="66"
              x="13"
              y="10"
            />
            <rect
              className={styles.phoneScreen}
              height="78"
              rx="6"
              width="48"
              x="22"
              y="44"
            />
          </svg>
        </div>
      );
    case 'dashboard':
      return (
        <div className={styles.visualStageDashboard}>
          <svg
            aria-hidden="true"
            className={styles.chartSvg}
            viewBox="0 0 320 180"
          >
            <rect
              className={styles.chartPanel}
              height="126"
              rx="8"
              width="214"
              x="12"
              y="28"
            />
            <path className={styles.chartBarStrong} d="M38 55H102" />
            <path className={styles.chartBarSoft} d="M38 72H78" />
            <path
              className={styles.chartPath}
              d="M38 138 72 118 106 126 140 94 174 104 208 78 240 86"
            />
            <g className={styles.chartPoints}>
              <circle cx="38" cy="138" r="4" />
              <circle cx="72" cy="118" r="4" />
              <circle cx="106" cy="126" r="4" />
              <circle cx="140" cy="94" r="4" />
              <circle cx="174" cy="104" r="4" />
              <circle cx="208" cy="78" r="4" />
              <circle cx="240" cy="86" r="4" />
            </g>
          </svg>
          <div className={`${styles.kpiCard} ${styles.kpiCardTop}`}>
            <span />
            <strong className={styles.kpiRoll} aria-label="+47%">
              <span className={styles.kpiRollTrack}>
                {[
                  '+47%',
                  '+18%',
                  '+31%',
                  '+43%',
                  '+47%',
                  '+18%',
                  '+31%',
                  '+43%',
                  '+47%',
                  '+18%',
                  '+31%',
                  '+43%',
                  '+47%',
                  '+18%',
                  '+31%',
                  '+43%',
                  '+47%',
                ].map((item, index) => (
                  <span key={`${item}-${index}`}>{item}</span>
                ))}
              </span>
            </strong>
          </div>
          <div className={`${styles.kpiCard} ${styles.kpiCardBottom}`}>
            <span />
            <strong className={styles.kpiRoll} aria-label="12.4K">
              <span className={styles.kpiRollTrack}>
                {[
                  '12.4K',
                  '3.8K',
                  '7.2K',
                  '10.6K',
                  '12.4K',
                  '3.8K',
                  '7.2K',
                  '10.6K',
                  '12.4K',
                  '3.8K',
                  '7.2K',
                  '10.6K',
                  '12.4K',
                  '3.8K',
                  '7.2K',
                  '10.6K',
                  '12.4K',
                ].map((item, index) => (
                  <span key={`${item}-${index}`}>{item}</span>
                ))}
              </span>
            </strong>
          </div>
        </div>
      );
  }
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
                <div
                  className={styles.serviceVisual}
                  style={{ backgroundImage: s.gradient }}
                >
                  <span className={styles.serviceVisualBadge}>
                    {s.badge}
                  </span>
                  {renderServiceVisual(s.visual)}
                </div>
                <div className={styles.serviceBody}>
                  <div className={styles.serviceTopRow}>
                    <span className={styles.serviceCat}>{s.category}</span>
                    <span aria-hidden="true" className={styles.serviceArrow}>
                      →
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
