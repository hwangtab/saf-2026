'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import type { CartItem } from '@/types';

const MAX_CART_BATCH = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id);

export async function getCartItems(): Promise<{ items: CartItem[]; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], error: 'unauthenticated' };

  const { data, error } = await supabase
    .from('cart_items')
    .select('artwork_id, quantity')
    .eq('user_id', user.id);
  if (error) return { items: [], error: error.message };
  return { items: (data ?? []).map((r) => ({ artworkId: r.artwork_id, quantity: r.quantity })) };
}

export async function upsertCartItem(
  artworkId: string,
  quantity: number
): Promise<{ error?: string }> {
  if (!isUuid(artworkId)) return { error: 'invalid_id' };
  if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'invalid_quantity' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('cart_items')
    .upsert(
      { user_id: user.id, artwork_id: artworkId, quantity, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,artwork_id' }
    );
  if (error) return { error: error.message };
  return {};
}

export async function removeCartItem(artworkId: string): Promise<{ error?: string }> {
  if (!isUuid(artworkId)) return { error: 'invalid_id' };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', user.id)
    .eq('artwork_id', artworkId);
  if (error) return { error: error.message };
  return {};
}

export async function clearCartItems(): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id);
  if (error) return { error: error.message };
  return {};
}

/** 게스트 local 카트를 로그인 DB로 병합. upsert로 덮어쓰기. */
export async function mergeGuestCart(items: CartItem[]): Promise<{ error?: string }> {
  const valid = items.filter(
    (i) => isUuid(i.artworkId) && Number.isInteger(i.quantity) && i.quantity > 0
  );
  if (valid.length === 0) return {};
  if (valid.length > MAX_CART_BATCH) return { error: 'too_many' };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'unauthenticated' };

  const rows = valid.map((i) => ({
    user_id: user.id,
    artwork_id: i.artworkId,
    quantity: i.quantity,
  }));
  const { error } = await supabase
    .from('cart_items')
    .upsert(rows, { onConflict: 'user_id,artwork_id' });
  if (error) return { error: error.message };
  return {};
}
