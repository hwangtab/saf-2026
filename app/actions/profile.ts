'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireArtistActive } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { logArtistAction } from './admin-logs';

export type ActionState = {
  message: string;
  error?: boolean;
};

export async function updateArtistProfile(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    void prevState;
    const user = await requireArtistActive();
    const supabase = await createSupabaseServerClient();

    const { data: existingArtist } = await supabase
      .from('artists')
      .select(
        'id, name_ko, name_en, bio, history, profile_image, contact_email, instagram, homepage, updated_at'
      )
      .eq('user_id', user.id)
      .single();

    const name_ko = formData.get('name_ko') as string;
    const name_en = formData.get('name_en') as string;
    const bio = formData.get('bio') as string;
    const history = formData.get('history') as string;
    const profile_image = formData.get('profile_image') as string;
    const contact_email = formData.get('contact_email') as string;
    const instagram = formData.get('instagram') as string;
    const homepage = formData.get('homepage') as string;

    const { error } = await supabase
      .from('artists')
      .update({
        name_ko,
        name_en,
        bio,
        history,
        profile_image,
        contact_email,
        instagram,
        homepage,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;

    const { data: updatedArtist } = await supabase
      .from('artists')
      .select(
        'id, name_ko, name_en, bio, history, profile_image, contact_email, instagram, homepage, updated_at'
      )
      .eq('user_id', user.id)
      .single();

    if (updatedArtist) {
      await logArtistAction(
        'artist_profile_updated',
        'artist',
        updatedArtist.id,
        { name: updatedArtist.name_ko || '이름 없음' },
        {
          summary: `아티스트 프로필 수정: ${updatedArtist.name_ko || updatedArtist.id}`,
          beforeSnapshot: existingArtist || null,
          afterSnapshot: updatedArtist,
          reversible: true,
        }
      );
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/artworks');
    revalidatePath('/');

    const previousName = existingArtist?.name_ko;
    const nextName = name_ko;
    if (previousName) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(previousName)}`);
    }
    if (nextName && nextName !== previousName) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(nextName)}`);
    }

    return { message: '프로필이 성공적으로 수정되었습니다.', error: false };
  } catch (error: any) {
    console.error('Profile Update Error:', error);
    return {
      message: '프로필 수정 중 오류가 발생했습니다: ' + error.message,
      error: true,
    };
  }
}
