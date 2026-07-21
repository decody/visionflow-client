# VisionFlow 이관 TODO (앞으로 할 일)

Supabase(BaaS) → **Spring Boot** 점진 이관(strangler)의 **남은 작업 체크리스트**.
코드 실측 기준으로 작성. 전략·배경은 백엔드 저장소 [`ROADMAP.md`](../../visionflow-server/ROADMAP.md) 참조.

> 최종 갱신: **2026-07-21** · 기준 커밋: server `918a71d`(FAQ MyBatis) + Spring Security(미커밋), client `89288c8`(FAQ 프론트 BFF 이관)

---

## 0. 현재 상태 (코드 실측)

| 영역 | 이관 완료 | 남음 |
|---|---|---|
| **백엔드(Spring)** | `faq` 도메인(MyBatis), `health`, **Spring Security(HS256 JWT 검증)** | 그 외 **전 도메인**, Testcontainers, 프론트 BFF 서명 연동 |
| **프론트(Next)** | FAQ → Spring(BFF) + Playwright 테스트 | 그 외 **31개 파일**이 여전히 Supabase 직접 호출 |

- 프론트 FAQ 경로: `브라우저 → Next API 라우트(NextAuth) → Spring → Postgres` (BFF). 로컬 전구간 green 검증됨.
- ✅ **인증 종단 완료**: Spring `AdminFaqController`는 ROLE_ADMIN/ROLE_SUPERADMIN(Bearer JWT) 필요(백엔드) + BFF가 HS256 JWT 서명·첨부(프론트). 로컬 전구간 e2e 통과.
  ⚠️ 배포 전제: `BACKEND_JWT_SECRET`을 프론트·백엔드에 **동일** 값으로 주입해야 함(미설정 시 관리자 호출 실패).

---

## 1. 🔴 인증 (Spring Security) — 최우선  *(백엔드 완료 / 프론트 서명 연동 남음)*

**신뢰 모델 결정: BFF 발급 HS256 서명 JWT.** 브라우저는 Spring을 직접 호출하지 않는다. Next BFF가
NextAuth로 인증한 뒤 userId(sub)+role 클레임을 담은 단기 HS256 JWT를 공유 비밀로 서명해
`Authorization: Bearer`로 Spring에 전달, Spring이 stateless 리소스 서버로 검증한다.
(NextAuth v5 기본 세션은 JWE라 Spring 직접검증이 비표준 → BFF 재서명 채택.)

- [x] **백엔드(server `visionflow-server`)** — `SecurityConfig`(HS256 JwtDecoder, `/api/admin/**`=ROLE_ADMIN/ROLE_SUPERADMIN),
      role 클레임→권한 변환, 401/403 JSON, `AdminFaqController` 보호, 보안 테스트 7건 통과.
- [x] **프론트(client)** — BFF가 HS256 JWT를 **서명**해 Spring 호출에 첨부(완료)
  - [x] `lib/backend.ts`에 `signBackendToken`/`backendAuthHeaders`(node:crypto HMAC, HS256, `sub`=userId·`role`·`iss=visionflow-bff`·exp 2분). jose 등 외부 의존성 없음
  - [x] `app/api/admin/faq/route.ts`(GET·POST)+`[id]/route.ts`(PATCH)의 Spring `fetch`에 `Authorization: Bearer` 부착. `requireManager`가 세션에서 userId/role을 꺼내 서명 신원으로 반환
  - [x] `.env.example`에 `BACKEND_JWT_SECRET`(백엔드와 **동일** 값, 32바이트 이상)·`BACKEND_JWT_ISSUER` 문서화
  - [x] 전구간 e2e 검증: 로컬 Spring(security 활성)에 node:crypto 서명 토큰 호출 → admin/superadmin 200·Viewer 403·무토큰 401·위조서명 401 전부 통과
  - [ ] (선택) Playwright: 서명 토큰 경로 계약 테스트 — 실제 세션+백엔드 필요라 후속
- [x] 인증 실패/권한 부족 응답 계약(401/403)은 백엔드가 `ApiExceptionHandler` 형태로 통일 완료

## 2. 🟠 FAQ 마무리 (잔여)

