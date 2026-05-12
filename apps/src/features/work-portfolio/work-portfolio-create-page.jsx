'use client';
import { ROUTES } from '@visionflow/routes';
import { ArrowLeft, Eye, FileText, Plus, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import styles from './work-portfolio-create-page.module.css';
const TABS = [
    { key: 'brief', label: '브리프' },
    { key: 'result', label: '결과물 설명' },
    { key: 'meta', label: '메타' },
    { key: 'notes', label: 'Notes' },
];
const CHECKLIST = [
    { done: false, label: '헤드라인 입력' },
    { done: false, label: '클라이언트 선택' },
    { done: false, label: '썸네일 업로드' },
    { done: false, label: '브리프 요약 작성' },
    { done: false, label: '태그 추가' },
    { done: false, label: '메타 정보 입력' },
];
export function WorkPortfolioCreatePage() {
    const [activeTab, setActiveTab] = useState('brief');
    const [tags, setTags] = useState([]);
    const removeTag = (tag) => setTags((prev) => prev.filter((t) => t !== tag));
    return (<div className={styles.page}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <p className={styles.breadcrumb}>
          <Link href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            <ArrowLeft aria-hidden="true" size={13}/> Work 케이스
          </Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>새 케이스 작성</span>
        </p>

        <div className={styles.topActions}>
          <button className={styles.topBtn} type="button">
            <Eye aria-hidden="true" size={14}/>
            미리보기
          </button>
          <Link className={styles.topBtn} href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            취소
          </Link>
          <button className={`${styles.topBtn} ${styles.createBtn}`} type="button">
            <FileText aria-hidden="true" size={13}/>
            DRAFT 저장
          </button>
        </div>
      </div>

      {/* Left Panel */}
      <div className={styles.leftPanel}>
        {/* Tabs */}
        <nav aria-label="작성 탭" className={styles.tabs}>
          {TABS.map((tab) => (<button className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`} key={tab.key} onClick={() => setActiveTab(tab.key)} type="button">
              {tab.label}
            </button>))}
        </nav>

        {/* Form Content */}
        <div className={styles.formContent}>
          {activeTab === 'brief' && (<>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>기본 정보</h2>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="client">
                      클라이언트
                    </label>
                    <input className={styles.input} id="client" placeholder="예) 에스엘 코스메틱" type="text"/>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="category">
                      카테고리
                    </label>
                    <select className={`${styles.input} ${styles.select}`} id="category">
                      <option value="">카테고리 선택</option>
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
                    <input className={styles.input} id="year" placeholder="2026" type="number"/>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="slug">
                      슬러그 (URL)
                    </label>
                    <input className={styles.input} id="slug" placeholder="/work/project-name" type="text"/>
                  </div>
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor="headline">
                    헤드라인
                  </label>
                  <input className={styles.input} id="headline" placeholder="케이스 제목 — 부제목" type="text"/>
                </div>
              </section>

              <hr className={styles.divider}/>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>썸네일</h2>
                <div className={styles.uploadArea}>
                  <Upload aria-hidden="true" className={styles.uploadIcon} size={28}/>
                  <p className={styles.uploadLabel}>이미지 업로드</p>
                  <p className={styles.uploadSub}>PNG, JPG, WebP · 최대 10MB · 권장 1920×1080</p>
                </div>
              </section>

              <hr className={styles.divider}/>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>프로젝트 개요</h2>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor="brief">
                    브리프 요약
                  </label>
                  <textarea className={`${styles.input} ${styles.textarea}`} id="brief" placeholder="프로젝트의 목적, 범위, 핵심 요구사항을 간결하게 설명해 주세요."/>
                </div>
                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="budget">
                      예산 (선택)
                    </label>
                    <input className={styles.input} id="budget" placeholder="₩0,000,000" type="text"/>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="duration">
                      기간 (선택)
                    </label>
                    <input className={styles.input} id="duration" placeholder="예) 6주" type="text"/>
                  </div>
                </div>
              </section>

              <hr className={styles.divider}/>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>태그</h2>
                <div className={styles.tagRow}>
                  {tags.map((tag) => (<span className={styles.tag} key={tag}>
                      {tag}
                      <button aria-label={`${tag} 제거`} className={styles.tagRemove} onClick={() => removeTag(tag)} type="button">
                        <X size={10}/>
                      </button>
                    </span>))}
                  <button className={styles.addTagBtn} onClick={() => {
                const t = prompt('태그 입력');
                if (t?.trim())
                    setTags((prev) => [...prev, t.trim()]);
            }} type="button">
                    <Plus size={11}/>
                    태그 추가
                  </button>
                </div>
              </section>
            </>)}

          {activeTab === 'result' && (<section className={styles.section}>
              <h2 className={styles.sectionTitle}>결과물 설명</h2>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="result-desc">
                  결과물 상세 설명
                </label>
                <textarea className={`${styles.input} ${styles.textarea}`} id="result-desc" placeholder="납품된 결과물, 품질 지표, 클라이언트 반응 등을 기술해 주세요." style={{ minHeight: 140 }}/>
              </div>
            </section>)}

          {activeTab === 'meta' && (<section className={styles.section}>
              <h2 className={styles.sectionTitle}>SEO 메타</h2>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="meta-title">
                  메타 타이틀
                </label>
                <input className={styles.input} id="meta-title" placeholder="케이스 제목 | VisionFlow Work" type="text"/>
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="meta-desc">
                  메타 설명
                </label>
                <textarea className={`${styles.input} ${styles.textarea}`} id="meta-desc" placeholder="검색 결과에 표시될 설명 (160자 이내)" style={{ minHeight: 80 }}/>
              </div>
            </section>)}

          {activeTab === 'notes' && (<section className={styles.section}>
              <h2 className={styles.sectionTitle}>내부 메모</h2>
              <textarea className={`${styles.input} ${styles.textarea}`} placeholder="팀 내부 참고 사항을 자유롭게 작성하세요." style={{ minHeight: 120 }}/>
            </section>)}
        </div>

        {/* Save row */}
        <div className={styles.saveRow}>
          <Link className={styles.cancelBtn} href={ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}>
            <ArrowLeft aria-hidden="true" size={13}/>
            취소
          </Link>
          <div className={styles.saveActions}>
            <button className={styles.draftBtn} type="button">
              DRAFT 저장
            </button>
            <button className={styles.submitBtn} type="button">
              <FileText aria-hidden="true" size={13}/>
              검토 요청
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel — Checklist */}
      <div className={styles.rightPanel}>
        <div className={styles.previewHeader}>
          <span className={styles.previewLabel}>작성 체크리스트</span>
        </div>

        <div className={styles.previewBody}>
          <div className={styles.previewEmpty}>
            <Eye aria-hidden="true" className={styles.previewEmptyIcon} size={40}/>
            <p className={styles.previewEmptyTitle}>미리보기 준비 중</p>
            <p className={styles.previewEmptyDesc}>내용을 입력하면 미리보기가 표시됩니다.</p>
          </div>

          <div className={styles.checklist}>
            <h3 className={styles.checklistTitle}>등록 체크리스트</h3>
            {CHECKLIST.map((item) => (<div className={styles.checkItem} data-done={item.done} key={item.label}>
                <span className={`${styles.checkDot} ${item.done ? styles.checkDotDone : ''}`}/>
                {item.label}
              </div>))}
          </div>
        </div>
      </div>
    </div>);
}
