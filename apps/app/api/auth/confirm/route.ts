import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  if (tokenHash && type === 'invite') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'invite',
    });

    if (!error && data.user) {
      await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', data.user.id)
        .eq('status', 'pending_invite');

      return NextResponse.redirect(
        new URL('/api/auth/set-password', request.url),
      );
    }
  }

  return NextResponse.redirect(new URL('/api/auth/error', request.url));
}
