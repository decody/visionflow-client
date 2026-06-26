'use client';

import { useState } from 'react';

import styles from './ad-visuals-page.module.css';

const CATEGORIES = [
  { key: 'product', label: 'Product', labelKo: '제품' },
  { key: 'person', label: 'Person', labelKo: '인물' },
  { key: 'food', label: 'Food', labelKo: '푸드' },
  { key: 'interior', label: 'Interior', labelKo: '인테리어' },
  { key: 'fashion', label: 'Fashion', labelKo: '패션' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

export function BeforeAfterSlider() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('product');
  const [sliderValue, setSliderValue] = useState(50);

  return (
    <div className={styles.baWrap}>
      {/* Category tabs */}
      <div className={styles.baTabs}>
        {CATEGORIES.map((cat) => (
          <button
            className={`${styles.baTab} ${activeCategory === cat.key ? styles.baTabActive : ''}`}
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            type="button"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Slider comparison */}
      <div className={styles.baSliderWrap}>
        {/* Before image (right) */}
        <div className={styles.baAfterImg}>
          <img
            alt="AI 제작 결과"
            className={styles.baImg}
            src={`/images/ad-visuals/ba-after-${activeCategory}.png`}
          />
          <span className={styles.baAfterLabel}>
            <span className={styles.baLabelBadge}>AFTER · AI GENERATED</span>
            <span className={styles.baLabelSub}>Flux.1 Pro + Brand LoRA · ₩8만/컷 · 5일</span>
          </span>
        </div>

        {/* After image (left, clipped) */}
        <div className={styles.baBeforeImg} style={{ width: `${sliderValue}%` }}>
          <img
            alt="스튜디오 촬영본"
            className={styles.baImg}
            src={`/images/ad-visuals/ba-before-${activeCategory}.png`}
          />
          <span className={styles.baBeforeLabel}>
            <span className={styles.baLabelBadge}>BEFORE</span>
            <span className={styles.baLabelSub}>스튜디오 촬영 · ₩15만/컷 · 2주</span>
          </span>
        </div>

        {/* Handle */}
        <div className={styles.baHandle} style={{ left: `${sliderValue}%` }}>
          <div className={styles.baHandleLine} />
          <div className={styles.baHandleCircle}>
            <svg fill="none" height={14} viewBox="0 0 14 14" width={14}>
              <path d="M5 2L2 7L5 12" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <path d="M9 2L12 7L9 12" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Range input (invisible, on top for interaction) */}
        <input
          aria-label="before/after 슬라이더"
          className={styles.baRangeInput}
          max={95}
          min={5}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          type="range"
          value={sliderValue}
        />

        <p className={styles.baHint}>← 핸들을 좌우로 드래그하세요 →</p>
      </div>

      {/* Stats */}
      <div className={styles.baStats}>
        <div className={styles.baStat}>
          <strong className={styles.baStatValue}>47%</strong>
          <span className={styles.baStatLabel}>비용 절감</span>
        </div>
        <div className={styles.baStat}>
          <strong className={styles.baStatValue}>4배</strong>
          <span className={styles.baStatLabel}>제작 속도</span>
        </div>
        <div className={styles.baStat}>
          <strong className={styles.baStatValue}>95%+</strong>
          <span className={styles.baStatLabel}>톤 일관성</span>
        </div>
      </div>
    </div>
  );
}
