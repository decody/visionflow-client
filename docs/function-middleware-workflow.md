# Function & Middleware Workflow

## 목적

이 문서는 현재 프로젝트를 기준으로 개발에 필요한 공통 함수와 미들웨어가 어떤 원리로 동작하고, 어디에 쓰이며, 어떤 상황에서 어떤 방식으로 작성하면 좋은지 정리한다.

`docs/file-attachment-workflow.md`와 같은 방식으로 실제 프로젝트 흐름을 기준으로 설명한다. 특히 `limit`, `apiClient`, `jsonError`, `auth`, `canManageContent`, `proxy`, normalize 함수, mapper 함수, 검증 함수 같은 실무에서 자주 만나는 도구들을 함께 다룬다.

핵심 문장:

```txt
함수는 반복되는 일을 이름 붙여 재사용하는 단위다.
미들웨어는 요청이 목적지에 도착하기 전에 공통 처리를 끼워 넣는 통로다.
limit은 한 번에 가져오거나 처리할 양을 제한하는 안전장치다.
API route는 서버 로직의 입구이고,
공통 함수와 미들웨어는 그 입구를 일관되게 지키는 장치다.
```

## 전체 그림

현재 프로젝트에서 브라우저 요청은 보통 아래 흐름 중 하나를 탄다.

```txt
화면
-> custom hook
-> apiClient 또는 fetch
-> Supabase REST 또는 Next.js API route
-> 공통 함수로 URL/header/body/error 처리
-> auth/role/validation 확인
-> DB/Storage/외부 API 호출
-> 응답 변환
-> 화면 렌더링
```

관리자 페이지 접근처럼 페이지 자체를 보호해야 할 때는 `proxy.ts`가 먼저 동작한다.

```txt
브라우저가 /settings 접근
-> apps/proxy.ts 실행
-> 공개 경로인지 확인
-> 로그인 세션이 있는지 확인
-> 통과하면 NextResponse.next()
-> 없으면 로그인 페이지로 redirect
```

조금 더 단순하게 기억하면 된다.

```txt
함수 = 특정 일을 반복하지 않기 위한 재사용 단위
미들웨어 = 요청/응답 사이에 끼어드는 공통 처리
limit = 양을 제한해 성능, 비용, 보안을 지키는 장치
validation = 외부 입력을 믿지 않기 위한 검증
mapper/normalizer = DB와 화면의 데이터 모양을 맞추는 변환
```

## 현재 프로젝트의 주요 함수와 미들웨어

관련 파일:

```txt
packages/shared/src/utils/api.ts
apps/proxy.ts
apps/app/api/admin/notices/route.ts
apps/app/api/search/route.ts
apps/src/lib/admin-permissions.ts
apps/src/lib/supabase-admin.ts
apps/auth.ts
```

역할별로 보면 아래와 같다.

```txt
apiClient
= 브라우저에서 Supabase REST를 일관된 방식으로 호출하는 공통 클라이언트

createUrl
= table/id/query를 Supabase REST URL로 바꾸는 함수

createHeaders
= apikey, Authorization, Content-Type, Prefer header를 만드는 함수

request
= fetch 실행, 성공 여부 확인, body parsing, key 변환을 묶은 함수

assertSuccess
= fetch가 실패 응답을 받아도 자동 throw하지 않으므로 직접 에러로 바꾸는 함수

mapObjectKeys
= snake_case와 camelCase를 서로 바꾸는 재귀 변환 함수

jsonError
= API route에서 에러 응답 형식을 통일하는 함수

canManageContent / canManageUsers
= session.user.role을 기준으로 기능 권한을 판단하는 함수

proxy
= /settings 접근 전에 로그인 여부를 검사하는 Next.js 미들웨어 성격의 함수

limit
= 조회 결과 개수 또는 처리량을 제한하는 함수/메서드
```

## 함수란 무엇인가

함수는 입력을 받아 처리하고 결과를 돌려주는 코드 단위다.

```ts
function normalizeNoticeCategory(category?: string | null) {
  const trimmedCategory = category?.trim();

  if (!trimmedCategory) {
    return '공지';
  }

  return noticeCategoryMap[trimmedCategory] ?? trimmedCategory;
}
```

이 함수의 목적은 명확하다.

```txt
입력: 사용자가 보낸 category
처리: 빈 값이면 기본값으로 바꾸고, 영문 category면 한글 category로 변환
출력: DB에 저장할 최종 category
```

좋은 함수의 특징:

```txt
이름만 보고 역할을 예상할 수 있다.
한 가지 일을 한다.
입력과 출력이 명확하다.
외부 상태를 가능한 적게 건드린다.
실패할 수 있는 경우를 처리한다.
여러 곳에서 반복될 일을 줄인다.
```

좋지 않은 함수의 특징:

```txt
이름이 모호하다.
검증, DB 저장, 메일 발송, 응답 생성이 한 함수에 모두 섞여 있다.
입력 타입이 불분명하다.
실패했을 때 어떤 일이 벌어지는지 알기 어렵다.
비슷한 로직이 여러 파일에 복사되어 있다.
```

