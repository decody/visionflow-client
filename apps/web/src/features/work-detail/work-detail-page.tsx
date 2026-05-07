import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from './work-detail-page.module.css';

const heroChips = [
  { label: '웹 3D', primary: true },
  { label: '리테일' },
  { label: '2026 · 12주' },
];

const titleChips = [
  { label: '웹 3D', primary: true },
  { label: '리테일' },
  { label: '2026' },
];

const glance = [
  { label: 'CLIENT', value: 'Nordic Furniture', sub: '글로벌 가구 브랜드' },
  { label: 'INDUSTRY', value: '리테일 (가구·홈)', sub: 'D2C 이커머스' },
  { label: 'TIMELINE', value: '12주', sub: '2026.01 — 2026.04' },
  {
    label: 'KEY RESULT',
    value: '+47%',
    sub: '온라인 전환율',
    highlight: true,
  },
];

const approachSteps = [
  {
    no: '01',
    title: '디스커버리 — 사용자·시장 분석',
    desc: '핵심 타겟층 12명 1:1 인터뷰. 경쟁사 5곳 (West Elm, IKEA, MUJI 등) 디지털 경험 분석. 핵심 인사이트: 색상·재질·공간 어울림이 결정적 망설임 요소.',
  },
  {
    no: '02',
    title: '컨셉 디자인 — 3D 컨피규레이터 정의',
    desc: '제품 5개 라인 × 평균 8가지 변형. WebGL 기반 실시간 렌더링 + AR 미리보기 (모바일). 시안 3안 제안 후 클라이언트 1주 검토.',
  },
  {
    no: '03',
    title: '프로토타입 — 1차 검증',
    desc: 'Figma 디자인 + Three.js 프로토타입 동시 진행. 핵심 인터랙션 (회전·줌·재질 변경) 검증. 사용성 테스트 8명 → 80% 긍정.',
  },
  {
    no: '04',
    title: '개발 — 8주 스프린트',
    desc: 'Next.js 14 + Three.js + draco 압축. 2주 단위 4번 스프린트. 클라이언트 PM과 매주 데모 + 피드백 사이클.',
  },
  {
    no: '05',
    title: '런칭 + 측정',
    desc: 'A/B 테스트 (50:50) 4주. 신규 사이트 47% 전환율 우위. 풀 롤아웃 후에도 12주간 추적 → 효과 지속 확인.',
  },
];

interface ResultItem {
  value: string;
  delta: string;
  deltaTone: 'success' | 'primary';
  label: string;
  sub: string;
}

const results: ResultItem[] = [
  {
    value: '+47%',
    delta: '▲ 47%',
    deltaTone: 'success',
    label: '온라인 전환율',
    sub: '런칭 전 0.8% → 후 1.18%',
  },
  {
    value: '−63%',
    delta: '▼ 63%',
    deltaTone: 'primary',
    label: '이탈률',
    sub: '핵심 페이지 체류 시간 4.2배',
  },
  {
    value: '4.2×',
    delta: '▲ 320%',
    deltaTone: 'success',
    label: '평균 체류 시간',
    sub: '1분 12초 → 5분 4초',
  },
  {
    value: '2.8주',
    delta: '▲',
    deltaTone: 'success',
    label: 'ROI 회수',
    sub: '예상 12주 → 실제 2.8주',
  },
];

interface ChartBar {
  week: string;
  value: number;
  height: number;
  after: boolean;
}

const chartBars: ChartBar[] = [
  { week: 'W1', value: 0.8, height: 52, after: false },
  { week: 'W2', value: 0.9, height: 58, after: false },
  { week: 'W3', value: 0.7, height: 45, after: false },
  { week: 'W4', value: 0.85, height: 55, after: false },
  { week: 'W5', value: 1.05, height: 68, after: true },
  { week: 'W6', value: 1.18, height: 77, after: true },
  { week: 'W7', value: 1.22, height: 79, after: true },
  { week: 'W8', value: 1.25, height: 81, after: true },
];

