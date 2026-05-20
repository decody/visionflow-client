import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Supabase URL is required. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.',
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'Supabase service role key is required. Set SUPABASE_SERVICE_ROLE_KEY.',
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);
