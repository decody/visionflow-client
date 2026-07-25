import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  backendUrl,
  readJson,
  springQnaToIQna,
  type SpringQna,
  type SpringQnaPage,
} from '@/lib/backend';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/**
 * 공개 Q&A 목록 — Spring `GET /api/qna`(페이징/공지필터/비밀글 redaction)로 위임한다. 인증 불필요.
 * 브라우저는 Supabase 대신 이 같은 오리진 라우트를 호출한다(BFF). notice/limit/offset은 그대로 전달.
 */
export async function GET(request: NextRequest) {
  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/qna${query ? `?${query}` : ''}`),
      { cache: 'no-store' },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to fetch Q&A list.', response.status, body);
    }

    const page = body as SpringQnaPage;

    return NextResponse.json({
      data: (page.data ?? []).map(springQnaToIQna),
      limit: page.limit,
      offset: page.offset,
      total_count: page.totalCount,
    });
  } catch (error) {
    return jsonError(
      'Failed to reach Q&A backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}

/** Q&A 작성. Spring `POST /api/qna`로 위임. 비밀글이면 password 필수(Spring이 bcrypt 저장). */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      author?: string;
      authorName?: string;
      category?: string;
      content?: string;
      isSecret?: boolean;
      password?: string | null;
      title?: string;
    };
    const authorName = (payload.author ?? payload.authorName ?? '').trim();
    const category = payload.category?.trim();
    const content = payload.content?.trim();
    const title = payload.title?.trim();
    const isSecret = payload.isSecret === true;
    const password = payload.password?.trim();

    if (!authorName || !category || !title || !content) {
      return jsonError(
        'author, category, title, and content are required.',
        400,
      );
    }

    if (isSecret && !password) {
      return jsonError('password is required for secret Q&A.', 400);
    }

    const response = await fetch(backendUrl('/api/qna'), {
      body: JSON.stringify({
        authorName,
        category,
        content,
        isSecret,
        password: isSecret ? password : undefined,
        title,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to create Q&A.', response.status, body);
    }

    return NextResponse.json(springQnaToIQna(body as SpringQna), {
      status: 201,
    });
  } catch (error) {
    return jsonError(
      'Failed to create Q&A.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
