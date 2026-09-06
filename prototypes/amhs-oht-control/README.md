# Smart Factory AMHS/OHT Control (Prototype #02)

반도체 FAB의 OHT·FOUP·Rail을 **실내 좌표계** 위에서 실시간 관제하는 VisionFlow 포트폴리오 프로토타입. 실제 FAB 데이터가 아닌 합성 시뮬레이션이다.

- 세부 설계: [`docs/smart_factory_amhs_oht_prototype_plan_ko.md`](../../../docs/smart_factory_amhs_oht_prototype_plan_ko.md)
- 상위 기획서: `docs/frontend_portfolio_planning_ko.docx` (10종 중 #02)
- 스택: Next.js 16 · React 19 · TypeScript · Zustand · OpenLayers(WebGL/Heatmap) · GeoJSON · Web Worker

## 실행

pnpm 워크스페이스(`prototypes/*`) 구성이므로 저장소 루트(`visionflow-client`)에서 설치한다.

```bash
# visionflow-client 루트에서
pnpm install
pnpm --filter @visionflow/amhs-oht-control dev        # http://localhost:3011

# 프로토타입 폴더에서
pnpm typecheck                                        # tsc --noEmit
pnpm test:unit                                        # node --test (tsx 로더)
pnpm ws:server                                        # 방식 B: 로컬 ws 서버(:3012)
pnpm perf                                             # 헤드리스 성능 벤치(코어 tick+직렬화)
pnpm perf:long                                        # + 장시간 실행 메모리 누수 검증
```

### 성능 벤치 (헤드리스)

브라우저 렌더 FPS는 GPU·자동화 환경에 좌우돼 재현성이 낮다. `server/perf-bench.ts`는
ws-server가 매 틱 수행하는 `JSON.stringify(engine.tick())`과 동일 경로를 노드에서 반복 실행해
대수(500/1,000/2,000/5,000)별 tick·직렬화 지연 p95, 델타 바이트, 지속 가능 Hz, 메모리를 측정한다.
고정 시드·고정 clock으로 결정론적이며, 결과는 `perf-report.md`에 저장한다(최근 실행 결과 포함).

```bash
pnpm perf -- --counts=1000,5000 --ticks=600 --rate=10 --out=perf-report.md
```

최근 결과(Node 24): 5,000대에서도 frame p95 7.6ms(10Hz 예산 대비 13× 여유), 메모리 누수 없음 →
**시뮬레이션 코어는 병목이 아니며, 실제 병목은 브라우저 렌더 파이프라인과 델타 대역폭이다.**

이에 따라 렌더 경로에 **뷰포트 컬링**을 적용했다. 전체 모델(`featureById`)과 WebGL 렌더 소스를
분리해, 줌인(bay·equipment LOD) 시 화면 밖 OHT를 렌더 소스에서 제외한다. 매 프레임 재생성되는
WebGL 정점 버퍼 비용이 "전체 대수"가 아니라 "보이는 대수"에 비례한다. 순수 판정 로직은
`src/shared/map/viewport-cull.ts`(단위 테스트 포함), 효과는 개발 진단 패널의 **렌더 대상(보이는/전체)**
지표로 확인한다. KPI·정체·상세·클릭은 전체 모델을 사용하므로 컬링과 무관하게 전 대수를 반영한다.

델타 대역폭은 **좌표 양자화 + operations 스로틀링 + id 압축**으로 줄였다. 저장 물리 상태는 full precision을
유지하고 직렬화되는 델타·스냅샷 값만 x/y 1cm(소수 2자리)·heading 0.1도·speed 0.01m/s로 반올림한다
(`quantizeWireFields`, engine.ts). 매 틱 전체 전송되던 `operations` 블록(대수 무관 ~9.5KB/틱)은 UI가
4Hz로만 읽으므로 약 5Hz 주기(또는 알람 틱)에만 싣는다 — reducer가 마지막 정의된 값을 유지한다. 또
개체 id `OHT-####`를 **ws 전송 계층에서만** 정수 `i`로 압축하고 수신 직후 복원한다(`wire-codec.ts`);
엔진·reducer·UI·Worker 경로는 도메인 문자열 id 그대로라 무변경이다. 누적 결과: 500대 29.5KB→15.4KB(−48%),
5,000대 214KB→115KB(−46%), 대역폭 ~2.1MB/s→~1.15MB/s. 스냅샷·델타가 동일 규칙으로 인코딩되므로
재현 불변식은 유지된다.

### 실시간 소스 전환 (방식 A ↔ B)

동일한 snapshot/delta 프로토콜을 **Web Worker(A)** 또는 **실제 `ws` 소켓(B)** 으로 받는다.

| 방식 | 실행 | 선택 방법 |
| --- | --- | --- |
| **A. Web Worker**(기본) | 추가 서버 없음 | 기본값, 또는 `?src=worker` |
| **B. ws 소켓** | `pnpm ws:server` 먼저 실행 | `?src=ws` 또는 `NEXT_PUBLIC_WS_URL=ws://localhost:3012` |

예) 소켓 모드로 보기: 서버를 띄운 뒤 `http://localhost:3011/?src=ws`.
상단 배지에 소스(`worker` / `ws · localhost:3012`)와 연결 상태(connecting/open/reconnecting)가 표시된다.
`ws:server`를 껐다 켜면 프론트가 **exponential backoff로 재연결 → 스냅샷 재동기**하는 것을 확인할 수 있다.

