import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container/container';

import { EstimateSimulator } from './estimate-simulator';
import { FaqAccordion } from './faq-accordion';
import styles from './web-app-page.module.css';

/* ─── 정적 데이터 ─── */

const STATS = [
  { value: '65%', label: '재의뢰율' },
  { value: '6.4주', label: '평균 납기' },
  { value: '45+', label: '누적 프로젝트' },
  { value: '4', label: '핵심 산업' },
] as const;

const SERVICE_TYPES = [
  {
    id: 'landing',
    title: '캠페인용 랜딩페이지',
    desc: '신제품 발표·캠페인용 단일 페이지. 빠른 런칭이 핵심입니다.',
    image: '/images/web-app/service-01-landing.png',
  },
  {
    id: 'publishing',
    title: '퍼블리싱·기업 사이트',
    desc: '정보 전달과 신뢰감을 동시에 갖춘 브랜드 사이트.',
    image: '/images/web-app/service-02-corp.png',
  },
  {
    id: 'frontend',
    title: '리액트/뷰 프론트엔드',
    desc: '복잡한 UI도 빠르고 안정적으로 구현합니다.',
    image: '/images/web-app/service-03-frontend.png',
  },
  {
    id: 'app',
    title: 'iOS·Android 앱',
    desc: '하나의 코드베이스로 양쪽 플랫폼에 동시 출시합니다.',
    image: '/images/web-app/service-04-app.png',
  },
] as const;

const TECH_STACKS = [
  {
    id: 'frontend',
    label: 'FRONTEND',
    desc: 'SSR/ISR로 검색엔진 가시성과 LCP 동시 확보',
    tags: ['Next.js 14', 'React Native', 'TypeScript', 'CSS Module'],
  },
  {
    id: 'ui',
    label: 'UI · DESIGN',
    desc: '엔터프라이즈급 폼·테이블·모달 즉시 활용',
    tags: ['Ant Design', 'AG Grid', 'Figma Designbase', 'Storybook'],
  },
  {
    id: 'backend',
    label: 'BACKEND · CMS',
    desc: '게시판·문의·인증을 자체 소유, 외부 종속 제거',
    tags: ['Supabase', 'PostgreSQL', 'Edge Functions', 'RLS'],
  },
  {
    id: 'infra',
    label: 'INFRA · ANALYTICS',
    desc: 'Preview 배포 + 전환·에러 추적 완비',
    tags: ['Vercel', 'Cloudflare', 'GA4', 'Plausible', 'Sentry'],
  },
] as const;

const AI_CARDS = [
  {
    title: 'AI 코드 제안',
    desc: 'GitHub Copilot·Claude로 반복 코드를 줄이고, 개발자는 설계에 집중합니다.',
    icon: '🤖',
  },
  {
    title: '반응형·기기 최적화',
    desc: '모바일·태블릿·데스크탑 모든 해상도에서 완벽 동작을 보장합니다.',
    icon: '📱',
  },
  {
    title: '운영·확장',
    desc: '출시 후 기능 추가와 유지보수까지 같은 팀이 책임집니다.',
    icon: '🔧',
  },
] as const;

const PROCESS_STEPS = [
  {
    num: '01',
    title: '디스커버리',
    duration: '1주',
    desc: '사용자·시장 인터뷰, 경쟁사 분석, IA 확정. 이 단계 산출물(인사이트 문서) 검토 후 다음 단계 진행 결정.',
    tags: ['사용자 페르소나 2–3종', '경쟁사 분석 매트릭스', '정보구조(IA) 다이어그램', 'KPI 정의서'],
  },
  {
    num: '02',
    title: '디자인',
    duration: '2–3주',
    desc: 'Figma 시안 2–3안 제공 → 1안 선정 후 디테일 확정. 디자인 시스템 토큰 정의 포함.',
    tags: ['시안 2–3안', 'Figma 컴포넌트 라이브러리', '인터랙션 프로토타입', '반응형 모바일 시안'],
  },
  {
    num: '03',
    title: '개발',
    duration: '3–10주',
    desc: 'Next.js 또는 React Native 구현. 2주 단위 스프린트 + 매주 데모 + 클라이언트 피드백 사이클.',
    tags: ['스프린트별 데모 환경', 'GitHub 저장소 인계', '기술 문서', '테스트 코드'],
  },
  {
    num: '04',
    title: 'QA · 런칭',
    duration: '1주',
    desc: 'Lighthouse 90+ 검증, 크로스 브라우저 테스트, SEO 점검, 모니터링 셋업. 도메인 이전·DNS 설정.',
    tags: ['Lighthouse 리포트', 'SEO 체크리스트', 'GA4 + Sentry 셋업', '운영 매뉴얼'],
  },
  {
    num: '05',
    title: '운영 동행',
    duration: '월 단위 (옵션)',
    desc: '런칭 후 1개월 무상 운영 포함. 이후 월 단위 운영 계약으로 콘텐츠 업데이트·기능 추가·성능 모니터링.',
    tags: ['주간 모니터링 리포트', '월간 개선 제안', '긴급 대응 SLA', '신규 기능 견적'],
  },
] as const;

