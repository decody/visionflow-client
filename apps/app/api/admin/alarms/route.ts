import { ROUTES } from '@visionflow/routes';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  type BackendPrincipal,
  type SpringAlarm,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

type AlarmItem = {
  created_at: string;
  entity_id: string;
  href: string;
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  type: 'general' | 'partnership' | 'qna' | 'quote';
};

const jsonError = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ details, message }, { status });

/**
 * 알림 조회 권한 게이트 — 콘텐츠 관리자(canManageContent). Spring `/api/admin/**`가 ADMIN/SUPERADMIN
 * 전용이라 이에 맞춘다(기존 ADMIN_PAGE_ROLES 대비 Viewer 읽기는 제외 — 다른 어드민 API와 동일 정책).
 * 통과 시 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다.
 */
const requireManager = async (): Promise<BackendPrincipal | NextResponse> => {
  const session = await auth();

  if (!session) return jsonError('Unauthorized', 401);

  const role = session.user?.role;
  const userId = session.user?.id;

  if (!canManageContent(role) || !role || !userId) {
    return jsonError('Forbidden', 403);
  }

  return { role, userId };
};

const getCreatedAtTime = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
};

const isOverdue = (createdAt: string | null | undefined, hours: number) => {
  const time = getCreatedAtTime(createdAt);

  return time > 0 && Date.now() - time >= hours * 60 * 60 * 1000;
};

/**
 * Spring AlarmResponse(원시 미처리 행) → 프론트 AlarmItem(표현 포함)으로 변환.
 * SLA 초과 판정(type별 시간 기준)·severity·제목·상세 링크는 여기서 계산한다.
 */
const toAlarmItem = (alarm: SpringAlarm): AlarmItem => {
  const message = `${alarm.primaryLabel} · ${alarm.secondaryLabel}`;
  const base = {
    created_at: alarm.createdAt,
    entity_id: alarm.entityId,
    id: `${alarm.type}-${alarm.entityId}`,
    message,
  };

  switch (alarm.type) {
    case 'general': {
      const overdue = isOverdue(alarm.createdAt, 48);

      return {
        ...base,
        href: ROUTES.ADMIN.GENERAL_INQUIRY.DETAIL(alarm.entityId),
        severity: overdue ? 'danger' : 'info',
        title: overdue ? '일반 문의 SLA 초과' : '새 일반 문의',
        type: 'general',
      };
    }
    case 'partnership': {
      const overdue = isOverdue(alarm.createdAt, 72);

      return {
        ...base,
        href: ROUTES.ADMIN.PARTNERSHIP.DETAIL(alarm.entityId),
        severity: overdue ? 'danger' : 'info',
        title: overdue ? '제휴 문의 SLA 초과' : '새 제휴 문의',
        type: 'partnership',
      };
    }
    case 'quote': {
      const overdue = isOverdue(alarm.createdAt, 24);
      const reviewing = alarm.status === 'reviewing';

      return {
        ...base,
        href: ROUTES.ADMIN.QUOTE_REQUEST.DETAIL(alarm.entityId),
        severity: overdue ? 'danger' : reviewing ? 'warning' : 'info',
        title: overdue
          ? '견적 문의 SLA 초과'
          : reviewing
            ? '견적 검토 진행중'
            : '새 견적 문의',
        type: 'quote',
      };
    }
    case 'qna':
    default: {
      const overdue = isOverdue(alarm.createdAt, 48);

      return {
        ...base,
        href: ROUTES.ADMIN.QNA.DETAIL(alarm.entityId),
        severity: overdue ? 'danger' : 'info',
        title: overdue ? 'Q&A 답변 SLA 초과' : '새 Q&A 답변 대기',
        type: 'qna',
      };
    }
  }
};

/**
 * 관리자 알림 — Spring `GET /api/admin/alarms`로 위임한다.
 * 기존엔 Supabase 4개 테이블(quick/partnership/quote/qna)을 직접 병렬 조회했으나, 이제 Spring이
 * UNION 집계한 원시 행을 반환하고, 여기서 SLA·severity·카운트만 계산한다.
 */
export async function GET(_request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const response = await fetch(backendUrl('/api/admin/alarms'), {
      cache: 'no-store',
      headers: backendAuthHeaders(gate),
    });

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load admin alarms.', response.status, body);
    }

    const alarms = (body as SpringAlarm[]) ?? [];

    const generalPending = alarms.filter((a) => a.type === 'general').length;
    const partnershipPending = alarms.filter(
      (a) => a.type === 'partnership',
    ).length;
    const qnaPending = alarms.filter((a) => a.type === 'qna').length;
    const quoteRows = alarms.filter((a) => a.type === 'quote');
    const quoteOpen = quoteRows.length;
    const quotePending = quoteRows.filter((a) => a.status === 'pending').length;
    const quoteOverdue = quoteRows.filter((a) =>
      isOverdue(a.createdAt, 24),
    ).length;

    const items = alarms
      .map(toAlarmItem)
      .sort(
        (a, b) =>
          getCreatedAtTime(b.created_at) - getCreatedAtTime(a.created_at),
      )
      .slice(0, 20);

    return NextResponse.json({
      counts: {
        generalPending,
        partnershipPending,
        qnaPending,
        quoteOpen,
        quoteOverdue,
        quotePending,
        total: generalPending + partnershipPending + qnaPending + quoteOpen,
      },
      items,
    });
  } catch (error) {
    return jsonError(
      'Failed to reach alarms backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
