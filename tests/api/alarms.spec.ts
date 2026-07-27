import { expect, test } from '@playwright/test';

/**
 * 관리자 알림(alarms) API 라우트 통합 테스트.
 *
 * 4개 소스(quick/partnership/quote/qna)의 미처리 항목 집계를 Supabase 직접 조회에서 Spring 으로 이관(BFF):
 *   브라우저 → Next API 라우트(같은 오리진) → Spring(visionflow-server, /api/admin/alarms)
 * Spring 이 UNION 집계한 원시 행을 반환하고, BFF 가 SLA·severity·카운트를 계산한다.
 *
 * 실행 전제: Next dev 서버(playwright webServer) + Spring 백엔드.
 *   알림 조회는 콘텐츠 관리자 전용이라 세션 없는 호출은 401(Spring 도달 전 NextAuth 게이트에서 차단).
 */

test.describe('admin alarms api requires authentication', () => {
  test('GET /api/admin/alarms without a session returns 401', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/alarms');

    expect(response.status()).toBe(401);
  });
});