- [ ] 백엔드 **Testcontainers** 통합 테스트 (ROADMAP 2단계 미완 — 현재 단위 테스트만)
- [ ] 프론트 **실제 Supabase 키 + AUTH_SECRET**으로 `.env.local` 구성 후 어드민 로그인 포함 통합 런타임 재확인
      (현재는 플레이스홀더 env로 공개 목록 + 무세션 401까지만 검증)
- [ ] (선택) 프론트 e2e(chromium)에 FAQ 페이지 렌더/아코디언 테스트 추가

## 3. 🟡 다음 도메인 순차 이관 (FAQ 패턴 복제)

각 도메인 공통 작업: **Spring**(Mapper/Service/Controller/DTO/Validation/예외 + Flyway 마이그레이션) → **프론트**(Supabase 직접호출 → Next BFF 라우트 위임) → **테스트**(단위 + Playwright API).

- [ ] **notices** (공개 목록/상세 + 관리자 CRUD) — 난이도 낮음, FAQ와 가장 유사 → 다음 후보 1순위
- [ ] **qna** (비밀글 검증, 조회수) — `apps/src/lib/qna-view-count.ts` 로직 서버 이관 필요
- [ ] **works** (관리자 CRUD) — 이미 `/api/admin/works`로 하드닝됨, 위임 대상 명확
- [ ] **문의 3종** (quote / partnership / quick) + **파일 업로드·첨부** — 첨부 스토리지 처리 설계 필요(현재 Supabase Storage)
- [ ] **users** (초대/권한), **alarms** — 인증(1단계) 이후 진행
- [ ] **search** (AI 검색) — 2순위. SI 관점 우선도 낮음

## 4. 🟢 DB 소유권 인수 & 정리 (ROADMAP 5단계)

- [ ] Flyway `baseline-on-migrate` 설정 → 기존 Supabase 스키마 소유권 인수
- [ ] 나머지 테이블 Flyway 마이그레이션 SQL 작성 (현재 `V1__init_faq`만 존재)
- [ ] `ddl-auto` 관련 정리 — MyBatis 단일화로 JPA 검증 불필요(이미 제거됨), 스키마 관리 일원화 확인
- [ ] Supabase 부가레이어(Auth/RLS/Storage/Edge Function) 대체 완료 후 제거

## 5. 🔵 운영/배포 (ROADMAP 6단계 — SI "운영 경험" 증빙)

- [ ] Spring 백엔드 Docker 컨테이너화
- [ ] CI/CD (GitHub Actions: 빌드·테스트·배포) — 두 repo 각각
- [ ] 클라우드 배포 (개인: Railway/Render/Fly.io / 무게감: AWS EC2+RDS)
- [ ] 로깅·모니터링 (구조화 로깅 + Actuator 헬스체크)
- [ ] 프론트 배포 환경에 `API_BASE_URL` 운영값 주입 (현재 로컬 기본값 `http://localhost:8080`)

## 6. ⚪ 코드 품질 / 기술 부채 (코드 확인에서 도출)

- [ ] **프론트 `apiClient`(Supabase REST 래퍼) 제거** — 전 도메인 이관 완료 시점의 최종 정리 대상 (`packages/shared/src/utils/api.ts`)
- [ ] **`IFaq` 타입의 camel/snake 이중 필드 정리** — Spring 단일 계약으로 수렴 후 `is_visible`/`isVisible` 병행 제거
- [ ] (선택) 백엔드 `FaqService.create` — insert 후 `findById` 재조회(2쿼리). 필요 시 반환 최적화
- [ ] 도메인 이관마다 프론트 BFF 라우트 에러 계약(4xx 전달/502 래핑) 일관성 유지

---

## 진행 순서 제안

```
1. Spring Security(인증)  ← FAQ 배포 가능 상태의 전제
2. notices 이관           ← FAQ 패턴 복제로 이관 파이프라인 굳히기
3. qna / works / 문의     ← 반복 (첨부·조회수 등 도메인 특성 학습)
4. DB 소유권 인수 + Supabase 제거
5. Docker/CI-CD/배포      ← 포트폴리오 "운영 경험" 완성
```

> 이 문서는 **프론트 저장소 docs/** 에 위치. 백엔드 상세 로드맵은 [`visionflow-server/ROADMAP.md`](../../visionflow-server/ROADMAP.md)와 이중 관리하지 말고, 완료 시 양쪽을 함께 갱신할 것.