## 구현 현황

| 단계(계획서 §12) | 상태 | 내용 |
| --- | --- | --- |
| 1. 설계·Mock | ✅ | 실내 좌표계 커스텀 투영, Rail 그래프 fixture, WebSocket 시뮬레이터(Web Worker) |
| 2. 지도 MVP | ✅ | 정적 벡터 레이어(Rail/Zone/Equipment), 선택·필터·상세 Drawer |
| 3. 실시간 파이프라인 | ✅ | snapshot+delta, seq gap 감지→재동기, id별 코얼레싱, rAF 배치, 알람 |
| 4. 성능·스케일 | 구현 / 실측 대기 | WebGL 포인트 레이어, 대수 500~5,000 공차 순환 부하, LOD(포인트↔히트맵), GPU 필터. 목표 FPS/p95 달성은 미검증 |
| 5. 제품 완성도 | ✅ | 이력 재생(타임 스크러버/배속), 로딩·오류 상태, 접근성(aria/포커스), 경로 자동 마커링 |
| 6. 문서·최적화 | 🔜 | 성능 리포트(before/after), 데모 영상 |

## 아키텍처 (데이터 흐름)

### 반송 운영 모델 (2026-09-05 후속 구현)

- 기본 32대, 운영 관찰 프리셋 8/32대. 8대에서는 잡풀의 배차 대기와 정책 차이를 관찰할 수 있다.
- FOUP별 Lot와 단일 소유 위치(포트 또는 차량)를 유지한다. 동시에 최대 20건을 생성하며 완료 작업은 최근 40건만 보관한다.
- `QUEUED → TO_PICKUP → LOADING → DELIVERING → UNLOADING → DONE`: 적재 전에는 공차, 적재 완료 후에만 FOUP가 차량으로 이동한다. 하역 완료 시 목적지 점유로 전환한다.
- 목적지 슬롯을 작업 생성 시 예약한다. 툴 포트 용량 1, 스토커 용량 24이며 점유+예약이 용량을 넘지 않는다.
- 우선순위: Hot lot(3) 우선 후 FIFO. 최장대기: FIFO. 두 정책 모두 선택된 작업에 가장 가까운 공차를 배정한다. 최근접: 작업·공차 쌍의 단방향 레일 거리를 비교한다. 물리적 거리 계산은 Dijkstra를 사용한다.
- 정책 변경은 기존 배차를 취소하지 않고 새 배차에 적용한다. 작업 마감과 이동은 시뮬레이션 시간을 사용하므로 일시정지 중 마감도 멈춘다.
- 500~5,000대에서는 미배차 공차도 순환하여 고빈도 델타 부하를 유지한다. 노드 도착 시 배차 가능하며 중간 위치에서 순간 이동하지 않는다.
- 작업 목록 검색·차량 선택, FOUP/Lot/출발/도착/단계 상세, 적재·공차/Hot lot 필터, 포트 점유·예약, 완료 건수·평균 반송시간을 표시한다. 필터는 포인트·히트맵·지도 클릭 선택에 공통 적용한다.
- 이력은 최대 120프레임/최근 60초를 보관하며 위치·heading·Job·경로·적재·운영 상태·알람을 함께 복원한다. 재생 속도는 기록된 타임스탬프를 따른다. 재생 중 라이브 시뮬레이터는 계속 진행하고 화면 반영만 보류하며 LIVE 복귀 시 스냅샷을 요청한다.

### 실시간 보완

- 중복 seq 무시, gap 이후 스냅샷까지 델타 수용 중단, 추가·삭제 반영.
- 특정 소켓으로 보내는 스냅샷은 공통 seq를 증가시키지 않아 다른 클라이언트에 가짜 gap을 만들지 않는다.
- 디스패치 명령은 Worker/ws 공통 제공. ws는 ping/pong와 응답 시간 초과 재접속을 지원한다.
- ws 서버의 대수·정책·일시정지는 연결된 클라이언트가 공유한다.

```
 Web Worker (simulator)           Main thread
 ┌─────────────────────┐         ┌──────────────────────────────────────────┐
 │ Rail 그래프 위       │  msg    │ SimulatorClient                          │
 │ OHT 이동/상태/알람   │ ──────▶ │  └ DeltaReducer (순수)                   │
 │ snapshot + delta     │ (seq)   │      · seq gap 감지 → 스냅샷 재동기       │
 │ 의도적 seq gap 주입  │         │      · id별 최신 delta 코얼레싱           │
 └─────────────────────┘         │  └ requestAnimationFrame flush ──┐        │
                                 │                                  ▼        │
                                 │  IndoorMap (OpenLayers adapter)           │
                                 │   · featureById 인플레이스 갱신           │
                                 │   · WebGLPoints(색/필터=GPU) ↔ Heatmap    │
                                 │   · 실내 좌표계(FAB:LOCAL, 재투영 0)      │
                                 │   · 선택 오버레이 + 최근접 레일(경로)     │
                                 └──────────────────────────────────────────┘
   상태 분리: 서버성 데이터=시뮬레이터, UI/선택/필터=Zustand,
             고빈도 위치=React 밖(지도가 직접), KPI/상세=저빈도 폴링(4Hz)
```

