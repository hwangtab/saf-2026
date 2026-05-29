'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';

const SCHEMA = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
});

export type RequestPasswordResetResult =
  | { status: 'sent' }
  | { status: 'not_found' }
  | { status: 'social_only'; provider: string }
  | { status: 'rate_limited' }
  | { status: 'error' };

export async function requestPasswordReset(input: {
  email: string;
}): Promise<RequestPasswordResetResult> {
  const parsed = SCHEMA.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  const headerStore = await headers();
  const xff = headerStore.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || 'unknown';

  const rl = await rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { status: 'rate_limited' };

  const admin = createSupabaseAdminClient();
  const rpc = admin.rpc as unknown as (
    fn: string,
    args: { p_email: string }
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  const { data, error } = await rpc('check_reset_eligibility', {
    p_email: parsed.data.email,
  });
  if (error) return { status: 'error' };

  const payload = data as { status: string; provider?: string } | null;
  if (!payload || typeof payload.status !== 'string') return { status: 'error' };

  if (payload.status === 'not_found') return { status: 'not_found' };
  if (payload.status === 'social_only') {
    return { status: 'social_only', provider: payload.provider ?? 'google' };
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/reset`,
  });
  if (mailError) return { status: 'error' };

  return { status: 'sent' };
}
