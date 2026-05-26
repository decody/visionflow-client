# API & Hook Workflow

## 목적

이 문서는 현재 프로젝트에서 API와 Hook이 어떤 원리로 동작하고, 어떤 상황에서 어떤 방식으로 작성하는지 정리한다.

`docs/file-attachment-workflow.md`와 같은 방식으로, 실제 프로젝트 구조를 기준으로 "화면에서 서버 데이터가 어떻게 오고 가는지", "API route와 커스텀 hook이 각각 무엇을 담당하는지", "Swagger와 Postman으로 어떻게 테스트하는지"를 함께 설명한다.

핵심 문장:

```txt
API는 서버와 데이터의 출입구다.
Hook은 화면에서 API를 쉽게 쓰기 위한 사용법이다.
Query는 조회다.
Mutation은 변경이다.
Swagger/Postman은 API를 눈으로 확인하고 직접 호출하는 도구다.
```

## 전체 그림

프론트엔드 화면은 DB를 직접 만지지 않는다.

현재 프로젝트에서는 보통 아래 흐름으로 데이터가 이동한다.

```txt
사용자 화면
-> 커스텀 Hook 호출
-> React Query의 useQuery 또는 useMutation 실행
-> fetch 또는 apiClient로 API 호출
-> Next.js API route 또는 Supabase REST
-> Supabase DB / Storage / 외부 API
-> 응답 데이터 반환
-> React Query cache 저장 또는 갱신
-> 화면 리렌더링
```

조금 더 단순하게 보면 이렇게 기억하면 된다.

```txt
화면 = 보여주고 입력받는 곳
Hook = 화면이 데이터를 쓰기 쉽게 포장한 곳
API = 서버에서 요청을 받고 검증/권한/DB 처리를 하는 곳
DB = 실제 데이터가 저장되는 곳
```

## 현재 프로젝트의 API 구조

현재 프로젝트에는 API를 호출하는 방식이 크게 두 가지 있다.

```txt
구조 A. 클라이언트 -> apiClient -> Supabase REST
구조 B. 클라이언트 -> Next.js API route -> supabaseAdmin -> DB/Storage/외부 API
```

두 방식 모두 맞는 방식이다.

다만 쓰는 상황이 다르다.

## 구조 A: Supabase REST 직접 호출

대표 예시는 Work 포트폴리오다.

```txt
WorkPortfolioListPage
-> useWorkListQuery
-> apiClient.get('works')
-> Supabase REST
-> works 테이블 조회
-> React Query cache 저장
-> 화면 렌더링
```

관련 파일:

```txt
packages/shared/src/utils/api.ts
apps/src/hooks/works/useWorkQuery.ts
apps/src/hooks/works/useCreateWorkMutation.ts
```

예시:

```ts
const fetchWorkList = async (): Promise<WorkRow[]> => {
  const { data } = await apiClient.get<WorkRow[] | null>('works');

  return (data ?? []).map(normalizeWork);
};

export const useWorkListQuery = () => {
  return useQuery<WorkRow[]>({
    queryKey: ['works-list'],
    queryFn: fetchWorkList,
  });
};
```

이 방식의 장점:

```txt
코드가 단순하다.
CRUD를 빠르게 만들 수 있다.
공통 apiClient가 camelCase/snake_case 변환을 처리한다.
Supabase REST 기능을 바로 사용할 수 있다.
```

주의할 점:

```txt
클라이언트에서 호출하므로 public key만 사용할 수 있다.
SUPABASE_SERVICE_ROLE_KEY 같은 비밀 키를 쓰면 안 된다.
권한 보호는 Supabase RLS 정책에 의존한다.
복잡한 서버 검증이나 관리자 권한 확인에는 적합하지 않을 수 있다.
```

사용하기 좋은 상황:

```txt
공개 목록 조회
RLS로 충분히 보호되는 테이블 CRUD
서버 전용 비밀 키가 필요 없는 기능
단순 insert/update/delete
```

## 구조 B: Next.js API Route 경유

대표 예시는 관리자 공지사항 생성이다.

```txt
NoticeWritePage
-> useCreateNoticeMutation
-> fetch('/api/admin/notices', { method: 'POST' })
-> apps/app/api/admin/notices/route.ts
-> auth()로 로그인 확인
-> canManageContent로 권한 확인
-> supabaseAdmin.from('notices').insert(...)
-> 생성된 row 반환
-> React Query cache 갱신
```

