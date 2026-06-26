import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container/container';

import { AdVisualsFaqAccordion } from './ad-visuals-faq-accordion';
import styles from './ad-visuals-page.module.css';
import { BeforeAfterSlider } from './before-after-slider';

/* ─── 정적 데이터 ─── */

const STATS = [
  { value: '2,400+', label: '누적 컷 수' },
  { value: '5일', label: '평균 납기' },
  { value: '95%+', label: '톤 일관성' },
  { value: '6채널', label: '동시 출력' },
] as const;

const HERO_GRID = [
  { key: 'product', label: 'PRODUCT' },
  { key: 'person', label: 'PERSON' },
  { key: 'food', label: 'FOOD' },
  { key: 'campaign', label: 'CAMPAIGN' },
  { key: 'character', label: 'CHARACTER' },
  { key: 'interior', label: 'INTERIOR' },
] as const;

const SERVICES = [
  {
    id: 'product',
    badge: 'Product Cuts',
    duration: '3–7일',
    price: '₩200만원~',
    title: '제품 광고 이미지',
    desc: '이커머스·SNS 광고용 단독 비주얼. 4K 고해상도 + 비율 동시 출력 + 배경 변형 5종.',
    deliverables: ['4K 고해상도 30컷', '세로·가로·정사각형 동시 출력', '배경·소품 변형 5종'],
    image: '/images/ad-visuals/service-01-product.png',
  },
  {
    id: 'ecommerce',
    badge: 'E-commerce Detail',
    duration: '5–10일',
    price: '₩400만원~',
    title: '이커머스 상세페이지',
    desc: '텍스트·이미지가 결합된 롱폼 상세컷 (스크롤 8–15장). 모바일 우선 설계.',
    deliverables: ['네이버·카카오·자체몰 규격 대응', '모바일 우선 8–15장', 'AI 카피라이팅 보조'],
    image: '/images/ad-visuals/service-02-ecommerce.png',
  },
  {
    id: 'campaign',
    badge: 'Campaign Visuals',
    duration: '5–10일',
    price: '₩500만원~',
    title: '캠페인 키 비주얼',
    desc: '시즌·이벤트 캠페인을 관통하는 키 이미지·그래픽 시리즈. 메인 + 6채널 변형.',
    deliverables: ['메인 커버 1종 + SNS 변형', '1:1, 4:5, 9:16 비율 동시', 'After Effects 모션 옵션'],
    image: '/images/ad-visuals/service-03-campaign.png',
  },
  {
    id: 'character',
    badge: 'Brand Character',
    duration: '7–14일',
    price: '₩600만원~',
    title: '브랜드 캐릭터·일러스트',
    desc: '브랜드 마스코트·일러스트 시스템. 시안 3종 → 최종 + 표정·포즈 변형 10종.',
    deliverables: ['시안 3종 → 최종 1종', '표정·포즈 변형 10종', 'LoRA 캐릭터 일관성 학습'],
    image: '/images/ad-visuals/service-04-character.png',
  },
] as const;

const CHANNELS = [
  { label: '네이버 상세', size: '860×1147', color: '#03C75A' },
  { label: '카카오 광고', size: '720×1280', color: '#FEE500' },
  { label: '인스타 피드', size: '1080×1080', color: '#E1306C' },
  { label: '인스타 스토리', size: '1080×1920', color: '#833AB4' },
  { label: '인스타 릴스', size: '1080×1920', color: '#C13584' },
  { label: '구글 디스플레이', size: '1200×628', color: '#4285F4' },
] as const;

const TONE_STEPS = [
  {
    num: '01',
    title: '레퍼런스 수집',
    duration: '',
    desc: '브랜드 가이드라인·기존 컷·경쟁사 분석으로 30–50장 레퍼런스 라이브러리 구축. 색상·구도·무드의 공통점 추출.',
    tags: ['레퍼런스 무드보드', '색상 팔레트 정의', '구도 패턴 분류'],
  },
  {
    num: '02',
    title: 'LoRA 파인튜닝',
    duration: '1–2일',
    desc: '브랜드 톤·색상·구도를 학습한 전용 LoRA 모델 제작. 클라이언트 자산은 외부 학습 풀과 분리해 격리 학습.',
    tags: ['전용 LoRA 모델 가중치', '파인튜닝 파라미터 문서', '학습 결과 보고서'],
  },
  {
    num: '03',
    title: '일관성 검증',
    duration: '0.5일',
    desc: '50–100컷 생성 후 디자이너 큐레이션으로 톤 일관성 점수 측정. 95% 미만이면 재학습 후 다시 검증.',
    tags: ['톤 일관성 스코어', '큐레이션된 최종 셋', '운영용 프롬프트 라이브러리'],
  },
] as const;

