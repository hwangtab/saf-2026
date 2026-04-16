'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireArtistActive } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { logArtistAction } from './activity-log-writer';
import { getActionErrorMessage } from '@/lib/utils/action-error';
import { validateTextLength, validateUrl, validateEmail } from '@/lib/utils/input-validation';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { ActionState } from '@/types';

export type { ActionState } from '@/types';

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

    const name_ko = validateTextLength(formData.get('name_ko') as string, 100, '한국어 이름');
    const name_en = validateTextLength(formData.get('name_en') as string, 100, '영어 이름');
    const bio = validateTextLength(formData.get('bio') as string, 5000, '소개');
    const history = validateTextLength(formData.get('history') as string, 10000, '이력');
    const profile_image = (formData.get('profile_image') as string)?.trim() || '';
    const contact_email = validateEmail(formData.get('contact_email') as string | null);
    const instagram = validateUrl(formData.get('instagram') as string | null);
    const homepage = validateUrl(formData.get('homepage') as string | null);

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
    const previousName = existingArtist?.name_ko;
    const nextName = name_ko;
    revalidatePublicArtworkSurfaces([previousName, nextName]);

    return { message: '프로필이 성공적으로 수정되었습니다.', error: false };
  } catch (error: unknown) {
    console.error('Profile Update Error:', error);
    return {
      message: getActionErrorMessage(error, '프로필 수정 중 오류가 발생했습니다.'),
      error: true,
    };
  }
}
