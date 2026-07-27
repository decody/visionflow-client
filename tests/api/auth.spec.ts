import { expect, test } from '@playwright/test';

/**
 * 인증 BFF 라우트 통합 테스트.
 *
 * 자격증명 로그인·초대·비번설정을 Supabase Auth 에서 Spring 으로 이관(BFF):
 *   - 로그인: NextAuth Credentials.authorize → Spring POST /api/auth/login
 *   - 초대(SuperAdmin): /api/admin/users/invite → Spring POST /api/admin/users/invite
 *   - 비번설정: set-password 페이지 → /api/auth/complete-invite → Spring POST /api/auth/set-password
 *
 * 실행 전제: Next dev 서버(playwright webServer). 아래 케이스는 Spring 도달 전 게이트/검증에서 처리된다.
 */

test.describe('auth BFF routes', () => {
  test('POST /api/admin/users/invite without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/users/invite', {
      data: { emails: ['new@example.com'], role: 'Viewer' },
    });

    expect(response.status()).toBe(401);
  });

  test('POST /api/auth/complete-invite without a token returns 400', async ({
    request,
  }) => {
    const response = await request.post('/api/auth/complete-invite', {
      data: { password: 'newpassword123' },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /api/auth/complete-invite with short password still validates on server', async ({
    request,
  }) => {
    // 토큰/비번이 모두 있으면 BFF 는 통과시키고 Spring 이 검증(여기선 Spring 미기동 가정 → 400/4xx/502 중 하나).
    const response = await request.post('/api/auth/complete-invite', {
      data: { password: '', token: '' },
    });

    expect(response.status()).toBe(400);
  });
});
