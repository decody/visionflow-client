'use client';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import styles from './web-3d-page.module.css';

const FABRICS = [
  { id: 'deepblue', label: '딥블루', color: '#0e3c8e', extra: 0 },
  { id: 'charcoal', label: '차콜', color: '#3a3d44', extra: 0 },
  { id: 'oatmeal', label: '오트밀', color: '#d4c5a3', extra: 50_000 },
  { id: 'rust', label: '러스트', color: '#a04634', extra: 50_000 },
  { id: 'olive', label: '올리브', color: '#5d6738', extra: 80_000 },
] as const;

const LEGS = [
  { id: 'walnut', label: '월넛 우드', color: '#8a5a2b', extra: 0 },
  { id: 'black', label: '블랙 메탈', color: '#2b2e33', extra: 120_000 },
  { id: 'gold', label: '브러쉬드 골드', color: '#c9a44c', extra: 380_000 },
] as const;

const BASE_PRICE = 1_890_000;

export function SofaConfigurator() {
  const [fabric, setFabric] = useState<string>('deepblue');
  const [leg, setLeg] = useState<string>('walnut');

  const activeFabric = FABRICS.find((f) => f.id === fabric)!;
  const activeLeg = LEGS.find((l) => l.id === leg)!;

  const price = useMemo(
    () => BASE_PRICE + activeFabric.extra + activeLeg.extra,
    [activeFabric.extra, activeLeg.extra],
  );

  return (
    <div className={styles.demoBody}>
      {/* 좌: 3D 뷰포트 */}
      <div className={styles.demoViewport}>
        <span className={`${styles.demoViewBadge} ${styles.demoViewBadgeLeft}`}>
          <span className={styles.demoViewPulse} />
          LIVE 3D
        </span>
        <span className={`${styles.demoViewBadge} ${styles.demoViewBadgeRight}`}>
          60 FPS · 4.2 MB
        </span>
        <img
          alt="소파 3D 미리보기"
          className={styles.demoSofa}
          src="/images/web-3d/sofa.png"
          style={{
            filter: `drop-shadow(0 30px 40px rgba(0,0,0,0.5)) drop-shadow(0 0 0 ${activeFabric.color})`,
          }}
        />
        <span className={styles.demoViewHint}>
          ↻ 드래그로 회전 · 두 손가락으로 줌
        </span>
      </div>

      {/* 우: 옵션 패널 */}
      <div className={styles.demoPanel}>
        <div>
          <h3 className={styles.demoPanelTitle}>소파 컨피규레이터</h3>
          <p className={styles.demoPanelSub}>
            옵션을 선택하면 3D 모델이 즉시 갱신됩니다
          </p>
        </div>

        {/* 패브릭 */}
        <div className={styles.demoGroup}>
          <div className={styles.demoGroupHead}>
            <span className={styles.demoGroupLabel}>패브릭</span>
            <span className={styles.demoGroupValue}>{activeFabric.label}</span>
          </div>
          <div className={styles.demoSwatches}>
            {FABRICS.map((f) => (
              <button
                aria-label={f.label}
                aria-pressed={fabric === f.id}
                className={`${styles.demoSwatch} ${fabric === f.id ? styles.demoSwatchActive : ''}`}
                key={f.id}
                onClick={() => setFabric(f.id)}
                style={{ background: f.color }}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className={styles.demoDivider} />

        {/* 다리 */}
        <div className={styles.demoGroup}>
          <div className={styles.demoGroupHead}>
            <span className={styles.demoGroupLabel}>다리</span>
            <span className={styles.demoGroupValue}>{activeLeg.label}</span>
          </div>
          <div className={styles.demoLegs}>
            {LEGS.map((l) => (
              <button
                aria-pressed={leg === l.id}
                className={`${styles.demoLeg} ${leg === l.id ? styles.demoLegActive : ''}`}
                key={l.id}
                onClick={() => setLeg(l.id)}
                type="button"
              >
                <span className={styles.demoLegDot} style={{ background: l.color }} />
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.demoDivider} />

        {/* 실시간 견적 */}
        <div className={styles.demoPrice}>
          <span className={styles.demoPriceLabel}>
            실시간 견적
            <span className={styles.demoPricePulse} />
          </span>
          <span className={styles.demoPriceValue}>
            ₩ {price.toLocaleString('ko-KR')}
          </span>
        </div>

        <Link className={styles.demoCta} href={ROUTES.CONTACT.QUOTE}>
          이런 컨피규레이터 만들기 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
