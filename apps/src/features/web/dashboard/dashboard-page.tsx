import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container/container';

import { DashboardFaqAccordion } from './dashboard-faq-accordion';
import styles from './dashboard-page.module.css';

/* ─── 정적 데이터 ─── */

const STATS = [
  { value: '50만+', label: '행 처리 보장' },
  { value: '99.95%', label: '시스템 가용성' },
  { value: '60fps', label: '스크롤 유지' },
  { value: '4단계', label: 'RBAC 표준' },
] as const;

const SERVICES = [
  {
    id: 'bi',
    badge: 'BI Dashboard',
    duration: '4–8주',
    price: '₩1,500만원~',
    title: 'BI 대시보드',
    desc: '매출·운영 지표·KPI를 임원·실무자가 한눈에 보는 시각화 대시보드.',
    deliverables: [
      '차트 6종 (라인·바·도넛·히트맵)',
      '필터·기간·드릴다운',
      'PDF 보고서 출력',
    ],
  },
  {
    id: 'admin',
    badge: 'Admin Console',
    duration: '6–12주',
    price: '₩2,500만원~',
    title: '운영 어드민',
    desc: '회원·주문·콘텐츠를 관리하는 내부 운영 도구. 운영팀이 매일 8시간 사용하는 화면.',
    deliverables: [
      'CRUD + RBAC 권한 관리',
      '감사 로그 + 일괄 처리',
      'Excel 내보내기·가져오기',
    ],
  },
  {
    id: 'monitor',
    badge: 'Realtime Monitor',
    duration: '3–6주',
    price: '₩1,800만원~',
    title: '실시간 모니터링',
    desc: '서비스 상태·이벤트·거래를 실시간으로 추적하고 알림을 받는 모니터링 화면.',
    deliverables: [
      'WebSocket·SSE 실시간 차트',
      '임계치 알림 + Slack·카카오 푸시',
      '이상 거래·장애 자동 탐지',
    ],
  },
  {
    id: 'grid',
    badge: 'High-Volume Grid',
    duration: '2–5주',
    price: '₩1,200만원~',
    title: '대용량 데이터 그리드',
    desc: '수십만 ~ 수백만 행 데이터를 끊김 없이 다루는 고성능 테이블·관리 화면.',
    deliverables: [
      '가상 스크롤 + 다중 정렬·필터',
      '인라인 편집 + 행 그룹·피벗',
      'CSV / Excel 내보내기',
    ],
  },
] as const;

const SERVICE_BAR_HEIGHTS = [55, 78, 42, 92, 65, 100, 58];
const SERVICE_LINE_HIGHLIGHT_INDEX = 3;
const SERVICE_GRID_HIGHLIGHT = new Set(['1-5', '2-3']);

const TECH_STACKS = [
  {
    id: 'grid',
    label: '그리드·테이블',
    desc: '50만 행도 60fps 가상 스크롤',
    tags: ['AG Grid', 'TanStack Virtual', 'Ant Design Pro'],
  },
  {
    id: 'chart',
    label: '차트·시각화',
    desc: '표준부터 복잡 차트까지',
    tags: ['Recharts', 'Apache ECharts', 'D3.js'],
  },
  {
    id: 'state',
    label: '상태·데이터',
    desc: '서버/클라이언트 상태 분리',
    tags: ['TanStack Query', 'Zustand', 'Web Worker'],
  },
  {
    id: 'infra',
    label: '인프라·보안',
    desc: 'RLS · 감사 로그 자동',
    tags: ['Supabase', 'Vercel', 'Sentry', 'GA4'],
  },
] as const;

const PROCESS_STEPS = [
  {
    num: '01',
    title: 'KPI 디스커버리 워크숍',
    duration: '1주 (워크숍 1일)',
    desc: '현재 데이터 흐름 인터뷰, 목표 지표 정의, 사용자 역할 매핑, KPI 트리 작성. 화면을 그리기 전에 "무엇을 보여줄지" 먼저 합의합니다.',
    tags: ['KPI 정의서', '사용자 역할 매트릭스', '화면 IA', 'KPI 트리'],
  },
  {
    num: '02',
    title: '데이터 모델·API 설계',
    duration: '1–2주',
    desc: '스키마 설계, 인덱싱 전략, API 엔드포인트 정의, RBAC + RLS 권한 정책 설계. 50만 행 시나리오부터 가정한 설계.',
    tags: ['ER 다이어그램', 'OpenAPI 3.0 스펙', 'RLS 정책', '인덱싱 전략'],
  },
  {
    num: '03',
    title: 'UI 디자인',
    duration: '2–3주',
    desc: 'Ant Design Pro 기반 화면 시안, 사용자 흐름, 반응형 가이드. 운영팀 인터뷰 기반의 사용성 설계.',
    tags: ['Figma 화면 시안', '컴포넌트 라이브러리', '반응형 가이드', '인터랙션 명세'],
  },
  {
    num: '04',
    title: '구현·통합',
    duration: '3–6주',
    desc: '프론트엔드 + 백엔드 + 권한 시스템 + 감사 로그 통합 개발. 매주 데모 + 운영자 피드백 사이클.',
    tags: ['실제 동작 대시보드', '테스트 데이터', '주간 데모 환경', 'Lighthouse 90+'],
  },
  {
    num: '05',
    title: '운영 인계',
    duration: '1주 + 1개월 무상 운영',
    desc: '실데이터 마이그레이션, 운영자 교육, 운영 매뉴얼 인계. 1개월 무상 운영 후 클라이언트 계정으로 호스팅 이전.',
    tags: ['운영 매뉴얼', '영상 교육 자료', '모니터링 대시보드', 'GitHub 저장소 인계'],
  },
] as const;