const PORTFOLIO_ITEMS = [
  { title: '패션 브랜드 랜딩페이지', category: '랜딩/프로모', year: '2026' },
  { title: '제조업 기업 공식 사이트', category: '기업 사이트', year: '2025' },
  { title: '스타트업 SaaS 대시보드', category: '프론트엔드', year: '2026' },
  { title: '헬스케어 iOS/Android 앱', category: '모바일 앱', year: '2025' },
  { title: '이커머스 프로모 페이지', category: '랜딩/프로모', year: '2026' },
  { title: '핀테크 관리자 어드민', category: '프론트엔드', year: '2025' },
] as const;

const TECH_STACK = {
  left: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS (퍼블리싱)'],
  right: ['Node.js', 'Supabase', 'Vercel', 'React Native'],
} as const;

const FAQ_ITEMS = [
  {
    q: '개발 기간은 얼마나 걸리나요?',
    a: '규모에 따라 2주~3개월입니다. 랜딩 페이지는 2~3주, 풀스택 앱은 2~3개월이 평균입니다. 상담 후 정확한 일정을 제시해드립니다.',
  },
  {
    q: '기획·디자인도 함께 진행하나요?',
    a: '네, 기획부터 운영까지 원스톱으로 진행합니다. 별도 에이전시를 쓰지 않아도 됩니다.',
  },
  {
    q: '유지보수 계약이 따로 필요한가요?',
    a: '별도 계약 없이 월정액 운영 플랜을 제공합니다. 필요에 따라 선택하실 수 있습니다.',
  },
  {
    q: 'React Native와 네이티브 앱 중 어떤 걸 추천하나요?',
    a: '대부분의 경우 React Native로 충분합니다. 복잡한 하드웨어 연동이나 초고성능이 필요한 경우에만 네이티브를 권장합니다.',
  },
  {
    q: '견적은 어떻게 산정되나요?',
    a: '페이지 수, 기능 복잡도, 납기를 기준으로 투명하게 산정합니다. 시뮬레이터로 먼저 예산 범위를 확인하신 후 상담 요청 주세요.',
  },
] as const;

/* ─── 컴포넌트 ─── */

