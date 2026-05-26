'use client';

import { ROUTES } from '@visionflow/routes';
import type { IQna } from '@visionflow/shared';
import { ArrowLeft, Eye, Lock, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { Container } from '@/components/common/container';

import styles from './contact-general-detail-page.module.css';

type DetailResponse = {
  qna: IQna;
  requiresPassword: boolean;
};

type Props = {
  id: string;
};

export function ContactGeneralDetailClientPage({ id }: Props) {
  const [qna, setQna] = useState<IQna | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchQna = async () => {
      setIsLoading(true);
      setMessage(null);

      try {
        const verifiedQna = window.sessionStorage.getItem(
          `qna-verified:${id}`,
        );

        if (verifiedQna) {
          const parsedQna = JSON.parse(verifiedQna) as IQna;

          if (mounted) {
            setQna(parsedQna);
            setRequiresPassword(false);
            setIsLoading(false);
          }

          return;
        }

        const response = await fetch(`/api/qna/${id}`);

        if (!response.ok) {
          throw new Error('Q&A를 찾을 수 없습니다.');
        }

        const data = (await response.json()) as DetailResponse;

        if (mounted) {
          setQna(data.qna);
          setRequiresPassword(data.requiresPassword);
        }
      } catch (error) {
        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Q&A를 불러오지 못했습니다.',
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchQna();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!isLoading && qna && requiresPassword) {
      passwordInputRef.current?.focus();
    }
  }, [isLoading, qna, requiresPassword]);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim()) {
      setMessage('비밀번호를 입력해 주세요.');
      return;
    }

    setIsVerifying(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/qna/${id}/verify`, {
        body: JSON.stringify({ password }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      const data = (await response.json()) as { qna: IQna };
      setQna(data.qna);
      setRequiresPassword(false);
      setPassword('');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : '비밀번호 확인 중 문제가 발생했습니다.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const title = getTitle(qna);

  return (
    <div className={styles.page}>
      <Container>
        <nav aria-label="breadcrumb" className={styles.breadcrumbBar}>
          <ol className={styles.breadcrumbList}>
            <li className={styles.breadcrumbItem}>
              <Link
                className={styles.breadcrumbLink}
                href={ROUTES.CONTACT.ROOT}
              >
                문의하기
              </Link>
              <span
                aria-hidden="true"
                className={styles.breadcrumbSep}
              >
                /
              </span>
            </li>
            <li className={styles.breadcrumbItem}>
              <Link
                className={styles.breadcrumbLink}
                href={`${ROUTES.CONTACT.ROOT}/general#board`}
              >
                Q&amp;A 게시판
              </Link>
              <span
                aria-hidden="true"
                className={styles.breadcrumbSep}
              >
                /
              </span>
            </li>
            <li className={styles.breadcrumbItem}>
              <span
                aria-current="page"
                className={styles.breadcrumbCurrent}
              >
                {title}
              </span>
            </li>
          </ol>
          <Link
            className={styles.backToList}
            href={`${ROUTES.CONTACT.ROOT}/general#board`}
          >
            <ArrowLeft aria-hidden="true" size={14} />
            목록으로
          </Link>
        </nav>

        {isLoading ? <QnaDetailSkeleton /> : null}

        {!isLoading && qna && requiresPassword ? (
          <article className={styles.passwordCard}>
            <div className={styles.passwordIcon}>
              <Lock aria-hidden="true" size={26} />
            </div>
            <div className={styles.passwordText}>
              <p className={styles.passwordKicker}>비밀글</p>
              <h1>{title}</h1>
              <p>
                작성자가 설정한 비밀번호를 입력해야 본문과 답변을
                확인할 수 있습니다.
              </p>
            </div>
            <form
              className={styles.passwordForm}
              onSubmit={handleVerify}
            >
              <label
                className={styles.passwordLabel}
                htmlFor="qna-password"
              >
                비밀번호
              </label>
              <input
                autoComplete="current-password"
                className={styles.passwordInput}
                id="qna-password"
                maxLength={24}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="작성 시 입력한 비밀번호"
                ref={passwordInputRef}
                type="password"
                value={password}
              />
              {message ? (
                <p className={styles.passwordMessage}>{message}</p>
              ) : null}
              <button
                className={styles.passwordSubmit}
                disabled={isVerifying}
                type="submit"
              >
                {isVerifying ? '확인 중' : '비밀글 보기'}
              </button>
            </form>
          </article>
        ) : null}

        {!isLoading && qna && !requiresPassword ? (
          <>
            <article className={styles.postCard}>
              <header className={styles.postHeader}>
                <div className={styles.postBadgeRow}>
                  <span
                    className={`${styles.statusBadge} ${styles[getStatusClass(qna)]}`}
                  >
                    {getStatusLabel(qna)}
                  </span>
                  {qna.is_secret || qna.isSecret ? (
                    <span className={styles.secretBadge}>
                      <Lock aria-hidden="true" size={12} />
                      비밀글
                    </span>
                  ) : null}
                  <span className={styles.categoryBadge}>
                    {qna.category || '서비스 일반'}
                  </span>
                </div>
                <h1 className={styles.postTitle}>{title}</h1>
                <div className={styles.postMeta}>
                  <div className={styles.postAuthor}>
                    <span
                      aria-hidden="true"
                      className={styles.avatar}
                    >
                      {getInitial(qna)}
                    </span>
                    <div className={styles.authorText}>
                      <span className={styles.authorName}>
                        {qna.author_name ?? qna.authorName ?? '익명'}
                      </span>
                      <span className={styles.authorDate}>
                        {formatDate(qna.created_at ?? qna.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.postStats}>
                    <span className={styles.stat}>
                      <Eye aria-hidden="true" size={14} />
                      <strong>
                        {qna.view_count ?? qna.viewCount ?? 0}
                      </strong>
                      <span className={styles.statLabel}>조회</span>
                    </span>
                    <span className={styles.stat}>
                      <MessageCircle aria-hidden="true" size={14} />
                      <strong>{qna.answer?.trim() ? 1 : 0}</strong>
                      <span className={styles.statLabel}>답변</span>
                    </span>
                  </div>
                </div>
              </header>

              <hr className={styles.divider} />

              <div className={styles.postBody}>
                <p className={styles.bodyParagraph}>
                  {qna.content ?? qna.question ?? ''}
                </p>
              </div>
            </article>

            {qna.answer?.trim() ? (
              <section
                aria-label="운영팀 답변"
                className={styles.answerSection}
              >
                <div className={styles.answerLabel}>
                  <span
                    aria-hidden="true"
                    className={styles.answerLabelDot}
                  />
                  운영팀 답변
                </div>
                <article className={styles.answerCard}>
                  <header className={styles.answerHeader}>
                    <span
                      aria-hidden="true"
                      className={`${styles.avatar} ${styles.avatarLarge}`}
                    >
                      V
                    </span>
                    <div className={styles.answerHeaderText}>
                      <div className={styles.answerNameRow}>
                        <span className={styles.answerName}>
                          VisionFlow 운영팀
                        </span>
                        <span className={styles.officialBadge}>
                          공식 답변
                        </span>
                      </div>
                      <div className={styles.answerMetaRow}>
                        {formatDate(qna.updated_at ?? qna.updatedAt)}
                      </div>
                    </div>
                  </header>
                  <div className={styles.answerBody}>
                    <p className={styles.bodyParagraph}>
                      {qna.answer}
                    </p>
                  </div>
                </article>
              </section>
            ) : (
              <div className={styles.stateCard}>
                아직 답변이 등록되지 않았습니다.
              </div>
            )}
          </>
        ) : null}

        {!isLoading && !qna && message ? (
          <div className={styles.stateCard}>{message}</div>
        ) : null}
      </Container>
    </div>
  );
}