const SECURITY_ITEMS = [
  {
    id: 'rbac',
    icon: '🔐',
    badge: '4단계 표준 + 커스텀',
    title: '권한 관리 (RBAC)',
    desc: '역할 기반 접근 제어. SuperAdmin / Admin / Operator / Viewer 4단계 표준에서 시작해, 메뉴·기능·데이터 행 단위로 세밀하게 제어합니다.',
    bullets: [
      'SuperAdmin · Admin · Operator · Viewer',
      '메뉴 · 기능 · 행 단위 권한',
      '커스텀 역할 무제한 추가',
    ],
  },
  {
    id: 'audit',
    icon: '📋',
    badge: '90일 기본 보관',
    title: '감사 로그 (Audit Log)',
    desc: '모든 쓰기 작업(생성·수정·삭제) 자동 기록. 누가·언제·무엇을·어떻게 변경했는지 검색 가능한 로그 화면 제공.',
    bullets: [
      '모든 쓰기 작업 자동 기록',
      '검색 가능한 로그 화면',
      '90일+ 보관 권장',
    ],
  },
  {
    id: 'data',
    icon: '🛡️',
    badge: 'RLS · 암호화 · 백업',
    title: '데이터 보안',
    desc: 'Supabase Row Level Security(RLS)로 SQL 단에서 권한 보호. 민감 컬럼 AES-256 암호화, 일일 자동 백업.',
    bullets: [
      'Row Level Security 기본 적용',
      '민감 컬럼 AES-256 암호화',
      '일일 자동 백업 + 점진 복구',
    ],
  },
] as const;

const CASES = [
  {
    id: 'fintech',
    metric: '5분→30초',
    metricLabel: '이상 거래 탐지',
    category: '실시간 거래 모니터링',
    title: 'Fintech Co.',
    desc: '일 평균 거래 12만 건, 동시 접속 운영자 28명 환경. WebSocket 기반 실시간 차트 + RBAC 4단계.',
  },
  {
    id: 'greenday',
    metric: '−60%',
    metricLabel: '운영 시간',
    category: '통합 운영 어드민',
    title: 'Greenday Commerce',
    desc: '운영팀 18명, SKU 4만 개 환경. AG Grid + Ant Design Pro 기반 통합 어드민으로 운영 시간 60% 단축.',
  },
  {
    id: 'atlas',
    metric: '+22%',
    metricLabel: '고객 잔존율',
    category: '고객사 임베디드 BI',
    title: 'Atlas SaaS',
    desc: '고객사 120개에 임베드된 화이트라벨 BI 대시보드. 화이트라벨링 + 멀티 테넌트 RLS 정책.',
  },
] as const;

const CASE_ATLAS_BAR_HEIGHTS = [45, 68, 38, 83, 57, 100, 72];

const FIT_DO = [
  {
    title: '운영팀이 매일 사용하는 내부 도구',
    desc: '운영팀 5명+, SKU·회원·콘텐츠 본격 관리 단계.',
  },
  {
    title: 'BI 대시보드·임원 보고 자동화',
    desc: '주간 보고서를 매번 엑셀로 만들고 있는 단계.',
  },
  {
    title: '실시간 모니터링·알림 시스템',
    desc: '핀테크·라이브 커머스·콜센터 등 즉시 대응 환경.',
  },
  {
    title: '대용량 데이터 그리드 (10만 행+)',
    desc: '엑셀이 멈추기 시작한 단계, 가상 스크롤 필요.',
  },
  {
    title: 'NDA·ISMS·보안 검토가 필요한 환경',
    desc: '엔터프라이즈 RFP 대응, RBAC + 감사 로그 필수.',
  },
] as const;

const FIT_DONT = [
  {
    title: '데이터 100행 미만의 단순 페이지',
    desc: 'Notion·Airtable이 더 효율적입니다.',
  },
  {
    title: '일반 사용자(end-user) 대상 화면',
    desc: '웹/앱 카테고리에서 더 적합한 패턴 제공.',
  },
  {
    title: '머신러닝 모델 학습·추론 자체가 핵심',
    desc: '별도 ML 전문 회사 권장 — 우리는 통합·시각화에 강점.',
  },
  {
    title: '기존 BI 도구 라이선스 유지 희망',
    desc: 'Tableau·Power BI 그대로 쓰시면 됩니다.',
  },
  {
    title: '데이터 소스가 정의되지 않은 단계',
    desc: '먼저 데이터 파이프라인 구축이 필요합니다.',
  },
] as const;

