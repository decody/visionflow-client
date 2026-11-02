# Smart Logistics Control Center (프로토타입 #04)

전세계 멀티모달 복합운송(해상·항공·육상·철도)을 **3D 글로브**에서 관제하고, 권역 드릴다운 시
2D 지역 관제로 전환되는 실시간 GIS 관제 프론트엔드 프로토타입. VisionFlow 포트폴리오
"실시간 GIS 관제 10종" 중 **#01 대표작**.

- 상세 기획서: `docs/smart_logistics_control_center_prototype_plan_ko_updated.docx` (v1.1, 권위본)
- 선행 프로토타입: #02 AMHS/OHT Control · #03 Last-mile Delivery Control (실시간 코어·연동 경계 재사용)
- 포트: dev **3015** · ws **3016**

> ⚠️ **합성 데이터 · 공개 경계 데이터 · 실제 운송망 아님.** 허브·레인·화물은 전부 합성이며,
> 글로브 표면만 공개 도메인 Natural Earth 국가 경계를 쓴다. 외부 타일·실시간 운송사 피드는 사용하지 않는다.

## 현재 상태 — 단계 9 완료 (마감 산출물 포함)

세워 둔 것:

- Next.js(App Router) + TypeScript 앱 셸, 포트 3015, 다크 관제 테마
- 도메인 모델 `src/entities/logistics/types.ts` — Shipment / Leg / Conveyance / Hub, Role·Audit·Scenario
- 정적 합성 데이터 `src/entities/logistics/mock.ts` — 허브 10 · 레인 12 · 샘플 화물 3
- 대권항로 geo 유틸 `src/shared/geo/great-circle.ts` (+ unit test)
- 데모 상수 `src/shared/config.ts` — 시간 압축(1 real-sec = 10 sim-min)·단위·MVP 성능 기준(§15.3/§15.4)
- 번들 네트워크 `public/network/synthetic-network.geojson`
- **deck.gl 3D 글로브**(`src/features/globe/globe-view.tsx`) — `_GlobeView` + 지구 구(sphere) 배경
  \+ Natural Earth 국가 경계(`public/natural-earth/countries-110m.geojson`, 177개국, public domain)
  \+ 허브 노드(ScatterplotLayer) + 대권항로 레인(ArcLayer, greatCircle) + 자동 회전 + 줌 기반 LOD 배지
- 순수 뷰 컨트롤러 `src/shared/map/view-controller.ts`(LOD·회전, + unit test)
- WebGL은 클라이언트 전용이라 `globe-panel.tsx`에서 `ssr:false` 동적 로드
- **운송 네트워크 그래프** `src/entities/network/build-network.ts` — 허브/레인 양방향 인접·모드별 엣지·BFS 도달성 (+ unit test)
- **SimEngine** `src/shared/sim/engine.ts` — 고정 seed 결정론, 운송수단이 같은 모드 레인을 대권항로(slerp)로 순회, 모드별 속도(§5)·시간 압축(§15.3), `snapshot()`/`tick()` → snapshot/delta (+ unit test)
- **실시간 수신 코어** `src/shared/realtime/` — `types.ts`(conveyance 채널 프로토콜)·`delta-reducer.ts`(seq/gap·코얼레싱, +test)·`simulator-client.ts`(Worker A + rAF, inline 폴백)·`create-source.ts`(팩토리)
- **Web Worker 시뮬레이터** `src/workers/simulator.worker.ts` (방식 A)
- 글로브에 **실시간 운송수단 300대**(ScatterplotLayer, 모드색) 라이브 렌더 + 좌상단 운송수단 수·LIVE/Hz 배지
- **복합운송 화물 생명주기**(단계 3): 경로 탐색 `src/entities/network/path.ts`(Dijkstra, 규칙별 비용: 최단 ETA/최소 환적/최저 비용, +test)·ETA 헬퍼 `src/shared/sim/shipments.ts`(leg 소요·환적 dwell·통관 가중·SLA at-risk, +test)·엔진 화물 풀(다중 leg 이동·환적 허브 슬롯 dwell·QUEUED 대기·누적 ETA·DELAYED/CUSTOMS_HOLD·DELIVERED/EXCEPTION 터미널·목표 수 대체 스폰)
- **shipments 저빈도 채널**: snapshot + 변경분만 delta(add/upd/del), DeltaReducer 대칭 코얼레싱
- 글로브 **Executive KPI 오버레이**(운송 중·환적 대기·SLA 위험·통관 보류·완료 누적·예외·on-time%) + **라우팅 규칙 토글**(최단 ETA/최소 환적/최저 비용)
- **글로브↔지역 전환**(단계 4): 순수 전환 상태기계 `view-controller.ts`(enterRegion/exitToGlobe/lodForSession)·권역 데이터 `shared/map/regions.ts`(허브 그룹→중심/줌). 권역 칩 클릭 → `MapView`로 `FlyToInterpolator` 보간 전환, 해당 권역으로 허브·레인·운송수단 **필터 동기화**, `← 글로브` 복귀. 지역 모드에선 국가 경계 GeoJSON이 2D 베이스맵 역할(오프라인).
- **알람·시나리오·자동 데모**(단계 5): 순수 `shared/sim/alerts.ts`(SLA·DWELL·CAPACITY·CUSTOMS·EXCEPTION·CLOSURE·WEATHER 도출, +test)·엔진 reconcile(ack 보존·자동 해제)+알람 채널(snapshot/add/upd/del). **fault injection**: 항만 혼잡(PORT dwell 연장)·운하 폐쇄(레인 차단+영향 화물 재경로)·기상 회피(해상 감속)·통관 급증(통관율 상향)·수요 서지(목표 화물↑). **자동 데모**(고정 타임라인 76s 루프, 정상→혼잡→폐쇄→기상→통관→서지→복구). UI: 알람 패널(심각도·ack)·시나리오 바(토글/초기화/데모)·데모 진행 배지.
- **관제 UI 완성**(단계 6): 좌측 **화물 목록 + 공통 필터**(모드·상태·Expedite, 글로브/목록 동기화) · **화물 상세 Drawer**(leg 타임라인·누적 ETA/SLA·상태·**2단계 확인 조치** Expedite 승격/재경로) · **이력 재생**(링버퍼 300프레임·재생/속도 1·2·4×·seek·LIVE 복귀) · **개발 진단**(FPS·msg/s·upd/s·coalesced%·resync·렌더 수) · 로컬 시각.
- **연동 경계**(단계 7): 순수 `shared/integration/command-contract.ts`(ROLE_RANK·COMMAND_MIN_ROLE·authorizeCommand·parseClientCommand·describeCommand·buildAuditEntry, +test) · 엔진 단일 실행점 `applyCommand(cmd, actor)`(역할 인증 → 감사 기록(승인·거부 모두) → 승인 시 실행) · **감사 채널**(snapshot.audit + delta.auditAdd) · 좌측 **역할 선택기**(조회<배차<감독)·**감사 타임라인**. **방식 B ws 서버** `server/ws-server.ts`(포트 3016) + `ws-auth.ts`(토큰맵/HS256 JWT·supervisor fallback) + `socket-client.ts`(재연결·backoff·heartbeat·seq 재동기) + `create-source` `?src=ws` 분기. payload 상한·rate limit·세션 스코프(shared/isolated)·구독 필터·JSONL 감사 로그.

