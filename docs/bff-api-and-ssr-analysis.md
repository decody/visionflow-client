# VisionFlow BFF API 및 SSR 구조 분석

작성일: 2026-08-13  
분석 대상: `visionflow-client/apps/app/api` 및 `visionflow-server` 연동 구조

## 1. 결론

`visionflow-client/apps/app/api` 아래의 Route Handler는 대부분 불필요한 중복 백엔드가 아니라, 브라우저와 `visionflow-server` 사이에서 동작하는 **BFF(Backend for Frontend)** 계층이다.

현재 BFF의 주된 목적은 서버 사이드 렌더링 준비가 아니다. 다음 책임이 중심이다.

- Spring 서버 주소 은닉
- 동일 출처 API 제공
- NextAuth 세션 검증
- NextAuth 사용자를 Spring용 단기 JWT로 변환
- Spring DTO와 기존 UI 타입 변환
- 외부 AI API 키 보호
- 오류 응답과 캐시 정책 통합
- 파일 다운로드 응답 중계

BFF는 SSR에 사용할 수 있지만, BFF가 존재한다고 자동으로 SSR이 되는 것은 아니다. 현재 Work 조회는 클라이언트 컴포넌트의 TanStack Query가 브라우저에서 `/api/works`를 호출하므로 CSR에 가깝다.

## 2. 현재 요청 흐름

### 2.1 공개 데이터 조회

```text
Browser
  -> Client Component / TanStack Query
  -> Next.js /api/* Route Handler
  -> visionflow-server REST API
  -> MyBatis
  -> PostgreSQL
```

Work 목록을 예로 들면 다음 순서로 동작한다.

1. `useWorkListQuery()`가 브라우저에서 `GET /api/works` 호출
2. `apps/app/api/works/route.ts` 실행
3. BFF가 Spring의 `GET /api/works` 호출
4. Spring이 PostgreSQL의 `works` 테이블 조회
5. 응답이 BFF를 거쳐 브라우저에 전달됨

이 요청은 페이지 HTML 생성 전에 서버에서 수행되는 것이 아니라, 클라이언트 화면이 실행된 후 발생한다. 따라서 현재 방식은 SSR이 아니다.

### 2.2 관리자 요청

```text
Browser
  -> Next.js 관리자 BFF
  -> NextAuth 세션 및 역할 검사
  -> 단기 HS256 JWT 생성
  -> visionflow-server /api/admin/*
  -> Spring Security 검증
  -> PostgreSQL
```

관리자 API에서는 BFF가 단순 프록시 이상의 역할을 한다.

1. NextAuth 세션 확인
2. `admin` 또는 `SuperAdmin` 역할 확인
3. 사용자 ID와 역할로 수명이 짧은 JWT 생성
4. `Authorization: Bearer ...` 헤더로 Spring에 전달
5. Spring DTO를 기존 프런트 타입으로 변환

이 구조에서 `BACKEND_JWT_SECRET`은 Next.js 서버와 Spring 서버만 알고 있어야 한다. 브라우저에서 Spring을 직접 호출하도록 변경하면 이 비밀 키를 안전하게 사용할 수 없다.

## 3. `apps/app/api` Route Handler 분류

### 3.1 Spring 연동 BFF

다음 API들은 `backendUrl()`을 이용하여 `visionflow-server`로 요청을 전달한다.

| Next.js API | Spring API | 역할 |
|---|---|---|
| `/api/works` | `/api/works` | 포트폴리오 공개 조회 |
| `/api/notices` | `/api/notices` | 공지 공개 조회 |
| `/api/faq` | `/api/faq` | FAQ 공개 조회 |
| `/api/qna` | `/api/qna` | Q&A 조회·등록·비밀번호 검증 |
| `/api/quote-inquiries` | `/api/quote-inquiries` | 견적 문의 등록 |
| `/api/partnership-inquiries` | partnership API | 제휴 문의 등록·관리 |
| `/api/quick-inquiries` | quick inquiry API | 빠른 문의 등록·관리 |
| `/api/admin/works` | `/api/admin/works` | 포트폴리오 관리 |
| `/api/admin/notices` | `/api/admin/notices` | 공지 관리 |
| `/api/admin/faq` | `/api/admin/faq` | FAQ 관리 |
| `/api/admin/qna` | `/api/admin/qna` | Q&A 관리 |
| `/api/admin/users` | `/api/admin/users` | 관리자 사용자 관리 |
| `/api/admin/quote-requests` | `/api/admin/quote-inquiries` | 견적 문의 관리 |
| `/api/admin/alarms` | `/api/admin/alarms` | 관리자 알림 조회 |
| 첨부파일 Route Handler | Spring attachment API | 파일 스트림 중계 |
| 답변 Route Handler | Spring reply API | 답변 전송 |

