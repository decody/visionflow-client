'use client';

import { ROUTES } from '@visionflow/routes';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Globe,
  MapPin,
  MoreHorizontal,
  Paperclip,
  Plus,
  Send,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import styles from './quote-request-detail-page.module.css';

const TABS = [
  { count: null, key: 'request' as const, label: '요청 본문' },
  { count: null, key: 'quote' as const, label: '견적서 작성' },
  { count: null, key: 'reply' as const, label: '회신' },
  { count: 8, key: 'history' as const, label: '히스토리' },
  { count: null, key: 'memo' as const, label: '내부 메모' },
];

type LineItem = {
  description: string;
  id: string;
  qty: string;
  rate: string;
  title: string;
  total: string;
};

const LINE_ITEMS: ReadonlyArray<LineItem> = [
  {
    description: '신제품 라인 톤·무드 학습 1회 · 50–100 epoch · 검수 포함',
    id: 'item-1',
    qty: '1식',
    rate: '₩2,500,000',
    title: 'Brand LoRA 학습',
    total: '₩2,500,000',
  },
  {
    description: '메인 컷 30종 · 스킨케어 6 SKU × 5컷 · 검수 2회',
    id: 'item-2',
    qty: '30컷',
    rate: '₩70,000',
    title: '제품 광고 이미지 양산 (4K)',
    total: '₩2,100,000',
  },
  {
    description: '네이버 1:1 / 카카오 1:2 / 인스타 1:1, 4:5, 9:16 / 구글 디스플레이 5종',
    id: 'item-3',
    qty: '300컷',
    rate: '₩4,000',
    title: '채널 변환 (정사각/세로/가로)',
    total: '₩1,200,000',
  },
  {
    description: '상품 SEO 강화 · 채널별 ALT 작성 · UTM 권장',
    id: 'item-4',
    qty: '30식',
    rate: '₩30,000',
    title: '이미지 메타데이터 + Alt 텍스트',
    total: '₩900,000',
  },
];