## limit이란 무엇인가

`limit`은 한 번에 가져오거나 처리하는 개수를 제한하는 장치다.

현재 프로젝트에서는 주로 Supabase query에서 사용한다.

```ts
const { data } = await supabase
  .from('faq')
  .select('id, question, answer')
  .or(`question.ilike.${pattern},answer.ilike.${pattern}`)
  .eq('is_visible', true)
  .limit(5);
```

의미:

```txt
faq 테이블에서 검색 결과를 가져오되 최대 5개만 가져온다.
```

다른 예:

```ts
url.searchParams.set('id', `eq.${id}`);
url.searchParams.set('limit', '1');
```

의미:

```txt
id로 단일 row를 조회할 때 결과가 1개만 나오도록 제한한다.
```

`limit`을 쓰는 이유:

```txt
너무 많은 데이터를 한 번에 가져오지 않기 위해
화면 렌더링이 느려지는 것을 막기 위해
DB 비용과 네트워크 비용을 줄이기 위해
검색/AI context에 들어갈 데이터 양을 제어하기 위해
실수로 전체 테이블을 읽는 일을 막기 위해
```

## limit을 쓰는 상황

### 목록 조회

게시글, 문의, FAQ처럼 목록을 보여줄 때는 page와 pageSize 또는 limit을 둔다.

```txt
GET /api/notices?page=1&pageSize=10
```

Supabase REST에서는 보통 `limit`, `range`, `order`를 함께 쓴다.

```ts
supabase
  .from('notices')
  .select('*')
  .eq('is_published', true)
  .order('date', { ascending: false })
  .limit(10);
```

### 상세 조회

id로 하나만 가져오는 경우에도 `limit(1)` 또는 `.single()`을 사용한다.

```ts
supabase
  .from('notices')
  .select('*')
  .eq('id', id)
  .single();
```

현재 `apiClient`는 `table/id` 형태를 받으면 URL에 `limit=1`을 자동으로 붙인다.

```txt
apiClient.get('notices/123')
-> /rest/v1/notices?select=*&id=eq.123&limit=1
```

### 검색

검색은 관련 결과가 많아질 수 있으므로 특히 limit이 중요하다.

현재 검색 API는 source별로 limit을 다르게 둔다.

```txt
FAQ      최대 5개
Notice   최대 3개
QNA      최대 5개
Work     최대 5개
Contact  최대 5개
```

검색 API에서 limit을 두는 이유:

```txt
AI prompt가 너무 커지는 것을 막는다.
응답 속도를 안정적으로 유지한다.
검색 결과가 화면을 과하게 밀어내지 않게 한다.
관련도가 낮은 데이터가 너무 많이 섞이는 것을 줄인다.
```

### 외부 API 호출

AI, 메일, 결제 같은 외부 API를 부를 때도 limit 개념이 필요하다.

```txt
maxOutputTokens = AI 응답 길이 제한
temperature = 생성 다양성 제한
timeout = 요청 시간 제한
retry count = 재시도 횟수 제한
rate limit = 일정 시간 요청 수 제한
```

현재 검색 API에는 AI 응답 길이 제한이 있다.

```ts
generationConfig: {
  maxOutputTokens: 1024,
  temperature: 0.2,
}
```

OpenAI 호출도 비슷하다.

```ts
{
  model: openaiModel,
  messages: [{ role: 'user', content: prompt }],
  max_tokens: 1024,
  temperature: 0.2,
}
```

## limit과 pagination 차이

`limit`은 개수 제한이고, `pagination`은 페이지 단위 조회다.

```txt
limit 10
= 최대 10개만 가져온다.

page 2, pageSize 10
= 11번째부터 20번째까지 가져온다.
```

실무에서는 보통 함께 쓴다.

```txt
page = 1
pageSize = 20
offset = (page - 1) * pageSize
limit = pageSize
```

Supabase에서는 `range`를 많이 쓴다.

```ts
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;

supabase
  .from('partnership_inquiries')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(from, to);
```

목록 API를 만들 때는 아래를 함께 정한다.

```txt
기본 pageSize
최대 pageSize
정렬 기준
총 개수 반환 여부
검색어/filter 조건
```

## rate limit과 query limit

둘 다 limit이지만 목적이 다르다.

```txt
query limit
= DB에서 가져오는 row 수 제한

rate limit
= 일정 시간 동안 허용하는 요청 수 제한
```

예를 들어 검색 API가 있다면 둘 다 필요할 수 있다.

```txt
query limit
-> 검색 결과를 최대 5개씩 가져온다.

rate limit
-> 같은 IP가 1분에 검색 API를 30번 넘게 호출하지 못하게 한다.
```

현재 프로젝트 코드에는 명시적인 rate limit 미들웨어가 보이지 않는다. 공개 문의, 검색, 로그인 시도, 파일 업로드 같은 API에는 추후 rate limit을 추가하는 것이 좋다.

rate limit이 필요한 상황:

