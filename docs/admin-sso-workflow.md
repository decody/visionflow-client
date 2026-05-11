# VisionFlow Admin SSO Workflow

이 문서는 VisionFlow 어드민의 Google/Naver SSO 인증을 처음부터 끝까지 이해하고, 다음에 같은 작업을 할 때 빠르게 재현하기 위한 기록입니다.

## 1. 전체 구조

VisionFlow는 모노레포 구조입니다.

```txt
apps/admin        어드민 Next.js 앱
apps/web          일반 웹 Next.js 앱
packages/auth     SSO provider 공통 설정
```

어드민 인증은 `next-auth` v5를 사용합니다.

핵심 파일은 아래와 같습니다.

```txt
packages/auth/index.ts
apps/admin/auth.ts
apps/admin/app/api/auth/[...nextauth]/route.ts
apps/admin/proxy.ts
apps/admin/src/features/login/login-page.tsx
apps/admin/src/features/signin/signin-sso.tsx
apps/admin/src/components/query-provider.tsx
apps/admin/src/components/layout/admin-topbar.tsx
```

## 2. 포트 고정

OAuth 콜백 URL은 포트까지 정확히 일치해야 합니다. 그래서 개발 서버 포트를 고정했습니다.

```txt
admin: http://localhost:3000
web:   http://localhost:3001
```

`apps/admin/package.json`

```json
{
  "scripts": {
    "dev": "node --use-system-ca ./node_modules/next/dist/bin/next dev --turbopack -p 3000",
    "start": "node --use-system-ca ./node_modules/next/dist/bin/next start -p 3000"
  }
}
```

`apps/web/package.json`

```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 3001",
    "start": "next start -p 3001"
  }
}
```

실행은 루트에서 합니다.

```bash
pnpm dev
```

또는 어드민만 실행합니다.

```bash
pnpm --filter @visionflow/admin dev
```

## 3. 환경변수

루트 `.env.local`에 SSO 관련 값을 둡니다.

```env
AUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

BETTER_AUTH_SECRET=...

AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...

AUTH_NAVER_ID=...
AUTH_NAVER_SECRET=...
```

주의할 점:

- `AUTH_URL`은 어드민 주소입니다.
- 현재 어드민은 `3000`으로 고정했으므로 `http://localhost:3000`이어야 합니다.
- Provider client secret은 브라우저에 노출하면 안 됩니다.
- `.env.local`을 바꾼 뒤에는 dev 서버를 재시작해야 합니다.

## 4. Provider 설정

Provider 공통 설정은 `packages/auth/index.ts`에 있습니다.

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

Google은 `Google` provider 함수를 그대로 등록했습니다. Auth.js가 `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`을 자동으로 읽습니다.

Naver는 명시 설정을 추가했습니다.

```ts
checks: ['state']
```

Auth.js v5 OAuth provider 기본값에는 PKCE 흐름이 들어갈 수 있습니다. 네이버와 맞지 않는 경우가 있어 네이버는 `state` 체크만 사용하도록 했습니다.

```ts
client: {
  token_endpoint_auth_method: 'client_secret_post',
}
```

네이버 토큰 교환 시 `client_id`, `client_secret`을 body로 보내도록 맞춘 설정입니다.

## 5. NextAuth 어드민 설정

`apps/admin/auth.ts`

```ts
import { providers } from '@visionflow/auth';
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: '/login',
  },
});
```

역할:

- `providers`: Google/Naver SSO provider 목록
- `secret`: 세션/JWT 암호화에 쓰는 secret
- `trustHost`: 로컬/프록시 환경에서 Host 검증 문제를 줄이기 위한 설정
- `pages.signIn`: 인증이 필요할 때 `/login`으로 이동

## 6. Auth API Route

`apps/admin/app/api/auth/[...nextauth]/route.ts`

```ts
import { handlers } from '../../../../auth';

export const { GET, POST } = handlers;
```

이 파일 때문에 아래 API들이 생깁니다.

