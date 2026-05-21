import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from './contact-general-detail-page.module.css';

type Breadcrumb =
  | { label: string; href: string; current?: false }
  | { label: string; current: true };

const breadcrumbs: Breadcrumb[] = [
  { label: '문의하기', href: ROUTES.CONTACT.ROOT },
  { label: '일반 문의', href: `${ROUTES.CONTACT.ROOT}/general` },
  { label: 'Q&A 게시판', href: `${ROUTES.CONTACT.ROOT}/general#board` },
  { label: '123번 게시글', current: true },
];

const post = {
  no: 123,
  status: '답변완료',
  category: '진행 절차',
  title: 'AI 광고 이미지 100컷 작업 평균 기간이 어떻게 되나요?',
  author: '김민지',
  authorInitial: '김',
  date: '2025.05.01 14:23',
  views: 234,
  replies: 3,
  paragraphs: [
    '안녕하세요. 자사 신제품 캠페인을 위해 AI 광고 이미지 작업을 의뢰하고 싶습니다.',
    '구체적인 요구사항은 다음과 같습니다:\n· 제품 컷 60장 (각 제품 5각도 × 12 SKU)\n· 키비주얼 메인 컷 20장 (시즌 캠페인용)\n· 라이프스타일 컷 20장\n총 100장입니다.',
    '브랜드 톤은 미니멀·내츄럴 톤이고, 경쟁사 사례를 참고할 수 있도록 가이드 자료도 보유하고 있습니다.',
    '이 정도 규모 작업의 평균 기간이 어느 정도일지 궁금합니다. 또한 수정은 몇 회까지 가능한지, 추가 컷 발생 시 비용 산정은 어떻게 되는지도 알려주시면 감사하겠습니다.',
    '감사합니다.',
  ],
  attachments: [
    { name: 'Brand_Guideline_2025_Spring.pdf', meta: '1.8 MB · 다운로드 가능' },
  ],
} as const;

const adminAnswer = {
  staff: '광고 이미지 담당 · 박수현',
  date: '2025.05.02 09:14',
  responseTime: '⏱ 응답 19시간',
  greeting: '김민지님, 문의 주셔서 감사합니다.',
  intro:
    '말씀해 주신 100컷 규모 (제품 60 + 키비주얼 20 + 라이프스타일 20) 작업의 일반적인 일정은 다음과 같습니다.',
  timeline: [
    { step: '1단계 · 브랜드/레퍼런스 분석', duration: '2~3일' },
    { step: '2단계 · 톤 학습 + 1차 시안 (10컷)', duration: '3~4일' },
    { step: '3단계 · 본 작업 100컷 생성', duration: '5~7일' },
    { step: '4단계 · 검수·수정·납품', duration: '2~3일' },
  ],
  total: '약 12~17일 (2~3주)',
  paragraphs: [
    '수정 횟수는 단계별 2회씩 총 8회까지 기본 포함되어 있고, 그 이상은 컷당 8만원으로 추가 산정됩니다.',
    '추가 컷이 필요한 경우 단가는 컷당 8~12만원(난이도에 따라 다름)이며, 사전에 협의된 단가표를 기준으로 산정합니다.',
    '브랜드 가이드라인이 이미 있으시다니 1단계 시간이 단축될 수 있을 것 같습니다. 더 정확한 견적과 일정은 견적 폼을 통해 요청해 주시면 24시간 내에 정식 견적서를 보내드리겠습니다.',
  ],
  helpful: 24,
  unhelpful: 1,
} as const;

interface Comment {
  author: string;
  initial: string;
  badge?: '작성자' | '운영팀';
  date: string;
  body: string;
  likes: number;
  hasReply: boolean;
  isStaff?: boolean;
  isReply?: boolean;
}

