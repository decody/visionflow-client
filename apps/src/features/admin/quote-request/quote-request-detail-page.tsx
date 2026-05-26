'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  IQuoteInquiry,
  QuoteInquiryStatus,
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
  Mail,
  Paperclip,
  Save,
  Send,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button, Input, InputNumber, Select, Table, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import { useTopbar } from '@/components/layout/topbar-context';
import Loading from '@/components/loading/page';
import {
  useQuoteRequestListQuery,
  useUpdateQuoteRequestMutation,
} from '@/hooks/admin/contact/quote/useQuoteRequestQuery';
import { useSendQuoteMutation } from '@/hooks/admin/contact/quote/useSendQuoteMutation';
import { useCurrentUserRole } from '@/hooks/use-current-user-role';
import { canManageContent } from '@/lib/admin-permissions';
import styles from './quote-request-detail-page.module.css';

type DetailTab = 'request' | 'quote' | 'history' | 'memo';
type QuoteLine = {
  description: string;
  key: string;
  qty: number;
  title: string;
  unitPrice: number;
};
type ActivityLogEntry = {
  icon: LucideIcon;
  label: string;
  time: string;
};

const STATUS_LABEL: Record<QuoteInquiryStatus, string> = {
  approved: '수주',
  pending: '신규',
  rejected: '종료',
  reviewing: '검토/발송',
};

const STATUS_OPTIONS: { label: string; value: QuoteInquiryStatus }[] = [
  { label: '신규', value: 'pending' },
  { label: '검토/발송', value: 'reviewing' },
  { label: '수주', value: 'approved' },
  { label: '종료', value: 'rejected' },
];

const TABS: ReadonlyArray<{ key: DetailTab; label: string }> = [
  { key: 'request', label: '요청 본문' },
  { key: 'quote', label: '견적서 작성' },
  { key: 'history', label: '히스토리' },
  { key: 'memo', label: '내부 메모' },
];

