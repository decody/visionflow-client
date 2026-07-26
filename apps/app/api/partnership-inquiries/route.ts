import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springPartnershipToIPartnershipInquiry,
  type BackendPrincipal,
  type SpringPartnershipInquiry,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

// snake_case 필드명은 Spring multipart 컨트롤러(@RequestParam)와 정확히 일치한다. 배열/불리언 없음.
const SCALAR_FIELDS = [
  'company_name',
  'company_size',
  'contact_name',
  'contact_position',
  'contact_email',
  'contact_phone',
  'partnership_type',
  'proposal_content',
  'company_url',
];

/**
 * 관리자 권한 게이트. NextAuth 세션 검증 후 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다.
 * (기존 GET/PATCH은 로그인만 요구했으나, Spring `/api/admin/**`는 ADMIN/SUPERADMIN 전용이라
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

/** JSON 본문(snake_case)을 Spring multipart 접수 포맷으로 변환한다(제휴는 스칼라 필드만, 첨부 없음). */
const buildFormFromJson = (payload: Record<string, unknown>): FormData => {
  const form = new FormData();

  for (const key of SCALAR_FIELDS) {
    const value = payload[key];

    if (value !== undefined && value !== null) {
      form.set(key, String(value));
    }
  }

  return form;
};

/** 관리자 제휴 문의 목록. Spring `GET /api/admin/partnership-inquiries`로 위임(status 필터 전달). */
export async function GET(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(
        `/api/admin/partnership-inquiries${query ? `?${query}` : ''}`,
      ),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError(
        'Failed to load partnership inquiries.',
        response.status,
        body,
      );
    }

    return NextResponse.json(
      (body as SpringPartnershipInquiry[]).map(
        springPartnershipToIPartnershipInquiry,
      ),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach partnership inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 공개 제휴 문의 접수 — Spring `POST /api/partnership-inquiries`(multipart)로 위임한다. 인증 불필요.
 * multipart 요청은 첨부(File) 포함 그대로 포워딩, JSON 요청은 multipart 폼으로 변환해 단일 경로로 위임한다.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const body = contentType.includes('multipart/form-data')
      ? await request.formData()
      : buildFormFromJson((await request.json()) as Record<string, unknown>);

    // Content-Type은 fetch가 FormData 경계(boundary)와 함께 자동 설정하므로 지정하지 않는다.
    const response = await fetch(backendUrl('/api/partnership-inquiries'), {
      body,
      method: 'POST',
    });

    const data = await readJson(response);

    if (!response.ok) {
      return jsonError(
        'Failed to create partnership inquiry.',
        response.status,
        data,
      );
    }

    return NextResponse.json(
      springPartnershipToIPartnershipInquiry(data as SpringPartnershipInquiry),
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}

/**
 * 관리자 상태/메모 갱신. Spring `PATCH /api/admin/partnership-inquiries/{id}`로 위임.
 * 프론트는 `{ id, status?, admin_memo? }`를 보낸다. id(UUID)는 경로로, admin_memo→adminMemo로 옮기고
 * 없는 필드는 생략한다(Spring은 status=null/adminMemo=null을 '변경 없음'으로 처리).
 */
export async function PATCH(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const payload = (await request.json()) as {
      admin_memo?: string | null;
      id?: string;
      status?: string;
    };
    const id = payload.id?.trim();

    if (!id) {
      return jsonError('id is required.', 400);
    }

    const response = await fetch(
      backendUrl(`/api/admin/partnership-inquiries/${encodeURIComponent(id)}`),
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
      return jsonError(
        'Failed to update partnership inquiry.',
        response.status,
        body,
      );
    }

    return NextResponse.json(
      springPartnershipToIPartnershipInquiry(body as SpringPartnershipInquiry),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach partnership inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
