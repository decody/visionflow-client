import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { canManageUsers, normalizeUserRole } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  type BackendPrincipal,
} from '@/lib/backend';

type InvitePayload = {
  emails?: unknown;
  role?: unknown;
  welcomeMessage?: unknown;
};

const jsonError = (message: string, status: number) =>
  NextResponse.json({ message }, { status });

/**
 * 초대 권한 게이트 — SuperAdmin 전용(USER_MANAGER_ROLES). Spring 어드민 초대 API 도 SUPERADMIN 전용.
 * 통과 시 Spring 호출에 서명해 실을 신원(userId/role)을 돌려준다.
 */
const requireSuperAdmin = async (): Promise<BackendPrincipal | NextResponse> => {
  const session = await auth();

  if (!session) return jsonError('Unauthorized', 401);

  const role = session.user?.role;
  const userId = session.user?.id;

  if (!canManageUsers(role) || !role || !userId) {
    return jsonError('Forbidden', 403);
  }

  return { role, userId };
};

/**
 * 사용자 초대 — Spring `POST /api/admin/users/invite`로 위임한다.
 * 기존엔 Supabase generateLink(매직링크) + Resend 이메일 + profiles/user_roles/Spring 이중쓰기였으나,
 * 이제 Spring 이 users upsert(pending_invite) + 초대 토큰 발급 + 이메일(EmailService)까지 소유한다.
 * appBaseUrl(요청 오리진)은 초대 링크 구성에 쓰인다.
 */
export async function POST(request: NextRequest) {
  const gate = await requireSuperAdmin();

  if (gate instanceof NextResponse) return gate;

  let payload: InvitePayload;

  try {
    payload = (await request.json()) as InvitePayload;
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }

  const emails = Array.isArray(payload.emails) ? payload.emails : [];
  const role = normalizeUserRole(payload.role) ?? 'Viewer';
  const welcomeMessage =
    typeof payload.welcomeMessage === 'string' ? payload.welcomeMessage : '';

  if (emails.length === 0) {
    return jsonError('At least one email is required.', 400);
  }

  try {
    const response = await fetch(backendUrl('/api/admin/users/invite'), {
      body: JSON.stringify({
        appBaseUrl: request.nextUrl.origin,
        emails,
        role,
        welcomeMessage,
      }),
      cache: 'no-store',
      headers: {
        ...backendAuthHeaders(gate),
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    const body = (await readJson(response)) as {
      failed?: { email: string; error?: string }[];
      sent?: unknown[];
    } | null;

    if (!response.ok && response.status !== 207) {
      return jsonError('Failed to send invitations.', response.status);
    }

    const failed = body?.failed ?? [];
    const sent = body?.sent ?? [];

    // 기존 응답 계약 유지: 부분 실패는 207 + {failed, sent, message}.
    return NextResponse.json(
      {
        failed,
        message:
          failed.length > 0
            ? 'Some invitations failed to send.'
            : 'Invitations sent.',
        sent,
      },
      { status: failed.length > 0 ? 207 : 200 },
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Failed to reach invite backend.',
      502,
    );
  }
}
