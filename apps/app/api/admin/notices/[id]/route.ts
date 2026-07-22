import type { ICreateNoticeRequest } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
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

/** 관리자 공지 단건 조회(비공개 포함). Spring `GET /api/admin/notices/{id}`로 위임. 없으면 404. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    const response = await fetch(backendUrl(`/api/admin/notices/${id}`), {
      cache: 'no-store',
      headers: backendAuthHeaders(gate),
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load notice.', response.status, body);
    }

    return NextResponse.json(springNoticeToINotice(body as SpringNotice));
  } catch (error) {
    return jsonError(
      'Failed to reach notice backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * 공지 수정(전체 교체). Spring `PUT /api/admin/notices/{id}`로 위임.
 * 프론트는 PATCH 관례를 유지하되 Spring 계약(PUT)으로 매핑한다. 없으면 Spring이 404.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;
    const payload = (await request.json()) as ICreateNoticeRequest;
    const title = payload.title?.trim();
    const description = payload.description?.trim();
    const contentHtml = payload.contentHtml?.trim();

    if (!id) {
      return jsonError('Notice id is required.', 400);
    }

    if (!title || !description || !contentHtml) {
      return jsonError(
        'title, description, and contentHtml are required.',
        400,
      );
    }

    const response = await fetch(backendUrl(`/api/admin/notices/${id}`), {
      body: JSON.stringify({
        category: normalizeNoticeCategory(payload.category),
        contentHtml,
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
      method: 'PUT',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to update notice.', response.status, body);
    }

    return NextResponse.json(springNoticeToINotice(body as SpringNotice));
  } catch (error) {
    return jsonError(
      'Failed to update notice.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/** 공지 삭제. Spring `DELETE /api/admin/notices/{id}`로 위임. 성공 시 204, 없으면 404. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await params;

    const response = await fetch(backendUrl(`/api/admin/notices/${id}`), {
      headers: backendAuthHeaders(gate),
      method: 'DELETE',
    });

    if (!response.ok) {
      const body = await readJson(response);

      return jsonError('Failed to delete notice.', response.status, body);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(
      'Failed to delete notice.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
