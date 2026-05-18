'use client';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Container } from '@/components/common/container';

import styles from './work-page.module.css';

const heroStats = [
  { label: '17+ 프로젝트 이력' },
  { label: '금융 · 통신 · 커머스 경험' },
  { label: 'React · Vue 중심 개발' },
  { label: 'UI/UX · 퍼블리싱 · 운영' },
];

interface FeaturedCase {
  category: string;
  year: string;
  title: string;
  client: string;
  metric: string;
  size: 'large' | 'small';
  image?: ProjectImage;
}

interface ProjectImage {
  src?: string;
  theme?: string;
}

type ProjectImageStyle = CSSProperties & {
  '--project-image-theme': string;
};

const projectImageThemes = [
  'linear-gradient(135deg, #e8f4ff 0%, #bfe5ff 45%, #f8fbff 100%)',
  'linear-gradient(135deg, #edf7f2 0%, #bfe3cf 48%, #fff7df 100%)',
  'linear-gradient(135deg, #f4efff 0%, #d7c7ff 46%, #edf7ff 100%)',
  'linear-gradient(135deg, #fff1eb 0%, #ffc9b8 48%, #eef6ff 100%)',
  'linear-gradient(135deg, #fff8e5 0%, #f3d28a 48%, #eef7ff 100%)',
  'linear-gradient(135deg, #e8fbf8 0%, #8ed8d0 50%, #f7f5ff 100%)',
  'linear-gradient(135deg, #eef1ff 0%, #aebeff 52%, #fff7ed 100%)',
  'linear-gradient(135deg, #f3f6f8 0%, #c9d4df 50%, #eaf7f2 100%)',
];

function getProjectImageTheme(seed: string) {
  const index = Array.from(seed).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );

  return projectImageThemes[index % projectImageThemes.length]!;
}

const featuredCases: FeaturedCase[] = [
  {
    category: 'React UI/UX',
    year: '최근',
    title: '진에어 크루포탈\n내부 시스템 개발',
    client: '크루포탈 6개 프로젝트 · 반응형 및 Web 화면',
    metric: 'Codex 활용 UI/UX 공통화 및 API 연동',
    size: 'large',
  },
  {
    category: '금융 웹접근성',
    year: '최근',
    title: '신한은행 마이데이터 · Family · 외환',
    client: 'Vue3, Legacy HTML, SCSS 기반 퍼블리싱',
    metric: '웹접근성 및 화면 구축 담당',
    size: 'small',
  },
  {
    category: 'AI 이벤트 운영',
    year: '최근',
    title: 'LG라이프케어 운영 · 마이크로 사이트',
    client: 'React, Next.js, Tailwind, shadcn 기반',
    metric: 'UI/UX 및 프런트 개발',
    size: 'small',
  },
];

const INITIAL_VISIBLE_CASES = 6;
const LOAD_MORE_SIZE = 4;

type FilterLabel = '분야' | '산업' | '역할';
type Filters = Record<FilterLabel, string>;

const filterGroups: { label: FilterLabel; options: string[] }[] = [
  {
    label: '분야',
    options: ['전체', 'React', 'Vue', '퍼블리싱', '운영', '웹접근성'],
  },
  {
    label: '산업',
    options: [
      '전체',
      '항공',
      '금융',
      '통신',
      '커머스',
      '교육',
      '전자',
    ],
  },
  {
    label: '역할',
    options: ['전체', '프런트 개발', 'UI/UX', '퍼블리싱', '스크립트'],
  },
];

interface CaseItem {
  category: string;
  industry: string;
  roles: string[];
  title: string;
  size: 'tall' | 'short';
  image?: ProjectImage;
}

