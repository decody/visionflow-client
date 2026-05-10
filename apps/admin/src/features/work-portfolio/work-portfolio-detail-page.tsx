'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ChevronDown,
  Eye,
  History,
  ImageIcon,
  MoreHorizontal,
  Save,
  Send,
} from 'lucide-react';
import Link from 'next/link';

import styles from './work-portfolio-detail-page.module.css';

type SectionStatus = 'done' | 'empty';

const SECTIONS: ReadonlyArray<{
  hint: string;
  num: string;
  status: SectionStatus;
  title: string;
}> = [
  { hint: '문제 정의 · 비즈니스 영향 · 가설', num: '02', status: 'done', title: 'The Challenge' },
  { hint: '방법론 · 단계별 어프로치', num: '03', status: 'done', title: 'The Approach' },
  { hint: '결과물 갤러리 (썸네일 6–12장)', num: '04', status: 'done', title: 'The Solution Gallery' },
  { hint: '정량 지표 · 클라이언트 피드백', num: '05', status: 'done', title: 'The Results' },
  { hint: '사용 도구 · 모델 · 프로세스', num: '06', status: 'empty', title: 'Tech Stack' },
  { hint: '담당 인력 · 일정 갠트', num: '07', status: 'empty', title: 'Team & Timeline' },
  { hint: '클라이언트 추천사 · 인용', num: '08', status: 'done', title: 'Testimonial' },
];

const VOICE_ITEMS = [
  {
    desc: '브랜드 LoRA 학습 1회 + 검수 2회로 채널마다 동일한 톤·무드를 재현',
    num: '01',
    title: '브랜드 톤 일관성',
  },
  {
    desc: '신제품 라인 30컷 · 4채널 동시 변환을 6주 안에 완료',
    num: '02',
    title: '속도',
  },
  {
    desc: '외주 단가 대비 약 38% 절감 · 시즌 캠페인 ROI +47%',
    num: '03',
    title: '비용',
  },
];