const PROCESS_STEPS = [
  {
    num: '01',
    title: '디스커버리',
    duration: '1주',
    desc: '브랜드 톤 인터뷰, 레퍼런스 수집, 사용 채널·KPI 정의. 견적과 일정을 확정하는 단계입니다.',
    tags: ['작업 범위서', 'KPI 정의서', '확정 견적'],
  },
  {
    num: '02',
    title: 'LoRA 학습 (선택)',
    duration: '1–2일',
    desc: '브랜드 전용 LoRA 모델 파인튜닝. 100컷 이상 발주거나 시즌 운영 계약 시 권장.',
    tags: ['전용 LoRA 모델', '일관성 테스트 리포트', '학습 데이터 격리 보고서'],
  },
  {
    num: '03',
    title: '1차 시안',
    duration: '2–3일',
    desc: '5–10가지 컨셉 시안 제안. 클라이언트 미팅으로 방향성 확정.',
    tags: ['컨셉 시안 5–10종', '방향성 합의서', '컬러·구도 가이드'],
  },
  {
    num: '04',
    title: '양산·후처리',
    duration: '3–5일',
    desc: '승인된 컨셉 기반 50–100컷 양산. 색보정·합성·디테일 보정으로 광고용 퀄리티 확보.',
    tags: ['최종 컷 셋 (4K)', 'PSD 원본', '채널별 변형', 'EXIF 라이선스 메타'],
  },
  {
    num: '05',
    title: '인계·운영',
    duration: '1일 + 1개월',
    desc: '프롬프트·LoRA·라이선스 문서 일괄 인계. 1개월 무상 마이너 수정 동행.',
    tags: ['프롬프트 라이브러리', 'LoRA 가중치 인계', '라이선스 문서', '운영 매뉴얼'],
  },
] as const;

const COMPARISON_ROWS = [
  {
    label: '납기 (30컷 기준)',
    studio: '2–4주',
    self: '1–2주 (학습 곡선)',
    vf: '5일',
    vfBest: true,
  },
  {
    label: '비용 (30컷 기준)',
    studio: '₩450만원~',
    self: '₩200만원~ (인건비)',
    vf: '₩200만원~',
    vfBest: true,
  },
  {
    label: '브랜드 톤 일관성',
    studio: '★★★ 디렉터 의존',
    self: '★ 매번 어긋남',
    vf: '★★★ LoRA 95%+',
    vfBest: true,
  },
  {
    label: '채널별 규격 변환',
    studio: '각각 별도 작업',
    self: '수동 작업',
    vf: '자동 변환 포함',
    vfBest: true,
  },
  {
    label: '운영 인계',
    studio: '매번 외주 의존',
    self: '내부 자원 부담',
    vf: '프롬프트·LoRA 인계',
    vfBest: true,
  },
] as const;

const CASES = [
  {
    id: 'beauty',
    metric: '+82%',
    metricLabel: '광고 CTR',
    category: '시즌 캠페인 비주얼',
    title: '뷰티 브랜드 K',
    desc: '시즌 캠페인 비주얼 120컷 운영. Brand LoRA 학습 후 4채널 동시 운영 — 네이버·카카오·인스타·구글.',
    image: '/images/ad-visuals/case-beauty.png',
  },
  {
    id: 'fashion',
    metric: '+35%',
    metricLabel: '구매 전환',
    category: '신제품 상세페이지',
    title: 'D2C 패션',
    desc: '신제품 상세페이지 30종 / 10주 운영. 모바일 우선 설계 + 인플루언서 컷 합성으로 전환율 35% 상승.',
    image: '/images/ad-visuals/case-fashion.png',
  },
  {
    id: 'fnb',
    metric: '+45%',
    metricLabel: 'SNS 팔로워',
    category: '브랜드 마스코트 시스템',
    title: 'F&B 브랜드 G',
    desc: '마스코트 1종 + 표정 12종 변형. 캐릭터 일관성 LoRA 학습으로 일관된 브랜드 무드 확보.',
    image: '/images/ad-visuals/case-fnb.png',
  },
] as const;

