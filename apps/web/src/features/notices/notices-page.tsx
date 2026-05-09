import { Container } from '@/components/common/container';
import type { INotice } from '@/types/notice';
import { Megaphone, Pin } from 'lucide-react';

import styles from './notices-page.module.css';

const categoryLabels: Record<string, string> = {
  announcement: '공지',
  event: '이벤트',
  maintenance: '점검',
  update: '업데이트',
};

const noticeMockItems: INotice[] = [
  {
    id: '1042',
    category: 'announcement',
    date: '2026-05-08',
    title: 'VisionFlow 서비스 운영 정책 업데이트 안내',
    description:
      '서비스 문의 접수와 프로젝트 진행 안내 기준 일부가 변경되었습니다.',
    contentHtml: null,
    contentJson: null,
    isImportant: true,
    isPublished: true,
    createdBy: '운영팀',
    createdAt: '2026-05-08T10:30:00+09:00',
    updatedAt: '2026-05-08T10:30:00+09:00',
  },
  {
    id: '1041',
    category: 'update',
    date: '2026-05-06',
    title: '3D 제작 문의 접수 프로세스 변경',
    description:
      '프로젝트 범위 확인을 위해 사전 질문 항목이 추가됩니다.',
    contentHtml: null,
    contentJson: null,
    isImportant: true,
    isPublished: true,
    createdBy: '프로덕트팀',
    createdAt: '2026-05-06T14:00:00+09:00',
    updatedAt: '2026-05-06T14:00:00+09:00',
  },
  {
    id: '1040',
    category: 'maintenance',
    date: '2026-05-12',
    title: '5월 정기 시스템 점검 사전 안내',
    description:
      '점검 시간 동안 일부 문의 접수 화면 이용이 일시적으로 제한될 수 있습니다.',
    contentHtml: null,
    contentJson: null,
    isImportant: false,
    isPublished: true,
    createdBy: '인프라팀',
    createdAt: '2026-05-05T09:00:00+09:00',
    updatedAt: '2026-05-05T09:00:00+09:00',
  },
  {
    id: '1039',
    category: 'event',
    date: '2026-05-02',
    title: '신규 포트폴리오 템플릿 공개',
    description:
      '웹 3D, 광고 비주얼, 대시보드 프로젝트 사례 구성이 업데이트되었습니다.',
    contentHtml: null,
    contentJson: null,
    isImportant: false,
    isPublished: true,
    createdBy: '마케팅팀',
    createdAt: '2026-05-02T09:15:00+09:00',
    updatedAt: '2026-05-02T09:15:00+09:00',
  },
];

const getCategoryLabel = (category: string) =>
  categoryLabels[category] ?? category;

export function NoticesPage() {
  const importantCount = noticeMockItems.filter(
    (notice) => notice.isImportant,
  ).length;

  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Notice</span>
            <h1 className={styles.title}>공지사항</h1>
            <p className={styles.description}>
              VisionFlow의 서비스 운영 소식과 업데이트 안내를 확인하세요.
            </p>
            <div aria-label="공지 요약" className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <strong className={styles.summaryValue}>
                  {noticeMockItems.length}
                </strong>
                <span className={styles.summaryLabel}>게시된 공지</span>
              </div>
              <div className={styles.summaryItem}>
                <strong className={styles.summaryValue}>
                  {importantCount}
                </strong>
                <span className={styles.summaryLabel}>중요 공지</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.listSection}>
        <Container>
          <div className={styles.listHeader}>
            <div className={styles.listTitle}>
              <span className={styles.listIcon}>
                <Megaphone aria-hidden="true" size={18} />
              </span>
              <h2>공지 목록</h2>
            </div>
            <span className={styles.listCount}>
              총 {noticeMockItems.length}건
            </span>
          </div>

          <ul className={styles.noticeList}>
            {noticeMockItems.map((notice) => (
              <li key={notice.id}>
                <article className={styles.noticeItem}>
                  <div className={styles.noticeBody}>
                    <div className={styles.noticeMeta}>
                      <span className={styles.badge}>
                        {getCategoryLabel(notice.category)}
                      </span>
                      {notice.isImportant ? (
                        <span className={styles.pinBadge}>
                          <Pin aria-hidden="true" size={13} />
                          중요
                        </span>
                      ) : null}
                      <time dateTime={notice.date}>
                        {notice.date}
                      </time>
                    </div>
                    <h2 className={styles.noticeTitle}>
                      {notice.title}
                    </h2>
                    {notice.description ? (
                      <p className={styles.noticeText}>
                        {notice.description}
                      </p>
                    ) : null}
                  </div>
                  <span
                    aria-hidden="true"
                    className={styles.noticeArrow}
                  >
                    &rarr;
                  </span>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
