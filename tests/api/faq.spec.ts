import { expect, test } from '@playwright/test';

/**
 * FAQ API 라우트 통합 테스트.
 *
 * 프론트 FAQ는 Supabase 직접 호출에서 Spring 백엔드로 이관됨(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server)
 *
 * 실행 전제: Next dev 서버(playwright webServer가 기동) + Spring 백엔드가 떠 있어야 함
 *   (백엔드 base URL은 API_BASE_URL, 기본값 http://localhost:8080).
 *   공개 목록 테스트는 Spring 응답에 의존하고, 어드민 인증 테스트는 NextAuth만으로 성립한다.
 */

test.describe('public faq api', () => {
  test('GET /api/faq returns only visible FAQs with the expected shape', async ({
    request,
  }) => {
    const response = await request.get('/api/faq');

    expect(response.ok()).toBe(true);

    const body = await response.json();

    expect(Array.isArray(body)).toBe(true);

    // 공개 엔드포인트는 is_visible=true 만 노출하고, camel/snake 케이스를 모두 채운다.
    for (const faq of body) {
      expect(faq).toEqual(
        expect.objectContaining({
          answer: expect.any(String),
          id: expect.any(Number),
          isVisible: true,
          is_visible: true,
          question: expect.any(String),
        }),
      );
    }
  });

  test('POST /api/faq is not allowed (read-only public endpoint)', async ({
    request,
  }) => {
    const response = await request.post('/api/faq', { data: {} });

    expect(response.status()).toBe(405);
  });
});

test.describe('admin faq api requires authentication', () => {
  // 로그인 세션 없이 호출 → NextAuth 게이트웨이가 401 을 반환한다.
  // (Spring 어드민 API가 아직 미인증이므로, 이 NextAuth 경계가 사실상의 인가다.)
  test('GET /api/admin/faq without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/faq');

    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/faq without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/faq', {
      data: { answer: '답변', question: '질문' },
    });

    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/faq/:id without a session returns 401', async ({
    request,
  }) => {
    const response = await request.patch('/api/admin/faq/1', {
      data: { answer: '답변', question: '질문' },
    });

    expect(response.status()).toBe(401);
  });
});
