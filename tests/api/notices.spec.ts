import { expect, test } from '@playwright/test';

/**
 * 공지사항(Notice) API 라우트 통합 테스트.
 *
 * 프론트 공지는 Supabase 직접 호출(RPC get_notices / REST)에서 Spring 백엔드로 이관됨(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server)
 *
 * 실행 전제: Next dev 서버(playwright webServer가 기동) + Spring 백엔드가 떠 있어야 함
 *   (백엔드 base URL은 API_BASE_URL, 기본값 http://localhost:8080).
 *   공개 목록 테스트는 Spring 응답에 의존하고, 어드민 인증 테스트는 NextAuth만으로 성립한다.
 */

test.describe('public notice api', () => {
  test('GET /api/notices returns only published notices with the expected shape', async ({
    request,
  }) => {
    const response = await request.get('/api/notices');

    expect(response.ok()).toBe(true);

    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);

    // 공개 엔드포인트는 is_published=true 만 노출하고, INotice 계약(camelCase)을 채운다.
    for (const notice of body) {
      expect(notice).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          isPublished: true,
          title: expect.any(String),
          date: expect.any(String),
        }),
      );
    }
  });

  test('POST /api/notices is not allowed (read-only public endpoint)', async ({
    request,
  }) => {
    const response = await request.post('/api/notices', { data: {} });

    expect(response.status()).toBe(405);
  });
});

test.describe('admin notice api requires authentication', () => {
  // 로그인 세션 없이 호출 → NextAuth 게이트웨이가 401 을 반환한다(Spring 도달 전 차단).
  test('GET /api/admin/notices without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/notices');

    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/notices without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/notices', {
      data: { title: '제목', description: '설명', contentHtml: '<p>본문</p>' },
    });

    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/notices/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.patch(
      '/api/admin/notices/11111111-1111-1111-1111-111111111111',
      { data: { title: '제목', description: '설명', contentHtml: '<p>본문</p>' } },
    );

    expect(response.status()).toBe(401);
  });

  test('DELETE /api/admin/notices/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.delete(
      '/api/admin/notices/11111111-1111-1111-1111-111111111111',
    );

    expect(response.status()).toBe(401);
  });
});
