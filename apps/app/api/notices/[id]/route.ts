import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  backendUrl,
  readJson,
  springNoticeToINotice,
  type SpringNotice,
} from '@/lib/backend';

/**
 * 공개 공지 단건 조회 — Spring `GET /api/notices/{id}`로 위임한다. 인증 불필요.
 * 없으면 Spring이 404를 반환한다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const response = await fetch(backendUrl(`/api/notices/${id}`), {
      cache: 'no-store',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return NextResponse.json(
        { details: body, message: 'Failed to load notice.' },
        { status: response.status },
      );
    }

    return NextResponse.json(springNoticeToINotice(body as SpringNotice));
  } catch (error) {
    return NextResponse.json(
      {
        details: error instanceof Error ? error.message : error,
        message: 'Failed to reach notice backend.',
      },
      { status: 502 },
    );
  }
}
