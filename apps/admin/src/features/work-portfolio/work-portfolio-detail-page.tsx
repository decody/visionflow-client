'use client';

import { ROUTES } from '@visionflow/routes';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Code,
  ExternalLink,
  Eye,
  FileText,
  Hash,
  History,
  Image as ImageIcon,
  Link as LinkIcon,
  List as ListIcon,
  Lock,
  Monitor,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Send,
  Smartphone,
  Tablet,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import styles from './work-portfolio-detail-page.module.css';

type SectionStatus = 'done' | 'optional' | 'empty';

type CollapsedSection = {
  num: string;
  status: SectionStatus;
  subtitle: string;
  title: string;
};

const COLLAPSED_SECTIONS: ReadonlyArray<CollapsedSection> = [
  { num: '05', status: 'optional', subtitle: '제작 단계 (3-5개) · 카드 빌더', title: 'The Approach' },
  { num: '06', status: 'empty', subtitle: '결과 이미지 갤러리 + 캡션 · 8장', title: 'The Solution Gallery' },
  { num: '07', status: 'optional', subtitle: '결과 카드 4개 + 차트', title: 'The Results' },
  { num: '08', status: 'empty', subtitle: '5 그룹 · NDA 마킹', title: 'Tech Stack' },
  { num: '09', status: 'optional', subtitle: '팀 구성 + 단계별 기간', title: 'Team & Timeline' },
  { num: '10', status: 'empty', subtitle: '클라이언트 인용 · 동의 필수', title: 'Testimonial' },
];

const DISCLOSURE_OPTIONS = [
  { desc: '실명·실수치·이미지 모두', key: 'A', title: '풀 공개' },
  { desc: '"국내 가구 브랜드" + 수치', key: 'B', title: '익명 + 결과' },
  { desc: '산업과 결과만', key: 'C', title: '산업·결과' },
  { desc: '존재만 언급', key: 'D', title: 'NDA 풀' },
] as const;

const CHALLENGE_CARDS = [
  { desc: '30컷에 걸쳐 같은 무드와 색감 유지', num: '01', title: '브랜드 톤 일관성' },
  { desc: '6주 안에 메인 컷 + 4채널 변환 + ALT 텍스트', num: '02', title: '속도' },
  { desc: '외주 견적의 1/3 이내, 양산 후에도 추가 응용', num: '03', title: '비용' },
] as const;

function StatusPill({ status }: { status: SectionStatus }) {
  if (status === 'done') {
    return (
      <span className={`${styles.sectionStatus} ${styles.statusDone}`}>
        <CheckCircle2 aria-hidden="true" size={11} strokeWidth={2.5} />완료
      </span>
    );
  }
  if (status === 'optional') {
    return (
      <span className={`${styles.sectionStatus} ${styles.statusOptional}`}>
        <Circle aria-hidden="true" size={9} strokeWidth={2.5} />선택
      </span>
    );
  }
  return (
    <span className={`${styles.sectionStatus} ${styles.statusEmpty}`}>
      <AlertTriangle aria-hidden="true" size={11} strokeWidth={2.5} />미완성
    </span>
  );
}

