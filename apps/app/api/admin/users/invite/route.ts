import type { UserRole } from '@visionflow/shared';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { normalizeUserRole } from '@/lib/admin-permissions';
import { supabaseAdmin } from '@/lib/supabase-admin';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitePayload = {
  emails?: unknown;
  role?: unknown;
  welcomeMessage?: unknown;
};

const jsonError = (message: string, status: number) =>
  NextResponse.json({ message }, { status });

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const normalizeEmail = (email: unknown) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const toDbRole = (role: UserRole) => {
  if (role === 'SuperAdmin') {
    return 'superadmin';
  }

  if (role === 'admin') {
    return 'admin';
  }

  return 'user';
};

const buildInviteEmail = ({
  email,
  inviteUrl,
  role,
  welcomeMessage,
}: {
  email: string;
  inviteUrl: string;
  role: UserRole;
  welcomeMessage: string;
}) => {
  const safeEmail = escapeHtml(email);
  const safeInviteUrl = escapeHtml(inviteUrl);
  const safeRole = escapeHtml(role);
  const safeWelcomeMessage = escapeHtml(welcomeMessage);

  return {
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171a1a">
        <h1 style="font-size:20px;margin:0 0 16px">VisionFlow Admin 초대</h1>
        <p>${safeEmail} 님, VisionFlow Admin에 ${safeRole} 권한으로 초대되었습니다.</p>
        ${
          safeWelcomeMessage
            ? `<p style="padding:12px 14px;background:#f6f7f9;border-radius:8px;white-space:pre-wrap">${safeWelcomeMessage}</p>`
            : ''
        }
        <p>
          <a href="${safeInviteUrl}" style="display:inline-block;padding:10px 14px;background:#004fff;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700">
            초대 수락하기
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280">이 링크는 24시간 후 만료됩니다.</p>
        <p style="font-size:12px;color:#6b7280;word-break:break-all">${safeInviteUrl}</p>
      </div>
    `,
    text: [
      `VisionFlow Admin 초대`,
      '',
      `${email} 님, VisionFlow Admin에 ${role} 권한으로 초대되었습니다.`,
      welcomeMessage ? `\n${welcomeMessage}\n` : '',
      `초대 수락: ${inviteUrl}`,
      '',
      '이 링크는 24시간 후 만료됩니다.',
    ].join('\n'),
  };
};

const sendInviteEmail = async ({
  email,
  inviteUrl,
  role,
  welcomeMessage,
}: {
  email: string;
  inviteUrl: string;
  role: UserRole;
  welcomeMessage: string;
}) => {
  const resendApiKey = getRequiredEnv('RESEND_API_KEY');
  const from =
    process.env.RESEND_FROM_EMAIL ??
    'VisionFlow Admin <onboarding@resend.dev>';
  const content = buildInviteEmail({
    email,
    inviteUrl,
    role,
    welcomeMessage,
  });

  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from,
      html: content.html,
      subject: `VisionFlow Admin 초대 - ${role} 권한`,
      text: content.text,
      to: email,
    }),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (response.ok) {
    return;
  }

  const detail = await response.text();
  throw new Error(detail || 'Resend failed to send invite email.');
};

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (session.user?.role !== 'SuperAdmin') {
    return jsonError('Forbidden', 403);
  }

  let payload: InvitePayload;

  try {
    payload = (await request.json()) as InvitePayload;
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }

  const emails = Array.isArray(payload.emails)
    ? Array.from(new Set(payload.emails.map(normalizeEmail))).filter(Boolean)
    : [];
  const role = normalizeUserRole(payload.role) ?? 'Viewer';
  const welcomeMessage =
    typeof payload.welcomeMessage === 'string'
      ? payload.welcomeMessage.trim().slice(0, 500)
      : '';

  if (emails.length === 0) {
    return jsonError('At least one email is required.', 400);
  }

  const invalidEmail = emails.find((email) => !EMAIL_PATTERN.test(email));

  if (invalidEmail) {
    return jsonError(`Invalid email address: ${invalidEmail}`, 400);
  }

  const confirmUrl = new URL('/api/auth/confirm', request.nextUrl.origin);
  const results = await Promise.all(
    emails.map(async (email) => {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        email,
        options: {
          data: {
            invited_by: session.user?.email ?? null,
            role,
            welcome_message: welcomeMessage || null,
          },
          redirectTo: confirmUrl.toString(),
        },
        type: 'invite',
      });

      if (error || !data.user) {
        return {
          email,
          error: error?.message ?? 'Invite user creation failed.',
          ok: false,
        };
      }

      const inviteUrl = new URL(confirmUrl);
      inviteUrl.searchParams.set(
        'token_hash',
        data.properties.hashed_token,
      );
      inviteUrl.searchParams.set('type', 'invite');

      const [profileResult, roleResult] = await Promise.all([
        supabaseAdmin.from('profiles').upsert(
          {
            email,
            id: data.user.id,
            name: email,
            status: 'pending_invite',
          },
          { onConflict: 'id' },
        ),
        supabaseAdmin.from('user_roles').upsert(
          {
            role: toDbRole(role),
            user_id: data.user.id,
          },
          { onConflict: 'user_id' },
        ),
      ]);

      const writeError = profileResult.error ?? roleResult.error;

      if (writeError) {
        return { email, error: writeError.message, ok: false };
      }

      try {
        await sendInviteEmail({
          email,
          inviteUrl: inviteUrl.toString(),
          role,
          welcomeMessage,
        });
      } catch (sendError) {
        return {
          email,
          error:
            sendError instanceof Error
              ? sendError.message
              : 'Invite email send failed.',
          ok: false,
        };
      }

      return { email, ok: true };
    }),
  );

  const failed = results.filter((result) => !result.ok);

  if (failed.length > 0) {
    return NextResponse.json(
      {
        failed,
        message: 'Some invitations failed to send.',
        sent: results.filter((result) => result.ok),
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    message: 'Invitations sent.',
    sent: results,
  });
}
