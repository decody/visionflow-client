import { ROUTES } from '@visionflow/routes';
import { Gauge, Home } from 'lucide-react';
import Link from 'next/link';
import styles from './not-found.module.css';
export default function NotFound() {
    return (<section className={styles.notFound}>
      <div className={styles.panel}>
        <div className={styles.icon} aria-hidden="true">
          <Gauge size={26} strokeWidth={2.2}/>
        </div>

        <div>
          <p className={styles.eyebrow}>404</p>
          <h2 className={styles.title}>관리자 페이지를 찾을 수 없습니다.</h2>
          <p className={styles.description}>
            접근한 관리 경로가 없거나 권한 정책 변경으로 이동할 수 없습니다. 콘솔 홈에서 작업
            상태와 운영 메뉴를 다시 확인해 주세요.
          </p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryAction} href={ROUTES.ADMIN.HOME}>
            <Home size={17} aria-hidden="true"/>
            콘솔 홈으로 이동
          </Link>
          <Link className={styles.secondaryAction} href={ROUTES.ADMIN.NOTICES}>
     
            공지사항 보기
          </Link>
        </div>
      </div>
    </section>);
}