export function WebAppPage() {
  return (
    <>
      {/* 1. Hero */}
      <section className={styles.hero}>
        {/* 풀 와이드 배경 레이어 */}
        <div aria-hidden="true" className={styles.heroBackdrop} />
        <div aria-hidden="true" className={styles.heroGlow2} />
        <div aria-hidden="true" className={styles.heroGrid} />

        {/* 1640px 콘텐츠 영역 — Glow1·디바이스·텍스트 모두 포함 */}
        <div className={styles.heroContentWrap}>
        <div aria-hidden="true" className={styles.heroGlow1} />

        {/* 디바이스 목업 — 1640px 기준 우하단 */}
        <div aria-hidden="true" className={styles.heroDevices}>
          <div className={styles.heroDesktop}>
            <div className={styles.heroDesktopBar}>
              <span className={`${styles.heroWindowDot} ${styles.heroWindowDotR}`} />
              <span className={`${styles.heroWindowDot} ${styles.heroWindowDotY}`} />
              <span className={`${styles.heroWindowDot} ${styles.heroWindowDotG}`} />
              <span className={styles.heroUrlBar}>yourbrand.com</span>
            </div>
            <div className={styles.heroDesktopScreen}>
              <img alt="" className={styles.heroScreenImg} src="/images/web-app/hero-desktop.png" />
            </div>
          </div>
          <div className={styles.heroTablet}>
            <div className={styles.heroTabletScreen}>
              <img alt="" className={styles.heroScreenImg} src="/images/web-app/hero-tablet.png" />
            </div>
          </div>
          <div className={styles.heroPhone}>
            <div className={styles.heroPhoneScreen}>
              <img alt="" className={styles.heroScreenImg} src="/images/web-app/hero-phone.png" />
            </div>
          </div>
        </div>

        {/* 텍스트 콘텐츠 */}
        <div className={styles.heroLayout}>
          <div className={styles.heroLeft}>
            <span className={styles.heroEyebrow}>
              <span aria-hidden="true" className={styles.heroEyebrowDot} />
              Web &amp; App Development
            </span>
            <h1 className={styles.heroTitle}>
              AI로 만든 콘텐츠가,
              <br />
              진짜로 동작하게 합니다.
            </h1>
            <p className={styles.heroSub}>
              5–50페이지 브랜드·이커머스·B2B 사이트, 그리고 모바일 앱까지 — 한 팀이 기획부터 운영까지 책임집니다.
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
              <Link
                className={`${styles.heroCta} ${styles.heroCtaPrimary}`}
                href="#simulator"
              >
                패키지 시뮬레이터로 견적 보기 <span aria-hidden="true">→</span>
              </Link>
              <Link
                className={`${styles.heroCta} ${styles.heroCtaGhost}`}
                href={ROUTES.WORK}
              >
                대표 케이스 보기
              </Link>
            </div>
          </div>

          </div>
        </div>{/* /heroContentWrap */}
      </section>

      {/* 2. 서비스 타입 */}
      <section className={styles.serviceTypes}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>서비스</span>
            <h2 className={styles.sectionTitle}>어떤 사이트가 필요하신가요?</h2>
          </header>
          <ul className={styles.serviceGrid} role="list">
            {SERVICE_TYPES.map((s) => (
              <li className={styles.serviceItem} key={s.id}>
                <Link
                  className={styles.serviceCard}
                  href={ROUTES.CONTACT.QUOTE}
                >
                  <div className={styles.serviceVisual}>
                    <img
                      alt=""
                      aria-hidden="true"
                      className={styles.serviceVisualImg}
                      src={s.image}
                    />
                  </div>
                  <div className={styles.serviceBody}>
                    <h3 className={styles.serviceTitle}>{s.title}</h3>
                    <p className={styles.serviceDesc}>{s.desc}</p>
                    <span className={styles.serviceLink}>
                      견적 받기 <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 3. 검증된 기술 */}
      <section className={styles.techSection}>
        <Container>
          <header className={styles.techHead}>
            <span className={styles.eyebrow}>Tech Stack</span>
            <h2 className={styles.techTitle}>검증된 기술, 투명한 공개</h2>
            <p className={styles.techSub}>
              NDA로 가린 부분 없이 사용하는 도구를 모두 공개합니다. 인수인계 시 학습 곡선이 짧습니다.
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

      {/* 4. AI × Dev Synergy */}
      <section className={styles.ai}>
        <Container>
          {/* 헤더 — 좌측 정렬 */}
          <header className={styles.aiHead}>
            <span className={styles.eyebrow}>AI × Development</span>
            <h2 className={styles.aiTitle}>
              AI로 만들고, 한 팀이 동작하게 합니다.
            </h2>
            <p className={styles.aiSub}>
              이미지 만드는 곳, 사이트 만드는 곳, 어드민 만드는 곳을 따로 쓰지 마세요. 결과물의 톤이 맞지 않습니다.
            </p>
          </header>

          {/* Step 카드 3개 + 커넥터 */}
          <div className={styles.aiSteps}>
            {/* Step 1 */}
            <div className={styles.aiStep}>
              <div className={styles.aiStepIcon}>
                <img alt="" aria-hidden="true" height={32} src="/images/web-app/ai/icon-step1.svg" width={32} />
              </div>
              <span className={styles.aiStepNum}>Step 1</span>
              <h3 className={styles.aiStepTitle}>AI 콘텐츠 제작</h3>
              <p className={styles.aiStepDesc}>
                광고 이미지, 3D 자산, 영상까지 — 카테고리 1·2가 톤앤매너 학습된 자산을 생성합니다.
              </p>
            </div>

            <img alt="" aria-hidden="true" className={styles.aiConnector} height={40} src="/images/web-app/ai/connector.svg" width={60} />

            {/* Step 2 — 하이라이트 */}
            <div className={`${styles.aiStep} ${styles.aiStepHighlight}`}>
              <div className={styles.aiStepIcon}>
                <img alt="" aria-hidden="true" height={32} src="/images/web-app/ai/icon-step2.svg" width={32} />
              </div>
              <span className={styles.aiStepNum}>Step 2</span>
              <h3 className={styles.aiStepTitle}>사이트 · 앱 구현</h3>
              <p className={styles.aiStepDesc}>
                그 자산이 동작하는 환경을 만듭니다. Next.js 사이트, React Native 앱, 동일한 디자인 시스템 토큰.
              </p>
            </div>

            <img alt="" aria-hidden="true" className={styles.aiConnector} height={40} src="/images/web-app/ai/connector.svg" width={60} />

            {/* Step 3 */}
            <div className={styles.aiStep}>
              <div className={styles.aiStepIcon}>
                <img alt="" aria-hidden="true" height={32} src="/images/web-app/ai/icon-step3.svg" width={32} />
              </div>
              <span className={styles.aiStepNum}>Step 3</span>
              <h3 className={styles.aiStepTitle}>운영 · 확장</h3>
              <p className={styles.aiStepDesc}>
                런칭 후가 진짜 시작. 어드민·대시보드로 콘텐츠 자동화 + 성과 측정 + 점진적 확장.
              </p>
            </div>
          </div>

          {/* Quote 블록 */}
          <div className={styles.aiQuote}>
            <img alt="" aria-hidden="true" height={24} src="/images/web-app/ai/quote.svg" width={32} />
            <div>
              <p className={styles.aiQuoteText}>
                "이미지 만드는 곳, 사이트 만드는 곳, 어드민 만드는 곳을 따로 쓰면서 매번 톤이 어긋나는 게 가장 큰 피로였습니다. 한 팀에서 다 받으니까 결과물이 처음으로 일관됐습니다."
              </p>
              <p className={styles.aiQuoteAuthor}>— 이커머스 D2C 마케팅 책임자</p>
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
                {/* 좌: Rail */}
                <div className={styles.processRail}>
                  <div className={styles.processNum}>{p.num}</div>
                  {i < PROCESS_STEPS.length - 1 && (
                    <div aria-hidden="true" className={styles.processConnector} />
                  )}
                </div>
                {/* 우: Card */}
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

      {/* 6. 견적 시뮬레이터 */}
      <section className={styles.simulator} id="simulator">
        <Container>
          <header className={styles.simHead}>
            <span className={styles.eyebrow}>Package Simulator</span>
            <h2 className={styles.simTitle}>
              5분 시뮬레이션으로 예산을 먼저 확인하세요.
            </h2>
            <p className={styles.simSub}>
              5개 항목만 선택하면 실시간으로 예상 견적·기간·권장 패키지가 갱신됩니다. 정확한 견적은 디스커버리 후 확정됩니다.
            </p>
          </header>
          <EstimateSimulator />
        </Container>
      </section>

      {/* 7. Featured Cases */}
      <section className={styles.cases}>
        <Container>
          {/* 헤더 행: 좌 타이틀 + 우 전체보기 링크 */}
          <div className={styles.casesHeadRow}>
            <header className={styles.casesHead}>
              <span className={styles.eyebrow}>Featured Cases</span>
              <h2 className={styles.casesTitle}>실제 만들어 드린 사이트와 앱</h2>
              <p className={styles.casesSub}>
                같은 분야의 다른 케이스도 Work 페이지에서 확인하실 수 있습니다.
              </p>
            </header>
            <Link className={styles.casesSeeAll} href={ROUTES.WORK}>
              전체 케이스 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* 3열 카드 그리드 */}
          <ul className={styles.casesGrid} role="list">
            {[
              {
                image: '/images/web-app/cases/case-tumi.png',
                category: '브랜드 사이트',
                year: '2025',
                title: 'TUMI Korea — 글로벌 럭셔리 브랜드 한국 사이트',
                client: 'TUMI · 7주',
                metric: '체류 +180%',
              },
              {
                image: '/images/web-app/cases/case-earthliving.png',
                category: '이커머스',
                year: '2026',
                title: 'Earth Living — D2C 친환경 가구 자체몰',
                client: 'Earth Living · 11주',
                metric: '전환 +52%',
              },
              {
                image: '/images/web-app/cases/case-greenday.png',
                category: '모바일 앱',
                year: '2025',
                title: 'Greenday — 헬스케어 멤버십 앱',
                client: 'Greenday Korea · 14주',
                metric: '리텐션 +73%',
              },
            ].map((c) => (
              <li className={styles.casesCard} key={c.title}>
                <div className={styles.casesImage}>
                  <img alt="" aria-hidden="true" className={styles.casesImg} src={c.image} />
                </div>
                <div className={styles.casesBody}>
                  <div className={styles.casesTopRow}>
                    <span className={styles.casesCat}>{c.category}</span>
                    <span className={styles.casesYear}>{c.year}</span>
                  </div>
                  <h3 className={styles.casesCardTitle}>{c.title}</h3>
                  <p className={styles.casesClient}>{c.client}</p>
                  <p className={styles.casesMetric}>
                    <span aria-hidden="true">▲</span> {c.metric}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 8. Fit Check — 솔직하게 말씀드립니다 */}
      <section className={styles.fitCheck}>
        <Container>
          <header className={styles.fitHead}>
            <span className={styles.eyebrow}>Fit Check</span>
            <h2 className={styles.fitTitle}>솔직하게 말씀드립니다.</h2>
            <p className={styles.fitSub}>
              우리에게 맞지 않는 프로젝트는 시간 낭비입니다. 사전에 구분해 주시면 더 적합한 파트너를 추천해 드릴 수 있습니다.
            </p>
          </header>

          <div className={styles.fitRow}>
            {/* Do Column */}
            <div className={styles.fitDoCol}>
              <div className={styles.fitColHeader}>
                <div className={styles.fitDoIcon}>
                  <svg fill="none" height={18} viewBox="0 0 18 18" width={18}>
                    <path d="M3.5 9L7.5 13L14.5 5" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </svg>
                </div>
                <div>
                  <p className={styles.fitColTitle}>우리가 잘 하는 것</p>
                  <p className={styles.fitColSub}>여기에 해당하면 강력 추천드립니다.</p>
                </div>
              </div>
              {[
                { title: '5–50페이지 규모의 사이트', desc: '브랜드, 이커머스, B2B SaaS 등 중간 규모. 너무 작지도 너무 크지도 않은 영역.' },
                { title: '12주 이내 런칭이 필요한 프로젝트', desc: '기획·디자인·개발이 함께 굴러가야 가능한 일정.' },
                { title: '디자인·콘텐츠 자산까지 한 팀에서', desc: 'AI 이미지·3D·영상이 결합된 통합 패키지가 가장 강점.' },
                { title: 'AI 콘텐츠 패키지 결합', desc: '사이트만 받지 말고, 광고 이미지·3D 자산까지 한 컨택트로.' },
                { title: '런칭 후 운영·확장 동행', desc: '단발성이 아닌 장기 파트너십. 콘텐츠 업데이트·기능 추가 지속.' },
              ].map((item) => (
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

            {/* Don't Column */}
            <div className={styles.fitDontCol}>
              <div className={styles.fitColHeader}>
                <div className={styles.fitDontIcon}>
                  <svg fill="none" height={18} viewBox="0 0 18 18" width={18}>
                    <path d="M5 5L13 13M13 5L5 13" stroke="white" strokeLinecap="round" strokeWidth="2.5" />
                  </svg>
                </div>
                <div>
                  <p className={styles.fitColTitle}>우리에게 맞지 않는 프로젝트</p>
                  <p className={styles.fitColSub}>해당하시면 더 적합한 파트너를 추천드립니다.</p>
                </div>
              </div>
              {[
                { title: '단순 워드프레스·카페24 템플릿 설치', desc: '전용 솔루션 업체가 더 빠르고 저렴합니다.' },
                { title: '100페이지 이상의 대규모 SI 프로젝트', desc: '대형 SI 업체가 인력·프로세스 측면에서 적합합니다.' },
                { title: '게임·블록체인·실시간 P2P 등 도메인 특화', desc: '각 영역의 전문 스튜디오를 추천드립니다.' },
                { title: '1주 미만의 초단기 긴급 프로젝트', desc: '디스커버리 단계가 부실해질 위험이 높습니다.' },
                { title: '디자인 자산 일체 클라이언트 제공 + 단순 퍼블리싱만', desc: '단가 대비 효율이 낮아 양쪽 모두 손해입니다.' },
              ].map((item) => (
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
            <h2 className={styles.faqTitle}>실제로 가장 많이 받는 질문들</h2>
            <p className={styles.faqSub}>
              미팅 전에 미리 답변해 드립니다. 더 궁금한 점은 카카오톡 채널로 바로 문의 가능합니다.
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
              시작해보세요
            </span>
            <h2 className={styles.ctaTitle}>어떤 사이트가 필요하신가요?</h2>
            <p className={styles.ctaSub}>
              아이디어 단계여도 좋습니다. 30분 무료 상담으로 가능성을 먼저
              확인해보세요.
            </p>
            <div className={styles.ctaButtons}>
              <Link
                className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}
                href={ROUTES.CONTACT.QUOTE}
              >
                무료 견적 받기 <span aria-hidden="true">→</span>
              </Link>
              <Link
                className={`${styles.ctaButton} ${styles.ctaButtonGhost}`}
                href={ROUTES.KAKAO}
              >
                카카오톡 문의
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