```txt
로그인 실패가 반복되는 경우
공개 문의 API가 스팸 대상이 되는 경우
검색 API가 AI 비용을 발생시키는 경우
파일 업로드 API가 큰 트래픽을 받는 경우
메일 발송 API가 반복 호출될 수 있는 경우
```

## middleware란 무엇인가

미들웨어는 요청이 실제 페이지나 API handler에 도착하기 전에 실행되는 공통 처리다.

현재 프로젝트의 대표 예시는 `apps/proxy.ts`다.

```ts
export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPublicPath || request.auth) {
    return NextResponse.next();
  }

  const loginUrl = new URL(ROUTES.ADMIN.LOGIN, request.nextUrl.origin);
  loginUrl.searchParams.set(
    'callbackUrl',
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(loginUrl);
});
```

동작 흐름:

```txt
1. /settings 또는 /settings 하위 경로 요청이 들어온다.
2. 공개 경로인지 확인한다.
3. 공개 경로라면 통과시킨다.
4. 공개 경로가 아니어도 로그인 세션이 있으면 통과시킨다.
5. 로그인 세션이 없으면 로그인 페이지로 보낸다.
6. 원래 가려던 URL은 callbackUrl에 보관한다.
```

적용 범위는 `matcher`가 정한다.

```ts
export const config = {
  matcher: ['/settings', '/settings/:path*'],
};
```

즉, 이 proxy는 모든 페이지에 적용되는 것이 아니라 관리자 설정 페이지에만 적용된다.

## 미들웨어가 필요한 상황

미들웨어는 "모든 요청 또는 특정 경로 요청에 반복해서 필요한 처리"에 적합하다.

```txt
로그인 여부 확인
관리자 페이지 접근 제어
locale 감지
redirect 처리
공통 header 추가
간단한 bot 차단
rate limit
maintenance mode
```

하지만 모든 로직을 미들웨어에 넣으면 안 된다.

미들웨어에 넣기 좋은 것:

```txt
가볍고 빠른 판단
DB 접근 없이 할 수 있는 redirect
경로 기준 접근 제어
쿠키/session 기반의 간단한 확인
```

API route에 넣기 좋은 것:

```txt
DB 조회가 필요한 권한 확인
role별 세부 기능 권한 확인
입력값 검증
파일 업로드
메일 발송
외부 API 호출
감사 로그 기록
```

현재 프로젝트도 이 구조에 가깝다.

```txt
proxy.ts
-> /settings 접근 전 로그인 여부 확인

API route
-> auth(), canManageContent(), supabaseAdmin으로 실제 권한과 작업 처리
```

## API route 안의 공통 함수 패턴

관리자 공지 생성 API를 보면 실무 API route의 기본 패턴이 들어 있다.

```txt
1. session 확인
2. role 확인
3. body parsing
4. 필수값 검증
5. payload 정규화
6. DB insert
7. DB row를 화면 타입으로 변환
8. 성공 응답
9. 실패 응답
```

코드 흐름:

```ts
const session = await auth();

if (!session) {
  return jsonError('Unauthorized', 401);
}

if (!canManageContent(session.user?.role)) {
  return jsonError('Forbidden', 403);
}

const payload = (await request.json()) as ICreateNoticeRequest;
const title = payload.title?.trim();

if (!title) {
  return jsonError('title is required.', 400);
}
```

이 구조에서 중요한 함수들:

```txt
auth()
= 현재 요청의 로그인 세션 확인

canManageContent()
= role이 콘텐츠 관리 권한을 갖는지 확인

jsonError()
= 실패 응답 형식 통일

normalizeNoticeCategory()
= 입력값을 DB에 저장하기 좋은 값으로 정규화

toNotice()
= DB row를 프론트엔드 타입으로 변환
```

## jsonError 함수

API마다 에러 응답 모양이 제각각이면 프론트엔드 처리가 어려워진다.

그래서 API route 안에서 아래 같은 작은 helper를 둔다.

```ts
const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });
```

사용 예:

```ts
if (!session) {
  return jsonError('Unauthorized', 401);
}

if (!canManageContent(session.user?.role)) {
  return jsonError('Forbidden', 403);
}
```

좋은 점:

```txt
에러 응답 형식이 통일된다.
status code를 명확하게 줄 수 있다.
프론트엔드 mutation에서 data.message를 쉽게 읽을 수 있다.
API route 코드가 짧아진다.
```

상황별 status code:

```txt
400 Bad Request
= 요청 body, query, path parameter가 잘못됨

401 Unauthorized
= 로그인 필요

403 Forbidden
= 로그인은 했지만 권한 없음

404 Not Found
= 대상 데이터 없음

409 Conflict
= 중복 또는 상태 충돌

500 Internal Server Error
= 서버 내부 오류

502 Bad Gateway
= 외부 API, DB, 메일 서비스 호출 실패 성격
```

## 권한 함수

현재 프로젝트의 권한 판단은 `apps/src/lib/admin-permissions.ts`에 모여 있다.

