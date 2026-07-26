import { expect, test } from '@playwright/test';

/**
 * 견적 문의(Quote Inquiry) API 라우트 통합 테스트.
 *
 * 프론트 견적 문의는 Supabase 직접 호출(REST + Storage + Resend)에서 Spring 백엔드로 이관됨(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server)
 *
 * 실행 전제: Next dev 서버(playwright webServer가 기동) + Spring 백엔드가 떠 있어야 함
 *   (백엔드 base URL은 API_BASE_URL, 기본값 http://localhost:8080).
 *   공개 접수 검증 테스트는 Spring 검증 응답에 의존하고(레코드 미생성),
 *   어드민 인증 테스트는 NextAuth만으로 성립한다.
 */

test.describe('public quote inquiry api', () => {
  // 필수 필드 없이 접수 → Spring 검증 실패(400). 프록시 전 구간을 타되 DB에 레코드를 남기지 않는다.
  test('POST /api/quote-inquiries with missing required fields returns 400', async ({
    request,
  }) => {
    const response = await request.post('/api/quote-inquiries', {
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('admin quote inquiry api requires authentication', () => {
  // 로그인 세션 없이 호출 → NextAuth 게이트웨이가 401 을 반환한다(Spring 도달 전 차단).
  test('GET /api/admin/quote-requests without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/quote-requests');

    expect(response.status()).toBe(401);
  });

  test('PATCH /api/admin/quote-requests without a session returns 401', async ({
    request,
  }) => {
    const response = await request.patch('/api/admin/quote-requests', {
      data: { id: 1, status: 'reviewing' },
    });

    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/quote-requests/reply without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/quote-requests/reply', {
      data: { inquiryId: 1, quoteContent: '견적 내용' },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /api/quote-inquiries/:id/attachment without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/quote-inquiries/1/attachment');

    expect(response.status()).toBe(401);
  });
});
