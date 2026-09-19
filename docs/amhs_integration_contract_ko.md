# AMHS/OHT 관제 — 실제 시스템 연동 경계 (API 계약 · 인증 · 감사)

`amhs-oht-control` 프로토타입이 **실제 MES/AMHS 백엔드**와 이어질 지점을 형식화한 문서.
현재는 합성 시뮬레이터(SimEngine)가 백엔드 역할을 대신하지만, 아래 계약은 실제 시스템으로
교체할 때 그대로 유지되도록 설계했다. 구현 위치:

- 계약(정책): `src/shared/integration/command-contract.ts`
- 실행 지점(단일 경계): `SimEngine.applyCommand(cmd, actor)` (`src/shared/sim/engine.ts`)
- 어댑터: `src/workers/simulator.worker.ts`(방식 A) · `server/ws-server.ts`(방식 B)

---

## 1. 경계 개요

```
브라우저 관제 UI ──(ClientCommand)──▶ 어댑터(worker/ws) ──▶ applyCommand(cmd, actor)
                                          │  (세션 actor 주입)      │ 1) 인증(역할)
                                          │                         │ 2) 감사 기록
   ◀──(snapshot/delta: operations.audit)──┘                         │ 3) 승인 시 실행
```

핵심 원칙:

- **주체(actor)는 클라이언트가 주장하지 않는다.** 어댑터가 연결(세션) 컨텍스트에서 주입한다.
  실제 시스템에서는 인증 토큰(JWT 등)에서 `id`·`role`을 도출한다.
- **단일 실행 지점.** 모든 상태 변경 명령은 `applyCommand`를 통과한다. 인증·감사·실행이
  한곳에 모여 우회 경로가 없다.
- **감사는 승인·거부 모두 남긴다.** 거부된 명령도 시도 기록으로 추적된다.

## 2. 명령 API (ClientCommand)

| type | 파라미터 | 최소 역할 | 설명 |
| --- | --- | --- | --- |
| `snapshot` | — | viewer | 현재 상태 스냅샷 요청(감사 비대상) |
| `start` | `count?`, `rateHz?` | operator | 시뮬레이션 시작 |
| `stop` | — | operator | 일시정지 |
| `setCount` | `count` | operator | fleet 대수 변경 |
| `setRate` | `rateHz` | operator | 송신율(Hz) 변경 |
| `setDispatch` | `rule` | operator | 배차 규칙(nearest/oldest/priority) |
| `promoteHotLot` | `jobId?` | operator | Hot lot 긴급 승격 |
| `setPortIncident` | `enabled` | **supervisor** | 포트 장애 주입/해제 |
| `setRailClosure` | `enabled` | **supervisor** | 레일 구간 폐쇄/개통 |
| `setStorageSaturation` | `enabled` | **supervisor** | 저장소 포화 주입/해제 |
| `resetScenario` | `count` | **supervisor** | 고정 seed 시나리오 리셋 |

프로토콜 전용(감사 비대상): `ping`→`pong`(ws 하트비트).

## 3. 인증 모델 (역할 기반)

역할 등급(`ROLE_RANK`): `viewer(0) < operator(1) < supervisor(2) < system(3)`.
명령별 최소 역할은 `COMMAND_MIN_ROLE`에 정의한다. `authorizeCommand(actor, type)`는 순수
함수로 다음을 반환한다:

```ts
{ accepted: boolean; code: 'OK' | 'FORBIDDEN' | 'BAD_REQUEST'; reason?: string; auditId?: string }
```

- 권한 부족 → `FORBIDDEN`(실행 안 함, 거부 감사)
- 알 수 없는 명령 → `BAD_REQUEST`

> 프로토타입 기본값: 로컬 단일 운영자(`OP-LOCAL`)와 ws 연결(`OP-N`)은 데모가 전 기능을
> 시연하도록 `supervisor`로 부여한다. 정책 자체(등급·최소역할)는 실제와 동일하게 강제되며,
> `viewer`/`operator` 주체는 장애 주입이 거부된다(테스트로 검증).

## 4. 감사 로그 (AuditEntry)

모든 감사 대상 명령은 다음 항목으로 기록되어 `operations.audit`(최근 8건)로 브로드캐스트된다.

```ts
interface AuditEntry {
  id: string;          // AUD-<ts>-<actorId>-<action>
  ts: number;          // 시뮬레이션 시각(ms)
  actor: { id: string; role: Role };
  action: CommandType;
  detail: string;      // 사람이 읽는 요약
  outcome: 'accepted' | 'rejected';
  code: 'OK' | 'FORBIDDEN' | 'BAD_REQUEST';
  reason?: string;
}
```

엔진은 최근 20건을 내부 트레일로 유지하고, 와이어에는 최근 8건을 싣는다. UI 우측 "운영 감사
로그" 패널에 승인/거부가 색으로 구분되어 표시된다.

## 5. 텔레메트리 계약 (백엔드 → UI)

- `SnapshotMessage`: 전체 상태(vehicles + operations). 연결·재동기 시.
- `DeltaMessage`: 변경분(upd/add/del + alarms + throttled operations). seq 단조 증가.
- seq gap 감지 시 클라이언트가 `snapshot` 요청 → 재동기(`DeltaReducer`).

## 6. 실제 시스템으로 교체할 때

1. `SimEngine`을 실제 AMHS/MES 어댑터로 교체하되 `applyCommand(cmd, actor)` 시그니처를 유지.
2. 어댑터에서 인증 토큰 검증 후 `actor`를 도출(현재의 세션 주입 지점을 대체).
3. 감사 로그를 append-only 저장소(DB/Kafka)로 영속화. `operations.audit`는 최근 조회 뷰로 유지.
4. 텔레메트리(snapshot/delta)는 실제 설비 이벤트 스트림으로 대체(스키마 동일).
