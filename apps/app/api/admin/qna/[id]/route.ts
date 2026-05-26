import type { IQna } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canDeleteQna, canManageContent } from '@/lib/admin-permissions';
import { incrementQnaViewCount } from '@/lib/qna-view-count';
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

const requireContentManager = async () => {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!canManageContent(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  return null;
};

const requireQnaDeleteManager = async () => {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!canDeleteQna(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  return null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireContentManager();

  if (authError) {
    return authError;
  }

  const { id } = await params;

  if (!id) {
    return jsonError('Q&A id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('qna')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return jsonError('Q&A not found.', 404, error?.message);
  }

  const qna = toQna(data as QnaRow);
  const viewCount = await incrementQnaViewCount(
    id,
    qna.view_count ?? qna.viewCount ?? 0,
  );

  return NextResponse.json({
    qna: {
      ...qna,
      view_count: viewCount,
      viewCount,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireQnaDeleteManager();

  if (authError) {
    return authError;
  }

  const { id } = await params;

  if (!id) {
    return jsonError('Q&A id is required.', 400);
  }

  const { error } = await supabaseAdmin.from('qna').delete().eq('id', id);

  if (error) {
    return jsonError('Failed to delete Q&A.', 500, error.message);
  }

  return NextResponse.json({ success: true });
}
