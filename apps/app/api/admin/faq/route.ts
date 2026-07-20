import type { ICreateFaqRequest } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendUrl,
  readJson,
  springFaqToIFaq,
  type SpringFaq,
} from '@/lib/backend';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 관리자 권한 게이트. Spring 어드민 API는 아직 미인증이므로, 이 NextAuth 검사가
 * 사실상의 인가 경계다(3단계 Spring Security 이관 전까지).
 */
const requireManager = async (): Promise<NextResponse | null> => {
  const session = await auth();

  if (!session) return jsonError('Unauthorized', 401);
  if (!canManageContent(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  return null;
};

/** 관리자 FAQ 전체 목록(숨김 포함). Spring `GET /api/admin/faq`로 위임(category/keyword 전달). */
export async function GET(request: NextRequest) {
  const denied = await requireManager();

  if (denied) return denied;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/admin/faq${query ? `?${query}` : ''}`),
      { cache: 'no-store' },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load FAQ list.', response.status, body);
    }

    const rows = (body ?? []) as SpringFaq[];

    return NextResponse.json(rows.map(springFaqToIFaq));
  } catch (error) {
    return jsonError(
      'Failed to reach FAQ backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/** FAQ 생성. Spring `POST /api/admin/faq`로 위임. 타임스탬프는 DB가 소유(전달하지 않음). */
export async function POST(request: NextRequest) {
  const denied = await requireManager();

  if (denied) return denied;

  try {
    const payload = (await request.json()) as ICreateFaqRequest;
    const question = payload.question?.trim();
    const answer = payload.answer?.trim();

    if (!question || !answer) {
      return jsonError('question and answer are required.', 400);
    }

    const response = await fetch(backendUrl('/api/admin/faq'), {
      body: JSON.stringify({
        answer,
        category: payload.category?.trim() || 'default',
        isVisible: payload.is_visible ?? payload.isVisible ?? false,
        question,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to create FAQ.', response.status, body);
    }

    return NextResponse.json(springFaqToIFaq(body as SpringFaq), {
      status: 201,
    });
  } catch (error) {
    return jsonError(
      'Failed to create FAQ.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
