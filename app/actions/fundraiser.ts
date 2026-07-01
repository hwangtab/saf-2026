'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import type { ActionState } from '@/types';

type SelectableArtwork = {
  id: string;
  status: string | null;
  manual_sold_override: boolean;
  exhibition: string | null;
};

const isSold = (a: SelectableArtwork) => a.status === 'sold' || a.manual_sold_override === true;

export async function setFundraiserSelection(selectedArtworkIds: string[]): Promise<ActionState> {
  const slug = OH_YOON_TERRACOTTA_EXHIBITION.slug;
  try {
    const user = await requireArtistActive();
    const supabase = await createSupabaseServerClient();

    const { data: artist } = await supabase
      .from('artists')
      .select('id, name_ko')
      .eq('user_id', user.id)
      .single();
    if (!artist) {
      return { message: '작가 프로필을 찾을 수 없습니다.', error: true };
    }

    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('id, status, manual_sold_override, exhibition')
      .eq('artist_id', artist.id);
    if (error) throw error;

    const rows = (artworks ?? []) as SelectableArtwork[];
    const owned = new Set(rows.map((a) => a.id));
    const selected = new Set(selectedArtworkIds);

    // 1. 소유권
    for (const id of selectedArtworkIds) {
      if (!owned.has(id)) {
        return { message: '본인 작품만 출품할 수 있습니다.', error: true };
      }
    }

    // 2. 판매 잠금: 판매된 출품작이 선택에서 빠지면 거부
    for (const a of rows) {
      if (a.exhibition === slug && isSold(a) && !selected.has(a.id)) {
        return { message: '이미 판매된 출품작은 출품을 해제할 수 없습니다.', error: true };
      }
    }

    // 3. 한도
    if (selected.size > OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist) {
      return {
        message: `기금마련전은 작가당 최대 ${OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist}점까지 출품할 수 있습니다.`,
        error: true,
      };
    }

    // 4. 반영
    const toTag = selectedArtworkIds;
    const toUntag = rows
      .filter((a) => a.exhibition === slug && !selected.has(a.id) && !isSold(a))
      .map((a) => a.id);

    if (toTag.length > 0) {
      const { error: e1 } = await supabase
        .from('artworks')
        .update({ exhibition: slug })
        .eq('artist_id', artist.id)
        .in('id', toTag);
      if (e1) throw e1;
    }
    if (toUntag.length > 0) {
      const { error: e2 } = await supabase
        .from('artworks')
        .update({ exhibition: null })
        .eq('artist_id', artist.id)
        .in('id', toUntag);
      if (e2) throw e2;
    }

    revalidatePath('/dashboard/fundraiser');
    revalidatePath('/dashboard/artworks');
    revalidateTag('artworks', 'max');
    return { message: '출품 작품이 저장되었습니다.', error: false };
  } catch {
    return { message: '저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', error: true };
  }
}