```ts
export function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== 'string') {
    return null;
  }

  const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]/g, '');

  if (normalizedRole === 'superadmin') {
    return 'SuperAdmin';
  }

  if (normalizedRole === 'admin') {
    return 'admin';
  }

  if (normalizedRole === 'viewer' || normalizedRole === 'user') {
    return 'Viewer';
  }

  return null;
}
```

이 함수가 필요한 이유:

```txt
DB, 외부 입력, 세션에 들어온 role 표기가 조금씩 다를 수 있다.
SuperAdmin, super_admin, super admin 같은 값을 같은 의미로 볼 수 있다.
권한 비교 전에 표준 형태로 맞추면 실수를 줄일 수 있다.
```

그 위에 기능별 권한 함수가 있다.

```ts
export function canManageContent(role: unknown) {
  return hasAllowedRole(role, CONTENT_MANAGER_ROLES);
}

export function canManageUsers(role: unknown) {
  return hasAllowedRole(role, USER_MANAGER_ROLES);
}
```

실무에서는 role 이름을 직접 비교하기보다 이런 함수로 감싸는 편이 좋다.

좋은 방식:

```ts
if (!canManageContent(session.user?.role)) {
  return jsonError('Forbidden', 403);
}
```

피하고 싶은 방식:

```ts
if (session.user?.role !== 'admin' && session.user?.role !== 'SuperAdmin') {
  return jsonError('Forbidden', 403);
}
```

이유:

```txt
권한 기준이 여러 파일에 흩어진다.
role이 추가될 때 모든 파일을 찾아 수정해야 한다.
대소문자나 표기 차이로 버그가 생길 수 있다.
```

## mapper와 normalizer

DB는 보통 snake_case를 쓰고, TypeScript/React는 camelCase를 많이 쓴다.

현재 프로젝트의 `apiClient`는 이 차이를 공통 함수로 처리한다.

```ts
const toCamelCase = (key: string) =>
  key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const toSnakeCase = (key: string) =>
  key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
```

재귀적으로 객체 key를 바꾸는 함수:

```ts
const mapObjectKeys = (
  value: unknown,
  mapKey: (key: string) => string,
): unknown => {
  if (Array.isArray(value))
    return value.map((item) => mapObjectKeys(item, mapKey));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      mapKey(key),
      mapObjectKeys(item, mapKey),
    ]),
  );
};
```

이 함수 덕분에 화면에서는 camelCase로 쓰고, DB에는 snake_case로 보낼 수 있다.

```txt
화면 payload
{ isImportant: true, contentHtml: '<p>...</p>' }

DB payload
{ is_important: true, content_html: '<p>...</p>' }
```

API route에서는 명시적인 mapper를 쓰기도 한다.

```ts
const toNotice = (row: NoticeRow): INotice => ({
  contentHtml: row.content_html,
  contentJson: row.content_json,
  createdAt: row.created_at,
  isImportant: row.is_important,
  isPublished: row.is_published,
  updatedAt: row.updated_at,
});
```

둘의 차이:

```txt
공통 key 변환
= 단순히 snake_case/camelCase를 바꾼다.

명시적 mapper
= 필드 누락, 기본값, 타입 변환, 공개할 필드 제한까지 함께 처리한다.
```

민감한 데이터나 복잡한 응답에는 명시적 mapper가 더 안전하다.

## apiClient의 원리

`packages/shared/src/utils/api.ts`의 `apiClient`는 Supabase REST 호출을 감싸는 공통 함수 모음이다.

사용자는 이렇게 쓴다.

```ts
apiClient.get('works');
apiClient.get('works/123');
apiClient.post('works', payload);
apiClient.patch('works/123', payload);
apiClient.delete('works/123');
apiClient.rpc('function_name', payload);
apiClient.invoke('edge-function-name', payload);
```

내부에서는 아래 일을 대신한다.

```txt
Supabase REST URL 생성
query string 생성
id가 있으면 eq.id와 limit=1 추가
header 생성
payload를 snake_case로 변환
fetch 실행
HTTP 실패 응답을 Error로 변환
response body parsing
response data를 camelCase로 변환
content-range에서 count 추출
```

흐름:

```txt
apiClient.get('works/123')
-> createUrl('works/123')
-> /rest/v1/works?select=*&id=eq.123&limit=1
-> createHeaders()
-> fetch()
-> assertSuccess()
-> parseBody()
-> mapObjectKeys(data, toCamelCase)
-> { data, count }
```

이런 공통 client를 만드는 이유:

```txt
fetch 코드 중복을 줄인다.
header 설정 실수를 줄인다.
snake_case/camelCase 변환을 한 곳에서 처리한다.
에러 처리 방식을 통일한다.
Supabase REST 사용 방식을 프로젝트 규칙으로 고정한다.
```

## fetch와 assertSuccess

중요한 특징이 있다.

```txt
fetch는 400, 500 응답을 받아도 자동으로 throw하지 않는다.
네트워크 실패가 아니라면 response를 정상 반환한다.
```

그래서 아래 같은 처리가 필요하다.

