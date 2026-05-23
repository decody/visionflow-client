'use client';

import type { WorkRow } from '@visionflow/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

type HomeStat = {
  value: string;
  label: string;
  sub: string;
};

const DEFAULT_WORK_INDUSTRY = '기타';
const STAT_ROLL_DURATION = 2800;
const STAT_ROLL_STAGGER = 120;

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

const getWorkIndustry = (work: WorkRow) =>
  work.industry.trim() || DEFAULT_WORK_INDUSTRY;

const createCountLabel = (count: number) => `${count}+`;

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

interface StatsSectionProps {
  works: WorkRow[];
}

export function StatsSection({ works }: StatsSectionProps) {
  const statsRef = useRef<HTMLElement | null>(null);
  const statRollRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [statsAnimated, setStatsAnimated] = useState(false);

  const projectHistoryValue = createCountLabel(works.length);
  const industryDomainValue = useMemo(
    () =>
      createCountLabel(
        new Set(
          works
            .map((work) => getWorkIndustry(work))
            .filter((industry) => industry !== DEFAULT_WORK_INDUSTRY),
        ).size,
      ),
    [works],
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
    <section className={styles.stats} ref={statsRef}>
      <Container>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>By the Numbers</span>
          <h2 className={styles.sectionTitle}>숫자가 만드는 신뢰</h2>
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
                  <span className={styles.statValueSr}>{s.value}</span>
                </strong>
              </span>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statSub}>{s.sub}</span>
              {i < stats.length - 1 ? (
                <span aria-hidden="true" className={styles.statSep} />
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
