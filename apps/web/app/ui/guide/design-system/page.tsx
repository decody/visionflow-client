'use client';

import { theme } from '@visionflow/shared';
import { useState } from 'react';

import { PaletteIcon } from 'lucide-react';
import styles from './page.module.css';

const colorTokens = [
  {
    name: 'Primary',
    hex: theme.color.primary,
    variable: '--color-primary',
    swatchClass: styles.primarySwatch,
  },
  {
    name: 'Primary Light',
    hex: theme.color['primary-light'],
    variable: '--color-primary-light',
    swatchClass: styles.primaryLightSwatch,
  },
  {
    name: 'Primary Dark',
    hex: theme.color['primary-dark'],
    variable: '--color-primary-dark',
    swatchClass: styles.primaryDarkSwatch,
  },
  {
    name: 'Secondary',
    hex: theme.color.secondary,
    variable: '--color-secondary',
    swatchClass: styles.secondarySwatch,
  },
  {
    name: 'Background',
    hex: theme.color.background,
    variable: '--color-background',
    bordered: true,
    swatchClass: styles.backgroundSwatch,
  },
  {
    name: 'Surface',
    hex: theme.color.surface,
    variable: '--color-surface',
    bordered: true,
    swatchClass: styles.surfaceSwatch,
  },
  {
    name: 'Border',
    hex: theme.color.border,
    variable: '--color-border',
    swatchClass: styles.borderSwatch,
  },
  {
    name: 'Success',
    hex: theme.color.success,
    variable: '--color-success',
    swatchClass: styles.successSwatch,
  },
  {
    name: 'Danger',
    hex: theme.color.danger,
    variable: '--color-danger',
    swatchClass: styles.dangerSwatch,
  },
  {
    name: 'Brand Green',
    hex: theme.color['brand-green'],
    variable: '--color-brand-green',
    swatchClass: styles.brandGreenSwatch,
  },
];

const typographyTokens = [
  {
    name: 'H1',
    token: 'text-3xl',
    size: theme.font.size['3xl'],
    weight: 'Bold',
    weightValue: theme.font.weight.bold,
    description: '페이지 제목',
    variable: '--font-size-3xl',
    className: styles.h1Sample,
  },
  {
    name: 'H2',
    token: 'text-xl',
    size: theme.font.size.xl,
    weight: 'Bold',
    weightValue: theme.font.weight.bold,
    description: '섹션 제목',
    variable: '--font-size-xl',
    className: styles.h2Sample,
  },
  {
    name: 'Body',
    token: 'text-base',
    size: theme.font.size.base,
    weight: 'Regular',
    weightValue: theme.font.weight.regular,
    description: '본문 텍스트',
    variable: '--font-size-base',
    className: styles.bodySample,
  },
  {
    name: 'Caption',
    token: 'text-sm',
    size: theme.font.size.sm,
    weight: 'Regular',
    weightValue: theme.font.weight.regular,
    description: '보조 텍스트',
    variable: '--font-size-sm',
    className: styles.captionSample,
  },
  {
    name: 'Label',
    token: 'text-xs',
    size: theme.font.size.xs,
    weight: 'Medium',
    weightValue: theme.font.weight.medium,
    description: '캡션, 날짜',
    variable: '--font-size-xs',
    className: styles.labelSample,
  },
];

const spacingTokens: Array<{ name: string; value: string; variable: string }> = [
  { name: 'spacing-0', value: theme.spacing['0'], variable: '--spacing-0' },
  { name: 'spacing-2', value: theme.spacing['2'], variable: '--spacing-2' },
  { name: 'spacing-4', value: theme.spacing['4'], variable: '--spacing-4' },
  { name: 'spacing-8', value: theme.spacing['8'], variable: '--spacing-8' },
  { name: 'spacing-12', value: theme.spacing['12'], variable: '--spacing-12' },
  { name: 'spacing-16', value: theme.spacing['16'], variable: '--spacing-16' },
  { name: 'spacing-20', value: theme.spacing['20'], variable: '--spacing-20' },
  { name: 'spacing-24', value: theme.spacing['24'], variable: '--spacing-24' },
  { name: 'spacing-30', value: theme.spacing['30'], variable: '--spacing-30' },
  { name: 'spacing-32', value: theme.spacing['32'], variable: '--spacing-32' },
  { name: 'spacing-40', value: theme.spacing['40'], variable: '--spacing-40' },
  { name: 'spacing-48', value: theme.spacing['48'], variable: '--spacing-48' },
];

