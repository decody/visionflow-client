import type { IUser } from '@visionflow/shared';
import { NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase-admin';
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

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      [
        'id',
        'name',
        'email',
        'role',
        'status',
        'avatar_color',
        'last_login_at',
        'last_login_ip',
        'last_login_location',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .order('created_at', { ascending: false });

  if (error) {
    return jsonError(error.message, 502);
  }

  return NextResponse.json((data ?? []) as unknown as IUser[]);
}
