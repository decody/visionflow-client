'use client';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import styles from './web-app-page.module.css';

type ServiceType = 'landing' | 'brand' | 'ecommerce' | 'app';

const SERVICE_OPTIONS = [
  { value: 'landing' as ServiceType, label: '랜딩페이지', duration: '2–4주', minBase: 600, maxBase: 1200, weekMin: 2, weekMax: 4, pkg: 'Landing Page Standard' },
  { value: 'brand' as ServiceType, label: '브랜드 사이트', duration: '4–8주', minBase: 1500, maxBase: 2800, weekMin: 4, weekMax: 8, pkg: 'Brand Site Standard' },
  { value: 'ecommerce' as ServiceType, label: '이커머스', duration: '6–12주', minBase: 3000, maxBase: 5500, weekMin: 6, weekMax: 12, pkg: 'E-Commerce Full' },
  { value: 'app' as ServiceType, label: '모바일 앱', duration: '8–16주', minBase: 4000, maxBase: 7000, weekMin: 8, weekMax: 16, pkg: 'Mobile App Standard' },
] as const;

// slider: step 0-3 → 5p / 10p / 20p / 30p+
const PAGE_TICKS = ['5p', '10p', '20p', '30p+'];
const PAGE_MULTIPLIERS = [1, 1.2, 1.5, 1.8];

