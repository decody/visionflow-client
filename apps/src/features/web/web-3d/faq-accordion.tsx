'use client';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useState } from 'react';

import styles from './web-3d-page.module.css';

const FAQ_ITEMS = [
  {
    num: 'Q01',
    q: '간단한 견적 범위가 어떻게 되나요?',
    a: '제품 3D 뷰어 ₩600만~ / 컨피규레이터 ₩1,500만~ / 가상 쇼룸 ₩2,000만~ / 인터랙티브 스토리텔링 ₩1,200만~. 모델 수량과 옵션 복잡도에 따라 조정됩니다.',
  },
  {
    num: 'Q02',
    q: '3D 자산이 이미 있는데, 그대로 쓸 수 있나요?',
    a: '디스커버리 단계에서 호환성·재사용성을 진단합니다. 폴리곤 수와 재질 구성이 웹에 적합하면 그대로 활용하고, 무거운 경우 리토폴로지·압축으로 최적화합니다.',
  },
  {
    num: 'Q03',
    q: '모바일에서 정말 60fps가 나오나요?',
    a: 'draco·KTX2 압축과 Mesh LOD를 기본 적용해 자산을 70% 줄이고, 저사양 기기까지 테스트합니다. 모바일 60fps와 LCP 2.5초 이내를 목표로 합니다.',
  },
  {
    num: 'Q04',
    q: '디자인 시안 없이 시작할 수 있나요?',
    a: '가능합니다. 레퍼런스만 있으면 디스커버리 후 디자인 단계에서 Figma + 3D 시안 2안을 제공합니다.',
  },
  {
    num: 'Q05',
    q: '런칭 후 운영·유지보수는 별도인가요?',
    a: '런칭 후 1개월은 무상 운영에 포함됩니다. 이후 자산 추가·옵션 확장·성능 모니터링을 월 단위 운영 동행 플랜으로 진행합니다.',
  },
  {
    num: 'Q06',
    q: 'Three.js 외에 다른 엔진은 안 쓰시나요?',
    a: '웹 표준 WebGL 기반의 Three.js / react-three-fiber를 기본으로 합니다. 인수인계가 쉽고 락인이 없는 표준 스택만 사용합니다.',
  },
  {
    num: 'Q07',
    q: '인수인계가 가능한가요? 락인이 있을까요?',
    a: 'GitHub 저장소와 기술 문서를 완전 이관하며, 온보딩 세션을 제공합니다. 표준 오픈소스 스택만 사용해 벤더 락인이 없습니다.',
  },
  {
    num: 'Q08',
    q: 'NDA·보안 검토에 대응 가능한가요?',
    a: '상담 전 NDA 체결이 가능하며, 보안 검토 요청 시 자료를 제공합니다. 모든 프로젝트 정보는 기본적으로 기밀로 취급됩니다.',
  },
] as const;

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