관련 파일:

```txt
apps/app/api/admin/notices/route.ts
apps/app/api/admin/notices/[id]/route.ts
apps/src/hooks/admin/notices/useCreateNoticeMutation.ts
apps/src/hooks/admin/notices/useUpdateNoticeMutation.ts
apps/src/lib/supabase-admin.ts
apps/src/lib/admin-permissions.ts
```

예시:

```ts
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!canManageContent(session.user?.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();

  const { data, error } = await supabaseAdmin
    .from('notices')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json(
      { message: 'Failed to create notice.' },
      { status: 500 },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
```

이 방식의 장점:

```txt
서버에서 로그인 여부를 확인할 수 있다.
관리자 권한 같은 역할 검사를 할 수 있다.
SUPABASE_SERVICE_ROLE_KEY 같은 서버 전용 키를 안전하게 쓸 수 있다.
파일 업로드, 이메일 발송, AI 호출 같은 서버 작업을 처리할 수 있다.
요청 데이터를 강하게 검증하고 응답 형식을 통일할 수 있다.
```

주의할 점:

```txt
API route 파일을 별도로 작성해야 한다.
요청/응답 타입과 에러 처리를 직접 설계해야 한다.
캐시 갱신은 클라이언트 hook에서 별도로 처리해야 한다.
```

사용하기 좋은 상황:

```txt
관리자 기능
로그인/권한 확인이 필요한 기능
비밀 키가 필요한 기능
Storage 업로드/다운로드
이메일 발송
외부 AI API 호출
여러 DB 작업을 하나의 트랜잭션처럼 묶어야 하는 기능
입력값 검증이 중요한 기능
```

## API란 무엇인가

API는 클라이언트와 서버가 대화하는 약속이다.

예를 들어 화면이 "공지사항을 하나 만들어줘"라고 요청하면, API는 다음을 정한다.

```txt
어떤 주소로 요청할 것인가?
어떤 HTTP method를 쓸 것인가?
어떤 body를 보낼 것인가?
어떤 권한이 필요한가?
성공하면 어떤 데이터를 돌려줄 것인가?
실패하면 어떤 에러를 돌려줄 것인가?
```

예:

```txt
POST /api/admin/notices
Content-Type: application/json

{
  "title": "서비스 점검 안내",
  "description": "새벽 2시에 점검합니다.",
  "contentHtml": "<p>점검 안내...</p>",
  "isImportant": true
}
```

응답:

```txt
201 Created

{
  "id": "notice-id",
  "title": "서비스 점검 안내",
  "description": "새벽 2시에 점검합니다.",
  "contentHtml": "<p>점검 안내...</p>"
}
```

## HTTP Method 기준

API를 작성할 때는 먼저 "무엇을 하려는 요청인가?"를 정한다.

```txt
GET    = 조회한다.
POST   = 새로 만든다.
PATCH  = 일부 수정한다.
PUT    = 전체 교체한다.
DELETE = 삭제한다.
```

현재 프로젝트에서 자주 쓰는 방식:

```txt
목록 조회     GET    /api/partnership-inquiries
상세 조회     GET    /api/some-resource/:id
생성          POST   /api/admin/notices
수정          PATCH  /api/admin/notices/:id
파일 다운로드 GET    /api/partnership-inquiries/:id/attachment
검색/AI 요청  POST   /api/search
```

실무에서는 body가 있는 조회도 가능하지만, 보통 단순 조회는 `GET`, 복잡한 검색이나 AI 요청처럼 body가 필요한 경우는 `POST`를 많이 쓴다.

## Request와 Response

API는 request를 받고 response를 돌려준다.

```txt
Request  = 클라이언트가 서버로 보내는 것
Response = 서버가 클라이언트로 돌려주는 것
```

Request에 들어가는 대표 요소:

```txt
URL
HTTP method
headers
query string
path parameter
body
cookie/session
```

예:

```txt
GET /api/notices?page=1&pageSize=10
```

여기서 `page`와 `pageSize`는 query string이다.

예:

```txt
PATCH /api/admin/notices/123
```

여기서 `123`은 path parameter다.

예:

```json
{
  "title": "수정된 제목",
  "isImportant": true
}
```

이 값은 body다.

## Header와 Body