## 폴더 구조

```
src/
  app/                       # Next.js routes/layouts (page → LiveMap)
  features/control/          # LiveMap: KPI·지도·필터·이력재생·알람 UI
  entities/oht/              # 타입, status 코드/필터(순수) — + *.test.ts
  entities/fab/              # Rail 그래프 생성/경로/GeoJSON(순수) — + *.test.ts
  shared/sim/                # SimEngine (Worker·ws 서버 공용 시뮬레이션)
  shared/realtime/           # DeltaReducer·SimulatorClient·SocketClient·팩토리 — + *.test.ts
  shared/map/                # 실내 투영, IndoorMap 어댑터, geometry(순수), FAB 도면 — + *.test.ts
  stores/                    # Zustand(선택/필터/알람/일시정지)
  workers/                   # simulator.worker.ts (방식 A 래퍼)
server/                      # ws-server.ts (방식 B: 로컬 ws 서버)
```

## 테스트

Node 24 네이티브 러너 + `tsx` 로더로 순수 로직 및 로컬 ws 통합 테스트를 실행한다(32 케이스).

- `delta-reducer` — 코얼레싱, seq gap 감지, 스냅샷 재동기, 알람 누적
- `rail-graph` — 결정론적 생성, adjacency, GeoJSON 피처 수
- `geometry` — 점-선분 거리, 최근접 세그먼트
- `status` — 필터 코드 매핑, 코드↔상태 역매핑
- `engine` — 전체 반송 단계, FOUP 소유권, 용량 예약, 정책 선택, 정지 시간, 델타 일치, 공차 순환 연속성
- `history` — Job/경로/적재 복원, 불규칙 캡처 간격의 배속 재생
- `socket-server` — 임시 포트의 서버와 두 클라이언트로 snapshot/seq/배차/pause/pong/reset 확인

검증: 타입 검사·프로덕션 빌드·32개 테스트 통과. 브라우저에서 작업 선택/상세, 정책 변경, 이력 재생/배속/seek/LIVE, 적재·Hot lot 필터 및 5,000대 전환을 확인했다. 이 확인은 성능 벤치마크가 아니다.

```bash
pnpm test:unit
```

## 성능 계측

상단 스트립에 실시간 지표를 노출한다: **FPS · msg/s · upd/s · coalesced · resync · latency**.
`대수 5,000` + 축소(히트맵 LOD)로 부하/스케일 거동을 즉시 확인할 수 있다.
목표(계획서 §9): 상호작용 중 50~60 FPS, p95 반영 지연 ≤ 200ms.

현재 `lat`는 마지막 수신부터 배치 호출 직전까지의 대기 시간으로, 네트워크와 실제 GPU 렌더 완료를 포함한 p95가 아니다. 자동화 브라우저에서는 1~4 FPS와 지연 증가가 관찰되어 목표 달성을 주장하지 않는다. 포그라운드 환경에서 재현 가능한 성능 리포트와 렌더 완료 계측이 남아 있다.

### 모델의 한계

차량 간 간격·충돌/합류 제어, 포트 호이스트 동시 접근 제어, 설비 장애와 실제 MES는 구현하지 않았다. 정체 표시는 상대 밀도 추정이며 실제 교통 차단이나 JAM 알람 발생과 연결되지 않는다. 정적 골격은 REST/Query 대신 코드로 생성하고 좌표는 m 단위다. ws 수신의 기본 메시지 형태를 검사하지만 전체 중첩 스키마 검증은 후속 작업이다.

## 백엔드 서버가 필요한가?

**필수는 아니다.** 프론트엔드 단독 + 합성 데이터로 완결되며, 실시간 소스만 두 방식 중 선택한다.

- 정적 골격(Rail/Zone/Equipment)은 코드로 결정론적 생성 — DB 불필요.
- **방식 A (기본)**: 인-브라우저 **Web Worker 시뮬레이터**가 snapshot/delta 송출. 별도 서버·네트워크 없이 seq gap 복구까지 시연. 정적 배포 가능.
- **방식 B (옵션)**: 로컬 **`ws` 서버**(`server/ws-server.ts`, 포트 3012)가 동일 `SimEngine`을 노드에서 구동해 브로드캐스트. **실제 소켓의 재연결·exponential backoff·heartbeat**를 시연. 인증/DB는 없다.
- 두 방식은 **`SimEngine`(시뮬레이션)과 `DeltaReducer`(수신 파이프라인)를 공유**하고 전송 수단만 다르다 → `RealtimeSource` 공통 인터페이스로 교체.