export function WorkPortfolioDetailPage({ id }: { id: string }) {
  const [disclosure, setDisclosure] = useState<string>('B');
  const [device, setDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [mdMode, setMdMode] = useState<'edit' | 'preview'>('edit');

  return (
    <div className={styles.page}>
      {/* ─── Top action bar ───────────────────── */}
      <div className={styles.topBar}>
        <p className={styles.breadcrumb}>
          <Link href={ROUTES.ADMIN.HOME}>대시보드</Link>
          <span aria-hidden="true">/</span>
          <span>콘텐츠</span>
          <span aria-hidden="true">/</span>
          <Link href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>Work 케이스</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>
            #{id} · Brand 1.5 — 시즌 캠페인 광고 이미지
          </span>
          <span className={styles.draftPill}>DRAFT</span>
        </p>

        <div className={styles.topActions}>
          <button className={styles.topBtn} type="button">
            <History aria-hidden="true" size={14} />
            히스토리
          </button>
          <button className={styles.topBtn} type="button">
            <Eye aria-hidden="true" size={14} />
            미리보기
          </button>
          <button aria-label="더보기" className={styles.topBtn} type="button">
            <MoreHorizontal aria-hidden="true" size={14} />
          </button>
          <button className={`${styles.topBtn} ${styles.publishBtn}`} type="button">
            <Send aria-hidden="true" size={13} />
            검토 요청
          </button>
        </div>
      </div>

      <div className={styles.main}>
        {/* ─── Form Column ─────────────────────── */}
        <div className={styles.formColumn}>
          {/* ─ Section 01: 메타데이터 ─ */}
          <section className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionThumb} ${styles.sectionThumbDone}`}>01</span>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>메타데이터</h2>
                <p className={styles.sectionSubtitle}>
                  제목, 카테고리, 산업, 연도 등 기본 정보
                </p>
              </div>
              <div className={styles.sectionRight}>
                <StatusPill status="done" />
                <button aria-label="섹션 토글" className={styles.sectionToggle} type="button">
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
              </div>
            </header>

            <div className={styles.sectionBody}>
              <div className={styles.fieldRow2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="slug">
                    Slug<span className={styles.labelHint}>· 자동 생성</span>
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="brand-15-season-campaign"
                    id="slug"
                    type="text"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="category">
                    카테고리 <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={`${styles.input} ${styles.select}`}
                    defaultValue="ad"
                    id="category"
                  >
                    <option value="ad">광고 이미지</option>
                    <option value="landing">랜딩페이지</option>
                    <option value="dashboard">대시보드</option>
                    <option value="brand">브랜딩</option>
                  </select>
                </div>
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="title">
                  제목 (Title) <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  defaultValue="Brand 1.5 — 시즌 캠페인 광고 이미지"
                  id="title"
                  type="text"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="short-desc">
                  Short Description (목록 카드 노출)
                  <span className={styles.labelHint}>· 80자 이내</span>
                </label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  defaultValue="시즌 캠페인용 30컷 광고 이미지를 LoRA 학습 + 4채널 동시 운영으로 제작"
                  id="short-desc"
                  maxLength={80}
                />
                <span className={styles.charCount}>43 / 80</span>
              </div>

              <div className={styles.fieldRow3}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="industry">
                    산업 (Industry) <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={`${styles.input} ${styles.select}`}
                    defaultValue="cosmetic"
                    id="industry"
                  >
                    <option value="cosmetic">뷰티/화장품</option>
                    <option value="fashion">패션</option>
                    <option value="b2b">B2B SaaS</option>
                    <option value="logistics">물류</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="year">
                    연도 <span className={styles.required}>*</span>
                  </label>
                  <select className={`${styles.input} ${styles.select}`} defaultValue="2026" id="year">
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="duration">
                    제작 기간<span className={styles.labelHint}>· duration_weeks</span>
                  </label>
                  <select
                    className={`${styles.input} ${styles.select}`}
                    defaultValue="6"
                    id="duration"
                  >
                    <option value="4">4주</option>
                    <option value="6">6주</option>
                    <option value="8">8주</option>
                    <option value="12">12주</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* ─ Section 02: 클라이언트 정보 ─ */}
          <section className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionThumb} ${styles.sectionThumbDone}`}>02</span>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>클라이언트 정보</h2>
                <p className={styles.sectionSubtitle}>실명·공개 단계·동의서</p>
              </div>
              <div className={styles.sectionRight}>
                <StatusPill status="done" />
                <button aria-label="섹션 토글" className={styles.sectionToggle} type="button">
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
              </div>
            </header>

            <div className={styles.sectionBody}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="client-name">
                  클라이언트 실명 (내부)
                  <span className={styles.labelHint}>· req · 외부 미공개</span>
                </label>
                <input
                  className={styles.input}
                  defaultValue="SL Cosmetics Co."
                  id="client-name"
                  type="text"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>
                  공개 단계 (Disclosure Level) <span className={styles.required}>*</span>
                </label>
                <div className={styles.disclosureGrid}>
                  {DISCLOSURE_OPTIONS.map((opt) => (
                    <button
                      className={`${styles.disclosureCard} ${disclosure === opt.key ? styles.disclosureCardActive : ''}`}
                      key={opt.key}
                      onClick={() => setDisclosure(opt.key)}
                      type="button"
                    >
                      <span className={styles.disclosureLetter}>{opt.key}</span>
                      <span className={styles.disclosureTitle}>{opt.title}</span>
                      <span className={styles.disclosureDesc}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.exposureRow}>
                <Eye aria-hidden="true" className={styles.exposureIcon} size={16} />
                <span className={styles.exposureLabel}>사이트 노출</span>
                <span className={styles.exposureValue}>
                  &quot;뷰티/화장품 분야의 대형 브랜드&quot;
                </span>
              </div>

              <div className={styles.fieldRow2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="consent-file">
                    동의서 파일 <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.exposureRow}>
                    <Paperclip aria-hidden="true" className={styles.exposureIcon} size={14} />
                    <span className={styles.exposureValue}>consent_brand1-5.pdf</span>
                    <span className={styles.exposureLabel}>· 1.2MB</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="consent-date">
                    동의일 <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="2026-04-22"
                    id="consent-date"
                    type="date"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ─ Section 03: Hero ─ */}
          <section className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionThumb} ${styles.sectionThumbDone}`}>03</span>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>Hero</h2>
                <p className={styles.sectionSubtitle}>대표 이미지·OG·Key Metric</p>
              </div>
              <div className={styles.sectionRight}>
                <StatusPill status="done" />
                <button aria-label="섹션 토글" className={styles.sectionToggle} type="button">
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
              </div>
            </header>

            <div className={styles.sectionBody}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>
                  대표 이미지 (Hero) <span className={styles.required}>*</span>
                </label>
                <div className={styles.heroUpload}>
                  <ImageIcon aria-hidden="true" className={styles.heroUploadIcon} size={40} />
                  <span className={styles.heroFileName}>brand15_hero_4k.webp</span>
                  <span className={styles.heroFileMeta}>
                    3840×2160 · 2.4MB · 미디어 라이브러리에서 변경
                  </span>
                  <div className={styles.heroActions}>
                    <button className={styles.heroActionBtn} type="button">
                      <FileText aria-hidden="true" size={11} />
                      라이브러리
                    </button>
                    <button className={styles.heroActionBtn} type="button">
                      <Upload aria-hidden="true" size={11} />
                      업로드
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.fieldRow2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="og-image">
                    OG 이미지<span className={styles.labelHint}>· 자동 생성 가능</span>
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="brand15_og_1200x630.webp"
                    id="og-image"
                    type="text"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="key-metric">
                    Key Metric (한 줄 결과)
                    <span className={styles.labelHint}>· req · 사이트 hero에 큰 글씨</span>
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="전환율 +47%"
                    id="key-metric"
                    type="text"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ─ Section 04: The Challenge ─ */}
          <section className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionThumb} ${styles.sectionThumbDone}`}>04</span>
              <div className={styles.sectionTitleGroup}>
                <h2 className={styles.sectionTitle}>The Challenge</h2>
                <p className={styles.sectionSubtitle}>문제 정의 · Markdown 지원</p>
              </div>
              <div className={styles.sectionRight}>
                <div className={styles.mdSwitch}>
                  <button
                    className={`${styles.mdSwitchBtn} ${mdMode === 'edit' ? styles.mdSwitchActive : ''}`}
                    onClick={() => setMdMode('edit')}
                    type="button"
                  >
                    편집
                  </button>
                  <button
                    className={`${styles.mdSwitchBtn} ${mdMode === 'preview' ? styles.mdSwitchActive : ''}`}
                    onClick={() => setMdMode('preview')}
                    type="button"
                  >
                    미리
                  </button>
                </div>
                <StatusPill status="done" />
                <button aria-label="섹션 토글" className={styles.sectionToggle} type="button">
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
              </div>
            </header>

            <div className={styles.sectionBody}>
              <div className={styles.mdToolbar}>
                <button aria-label="굵게" className={styles.mdBtn} type="button">
                  <strong>B</strong>
                </button>
                <button aria-label="기울임" className={styles.mdBtn} type="button">
                  <em>I</em>
                </button>
                <span className={styles.mdSep} />
                <button aria-label="제목 1" className={styles.mdBtn} type="button">H1</button>
                <button aria-label="제목 2" className={styles.mdBtn} type="button">H2</button>
                <span className={styles.mdSep} />
                <button aria-label="목록" className={styles.mdBtn} type="button">
                  <ListIcon aria-hidden="true" size={12} />
                </button>
                <button aria-label="코드" className={styles.mdBtn} type="button">
                  <Hash aria-hidden="true" size={12} />
                </button>
                <span className={styles.mdCharCount}>478자</span>
              </div>

              <div className={styles.mdContent}>
                <h3 className={styles.mdH2}>30컷 신제품 광고를 6주 안에 4채널 동시 운영</h3>
                <p className={styles.mdParagraph}>
                  시즌 신제품 라인 (스킨케어 6 SKU) 런칭을 6주 앞둔 상황. 기존 외주 스튜디오는
                  단일 채널 기준으로 한 컷당 50만원, 채널 변환은 별도 견적이라 총 비용이 1억을
                  넘기는 상황이었다. 무엇보다 <strong>브랜드 톤이 컷마다 흔들리는 것</strong>이
                  가장 큰 이슈였다.
                </p>
                <h4 className={styles.mdH3}>풀어야 할 세 가지</h4>
                <ol className={styles.mdList}>
                  <li>
                    <strong>브랜드 톤 일관성</strong> — 30컷에 걸쳐 같은 무드와 색감 유지
                  </li>
                  <li>
                    <strong>속도</strong> — 6주 안에 메인 컷 + 4채널 변환 + ALT 텍스트까지
                  </li>
                  <li>
                    <strong>비용</strong> — 외주 견적의 1/3 이내, 양산 후에도 추가 응용 가능
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* ─ Sections 05–10 (collapsed) ─ */}
          {COLLAPSED_SECTIONS.map((section) => (
            <section
              className={`${styles.sectionCard} ${styles.sectionCardCollapsed}`}
              key={section.num}
            >
              <header className={`${styles.sectionHeader} ${styles.sectionHeaderCollapsed}`}>
                <span
                  className={`${styles.sectionThumb} ${
                    section.status === 'optional'
                      ? styles.sectionThumbEmpty
                      : styles.sectionThumbReview
                  }`}
                >
                  {section.num}
                </span>
                <div className={styles.sectionTitleGroup}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <p className={styles.sectionSubtitle}>{section.subtitle}</p>
                </div>
                <div className={styles.sectionRight}>
                  <StatusPill status={section.status} />
                  <button
                    aria-label={`${section.title} 펼치기`}
                    className={styles.sectionToggle}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                </div>
              </header>
            </section>
          ))}

          {/* Save row */}
          <div className={styles.saveRow}>
            <button className={styles.saveBtn} type="button">
              DRAFT 저장
            </button>
            <button className={styles.submitBtn} type="button">
              <Send aria-hidden="true" size={13} />
              검토 요청
            </button>
          </div>
        </div>

        {/* ─── Preview Column ──────────────────── */}
        <aside className={styles.previewColumn}>
          <div className={styles.previewHeader}>
            <div className={styles.previewLabelGroup}>
              <span className={styles.previewLabel}>
                <Eye aria-hidden="true" size={14} />
                라이브 미리보기
              </span>
              <span className={styles.previewSubtitle}>· 사이트에 보일 형태</span>
              <span className={styles.livePill}>
                <span aria-hidden="true" className={styles.liveDot} />
                LIVE
              </span>
            </div>
            <div className={styles.previewActions}>
              <div className={styles.deviceToggle}>
                <button
                  aria-label="데스크톱 미리보기"
                  className={`${styles.deviceBtn} ${device === 'desktop' ? styles.deviceBtnActive : ''}`}
                  onClick={() => setDevice('desktop')}
                  type="button"
                >
                  <Monitor aria-hidden="true" size={13} />
                </button>
                <button
                  aria-label="모바일 미리보기"
                  className={`${styles.deviceBtn} ${device === 'mobile' ? styles.deviceBtnActive : ''}`}
                  onClick={() => setDevice('mobile')}
                  type="button"
                >
                  <Smartphone aria-hidden="true" size={13} />
                </button>
                <button
                  aria-label="태블릿 미리보기"
                  className={`${styles.deviceBtn} ${device === 'tablet' ? styles.deviceBtnActive : ''}`}
                  onClick={() => setDevice('tablet')}
                  type="button"
                >
                  <Tablet aria-hidden="true" size={13} />
                </button>
              </div>
              <button aria-label="새로고침" className={styles.previewIconBtn} type="button">
                <RefreshCw aria-hidden="true" size={13} />
              </button>
              <button className={styles.previewUrlBtn} type="button">
                <ExternalLink aria-hidden="true" size={11} />
                /work/brand-15-...
              </button>
            </div>
          </div>

          <div className={styles.previewIframe}>
            <div className={styles.previewBrowserBar}>
              <div className={styles.browserDots}>
                <span aria-hidden="true" className={styles.browserDot} />
                <span aria-hidden="true" className={styles.browserDot} />
                <span aria-hidden="true" className={styles.browserDot} />
              </div>
              <div className={styles.browserUrl}>
                <Lock aria-hidden="true" size={10} />
                visionflow.kr/work/brand-15-season-campaign?preview=draft
              </div>
            </div>

            <div className={styles.previewContent}>
              {/* Hero */}
              <span className={styles.previewTagDot}>
                <span aria-hidden="true" className={styles.previewTagDotMark} />
                광고 이미지 · 2026
              </span>
              <h1 className={styles.previewTitle}>Brand 1.5 — 시즌 캠페인 광고 이미지</h1>
              <p className={styles.previewLead}>
                시즌 캠페인용 30컷 광고 이미지를 LoRA 학습 + 4채널 동시 운영으로 제작
              </p>
              <p className={styles.previewClient}>클라이언트 · 뷰티/화장품 분야의 대형 브랜드</p>

              <div className={styles.keyMetricBox}>
                <span className={styles.keyMetricLabel}>KEY METRIC</span>
                <span className={styles.keyMetricValue}>전환율 +47%</span>
              </div>

              <hr className={styles.previewDivider} />

              {/* The Challenge section */}
              <div className={styles.previewSectionHeader}>
                <span className={styles.previewSectionNumber}>01</span>
                <span className={styles.previewSectionLabel}>THE CHALLENGE</span>
              </div>

              <h2 className={styles.previewH2}>30컷 신제품 광고를 6주 안에 4채널 동시 운영</h2>

              <p className={styles.previewParagraph}>
                시즌 신제품 라인 (스킨케어 6 SKU) 런칭을 6주 앞둔 상황. 기존 외주 스튜디오는 단일
                채널 기준으로 한 컷당 50만원, 채널 변환은 별도 견적이라 총 비용이 1억을 넘기는
                상황이었다.
              </p>

              <h3 className={styles.previewSubheading}>풀어야 할 세 가지</h3>

              <div className={styles.challengeList}>
                {CHALLENGE_CARDS.map((card) => (
                  <div className={styles.challengeCard} key={card.num}>
                    <span className={styles.challengeNumber}>{card.num}</span>
                    <div className={styles.challengeContent}>
                      <span className={styles.challengeTitle}>{card.title}</span>
                      <span className={styles.challengeDesc}>{card.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.previewPlaceholder}>
                <ClipboardList aria-hidden="true" size={20} />
                Section 05–10 작성 시 자동 추가
              </div>
            </div>
          </div>

          {/* Status footer */}
          <div className={styles.statusFooter}>
            <span className={styles.statusFooterLabel}>작성 진행도</span>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: '40%' }} />
            </div>
            <span className={styles.statusFooterMeta}>
              <strong>4/10</strong> 섹션 완료 · 40%
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
