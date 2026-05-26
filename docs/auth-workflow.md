# Authentication Workflow

## 목적

이 문서는 현재 프로젝트에서 관리자 로그인, Social 로그인, 이메일/패스워드 로그인, 초대 기반 계정 생성, 비밀번호 설정, 권한 확인이 어떤 구조로 동작하는지 정리한다.

`docs/file-attachment-workflow.md`와 같은 방식으로, 실제 코드 흐름을 기준으로 "어디에서 무엇을 담당하는지"와 "왜 그렇게 나누었는지"를 설명한다.

핵심 문장:

```txt
NextAuth는 웹 로그인 세션을 만든다.
Supabase Auth는 이메일/패스워드 사용자와 초대 토큰을 관리한다.
profiles와 user_roles는 우리 서비스의 사용자 상태와 권한을 관리한다.
관리자 화면/API는 NextAuth session.user.role을 보고 접근을 허용한다.
```

## 현재 인증 기본 구조

현재 프로젝트는 인증을 한 군데에만 맡기지 않고 역할을 나누어 사용한다.

```txt
브라우저 로그인 화면
-> next-auth/react signIn 호출
-> /api/auth/[...nextauth]
-> apps/auth.ts의 NextAuth 설정
-> OAuth 또는 Credentials 인증
-> profiles, user_roles 동기화
-> NextAuth 세션 발급
-> session.user.id, session.user.role 사용
-> 관리자 화면/API 접근 제어
```

각 구성 요소의 역할은 다음과 같다.

```txt
NextAuth
= 브라우저 세션, OAuth redirect/callback, JWT/session callback 담당

Supabase Auth
= 이메일/패스워드 검증, 초대 링크 생성, 초대 토큰 검증, 비밀번호 설정 담당

profiles
= 서비스 내부 사용자 프로필, 상태, 최근 로그인 정보 저장

user_roles
= 서비스 내부 권한 저장

auth_audit_logs
= 로그인 성공/실패 감사 로그 저장
```

## 주요 파일

```txt
apps/auth.ts
NextAuth 전체 설정. Social 로그인, credentials 로그인, 세션, JWT, 감사 로그 처리.

packages/auth/index.ts
Google, Naver OAuth provider 정의.

apps/app/api/auth/[...nextauth]/route.ts
NextAuth GET/POST route handler 연결.

apps/src/features/admin/auth/login-form-page.tsx
실제 관리자 로그인 화면. SSO 탭과 외부 협력자 이메일/패스워드 탭 제공.

apps/app/api/admin/users/invite/route.ts
SuperAdmin이 사용자를 초대하는 API.

apps/app/api/auth/confirm/route.ts
초대 메일 링크의 token_hash를 검증하는 API.

apps/app/api/auth/set-password/page.tsx
초대 수락 후 비밀번호를 설정하는 페이지.

apps/src/components/auth-session-provider.tsx
NextAuth SessionProvider, IdleLogout, UserRoleSync 연결.

apps/src/components/auth/role-guard.tsx
세션의 role을 보고 페이지 접근을 제한.

apps/src/components/auth/idle-logout.tsx
8시간 비활동 자동 로그아웃.
```

## Social 로그인 흐름

현재 Social 로그인은 Google과 Naver를 사용한다.

Provider 정의는 `packages/auth/index.ts`에 있다.

```ts
import Google from 'next-auth/providers/google';
import Naver from 'next-auth/providers/naver';

export const providers = [
  Google,
  Naver({
    clientId: process.env.AUTH_NAVER_ID,
    clientSecret: process.env.AUTH_NAVER_SECRET,
    checks: ['state'],
    client: {
      token_endpoint_auth_method: 'client_secret_post',
    },
  }),
];
```

로그인 화면에서는 SSO 탭에서 다음처럼 호출한다.

```tsx
signIn('google', { callbackUrl: '/settings' })
signIn('naver', { callbackUrl: '/settings' })
```

전체 흐름:

```txt
사용자가 Google 또는 Naver 버튼 클릭
-> next-auth/react signIn('google' | 'naver')
-> NextAuth가 provider 인증 페이지로 redirect
-> provider가 사용자 인증
-> provider가 NextAuth callback URL로 사용자 정보 반환
-> apps/auth.ts callbacks.signIn 실행
-> 이메일 존재 여부 확인
-> Supabase Auth 사용자와 profiles/user_roles 동기화
-> auth_audit_logs에 성공/실패 기록
-> JWT callback에서 userId, role 주입
-> session callback에서 session.user.id, session.user.role 완성
-> /settings로 이동
```

