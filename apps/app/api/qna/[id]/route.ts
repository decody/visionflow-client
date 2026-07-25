import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  backendUrl,
  readJson,
  springQnaToIQna,
  type SpringQna,
} from '@/lib/backend';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 공개 Q&A 단건 조회 — Spring `GET /api/qna/{id}`로 위임한다. 인증 불필요.
 * 공개글은 전체 + 조회수 증가, 비밀글은 프리뷰 + requiresPassword=true. 없으면 Spring이 404.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Q&A id is required.', 400);
    }

    const response = await fetch(backendUrl(`/api/qna/${id}`), {
      cache: 'no-store',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Q&A not found.', response.status, body);
    }

    const detail = body as { qna: SpringQna; requiresPassword: boolean };

    return NextResponse.json({
      qna: springQnaToIQna(detail.qna),
      requiresPassword: detail.requiresPassword,
    });
  } catch (error) {
    return jsonError(
      'Failed to reach Q&A backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
