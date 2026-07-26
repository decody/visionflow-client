import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  type BackendPrincipal,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/** 콘텐츠 관리 권한 게이트(첨부 다운로드용). Spring 어드민 첨부 엔드포인트 호출에 실을 신원을 돌려준다. */
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
 * 첨부 다운로드 — Spring `GET /api/admin/quote-inquiries/{id}/attachment?index=`로 위임한다.
 * 파일 바이트를 그대로 스트리밍하고, Spring이 만든 Content-Disposition/Content-Type을 전달한다.
 * (기존 Supabase Storage 직접 다운로드를 대체.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  const { id } = await params;

  if (!id?.trim()) {
    return jsonError('id is required.', 400);
  }

  try {
    const index = request.nextUrl.searchParams.get('index') ?? '0';
    const response = await fetch(
      backendUrl(
        `/api/admin/quote-inquiries/${encodeURIComponent(
          id,
        )}/attachment?index=${encodeURIComponent(index)}`,
      ),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    if (!response.ok) {
      const body = await readJson(response);

      return jsonError(
        'Failed to download attachment file.',
        response.status,
        body,
      );
    }

    const headers = new Headers({
      'Cache-Control': 'private, max-age=0, no-store',
      'Content-Type':
        response.headers.get('content-type') ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    const disposition = response.headers.get('content-disposition');

    if (disposition) {
      headers.set('Content-Disposition', disposition);
    }

    return new NextResponse(response.body, { headers });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
