import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container/container';

import { FaqAccordion } from './faq-accordion';
import { SofaConfigurator } from './sofa-configurator';
import styles from './web-3d-page.module.css';

/* ─── 정적 데이터 ─── */

const STATS = [
  { value: '60fps', label: '모바일 평균' },
  { value: '2.5s', label: '평균 LCP' },
  { value: '12+', label: '누적 3D 프로젝트' },
  { value: '70%', label: '자산 압축률' },
] as const;

const SERVICES = [
  {
    id: 'viewer',
    badge: '제품 3D 뷰어',
    duration: '2–4주',
    price: '₩600만원~',
    title: '제품 3D 뷰어',
    desc: '이커머스 상세페이지·브랜드 사이트용 360° 회전 뷰어.',
    image: '/images/web-3d/services/service-01-viewer.png',
    deliverables: [
      'WebGL 컴포넌트 + 자유 회전·줌·재질 변경',
      'draco·KTX2 압축으로 자산 70% 감소',
      '모바일 60fps 보장 — 5MB 이하 LCP',
    ],
  },
  {
    id: 'configurator',
    badge: '3D 컨피규레이터',
    duration: '3–6주',
    price: '₩1,500만원~',
    title: '3D 컨피규레이터',
    desc: '고객 입력에 따라 색상·재질·옵션을 실시간 변경.',
    image: '/images/web-3d/services/service-02-configurator.png',
    deliverables: [
      '옵션 제어 UI + 실시간 견적 연결',
      '장바구니/공유 링크 발급',
      'PBR 재질 시스템 + Zustand 상태 관리',
    ],
  },
  {
    id: 'showroom',
    badge: '가상 쇼룸',
    duration: '4–8주',
    price: '₩2,000만원~',
    title: '가상 쇼룸·전시 공간',
    desc: '오프라인 매장·팝업을 웹에서 1인칭으로 탐색.',
    image: '/images/web-3d/services/service-03-showroom.png',
    deliverables: [
      '1인칭 시점 이동 (WASD/터치)',
      '핫스팟 기반 제품 정보',
      'WebXR 옵션 (VR 헤드셋 지원)',
    ],
  },
  {
    id: 'storytelling',
    badge: '인터랙티브 스토리텔링',
    duration: '3–5주',
    price: '₩1,200만원~',
    title: '인터랙티브 스토리텔링',
    desc: '스크롤 인터랙션과 3D 애니메이션이 결합된 캠페인 페이지.',
    image: '/images/web-3d/services/service-04-storytelling.png',
    deliverables: [
      '스크롤-드리븐 3D 시퀀스',
      'GSAP ScrollTrigger + Lenis smooth',
      '모바일 폴백 자동 처리',
    ],
  },
] as const;

const TECH_STACKS = [
  {
    id: 'engine',
    label: '3D 엔진',
    desc: 'WebGL 기반 표준 + React 통합',
    tags: ['Three.js', 'r3f', 'drei', 'WebGL 2.0'],
  },
  {
    id: 'asset',
    label: '자산 최적화',
    desc: '모바일 LCP 보장 — 자산 70% 절감',
    tags: ['draco', 'KTX2', 'glTF Pipeline', 'Mesh LOD'],
  },
  {
    id: 'interaction',
    label: '인터랙션',
    desc: '스크롤·애니메이션·상태 관리 통합',
    tags: ['GSAP', 'Lenis', 'Zustand'],
  },
  {
    id: 'infra',
    label: '인프라·분석',
    desc: '3D 자산 CDN + 인터랙션 추적',
    tags: ['Vercel', 'Cloudflare R2', 'GA4', 'Sentry'],
  },
] as const;

const WORKFLOW_STEPS = [
  {
    icon: '🎨',
    label: 'Step 1',
    title: 'AI 자산 생성',
    desc: '레퍼런스 이미지 업로드 → AI로 3D 모델 초안 생성 + 텍스처·재질 추출. 작업 시간 60% 단축.',
  },
  {
    icon: '🔧',
    label: 'Step 2',
    title: '3D 모델링·최적화',
    desc: '디자이너가 토폴로지 정리, draco·KTX2 압축, LOD 처리. 모바일 60fps 보장.',
  },
  {
    icon: '⚡',
    label: 'Step 3',
    title: '웹 통합·인터랙션',
    desc: 'react-three-fiber 컴포넌트로 통합. 옵션 UI, 애니메이션, 분석 이벤트까지.',
  },
] as const;

