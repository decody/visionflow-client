import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
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
 * work 수정(전체 교체) — Spring `PUT /api/admin/works/{id}`로 위임한다.
 * 프론트는 PATCH로 전체 필드를 보내므로(전체 교체 방식) Spring PUT에 그대로 매핑한다.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Work id is required.', 400);
    }

    const payload = (await request.json()) as Record<string, unknown>;

    const response = await fetch(
      backendUrl(`/api/admin/works/${encodeURIComponent(id)}`),
      {
        body: JSON.stringify(payload),
        headers: {
          ...backendAuthHeaders(gate),
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to update work.', response.status, body);
    }

    return NextResponse.json(body as SpringWork);
  } catch (error) {
    return jsonError(
      'Failed to reach works backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * work 삭제 — Spring `DELETE /api/admin/works/{id}`로 위임한다(성공 시 204).
 * 프론트 requestWorkWrite가 응답 본문을 JSON 파싱하므로, 204(빈 본문)를 `{ success: true }`로 감싸 반환한다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Work id is required.', 400);
    }

    const response = await fetch(
      backendUrl(`/api/admin/works/${encodeURIComponent(id)}`),
      { headers: backendAuthHeaders(gate), method: 'DELETE' },
    );

    if (!response.ok) {
      const body = await readJson(response);

      return jsonError('Failed to delete work.', response.status, body);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(
      'Failed to reach works backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
