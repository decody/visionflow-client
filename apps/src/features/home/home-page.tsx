'use client';

import { ROUTES } from '@visionflow/routes';
import type { WorkRow } from '@visionflow/shared';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Container } from '@/components/common/container';

import { FaqPage } from '@/components/common/faq/page';
import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import { useWorkListQuery } from '@/hooks/works/useWorkQuery';
import styles from './home-page.module.css';

const heroChips = [
  {
    label: 'Web 3D',
    color: '#8c4dd9',
    rotate: 2,
    top: 560,
    left: 158.92,
  },
  {
    label: 'Ad Visuals',
    color: '#f26659',
    rotate: -1,
    top: 598,
    left: 380,
  },
  {
    label: 'Web & App',
    color: '#338cff',
    rotate: 1,
    top: 600,
    left: 879,
  },
  {
    label: 'Dashboard',
    color: '#33c78c',
    rotate: -2,
    top: 566,
    left: 1100,
  },
];

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
          <span
            className={`${styles.visualDot} ${styles.visualDotA}`}
          />
          <span
            className={`${styles.visualDot} ${styles.visualDotB}`}
          />
          <span
            className={`${styles.visualDot} ${styles.visualDotC}`}
          />
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
                <svg
                  className={styles.sparkleSvg}
                  viewBox="0 0 48 48"
                >
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
                <span>+47%</span>
                <span>+18%</span>
                <span>+31%</span>
                <span>+43%</span>
                <span>+47%</span>
                <span>+18%</span>
                <span>+31%</span>
                <span>+43%</span>
                <span>+47%</span>
                <span>+18%</span>
                <span>+31%</span>
                <span>+43%</span>
                <span>+47%</span>
                <span>+18%</span>
                <span>+31%</span>
                <span>+43%</span>
                <span>+47%</span>
              </span>
            </strong>
          </div>
          <div
            className={`${styles.kpiCard} ${styles.kpiCardBottom}`}
          >
            <span />
            <strong className={styles.kpiRoll} aria-label="12.4K">
              <span className={styles.kpiRollTrack}>
                <span>12.4K</span>
                <span>3.8K</span>
                <span>7.2K</span>
                <span>10.6K</span>
                <span>12.4K</span>
                <span>3.8K</span>
                <span>7.2K</span>
                <span>10.6K</span>
                <span>12.4K</span>
                <span>3.8K</span>
                <span>7.2K</span>
                <span>10.6K</span>
                <span>12.4K</span>
                <span>3.8K</span>
                <span>7.2K</span>
                <span>10.6K</span>
                <span>12.4K</span>
              </span>
            </strong>
          </div>
        </div>
      );
  }
};

const whyCards = [
  {
    no: '01',
    title: 'End-to-End 풀스택',
    desc: '기획·디자인·AI 제작·웹 개발·운영까지. 한 팀이 책임지니 외주 단계마다 발생하던 커뮤니케이션 손실이 사라집니다.',
    eyebrow: 'ONE TEAM',
    sub: '커뮤니케이션 손실 0회',
    icon: 'flow',
  },
  {
    no: '02',
    title: 'Korean Market Fit',
    desc: '국내 마케팅·이커머스·교육 도메인에 대한 깊은 이해. 토스·카카오페이·네이버 SEO까지 현장에서 통하는 결과물을 만듭니다.',
    eyebrow: 'KR-FIRST',
    sub: '국내 도메인 깊은 이해',
    icon: 'kr',
  },
  {
    no: '03',
    title: 'AI 도구 + 사람 디렉션',
    desc: 'AI는 빠른 생산을 위한 도구. 디자이너와 개발자가 디렉션하고, 결과물의 최종 책임은 우리 팀이 집니다.',
    eyebrow: 'AI + HUMAN',
    sub: '결과물의 책임은 사람이',
    icon: 'ai',
  },
];

interface FeaturedWork {
  category: string;
  year: string;
  title: string;
  desc: string;
  metric: string;
  gradient: string;
  badge: string;
  image?: string | null;
}

type HomeStat = {
  value: string;
  label: string;
  sub: string;
};

type FeaturedImageStyle = CSSProperties & {
  backgroundImage: string;
};