const FIT_DO = [
  {
    title: '시즌·이벤트마다 캠페인 키 비주얼 필요',
    desc: '분기마다 캠페인을 운영하며 시즌별 키 비주얼이 필요한 마케팅팀.',
  },
  {
    title: '100컷+ 대량 생산 + 톤 일관성 필수',
    desc: 'LoRA 학습으로 95%+ 일관성 보장 — 일반 AI 도구와 가장 큰 차별점.',
  },
  {
    title: '채널별 규격 동시 출력 필요',
    desc: '네이버·카카오·인스타·구글 6채널 한 번에 자동 변환.',
  },
  {
    title: '브랜드 가이드라인 명확 (LoRA 학습 가능)',
    desc: '레퍼런스 30–50장 보유 시 가장 효과적.',
  },
  {
    title: '월 단위 리테이너 운영 적합',
    desc: '월 30컷 / 100컷 / 무제한(전담 1인) 3가지 플랜.',
  },
] as const;

const FIT_DONT = [
  {
    title: '1–3컷 단발성 제작',
    desc: '일반 AI 도구 직접 사용이 더 효율적입니다.',
  },
  {
    title: '인물 사진 + 모델 캐스팅 필수',
    desc: '실존 모델 캐스팅이 필수면 스튜디오 촬영 권장.',
  },
  {
    title: '영상 제작이 핵심',
    desc: '영상 전문 스튜디오 또는 별도 카테고리 권장.',
  },
  {
    title: '의약품·금융 등 광고 표시 규제 매우 엄격',
    desc: '약사법·금융법상 광고 심의 통과 부담이 큰 영역.',
  },
  {
    title: 'AI 사용 법무 검토 미통과',
    desc: '내부에서 AI 광고 이미지 사용이 승인되지 않은 조직.',
  },
] as const;

/* ─── 컴포넌트 ─── */

