import { ROUTES } from '@visionflow/routes';
import type { WorkRow } from '@visionflow/shared';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

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

type FeaturedImageStyle = CSSProperties & {
  backgroundImage: string;
};

const DEFAULT_WORK_CATEGORY = 'Frontend';
const DEFAULT_WORK_INDUSTRY = '기타';
const DEFAULT_WORK_ROLE = '프론트엔드 개발';

const featuredGradients = [
  'linear-gradient(162deg, #8c6bd9 0%, #4d338c 73%)',
  'linear-gradient(162deg, #f28ca6 0%, #d94d73 73%)',
  'linear-gradient(162deg, #4dbfa6 0%, #1a668c 73%)',
  'linear-gradient(162deg, #263359 0%, #0d142e 73%)',
];

const getWorkCategory = (work: WorkRow) =>
  work.category.trim() || DEFAULT_WORK_CATEGORY;

const getWorkIndustry = (work: WorkRow) =>
  work.industry.trim() || DEFAULT_WORK_INDUSTRY;

const getWorkRoles = (work: WorkRow) =>
  work.roles.length > 0 ? work.roles : [DEFAULT_WORK_ROLE];

const createWorkSummary = (work: WorkRow) =>
  [getWorkIndustry(work), ...getWorkRoles(work)].join(' · ');

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

interface FeaturedWorkSectionProps {
  works: WorkRow[];
}

export function FeaturedWorkSection({ works }: FeaturedWorkSectionProps) {
  const featuredWorks = works
    .slice(0, 4)
    .map((work, index) => mapWorkToFeaturedWork(work, index));

  return (
    <section className={styles.featured}>
      <Container>
        <div className={styles.featuredHead}>
          <header className={styles.sectionHead}>
            <span className={styles.eyebrow}>Featured Work</span>
            <h2 className={styles.sectionTitle}>신뢰를 만든 결과물</h2>
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
                      <span className={styles.featuredYear}>{w.year}</span>
                    </div>
                    <span className={styles.featuredMetric}>
                      <span aria-hidden="true">▲</span> {w.metric}
                    </span>
                  </div>
                  <h3 className={styles.featuredTitle}>{w.title}</h3>
                  <p className={styles.featuredDesc}>{w.desc}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
