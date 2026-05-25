'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  IPartnershipInquiry,
  PartnershipInquiryStatus,
  PartnershipInquiryType,
} from '@visionflow/shared';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Handshake,
  Mail,
  MapPin,
  Paperclip,
  Save,
  Send,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
import Loading from '@/components/loading/page';
import {
  usePartnershipListQuery,
  useUpdatePartnershipMutation,
} from '@/hooks/admin/contact/partnership/usePartnershipQuery';
import { useSendPartnershipReplyMutation } from '@/hooks/admin/contact/partnership/useSendPartnershipReplyMutation';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canManageContent } from '@/lib/admin-permissions';
import styles from './partnership-detail-page.module.css';

type DetailTab = 'proposal' | 'reply' | 'history' | 'memo';
type Notice = {
  message: string;
  tone: 'error' | 'success';
};
type ActivityLogEntry = {
  icon: LucideIcon;
  label: string;
  time: string;
};

const STATUS_LABEL: Record<PartnershipInquiryStatus, string> = {
  approved: '승인',
  pending: '대기',
  rejected: '거절',
  reviewing: '검토 중',
};

const PARTNERSHIP_TYPE_LABEL: Record<PartnershipInquiryType, string> =
  {
    content_partner: '콘텐츠 파트너',
    etc: '기타',
    outsourcing: '외주 협력',
    reseller: '리셀러',
    tech_partner: '기술 파트너',
  };

const COMPANY_SIZE_LABEL: Record<
  IPartnershipInquiry['company_size'],
  string
> = {
  '1': '1명',
  '2-10': '2-10명',
  '11-50': '11-50명',
  '50+': '50명 이상',
};

const TABS: ReadonlyArray<{
  key: DetailTab;
  label: string;
}> = [
  { key: 'proposal', label: '제안 본문' },
  { key: 'reply', label: '회신' },
  { key: 'history', label: '히스토리' },
  { key: 'memo', label: '내부 메모' },
];

