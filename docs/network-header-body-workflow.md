# Network Header Body Workflow

## 목적

이 문서는 현재 VisionFlow 프로젝트를 기준으로 네트워크 요청이 어떻게 흐르는지, `header`와 `body`를 왜 쓰는지, 어떤 상황에서 어떤 방식으로 작성해야 하는지 정리한다.

파일 첨부 문서가 `FormData`와 다운로드 헤더를 중심으로 설명했다면, 이 문서는 일반적인 API 통신 전체를 다룬다.

핵심 문장:

```txt
URL은 어디로 보낼지,
method는 무엇을 할지,
header는 어떻게 해석할지,
body는 무엇을 보낼지,
status는 결과가 어땠는지 알려준다.
```

## 네트워크 요청의 기본 구조

브라우저와 서버는 HTTP 요청과 응답으로 대화한다.

```txt
브라우저/클라이언트
-> HTTP Request
-> Next.js API Route
-> DB, Storage, 외부 API
-> HTTP Response
-> 브라우저/클라이언트
```

HTTP 요청은 보통 아래 요소로 이루어진다.

```txt
method  = GET, POST, PATCH, DELETE 같은 동작
url     = 요청을 보낼 주소
header  = 요청을 해석하기 위한 메타데이터
body    = 서버에 실제로 보내는 데이터
```

HTTP 응답은 보통 아래 요소로 이루어진다.

```txt
status  = 200, 201, 400, 401, 500 같은 처리 결과
header  = 응답을 해석하기 위한 메타데이터
body    = 서버가 돌려주는 실제 데이터
```

현재 프로젝트에서 자주 보이는 형태:

```tsx
const response = await fetch('/api/quick-inquiries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name,
    email,
    subject,
    content,
  }),
});

if (!response.ok) {
  throw new Error('Failed to create quick inquiry.');
}

const data = await response.json();
```

## 현재 프로젝트의 큰 흐름

VisionFlow는 Next.js App Router 기반이므로 `apps/app/api/**/route.ts` 파일들이 서버 API 역할을 한다.

대표 흐름:

```txt
사용자 화면 또는 React Query 훅
-> fetch('/api/...')
-> apps/app/api/.../route.ts
-> request.json(), request.formData(), request.headers 사용
-> Supabase 또는 외부 API 처리
-> NextResponse.json() 또는 NextResponse 응답
-> 프론트에서 response.ok, response.json() 처리
```

예를 들어 빠른 문의 생성은 아래처럼 흐른다.

```txt
useCreateQuickMutation
-> POST /api/quick-inquiries
-> request.json()
-> Supabase insert
-> NextResponse.json(createdInquiry, { status: 201 })
-> React Query 캐시 업데이트
```

파일 첨부가 있는 제휴 문의는 조금 다르다.

```txt
ContactPartnershipPage
-> FormData 생성
-> POST /api/partnership-inquiries
-> request.formData()
-> 파일은 Supabase Storage 업로드
-> 파일 경로와 문의 내용은 DB 저장
-> NextResponse.json(inquiry, { status: 201 })
```

관리자 다운로드는 JSON 응답이 아니다.

```txt
PartnershipDetailPage
-> GET /api/partnership-inquiries/:id/attachment
-> 서버에서 auth 확인
-> Storage에서 파일 다운로드
-> Content-Disposition 헤더를 포함한 파일 응답
-> 브라우저가 파일 저장
```

## Method는 언제 쓰는가

HTTP method는 "서버에게 어떤 일을 해달라는지"를 표현한다.

### GET

데이터를 조회할 때 사용한다.

```tsx
const response = await fetch('/api/partnership-inquiries');
const data = await response.json();
```

특징:

```txt
body를 거의 보내지 않는다.
조회 조건은 query string으로 보낸다.
브라우저, CDN, 프록시가 캐싱할 수 있다.
서버 데이터를 변경하면 안 된다.
```

예:

```txt
GET /api/search?query=design
GET /api/admin/users
GET /api/partnership-inquiries
```

### POST

