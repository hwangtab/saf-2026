'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/security/get-client-ip';
import type { RequestPasswordResetResult } from './types';

const SCHEMA = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
});

export async function requestPasswordReset(input: {
  email: string;
}): Promise<RequestPasswordResetResult> {
  const parsed = SCHEMA.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  const rl = await rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { status: 'rate_limited' };

  // NOTE: do NOT alias `admin.rpc` to a bare variable — Supabase client methods
  // depend on `this` binding (`SupabaseClient.rpc` calls `this.rest.rpc(...)`).
  // Extracting the method drops `this` and throws
  // `TypeError: Cannot read properties of undefined (reading 'rest')` at runtime.
  // Always call as `client.rpc(...)`.
  const admin = createSupabaseAdminClient() as unknown as {
    rpc: (
      fn: string,
      args: { p_email: string }
    ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };
  const { data, error } = await admin.rpc('check_reset_eligibility', {
    p_email: parsed.data.email,
  });
  if (error) {
    console.error('[forgot-password] RPC error:', error);
    return { status: 'error' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const payload = row as { status?: string; provider?: string } | null;
  if (!payload || typeof payload.status !== 'string') {
    console.error('[forgot-password] unexpected RPC payload:', data);
    return { status: 'error' };
  }

  if (payload.status === 'not_found') return { status: 'not_found' };
  if (payload.status === 'social_only') {
    return { status: 'social_only', provider: payload.provider ?? 'google' };
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/reset`,
  });
  if (mailError) {
    console.error('[forgot-password] resetPasswordForEmail error:', mailError);
    return { status: 'error' };
  }

  return { status: 'sent' };
}