```ts
const assertSuccess = async (response: Response) => {
  if (response.ok) return;

  const error = await parseBody(response);

  if (error && typeof error === 'object') {
    const { details, message } = error as {
      details?: string;
      message?: string;
    };
    throw new Error(message ?? details ?? response.statusText);
  }

  throw new Error(
    typeof error === 'string' ? error : response.statusText,
  );
};
```

React Query mutation에서 에러 상태를 제대로 쓰려면 실패 응답을 throw해야 한다.

```ts
if (!response.ok) {
  throw new Error(data.message ?? '요청 실패');
}
```

이 처리를 빼먹으면 400/500이어도 성공처럼 처리되는 버그가 생긴다.

## validation 함수

외부 입력은 항상 검증해야 한다.

현재 API route에는 직접 검증 패턴이 많이 보인다.

```ts
const payload = (await request.json()) as ICreateNoticeRequest;
const title = payload.title?.trim();
const description = payload.description?.trim();
const contentHtml = payload.contentHtml?.trim();

if (!title || !description || !contentHtml) {
  return jsonError(
    'title, description, and contentHtml are required.',
    400,
  );
}
```

검증해야 하는 것:

```txt
필수값 존재 여부
문자열 trim 후 빈 값 여부
최대 길이
email/url 형식
enum 값 여부
숫자 범위
파일 크기
MIME type
권한상 보낼 수 없는 필드 여부
```

반복이 많아지면 Zod 같은 schema validation을 쓰는 것이 좋다.

```ts
import { z } from 'zod';

const createNoticeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300),
  contentHtml: z.string().trim().min(1),
  isImportant: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

const result = createNoticeSchema.safeParse(await request.json());

if (!result.success) {
  return jsonError('Invalid request body.', 400, result.error.flatten());
}

const payload = result.data;
```

schema를 쓰면 좋은 상황:

```txt
필드가 많다.
여러 API에서 같은 입력 구조를 쓴다.
프론트엔드 form 검증과 서버 검증을 맞추고 싶다.
OpenAPI 문서 생성을 고려한다.
에러 메시지를 일관되게 만들고 싶다.
```

간단한 API라면 직접 검증도 괜찮다.

## helper 함수 작성 순서

새 API를 만들 때 추천 순서:

```txt
1. API가 해야 할 일을 한 문장으로 적는다.
2. 입력 body/query/path parameter를 정한다.
3. 출력 response 타입을 정한다.
4. 권한이 필요한지 판단한다.
5. 검증 함수를 만든다.
6. DB row와 response 타입을 변환하는 mapper를 만든다.
7. 공통 에러 함수로 실패 응답을 통일한다.
8. 성공/실패 흐름을 작성한다.
9. hook 또는 화면에서 호출한다.
```

예시:

```txt
관리자 FAQ 생성 API
-> auth() 필요
-> canManageContent() 필요
-> question, answer 필수
-> category optional
-> supabaseAdmin.from('faq').insert(...)
-> toFaq(row)로 응답 변환
-> 201 Created 반환
```

## 언제 공통 함수로 빼야 하나

공통 함수로 빼면 좋은 경우:

```txt
같은 코드가 2~3곳 이상 반복된다.
보안상 같은 규칙을 강제해야 한다.
에러 응답 형식을 통일해야 한다.
DB row 변환 규칙이 반복된다.
테스트하고 싶은 순수 로직이다.
이름을 붙이면 코드 의도가 더 분명해진다.
```

그냥 API 안에 둬도 되는 경우:

```txt
해당 API에서만 쓰는 작은 변환이다.
비즈니스 맥락이 그 파일 안에 있는 편이 더 이해하기 쉽다.
공통화하면 오히려 인자가 복잡해진다.
아직 규칙이 안정되지 않았다.
```

무조건 공통화가 좋은 것은 아니다. 현재 프로젝트도 `jsonError`처럼 API 파일 안에 반복 정의된 함수가 있다. 이 함수는 나중에 응답 규칙을 완전히 통일하고 싶을 때 `apps/src/lib/api-response.ts` 같은 파일로 모을 수 있다.

## 언제 미들웨어로 빼야 하나

미들웨어로 빼면 좋은 경우:

```txt
여러 페이지/경로에 같은 접근 제어가 필요하다.
요청이 페이지에 도착하기 전에 redirect해야 한다.
경로 기준으로 공개/비공개를 나눌 수 있다.
처리가 가볍다.
```

API route에 남겨야 하는 경우:

```txt
DB 조회가 필요하다.
파일이나 body를 읽어야 한다.
role별 세부 권한을 판단해야 한다.
작업별로 다른 에러 응답을 줘야 한다.
외부 API 호출이 필요하다.
```

현재 프로젝트 기준:

```txt
/settings 접근 여부
-> proxy.ts

공지 생성 권한
-> apps/app/api/admin/notices/route.ts 안에서 auth() + canManageContent()

사용자 초대 권한
-> API route 안에서 auth() + canManageUsers()

파일 다운로드 권한
-> 다운로드 API 안에서 auth() + DB row 확인
```

## 실무 워크플로우 예시 1: 검색 API

검색 API는 여러 종류의 함수가 함께 쓰이는 좋은 예시다.

