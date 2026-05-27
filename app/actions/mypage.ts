'use server';

import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';

const MAX_WISHLIST_BATCH = 200;
const isValidArtworkId = (id: unknown): id is string =>
  typeof id === 'string' && /^\d+$/.test(id) && id.length <= 12;

export async function addToWishlist(artworkId: string): Promise<{ error?: string }> {
  if (!isValidArtworkId(artworkId)) return { error: 'invalid_id' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('wishlists')
    .upsert({ user_id: user.id, artwork_id: artworkId }, { onConflict: 'user_id,artwork_id' });

  if (error) return { error: error.message };
  return {};
}

export async function removeFromWishlist(artworkId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('artwork_id', artworkId);

  if (error) return { error: error.message };
  return {};
}

export async function bulkAddToWishlist(artworkIds: string[]): Promise<{ error?: string }> {
  const validIds = [...new Set(artworkIds.filter(isValidArtworkId))];
  if (validIds.length === 0) return {};
  if (validIds.length > MAX_WISHLIST_BATCH) return { error: 'too_many' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthenticated' };

  const rows = validIds.map((artwork_id) => ({ user_id: user.id, artwork_id }));
  const { error } = await supabase
    .from('wishlists')
    .upsert(rows, { onConflict: 'user_id,artwork_id' });

  if (error) return { error: error.message };
  return {};
}

export async function updateMyProfile(name: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: 'unauthenticated' };

  const trimmed = name.trim();
  if (!trimmed) return { error: 'name_required' };

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: trimmed, name: trimmed },
  });
  if (authError) return { error: authError.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ name: trimmed })
    .eq('id', user.id);

  if (profileError) return { error: profileError.message };
  return {};
}

export async function updateMarketingConsent(consent: boolean): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      marketing_consent: consent,
      marketing_consent_at: new Date().toISOString(),
      marketing_consent_source: 'mypage',
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  // 수신거부 시 email_suppressions에도 반영
  if (!consent) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profile?.email) {
      const adminSupabase = createSupabaseAdminClient();
      await adminSupabase.from('email_suppressions').upsert(
        {
          email_hash: hashEmail(profile.email as string),
          channel: 'customer',
          reason: 'unsubscribe',
        },
        { onConflict: 'email_hash,channel', ignoreDuplicates: true }
      );
    }
  }

  return {};
}
