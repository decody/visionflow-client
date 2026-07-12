import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

type WorkRow = {
  category: string;
  created_at: string;
  id: string | number;
  image: string | null;
  industry: string;
  is_important: boolean | null;
  link_label: string | null;
  link_url: string | null;
  roles: string | null;
  size: string;
  title: string;
};

type WorkPayload = {
  category?: string;
  image?: string | null;
  industry?: string;
  isImportant?: boolean;
  is_important?: boolean;
  linkLabel?: string | null;
  linkUrl?: string | null;
  link_label?: string | null;
  link_url?: string | null;
  roles?: string | string[];
  size?: string;
  title?: string;
};

const jsonError = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ details, message }, { status });

const toWork = (row: WorkRow) => ({
  category: row.category,
  createdAt: row.created_at,
  id: String(row.id),
  image: row.image,
  industry: row.industry,
  isImportant: row.is_important ?? false,
  linkLabel: row.link_label,
  linkUrl: row.link_url,
  roles: row.roles ?? '',
  size: row.size,
  title: row.title,
});

const normalizeRoles = (roles: WorkPayload['roles']) => {
  if (Array.isArray(roles)) {
    return roles.map((role) => role.trim()).filter(Boolean).join(', ');
  }

  return typeof roles === 'string' ? roles.trim() : '';
};

const buildWritePayload = (payload: WorkPayload) => {
  const category = payload.category?.trim();
  const industry = payload.industry?.trim();
  const title = payload.title?.trim();
  const size = payload.size?.trim();

  if (!category || !industry || !title || !size) {
    return null;
  }

  const linkUrl = payload.linkUrl ?? payload.link_url;
  const linkLabel = payload.linkLabel ?? payload.link_label;
  const isImportant = payload.isImportant ?? payload.is_important;

  return {
    category,
    image: payload.image?.trim() || null,
    industry,
    is_important: isImportant ?? false,
    link_label: linkLabel?.trim() || null,
    link_url: linkUrl?.trim() || null,
    roles: normalizeRoles(payload.roles),
    size,
    title,
  };
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
    const payload = (await request.json()) as WorkPayload;
    const writePayload = buildWritePayload(payload);

    if (!writePayload) {
      return jsonError(
        'category, industry, title and size are required.',
        400,
      );
    }

    const { data, error } = await supabaseAdmin
      .from('works')
      .insert(writePayload)
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to create work.', 500, error.message);
    }

    return NextResponse.json(toWork(data as WorkRow), { status: 201 });
  } catch (error) {
    return jsonError(
      'Failed to create work.',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