export function QuoteRequestDetailPage({ id }: { id: string }) {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<DetailTab>('request');
  const [memoDraft, setMemoDraft] = useState<{
    inquiryId: string;
    value: string;
  } | null>(null);
  const [quoteIntro, setQuoteIntro] = useState(
    '안녕하세요. VisionFlow입니다.\n요청해주신 내용을 기준으로 1차 견적을 전달드립니다.',
  );
  const [quoteNote, setQuoteNote] = useState(
    '상세 범위 확정 후 금액과 일정은 조정될 수 있습니다. VAT는 별도입니다.',
  );
  const [validDays, setValidDays] = useState(14);
  const [lines, setLines] = useState<QuoteLine[]>([
    {
      description: '요구사항 정리, 화면/기능 범위 산정, 일정 계획',
      key: 'scope',
      qty: 1,
      title: '프로젝트 범위 설계',
      unitPrice: 800000,
    },
    {
      description: '핵심 화면 제작 및 데이터/콘텐츠 연동',
      key: 'build',
      qty: 1,
      title: '제작 및 구현',
      unitPrice: 3200000,
    },
  ]);

  const role = useCurrentUserRole();
  const canUpdate = canManageContent(role);
  const { data, isLoading } = useQuoteRequestListQuery();
  const updateMutation = useUpdateQuoteRequestMutation();
  const sendQuoteMutation = useSendQuoteMutation();

  const requestList = useMemo(
    () =>
      (Array.isArray(data) ? data : []).sort(
        (a, b) =>
          getCreatedAtTime(b.created_at) - getCreatedAtTime(a.created_at),
      ),
    [data],
  );
  const requestIndex = requestList.findIndex((row) => String(row.id) === id);
  const request = requestIndex >= 0 ? requestList[requestIndex] ?? null : null;
  const prevRequest =
    requestIndex > 0 ? requestList[requestIndex - 1] ?? null : null;
  const nextRequest =
    requestIndex >= 0 && requestIndex < requestList.length - 1
      ? requestList[requestIndex + 1] ?? null
      : null;
  const meta = useMemo(
    () => (request ? getQuoteMeta(request) : null),
    [request],
  );
  const memo =
    memoDraft?.inquiryId === id ? memoDraft.value : request?.admin_memo ?? '';
  const subtotal = lines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0,
  );
  const quoteContent = request
    ? buildQuoteEmail({
        intro: quoteIntro,
        lines,
        note: quoteNote,
        request,
        validDays,
      })
    : '';
  const visibleTabs = canUpdate
    ? TABS
    : TABS.filter((tab) => tab.key !== 'quote' && tab.key !== 'memo');
  const effectiveActiveTab = visibleTabs.some((tab) => tab.key === activeTab)
    ? activeTab
    : 'request';

  useTopbar(
    () => ({
      breadcrumb: [
        { href: ROUTES.ADMIN.HOME, label: '대시보드' },
        { label: '고객 문의' },
        {
          href: ROUTES.ADMIN.QUOTE_REQUEST.ROOT,
          label: '견적 문의',
        },
        { label: request?.company_name ?? '' },
      ],
    }),
    [request],
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!request || !meta) {
    return (
      <div className={styles.page}>
        <Link className={styles.backLink} href={ROUTES.ADMIN.QUOTE_REQUEST.ROOT}>
          <ArrowLeft aria-hidden="true" size={14} />
          목록으로
        </Link>
        <article className={styles.requestCard}>
          <h1>견적 문의를 찾을 수 없습니다.</h1>
          <p>삭제되었거나 잘못된 주소일 수 있습니다.</p>
        </article>
      </div>
    );
  }

  const logs = getActivityLogs(request);
  const sla = getSlaText(request);

  const handleStatusChange = async (status: QuoteInquiryStatus) => {
    try {
      await updateMutation.mutateAsync({ id: request.id, status });
      messageApi.success('상태를 변경했습니다.');
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '상태 변경에 실패했습니다.',
      );
    }
  };

  const handleMemoSave = async () => {
    try {
      await updateMutation.mutateAsync({
        admin_memo: memo,
        id: request.id,
      });
      messageApi.success('내부 메모를 저장했습니다.');
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '메모 저장에 실패했습니다.',
      );
    }
  };

  const handleCopyQuote = async () => {
    try {
      await navigator.clipboard.writeText(quoteContent);
      messageApi.success('견적서 내용을 복사했습니다.');
    } catch {
      messageApi.error('클립보드 권한을 확인해 주세요.');
    }
  };

  const handleSendQuote = async () => {
    if (!quoteContent.trim()) {
      messageApi.error('발송할 견적서 내용이 없습니다.');
      return;
    }

    try {
      await sendQuoteMutation.mutateAsync({
        inquiryId: request.id,
        quoteContent,
      });
      messageApi.success('견적서를 발송했습니다.');
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '견적서 발송에 실패했습니다.',
      );
    }
  };

  return (
    <div className={styles.page}>
      {contextHolder}
      <header className={styles.pageHeader}>
        <div className={styles.pageNav}>
          <Link className={styles.backLink} href={ROUTES.ADMIN.QUOTE_REQUEST.ROOT}>
            <ArrowLeft aria-hidden="true" size={14} />
            목록으로
          </Link>
          <div className={styles.navActions}>
            <NavRequestButton label="이전" request={prevRequest} type="prev" />
            <NavRequestButton label="다음" request={nextRequest} type="next" />
          </div>
        </div>
      </header>

      <article className={styles.companyCard}>
        <header className={styles.companyMeta}>
          <div className={styles.metaBadges}>
            <span className={styles.idBadge}>#{request.id}</span>
            <span className={styles.status_new}>{STATUS_LABEL[request.status]}</span>
            <span className={styles.servicePill}>{meta.service || '서비스 미정'}</span>
            <span className={styles.sizePill}>{meta.scale}</span>
          </div>
          {canUpdate ? (
            <Select<QuoteInquiryStatus>
              onChange={(status) => void handleStatusChange(status)}
              options={STATUS_OPTIONS}
              popupMatchSelectWidth={false}
              value={request.status}
            />
          ) : null}
        </header>

        <div className={styles.companyHero}>
          <span aria-hidden="true" className={styles.companyAvatar}>
            {getInitial(request.company_name)}
          </span>
          <div className={styles.companyInfo}>
            <h1 className={styles.companyName}>{request.company_name}</h1>
            <p className={styles.companyMetaLine}>
              {request.reference_urls[0] ? (
                <a
                  className={styles.metaItem}
                  href={normalizeUrl(request.reference_urls[0])}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Globe aria-hidden="true" size={13} />
                  {request.reference_urls[0]}
                  <ExternalLink aria-hidden="true" size={12} />
                </a>
              ) : (
                <span className={styles.metaItem}>
                  <Globe aria-hidden="true" size={13} />
                  참고 URL 없음
                </span>
              )}
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span>{meta.scale || '규모 미정'}</span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span>{meta.timeline || '일정 미정'}</span>
            </p>
          </div>
        </div>

        <dl className={styles.companyGrid}>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>CONTACT</dt>
            <dd className={styles.gridValue}>
              <strong>{request.contact_name}</strong>
              <span>{request.position || '-'}</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>EMAIL / PHONE</dt>
            <dd className={styles.gridValue}>
              <strong>{request.email}</strong>
              <span>{request.phone || '-'}</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>응답 채널</dt>
            <dd className={styles.gridValue}>
              <strong>{meta.responseChannel || '-'}</strong>
              <span>마케팅 동의 {request.marketing_agreed ? 'Y' : 'N'}</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>접수일</dt>
            <dd className={styles.gridValue}>
              <strong>{formatFullDate(request.created_at)}</strong>
              <span>수정 {formatFullDate(request.updated_at)}</span>
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
        {canUpdate ? (
          <div className={styles.slaActions}>
            <button
              className={styles.slaSecondary}
              onClick={() => setActiveTab('quote')}
              type="button"
            >
              견적 작성
            </button>
            <button
              className={styles.slaButton}
              disabled={sendQuoteMutation.isPending}
              onClick={() => void handleSendQuote()}
              type="button"
            >
              <Send aria-hidden="true" size={14} />
              {sendQuoteMutation.isPending ? '발송 중' : '견적서 발송'}
            </button>
          </div>
        ) : null}
      </aside>

      <Tabs
        activeKey={effectiveActiveTab}
        className={styles.detailTabs}
        items={visibleTabs.map((tab) => ({
          key: tab.key,
          label:
            tab.key === 'history'
              ? `${tab.label} ${logs.length}`
              : tab.label,
        }))}
        onChange={(key) => setActiveTab(key as DetailTab)}
      />

      {effectiveActiveTab === 'request' ? (
        <RequestPanel meta={meta} request={request} />
      ) : null}
      {effectiveActiveTab === 'quote' ? (
        <QuotePanel
          canSend={canUpdate && Boolean(request.email.trim())}
          intro={quoteIntro}
          isSending={sendQuoteMutation.isPending}
          lines={lines}
          note={quoteNote}
          onCopy={handleCopyQuote}
          onIntroChange={setQuoteIntro}
          onLinesChange={setLines}
          onNoteChange={setQuoteNote}
          onSend={handleSendQuote}
          preview={quoteContent}
          subtotal={subtotal}
          validDays={validDays}
          onValidDaysChange={setValidDays}
        />
      ) : null}
      {effectiveActiveTab === 'history' ? <HistoryPanel logs={logs} /> : null}
      {effectiveActiveTab === 'memo' ? (
        <MemoPanel
          canSave={canUpdate}
          isSaving={updateMutation.isPending}
          memo={memo}
          onSave={handleMemoSave}
          setMemo={(value) => setMemoDraft({ inquiryId: id, value })}
        />
      ) : null}
    </div>
  );
}

