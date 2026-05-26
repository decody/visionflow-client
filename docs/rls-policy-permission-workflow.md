# RLS Policy Permission Workflow

## 목적

이 문서는 현재 프로젝트를 기준으로 RLS, Policy, 권한관리가 어떤 원리로 동작하고, 실무에서 어떤 식으로 설계하고 작성하는지 정리한다.

`docs/file-attachment-workflow.md`와 같은 방식으로, 실제 코드 흐름을 기준으로 "어디에서 무엇을 막는지", "RLS와 서버 권한 검사를 어떻게 나누는지", "어떤 상황에 어떤 방식을 쓰는지"를 설명한다.

핵심 문장:

```txt
RLS는 DB row 접근을 막는다.
Policy는 어떤 row를 허용할지 정한다.
Role은 사용자가 어떤 기능을 할 수 있는지 정한다.
프론트 권한 체크는 UX이고,
서버와 DB 권한 체크가 실제 보안이다.
```

## 용어 정리

### RLS

RLS는 Row Level Security의 줄임말이다.

테이블 전체 접근 권한이 아니라, row 단위로 접근 가능 여부를 결정하는 PostgreSQL 기능이다.

예를 들어 `qna_posts` 테이블에 100개의 글이 있어도 사용자는 본인이 작성한 글만 볼 수 있고, 관리자는 모든 글을 볼 수 있게 만들 수 있다.

```txt
테이블 접근 가능?
-> 예

그 row에 접근 가능?
-> RLS policy가 결정
```

### Policy

Policy는 RLS가 켜진 테이블에서 실제 허용 조건을 적는 규칙이다.

```sql
create policy "users can read own posts" on qna_posts
  for select
  using (user_id = auth.uid());
```

위 정책은 다음 의미다.

```txt
qna_posts를 select할 때
row의 user_id가 현재 로그인한 사용자 id와 같으면
그 row를 조회할 수 있다.
```

### Permission

Permission은 사용자가 특정 행동을 할 수 있는지 판단하는 권한이다.

현재 프로젝트에서는 주로 role 기반으로 판단한다.

```txt
SuperAdmin = 사용자 관리까지 가능
admin      = 콘텐츠/문의 관리 가능
Viewer     = 관리자 화면 조회 중심
```

관련 코드:

```txt
apps/src/lib/admin-permissions.ts
apps/src/components/auth/role-guard.tsx
apps/auth.ts
```

## 현재 프로젝트의 권한관리 기본 구조

현재 프로젝트는 권한을 한 곳에서만 처리하지 않는다.

크게 세 층으로 나뉜다.

```txt
1. 화면 권한
   버튼, 메뉴, 페이지 접근 표시 제어

2. 서버 권한
   Next.js API route에서 auth()와 role 확인

3. DB 권한
   Supabase/PostgreSQL RLS policy로 row 접근 제한
```

전체 흐름:

```txt
사용자 로그인
-> NextAuth session 생성
-> apps/auth.ts에서 user_roles 조회
-> session.user.role 저장
-> 화면 RoleGuard 또는 canManageContent로 UI 제어
-> API route에서 auth()와 session.user.role 재확인
-> Supabase REST 직접 호출은 RLS policy가 최종 보호
-> supabaseAdmin/service role 사용 API는 서버 권한 검사가 최종 보호
```

중요한 구분:

```txt
클라이언트 -> Supabase REST 직접 호출
= RLS가 반드시 필요

클라이언트 -> Next.js API route -> supabaseAdmin
= API route에서 auth/role 검사가 반드시 필요
```

## 현재 프로젝트의 주요 권한 파일

```txt
apps/auth.ts
NextAuth 세션을 만들고 user_roles에서 role을 읽어 session.user.role에 넣는다.

apps/src/lib/admin-permissions.ts
SuperAdmin, admin, Viewer role을 표준화하고 권한 helper를 제공한다.

apps/src/components/auth/role-guard.tsx
관리자 페이지에서 허용 role이 아니면 fallback path로 이동시킨다.

apps/src/stores/user-role-store.ts
클라이언트 상태에 현재 role을 보관한다.

apps/src/lib/supabase-admin.ts
서버 전용 service role key로 Supabase client를 만든다.

packages/shared/src/utils/api.ts
브라우저에서 Supabase REST를 호출할 때 public key/anon key를 사용한다.

apps/app/api/admin/notices/route.ts
관리자 콘텐츠 생성 API. auth와 canManageContent 확인 후 service role로 DB 작업.

apps/app/api/admin/users/invite/route.ts
SuperAdmin만 사용자 초대 가능.

apps/app/api/partnership-inquiries/route.ts
공개 문의 등록과 관리자 조회/수정이 함께 있는 API.
```