const techStack = [
  { label: 'FRONTEND', items: ['Next.js 14', 'TypeScript', 'Tailwind', 'CSS Modules'] },
  { label: '3D · INTERACTION', items: ['Three.js', 'react-three-fiber', 'Draco', 'WebXR'] },
  { label: 'BACKEND · DATA', items: ['Supabase', 'Edge Functions', 'PostgreSQL', 'AG Grid'] },
  { label: 'INFRA · TOOLING', items: ['Vercel', 'Cloudflare R2', 'Sentry', 'Playwright'] },
];

const teamRoles = [
  {
    count: '1명',
    role: '프로덕트 매니저',
    desc: '클라이언트 커뮤니케이션 · 일정 관리',
  },
  {
    count: '2명',
    role: '프로덕트 디자이너',
    desc: 'UI 디자인 · 3D 자산 디렉션 · UX 리서치',
  },
  {
    count: '2명',
    role: '프론트엔드 개발자',
    desc: 'Next.js · Three.js · 인터랙션 구현',
  },
  {
    count: '1명',
    role: '백엔드 개발자',
    desc: 'Supabase · 견적 엔진 · 데이터 모델링',
  },
];

const timelinePhases = [
  { label: '디스커버리 · 2주', color: 'phase1', width: 16 },
  { label: '디자인 · 3주', color: 'phase2', width: 25 },
  { label: '개발 · 6주', color: 'phase3', width: 50 },
  { label: 'QA·런칭 · 1주', color: 'phase4', width: 9 },
];

interface RelatedCase {
  title: string;
  client: string;
  metric: string;
  year: string;
  gradient: string;
}

const relatedCases: RelatedCase[] = [
  {
    title: 'LUMINA Lighting Studio — 조명 컨피규레이터',
    client: 'Lumina · 10주',
    metric: '전환율 +38%',
    year: '2025',
    gradient: 'linear-gradient(160deg, #fceda6 0%, #f2c766 73%)',
  },
  {
    title: 'Atlas Sneakers — 360도 제품 뷰어 + 커스터마이저',
    client: 'Atlas Korea · 8주',
    metric: '평균 체류 +220%',
    year: '2025',
    gradient: 'linear-gradient(160deg, #8ca6d9 0%, #4d66a6 73%)',
  },
  {
    title: 'Hanssem Living — VR 룸 플래너',
    client: '한샘 · 14주',
    metric: '장바구니 +52%',
    year: '2024',
    gradient: 'linear-gradient(160deg, #b8d1b8 0%, #739980 73%)',
  },
];

