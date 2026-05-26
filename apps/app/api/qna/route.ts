import type { IQna } from '@visionflow/shared';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';

type QnaRow = {
  answer?: string | null;
  author_name?: string | null;
  category?: string | null;
  content?: string | null;
  created_at?: string;
  id: string | number;
  is_notice?: boolean | null;
  is_secret?: boolean | null;
  password?: string | null;
  password_hash?: string | null;
  question?: string | null;
  status?: string | null;
  title?: string | null;
  updated_at?: string;
  view_count?: number | null;
};

type QnaInsertPayload = {
  author_name: string;
  category?: string;
  content: string;
  created_at: string;
  is_notice: boolean;
  is_secret: boolean;
  password_hash?: string | null;
  question?: string;
  status: string;
  title: string;
  updated_at: string;
  view_count: number;
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const isMissingColumnError = (error: { message?: string } | null) => {
  const message = error?.message?.toLowerCase() ?? '';

  return (
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('could not find')
  );
};

const isMissingPasswordHashError = (
  error: { message?: string } | null,
) => error?.message?.toLowerCase().includes('password_hash') ?? false;

const insertQna = (payload: QnaInsertPayload) =>
  supabaseAdmin.from('qna').insert(payload).select('*').single();

const isProtectedQna = (row: QnaRow) =>
  row.is_secret === true ||
  Boolean(row.password_hash?.trim()) ||
  Boolean(row.password?.trim());

const toQna = (row: QnaRow): IQna => ({
  answer: row.answer ?? null,
  author_name: row.author_name ?? null,
  authorName: row.author_name ?? null,
  category: row.category ?? null,
  content: row.content ?? null,
  created_at: row.created_at,
  createdAt: row.created_at,
  id: String(row.id),
  is_notice: row.is_notice ?? false,
  isNotice: row.is_notice ?? false,
  is_secret: isProtectedQna(row),
  isSecret: isProtectedQna(row),
  question: row.question ?? row.title ?? null,
  status: row.status ?? null,
  title: row.title ?? row.question ?? null,
  updated_at: row.updated_at,
  updatedAt: row.updated_at,
  view_count: row.view_count ?? 0,
  viewCount: row.view_count ?? 0,
});

const redactSecretQna = (qna: IQna): IQna => {
  if (!qna.is_secret && !qna.isSecret) {
    return qna;
  }

  return {
    ...qna,
    answer: null,
    content: null,
    question: qna.title ?? qna.question,
  };
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.max(0, Number(searchParams.get('limit') ?? 10));
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0));
  const noticeOnly = searchParams.get('notice') === 'true';

  if (limit === 0) {
    return NextResponse.json({
      data: [],
      limit,
      offset,
      total_count: 0,
    });
  }

  let query = supabaseAdmin
    .from('qna')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  query = noticeOnly
    ? query.eq('is_notice', true)
    : query.or('is_notice.is.false,is_notice.is.null');

  const { count, data, error } = await query;

  if (error) {
    return jsonError('Failed to fetch Q&A list.', 500, error.message);
  }

  const qnas = ((data ?? []) as QnaRow[])
    .map(toQna)
    .map(redactSecretQna);

  return NextResponse.json({
    data: qnas,
    limit,
    offset,
    total_count: count ?? offset + qnas.length,
  });
}

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
    const author = (
      payload.author ??
      payload.authorName ??
      ''
    ).trim();
    const category = payload.category?.trim();
    const content = payload.content?.trim();
    const isSecret = payload.isSecret === true;
    const password = payload.password?.trim();
    const title = payload.title?.trim();

    if (!author || !category || !title || !content) {
      return jsonError(
        'author, category, title, and content are required.',
        400,
      );
    }

    if (isSecret && !password) {
      return jsonError('password is required for secret Q&A.', 400);
    }

    const now = new Date().toISOString();
    const passwordHash =
      isSecret && password ? await bcrypt.hash(password, 12) : null;
    const insertPayload: QnaInsertPayload = {
      author_name: author,
      category,
      content,
      created_at: now,
      is_notice: false,
      is_secret: isSecret,
      password_hash: passwordHash,
      question: title,
      status: 'pending',
      title,
      updated_at: now,
      view_count: 0,
    };

    let { data, error } = await insertQna(insertPayload);

    if (error && isMissingColumnError(error)) {
      const { category: _category, ...payloadWithoutCategory } =
        insertPayload;

      ({ data, error } = await insertQna(payloadWithoutCategory));
    }

    if (
      error &&
      isMissingColumnError(error) &&
      !isMissingPasswordHashError(error)
    ) {
      const {
        category: _category,
        question: _question,
        ...payloadWithoutCategoryAndQuestion
      } = insertPayload;

      ({ data, error } = await insertQna(
        payloadWithoutCategoryAndQuestion,
      ));
    }

    if (error && isMissingColumnError(error) && !isSecret) {
      const {
        category: _category,
        password_hash: _passwordHash,
        question: _question,
        ...minimalPayload
      } = insertPayload;

      ({ data, error } = await insertQna(minimalPayload));
    }

    if (error && isMissingColumnError(error) && isSecret) {
      return jsonError(
        '비밀글 비밀번호 저장 컬럼이 아직 DB에 없습니다. supabase/migrations/202605260001_add_qna_password_hash.sql 마이그레이션을 먼저 적용해 주세요.',
        500,
        error.message,
      );
    }

    if (error) {
      return jsonError('Failed to create Q&A.', 500, error.message);
    }

    return NextResponse.json(redactSecretQna(toQna(data as QnaRow)), {
      status: 201,
    });
  } catch (error) {
    return jsonError(
      'Failed to create Q&A.',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