const layoutRows = [
  {
    breakpoint: 'Mobile (<768)',
    container: theme.layout.grid.container.mobile,
    columns: `${theme.layout.grid.columns.mobile} columns`,
    gutter: theme.layout.grid.gutter.mobile,
    variables: [
      '--layout-grid-container-mobile',
      '--layout-grid-columns-mobile',
      '--layout-grid-gutter-mobile',
    ],
  },
  {
    breakpoint: 'Tablet (768-1023)',
    container: theme.layout.grid.container.tablet,
    columns: `${theme.layout.grid.columns.tablet} columns`,
    gutter: theme.layout.grid.gutter.tablet,
    variables: [
      '--layout-grid-container-tablet',
      '--layout-grid-columns-tablet',
      '--layout-grid-gutter-tablet',
    ],
  },
  {
    breakpoint: 'Desktop (1024-1639)',
    container: theme.layout.grid.container.desktop,
    columns: `${theme.layout.grid.columns.desktop} columns`,
    gutter: theme.layout.grid.gutter.desktop,
    variables: [
      '--layout-grid-container-desktop',
      '--layout-grid-columns-desktop',
      '--layout-grid-gutter-desktop',
    ],
  },
  {
    breakpoint: 'Wide (>=1640)',
    container: theme.layout.grid.container.wide,
    columns: `${theme.layout.grid.columns.wide} columns`,
    gutter: theme.layout.grid.gutter.wide,
    variables: [
      '--layout-grid-container-wide',
      '--layout-grid-columns-wide',
      '--layout-grid-gutter-wide',
    ],
  },
];

export default function DesignSystem() {
  const [copiedToken, setCopiedToken] = useState('');

  const copyVariable = async (variable: string) => {
    await navigator.clipboard.writeText(variable);
    setCopiedToken(variable);
    window.setTimeout(() => setCopiedToken(''), 1400);
  };

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <span aria-hidden="true" className={styles.titleIcon}>
            <PaletteIcon size={34} color="#EF4444" /> 
          </span>
          Design Tokens
        </h1>
      </header>

      <section aria-labelledby="color-title" className={`${styles.section} ${styles.colorSection}`}>
        <h2 className={styles.sectionTitle} id="color-title">
          Color Palette
        </h2>

        <div aria-label="Color tokens" className={styles.colorGrid}>
          {colorTokens.map((token) => (
            <article key={token.variable} className={styles.colorCard}>
              <div
                aria-hidden="true"
                className={`${styles.swatch} ${token.swatchClass} ${token.bordered ? styles.swatchBordered : ''}`}
              />
              <div className={styles.colorMeta}>
                <div>
                  <h3 className={styles.colorName}>{token.name}</h3>
                  <p className={styles.hex}>{token.hex}</p>
                  <code className={styles.tokenCode}>{token.variable}</code>
                </div>
                <button
                  aria-label={`${token.variable} copy`}
                  className={`${styles.copyButton} ${copiedToken === token.variable ? styles.copyButtonActive : ''}`}
                  onClick={() => copyVariable(token.variable)}
                  type="button"
                >
                  {copiedToken === token.variable ? 'Copied' : 'Copy'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="typography-title" className={styles.section}>
        <h2 className={styles.sectionTitle} id="typography-title">
          Typography
        </h2>

        <div className={styles.typographyList}>
          {typographyTokens.map((item) => (
            <div className={styles.typographyRow} key={item.variable}>
              <div className={styles.typographySample}>
                <span className={item.className}>
                  {item.name} - {item.token}
                </span>
              </div>
              <div className={styles.typographyMeta}>
                <span>
                  {item.size} / {item.weight} - {item.description}
                </span>
                <button
                  className={styles.copyButton}
                  onClick={() => copyVariable(item.variable)}
                  type="button"
                >
                  {copiedToken === item.variable ? 'Copied' : item.variable}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="spacing-title" className={styles.section}>
        <h2 className={styles.sectionTitle} id="spacing-title">
          Spacing
        </h2>

        <div className={styles.spacingGrid}>
          {spacingTokens.map(({ name, value, variable }) => (
            <button
              className={styles.spacingItem}
              key={variable}
              onClick={() => copyVariable(variable)}
              type="button"
            >
              <span className={styles.spacingName}>{name}</span>
              <span className={styles.spacingValue}>{value}</span>
              <span aria-hidden="true" className={styles.spacingBar} style={{ width: value }} />
              <code className={styles.tokenCode}>
                {copiedToken === variable ? 'Copied' : variable}
              </code>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="layout-grid-title" className={styles.section}>
        <h2 className={styles.sectionTitle} id="layout-grid-title">
          Layout Grid
        </h2>

        <div className={styles.layoutTable} role="table">
          <div className={styles.layoutHeader} role="row">
            <span role="columnheader">Breakpoint</span>
            <span role="columnheader">Container</span>
            <span role="columnheader">Columns</span>
            <span role="columnheader">Gutter</span>
          </div>
          {layoutRows.map((row) => (
            <button
              className={styles.layoutRow}
              key={row.breakpoint}
              onClick={() => copyVariable(row.variables.join(', '))}
              role="row"
              type="button"
            >
              <span role="cell">{row.breakpoint}</span>
              <span role="cell">{row.container}</span>
              <span role="cell">{row.columns}</span>
              <span role="cell">{row.gutter}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
