# Last-mile Delivery Control (Prototype #03)

도시 라스트마일 배송(라이더·주문·배송 권역·물류센터)을 **실제 지리 좌표계**(강남) 위에서 실시간 관제하는 VisionFlow 포트폴리오 프로토타입. 실제 배송 플랫폼 데이터가 아닌 **로컬 합성 시뮬레이션**이며, 지도 배경은 **OpenStreetMap 공개 도로망**을 오프라인 벡터로 렌더한다(외부 타일·API 키 없음).

AMHS/OHT(#02)가 세운 완성 기준 — 실시간 파이프라인(snapshot/delta·DeltaReducer·Worker/ws), 연동 경계(applyCommand·역할·감사), WebGL/LOD/컬링, 헤드리스 성능 벤치 — 을 배송 도메인으로 이식했다. OHT→라이더, Rail→도로 그래프, FOUP→주문, Bay→권역, Stocker→허브, ZCU→신호/지오펜스, Hot lot→특급(EXPRESS)으로 매핑한다.

- 계획서: [`docs/last_mile_delivery_control_prototype_plan_ko.md`](../../docs/last_mile_delivery_control_prototype_plan_ko.md)
- 진행 내역: [`docs/last_mile_delivery_control_prototype_progress_ko.md`](../../docs/last_mile_delivery_control_prototype_progress_ko.md)
- 시연 스크립트: [`demo-script.md`](demo-script.md)
- 성능 벤치 결과: [`perf-report.md`](perf-report.md)
- 스택: Next.js 16 · React 19 · TypeScript · OpenLayers(WebGL/벡터) · GeoJSON · Web Worker · ws

## 구현 단계 (1~8 완료)

1. ✅ OpenLayers 강남 배송 권역·도로·물류센터 레이어 + LOD 3단계
2. ✅ 도로 그래프(Dijkstra) + 라이더 이동 시뮬레이터 + snapshot/delta 실시간 소스
3. ✅ 주문 배차·ETA·생명주기 (QUEUED→ASSIGNED→TO_PICKUP→PICKED_UP→DELIVERING→DELIVERED, +DELAYED/FAILED)
4. ✅ 라이브 알람(지연·미배차·지오펜스·배터리)·시나리오 주입·배터리/충전·자동 데모(약 60초)
5. ✅ 관제 UI (권역 KPI 동기화·이력 재생·개발 진단)
6. ✅ 연동 경계 (`applyCommand`·역할 viewer<dispatcher<supervisor<system·감사·ws 방식 B)
7. ✅ 성능·최적화 (경로 메모·배차 상한·WebGL 포인트·뷰포트 컬링·헤드리스 벤치, 1,000~5,000대)
8. ✅ 마감 (합성 데이터 고지·시연 스크립트·진행 문서)

### 기획서 보강 (계획서 §5·§7)

- ✅ **가·감속 프로파일**: 순간 속도 변경 대신 가속(2.8)·감속(3.8 m/s²) 한계. 정지선(적신호)·목적지 접근 시 정지거리(`v=√(2·a·d)`) 기반으로 미리 감속하고, 출발 시 서서히 가속해 정지·재출발이 자연스럽다.
- ✅ **집화·배송 도킹 상태기계**: 도착 시 `APPROACHING→DOCKED→HANDOFF→RELEASING` 단계로 정차·인수인계·출차를 모델링(집화·배송 공통). 집화 HANDOFF 시점에 `PICKED_UP` 전이, 배송 RELEASING 완료 시 `DELIVERED/FAILED`. 인스펙터에 현재 도킹 단계 배지 표시.
- ✅ **허브 집화 슬롯 예약**: 허브별 동시 집화 도크 수를 제한(용량은 함대 규모로 스케일). 슬롯이 가득 차면 라이더가 `QUEUED`로 대기하다 슬롯이 나면 입고(점유는 용량 초과 불가). 허브 마커에 `점유/용량 · 대기`를 표시하고 가득 차면 적색 강조. 상태는 `meta.hubs`로 전달.
- ✅ **Overview LOD Heatmap**: 도시 전체(Overview) 줌에서는 개별 점 대신 **밀도 히트맵**으로 전환(권역 줌=WebGL 점, 상세 줌=방향 벡터). 같은 라이더 소스(뷰포트 컬링)를 동일 가중으로 집계해 혼잡 밀도를 한눈에 보여준다.
- ✅ **신호 교차로**: 주요 사거리(강남·역삼·선릉·삼성·강남구청·논현)에 결정론적 신호 주기(GO/STOP). 라이더가 적신호 정지선에서 감속·대기 → 번칭·ETA 가중이 자연 발생. 상태는 flip 시에만 델타로 스트리밍, 지도에 녹/적 신호등으로 표시.
- ✅ **도로 통제·우회**: 통제 구간(테헤란로 역삼~선릉)을 간선 비용 ∞로 막아 Dijkstra가 자동 우회. `도로 통제` 시나리오(감독 권한)로 토글하며, 활성 시 운행 중 라이더를 즉시 재경로하고 지도에 통제 구역을 강조.

## 주요 폴더

- `src/entities/road/` — 도로 그래프 생성/경로(Dijkstra), 순수
- `src/entities/delivery/` — 라이더·주문 도메인 타입, 연동 경계 타입(역할·감사)
- `src/shared/sim/` — SimEngine(Worker·ws 공용), 배차·알람·신호 위상(`signals.ts`, 순수)
- `src/shared/realtime/` — snapshot/delta 프로토콜·DeltaReducer·Worker/ws 클라이언트·소스 팩토리
- `src/shared/integration/` — 명령 계약(역할 정책·감사 생성), 순수
- `src/shared/map/` — 권역 도면·뷰포트 컬링(순수)
- `src/shared/stats/` — 권역 KPI 집계(순수)
- `src/features/map/` — OpenLayers 어댑터(WebGL 포인트·LOD·컬링)
- `src/workers/` — simulator.worker.ts (방식 A)
- `server/` — ws-server.ts (방식 B, :3014) · perf-bench.ts

## 실행

pnpm 워크스페이스(`prototypes/*`) 구성이므로 저장소 루트(`visionflow-client`)에서 설치한다.

```bash
# visionflow-client 루트에서
pnpm install
pnpm --filter @visionflow/last-mile-delivery-control dev   # http://localhost:3013

# 프로토타입 폴더에서
pnpm typecheck                                             # next typegen + tsc --noEmit
pnpm test:unit                                             # node --test (tsx 로더)
pnpm ws:server                                             # 방식 B: 로컬 ws 서버(:3014)
pnpm perf                                                  # 헤드리스 성능 벤치 → perf-report.md
```

Web Worker를 사용할 수 없는 브라우저 환경에서는 동일한 `SimEngine`을 메인 스레드에서 실행하는 inline fallback으로 자동 전환한다. 개발 서버를 네트워크 주소로 접속하는 경우에는 `next.config.mjs`의 `allowedDevOrigins`에 해당 preview host를 추가해야 한다.

### 방식 B (ws 소켓)

`pnpm ws:server`로 로컬 ws 서버(:3014)를 띄운 뒤 `http://localhost:3013/?src=ws`로 접속하면 Web Worker 대신 ws 서버에 연결된다(재연결·heartbeat·스냅샷 재동기 시연). `NEXT_PUBLIC_WS_URL`로 주소를 바꿀 수 있다.

#### WebSocket 인증·상태 범위

기본 로컬 데모는 토큰 없이 supervisor로 동작한다. 운영형 역할 경계를 시연하려면 서버에 `WS_AUTH_TOKENS`를 설정한다.

```bash
WS_AUTH_TOKENS=demo-viewer=OP-VIEWER:viewer,demo-dispatcher=OP-DISPATCHER:dispatcher
NEXT_PUBLIC_WS_TOKEN=demo-viewer
```

토큰이 설정되면 actor와 role은 서버가 결정하고 클라이언트의 `setRole` 변경은 거부된다. 기본 `shared` 모드에서는 모든 연결이 하나의 데모 시뮬레이션 상태를 공유하고, `isolated` 모드에서는 연결별 엔진을 사용한다.

고정 토큰 대신 HS256 JWT를 검증하려면 `WS_JWT_SECRET`을 설정한다. JWT의 `sub`, `role(viewer|dispatcher|supervisor|system)`, 선택적 `exp` claim을 사용하며, 실제 배포에서는 IdP JWKS 검증기로 교체한다.

운영형 보호 설정도 환경변수로 지정할 수 있다.

```bash
WS_MAX_PAYLOAD_BYTES=65536
WS_COMMANDS_PER_WINDOW=60
WS_AUDIT_LOG=./runtime/ws-audit.jsonl
WS_STATE_SCOPE=isolated
```

서버는 payload 크기와 연결별 명령 빈도를 제한하고, 재배차·연락·특급 승격·알람 확인 명령의 대상 ID가 현재 엔진에 존재하는지 확인한다. `WS_AUDIT_LOG`가 지정된 경우 승인·거부 결과를 JSONL로 append한다. 실제 배포에서는 이 파일 대신 중앙 감사 로그 저장소로 교체해야 한다.

`WS_STATE_SCOPE=isolated`를 사용하면 연결마다 독립된 시뮬레이션 엔진·일시정지·함대 규모·배차 규칙을 사용한다. 기본값 `shared`는 여러 운영자가 하나의 데모 상태를 함께 보는 호환 모드다.

### 성능 벤치 (헤드리스)

브라우저 렌더 FPS는 GPU·자동화 환경에 좌우돼 재현성이 낮다. `server/perf-bench.ts`는 ws-server가 매 틱 수행하는 `JSON.stringify(engine.tick())`과 동일 경로를 노드에서 반복 실행해 대수(500/1,000/2,000/5,000)별 tick·직렬화 지연 p95, 델타 바이트, 지속 가능 Hz, 메모리를 측정한다. 고정 seed·고정 clock으로 결정론적이며 결과는 `perf-report.md`에 저장한다. 최근 실행 기준 5,000대에서 frame p95 13.92ms, 평균 델타 928KB로 지속 가능 Hz 72를 기록해 10Hz 예산을 통과했다(가·감속·신호·통제·도킹·허브 슬롯 보강 포함).

```bash
pnpm perf -- --counts=1000,5000 --ticks=600 --rate=10
```

## 역할·연동 경계 시연

운영바 `역할` 선택기로 세션 역할을 조회→배차→감독으로 바꿀 수 있다. 조회 권한에서 운영/시나리오 명령을 누르면 연동 경계에서 **거부**되고 감사 타임라인에 사유와 함께 남는다. 자세한 순서는 [`demo-script.md`](demo-script.md) 참조.

> 합성 데이터·OSM 공개 도로망 시각화입니다. 실제 배송 플랫폼·라이더 GPS·주소 데이터가 아니며, 포트폴리오·UX 검증용 프로토타입입니다.
