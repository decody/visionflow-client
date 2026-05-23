import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

const customerLogos = [
  ['NORDIC', 'ATLAS.io', 'LUMINA', 'FLUX', 'Greenday'],
  ['VERTEX', 'earthliving', 'Brevia', 'APEX', 'stellar'],
];

export function LogosSection() {
  return (
    <section className={styles.logos}>
      <Container>
        <p className={styles.logosLabel}>TRUSTED BY 80+ COMPANIES</p>
        {customerLogos.map((row, i) => (
          <ul className={styles.logoRow} key={`row-${i}`}>
            {row.map((logo) => (
              <li className={styles.logoItem} key={logo}>
                {logo}
              </li>
            ))}
          </ul>
        ))}
      </Container>
    </section>
  );
}
