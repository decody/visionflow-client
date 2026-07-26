import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canManageContent } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springQuoteInquiryToIQuoteInquiry,
  type BackendPrincipal,
  type SpringQuoteInquiry,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

type SendQuotePayload = {
  inquiryId?: number | string;
  quoteContent?: string;
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

/** 콘텐츠 관리 권한 게이트(견적 발송용). Spring 호출에 실을 신원(userId/role)을 돌려준다. */
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
 * 견적 발송 — Spring `POST /api/admin/quote-inquiries/{id}/reply`로 위임한다.
 * 이메일 발송(JavaMailSender, SMTP 미설정 시 no-op)·상태(pending→reviewing)·메모 누적을 Spring이 수행한다.
 * 기존 Resend 직접 호출을 대체한다.
 */
export async function POST(request: NextRequest) {
  const gate = await requireManager();

  if (gate instanceof NextResponse) return gate;

  try {
    const payload = (await request.json()) as SendQuotePayload;
    const id = Number(payload.inquiryId);
    const quoteContent = payload.quoteContent?.trim();

    if (!Number.isSafeInteger(id) || id <= 0 || !quoteContent) {
      return jsonError('inquiryId and quoteContent are required.', 400);
    }

    const response = await fetch(
      backendUrl(`/api/admin/quote-inquiries/${id}/reply`),
      {
        body: JSON.stringify({ quoteContent }),
        headers: {
          ...backendAuthHeaders(gate),
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to send quote email.', response.status, body);
    }

    return NextResponse.json(
      springQuoteInquiryToIQuoteInquiry(body as SpringQuoteInquiry),
    );
  } catch (error) {
    return jsonError(
      'Failed to reach quote inquiry backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
