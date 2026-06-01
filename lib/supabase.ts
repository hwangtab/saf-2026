import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

// Vercel 빌드 SSG prerender에서 Supabase upstream timeout(60~90초)까지 무기한 hang하는 문제 차단.
// 호출자가 명시 signal을 넘긴 경우 그것을 보존한다.
export function getSupabaseRequestTimeoutMs(phase = process.env.NEXT_PHASE): number {
  return phase === 'phase-production-build' ? 30_000 : 8_000;
}

const supabaseFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(getSupabaseRequestTimeoutMs()),
  });

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: { fetch: supabaseFetch },
      })
    : null;