```txt
GET  /api/auth/session
GET  /api/auth/providers
GET  /api/auth/csrf
POST /api/auth/signin/google
POST /api/auth/signin/naver
GET  /api/auth/callback/google
GET  /api/auth/callback/naver
```

OAuth provider에 등록해야 하는 콜백 URL은 이 경로를 기준으로 합니다.

```txt
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/naver
```

## 7. 로그인 버튼 흐름

클라이언트 컴포넌트에서 `next-auth/react`의 `signIn`을 호출합니다.

```ts
import { signIn } from 'next-auth/react';
```

Google:

```ts
signIn('google', { callbackUrl: '/' });
```

Naver:

```ts
signIn('naver', { callbackUrl: '/' });
```

흐름은 다음과 같습니다.

```txt
1. 사용자가 Google/Naver 버튼 클릭
2. 브라우저가 /api/auth/signin/{provider}로 요청
3. NextAuth가 provider 인증 URL 생성
4. 사용자가 Google/Naver 화면에서 동의
5. provider가 /api/auth/callback/{provider}로 code 전달
6. NextAuth가 code를 access token으로 교환
7. NextAuth가 사용자 profile 조회
8. 세션 생성
9. callbackUrl('/')로 이동
```

## 8. 보호 라우트

`apps/admin/proxy.ts`에서 로그인 여부를 확인합니다.

```ts
const PUBLIC_PREFIXES = [ROUTES.ADMIN.LOGIN, ROUTES.ADMIN.SIGNIN, '/api/auth'] as const;
```

공개 경로:

```txt
/login
/signin
/api/auth/*
```

로그인하지 않은 사용자가 어드민 페이지에 접근하면 `/login`으로 리다이렉트합니다.

중요한 점:

- `/api/auth`는 공개 경로여야 합니다.
- 공개 경로가 아니면 OAuth callback도 막혀서 로그인이 실패합니다.

## 9. 세션 Provider

클라이언트에서 `useSession`을 쓰려면 앱이 `SessionProvider`로 감싸져 있어야 합니다.

`apps/admin/src/components/query-provider.tsx`

```tsx
import { SessionProvider } from 'next-auth/react';

return (
  <SessionProvider>
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </SessionProvider>
);
```

이 설정 덕분에 어드민 상단바에서 현재 로그인한 사용자를 읽을 수 있습니다.

## 10. 로그인 사용자 표시와 로그아웃

`apps/admin/src/components/layout/admin-topbar.tsx`에서 세션을 읽습니다.

```ts
const { data: session } = useSession();
const userName = session?.user?.name ?? session?.user?.email ?? '관리자';
```

로그아웃은 `signOut`을 호출합니다.

```ts
signOut({ callbackUrl: ROUTES.ADMIN.LOGIN });
```

흐름:

```txt
1. 사용자가 Logout 클릭
2. NextAuth signOut 호출
3. 세션 쿠키 제거
4. /login으로 이동
5. proxy가 더 이상 로그인 세션을 보지 못함
```

## 11. Google/Naver 개발자 콘솔 설정

Google/Naver 개발자 콘솔에는 callback URL을 정확히 등록해야 합니다.

로컬 어드민 기준:

```txt
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/naver
```

네이버 Developers에서는 보통 아래를 확인합니다.

```txt
서비스 환경: PC 웹
서비스 URL: http://localhost:3000
Callback URL: http://localhost:3000/api/auth/callback/naver
```

포트, 프로토콜, 경로가 하나라도 다르면 실패합니다.

## 12. 네이버 에러 디버깅 기록

처음에는 네이버 로그인 후 아래 화면이 나왔습니다.

```txt
Server error
There is a problem with the server configuration.
Check the server logs for more information.
```

이 화면만 보면 원인을 알 수 없습니다. 반드시 터미널 로그를 봐야 합니다.

실제 로그:

```txt
[auth][error] CallbackRouteError
[auth][cause]: TypeError: fetch failed
[auth][details]: {
  "code": "SELF_SIGNED_CERT_IN_CHAIN",
  "provider": "naver"
}
```

