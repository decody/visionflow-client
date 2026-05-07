import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from './work-page.module.css';

const heroStats = [
  { label: '120+ 프로젝트' },
  { label: '80+ 클라이언트' },
  { label: '5개 산업군' },
  { label: '재의뢰율 65%' },
];

interface FeaturedCase {
  category: string;
  year: string;
  title: string;
  client: string;
  metric: string;
  size: 'large' | 'small';
}

const featuredCases: FeaturedCase[] = [
  {
    category: '웹 3D',
    year: '2026',
    title: 'Nordic Furniture\n3D Configurator',
    client: 'Nordic Furniture · 12주',
    metric: '전환율 +47%',
    size: 'large',
  },
  {
    category: '웹/앱 개발',
    year: '2026',
    title: '핀테크 모바일 앱 리뉴얼',
    client: 'Acme Capital · 8주',
    metric: 'DAU +112%',
    size: 'small',
  },
  {
    category: '대시보드',
    year: '2025',
    title: 'BI 대시보드 통합',
    client: '익명 (리테일) · 10주',
    metric: '운영시간 −38%',
    size: 'small',
  },
];

const filterGroups = [
  {
    label: '카테고리',
    options: ['전체', '웹 3D', '광고 이미지', '웹/앱 개발', '데이터 대시보드'],
  },
  {
    label: '산업',
    options: ['전체', '리테일', 'F&B', '패션', '테크', '미디어'],
  },
  {
    label: '연도',
    options: ['전체', '2026', '2025', '2024'],
  },
];

interface CaseItem {
  category: string;
  year: string;
  title: string;
  size: 'tall' | 'short';
}

const allCases: CaseItem[] = [
  { category: '광고 이미지', year: '2026', title: '시즌 캠페인 키비주얼 50컷', size: 'tall' },
  { category: '웹 3D', year: '2026', title: 'AR 가구 미리보기 PWA', size: 'tall' },
  { category: '웹/앱 개발', year: '2025', title: '뷰티 브랜드 이커머스 리뉴얼', size: 'short' },
  { category: '광고 이미지', year: '2026', title: 'AI 제품 컷 100장', size: 'short' },
  { category: '대시보드', year: '2025', title: '실시간 매출 모니터링', size: 'short' },
  { category: '대시보드', year: '2025', title: '운영 어드민 통합', size: 'tall' },
  { category: '웹 3D', year: '2025', title: '주얼리 360° 뷰어', size: 'tall' },
  { category: '웹/앱 개발', year: '2024', title: '예약 시스템 SaaS', size: 'short' },
  { category: '웹/앱 개발', year: '2024', title: '핀테크 온보딩 플로우', size: 'tall' },
  { category: '광고 이미지', year: '2024', title: '스타트업 브랜딩 패키지', size: 'short' },
];

const stats = [
  { value: '120+', label: '완료한 프로젝트' },
  { value: '80+', label: '클라이언트' },
  { value: '5일', label: '평균 첫 시안' },
  { value: '65%', label: '재의뢰율' },
];

function FeaturedCard({ data, size }: { data: FeaturedCase; size: 'large' | 'small' }) {
  const isLarge = size === 'large';
  return (
    <article className={`${styles.featuredCard} ${isLarge ? styles.featuredCardLarge : ''}`}>
      <div className={`${styles.featuredImage} ${isLarge ? styles.featuredImageLarge : ''}`}>
        <span className={styles.featuredBadge}>
          <span aria-hidden="true">✨</span> Featured
        </span>
        <span aria-hidden="true" className={styles.imagePlaceholder}>
          Image
        </span>
      </div>
      <div className={styles.featuredBody}>
        <div className={styles.featuredMeta}>
          <span className={styles.categoryChip}>{data.category}</span>
          <span className={styles.yearText}>{data.year}</span>
        </div>
        <h3 className={`${styles.featuredTitle} ${isLarge ? styles.featuredTitleLarge : ''}`}>
          {isLarge
            ? data.title.split('\n').map((line, i) => (
                <span className={styles.featuredTitleLine} key={i}>
                  {line}
                </span>
              ))
            : data.title}
        </h3>
        <p className={styles.featuredClient}>{data.client}</p>
        <div className={styles.metricRow}>
          <span aria-hidden="true" className={styles.metricArrow}>
            ▲
          </span>
          <span className={styles.metricText}>{data.metric}</span>
        </div>
      </div>
    </article>
  );
}