## RLS가 필요한 이유

브라우저에 있는 코드는 사용자가 볼 수 있고 조작할 수 있다.

그래서 프론트에서 버튼을 숨기는 것만으로는 보안이 되지 않는다.

```tsx
{canManageNotice && <button>삭제</button>}
```

위 코드는 UX에는 좋지만, 보안의 최종선은 아니다.

사용자는 개발자 도구나 직접 HTTP 요청으로 API를 호출할 수 있다.

따라서 민감한 데이터는 서버나 DB에서 다시 막아야 한다.

```txt
프론트 버튼 숨김
= 편의성, 실수 방지

API route auth/role 확인
= 서버 보안

RLS policy
= DB 보안
```

## RLS 기본 작성법

### 1. 테이블에 RLS 켜기

```sql
alter table public.qna_posts enable row level security;
```

RLS를 켜면 정책이 없는 작업은 기본적으로 막힌다.

실무에서는 이 특성이 중요하다.

```txt
RLS ON + policy 없음
= 접근 불가
```

### 2. SELECT 정책 작성

공개 게시글은 누구나 읽을 수 있게 할 수 있다.

```sql
create policy "published posts are readable"
on public.qna_posts
for select
using (is_published = true);
```

로그인한 사용자가 본인 글만 읽게 할 수도 있다.

```sql
create policy "users can read own posts"
on public.qna_posts
for select
to authenticated
using (user_id = auth.uid());
```

### 3. INSERT 정책 작성

INSERT는 `with check`를 사용한다.

`with check`는 새로 들어오는 row가 조건을 만족하는지 검사한다.

```sql
create policy "users can create own posts"
on public.qna_posts
for insert
to authenticated
with check (user_id = auth.uid());
```

의미:

```txt
로그인한 사용자는 글을 만들 수 있다.
단, 새 row의 user_id는 본인 auth.uid()여야 한다.
```

### 4. UPDATE 정책 작성

UPDATE는 보통 `using`과 `with check`를 함께 쓴다.

```sql
create policy "users can update own posts"
on public.qna_posts
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

의미:

```txt
using
= 수정 대상 row를 찾을 수 있는 조건

with check
= 수정 후 row가 만족해야 하는 조건
```

`using`만 쓰면 수정 대상은 제한되지만, 수정 후 `user_id`를 다른 사람으로 바꾸는 문제를 놓칠 수 있다.

### 5. DELETE 정책 작성

```sql
create policy "users can delete own posts"
on public.qna_posts
for delete
to authenticated
using (user_id = auth.uid());
```

삭제는 기존 row를 대상으로 하므로 `using`을 쓴다.

## using과 with check 차이

RLS를 처음 배울 때 가장 헷갈리는 부분이다.

```txt
using
= 이미 존재하는 row를 볼 수 있는가?
= select, update, delete 대상 row 필터

with check
= 새로 만들어지거나 변경된 row가 허용되는가?
= insert, update 결과 row 검증
```

예:

```sql
create policy "own rows only"
on public.todos
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
```

이 정책은 두 가지를 막는다.

```txt
다른 사람 row 수정 시도
-> using에서 차단

내 row를 수정하면서 owner_id를 다른 사람으로 변경
-> with check에서 차단
```

## Supabase role과 서비스 role의 차이

Supabase/PostgreSQL에서 말하는 role과 서비스의 사용자 role은 다르다.

### Supabase/Postgres role

```txt
anon
= 로그인하지 않은 공개 요청

authenticated
= Supabase Auth로 로그인한 요청

service_role
= 서버 전용 강력 권한. RLS를 우회할 수 있음.
```

### 서비스 내부 role

현재 프로젝트의 서비스 내부 role은 `user_roles` 테이블에서 관리한다.

```txt
SuperAdmin
admin
Viewer
```

즉, 아래 둘은 같은 개념이 아니다.

```txt
auth.role() = 'authenticated'
session.user.role = 'admin'
```

`auth.role()`은 Supabase JWT 기준 role이고, `session.user.role`은 우리 서비스의 업무 권한이다.

## service role key 주의점

`SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용해야 한다.

현재 프로젝트에서는 아래 파일에서 서버 전용 client를 만든다.

```ts
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);
```

중요한 점:

```txt
service role key는 RLS를 우회할 수 있다.
그래서 service role을 쓰는 API는 반드시 auth/role을 먼저 확인해야 한다.
```

예:

```ts
const session = await auth();

if (!session) {
  return jsonError('Unauthorized', 401);
}

if (!canManageContent(session.user?.role)) {
  return jsonError('Forbidden', 403);
}

await supabaseAdmin.from('notices').insert(payload);
```