function QnaDetailSkeleton() {
  return (
    <div
      className={styles.skeletonWrap}
      aria-busy="true"
      aria-live="polite"
    >
      <article className={styles.postCard}>
        <header className={styles.postHeader}>
          <div className={styles.skeletonBadges}>
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}
            />
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}
            />
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonNo}`}
            />
          </div>
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonTitle}`}
          />
          <div className={styles.skeletonMeta}>
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonAvatar}`}
            />
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonAuthor}`}
            />
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonStat}`}
            />
          </div>
        </header>

        <hr className={styles.divider} />

        <div className={styles.postBody}>
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonLine}`}
          />
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonLine}`}
          />
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonShortLine}`}
          />
        </div>
      </article>

      <section className={styles.answerSection}>
        <span
          className={`${styles.skeletonBlock} ${styles.skeletonAnswerLabel}`}
        />
        <article className={styles.answerCard}>
          <header className={styles.answerHeader}>
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonAvatar}`}
            />
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonAuthor}`}
            />
          </header>
          <div className={styles.answerBody}>
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonLine}`}
            />
            <span
              className={`${styles.skeletonBlock} ${styles.skeletonShortLine}`}
            />
          </div>
        </article>
      </section>
    </div>
  );
}

function getTitle(qna: IQna | null) {
  return qna?.title?.trim() || qna?.question?.trim() || 'Q&A 상세';
}

function getStatusLabel(qna: IQna) {
  if (qna.status === 'done' || qna.answer?.trim()) {
    return '답변 완료';
  }

  if (qna.status === 'in_progress') {
    return '진행중';
  }

  return '답변 대기';
}

function getStatusClass(qna: IQna) {
  if (qna.status === 'done' || qna.answer?.trim()) {
    return 'status_done';
  }

  if (qna.status === 'in_progress') {
    return 'status_progress';
  }

  return 'status_pending';
}

function getInitial(qna: IQna) {
  const author = qna.author_name ?? qna.authorName ?? '익명';

  return author.at(0) ?? '익';
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
