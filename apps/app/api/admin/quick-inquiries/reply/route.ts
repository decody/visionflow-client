import type { IQuickInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '../../../../../auth';

type ReplyPayload = {
  inquiryId?: string;
  replyContent?: string;
};

const ALLOWED_REPLY_ROLES = ['SuperAdmin', 'Operator'] as const;
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

const getSessionUserId = async (email?: string | null) => {
  const normalizedEmail = email?.trim();

  if (!normalizedEmail) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return typeof data?.id === 'string' ? data.id : null;
};

const getInquiry = async (inquiryId: string) => {
  const { data, error } = await supabaseAdmin
    .from('quick_inquiries')
    .select('id,email,subject,status')
    .eq('id', inquiryId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Pick<
    IQuickInquiry,
    'email' | 'id' | 'status' | 'subject'
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
      return jsonError('Inquiry was not found.', 404);
    }

    const to = inquiry.email.trim();
    const subject = `Re: ${inquiry.subject?.trim() || 'General inquiry'}`;

    if (!to) {
      return jsonError('Inquiry email is missing.', 400);
    }

    const resendApiKey = getRequiredEnv('RESEND_API_KEY');
    const from =
      process.env.RESEND_FROM_EMAIL ??
      'VisionFlow Admin <onboarding@resend.dev>';

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

    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
    ).replace(/\/+$/, '');
    const serviceRoleKey = getRequiredEnv(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const repliedBy = await getSessionUserId(session.user?.email);
    const now = new Date().toISOString();
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/quick_inquiries?id=eq.${encodeURIComponent(
        inquiryId,
      )}&select=*`,
      {
        body: JSON.stringify({
          replied_at: now,
          replied_by: repliedBy,
          reply_content: replyContent,
          status: 'resolved',
          updated_at: now,
        }),
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        method: 'PATCH',
      },
    );

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();

      return jsonError(
        'Reply email was sent, but inquiry update failed.',
        502,
        detail,
      );
    }

    const rows = (await updateResponse.json()) as IQuickInquiry[];
    const updatedInquiry = rows[0];

    if (!updatedInquiry) {
      return jsonError(
        'Reply email was sent, but inquiry was not found.',
        404,
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