새 데이터를 만들거나, 서버에 처리 작업을 요청할 때 사용한다.

```tsx
await fetch('/api/quick-inquiries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

사용 상황:

```txt
문의 등록
회원 초대 메일 발송
AI 검색 답변 생성
답변 메일 전송
파일 업로드
```

### PATCH

기존 데이터의 일부만 수정할 때 사용한다.

```tsx
await fetch('/api/partnership-inquiries', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id,
    status,
    admin_memo,
  }),
});
```

사용 상황:

```txt
문의 상태 변경
관리자 메모 수정
공지사항 일부 필드 수정
FAQ 수정
```

### DELETE

데이터를 삭제할 때 사용한다.

```tsx
await fetch(`/api/admin/notices/${id}`, {
  method: 'DELETE',
});
```

사용 상황:

```txt
공지 삭제
FAQ 삭제
포트폴리오 삭제
첨부 파일 삭제
```

주의할 점:

```txt
DELETE도 권한 확인이 필요하다.
삭제 후 관련 파일, 캐시, 목록 갱신까지 고려해야 한다.
```

## Header의 역할

header는 요청 또는 응답의 "설명서"다.

body가 실제 내용이라면, header는 그 내용을 어떻게 읽어야 하는지 알려준다.

```txt
Content-Type     = body 형식
Authorization    = 인증 정보
Accept           = 받고 싶은 응답 형식
Prefer           = Supabase REST 처리 옵션
Content-Disposition = 파일을 열지 저장할지
Cache-Control    = 캐시 정책
```

## 요청 Header 작성법

### JSON을 보낼 때

JSON body를 보낼 때는 `Content-Type: application/json`을 넣는다.

```tsx
await fetch('/api/admin/users/invite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    emails,
    role,
    welcomeMessage,
  }),
});
```

서버에서는 이렇게 읽는다.

```ts
const payload = await request.json();
```

의미:

```txt
클라이언트: 이 body는 JSON 문자열입니다.
서버: request.json()으로 파싱하면 객체가 됩니다.
```

### FormData를 보낼 때

파일을 포함할 때는 `FormData`를 사용한다.

```tsx
const body = new FormData();
body.set('company_name', form.companyName);
body.set('attachment', selectedFile);

await fetch('/api/partnership-inquiries', {
  method: 'POST',
  body,
});
```

주의할 점:

```txt
FormData를 보낼 때 Content-Type을 직접 지정하지 않는다.
브라우저가 multipart/form-data와 boundary를 자동으로 만든다.
```

잘못된 예:

```tsx
await fetch('/api/partnership-inquiries', {
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  body,
});
```

좋은 예:

```tsx
await fetch('/api/partnership-inquiries', {
  method: 'POST',
  body,
});
```

서버에서는 이렇게 읽는다.

```ts
const formData = await request.formData();
const attachment = formData.get('attachment');
```

### 외부 API를 호출할 때

외부 API는 보통 인증 헤더가 필요하다.

현재 프로젝트의 Resend 이메일 발송 예:

```ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: email,
    subject,
    html,
    text,
  }),
});
```

의미:

```txt
Authorization: Bearer xxx
-> 이 요청을 보낸 사람이 API key를 가진 사용자임을 증명한다.

Content-Type: application/json
-> body를 JSON으로 해석하라는 뜻이다.
```

보안상 중요한 점:

```txt
외부 API key는 클라이언트 컴포넌트에서 쓰지 않는다.
RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY 같은 비밀 키는 서버 API에서만 사용한다.
NEXT_PUBLIC_으로 시작하는 값은 브라우저에 노출될 수 있다.
```

### Supabase REST를 직접 호출할 때

`packages/shared/src/utils/api.ts`의 `apiClient`는 Supabase REST 호출용 header를 공통 생성한다.

```ts
const headers: HeadersInit = {
  apikey: apiKey,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
  Authorization: `Bearer ${authorizationKey}`,
};
```

주요 헤더:

```txt
apikey
-> Supabase 프로젝트에 접근하기 위한 공개 키 또는 publishable key

