import type { ICreateNoticeRequest } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springNoticeToINotice,
  type BackendPrincipal,
  type SpringNotice,
} from '@/lib/backend';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 관리자 권한 게이트. NextAuth 세션을 검증하고, 통과 시 Spring 호출에 서명해 실을
 * 사용자 신원(userId/role)을 돌려준다. Spring도 이 신원이 담긴 Bearer JWT를 재검증한다
 * (BFF 게이트 + Spring Security 이중 방어). FAQ 라우트와 동일 패턴.
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

// 프론트 카테고리 라벨(영문/한글 혼재)을 한글로 정규화한 뒤 Spring에 전달한다.
const noticeCategoryMap: Record<string, string> = {
  Event: '이벤트',
  Guide: '공지',
  Service: '서비스',
  Update: '업데이트',
  announcement: '공지',
  event: '이벤트',
  maintenance: '점검',
  service: '서비스',
  update: '업데이트',
};

const normalizeNoticeCategory = (category?: string | null) => {
  const trimmedCategory = category?.trim();

  if (!trimmedCategory) {
    return '공지';
  }

  return noticeCategoryMap[trimmedCategory] ?? trimmedCategory;
};

/** 관리자 공지 전체 목록(비공개 포함). Spring `GET /api/admin/notices`로 위임(category/keyword 전달). */
export async function GET(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/admin/notices${query ? `?${query}` : ''}`),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load notices.', response.status, body);
    }

    const rows = (body ?? []) as SpringNotice[];

    return NextResponse.json(rows.map(springNoticeToINotice));
  } catch (error) {
    return jsonError(
      'Failed to reach notice backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/** 공지 생성. Spring `POST /api/admin/notices`로 위임. 타임스탬프는 DB가 소유(전달하지 않음). */
export async function POST(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const payload = (await request.json()) as ICreateNoticeRequest;
    const title = payload.title?.trim();
    const description = payload.description?.trim();
    const contentHtml = payload.contentHtml?.trim();

    if (!title || !description || !contentHtml) {
      return jsonError(
        'title, description, and contentHtml are required.',
        400,
      );
    }

    const response = await fetch(backendUrl('/api/admin/notices'), {
      body: JSON.stringify({
        category: normalizeNoticeCategory(payload.category),
        contentHtml,
        createdBy: gate.userId,
        date: payload.date,
        description,
        isImportant: payload.isImportant ?? false,
        isPublished: payload.isPublished ?? true,
        title,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...backendAuthHeaders(gate),
      },
      method: 'POST',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to create notice.', response.status, body);
    }

    return NextResponse.json(
      springNoticeToINotice(body as SpringNotice),
      { status: 201 },
    );
  } catch (error) {
    return jsonError(
      'Failed to create notice.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