export function WorkPortfolioDetailPage({ id }: { id: string }) {
  return (
    <div className={styles.page}>
      {/* ─── Top Bar ───────────────────────── */}
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

      {/* ─── Left Panel ─────────────────────── */}
      <div className={styles.leftPanel}>
        {/* Status Row */}
        <div className={styles.statusRow}>
          <span className={styles.clientBadge}>에스엘 코스메틱</span>
          <span className={`${styles.statusBadge} ${styles.statusDraft}`}>DRAFT</span>
          <span className={styles.statusMeta}>v3 · 마지막 저장 오늘 14:23 · 작성자 김진자</span>
          <div className={styles.statusActionsRight}>
            <button className={styles.linkBtn} type="button">
              <Save aria-hidden="true" size={12} />
              자동 저장
            </button>
          </div>
        </div>

        {/* 01 — 헤드라인 */}
        <section className={styles.sectionCard}>
          <header className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>01</span>
            <h2 className={styles.sectionTitle}>헤드라인</h2>
            <span className={styles.sectionStatus}>입력 완료</span>
          </header>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="slug">
              Slug
            </label>
            <div className={styles.slugRow}>
              <span className={styles.slugPrefix}>visionflow.kr/work/</span>
              <input
                className={`${styles.input} ${styles.slugInput}`}
                defaultValue="brand-15-season-campaign"
                id="slug"
                type="text"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="headline">
              헤드라인 <span className={styles.required}>*</span>
            </label>
            <input
              className={`${styles.input} ${styles.inputLarge}`}
              defaultValue="Brand 1.5 — 시즌 캠페인 광고 이미지"
              id="headline"
              type="text"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="short-desc">
              한 줄 요약 (100자 이내) <span className={styles.required}>*</span>
            </label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              defaultValue="신제품 LoRA 학습 + 30종 시즌 캠페인 광고 이미지를 6주 안에 4채널 동시 운영"
              id="short-desc"
              maxLength={100}
            />
            <span className={styles.charCount}>62 / 100</span>
          </div>
        </section>

        {/* 클라이언트 정보 */}
        <section className={styles.sectionCard}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>클라이언트 정보</h2>
            <span className={styles.sectionStatus}>입력 완료</span>
          </header>

          <div className={styles.fieldRow3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="industry">
                업종
              </label>
              <select className={`${styles.input} ${styles.select}`} defaultValue="cosmetic" id="industry">
                <option value="cosmetic">뷰티/화장품</option>
                <option value="fashion">패션</option>
                <option value="b2b">B2B SaaS</option>
                <option value="logistics">물류</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="category">
                카테고리
              </label>
              <select className={`${styles.input} ${styles.select}`} defaultValue="ad" id="category">
                <option value="ad">광고 이미지</option>
                <option value="landing">랜딩페이지</option>
                <option value="dashboard">대시보드</option>
                <option value="brand">브랜딩</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="case-level">
                케이스 레벨
              </label>
              <select className={`${styles.input} ${styles.select}`} defaultValue="hero" id="case-level">
                <option value="hero">Hero (최상단 노출)</option>
                <option value="standard">Standard</option>
                <option value="archive">Archive</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>협업 단계</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioPill}>
                <input name="phase" type="radio" />제휴
              </label>
              <label className={styles.radioPill}>
                <input defaultChecked name="phase" type="radio" />
                제안
              </label>
              <label className={styles.radioPill}>
                <input name="phase" type="radio" />진행중
              </label>
              <label className={styles.radioPill}>
                <input name="phase" type="radio" />NDA 종료
              </label>
            </div>
          </div>

          <div className={styles.fieldRow3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="start-date">
                시작일
              </label>
              <input className={styles.input} defaultValue="2026-04-01" id="start-date" type="date" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="due-date">
                마무리 예정일
              </label>
              <input className={styles.input} defaultValue="2026-05-22" id="due-date" type="date" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="end-date">
                종료일
              </label>
              <input className={styles.input} defaultValue="2026-06-01" id="end-date" type="date" />
            </div>
          </div>
        </section>

        {/* Hero */}
        <section className={styles.sectionCard}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Hero · 대표 이미지</h2>
            <span className={styles.sectionStatus}>입력 완료</span>
          </header>

          <div className={styles.heroBox}>
            <div className={styles.heroLabel}>
              <ImageIcon aria-hidden="true" size={32} />
              brand15_hero_4k.webp
              <span className={styles.heroSub}>3840 × 2160 · 1.8MB</span>
            </div>
          </div>

          <div className={styles.heroFooter}>
            <div className={styles.fileInfo}>
              <ImageIcon aria-hidden="true" size={14} />
              <span className={styles.fileName}>brand15_hero_4k.webp</span>
              <span>· 2026-04-22</span>
            </div>
            <div className={styles.heroMeta}>
              <span className={styles.heroMetaPill}>Key Phrase (선영) 적용</span>
              <span className={styles.kpiPill}>전환율 +47%</span>
            </div>
          </div>
        </section>

        {/* Numbered Sections */}
        {SECTIONS.map((section) => (
          <section className={styles.sectionCard} key={section.num}>
            <header className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>{section.num}</span>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <span
                className={`${styles.sectionStatus} ${section.status === 'empty' ? styles.sectionStatusEmpty : ''}`}
              >
                {section.status === 'done' ? '입력 완료' : '미입력'}
              </span>
              <button aria-label="섹션 토글" className={styles.sectionToggle} type="button">
                <ChevronDown aria-hidden="true" size={18} />
              </button>
            </header>

            <div className={styles.editorBlock}>
              <p className={styles.editorHint}>{section.hint}</p>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                defaultValue={
                  section.status === 'done'
                    ? `${section.title} 섹션의 본문이 여기에 작성됩니다. 편집기에서 자유롭게 마크다운/리치텍스트로 작성할 수 있습니다.`
                    : ''
                }
                placeholder={`${section.title} 본문을 입력하세요`}
              />
            </div>
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

      {/* ─── Right Panel — Preview ──────────── */}
      <div className={styles.rightPanel}>
        <div className={styles.previewHeader}>
          <span className={styles.previewLabel}>
            <Eye aria-hidden="true" size={13} />웹 미리보기
          </span>
          <button className={styles.previewSwitch} type="button">
            visionflow.kr/work/brand-15-season-campaign (Draft)
            <ChevronDown aria-hidden="true" size={12} />
          </button>
        </div>

        <div className={styles.previewBody}>
          {/* Hero card */}
          <div className={styles.previewHero}>
            <div className={styles.previewTagRow}>
              <span className={styles.previewTag}>광고 이미지</span>
              <span className={styles.previewTag}>Brand 1.5</span>
            </div>
            <h3 className={styles.previewHeroTitle}>Brand 1.5 — 시즌 캠페인 광고 이미지</h3>
            <div className={styles.previewKpiBox}>
              <span className={styles.previewKpiLabel}>전환율</span>
              <span className={styles.previewKpiValue}>+47%</span>
            </div>
          </div>

          {/* Body summary */}
          <p className={styles.previewBodyText}>
            30초 신제품 광고를 6주 안에 4채널 동시 운영
          </p>
          <p className={styles.previewBodyDesc}>
            시즌 캠페인 광고 이미지 6주 안에 양산되어 4채널 동시 발행. 신제품 6 SKU의 톤·무드를
            일관되게 학습한 LoRA 모델 기반으로 안정적 품질 확보.
          </p>

          {/* Voice */}
          <div className={styles.voiceSection}>
            <h4 className={styles.voiceTitle}>The Challenge</h4>
            <ul className={styles.voiceList}>
              {VOICE_ITEMS.map((item) => (
                <li className={styles.voiceItem} key={item.num}>
                  <span className={styles.voiceNumber}>{item.num}</span>
                  <div className={styles.voiceContent}>
                    <span className={styles.voiceSubtitle}>{item.title}</span>
                    <span className={styles.voiceDesc}>{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Progress */}
        <div className={styles.progress}>
          <div className={styles.progressLabel}>
            <span>현재 작업 진행률</span>
            <strong>70%</strong>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '70%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