export function QuoteRequestDetailPage({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<
    'request' | 'quote' | 'reply' | 'history' | 'memo'
  >('quote');

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.breadcrumb}>
          <span>대시보드</span>
          <span aria-hidden="true">/</span>
          <span>인박스</span>
          <span aria-hidden="true">/</span>
          <Link href={ROUTES.ADMIN.QUOTE_REQUEST.ROOT}>견적 문의</Link>
          <span aria-hidden="true">/</span>
          <span className={styles.breadcrumbCurrent}>#{id} · 에스엘 코스메틱</span>
        </p>

        <div className={styles.pageNav}>
          <Link className={styles.backLink} href={ROUTES.ADMIN.QUOTE_REQUEST.ROOT}>
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
            <span className={styles.servicePill}>광고 이미지</span>
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
            S
          </span>
          <div className={styles.companyInfo}>
            <h1 className={styles.companyName}>에스엘 코스메틱</h1>
            <p className={styles.companyMetaLine}>
              <span className={styles.metaItem}>
                <Globe aria-hidden="true" size={13} />
                sl-cosmetics.com
              </span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span>뷰티/화장품</span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span>연 매출 ₩45억</span>
              <span aria-hidden="true" className={styles.metaSep}>
                ·
              </span>
              <span className={styles.metaItem}>
                <MapPin aria-hidden="true" size={13} />
                서울 · 성수동
              </span>
            </p>
          </div>
        </div>

        <dl className={styles.companyGrid}>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>CONTACT</dt>
            <dd className={styles.gridValue}>
              <strong>윤서연</strong>
              <span>CMO · 010-9382-····</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>예산 범위</dt>
            <dd className={styles.gridValue}>
              <strong>₩500–800만</strong>
              <span>· 범위 추정</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>희망 일정</dt>
            <dd className={styles.gridValue}>
              <strong>6주</strong>
              <span>· 6/15 런칭 목표</span>
            </dd>
          </div>
          <div className={styles.gridItem}>
            <dt className={styles.gridLabel}>유입 출처</dt>
            <dd className={styles.gridValue}>
              <strong>organic search</strong>
              <span>· /service/ad-images</span>
            </dd>
          </div>
        </dl>
      </article>

      <aside className={styles.slaCard}>
        <span aria-hidden="true" className={styles.slaIcon}>
          <Timer size={18} />
        </span>
        <div className={styles.slaBody}>
          <p className={styles.slaTitle}>SLA 1차 응답까지 20시간 28분</p>
          <p className={styles.slaMeta}>
            견적 SLA 24시간 (가장 빠른 인박스) · 미할당 · 자동 에스컬레이션 4시간 후
          </p>
        </div>
        <div className={styles.slaActions}>
          <button className={styles.slaSecondary} type="button">
            먼저 회신
          </button>
          <button className={styles.slaButton} type="button">
            견적 작성
            <ArrowRight aria-hidden="true" size={14} />
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

      <div className={styles.contentGrid}>
        <article className={styles.requestCard}>
          <header className={styles.requestHeader}>
            <span aria-hidden="true" className={styles.requestAvatar}>
              R
            </span>
            <strong className={styles.requestHeading}>견적 요청 내용</strong>
          </header>

          <div className={styles.authorRow}>
            <span aria-hidden="true" className={styles.authorAvatar}>
              윤
            </span>
            <div className={styles.authorInfo}>
              <strong>윤서연 · CMO</strong>
              <span>오늘 14:32 · seoyeon.yoon@sl-cosmetics.com</span>
            </div>
          </div>

          <section className={styles.requestSection}>
            <h2 className={styles.sectionTitle}>프로젝트 한 줄</h2>
            <p className={styles.sectionLead}>
              시즌 캠페인용 제품 광고 이미지 30컷 · LoRA 학습 + 4채널 동시 운영
            </p>
          </section>

          <section className={styles.requestSection}>
            <h2 className={styles.sectionTitle}>주요 요구사항</h2>
            <ul className={styles.requirementList}>
              <li>신제품 라인 (스킨케어 6종) 제품 광고 이미지 30컷</li>
              <li>브랜드 톤 일관성을 위해 자체 LoRA 학습 필요</li>
              <li>
                채널별 변환: 네이버 (정사각) · 카카오 (1:2) · 인스타 (1:1, 4:5, 9:16) · 구글
                디스플레이 (160×600 등 5종)
              </li>
              <li>6/15 신제품 런칭 D-day 기준으로 양산</li>
            </ul>
          </section>

          <section className={styles.requestSection}>
            <h2 className={styles.sectionTitle}>제공 자료</h2>
            <p className={styles.sectionBody}>
              브랜드 가이드라인 v2.4 · 기존 제품 사진 100여 점 · 톤·무드 레퍼런스 (NDA 체결 후
              제공)
            </p>
          </section>

          <section className={styles.requestSection}>
            <h2 className={styles.sectionTitle}>첨부 자료</h2>
            <div className={styles.attachmentRow}>
              <a className={styles.attachmentChip} href="#">
                <Paperclip aria-hidden="true" size={12} />
                brand_guideline_v2.4.pdf
                <span>· 4.2MB</span>
              </a>
              <a className={styles.attachmentChip} href="#">
                <Paperclip aria-hidden="true" size={12} />
                product_photos.zip
                <span>· 24MB</span>
              </a>
              <a className={styles.attachmentChip} href="#">
                <Paperclip aria-hidden="true" size={12} />
                mood_references.pdf
                <span>· 8.6MB</span>
              </a>
            </div>
          </section>
        </article>

        <article className={styles.quoteBuilder}>
          <header className={styles.quoteHeader}>
            <span aria-hidden="true" className={styles.quoteAvatar}>
              Q
            </span>
            <div className={styles.quoteHeading}>
              <strong>견적서 작성</strong>
              <span> · 라인 아이템 기반</span>
            </div>
            <button className={styles.previewButton} type="button">
              <Eye aria-hidden="true" size={13} />
              PDF 미리보기
            </button>
            <button className={styles.templateButton} type="button">
              <FileText aria-hidden="true" size={13} />
              템플릿: 광고 이미지 견적
              <ChevronDown aria-hidden="true" size={13} />
            </button>
          </header>

          <dl className={styles.quoteFields}>
            <div className={styles.quoteField}>
              <dt>견적 번호</dt>
              <dd>#Q-2891-01</dd>
            </div>
            <div className={styles.quoteField}>
              <dt>유효 기간</dt>
              <dd>14일</dd>
            </div>
            <div className={styles.quoteField}>
              <dt>통화</dt>
              <dd>KRW</dd>
            </div>
            <div className={styles.quoteField}>
              <dt>VAT</dt>
              <dd>별도 (10%)</dd>
            </div>
          </dl>

          <div className={styles.itemTableWrap}>
            <table className={styles.itemTable}>
              <thead>
                <tr>
                  <th>항목</th>
                  <th className={styles.numCell}>수량</th>
                  <th className={styles.numCell}>단가</th>
                  <th className={styles.numCell}>합계</th>
                  <th aria-label="action" />
                </tr>
              </thead>
              <tbody>
                {LINE_ITEMS.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className={styles.itemTitle}>{item.title}</strong>
                      <p className={styles.itemDesc}>{item.description}</p>
                    </td>
                    <td className={styles.numCell}>{item.qty}</td>
                    <td className={styles.numCell}>{item.rate}</td>
                    <td className={`${styles.numCell} ${styles.totalCell}`}>{item.total}</td>
                    <td className={styles.itemAction}>
                      <button aria-label="옵션" className={styles.iconBtn} type="button">
                        <MoreHorizontal aria-hidden="true" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={styles.addItemButton} type="button">
              <Plus aria-hidden="true" size={14} />
              항목 추가
            </button>
          </div>

          <section className={styles.notesSection}>
            <h3 className={styles.notesTitle}>비고</h3>
            <p className={styles.notesBody}>
              · LoRA 학습 데이터는 NDA 체결 후 5/10까지 전달 필요 · 양산 시작 5/13 · 1차 검수
              5/22 · 최종 납품 6/01 · 결제: 계약금 30% / 1차 검수 후 40% / 최종 납품 30%
            </p>
          </section>

          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>소계</dt>
              <dd>₩6,700,000</dd>
            </div>
            <div className={styles.totalRow}>
              <dt>할인 (5%)</dt>
              <dd className={styles.discount}>−₩335,000</dd>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <dt>합계 (VAT 별도)</dt>
              <dd>₩6,365,000</dd>
            </div>
          </dl>

          <footer className={styles.quoteFooter}>
            <label className={styles.checkbox}>
              <input defaultChecked type="checkbox" />
              <span aria-hidden="true" className={styles.checkboxBox} />
              클라이언트에 PDF 첨부 발송
            </label>
            <div className={styles.quoteActions}>
              <button className={styles.saveButton} type="button">
                임시 저장
              </button>
              <button className={styles.submitButton} type="button">
                <Send aria-hidden="true" size={14} />
                견적서 발송
              </button>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
