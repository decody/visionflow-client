import type { IUser } from '@visionflow/shared';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeUserRole } from '@/lib/admin-permissions';
import { auth } from '../../../../auth';

const jsonError = (message: string, status: number) =>
  NextResponse.json({ message }, { status });

export async function GET() {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  if (session.user?.role !== 'SuperAdmin') {
    return jsonError('Forbidden', 403);
  }

  const [
    { data: authUsers, error: authError },
    { data: profiles, error: profilesError },
    { data: roles, error: rolesError },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.from('user_roles').select('user_id,role'),
  ]);

  const error = authError ?? profilesError ?? rolesError;

  if (error) {
    return jsonError(error.message, 502);
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [String(profile.id), profile]),
  );
  const roleByUserId = new Map(
    (roles ?? []).map((role) => [String(role.user_id), role.role]),
  );

  const users = authUsers.users
    .map((user) => {
      const profile = profileById.get(user.id);

      return {
        avatar_color: profile?.avatar_color ?? null,
        created_at: profile?.created_at ?? user.created_at,
        email: user.email ?? '',
        id: user.id,
        last_login_at: profile?.last_login_at ?? user.last_sign_in_at,
        last_login_ip: profile?.last_login_ip ?? null,
        last_login_location: profile?.last_login_location ?? null,
        name:
          profile?.name ??
          user.user_metadata?.name ??
          user.email ??
          'Unknown user',
        role: normalizeUserRole(roleByUserId.get(user.id)) ?? 'Viewer',
        status: profile?.status ?? 'active',
        updated_at: profile?.updated_at ?? user.updated_at ?? user.created_at,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

  return NextResponse.json(users as unknown as IUser[]);
}