Authorization
-> Row Level Security나 Edge Function 인증에 사용하는 Bearer 토큰

Prefer: return=representation
-> insert/update/delete 후 변경된 row를 응답으로 돌려달라는 Supabase REST 옵션

Prefer: count=exact
-> 목록 조회 시 정확한 총 개수를 Content-Range 헤더에 담아달라는 옵션
```

## 응답 Header 작성법

서버가 브라우저에 응답할 때도 header가 중요하다.

### JSON 응답

Next.js에서는 보통 `NextResponse.json()`을 사용한다.

```ts
return NextResponse.json(inquiry, {
  status: 201,
});
```

이 방식은 JSON body와 적절한 `Content-Type`을 자동으로 만들어준다.

에러 응답도 같은 패턴을 쓴다.

```ts
return NextResponse.json(
  { message: 'Unauthorized' },
  { status: 401 },
);
```

### 파일 다운로드 응답

파일 다운로드는 `NextResponse.json()`이 아니라 `new NextResponse(file, { headers })` 형태를 쓴다.

```ts
const headers = new Headers({
  'Cache-Control': 'private, max-age=0, no-store',
  'Content-Disposition': `attachment; filename="proposal.pdf"`,
  'Content-Type': 'application/pdf',
  'X-Content-Type-Options': 'nosniff',
});

return new NextResponse(file, { headers });
```

핵심 헤더:

```txt
Content-Disposition: attachment
-> 브라우저에게 화면에 열기보다 다운로드로 처리하라고 알려준다.

Content-Type: application/pdf
-> 파일 형식을 알려준다.

X-Content-Type-Options: nosniff
-> 브라우저가 임의로 파일 타입을 추측하지 않게 한다.

Cache-Control: private, max-age=0, no-store
-> 개인 파일을 브라우저나 중간 캐시에 저장하지 않게 한다.
```

한글 파일명은 `filename*`를 함께 쓰는 것이 좋다.

```txt
Content-Disposition:
attachment; filename="fallback.pdf"; filename*=UTF-8''%ED%8C%8C%EC%9D%BC.pdf
```

## Body의 역할

body는 서버에 보내는 실제 데이터다.

예:

```txt
문의 작성 내용
로그인 이메일과 비밀번호
관리자 답변 내용
파일 원본
AI 검색 질문
외부 이메일 API 요청값
```

body는 method에 따라 사용 방식이 다르다.

```txt
GET     = 보통 body 없음
POST    = 생성/처리할 데이터 body 있음
PATCH   = 수정할 데이터 body 있음
DELETE  = 보통 body 없음, 필요하면 id나 이유를 보낼 수 있음
```

## JSON Body

일반적인 데이터 전송은 JSON body를 사용한다.

프론트:

```tsx
await fetch('/api/admin/quick-inquiries/reply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inquiryId,
    replyContent,
  }),
});
```

서버:

```ts
const payload = await request.json();
```

장점:

```txt
객체, 배열, 문자열, 숫자, boolean을 표현하기 쉽다.
API Route에서 request.json()으로 쉽게 파싱할 수 있다.
로그와 테스트가 비교적 쉽다.
대부분의 CRUD 요청에 적합하다.
```

주의할 점:

```txt
JSON.stringify를 빼먹으면 서버가 읽을 수 없다.
Content-Type을 빼먹으면 서버 또는 외부 API가 body 형식을 모를 수 있다.
파일 원본은 JSON에 넣지 않는다.
Date, File, Map 같은 값은 JSON으로 보낼 때 의미가 바뀔 수 있다.
```

## FormData Body

파일이 포함되면 FormData를 사용한다.

```tsx
const body = new FormData();
body.set('company_name', form.companyName);
body.set('proposal_content', form.proposalContent);

if (selectedFile) {
  body.set('attachment', selectedFile);
}