function RequestPanel({
  meta,
  request,
}: {
  meta: ReturnType<typeof getQuoteMeta>;
  request: IQuoteInquiry;
}) {
  return (
    <article className={styles.requestCard}>
      <header className={styles.requestHeader}>
        <span aria-hidden="true" className={styles.requestAvatar}>
          <FileText size={14} />
        </span>
        <strong className={styles.requestHeading}>견적 요청 내용</strong>
      </header>
      <div className={styles.authorRow}>
        <span aria-hidden="true" className={styles.authorAvatar}>
          {getInitial(request.contact_name)}
        </span>
        <div className={styles.authorInfo}>
          <strong>
            {request.contact_name} · {request.position || '담당자'}
          </strong>
          <span>
            접수 {formatFullDate(request.created_at)} · {request.email}
          </span>
        </div>
      </div>
      <section className={styles.requestSection}>
        <h2 className={styles.sectionTitle}>프로젝트 요약</h2>
        <p className={styles.sectionLead}>
          {meta.service || '-'} · {meta.scale || '-'} · {meta.timeline || '-'}
        </p>
      </section>
      <section className={styles.requestSection}>
        <h2 className={styles.sectionTitle}>프로젝트 설명</h2>
        <div className={styles.sectionBody}>
          {splitParagraphs(meta.detail).map((paragraph, index) => (
            <p key={`${request.id}-detail-${index}`}>{paragraph}</p>
          ))}
        </div>
      </section>
      <section className={styles.requestSection}>
        <h2 className={styles.sectionTitle}>원문</h2>
        <pre className={styles.rawContent}>{formatRawQuote(request)}</pre>
      </section>
      <section className={styles.requestSection}>
        <h2 className={styles.sectionTitle}>첨부</h2>
        {request.attached_files.length > 0 ? (
          request.attached_files.map((file, index) => (
            <span className={styles.attachmentChip} key={`${request.id}-${index}`}>
              <Paperclip aria-hidden="true" size={12} />
              {String(file)}
            </span>
          ))
        ) : (
          <p className={styles.sectionBody}>첨부 파일이 없습니다.</p>
        )}
      </section>
    </article>
  );
}