이 구조에서는 RLS보다 API route의 권한 검사가 더 중요해진다.

## 현재 프로젝트 예시 1: 관리자 공지사항 생성

공지사항 생성은 Next.js API route를 거친다.

```txt
NoticeWritePage
-> fetch('/api/admin/notices', { method: 'POST' })
-> apps/app/api/admin/notices/route.ts
-> auth()로 로그인 확인
-> canManageContent(session.user.role) 확인
-> supabaseAdmin.from('notices').insert(...)
```

이 방식의 특징:

```txt
관리자 권한이 필요하다.
서버에서 payload 검증을 한다.
service role key를 서버에서만 사용한다.
RLS를 우회할 수 있으므로 API route 권한 검사가 필수다.
```

적합한 상황:

```txt
관리자만 생성/수정/삭제 가능
요청 검증이 복잡함
감사 로그나 외부 API 호출이 필요함
service role key가 필요함
```

## 현재 프로젝트 예시 2: Work 포트폴리오 Supabase REST 호출

Work 포트폴리오는 `apiClient`로 Supabase REST를 직접 호출하는 구조다.

```txt
WorkPortfolioListPage
-> useWorkListQuery
-> apiClient.get('works')
-> Supabase REST
-> works 테이블 조회
```

생성/수정/삭제도 `apiClient.post`, `apiClient.patch`, `apiClient.delete`를 사용한다.

이 방식의 특징:

```txt
브라우저에서 public key/anon key로 요청한다.
서버 API route가 중간에서 막아주지 않는다.
따라서 works 테이블의 RLS policy가 실제 보안이다.
```

적합한 상황:

```txt
공개 조회 데이터
단순 CRUD
RLS policy로 충분히 보호 가능
서버 전용 key가 필요 없음
```

주의할 점:

```txt
RLS 없이 public key로 직접 CRUD를 열면 위험하다.
관리자 기능을 REST 직접 호출로 만들려면 관리자 판별을 RLS에서 할 수 있어야 한다.
그게 어렵다면 Next.js API route로 옮기는 편이 낫다.
```

## 현재 프로젝트 예시 3: 제휴 문의와 첨부파일

제휴 문의 등록은 공개 사용자가 할 수 있다.

```txt
사용자
-> /api/partnership-inquiries POST
-> 파일 검증
-> Storage 업로드
-> partnership_inquiries insert
```

관리자 조회/수정/첨부 다운로드는 로그인 확인이 필요하다.

```txt
관리자
-> /api/partnership-inquiries GET/PATCH
-> auth() 확인
-> supabaseAdmin으로 조회/수정

관리자 첨부 다운로드
-> /api/partnership-inquiries/:id/attachment
-> auth() 확인
-> DB에서 storage path 조회
-> Storage download
```

이 흐름에서 기억할 점:

```txt
공개 제출은 허용하되 조회는 막아야 한다.
첨부파일은 public URL로 열지 않는다.
다운로드는 권한 확인이 가능한 서버 API를 통한다.
```

RLS만으로 표현하면 이런 패턴이 된다.

```sql
alter table public.partnership_inquiries enable row level security;

create policy "anyone can submit partnership inquiry"
on public.partnership_inquiries
for insert
to anon, authenticated
with check (true);

create policy "no public read partnership inquiry"
on public.partnership_inquiries
for select
to anon, authenticated
using (false);
```

현재 프로젝트처럼 서버에서 `supabaseAdmin`을 쓰면 service role이 RLS를 우회할 수 있으므로, 서버의 `auth()` 검사가 조회 방어선이 된다.

## 관리자 role을 RLS에서 확인하는 패턴

RLS에서 서비스 내부 role을 보려면 보통 `user_roles` 테이블을 참조한다.

예:

```sql
create policy "admins can read all inquiries"
on public.partnership_inquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('superadmin', 'admin')
  )
);
```

주의할 점:

```txt
user_roles 자체도 아무나 읽거나 수정할 수 있으면 안 된다.
role을 바꾸는 API는 SuperAdmin만 허용해야 한다.
RLS 정책에서 참조하는 권한 테이블은 특히 단단하게 잠가야 한다.
```

## 상황별 선택 기준

### 공개 조회

예:

```txt
게시된 공지사항
공개 포트폴리오
공개 FAQ
```

권장:

```txt
Supabase REST 직접 조회 가능
RLS select policy에서 공개 조건 제한
```

예:

```sql
create policy "published notices are readable"
on public.notices
for select
to anon, authenticated
using (is_published = true);
```