await fetch('/api/partnership-inquiries', {
  method: 'POST',
  body,
});
```

서버:

```ts
const formData = await request.formData();
const companyName = formData.get('company_name');
const attachment = formData.get('attachment');
```

사용 상황:

```txt
파일 업로드
이미지 업로드
엑셀/CSV 업로드
텍스트 필드와 파일을 함께 전송
```

주의할 점:

```txt
FormData 값은 string 또는 File일 수 있으므로 타입 확인이 필요하다.
파일 크기 제한을 서버에서 다시 검사해야 한다.
클라이언트 accept 속성은 사용자 편의일 뿐 보안 검증이 아니다.
```

## Query String

조회 조건은 body보다 query string이 더 자연스러운 경우가 많다.

```txt
GET /api/search?query=AI&provider=gemini
```

작성 예:

```ts
const url = new URL('/api/search', window.location.origin);
url.searchParams.set('query', query);
url.searchParams.set('provider', provider);

const response = await fetch(url);
```

사용 상황:

```txt
검색어
페이지 번호
정렬 조건
필터
limit
```

주의할 점:

```txt
URL에 노출되어도 되는 값만 넣는다.
긴 본문이나 민감정보는 query string에 넣지 않는다.
```

현재 프로젝트의 검색 API는 `POST /api/search`에서 JSON body로 `query`와 `provider`를 받는다. AI 답변 생성처럼 단순 조회보다 "서버 처리 작업" 성격이 강하면 POST도 자연스럽다.

## Status Code 읽는 법

status code는 서버 처리 결과를 숫자로 표현한다.

```txt
200 OK            = 요청 성공
201 Created       = 생성 성공
204 No Content    = 성공했지만 응답 body 없음
207 Multi-Status  = 일부 성공, 일부 실패
400 Bad Request   = 요청 데이터가 잘못됨
401 Unauthorized  = 로그인 필요
403 Forbidden     = 권한 없음
404 Not Found     = 대상 없음
409 Conflict      = 중복 또는 충돌
422 Unprocessable = 형식은 맞지만 처리할 수 없음
500 Server Error  = 서버 내부 오류
502 Bad Gateway   = DB 또는 외부 API 처리 실패
```

중요한 점:

```txt
fetch는 400, 500 응답에서도 자동으로 throw하지 않는다.
반드시 response.ok를 확인해야 한다.
```

좋은 패턴:

```ts
const response = await fetch('/api/admin/users/invite', options);

if (!response.ok) {
  const errorBody = await response.json().catch(() => null);
  throw new Error(errorBody?.message ?? response.statusText);
}
```

현재 프로젝트의 `apiClient`도 같은 원리로 `assertSuccess(response)`를 둔다.

```ts
if (!response.ok) {
  const error = await parseBody(response);
  throw new Error(message ?? response.statusText);
}
```

## 서버에서 요청 읽기

Next.js API Route에서는 `NextRequest`를 받아 요청 정보를 읽는다.

### JSON 읽기

```ts
export async function POST(request: NextRequest) {
  const payload = await request.json();

  return NextResponse.json(payload);
}
```

### FormData 읽기

```ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('attachment');

  return NextResponse.json({ ok: true });
}
```

### Header 읽기

```ts
const contentType = request.headers.get('content-type') ?? '';

if (contentType.includes('multipart/form-data')) {
  const formData = await request.formData();
}
```

현재 제휴 문의 API는 `content-type`을 보고 JSON과 FormData를 구분한다.

```ts
const contentType = request.headers.get('content-type') ?? '';
const rawPayload =
  contentType.includes('multipart/form-data')
    ? await getMultipartPayload(request)
    : await request.json();
```

### URL과 params 읽기

동적 라우트에서는 URL 경로 일부가 params로 들어온다.

```txt
/api/partnership-inquiries/[id]/attachment
```

```ts
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
}
```

## 인증과 Header

인증 정보는 보통 cookie 또는 Authorization header로 전달된다.

현재 프로젝트의 관리자 화면은 NextAuth 기반이다.

```txt
브라우저
-> 쿠키 포함 요청
-> auth()
-> 세션 확인
-> 관리자 API 처리
```

관리자 API 예:

```ts
const session = await auth();