export function EstimateSimulator() {
  const [service, setService] = useState<ServiceType>('brand');
  const [pageStep, setPageStep] = useState(1); // default: 10p
  const [i18n, setI18n] = useState(true);
  const [admin, setAdmin] = useState(true);
  const [aiPkg, setAiPkg] = useState(false);

  const result = useMemo(() => {
    const svc = SERVICE_OPTIONS.find((s) => s.value === service)!;
    const pageMul = PAGE_MULTIPLIERS[pageStep] ?? 1;
    const i18nCost = i18n ? 300 : 0;
    const adminCost = admin ? 500 : 0;

    const priceMin = Math.round((svc.minBase * pageMul + i18nCost + adminCost) / 100) * 100;
    const priceMax = Math.round((svc.maxBase * pageMul + i18nCost * 1.2 + adminCost * 1.2) / 100) * 100;

    const weekMin = svc.weekMin + (i18n ? 1 : 0) + (admin ? 1 : 0);
    const weekMax = svc.weekMax + (i18n ? 2 : 0) + (admin ? 2 : 0);

    const extras = [i18n && 'Multilingual', admin && 'Admin'].filter(Boolean).join(' + ');
    const pkg = extras ? `${svc.pkg} + ${extras}` : svc.pkg;

    return { priceMin, priceMax, weekMin, weekMax, pkg };
  }, [service, pageStep, i18n, admin]);

  const sliderPct = (pageStep / 3) * 100;

  return (
    <div className={styles.simRow}>
      {/* ── 좌: Inputs ── */}
      <div className={styles.simInputs}>

        {/* Field 1 — 서비스 종류 */}
        <div className={styles.simField}>
          <div className={styles.simFieldLabel}>
            <span className={styles.simFieldNum}>1</span>
            어떤 서비스가 필요하신가요?
          </div>
          <div className={styles.simServiceOpts}>
            {SERVICE_OPTIONS.map((s) => (
              <button
                className={`${styles.simServiceOpt} ${service === s.value ? styles.simServiceOptActive : ''}`}
                key={s.value}
                onClick={() => setService(s.value)}
                type="button"
              >
                <span className={styles.simServiceOptTitle}>{s.label}</span>
                <span className={styles.simServiceOptDur}>{s.duration}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Field 2 — 페이지 수 슬라이더 */}
        <div className={styles.simField}>
          <div className={styles.simFieldLabel}>
            <span className={styles.simFieldNum}>2</span>
            몇 페이지(또는 화면) 정도가 필요하신가요?
          </div>
          <div className={styles.simSliderWrap}>
            <div className={styles.simSliderTrack}>
              <div className={styles.simSliderFill} style={{ width: `${sliderPct}%` }} />
            </div>
            {/* 시각적 thumb */}
            <div
              aria-hidden="true"
              className={styles.simSliderThumb}
              style={{ left: `calc(${sliderPct}% - 11px)` }}
            />
            <input
              className={styles.simSliderInput}
              max={3}
              min={0}
              onChange={(e) => setPageStep(Number(e.target.value))}
              step={1}
              type="range"
              value={pageStep}
            />
          </div>
          <div className={styles.simSliderTicks}>
            {PAGE_TICKS.map((t, i) => (
              <span className={`${styles.simSliderTick} ${i === pageStep ? styles.simSliderTickActive : ''}`} key={t}>
                {t}
              </span>
            ))}
          </div>
          <p className={styles.simSliderHint}>
            약 {PAGE_TICKS[pageStep]} 선택 — {pageStep === 0 ? '단일 랜딩 페이지 규모' : pageStep === 1 ? '회사 소개·서비스·블로그·문의 등 표준 브랜드 사이트 규모' : pageStep === 2 ? '중규모 이커머스·플랫폼 규모' : '대규모 서비스·엔터프라이즈 규모'}
          </p>
        </div>

        {/* Toggle 3 — 다국어 */}
        <div className={styles.simSwitchRow}>
          <div className={styles.simSwitchLeft}>
            <span className={styles.simFieldNum}>3</span>
            <div>
              <p className={styles.simSwitchTitle}>다국어(i18n) 지원</p>
              <p className={styles.simSwitchSub}>한국어 외 영어·일본어·중국어 등 다국어 운영 필요</p>
            </div>
          </div>
          <button
            aria-checked={i18n}
            className={`${styles.simToggle} ${i18n ? styles.simToggleOn : ''}`}
            onClick={() => setI18n((v) => !v)}
            role="switch"
            type="button"
          >
            <span className={styles.simToggleKnob} />
          </button>
        </div>

        {/* Toggle 4 — 관리자 페이지 */}
        <div className={styles.simSwitchRow}>
          <div className={styles.simSwitchLeft}>
            <span className={styles.simFieldNum}>4</span>
            <div>
              <p className={styles.simSwitchTitle}>관리자 페이지</p>
              <p className={styles.simSwitchSub}>회원·콘텐츠·주문 등을 직접 관리할 수 있는 어드민 화면</p>
            </div>
          </div>
          <button
            aria-checked={admin}
            className={`${styles.simToggle} ${admin ? styles.simToggleOn : ''}`}
            onClick={() => setAdmin((v) => !v)}
            role="switch"
            type="button"
          >
            <span className={styles.simToggleKnob} />
          </button>
        </div>

        {/* Toggle 5 — AI 패키지 결합 */}
        <div className={styles.simSwitchRow}>
          <div className={styles.simSwitchLeft}>
            <span className={styles.simFieldNum}>5</span>
            <div>
              <p className={styles.simSwitchTitle}>AI 콘텐츠 패키지 결합</p>
              <p className={styles.simSwitchSub}>광고 이미지·3D 자산·영상까지 한 팀에서 함께 제작</p>
            </div>
          </div>
          <button
            aria-checked={aiPkg}
            className={`${styles.simToggle} ${aiPkg ? styles.simToggleOn : ''}`}
            onClick={() => setAiPkg((v) => !v)}
            role="switch"
            type="button"
          >
            <span className={styles.simToggleKnob} />
          </button>
        </div>
      </div>

      {/* ── 우: Result ── */}
      <div className={styles.simResult}>
        <span className={styles.simResultBadge}>
          <span className={styles.simResultPulse} />
          실시간 예상 견적
        </span>

        <div className={styles.simBudget}>
          <p className={styles.simBudgetLabel}>예상 견적 범위</p>
          <p className={styles.simBudgetValue}>
            ₩ {result.priceMin.toLocaleString('ko-KR')} ~ {result.priceMax.toLocaleString('ko-KR')}만원
          </p>
          <p className={styles.simBudgetNote}>VAT 별도 · 디자인 시안 단계 후 확정</p>
        </div>

        <hr className={styles.simDivider} />

        <div className={styles.simDuration}>
          <span className={styles.simDurationLabel}>예상 기간</span>
          <span className={styles.simDurationValue}>{result.weekMin} ~ {result.weekMax}주</span>
        </div>

        <div className={styles.simPkg}>
          <p className={styles.simPkgLabel}>★ 권장 패키지</p>
          <p className={styles.simPkgTitle}>{result.pkg}</p>
          {aiPkg && (
            <p className={styles.simPkgSub}>AI 패키지 결합 시 이미지 자산 무료 30컷 추가 →</p>
          )}
        </div>

        <Link className={styles.simCta} href={ROUTES.CONTACT.QUOTE}>
          이 견적으로 문의하기 →
        </Link>

        <p className={styles.simWarning}>
          ⚠ 참고용 범위입니다. 정확한 견적은 1주 디스커버리 후 확정됩니다.
        </p>
      </div>
    </div>
  );
}