const comments: Comment[] = [
  {
    author: '김민지',
    initial: '김',
    badge: '작성자',
    date: '2025.05.02 10:32',
    body:
      '상세한 답변 정말 감사합니다! 일정과 단가표 모두 명확하게 이해되었습니다. 견적 폼으로 정식 요청 진행하겠습니다.',
    likes: 0,
    hasReply: true,
  },
  {
    author: '이재원',
    initial: '이',
    date: '2025.05.02 14:08',
    body:
      '비슷한 규모 작업 의뢰했었는데 실제로 2주 정도 걸렸습니다. 가이드라인 잘 정리되어 있으면 더 빨라질 수 있어요.',
    likes: 5,
    hasReply: true,
  },
  {
    author: 'VisionFlow 운영팀',
    initial: 'V',
    badge: '운영팀',
    date: '2025.05.02 14:25',
    body:
      '@이재원 님, 경험 공유 감사합니다! 말씀처럼 가이드라인이 잘 정리되어 있을수록 1단계가 단축되어 전체 일정이 줄어듭니다.',
    likes: 2,
    hasReply: false,
    isStaff: true,
    isReply: true,
  },
];

const prevPost = {
  no: 124,
  title: '🆕 Three.js로 만든 3D 컨피규레이터 견적은 어느 정도일까요?',
  href: `${ROUTES.CONTACT.ROOT}/general#post-124`,
};

const nextPost = {
  no: 122,
  title: '🔒 내부 시스템 연동 프로젝트 NDA 검토 요청드립니다',
  href: `${ROUTES.CONTACT.ROOT}/general#post-122`,
};