Social 로그인에서 중요한 코드는 `apps/auth.ts`의 `callbacks.signIn`이다.

```ts
async signIn({ account, user }) {
  if (!user.email) {
    // 이메일이 없으면 로그인 실패 처리
  }

  if (account?.provider === 'credentials') {
    // 이메일/패스워드 로그인은 authorize에서 이미 검증됨
    return true;
  }

  const appUser = await getOrCreateSsoAppUser({
    email: user.email,
    name: user.name,
  });

  user.id = appUser.id;
  return true;
}
```

즉, Social provider가 인증에 성공했다고 해서 바로 서비스 사용자가 되는 것이 아니다.

Social 인증 후 프로젝트 내부에서 한 번 더 하는 일:

```txt
1. 이메일이 있는지 확인
2. Supabase Auth 사용자 또는 profiles 사용자 검색
3. 없으면 Supabase Auth admin.createUser로 사용자 생성
4. profiles에 서비스 사용자 정보 upsert
5. user_roles에 기본 권한 생성
6. 로그인 감사 로그 기록
7. NextAuth 세션에 내부 user id와 role 연결
```

## 이메일/패스워드 로그인 흐름

이메일/패스워드 로그인은 NextAuth Credentials provider를 사용하지만, 실제 비밀번호 검증은 Supabase Auth가 한다.

로그인 화면은 `apps/src/features/admin/auth/login-form-page.tsx`의 외부 협력자 탭이다.

```tsx
const result = await signIn('credentials', {
  callbackUrl,
  email: trimmedEmail,
  password,
  redirect: false,
});
```

서버에서는 `apps/auth.ts`의 Credentials provider가 실행된다.

```ts
Credentials({
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    const { data: authData, error } =
      await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
  },
})
```

전체 흐름:

```txt
사용자가 이메일/패스워드 입력
-> signIn('credentials', { email, password })
-> NextAuth Credentials authorize 실행
-> supabaseAdmin.auth.signInWithPassword 호출
-> Supabase Auth가 비밀번호 해시 검증
-> 성공하면 auth.users의 user id/email 반환
-> profiles 조회
-> status가 inactive 계열이면 차단
-> profiles에 최근 로그인 정보 upsert
-> user_roles 없으면 기본 role 생성
-> pending_invite 상태면 active로 변경
-> NextAuth user 반환
-> callbacks.signIn에서 감사 로그 성공 기록
-> JWT/session에 userId, role 주입
```

여기서 중요한 점은 패스워드를 프로젝트 DB에서 직접 비교하지 않는다는 것이다.

```txt
프로젝트 코드가 하는 일:
email/password를 Supabase Auth에 전달

Supabase Auth가 하는 일:
저장된 비밀번호 해시와 입력된 비밀번호를 비교

프로젝트 DB가 하는 일:
사용자 상태, 권한, 로그인 기록 관리
```

## 로그인 실패 처리

Credentials 로그인에서 실패할 수 있는 경우:

```txt
이메일 또는 패스워드가 비어 있음
Supabase Auth signInWithPassword 실패
Supabase Auth user id/email 누락
profiles 조회 실패
profiles.status가 로그인 가능한 상태가 아님
profiles upsert 실패
```

실패 시에는 `auth_audit_logs`에 다음 정보가 기록된다.

```txt
event_type = login
provider   = credentials, google, naver 등
email      = 로그인 시도 이메일
user_id    = 알 수 있으면 사용자 id
status     = success 또는 failure
reason     = 실패 사유
ip         = 요청 IP
location   = Vercel/Cloudflare 헤더 기반 위치
user_agent = 브라우저 user-agent
```

성공/실패 로그를 남기는 함수는 `writeLoginAuditLog`이다.

## 초대 기반 계정 생성 흐름

현재 프로젝트에는 일반 공개 회원가입보다는 관리자 초대 기반 계정 생성 흐름이 있다.

초대 API는 `apps/app/api/admin/users/invite/route.ts`이다.

요청 조건:

```txt
로그인 세션이 있어야 함
session.user.role이 SuperAdmin이어야 함
초대 이메일이 유효해야 함
```

초대 생성 흐름:

```txt
SuperAdmin이 이메일과 role 입력
-> /api/admin/users/invite POST
-> auth()로 현재 세션 확인
-> SuperAdmin 권한 확인
-> supabaseAdmin.auth.admin.generateLink({ type: 'invite' })
-> Supabase Auth가 초대 user와 token_hash 생성
-> profiles에 status = pending_invite 저장
-> user_roles에 선택한 role 저장
-> Resend API로 초대 메일 발송
```

초대 링크는 직접 Supabase 기본 링크를 쓰지 않고, 프로젝트의 confirm API로 들어오게 만든다.

```txt
/api/auth/confirm?token_hash=...&type=invite
```

## 초대 수락과 비밀번호 설정

초대 메일 링크를 누르면 `apps/app/api/auth/confirm/route.ts`가 실행된다.

```ts
const { data, error } = await supabase.auth.verifyOtp({
  token_hash: tokenHash,
  type: 'invite',
});
```

전체 흐름:

```txt
사용자가 초대 메일 링크 클릭
-> /api/auth/confirm?token_hash=...&type=invite
-> token_hash와 type 확인
-> Supabase SSR client 생성
-> supabase.auth.verifyOtp({ type: 'invite' })
-> Supabase가 초대 토큰 검증
-> 검증 성공 시 Supabase 세션 쿠키 설정
-> profiles.status를 active로 변경
-> /api/auth/set-password로 redirect
```

비밀번호 설정 페이지에서는 Supabase client로 현재 Supabase 세션의 사용자 비밀번호를 변경한다.

```ts
await supabase.auth.updateUser({
  password,
});
```

즉, 초대 수락 직후에는 Supabase Auth 세션이 잠시 만들어지고, 그 세션 권한으로 `updateUser`를 호출해 비밀번호를 설정한다.

비밀번호 설정 완료 후에는 다음으로 이동한다.

```txt
/settings/login?mode=partner
```

그 다음부터는 이메일/패스워드 로그인 탭에서 로그인한다.

## 비밀번호 찾기/재설정의 현재 상태

코드 검색 기준으로, 일반 로그인 화면에 "비밀번호를 잊으셨나요?" 기능은 아직 구현되어 있지 않다.

현재 존재하는 것:

```txt
초대 수락 후 최초 비밀번호 설정
-> /api/auth/confirm
-> /api/auth/set-password
-> supabase.auth.updateUser({ password })
```

현재 없는 것:

```txt
비밀번호 찾기 화면
비밀번호 재설정 메일 발송 API
Supabase recovery token 검증 route
recovery 이후 새 비밀번호 설정 전용 화면
로그인 화면의 "잊으셨나요?" 링크 활성화
```

Supabase 방식으로 일반 비밀번호 찾기를 만들면 보통 이런 흐름이 된다.

```txt
사용자가 이메일 입력
-> supabase.auth.resetPasswordForEmail(email, { redirectTo })
-> 사용자가 재설정 메일 클릭
-> /api/auth/recovery 또는 /settings/reset-password 같은 route로 이동
-> recovery token 검증
-> 새 비밀번호 입력
-> supabase.auth.updateUser({ password })
-> 다시 로그인 화면으로 이동
```

현재 프로젝트에는 이 흐름 중 `updateUser({ password })`를 사용하는 초대 후 설정 페이지만 있고, recovery 메일 발송과 recovery callback은 없다.

## 세션과 권한 주입 원리

NextAuth는 로그인 성공 후 JWT callback과 session callback을 실행한다.

JWT callback:

```txt
user.email 저장
user.id가 UUID이면 token.userId 저장
token.userId가 없으면 이메일로 Supabase/Auth/Profile 사용자 검색
user_roles에서 role 조회
token.role 저장
```

Session callback:

```txt
token.userId -> session.user.id
token.role   -> session.user.role
```

결과적으로 클라이언트에서는 다음 값을 쓸 수 있다.

```ts
const { data: session } = useSession();

session?.user?.id
session?.user?.role
```

이 값이 관리자 접근 제어의 기준이 된다.

## 관리자 화면 접근 제어

관리자 레이아웃은 `AuthSessionProvider`로 감싸져 있다.

```tsx
<SessionProvider>
  <IdleLogout />
  <UserRoleSync />
  {children}
</SessionProvider>
```

`AdminShellConditional`과 주요 관리자 페이지들은 `RoleGuard`를 사용한다.

```txt
ADMIN_PAGE_ROLES
= SuperAdmin, admin, Viewer

CONTENT_MANAGER_ROLES
= SuperAdmin, admin

USER_MANAGER_ROLES
= SuperAdmin
```

접근 제어 흐름:

