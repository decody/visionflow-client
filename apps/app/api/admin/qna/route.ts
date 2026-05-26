import type { IQna } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
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

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!canManageContent(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Number(searchParams.get('limit') ?? 100));
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0));
  const status = searchParams.get('status');
  const secret = searchParams.get('secret');
  const keyword = searchParams.get('q')?.trim();
  const normalizedKeyword = keyword?.toLowerCase();

  const query = supabaseAdmin
    .from('qna')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { count, data, error } = await query;

  if (error) {
    return jsonError('Failed to fetch Q&A list.', 500, error.message);
  }

  const qnas = ((data ?? []) as QnaRow[])
    .map(toQna)
    .filter((qna) => qna.is_notice !== true && qna.isNotice !== true)
    .filter((qna) => {
      if (status && status !== 'all' && qna.status !== status) {
        return false;
      }

      if (secret === 'true' && qna.is_secret !== true && qna.isSecret !== true) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      return [
        qna.title,
        qna.question,
        qna.content,
        qna.author_name,
        qna.authorName,
        qna.category,
      ].some((value) => value?.toLowerCase().includes(normalizedKeyword));
    });

  return NextResponse.json({
    data: qnas,
    limit,
    offset,
    total_count: count ?? qnas.length,
  });
}
