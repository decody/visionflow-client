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
 * 비밀글 열람 — Spring `POST /api/qna/{id}/verify`로 위임한다. 인증 불필요.
 * 비밀번호 일치 시 전체 + 조회수 증가, 불일치 403, 없으면 404. 응답은 기존 계약대로 { qna } 로 감싼다.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as { password?: string };
    const password = payload.password?.trim();

    if (!id) {
      return jsonError('Q&A id is required.', 400);
    }

    if (!password) {
      return jsonError('password is required.', 400);
    }

    const response = await fetch(backendUrl(`/api/qna/${id}/verify`), {
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Password does not match.', response.status, body);
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
