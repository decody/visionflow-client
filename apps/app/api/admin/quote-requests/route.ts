import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springQuoteInquiryToIQuoteInquiry,
  type BackendPrincipal,
  type SpringQuoteInquiry,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 관리자 권한 게이트. NextAuth 세션 검증 후 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다.
 * (기존 GET은 Viewer 읽기도 허용했으나, Spring `/api/admin/**`는 ADMIN/SUPERADMIN 전용이라
 *  다른 이관 도메인과 동일하게 canManageContent로 통일한다.)
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

/** 관리자 견적 문의 목록. Spring `GET /api/admin/quote-inquiries`로 위임(status 필터 전달). */
export async function GET(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/admin/quote-inquiries${query ? `?${query}` : ''}`),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load quote inquiries.', response.status, body);
    }

    return NextResponse.json(
      (body as SpringQuoteInquiry[]).map(springQuoteInquiryToIQuoteInquiry),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach quote inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 관리자 상태/메모 갱신. Spring `PATCH /api/admin/quote-inquiries/{id}`로 위임.
 * 프론트는 `{ id, status?, admin_memo? }`를 보낸다. id는 경로로, admin_memo→adminMemo로 옮기고
 * 없는 필드는 생략한다(Spring은 status=null/adminMemo=null을 '변경 없음'으로 처리).
 */
export async function PATCH(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const payload = (await request.json()) as {
      admin_memo?: string | null;
      id?: number | string;
      status?: string;
    };
    const id = Number(payload.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return jsonError('id is required.', 400);
    }

    const response = await fetch(
      backendUrl(`/api/admin/quote-inquiries/${id}`),
      {
        body: JSON.stringify({
          adminMemo: payload.admin_memo,
          status: payload.status,
        }),
        headers: {
          ...backendAuthHeaders(gate),
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to update quote inquiry.', response.status, body);
    }

    return NextResponse.json(
      springQuoteInquiryToIQuoteInquiry(body as SpringQuoteInquiry),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach quote inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