const PERF_ROWS = [
  { id: '387221', order: 'ORD-00387221', time: '13:42:15', customer: 'Customer 1000', item: '오버사이즈 후드', qty: 1, amount: '₩89,000', status: '결제완료', method: '카드', region: '서울' },
  { id: '387222', order: 'ORD-00387222', time: '13:41:22', customer: 'Customer 2017', item: '와이드 데님', qty: 2, amount: '₩101,300', status: '배송중', method: '카카오페이', region: '서울' },
  { id: '387223', order: 'ORD-00387223', time: '13:40:29', customer: 'Customer 3022', item: '청키 스니커즈', qty: 3, amount: '₩113,600', status: '배송완료', method: '계좌이체', region: '서울' },
  { id: '387224', order: 'ORD-00387224', time: '13:39:36', customer: 'Customer 4057', item: '레터링 티셔츠', qty: 4, amount: '₩125,900', status: '결제완료', method: '네이버페이', region: '서울' },
  { id: '387225', order: 'ORD-00387225', time: '13:38:43', customer: 'Customer 1092', item: '워크 재킷', qty: 1, amount: '₩138,200', status: '결제완료', method: '카드', region: '서울' },
  { id: '387226', order: 'ORD-00387226', time: '13:37:50', customer: 'Customer 2085', item: '체크 셔츠', qty: 2, amount: '₩150,500', status: '배송중', method: '카카오페이', region: '서울' },
  { id: '387227', order: 'ORD-00387227', time: '13:36:57', customer: 'Customer 3066', item: '카고 팬츠', qty: 3, amount: '₩162,800', status: '배송완료', method: '계좌이체', region: '서울' },
  { id: '387228', order: 'ORD-00387228', time: '13:35:64', customer: 'Customer 4133', item: '비니 모자', qty: 4, amount: '₩175,100', status: '결제완료', method: '네이버페이', region: '서울' },
] as const;

const PERF_STATS = [
  { id: 'fps', label: 'FPS', value: '60', sub: '60fps 유지', color: '#03c75a' },
  { id: 'mem', label: '메모리', value: '142MB', sub: '안정', color: 'var(--color-primary)' },
  { id: 'render', label: '렌더', value: '2.1s', sub: '초기 로드', color: 'var(--color-text)' },
  { id: 'battery', label: '배터리', value: '3시간', sub: '지속 사용 가능', color: '#03c75a' },
] as const;

const PERF_SLIDER_MARKS = [
  { value: '1만', position: 0 },
  { value: '5만', position: 25 },
  { value: '10만', position: 50 },
  { value: '50만', position: 75 },
  { value: '100만', position: 100 },
] as const;

/* ─── 컴포넌트 ─── */