export function AdVisualsPage() {
  return (
    <>
      {/* 1. Hero */}
      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroBackdrop} />
        <div aria-hidden="true" className={styles.heroGlow1} />
        <div aria-hidden="true" className={styles.heroGlow2} />
        <div aria-hidden="true" className={styles.heroGrid} />

        <div className={styles.heroContentWrap}>
          <div className={styles.heroLayout}>
            {/* 텍스트 */}
            <div className={styles.heroLeft}>
              <span className={styles.heroEyebrow}>
                <span aria-hidden="true" className={styles.heroEyebrowDot} />
                Ad Visuals · AI-powered
              </span>
              <h1 className={styles.heroTitle}>
                클릭을 부르는<br />한 장의 이미지
              </h1>
              <p className={styles.heroSub}>
                제품 컷부터 캠페인 키 비주얼까지 — AI로 빠르게 대량 생산하면서도 브랜드 톤은 일관되게. 채널별 규격은 한 번에, 평균 5일 납기.
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
                  href="#before-after"
                >
                  Before/After 보기 <span aria-hidden="true">↓</span>
                </Link>
                <Link
                  className={`${styles.heroCta} ${styles.heroCtaGhost}`}
                  href={ROUTES.WORK}
                >
                  포트폴리오 보기
                </Link>
              </div>
            </div>

            {/* 6-Cut Grid */}
            <div aria-hidden="true" className={styles.heroGrid6}>
              {HERO_GRID.map((item) => (
                <div className={styles.heroGridItem} key={item.key}>
                  <img
                    alt=""
                    className={styles.heroGridImg}
                    src={`/images/ad-visuals/hero-${item.key}.png`}
                  />
                  <span className={styles.heroGridLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. 서비스 타입 */}
      <section className={styles.services}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Services</span>
            <h2 className={styles.sectionTitle}>어떤 광고 비주얼이 필요하신가요?</h2>
            <p className={styles.sectionSub}>
              4가지 시나리오 중 가장 가까운 것을 선택해 자세히 살펴보세요. 패키지 결합 시 더 효율적입니다.
            </p>
          </header>
          <ul className={styles.servicesGrid} role="list">
            {SERVICES.map((s) => (
              <li className={styles.serviceCard} key={s.id}>
                <Link className={styles.serviceCardLink} href={ROUTES.CONTACT.QUOTE}>
                  <div className={styles.serviceVisual}>
                    <img alt="" aria-hidden="true" className={styles.serviceVisualImg} src={s.image} />
                  </div>
                  <div className={styles.serviceBody}>
                    <div className={styles.serviceTopRow}>
                      <span className={styles.serviceBadge}>{s.badge}</span>
                      <div className={styles.serviceMeta}>
                        <span className={styles.serviceDuration}>{s.duration}</span>
                        <span className={styles.servicePrice}>{s.price}</span>
                      </div>
                    </div>
                    <h3 className={styles.serviceTitle}>{s.title}</h3>
                    <p className={styles.serviceDesc}>{s.desc}</p>
                    <ul className={styles.serviceDeliverables} role="list">
                      {s.deliverables.map((d) => (
                        <li className={styles.serviceDeliverable} key={d}>
                          <svg aria-hidden="true" fill="none" height={12} viewBox="0 0 12 12" width={12}>
                            <path d="M2.5 6L5 8.5L9.5 4" stroke="#004FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                    <span className={styles.serviceLink}>자세히 보기 <span aria-hidden="true">→</span></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 3. Before/After */}
      <section className={styles.beforeAfter} id="before-after">
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Live Comparison Demo</span>
            <h2 className={styles.sectionTitle}>AI로 만든 컷이 광고에 쓸 만한가요? 직접 비교해보세요</h2>
            <p className={styles.sectionSub}>
              슬라이더 핸들을 좌우로 드래그해서 Before(스튜디오 컷) ↔ After(AI 제작) 결과를 직접 비교해보세요.
            </p>
          </header>
          <BeforeAfterSlider />
        </Container>
      </section>

      {/* 4. 채널 자동 변환 */}
      <section className={styles.channels}>
        <div aria-hidden="true" className={styles.channelsBackdrop} />
        <Container>
          <header className={styles.channelsHead}>
            <span className={styles.eyebrowLight}>Channel Variants</span>
            <h2 className={styles.channelsTitle}>한 번 작업, 6개 채널 자동 출력</h2>
            <p className={styles.channelsSub}>
              메인 컷 1장에서 네이버·카카오·인스타·구글까지 — 채널별 디자이너 6명을 따로 쓰던 비용을 한 팀에서 한 번에 처리합니다.
            </p>
          </header>

          <div className={styles.channelsLayout}>
            {/* Master */}
            <div className={styles.channelsMaster}>
              <span className={styles.channelsMasterBadge}>MASTER · 4K 원본</span>
              <div className={styles.channelsMasterImg}>
                <img alt="" aria-hidden="true" className={styles.channelsMasterImgEl} src="/images/ad-visuals/channel-master.png" />
              </div>
            </div>

            {/* Arrow */}
            <div aria-hidden="true" className={styles.channelsArrow}>
              <svg fill="none" height={32} viewBox="0 0 32 32" width={32}>
                <path d="M6 16h20M20 10l6 6-6 6" stroke="rgba(255,255,255,0.4)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span className={styles.channelsArrowLabel}>6채널 자동 변환</span>
              <span className={styles.channelsArrowSub}>Edge Function 자동 처리</span>
            </div>

            {/* Channels */}
            <div className={styles.channelsGrid}>
              {CHANNELS.map((ch) => (
                <div className={styles.channelItem} key={ch.label}>
                  <div className={styles.channelThumb} style={{ borderColor: ch.color }}>
                    <img alt="" aria-hidden="true" className={styles.channelThumbImg} src={`/images/ad-visuals/channel-${ch.label.replace(/[^a-z가-힣]/gi, '-').toLowerCase()}.png`} />
                  </div>
                  <span className={styles.channelLabel}>{ch.label}</span>
                  <span className={styles.channelSize}>{ch.size}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 5. Brand Tone Workflow */}
      <section className={styles.toneWorkflow}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Brand Tone Workflow</span>
            <h2 className={styles.sectionTitle}>100컷 안에서 톤이 어긋나지 않는 비결</h2>
            <p className={styles.sectionSub}>
              일반 AI 도구로 100컷 만들면 70% 이상이 톤이 어긋납니다. 우리는 LoRA 파인튜닝으로 95%+ 일관성을 유지합니다.
            </p>
          </header>
          <div className={styles.toneSteps}>
            {TONE_STEPS.map((step, i) => (
              <div className={styles.toneStep} key={step.num}>
                <div className={styles.toneStepNum}>{step.num}</div>
                {i < TONE_STEPS.length - 1 && (
                  <div aria-hidden="true" className={styles.toneStepArrow}>
                    <svg fill="none" height={20} viewBox="0 0 20 20" width={20}>
                      <path d="M4 10h12M12 6l4 4-4 4" stroke="var(--color-border)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </div>
                )}
                <h3 className={styles.toneStepTitle}>{step.title}</h3>
                {step.duration && <span className={styles.toneStepDur}>{step.duration}</span>}
                <p className={styles.toneStepDesc}>{step.desc}</p>
                <div className={styles.toneStepTags}>
                  {step.tags.map((tag) => (
                    <span className={styles.toneStepTag} key={tag}>
                      <span aria-hidden="true">✓</span> {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. 프로세스 */}
      <section className={styles.process}>
        <Container>
          <header className={styles.processHead}>
            <span className={styles.eyebrow}>Process</span>
            <h2 className={styles.processTitle}>의뢰부터 인계까지 5단계</h2>
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
                    {p.duration && <span className={styles.processDur}>{p.duration}</span>}
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

      {/* 7. 비교표 */}
      <section className={styles.comparison}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Comparison</span>
            <h2 className={styles.sectionTitle}>같은 30컷, 어떻게 다를까요?</h2>
            <p className={styles.sectionSub}>
              스튜디오 촬영, 자체 AI 도구 운영, VisionFlow를 비용·납기·품질 기준으로 직접 비교했습니다.
            </p>
          </header>

          <div className={styles.compTable}>
            <div className={styles.compHeader}>
              <div className={styles.compLabelCol} />
              <div className={styles.compCol}>
                <span className={styles.compColName}>일반 스튜디오</span>
                <span className={styles.compColSub}>전통 방식</span>
              </div>
              <div className={styles.compCol}>
                <span className={styles.compColName}>자체 AI 도구</span>
                <span className={styles.compColSub}>사내 운영</span>
              </div>
              <div className={`${styles.compCol} ${styles.compColVf}`}>
                <span className={styles.compColName}>VisionFlow</span>
                <span className={styles.compColBadge}>추천</span>
              </div>
            </div>

            {COMPARISON_ROWS.map((row) => (
              <div className={styles.compRow} key={row.label}>
                <div className={styles.compLabelCol}>{row.label}</div>
                <div className={styles.compCol}>{row.studio}</div>
                <div className={styles.compCol}>{row.self}</div>
                <div className={`${styles.compCol} ${styles.compColVf} ${styles.compColVfBest}`}>
                  {row.vf}
                </div>
              </div>
            ))}
          </div>

          <p className={styles.compNote}>
            ※ 일반 스튜디오 비용은 제품 30컷 + 모델·로케이션·후보정 포함 기준 추정치입니다. 자체 AI 도구는 사내 디자이너 1인 + 모델 라이선스 기준.
          </p>
        </Container>
      </section>

      {/* 8. 케이스 */}
      <section className={styles.cases}>
        <Container>
          <div className={styles.casesHeadRow}>
            <header className={styles.casesHead}>
              <span className={styles.eyebrow}>Featured Cases</span>
              <h2 className={styles.casesTitle}>결과로 증명한 광고 이미지</h2>
              <p className={styles.casesSub}>
                광고 CTR · 구매 전환 · SNS 팔로워를 실제로 움직인 3개 케이스. 광고 이미지 카테고리 누적 케이스 50건+.
              </p>
            </header>
            <Link className={styles.casesSeeAll} href={ROUTES.WORK}>
              50개+ 전체 케이스 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className={styles.casesGrid} role="list">
            {CASES.map((c) => (
              <li className={styles.casesCard} key={c.id}>
                <div className={styles.casesImage}>
                  <img alt="" aria-hidden="true" className={styles.casesImg} src={c.image} />
                </div>
                <div className={styles.casesBody}>
                  <span className={styles.casesCat}>{c.category}</span>
                  <div className={styles.casesMetricRow}>
                    <strong className={styles.casesMetricValue}>{c.metric}</strong>
                    <span className={styles.casesMetricLabel}>{c.metricLabel}</span>
                  </div>
                  <h3 className={styles.casesCardTitle}>{c.title}</h3>
                  <p className={styles.casesDesc}>{c.desc}</p>
                  <span className={styles.casesLink}>케이스 자세히 보기 <span aria-hidden="true">→</span></span>
                </div>
              </li>
            ))}
          </ul>
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
              {FIT_DO.map((item) => (
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
              {FIT_DONT.map((item) => (
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

      {/* 10. FAQ */}
      <section className={styles.faq} id="faq">
        <Container>
          <header className={styles.faqHead}>
            <span className={styles.eyebrow}>FAQ</span>
            <h2 className={styles.faqTitle}>자주 받는 질문</h2>
            <p className={styles.faqSub}>
              저작권·라이선스·인물 합성·운영 인계까지 — 광고 의사결정에 필요한 핵심 8개 질문.
            </p>
          </header>
          <AdVisualsFaqAccordion />
        </Container>
      </section>

      {/* 11. CTA */}
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
            <h2 className={styles.ctaTitle}>이번 캠페인,<br />100컷부터 시작해보세요</h2>
            <p className={styles.ctaSub}>
              레퍼런스 5장만 보내주세요. 1영업일 안에 시안 방향과 견적을 회신 드립니다.
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
            <ul className={styles.ctaBadges} role="list">
              {['1영업일 응답', '무료 진단', 'NDA 사전 가능'].map((b) => (
                <li className={styles.ctaBadge} key={b}>
                  <svg aria-hidden="true" fill="none" height={12} viewBox="0 0 12 12" width={12}>
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="#004FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
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
