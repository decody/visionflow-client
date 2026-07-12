import { ROUTES } from '@visionflow/routes';
import type { WorkRow } from '@visionflow/shared';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

interface FeaturedWork {
  category: string;
  year: string;
  title: string;
  desc: string;
  metric: string;
  badge: string;
  /** PNG 경로 또는 CSS gradient 문자열 또는 http 이미지 URL */
  image: string;
}

const DEFAULT_WORK_CATEGORY = 'Frontend';
const DEFAULT_WORK_INDUSTRY = '기타';
const DEFAULT_WORK_ROLE = '프론트엔드 개발';

const featuredGradients = [
  'linear-gradient(162deg, #8c6bd9 0%, #4d338c 73%)',
  'linear-gradient(162deg, #f28ca6 0%, #d94d73 73%)',
  'linear-gradient(162deg, #4dbfa6 0%, #1a668c 73%)',
  'linear-gradient(162deg, #263359 0%, #0d142e 73%)',
];

// 피그마 디자인 기준 정적 샘플 카드 (실제 데이터 없을 때)
const PLACEHOLDER_WORKS: FeaturedWork[] = [
  {
    category: '웹 3D',
    year: '2026',
    title: 'Nordic Furniture — 3D 컨피규레이터',
    desc: '제품 360° 컨피규레이터 + 가상 쇼룸. 12주 만에 출시.',
    metric: '전환율 +47%',
    badge: '',
    image: '/images/featured/card-3d.png',
  },
  {
    category: '광고 이미지',
    year: '2026',
    title: '뷰티 브랜드 K — 시즌 캠페인',
    desc: 'AI 기반 시즌 캠페인 비주얼 120컷. 4채널 동시 운영.',
    metric: 'CTR +82%',
    badge: '',
    image: '/images/featured/card-ad.png',
  },
  {
    category: '웹·앱 개발',
    year: '2025',
    title: 'EdTech Startup — 학습 플랫폼',
    desc: 'Next.js 기반 학습 플랫폼 풀스택 구축. iOS·Android 동시 출시.',
    metric: '완강율 +35%',
    badge: '',
    image: '/images/featured/card-edtech.png',
  },
  {
    category: '데이터 대시보드',
    year: '2025',
    title: 'Fintech Co. — 거래 어드민',
    desc: '실시간 거래 모니터링 어드민. 50만 행 데이터를 끊김없이.',
    metric: '운영 시간 −60%',
    badge: '',
    image: '/images/featured/card-fintech.png',
  },
];

const getWorkYear = (work: WorkRow) => {
  const year = new Date(work.created_at).getFullYear();
  return Number.isFinite(year) ? String(year) : 'Recent';
};

const mapWorkToFeaturedWork = (work: WorkRow, index: number): FeaturedWork => {
  const category = work.category.trim() || DEFAULT_WORK_CATEGORY;
  const industry = work.industry.trim() || DEFAULT_WORK_INDUSTRY;
  const roles = work.roles.length > 0 ? work.roles : [DEFAULT_WORK_ROLE];
  return {
    category,
    year: getWorkYear(work),
    title: work.title,
    desc: [industry, ...roles].join(' · '),
    metric: roles.join(' · '),
    badge: work.link_label?.trim() || category,
    image: work.image ?? featuredGradients[index % featuredGradients.length]!,
  };
};

const isImagePath = (img: string) =>
  img.startsWith('/') || img.startsWith('http');

interface FeaturedWorkSectionProps {
  works: WorkRow[];
}

export function FeaturedWorkSection({ works }: FeaturedWorkSectionProps) {
  const liveWorks = works
    .slice(0, 4)
    .map((work, index) => mapWorkToFeaturedWork(work, index));

  const featuredWorks = liveWorks.length > 0 ? liveWorks : PLACEHOLDER_WORKS;
  const isPlaceholder = liveWorks.length === 0;

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
                <div className={styles.featuredImage}>
                  {isImagePath(w.image) ? (
                    /* PNG 이미지: 뱃지가 PNG에 포함되어 있으므로 오버레이 없음 */
                    <img
                      alt=""
                      aria-hidden={isPlaceholder ? 'true' : undefined}
                      className={styles.featuredImagePng}
                      src={w.image}
                    />
                  ) : (
                    /* 그라디언트 폴백: 뱃지 텍스트 오버레이 표시 */
                    <>
                      <div
                        className={styles.featuredImageGradient}
                        style={{ backgroundImage: w.image }}
                      />
                      {w.badge ? (
                        <span className={styles.featuredImageBadge}>
                          {w.badge}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
                <div className={styles.featuredBody}>
                  <div className={styles.featuredTopRow}>
                    <div className={styles.featuredCatRow}>
                      <span className={styles.featuredCat}>{w.category}</span>
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
