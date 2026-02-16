'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { logArtistAction } from './admin-logs';

export type OnboardingState = {
  message: string;
  error?: boolean;
};

export async function submitArtistApplication(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  void prevState;
  let shouldRedirect = false;

  try {
    const user = await requireAuth();
    const supabase = await createSupabaseServerClient();

    const artistName = (formData.get('artist_name') as string | null)?.trim() || '';
    const contact = (formData.get('contact') as string | null)?.trim() || '';
    const bio = (formData.get('bio') as string | null)?.trim() || '';
    const referrer = (formData.get('referrer') as string | null)?.trim() || null;

    if (!artistName || !contact || !bio) {
      return { message: '모든 항목을 입력해주세요.', error: true };
    }

    const { error } = await supabase.from('artist_applications').upsert(
      {
        user_id: user.id,
        artist_name: artistName,
        contact,
        bio,
        referrer,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;

    // Fetch the application for snapshot
    const { data: application } = await supabase
      .from('artist_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    await logArtistAction(
      'artist_application_submitted',
      'artist_application',
      user.id,
      {
        artist_name: artistName,
      },
      {
        afterSnapshot: application,
        reversible: true,
      }
    );

    shouldRedirect = true;
  } catch (error: any) {
    return { message: `신청 저장 중 오류가 발생했습니다: ${error.message}`, error: true };
  }

  if (shouldRedirect) {
    redirect('/dashboard/pending');
  }

  return { message: '신청이 완료되었습니다.' };
}
