import { expect, test } from '@playwright/test';

/**
 * 사용자 관리(users) API 라우트 통합 테스트.
 *
 * 관리 CRUD 는 Supabase(auth.users + profiles + user_roles) 조합에서 Spring 백엔드로 이관됨(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server, /api/admin/users)
 * 로그인·초대 매직링크·이메일은 Supabase Auth 에 남고, 초대 시 Spring users 에 이중 쓰기한다.
 *
 * 실행 전제: Next dev 서버(playwright webServer) + Spring 백엔드.
 *   users 관리는 SuperAdmin 전용이라 세션 없는 호출은 모두 401(Spring 도달 전 NextAuth 게이트에서 차단).
 */

test.describe('admin users api requires authentication', () => {
  test('GET /api/admin/users without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/users');

    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/users/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/admin/users/11111111-1111-1111-1111-111111111111',
    );

    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/users/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.patch(
      '/api/admin/users/11111111-1111-1111-1111-111111111111',
      { data: { role: 'admin' } },
    );

    expect(response.status()).toBe(401);
  });

  test('DELETE /api/admin/users/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.delete(
      '/api/admin/users/11111111-1111-1111-1111-111111111111',
    );

    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/users/invite without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/users/invite', {
      data: { emails: ['new@example.com'], role: 'Viewer' },
    });

    expect(response.status()).toBe(401);
  });
});