function CaseCard({ data }: { data: CaseItem }) {
  return (
    <article className={`${styles.caseCard} ${data.size === 'tall' ? styles.caseCardTall : ''}`}>
      <div className={styles.caseImage}>
        <span aria-hidden="true" className={styles.imagePlaceholder}>
          Image
        </span>
      </div>
      <div className={styles.caseBody}>
        <div className={styles.caseMeta}>
          <span className={styles.categoryChipSm}>{data.category}</span>
          <span className={styles.yearTextSm}>{data.year}</span>
        </div>
        <h3 className={styles.caseTitle}>{data.title}</h3>
      </div>
    </article>
  );
}

export function WorkPage() {
  const [featuredLarge, ...featuredSmall] = featuredCases;
  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroHead}>
            <span className={styles.eyebrow}>Our Work</span>
            <h1 className={styles.heroTitle}>우리가 만든 결과들</h1>
            <p className={styles.heroSub}>
              120+ 프로젝트를 통해 검증된 역량.
              <br />
              각 케이스는 고객이 마주한 문제와 우리가 만든 해결 방식을 담고 있습니다.
            </p>
            <ul className={styles.heroStats}>
              {heroStats.map((s) => (
                <li className={styles.heroStatChip} key={s.label}>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className={styles.featured}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Featured</span>
            <h2 className={styles.sectionTitle}>주목할 만한 케이스</h2>
            <p className={styles.sectionSub}>가장 자랑할 만한 4개 프로젝트를 선별했습니다.</p>
          </header>
          <div className={styles.featuredGrid}>
            <div className={styles.featuredColLarge}>
              <FeaturedCard data={featuredLarge!} size="large" />
            </div>
            <div className={styles.featuredColSmall}>
              {featuredSmall.map((c) => (
                <FeaturedCard data={c} key={c.title} size="small" />
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.filter}>
        <Container>
          <div className={styles.filterRows}>
            {filterGroups.map((g) => (
              <div className={styles.filterRow} key={g.label}>
                <span className={styles.filterLabel}>{g.label}</span>
                <div className={styles.filterChips}>
                  {g.options.map((opt, i) => (
                    <button
                      className={`${styles.filterChip} ${i === 0 ? styles.filterChipActive : ''}`}
                      key={opt}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {g.label === '연도' ? (
                  <span className={styles.filterTotal}>
                    총 <strong>124개</strong> 케이스
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className={styles.allCases}>
        <Container>
          <div className={styles.allGrid}>
            {allCases.map((c, i) => (
              <CaseCard data={c} key={`${c.title}-${i}`} />
            ))}
          </div>
          <div className={styles.loadMoreWrap}>
            <button className={styles.loadMore} type="button">
              더 불러오기 <span aria-hidden="true">↓</span>
            </button>
          </div>
        </Container>
      </section>

      <section className={styles.statsStrip}>
        <Container>
          <ul className={styles.statsList}>
            {stats.map((s) => (
              <li className={styles.statItem} key={s.label}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.ctaFooter}>
        <Container>
          <div className={styles.ctaBanner}>
            <div className={styles.ctaText}>
              <h2 className={styles.ctaTitle}>
                당신의 꿈을
                <br />
                현실로 만드세요!
              </h2>
              <p className={styles.ctaSub}>
                전문가와 함께 당신의 아이디어를 실현해 보세요. 맞춤형 솔루션을 제공합니다.
              </p>
            </div>
            <Link className={styles.ctaButton} href={ROUTES.CONTACT}>
              프로젝트 의뢰하기
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