export function DashboardPage() {
  return (
    <>
      {/* 1. Hero */}
      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroBackdrop} />
        <div aria-hidden="true" className={styles.heroGlow2} />
        <div aria-hidden="true" className={styles.heroGrid} />

        <div className={styles.heroContentWrap}>
          <div aria-hidden="true" className={styles.heroGlow1} />

          <div className={styles.heroLayout}>
            {/* 텍스트 */}
            <div className={styles.heroLeft}>
              <span className={styles.heroEyebrow}>
                <span aria-hidden="true" className={styles.heroEyebrowDot} />
                Data Dashboard · Enterprise-grade
              </span>
              <h1 className={styles.heroTitle}>
                데이터를 보는<br />가장 명확한 방법
              </h1>
              <p className={styles.heroSub}>
                BI 대시보드, 운영 어드민, 실시간 모니터링까지 — 50만 행도 끊김 없이 다루는 엔터프라이즈급 화면을, KPI 설계부터 운영 인계까지 한 팀이 책임집니다.
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
                  href={ROUTES.CONTACT.QUOTE}
                >
                  라이브 데모 보기 <span aria-hidden="true">→</span>
                </Link>
                <Link
                  className={`${styles.heroCta} ${styles.heroCtaGhost}`}
                  href={ROUTES.WORK}
                >
                  대표 케이스 보기
                </Link>
              </div>
            </div>

            {/* 대시보드 미리보기 */}
            <div aria-hidden="true" className={styles.heroPreview}>
              <div className={styles.heroPreviewBar}>
                <span className={`${styles.heroPreviewDot} ${styles.heroPreviewDotR}`} />
                <span className={`${styles.heroPreviewDot} ${styles.heroPreviewDotY}`} />
                <span className={`${styles.heroPreviewDot} ${styles.heroPreviewDotG}`} />
                <span className={styles.heroPreviewLive}>
                  <span className={styles.heroPreviewLiveDot} />
                  LIVE
                </span>
              </div>
              <div className={styles.heroPreviewBody}>
                <div className={styles.heroPreviewKpis}>
                  {[
                    { label: '오늘 매출', value: '₩824만', delta: '+12.4%', up: true },
                    { label: '주문', value: '342', delta: '+8.1%', up: true },
                    { label: '객단가', value: '₩24,090', delta: '−2.3%', up: false },
                    { label: '전환율', value: '3.2%', delta: '+0.4pt', up: true },
                  ].map((k) => (
                    <div className={styles.heroPreviewKpi} key={k.label}>
                      <span className={styles.heroPreviewKpiLabel}>{k.label}</span>
                      <strong className={styles.heroPreviewKpiValue}>{k.value}</strong>
                      <span className={`${styles.heroPreviewKpiDelta} ${k.up ? styles.heroPreviewKpiDeltaUp : styles.heroPreviewKpiDeltaDown}`}>
                        {k.delta}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.heroPreviewChart}>
                  <svg height="100%" preserveAspectRatio="none" viewBox="0 0 448 90" width="100%">
                    <polyline
                      fill="none"
                      points="0,70 41,62 82,66 122,48 163,52 204,30 245,38 286,20 327,26 367,10 408,16 448,8"
                      stroke="rgba(255,255,255,0.35)"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      strokeWidth="1.5"
                    />
                    <polyline
                      fill="none"
                      points="0,80 41,72 82,74 122,56 163,60 204,40 245,46 286,28 327,32 367,18 408,22 448,14"
                      stroke="#03c75a"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div className={styles.heroPreviewRow}>
                  <span className={styles.heroPreviewRowText}>ORD-00012</span>
                  <span className={styles.heroPreviewRowText}>14:32:08</span>
                  <span className={styles.heroPreviewRowText}>₩89,000</span>
                  <span className={styles.heroPreviewRowStatus}>결제완료</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 서비스 타입 */}
      <section className={styles.services}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Services</span>
            <h2 className={styles.sectionTitle}>어떤 화면이 필요하신가요?</h2>
            <p className={styles.sectionSub}>
              4가지 시나리오 중 가장 가까운 것을 선택해 자세히 살펴보세요. 패키지 결합 시 더 효율적입니다.
            </p>
          </header>
          <ul className={styles.servicesGrid} role="list">
            {SERVICES.map((s) => (
              <li className={styles.serviceCard} key={s.id}>
                <Link className={styles.serviceCardLink} href={ROUTES.CONTACT.QUOTE}>
                  <div className={`${styles.serviceVisual} ${styles[`serviceVisual_${s.id}`]}`} aria-hidden="true">
                    {s.id === 'bi' && (
                      <div className={styles.serviceVisualBars}>
                        {SERVICE_BAR_HEIGHTS.map((h, i) => (
                          <div
                            className={`${styles.serviceVisualBar} ${i === 5 ? styles.serviceVisualBarActive : ''}`}
                            key={i}
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    )}
                    {s.id === 'admin' && (
                      <div className={styles.serviceVisualLines}>
                        {Array.from({ length: 6 }, (_, i) => (
                          <div
                            className={`${styles.serviceVisualLine} ${i === SERVICE_LINE_HIGHLIGHT_INDEX ? styles.serviceVisualLineActive : ''}`}
                            key={i}
                          />
                        ))}
                      </div>
                    )}
                    {s.id === 'monitor' && (
                      <svg className={styles.serviceVisualChart} preserveAspectRatio="none" viewBox="0 0 360 100">
                        <polyline
                          fill="none"
                          points="0,70 40,40 80,58 120,22 160,46 200,18 240,42 280,12 320,30 360,8"
                          stroke="#fff"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                        />
                        <circle cx="360" cy="8" fill="#fff" r="6" />
                      </svg>
                    )}
                    {s.id === 'grid' && (
                      <div className={styles.serviceVisualGrid}>
                        {Array.from({ length: 5 }, (_, row) =>
                          Array.from({ length: 8 }, (_, col) => (
                            <div
                              className={`${styles.serviceVisualCell} ${SERVICE_GRID_HIGHLIGHT.has(`${row}-${col}`) ? styles.serviceVisualCellActive : ''}`}
                              key={`${row}-${col}`}
                            />
                          )),
                        )}
                      </div>
                    )}
                  </div>
                  <div className={styles.serviceBody}>
                    <div className={styles.serviceTopRow}>
                      <span className={styles.serviceBadge}>{s.badge}</span>
                      <div className={styles.serviceMeta}>
                        <span className={styles.serviceDuration}>{s.duration}</span>
                        <span aria-hidden="true" className={styles.serviceMetaDot} />
                        <span className={styles.servicePrice}>{s.price}</span>
                      </div>
                    </div>
                    <h3 className={styles.serviceTitle}>{s.title}</h3>
                    <p className={styles.serviceDesc}>{s.desc}</p>
                    <ul className={styles.serviceDeliverables} role="list">
                      {s.deliverables.map((d) => (
                        <li className={styles.serviceDeliverable} key={d}>
                          <span aria-hidden="true" className={styles.serviceDeliverableCheck}>✓</span>
                          {d}
                        </li>
                      ))}
                    </ul>
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

      {/* 3. 기술 스택 */}
      <section className={styles.tech}>
        <Container>
          <header className={styles.techHead}>
            <span className={styles.eyebrow}>Tech Stack</span>
            <h2 className={styles.techTitle}>엔터프라이즈에서 검증된 표준 스택</h2>
            <p className={styles.techSub}>
              AG Grid Community + Ant Design Pro 페어. 인수인계 가능한 오픈 표준만 사용 — 락인 없습니다.
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

      {/* 4. 프로세스 */}
      <section className={styles.process}>
        <Container>
          <header className={styles.processHead}>
            <span className={styles.eyebrow}>Process</span>
            <h2 className={styles.processTitle}>KPI 워크숍부터 운영 인계까지 5단계</h2>
            <p className={styles.processSub}>
              첫 1주에 "무엇을 어떻게 보여줄지"부터 같이 설계합니다. 화면만 만드는 외주가 아닙니다.
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
                        <span aria-hidden="true" className={styles.processTagCheck}>✓</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 5. 보안 & 컴플라이언스 */}
      <section className={styles.security}>
        <Container>
          <header className={styles.securityHead}>
            <span className={styles.eyebrow}>Security &amp; Compliance</span>
            <h2 className={styles.securityTitle}>엔터프라이즈가 검토하는 모든 것</h2>
            <p className={styles.securitySub}>
              RBAC, 감사 로그, RLS — 모두 기본 패키지에 포함됩니다. NDA·ISMS 대응 자료 별도 제공.
            </p>
          </header>
          <ul className={styles.securityGrid} role="list">
            {SECURITY_ITEMS.map((s) => (
              <li className={styles.securityCard} key={s.id}>
                <span aria-hidden="true" className={styles.securityCardIcon}>{s.icon}</span>
                <span className={styles.securityCardBadge}>{s.badge}</span>
                <h3 className={styles.securityCardTitle}>{s.title}</h3>
                <p className={styles.securityCardDesc}>{s.desc}</p>
                <ul className={styles.securityCardBullets} role="list">
                  {s.bullets.map((b) => (
                    <li className={styles.securityCardBullet} key={b}>
                      <span aria-hidden="true" className={styles.securityCardDot} />
                      {b}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 6. 라이브 데모 */}
      <section className={styles.demo}>
        <div aria-hidden="true" className={styles.demoBackdrop} />
        <Container>
          <header className={styles.demoHead}>
            <span className={styles.heroEyebrow}>
              <span aria-hidden="true" className={styles.heroEyebrowDot} />
              Live Interactive Demo
            </span>
            <h2 className={styles.demoTitle}>실제로 동작합니다 — 시나리오를 바꿔보세요</h2>
            <p className={styles.demoSub}>
              아래는 실제 동작하는 대시보드입니다. 사이드바에서 시나리오(이커머스·SaaS·핀테크·콘텐츠)를 클릭하면 데이터·차트·그리드가 즉시 갱신됩니다.
            </p>
          </header>

          <div aria-label="대시보드 미리보기" className={styles.demoBrowser} role="img">
            <div className={styles.demoBrowserBar}>
              <div className={styles.demoBrowserDots}>
                <span className={`${styles.demoBrowserDot} ${styles.demoBrowserDotR}`} />
                <span className={`${styles.demoBrowserDot} ${styles.demoBrowserDotY}`} />
                <span className={`${styles.demoBrowserDot} ${styles.demoBrowserDotG}`} />
              </div>
              <span className={styles.demoBrowserUrl}>
                <span aria-hidden="true">🔒</span> app.visionflow.kr/dashboards/demo
              </span>
              <span className={styles.demoBrowserLive}>
                <span className={styles.demoBrowserLiveDot} />
                LIVE · 2초 단위 갱신
              </span>
            </div>

            <div className={styles.demoBrowserBody}>
              {/* 사이드바 */}
              <aside className={styles.demoSidebar}>
                <div className={styles.demoSidebarLogo}>
                  <span className={styles.demoSidebarLogoMark}>V</span>
                  Demo Dashboard
                </div>
                <p className={styles.demoSidebarLabel}>SCENARIOS</p>
                {[
                  { key: 'ecom', icon: '🛒', label: '이커머스 매출', sublabel: 'E-commerce', active: true },
                  { key: 'saas', icon: '👥', label: 'SaaS MAU·이탈', sublabel: 'SaaS Metrics', active: false },
                  { key: 'fin', icon: '📈', label: '핀테크 거래', sublabel: 'Fintech', active: false },
                  { key: 'content', icon: '▶︎', label: '콘텐츠 플랫폼', sublabel: 'Content', active: false },
                ].map((sc) => (
                  <div
                    className={`${styles.demoScenario} ${sc.active ? styles.demoScenarioActive : ''}`}
                    key={sc.key}
                  >
                    <span aria-hidden="true" className={styles.demoScenarioIcon}>{sc.icon}</span>
                    <span className={styles.demoScenarioText}>
                      <span className={styles.demoScenarioLabel}>{sc.label}</span>
                      <span className={styles.demoScenarioSub}>{sc.sublabel}</span>
                    </span>
                  </div>
                ))}
                <p className={styles.demoSidebarHint}>
                  👇 클릭해서 시나리오 변경
                  <span className={styles.demoSidebarHintSub}>메트릭·차트·그리드가 즉시 swap됩니다</span>
                </p>
              </aside>

              {/* 메인 영역 */}
              <div className={styles.demoMain}>
                <div className={styles.demoMainHeader}>
                  <div>
                    <h4 className={styles.demoMainTitle}>이커머스 매출 대시보드</h4>
                    <span className={styles.demoMainDate}>오늘 · 2026년 5월 5일 · 마지막 갱신: 1초 전</span>
                  </div>
                  <div className={styles.demoRangeTabs}>
                    {['오늘', '7일', '30일'].map((r, i) => (
                      <span className={`${styles.demoRangeTab} ${i === 0 ? styles.demoRangeTabActive : ''}`} key={r}>
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={styles.demoKpis}>
                  {[
                    { label: '오늘 매출', value: '₩8,240,000', delta: '▲ +12.4%', up: true },
                    { label: '주문 수', value: '342', delta: '▲ +8.1%', up: true },
                    { label: '객단가', value: '₩24,090', delta: '▼ −2.3%', up: false },
                    { label: '전환율', value: '3.2%', delta: '▲ +0.4pt', up: true },
                  ].map((k) => (
                    <div className={styles.demoKpi} key={k.label}>
                      <div className={styles.demoKpiTopRow}>
                        <span className={styles.demoKpiLabel}>{k.label}</span>
                        <span aria-hidden="true" className={styles.demoKpiDot} />
                      </div>
                      <strong className={styles.demoKpiValue}>{k.value}</strong>
                      <span className={`${styles.demoKpiDelta} ${k.up ? styles.demoKpiDeltaUp : styles.demoKpiDeltaDown}`}>
                        {k.delta}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.demoChartRow}>
                  <div className={styles.demoChart}>
                    <div className={styles.demoChartHead}>
                      <span className={styles.demoChartLabel}>시간대별 매출 (실시간)</span>
                      <div className={styles.demoChartLegend}>
                        {[
                          { color: '#004FFF', label: '오늘' },
                          { color: '#a3aab1', label: '어제' },
                          { color: '#03c75a', label: '7일 평균' },
                        ].map((l) => (
                          <span className={styles.demoChartLegendItem} key={l.label}>
                            <span className={styles.demoChartLegendDot} style={{ background: l.color }} />
                            {l.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <svg className={styles.demoChartSvg} preserveAspectRatio="none" viewBox="0 0 520 120">
                      <polyline
                        fill="none"
                        points="0,95 47,88 95,90 142,70 190,75 237,50 285,58 332,35 380,42 427,20 475,28 520,8"
                        stroke="#a3aab1"
                        strokeDasharray="3 4"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                      <polyline
                        fill="none"
                        points="0,105 47,98 95,100 142,80 190,85 237,60 285,68 332,45 380,52 427,30 475,38 520,18"
                        stroke="#004FFF"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                  <div className={styles.demoPie}>
                    <span className={styles.demoChartLabel}>카테고리별 매출</span>
                    <div className={styles.demoPieCircle}>
                      <span className={styles.demoPieCenterValue}>824M</span>
                      <span className={styles.demoPieCenterLabel}>오늘 매출</span>
                    </div>
                    <div className={styles.demoPieLegend}>
                      {[
                        { color: '#004FFF', label: '의류', pct: '48%' },
                        { color: '#03c75a', label: '잡화', pct: '32%' },
                        { color: '#f59e0b', label: '뷰티', pct: '12%' },
                        { color: '#a3aab1', label: '기타', pct: '8%' },
                      ].map((l) => (
                        <div className={styles.demoPieLegendItem} key={l.label}>
                          <span className={styles.demoPieLegendDot} style={{ background: l.color }} />
                          <span className={styles.demoPieLegendLabel}>{l.label}</span>
                          <span className={styles.demoPieLegendPct}>{l.pct}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={styles.demoTableWrap}>
                  <div className={styles.demoTableHead}>
                    <span>최근 주문 (200행 · 가상 스크롤)</span>
                    <span className={styles.demoTableActions}>
                      🔍 필터 &nbsp; ⬇ Excel 내보내기
                    </span>
                  </div>
                  <div className={styles.demoTableCols}>
                    <span>주문번호</span>
                    <span>시간 ↓</span>
                    <span>고객</span>
                    <span>상품</span>
                    <span>금액</span>
                    <span>상태</span>
                  </div>
                  {[
                    { id: 'ORD-00342', time: '14:32:08', customer: 'Customer 8421', item: '오버사이즈 후드', amount: '₩89,000', status: '결제완료' },
                    { id: 'ORD-00341', time: '14:31:54', customer: 'Customer 1208', item: '와이드 데님', amount: '₩68,000', status: '배송중' },
                    { id: 'ORD-00340', time: '14:31:02', customer: 'Customer 5829', item: '청키 스니커즈', amount: '₩142,000', status: '결제완료' },
                    { id: 'ORD-00339', time: '14:30:47', customer: 'Customer 3094', item: '레터링 티셔츠', amount: '₩42,000', status: '배송완료' },
                    { id: 'ORD-00338', time: '14:30:12', customer: 'Customer 7651', item: '워크 재킷', amount: '₩188,000', status: '취소' },
                  ].map((r, i) => (
                    <div className={`${styles.demoTableRow} ${i % 2 === 1 ? styles.demoTableRowAlt : ''}`} key={r.id}>
                      <span className={styles.demoTableOrderId}>{r.id}</span>
                      <span>{r.time}</span>
                      <span>{r.customer}</span>
                      <span>{r.item}</span>
                      <span className={styles.demoTableAmount}>{r.amount}</span>
                      <span
                        className={`${styles.demoTableStatus} ${
                          r.status === '결제완료'
                            ? styles.demoTableStatusDone
                            : r.status === '배송중'
                              ? styles.demoTableStatusShip
                              : r.status === '취소'
                                ? styles.demoTableStatusCancelled
                                : styles.demoTableStatusMuted
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.demoCta}>
            <Link className={styles.demoCtaBtn} href={ROUTES.CONTACT.QUOTE}>
              이런 대시보드 만들기 <span aria-hidden="true">→</span>
            </Link>
            <span className={styles.demoCtaHint}>💬 시나리오 자동 입력으로 견적 요청</span>
          </div>
        </Container>
      </section>

      {/* 7. 성능 벤치마크 */}
      <section className={styles.perf}>
        <Container>
          <header className={styles.perfHead}>
            <span className={styles.eyebrow}>Performance Benchmark</span>
            <h2 className={styles.perfTitle}>50만 행도 끊김 없이 — 직접 슬라이더를 움직여보세요</h2>
            <p className={styles.perfSub}>
              엑셀이 멈추는 행 수에서도 우리 그리드는 60fps를 유지합니다. 행 수를 늘려도 스크롤·정렬·필터 모두 정상 동작.
            </p>
          </header>

          <div className={styles.perfContent}>
            <div className={styles.perfSlider} role="img" aria-label="데이터 행 수 슬라이더, 현재 100만 행">
              <div className={styles.perfSliderMain}>
                <div className={styles.perfSliderTopRow}>
                  <span className={styles.perfSliderLabel}>데이터 행 수</span>
                  <span className={styles.perfSliderValue}>1,000,000 행</span>
                </div>
                <div className={styles.perfSliderTrack}>
                  <div className={styles.perfSliderTrackBg} />
                  <div className={styles.perfSliderTrackFill} />
                  <div aria-hidden="true" className={styles.perfSliderThumb} />
                  {PERF_SLIDER_MARKS.map((m) => (
                    <span
                      className={styles.perfSliderMark}
                      key={m.value}
                      style={{ left: `${m.position}%` }}
                    >
                      {m.value}
                    </span>
                  ))}
                </div>
              </div>
              <div className={styles.perfSliderStats}>
                {PERF_STATS.map((s) => (
                  <div className={styles.perfSliderStat} key={s.id}>
                    <span className={styles.perfSliderStatLabel}>{s.label}</span>
                    <strong className={styles.perfSliderStatValue} style={{ color: s.color }}>
                      {s.value}
                    </strong>
                    <span className={styles.perfSliderStatSub}>{s.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            <div aria-hidden="true" className={styles.perfGrid}>
              <div className={styles.perfGridHeader}>
                <span>Row #</span>
                <span>주문번호</span>
                <span>시간</span>
                <span>고객</span>
                <span>상품</span>
                <span className={styles.perfGridAlignEnd}>수량</span>
                <span className={styles.perfGridAlignEnd}>금액</span>
                <span>상태</span>
                <span>결제수단</span>
                <span>배송지</span>
              </div>
              {PERF_ROWS.map((r, i) => (
                <div className={`${styles.perfGridRow} ${i % 2 === 1 ? styles.perfGridRowAlt : ''}`} key={r.id}>
                  <span className={styles.perfGridNum}>{r.id}</span>
                  <span className={styles.perfGridOrderId}>{r.order}</span>
                  <span>{r.time}</span>
                  <span>{r.customer}</span>
                  <span>{r.item}</span>
                  <span className={styles.perfGridAlignEnd}>{r.qty}</span>
                  <span className={styles.perfGridAlignEnd}>{r.amount}</span>
                  <span>
                    <span
                      className={`${styles.perfGridStatus} ${
                        r.status === '결제완료'
                          ? styles.perfGridStatusDone
                          : r.status === '배송중'
                            ? styles.perfGridStatusShip
                            : styles.perfGridStatusMuted
                      }`}
                    >
                      {r.status}
                    </span>
                  </span>
                  <span>{r.method}</span>
                  <span>{r.region}</span>
                </div>
              ))}
              <div className={styles.perfGridFooter}>
                <span>👁 Row 387,221 ~ 387,228 / 500,000 (가상 스크롤)</span>
                <span>⚡ 60 FPS · 142MB · 2.1s 초기 로드</span>
              </div>
            </div>

            <p className={styles.perfHint}>
              💡 행 수를 늘려도 60fps를 유지합니다 — 직접 슬라이더를 움직이고 스크롤·정렬·필터를 시도해보세요.
            </p>
          </div>
        </Container>
      </section>

      {/* 8. 케이스 */}
      <section className={styles.cases}>
        <Container>
          <header className={styles.casesHead}>
            <span className={styles.eyebrow}>Featured Cases</span>
            <h2 className={styles.casesTitle}>결과로 증명한 데이터 대시보드</h2>
            <p className={styles.casesSub}>
              단순 화면이 아닌 운영 시간·이상 거래 탐지·고객 잔존율을 실제로 움직인 3개 케이스.
            </p>
          </header>
          <ul className={styles.casesGrid} role="list">
            {CASES.map((c) => (
              <li className={styles.casesCard} key={c.id}>
                <div className={`${styles.casesVisual} ${styles[`casesVisual_${c.id}`]}`} aria-hidden="true">
                  {c.id === 'fintech' && (
                    <svg className={styles.casesVisualChart} preserveAspectRatio="none" viewBox="0 0 324 40">
                      <polyline
                        fill="none"
                        points="0,30 27,10 54,28 81,8 108,26 135,6 162,24 189,4 216,22 243,2 270,20 297,5 324,16"
                        stroke="rgba(255,255,255,0.85)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                      />
                      <circle cx="324" cy="16" fill="#fff" r="5" />
                    </svg>
                  )}
                  {c.id === 'greenday' && (
                    <div className={styles.casesVisualLines}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          className={`${styles.casesVisualLine} ${i === 2 ? styles.casesVisualLineActive : ''}`}
                          key={i}
                        />
                      ))}
                    </div>
                  )}
                  {c.id === 'atlas' && (
                    <div className={styles.casesVisualBars}>
                      {CASE_ATLAS_BAR_HEIGHTS.map((h, i) => (
                        <div
                          className={`${styles.casesVisualBar} ${i === 5 ? styles.casesVisualBarActive : ''}`}
                          key={i}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  )}
                  <span className={styles.casesVisualBadge}>
                    {c.metric} {c.metricLabel}
                  </span>
                </div>
                <div className={styles.casesBody}>
                  <span className={styles.casesCat}>{c.category}</span>
                  <h3 className={styles.casesCardTitle}>{c.title}</h3>
                  <p className={styles.casesDesc}>{c.desc}</p>
                  <span className={styles.casesLink}>케이스 자세히 보기 <span aria-hidden="true">→</span></span>
                </div>
              </li>
            ))}
          </ul>
          <Link className={styles.casesSeeAll} href={ROUTES.WORK}>
            15개+ 누적 데이터 대시보드 케이스 모두 보기 <span aria-hidden="true">→</span>
          </Link>
        </Container>
      </section>

      {/* 9. Fit Check */}
      <section className={styles.fitCheck}>
        <Container>
          <header className={styles.fitHead}>
            <span className={styles.eyebrow}>Fit Check</span>
            <h2 className={styles.fitTitle}>우리에게 맞는 / 맞지 않는 프로젝트</h2>
            <p className={styles.fitSub}>
              솔직하게 말씀드립니다. 첫 미팅 전에 적합도를 가늠해 보세요.
            </p>
          </header>

          <div className={styles.fitRow}>
            <div className={styles.fitDoCol}>
              <div className={styles.fitColHeader}>
                <div className={styles.fitDoIcon} aria-hidden="true">✓</div>
                <p className={styles.fitColTitle}>이런 프로젝트는 잘 합니다</p>
              </div>
              {FIT_DO.map((item) => (
                <div className={styles.fitItem} key={item.title}>
                  <span aria-hidden="true" className={styles.fitDoDot} />
                  <div>
                    <p className={styles.fitItemTitle}>{item.title}</p>
                    <p className={styles.fitItemDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.fitDontCol}>
              <div className={styles.fitColHeader}>
                <div className={styles.fitDontIcon} aria-hidden="true">✗</div>
                <p className={styles.fitColTitle}>이런 프로젝트는 권하지 않습니다</p>
              </div>
              {FIT_DONT.map((item) => (
                <div className={styles.fitItem} key={item.title}>
                  <span aria-hidden="true" className={styles.fitDontDot} />
                  <div>
                    <p className={styles.fitItemTitle}>{item.title}</p>
                    <p className={styles.fitItemDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 10. FAQ */}
      <section className={styles.faq} id="faq">
        <Container>
          <header className={styles.faqHead}>
            <span className={styles.eyebrow}>FAQ</span>
            <h2 className={styles.faqTitle}>자주 받는 질문</h2>
            <p className={styles.faqSub}>
              엔터프라이즈 RFP 검토에서 가장 많이 나오는 8개 질문 — 라이선스·보안·인계까지.
            </p>
          </header>
          <DashboardFaqAccordion />
        </Container>
      </section>

      {/* 11. CTA */}
      <section className={styles.cta}>
        <div aria-hidden="true" className={styles.ctaOrb1} />
        <div aria-hidden="true" className={styles.ctaOrb2} />
        <div aria-hidden="true" className={styles.ctaGrid} />
        <Container>
          <div className={styles.ctaInner}>
            <span className={styles.heroEyebrow}>
              <span aria-hidden="true" className={styles.heroEyebrowDot} />
              Start Your Dashboard
            </span>
            <h2 className={styles.ctaTitle}>숫자가 의사결정으로 바뀌는 곳</h2>
            <p className={styles.ctaSub}>
              아이디어 단계여도 좋습니다. 1일 KPI 워크숍으로 무엇을·어떻게 보여줄지부터 함께 설계해 드립니다.
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
                카카오톡 1:1 문의
              </Link>
            </div>
            <ul className={styles.ctaBadges} role="list">
              {['1영업일 응답', 'KPI 워크숍 포함', 'NDA 사전 가능'].map((b) => (
                <li className={styles.ctaBadge} key={b}>
                  <span aria-hidden="true" className={styles.ctaBadgeCheck}>✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
