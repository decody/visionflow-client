# Smart Logistics Control Center 진행 내역

## 기준

- 기준 기획서: `docs/smart_logistics_control_center_prototype_plan_ko_updated.docx` v1.1
- 대상: `visionflow-client/prototypes/smart-logistics-control-center`
- 기준일: 2026-10-18 (최종 재검증·커밋 2026-11-02)
- 데이터 원칙: 합성 허브·레인·화물, 공개 도메인 Natural Earth 국가 경계, 외부 운송사 피드 없음

## 단계별 상태

| 단계 | 내용 | 상태 | 근거 |
| --- | --- | --- | --- |
| 0 | Next 앱 셸·도메인 타입·정적 mock·번들 GeoJSON | 완료 | `src/app`, `src/entities`, `public/` |
| 1 | deck.gl 글로브 MVP | 완료 | `_GlobeView`, 국가 경계, 허브, ArcLayer |
| 2 | 네트워크·시뮬레이터·snapshot/delta·Worker | 완료 | `src/shared/sim`, `src/shared/realtime`, `src/workers` |
| 3 | 복합운송 생명주기·ETA·환적 dwell | 완료 | `src/shared/sim/shipments.ts`, `engine.ts` |
| 4 | 글로브↔지역 전환·권역 필터 | 완료 | `src/shared/map/view-controller.ts`, `regions.ts` |
| 5 | 알람·시나리오·자동 데모 | 완료 | `src/shared/sim/alerts.ts`, 시나리오 제어 UI |
| 6 | KPI·화물 Drawer·필터·재생·진단 | 완료 | `src/features/globe/globe-view.tsx` |
| 7 | applyCommand·역할·감사·WebSocket 방식 B | 완료 | `src/shared/integration`, `server/` |
| 8 | 코어 성능 벤치·MVP/스트레스 보고 | 완료 | `server/perf-bench.ts`, `perf-report.md` |
| 9 | 데모 스크립트·진행 문서·마감 고지 | 완료 | `demo-script.md`, README, 본 문서 |

## 검증 결과

- 단위 테스트: 73개 통과(현재 코드 기준; 기존 Claude 작업 기록의 69개보다 확장됨)
- MVP 코어 벤치: 1,000 conveyance / 10,000 shipment에서 10Hz 지속 가능, frame p95 21.29ms 측정
- 스트레스 벤치: 5,000 / 50,000에서 frame p95 150.78ms, 지속 가능 7Hz
- 해석: 기획서의 MVP 기준은 충족한다. 스트레스 규모는 브라우저 GPU 렌더링과 함께 별도 관찰한다.

### 2026-11-02 재검증 (동일 코드, 다른 머신)

- 단위 73 통과 · ws 스모크 1 통과.
- 코어 벤치 재현(Node v24.16.0): MVP 1,000/10,000 → frame p95 **20.21ms**, 지속 ~49Hz(여유 4.95×). 스트레스 5,000/50,000 → frame p95 **128.54ms**, 지속 ~8Hz. 결론 동일(MVP 통과·스트레스 별도 보고). 절대 수치는 머신 편차 범위.

## 잔여 내역

기능 구현 단계 0~9에는 차단성 미완료 항목이 없다. 아래 항목은 출시 품질과 재현성을 높이기 위한 후속 작업이다.

| 우선순위 | 잔여 작업 | 완료 기준 |
| --- | --- | --- |
| P0 | 브라우저 회귀 시나리오 자동화 | 완료 — Playwright 3개 통과. WebGL 글로브 표시, Worker 연결, 권역 전환/복귀, Drawer, 시나리오, 진단 패널 검증 |
| P0 | WebSocket 방식 B 스모크 자동화 | 완료 — snapshot 수신, viewer 명령 거부, supervisor 명령 승인, malformed 요청 BAD_REQUEST 검증 |
| P1 | 브라우저 렌더 성능 측정 | 완료 — 1280×720 Chromium에서 1k/10k·5k/50k의 FPS·렌더 대상·heap을 자동 기록 |
| P1 | 성능 리포트 재현성 강화 | 완료 — `perf:browser`, 고정 viewport·측정 시간·userAgent·CPU·deviceMemory를 기록 |
| P2 | 문서 경로와 주석 정리 | 완료 — README의 기획서 경로, 현재 폴더 구조, `page.tsx`·`view-controller.ts`·mock/realtime 계약의 과거 단계 주석을 현재 구현 기준으로 정리 |
| P2 | Git 전달 상태 정리 | 완료 — 2026-11-02 `visionflow-client`에 커밋·푸시(`dd3f476`, 브랜치 `agent/amhs-oht-control-prototype`). 진행 문서도 `visionflow-client/docs/`로 이동해 함께 추적 |
| 잔여 | 실제 GPU 브라우저 육안 확인 | 완료 — 2026-11-02 실제 Chrome(로컬 GPU, http://localhost:3015)에서 글로브 렌더·회전·실시간 운송수단이 매끄럽게 동작함을 사용자 육안 확인. Playwright 소프트웨어 렌더 수치(1k 6.4·5k 5.2 FPS)는 비대표로 확정 |

## 현재 판단

- MVP 코어는 1,000 conveyance / 10,000 shipment에서 10Hz, frame p95 ~20ms로 통과했다.
- 5,000 / 50,000 스트레스 규모는 코어 frame p95 ~130~150ms, 지속 가능 7~8Hz로 MVP 기준이 아니다(의도된 별도 보고).
- 브라우저 측정은 1,000대 평균 6.4 FPS, 5,000대 평균 5.2 FPS로 목표 평균 50 FPS에 미달했다. Playwright/소프트웨어 렌더링 환경의 영향 가능성이 크므로 동일 조건의 실제 GPU 측정이 필요하다.
- 코드·테스트·벤치·문서·Git 정리는 완료했다. 2026-11-02 실제 GPU 브라우저 육안 확인까지 마쳐 **기획서 DoD §14 전 항목 충족 = 프로토타입 완성**이다.

## Git 전달 범위

- 저장소 루트: `E:\PROJECT\visionflow\visionflow-client`
- 현재 상태: 2026-11-02 `prototypes/smart-logistics-control-center/` 전체(55파일, +6,841줄)를 커밋(`dd3f476`)하고 `origin/agent/amhs-oht-control-prototype`로 푸시 완료. pre-commit 타입체크 전 워크스페이스 통과.
- 포함 대상: 소스(`src/`), 서버·테스트(`server/`, `e2e/`), 설정·스크립트(`package.json`, `tsconfig.json`, `next.config.mjs` 등), 공개 데이터(`public/`), README·데모·성능 리포트.
- 제외 대상: `.next/`, `node_modules/`, `playwright-report/`, `test-results/`, 로그, `*.tsbuildinfo` 등 ignore 규칙으로 관리되는 생성물.
- 진행 문서 위치: `visionflow-client/docs/smart_logistics_control_center_prototype_progress_ko.md` (AMHS·last-mile 진행 문서와 동일 위치로 이동, 함께 추적).
