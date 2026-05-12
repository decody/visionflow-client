import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from './contact-general-page.module.css';

const tabs = [
  { label: 'Q&A 게시판', count: 124, active: true, href: '#board' },
  { label: '빠른 문의', active: false, href: '#quick-form' },
] as const;

const categories = [
  { label: '전체', count: 124, active: true },
  { label: '서비스 일반', active: false },
  { label: '가격', active: false },
  { label: '진행 절차', active: false },
  { label: '기술', active: false },
  { label: '기타', active: false },
] as const;

type PostStatus = 'pending' | 'inProgress' | 'done';

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

const posts: Post[] = [
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
    status: 'inProgress',
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

const statusLabel: Record<PostStatus, string> = {
  pending: '답변대기',
  inProgress: '진행중',
  done: '답변완료',
};

const statusClass: Record<PostStatus, string> = {
  pending: 'statusPending',
  inProgress: 'statusInProgress',
  done: 'statusDone',
};

const pageNumbers = [1, 2, 3, 4, 5];

export function ContactGeneralPage() {
  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}>
              General · Q&amp;A
            </span>
            <h1 className={styles.heroTitle}>궁금한 점을 남겨주세요</h1>
            <p className={styles.heroSub}>
              서비스 관련 일반 질문이나 Q&amp;A 게시판을 통해 문의해주세요.
              <br />
              비공개 정보가 포함된 경우 비밀글로 작성하시면 NDA 검토 후 답변 드립니다.
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

      <section className={styles.board} id="board">
        <Container>
          <div className={styles.boardToolbar}>
            <div className={styles.categoryGroup}>
              {categories.map((c) => (
                <button
                  className={`${styles.categoryChip} ${
                    c.active ? styles.categoryChipActive : ''
                  }`}
                  key={c.label}
                  type="button"
                >
                  {c.label}
                  {'count' in c && c.count !== undefined ? (
                    <span className={styles.categoryCount}>{c.count}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className={styles.boardSpacer} />
            <div className={styles.searchBox}>
              <span aria-hidden="true" className={styles.searchIcon}>
                🔍
              </span>
              <input
                aria-label="검색어"
                className={styles.searchInput}
                placeholder="검색어를 입력하세요"
                type="search"
              />
            </div>
            <Link className={styles.boardWrite} href={ROUTES.QNA}>
              <span aria-hidden="true">✏️</span>
              질문 작성
            </Link>
          </div>

          <div className={styles.table} role="table">
            <div className={styles.thead} role="row">
              <span className={styles.thCenter}>번호</span>
              <span>제목</span>
              <span className={styles.thCenter}>작성자</span>
              <span className={styles.thCenter}>날짜</span>
              <span className={styles.thCenter}>조회</span>
              <span className={styles.thCenter}>답변</span>
            </div>
            {posts.map((p, i) => (
              <div
                className={`${styles.row} ${p.isNotice ? styles.rowNotice : ''}`}
                key={`${p.no}-${i}`}
                role="row"
              >
                <span className={styles.cellNo}>
                  {p.isNotice ? <span className={styles.noticeBadge}>공지</span> : p.no}
                </span>
                <span className={styles.cellTitle}>
                  {p.status ? (
                    <span
                      className={`${styles.statusBadge} ${styles[statusClass[p.status]]}`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  ) : null}
                  <span
                    className={`${styles.titleText} ${
                      p.isNotice ? styles.titleTextNotice : ''
                    }`}
                  >
                    {p.locked ? '🔒 ' : ''}
                    {p.title}
                  </span>
                  <span className={styles.replyCount}>[{p.replies}]</span>
                  {p.isNew ? <span className={styles.newBadge}>NEW</span> : null}
                </span>
                <span className={styles.cellAuthor}>{p.author}</span>
                <span className={styles.cellDate}>{p.date}</span>
                <span className={styles.cellViews}>👁 {p.views}</span>
                <span className={styles.cellReplies}>💬 {p.replies}</span>
              </div>
            ))}
          </div>

          <nav aria-label="pagination" className={styles.pagination}>
            <button
              aria-label="이전 페이지"
              className={`${styles.pageBtn} ${styles.pageBtnNav}`}
              type="button"
            >
              ‹
            </button>
            {pageNumbers.map((n) => (
              <button
                className={`${styles.pageBtn} ${n === 1 ? styles.pageBtnActive : ''}`}
                key={n}
                type="button"
              >
                {n}
              </button>
            ))}
            <button
              aria-label="다음 페이지"
              className={`${styles.pageBtn} ${styles.pageBtnNav}`}
              type="button"
            >
              ›
            </button>
          </nav>
        </Container>
      </section>

      <section className={styles.quickForm} id="quick-form">
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}>Quick Form</span>
            <h2 className={styles.sectionTitle}>게시판이 부담스럽다면, 빠른 문의로</h2>
            <p className={styles.sectionSub}>
              공개되지 않는 1:1 문의입니다. 1~2 영업일 내에 이메일로 답변 드립니다.
            </p>
          </header>
          <form className={styles.formCard}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="qf-name">
                  이름 <span className={styles.formRequired}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  id="qf-name"
                  name="name"
                  placeholder="문의자 이름"
                  required
                  type="text"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="qf-email">
                  이메일 <span className={styles.formRequired}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  id="qf-email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </div>
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="qf-title">
                제목 <span className={styles.formOptional}>(선택)</span>
              </label>
              <input
                className={styles.formInput}
                id="qf-title"
                name="title"
                placeholder="문의 제목 (선택)"
                type="text"
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="qf-message">
                내용 <span className={styles.formRequired}>*</span>
              </label>
              <textarea
                className={styles.formTextarea}
                id="qf-message"
                name="message"
                placeholder={
                  '궁금한 점을 자유롭게 작성해 주세요.\n견적·기술·진행 절차·NDA·기타 무엇이든.'
                }
                required
                rows={6}
              />
            </div>
            <div className={styles.formActions}>
              <p className={styles.formNote}>1~2 영업일 내 이메일로 회신 드립니다.</p>
              <button className={styles.formSubmit} type="submit">
                문의 보내기
              </button>
            </div>
          </form>
        </Container>
      </section>

      <section className={styles.otherHint}>
        <Container>
          <div className={styles.hintBanner}>
            <div className={styles.hintText}>
              <p className={styles.hintTitle}>정식 견적이나 제휴 제안을 원하신다면</p>
              <p className={styles.hintSub}>
                전용 채널을 통해 더 빠르고 정확한 답변을 받아보세요.
              </p>
            </div>
            <div className={styles.hintActions}>
              <Link
                className={`${styles.hintCta} ${styles.hintCtaPrimary}`}
                href={`${ROUTES.CONTACT}#quote`}
              >
                견적 문의 →
              </Link>
              <Link
                className={`${styles.hintCta} ${styles.hintCtaSecondary}`}
                href={`${ROUTES.CONTACT}#partnership`}
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