프런트엔드 훅과 화면에서 위 API들을 실제로 호출하고 있다. 조사 시점에 명백하게 호출되지 않는 Route Handler는 발견되지 않았다.

### 3.2 Next.js에 남아야 하는 독립 기능

#### NextAuth

`apps/app/api/auth/[...nextauth]/route.ts`는 Spring 프록시가 아니라 NextAuth가 사용하는 자체 엔드포인트다.

로그인 과정에서는 `apps/auth.ts`가 Spring의 다음 API를 호출한다.

- `POST /api/auth/login`
- `POST /api/auth/sso-login`

따라서 NextAuth Route Handler와 Spring 인증 API는 서로 다른 책임을 담당한다.

#### 초대 완료

`apps/app/api/auth/complete-invite/route.ts`는 초대 토큰과 새 비밀번호를 Spring의 `/api/auth/set-password`로 전달한다. 초대 수락 페이지에서 실제로 사용하므로 필요하다.

#### AI 검색

`apps/app/api/search/route.ts`는 단순 프록시가 아니다.

- Spring에서 FAQ·공지·Q&A 검색 결과 조회
- Work 및 연락처 정적 인덱스 결합
- Gemini 또는 OpenAI를 이용한 답변 생성
- 결과 정규화 및 오류 처리

외부 AI 서비스 API 키를 브라우저에 노출하면 안 되므로 이 기능은 서버 측 BFF에 남아야 한다.

## 4. BFF와 SSR의 관계

### 4.1 BFF는 SSR이 아님

BFF는 프런트엔드에 맞춘 API 계층이고, SSR은 서버가 페이지 HTML을 생성하는 렌더링 방식이다. 서로 함께 사용할 수 있지만 같은 개념은 아니다.

| 구분 | BFF | SSR |
|---|---|---|
| 목적 | API·인증·데이터 계약 조정 | 초기 HTML을 서버에서 생성 |
| 실행 위치 | Next.js 서버 | Next.js 서버 |
| 입력 | 브라우저 또는 서버의 API 요청 | 페이지 요청 |
| 출력 | JSON, 파일, 스트림 | HTML 또는 React Server Component payload |
| 자동 연관 | BFF가 있어도 SSR이 되지 않음 | SSR에서 BFF 또는 Spring 직접 호출 가능 |

### 4.2 현재 Work 페이지

현재 구조는 다음과 같다.

```text
페이지 렌더링
  -> Client Component 실행
  -> useWorkListQuery()
  -> fetch('/api/works')
  -> 데이터 수신 후 화면 갱신
```

초기 HTML에 포트폴리오 데이터가 들어 있지 않기 때문에 다음 특성이 있다.

- JavaScript 실행 후 데이터 표시
- 초기 로딩 상태 필요
- 검색엔진이 클라이언트 실행 결과를 처리해야 함
- 데이터 수신 후 레이아웃 변경 가능

### 4.3 SSR 또는 Server Component 적용

공개 Work 페이지에서는 Server Component가 Spring을 직접 호출할 수 있다.

```tsx
const response = await fetch(`${process.env.API_BASE_URL}/api/works`, {
  next: { revalidate: 60 },
});

if (!response.ok) {
  throw new Error('Failed to load works.');
}

const works = await response.json();
```

이 방식에서는 다음 흐름이 된다.

```text
Page request
  -> Next.js Server Component
  -> visionflow-server
  -> PostgreSQL
  -> 데이터가 포함된 HTML/RSC 응답
```