const PROCESS_STEPS = [
  {
    num: '01',
    title: '디스커버리·자산 진단',
    duration: '1주',
    desc: '제품 사양·레퍼런스 분석, 모바일 사용 비중 측정, 기존 3D 자산이 있다면 호환성·재사용성 진단.',
    tags: ['IA·UX 정의서', '레퍼런스 자산 진단', '성능 목표 합의', 'KPI 정의서'],
  },
  {
    num: '02',
    title: '3D 모델·인터랙션 시안',
    duration: '2–3주',
    desc: 'Figma + 3D 시안 2안 제안. 모델 폴리곤 수, 재질 시스템, 인터랙션 와이어플로우 확정.',
    tags: ['3D 모델 시안 2안', 'Figma UI 시안', '인터랙션 프로토타입', '성능 예측 리포트'],
  },
  {
    num: '03',
    title: '구현·최적화',
    duration: '2–6주',
    desc: 'Three.js / r3f 구현. draco·KTX2 압축으로 자산 70% 감소, LOD 적용. 매주 데모 + 클라이언트 피드백 사이클.',
    tags: ['스프린트별 데모 환경', 'GitHub 저장소', '성능 검증 리포트', 'Lighthouse 90+ 인증'],
  },
  {
    num: '04',
    title: 'QA·런칭',
    duration: '1주',
    desc: '디바이스별 테스트 (iOS·Android·저사양), 모바일 60fps 검증, SEO 점검, 분석 이벤트 셋업.',
    tags: ['디바이스 테스트 리포트', 'SEO 체크리스트', 'GA4 이벤트 셋업', '운영 매뉴얼'],
  },
  {
    num: '05',
    title: '운영 동행',
    duration: '월 단위 (옵션)',
    desc: '런칭 후 1개월 무상 운영. 이후 자산 추가·옵션 확장·성능 모니터링을 월 단위로.',
    tags: ['주간 모니터링 리포트', '월간 개선 제안', '신규 자산 견적', '성능 회귀 알림'],
  },
] as const;

const CASES = [
  {
    image: '/images/web-3d/cases/case-nordic.png',
    category: '소파 컨피규레이터',
    title: 'Nordic Furniture',
    desc: '5가지 패브릭 × 3가지 다리 조합을 실시간 시각화. 2주 동안 매장 방문 없이 구매 결정.',
  },
  {
    image: '/images/web-3d/cases/case-lumina.png',
    category: '제품 360° 뷰어 + 가상 쇼룸',
    title: 'LUMINA Lighting',
    desc: '8개 컬렉션 × 32개 제품을 단일 3D 카탈로그로. 모바일 LCP 1.9s 달성.',
  },
  {
    image: '/images/web-3d/cases/case-hanssem.png',
    category: 'VR 룸 플래너',
    title: 'Hanssem',
    desc: '브라우저에서 가구를 끌어다 놓으며 거실을 직접 꾸미는 3D 룸 플래너.',
  },
] as const;

const DO_ITEMS = [
  { title: '제품 360° 뷰어 / 컨피규레이터', desc: '가구·가전·패션·뷰티 등 형태와 옵션이 핵심인 제품' },
  { title: '브랜드 가상 쇼룸·전시 공간', desc: '오프라인 매장을 웹에 1:1로 재현. 제품 정보 핫스팟 포함' },
  { title: '캠페인 인터랙티브 스토리텔링', desc: '스크롤 + 3D 시퀀스로 신제품·브랜드 가치를 보여주는 페이지' },
  { title: '모바일 60fps 보장이 필수인 케이스', desc: '국내 모바일 비중 70%+ 환경에서 데스크톱-모바일 동등 품질' },
  { title: '런칭 후 1년 이상 운영·확장 동행', desc: '신규 제품 추가, 옵션 확장, 성능 회귀 모니터링' },
] as const;

const DONT_ITEMS = [
  { title: '단순 3D 모델 파일만 필요한 경우', desc: '웹 통합 없이 .glb/.fbx만 필요하시면 3D 스튜디오가 더 효율적입니다' },
  { title: '게임 엔진·메타버스 가상 세계', desc: 'Unity·Unreal 기반 멀티플레이어 월드는 전문 게임 스튜디오 권장' },
  { title: 'AAA급 실사 렌더링 영상물', desc: '광고·영화 수준의 오프라인 렌더링은 VFX 스튜디오 권장' },
  { title: '1주 미만 초단기 긴급 프로젝트', desc: '디스커버리 + 모델링 + 통합에 최소 2주가 필요합니다' },
  { title: 'IoT·임베디드 디바이스 펌웨어', desc: '하드웨어 펌웨어·드라이버 영역은 우리의 전문 영역이 아닙니다' },
] as const;

