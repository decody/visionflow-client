import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

const customerLogos = [
  [
    { src: '/images/logos/nordic.png', alt: 'NORDIC' },
    { src: '/images/logos/atlas.png', alt: 'ATLAS.io' },
    { src: '/images/logos/lumina.png', alt: 'LUMINA' },
    { src: '/images/logos/flux.png', alt: 'FLUX' },
    { src: '/images/logos/greenday.png', alt: 'Greenday' },
  ],
  [
    { src: '/images/logos/vertex.png', alt: 'VERTEX' },
    { src: '/images/logos/earthliving.png', alt: 'earthliving' },
    { src: '/images/logos/brevia.png', alt: 'Brevia' },
    { src: '/images/logos/apex.png', alt: 'APEX' },
    { src: '/images/logos/stellar.png', alt: 'stellar' },
  ],
];

export function LogosSection() {
  return (
    <section className={styles.logos}>
      <Container>
        <p className={styles.logosLabel}>TRUSTED BY 80+ COMPANIES</p>
        {customerLogos.map((row, i) => (
          <ul className={styles.logoRow} key={`row-${i}`}>
            {row.map((logo) => (
              <li className={styles.logoItem} key={logo.alt}>
                <img
                  alt={logo.alt}
                  className={styles.logoImg}
                  height={36}
                  src={logo.src}
                />
              </li>
            ))}
          </ul>
        ))}
      </Container>
    </section>
  );
}
