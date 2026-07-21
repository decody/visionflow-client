import type { ICreateFaqRequest } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springFaqToIFaq,
  type BackendPrincipal,
  type SpringFaq,
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

/**
 * FAQ 수정(전체 교체). Spring `PUT /api/admin/faq/{id}`로 위임.
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
    const payload = (await request.json()) as ICreateFaqRequest;
    const question = payload.question?.trim();
    const answer = payload.answer?.trim();

    if (!id) {
      return jsonError('FAQ id is required.', 400);
    }

    if (!question || !answer) {
      return jsonError('question and answer are required.', 400);
    }

    const response = await fetch(backendUrl(`/api/admin/faq/${id}`), {
      body: JSON.stringify({
        answer,
        category: payload.category?.trim() || 'default',
        isVisible: payload.is_visible ?? payload.isVisible ?? false,
        question,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...backendAuthHeaders(gate),
      },
      method: 'PUT',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to update FAQ.', response.status, body);
    }

    return NextResponse.json(springFaqToIFaq(body as SpringFaq));
  } catch (error) {
    return jsonError(
      'Failed to update FAQ.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