검증: `test:unit` **73/73 green**(+command-contract6·engine applyCommand/audit6) · 코어 성능 벤치 MVP 기준 통과 · **P0 자동화 PASS**(Playwright 3개·WebSocket 1개) · **ws 서버 스모크 PASS**(인증·viewer 거부/supervisor 승인·감사·malformed BAD_REQUEST).
⚠️ 글로브 WebGL·Worker·전환/재생 애니메이션은 브라우저 육안 확인 필요(헤드리스 미검증, 단계 게이트).

**MVP 코어(기획서 §15.1) 충족**: 글로브 Overview + Executive KPI + 화물 상세 Drawer + 공통 필터 + 알람 패널 + 시나리오 3종.

### 방식 B 실행
```bash
pnpm ws:server      # ws://localhost:3016 (별도 터미널)
pnpm dev            # 그리고 http://localhost:3015/?src=ws 로 접속
```

단계 8·9 산출물: `server/perf-bench.ts`와 `perf-report.md`에 500~5,000 운송수단 / 4,000~50,000 화물 결과를 기록했고, `demo-script.md`와 저장소의 `docs/smart_logistics_control_center_prototype_progress_ko.md`에 시연·완료 기준을 정리했다.

P1 브라우저 성능 계측은 `e2e/browser-perf.spec.ts`와 `browser-perf-report.md`에 있다. `pnpm perf:browser`가 1280×720 Chromium에서 1k/10k·5k/50k 부하를 5초씩 측정하며 FPS·렌더 대상·heap·실행 환경을 기록한다. 현재 Playwright 환경 측정값은 1k 평균 6.4 FPS, 5k 평균 5.2 FPS이므로 실제 GPU 재측정과 deck.gl 렌더 최적화가 다음 과제다.

## MVP 범위 (기획서 §15.1)

첫 시연 버전 = 글로브 Overview · Executive KPI · 화물 상세 Drawer · 공통 필터 · 알람 패널
\+ 시나리오 3종(정상 운송 · 항만 혼잡 · 운하 폐쇄). 지역 MapView, 방식 B WebSocket 서버,
10,000~50,000 shipment 대규모 부하는 MVP 이후 단계.

## 실행

```bash
# (최초 1회) 의존성 설치 — deck.gl 포함
pnpm install   # 또는 npm install

pnpm dev        # http://localhost:3015
pnpm typecheck  # next typegen && tsc --noEmit
pnpm test:unit  # node --test (great-circle 등)
pnpm test:ws    # 방식 B WebSocket 스모크
pnpm test:e2e    # Worker·글로브·권역·Drawer·시나리오 브라우저 회귀
pnpm test:p0     # 위 두 P0 검증을 순서대로 실행
pnpm perf:browser # 1k/5k 브라우저 렌더 성능 측정
```

## 폴더 구조 (기획서 §11, 현재 구현 기준)

```
src/
  app/                 # Next.js routes (/ → 관제) · layout · globals.css
  entities/logistics/  # 도메인 타입 · 정적 mock
  shared/geo/          # great-circle(순수) + test
  shared/config.ts     # 데모 상수(시간·단위·성능 기준)
public/
  network/             # 합성 허브·레인 네트워크 GeoJSON(번들)
  natural-earth/       # countries 1:110m GeoJSON(공개 도메인 경계 데이터)
```

## 역할 정책 (기획서 §9/§15.2)

`viewer(0) < dispatcher(1) < supervisor(2) < system(3)`. 조회=viewer, 알람 확인·재배정·Expedite
승격=dispatcher, fault injection·시나리오 초기화=supervisor 이상. 승인·거부 모두 감사 로그에 남긴다.
