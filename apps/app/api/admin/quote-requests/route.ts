import type { IQuoteInquiry, QuoteInquiryStatus } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import {
  ADMIN_PAGE_ROLES,
  CONTENT_MANAGER_ROLES,
  hasAllowedRole,
} from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const STATUS_VALUES: QuoteInquiryStatus[] = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
];
const MAX_MEMO_LENGTH = 5000;

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const getSessionRole = async () => {
  const session = await auth();

  return {
    role: session?.user?.role,
    session,
  };
};

const parseId = (value?: string | number | null) => {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getStatusTimestamps = (status: QuoteInquiryStatus) => {
  const now = new Date().toISOString();

  if (status === 'approved' || status === 'rejected') {
    return {
      completed_at: now,
      contacted_at: now,
    };
  }

  if (status === 'reviewing') {
    return {
      contacted_at: now,
    };
  }

  return {};
};

export async function GET() {
  const { role, session } = await getSessionRole();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!hasAllowedRole(role, ADMIN_PAGE_ROLES)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('quote_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return jsonError('Failed to load quote inquiries.', 502, error);
    }

    return NextResponse.json((data ?? []) as IQuoteInquiry[]);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { role, session } = await getSessionRole();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!hasAllowedRole(role, CONTENT_MANAGER_ROLES)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const body = (await request.json()) as {
      admin_memo?: string | null;
      id?: number | string;
      status?: QuoteInquiryStatus;
    };
    const id = parseId(body.id);

    if (!id) {
      return jsonError('id is required.', 400);
    }

    const updates: Partial<IQuoteInquiry> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!STATUS_VALUES.includes(body.status)) {
        return jsonError('Invalid status.', 400);
      }

      updates.status = body.status;
      Object.assign(updates, getStatusTimestamps(body.status));
    }

    if (body.admin_memo !== undefined) {
      const adminMemo = body.admin_memo?.trim() || null;

      if (adminMemo && adminMemo.length > MAX_MEMO_LENGTH) {
        return jsonError(
          `admin_memo must be ${MAX_MEMO_LENGTH} characters or fewer.`,
          400,
        );
      }

      updates.admin_memo = adminMemo;
    }

    const { data, error } = await supabaseAdmin
      .from('quote_inquiries')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to update quote inquiry.', 502, error);
    }

    return NextResponse.json(data as IQuoteInquiry);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