if (!session) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
```

권한까지 확인하는 예:

```ts
if (session.user?.role !== 'SuperAdmin') {
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
}
```

외부 API나 Supabase REST는 Authorization header를 많이 사용한다.

```txt
Authorization: Bearer API_KEY
```

중요한 구분:

```txt
브라우저 -> 우리 서버
대부분 cookie 기반 세션 인증

우리 서버 -> 외부 API
Authorization: Bearer secret_key

우리 서버 -> Supabase Admin
서버 전용 service role key 사용
```

## 실제 상황별 작성법

### 1. 단순 목록 조회

프론트:

```tsx
const response = await fetch('/api/admin/users');

if (!response.ok) {
  throw new Error('사용자 목록을 불러오지 못했습니다.');
}

const users = await response.json();
```

서버:

```ts
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.from('profiles').select('*');

  if (error) {
    return NextResponse.json({ message: 'Failed to load users' }, { status: 502 });
  }

  return NextResponse.json(data);
}
```

사용:

```txt
관리자 목록
공지 목록
FAQ 목록
문의 목록
```

### 2. 새 데이터 생성

프론트:

```tsx
await fetch('/api/quick-inquiries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name,
    email,
    subject,
    content,
  }),
});
```

서버:

```ts
export async function POST(request: NextRequest) {
  const payload = await request.json();

  const { data, error } = await supabaseAdmin
    .from('quick_inquiries')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: 'Failed to create inquiry' }, { status: 502 });
  }

  return NextResponse.json(data, { status: 201 });
}
```

사용:

```txt
문의 등록
공지 등록
FAQ 등록
관리자 초대
```

### 3. 기존 데이터 수정

프론트:

```tsx
await fetch('/api/partnership-inquiries', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id,
    status: 'reviewing',
    admin_memo: memo,
  }),
});
```

서버:

```ts
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from('partnership_inquiries')
    .update({
      status: body.status,
      admin_memo: body.admin_memo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ message: 'Failed to update inquiry' }, { status: 502 });
  }

  return NextResponse.json(data);
}
```

사용:

```txt
상태 변경
메모 저장
게시 여부 변경
내용 수정
```

### 4. 파일 업로드

프론트:

```tsx
const body = new FormData();
body.set('title', title);
body.set('attachment', file);

await fetch('/api/upload', {
  method: 'POST',
  body,
});
```

서버:

```ts
const formData = await request.formData();
const file = formData.get('attachment');

if (file instanceof File && file.size > 0) {
  await uploadAttachment(file);
}
```

사용:

```txt
제휴 제안서 첨부
포트폴리오 이미지 업로드
문의 첨부 파일
```

### 5. 파일 다운로드

프론트:

```tsx
<a href={`/api/partnership-inquiries/${id}/attachment`} download>
  다운로드
</a>
```

서버:

```ts
const headers = new Headers({
  'Content-Disposition': encodeContentDispositionFilename(fileName),
  'Content-Type': attachment.attachment_type || 'application/octet-stream',
});

return new NextResponse(file, { headers });
```

사용:

```txt
관리자 전용 첨부 파일 다운로드
비공개 문서 다운로드
권한 확인이 필요한 파일 응답
```

### 6. 외부 API 호출

서버:

```ts
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to,
    subject,
    html,
    text,
  }),
});

if (!response.ok) {
  const detail = await response.text();
  throw new Error(detail || 'Email send failed.');
}
```

사용:

```txt
메일 발송
AI API 호출
결제 API 호출
지도 API 호출
외부 CRM 연동
```

## JSON과 FormData 선택 기준

```txt
일반 텍스트/숫자/boolean/배열/객체만 보낸다
-> JSON

파일 원본을 함께 보낸다
-> FormData

조회 조건이 짧고 URL에 보여도 된다
-> Query string

비밀 키로 외부 API를 호출한다
-> 서버 API에서 fetch