Header는 요청/응답의 메타정보다.

Body는 실제 데이터다.

```txt
Header = 이 요청이 어떤 형식인지, 인증 정보가 있는지, 캐시 정책은 무엇인지
Body   = 실제로 만들거나 수정할 데이터
```

JSON 요청 예:

```ts
await fetch('/api/admin/notices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: '공지 제목',
    description: '공지 설명',
    contentHtml: '<p>본문</p>',
  }),
});
```

파일 요청 예:

```ts
const formData = new FormData();
formData.append('attachment', file);

await fetch('/api/partnership-inquiries', {
  method: 'POST',
  body: formData,
});
```

파일을 보낼 때는 `Content-Type`을 직접 지정하지 않는다.

브라우저가 `multipart/form-data`와 boundary를 자동으로 만든다.

## API Route 작성 흐름

Next.js App Router에서는 `route.ts` 파일에 HTTP method 함수를 export한다.

```txt
apps/app/api/admin/notices/route.ts
-> /api/admin/notices

apps/app/api/admin/notices/[id]/route.ts
-> /api/admin/notices/:id
```

기본 작성 순서:

```txt
1. 어떤 URL인지 정한다.
2. 어떤 method인지 정한다.
3. 로그인/권한 확인이 필요한지 판단한다.
4. request body 또는 query를 읽는다.
5. 입력값을 검증한다.
6. DB/Storage/외부 API를 호출한다.
7. 성공 응답을 반환한다.
8. 실패 응답을 통일된 형식으로 반환한다.
```

추천 기본 형태:

```ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title) {
      return jsonError('title is required.', 400);
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(
      'Unexpected error',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
```

## API에서 꼭 확인할 것

API는 외부 요청이 들어오는 입구이므로 화면보다 더 엄격해야 한다.

```txt
로그인이 필요한 API인가?
관리자 권한이 필요한 API인가?
필수값이 모두 있는가?
문자열 길이 제한이 있는가?
email/url/status 같은 값이 올바른 형식인가?
사용자가 보내면 안 되는 값을 보내고 있지 않은가?
DB 에러를 그대로 노출해도 안전한가?
성공 status code가 적절한가?
실패 status code가 적절한가?
```

상태 코드 기준:

```txt
200 OK                  일반 성공
201 Created             생성 성공
400 Bad Request         요청값이 잘못됨
401 Unauthorized        로그인 필요
403 Forbidden           권한 없음
404 Not Found           대상 없음
409 Conflict            중복/충돌
500 Internal Error      서버 내부 오류
502 Bad Gateway         외부 서비스 또는 DB 호출 실패로 볼 수 있는 오류
```

## Hook이란 무엇인가

Hook은 React 컴포넌트에서 재사용 가능한 로직을 꺼내 놓은 함수다.

현재 프로젝트에서 API와 관련된 hook은 대부분 React Query를 감싸는 커스텀 hook이다.

```txt
컴포넌트는 fetch를 직접 몰라도 된다.
컴포넌트는 useNoticeListQuery()만 호출한다.
데이터 조회, 로딩, 에러, 캐시는 hook이 처리한다.
```

예:

```tsx
const { data, isLoading, error } = useNoticeListQuery();
```

컴포넌트 입장에서는 이 정도만 알면 된다.

```txt
data      = 서버에서 온 데이터
isLoading = 요청 중인지 여부
error     = 실패했을 때의 에러
```

## Query와 Mutation

React Query에서는 서버 데이터 작업을 크게 두 가지로 나눈다.

```txt
useQuery    = 조회
useMutation = 생성/수정/삭제/전송
```

Query는 "가져오기"다.

```txt
공지사항 목록 조회
작업 포트폴리오 목록 조회
FAQ 목록 조회
사용자 목록 조회
문의 목록 조회
```

Mutation은 "바꾸기"다.

```txt
공지사항 생성
공지사항 수정
FAQ 생성
제휴 문의 상태 변경
답변 이메일 발송
파일 업로드
```

간단한 기준:

```txt
서버 상태를 읽기만 하면 useQuery
서버 상태를 바꾸면 useMutation
```

## Query Hook 작성법

Query hook은 보통 세 부분으로 나눈다.

```txt
1. 실제 데이터를 가져오는 fetch 함수
2. useQuery로 감싸는 hook
3. queryKey 설계
```

