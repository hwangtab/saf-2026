'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';

export async function addToWishlist(artworkId: string): Promise<{ error?: string }> {
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
  if (artworkIds.length === 0) return {};

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthenticated' };

  const rows = artworkIds.map((artwork_id) => ({ user_id: user.id, artwork_id }));
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
