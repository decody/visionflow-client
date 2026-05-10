'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreHorizontal,
  Paperclip,
  Quote,
  Strikethrough,
  Timer,
  Underline,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import styles from './qna-detail-page.module.css';

const ATTACHMENTS = [
  { label: 'brand-guide-v2.pdf', size: '2.4MB' },
  { label: 'reference-mood.zip', size: '18MB' },
];

const TABS = [
  { count: null, key: 'body' as const, label: '본문' },
  { count: null, key: 'compose' as const, label: '답변 작성' },
  { count: 12, key: 'log' as const, label: '작업 로그' },
];

const TOOLBAR_GROUPS = [
  [
    { icon: Bold, label: 'Bold' },
    { icon: Italic, label: 'Italic' },
    { icon: Underline, label: 'Underline' },
    { icon: Strikethrough, label: 'Strike' },
  ],
  [
    { icon: Heading1, label: 'H1' },
    { icon: Heading2, label: 'H2' },
    { icon: Heading3, label: 'H3' },
  ],
  [
    { icon: List, label: '글머리 기호' },
    { icon: ListOrdered, label: '번호 매기기' },
  ],
  [
    { icon: Link2, label: '링크' },
    { icon: ImageIcon, label: '이미지' },
    { icon: Paperclip, label: '첨부' },
    { icon: Code2, label: '코드' },
    { icon: Quote, label: '인용' },
  ],
];

const SAMPLE_REPLY = `윤서연 님, 안녕하세요. VisionFlow Brand Lead 김민지입니다.

제품 광고 30컷 + Brand LoRA 학습 + 4채널 동시 운영 시나리오로 견적을 정리해 드리겠습니다. 6월 첫째 주 런칭이라면 기획·학습·양산을 역산해 5월 둘째 주에 학습 데이터 NDA 서명이 필요합니다.

## 견적 개요

- 컷 30컷 (4K 고해상도) · LoRA 학습 1회 · 4채널 변환 (네이버/카카오/인스타/구글)
- 납기: 학습 1주 + 양산 2주 = 총 **3주**
- 예상 비용: LoRA 학습 ₩300만 + 양산 ₩400만 = **합계 ₩700만 (VAT 별도)**
- 다음 단계: 1시간 디스커버리 미팅 제안드립니다. 5/12 (월) 또는 5/14 (수) 가능하신지요?`;