```txt
관리자 페이지 진입
-> useSession으로 NextAuth 세션 확인
-> unauthenticated면 로그인 페이지로 이동
-> authenticated면 session.user.role 확인
-> allowedRoles에 포함되지 않으면 fallbackPath로 이동
-> 허용되면 페이지 렌더링
```

API route에서도 비슷하게 `auth()`를 사용한다.

```ts
const session = await auth();

if (!session) {
  return jsonError('Unauthorized', 401);
}
```

사용자 초대 API처럼 민감한 API는 role도 확인한다.

```ts
if (session.user?.role !== 'SuperAdmin') {
  return jsonError('Forbidden', 403);
}
```

## 8시간 세션과 자동 로그아웃

NextAuth 설정에는 세션 만료 시간이 8시간으로 잡혀 있다.

```ts
session: {
  maxAge: 8 * 60 * 60,
  updateAge: 15 * 60,
}
```

클라이언트에서도 `IdleLogout`이 사용자 활동 시간을 localStorage에 저장한다.

```txt
click, keydown, mousemove, scroll, touchstart 이벤트 발생
-> visionflow:last-activity-at 갱신
-> 1분마다 마지막 활동 시간 확인
-> 8시간 이상 비활동이면 signOut
-> /settings/login으로 이동
```

따라서 이 프로젝트의 "8시간 보안 세션"은 두 층으로 동작한다.

```txt
NextAuth session maxAge = 서버/쿠키 기반 세션 수명
IdleLogout = 브라우저 활동 기준 자동 로그아웃
```

## 현재 프로젝트 기준 전체 요약

```txt
Social 로그인:
LoginFormPage
-> signIn('google' | 'naver')
-> NextAuth OAuth
-> provider 인증
-> callbacks.signIn
-> Supabase Auth user 생성/조회
-> profiles upsert
-> user_roles 기본 role 보장
-> auth_audit_logs 기록
-> JWT/session에 userId, role 저장

이메일/패스워드 로그인:
LoginFormPage
-> signIn('credentials')
-> Credentials authorize
-> supabaseAdmin.auth.signInWithPassword
-> profiles 상태 확인 및 최근 로그인 정보 저장
-> user_roles 기본 role 보장
-> auth_audit_logs 기록
-> JWT/session에 userId, role 저장

초대:
SuperAdmin
-> /api/admin/users/invite
-> Supabase Auth generateLink(type: invite)
-> profiles pending_invite 저장
-> user_roles 저장
-> Resend로 초대 메일 발송

초대 수락/비밀번호 설정:
초대 링크
-> /api/auth/confirm
-> supabase.auth.verifyOtp(type: invite)
-> profiles active 변경
-> /api/auth/set-password
-> supabase.auth.updateUser({ password })
-> /settings/login?mode=partner

권한 확인:
NextAuth jwt callback
-> user_roles 조회
-> token.role 저장
-> session.user.role 저장
-> RoleGuard/API auth()에서 검사
```

## 개발 체크리스트

### Social 로그인 체크리스트

```txt
AUTH_SECRET 또는 BETTER_AUTH_SECRET이 설정되어 있는가?
AUTH_URL이 배포 환경에서 올바른가?
Google OAuth client 설정이 NextAuth callback URL과 맞는가?
AUTH_NAVER_ID, AUTH_NAVER_SECRET이 설정되어 있는가?
Naver callback URL이 등록되어 있는가?
provider에서 이메일을 반환하지 않는 경우를 처리하는가?
SSO 성공 후 profiles/user_roles 동기화가 실패할 때 에러가 보이는가?
```

### 이메일/패스워드 로그인 체크리스트

```txt
Supabase Auth에 사용자가 존재하는가?
사용자의 이메일이 확정/사용 가능한 상태인가?
profiles.status가 active 또는 pending_invite인가?
user_roles에 role이 있거나 기본 role 생성이 가능한가?
로그인 실패가 auth_audit_logs에 기록되는가?
callbackUrl이 외부 URL로 오염되지 않도록 검증하는가?
```

### 초대 체크리스트

```txt
초대 API가 SuperAdmin만 호출 가능하도록 막혀 있는가?
SUPABASE_SERVICE_ROLE_KEY가 서버에서만 사용되는가?
초대 이메일 형식 검증을 하는가?
generateLink(type: invite)의 redirectTo가 /api/auth/confirm으로 향하는가?
profiles.status가 pending_invite로 저장되는가?
user_roles가 초대 role과 맞게 저장되는가?
Resend API 실패 시 부분 실패 응답을 처리하는가?
```

