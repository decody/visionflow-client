import type { ICreateFaqRequest, IFaq } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

type FaqRow = {
  answer: string;
  category: string | null;
  created_at: string;
  id: number;
  is_visible: boolean;
  question: string;
  updated_at: string;
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const toFaq = (row: FaqRow): IFaq => ({
  answer: row.answer,
  category: row.category,
  created_at: row.created_at,
  createdAt: row.created_at,
  id: row.id,
  is_visible: row.is_visible,
  isVisible: row.is_visible,
  question: row.question,
  updated_at: row.updated_at,
  updatedAt: row.updated_at,
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!canManageContent(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const payload = (await request.json()) as ICreateFaqRequest;
    const question = payload.question?.trim();
    const answer = payload.answer?.trim();

    if (!question || !answer) {
      return jsonError('question and answer are required.', 400);
    }

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('faq')
      .insert({
        answer,
        category: payload.category?.trim() || 'default',
        created_at: payload.created_at ?? payload.createdAt ?? now,
        is_visible: payload.is_visible ?? payload.isVisible ?? false,
        question,
        updated_at: payload.updated_at ?? payload.updatedAt ?? now,
      })
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to create FAQ.', 500, error.message);
    }

    return NextResponse.json(toFaq(data as FaqRow), { status: 201 });
  } catch (error) {
    return jsonError(
      'Failed to create FAQ.',
      500,
      error instanceof Error ? error.message : error,
    );
  }
}
