'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  MapPin,
  Mail,
  MoreHorizontal,
  Paperclip,
  Send,
  Timer,
  Underline,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import styles from './partnership-detail-page.module.css';

const TABS = [
  { count: null, key: 'proposal' as const, label: '제안 본문' },
  { count: null, key: 'reply' as const, label: '회신' },
  { count: 6, key: 'history' as const, label: '히스토리' },
  { count: null, key: 'memo' as const, label: '내부 메모' },
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

const SAMPLE_REPLY = `강민호 이사님, 안녕하세요. VisionFlow Sales Lead 김민지입니다.

리셀러 제휴 제안 잘 받아보았습니다. 보유 고객 30곳, 80%가 BI 미보유 50인 미만 기업이라는 포지셔닝이 저희 데이터 대시보드 카테고리와 정확히 일치하는 것 같아 매우 흥미롭게 검토하고 있습니다.

## 다음 단계 제안

1. **NDA 사전 체결**: 매출 분배 구조 논의를 위해 필요합니다 (당사 표준 양식 첨부)
2. **1시간 디스커버리 미팅**: 5/12 (월) 오후 2시 또는 5/14 (수) 오전 10시 제안드립니다.
3. **파일럿 후보 1곳 사전 매칭**: 미팅 전에 우선 1곳을 정해 영업 시나리오를 함께 그려보면 좋을 것 같습니다.`;

export function PartnershipDetailPage({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<'proposal' | 'reply' | 'history' | 'memo'>(
    'proposal',
  );
  const [reply, setReply] = useState(SAMPLE_REPLY);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.breadcrumb}>
          <span>대시보드</span>
          <span aria-hidden="true">/</span>
          <span>인박스</span>
          <span aria-hidden="true">/</span>
          <Link href={ROUTES.ADMIN.PARTNERSHIP.ROOT}>제휴 문의</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>
            #{id} · 하이브리드 솔루션즈
          </span>
        </p>

        <div className={styles.pageNav}>
          <Link className={styles.backLink} href={ROUTES.ADMIN.PARTNERSHIP.ROOT}>
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

      <article className={styles.companyCard}>
        <header className={styles.companyMeta}>
          <div className={styles.metaBadges}>
            <span className={styles.idBadge}>#{id}</span>
            <span className={styles.statusNew}>NEW</span>
            <span className={styles.dealReseller}>리셀러</span>
            <span className={styles.sizePill}>11–50인</span>
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

        <div className={styles.companyHero}>
          <span aria-hidden="true" className={styles.companyAvatar}>
            H
          </span>
          <div className={styles.companyInfo}>
            <h1 className={styles.companyName}>하이브리드 솔루션즈</h1>
            <p className={styles.companyMetaLine}>
              <span className={styles.metaItem}>
                <Globe aria-hidden="true" size={13} />
                hybrid-sol.kr
              </span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span>클라우드 인프라 컨설팅</span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span className={styles.metaItem}>
                <MapPin aria-hidden="true" size={13} />
                서울 · 강남구
              </span>
            </p>
          </div>
        </div>

        <dl className={styles.companyGrid}>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>CONTACT</dt>
            <dd className={styles.gridValue}>
              <strong>강민호</strong>
              <span>Director · CSO</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>이메일 / 전화</dt>
            <dd className={styles.gridValue}>
              <strong>minho.kang@hybrid-sol.kr</strong>
              <span>· 010-9382-····</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>출처</dt>
            <dd className={styles.gridValue}>
              <strong>partnership@visionflow.kr</strong>
              <span>· UTM: linkedin</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>NDA 상태</dt>
            <dd className={styles.gridValue}>
              <strong className={styles.ndaPending}>미체결</strong>
              <span>· 본인 동의 필요</span>
            </dd>
          </div>
        </dl>
      </article>

      <aside className={styles.slaCard}>
        <span aria-hidden="true" className={styles.slaIcon}>
          <Timer size={18} />
        </span>
        <div className={styles.slaBody}>
          <p className={styles.slaTitle}>SLA 1차 응답 마감까지 2일 18시간</p>
          <p className={styles.slaMeta}>
            제휴 SLA 72시간 (3일) · 미할당 상태 · 자동 에스컬레이션 1일 후
          </p>
        </div>
        <button className={styles.slaButton} type="button">
          내가 답변
          <Send aria-hidden="true" size={14} />
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

      <div className={styles.contentGrid}>
        <article className={styles.proposalCard}>
          <header className={styles.proposalHeader}>
            <span aria-hidden="true" className={styles.proposalAvatar}>
              P
            </span>
            <strong className={styles.proposalHeading}>제휴 제안 내용</strong>
          </header>

          <div className={styles.authorRow}>
            <span aria-hidden="true" className={styles.authorAvatar}>
              강
            </span>
            <div className={styles.authorInfo}>
              <strong>강민호 · Director · CSO</strong>
              <span>오늘 11:08 · IP 121.156.xxx.xxx · LinkedIn에서 유입</span>
            </div>
          </div>

          <section className={styles.proposalSection}>
            <h2 className={styles.sectionTitle}>제안 한 줄</h2>
            <p className={styles.sectionLead}>
              AWS 컨설팅 고객사 30곳에 데이터 대시보드 + AI 광고 패키지 리셀러로 협업 제안
            </p>
          </section>

          <section className={styles.proposalSection}>
            <h2 className={styles.sectionTitle}>제휴 시너지</h2>
            <p className={styles.sectionBody}>
              당사는 AWS 컨설팅 파트너로 12년차이며 보유 고객 30곳 중 80%가 자체 BI를 보유하지 못한
              50인 미만 기업입니다. VisionFlow의 AG Grid 기반 대시보드 솔루션과 AI 광고 이미지 생성
              서비스를 패키지로 묶어 화이트라벨 형태로 리셀하고자 합니다. 영업·온보딩은 당사가
              100% 책임지고, 기술 구현·서버 운영·라이선스 관리만 VisionFlow 측에서 담당하는 구조를
              제안드립니다.
            </p>
          </section>

          <section className={styles.proposalSection}>
            <h2 className={styles.sectionTitle}>예상 규모</h2>
            <ul className={styles.scaleList}>
              <li>1단계 (3개월): 파일럿 3개사 · 월 ₩45M 예상 매출</li>
              <li>2단계 (6개월): 10개사 · 월 ₩150M</li>
              <li>1년 후 목표: 25개사 · 연 매출 ₩3B 규모</li>
              <li>매출 분배: VisionFlow 60% / 하이브리드 솔루션즈 40% (영업·CS 가중)</li>
            </ul>
          </section>

          <section className={styles.proposalSection}>
            <h2 className={styles.sectionTitle}>첨부 자료</h2>
            <div className={styles.attachmentRow}>
              <a className={styles.attachmentChip} href="#">
                <Paperclip aria-hidden="true" size={12} />
                hybrid_partnership_deck_v2.pdf
                <span>· 4.8MB</span>
              </a>
              <a className={styles.attachmentChip} href="#">
                <Paperclip aria-hidden="true" size={12} />
                customer_list_anonymized.xlsx
                <span>· 280KB</span>
              </a>
            </div>
          </section>
        </article>

        <article className={styles.composer}>
          <header className={styles.composerHeader}>
            <span aria-hidden="true" className={styles.composerAvatar}>
              <Mail size={14} />
            </span>
            <div className={styles.composerHeading}>
              <strong>회신 작성</strong>
              <span> · 이메일 회신</span>
            </div>
            <button className={styles.templateButton} type="button">
              <FileText aria-hidden="true" size={13} />
              템플릿: 미팅 일정 제안
              <ChevronDown aria-hidden="true" size={13} />
            </button>
          </header>

          <dl className={styles.mailFields}>
            <div className={styles.mailRow}>
              <dt>TO</dt>
              <dd>강민호 &lt;minho.kang@hybrid-sol.kr&gt;</dd>
            </div>
            <div className={styles.mailRow}>
              <dt>FROM</dt>
              <dd>김민지 &lt;minji.kim@visionflow.kr&gt;</dd>
            </div>
            <div className={styles.mailRow}>
              <dt>SUBJ</dt>
              <dd>Re: AWS 리셀러 제휴 제안 — 미팅 일정 조율드립니다</dd>
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
              NDA_template_v3.pdf
            </a>
          </div>

          <footer className={styles.composerFooter}>
            <button className={styles.saveButton} type="button">
              임시 저장
            </button>
            <button className={styles.submitButton} type="button">
              <Send aria-hidden="true" size={14} />
              메일 발송
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}