### 본인 데이터 조회/수정

예:

```txt
내 프로필
내 문의 내역
내 비밀글
```

권장:

```txt
RLS에서 user_id = auth.uid() 조건 사용
```

예:

```sql
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());
```

### 관리자 전용 기능

예:

```txt
공지사항 생성/수정/삭제
문의 답변
첨부파일 다운로드
사용자 초대
```

권장:

```txt
Next.js API route 사용
auth()로 로그인 확인
session.user.role 확인
supabaseAdmin은 서버에서만 사용
```

RLS로도 만들 수 있지만, 아래 조건이 있으면 API route가 더 적합하다.

```txt
입력 검증이 복잡함
메일 발송이 필요함
파일 다운로드가 필요함
감사 로그가 필요함
여러 테이블을 함께 수정함
service role key가 필요함
```

### 공개 제출

예:

```txt
문의 등록
견적 요청
제휴 문의
뉴스레터 구독
```

권장:

```txt
insert는 열고 select/update/delete는 닫는다.
스팸 방지, rate limit, captcha, 서버 검증을 고려한다.
```

예:

```sql
create policy "anyone can create inquiry"
on public.contact_inquiries
for insert
to anon, authenticated
with check (true);

create policy "public cannot read inquiries"
on public.contact_inquiries
for select
to anon, authenticated
using (false);
```

## RLS 정책 설계 순서

실무에서는 먼저 SQL부터 쓰기보다 질문을 먼저 정리한다.

```txt
1. 이 테이블은 공개 데이터인가?
2. 로그인한 사용자만 접근해야 하는가?
3. 본인 row만 접근해야 하는가?
4. 관리자는 전체 접근이 필요한가?
5. 생성, 조회, 수정, 삭제 권한이 서로 다른가?
6. row 생성 후 소유자가 바뀌면 안 되는가?
7. service role로 처리할 API가 있는가?
8. Storage 파일 권한과 DB row 권한이 연결되는가?
```

그 다음 작업별로 정책을 나눈다.

```txt
select policy
insert policy
update policy
delete policy
```

정책 이름은 사람이 읽었을 때 바로 의도가 보여야 한다.

좋은 예:

```txt
published notices are readable
users can update own profile
admins can read all inquiries
anyone can submit contact inquiry
```

나쁜 예:

```txt
policy1
allow all
test policy
temp admin
```

## 권한관리 체크리스트

### 화면 체크리스트

```txt
권한 없는 사용자에게 버튼이 숨겨지는가?
권한 없는 사용자가 URL 직접 접근 시 이동되는가?
로딩 중 권한이 확정되기 전 민감 화면이 보이지 않는가?
Viewer, admin, SuperAdmin별 화면 차이가 명확한가?
```

### API 체크리스트

```txt
auth()로 로그인 여부를 확인하는가?
권한 부족은 403 Forbidden을 반환하는가?
미로그인은 401 Unauthorized를 반환하는가?
role 문자열을 normalize해서 비교하는가?
service role key를 쓰기 전에 권한 확인을 하는가?
사용자 입력을 검증한 뒤 DB에 저장하는가?
```

### RLS 체크리스트

```txt
민감 테이블에 RLS가 켜져 있는가?
select, insert, update, delete 정책을 각각 검토했는가?
insert/update에 with check가 필요한지 확인했는가?
본인 소유 row 조건에 auth.uid()를 사용하는가?
관리자 정책이 user_roles를 안전하게 참조하는가?
anon에게 필요 이상으로 select를 열지 않았는가?
```

### Storage 체크리스트

```txt
민감 파일 bucket이 public false인가?
파일 path를 DB에 저장하고 public URL을 저장하지 않는가?
다운로드 전에 DB row 권한을 확인하는가?
signed URL은 필요한 순간에 짧은 만료 시간으로 만드는가?
service role storage download API에 auth/role 검사가 있는가?
```

## 자주 하는 실수

### 1. RLS를 켰지만 policy를 안 만듦

RLS를 켜면 정책이 없는 작업은 막힌다.

갑자기 데이터 조회가 안 된다면 먼저 RLS policy를 확인한다.

### 2. INSERT에 using을 쓰려고 함

INSERT는 기존 row가 없기 때문에 `using`이 아니라 `with check`가 핵심이다.

```sql
for insert with check (...)
```

### 3. UPDATE에 with check를 빼먹음

본인 row만 수정할 수 있어도, 수정 결과가 여전히 본인 row인지 확인해야 한다.

```sql
for update
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

### 4. service role을 클라이언트에 노출

service role key는 절대 `NEXT_PUBLIC_` 환경 변수로 만들면 안 된다.

```txt
좋음:
SUPABASE_SERVICE_ROLE_KEY

