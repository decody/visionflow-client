import { NextResponse } from 'next/server';

import {
  backendUrl,
  readJson,
  springFaqToIFaq,
  type SpringFaq,
} from '@/lib/backend';

/**
 * 공개 FAQ 목록 — Spring `GET /api/faq`(is_visible=true 만)로 위임한다. 인증 불필요.
 * 브라우저는 Supabase 대신 이 같은 오리진 라우트를 호출한다(BFF).
 */
export async function GET() {
  try {
    const response = await fetch(backendUrl('/api/faq'), {
      cache: 'no-store',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { details: body, message: 'Failed to load FAQ.' },
        { status: response.status },
      );
    }

    const rows = (body ?? []) as SpringFaq[];

    return NextResponse.json(rows.map(springFaqToIFaq));
  } catch (error) {
    return NextResponse.json(
      {
        details: error instanceof Error ? error.message : error,
        message: 'Failed to reach FAQ backend.',
      },
      { status: 502 },
    );
  }
}
