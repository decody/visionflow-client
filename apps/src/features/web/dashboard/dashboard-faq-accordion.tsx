'use client';

import { useState } from 'react';

import styles from './dashboard-page.module.css';

const FAQ_ITEMS = [
  {
    num: 'Q01',
    q: '비용·견적은 어떻게 산정되나요?',
    a: 'BI 대시보드 ₩1,500만~ / 운영 어드민 ₩2,500만~ / 실시간 모니터링 ₩1,800만~ / 데이터 그리드 ₩1,200만~. 화면 수, 차트 종류, 권한 복잡도, 데이터 소스 통합 범위에 따라 조정됩니다. 무료 KPI 워크숍 후 정확한 견적을 드립니다.',
  },
  {
    num: 'Q02',
    q: 'AG Grid Enterprise 라이선스는 별도로 구매해야 하나요?',
    a: '기본 구현은 AG Grid Community(무료)로 진행합니다. Enterprise 기능(피벗·사이드바·그룹)이 필요한 경우 클라이언트 계정으로 라이선스 구매를 안내드립니다. 대부분의 프로젝트는 Community로 충분합니다.',
  },
  {
    num: 'Q03',
    q: '디자인 시안 사전 검토가 가능한가요?',
    a: '가능합니다. KPI 워크숍 이후 Figma 시안 2–3안을 제공하며, 1안 선정 후 디테일을 확정합니다. 기존 브랜드 가이드라인이 있으면 해당 스타일에 맞춰 제작합니다.',
  },
  {
    num: 'Q04',
    q: '권한·감사 로그는 기본으로 포함되나요?',
    a: 'RBAC 4단계(SuperAdmin·Admin·Operator·Viewer)와 감사 로그(90일 보관)는 모든 패키지에 기본 포함됩니다. 커스텀 역할이나 데이터 행 단위 권한은 운영 어드민 패키지부터 지원됩니다.',
  },
  {
    num: 'Q05',
    q: '운영 인계는 어떻게 진행되나요?',
    a: '실데이터 마이그레이션 완료 후 운영자 교육(최대 2회)과 운영 매뉴얼·영상 자료를 제공합니다. GitHub 저장소와 호스팅 계정을 클라이언트로 완전 이관하며, 1개월 무상 운영 기간 동안 긴급 대응을 지원합니다.',
  },
  {
    num: 'Q06',
    q: '기존 시스템(ERP·CRM·DB)과 통합 가능한가요?',
    a: 'REST API·GraphQL·직접 DB 연결 방식 모두 지원합니다. KPI 워크숍에서 데이터 소스 명세와 API 스키마를 함께 정의하며, 인덱스·뷰·집계 전략을 수립해 쿼리 성능을 확보합니다.',
  },
  {
    num: 'Q07',
    q: 'NDA·ISMS·보안 검토에 대응 가능한가요?',
    a: '상담 전 NDA 체결이 가능하며, 보안 검토 요청 시 RBAC 정책·감사 로그·암호화 명세를 포함한 보안 대응 자료를 제공합니다. ISMS 인증 준비 중인 고객사의 보안 요구사항도 대응 가능합니다.',
  },
  {
    num: 'Q08',
    q: '운영자 교육·온보딩 지원이 있나요?',
    a: '운영 인계 단계에서 운영자 대상 교육(최대 2회)과 영상 자료를 제공합니다. 이후 월 단위 운영 동행 플랜을 선택하면 콘텐츠 업데이트·기능 추가·모니터링을 지속적으로 지원합니다.',
  },
] as const;

export function DashboardFaqAccordion() {
  const [open, setOpen] = useState<string>('Q01');

  return (
    <ul className={styles.faqList}>
      {FAQ_ITEMS.map((item) => {
        const isOpen = open === item.num;
        return (
          <li className={styles.faqItem} key={item.num}>
            <button
              aria-expanded={isOpen}
              className={styles.faqQuestion}
              onClick={() => setOpen(isOpen ? '' : item.num)}
              type="button"
            >
              <span className={styles.faqLeft}>
                <span className={styles.faqQLabel}>Q</span>
                <span className={styles.faqQText}>{item.q}</span>
              </span>
              <span aria-hidden="true" className={styles.faqToggle}>
                {isOpen ? '−' : '+'}
              </span>
            </button>

            {isOpen && (
              <div className={styles.faqAnswer}>
                <span className={styles.faqALabel}>A</span>
                <p className={styles.faqAnswerText}>{item.a}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
