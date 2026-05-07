'use client';

import { useState } from 'react';
import { theme } from '@visionflow/shared';

import styles from './page.module.css';

const colorTokens = [
  { name: 'Primary', hex: theme.color.primary, variable: '--color-primary', swatchClass: styles.primarySwatch },
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
  { name: 'Secondary', hex: theme.color.secondary, variable: '--color-secondary', swatchClass: styles.secondarySwatch },
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
  { name: 'Border', hex: theme.color.border, variable: '--color-border', swatchClass: styles.borderSwatch },
  { name: 'Success', hex: theme.color.success, variable: '--color-success', swatchClass: styles.successSwatch },
  { name: 'Danger', hex: theme.color.danger, variable: '--color-danger', swatchClass: styles.dangerSwatch },
  {
    name: 'Brand Green',
    hex: theme.color['brand-green'],
    variable: '--color-brand-green',
    swatchClass: styles.brandGreenSwatch,
  },
];

export default function DesignSystem() {
  const [copiedToken, setCopiedToken] = useState('');

  const copyVariable = async (variable: string) => {
    await navigator.clipboard.writeText(`var(${variable})`);
    setCopiedToken(variable);
    window.setTimeout(() => setCopiedToken(''), 1400);
  };

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <h1 className={styles.title}>Color Palette</h1>
      </section>

      <section aria-label="Color tokens" className={styles.grid}>
        {colorTokens.map((token) => (
          <article key={token.variable} className={styles.card}>
            <div
              aria-hidden="true"
              className={`${styles.swatch} ${token.swatchClass} ${token.bordered ? styles.swatchBordered : ''}`}
            />
            <div className={styles.meta}>
              <div>
                <h2 className={styles.name}>{token.name}</h2>
                <p className={styles.hex}>{token.hex}</p>
                <code className={styles.variable}>{token.variable}</code>
              </div>
              <button
                aria-label={`${token.variable} copy`}
                className={`${styles.copyButton} ${
                  copiedToken === token.variable ? styles.copyButtonActive : ''
                }`}
                onClick={() => copyVariable(token.variable)}
                type="button"
              >
                {copiedToken === token.variable ? 'Copied' : 'Copy'}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
