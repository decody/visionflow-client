import type { IPartnershipInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ReplyPayload = {
  inquiryId?: string;
  replyContent?: string;
};

const ALLOWED_REPLY_ROLES = ['SuperAdmin', 'admin'] as const;
const MAX_REPLY_CONTENT_LENGTH = 5000;

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

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

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

const canSendReply = (role?: string | null) =>
  ALLOWED_REPLY_ROLES.some((allowedRole) => allowedRole === role);

const getInquiry = async (inquiryId: string) => {
  const { data, error } = await supabaseAdmin
    .from('partnership_inquiries')
    .select('id,company_name,contact_email,status')
    .eq('id', inquiryId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Pick<
    IPartnershipInquiry,
    'company_name' | 'contact_email' | 'id' | 'status'
  > | null;
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (!canSendReply(session.user?.role)) {
    return jsonError('Forbidden', 403);
  }

  try {
    const payload = (await request.json()) as ReplyPayload;
    const inquiryId = payload.inquiryId?.trim();
    const replyContent = payload.replyContent?.trim();

    if (!inquiryId || !replyContent) {
      return jsonError(
        'inquiryId and replyContent are required.',
        400,
      );
    }

    if (replyContent.length > MAX_REPLY_CONTENT_LENGTH) {
      return jsonError(
        `replyContent must be ${MAX_REPLY_CONTENT_LENGTH} characters or fewer.`,
        400,
      );
    }

    const inquiry = await getInquiry(inquiryId);

    if (!inquiry) {
      return jsonError('Partnership inquiry was not found.', 404);
    }

    const to = inquiry.contact_email.trim();

    if (!to) {
      return jsonError('Contact email is missing.', 400);
    }

    const resendApiKey = getRequiredEnv('RESEND_API_KEY');
    const from =
      process.env.RESEND_FROM_EMAIL ??
      'VisionFlow Admin <onboarding@resend.dev>';
    const subject = `Re: ${inquiry.company_name} 제휴 문의`;

    const emailResponse = await fetch(
      'https://api.resend.com/emails',
      {
        body: JSON.stringify({
          from,
          html: toHtml(replyContent),
          subject,
          text: replyContent,
          to,
        }),
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    if (!emailResponse.ok) {
      const detail = await parseProviderError(emailResponse);
      const providerMessage = getProviderMessage(detail);

      if (
        emailResponse.status === 403 &&
        providerMessage?.includes('domain is not verified')
      ) {
        return jsonError(
          'Reply email sender domain is not verified in Resend.',
          502,
          {
            from,
            provider: detail,
            resolution:
              'Verify the sender domain in Resend or set RESEND_FROM_EMAIL to an address on a verified domain.',
          },
        );
      }

      return jsonError('Failed to send reply email.', 502, detail);
    }

    const now = new Date().toISOString();
    const nextStatus =
      inquiry.status === 'pending' ? 'reviewing' : inquiry.status;
    const { data: updatedInquiry, error: updateError } =
      await supabaseAdmin
        .from('partnership_inquiries')
        .update({
          status: nextStatus,
          updated_at: now,
        })
        .eq('id', inquiryId)
        .select('*')
        .single();

    if (updateError) {
      return jsonError(
        'Reply email was sent, but inquiry update failed.',
        502,
        updateError,
      );
    }

    return NextResponse.json(updatedInquiry);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