예:

```ts
const fetchNoticeList = async (): Promise<INotice[]> => {
  const { data } = await apiClient.get<INotice[] | null>('notices', {
    order: 'is_important.desc,date.desc',
  });

  return data ?? [];
};

export const useNoticeListQuery = () => {
  return useQuery<INotice[]>({
    queryKey: ['admin', 'notices-list'],
    queryFn: fetchNoticeList,
  });
};
```

상세 조회는 id가 있을 때만 실행한다.

```ts
export const useNoticeViewQuery = (noticeId: string) => {
  return useQuery<INotice | null>({
    enabled: Boolean(noticeId),
    queryKey: ['notice', noticeId],
    queryFn: () => fetchNotice(noticeId),
  });
};
```

여기서 중요한 것은 `enabled`다.

```txt
id가 아직 없는데 API를 호출하면 /undefined 같은 잘못된 요청이 나갈 수 있다.
enabled: Boolean(id)를 쓰면 id가 있을 때만 query가 실행된다.
```

## Mutation Hook 작성법

Mutation hook은 보통 다음을 포함한다.

```txt
1. mutationFn에서 API 호출
2. 실패 응답이면 throw Error
3. onSuccess에서 cache 갱신 또는 무효화
4. 필요하면 onError에서 에러 처리
```

예:

```ts
export const useCreateNoticeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ICreateNoticeRequest) => {
      const response = await fetch('/api/admin/notices', {
        body: JSON.stringify(values),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? '공지사항 등록 중 오류가 발생했습니다.');
      }

      return data as INotice;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'notices-list'],
      });
    },
  });
};
```

컴포넌트에서는 이렇게 쓴다.

```tsx
const createNotice = useCreateNoticeMutation();

const handleSubmit = () => {
  createNotice.mutate({
    title,
    description,
    contentHtml,
  });
};
```

비동기 흐름을 기다리고 싶으면 `mutateAsync`를 쓴다.

```tsx
await createNotice.mutateAsync({
  title,
  description,
  contentHtml,
});

router.push('/settings/notice');
```

## queryKey 설계

`queryKey`는 React Query cache의 주소다.

같은 queryKey를 쓰면 같은 캐시를 공유한다.

```txt
['works-list']                 Work 목록
['work', workId]               Work 상세
['admin', 'notices-list']      관리자 공지 목록
['notice', noticeId]           공지 상세
['notices-list']               사용자 공개 공지 목록
['admin', 'partnership-list']  관리자 제휴 문의 목록
```

좋은 queryKey:

```txt
기능 이름이 명확하다.
목록과 상세를 구분한다.
id, page, filter 같은 조건을 key에 포함한다.
관리자용과 사용자용을 구분한다.
```

예:

```ts
queryKey: ['notices-list', { page, pageSize, category }]
queryKey: ['notice', noticeId]
```

주의할 점:

```txt
목록과 상세가 같은 key를 쓰면 캐시가 꼬일 수 있다.
필터가 다른 목록이 같은 key를 쓰면 이전 데이터가 잘못 보일 수 있다.
수정 후 관련 key를 invalidate하지 않으면 화면이 오래된 데이터를 보여줄 수 있다.
```

## Cache 갱신 방식

Mutation 성공 후에는 보통 두 가지 중 하나를 한다.

```txt
invalidateQueries = 관련 데이터를 다시 가져오게 한다.
setQueryData      = 캐시를 직접 수정한다.
```

`invalidateQueries`는 안전하고 단순하다.

```ts
await queryClient.invalidateQueries({
  queryKey: ['admin', 'notices-list'],
});
```

`setQueryData`는 즉시 화면을 바꾸고 싶을 때 좋다.

```ts
queryClient.setQueryData<INotice[]>(
  ['admin', 'notices-list'],
  (oldNotices = []) => [createdNotice, ...oldNotices],
);
```

현재 프로젝트는 두 방식을 함께 쓰는 경우가 많다.

```txt
setQueryData로 화면을 즉시 갱신한다.
invalidateQueries로 서버 데이터와 다시 동기화한다.
```

이 방식은 사용자 경험과 데이터 정확성 사이에서 균형이 좋다.

## 현재 프로젝트의 대표 흐름

### Work 목록 조회