위험:
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
```

### 5. 프론트 권한 체크만 믿음

프론트의 권한 체크는 사용성을 위한 것이다.

보안은 API route 또는 RLS에서 다시 확인해야 한다.

## Java/Spring 권한관리와 비교

Java나 Spring 기반 서비스에서는 보통 애플리케이션 서버가 권한관리의 중심이다.

대표 구조:

```txt
브라우저
-> Spring Controller
-> Spring Security Filter
-> 인증 객체 SecurityContext 저장
-> @PreAuthorize 또는 service method에서 권한 확인
-> JPA/MyBatis로 DB 조회
```

예:

```java
@PreAuthorize("hasRole('ADMIN')")
@PostMapping("/admin/notices")
public Notice createNotice(@RequestBody NoticeRequest request) {
    return noticeService.create(request);
}
```

본인 데이터 조회는 보통 service에서 검사한다.

```java
if (!post.getOwnerId().equals(currentUserId)) {
    throw new AccessDeniedException("Forbidden");
}
```

### Supabase RLS 방식

```txt
권한 조건이 DB policy에 들어간다.
클라이언트가 Supabase REST로 직접 DB에 접근해도 DB가 row를 막는다.
auth.uid(), auth.role(), JWT claim을 policy에서 사용할 수 있다.
```

### Java/Spring 방식

```txt
권한 조건이 서버 코드에 들어간다.
DB는 보통 애플리케이션 서버를 신뢰한다.
Controller, Filter, Service, Method Security에서 권한을 확인한다.
```

### 비교 표

| 구분 | Supabase RLS | Java/Spring 권한관리 |
| --- | --- | --- |
| 권한 위치 | DB policy | 서버 코드 |
| row 단위 제한 | DB가 직접 처리 | query 조건 또는 service 로직 |
| 클라이언트 직접 DB 접근 | 가능, RLS 필수 | 보통 불가능 |
| 관리자 기능 | RLS 또는 API route | Controller/Service에서 처리 |
| service role | 서버에서 RLS 우회 가능 | 서버 DB 계정이 보통 강한 권한 |
| 장점 | 데이터 가까이에서 강제, REST 직접 호출과 잘 맞음 | 복잡한 업무 로직 표현이 쉬움 |
| 단점 | 정책이 흩어지면 파악이 어려움 | query마다 권한 조건 누락 위험 |

핵심 차이:

```txt
Spring은 서버가 문지기인 구조다.
Supabase RLS는 DB도 문지기가 되는 구조다.
```

현재 프로젝트는 두 방식을 섞어서 쓴다.

```txt
Supabase REST 직접 호출
-> RLS 중심

Next.js API route
-> Spring Controller처럼 서버에서 auth/role 확인
```

## 실무 권장 패턴

### 패턴 A: 공개 데이터

```txt
브라우저 -> Supabase REST -> RLS select 공개 조건
```

예:

```sql
using (is_published = true)
```

### 패턴 B: 본인 데이터

```txt
브라우저 -> Supabase REST -> RLS owner 조건
```

예:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

### 패턴 C: 관리자 작업

```txt
브라우저 -> Next.js API route -> auth/role 확인 -> supabaseAdmin
```

예:

```ts
if (!canManageContent(session.user?.role)) {
  return jsonError('Forbidden', 403);
}
```

### 패턴 D: 파일 다운로드

```txt
브라우저 -> 다운로드 API -> auth/role 확인 -> DB row 확인 -> Storage download
```

예:

```txt
파일 bucket은 private
DB에는 storage path만 저장
다운로드 API에서 권한 확인 후 내려줌
```

## 현재 프로젝트 기준 최종 요약

```txt
권한은 user_roles에 저장된다.
NextAuth session.user.role은 apps/auth.ts에서 만들어진다.
관리자 화면은 RoleGuard와 canManageContent로 UX를 제어한다.
관리자 API는 auth()와 role을 확인한 뒤 supabaseAdmin을 사용한다.
Supabase REST 직접 호출은 RLS policy가 실제 보안이다.
service role key는 서버에서만 사용하고 RLS를 우회할 수 있다.
파일과 민감 데이터는 public으로 열지 않고 서버 API에서 권한 확인 후 제공한다.
```

최종적으로 기억할 것:

```txt
RLS는 DB의 row 방화벽이다.
Policy는 row 방화벽의 규칙이다.
Role은 서비스 기능 접근 기준이다.
프론트 권한 체크는 UX다.
서버 권한 체크와 RLS가 실제 보안이다.
```
