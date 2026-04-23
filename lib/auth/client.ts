import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

function throwConfigurationError(code: string): never {
  console.error(`[auth] ${code}`);
  throw new Error('Configuration error');
}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throwConfigurationError('AUTH_CFG_MISSING_PUBLIC_SUPABASE_CONFIG_CLIENT');
  }
  return createBrowserClient<Database>(url, key);
}
