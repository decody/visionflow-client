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
 * 공개 포트폴리오 works 목록 — Spring `GET /api/works`로 위임한다. 인증 불필요.
 * 기존엔 브라우저가 Supabase REST를 직접 호출(apiClient)했으나, 이제 같은 오리진 Next 라우트가 Spring에 위임한다(BFF).
 * Spring 응답(camelCase, roles=콤마문자열)은 프론트 소비 형태와 동일해 변환 없이 그대로 전달한다.
 */
export async function GET(request: NextRequest) {
  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/works${query ? `?${query}` : ''}`),
      { cache: 'no-store' },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to fetch works.', response.status, body);
    }

    return NextResponse.json((body ?? []) as SpringWork[]);
  } catch (error) {
    return jsonError(
      'Failed to reach works backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