export function PartnershipDetailPage({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<DetailTab>('proposal');
  const [memoDraft, setMemoDraft] = useState<{
    inquiryId: string;
    value: string;
  } | null>(null);
  const [replyDraft, setReplyDraft] = useState<{
    inquiryId: string;
    value: string;
  } | null>(null);
  const [noticeState, setNoticeState] = useState<{
    inquiryId: string;
    notice: Notice;
  } | null>(null);

  const role = useCurrentUserRole();
  const canUpdateInquiry = canManageContent(role);
  const { data, isLoading } = usePartnershipListQuery();
  const updateMutation = useUpdatePartnershipMutation();
  const sendReplyMutation = useSendPartnershipReplyMutation();

  const inquiryList = useMemo(
    () =>
      (Array.isArray(data) ? data : []).sort(
        (a, b) =>
          getCreatedAtTime(b.created_at) -
          getCreatedAtTime(a.created_at),
      ),
    [data],
  );
  const inquiryIndex = inquiryList.findIndex(
    (row) => String(row.id) === id,
  );
  const inquiry =
    inquiryIndex >= 0 ? inquiryList[inquiryIndex] : null;
  const prevInquiry =
    inquiryIndex > 0 ? (inquiryList[inquiryIndex - 1] ?? null) : null;
  const nextInquiry =
    inquiryIndex >= 0 && inquiryIndex < inquiryList.length - 1
      ? (inquiryList[inquiryIndex + 1] ?? null)
      : null;

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '인바운드' },
        {
          href: ROUTES.ADMIN.PARTNERSHIP.ROOT,
          label: '제휴 문의',
        },
        { label: inquiry?.company_name ?? '' },
      ],
    }),
    [inquiry],
  );

  const defaultReply = useMemo(
    () => (inquiry ? createReplyTemplate(inquiry) : ''),
    [inquiry],
  );
  const reply =
    replyDraft?.inquiryId === id ? replyDraft.value : defaultReply;
  const memo =
    memoDraft?.inquiryId === id
      ? memoDraft.value
      : (inquiry?.admin_memo ?? '');
  const notice =
    noticeState?.inquiryId === id ? noticeState.notice : null;

  if (isLoading) {
    return <Loading />;
  }

  if (!inquiry) {
    return (
      <div className={styles.page}>
        <Link
          className={styles.backLink}
          href={ROUTES.ADMIN.PARTNERSHIP.ROOT}
        >
          <ArrowLeft aria-hidden="true" size={14} />
          목록으로
        </Link>
        <article className={styles.emptyCard}>
          <h1>제휴 문의를 찾을 수 없습니다.</h1>
          <p>
            삭제되었거나 잘못된 주소일 수 있습니다. 목록에서 다시
            확인해 주세요.
          </p>
        </article>
      </div>
    );
  }

  const activityLogs = getActivityLogs(inquiry);
  const sla = getSlaText(inquiry);
  const statusClassName =
    styles[`status_${inquiry.status}`] ?? styles.status_pending;
  const setCurrentNotice = (noticeValue: Notice | null) => {
    setNoticeState(
      noticeValue ? { inquiryId: id, notice: noticeValue } : null,
    );
  };

  const handleMemoSave = async () => {
    if (!canUpdateInquiry) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        admin_memo: memo,
        id: inquiry.id,
      });
      setCurrentNotice({
        message: '내부 메모를 저장했습니다.',
        tone: 'success',
      });
    } catch (error) {
      setCurrentNotice({
        message:
          error instanceof Error
            ? error.message
            : '메모 저장 중 오류가 발생했습니다.',
        tone: 'error',
      });
    }
  };

  const handleCopyReply = async () => {
    try {
      await navigator.clipboard.writeText(reply);
      setCurrentNotice({
        message: '회신 초안을 클립보드에 복사했습니다.',
        tone: 'success',
      });
    } catch {
      setCurrentNotice({
        message: '클립보드 복사 권한을 확인해 주세요.',
        tone: 'error',
      });
    }
  };

  const handleSendReply = async () => {
    const replyContent = reply.trim();

    if (!inquiry.contact_email.trim()) {
      setActiveTab('reply');
      setCurrentNotice({
        message: '수신자 이메일이 없어 메일을 발송할 수 없습니다.',
        tone: 'error',
      });
      return;
    }

    if (!replyContent) {
      setActiveTab('reply');
      setCurrentNotice({
        message: '답변 내용을 입력한 뒤 발송해 주세요.',
        tone: 'error',
      });
      return;
    }

    try {
      setCurrentNotice(null);
      await sendReplyMutation.mutateAsync({
        inquiryId: inquiry.id,
        replyContent,
      });
      setCurrentNotice({
        message: '제휴 문의 답변 메일을 발송했습니다.',
        tone: 'success',
      });
    } catch (error) {
      setCurrentNotice({
        message:
          error instanceof Error
            ? error.message
            : '메일 발송 중 오류가 발생했습니다.',
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
            href={ROUTES.ADMIN.PARTNERSHIP.ROOT}
          >
            <ArrowLeft aria-hidden="true" size={14} />
            목록으로
          </Link>
          <div className={styles.navActions}>
            <NavInquiryButton
              inquiry={prevInquiry}
              label="이전"
              type="prev"
            />
            <NavInquiryButton
              inquiry={nextInquiry}
              label="다음"
              type="next"
            />
          </div>
        </div>
      </header>

      <article className={styles.companyCard}>
        <header className={styles.companyMeta}>
          <div className={styles.metaBadges}>
            <span
              className={`${styles.statusBadge} ${statusClassName}`}
            >
              {STATUS_LABEL[inquiry.status]}
            </span>
            <span
              className={`${styles.dealBadge} ${
                styles[`deal_${inquiry.partnership_type}`]
              }`}
            >
              {PARTNERSHIP_TYPE_LABEL[inquiry.partnership_type]}
            </span>
            <span className={styles.sizePill}>
              {COMPANY_SIZE_LABEL[inquiry.company_size]}
            </span>
          </div>
        </header>

        <div className={styles.companyHero}>
          <span aria-hidden="true" className={styles.companyAvatar}>
            {getInitial(inquiry.company_name)}
          </span>
          <div className={styles.companyInfo}>
            <h1 className={styles.companyName}>
              {inquiry.company_name}
            </h1>
            <p className={styles.companyMetaLine}>
              {inquiry.company_url ? (
                <a
                  className={styles.metaItem}
                  href={normalizeUrl(inquiry.company_url)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Globe aria-hidden="true" size={13} />
                  {inquiry.company_url}
                </a>
              ) : (
                <span className={styles.metaItem}>
                  <Globe aria-hidden="true" size={13} />
                  회사 URL 없음
                </span>
              )}
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span>
                {PARTNERSHIP_TYPE_LABEL[inquiry.partnership_type]}
              </span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span className={styles.metaItem}>
                <MapPin aria-hidden="true" size={13} />
                {COMPANY_SIZE_LABEL[inquiry.company_size]}
              </span>
            </p>
          </div>
        </div>

        <dl className={styles.companyGrid}>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>CONTACT</dt>
            <dd className={styles.gridValue}>
              <strong>{inquiry.contact_name}</strong>
              <span>{inquiry.contact_position || '-'}</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>이메일 / 전화</dt>
            <dd className={styles.gridValue}>
              <strong>{inquiry.contact_email}</strong>
              <span>{inquiry.contact_phone || '-'}</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>접수일</dt>
            <dd className={styles.gridValue}>
              <strong>{formatFullDate(inquiry.created_at)}</strong>
              <span>
                최근 변경 {formatFullDate(inquiry.updated_at)}
              </span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>첨부</dt>
            <dd className={styles.gridValue}>
              <strong>
                {inquiry.attachment_name || '첨부 없음'}
              </strong>
              <span>{formatAttachmentMeta(inquiry)}</span>
            </dd>
          </div>
        </dl>
      </article>

      <aside className={styles.slaCard}>
        <span aria-hidden="true" className={styles.slaIcon}>
          <Timer size={18} />
        </span>
        <div className={styles.slaBody}>
          <p className={styles.slaTitle}>{sla.title}</p>
          <p className={styles.slaMeta}>{sla.meta}</p>
        </div>
        <button
          className={styles.slaButton}
          onClick={() => setActiveTab('reply')}
          type="button"
        >
          회신하러 가기
        </button>
      </aside>

      {notice ? (
        <p
          className={`${styles.notice} ${
            notice.tone === 'success'
              ? styles.notice_success
              : styles.notice_error
          }`}
        >
          {notice.message}
        </p>
      ) : null}

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
            {tab.key === 'history' ? (
              <span className={styles.tabCount}>
                {activityLogs.length}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {activeTab === 'proposal' ? (
        <ProposalPanel inquiry={inquiry} memo={memo} />
      ) : null}
      {activeTab === 'reply' ? (
        <ReplyPanel
          canSendReply={
            canUpdateInquiry &&
            Boolean(inquiry.contact_email.trim()) &&
            Boolean(reply.trim())
          }
          inquiry={inquiry}
          isSending={sendReplyMutation.isPending}
          onCopy={handleCopyReply}
          onSend={handleSendReply}
          reply={reply}
          setReply={(value) =>
            setReplyDraft({ inquiryId: id, value })
          }
        />
      ) : null}
      {activeTab === 'history' ? (
        <HistoryPanel logs={activityLogs} />
      ) : null}
      {activeTab === 'memo' ? (
        <MemoPanel
          canSave={canUpdateInquiry}
          isSaving={updateMutation.isPending}
          memo={memo}
          onSave={handleMemoSave}
          setMemo={(value) => setMemoDraft({ inquiryId: id, value })}
        />
      ) : null}
    </div>
  );
}

function ProposalPanel({
  inquiry,
  memo,
}: {
  inquiry: IPartnershipInquiry;
  memo: string;
}) {
  const trimmedMemo = memo.trim();

  return (
    <article className={styles.proposalCard}>
      <header className={styles.proposalHeader}>
        <span aria-hidden="true" className={styles.proposalAvatar}>
          <Handshake size={14} />
        </span>
        <strong className={styles.proposalHeading}>
          제휴 제안 내용
        </strong>
      </header>

      <div className={styles.authorRow}>
        <span aria-hidden="true" className={styles.authorAvatar}>
          {getInitial(inquiry.contact_name)}
        </span>
        <div className={styles.authorInfo}>
          <strong>
            {inquiry.contact_name} ·{' '}
            {inquiry.contact_position || '직책 미입력'}
          </strong>
          <span>
            접수 {formatFullDate(inquiry.created_at)} ·{' '}
            {inquiry.contact_email}
          </span>
        </div>
      </div>

      <section className={styles.proposalSection}>
        <h2 className={styles.sectionTitle}>제휴 유형</h2>
        <p className={styles.sectionLead}>
          {PARTNERSHIP_TYPE_LABEL[inquiry.partnership_type]} ·{' '}
          {COMPANY_SIZE_LABEL[inquiry.company_size]}
        </p>
      </section>

      <section className={styles.proposalSection}>
        <h2 className={styles.sectionTitle}>제안 본문</h2>
        <div className={styles.sectionBody}>
          {inquiry.proposal_content
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={`${inquiry.id}-proposal-${index}`}>
                {paragraph}
              </p>
            ))}
        </div>
      </section>

      <section className={styles.proposalSection}>
        <h2 className={styles.sectionTitle}>내부 메모</h2>
        {trimmedMemo ? (
          <div className={styles.internalMemo}>
            {trimmedMemo.split(/\n{2,}/).map((paragraph, index) => (
              <p key={`${inquiry.id}-memo-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>작성된 내부 메모가 없습니다.</p>
        )}
      </section>

      <section className={styles.proposalSection}>
        <h2 className={styles.sectionTitle}>회사 정보</h2>
        <dl className={styles.infoList}>
          <div>
            <dt>회사명</dt>
            <dd>{inquiry.company_name}</dd>
          </div>
          <div>
            <dt>회사 규모</dt>
            <dd>{COMPANY_SIZE_LABEL[inquiry.company_size]}</dd>
          </div>
          <div>
            <dt>회사 URL</dt>
            <dd>
              {inquiry.company_url ? (
                <a
                  href={normalizeUrl(inquiry.company_url)}
                  rel="noreferrer"
                  target="_blank"
                >
                  {inquiry.company_url}
                  <ExternalLink aria-hidden="true" size={12} />
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{inquiry.contact_phone || '-'}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.proposalSection}>
        <h2 className={styles.sectionTitle}>첨부 자료</h2>
        {inquiry.attachment_url ? (
          <a
            className={styles.attachmentChip}
            href={inquiry.attachment_url}
            rel="noreferrer"
            target="_blank"
          >
            <Paperclip aria-hidden="true" size={12} />
            {inquiry.attachment_name || '첨부 파일'}
            <span>{formatAttachmentMeta(inquiry)}</span>
          </a>
        ) : (
          <p className={styles.emptyText}>첨부된 자료가 없습니다.</p>
        )}
      </section>
    </article>
  );
}

function ReplyPanel({
  canSendReply,
  inquiry,
  isSending,
  onCopy,
  onSend,
  reply,
  setReply,
}: {
  canSendReply: boolean;
  inquiry: IPartnershipInquiry;
  isSending: boolean;
  onCopy: () => void;
  onSend: () => void;
  reply: string;
  setReply: (value: string) => void;
}) {
  return (
    <article className={styles.composer}>
      <header className={styles.composerHeader}>
        <span aria-hidden="true" className={styles.composerAvatar}>
          <Mail size={14} />
        </span>
        <div className={styles.composerHeading}>
          <strong>회신 초안</strong>
          <span> · 메일 앱으로 발송</span>
        </div>
        <button
          className={styles.templateButton}
          onClick={onCopy}
          type="button"
        >
          <Copy aria-hidden="true" size={13} />
          초안 복사
        </button>
      </header>

      <dl className={styles.mailFields}>
        <div className={styles.mailRow}>
          <dt>TO</dt>
          <dd>
            {inquiry.contact_name} &lt;{inquiry.contact_email}&gt;
          </dd>
        </div>
        <div className={styles.mailRow}>
          <dt>FROM</dt>
          <dd>VisionFlow Admin &lt;partnership@visionflow.kr&gt;</dd>
        </div>
        <div className={styles.mailRow}>
          <dt>SUBJ</dt>
          <dd>Re: {inquiry.company_name} 제휴 문의</dd>
        </div>
      </dl>

      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>회신 내용</span>
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
          발송 전 수신자와 제휴 조건을 다시 확인해 주세요.
        </p>
        <div className={styles.composerActions}>
          <button
            className={styles.submitButton}
            disabled={!canSendReply || isSending}
            onClick={onSend}
            type="button"
          >
            <Send aria-hidden="true" size={14} />
            {isSending ? '발송 중' : '메일 발송'}
          </button>
        </div>
      </footer>
    </article>
  );
}

function HistoryPanel({ logs }: { logs: ActivityLogEntry[] }) {
  return (
    <article className={styles.infoCard}>
      <header className={styles.infoHeader}>
        <Clock3 aria-hidden="true" size={16} />
        <strong>처리 히스토리</strong>
      </header>
      <ol className={styles.logList}>
        {logs.map((log) => {
          const Icon = log.icon;
          return (
            <li key={`${log.label}-${log.time}`}>
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

function MemoPanel({
  canSave,
  isSaving,
  memo,
  onSave,
  setMemo,
}: {
  canSave: boolean;
  isSaving: boolean;
  memo: string;
  onSave: () => void;
  setMemo: (value: string) => void;
}) {
  return (
    <article className={styles.memoCard}>
      <header className={styles.infoHeader}>
        <FileText aria-hidden="true" size={16} />
        <strong>내부 메모</strong>
      </header>
      <textarea
        className={styles.memoEditor}
        disabled={!canSave || isSaving}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="검토 의견, 담당자 확인 사항, 후속 액션을 남겨 주세요."
        rows={8}
        value={memo}
      />
      <footer className={styles.memoFooter}>
        <p className={styles.policyText}>
          내부 메모는 관리자 화면에서만 사용됩니다.
        </p>
        <button
          className={styles.submitButton}
          disabled={!canSave || isSaving}
          onClick={onSave}
          type="button"
        >
          <Save aria-hidden="true" size={14} />
          {isSaving ? '저장 중' : '메모 저장'}
        </button>
      </footer>
    </article>
  );
}

function NavInquiryButton({
  inquiry,
  label,
  type,
}: {
  inquiry: IPartnershipInquiry | null;
  label: string;
  type: 'next' | 'prev';
}) {
  const Icon = type === 'prev' ? ChevronUp : ChevronDown;

  if (!inquiry) {
    return (
      <button className={styles.navButton} disabled type="button">
        {type === 'prev' ? (
          <Icon aria-hidden="true" size={14} />
        ) : null}
        {label}
        {type === 'next' ? (
          <Icon aria-hidden="true" size={14} />
        ) : null}
      </button>
    );
  }

  return (
    <Link
      className={styles.navButton}
      href={ROUTES.ADMIN.PARTNERSHIP.DETAIL(inquiry.id)}
    >
      {type === 'prev' ? <Icon aria-hidden="true" size={14} /> : null}
      {label}
      {type === 'next' ? <Icon aria-hidden="true" size={14} /> : null}
    </Link>
  );
}

function getActivityLogs(
  inquiry: IPartnershipInquiry,
): ActivityLogEntry[] {
  const logs: ActivityLogEntry[] = [
    {
      icon: Mail,
      label: '제휴 문의 접수',
      time: formatFullDate(inquiry.created_at),
    },
    {
      icon: Clock3,
      label: `${STATUS_LABEL[inquiry.status]} 상태`,
      time: formatFullDate(inquiry.updated_at),
    },
  ];

  if (inquiry.admin_memo?.trim()) {
    logs.push({
      icon: FileText,
      label: '내부 메모 작성됨',
      time: formatFullDate(inquiry.updated_at),
    });
  }

  if (inquiry.status === 'approved') {
    logs.push({
      icon: Check,
      label: '제휴 검토 승인',
      time: formatFullDate(inquiry.updated_at),
    });
  }

  return logs;
}

function createReplyTemplate(inquiry: IPartnershipInquiry) {
  return [
    `안녕하세요, ${inquiry.contact_name}님.`,
    '',
    'VisionFlow에 제휴 제안을 보내주셔서 감사합니다.',
    `${inquiry.company_name}에서 제안해 주신 ${PARTNERSHIP_TYPE_LABEL[inquiry.partnership_type]} 내용을 확인했습니다.`,
    '',
    '내부 검토를 위해 아래 사항을 추가로 확인하고 싶습니다.',
    '- 제휴 진행 시 기대하는 역할과 책임 범위',
    '- 예상 일정 및 우선 협의가 필요한 조건',
    '- 미팅 가능 일정 2-3개',
    '',
    '가능하신 일정을 회신해 주시면 담당자가 이어서 조율드리겠습니다.',
    '',
    '감사합니다.',
    'VisionFlow 드림',
  ].join('\n');
}

function getSlaText(inquiry: IPartnershipInquiry) {
  if (
    inquiry.status === 'approved' ||
    inquiry.status === 'rejected'
  ) {
    return {
      meta: `마지막 변경 ${formatFullDate(inquiry.updated_at)}`,
      title: '검토가 종료된 제휴 문의입니다.',
    };
  }

  const createdAt = new Date(inquiry.created_at).getTime();
  if (Number.isNaN(createdAt)) {
    return {
      meta: '접수일을 확인할 수 없어 수동 확인이 필요합니다.',
      title: 'SLA 확인 필요',
    };
  }

  const dueAt = createdAt + 72 * 60 * 60 * 1000;
  const diffHours = Math.ceil((dueAt - Date.now()) / 3600000);

  if (diffHours <= 0) {
    return {
      meta: '72시간 응답 기준을 초과했습니다.',
      title: 'SLA 1차 응답 기한 초과',
    };
  }

  return {
    meta: '제휴 문의 SLA 72시간 · 미처리 상태 자동 확인 필요',
    title: `SLA 1차 응답 마감까지 ${diffHours}시간`,
  };
}

function getInitial(value?: string) {
  return value?.trim().slice(0, 1).toUpperCase() || '?';
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

function formatAttachmentMeta(inquiry: IPartnershipInquiry) {
  if (!inquiry.attachment_url) {
    return '-';
  }

  const parts = [
    inquiry.attachment_type,
    inquiry.attachment_size
      ? formatFileSize(inquiry.attachment_size)
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : '파일 보기 가능';
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '-';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