const allCases: CaseItem[] = [
  {
    category: 'React',
    industry: '항공',
    roles: ['프런트 개발', 'UI/UX'],
    title: '진에어 크루포탈 UI/UX 공통 및 API 연동 개발',
    size: 'tall',
  },
  {
    category: 'Vue3',
    industry: '금융',
    roles: ['퍼블리싱', '웹접근성'],
    title: '신한은행 마이데이터 · Family · 외환 퍼블리싱',
    size: 'short',
  },
  {
    category: 'Next.js',
    industry: '커머스',
    roles: ['프런트 개발', '운영', 'UI/UX'],
    title: 'LG라이프케어 운영 및 AI 이벤트 테스트',
    size: 'tall',
  },
  {
    category: 'Vue/Nuxt',
    industry: '통신',
    roles: ['프런트 개발', '운영'],
    title: 'LG Uplus · 알닷 · 내부 CRM 개선 프로젝트',
    size: 'tall',
  },
  {
    category: 'React',
    industry: '전자',
    roles: ['퍼블리싱', '스크립트'],
    title: 'SK렌터카 모바일 React 화면 퍼블리싱',
    size: 'short',
  },
  {
    category: 'Vue',
    industry: '금융',
    roles: ['프런트 개발', '퍼블리싱'],
    title: '키움저축은행 기간계 시스템 Element UI 구축',
    size: 'short',
  },
  {
    category: '퍼블리싱',
    industry: '커머스',
    roles: ['퍼블리싱'],
    title: '몰리스몰 HTML 어드민 퍼블리싱',
    size: 'short',
  },
  {
    category: 'Vuetify',
    industry: '금융',
    roles: ['프런트 개발', '퍼블리싱'],
    title: '삼성카드 모바일 Vue 퍼블리싱',
    size: 'tall',
  },
  {
    category: 'WebSquare',
    industry: '교육',
    roles: ['퍼블리싱', '스크립트'],
    title: '인천재능대학교 학생관리 시스템 퍼블리싱',
    size: 'tall',
  },
  {
    category: '운영',
    industry: '커머스',
    roles: ['운영', '스크립트'],
    title: '11번가 유지보수 및 모바일 사이트 운영',
    size: 'short',
  },
  {
    category: '웹접근성',
    industry: '금융',
    roles: ['웹접근성', '퍼블리싱'],
    title: '금융 서비스 웹접근성 개선 및 화면 표준화',
    size: 'short',
  },
  {
    category: 'React',
    industry: '교육',
    roles: ['UI/UX', '프런트 개발'],
    title: '교육 플랫폼 관리자 화면 UX 개선',
    size: 'tall',
  },
];

const stats = [
  { value: '17+', label: '프로젝트 이력' },
  { value: '7+', label: '산업 도메인' },
  { value: 'React/Vue', label: '주요 프레임워크' },
  { value: 'UI/UX', label: '핵심 역량' },
];

const STAT_ROLL_DURATION = 2800;
const STAT_ROLL_STAGGER = 120;

const easeOutQuint = (progress: number) =>
  1 - Math.pow(1 - progress, 5);

const getStatRollItems = (stat: (typeof stats)[number]) => {
  if (stat.label === '프로젝트 이력') {
    return [
      '0+',
      '4+',
      '12+',
      '6+',
      '15+',
      '9+',
      '3+',
      '16+',
      '7+',
      '14+',
      '11+',
      '5+',
      '18+',
      stat.value,
    ];
  }

  if (stat.label === '산업 도메인') {
    return [
      '0+',
      '3+',
      '6+',
      '1+',
      '5+',
      '8+',
      '2+',
      '4+',
      '9+',
      '6+',
      '3+',
      '8+',
      '5+',
      stat.value,
    ];
  }

  if (stat.label === '주요 프레임워크') {
    return [
      '-',
      'HTML/CSS',
      'Next.js',
      'Vue',
      'TypeScript',
      'Nuxt',
      'React',
      'WebSquare',
      'SCSS',
      'Tailwind',
      'JavaScript',
      'shadcn',
      'Frontend',
      stat.value,
    ];
  }

  return [
    '-',
    '운영',
    '접근성',
    '퍼블리싱',
    'UX',
    '기획',
    'UI',
    '운영',
    '접근성',
    '개선',
    '설계',
    '구축',
    '테스트',
    stat.value,
  ];
};

