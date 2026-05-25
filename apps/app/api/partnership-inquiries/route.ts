import type {
  IPartnershipInquiry,
  PartnershipInquiryStatus,
} from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const STATUS_VALUES: PartnershipInquiryStatus[] = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
];

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

export async function GET() {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('partnership_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return jsonError(
        'Failed to load partnership inquiries.',
        502,
        error,
      );
    }

    return NextResponse.json((data ?? []) as IPartnershipInquiry[]);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const body = (await request.json()) as {
      admin_memo?: string | null;
      id?: string;
      status?: PartnershipInquiryStatus;
    };
    const id = body.id?.trim();

    if (!id) {
      return jsonError('id is required.', 400);
    }

    const updates: Partial<IPartnershipInquiry> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!STATUS_VALUES.includes(body.status)) {
        return jsonError('Invalid status.', 400);
      }

      updates.status = body.status;
    }

    if (body.admin_memo !== undefined) {
      updates.admin_memo = body.admin_memo?.trim() || null;
    }

    const { data, error } = await supabaseAdmin
      .from('partnership_inquiries')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return jsonError(
        'Failed to update partnership inquiry.',
        502,
        error,
      );
    }

    return NextResponse.json(data as IPartnershipInquiry);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
