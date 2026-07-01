import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type GuestOrderClaimsClient = SupabaseClient<Database>;

export type GuestOrderClaimUser = {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
};

export type ClaimGuestOrdersMutationResult = {
  claimed: number;
  updateError?: unknown;
};

export async function claimGuestOrdersMutation(
  supabase: GuestOrderClaimsClient,
  user: GuestOrderClaimUser | null
): Promise<ClaimGuestOrdersMutationResult> {
  if (!user) return { claimed: 0 };

  const email = user.email?.trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return { claimed: 0 };

  const { data: claimedOrders, error } = await supabase
    .from('orders')
    .update({ buyer_user_id: user.id })
    .is('buyer_user_id', null)
    .eq('buyer_email', email)
    .select('id');

  if (error) return { claimed: 0, updateError: error };

  return { claimed: claimedOrders?.length ?? 0 };
}
