'use client';

import { ROUTES } from '@visionflow/routes';
import type { IQna } from '@visionflow/shared';
import { Modal, message } from 'antd';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Eye,
  Lock,
  MessageSquareText,
  Trash2,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
import {
  useAdminQnaDetailQuery,
  useDeleteQnaMutation,
} from '@/hooks/admin/qna/useQnaQuery';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canDeleteQna } from '@/lib/admin-permissions';
import styles from './qna-detail-page.module.css';

const getTitle = (qna: IQna) =>
  qna.title?.trim() || qna.question?.trim() || '제목 없음';

const getAuthor = (qna: IQna) =>
  qna.author_name?.trim() || qna.authorName?.trim() || '익명';

const isSecret = (qna: IQna) =>
  qna.is_secret === true || qna.isSecret === true;

const isDone = (qna: IQna) =>
  qna.answer?.trim() ||
  qna.status === 'done' ||
  qna.status === 'resolved';

const formatDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export function QnaDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const {
    data: qna,
    isLoading,
    isError,
  } = useAdminQnaDetailQuery(id);
  const deleteMutation = useDeleteQnaMutation();
  const role = useCurrentUserRole();
  const canDeleteQnaItem = canDeleteQna(role);

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '고객센터' },
        { href: ROUTES.ADMIN.QNA.ROOT, label: 'Q&A 게시판' },
        { label: `#${id}` },
      ],
    }),
    [id],
  );

  const metaItems = useMemo(() => {
    if (!qna) {
      return [];
    }

    return [
      {
        icon: UserRound,
        label: '작성자',
        value: getAuthor(qna),
      },
      {
        icon: CalendarDays,
        label: '작성일',
        value: formatDate(qna.created_at ?? qna.createdAt),
      },
      {
        icon: Eye,
        label: '조회수',
        value: String(qna.view_count ?? qna.viewCount ?? 0),
      },
    ];
  }, [qna]);

  const handleDelete = () => {
    if (!qna) {
      return;
    }

    Modal.confirm({
      title: 'Q&A를 삭제할까요?',
      content: `"${getTitle(qna)}" 항목이 영구 삭제됩니다.`,
      okText: '삭제',
      okButtonProps: { danger: true },
      cancelText: '취소',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(qna.id);
          void messageApi.success('Q&A가 삭제되었습니다.');
          router.push(ROUTES.ADMIN.QNA.ROOT);
          router.refresh();
        } catch (error) {
          void messageApi.error(
            error instanceof Error
              ? error.message
              : 'Q&A 삭제에 실패했습니다.',
          );
        }
      },
    });
  };

  if (isLoading) {
    return <QnaDetailSkeleton />;
  }

  if (isError || !qna) {
    return (
      <div className={styles.page}>
        <Link
          className={styles.backLink}
          href={ROUTES.ADMIN.QNA.ROOT}
        >
          <ArrowLeft aria-hidden="true" size={14} />
          목록으로
        </Link>
        <article className={styles.questionCard}>
          <h1 className={styles.questionTitle}>
            Q&amp;A를 찾을 수 없습니다.
          </h1>
        </article>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {contextHolder}
      <header className={styles.pageHeader}>
        <div className={styles.pageNav}>
          <Link
            className={styles.backLink}
            href={ROUTES.ADMIN.QNA.ROOT}
          >
            <ArrowLeft aria-hidden="true" size={14} />
            목록으로
          </Link>
          {canDeleteQnaItem ? (
            <button
              className={styles.dangerButton}
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              type="button"
            >
              <Trash2 aria-hidden="true" size={14} />
              삭제
            </button>
          ) : null}
        </div>
      </header>

      <article className={styles.questionCard}>
        <header className={styles.questionMeta}>
          <div className={styles.metaBadges}>
            <span
              className={
                isDone(qna)
                  ? styles.status_done
                  : styles.status_pending
              }
            >
              {isDone(qna) ? (
                <Check aria-hidden="true" size={12} />
              ) : (
                <MessageSquareText aria-hidden="true" size={12} />
              )}
              {isDone(qna) ? '답변 완료' : '답변 대기'}
            </span>
            {isSecret(qna) ? (
              <span className={styles.secretPill}>
                <Lock aria-hidden="true" size={12} />
                비밀글
              </span>
            ) : null}
            <span className={styles.categoryPill}>
              {qna.category?.trim() || '서비스 일반'}
            </span>
          </div>
        </header>

        <h1 className={styles.questionTitle}>{getTitle(qna)}</h1>

        <div className={styles.metaGrid}>
          {metaItems.map((item) => {
            const Icon = item.icon;

            return (
              <div className={styles.metaItem} key={item.label}>
                <Icon aria-hidden="true" size={15} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>

        <div className={styles.questionBody}>
          <p>
            {qna.content?.trim() ||
              qna.question?.trim() ||
              '본문 없음'}
          </p>
        </div>
      </article>

      <article className={styles.answerCard}>
        <header className={styles.answerHeader}>
          <span aria-hidden="true" className={styles.composerAvatar}>
            A
          </span>
          <div>
            <strong>관리자 답변</strong>
            <span>{formatDate(qna.updated_at ?? qna.updatedAt)}</span>
          </div>
        </header>
        {qna.answer?.trim() ? (
          <p className={styles.answerBody}>{qna.answer}</p>
        ) : (
          <p className={styles.emptyAnswer}>
            등록된 답변이 없습니다.
          </p>
        )}
      </article>
    </div>
  );
}

function QnaDetailSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <header className={styles.pageHeader}>
        <div className={styles.pageNav}>
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonBack}`}
          />
        </div>
      </header>

      <article className={styles.questionCard}>
        <div className={styles.skeletonBadges}>
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}
          />
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}
          />
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}
          />
        </div>
        <span
          className={`${styles.skeletonBlock} ${styles.skeletonTitle}`}
        />
        <div className={styles.skeletonMetaGrid}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
        <div className={styles.skeletonBody}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
      </article>

      <article className={styles.answerCard}>
        <div className={styles.skeletonAnswerHeader}>
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonAvatar}`}
          />
          <span
            className={`${styles.skeletonBlock} ${styles.skeletonAnswerMeta}`}
          />
        </div>
        <div className={styles.skeletonBody}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
      </article>
    </div>
  );
}