export function QnaDetailPage({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<'body' | 'compose' | 'log'>('compose');
  const [reply, setReply] = useState(SAMPLE_REPLY);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.breadcrumb}>
          <span>대시보드</span>
          <span aria-hidden="true">/</span>
          <span>인박스</span>
          <span aria-hidden="true">/</span>
          <Link href={ROUTES.ADMIN.QNA.ROOT}>Q&amp;A 게시판</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>#{id}</span>
        </p>

        <div className={styles.pageNav}>
          <Link className={styles.backLink} href={ROUTES.ADMIN.QNA.ROOT}>
            <ArrowLeft aria-hidden="true" size={14} />
            목록으로
          </Link>
          <div className={styles.navActions}>
            <button className={styles.navButton} type="button">
              <ChevronUp aria-hidden="true" size={14} />
              이전
            </button>
            <button className={styles.navButton} type="button">
              다음
              <ChevronDown aria-hidden="true" size={14} />
            </button>
            <button aria-label="더보기" className={styles.iconButton} type="button">
              <MoreHorizontal aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
      </header>

      <article className={styles.questionCard}>
        <header className={styles.questionMeta}>
          <div className={styles.metaBadges}>
            <span className={styles.idBadge}>#{id}</span>
            <span className={styles.statusPending}>답변 대기</span>
            <span className={styles.categoryPill}>광고 이미지</span>
          </div>
          <button className={styles.statusChange} type="button">
            상태 변경
            <ChevronDown aria-hidden="true" size={14} />
          </button>
        </header>

        <h1 className={styles.questionTitle}>제품 광고 이미지 30컷 견적 문의드립니다</h1>

        <div className={styles.authorRow}>
          <span aria-hidden="true" className={styles.avatar}>
            윤
          </span>
          <div className={styles.authorInfo}>
            <strong>윤서연 · Brand K</strong>
            <span>오늘 14:32 작성 · IP 211.234.xxx.xxx · 🔒 비밀글 아님</span>
          </div>
        </div>

        <div className={styles.questionBody}>
          <p>
            시즌 캠페인용으로 제품 광고 이미지 30컷이 필요한데, Brand LoRA 학습이 가능한지
            궁금합니다. 톤 일관성이 가장 중요한 부분이고, 채널은 네이버 · 카카오 · 인스타 · 구글
            4채널 동시 운영입니다. 일정은 6월 첫째 주 런칭이며, 학습 데이터는 NDA 체결 후 사내
            자료 100여 점 제공 가능합니다.
          </p>
        </div>

        <footer className={styles.attachmentsRow}>
          <span className={styles.attachmentsLabel}>첨부:</span>
          {ATTACHMENTS.map((file) => (
            <a className={styles.attachmentChip} href="#" key={file.label}>
              <Paperclip aria-hidden="true" size={12} />
              {file.label}
              <span className={styles.attachmentSize}>· {file.size}</span>
            </a>
          ))}
        </footer>
      </article>

      <aside className={styles.slaCard}>
        <span aria-hidden="true" className={styles.slaIcon}>
          <Timer size={18} />
        </span>
        <div className={styles.slaBody}>
          <p className={styles.slaTitle}>SLA 응답 마감까지 20시간 28분</p>
          <p className={styles.slaMeta}>
            24시간 SLA · 미할당 상태 · 자동 에스컬레이션 4시간 후
          </p>
        </div>
        <button className={styles.slaButton} type="button">
          내가 답변
          <ArrowRight aria-hidden="true" size={14} />
        </button>
      </aside>

      <nav aria-label="섹션" className={styles.tabsBar} role="tablist">
        {TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            type="button"
          >
            {tab.label}
            {tab.count != null ? <span className={styles.tabCount}>{tab.count}</span> : null}
          </button>
        ))}
      </nav>

      <article className={styles.composer}>
        <header className={styles.composerHeader}>
          <span aria-hidden="true" className={styles.composerAvatar}>
            A
          </span>
          <div className={styles.composerHeading}>
            <strong>답변 작성</strong>
            <span> · Markdown 지원</span>
          </div>
          <button className={styles.templateButton} type="button">
            <FileText aria-hidden="true" size={13} />
            템플릿: 견적 안내
            <ChevronDown aria-hidden="true" size={13} />
          </button>
        </header>

        <div className={styles.toolbar}>
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div className={styles.toolbarGroup} key={`group-${gi}`}>
              {group.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    aria-label={tool.label}
                    className={styles.toolButton}
                    key={tool.label}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={14} />
                  </button>
                );
              })}
            </div>
          ))}
          <div className={styles.toolbarSpacer} />
          <button className={styles.previewButton} type="button">
            <Eye aria-hidden="true" size={13} />
            미리보기
          </button>
          <span className={styles.charCount}>{reply.length}자</span>
        </div>

        <textarea
          className={styles.editor}
          onChange={(event) => setReply(event.target.value)}
          rows={14}
          value={reply}
        />

        <footer className={styles.composerFooter}>
          <div className={styles.composerOptions}>
            <label className={styles.checkbox}>
              <input defaultChecked type="checkbox" />
              <span aria-hidden="true" className={styles.checkboxBox} />
              작성자에게 이메일 알림
            </label>
            <p className={styles.policyText}>
              ℹ 답변 등록 시 감사 로그가 90일 보관됩니다
            </p>
          </div>
          <div className={styles.composerActions}>
            <button className={styles.cancelButton} type="button">
              취소
            </button>
            <button className={styles.saveButton} type="button">
              임시 저장
            </button>
            <button className={styles.submitButton} type="button">
              답변 등록
              <ArrowRight aria-hidden="true" size={14} />
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