공개 서버 컴포넌트가 같은 Next.js 앱의 `/api/works`를 다시 호출할 수도 있지만, 서버 내부에서 자기 자신에게 HTTP 요청을 만드는 불필요한 홉이 발생한다. 서버 전용 데이터 함수 또는 Spring 직접 호출을 권장한다.

## 5. 권장 아키텍처

### 5.1 공개 페이지 초기 렌더링

```text
Server Component
  -> 서버 전용 Repository/Fetcher
  -> visionflow-server
  -> 초기 HTML에 데이터 포함
```

적합한 대상:

- Work 목록과 상세
- 공지 목록과 상세
- FAQ
- 검색엔진에 노출되어야 하는 서비스 콘텐츠

### 5.2 브라우저 상호작용

```text
Client Component
  -> Next.js BFF
  -> visionflow-server
```

적합한 대상:

- 필터 변경 후 재조회
- 페이지네이션
- Q&A 비밀번호 확인
- 문의 등록
- 파일 업로드
- 사용자 입력에 따른 AI 검색

### 5.3 관리자 기능

```text
Client Component
  -> Next.js 관리자 BFF
  -> NextAuth 인증 및 권한 검사
  -> Spring용 단기 JWT
  -> visionflow-server
```

관리자 쓰기 요청은 현재 BFF 구조를 유지하는 것이 적절하다.

### 5.4 TanStack Query hydration 선택지

공개 페이지에 SSR과 TanStack Query를 함께 사용해야 한다면 다음 두 방식이 있다.

#### 단순 initialData

Server Component가 데이터를 조회한 뒤 Client Component의 `initialData`로 전달한다. 구현이 비교적 단순하다.

#### QueryClient dehydrate/hydrate

서버에서 QueryClient를 생성하고 prefetch한 뒤 dehydrated state를 HydrationBoundary로 전달한다. 여러 쿼리를 함께 준비하거나 기존 Query key 정책을 그대로 활용할 때 적합하다.

단순 목록 페이지라면 initialData부터 적용하는 편이 유지보수에 유리하다.

## 6. 현재 BFF의 개선 사항

### 6.1 Work DTO 계약 통일

Spring `WorkResponse`는 camelCase를 사용한다.

```ts
{
  createdAt: string;
  isImportant: boolean;
  linkLabel: string | null;
  linkUrl: string | null;
}
```

기존 UI의 `WorkRow`는 일부 snake_case를 사용한다.

```ts
{
  created_at: string;
  is_important?: boolean;
  link_label?: string | null;
  link_url?: string | null;
}
```

`apps/app/api/works/route.ts`는 현재 Spring 응답을 변환하지 않고 반환한다. 이 상태에서 DB 데이터를 넣으면 연도, 링크, 중요 프로젝트 판별이 정상적으로 동작하지 않을 수 있다.

권장 방식은 프런트 타입을 Spring의 camelCase 계약으로 통일하는 것이다. 마이그레이션 기간에는 `springWorkToWorkRow()` 같은 변환 함수를 BFF와 서버 데이터 함수에서 공통 사용한다.

### 6.2 인증 게이트 중복 제거

다수의 Route Handler가 다음 코드를 반복한다.

- `requireManager`
- `requireSuperAdmin`
- `jsonError`
- 요청 body 파싱
- Spring 응답 오류 전달
- `backendAuthHeaders()` 호출

다음과 같은 공통 모듈로 분리할 수 있다.

```text
apps/src/lib/api/
  authorization.ts
  backend-request.ts
  errors.ts
  response-mappers.ts
```

단, 지나치게 일반화된 만능 프록시보다 인증·오류·변환처럼 반복되는 책임만 추출하는 것이 좋다.

### 6.3 URL 용어 통일

클라이언트에서는 `quote-requests`, Spring에서는 `quote-inquiries`를 사용한다. 기능상 동작하지만 검색과 유지보수 시 혼동을 만든다.

다음 용어 중 하나로 통일하는 것을 권장한다.

- `quote-inquiries`
- `quote-requests`

