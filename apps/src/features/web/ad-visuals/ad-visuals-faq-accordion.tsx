'use client';

import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';
import { useState } from 'react';

import styles from './ad-visuals-page.module.css';

const FAQ_ITEMS = [
  {
    num: 'Q01',
    q: '비용·견적은 어떻게 산정되나요?',
    a: '제품 광고 ₩200만~ / 이커머스 상세 ₩400만~ / 캠페인 키 비주얼 ₩500만~ / 브랜드 캐릭터 ₩600만~. 컷 수, LoRA 학습 여부, 채널별 변환 수, 후처리 복잡도에 따라 산정됩니다. 1주 디스커버리 후 정확한 견적을 확정합니다.',
  },
  {
    num: 'Q02',
    q: 'AI로 만든 티가 나지 않나요?',
    a: '브랜드 전용 LoRA를 파인튜닝해 100컷 이상을 일관된 톤으로 생성합니다. 디자이너 큐레이션과 후보정을 거치기 때문에 최종 납품물은 스튜디오 촬영 수준의 퀄리티를 유지합니다. 1차 시안 단계에서 직접 확인 후 진행 여부를 결정하실 수 있습니다.',
  },
  {
    num: 'Q03',
    q: '저작권·상업적 사용이 안전한가요?',
    a: 'Flux.1 Pro 등 상업적 라이선스가 명확한 모델만 사용합니다. 생성된 이미지의 저작권은 의뢰인에게 귀속되며, 학습에 사용된 데이터 격리 보고서를 함께 제공합니다. 필요 시 법무 검토 대응 자료를 별도 제공합니다.',
  },
  {
    num: 'Q04',
    q: '인물 합성·딥페이크는요?',
    a: '실존 인물 무단 합성은 진행하지 않습니다. AI 생성 인물(합성 모델)을 활용하거나, 실제 모델 캐스팅 후 AI로 보정하는 방식을 권장합니다. 인물 합성이 핵심이라면 스튜디오 촬영 병행을 제안드립니다.',
  },
  {
    num: 'Q05',
    q: '수정은 몇 번까지 가능한가요?',
    a: '1차 시안 단계에서 방향 수정 2회, 최종 납품 후 마이너 수정(색상·텍스트)은 1개월 무상으로 포함됩니다. 방향 전환이 큰 경우 추가 견적이 발생할 수 있으며, 이 경우 사전에 고지합니다.',
  },
  {
    num: 'Q06',
    q: '인계 자료에 무엇이 포함되나요?',
    a: '프롬프트 라이브러리, LoRA 가중치 파일, 라이선스 문서, 4K 원본 PSD, 채널별 변형 파일, 운영 매뉴얼이 일괄 포함됩니다. 인계 후 내부에서 직접 운영하거나 다른 파트너에게 넘기실 수 있습니다.',
  },
  {
    num: 'Q07',
    q: '월 단위 운영(리테이너) 가능한가요?',
    a: '가능합니다. 월 30컷 / 100컷 / 무제한(전담 1인) 3가지 플랜을 제공합니다. 리테이너 계약 시 LoRA 모델을 지속 업데이트해 캠페인마다 일관된 톤을 유지합니다.',
  },
  {
    num: 'Q08',
    q: 'NDA·법무 검토에 대응 가능한가요?',
    a: '상담 전 NDA 체결이 가능하며, 법무 검토 요청 시 AI 모델 라이선스·학습 데이터 격리 보고서·상업적 사용 근거 자료를 제공합니다. 의약품·금융 등 규제 산업은 별도 상담을 권장합니다.',
  },
] as const;

export function AdVisualsFaqAccordion() {
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
