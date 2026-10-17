# AMHS OHT Control 프로토타입 진행 내역

- 작성일: 2026-09-20
- 대상: `visionflow-client/prototypes/amhs-oht-control`
- 목적: 실제 MES/AMHS 백엔드 연동 없이, FAB 관제 화면과 OHT·FOUP·Rail 운행을 실제처럼 보이고 움직이게 하는 프론트엔드 프로토타입 완성

## 1. 최종 상태

프로토타입의 주요 작업 6개를 모두 구현했다.

1. FAB·Rail 맵 현실성
2. OHT 교통 동작
3. 시뮬레이션 시나리오
4. 관제 UI
5. 성능 검증·최적화
6. 프로토타입 마감·시연 준비

실제 백엔드, 인증, DB, Kafka, 운영 API 계약은 범위에서 제외했다. 데이터·명령·감사 로그는 로컬 mock과 합성 시뮬레이션으로 동작한다.

## 2. FAB·Rail 맵 현실화

- Bay, Interbay, Stocker, 장비, Load Port 배치를 실내 좌표계에 배치
- Rail을 outer/high/low/main/transfer lane으로 구분
- Rail casing·center line·방향 화살표·분기·합류·교차 구조를 표현
- 외곽 코너에 렌더링 전용 Bézier 곡선을 추가
- Bay gate, ENTRY/EXIT 라벨, service aisle, 장비 dock-facing line을 추가
- Stocker I/O 연결부와 Load Port 점유·예약 상태를 지도에 표시
- Overview / Bay / Equipment LOD를 분리
- ZCU STOP/RESET과 합류부 busy 상태를 지도에 표현

관련 파일:

- `prototypes/amhs-oht-control/src/entities/fab/rail-graph.ts`
- `prototypes/amhs-oht-control/src/shared/map/indoor-map.ts`

## 3. OHT 교통 현실화

### 주행·안전

- 가속·감속 프로파일과 정지거리 기반 접근 감속
- 곡선 진입 감속
- route-relative 안전거리 계산
- 동일 Rail segment의 예측 위치를 검사하는 충돌 방지 하드가드
- 경로 인덱스가 유효하지 않은 대량 운행 상태에서도 안전거리 계산이 중단되지 않도록 방어

### 교차로·정체

- junction 우선순위와 대기 시간 기반 예약
- 합류 예약 대기열과 점유 segment telemetry
- ZCU busy 상태 표시
- 교착 감지·우회·해소 카운터
- JAM과 일반 BLOCKED 알람 구분

### Load Port·Hoist

- APPROACHING / DOCKED / TRANSFERRING / WAITING / RELEASING 도킹 상태
- 동일 Load Port 호이스트는 한 번에 한 OHT만 사용
- 호이스트 사용 중인 차량은 `WAITING_PICKUP`으로 대기
- Port 점유·예약·용량 상태를 지도와 패널에 표시

관련 파일:

- `prototypes/amhs-oht-control/src/shared/sim/engine.ts`
- `prototypes/amhs-oht-control/src/entities/oht/types.ts`
- `prototypes/amhs-oht-control/src/shared/map/indoor-map.ts`

## 4. 시뮬레이션 시나리오

자동 데모는 고정 seed 기반 OHT 8대에서 시작하며 58초 동안 다음 흐름을 재생한다.

| 시간 | 시나리오 | 확인 포인트 |
| ---: | --- | --- |
| 0초 | 정상 운행 | OHT 이동, Bay KPI, 작업 목록 |
| 3초 | Hot lot 승격 | 우선순위와 Hot lot 강조 |
| 6초 | Load Port 장애 | 영향 Job, 대기 OHT, 설비 포커스 |
| 14초 | Port 복구 | 대기 해소와 운행 재개 |
| 16초 | Rail 폐쇄 | 폐쇄 구간과 자동 우회 |
| 24초 | Rail 개통 | 정상 경로 복귀 |
| 26초 | Stocker/Buffer 포화 | 용량 0, 하역 대기, JAM |
| 36초 | 공간 확보 | 하역 재개 |
| 38초 | 통신 단절 | 화면 정지와 재연결 상태 |
| 44초 | 통신 복구 | Snapshot 재동기 |
| 46초 | 저배터리·충전 | 배터리 알람과 충전 복귀 |
| 54초 | 충전 완료 | 정상 상태 회복 |
| 58초 | 데모 완료 | LIVE 운행 유지 |

지원하는 수동 시나리오:

- Dispatch rule: priority / FIFO / nearest
- Hot lot 승격
- Load Port 장애·복구
- Stocker/Buffer 포화·해소
- Rail 폐쇄·우회·복구
- 저배터리·충전 복귀
- 통신 단절·Snapshot 재동기
- OHT 8 / 32 / 100 / 500 / 1,000 / 2,000 / 5,000대 부하 전환

관련 파일:

- `prototypes/amhs-oht-control/src/features/control/live-map.tsx`
- `prototypes/amhs-oht-control/src/shared/sim/engine.ts`
- `prototypes/amhs-oht-control/src/shared/realtime/simulator-client.ts`
- `prototypes/amhs-oht-control/src/shared/realtime/socket-client.ts`
- `prototypes/amhs-oht-control/demo-script.md`

## 5. 관제 UI

- 상단 KPI: 전체 OHT, 이동, 지연, 차단, 설비 장애, 배차 대기, 완료 반송, 평균 반송 시간
- Bay별 KPI: 활성 작업, 지연·대기 작업, Hot lot 수
- Bay KPI 클릭 시 지도와 작업 목록을 같은 Bay 기준으로 동기화
- FAB 전체 / Bay / 설비 포커스 이동
- 상태·적재·Hot lot 공통 필터
- OHT 상세: 상태, Job, FOUP, Lot, 우선순위, 도킹, 대기 원인, 우회 횟수, 배터리, 위치, heading
- 작업 검색 및 작업 클릭을 통한 OHT·경로 선택
- 포트·Stocker 점유·예약·용량 목록
- 장애·정체·JAM 알람의 영향 설비·포트·Rail·Job·OHT 포커스
- 알람 확인(acknowledge)과 복구 상태 표시
- 운영 명령 감사 로그와 역할 기반 승인 결과 표시
- 최근 60초 이력 재생, 속도 변경, seek, LIVE 복귀
- 자동 데모 진행률과 단계 표시
- 개발 진단: FPS, 메시지율, 업데이트율, 적용 지연, 렌더 p95, 렌더 대상, JS heap, 교통 telemetry

관련 파일:

- `prototypes/amhs-oht-control/src/features/control/live-map.tsx`
- `prototypes/amhs-oht-control/src/stores/control-store.ts`
- `prototypes/amhs-oht-control/src/shared/map/indoor-map.ts`

## 6. 성능 검증·최적화

### 적용한 최적화

- Overview에서는 Heatmap 중심으로 표현
- Bay에서는 WebGLPoints를 사용
- Equipment 확대에서는 상세 OHT 심벌만 사용
- 화면 밖 OHT를 culling
- 화면 밖 culling 재계산을 250ms 주기로 제한
- 변경이 있을 때만 WebGL vehicle source를 갱신
- Port 운영 상태 조회를 매번 선형 검색하지 않고 ID Map으로 처리
- 대량 운행 중 잘못된 Rail 경로 인덱스 방어

### 코어 벤치마크

목표는 10Hz이며 틱 예산은 100ms다. 측정 대상은 SimEngine tick 계산과 wire JSON 직렬화다.

| OHT | frame p95 | 직렬화 p95 | 지속 가능 Hz | 여유 |
| ---: | ---: | ---: | ---: | ---: |
| 500 | 3.79ms | 0.36ms | 264Hz | 26.39× |
| 1,000 | 5.19ms | 0.91ms | 193Hz | 19.28× |
| 2,000 | 6.18ms | 1.46ms | 162Hz | 16.17× |
| 5,000 | 19.53ms | 4.34ms | 51Hz | 5.12× |

모든 부하에서 10Hz 목표를 통과했다. 브라우저 GPU별 실제 렌더 p95는 앱의 개발 진단 패널에서 별도 계측한다.

상세 결과: `prototypes/amhs-oht-control/perf-report.md`

## 7. 프로토타입 마감

- 초기 fleet: 고정 seed 기반 OHT 8대
- 초기 카메라: FAB 전체 Overview
- 화면 표기: `Prototype #02 · 합성 FAB 시뮬레이션 · START 8 OHT`
- 시연 순서와 캡처 권장 장면을 `demo-script.md`에 정리
- README에 실제 데이터가 아닌 합성 데이터·공개 레일망 시각화임을 명시
- 개발 서버는 필요 시 3011 포트에서 실행

## 8. 검증 상태

통과한 검증:

- TypeScript: `tsc --noEmit -p tsconfig.json`
- 변경 파일 공백·충돌 마커 검사: `git diff --check`
- SimEngine 500~5,000대 성능 벤치마크
- 5,000대에서 10Hz 프레임 예산 통과
- 개발 서버 기동 및 `/` 페이지 응답 확인
- React style warning 수정: `border`와 `borderColor` 혼용 제거

이번 정리 시점에 전체 unit test suite는 별도로 재실행하지 않았다. 따라서 기능 구현과 타입·성능 검증은 완료했지만, CI 또는 실제 전경 Chrome에서 최종 회귀 테스트를 한 번 더 실행하는 것이 권장된다.

## 9. 범위 밖 항목

다음은 현재 프로토타입의 완료 조건이 아니다.

- 실제 MES/AMHS 백엔드 연동
- 실운영 인증·권한 서버
- DB·Kafka·실제 API 계약
- 실제 FAB 도면의 운영 사용
- 실제 GPU·장비별 성능 보증
- 실제 시연 영상 파일 제작

현재 결과물은 포트폴리오·UX 검증용 합성 FAB 관제 프로토타입이다.