```txt
WorkPage
-> useWorkListQuery()
-> apiClient.get('works')
-> Supabase REST
-> works rows
-> normalizeWork()
-> data로 화면 렌더링
```

사용 상황:

```txt
공개 가능한 데이터 조회
서버 권한 검사가 복잡하지 않음
Supabase REST로 충분함
```

### Work 생성

```txt
WorkPortfolioCreatePage
-> useCreateWorkMutation()
-> apiClient.post('works', payload)
-> Supabase REST insert
-> queryClient.setQueryData(['works-list'])
-> queryClient.invalidateQueries(['works-list'])
```

사용 상황:

```txt
단순 CRUD
RLS 정책으로 보호 가능
서버 전용 비밀 키 불필요
```

### 관리자 공지 생성

```txt
NoticeWritePage
-> useCreateNoticeMutation()
-> fetch('/api/admin/notices')
-> API route에서 auth 확인
-> 관리자 권한 확인
-> supabaseAdmin insert
-> 생성된 notice 반환
-> 관리자 목록 cache 갱신
```

사용 상황:

```txt
관리자 권한 필요
서버에서 검증 필요
service role key 사용 가능성이 있음
```

### 제휴 문의 업로드

```txt
ContactPartnershipPage
-> FormData 생성
-> fetch('/api/partnership-inquiries', { method: 'POST', body: formData })
-> API route에서 formData 파싱
-> 파일이 있으면 Storage 업로드
-> DB에는 storage path와 메타데이터 저장
```

사용 상황:

```txt
파일 업로드
multipart/form-data
Storage 작업
DB 저장
```

### 검색 API

```txt
SearchPage
-> fetch('/api/search', { method: 'POST' })
-> API route에서 query 검증
-> Supabase에서 FAQ/공지/QNA 검색
-> Gemini 또는 OpenAI 호출
-> 검색 결과와 AI 답변 반환
```

사용 상황:

```txt
외부 AI API key 필요
서버에서만 노출되어야 하는 환경 변수 사용
복잡한 데이터 조합
실패 시 fallback 응답 필요
```

## 어떤 상황에 어떤 방식을 쓸까

### Supabase REST + apiClient를 쓰면 좋은 경우

```txt
단순 목록 조회
단순 상세 조회
단순 생성/수정/삭제
공개 데이터 또는 RLS로 충분히 보호되는 데이터
서버 전용 비밀 키가 필요 없는 경우
```

예:

```txt
works 조회
faq 조회
notices 공개 목록 조회
```

### Next.js API route를 쓰면 좋은 경우

```txt
관리자 권한 확인이 필요한 경우
로그인 세션을 확인해야 하는 경우
service role key가 필요한 경우
파일 업로드/다운로드가 필요한 경우
이메일을 보내야 하는 경우
외부 API key를 써야 하는 경우
여러 테이블을 함께 처리해야 하는 경우
요청값 검증이 복잡한 경우
```

예:

```txt
/api/admin/notices
/api/admin/faq
/api/admin/users/invite
/api/partnership-inquiries
/api/partnership-inquiries/:id/attachment
/api/search
```

## API 작성 체크리스트

```txt
URL이 리소스 중심으로 명확한가?
HTTP method가 동작과 맞는가?
요청 body 타입을 정했는가?
응답 body 타입을 정했는가?
성공 status code가 적절한가?
실패 status code가 적절한가?
로그인 확인이 필요한가?
관리자 권한 확인이 필요한가?
입력값 검증을 서버에서 하고 있는가?
비밀 키가 클라이언트로 노출되지 않는가?
DB 에러를 너무 자세히 노출하지 않는가?
프론트에서 처리하기 쉬운 에러 메시지를 주는가?
```

## Hook 작성 체크리스트

```txt
조회는 useQuery를 쓰는가?
생성/수정/삭제는 useMutation을 쓰는가?
queryKey가 목록/상세/필터별로 구분되는가?
id가 필요한 query는 enabled로 실행 조건을 막았는가?
mutation 성공 후 관련 query를 갱신하는가?
fetch 실패 시 throw Error를 하는가?
컴포넌트가 fetch 세부사항을 몰라도 되는가?
타입이 명확한가?
불필요하게 같은 API를 여러 컴포넌트에서 중복 작성하지 않았는가?
```

## 컴포넌트에서 Hook을 쓰는 방식

조회 화면:

```tsx
const { data = [], isLoading, error } = useWorkListQuery();

if (isLoading) return <Loading />;
if (error) return <ErrorMessage />;

return <WorkList works={data} />;
```

작성 화면:

```tsx
const createWork = useCreateWorkMutation();

const handleSubmit = async () => {
  await createWork.mutateAsync({
    title,
    category,
    industry,
    roles,
    size,
  });

  router.push('/settings/work-portfolio');
};
```

버튼 상태:

```tsx
<button disabled={createWork.isPending}>
  {createWork.isPending ? '저장 중' : '저장'}
</button>
```

## Swagger란 무엇인가

Swagger는 API 문서를 화면으로 보여주고, 브라우저에서 직접 API를 호출해 볼 수 있게 해주는 도구다.

요즘은 보통 OpenAPI Specification이라는 문서 형식을 만들고, Swagger UI가 그 문서를 읽어서 API 문서 화면을 만든다.

```txt
OpenAPI 문서 = API 명세 파일
Swagger UI   = API 명세를 보기 좋게 보여주는 화면
```

Swagger로 확인할 수 있는 것:

```txt
API URL
HTTP method
요청 header
요청 body schema
응답 body schema
status code
인증 방식
브라우저에서 직접 Try it out 실행
```

## Swagger는 언제 쓰나

Swagger는 팀 단위 개발에서 특히 유용하다.

```txt
프론트엔드와 백엔드가 API 계약을 맞출 때
QA가 API를 직접 테스트할 때
외부 파트너에게 API 문서를 제공할 때
백엔드 구현 전 API 스펙을 먼저 합의할 때
내가 만든 API가 어떤 요청/응답을 갖는지 정리할 때
```

현재 프로젝트에는 별도 Swagger 설정 파일이 보이지 않는다.

추가하려면 보통 아래 중 하나를 선택한다.

```txt
1. openapi.yaml 또는 openapi.json을 직접 작성한다.
2. Next.js API route에서 스펙을 생성하는 라이브러리를 사용한다.
3. Zod schema를 기준으로 OpenAPI 문서를 생성한다.
```

가장 단순한 시작은 `docs/openapi.yaml` 같은 파일을 만들고 API를 하나씩 적는 것이다.

## OpenAPI 예시

공지 생성 API를 OpenAPI로 쓰면 대략 이런 모양이다.

```yaml
openapi: 3.0.3
info:
  title: VisionFlow API
  version: 1.0.0
paths:
  /api/admin/notices:
    post:
      summary: 관리자 공지사항 생성
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
                - description
                - contentHtml
              properties:
                title:
                  type: string
                description:
                  type: string
                contentHtml:
                  type: string
                isImportant:
                  type: boolean
                isPublished:
                  type: boolean
      responses:
        '201':
          description: 생성 성공
        '400':
          description: 요청값 오류
        '401':
          description: 로그인 필요
        '403':
          description: 권한 없음
```

이 명세를 Swagger UI에 연결하면 문서 화면에서 요청 body를 입력하고 직접 호출해 볼 수 있다.

## Swagger 사용 흐름

```txt
1. API 명세를 작성한다.
2. Swagger UI를 실행한다.
3. API 목록에서 테스트할 API를 선택한다.
4. Try it out을 누른다.
5. 필요한 path/query/body/header 값을 입력한다.
6. Execute를 누른다.
7. status code, response body, response header를 확인한다.
```

확인할 것:

```txt
요청 body가 실제 API 코드와 맞는가?
필수값 누락 시 400이 나오는가?
로그인 없이 관리자 API를 호출하면 401 또는 403이 나오는가?
성공 시 응답 데이터 모양이 프론트 타입과 맞는가?
에러 응답 형식이 프론트에서 처리하기 쉬운가?
```

## Postman이란 무엇인가

Postman은 API를 직접 호출하고 저장해 둘 수 있는 API 테스트 도구다.

Swagger가 "문서 중심"이라면, Postman은 "테스트와 실행 중심"에 가깝다.

Postman으로 할 수 있는 것:

```txt
GET/POST/PATCH/DELETE 요청 보내기
Header 설정
JSON body 입력
multipart/form-data 파일 업로드 테스트
쿠키 또는 Bearer Token 인증 테스트
환경 변수 관리
응답 status/body/header 확인
API 요청 모음(Collection) 저장
팀원과 공유
```

