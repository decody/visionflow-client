'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  IQuickInquiry,
  QuickInquiryStatus,
} from '@visionflow/shared';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Mail,
  MessageSquareText,
  Send,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import Loading from '@/components/loading/page';
import { useQuickListQuery } from '@/hooks/admin/contact/quick/useQuickQuery';
import { useSendQuickReplyMutation } from '@/hooks/admin/contact/quick/useSendQuickReplyMutation';
import { useTopbar } from '../../components/layout/topbar-context';
import styles from './general-inquiry-detail-page.module.css';

type DetailTab = 'body' | 'compose' | 'log';
type ReplyNotice = {
  message: string;
  tone: 'error' | 'success';
};
type ActivityLogEntry = {
  icon: LucideIcon;
  label: string;
  time: string;
};

const STATUS_LABEL: Record<QuickInquiryStatus, string> = {
  in_progress: '확인 중',
  pending: '미답변',
  resolved: '답변 완료',
};

const TABS: ReadonlyArray<{
  key: DetailTab;
  label: string;
}> = [
  { key: 'body', label: '문의 내용' },
  { key: 'compose', label: '답변 작성' },
  { key: 'log', label: '처리 로그' },
];

export function GeneralInquiryDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DetailTab>('body');
  const [replyDraft, setReplyDraft] = useState<{
    inquiryId: string;
    value: string;
  } | null>(null);
  const [replyNoticeState, setReplyNoticeState] = useState<{
    inquiryId: string;
    notice: ReplyNotice;
  } | null>(null);
  const sendReplyMutation = useSendQuickReplyMutation();

  const { data: quicks, isLoading } = useQuickListQuery();

  const quickList = useMemo(
    () =>
      (Array.isArray(quicks) ? quicks : []).sort(
        (a, b) =>
          getCreatedAtTime(b.created_at) -
          getCreatedAtTime(a.created_at),
      ),
    [quicks],
  );

  const inquiryIndex = quickList.findIndex((row) => row.id === id);
  const inquiry = inquiryIndex >= 0 ? quickList[inquiryIndex] : null;
  const prevInquiry =
    inquiryIndex > 0 ? (quickList[inquiryIndex - 1] ?? null) : null;
  const nextInquiry =
    inquiryIndex >= 0 && inquiryIndex < quickList.length - 1
      ? (quickList[inquiryIndex + 1] ?? null)
      : null;

  const defaultReply = useMemo(() => {
    if (!inquiry) {
      return '';
    }

    return [
      `안녕하세요, ${inquiry.name || '고객'}님.`,
      '',
      'VisionFlow에 문의해 주셔서 감사합니다.',
      '남겨주신 내용을 확인한 뒤 아래와 같이 안내드립니다.',
      '',
      '- 문의 내용:',
      `  ${inquiry.subject?.trim() || '일반 문의'}`,
      '',
      '추가로 확인이 필요한 내용이 있으면 이 메일에 회신해 주세요.',
      '',
      '감사합니다.',
      'VisionFlow 드림',
    ].join('\n');
  }, [inquiry]);

  const reply =
    replyDraft?.inquiryId === id ? replyDraft.value : defaultReply;
  const replyNotice =
    replyNoticeState?.inquiryId === id
      ? replyNoticeState.notice
      : null;
  const setCurrentReply = (value: string) => {
    setReplyDraft({ inquiryId: id, value });
  };
  const setCurrentReplyNotice = (notice: ReplyNotice | null) => {
    setReplyNoticeState(notice ? { inquiryId: id, notice } : null);
  };

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '고객 문의' },
        {
          href: ROUTES.ADMIN.GENERAL_INQUIRY.ROOT,
          label: '일반 문의',
        },
        {
          label: inquiry
            ? `${inquiry.subject?.trim() || '제목없음'}`
            : '',
        },
      ],
    }),
    [id, inquiry],
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!inquiry) {
    return (
      <div className={styles.page}>
        <Link
          className={styles.backLink}
          href={ROUTES.ADMIN.GENERAL_INQUIRY.ROOT}
        >
          <ArrowLeft aria-hidden="true" size={14} />
          목록으로
        </Link>
        <article className={styles.emptyCard}>
          <h1>문의 내용을 찾을 수 없습니다.</h1>
          <p>
            삭제되었거나 잘못된 주소일 수 있습니다. 목록에서 다시
            확인해 주세요.
          </p>
        </article>
      </div>
    );
  }

  const statusClassName =
    styles[`status_${inquiry.status}`] ?? styles.status_pending;
  const displayTitle = inquiry.subject?.trim() || '(제목 없음)';
  const sla = getSlaText(inquiry);
  const replySubject = `Re: ${inquiry.subject?.trim() || '일반 문의'}`;
  const canSendReply =
    Boolean(inquiry.email?.trim()) && Boolean(reply.trim());
  const activityLogs = getActivityLogs(inquiry);

  const handleOpenComposer = () => {
    setActiveTab('compose');
  };

  const handleCancelReply = () => {
    setReplyDraft({ inquiryId: id, value: defaultReply });
    setCurrentReplyNotice(null);
    router.push(ROUTES.ADMIN.GENERAL_INQUIRY.ROOT);
  };

  const handleSendReply = async () => {
    const to = inquiry.email?.trim();
    const replyContent = reply.trim();

    if (!to) {
      setActiveTab('compose');
      setCurrentReplyNotice({
        message: '수신자 이메일이 없어 답변을 발송할 수 없습니다.',
        tone: 'error',
      });
      return;
    }

    if (!replyContent) {
      setActiveTab('compose');
      setCurrentReplyNotice({
        message: '답변 내용을 입력한 뒤 발송해 주세요.',
        tone: 'error',
      });
      return;
    }

    try {
      setCurrentReplyNotice(null);
      await sendReplyMutation.mutateAsync({
        inquiryId: inquiry.id,
        replyContent,
      });
      setCurrentReplyNotice({
        message:
          '답변 메일을 발송하고 문의 상태를 완료로 변경했습니다.',
        tone: 'success',
      });
    } catch (error) {
      setCurrentReplyNotice({
        message:
          error instanceof Error
            ? error.message
            : '답변 발송 중 오류가 발생했습니다.',
        tone: 'error',
      });
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageNav}>
          <Link
            className={styles.backLink}
            href={ROUTES.ADMIN.GENERAL_INQUIRY.ROOT}
          >
            <ArrowLeft aria-hidden="true" size={14} />
            목록으로
          </Link>
          <div className={styles.navActions}>
            <NavInquiryButton
              direction="prev"
              inquiry={prevInquiry}
              label="이전"
            />
            <NavInquiryButton
              direction="next"
              inquiry={nextInquiry}
              label="다음"
            />
          </div>
        </div>
      </header>

      <article className={styles.questionCard}>
        <header className={styles.questionMeta}>
          <div className={styles.metaBadges}>
            <span
              className={`${styles.statusBadge} ${statusClassName}`}
            >
              {STATUS_LABEL[inquiry.status]}
            </span>
            <span className={styles.categoryProposal}>일반 문의</span>
          </div>
        </header>

        <h1 className={styles.questionTitle}>{displayTitle}</h1>

        <div className={styles.authorRow}>
          <span aria-hidden="true" className={styles.avatar}>
            {getInitial(inquiry.name)}
          </span>
          <div className={styles.authorInfo}>
            <strong>
              {inquiry.name || '익명'} · {inquiry.email || '-'}
            </strong>
            <span>
              접수 {formatFullDate(inquiry.created_at)} · 최근 변경{' '}
              {formatFullDate(inquiry.updated_at)}
            </span>
          </div>
        </div>

        <div className={styles.questionBody}>
          {inquiry.content
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={`${inquiry.id}-body-${index}`}>{paragraph}</p>
            ))}
        </div>
      </article>

      <aside className={styles.slaCard}>
        <span aria-hidden="true" className={styles.slaIcon}>
          <Timer size={18} />
        </span>
        <div className={styles.slaBody}>
          <p className={styles.slaTitle}>{sla.title}</p>
          <p className={styles.slaMeta}>{sla.meta}</p>
        </div>
        <div className={styles.slaActions}>
          <button
            className={styles.slaButton}
            onClick={handleOpenComposer}
            type="button"
          >
            답변 발송
            <Send aria-hidden="true" size={14} />
          </button>
        </div>
      </aside>

      <nav
        aria-label="상세 섹션"
        className={styles.tabsBar}
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${
              activeTab === tab.key ? styles.tabActive : ''
            }`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
            {tab.key === 'log' ? (
              <span className={styles.tabCount}>
                {activityLogs.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {activeTab === 'body' ? (
        <InquiryBody inquiry={inquiry} />
      ) : null}
      {activeTab === 'compose' ? (
        <ReplyComposer
          canSendReply={canSendReply}
          isSending={sendReplyMutation.isPending}
          inquiry={inquiry}
          notice={replyNotice}
          onCancel={handleCancelReply}
          onSend={handleSendReply}
          reply={reply}
          subject={replySubject}
          setReply={setCurrentReply}
        />
      ) : null}
      {activeTab === 'log' ? (
        <ActivityLog logs={activityLogs} />
      ) : null}
    </div>
  );
}

function NavInquiryButton({
  direction,
  inquiry,
  label,
}: {
  direction: 'next' | 'prev';
  inquiry: IQuickInquiry | null;
  label: string;
}) {
  const Icon = direction === 'prev' ? ChevronUp : ChevronDown;

  if (!inquiry) {
    return (
      <button className={styles.navButton} disabled type="button">
        {direction === 'prev' ? <Icon size={14} /> : null}
        {label}
        {direction === 'next' ? <Icon size={14} /> : null}
      </button>
    );
  }

  return (
    <Link
      className={styles.navButton}
      href={ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(inquiry.id)}
    >
      {direction === 'prev' ? (
        <Icon aria-hidden="true" size={14} />
      ) : null}
      {label}
      {direction === 'next' ? (
        <Icon aria-hidden="true" size={14} />
      ) : null}
    </Link>
  );
}

function InquiryBody({ inquiry }: { inquiry: IQuickInquiry }) {
  return (
    <article className={styles.infoCard}>
      <header className={styles.infoHeader}>
        <MessageSquareText aria-hidden="true" size={16} />
        <strong>원문 문의</strong>
      </header>
      <dl className={styles.infoList}>
        <div>
          <dt>상태</dt>
          <dd>{STATUS_LABEL[inquiry.status]}</dd>
        </div>
        <div>
          <dt>작성자</dt>
          <dd>{inquiry.name || '익명'}</dd>
        </div>
        <div>
          <dt>이메일</dt>
          <dd>{inquiry.email || '-'}</dd>
        </div>
        <div>
          <dt>접수일</dt>
          <dd>{formatFullDate(inquiry.created_at)}</dd>
        </div>
        <div>
          <dt>답변일</dt>
          <dd>{formatFullDate(inquiry.replied_at ?? undefined)}</dd>
        </div>
      </dl>
    </article>
  );
}

function ReplyComposer({
  canSendReply,
  inquiry,
  isSending,
  notice,
  onCancel,
  onSend,
  reply,
  subject,
  setReply,
}: {
  canSendReply: boolean;
  inquiry: IQuickInquiry;
  isSending: boolean;
  notice: ReplyNotice | null;
  onCancel: () => void;
  onSend: () => void;
  reply: string;
  subject: string;
  setReply: (value: string) => void;
}) {
  return (
    <article className={styles.composer}>
      <header className={styles.composerHeader}>
        <span aria-hidden="true" className={styles.composerAvatar}>
          <Mail size={14} />
        </span>
        <div className={styles.composerHeading}>
          <strong>이메일 답변</strong>
          <span> · Markdown 지원</span>
        </div>
      </header>

      <dl className={styles.mailFields}>
        <div className={styles.mailRow}>
          <dt>TO</dt>
          <dd>
            {inquiry.name || '고객'} &lt;{inquiry.email || '-'}&gt;
          </dd>
        </div>
        <div className={styles.mailRow}>
          <dt>FROM</dt>
          <dd>VisionFlow Admin &lt;support@visionflow.kr&gt;</dd>
        </div>
        <div className={styles.mailRow}>
          <dt>SUBJ</dt>
          <dd>{subject}</dd>
        </div>
      </dl>

      {notice ? (
        <p
          className={`${styles.replyNotice} ${
            notice.tone === 'success'
              ? styles.replyNotice_success
              : styles.replyNotice_error
          }`}
        >
          {notice.message}
        </p>
      ) : null}

      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>답변 내용</span>
        <span className={styles.charCount}>
          {reply.length.toLocaleString()}자
        </span>
      </div>

      <textarea
        className={styles.editor}
        onChange={(event) => setReply(event.target.value)}
        rows={12}
        value={reply}
      />

      <footer className={styles.composerFooter}>
        <p className={styles.policyText}>
          발송 전 문의 내용과 수신자 이메일을 다시 확인해 주세요.
        </p>
        <div className={styles.composerActions}>
          <button
            className={styles.cancelButton}
            disabled={isSending}
            onClick={onCancel}
            type="button"
          >
            &nbsp;&nbsp;취소&nbsp;&nbsp;
          </button>
          <button
            className={styles.submitButton}
            disabled={!canSendReply || isSending}
            onClick={onSend}
            type="button"
          >
            <Send aria-hidden="true" size={14} />
            {isSending ? '발송 중' : '답변 발송'}
          </button>
        </div>
      </footer>
    </article>
  );
}

function getActivityLogs(inquiry: IQuickInquiry): ActivityLogEntry[] {
  const logs: ActivityLogEntry[] = [
    {
      icon: Mail,
      label: '문의 접수',
      time: formatFullDate(inquiry.created_at),
    },
    {
      icon: Clock3,
      label: `${STATUS_LABEL[inquiry.status]} 상태`,
      time: formatFullDate(inquiry.updated_at),
    },
  ];

  if (inquiry.status === 'resolved') {
    logs.push({
      icon: Check,
      label: '답변 발송 완료',
      time: formatFullDate(inquiry.replied_at ?? inquiry.updated_at),
    });
  }

  return logs;
}

function ActivityLog({ logs }: { logs: ActivityLogEntry[] }) {
  return (
    <article className={styles.infoCard}>
      <header className={styles.infoHeader}>
        <Clock3 aria-hidden="true" size={16} />
        <strong>처리 로그</strong>
      </header>
      <ol className={styles.logList}>
        {logs.map((log) => {
          const Icon = log.icon;
          return (
            <li key={log.label}>
              <span aria-hidden="true" className={styles.logIcon}>
                <Icon size={14} />
              </span>
              <div>
                <strong>{log.label}</strong>
                <span>{log.time}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

function getInitial(name?: string) {
  return name?.trim().slice(0, 1).toUpperCase() || '?';
}

function getCreatedAtTime(value?: string) {
  const time = value ? new Date(value).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
}

function formatFullDate(value?: string) {
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

function getSlaText(inquiry: IQuickInquiry) {
  if (inquiry.status === 'resolved') {
    return {
      meta: `마지막 변경 ${formatFullDate(inquiry.updated_at)}`,
      title: '답변이 완료된 문의입니다.',
    };
  }

  const createdAt = new Date(inquiry.created_at).getTime();
  if (Number.isNaN(createdAt)) {
    return {
      meta: '접수일을 확인할 수 없어 수동 확인이 필요합니다.',
      title: 'SLA 확인 필요',
    };
  }

  const dueAt = createdAt + 48 * 60 * 60 * 1000;
  const diffHours = Math.ceil((dueAt - Date.now()) / 3600000);

  if (diffHours <= 0) {
    return {
      meta: '48시간 응답 기준을 초과했습니다.',
      title: 'SLA 응답 기한 초과',
    };
  }

  return {
    meta: '48시간 SLA · 일반 문의 채널',
    title: `SLA 응답 마감까지 ${diffHours}시간`,
  };
}
