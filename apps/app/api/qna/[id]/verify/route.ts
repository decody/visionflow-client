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

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

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
  is_secret: row.is_secret ?? false,
  isSecret: row.is_secret ?? false,
  question: row.question ?? row.title ?? null,
  status: row.status ?? null,
  title: row.title ?? row.question ?? null,
  updated_at: row.updated_at,
  updatedAt: row.updated_at,
  view_count: row.view_count ?? 0,
  viewCount: row.view_count ?? 0,
});

async function isPasswordMatch(password: string, row: QnaRow) {
  if (row.password_hash) {
    return bcrypt.compare(password, row.password_hash);
  }

  return row.password === password;
}

const isProtectedQna = (row: QnaRow) =>
  row.is_secret === true ||
  Boolean(row.password_hash?.trim()) ||
  Boolean(row.password?.trim());

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = (await request.json()) as { password?: string };
  const password = payload.password?.trim();

  if (!id) {
    return jsonError('Q&A id is required.', 400);
  }

  if (!password) {
    return jsonError('password is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('qna')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return jsonError('Q&A not found.', 404, error?.message);
  }

  const row = data as QnaRow;
  const qna = toQna(row);

  if (!isProtectedQna(row)) {
    return NextResponse.json({ qna });
  }

  const matched = await isPasswordMatch(password, row);

  if (!matched) {
    return jsonError('Password does not match.', 403);
  }

  await supabaseAdmin
    .from('qna')
    .update({ view_count: (qna.view_count ?? 0) + 1 })
    .eq('id', id);

  return NextResponse.json({
    qna: {
      ...qna,
      view_count: (qna.view_count ?? 0) + 1,
      viewCount: (qna.view_count ?? 0) + 1,
    },
  });
}