## Postman 기본 사용법

### 1. 새 요청 만들기

```txt
New
-> HTTP Request
-> method 선택
-> URL 입력
```

예:

```txt
POST http://localhost:3000/api/admin/notices
```

### 2. Header 설정

JSON API는 보통 아래 header를 넣는다.

```txt
Content-Type: application/json
```

로그인 토큰 방식이면 보통 아래도 넣는다.

```txt
Authorization: Bearer access-token
```

현재 프로젝트의 관리자 API는 NextAuth 세션/cookie 기반이므로, 브라우저 로그인 세션과 Postman 세션이 다를 수 있다.

그래서 관리자 API를 Postman에서 테스트하려면 쿠키를 가져오거나, 테스트용 인증 방식을 별도로 준비해야 할 수 있다.

### 3. Body 입력

JSON 요청:

```txt
Body
-> raw
-> JSON 선택
```

예:

```json
{
  "title": "서비스 점검 안내",
  "description": "새벽 점검 예정입니다.",
  "contentHtml": "<p>점검 안내입니다.</p>",
  "isImportant": true,
  "isPublished": true
}
```

### 4. Send 실행

`Send`를 누르면 아래를 확인한다.

```txt
Status: 201 Created
Response Body
Response Headers
요청 시간
응답 크기
```

## Postman에서 GET 테스트

예: 제휴 문의 목록 조회

```txt
GET http://localhost:3000/api/partnership-inquiries
```

이 API는 로그인 확인을 한다.

로그인 쿠키가 없으면 다음 응답이 정상이다.

```txt
401 Unauthorized
```

즉, Postman에서 401이 나왔다고 해서 API가 무조건 고장난 것은 아니다.

인증이 필요한 API라면 올바른 인증 정보 없이 401이 나오는 것이 맞다.

## Postman에서 POST JSON 테스트

예: 검색 API

```txt
POST http://localhost:3000/api/search
Content-Type: application/json
```

Body:

```json
{
  "query": "웹 3D",
  "provider": "gemini"
}
```

확인할 것:

```txt
query가 없으면 400이 나오는가?
query가 있으면 answer와 sources가 나오는가?
AI API key가 없거나 실패해도 fallback answer가 나오는가?
```

## Postman에서 파일 업로드 테스트

예: 제휴 문의 생성 API

```txt
POST http://localhost:3000/api/partnership-inquiries
```

Body 설정:

```txt
Body
-> form-data
```

필드 예:

```txt
company_name       Text  테스트 회사
company_size       Text  2-10
contact_name       Text  홍길동
contact_email      Text  test@example.com
contact_position   Text  매니저
partnership_type   Text  outsourcing
proposal_content   Text  제휴 문의 내용입니다.
attachment         File  proposal.pdf
```

주의:

```txt
파일 필드는 type을 File로 바꾼다.
form-data 요청에서는 Content-Type을 직접 넣지 않아도 된다.
Postman이 multipart/form-data boundary를 자동으로 만든다.
```

성공하면:

```txt
201 Created
DB row 반환
attachment_url에는 공개 URL이 아니라 storage path 저장
```

## Postman 환경 변수

반복 테스트를 하려면 환경 변수를 쓰는 것이 좋다.

예:

```txt
baseUrl = http://localhost:3000
```

요청 URL:

```txt
{{baseUrl}}/api/search
{{baseUrl}}/api/partnership-inquiries
{{baseUrl}}/api/admin/notices
```

운영/개발 환경을 바꿀 때 URL만 바꾸면 된다.

```txt
local       http://localhost:3000
preview     https://preview.example.com
production  https://example.com
```

## Swagger와 Postman의 차이

```txt
Swagger = API 명세와 문서화에 강함
Postman = 실제 호출, 반복 테스트, 파일 업로드 테스트에 강함
```

실무에서는 둘 다 쓰는 경우가 많다.

```txt
Swagger로 API 계약을 확인한다.
Postman으로 실제 동작을 테스트한다.
프론트 hook으로 화면에 연결한다.
```

## API를 만들 때 추천 순서