/* ─── 컴포넌트 ─── */

export function Web3dPage() {
  return (
    <>
      {/* 1. Hero */}
      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroBackdrop} />
        <div aria-hidden="true" className={styles.heroGlow2} />
        <div aria-hidden="true" className={styles.heroGrid} />

        <div className={styles.heroContentWrap}>
          <div aria-hidden="true" className={styles.heroGlow1} />

          {/* 3D 프리뷰 카드 */}
          <div aria-hidden="true" className={styles.hero3dCard}>
            <img alt="" className={styles.hero3dCardImg} src="/images/web-3d/hero-3d-card.png" />
          </div>

          {/* 텍스트 콘텐츠 */}
          <div className={styles.heroLayout}>
            <div className={styles.heroLeft}>
              <span className={styles.heroEyebrow}>
                <span aria-hidden="true" className={styles.heroEyebrowDot} />
                Web 3D · Interactive
              </span>
              <h1 className={styles.heroTitle}>
                브라우저 안에서,
                <br />
                진짜 만질 수 있는 3D
              </h1>
              <p className={styles.heroSub}>
                제품 360° 뷰어, 가상 쇼룸, 3D 컨피규레이터, 인터랙티브 스토리텔링까지 — 설치 없이 모바일에서도 60fps로 동작합니다.
              </p>
              <ul className={styles.heroStats} role="list">
                {STATS.map((s) => (
                  <li className={styles.heroStatItem} key={s.label}>
                    <strong className={styles.heroStatValue}>{s.value}</strong>
                    <span className={styles.heroStatLabel}>{s.label}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.heroCtas}>
                <Link className={`${styles.heroCta} ${styles.heroCtaPrimary}`} href="#demo">
                  인터랙티브 데모 보기 <span aria-hidden="true">→</span>
                </Link>
                <Link className={`${styles.heroCta} ${styles.heroCtaGhost}`} href={ROUTES.WORK}>
                  대표 케이스 보기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 서비스 타입 — 4개 리치 카드 */}
      <section className={styles.serviceTypes}>
        <Container>
          <header className={styles.techHead}>
            <span className={styles.eyebrow}>Services</span>
            <h2 className={styles.techTitle}>어떤 3D 콘텐츠가 필요하신가요?</h2>
            <p className={styles.techSub}>
              4개 서비스 중 가장 가까운 것을 선택해 자세히 살펴보세요. 패키지 결합 시 더 효율적입니다.
            </p>
          </header>
          <ul className={styles.serviceGrid} role="list">
            {SERVICES.map((s) => (
              <li className={styles.serviceItem} key={s.id}>
                <Link className={styles.serviceCard} href={ROUTES.CONTACT.QUOTE}>
                  <div className={styles.serviceVisual}>
                    <img alt="" aria-hidden="true" className={styles.serviceVisualImg} src={s.image} />
                  </div>
                  <div className={styles.serviceBody}>
                    <div className={styles.svcMetaRow}>
                      <span className={styles.svcBadge}>{s.badge}</span>
                      <span className={styles.svcMeta}>
                        <span className={styles.svcMetaDur}>{s.duration}</span>
                        <span aria-hidden="true" className={styles.svcMetaDot} />
                        <span className={styles.svcMetaPrice}>{s.price}</span>
                      </span>
                    </div>
                    <h3 className={styles.serviceTitle}>{s.title}</h3>
                    <p className={styles.serviceDesc}>{s.desc}</p>
                    <div className={styles.svcDeliverables}>
                      {s.deliverables.map((d) => (
                        <span className={styles.svcDeliverItem} key={d}>
                          <span aria-hidden="true" className={styles.svcCheck}>✓</span>
                          {d}
                        </span>
                      ))}
                    </div>
                    <span className={styles.serviceLink}>
                      자세히 보기 <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 3. Tech Stack */}
      <section className={styles.techSection}>
        <Container>
          <header className={styles.techHead}>
            <span className={styles.eyebrow}>Tech Stack</span>
            <h2 className={styles.techTitle}>검증된 3D 엔진, 투명한 공개</h2>
            <p className={styles.techSub}>
              인수인계 가능한 표준 스택만 사용합니다. NDA로 가린 부분 없이 모두 공개.
            </p>
          </header>
          <ul className={styles.techGrid} role="list">
            {TECH_STACKS.map((t) => (
              <li className={styles.techCard} key={t.id}>
                <span className={styles.techCardLabel}>{t.label}</span>
                <p className={styles.techCardDesc}>{t.desc}</p>
                <div className={styles.techCardTags}>
                  {t.tags.map((tag) => (
                    <span className={styles.techCardTag} key={tag}>{tag}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 4. AI × 3D Workflow */}
      <section className={styles.ai}>
        <Container>
          <header className={styles.aiHead}>
            <span className={styles.eyebrow}>AI × 3D Workflow</span>
            <h2 className={styles.aiTitle}>AI 자산 → 3D 모델링 → 웹 통합</h2>
            <p className={styles.aiSub}>
              한 팀이 처음부터 끝까지. 외부 스튜디오 위탁 없이 디자인-기획-개발-운영 톤이 일관되게 유지됩니다.
            </p>
          </header>

          <div className={styles.aiSteps}>
            {WORKFLOW_STEPS.map((step) => (
              <div className={styles.aiStep} key={step.label}>
                <div className={styles.aiStepIcon}>{step.icon}</div>
                <span className={styles.aiStepNum}>{step.label}</span>
                <h3 className={styles.aiStepTitle}>{step.title}</h3>
                <p className={styles.aiStepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>

          <div className={styles.aiQuote}>
            <img alt="" aria-hidden="true" height={24} src="/images/web-app/ai/quote.svg" width={32} />
            <div>
              <p className={styles.aiQuoteText}>
                "3D 스튜디오와 웹 외주를 따로 쓰니까 자산을 받아서 다시 압축하고 통합하는 데만 2주가 걸렸습니다. VisionFlow는 처음부터 웹에 들어갈 걸 가정하고 만들어 줘서 일정이 절반이 됐습니다."
              </p>
              <p className={styles.aiQuoteAuthor}>— 가구 D2C 브랜드 디지털 마케팅 책임자</p>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. 프로세스 — 버티컬 타임라인 */}
      <section className={styles.process}>
        <Container>
          <header className={styles.processHead}>
            <span className={styles.eyebrow}>Process</span>
            <h2 className={styles.processTitle}>의뢰부터 운영까지 5단계</h2>
            <p className={styles.processSub}>
              예상 가능한 일정과 명확한 산출물. 1단계 끝나고 다음 단계 진행 여부를 결정할 수 있습니다.
            </p>
          </header>
          <ol className={styles.processSteps}>
            {PROCESS_STEPS.map((p, i) => (
              <li className={styles.processStep} key={p.num}>
                <div className={styles.processRail}>
                  <div className={styles.processNum}>{p.num}</div>
                  {i < PROCESS_STEPS.length - 1 && (
                    <div aria-hidden="true" className={styles.processConnector} />
                  )}
                </div>
                <div className={styles.processCard}>
                  <div className={styles.processTitleRow}>
                    <h3 className={styles.processCardTitle}>{p.title}</h3>
                    <span className={styles.processDur}>{p.duration}</span>
                  </div>
                  <p className={styles.processDesc}>{p.desc}</p>
                  <div className={styles.processTags}>
                    {p.tags.map((tag) => (
                      <span className={styles.processTag} key={tag}>
                        <span aria-hidden="true">✓</span> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 6. Interactive 3D Demo — 소파 컨피규레이터 */}
      <section className={styles.demo} id="demo">
        <div aria-hidden="true" className={styles.demoGlow} />
        <Container>
          <header className={styles.demoHead}>
            <span className={styles.demoEyebrow}>
              <span aria-hidden="true" className={styles.demoEyebrowDot} />
              Live Interactive Demo
            </span>
            <h2 className={styles.demoTitle}>직접 만져보세요 — 실제로 동작합니다</h2>
            <p className={styles.demoSub}>
              아래는 실제 3D 컨피규레이터입니다. 옵션을 선택해 보세요. 견적이 실시간으로 갱신됩니다.
            </p>
          </header>
          <SofaConfigurator />
        </Container>
      </section>

      {/* 7. Featured Cases */}
      <section className={styles.cases}>
        <Container>
          <header className={styles.casesHead}>
            <span className={styles.eyebrow}>Featured Cases</span>
            <h2 className={styles.casesTitle}>결과로 증명한 3D 프로젝트</h2>
            <p className={styles.casesSub}>
              단순 포트폴리오가 아닌 — 매출, 전환율, 체류 시간이 실제로 움직인 3개 케이스.
            </p>
          </header>

          <ul className={styles.casesGrid} role="list">
            {CASES.map((c) => (
              <li className={styles.casesCard} key={c.title}>
                <div className={styles.casesImage}>
                  <img alt="" aria-hidden="true" className={styles.casesImg} src={c.image} />
                </div>
                <div className={styles.casesBody}>
                  <span className={styles.cases3dCat}>{c.category}</span>
                  <h3 className={styles.casesCardTitle}>{c.title}</h3>
                  <p className={styles.cases3dDesc}>{c.desc}</p>
                  <Link className={styles.cases3dLink} href={ROUTES.WORK}>
                    케이스 자세히 보기 <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          {/* 하단 More 버튼 — 풀폭 */}
          <Link className={styles.casesMore} href={ROUTES.WORK}>
            12개 누적 3D 프로젝트 모두 보기 <span aria-hidden="true">→</span>
          </Link>
        </Container>
      </section>

      {/* 8. Fit Check */}
      <section className={styles.fitCheck}>
        <Container>
          <header className={styles.fitHead}>
            <span className={styles.eyebrow}>Fit Check</span>
            <h2 className={styles.fitTitle}>우리에게 맞는 프로젝트, 맞지 않는 프로젝트</h2>
            <p className={styles.fitSub}>
              솔직하게 말씀드립니다. 첫 미팅 전에 적합도를 가늠해 보세요.
            </p>
          </header>

          <div className={styles.fitRow}>
            {/* Do */}
            <div className={styles.fitDoCol}>
              <div className={styles.fitColHeader}>
                <div className={styles.fitDoIcon}>
                  <svg fill="none" height={18} viewBox="0 0 18 18" width={18}>
                    <path d="M3.5 9L7.5 13L14.5 5" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </svg>
                </div>
                <div>
                  <p className={styles.fitColTitle}>이런 프로젝트는 잘 합니다</p>
                  <p className={styles.fitColSub}>여기에 해당하면 강력 추천드립니다.</p>
                </div>
              </div>
              {DO_ITEMS.map((item) => (
                <div className={styles.fitItem} key={item.title}>
                  <div className={styles.fitDoCheck}>
                    <svg fill="none" height={12} viewBox="0 0 12 12" width={12}>
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.fitItemTitle}>{item.title}</p>
                    <p className={styles.fitItemDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Don't */}
            <div className={styles.fitDontCol}>
              <div className={styles.fitColHeader}>
                <div className={styles.fitDontIcon}>
                  <svg fill="none" height={18} viewBox="0 0 18 18" width={18}>
                    <path d="M5 5L13 13M13 5L5 13" stroke="white" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </div>
                <div>
                  <p className={styles.fitColTitle}>이런 프로젝트는 권하지 않습니다</p>
                  <p className={styles.fitColSub}>해당하시면 더 적합한 파트너를 추천드립니다.</p>
                </div>
              </div>
              {DONT_ITEMS.map((item) => (
                <div className={styles.fitItem} key={item.title}>
                  <div className={styles.fitDontX}>
                    <svg fill="none" height={12} viewBox="0 0 12 12" width={12}>
                      <path d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5" stroke="white" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.fitItemTitleMuted}>{item.title}</p>
                    <p className={styles.fitItemDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 9. FAQ */}
      <section className={styles.faq} id="faq">
        <Container>
          <header className={styles.faqHead}>
            <span className={styles.eyebrow}>FAQ</span>
            <h2 className={styles.faqTitle}>자주 받는 질문</h2>
            <p className={styles.faqSub}>
              견적 미팅 전에 가장 많이 받는 질문 8개의 답.
            </p>
          </header>
          <FaqAccordion />
        </Container>
      </section>

      {/* 10. CTA */}
      <section className={styles.cta}>
        <div aria-hidden="true" className={styles.ctaOrb1} />
        <div aria-hidden="true" className={styles.ctaOrb2} />
        <div aria-hidden="true" className={styles.ctaGrid} />
        <Container>
          <div className={styles.ctaInner}>
            <span className={styles.ctaEyebrow}>
              <span aria-hidden="true" className={styles.ctaEyebrowDot} />
              Ready to Start
            </span>
            <h2 className={styles.ctaTitle}>
              브라우저에서 만질 수 있는 3D,
              <br />
              지금 시작하세요
            </h2>
            <p className={styles.ctaSub}>
              아이디어 단계여도 좋습니다. 1주 디스커버리로 가능성·범위·예산을 함께 정의해 드립니다.
            </p>
            <div className={styles.ctaButtons}>
              <Link className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`} href={ROUTES.CONTACT.QUOTE}>
                무료 견적 받기 <span aria-hidden="true">→</span>
              </Link>
              <Link className={`${styles.ctaButton} ${styles.ctaButtonGhost}`} href={ROUTES.KAKAO}>
                카카오톡으로 바로 상담
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
