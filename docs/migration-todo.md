# VisionFlow 이관 TODO (앞으로 할 일)

Supabase(BaaS) → **Spring Boot** 점진 이관(strangler)의 **남은 작업 체크리스트**.
코드 실측 기준으로 작성. 전략·배경은 백엔드 저장소 [`ROADMAP.md`](../../visionflow-server/ROADMAP.md) 참조.

> 최종 갱신: **2026-07-20** · 기준 커밋: server `918a71d`(FAQ JPA→MyBatis), client `89288c8`(FAQ 프론트 BFF 이관)

---

## 0. 현재 상태 (코드 실측)

| 영역 | 이관 완료 | 남음 |
|---|---|---|
| **백엔드(Spring)** | `faq` 도메인(MyBatis), `health` | 그 외 **전 도메인**, 시큐리티, Testcontainers |
| **프론트(Next)** | FAQ → Spring(BFF) + Playwright 테스트 | 그 외 **31개 파일**이 여전히 Supabase 직접 호출 |

- 프론트 FAQ 경로: `브라우저 → Next API 라우트(NextAuth) → Spring → Postgres` (BFF). 로컬 전구간 green 검증됨.
- ⚠️ **미해결 리스크**: Spring `AdminFaqController`가 **미인증**. 지금은 NextAuth BFF 게이트가 임시 방어 → 실배포 전 반드시 3단계(시큐리티) 필요.

---

## 1. 🔴 인증 (Spring Security) — 최우선

FAQ 어드민이 미인증 상태로 열려 있어, 배포 가능 상태로 만들려면 먼저 해결해야 함.

- [ ] NextAuth 세션(JWT)을 Spring Security가 검증 (공유 시크릿 또는 JWKS)
- [ ] 권한 분기 이관 — role: `SuperAdmin` / `admin` / `Viewer` (프론트 `canManageContent` 대응)
- [ ] `AdminFaqController` 보호 적용 → BFF 게이트에만 의존하지 않도록
- [ ] 인증 실패/권한 부족 응답 계약(401/403)을 프론트 BFF 라우트와 일치시키기

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