export function WorkDetailPage() {
  return (
    <>
      <section className={styles.breadcrumb}>
        <Container>
          <nav aria-label="breadcrumb" className={styles.breadcrumbRow}>
            <Link className={styles.breadcrumbLink} href={ROUTES.WORK}>
              <span aria-hidden="true">←</span> Work
            </Link>
            <span aria-hidden="true" className={styles.breadcrumbSep}>
              /
            </span>
            <Link className={styles.breadcrumbLink} href={`${ROUTES.WORK}?cat=web-3d`}>
              웹 3D
            </Link>
            <span aria-hidden="true" className={styles.breadcrumbSep}>
              /
            </span>
            <span className={styles.breadcrumbCurrent}>Nordic Furniture 3D Configurator</span>
          </nav>
        </Container>
      </section>

      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroOrb1} />
        <div aria-hidden="true" className={styles.heroOrb2} />
        <div aria-hidden="true" className={styles.heroGrid} />
        <div aria-hidden="true" className={styles.heroCube}>
          <span className={styles.heroCubeFace1} />
          <span className={styles.heroCubeFace2} />
        </div>
        <span className={styles.liveBadge}>
          <span aria-hidden="true" className={styles.liveDot} />
          LIVE — nordicfurniture.com
        </span>
        <Container>
          <div className={styles.heroOverlay}>
            <div className={styles.heroChips}>
              {heroChips.map((c) => (
                <span
                  className={`${styles.chip} ${c.primary ? styles.chipPrimary : ''}`}
                  key={c.label}
                >
                  {c.label}
                </span>
              ))}
            </div>
            <h1 className={styles.heroTitle}>
              전환율을 47% 끌어올린
              <br />
              3D 컨피규레이터
            </h1>
            <div className={styles.heroMeta}>
              <span>읽는 시간 약 4분</span>
              <span aria-hidden="true" className={styles.heroMetaDot} />
              <span>Nordic Furniture · 3D 컨피규레이터</span>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.titleBlock}>
        <Container>
          <div className={styles.titleChips}>
            {titleChips.map((c) => (
              <span
                className={`${styles.chip} ${c.primary ? styles.chipPrimaryStrong : styles.chipMuted}`}
                key={c.label}
              >
                {c.label}
              </span>
            ))}
          </div>
          <h2 className={styles.titleHeading}>Nordic Furniture 3D Configurator</h2>
          <p className={styles.titleLead}>
            북유럽 가구 브랜드의 온라인 컨피규레이터를 12주 만에 출시. 3D 미리보기로 전환율을 47%
            끌어올렸습니다.
          </p>
        </Container>
      </section>

      <section className={styles.glance}>
        <Container>
          <ul className={styles.glanceGrid}>
            {glance.map((g) => (
              <li
                className={`${styles.glanceCard} ${g.highlight ? styles.glanceCardHi : ''}`}
                key={g.label}
              >
                <span className={`${styles.glanceLabel} ${g.highlight ? styles.glanceLabelHi : ''}`}>
                  {g.label}
                </span>
                <span className={`${styles.glanceValue} ${g.highlight ? styles.glanceValueHi : ''}`}>
                  {g.value}
                </span>
                <span className={styles.glanceSub}>{g.sub}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.challenge}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>The Challenge</span>
            <h2 className={styles.sectionTitle}>왜 이 프로젝트가 시작되었는가</h2>
            <p className={styles.sectionSub}>클라이언트가 마주한 구체적인 문제</p>
          </header>
          <div className={styles.challengeBody}>
            <div className={styles.challengeText}>
              <p className={styles.bodyPara}>
                Nordic Furniture는 50년 전통의 북유럽 가구 브랜드로, 2024년 D2C 이커머스로 전환을
                시도했습니다. 하지만 출시 6개월 만에 한 가지 명확한 문제가 드러났습니다.
              </p>
              <p className={styles.bodyPara}>
                소비자가 가구를 온라인에서 구매할 때 가장 큰 망설임은 “내 공간에 어울릴까”,
                “원단·색상이 사진과 같을까”라는 질문이었습니다. 기존 사이트는 정적 이미지 6장으로만
                제품을 보여줬고, 이는 물리적 매장 경험과 너무 큰 격차를 만들었습니다.
              </p>
              <p className={styles.bodyPara}>
                결과는 수치로 명확했습니다. 평균 체류 시간 1분 12초, 장바구니 진입 5%, 최종 구매
                0.8%. 동종 업계 평균(체류 2분 30초, 구매 1.8%)의 절반 수준이었습니다.
              </p>
            </div>
            <aside className={styles.challengeQuote}>
              <span aria-hidden="true" className={styles.challengeQuoteBar} />
              <div className={styles.challengeQuoteBody}>
                <span aria-hidden="true" className={styles.challengeQuoteMark}>
                  “
                </span>
                <p className={styles.challengeQuoteText}>
                  체류 시간이 너무 짧습니다. 사람들이 우리 제품을 보러 들어와서, 1분 안에 그냥
                  떠나버립니다.
                </p>
                <p className={styles.challengeQuoteAttr}>— Nordic Furniture 이커머스 책임자</p>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className={styles.approach}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnTint}`}>The Approach</span>
            <h2 className={styles.sectionTitle}>어떻게 풀어갔는가</h2>
            <p className={styles.sectionSub}>5단계로 나뉜 작업 흐름</p>
          </header>
          <ol className={styles.approachList}>
            {approachSteps.map((s, i) => (
              <li className={styles.approachItem} key={s.no}>
                <div className={styles.approachMarker}>
                  <span className={styles.approachMarkerNo}>{s.no}</span>
                  {i < approachSteps.length - 1 ? (
                    <span aria-hidden="true" className={styles.approachLine} />
                  ) : null}
                </div>
                <div className={styles.approachCard}>
                  <h3 className={styles.approachTitle}>{s.title}</h3>
                  <p className={styles.approachDesc}>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.solution}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowSquared}`}>The Solution</span>
            <h2 className={styles.sectionTitle}>우리가 만든 것</h2>
            <p className={styles.sectionSub}>실시간 3D 컨피규레이터 + AR 미리보기 + 즉시 견적</p>
          </header>

          <div className={styles.mockupCard}>
            <div className={styles.browserBar}>
              <span className={`${styles.browserDot} ${styles.browserDot1}`} />
              <span className={`${styles.browserDot} ${styles.browserDot2}`} />
              <span className={`${styles.browserDot} ${styles.browserDot3}`} />
            </div>
            <div className={styles.mockupBody}>
              <div className={styles.mockupSidebar}>
                <div className={styles.mockupBrand}>
                  <span className={styles.mockupLogo} />
                  <span className={styles.mockupBrandName}>NORDIC FURNITURE</span>
                </div>
                <p className={styles.mockupProduct}>소파 - 베르겐 3인용</p>
                <p className={styles.mockupSpec}>W 220 × D 95 × H 86 cm</p>
                <hr className={styles.mockupDivider} />
                <div className={styles.mockupGroup}>
                  <div className={styles.mockupGroupHead}>
                    <span>FABRIC</span>
                    <span className={styles.mockupGroupVal}>Stone</span>
                  </div>
                  <div className={styles.mockupSwatches}>
                    <span className={`${styles.swatch} ${styles.swatchSelected}`} style={{ background: '#bdb8a8' }} />
                    <span className={styles.swatch} style={{ background: '#454a4f' }} />
                    <span className={styles.swatch} style={{ background: '#456b52' }} />
                    <span className={styles.swatch} style={{ background: '#c26b52' }} />
                    <span className={styles.swatch} style={{ background: '#334573' }} />
                  </div>
                </div>
                <div className={styles.mockupGroup}>
                  <div className={styles.mockupGroupHead}>
                    <span>LEG MATERIAL</span>
                    <span className={styles.mockupGroupVal}>Oak</span>
                  </div>
                  <div className={styles.mockupSwatches}>
                    <span className={`${styles.swatch} ${styles.swatchSelected}`} style={{ background: '#c79e6b' }} />
                    <span className={styles.swatch} style={{ background: '#6b452e' }} />
                    <span className={styles.swatch} style={{ background: '#1a1a1a' }} />
                  </div>
                </div>
                <div className={styles.mockupPrice}>
                  <span className={styles.mockupPriceLabel}>견적</span>
                  <div className={styles.mockupPriceRow}>
                    <strong>₩ 1,840,000</strong>
                    <span>VAT 포함</span>
                  </div>
                </div>
                <button className={styles.mockupCta} type="button">
                  장바구니 담기
                </button>
              </div>
              <div className={styles.mockupViewport}>
                <div className={styles.mockupToolbar}>
                  <div className={styles.mockupViewPills}>
                    <span className={`${styles.viewPill} ${styles.viewPillActive}`}>3D 뷰</span>
                    <span className={styles.viewPill}>AR</span>
                    <span className={styles.viewPill}>VR</span>
                  </div>
                  <div className={styles.mockupActions}>
                    <span className={styles.iconBtn}>↻</span>
                    <span className={styles.iconBtn}>⤢</span>
                    <span className={styles.iconBtn}>♥</span>
                  </div>
                </div>
                <div className={styles.mockupStage}>
                  <div className={styles.mockupCouch} />
                  <div className={styles.mockupShadow} />
                  <span className={styles.mockupMeasure}>220 cm</span>
                </div>
              </div>
            </div>
          </div>

          <p className={styles.mockupCaption}>
            데스크톱 컨피규레이터 — 색상·재질·각도를 실시간으로 변경하며 즉시 견적이 갱신됩니다.
          </p>

          <div className={styles.gallery}>
            <article className={styles.galleryCard}>
              <div
                className={styles.galleryImage}
                style={{
                  backgroundImage:
                    'linear-gradient(146deg, rgb(242, 237, 224) 0%, rgb(217, 199, 173) 71%)',
                }}
              >
                <div className={styles.phoneShell}>
                  <div className={styles.phoneScreen}>
                    <span className={styles.phoneCouch} />
                  </div>
                  <span className={styles.phoneNotch} />
                  <span className={styles.phoneAction}>AR로 배치하기</span>
                </div>
              </div>
              <div className={styles.galleryCaption}>
                <h4 className={styles.galleryTitle}>Mobile AR Preview</h4>
                <p className={styles.galleryDesc}>
                  카메라로 가구를 자기 공간에 배치해볼 수 있습니다. iOS·Android 양 플랫폼 지원.
                </p>
              </div>
            </article>
            <article className={styles.galleryCard}>
              <div
                className={styles.galleryImage}
                style={{
                  backgroundImage:
                    'linear-gradient(146deg, rgb(235, 240, 247) 0%, rgb(199, 212, 232) 71%)',
                }}
              >
                <div className={styles.ipadShell}>
                  <aside className={styles.ipadSidebar}>
                    <span className={styles.ipadProduct}>베르겐 3인용</span>
                    <span className={styles.ipadGroupLabel}>FABRIC</span>
                    <div className={styles.ipadSwatches}>
                      <span className={`${styles.ipadSwatch} ${styles.ipadSwatchSelected}`} style={{ background: '#bdb8a8' }} />
                      <span className={styles.ipadSwatch} style={{ background: '#454a4f' }} />
                      <span className={styles.ipadSwatch} style={{ background: '#456b52' }} />
                    </div>
                    <span className={styles.ipadPrice}>₩ 1,840,000</span>
                    <span className={styles.ipadCta}>주문</span>
                  </aside>
                  <div className={styles.ipadStage}>
                    <span className={styles.ipadCouch} />
                  </div>
                </div>
              </div>
              <div className={styles.galleryCaption}>
                <h4 className={styles.galleryTitle}>iPad Configurator</h4>
                <p className={styles.galleryDesc}>
                  매장 직원이 고객과 함께 사용하는 키오스크 모드. 즉시 견적·결제까지 연동됩니다.
                </p>
              </div>
            </article>
          </div>
        </Container>
      </section>

      <section className={styles.results}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowSquared}`}>The Results</span>
            <h2 className={styles.sectionTitle}>결과는 수치로 말합니다</h2>
            <p className={styles.sectionSub}>런칭 후 4주 A/B 테스트 + 12주 운영 누적</p>
          </header>

          <ul className={styles.resultsGrid}>
            {results.map((r) => (
              <li className={styles.resultCard} key={r.label}>
                <div className={styles.resultTopRow}>
                  <span className={styles.resultValue}>{r.value}</span>
                  <span
                    className={`${styles.resultDelta} ${
                      r.deltaTone === 'success' ? styles.resultDeltaSuccess : styles.resultDeltaPrimary
                    }`}
                  >
                    {r.delta}
                  </span>
                </div>
                <span className={styles.resultLabel}>{r.label}</span>
                <span className={styles.resultSub}>{r.sub}</span>
              </li>
            ))}
          </ul>

          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>주간 전환율 (Before / After)</h3>
            <div className={styles.chart}>
              <span className={styles.chartYLabel}>전환율 (%)</span>
              <div className={styles.chartBars}>
                {chartBars.map((b, i) => (
                  <div className={styles.chartCol} key={b.week}>
                    <span className={styles.chartVal}>{b.value}%</span>
                    <span
                      className={`${styles.chartBar} ${b.after ? styles.chartBarAfter : styles.chartBarBefore}`}
                      style={{ height: `${b.height}%` }}
                    />
                    <span className={styles.chartWeek}>{b.week}</span>
                    {i === 3 ? (
                      <span aria-hidden="true" className={styles.chartLaunch}>
                        <span className={styles.chartLaunchLine} />
                        <span className={styles.chartLaunchLabel}>🚀 런칭</span>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendBefore}`} />
                Before — 기존 사이트
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendAfter}`} />
                After — 3D 컨피규레이터
              </span>
            </div>
          </div>

          <div className={styles.resultsQuote}>
            <span aria-hidden="true" className={styles.resultsQuoteMark}>
              “
            </span>
            <div className={styles.resultsQuoteBody}>
              <p className={styles.resultsQuoteText}>
                우리는 단순히 화려한 사이트를 원했던 게 아니라, 실제 매출이 오르는 도구가
                필요했습니다. VisionFlow는 처음 미팅부터 그 점을 정확히 짚어냈고, 결과로
                증명했습니다.
              </p>
              <div className={styles.resultsQuoteAuthor}>
                <span aria-hidden="true" className={styles.resultsQuoteAvatar}>
                  S
                </span>
                <div className={styles.resultsQuoteAuthorText}>
                  <strong>Sven Andersen</strong>
                  <span>Head of E-commerce, Nordic Furniture</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.tech}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Tech Stack</span>
            <h2 className={styles.sectionTitle}>사용한 기술</h2>
            <p className={styles.sectionSub}>카테고리별 핵심 도구</p>
          </header>
          <ul className={styles.techGrid}>
            {techStack.map((g) => (
              <li className={styles.techGroup} key={g.label}>
                <span className={styles.techLabel}>{g.label}</span>
                <div className={styles.techPills}>
                  {g.items.map((it) => (
                    <span className={styles.techPill} key={it}>
                      {it}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.team}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowSquared}`}>Team &amp; Timeline</span>
            <h2 className={styles.sectionTitle}>함께 만든 사람들과 시간</h2>
            <p className={styles.sectionSub}>PM·디자이너·개발자 6명이 12주 동안 운영한 프로젝트</p>
          </header>
          <div className={styles.teamGrid}>
            <div className={styles.teamCard}>
              <span className={styles.teamLabel}>TEAM COMPOSITION</span>
              <p className={styles.teamHeading}>총 6명 · 12주</p>
              <ul className={styles.teamRoles}>
                {teamRoles.map((r, i) => (
                  <li
                    className={`${styles.teamRole} ${i < teamRoles.length - 1 ? styles.teamRoleBorder : ''}`}
                    key={r.role}
                  >
                    <span className={styles.teamCount}>{r.count}</span>
                    <div className={styles.teamRoleText}>
                      <strong>{r.role}</strong>
                      <span>{r.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.teamCard}>
              <span className={styles.teamLabel}>PROJECT TIMELINE</span>
              <p className={styles.teamHeading}>총 12주</p>
              <div className={styles.timelineBar}>
                {timelinePhases.map((p) => (
                  <span
                    className={`${styles.timelineSeg} ${styles[`timelineSeg_${p.color}`] ?? ''}`}
                    key={p.label}
                    style={{ width: `${p.width}%` }}
                  />
                ))}
              </div>
              <div className={styles.timelineScale}>
                <span>W1</span>
                <span>W4</span>
                <span>W8</span>
                <span>W12</span>
              </div>
              <ul className={styles.timelineLegend}>
                {timelinePhases.map((p) => (
                  <li className={styles.timelineLegendItem} key={p.label}>
                    <span
                      className={`${styles.timelineLegendDot} ${styles[`timelineSeg_${p.color}`] ?? ''}`}
                    />
                    {p.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.testimonial}>
        <Container>
          <div className={styles.testimonialCard}>
            <span aria-hidden="true" className={styles.testimonialMark}>
              “
            </span>
            <p className={styles.testimonialText}>
              처음에는 단지 더 예쁜 웹사이트를 만드는 프로젝트라고 생각했습니다. 하지만 VisionFlow는
              첫 미팅부터 “왜 사용자가 떠나는가”라는 질문에 집중했고, 그 답을 데이터로
              증명했습니다. 이건 디자인 외주가 아니라 우리 비즈니스에 대한 진짜 컨설팅이었습니다.
            </p>
            <div className={styles.testimonialAuthor}>
              <span aria-hidden="true" className={styles.testimonialAvatar}>
                A
              </span>
              <div className={styles.testimonialAuthorText}>
                <strong>Anna Lindqvist</strong>
                <span>CMO · Nordic Furniture</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.related}>
        <Container>
          <div className={styles.relatedHead}>
            <header className={styles.relatedHeadText}>
              <span className={`${styles.eyebrow} ${styles.eyebrowSquared}`}>Related Cases</span>
              <h2 className={styles.sectionTitle}>비슷한 분야의 다른 케이스</h2>
              <p className={styles.sectionSub}>같은 “웹 3D” 카테고리에서 좋은 성과를 낸 프로젝트들</p>
            </header>
            <Link className={styles.relatedSeeAll} href={ROUTES.WORK}>
              전체 케이스 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className={styles.relatedGrid}>
            {relatedCases.map((c) => (
              <li className={styles.relatedItem} key={c.title}>
                <article className={styles.relatedCard}>
                  <div className={styles.relatedImage} style={{ backgroundImage: c.gradient }} />
                  <div className={styles.relatedBody}>
                    <div className={styles.relatedTopRow}>
                      <span className={`${styles.chip} ${styles.chipPrimaryStrong}`}>웹 3D</span>
                      <span className={styles.relatedYear}>{c.year}</span>
                    </div>
                    <h3 className={styles.relatedTitle}>{c.title}</h3>
                    <p className={styles.relatedClient}>{c.client}</p>
                    <div className={styles.relatedMetric}>
                      <span aria-hidden="true">▲</span>
                      <strong>{c.metric}</strong>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.cta}>
        <Container>
          <div className={styles.ctaInner}>
            <span className={styles.ctaEyebrow}>Start Your Project</span>
            <h2 className={styles.ctaTitle}>비슷한 프로젝트를 계획 중이신가요?</h2>
            <p className={styles.ctaSub}>
              첫 미팅에서 바로 “이 프로젝트가 우리에게 맞는가”부터 솔직하게 이야기합니다. 견적은
              무료, 응답은 1영업일 이내.
            </p>
            <div className={styles.ctaButtons}>
              <Link className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`} href={ROUTES.CONTACT}>
                무료 견적 받기 <span aria-hidden="true">→</span>
              </Link>
              <Link className={`${styles.ctaButton} ${styles.ctaButtonGhost}`} href={ROUTES.KAKAO}>
                <span aria-hidden="true">💬</span> 카카오톡으로 상담
              </Link>
            </div>
            <ul className={styles.ctaTrust}>
              <li>✓ 1영업일 응답</li>
              <li>✓ 무료 진단</li>
              <li>✓ NDA 사전 가능</li>
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
