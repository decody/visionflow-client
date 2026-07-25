import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canDeleteQna, canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springQnaToIQna,
  type BackendPrincipal,
  type SpringQna,
} from '@/lib/backend';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/** 콘텐츠 관리 권한 게이트(조회용). */
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

/** 삭제 권한 게이트(Q&A 삭제는 SuperAdmin 전용 — canDeleteQna). Spring은 ADMIN/SUPERADMIN만 보므로 여기서 더 좁힌다. */
const requireDeleteManager = async (): Promise<
  BackendPrincipal | NextResponse
> => {
  const session = await auth();

  if (!session) return jsonError('Unauthorized', 401);

  const role = session.user?.role;
  const userId = session.user?.id;

  if (!canDeleteQna(role) || !role || !userId) {
    return jsonError('Forbidden', 403);
  }

  return { role, userId };
};

/**
 * 관리자 Q&A 단건 조회. Spring `GET /api/admin/qna/{id}`로 위임.
 * (기존 라우트는 관리자 조회 시 조회수를 올렸으나, Spring은 관리자 열람을 공개 조회수에 반영하지 않는다.)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Q&A id is required.', 400);
    }

    const response = await fetch(backendUrl(`/api/admin/qna/${id}`), {
      cache: 'no-store',
      headers: backendAuthHeaders(gate),
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Q&A not found.', response.status, body);
    }

    return NextResponse.json({ qna: springQnaToIQna(body as SpringQna) });
  } catch (error) {
    return jsonError(
      'Failed to reach Q&A backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/** Q&A 삭제(SuperAdmin 전용). Spring `DELETE /api/admin/qna/{id}`로 위임. 성공 시 { success: true }. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireDeleteManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Q&A id is required.', 400);
    }

    const response = await fetch(backendUrl(`/api/admin/qna/${id}`), {
      headers: backendAuthHeaders(gate),
      method: 'DELETE',
    });

    if (!response.ok) {
      const body = await readJson(response);

      return jsonError('Failed to delete Q&A.', response.status, body);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(
      'Failed to delete Q&A.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
