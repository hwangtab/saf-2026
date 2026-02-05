'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';

export type OnboardingState = {
  message: string;
  error?: boolean;
};

export async function submitArtistApplication(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  try {
    void prevState;
    const user = await requireAuth();
    const supabase = await createSupabaseServerClient();

    const artistName = (formData.get('artist_name') as string | null)?.trim() || '';
    const contact = (formData.get('contact') as string | null)?.trim() || '';
    const bio = (formData.get('bio') as string | null)?.trim() || '';

    if (!artistName || !contact || !bio) {
      return { message: '모든 항목을 입력해주세요.', error: true };
    }

    const { error } = await supabase.from('artist_applications').upsert(
      {
        user_id: user.id,
        artist_name: artistName,
        contact,
        bio,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;

    redirect('/dashboard/pending');
  } catch (error: any) {
    return { message: `신청 저장 중 오류가 발생했습니다: ${error.message}`, error: true };
  }
}