파일을 내려준다
-> NextResponse(file, { headers })
```

## 클라이언트와 서버의 책임 분리

클라이언트가 하는 일:

```txt
사용자 입력 수집
fetch 요청 생성
headers/body 구성
response.ok 확인
응답 JSON 파싱
화면 상태 업데이트
React Query 캐시 갱신
```

서버가 하는 일:

```txt
로그인/권한 확인
request.json 또는 request.formData 파싱
입력값 검증
비밀 키 사용
DB/Storage/외부 API 처리
status code와 응답 body 결정
보안 헤더 설정
```

서버에서 반드시 다시 확인해야 하는 것:

```txt
필수값 존재 여부
문자 길이
이메일 형식
허용 enum 값
파일 크기
파일 타입
로그인 여부
관리자 권한
요청 대상에 대한 접근 권한
```

브라우저 검증은 사용자 경험을 좋게 만드는 장치이고, 서버 검증은 보안을 지키는 장치다.

## 에러 처리 흐름

좋은 API는 실패했을 때도 예측 가능한 모양으로 응답한다.

서버:

```ts
const jsonError = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ details, message }, { status });
```

클라이언트:

```ts
const parseResponseBody = async (response: Response) => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const assertResponseSuccess = async (response: Response) => {
  if (response.ok) return;

  const body = await parseResponseBody(response);

  if (body && typeof body === 'object' && 'message' in body) {
    throw new Error(String(body.message));
  }

  throw new Error(response.statusText);
};
```

이 패턴이 필요한 이유:

```txt
성공 응답은 JSON일 수 있다.
에러 응답도 JSON일 수 있다.
외부 API 에러는 text일 수 있다.
204 응답은 body가 없을 수 있다.
fetch는 HTTP 에러를 throw하지 않는다.
```

## 보안 관점에서 중요한 Header와 Body

### Content-Type 검증

서버가 기대하는 형식과 실제 요청 형식이 맞는지 확인한다.

```ts
const contentType = request.headers.get('content-type') ?? '';

if (!contentType.includes('application/json')) {
  return NextResponse.json({ message: 'Invalid content type' }, { status: 415 });
}
```

현재 제휴 문의 API처럼 JSON과 FormData를 모두 받는 경우에는 content-type에 따라 분기한다.

### Authorization은 서버에서만

비밀 API key는 브라우저로 내려가면 안 된다.

피해야 할 방식:

```tsx
await fetch('https://api.resend.com/emails', {
  headers: {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  },
});
```

좋은 방식:

```txt
클라이언트 -> /api/admin/users/invite
서버 -> Resend API
```

### 민감정보는 query string에 넣지 않기

피해야 할 예:

```txt
GET /api/login?email=a@example.com&password=1234
```

좋은 예:

```tsx
await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

### body를 그대로 DB에 넣지 않기

서버는 body를 받은 뒤 검증하고 정규화해야 한다.

```ts
const companyName = payload.company_name?.trim();

if (!companyName) {
  return jsonError('company_name is required.', 400);
}
```

현재 프로젝트의 제휴 문의 API도 `normalizePayload()`에서 필수값, 길이, 이메일 형식, enum 값을 검증한다.

## 캐시와 Header

캐시 정책도 header로 전달한다.

파일 다운로드처럼 개인 정보일 수 있는 응답:

```txt
Cache-Control: private, max-age=0, no-store
```

의미:

```txt
private
-> 공유 캐시에 저장하지 말 것

max-age=0
-> 즉시 오래된 것으로 간주

no-store
-> 저장하지 말 것
```

공개 정적 리소스라면 반대로 긴 캐시를 줄 수 있다.

```txt
Cache-Control: public, max-age=31536000, immutable
```

하지만 관리자 API, 개인정보, 파일 다운로드에는 긴 캐시를 주면 안 된다.

## 흔한 실수

### 1. JSON인데 stringify를 하지 않음

잘못된 예:

```tsx
fetch('/api/quick-inquiries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: {
    name,
    email,
  },
});
```

좋은 예:

```tsx
fetch('/api/quick-inquiries', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name,
    email,
  }),
});
```