```txt
SearchPage
-> POST /api/search
-> request.json()
-> query 검증
-> provider normalize
-> buildIlikePattern
-> Supabase 조회 with limit
-> local search index 조회 with slice
-> sources 조립
-> buildPrompt
-> generateAnswer
-> 실패 시 fallback answer
-> SearchResponse 반환
```

주요 함수:

```txt
normalizeProvider
= gemini/openai만 허용

jsonError
= query 누락 시 400 응답

buildIlikePattern
= Supabase ilike 검색 패턴 생성

stripHtml
= notice content_html에서 HTML 제거

findWorkSources / findContactSources
= local index에서 검색 후 slice로 개수 제한

generateWithGemini / generateWithOpenAI
= 외부 AI API 호출

buildFallbackAnswer
= AI 호출 실패 시 기본 응답 생성
```

이 API에서 limit이 중요한 이유:

```txt
DB 결과를 적게 가져와 응답 시간을 줄인다.
AI prompt에 들어갈 context 크기를 제한한다.
검색 결과가 너무 넓어져 답변 품질이 떨어지는 일을 막는다.
외부 API 비용을 예측 가능하게 만든다.
```

## 실무 워크플로우 예시 2: 관리자 공지 생성

공지 생성은 권한 함수와 mapper가 중요한 예시다.

```txt
NoticeWritePage
-> useCreateNoticeMutation
-> fetch('/api/admin/notices')
-> auth()로 로그인 확인
-> canManageContent()로 role 확인
-> request.json()
-> title/description/contentHtml 검증
-> normalizeNoticeCategory
-> getSessionUserId
-> supabaseAdmin.from('notices').insert(...)
-> toNotice
-> 201 Created
```

여기서 API route를 쓰는 이유:

```txt
관리자 권한 확인이 필요하다.
service role key를 서버에서만 써야 한다.
created_by 같은 서버 기준 값을 보정해야 한다.
요청 body를 신뢰하지 않고 검증해야 한다.
DB row를 화면 타입으로 변환해야 한다.
```

## 실무 워크플로우 예시 3: 관리자 페이지 접근

관리자 페이지 접근은 미들웨어 성격의 `proxy`가 담당한다.

```txt
사용자 /settings 접근
-> apps/proxy.ts
-> PUBLIC_PREFIXES인지 확인
-> request.auth 존재 여부 확인
-> 로그인됨: 통과
-> 로그인 안 됨: /settings/login?callbackUrl=... redirect
```

이 처리는 페이지마다 반복하면 안 된다.

```txt
settings 하위 모든 페이지에 같은 로그인 보호가 필요하기 때문
```

하지만 role 세부 권한은 페이지와 API에서 다시 확인해야 한다.

```txt
proxy는 로그인 여부만 확인한다.
SuperAdmin/admin/Viewer 차이는 RoleGuard와 API route에서 판단한다.
```

## 실무 워크플로우 예시 4: 파일 첨부

파일 첨부는 `file-attachment-workflow.md`의 흐름과 연결된다.

```txt
화면
-> FormData 생성
-> API route
-> 파일 크기/MIME type 검증
-> storage path 생성
-> Storage upload
-> DB에는 storage path와 metadata 저장
```

여기서 필요한 함수:

```txt
파일 확장자 추출 함수
파일 크기 검증 함수
MIME type 검증 함수
storage path 생성 함수
Content-Disposition 생성 함수
권한 확인 함수
```

예시:

```ts
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function assertAllowedFile(file: File) {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('File is too large.');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type.');
  }
}
```

파일 API에서는 limit의 의미가 row 개수가 아니라 크기 제한이 된다.

```txt
최대 파일 크기
최대 첨부 개수
허용 확장자
허용 MIME type
다운로드 권한
```

## 체크리스트: 함수 작성

```txt
함수 이름만 보고 역할을 알 수 있는가?
입력과 출력 타입이 명확한가?
한 함수가 한 가지 책임만 갖는가?
실패할 수 있는 경우를 처리하는가?
외부 입력을 그대로 믿지 않는가?
반복되는 로직을 줄이는가?
공통화가 오히려 복잡도를 늘리지는 않는가?
테스트하기 쉬운 순수 함수로 만들 수 있는가?
```

## 체크리스트: API route 작성

```txt
HTTP method가 작업과 맞는가?
로그인이 필요한 API인가?
role 확인이 필요한 API인가?
service role key를 쓰기 전에 권한을 확인하는가?
request body/query/path parameter를 검증하는가?
필수값 누락 시 400을 반환하는가?
미로그인 시 401을 반환하는가?
권한 부족 시 403을 반환하는가?
DB row를 그대로 노출하지 않고 response 타입으로 변환하는가?
fetch 실패가 프론트엔드에서 error로 잡히도록 응답하는가?
```

## 체크리스트: limit 설계

