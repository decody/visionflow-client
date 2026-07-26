import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canManageUsers } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springUserToIUser,
  type BackendPrincipal,
  type SpringUser,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ details, message }, { status });

/** 사용자 관리 권한 게이트 — SuperAdmin 전용. Spring 호출에 실을 신원을 돌려준다. */
const requireSuperAdmin = async (): Promise<BackendPrincipal | NextResponse> => {
  const session = await auth();

  if (!session) return jsonError('Unauthorized', 401);

  const role = session.user?.role;
  const userId = session.user?.id;

  if (!canManageUsers(role) || !role || !userId) {
    return jsonError('Forbidden', 403);
  }

  return { role, userId };
};

/** 사용자 단건 조회 — Spring `GET /api/admin/users/{id}`로 위임한다. 없으면 404 전달. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('User id is required.', 400);
    }

    const response = await fetch(
      backendUrl(`/api/admin/users/${encodeURIComponent(id)}`),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('User not found.', response.status, body);
    }

    return NextResponse.json(springUserToIUser(body as SpringUser));
  } catch (error) {
    return jsonError(
      'Failed to reach users backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 역할/상태 갱신 — Spring `PATCH /api/admin/users/{id}`로 위임한다.
 * 프론트는 `{ role?, status? }`(role은 UI 어휘)를 보내고, 그대로 전달한다(없는 필드는 '변경 없음').
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('User id is required.', 400);
    }

    const payload = (await request.json()) as {
      role?: string;
      status?: string;
    };

    const response = await fetch(
      backendUrl(`/api/admin/users/${encodeURIComponent(id)}`),
      {
        body: JSON.stringify({ role: payload.role, status: payload.status }),
        headers: {
          ...backendAuthHeaders(gate),
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to update user.', response.status, body);
    }

    return NextResponse.json(springUserToIUser(body as SpringUser));
  } catch (error) {
    return jsonError(
      'Failed to reach users backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 사용자 삭제 — Spring `DELETE /api/admin/users/{id}`로 위임한다(성공 시 204).
 * Spring 204(빈 본문)를 `{ success: true }`로 감싸 반환한다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireSuperAdmin();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('User id is required.', 400);
    }

    const response = await fetch(
      backendUrl(`/api/admin/users/${encodeURIComponent(id)}`),
      { headers: backendAuthHeaders(gate), method: 'DELETE' },
    );

    if (!response.ok) {
      const body = await readJson(response);

      return jsonError('Failed to delete user.', response.status, body);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(
      'Failed to reach users backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