```txt
1. 화면에서 필요한 데이터와 동작을 정한다.
2. 조회인지 변경인지 구분한다.
3. Supabase REST로 충분한지, Next.js API route가 필요한지 판단한다.
4. 요청 body와 응답 body 타입을 정한다.
5. API route 또는 apiClient 호출 함수를 작성한다.
6. 커스텀 hook을 작성한다.
7. 컴포넌트에서 hook을 연결한다.
8. Postman으로 API 단독 테스트를 한다.
9. 브라우저에서 실제 화면 흐름을 테스트한다.
10. 필요하면 Swagger/OpenAPI 문서에 명세를 추가한다.
```

## 공부할 때 보는 순서

이 프로젝트에서 API와 Hook을 공부한다면 아래 순서를 추천한다.

```txt
1. apps/src/components/query-provider.tsx
   React Query가 앱에 어떻게 연결되는지 확인한다.

2. packages/shared/src/utils/api.ts
   Supabase REST 공통 클라이언트가 어떻게 동작하는지 확인한다.

3. apps/src/hooks/works/useWorkQuery.ts
   가장 단순한 조회 hook을 본다.

4. apps/src/hooks/works/useCreateWorkMutation.ts
   가장 단순한 생성 mutation을 본다.

5. apps/src/hooks/admin/notices/useCreateNoticeMutation.ts
   Next.js API route를 호출하는 mutation을 본다.

6. apps/app/api/admin/notices/route.ts
   서버에서 auth, 권한, 검증, DB insert를 어떻게 하는지 본다.

7. apps/app/api/partnership-inquiries/route.ts
   JSON과 FormData, 파일 업로드 처리를 함께 본다.

8. apps/app/api/search/route.ts
   DB 조회와 외부 AI API 호출을 함께 처리하는 복잡한 API를 본다.
```

## 자주 헷갈리는 부분

### API route와 hook은 같은 것이 아니다

```txt
API route = 서버에서 실행되는 코드
Hook      = 브라우저 React 컴포넌트에서 호출하는 코드
```

Hook은 API를 호출할 수 있지만, API 그 자체는 아니다.

### useQuery는 DB 조회 함수가 아니다

`useQuery`는 DB를 직접 조회하지 않는다.

`useQuery`는 `queryFn`을 실행하고 결과를 캐싱한다.

실제 요청은 `queryFn` 안의 `fetch`나 `apiClient.get`이 한다.

### fetch는 실패해도 자동으로 throw하지 않는다

`fetch`는 400, 500 응답을 받아도 자동으로 예외를 던지지 않는다.

그래서 직접 확인해야 한다.

```ts
if (!response.ok) {
  throw new Error('요청 실패');
}
```

### GET 요청에는 body를 넣지 않는 편이 좋다

GET은 보통 query string으로 조건을 전달한다.

```txt
GET /api/notices?page=1
```

body가 필요한 복잡한 검색은 POST를 쓰는 편이 실무적으로 편하다.

```txt
POST /api/search
```

### 서버 전용 환경 변수는 클라이언트에서 쓰면 안 된다

```txt
NEXT_PUBLIC_으로 시작하는 값 = 브라우저에 노출 가능
그 외 비밀 키 = 서버에서만 사용
```

예:

```txt
NEXT_PUBLIC_SUPABASE_URL              클라이언트 사용 가능
NEXT_PUBLIC_SUPABASE_ANON_KEY         클라이언트 사용 가능
SUPABASE_SERVICE_ROLE_KEY             서버에서만 사용
OPENAI_API_KEY                        서버에서만 사용
GEMINI_API_KEY                        서버에서만 사용
```

## 최종 요약

```txt
API는 서버와 데이터의 출입구다.
Hook은 화면에서 API를 쉽게 쓰기 위한 포장이다.
조회는 useQuery를 쓴다.
생성/수정/삭제/전송은 useMutation을 쓴다.
단순 CRUD는 apiClient + Supabase REST로 처리할 수 있다.
권한/비밀 키/파일/외부 API가 있으면 Next.js API route를 쓴다.
Mutation 성공 후에는 React Query cache를 갱신해야 한다.
Swagger는 API 문서화와 Try it out에 좋다.
Postman은 실제 API 호출과 반복 테스트에 좋다.
```

가장 중요하게 기억할 것:

```txt
화면은 데이터 처리 세부사항을 몰라도 된다.
화면은 hook을 호출한다.
hook은 API를 호출한다.
API는 검증, 권한, DB 작업을 처리한다.
DB와 외부 서비스의 복잡함은 API 뒤에 숨긴다.
```
