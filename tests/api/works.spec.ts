import { expect, test } from '@playwright/test';

/**
 * 포트폴리오(works) API 라우트 통합 테스트.
 *
 * 프론트 works는 공개 조회를 Supabase REST 직접 호출(apiClient)에서, 쓰기를 supabaseAdmin에서
 * Spring 백엔드로 이관됨(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server)
 *
 * 실행 전제: Next dev 서버(playwright webServer가 기동) + Spring 백엔드가 떠 있어야 함
 *   (백엔드 base URL은 API_BASE_URL, 기본값 http://localhost:8080).
 *   공개 목록은 Spring 응답에 의존하고, 어드민 쓰기 인증 테스트는 NextAuth만으로 성립한다.
 */

test.describe('public works api', () => {
  test('GET /api/works returns a list with the expected shape', async ({
    request,
  }) => {
    const response = await request.get('/api/works');

    expect(response.ok()).toBe(true);

    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);

    // 공개 목록은 WorkResponse(camelCase, roles=콤마문자열) 계약을 채운다.
    for (const work of body) {
      expect(work).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          category: expect.any(String),
          roles: expect.any(String),
        }),
      );
    }
  });

  test('GET /api/works/:id for a missing work returns 404', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/works/11111111-1111-1111-1111-111111111111',
    );

    expect(response.status()).toBe(404);
  });
});

test.describe('admin works api requires authentication', () => {
  // 로그인 세션 없이 호출 → NextAuth 게이트웨이가 401 을 반환한다(Spring 도달 전 차단).
  test('POST /api/admin/works without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/works', {
      data: {
        category: 'web_app',
        industry: 'tech',
        title: '제목',
        size: 'tall',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/works/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.patch(
      '/api/admin/works/11111111-1111-1111-1111-111111111111',
      {
        data: {
          category: 'web_app',
          industry: 'tech',
          title: '제목',
          size: 'tall',
        },
      },
    );

    expect(response.status()).toBe(401);
  });

  test('DELETE /api/admin/works/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.delete(
      '/api/admin/works/11111111-1111-1111-1111-111111111111',
    );

    expect(response.status()).toBe(401);
  });
});
