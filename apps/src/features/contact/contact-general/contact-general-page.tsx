import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import { ContactGeneralFormPage } from '@/features/contact/contact-general/contact-general-form-page';
import { QnaWebListPage } from '@/features/qna/qna-web-list-page';
import styles from './contact-general-page.module.css';

const tabs = [
  { label: 'Q&A 게시판', count: 124, active: true, href: '#board' },
  { label: '빠른 문의', active: false, href: '#quick-form' },
] as const;

const _categories = [
  { label: '전체', count: 124, active: true },
  { label: '서비스 일반', active: false },
  { label: '가격', active: false },
  { label: '진행 절차', active: false },
  { label: '기술', active: false },
  { label: '기타', active: false },
] as const;

type PostStatus = 'pending' | 'in_progress' | 'done';

interface Post {
  no: number;
  title: string;
  author: string;
  date: string;
  views: number;
  replies: number;
  status?: PostStatus;
  isNotice?: boolean;
  isNew?: boolean;
  locked?: boolean;
}

const _posts: Post[] = [
  {
    no: 0,
    title: '커뮤니티 이용 가이드라인 업데이트 안내',
    author: '운영팀',
    date: '2025.04.20',
    views: 5421,
    replies: 0,
    isNotice: true,
  },
  {
    no: 0,
    title: 'NDA 검토 절차 안내 (비밀글 작성 시 필독)',
    author: '운영팀',
    date: '2025.04.15',
    views: 3210,
    replies: 0,
    isNotice: true,
  },
  {
    no: 124,
    title: 'Three.js로 만든 3D 컨피규레이터 견적은 어느 정도일까요?',
    author: '홍길동',
    date: '2025.05.02',
    views: 12,
    replies: 0,
    status: 'pending',
    isNew: true,
  },
  {
    no: 123,
    title: 'AI 광고 이미지 100컷 작업 평균 기간이 어떻게 되나요?',
    author: '김민지',
    date: '2025.05.01',
    views: 234,
    replies: 3,
    status: 'done',
  },
  {
    no: 122,
    title: '내부 시스템 연동 프로젝트 NDA 검토 요청드립니다',
    author: '이*수',
    date: '2025.04.30',
    views: 8,
    replies: 1,
    status: 'in_progress',
    locked: true,
  },
  {
    no: 121,
    title: '대시보드 작업에서 데이터 소스는 어떤 것까지 지원하나요?',
    author: '박서연',
    date: '2025.04.28',
    views: 189,
    replies: 5,
    status: 'done',
  },
  {
    no: 120,
    title: '결제는 분할 가능한가요? (3회 분할 희망)',
    author: '최영준',
    date: '2025.04.27',
    views: 156,
    replies: 2,
    status: 'done',
  },
  {
    no: 119,
    title: '특정 클라이언트 사례 공개 가능 여부',
    author: '정**',
    date: '2025.04.26',
    views: 14,
    replies: 1,
    status: 'done',
    locked: true,
  },
  {
    no: 118,
    title: '디자인 시안 수정 횟수 제한이 있나요?',
    author: '강민호',
    date: '2025.04.25',
    views: 298,
    replies: 4,
    status: 'done',
  },
];

const _statusLabel: Record<PostStatus, string> = {
  pending: '답변대기',
  in_progress: '진행중',
  done: '답변완료',
};

const _statusClass: Record<PostStatus, string> = {
  pending: 'status_pending',
  in_progress: 'status_in_progress',
  done: 'status_done',
};

const _pageNumbers = [1, 2, 3, 4, 5];

export function ContactGeneralPage() {
  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}
            >
              General · Q&amp;A
            </span>
            <h1 className={styles.heroTitle}>
              궁금한 점을 남겨주세요
            </h1>
            <p className={styles.heroSub}>
              서비스 관련 일반 질문이나 Q&amp;A 게시판을 통해
              문의해주세요.
              <br />
              비공개 정보가 포함된 경우 비밀글로 작성하시면 NDA 검토
              후 답변 드립니다.
            </p>
          </div>
        </Container>
      </section>

      <section className={styles.tabs}>
        <Container>
          <div className={styles.tabsCenter}>
            <div className={styles.tabsBar} role="tablist">
              {tabs.map((t) => (
                <Link
                  className={`${styles.tab} ${t.active ? styles.tabActive : ''}`}
                  href={t.href}
                  key={t.label}
                >
                  {t.label}
                  {'count' in t && t.count !== undefined ? (
                    <span className={styles.tabCount}>{t.count}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <QnaWebListPage />

      <section className={styles.quickForm} id="quick-form">
        <Container>
          <header className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}
            >
              Quick Form
            </span>
            <h2 className={styles.sectionTitle}>
              게시판이 부담스럽다면, 빠른 문의로
            </h2>
            <p className={styles.sectionSub}>
              공개되지 않는 1:1 문의입니다. 1~2 영업일 내에 이메일로
              답변 드립니다.
            </p>
          </header>
          <ContactGeneralFormPage />
        </Container>
      </section>

      <section className={styles.otherHint}>
        <Container>
          <div className={styles.hintBanner}>
            <div className={styles.hintText}>
              <p className={styles.hintTitle}>
                정식 견적이나 제휴 제안을 원하신다면
              </p>
              <p className={styles.hintSub}>
                전용 채널을 통해 더 빠르고 정확한 답변을 받아보세요.
              </p>
            </div>
            <div className={styles.hintActions}>
              <Link
                className={`${styles.hintCta} ${styles.hintCtaPrimary}`}
                href={`${ROUTES.CONTACT.ROOT}/quote`}
              >
                견적 문의 →
              </Link>
              <Link
                className={`${styles.hintCta} ${styles.hintCtaSecondary}`}
                href={`${ROUTES.CONTACT.ROOT}/partnership`}
              >
                제휴 문의 →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
