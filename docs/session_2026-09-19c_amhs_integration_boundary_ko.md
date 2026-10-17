# 작업 세션 로그 — 2026-09-19 (실제 시스템 연동 경계: 인증 + 감사 + 계약)

`amhs-oht-control` 프로토타입의 2026-09-19 세 번째 진행분. "남은 후보"의
**실제 시스템 연동 경계(API 계약·인증·감사 로그)**를 구현한다.

- 대상: `visionflow-client/prototypes/amhs-oht-control`
- 저장소: `decody/visionflow-client`, 브랜치 `agent/amhs-oht-control-prototype`
- 상세 계약 문서: [`docs/amhs_integration_contract_ko.md`](amhs_integration_contract_ko.md)

---

## 1. 단일 실행 경계 — `applyCommand(cmd, actor)`

모든 상태 변경 명령이 통과하는 단일 지점을 `SimEngine`에 추가했다: **역할 인증 → 감사
기록 → (승인 시) 실행**. worker(방식 A)·ws(방식 B) 어댑터가 각각 세션 주체(actor)를
주입하고 이 메서드를 호출한다. 주체는 클라이언트가 주장하지 않는다(서버 측 주입).

- 기존에 worker/ws가 `engine.setPortIncident(...)` 등을 직접 호출하던 경로를 전부
  `applyCommand` 경유로 교체 → 우회 경로 제거.
- 루프 제어(start/stop/setCount/setRate)는 여기서 인증·감사만 하고 실행은 어댑터가
  결과(accepted)를 보고 수행. snapshot/ping은 감사 비대상으로 분리.

## 2. 역할 기반 인증 (`command-contract.ts`)

순수 정책 모듈. `ROLE_RANK`(viewer<operator<supervisor<system) + `COMMAND_MIN_ROLE`.

- viewer=읽기전용, operator=배차·Hot lot·기본 운전, supervisor=장애 주입·시나리오 리셋.
- `authorizeCommand(actor, type)` → `{accepted, code: OK|FORBIDDEN|BAD_REQUEST, reason}`.
- 프로토타입은 로컬/ws 주체를 supervisor로 부여해 데모 전 기능 시연. 정책은 실제와 동일하게
  강제되어 operator/viewer의 장애 주입은 거부(테스트로 검증).

## 3. 감사 로그

승인·거부를 모두 `AuditEntry`(id·ts·actor·action·detail·outcome·code·reason)로 기록.
엔진이 최근 20건 트레일 유지, 와이어에는 `operations.audit` 최근 8건을 실어 방출. UI 우측
"운영 감사 로그" 패널에 승인(초록)/거부(빨강)로 표시.

## 4. 계약 문서

`docs/amhs_integration_contract_ko.md`: 경계 개요·명령 API 표·인증 모델·감사 스키마·
텔레메트리 계약(snapshot/delta)·실제 시스템 교체 가이드. "API 계약" 산출물.

## 검증 요약

- **테스트 68 → 74개 통과** (인증 정책 4 + 엔진 applyCommand 승인/거부 2). ws socket-server
  테스트(리팩터한 서버)·기존 불변식 전부 유지. `tsc --noEmit` 통과.
- 감사 로그는 `operations.audit`(최근 8건, 명령 시에만 변동)로 실려 기존 재현/텔레메트리
  경로를 그대로 사용. 페이로드 영향은 미미(운영 명령 빈도 낮음).
- 배선: worker·ws 어댑터가 `applyCommand`를 호출하도록 교체. 클라이언트(브라우저)는 변경
  없음(actor는 서버 측 주입).

## 남은 후보

- 실 인증 토큰 연동(현재 세션 주입)·감사 append-only 영속화(DB/Kafka) — 실제 백엔드 교체 시.
- 로드포트 개별 정차 위치, 배터리 지도 시각화, 데모 파라미터 미세 튜닝.
