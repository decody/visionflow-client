import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springPartnershipToIPartnershipInquiry,
  type BackendPrincipal,
  type SpringPartnershipInquiry,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

type ReplyPayload = {
  inquiryId?: string;
  replyContent?: string;
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/** 콘텐츠 관리 권한 게이트(답장 발송용). Spring 어드민 reply 엔드포인트 호출에 실을 신원을 돌려준다. */
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

/**
 * 답장 발송 — Spring `POST /api/admin/partnership-inquiries/{id}/reply`로 위임한다.
 * 이메일 발송(JavaMailSender, SMTP 미설정 시 no-op)·상태(pending→reviewing) 갱신을 Spring이 수행한다.
 * 기존 Resend 직접 호출을 대체한다.
 */
export async function POST(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const payload = (await request.json()) as ReplyPayload;
    const id = payload.inquiryId?.trim();
    const replyContent = payload.replyContent?.trim();

    if (!id || !replyContent) {
      return jsonError('inquiryId and replyContent are required.', 400);
    }

    const response = await fetch(
      backendUrl(
        `/api/admin/partnership-inquiries/${encodeURIComponent(id)}/reply`,
      ),
      {
        body: JSON.stringify({ replyContent }),
        headers: {
          ...backendAuthHeaders(gate),
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to send reply email.', response.status, body);
    }

    return NextResponse.json(
      springPartnershipToIPartnershipInquiry(body as SpringPartnershipInquiry),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach partnership inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
