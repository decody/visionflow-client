import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  backendUrl,
  readJson,
  type SpringWork,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 공개 포트폴리오 work 단건 — Spring `GET /api/works/{id}`로 위임한다. 인증 불필요.
 * 없으면 Spring이 404를 주고, 그 상태를 그대로 전달한다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id?.trim()) {
    return jsonError('id is required.', 400);
  }

  try {
    const response = await fetch(
      backendUrl(`/api/works/${encodeURIComponent(id)}`),
      { cache: 'no-store' },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Work not found.', response.status, body);
    }

    return NextResponse.json(body as SpringWork);
  } catch (error) {
    return jsonError(
      'Failed to reach works backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
