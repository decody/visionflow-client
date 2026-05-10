'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Plus,
  Send,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import styles from './work-portfolio-detail-page.module.css';

type Tab = 'brief' | 'result' | 'meta' | 'notes';

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
  { key: 'brief', label: '브리프' },
  { key: 'result', label: '결과물 설명' },
  { key: 'meta', label: '메타' },
  { key: 'notes', label: 'Notes' },
];

const RELATED = [
  { date: '2025', title: 'The Research' },
  { date: '2025', title: 'The Solution Gallery' },
  { date: '2025', title: 'The Results' },
  { date: '2025', title: 'Tech Stack' },
  { date: '2025', title: 'Team & Timeline' },
];

export function WorkPortfolioDetailPage({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('brief');
  const [tags, setTags] = useState(['광고 이미지', 'LoRA 학습', '다채널']);

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  return (
    <div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <p className={styles.breadcrumb}>
          <Link href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            <ArrowLeft aria-hidden="true" size={13} /> Work 케이스
          </Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>
            #{id} · Brand 1.5 — 시즌 캠페인 광고 이미지
          </span>
        </p>

        <div className={styles.topActions}>
          <button className={styles.topBtn} type="button">
            <ChevronLeft aria-hidden="true" size={14} />
            이전
          </button>
          <button className={styles.topBtn} type="button">
            다음
            <ChevronRight aria-hidden="true" size={14} />
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

      {/* Left Panel */}
      <div className={styles.leftPanel}>
        {/* Status bar */}
        <div className={styles.statusBar}>
          <span className={`${styles.badge} ${styles.badgeDraft}`}>DRAFT</span>
          <span className={styles.statusMeta}>
            v3 · 마지막 저장 오늘 14:23 · 작성자 김진자
          </span>
          <div className={styles.statusActions}>
            <button className={styles.reviewBtn} type="button">
              상태 변경
              <ChevronDown aria-hidden="true" size={13} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav aria-label="편집 탭" className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Form Content */}
        <div className={styles.formContent}>
          {activeTab === 'brief' && (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>기본 정보</h2>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="client">
                      클라이언트
                    </label>
                    <input
                      className={styles.input}
                      defaultValue="에스엘 코스메틱"
                      id="client"
                      type="text"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="category">
                      카테고리
                    </label>
                    <select className={`${styles.input} ${styles.select}`} id="category">
                      <option>광고 이미지</option>
                      <option>랜딩페이지</option>
                      <option>대시보드</option>
                      <option>브랜딩</option>
                    </select>
                  </div>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="year">
                      연도
                    </label>
                    <input
                      className={styles.input}
                      defaultValue="2026"
                      id="year"
                      type="number"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="slug">
                      슬러그 (URL)
                    </label>
                    <input
                      className={styles.input}
                      defaultValue="/work/brand-15-season-campaign"
                      id="slug"
                      type="text"
                    />
                  </div>
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor="headline">
                    헤드라인
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="Brand 1.5 — 시즌 캠페인 광고 이미지"
                    id="headline"
                    type="text"
                  />
                </div>
              </section>

              <hr className={styles.divider} />

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>프로젝트 개요</h2>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor="brief">
                    브리프 요약
                  </label>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    defaultValue="시즌 캠페인용 스킨케어 6종 제품 광고 이미지 30컷 · Brand LoRA 학습 + 4채널 동시 운영을 통해 일관된 브랜드 톤 구현"
                    id="brief"
                  />
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="budget">
                      예산
                    </label>
                    <input
                      className={styles.input}
                      defaultValue="₩6,365,000"
                      id="budget"
                      type="text"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="duration">
                      기간
                    </label>
                    <input
                      className={styles.input}
                      defaultValue="6주"
                      id="duration"
                      type="text"
                    />
                  </div>
                </div>
              </section>

              <hr className={styles.divider} />

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>태그</h2>
                <div className={styles.tagRow}>
                  {tags.map((tag) => (
                    <span className={styles.tag} key={tag}>
                      {tag}
                      <button
                        aria-label={`${tag} 제거`}
                        className={styles.tagRemove}
                        onClick={() => removeTag(tag)}
                        type="button"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <button className={styles.addTagBtn} type="button">
                    <Plus size={11} />
                    태그 추가
                  </button>
                </div>
              </section>
            </>
          )}

          {activeTab === 'result' && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>결과물 설명</h2>
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>전환율</span>
                  <span className={styles.metricValue}>+47%</span>
                  <span className={styles.metricDelta}>전월 대비</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>생산 컷수</span>
                  <span className={styles.metricValue}>300</span>
                  <span className={styles.metricDelta}>4채널 변환 포함</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>납품 기간</span>
                  <span className={styles.metricValue}>6주</span>
                  <span className={styles.metricDelta}>D-day 준수</span>
                </div>
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="result-desc">
                  결과물 상세 설명
                </label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  defaultValue="30초 이내에 신제품 6 SKU 광고 이미지 4채널 동시 배포 달성. 브랜드 LoRA 학습으로 일관된 톤 확보 및 사내 검수 2회 완료."
                  id="result-desc"
                  style={{ minHeight: 140 }}
                />
              </div>
            </section>
          )}

          {activeTab === 'meta' && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>SEO 메타</h2>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="meta-title">
                  메타 타이틀
                </label>
                <input
                  className={styles.input}
                  defaultValue="Brand 1.5 시즌 캠페인 광고 이미지 | VisionFlow Work"
                  id="meta-title"
                  type="text"
                />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="meta-desc">
                  메타 설명
                </label>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  defaultValue="에스엘 코스메틱 시즌 캠페인을 위한 AI 기반 제품 광고 이미지 생산 케이스. Brand LoRA 학습으로 일관된 브랜드 톤 구현."
                  id="meta-desc"
                  style={{ minHeight: 80 }}
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="og-image">
                    OG 이미지 URL
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="https://visionflow.kr/og/brand-15.jpg"
                    id="og-image"
                    type="text"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="canonical">
                    Canonical URL
                  </label>
                  <input
                    className={styles.input}
                    defaultValue="https://visionflow.kr/work/brand-15-season-campaign"
                    id="canonical"
                    type="text"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>내부 메모</h2>
              <textarea
                className={styles.notesArea}
                defaultValue="· NDA 체결 후 5/10까지 클라이언트 자료 수령 예정&#10;· 1차 검수 5/22, 최종 납품 6/01&#10;· 결제: 계약금 30% / 1차 검수 후 40% / 최종 30%"
              />
            </section>
          )}
        </div>

        {/* Save row */}
        <div className={styles.saveRow}>
          <button className={styles.saveBtn} type="button">
            임시 저장
          </button>
          <button className={`${styles.saveBtn} ${styles.submitBtn}`} type="button">
            <Send aria-hidden="true" size={13} />
            검토 요청
          </button>
        </div>
      </div>

      {/* Right Panel — Preview */}
      <div className={styles.rightPanel}>
        <div className={styles.previewHeader}>
          <span className={styles.previewLabel}>웹 미리보기</span>
          <div className={styles.previewActions}>
            <button aria-label="외부 링크" className={styles.previewBtn} type="button">
              <ExternalLink size={14} />
            </button>
            <button aria-label="더보기" className={styles.previewBtn} type="button">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        <div className={styles.previewBody}>
          {/* Card */}
          <div className={styles.previewCard}>
            <div className={styles.previewThumb}>광고 이미지 · Brand 1.5</div>
            <div className={styles.previewMeta}>
              <h2 className={styles.previewTitle}>Brand 1.5 — 시즌 캠페인 광고 이미지</h2>
              <p className={styles.previewClient}>에스엘 코스메틱 · 2026</p>
              <div className={styles.previewKpi}>
                <span className={styles.kpiNumber}>전환율 +47%</span>
                <span className={styles.kpiDesc}>4채널 동시 운영으로 달성</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className={styles.previewSection}>
            <h3 className={styles.previewSectionTitle}>30초 요약</h3>
            <p className={styles.previewText}>
              신제품 라인을 고효율로 양산하는 6주 안에 4채널 동시 운영 동시 발행
            </p>
          </div>

          {/* Related */}
          <div className={styles.previewSection}>
            <h3 className={styles.previewSectionTitle}>케이스 구성</h3>
            <ul className={styles.relatedList}>
              {RELATED.map((item) => (
                <li key={item.title}>
                  <a className={styles.relatedItem} href="#">
                    {item.title}
                    <span className={styles.relatedItemDate}>{item.date}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
