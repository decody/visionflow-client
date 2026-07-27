import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { backendUrl, readJson } from '@/lib/backend';

/**
 * 초대 수락(비밀번호 설정) — Spring `POST /api/auth/set-password`로 위임한다(비인증 공개 호출).
 * set-password 페이지가 초대 링크의 원문 토큰 + 새 비밀번호를 보내면, Spring 이 토큰을 검증하고
 * 비번을 설정·계정을 활성화한다. 기존 Supabase verifyOtp(confirm) + updateUser 흐름을 대체한다.
 *
 * <p>set-password 세그먼트에는 UI page.tsx 가 있어 같은 경로에 route.ts 를 둘 수 없으므로 별도 경로.
 */
export async function POST(request: NextRequest) {
  let payload: { token?: unknown; password?: unknown };

  try {
    payload = (await request.json()) as { token?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const token = typeof payload.token === 'string' ? payload.token : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!token || !password) {
    return NextResponse.json(
      { message: '토큰과 비밀번호가 필요합니다.' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(backendUrl('/api/auth/set-password'), {
      body: JSON.stringify({ password, token }),
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const body = await readJson(response);

    if (!response.ok) {
      const message =
        body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : '비밀번호 설정에 실패했습니다.';

      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: '인증 백엔드에 연결하지 못했습니다.' },
      { status: 502 },
    );
  }
}