const DEFAULT_WORK_CATEGORY = 'Frontend';
const DEFAULT_WORK_INDUSTRY = '기타';
const DEFAULT_WORK_ROLE = '프론트엔드 개발';
const STAT_ROLL_DURATION = 2800;
const STAT_ROLL_STAGGER = 120;

const featuredGradients = [
  'linear-gradient(162deg, #8c6bd9 0%, #4d338c 73%)',
  'linear-gradient(162deg, #f28ca6 0%, #d94d73 73%)',
  'linear-gradient(162deg, #4dbfa6 0%, #1a668c 73%)',
  'linear-gradient(162deg, #263359 0%, #0d142e 73%)',
];

const staticWorkStats: HomeStat[] = [
  {
    value: 'React/Vue',
    label: '주요 프레임워크',
    sub: '등록된 Work 기준',
  },
  {
    value: 'UI/UX',
    label: '수행 역량',
    sub: '기획부터 구현까지',
  },
];

const getWorkCategory = (work: WorkRow) =>
  work.category.trim() || DEFAULT_WORK_CATEGORY;

const getWorkIndustry = (work: WorkRow) =>
  work.industry.trim() || DEFAULT_WORK_INDUSTRY;

const getWorkRoles = (work: WorkRow) =>
  work.roles.length > 0 ? work.roles : [DEFAULT_WORK_ROLE];

const createWorkSummary = (work: WorkRow) =>
  [getWorkIndustry(work), ...getWorkRoles(work)].join(' · ');

const createCountLabel = (count: number) => `${count}+`;

const getWorkYear = (work: WorkRow) => {
  const year = new Date(work.created_at).getFullYear();

  return Number.isFinite(year) ? String(year) : 'Recent';
};

const mapWorkToFeaturedWork = (
  work: WorkRow,
  index: number,
): FeaturedWork => {
  const category = getWorkCategory(work);
  const roles = getWorkRoles(work);

  return {
    category,
    year: getWorkYear(work),
    title: work.title,
    desc: createWorkSummary(work),
    metric: roles.join(' · '),
    gradient: featuredGradients[index % featuredGradients.length]!,
    badge: work.link_label?.trim() || category,
    image: work.image,
  };
};

const easeOutQuint = (progress: number) =>
  1 - Math.pow(1 - progress, 5);

const createCountRollItems = (value: string) => {
  const finalCount = Number.parseInt(value, 10);

  if (!Number.isFinite(finalCount)) {
    return ['0+', value];
  }

  const first = Math.max(Math.floor(finalCount * 0.25), 1);
  const second = Math.max(Math.floor(finalCount * 0.7), first + 1);
  const overshoot = finalCount + 1;

  return [
    '0+',
    `${first}+`,
    `${second}+`,
    `${Math.max(finalCount - 1, 0)}+`,
    `${overshoot}+`,
    value,
  ];
};

const getStatRollItems = (stat: HomeStat) => {
  if (
    stat.label === '프로젝트 이력' ||
    stat.label === '산업 도메인'
  ) {
    return createCountRollItems(stat.value);
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
    '개선',
    '설계',
    '구현',
    '테스트',
    stat.value,
  ];
};

const processSteps = [
  {
    no: 'STEP 01',
    title: '문의·상담',
    desc: '카카오톡 또는 메일로 가벼운 상담을 시작합니다. 부담 없이 아이디어를 공유해주세요.',
    duration: '당일~1일',
    icon: '💬',
  },
  {
    no: 'STEP 02',
    title: '기획·견적',
    desc: '범위와 요구사항을 정리하고 정식 견적서를 발행합니다. 일정과 비용을 명확히.',
    duration: '2~3일',
    icon: '📋',
  },
  {
    no: 'STEP 03',
    title: '제작·개발',
    desc: 'AI 도구로 빠르게 만들고, 디자이너·개발자가 디렉션. 결과물 책임은 우리가 집니다.',
    duration: '카테고리별',
    icon: '⚙️',
  },
  {
    no: 'STEP 04',
    title: '검수·수정',
    desc: '피드백을 반영해 결과물을 정교하게 다듬습니다. 기본 2회 무료 수정 제공.',
    duration: '1주',
    icon: '🔍',
  },
  {
    no: 'STEP 05',
    title: '납품·운영',
    desc: '최종 결과물 납품 후, 필요한 운영 단계까지 함께 갑니다. 출시 이후도 지원.',
    duration: '협의',
    icon: '🚀',
  },
];

