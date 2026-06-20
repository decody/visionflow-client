import { Container } from '@/components/common/container';

import styles from '../home-page.module.css';

const processSteps = [
  {
    no: 'STEP 01',
    title: '문의·상담',
    desc: '카카오톡 또는 메일로 가벼운 상담을 시작합니다. 부담 없이 아이디어를 공유해주세요.',
    duration: '당일~1일',
    icon: '/images/process/step-01-chat.svg',
  },
  {
    no: 'STEP 02',
    title: '기획·견적',
    desc: '범위와 요구사항을 정리하고 정식 견적서를 발행합니다. 일정과 비용을 명확히.',
    duration: '2~3일',
    icon: '/images/process/step-02-plan.svg',
  },
  {
    no: 'STEP 03',
    title: '제작·개발',
    desc: 'AI 도구로 빠르게 만들고, 디자이너·개발자가 디렉션. 결과물 책임은 우리가 집니다.',
    duration: '카테고리별',
    icon: '/images/process/step-03-build.svg',
  },
  {
    no: 'STEP 04',
    title: '검수·수정',
    desc: '피드백을 반영해 결과물을 정교하게 다듬습니다. 기본 2회 무료 수정 제공.',
    duration: '1주',
    icon: '/images/process/step-04-review.svg',
  },
  {
    no: 'STEP 05',
    title: '납품·운영',
    desc: '최종 결과물 납품 후, 필요한 운영 단계까지 함께 갑니다. 출시 이후도 지원.',
    duration: '협의',
    icon: '/images/process/step-05-deliver.svg',
  },
];

export function ProcessSection() {
  return (
    <section className={styles.process}>
      <Container>
        <header className={styles.sectionHead}>
          <span className={styles.eyebrow}>Process</span>
          <h2 className={styles.sectionTitle}>의뢰부터 납품까지 5단계</h2>
          <p className={styles.sectionSub}>
            명확한 절차와 예측 가능한 일정. 각 단계 완료 후 다음 단계 진행
            여부를 결정할 수 있습니다.
          </p>
        </header>
        <ol className={styles.processList}>
          {processSteps.map((s, i) => (
            <li className={styles.processItem} key={s.no}>
              <article className={styles.processCard}>
                <span aria-hidden="true" className={styles.processNum}>
                  <img alt="" height={20} src={s.icon} width={20} />
                </span>
                <span className={styles.processStep}>{s.no}</span>
                <h3 className={styles.processTitle}>{s.title}</h3>
                <p className={styles.processDesc}>{s.desc}</p>
                <span className={styles.processDur}>
                  <img alt="" height={10} src="/images/process/icon-clock.svg" width={10} />
                  {s.duration}
                </span>
              </article>
              {i < processSteps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={styles.processConnector}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