이 뜻은 네이버 설정 오류가 아니라, Node가 네이버 HTTPS 요청의 인증서 체인을 신뢰하지 못했다는 의미입니다.

흔한 원인:

- 회사 프록시
- 백신 HTTPS 검사
- 로컬 네트워크 보안 장비
- 사내 루트 인증서가 Node에 등록되지 않음

해결 방향:

1. 가장 좋은 방법: 사내/백신 프록시 루트 인증서를 Node에 신뢰시킨다.
2. Windows 환경에서는 Node에 시스템 CA 저장소를 보게 한다.
3. 급한 로컬 개발에서만 TLS 검증 우회를 고려한다. 이 방법은 권장하지 않는다.

현재는 어드민 dev/start에 `--use-system-ca`를 적용했습니다.

```json
{
  "dev": "node --use-system-ca ./node_modules/next/dist/bin/next dev --turbopack -p 3000"
}
```

이 옵션은 Node가 Windows 시스템 인증서 저장소를 사용하도록 합니다.

## 13. 자주 보는 로그 해석

정상적인 로그인 시작:

```txt
GET /api/auth/providers 200
GET /api/auth/csrf 200
POST /api/auth/signin/naver 200
```

여기까지 성공하면 provider 인증 화면으로 이동합니다.

Callback 실패:

```txt
GET /api/auth/callback/naver?... 302
GET /api/auth/error?error=Configuration 500
```

이때는 반드시 직전의 `[auth][error]` 로그를 봐야 합니다.

예:

```txt
SELF_SIGNED_CERT_IN_CHAIN
```

인증서 문제입니다.

```txt
OAuthCallbackError
```

Provider가 error를 돌려준 것입니다. 보통 callback URL, client ID, client secret을 확인합니다.

```txt
UntrustedHost
```

`trustHost: true` 또는 `AUTH_TRUST_HOST=true`를 확인합니다.

```txt
MissingSecret
```

`AUTH_SECRET` 또는 `BETTER_AUTH_SECRET`이 필요합니다.

## 14. 다음에 SSO 추가할 때 순서

1. Provider 개발자 콘솔에서 앱을 만든다.
2. 로컬 어드민 URL을 정한다.
3. callback URL을 등록한다.
4. `.env.local`에 client id/secret을 넣는다.
5. `packages/auth/index.ts`에 provider를 추가한다.
6. 로그인 버튼에서 `signIn('{providerId}')`를 호출한다.
7. `/api/auth/providers`에서 provider가 보이는지 확인한다.
8. 로그인 시도 후 터미널 `[auth][error]` 로그를 확인한다.
9. 성공하면 `/api/auth/session`에서 사용자 세션이 생기는지 확인한다.
10. 보호 라우트에서 로그인 상태가 유지되는지 확인한다.

## 15. 체크리스트

SSO가 안 될 때 아래 순서로 봅니다.

```txt
[ ] dev 서버를 재시작했는가?
[ ] 어드민이 http://localhost:3000 에서 실행 중인가?
[ ] AUTH_URL이 http://localhost:3000 인가?
[ ] provider callback URL이 /api/auth/callback/{provider} 인가?
[ ] /api/auth가 proxy 공개 경로인가?
[ ] client id/secret env 이름이 provider 설정과 맞는가?
[ ] 터미널에 [auth][error]가 찍히는가?
[ ] SELF_SIGNED_CERT_IN_CHAIN이면 인증서 문제를 해결했는가?
```

## 16. 현재 결론

현재 프로젝트의 SSO 흐름은 다음 상태입니다.

```txt
Google SSO: 통과
Naver SSO: OAuth 흐름 진입은 성공
Naver 실패 원인: SELF_SIGNED_CERT_IN_CHAIN
적용한 대응: admin dev/start에 node --use-system-ca 추가
```

네이버가 계속 실패한다면 다음 단계는 사내/백신 프록시 루트 인증서를 `.pem`으로 받아 `NODE_EXTRA_CA_CERTS`에 연결하는 것입니다.
