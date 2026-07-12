'use client';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useState } from 'react';

import styles from './web-app-page.module.css';

const FAQ_ITEMS = [
  {
    num: 'Q01',
    q: '비용은 어떻게 산정되나요?',
    a: '페이지 수, 다국어·관리자 옵션, AI 콘텐츠 패키지 결합 여부에 따라 산정됩니다. 위의 패키지 시뮬레이터로 즉시 확인 가능하며, 정확한 견적은 1주 디스커버리 후 확정됩니다.',
    simLink: true,
  },
  {
    num: 'Q02',
    q: '디자인 시안을 먼저 받아볼 수 있나요?',
    a: '디스커버리 단계(1주) 완료 후 디자인 단계에서 시안 2–3안을 제공합니다. 무료 시안 선제공은 진행하지 않습니다.',
  },
  {
    num: 'Q03',
    q: '기존 사이트가 있는데 부분 리뉴얼만 가능한가요?',
    a: '가능합니다. 현재 코드베이스를 검토한 후 부분 리뉴얼 또는 점진적 마이그레이션 방향을 제안드립니다.',
  },
  {
    num: 'Q04',
    q: '운영·유지보수 계약은 별도인가요?',
    a: '런칭 후 1개월은 무상으로 운영 지원합니다. 이후 월 단위 운영 동행 플랜을 선택하실 수 있습니다.',
  },
  {
    num: 'Q05',
    q: 'NDA 체결이 가능한가요?',
    a: '네, 상담 전 NDA 체결을 원하시면 요청 주시면 진행합니다. 모든 프로젝트 정보는 기본적으로 기밀로 취급됩니다.',
  },
  {
    num: 'Q06',
    q: '기술 스택을 우리 팀이 이어받아 운영할 수 있나요?',
    a: 'Next.js / React Native 기반으로 구현하며, GitHub 저장소와 기술 문서를 완전 이관합니다. 온보딩 세션(2시간)도 기본 포함됩니다.',
  },
  {
    num: 'Q07',
    q: '해외 결제·다국어 지원도 가능한가요?',
    a: 'Stripe, PayPal 등 해외 결제 연동과 i18n 다국어(한·영·일·중) 지원 모두 가능합니다. 별도 옵션으로 추가됩니다.',
  },
  {
    num: 'Q08',
    q: '앱스토어·플레이스토어 등록까지 해주나요?',
    a: 'React Native 앱 프로젝트의 경우 앱스토어(iOS) 및 구글 플레이(Android) 등록까지 포함합니다.',
  },
];

export function FaqAccordion() {
  const [open, setOpen] = useState<string>('Q01');

  return (
    <div className={styles.faqWrap}>
      <ul className={styles.faqList}>
        {FAQ_ITEMS.map((item) => {
          const isOpen = open === item.num;
          return (
            <li
              className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ''}`}
              key={item.num}
            >
              <button
                aria-expanded={isOpen}
                className={styles.faqQuestion}
                onClick={() => setOpen(isOpen ? '' : item.num)}
                type="button"
              >
                <span className={styles.faqLeft}>
                  <span className={`${styles.faqNum} ${isOpen ? styles.faqNumOpen : ''}`}>
                    {item.num}
                  </span>
                  <span className={styles.faqQText}>{item.q}</span>
                </span>
                <span className={`${styles.faqToggle} ${isOpen ? styles.faqToggleOpen : ''}`}>
                  {isOpen ? (
                    <svg fill="none" height={14} viewBox="0 0 14 14" width={14}>
                      <path d="M1 7h12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  ) : (
                    <svg fill="none" height={14} viewBox="0 0 14 14" width={14}>
                      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  )}
                </span>
              </button>

              {isOpen && (
                <div className={styles.faqAnswer}>
                  <div className={styles.faqDivider} />
                  <div className={styles.faqAnswerBody}>
                    <p className={styles.faqAnswerText}>{item.a}</p>
                    {item.simLink && (
                      <Link className={styles.faqSimLink} href="#simulator">
                        패키지 시뮬레이터로 가기 →
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* 하단 Help 행 */}
      <div className={styles.faqHelp}>
        <div>
          <p className={styles.faqHelpTitle}>답을 못 찾으셨나요?</p>
          <p className={styles.faqHelpSub}>
            카카오톡 채널로 바로 문의하시면 1영업일 안에 답변드립니다.
          </p>
        </div>
        <Link className={styles.faqHelpBtn} href={ROUTES.KAKAO}>
          카카오톡 1:1 문의
        </Link>
      </div>
    </div>
  );
}
