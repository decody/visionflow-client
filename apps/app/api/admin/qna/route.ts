import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springQnaToIQna,
  type BackendPrincipal,
  type SpringQnaPage,
} from '@/lib/backend';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 관리자 권한 게이트. NextAuth 세션 검증 후 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다.
 * Spring도 Bearer JWT를 재검증한다(BFF 게이트 + Spring Security 이중 방어). FAQ/notices와 동일 패턴.
 */
const requireManager = async (): Promise<BackendPrincipal | NextResponse> => {
  const session = await auth();

  if (!session) return jsonError('Unauthorized', 401);

  const role = session.user?.role;
  const userId = session.user?.id;

  if (!canManageContent(role) || !role || !userId) {
    return jsonError('Forbidden', 403);
  }

  return { role, userId };
};

/**
 * 관리자 Q&A 목록(비밀글 포함). Spring `GET /api/admin/qna`로 위임.
 * status/secret/q/limit/offset 필터는 그대로 전달(동일 파라미터명).
 */
export async function GET(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/admin/qna${query ? `?${query}` : ''}`),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to fetch Q&A list.', response.status, body);
    }

    const page = body as SpringQnaPage;

    return NextResponse.json({
      data: (page.data ?? []).map(springQnaToIQna),
      limit: page.limit,
      offset: page.offset,
      total_count: page.totalCount,
    });
  } catch (error) {
    return jsonError(
      'Failed to reach Q&A backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