### 비밀번호 재설정 체크리스트

```txt
현재는 일반 비밀번호 찾기 기능이 구현되어 있지 않다.
로그인 화면의 "잊으셨나요?" 링크는 주석 처리되어 있다.
구현하려면 resetPasswordForEmail 흐름이 필요하다.
recovery callback route가 필요하다.
새 비밀번호 설정 화면은 invite 전용 set-password와 분리하는 편이 안전하다.
재설정 성공/실패 감사 로그 정책을 정해야 한다.
```

### 보안 체크리스트

```txt
SUPABASE_SERVICE_ROLE_KEY가 클라이언트 번들에 노출되지 않는가?
admin.createUser, generateLink 같은 admin API는 서버에서만 호출하는가?
auth_audit_logs에 민감한 패스워드를 저장하지 않는가?
session.user.role은 DB user_roles에서 다시 계산되는가?
권한이 필요한 API는 auth()와 role 검사를 모두 하는가?
8시간 세션 정책이 실제 운영 정책과 맞는가?
inactive, suspended 같은 상태 정책이 필요하면 canUseCredentialsLogin에 반영하는가?
```

## 원리 이해

### OAuth

OAuth 로그인은 사용자의 비밀번호를 우리 서비스가 직접 받지 않는 방식이다.

```txt
우리 서비스
-> Google/Naver로 인증 요청
-> 사용자는 Google/Naver에서 로그인
-> Google/Naver가 인증 결과를 우리 callback URL로 전달
-> NextAuth가 결과를 검증하고 사용자 정보를 만든다
```

장점:

```txt
우리 서비스가 Social 계정 비밀번호를 다루지 않는다.
2FA나 조직 정책은 provider 쪽 정책을 활용할 수 있다.
```

주의점:

```txt
provider 인증 성공 = 우리 서비스 권한 허용은 아니다.
서비스 내부 사용자 생성, 권한 부여, 차단 정책은 별도로 필요하다.
```

### Credentials 로그인

Credentials 로그인은 이메일과 패스워드를 직접 입력받는 방식이다.

현재 프로젝트에서는 패스워드 검증을 Supabase Auth에 위임한다.

```txt
입력된 패스워드
-> Supabase Auth
-> Supabase가 해시 검증
-> 성공/실패만 프로젝트에 반환
```

그래서 프로젝트 DB의 `profiles`에는 패스워드가 들어가지 않는다.

### Session

브라우저는 로그인 이후 매 요청마다 "나는 누구인가"를 증명해야 한다.

NextAuth는 이 정보를 세션으로 관리한다.

이 프로젝트에서 세션에 꼭 필요한 값:

```txt
session.user.id
session.user.email
session.user.role
```

권한은 매번 클라이언트가 마음대로 정하는 것이 아니라, 서버의 JWT callback에서 `user_roles`를 읽어서 넣는다.

### Role-Based Access Control

RBAC는 role에 따라 접근 가능한 기능을 나누는 방식이다.

현재 role 구조:

```txt
SuperAdmin
= 사용자 관리까지 가능

admin
= 콘텐츠 관리 가능

Viewer
= 관리자 화면 조회 중심
```

권한 판단은 문자열 비교만 하지 않고 `normalizeUserRole`로 표준화한 뒤 비교한다.

```txt
superadmin -> SuperAdmin
admin      -> admin
viewer     -> Viewer
user       -> Viewer
```

## 앞으로 보강하면 좋은 점

```txt
일반 비밀번호 찾기/recovery 흐름 추가
set-password 페이지 한글 깨짐 수정
초대 후 비밀번호 정책을 UI와 서버 양쪽에서 동일하게 검증
SSO 허용 도메인 정책이 필요하면 getOrCreateSsoAppUser 전에 검사
inactive/suspended 상태 정책 명확화
2FA/TOTP 실제 구현 여부 결정
auth_audit_logs 조회 화면 또는 필터 강화
```

최종적으로 기억할 것:

```txt
로그인은 NextAuth가 받는다.
이메일/패스워드 검증은 Supabase Auth가 한다.
Social 인증은 Google/Naver가 한다.
우리 서비스의 사용자 상태와 권한은 profiles/user_roles가 한다.
관리자 접근 제어는 session.user.role을 기준으로 한다.
비밀번호 찾기는 아직 일반 기능으로 구현되어 있지 않다.
```