function QuotePanel({
  canSend,
  intro,
  isSending,
  lines,
  note,
  onCopy,
  onIntroChange,
  onLinesChange,
  onNoteChange,
  onSend,
  onValidDaysChange,
  preview,
  subtotal,
  validDays,
}: {
  canSend: boolean;
  intro: string;
  isSending: boolean;
  lines: QuoteLine[];
  note: string;
  onCopy: () => void;
  onIntroChange: (value: string) => void;
  onLinesChange: (value: QuoteLine[]) => void;
  onNoteChange: (value: string) => void;
  onSend: () => void;
  onValidDaysChange: (value: number) => void;
  preview: string;
  subtotal: number;
  validDays: number;
}) {
  const columns: ColumnsType<QuoteLine> = [
    {
      dataIndex: 'title',
      render: (_, record) => (
        <div className={styles.lineEdit}>
          <Input
            onChange={(event) =>
              updateLine(record.key, { title: event.target.value })
            }
            placeholder="항목명"
            value={record.title}
          />
          <Input
            onChange={(event) =>
              updateLine(record.key, { description: event.target.value })
            }
            placeholder="설명"
            value={record.description}
          />
        </div>
      ),
      title: '항목',
    },
    {
      dataIndex: 'qty',
      render: (_, record) => (
        <InputNumber
          min={1}
          onChange={(value) => updateLine(record.key, { qty: value ?? 1 })}
          value={record.qty}
        />
      ),
      title: '수량',
      width: 110,
    },
    {
      dataIndex: 'unitPrice',
      render: (_, record) => (
        <InputNumber
          min={0}
          onChange={(value) =>
            updateLine(record.key, { unitPrice: value ?? 0 })
          }
          step={100000}
          value={record.unitPrice}
        />
      ),
      title: '단가',
      width: 160,
    },
    {
      render: (_, record) => formatCurrency(record.qty * record.unitPrice),
      title: '합계',
      width: 140,
    },
    {
      render: (_, record) => (
        <Button
          disabled={lines.length <= 1}
          onClick={() =>
            onLinesChange(lines.filter((line) => line.key !== record.key))
          }
          size="small"
        >
          삭제
        </Button>
      ),
      width: 90,
    },
  ];

  function updateLine(key: string, patch: Partial<QuoteLine>) {
    onLinesChange(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  return (
    <div className={styles.contentGrid}>
      <article className={styles.quoteBuilder}>
        <header className={styles.quoteHeader}>
          <span aria-hidden="true" className={styles.quoteAvatar}>
            Q
          </span>
          <div className={styles.quoteHeading}>
            <strong>견적서 작성</strong>
            <span> · 이메일 본문으로 발송됩니다</span>
          </div>
          <button className={styles.templateButton} onClick={onCopy} type="button">
            <Copy aria-hidden="true" size={13} />
            내용 복사
          </button>
        </header>
        <div className={styles.quoteForm}>
          <label className={styles.formField}>
            <span>인사말</span>
            <Input.TextArea
              onChange={(event) => onIntroChange(event.target.value)}
              rows={3}
              value={intro}
            />
          </label>
          <label className={styles.formField}>
            <span>견적 유효기간</span>
            <InputNumber
              min={1}
              onChange={(value) => onValidDaysChange(value ?? 14)}
              value={validDays}
            />
          </label>
          <Table<QuoteLine>
            columns={columns}
            dataSource={lines}
            pagination={false}
            rowKey="key"
            size="small"
          />
          <Button
            onClick={() =>
              onLinesChange([
                ...lines,
                {
                  description: '',
                  key: crypto.randomUUID(),
                  qty: 1,
                  title: '',
                  unitPrice: 0,
                },
              ])
            }
          >
            항목 추가
          </Button>
          <label className={styles.formField}>
            <span>비고</span>
            <Input.TextArea
              onChange={(event) => onNoteChange(event.target.value)}
              rows={3}
              value={note}
            />
          </label>
          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>공급가</dt>
              <dd>{formatCurrency(subtotal)}</dd>
            </div>
            <div className={styles.totalRow}>
              <dt>VAT 10%</dt>
              <dd>{formatCurrency(Math.round(subtotal * 0.1))}</dd>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <dt>총액</dt>
              <dd>{formatCurrency(Math.round(subtotal * 1.1))}</dd>
            </div>
          </dl>
          <footer className={styles.quoteFooter}>
            <p className={styles.policyText}>
              발송 전 수신자, 금액, 유효기간을 다시 확인해 주세요.
            </p>
            <button
              className={styles.submitButton}
              disabled={!canSend || isSending}
              onClick={onSend}
              type="button"
            >
              <Send aria-hidden="true" size={14} />
              {isSending ? '발송 중' : '견적서 발송'}
            </button>
          </footer>
        </div>
      </article>
      <article className={styles.requestCard}>
        <header className={styles.requestHeader}>
          <span aria-hidden="true" className={styles.requestAvatar}>
            <Mail size={14} />
          </span>
          <strong className={styles.requestHeading}>발송 미리보기</strong>
        </header>
        <pre className={styles.previewBox}>{preview}</pre>
      </article>
    </div>
  );
}

function HistoryPanel({ logs }: { logs: ActivityLogEntry[] }) {
  return (
    <article className={styles.requestCard}>
      <header className={styles.requestHeader}>
        <Clock3 aria-hidden="true" size={16} />
        <strong className={styles.requestHeading}>처리 히스토리</strong>
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
    <article className={styles.requestCard}>
      <header className={styles.requestHeader}>
        <FileText aria-hidden="true" size={16} />
        <strong className={styles.requestHeading}>내부 메모</strong>
      </header>
      <textarea
        className={styles.memoEditor}
        disabled={!canSave || isSaving}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="검토 의견, 통화 내용, 다음 액션을 남겨주세요."
        rows={10}
        value={memo}
      />
      <footer className={styles.quoteFooter}>
        <p className={styles.policyText}>내부 메모는 관리자 화면에서만 사용합니다.</p>
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

function NavRequestButton({
  label,
  request,
  type,
}: {
  label: string;
  request: IQuoteInquiry | null;
  type: 'next' | 'prev';
}) {
  const Icon = type === 'prev' ? ChevronUp : ChevronDown;

  if (!request) {
    return (
      <button className={styles.navButton} disabled type="button">
        {type === 'prev' ? <Icon aria-hidden="true" size={14} /> : null}
        {label}
        {type === 'next' ? <Icon aria-hidden="true" size={14} /> : null}
      </button>
    );
  }

  return (
    <Link className={styles.navButton} href={ROUTES.ADMIN.QUOTE_REQUEST.DETAIL(request.id)}>
      {type === 'prev' ? <Icon aria-hidden="true" size={14} /> : null}
      {label}
      {type === 'next' ? <Icon aria-hidden="true" size={14} /> : null}
    </Link>
  );
}

function getQuoteMeta(request: IQuoteInquiry) {
  return {
    detail: request.project_description,
    responseChannel: request.preferred_contact_methods
      .map(formatContactMethod)
      .join(', '),
    scale: formatProjectScale(request.project_scale),
    service: request.service_categories.map(formatServiceCategory).join(', '),
    timeline: formatStartDate(request.preferred_start_date),
  };
}

function formatRawQuote(request: IQuoteInquiry) {
  return [
    `[견적 요청 #${request.id}]`,
    `서비스: ${request.service_categories.map(formatServiceCategory).join(', ')}`,
    `프로젝트 규모: ${formatProjectScale(request.project_scale)}`,
    `희망 시작 시기: ${formatStartDate(request.preferred_start_date)}`,
    `선호 응답 채널: ${request.preferred_contact_methods
      .map(formatContactMethod)
      .join(', ')}`,
    '',
    '[프로젝트 설명]',
    request.project_description,
    '',
    '[참고 URL]',
    request.reference_urls.length > 0 ? request.reference_urls.join('\n') : '없음',
    '',
    '[개인정보 동의]',
    `필수 동의: ${request.privacy_agreed ? 'Y' : 'N'}`,
    `마케팅 동의: ${request.marketing_agreed ? 'Y' : 'N'}`,
  ].join('\n');
}

function formatServiceCategory(value: string) {
  const labels: Record<string, string> = {
    '3d': '웹 3D',
    ad_image: '광고 이미지',
    dashboard: '데이터 대시보드',
    web_app: '웹·앱 개발',
    web_dev: '웹 개발',
  };

  return labels[value] ?? value;
}

function formatProjectScale(value: string) {
  const labels: Record<string, string> = {
    large: '대형',
    medium: '중형',
    small: '소형',
  };

  return labels[value] ?? value;
}

function formatStartDate(value: string) {
  const labels: Record<string, string> = {
    '1month': '1개월 내',
    '3months': '3개월 내',
    asap: 'ASAP',
    open: '미정',
  };

  return labels[value] ?? value;
}

function formatContactMethod(value: string) {
  const labels: Record<string, string> = {
    email: '이메일',
    kakao: '카카오톡',
    meeting: '화상미팅',
    phone: '전화',
  };

  return labels[value] ?? value;
}

function buildQuoteEmail({
  intro,
  lines,
  note,
  request,
  validDays,
}: {
  intro: string;
  lines: QuoteLine[];
  note: string;
  request: IQuoteInquiry;
  validDays: number;
}) {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0,
  );
  const itemText = lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.title || '항목'}\n   - ${line.description || '-'}\n   - 수량 ${line.qty} / 단가 ${formatCurrency(line.unitPrice)} / 합계 ${formatCurrency(line.qty * line.unitPrice)}`,
    )
    .join('\n\n');

  return [
    `${request.contact_name}님,`,
    '',
    intro.trim(),
    '',
    `[견적 개요]`,
    `회사명: ${request.company_name}`,
    `요청 서비스: ${request.service_categories.map(formatServiceCategory).join(', ')}`,
    `프로젝트 규모: ${formatProjectScale(request.project_scale)}`,
    `견적 유효기간: 발송일로부터 ${validDays}일`,
    '',
    `[세부 항목]`,
    itemText,
    '',
    `[금액]`,
    `공급가: ${formatCurrency(subtotal)}`,
    `VAT 10%: ${formatCurrency(Math.round(subtotal * 0.1))}`,
    `총액: ${formatCurrency(Math.round(subtotal * 1.1))}`,
    '',
    `[비고]`,
    note.trim(),
    '',
    '감사합니다.',
    'VisionFlow 드림',
  ].join('\n');
}

function getActivityLogs(request: IQuoteInquiry): ActivityLogEntry[] {
  const logs: ActivityLogEntry[] = [
    {
      icon: Mail,
      label: '견적 문의 접수',
      time: formatFullDate(request.created_at),
    },
    {
      icon: Clock3,
      label: `${STATUS_LABEL[request.status]} 상태`,
      time: formatFullDate(request.updated_at),
    },
  ];

  if (request.admin_memo?.includes('[견적 발송]')) {
    logs.push({
      icon: Send,
      label: '견적서 발송 이력 있음',
      time: formatFullDate(request.updated_at),
    });
  }

  if (request.admin_memo?.trim()) {
    logs.push({
      icon: FileText,
      label: '내부 메모 작성됨',
      time: formatFullDate(request.updated_at),
    });
  }

  if (request.status === 'approved') {
    logs.push({
      icon: Check,
      label: '수주 처리',
      time: formatFullDate(request.updated_at),
    });
  }

  return logs;
}

function getSlaText(request: IQuoteInquiry) {
  if (request.status === 'approved' || request.status === 'rejected') {
    return {
      meta: `마지막 변경 ${formatFullDate(request.updated_at)}`,
      title: '처리가 완료된 견적 문의입니다.',
    };
  }

  const createdAt = new Date(request.created_at).getTime();
  if (Number.isNaN(createdAt)) {
    return {
      meta: '접수일을 확인할 수 없어 수동 확인이 필요합니다.',
      title: 'SLA 확인 필요',
    };
  }

  const dueAt = createdAt + 24 * 60 * 60 * 1000;
  const diffHours = Math.ceil((dueAt - Date.now()) / 3600000);

  if (diffHours <= 0) {
    return {
      meta: '24시간 1차 응답 기준을 초과했습니다.',
      title: 'SLA 1차 응답 기한 초과',
    };
  }

  return {
    meta: '견적 문의 SLA 24시간 · 미처리 상태 확인 필요',
    title: `SLA 1차 응답 마감까지 ${diffHours}시간`,
  };
}

function splitParagraphs(value: string) {
  const paragraphs = value.split(/\n{2,}/).filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : ['-'];
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    currency: 'KRW',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