export function ContactGeneralDetailPage() {
  return (
    <div className={styles.page}>
      <Container>
        <nav aria-label="breadcrumb" className={styles.breadcrumbBar}>
          <ol className={styles.breadcrumbList}>
            {breadcrumbs.map((b, i) => (
              <li className={styles.breadcrumbItem} key={b.label}>
                {b.current ? (
                  <span aria-current="page" className={styles.breadcrumbCurrent}>
                    {b.label}
                  </span>
                ) : (
                  <Link className={styles.breadcrumbLink} href={b.href}>
                    {b.label}
                  </Link>
                )}
                {i < breadcrumbs.length - 1 ? (
                  <span aria-hidden="true" className={styles.breadcrumbSep}>
                    ›
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <Link className={styles.backToList} href={`${ROUTES.CONTACT.ROOT}/general#board`}>
            <span aria-hidden="true">←</span> 목록으로
          </Link>
        </nav>

        <article className={styles.postCard}>
          <header className={styles.postHeader}>
            <div className={styles.postBadgeRow}>
              <span className={`${styles.statusBadge} ${styles.statusDone}`}>
                <span aria-hidden="true">✓</span> {post.status}
              </span>
              <span className={styles.categoryBadge}>{post.category}</span>
              <span className={styles.postNo}># {post.no}</span>
            </div>
            <h1 className={styles.postTitle}>{post.title}</h1>
            <div className={styles.postMeta}>
              <div className={styles.postAuthor}>
                <span aria-hidden="true" className={styles.avatar}>
                  {post.authorInitial}
                </span>
                <div className={styles.authorText}>
                  <span className={styles.authorName}>{post.author}</span>
                  <span className={styles.authorDate}>{post.date}</span>
                </div>
              </div>
              <div className={styles.postStats}>
                <span className={styles.stat}>
                  <span aria-hidden="true">👁</span>
                  <strong>{post.views}</strong>
                  <span className={styles.statLabel}>조회</span>
                </span>
                <span className={styles.stat}>
                  <span aria-hidden="true">💬</span>
                  <strong>{post.replies}</strong>
                  <span className={styles.statLabel}>댓글</span>
                </span>
              </div>
            </div>
          </header>

          <hr className={styles.divider} />

          <div className={styles.postBody}>
            {post.paragraphs.map((p, i) => (
              <p className={styles.bodyParagraph} key={i}>
                {p}
              </p>
            ))}
            <p className={styles.attachLabel}>첨부 자료</p>
            {post.attachments.map((a) => (
              <div className={styles.attachItem} key={a.name}>
                <span aria-hidden="true" className={styles.attachIconBox}>
                  📎
                </span>
                <div className={styles.attachText}>
                  <span className={styles.attachName}>{a.name}</span>
                  <span className={styles.attachMeta}>{a.meta}</span>
                </div>
                <button className={styles.attachDownload} type="button">
                  ↓ 다운로드
                </button>
              </div>
            ))}
          </div>

          <div className={styles.postFooter}>
            <button className={styles.toolBtn} type="button">
              <span aria-hidden="true">🔗</span> 링크 복사
            </button>
            <button className={styles.toolBtn} type="button">
              <span aria-hidden="true">🚩</span> 신고
            </button>
          </div>
        </article>

        <section aria-label="운영팀 답변" className={styles.answerSection}>
          <div className={styles.answerLabel}>
            <span aria-hidden="true" className={styles.answerLabelDot} />
            운영팀 답변
          </div>
          <article className={styles.answerCard}>
            <header className={styles.answerHeader}>
              <span aria-hidden="true" className={`${styles.avatar} ${styles.avatarLarge}`}>
                V
              </span>
              <div className={styles.answerHeaderText}>
                <div className={styles.answerNameRow}>
                  <span className={styles.answerName}>VisionFlow 운영팀</span>
                  <span className={styles.officialBadge}>
                    <span aria-hidden="true">✓</span> 공식 답변
                  </span>
                </div>
                <div className={styles.answerMetaRow}>
                  <span className={styles.answerStaff}>{adminAnswer.staff}</span>
                  <span aria-hidden="true">·</span>
                  <span>{adminAnswer.date}</span>
                  <span aria-hidden="true">·</span>
                  <span className={styles.answerResponseTime}>{adminAnswer.responseTime}</span>
                </div>
              </div>
            </header>

            <div className={styles.answerBody}>
              <p className={styles.answerGreeting}>{adminAnswer.greeting}</p>
              <p className={styles.bodyParagraph}>{adminAnswer.intro}</p>

              <div className={styles.timelineBox}>
                {adminAnswer.timeline.map((row) => (
                  <div className={styles.timelineRow} key={row.step}>
                    <span className={styles.timelineStep}>{row.step}</span>
                    <span className={styles.timelineDuration}>{row.duration}</span>
                  </div>
                ))}
                <hr className={styles.timelineDivider} />
                <div className={styles.timelineRow}>
                  <span className={styles.timelineTotal}>총 예상 기간</span>
                  <span className={styles.timelineTotalChip}>{adminAnswer.total}</span>
                </div>
              </div>

              {adminAnswer.paragraphs.map((p, i) => (
                <p className={styles.bodyParagraph} key={i}>
                  {p}
                </p>
              ))}

              <div className={styles.answerCta}>
                <div className={styles.answerCtaText}>
                  <p className={styles.answerCtaTitle}>정식 견적이 필요하신가요?</p>
                  <p className={styles.answerCtaSub}>
                    견적 폼을 통해 요청하시면 24시간 내에 견적서를 받아보실 수 있습니다.
                  </p>
                </div>
                <Link className={styles.answerCtaButton} href={`${ROUTES.CONTACT.ROOT}#quote`}>
                  견적 문의 →
                </Link>
              </div>

              <div className={styles.feedbackRow}>
                <span className={styles.feedbackQuestion}>이 답변이 도움이 되었나요?</span>
                <div className={styles.feedbackActions}>
                  <button
                    className={`${styles.feedbackBtn} ${styles.feedbackBtnPositive}`}
                    type="button"
                  >
                    <span aria-hidden="true">👍</span> 도움됨{' '}
                    <span className={styles.feedbackCount}>{adminAnswer.helpful}</span>
                  </button>
                  <button
                    className={`${styles.feedbackBtn} ${styles.feedbackBtnNeutral}`}
                    type="button"
                  >
                    <span aria-hidden="true">👎</span> 아쉬움{' '}
                    <span className={styles.feedbackCount}>{adminAnswer.unhelpful}</span>
                  </button>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section aria-label="댓글" className={styles.commentsCard}>
          <header className={styles.commentsHeader}>
            <span aria-hidden="true" className={styles.commentsIcon}>
              💬
            </span>
            <h2 className={styles.commentsTitle}>댓글</h2>
            <span className={styles.commentsCount}>{comments.length}</span>
          </header>
          <ul className={styles.commentList}>
            {comments.map((c, i) => (
              <li
                className={`${styles.commentItem} ${c.isReply ? styles.commentReply : ''}`}
                key={i}
              >
                <span
                  aria-hidden="true"
                  className={`${styles.avatar} ${
                    c.isStaff ? styles.avatarPrimary : styles.avatarMuted
                  }`}
                >
                  {c.initial}
                </span>
                <div className={styles.commentBody}>
                  <div className={styles.commentMetaRow}>
                    <span className={styles.commentAuthor}>{c.author}</span>
                    {c.badge ? (
                      <span
                        className={`${styles.commentBadge} ${
                          c.badge === '운영팀' ? styles.commentBadgeStaff : styles.commentBadgeAuthor
                        }`}
                      >
                        {c.badge}
                      </span>
                    ) : null}
                    <span aria-hidden="true" className={styles.commentDot}>
                      ·
                    </span>
                    <span className={styles.commentDate}>{c.date}</span>
                    <button
                      aria-label="더보기"
                      className={styles.commentMore}
                      type="button"
                    >
                      ⋯
                    </button>
                  </div>
                  <p className={styles.commentText}>{c.body}</p>
                  <div className={styles.commentActions}>
                    <button className={styles.commentLike} type="button">
                      <span aria-hidden="true">👍</span> {c.likes}
                    </button>
                    {c.hasReply ? (
                      <button className={styles.commentReplyBtn} type="button">
                        답글 달기
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <hr className={styles.divider} />

          <form className={styles.commentForm}>
            <h3 className={styles.commentFormTitle}>댓글 작성</h3>
            <div className={styles.commentFormRow}>
              <input
                aria-label="이름"
                className={styles.commentInput}
                name="name"
                placeholder="이름 *"
                required
                type="text"
              />
              <input
                aria-label="비밀번호"
                className={styles.commentInput}
                name="password"
                placeholder="비밀번호 (수정·삭제 시 필요)"
                required
                type="password"
              />
            </div>
            <textarea
              aria-label="댓글 내용"
              className={styles.commentTextarea}
              maxLength={500}
              name="comment"
              placeholder="댓글을 입력하세요. (예의있는 표현 부탁드립니다)"
              required
            />
            <div className={styles.commentFormFooter}>
              <label className={styles.privateCheckbox} htmlFor="comment-private">
                <input
                  className={styles.consentInput}
                  id="comment-private"
                  name="private"
                  type="checkbox"
                />
                <span aria-hidden="true" className={styles.consentBox}>
                  ✓
                </span>
                <span className={styles.privateLabel}>
                  🔒 비밀 댓글 (운영팀과 작성자만 볼 수 있음)
                </span>
              </label>
              <span className={styles.commentCounter}>0 / 500</span>
              <button className={styles.commentSubmit} type="submit">
                댓글 등록
              </button>
            </div>
          </form>
        </section>

        <nav aria-label="이전·다음 글" className={styles.prevNext}>
          <Link className={styles.navCard} href={prevPost.href}>
            <span aria-hidden="true" className={styles.navArrow}>
              ←
            </span>
            <div className={styles.navText}>
              <span className={styles.navLabel}>이전글 · {prevPost.no}</span>
              <span className={styles.navTitle}>{prevPost.title}</span>
            </div>
          </Link>
          <Link className={styles.navCard} href={nextPost.href}>
            <div className={`${styles.navText} ${styles.navTextRight}`}>
              <span className={styles.navLabel}>다음글 · {nextPost.no}</span>
              <span className={styles.navTitle}>{nextPost.title}</span>
            </div>
            <span aria-hidden="true" className={styles.navArrow}>
              →
            </span>
          </Link>
        </nav>
      </Container>
    </div>
  );
}
