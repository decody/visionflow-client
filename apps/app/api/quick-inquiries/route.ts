import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springQuickToIQuickInquiry,
  type BackendPrincipal,
  type SpringQuickInquiry,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 관리자 권한 게이트. NextAuth 세션 검증 후 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다.
 * (기존 GET은 로그인만 요구했으나, Spring `/api/admin/**`는 ADMIN/SUPERADMIN 전용이라
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

/** 관리자 빠른 문의 목록. Spring `GET /api/admin/quick-inquiries`로 위임(status 필터 전달). */
export async function GET(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/admin/quick-inquiries${query ? `?${query}` : ''}`),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load quick inquiries.', response.status, body);
    }

    return NextResponse.json(
      (body as SpringQuickInquiry[]).map(springQuickToIQuickInquiry),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach quick inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 빠른 문의 접수 — Spring `POST /api/quick-inquiries`(JSON)로 위임한다. 인증 불필요, 첨부 없음.
 * 프론트가 보내는 `{ name, email, subject, content }`는 Spring DTO 필드명과 동일하므로 그대로 전달한다.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      content?: string;
      email?: string;
      name?: string;
      subject?: string | null;
    };

    const response = await fetch(backendUrl('/api/quick-inquiries'), {
      body: JSON.stringify({
        content: payload.content,
        email: payload.email,
        name: payload.name,
        subject: payload.subject,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const data = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to create quick inquiry.', response.status, data);
    }

    return NextResponse.json(
      springQuickToIQuickInquiry(data as SpringQuickInquiry),
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