```txt
목록 API에 기본 limit/pageSize가 있는가?
사용자가 pageSize를 조작해 너무 큰 값을 요청하지 못하게 막는가?
검색 결과는 source별 최대 개수를 제한하는가?
상세 조회에는 limit=1 또는 single()을 쓰는가?
파일 업로드에는 최대 파일 크기 제한이 있는가?
외부 API 호출에는 token/time/retry 제한이 있는가?
공개 API에는 rate limit을 고려했는가?
```

## 체크리스트: 미들웨어 작성

```txt
정말 모든 요청 또는 특정 경로 전체에 필요한 처리인가?
matcher 범위가 너무 넓지 않은가?
DB 조회 없이 빠르게 판단할 수 있는가?
redirect 대상이 명확한가?
공개 경로 예외가 필요한가?
API route에서 다시 권한 확인을 하는가?
미들웨어에서 body를 읽으려 하지 않는가?
```

## Java/Spring과 비교

Java/Spring에서는 Next.js의 API route와 middleware에 해당하는 구조가 더 명확하게 나뉘어 있다.

전형적인 Spring 흐름:

```txt
브라우저
-> Spring Security Filter Chain
-> Controller
-> Service
-> Repository
-> DB
```

Next.js 현재 프로젝트 흐름:

```txt
브라우저
-> proxy.ts
-> API route
-> auth()/권한 함수
-> supabaseAdmin 또는 Supabase REST
-> DB/Storage
```

비교:

| 구분 | 현재 프로젝트 Next.js/Supabase | Java/Spring |
| --- | --- | --- |
| 페이지 보호 | `apps/proxy.ts` | Spring Security Filter |
| API handler | `route.ts`의 GET/POST/PATCH 함수 | `@RestController` |
| 로그인 확인 | `auth()` | `SecurityContext`, `Principal` |
| 권한 확인 | `canManageContent`, `RoleGuard` | `@PreAuthorize`, `hasRole` |
| 입력 검증 | 직접 검증 또는 Zod | Bean Validation, `@Valid` |
| DB 접근 | Supabase client, Supabase REST | JPA, MyBatis, JDBC |
| row 권한 | Supabase RLS 또는 API route | Service query 조건 또는 DB 권한 |
| 공통 응답 | `jsonError` helper | `@ControllerAdvice`, exception handler |
| 미들웨어 | `proxy.ts`, API helper | Filter, Interceptor, AOP |
| 개수 제한 | `.limit()`, `.range()` | Pageable, `setMaxResults`, SQL limit |

## Java/Spring의 limit 예시

Spring Data JPA에서는 pagination을 보통 `Pageable`로 처리한다.

```java
@GetMapping("/notices")
public Page<NoticeDto> getNotices(Pageable pageable) {
    return noticeService.getNotices(pageable);
}
```

Service:

```java
public Page<NoticeDto> getNotices(Pageable pageable) {
    return noticeRepository.findByPublishedTrue(pageable)
        .map(NoticeDto::from);
}
```

SQL/JPA에서는 직접 limit을 줄 수도 있다.

```java
entityManager
    .createQuery("select n from Notice n order by n.createdAt desc", Notice.class)
    .setMaxResults(10)
    .getResultList();
```

현재 프로젝트의 Supabase 방식과 비교:

```ts
supabase
  .from('notices')
  .select('*')
  .eq('is_published', true)
  .order('created_at', { ascending: false })
  .limit(10);
```

핵심은 같다.

```txt
한 번에 가져올 데이터 수를 제한한다.
정렬 기준을 명확히 한다.
페이지가 필요하면 offset/range/pageable을 함께 쓴다.
```

## Java/Spring의 middleware 비교

Spring에서 미들웨어에 가까운 것은 Filter와 Interceptor다.

Filter:

```txt
서블릿 레벨에서 요청/응답을 감싼다.
인증, CORS, logging, encoding 같은 아주 앞단 처리를 한다.
```

Interceptor:

```txt
Controller 실행 전후에 끼어든다.
로그인 체크, 권한 체크, 공통 logging에 자주 쓴다.
```

Spring Security:

```java
http
  .authorizeHttpRequests(auth -> auth
      .requestMatchers("/admin/**").hasRole("ADMIN")
      .anyRequest().permitAll()
  );
```

현재 프로젝트의 `proxy.ts`와 비슷한 역할:

```ts
export const config = {
  matcher: ['/settings', '/settings/:path*'],
};
```

차이:

```txt
Spring Security는 서버 애플리케이션 전체의 보안 필터 체인으로 동작한다.
Next.js proxy는 지정한 matcher 경로에 대해 edge/proxy 단계에서 동작한다.
Spring은 Controller/Service 계층이 강하게 나뉜다.
Next.js API route는 route 파일 안에 controller 성격의 코드가 들어간다.
```

## Java/Spring의 공통 에러 처리 비교

