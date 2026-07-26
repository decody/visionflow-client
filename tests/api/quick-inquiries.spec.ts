import { expect, test } from '@playwright/test';

/**
 * 빠른 문의(Quick Inquiry) API 라우트 통합 테스트.
 *
 * 프론트 빠른 문의는 Supabase 직접 호출(REST + Resend)에서 Spring 백엔드로 이관됨(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server)
 *
 * 실행 전제: Next dev 서버(playwright webServer가 기동) + Spring 백엔드가 떠 있어야 함
 *   (백엔드 base URL은 API_BASE_URL, 기본값 http://localhost:8080).
 *   공개 접수 검증 테스트는 Spring 검증 응답에 의존하고(레코드 미생성),
 *   어드민 인증 테스트는 NextAuth만으로 성립한다.
 *
 * 참고: 첨부 없음(JSON only), 별도 상태 PATCH 없음(답장 시 completed 확정).
 */

test.describe('public quick inquiry api', () => {
  // 필수 필드 없이 접수 → Spring 검증 실패(400). 프록시 전 구간을 타되 DB에 레코드를 남기지 않는다.
  test('POST /api/quick-inquiries with missing required fields returns 400', async ({
    request,
  }) => {
    const response = await request.post('/api/quick-inquiries', {
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('admin quick inquiry api requires authentication', () => {
  // 로그인 세션 없이 호출 → NextAuth 게이트웨이가 401 을 반환한다(Spring 도달 전 차단).
  test('GET /api/quick-inquiries without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/quick-inquiries');

    expect(response.status()).toBe(401);
  });

  test('POST /api/admin/quick-inquiries/reply without a session returns 401', async ({
    request,
  }) => {
    const response = await request.post('/api/admin/quick-inquiries/reply', {
      data: {
        inquiryId: '11111111-1111-1111-1111-111111111111',
        replyContent: '답장 내용',
      },
    });

    expect(response.status()).toBe(401);
  });
});
