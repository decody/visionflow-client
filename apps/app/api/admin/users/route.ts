import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../auth';
import { canManageUsers } from '@/lib/admin-permissions';
import {
  backendAuthHeaders,
  backendUrl,
  readJson,
  springUserToIUser,
  type BackendPrincipal,
  type SpringUser,
} from '@/lib/backend';

export const dynamic = 'force-dynamic';

const jsonError = (message: string, status: number, details?: unknown) =>
  NextResponse.json({ details, message }, { status });

/**
 * 사용자 관리 권한 게이트 — SuperAdmin 전용(USER_MANAGER_ROLES). Spring 어드민 users API도 SUPERADMIN 전용이라 일치.
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
 * 사용자 목록 — Spring `GET /api/admin/users`로 위임한다(role/status 필터 전달).
 * 기존엔 Supabase(auth.users + profiles + user_roles)를 조합했으나, 이제 Spring users 테이블이 소스다.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSuperAdmin();

  if (gate instanceof NextResponse) return gate;

  try {
    const query = new URL(request.url).searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/admin/users${query ? `?${query}` : ''}`),
      { cache: 'no-store', headers: backendAuthHeaders(gate) },
    );

    const body = await readJson(response);

    if (!response.ok) {
      return jsonError('Failed to load users.', response.status, body);
    }

    return NextResponse.json((body as SpringUser[]).map(springUserToIUser));
  } catch (error) {
    return jsonError(
      'Failed to reach users backend.',
      502,
      error instanceof Error ? error.message : error,
    );
  }
}
