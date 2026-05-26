import { ROUTES } from '@visionflow/routes';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { ADMIN_PAGE_ROLES, hasAllowedRole } from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type AlarmItem = {
  created_at: string;
  entity_id: string;
  href: string;
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  type: 'general' | 'partnership' | 'quote';
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const getCreatedAtTime = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
};

const isOverdue = (createdAt: string | null | undefined, hours: number) => {
  const time = getCreatedAtTime(createdAt);

  return time > 0 && Date.now() - time >= hours * 60 * 60 * 1000;
};

export async function GET(_request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!hasAllowedRole(session.user?.role, ADMIN_PAGE_ROLES)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const [quickResult, partnershipResult, quoteResult] = await Promise.all([
      supabaseAdmin
        .from('quick_inquiries')
        .select('id,name,email,subject,status,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('partnership_inquiries')
        .select('id,company_name,contact_name,status,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('quote_inquiries')
        .select('id,company_name,contact_name,status,created_at')
        .in('status', ['pending', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    const firstError =
      quickResult.error ?? partnershipResult.error ?? quoteResult.error;

    if (firstError) {
      return jsonError('Failed to load admin alarms.', 502, firstError);
    }

    const quickRows = quickResult.data ?? [];
    const partnershipRows = partnershipResult.data ?? [];
    const quoteRows = quoteResult.data ?? [];

    const items: AlarmItem[] = [
      ...quickRows.map((row) => ({
        created_at: row.created_at,
        entity_id: String(row.id),
        href: ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(row.id),
        id: `general-${row.id}`,
        message: `${row.name} · ${row.subject || row.email}`,
        severity: (isOverdue(row.created_at, 48)
          ? 'danger'
          : 'info') as AlarmItem['severity'],
        title: isOverdue(row.created_at, 48)
          ? '일반 문의 SLA 초과'
          : '새 일반 문의',
        type: 'general' as const,
      })),
      ...partnershipRows.map((row) => ({
        created_at: row.created_at,
        entity_id: String(row.id),
        href: ROUTES.ADMIN.PARTNERSHIP.DETAIL(row.id),
        id: `partnership-${row.id}`,
        message: `${row.company_name} · ${row.contact_name}`,
        severity: (isOverdue(row.created_at, 72)
          ? 'danger'
          : 'info') as AlarmItem['severity'],
        title: isOverdue(row.created_at, 72)
          ? '제휴 문의 SLA 초과'
          : '새 제휴 문의',
        type: 'partnership' as const,
      })),
      ...quoteRows.map((row) => ({
        created_at: row.created_at,
        entity_id: String(row.id),
        href: ROUTES.ADMIN.QUOTE_REQUEST.DETAIL(row.id),
        id: `quote-${row.id}`,
        message: `${row.company_name} · ${row.contact_name}`,
        severity: (isOverdue(row.created_at, 24)
          ? 'danger'
          : row.status === 'reviewing'
            ? 'warning'
            : 'info') as AlarmItem['severity'],
        title: isOverdue(row.created_at, 24)
          ? '견적 문의 SLA 초과'
          : row.status === 'reviewing'
            ? '견적 검토 진행중'
            : '새 견적 문의',
        type: 'quote' as const,
      })),
    ]
      .sort((a, b) => getCreatedAtTime(b.created_at) - getCreatedAtTime(a.created_at))
      .slice(0, 20);

    const quotePendingCount = quoteRows.filter(
      (row) => row.status === 'pending',
    ).length;
    const quoteOverdueCount = quoteRows.filter((row) =>
      isOverdue(row.created_at, 24),
    ).length;

    return NextResponse.json({
      counts: {
        generalPending: quickRows.length,
        partnershipPending: partnershipRows.length,
        quoteOverdue: quoteOverdueCount,
        quotePending: quotePendingCount,
        total: items.length,
      },
      items,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
