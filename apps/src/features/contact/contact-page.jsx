'use client';
import { Container } from '@/components/common/container';
import { FaqPage } from '@/components/common/faq/page';
import { useFaqListQuery } from '@/hooks/faq/useFaqQuery';
import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import styles from './contact-page.module.css';
const channels = [
  {
    icon: '📋',
    chip: '메인 채널',
    title: '견적 문의',
    desc: '웹 3D · 광고 이미지 · 웹/앱 · 대시보드 프로젝트의 정식 견적을 받아보세요. 24시간 내 답변.',
    sla: '⏱ 24시간 내 1차 답변',
    ctaLabel: '견적 문의 →',
    ctaHref: `${ROUTES.CONTACT}/quote`,
    main: true,
  },
  {
    icon: '🤝',
    chip: '제휴·파트너십',
    title: '제휴 문의',
    desc: '외주 협력사 · 리셀러 · 기술 파트너 · 콘텐츠 파트너 등 사업 협력 제안.',
    sla: '⏱ 1~3 영업일 내 답변',
    ctaLabel: '제휴 제안 →',
    ctaHref: `${ROUTES.CONTACT}/partnership`,
    main: false,
  },
  {
    icon: '💬',
    chip: '일반 문의·Q&A',
    title: '일반 문의',
    desc: '서비스 관련 일반 질문 또는 Q&A 게시판. 비밀글 작성 가능 (NDA 검토).',
    sla: '⏱ 1~2 영업일 내 답변',
    ctaLabel: '문의 작성 →',
    ctaHref: `${ROUTES.CONTACT}/general`,
    main: false,
  },
];
const officeRows = [
  {
    icon: '📍',
    label: '주소',
    value: '서울특별시 강남구 ○○○로 ○○○ ○층',
  },
  {
    icon: '✉️',
    label: '이메일',
    value: 'contact@visionflow.kr',
    note: 'partnership@visionflow.kr (제휴 전용)',
  },
  {
    icon: '📞',
    label: '전화',
    value: '02-***-****',
    note: '운영시간 내 응답 (평일 10~18시)',
  },
  {
    icon: '🕐',
    label: '운영시간',
    value: '평일 10:00 ~ 18:00 (KST)',
    note: '주말·공휴일 휴무',
  },
];
const slaRows = [
  {
    category: '견적 문의',
    time: '⏱ 24시간 내',
    channel: '이메일',
    highlight: false,
  },
  {
    category: '제휴 문의',
    time: '⏱ 1~3 영업일',
    channel: '이메일',
    highlight: false,
  },
  {
    category: '일반 문의 / Q&A',
    time: '⏱ 1~2 영업일',
    channel: '이메일·게시판',
    highlight: false,
  },
  {
    category: '카카오톡 채널',
    time: '⏱ 운영시간 내 즉시',
    channel: '실시간 채팅',
    highlight: true,
  },
];
export function ContactPage() {
  const { data: faqs = [] } = useFaqListQuery();
  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}
            >
              Contact
            </span>
            <h1 className={styles.heroTitle}>무엇을 도와드릴까요?</h1>
            <p className={styles.heroSub}>
              견적 문의부터 제휴까지, 가장 빠른 채널을 선택해 주세요.
              <br />
              영업일 기준 24시간 내에 답변 드립니다.
            </p>
          </div>
        </Container>
      </section>

      <section className={styles.channels}>
        <Container>
          <header className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnWhite}`}
            >
              Channels
            </span>
            <h2 className={styles.sectionTitle}>
              어떤 문의를 도와드릴까요?
            </h2>
            <p className={styles.sectionSub}>
              상황에 맞는 채널로 문의하시면 적합한 담당자가 빠르게
              답변드립니다.
            </p>
          </header>
          <ul className={styles.channelGrid}>
            {channels.map((c) => (
              <li className={styles.channelItem} key={c.title}>
                <article
                  className={`${styles.channelCard} ${c.main ? styles.channelCardMain : ''}`}
                >
                  <div className={styles.channelHeader}>
                    <span
                      aria-hidden="true"
                      className={styles.channelIconBox}
                    >
                      {c.icon}
                    </span>
                    <span
                      className={`${styles.channelChip} ${c.main ? styles.channelChipMain : ''}`}
                    >
                      {c.chip}
                    </span>
                  </div>
                  <h3 className={styles.channelTitle}>{c.title}</h3>
                  <p className={styles.channelDesc}>{c.desc}</p>
                  <span className={styles.channelSla}>{c.sla}</span>
                  <Link
                    className={`${styles.channelCta} ${c.main ? styles.channelCtaMain : ''}`}
                    href={c.ctaHref}
                  >
                    {c.ctaLabel}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.kakao}>
        <Container>
          <div className={styles.kakaoBanner}>
            <div className={styles.kakaoLeft}>
              <span
                aria-hidden="true"
                className={styles.kakaoIconBox}
              >
                💬
              </span>
              <div className={styles.kakaoMeta}>
                <span className={styles.kakaoStatus}>
                  <span
                    aria-hidden="true"
                    className={styles.kakaoStatusDot}
                  />
                  지금 온라인 · 평일 10~18시 즉시 응답
                </span>
                <p className={styles.kakaoTitle}>
                  카카오톡으로 빠른 상담
                </p>
                <p className={styles.kakaoSub}>
                  정식 견적 전 가벼운 질문이나 즉시 상담이 필요하실
                  때.
                </p>
              </div>
            </div>
            <Link className={styles.kakaoCta} href={ROUTES.KAKAO}>
              카카오톡 채널 추가 →
            </Link>
          </div>
        </Container>
      </section>

      <section className={styles.office}>
        <Container>
          <header className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnWhite}`}
            >
              Office &amp; SLA
            </span>
            <h2 className={styles.sectionTitle}>
              회사 정보 및 응답 정책
            </h2>
            <p className={styles.sectionSub}>
              명시적인 응답 약속으로 신뢰를 만듭니다. 24시간 이상
              답변이 늦어지면 매니저가 직접 챙깁니다.
            </p>
          </header>
          <div className={styles.officeGrid}>
            <article className={styles.officeCard}>
              <span className={styles.officeEyebrow}>Office</span>
              <h3 className={styles.officeTitle}>
                VisionFlow 사무실
              </h3>
              {officeRows.map((row) => (
                <div className={styles.officeRow} key={row.label}>
                  <span
                    aria-hidden="true"
                    className={styles.officeIconBox}
                  >
                    {row.icon}
                  </span>
                  <div className={styles.officeRowText}>
                    <span className={styles.officeLabel}>
                      {row.label}
                    </span>
                    <span className={styles.officeValue}>
                      {row.value}
                    </span>
                    {'note' in row && row.note ? (
                      <span className={styles.officeNote}>
                        {row.note}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </article>
            <div className={styles.slaList}>
              <h3 className={styles.slaTitle}>응답 정책 / SLA</h3>
              {slaRows.map((row) => (
                <div
                  className={`${styles.slaCard} ${row.highlight ? styles.slaCardKakao : ''}`}
                  key={row.category}
                >
                  <span className={styles.slaCategory}>
                    {row.category}
                  </span>
                  <span
                    className={`${styles.slaTime} ${row.highlight ? styles.slaTimeKakao : ''}`}
                  >
                    {row.time}
                  </span>
                  <span className={styles.slaChannel}>
                    {row.channel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <FaqPage
        faqs={faqs}
        description="자주 묻는 질문을 확인해보세요."
      />
    </>
  );
}
