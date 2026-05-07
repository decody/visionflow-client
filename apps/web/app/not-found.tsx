import { Home, Radar } from 'lucide-react';
import Link from 'next/link';

import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <section className={styles.notFound}>
      <div className={styles.panel}>
        <div className={styles.icon} aria-hidden="true">
          <Radar size={26} strokeWidth={2.2} />
        </div>

        <div>
          <p className={styles.eyebrow}>404</p>
          <h2 className={styles.title}>요청한 화면을 찾을 수 없습니다.</h2>
          <p className={styles.description}>
            이동하려는 주소가 변경되었거나 더 이상 제공되지 않는 페이지입니다. 대시보드에서
            현재 워크스페이스와 파이프라인 상태를 다시 확인해 주세요.
          </p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/">
            <Home size={17} aria-hidden="true" />
            홈으로 이동
          </Link>
        </div>
      </div>
    </section>
  );
}
