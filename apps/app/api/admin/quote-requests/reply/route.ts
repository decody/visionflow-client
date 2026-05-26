import type { IQuoteInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { CONTENT_MANAGER_ROLES, hasAllowedRole } from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

type SendQuotePayload = {
  inquiryId?: number | string;
  quoteContent?: string;
};

const MAX_QUOTE_CONTENT_LENGTH = 10000;

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const parseId = (value?: string | number | null) => {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const toHtml = (value: string) =>
  escapeHtml(value)
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${paragraph.replaceAll('\n', '<br>')}</p>`,
    )
    .join('');

const parseProviderError = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const getProviderMessage = (detail: unknown) => {
  if (
    detail &&
    typeof detail === 'object' &&
    'message' in detail &&
    typeof detail.message === 'string'
  ) {
    return detail.message;
  }

  return typeof detail === 'string' ? detail : null;
};

const appendSentMemo = (
  currentMemo: string | null | undefined,
  quoteContent: string,
) => {
  const sentAt = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
  const summary = quoteContent.split('\n').find(Boolean)?.slice(0, 120) ?? '';
  const entry = `[견적 발송] ${sentAt}\n${summary}`;

  return [currentMemo?.trim(), entry].filter(Boolean).join('\n\n');
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!hasAllowedRole(session.user?.role, CONTENT_MANAGER_ROLES)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const payload = (await request.json()) as SendQuotePayload;
    const inquiryId = parseId(payload.inquiryId);
    const quoteContent = payload.quoteContent?.trim();

    if (!inquiryId || !quoteContent) {
      return jsonError('inquiryId and quoteContent are required.', 400);
    }

    if (quoteContent.length > MAX_QUOTE_CONTENT_LENGTH) {
      return jsonError(
        `quoteContent must be ${MAX_QUOTE_CONTENT_LENGTH} characters or fewer.`,
        400,
      );
    }

    const { data: inquiry, error: findError } = await supabaseAdmin
      .from('quote_inquiries')
      .select('id,company_name,email,status,admin_memo')
      .eq('id', inquiryId)
      .maybeSingle();

    if (findError) {
      return jsonError('Failed to verify quote inquiry.', 502, findError);
    }

    if (!inquiry) {
      return jsonError('Quote inquiry was not found.', 404);
    }

    const to = inquiry.email.trim();

    if (!to) {
      return jsonError('Contact email is missing.', 400);
    }

    const resendApiKey = getRequiredEnv('RESEND_API_KEY');
    const from =
      process.env.RESEND_FROM_EMAIL ??
      'VisionFlow Admin <onboarding@resend.dev>';
    const subject = `[VisionFlow] ${inquiry.company_name} 견적서`;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from,
        html: toHtml(quoteContent),
        subject,
        text: quoteContent,
        to,
      }),
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!emailResponse.ok) {
      const detail = await parseProviderError(emailResponse);
      const providerMessage = getProviderMessage(detail);

      if (
        emailResponse.status === 403 &&
        providerMessage?.includes('domain is not verified')
      ) {
        return jsonError(
          'Quote email sender domain is not verified in Resend.',
          502,
          {
            from,
            provider: detail,
            resolution:
              'Verify the sender domain in Resend or set RESEND_FROM_EMAIL to an address on a verified domain.',
          },
        );
      }

      return jsonError('Failed to send quote email.', 502, detail);
    }

    const now = new Date().toISOString();
    const { data: updatedInquiry, error: updateError } =
      await supabaseAdmin
        .from('quote_inquiries')
        .update({
          admin_memo: appendSentMemo(inquiry.admin_memo, quoteContent),
          contacted_at: now,
          status: inquiry.status === 'pending' ? 'reviewing' : inquiry.status,
          updated_at: now,
        })
        .eq('id', inquiryId)
        .select('*')
        .single();

    if (updateError) {
      return jsonError(
        'Quote email was sent, but inquiry update failed.',
        502,
        updateError,
      );
    }

    return NextResponse.json(updatedInquiry as IQuoteInquiry);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