### 2. FormData에 Content-Type을 직접 넣음

잘못된 예:

```tsx
fetch('/api/partnership-inquiries', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },
  body: formData,
});
```

좋은 예:

```tsx
fetch('/api/partnership-inquiries', {
  method: 'POST',
  body: formData,
});
```

### 3. response.ok를 확인하지 않음

잘못된 예:

```tsx
const data = await response.json();
```

좋은 예:

```tsx
if (!response.ok) {
  throw new Error('요청에 실패했습니다.');
}

const data = await response.json();
```

### 4. 한 번 읽은 body를 다시 읽으려 함

Request나 Response의 body는 stream이기 때문에 보통 한 번만 읽는다.

피해야 할 예:

```ts
const text = await response.text();
const json = await response.json();
```

좋은 예:

```ts
const text = await response.text();
const body = text ? JSON.parse(text) : null;
```

### 5. 클라이언트에서 비밀 키를 사용함

피해야 할 값:

```txt
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
```

이 값들은 서버 API 안에서만 사용한다.

## 실무 개발 체크리스트

### 요청 체크리스트

```txt
method가 의도와 맞는가?
URL이 올바른 API Route를 가리키는가?
JSON body라면 Content-Type을 넣었는가?
JSON body라면 JSON.stringify를 했는가?
FormData라면 Content-Type을 직접 넣지 않았는가?
GET 요청에 불필요한 body를 넣지 않았는가?
민감정보를 query string에 넣지 않았는가?
```

### 서버 체크리스트

```txt
request.json()과 request.formData() 중 맞는 것을 쓰는가?
content-type 분기가 필요한가?
필수값 검증이 있는가?
길이 제한이 있는가?
enum 값 검증이 있는가?
로그인 확인이 필요한가?
권한 확인이 필요한가?
비밀 키가 서버에서만 사용되는가?
외부 API 실패를 처리하는가?
```

### 응답 체크리스트

```txt
성공 status가 적절한가?
생성 성공은 201을 쓰는가?
인증 실패는 401을 쓰는가?
권한 부족은 403을 쓰는가?
검증 실패는 400 또는 422를 쓰는가?
DB/외부 API 실패는 502를 고려하는가?
에러 body에 message가 있는가?
클라이언트가 response.ok를 확인하는가?
```

### 파일 응답 체크리스트

```txt
Content-Disposition: attachment를 내려주는가?
Content-Type이 올바른가?
한글 파일명을 filename*로 처리하는가?
X-Content-Type-Options: nosniff가 있는가?
개인 파일에 no-store 캐시 정책이 있는가?
다운로드 전에 auth와 권한을 확인하는가?
```

## 현재 프로젝트 기준 요약

```txt
일반 JSON 생성:
프론트 훅
-> fetch('/api/...')
-> headers: Content-Type application/json
-> body: JSON.stringify(payload)
-> route.ts에서 request.json()
-> Supabase insert/update
-> NextResponse.json(data, { status })

파일 업로드:
ContactPartnershipPage
-> FormData
-> fetch('/api/partnership-inquiries', { method: 'POST', body })
-> route.ts에서 request.formData()
-> Storage upload
-> DB에는 storage path와 메타데이터 저장

파일 다운로드:
관리자 상세
-> GET /api/partnership-inquiries/:id/attachment
-> auth 확인
-> Storage download
-> Content-Disposition 포함 파일 응답

외부 API:
서버 route.ts
-> fetch('https://external-api...', { headers: Authorization Bearer ... })
-> response.ok 확인
-> 실패 시 text/json 읽어서 에러 처리
```

최종적으로 기억할 것:

```txt
header는 body를 설명한다.
body는 실제 데이터를 담는다.
JSON은 Content-Type과 JSON.stringify가 짝이다.
FormData는 Content-Type을 브라우저에 맡긴다.
파일 다운로드는 응답 header가 중요하다.
fetch는 실패 status에서 자동으로 throw하지 않는다.
비밀 키는 클라이언트가 아니라 서버에서만 쓴다.
```
