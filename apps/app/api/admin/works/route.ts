import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  type BackendPrincipal,
  type SpringWork,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ details, message }, { status });

/** 관리자 권한 게이트. NextAuth 세션 검증 후 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다. */
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
 * work 생성 — Spring `POST /api/admin/works`로 위임한다. 기존 supabaseAdmin 직접 쓰기를 대체.
 * 프론트가 보내는 camelCase 페이로드(category/industry/title/size/roles(콤마문자열)/image/linkLabel/linkUrl)는
 * Spring WorkWriteRequest 필드명과 동일하므로 그대로 전달한다(검증/roles 정규화는 Spring이 수행).
 */
export async function POST(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const response = await fetch(backendUrl('/api/admin/works'), {
      body: JSON.stringify(payload),
      headers: {
        ...backendAuthHeaders(gate),
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to create work.', response.status, body);
    }

    return NextResponse.json(body as SpringWork, { status: 201 });
  } catch (error) {
    return jsonError(
      'Failed to reach works backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