Spring 도메인명이 이미 `QuoteInquiry`이므로 클라이언트도 `quote-inquiries`로 맞추는 편이 변경 범위가 작다.

### 6.4 공개·관리 API 분리

일부 Route Handler는 공개 POST와 관리자 GET/PATCH를 같은 경로에 둔다.

```text
/api/partnership-inquiries
/api/quick-inquiries
```

관리자 기능을 다음처럼 분리하면 책임이 명확해진다.

```text
/api/partnership-inquiries
/api/admin/partnership-inquiries

/api/quick-inquiries
/api/admin/quick-inquiries
```

### 6.5 서버 전용 Fetcher 공유

SSR을 적용하면 Route Handler와 Server Component가 각각 Spring 호출 코드를 작성할 가능성이 있다. 이를 방지하기 위해 다음 계층을 권장한다.

```text
apps/src/server/
  works.ts
  notices.ts
  faq.ts
  backend-client.ts
```

예시 책임:

- Spring URL 생성
- 응답 상태 검사
- DTO 변환
- Next.js 캐시 옵션
- 서버 로그 및 관측

Route Handler와 Server Component가 이 서버 전용 함수를 함께 사용하면 HTTP self-call 없이 계약을 재사용할 수 있다.

## 7. 삭제 여부 판단

### 유지해야 하는 코드

- 관리자 Route Handler 전체
- NextAuth Route Handler
- 초대 완료 Route Handler
- AI 검색 Route Handler
- 파일 업로드 및 다운로드 중계
- 브라우저에서 사용하는 공개 mutation API

### SSR 적용 후에도 유지할 가능성이 높은 코드

- 공개 목록의 클라이언트 재조회 API
- 필터 및 페이지네이션 API
- Q&A 검증 및 등록 API
- 문의 등록 API

### SSR 전환 후 선택적으로 줄일 수 있는 코드

공개 페이지가 항상 Server Component에서 Spring을 직접 조회하고 브라우저 재조회가 전혀 없다면 해당 공개 GET Route Handler는 제거할 수 있다.

후보 예시:

- `GET /api/faq`
- `GET /api/notices`
- `GET /api/works`

하지만 현재 프런트 훅이 이 경로를 실제 사용하고 있으므로 먼저 호출 구조를 변경하고 테스트한 뒤 제거해야 한다. 지금 바로 삭제할 수 있는 API는 아니다.

## 8. 단계별 개선 계획

### 1단계: 계약 안정화

- Work DTO camelCase/snake_case 통일
- 공통 Spring 응답 변환 함수 추가
- 공개 및 관리자 Work API 테스트 추가

### 2단계: BFF 공통화

- 관리자 권한 검사 공통 모듈화
- Spring 오류 응답 처리 공통화
- URL 도메인 명칭 통일

### 3단계: 공개 페이지 SSR

- Work 목록·상세를 Server Component 조회로 전환
- 공지·FAQ의 SEO 필요성에 따라 순차 전환
- 필요한 페이지에 initialData 또는 hydration 적용

### 4단계: 불필요해진 GET Route 정리

- `rg`와 테스트로 브라우저 호출 여부 확인
- 사용되지 않는 공개 GET Route만 삭제
- 관리자·mutation·AI·인증 Route는 유지

## 9. 최종 정리

VisionFlow의 `apps/app/api`는 SSR을 위한 임시 선행 코드가 아니라 다음 세 시스템을 연결하는 정식 애플리케이션 계층이다.

```text
브라우저 UI
  <-> Next.js BFF / NextAuth / AI orchestration
  <-> Spring Boot domain API
  <-> PostgreSQL
```

SSR을 도입할 때는 공개 페이지의 초기 조회만 Server Component와 서버 전용 Fetcher로 옮기는 것이 좋다. 인증, 쓰기 작업, AI 호출, 파일 처리에는 BFF가 계속 필요하다.

따라서 현재 방향은 BFF 폴더 전체를 제거하는 것이 아니라, **DTO 계약을 통일하고 반복 코드를 공통화한 뒤 공개 조회에 선택적으로 SSR을 적용하는 것**이다.
