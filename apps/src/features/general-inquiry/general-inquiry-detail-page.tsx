'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  Mail,
  MoreHorizontal,
  Paperclip,
  Send,
  Timer,
  Underline,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import styles from './general-inquiry-detail-page.module.css';

const TABS = [
  { count: null, key: 'body' as const, label: '본문' },
  { count: null, key: 'compose' as const, label: '답변 작성' },
  { count: 4, key: 'log' as const, label: '작업 로그' },
];

const TOOLBAR = [
  [
    { icon: Bold, label: 'Bold' },
    { icon: Italic, label: 'Italic' },
    { icon: Underline, label: 'Underline' },
  ],
  [
    { icon: Heading1, label: 'H1' },
    { icon: Heading2, label: 'H2' },
  ],
  [{ icon: List, label: '리스트' }],
  [
    { icon: Link2, label: '링크' },
    { icon: Paperclip, label: '첨부' },
  ],
];

const SAMPLE_REPLY = `서지호 님, 안녕하세요. VisionFlow 김민지입니다.

Designbase 토큰 시스템에 관심을 가져 주셔서 감사합니다. 비상업적 교육 목적이라면 일부 자료 공유가 가능할 것 같습니다.

## 공유 가능한 자료

- **컬러 토큰 JSON** (라이트/다크 모드 분기 포함, 첨부)
- **타이포그래피 스케일 가이드** (PDF, 첨부)
- 다만 컴포넌트 명세는 사내 자산이라 공유가 어렵습니다 — 대신 GitHub의 공개 디자인 시스템 (Radix, shadcn) 추천드립니다.`;

export function GeneralInquiryDetailPage({ id }: { id: string }) {
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
          <Link href={ROUTES.ADMIN.GENERAL_INQUIRY.ROOT}>일반 문의</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>#{id}</span>
        </p>

        <div className={styles.pageNav}>
          <Link className={styles.backLink} href={ROUTES.ADMIN.GENERAL_INQUIRY.ROOT}>
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
            <span className={styles.statusUnanswered}>미답변</span>
            <span className={styles.categoryProposal}>제안</span>
          </div>
          <div className={styles.metaActions}>
            <button className={styles.metaButton} type="button">
              상태 변경
              <ChevronDown aria-hidden="true" size={14} />
            </button>
            <button className={styles.metaButton} type="button">
              담당 변경
              <ChevronDown aria-hidden="true" size={14} />
            </button>
          </div>
        </header>

        <h1 className={styles.questionTitle}>
          디자인 시스템 컴포넌트 라이브러리 공유 가능한가요?
        </h1>

        <div className={styles.authorRow}>
          <span aria-hidden="true" className={styles.avatar}>
            서
          </span>
          <div className={styles.authorInfo}>
            <strong>서지호 · jiho.seo@designstudio.kr</strong>
            <span>
              오늘 13:42 작성 · IP 121.140.xxx.xxx · 출처 organic search · UA Chrome 124 (macOS)
            </span>
          </div>
        </div>

        <div className={styles.questionBody}>
          <p>
            VisionFlow 사이트의 Designbase 토큰 시스템을 학습 자료로 활용하고 싶습니다. 사내 디자인
            시스템 워크샵에서 케이스 스터디로 다루고 싶은데, 컴포넌트 명세 문서나 토큰 JSON 파일을
            일부라도 공유받을 수 있을까요? 출처는 명시하고 비상업적 교육 목적으로만 활용할
            예정입니다.
          </p>
        </div>
      </article>

      <aside className={styles.slaCard}>
        <span aria-hidden="true" className={styles.slaIcon}>
          <Timer size={18} />
        </span>
        <div className={styles.slaBody}>
          <p className={styles.slaTitle}>SLA 응답 마감까지 1일 18시간</p>
          <p className={styles.slaMeta}>48시간 SLA · 미할당 상태 · 답변 필수 (제안 카테고리)</p>
        </div>
        <div className={styles.slaActions}>
          <button className={styles.slaSecondary} type="button">
            <Check aria-hidden="true" size={14} />
            확인 처리
          </button>
          <button className={styles.slaButton} type="button">
            내가 답변
            <Send aria-hidden="true" size={14} />
          </button>
        </div>
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
            <Mail size={14} />
          </span>
          <div className={styles.composerHeading}>
            <strong>이메일 회신</strong>
            <span> · Markdown 지원</span>
          </div>
          <button className={styles.templateButton} type="button">
            <FileText aria-hidden="true" size={13} />
            템플릿: 자료 공유 안내
            <ChevronDown aria-hidden="true" size={13} />
          </button>
        </header>

        <dl className={styles.mailFields}>
          <div className={styles.mailRow}>
            <dt>TO</dt>
            <dd>서지호 &lt;jiho.seo@designstudio.kr&gt;</dd>
          </div>
          <div className={styles.mailRow}>
            <dt>FROM</dt>
            <dd>김민지 &lt;minji.kim@visionflow.kr&gt;</dd>
          </div>
          <div className={styles.mailRow}>
            <dt>SUBJ</dt>
            <dd>Re: 디자인 시스템 컴포넌트 라이브러리 자료 공유 가능 여부 안내</dd>
          </div>
        </dl>

        <div className={styles.toolbar}>
          {TOOLBAR.map((group, gi) => (
            <div className={styles.toolbarGroup} key={`tg-${gi}`}>
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
          <span className={styles.charCount}>{reply.length}자</span>
        </div>

        <textarea
          className={styles.editor}
          onChange={(event) => setReply(event.target.value)}
          rows={12}
          value={reply}
        />

        <div className={styles.attachmentList}>
          <a className={styles.attachmentChip} href="#">
            <Paperclip aria-hidden="true" size={12} />
            design-tokens.json
          </a>
          <a className={styles.attachmentChip} href="#">
            <Paperclip aria-hidden="true" size={12} />
            typography-guide.pdf
          </a>
        </div>

        <footer className={styles.composerFooter}>
          <p className={styles.policyText}>
            ℹ 답변 등록 시 감사 로그가 90일 보관됩니다
          </p>
          <div className={styles.composerActions}>
            <button className={styles.cancelButton} type="button">
              취소
            </button>
            <button className={styles.saveButton} type="button">
              임시 저장
            </button>
            <button className={styles.submitButton} type="button">
              <Send aria-hidden="true" size={14} />
              답변 발송
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