function ProjectImageVisual({
  category,
  image,
  title,
}: {
  category: string;
  image?: ProjectImage;
  title: string;
}) {
  const imageTheme =
    image?.theme ?? getProjectImageTheme(`${category}-${title}`);

  if (image?.src) {
    return (
      <img
        alt={title.replace(/\n/g, ' ')}
        className={styles.projectImage}
        src={image.src}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={styles.dummyImage}
      style={{ '--project-image-theme': imageTheme } as ProjectImageStyle}
    >
      <span className={styles.dummyPanel} />
      <span className={styles.dummyPanelAlt} />
      <span className={styles.dummyAccent} />
      <span className={styles.imagePlaceholder}>{category}</span>
    </div>
  );
}

function FeaturedCard({
  data,
  size,
}: {
  data: FeaturedCase;
  size: 'large' | 'small';
}) {
  const isLarge = size === 'large';
  return (
    <article
      className={`${styles.featuredCard} ${isLarge ? styles.featuredCardLarge : ''}`}
    >
      <div
        className={`${styles.featuredImage} ${isLarge ? styles.featuredImageLarge : ''}`}
      >
        <ProjectImageVisual
          category={data.category}
          image={data.image}
          title={data.title}
        />
        <span className={styles.featuredBadge}>
          <span aria-hidden="true">★</span> Featured
        </span>
      </div>
      <div className={styles.featuredBody}>
        <div className={styles.featuredMeta}>
          <span className={styles.categoryChip}>{data.category}</span>
          <span className={styles.yearText}>{data.year}</span>
        </div>
        <h3
          className={`${styles.featuredTitle} ${isLarge ? styles.featuredTitleLarge : ''}`}
        >
          {isLarge
            ? data.title.split('\n').map((line) => (
                <span className={styles.featuredTitleLine} key={line}>
                  {line}
                </span>
              ))
            : data.title}
        </h3>
        <p className={styles.featuredClient}>{data.client}</p>
        <div className={styles.metricRow}>
          <span aria-hidden="true" className={styles.metricArrow}>
            ↗
          </span>
          <span className={styles.metricText}>{data.metric}</span>
        </div>
      </div>
    </article>
  );
}

function CaseCard({ data }: { data: CaseItem }) {
  return (
    <article
      className={`${styles.caseCard} ${data.size === 'tall' ? styles.caseCardTall : ''}`}
    >
      <div className={styles.caseImage}>
        <ProjectImageVisual
          category={data.category}
          image={data.image}
          title={data.title}
        />
      </div>
      <div className={styles.caseBody}>
        <div className={styles.caseMeta}>
          <span className={styles.categoryChipSm}>
            {data.category}
          </span>
          <span className={styles.yearTextSm}>{data.industry}</span>
        </div>
        <h3 className={styles.caseTitle}>{data.title}</h3>
      </div>
    </article>
  );
}

export function WorkPage() {
  const [featuredLarge, ...featuredSmall] = featuredCases;
  const statsRef = useRef<HTMLElement | null>(null);
  const statRollRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [filters, setFilters] = useState<Filters>({
    분야: '전체',
    산업: '전체',
    역할: '전체',
  });
  const [visibleCount, setVisibleCount] = useState(
    INITIAL_VISIBLE_CASES,
  );
  const [statsAnimated, setStatsAnimated] = useState(false);

  const filteredCases = useMemo(
    () =>
      allCases.filter((item) => {
        const matchesField =
          filters.분야 === '전체' ||
          item.category === filters.분야 ||
          item.roles.includes(filters.분야);
        const matchesIndustry =
          filters.산업 === '전체' || item.industry === filters.산업;
        const matchesRole =
          filters.역할 === '전체' ||
          item.roles.includes(filters.역할);

        return matchesField && matchesIndustry && matchesRole;
      }),
    [filters],
  );

  const visibleCases = filteredCases.slice(0, visibleCount);
  const hasMoreCases = visibleCount < filteredCases.length;

  useEffect(() => {
    const target = statsRef.current;
    if (!target || statsAnimated) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setStatsAnimated(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [statsAnimated]);

  useEffect(() => {
    if (!statsAnimated) {
      return;
    }

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const rolls = statRollRefs.current.filter(
      (roll): roll is HTMLSpanElement => Boolean(roll),
    );
    const rollMeta = rolls.map((roll, index) => {
      const slotHeight =
        roll.firstElementChild?.getBoundingClientRect().height ?? 0;
      const finalIndex = Math.max(roll.children.length - 1, 0);

      return {
        delay: index * STAT_ROLL_STAGGER,
        finalY: -slotHeight * finalIndex,
        roll,
        slotHeight,
      };
    });

    if (reduceMotion) {
      rollMeta.forEach(({ finalY, roll }) => {
        roll.style.transform = `translate3d(0, ${finalY}px, 0)`;
      });
      return;
    }

    let animationFrame = 0;
    let animationStart: number | null = null;

    const animateStats = (time: number) => {
      animationStart ??= time;

      let shouldContinue = false;

      rollMeta.forEach(({ delay, finalY, roll, slotHeight }) => {
        const elapsed = time - animationStart! - delay;

        if (elapsed < 0) {
          roll.style.transform = 'translate3d(0, 0, 0)';
          shouldContinue = true;
          return;
        }

        const progress = Math.min(elapsed / STAT_ROLL_DURATION, 1);
        const easedProgress = easeOutQuint(progress);
        const settleProgress = Math.max((progress - 0.72) / 0.28, 0);
        const overshoot =
          -slotHeight *
          0.16 *
          Math.sin(settleProgress * Math.PI) *
          (1 - settleProgress);
        const y = finalY * easedProgress + overshoot;

        roll.style.transform = `translate3d(0, ${y}px, 0)`;

        if (progress < 1) {
          shouldContinue = true;
        } else {
          roll.style.transform = `translate3d(0, ${finalY}px, 0)`;
        }
      });

      if (shouldContinue) {
        animationFrame = requestAnimationFrame(animateStats);
      }
    };

    animationFrame = requestAnimationFrame(animateStats);

    return () => cancelAnimationFrame(animationFrame);
  }, [statsAnimated]);

  const handleFilterChange = (label: FilterLabel, value: string) => {
    setFilters((current) => ({ ...current, [label]: value }));
    setVisibleCount(INITIAL_VISIBLE_CASES);
  };

  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroHead}>
            <span className={styles.eyebrow}>Work Portfolio</span>
            <h1 className={styles.heroTitle}>
              프런트엔드 실무 프로젝트
            </h1>
            <p className={styles.heroSub}>
              금융, 항공, 통신, 커머스, 교육 도메인에서 화면 구축부터
              운영 개선까지 수행한 이력입니다.
              <br />
              React, Vue, Next.js, WebSquare, 레거시 HTML 환경을
              넘나들며 UI 완성도와 구현 안정성을 맞춰왔습니다.
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
            <h2 className={styles.sectionTitle}>대표 프로젝트</h2>
            <p className={styles.sectionSub}>
              프로필 문서의 최신 경력 중 화면 구현 역량이 잘 드러나는
              사례를 선별했습니다.
            </p>
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
                  {g.options.map((opt) => (
                    <button
                      aria-pressed={filters[g.label] === opt}
                      className={`${styles.filterChip} ${filters[g.label] === opt ? styles.filterChipActive : ''}`}
                      key={opt}
                      onClick={() => handleFilterChange(g.label, opt)}
                      type="button"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {g.label === '역할' ? (
                  <span className={styles.filterTotal}>
                    총 <strong>{filteredCases.length}개</strong> 주요
                    사례
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className={styles.allCases}>
        <Container>
          {visibleCases.length > 0 ? (
            <div className={styles.allGrid}>
              {visibleCases.map((c, i) => (
                <CaseCard data={c} key={`${c.title}-${i}`} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <strong>조건에 맞는 이력이 없습니다.</strong>
              <span>
                필터를 조정하면 다른 프로젝트 사례를 볼 수 있습니다.
              </span>
            </div>
          )}
          {hasMoreCases ? (
            <div className={styles.loadMoreWrap}>
              <button
                className={styles.loadMore}
                onClick={() =>
                  setVisibleCount((count) => count + LOAD_MORE_SIZE)
                }
                type="button"
              >
                더 많은 이력 보기 <span aria-hidden="true">↓</span>
              </button>
            </div>
          ) : null}
        </Container>
      </section>

      <section className={styles.statsStrip} ref={statsRef}>
        <Container>
          <ul className={styles.statsList}>
            {stats.map((s, index) => {
              const rollItems = getStatRollItems(s);

              return (
                <li className={styles.statItem} key={s.label}>
                  <span className={styles.statValue}>
                    <span
                      className={styles.statRoll}
                      aria-hidden="true"
                      ref={(node) => {
                        statRollRefs.current[index] = node;
                      }}
                    >
                      {rollItems.map((item, index) => (
                        <span
                          className={styles.statRollItem}
                          key={`${s.label}-${item}-${index}`}
                        >
                          {item}
                        </span>
                      ))}
                    </span>
                    <span className={styles.statValueSr}>
                      {s.value}
                    </span>
                  </span>
                  <span className={styles.statLabel}>{s.label}</span>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <section className={styles.ctaFooter}>
        <Container>
          <div className={styles.ctaBanner}>
            <div className={styles.ctaText}>
              <h2 className={styles.ctaTitle}>
                프로젝트에 맞는
                <br />
                프런트엔드 실행력
              </h2>
              <p className={styles.ctaSub}>
                신규 구축, 운영 개선, 레거시 전환, 웹접근성 대응까지
                필요한 단계에 맞춰 화면을 설계하고 구현합니다.
              </p>
            </div>
            <Link className={styles.ctaButton} href={ROUTES.CONTACT}>
              프로젝트 문의하기
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