const customerLogos = [
  ['NORDIC', 'ATLAS.io', 'LUMINA', 'FLUX', 'Greenday'],
  ['VERTEX', 'earthliving', 'Brevia', 'APEX', 'stellar'],
];

interface Testimonial {
  body: string;
  author: string;
  role: string;
  category: string;
  initial: string;
  avatarColor: string;
}

const testimonials: Testimonial[] = [
  {
    body: '광고 이미지 100컷을 일주일 안에 받았는데 브랜드 톤이 일관됐습니다. AI를 쓴다는 게 이런 거구나 싶었어요.',
    author: '김민지',
    role: '마케팅 리드 · 뷰티 스타트업 K',
    category: '광고 이미지',
    initial: '김',
    avatarColor: '#f28c59',
  },
  {
    body: '디자인부터 개발, 운영까지 한 팀이 책임지니 커뮤니케이션 시간이 정말 줄어듭니다. 내부에 개발팀 둔 느낌이에요.',
    author: '이준호',
    role: 'CTO · EdTech Startup',
    category: '웹·앱 개발',
    initial: '이',
    avatarColor: '#4d8cd9',
  },
  {
    body: '대시보드를 만들면서 어떤 지표를 보여줘야 할지부터 같이 고민해줬어요. 외주가 아니라 컨설팅에 가까웠습니다.',
    author: '박서연',
    role: 'PO · Fintech Co.',
    category: '데이터 대시보드',
    initial: '박',
    avatarColor: '#4db28c',
  },
];

