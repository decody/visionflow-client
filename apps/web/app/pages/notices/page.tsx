import styles from './page.module.css';

const notices = [
  {
    category: 'Service',
    date: '2026.05.07',
    title: 'VisionFlow 서비스 점검 안내',
    description: '안정적인 운영을 위해 새벽 시간대에 일부 기능 점검이 진행됩니다.',
  },
  {
    category: 'Update',
    date: '2026.04.28',
    title: '대시보드 성능 지표 개선',
    description: '프레임 처리량, 정확도, 지연 시간 지표를 더 빠르게 확인할 수 있도록 개선했습니다.',
  },
  {
    category: 'Guide',
    date: '2026.04.12',
    title: '3D 웹 시각화 제작 가이드 공개',
    description: '제품과 공간을 웹에서 입체적으로 보여주는 프로젝트 진행 방식을 정리했습니다.',
  },
];

const summaryItems = [
  { label: '전체 공지', value: '24' },
  { label: '이번 달', value: '3' },
  { label: '서비스', value: '8' },
  { label: '업데이트', value: '13' },
];

export default function Notices() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>Notice</p>
          <h1 className={styles.title}>공지사항</h1>
          <p className={styles.description}>
            VisionFlow의 서비스 운영 소식과 업데이트 안내를 확인하세요.
          </p>
        </div>

        <div aria-label="공지 요약" className={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <div className={styles.summaryItem} key={item.label}>
              <strong className={styles.summaryValue}>{item.value}</strong>
              <span className={styles.summaryLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section aria-label="공지 목록" className={styles.noticeList}>
        {notices.map((notice) => (
          <article className={styles.noticeItem} key={`${notice.category}-${notice.date}`}>
            <div className={styles.noticeBody}>
              <div className={styles.noticeMeta}>
                <span className={styles.badge}>{notice.category}</span>
                <time dateTime={notice.date.replaceAll('.', '-')}>{notice.date}</time>
              </div>
              <h2 className={styles.noticeTitle}>{notice.title}</h2>
              <p className={styles.noticeText}>{notice.description}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