Spring에서는 보통 `@ControllerAdvice`로 공통 에러 응답을 만든다.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied() {
        return ResponseEntity.status(403)
            .body(new ErrorResponse("Forbidden"));
    }
}
```

현재 프로젝트에서는 API route 안의 `jsonError` helper가 비슷한 역할을 한다.

```ts
return jsonError('Forbidden', 403);
```

차이:

```txt
Spring은 예외를 던지고 중앙 handler가 응답으로 바꾸는 패턴이 흔하다.
현재 프로젝트는 각 route에서 직접 NextResponse.json을 반환하는 패턴이 많다.
```

프로젝트 규모가 커지면 `jsonError`, `parseRequest`, `requireAdmin` 같은 helper를 공통화할 수 있다.

## Java/Spring의 validation 비교

Spring:

```java
public record CreateNoticeRequest(
    @NotBlank String title,
    @NotBlank String description,
    @NotBlank String contentHtml
) {}

@PostMapping("/admin/notices")
public NoticeDto create(@Valid @RequestBody CreateNoticeRequest request) {
    return noticeService.create(request);
}
```

Next.js/Zod:

```ts
const schema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  contentHtml: z.string().trim().min(1),
});

const result = schema.safeParse(await request.json());
```

비교:

```txt
Spring은 annotation 기반 검증이 강하다.
Next.js/TypeScript는 Zod 같은 schema 기반 검증을 많이 쓴다.
둘 다 목표는 같다.
외부 입력을 서버에서 다시 검증하는 것이다.
```

## 어떤 상황에 무엇을 쓸까

### 단순 목록 조회

```txt
추천:
apiClient.get 또는 Supabase REST
limit/pageSize 적용
React Query useQuery
```

예:

```txt
공지 목록
FAQ 목록
작업 포트폴리오 목록
```

### 관리자 생성/수정/삭제

```txt
추천:
Next.js API route
auth() 확인
canManageContent() 또는 canManageUsers() 확인
supabaseAdmin 사용
mutation hook 사용
```

예:

```txt
공지 생성
FAQ 수정
사용자 초대
문의 답변
```

### 공개 제출

```txt
추천:
Next.js API route
body/formData 검증
파일 크기 제한
rate limit 고려
DB에는 필요한 metadata만 저장
```

예:

```txt
제휴 문의
견적 문의
일반 문의
뉴스레터 구독
```

### 관리자 페이지 보호

```txt
추천:
proxy.ts에서 로그인 여부 확인
RoleGuard로 화면 권한 UX 처리
API route에서 최종 권한 확인
```

예:

```txt
/settings
/settings/users
/settings/notice
```

### 외부 API 호출

```txt
추천:
Next.js API route
서버 환경 변수 사용
timeout/retry/limit 고려
실패 시 fallback 응답 설계
```

예:

```txt
AI 검색
메일 발송
파일 변환
결제 API
```

## 앞으로 추가하면 좋은 공통 함수

현재 프로젝트가 커질수록 아래 helper를 고려할 수 있다.

```txt
requireSession()
= 로그인 없으면 401을 반환하거나 Error를 던지는 공통 함수

requireContentManager()
= auth() + canManageContent()를 묶은 함수

requireUserManager()
= auth() + canManageUsers()를 묶은 함수

parseJsonBody(schema)
= request.json() + Zod 검증을 묶은 함수

createJsonError()
= API 에러 응답 형식을 완전히 통일하는 함수

getPaginationParams()
= page/pageSize/maxPageSize 처리 함수

getRange()
= Supabase range from/to 계산 함수

assertAllowedFile()
= 파일 크기/MIME type 검증 함수

withRateLimit()
= 공개 API 요청 횟수 제한 함수 또는 미들웨어
```

예시:

```ts
async function requireContentManager() {
  const session = await auth();

  if (!session) {
    return { error: jsonError('Unauthorized', 401), session: null };
  }

  if (!canManageContent(session.user?.role)) {
    return { error: jsonError('Forbidden', 403), session: null };
  }

  return { error: null, session };
}
```

다만 공통화는 실제 반복이 충분히 생겼을 때 하는 것이 좋다.

## 최종 요약

```txt
함수는 반복되는 개발 규칙을 이름 붙여 재사용하는 단위다.
미들웨어는 요청이 목적지에 닿기 전에 공통 처리를 실행하는 통로다.
limit은 데이터 양, 요청 수, 파일 크기, AI 출력 길이를 제한하는 안전장치다.
apiClient는 Supabase REST 호출의 URL/header/body/error/key 변환을 통일한다.
jsonError는 API 실패 응답을 일관되게 만든다.
canManageContent 같은 권한 함수는 role 비교 규칙을 한 곳에 모은다.
mapper/normalizer는 DB와 화면의 데이터 모양을 맞춘다.
proxy.ts는 /settings 접근 전 로그인 여부를 확인한다.
API route는 auth, role, validation, DB 작업을 최종적으로 책임진다.
```

가장 중요하게 기억할 것:

```txt
브라우저 입력은 믿지 않는다.
API route에서 다시 검증한다.
관리자 작업은 서버에서 auth와 role을 확인한다.
목록/검색/외부 API에는 limit을 둔다.
공통 로직은 함수로 이름 붙인다.
여러 경로에 반복되는 접근 제어는 미들웨어로 뺀다.
Java/Spring과 원리는 같고, 배치 위치와 도구 이름만 다르다.
```