export function HomePage() {
  // 자주하는 질문
  const { data: faqs = [] } = useFaqListQuery();
  const { data: worksData = [] } = useWorkListQuery();
  const statsRef = useRef<HTMLElement | null>(null);
  const statRollRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [statsAnimated, setStatsAnimated] = useState(false);

  const featuredWorks = useMemo(
    () =>
      worksData
        .slice(0, 4)
        .map((work, index) => mapWorkToFeaturedWork(work, index)),
    [worksData],
  );
  const projectHistoryValue = createCountLabel(worksData.length);
  const industryDomainValue = useMemo(
    () =>
      createCountLabel(
        new Set(
          worksData
            .map((work) => getWorkIndustry(work))
            .filter((industry) => industry !== DEFAULT_WORK_INDUSTRY),
        ).size,
      ),
    [worksData],
  );
  const stats = useMemo<HomeStat[]>(
    () => [
      {
        value: projectHistoryValue,
        label: '프로젝트 이력',
        sub: '등록된 Work 기준',
      },
      {
        value: industryDomainValue,
        label: '산업 도메인',
        sub: '등록된 산업 분야',
      },
      ...staticWorkStats,
    ],
    [industryDomainValue, projectHistoryValue],
  );

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

  return (
    <>
      <section className={styles.hero}>
        <div aria-hidden="true" className={styles.heroBackdrop} />
        <div aria-hidden="true" className={styles.heroGlow1} />
        <div aria-hidden="true" className={styles.heroGlow2} />
        <div aria-hidden="true" className={styles.heroGlow3} />
        <div aria-hidden="true" className={styles.heroGrid} />
        <div className={styles.heroCenter}>
          <span className={styles.heroEyebrow}>
            <span
              aria-hidden="true"
              className={styles.heroEyebrowDot}
            />
            AI-powered Digital Studio · 2026 New
          </span>
          <h1 className={styles.heroTitle}>
            AI는 도구,
            <br />
            결과물은 우리의 책임.
          </h1>
          <p className={styles.heroSub}>
            웹 3D, 광고 이미지, 웹·앱, 데이터 대시보드까지 — 한 팀이
            만듭니다.
          </p>
          <div className={styles.heroCtas}>
            <Link
              className={`${styles.heroCta} ${styles.heroCtaPrimary}`}
              href={ROUTES.CONTACT}
            >
              무료 견적 받기 <span aria-hidden="true">→</span>
            </Link>
            <Link
              className={`${styles.heroCta} ${styles.heroCtaGhost}`}
              href={ROUTES.WORK}
            >
              포트폴리오 보기
            </Link>
          </div>
        </div>
        {heroChips.map((c) => (
          <span
            aria-hidden="true"
            className={styles.heroFloatChip}
            key={c.label}
            style={{
              top: `${c.top}px`,
              left: `${c.left}px`,
              transform: `rotate(${c.rotate}deg)`,
            }}
          >
            <span
              className={styles.heroFloatDot}
              style={{ background: c.color }}
            />
            {c.label}
          </span>
        ))}
        <div aria-hidden="true" className={styles.heroScroll}>
          <span className={styles.heroScrollText}>
            Scroll to explore
          </span>
          <span className={styles.heroScrollIcon}>↓</span>
        </div>
      </section>

      <section className={styles.services}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Services</span>
            <h2 className={styles.sectionTitle}>
              한 팀이 책임지는 4가지 라인업
            </h2>
            <p className={styles.sectionSub}>
              AI를 도구로, 사람의 디렉션으로. 4개 영역을 모두 같은
              디자인 언어로 만듭니다.
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
                      <span className={styles.serviceCat}>
                        {s.category}
                      </span>
                      <span
                        aria-hidden="true"
                        className={styles.serviceArrow}
                      >
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

      <section className={styles.why}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Why VisionFlow</span>
            <h2 className={styles.sectionTitle}>
              왜 VisionFlow를 선택해야 하나요?
            </h2>
            <p className={styles.sectionSub}>
              다른 곳과 다른 3가지 이유. 외주가 아닌 디지털 파트너십을
              추구합니다.
            </p>
          </header>
          <ul className={styles.whyGrid}>
            {whyCards.map((w) => (
              <li className={styles.whyItem} key={w.no}>
                <article className={styles.whyCard}>
                  <div className={styles.whyVisual}>
                    <span className={styles.whyVisualEyebrow}>
                      {w.eyebrow}
                    </span>
                    <div
                      className={`${styles.whyIllust} ${styles[`whyIllust_${w.icon}`] ?? ''}`}
                    />
                    <span className={styles.whyVisualSub}>
                      {w.sub}
                    </span>
                  </div>
                  <div className={styles.whyBody}>
                    <span className={styles.whyNo}>{w.no}</span>
                    <h3 className={styles.whyTitle}>{w.title}</h3>
                    <p className={styles.whyDesc}>{w.desc}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.featured}>
        <Container>
          <div className={styles.featuredHead}>
            <header className={styles.sectionHead}>
              <span className={styles.eyebrow}>Featured Work</span>
              <h2 className={styles.sectionTitle}>
                신뢰를 만든 결과물
              </h2>
              <p className={styles.sectionSub}>
                각 카테고리에서 선정한 대표 프로젝트입니다.
              </p>
            </header>
            <Link className={styles.seeAll} href={ROUTES.WORK}>
              전체 작업 보기 <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ul className={styles.featuredGrid}>
            {featuredWorks.map((w) => (
              <li className={styles.featuredItem} key={w.title}>
                <article className={styles.featuredCard}>
                  <div
                    className={styles.featuredImage}
                    style={
                      {
                        backgroundImage: w.image
                          ? `url(${w.image})`
                          : w.gradient,
                      } as FeaturedImageStyle
                    }
                  >
                    <span className={styles.featuredImageBadge}>
                      {w.badge}
                    </span>
                  </div>
                  <div className={styles.featuredBody}>
                    <div className={styles.featuredTopRow}>
                      <div className={styles.featuredCatRow}>
                        <span className={styles.featuredCat}>
                          {w.category}
                        </span>
                        <span className={styles.featuredYear}>
                          {w.year}
                        </span>
                      </div>
                      <span className={styles.featuredMetric}>
                        <span aria-hidden="true">▲</span> {w.metric}
                      </span>
                    </div>
                    <h3 className={styles.featuredTitle}>
                      {w.title}
                    </h3>
                    <p className={styles.featuredDesc}>{w.desc}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.stats} ref={statsRef}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>By the Numbers</span>
            <h2 className={styles.sectionTitle}>
              숫자가 만드는 신뢰
            </h2>
            <p className={styles.sectionSub}>
              말이 아닌, 누적된 결과로 증명합니다.
            </p>
          </header>
          <div className={styles.statsRow}>
            {stats.map((s, i) => (
              <div className={styles.statItem} key={s.label}>
                <span className={styles.statValue}>
                  <strong>
                    <span
                      aria-hidden="true"
                      className={styles.statRoll}
                      ref={(node) => {
                        statRollRefs.current[i] = node;
                      }}
                    >
                      {getStatRollItems(s).map((item, itemIndex) => (
                        <span
                          className={styles.statRollItem}
                          key={`${s.label}-${item}-${itemIndex}`}
                        >
                          {item}
                        </span>
                      ))}
                    </span>
                    <span className={styles.statValueSr}>
                      {s.value}
                    </span>
                  </strong>
                </span>
                <span className={styles.statLabel}>{s.label}</span>
                <span className={styles.statSub}>{s.sub}</span>
                {i < stats.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={styles.statSep}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className={styles.process}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Process</span>
            <h2 className={styles.sectionTitle}>
              의뢰부터 납품까지 5단계
            </h2>
            <p className={styles.sectionSub}>
              명확한 절차와 예측 가능한 일정. 각 단계 완료 후 다음
              단계 진행 여부를 결정할 수 있습니다.
            </p>
          </header>
          <ol className={styles.processList}>
            {processSteps.map((s, i) => (
              <li className={styles.processItem} key={s.no}>
                <article className={styles.processCard}>
                  <span
                    aria-hidden="true"
                    className={styles.processNum}
                  >
                    {s.icon}
                  </span>
                  <span className={styles.processStep}>{s.no}</span>
                  <h3 className={styles.processTitle}>{s.title}</h3>
                  <p className={styles.processDesc}>{s.desc}</p>
                  <span className={styles.processDur}>
                    ⏱ {s.duration}
                  </span>
                </article>
                {i < processSteps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={styles.processConnector}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.logos}>
        <Container>
          <p className={styles.logosLabel}>
            TRUSTED BY 80+ COMPANIES
          </p>
          {customerLogos.map((row, i) => (
            <ul className={styles.logoRow} key={`row-${i}`}>
              {row.map((logo) => (
                <li className={styles.logoItem} key={logo}>
                  {logo}
                </li>
              ))}
            </ul>
          ))}
        </Container>
      </section>

      <section className={styles.testimonials}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Testimonials</span>
            <h2 className={styles.sectionTitle}>
              실제 사용해본 분들의 이야기
            </h2>
            <p className={styles.sectionSub}>
              의사결정자들이 직접 남긴 후기. 가공 없이 그대로
              옮겼습니다.
            </p>
          </header>
          <ul className={styles.tGrid}>
            {testimonials.map((t) => (
              <li className={styles.tItem} key={t.author}>
                <article className={styles.tCard}>
                  <span aria-hidden="true" className={styles.tQuote}>
                    “
                  </span>
                  <p className={styles.tText}>{t.body}</p>
                  <div className={styles.tAuthor}>
                    <span
                      aria-hidden="true"
                      className={styles.tAvatar}
                      style={{ background: t.avatarColor }}
                    >
                      {t.initial}
                    </span>
                    <div className={styles.tAuthorText}>
                      <strong>{t.author}</strong>
                      <span>{t.role}</span>
                    </div>
                    <span className={styles.tCategory}>
                      {t.category}
                    </span>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 자주하는 질문 */}
      <FaqPage faqs={faqs} />

      <section className={styles.cta}>
        <div aria-hidden="true" className={styles.ctaOrb1} />
        <div aria-hidden="true" className={styles.ctaOrb2} />
        <div aria-hidden="true" className={styles.ctaGrid} />
        <div className={styles.ctaInner}>
          <span className={styles.ctaEyebrow}>
            <span
              aria-hidden="true"
              className={styles.ctaEyebrowDot}
            />
            Start Your Project
          </span>
          <h2 className={styles.ctaTitle}>지금 시작해보세요</h2>
          <p className={styles.ctaSub}>
            아이디어 단계여도 좋습니다. 30분 무료 상담으로 가능성을
            먼저 확인해보세요.
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}
              href={ROUTES.CONTACT}
            >
              무료 견적 받기 <span aria-hidden="true">→</span>
            </Link>
            <Link
              className={`${styles.ctaButton} ${styles.ctaButtonGhost}`}
              href={ROUTES.KAKAO}
            >
              <span aria-hidden="true">💬</span> 카카오톡 문의
            </Link>
          </div>
          <ul className={styles.ctaTrust}>
            <li>✓ 1영업일 응답</li>
            <li>✓ 무료 진단</li>
            <li>✓ NDA 사전 가능</li>
          </ul>
        </div>
      </section>
    </>
  );
}
