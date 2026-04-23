import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

function throwConfigurationError(code: string): never {
  console.error(`[auth] ${code}`);
  throw new Error('Configuration error');
}

/**
 * SERVICE_ROLE client – bypasses RLS.
 * Use ONLY in server actions AFTER requireAdmin() validation.
 */
export function createSupabaseAdminClient() {
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminKey) {
    throwConfigurationError('AUTH_CFG_MISSING_ADMIN_KEY');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throwConfigurationError('AUTH_CFG_MISSING_SUPABASE_URL');
  }
  return createClient<Database>(url, adminKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${adminKey}`,
      },
    },
  });
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throwConfigurationError('AUTH_CFG_MISSING_PUBLIC_SUPABASE_CONFIG');
  }
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — ignored if middleware is refreshing sessions.
        }
      },
    },
  });
}
