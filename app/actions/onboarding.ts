'use server';

import { createSupabaseServerClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/guards';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import { redirect } from 'next/navigation';
import { logArtistAction } from './activity-log-writer';
import { getRequestMetadata } from './request-metadata';
import { getActionErrorMessage } from '@/lib/utils/action-error';

export type OnboardingState = {
  message: string;
  error?: boolean;
};

export async function submitArtistApplication(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  void prevState;
  let redirectPath: string | null = null;

  try {
    const user = await requireAuth();
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .maybeSingle();

    // 정지된 계정은 재신청 불가. 서버 액션은 페이지 가드와 독립적이므로 여기에서 명시 차단.
    if (profile?.status === 'suspended') {
      return {
        message: '정지된 계정은 재신청할 수 없습니다. 관리자에게 문의해주세요.',
        error: true,
      };
    }

    const artistName = (formData.get('artist_name') as string | null)?.trim() || '';
    const contact = (formData.get('contact') as string | null)?.trim() || '';
    const bio = (formData.get('bio') as string | null)?.trim() || '';
    const referrer = (formData.get('referrer') as string | null)?.trim() || null;
    const termsAccepted = formData.get('terms_accepted') === 'on';
    const termsVersion = (formData.get('terms_version') as string | null)?.trim() || '';
    const termsReadComplete = formData.get('terms_read_complete') === '1';

    if (!artistName || !contact || !bio) {
      return { message: '모든 항목을 입력해주세요.', error: true };
    }

    if (!termsAccepted) {
      return { message: '전시·판매위탁 계약서 동의가 필요합니다.', error: true };
    }

    if (!termsReadComplete) {
      return { message: '계약서 전문을 끝까지 확인해주세요.', error: true };
    }

    if (termsVersion !== ARTIST_APPLICATION_TERMS_VERSION) {
      return {
        message: '최신 전시·판매위탁 계약서 확인 후 다시 동의해주세요.',
        error: true,
      };
    }

    const requestMetadata = await getRequestMetadata();

    const now = new Date().toISOString();
    const { error } = await supabase.from('artist_applications').upsert(
      {
        user_id: user.id,
        artist_name: artistName,
        contact,
        bio,
        referrer,
        terms_version: termsVersion,
        terms_accepted_at: now,
        terms_accepted_ip: requestMetadata.ip,
        terms_accepted_user_agent: requestMetadata.userAgent,
        privacy_version: PRIVACY_POLICY_VERSION,
        privacy_accepted_at: now,
        tos_version: TERMS_OF_SERVICE_VERSION,
        tos_accepted_at: now,
        updated_at: now,
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

    redirectPath =
      profile?.role === 'artist' && profile.status === 'active'
        ? '/dashboard/artworks'
        : '/dashboard/pending';
  } catch (error: unknown) {
    return {
      message: getActionErrorMessage(error, '신청 저장 중 오류가 발생했습니다.'),
      error: true,
    };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return { message: '신청이 완료되었습니다.' };
}
