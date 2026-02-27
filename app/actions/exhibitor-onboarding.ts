'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/guards';
import { EXHIBITOR_APPLICATION_TERMS_VERSION } from '@/lib/constants';
import { redirect } from 'next/navigation';
import { logExhibitorAction } from './admin-logs';
import { getRequestMetadata } from './request-metadata';

export type ExhibitorOnboardingState = {
  message: string;
  error?: boolean;
};

export async function submitExhibitorApplication(
  prevState: ExhibitorOnboardingState,
  formData: FormData
): Promise<ExhibitorOnboardingState> {
  void prevState;
  let shouldRedirect = false;

  try {
    const user = await requireAuth();
    const supabase = await createSupabaseServerClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'admin') {
      return { message: '출품자 권한이 없습니다.', error: true };
    }

    if (profile.role === 'artist' && profile.status === 'active') {
      return {
        message:
          '활성 작가 계정에서는 출품자 신청이 불가능합니다. 관리자에게 역할 전환을 요청해주세요.',
        error: true,
      };
    }

    const representativeName = (formData.get('representative_name') as string | null)?.trim() || '';
    const contact = (formData.get('contact') as string | null)?.trim() || '';
    const bio = (formData.get('bio') as string | null)?.trim() || '';
    const referrer = (formData.get('referrer') as string | null)?.trim() || null;
    const termsAccepted = formData.get('terms_accepted') === 'on';
    const termsVersion = (formData.get('terms_version') as string | null)?.trim() || '';

    if (!representativeName || !contact || !bio) {
      return { message: '모든 필수 항목을 입력해주세요.', error: true };
    }

    if (!termsAccepted) {
      return { message: '출품자 이용약관 동의가 필요합니다.', error: true };
    }

    if (termsVersion !== EXHIBITOR_APPLICATION_TERMS_VERSION) {
      return {
        message: '최신 출품자 이용약관 확인 후 다시 동의해주세요.',
        error: true,
      };
    }

    const requestMetadata = await getRequestMetadata();

    const { error } = await supabase.from('exhibitor_applications').upsert(
      {
        user_id: user.id,
        representative_name: representativeName,
        contact,
        bio,
        referrer,
        terms_version: termsVersion,
        terms_accepted_at: new Date().toISOString(),
        terms_accepted_ip: requestMetadata.ip,
        terms_accepted_user_agent: requestMetadata.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw error;

    if (
      profile.role !== 'exhibitor' ||
      (profile.status !== 'pending' && profile.status !== 'active')
    ) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ status: 'pending' })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;
    }

    // Fetch the application for snapshot
    const { data: application } = await supabase
      .from('exhibitor_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    await logExhibitorAction(
      'exhibitor_application_submitted',
      'exhibitor_application',
      user.id,
      {
        representative_name: representativeName,
      },
      {
        afterSnapshot: application,
        reversible: true,
      }
    );

    shouldRedirect = true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    return { message: `신청 저장 중 오류가 발생했습니다: ${message}`, error: true };
  }

  if (shouldRedirect) {
    redirect('/exhibitor/pending');
  }

  return { message: '신청이 완료되었습니다.' };
}
