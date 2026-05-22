import type { ICreateNoticeRequest, INotice } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

type NoticeRow = {
  category: string | null;
  content_html: string | null;
  content_json: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
  date: string;
  description: string | null;
  id: string;
  is_important: boolean;
  is_published: boolean;
  title: string;
  updated_at: string;
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const toNotice = (row: NoticeRow): INotice => ({
  category: row.category ?? '',
  contentHtml: row.content_html,
  contentJson: row.content_json,
  createdAt: row.created_at,
  createdBy: row.created_by,
  date: row.date,
  description: row.description,
  id: row.id,
  isImportant: row.is_important,
  isPublished: row.is_published,
  title: row.title,
  updatedAt: row.updated_at,
});

const getToday = () => new Date().toISOString().slice(0, 10);

const noticeCategoryMap: Record<string, string> = {
  Event: '이벤트',
  Guide: '공지',
  Service: '서비스',
  Update: '업데이트',
  announcement: '공지',
  event: '이벤트',
  maintenance: '점검',
  service: '서비스',
  update: '업데이트',
};

const normalizeNoticeCategory = (category?: string | null) => {
  const trimmedCategory = category?.trim();

  if (!trimmedCategory) {
    return '공지';
  }

  return noticeCategoryMap[trimmedCategory] ?? trimmedCategory;
};

const getSessionUserId = async (email?: string | null) => {
  const normalizedEmail = email?.trim();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return (
    data.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail.toLowerCase(),
    )?.id ?? null
  );
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!canManageContent(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const payload = (await request.json()) as ICreateNoticeRequest;
    const title = payload.title?.trim();
    const description = payload.description?.trim();
    const contentHtml = payload.contentHtml?.trim();

    if (!title || !description || !contentHtml) {
      return jsonError(
        'title, description, and contentHtml are required.',
        400,
      );
    }

    const now = new Date().toISOString();
    const createdBy =
      payload.createdBy ?? (await getSessionUserId(session.user?.email));
    const { data, error } = await supabaseAdmin
      .from('notices')
      .insert({
        category: normalizeNoticeCategory(payload.category),
        content_html: contentHtml,
        content_json: payload.contentJson ?? null,
        created_at: payload.createdAt ?? now,
        created_by: createdBy,
        date: payload.date ?? getToday(),
        description,
        is_important: payload.isImportant ?? false,
        is_published: payload.isPublished ?? true,
        title,
        updated_at: payload.updatedAt ?? now,
      })
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to create notice.', 500, error.message);
    }

    return NextResponse.json(toNotice(data as NoticeRow), {
      status: 201,
    });
  } catch (error) {
    return jsonError(
      'Failed to create notice.',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
