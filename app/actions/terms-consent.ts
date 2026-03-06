'use server';

import { redirect } from 'next/navigation';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  ARTIST_APPLICATION_CONSENT_SELECT,
  EXHIBITOR_APPLICATION_CONSENT_SELECT,
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
  needsPrivacyConsent,
  needsTosConsent,
  resolvePostLoginPath,
  sanitizeInternalPath,
  type ArtistApplicationTermsRecord,
  type ExhibitorApplicationTermsRecord,
} from '@/lib/auth/terms-consent';
import { getRequestMetadata } from './request-metadata';

export type TermsConsentState = {
  message: string;
  error?: boolean;
};

type ConsentStatus = {
  profileRole: 'admin' | 'artist' | 'user' | 'exhibitor' | null;
  profileStatus: 'pending' | 'active' | 'suspended' | null;
  artistApplication: ArtistApplicationTermsRecord | null;
  exhibitorApplication: ExhibitorApplicationTermsRecord | null;
};

async function loadConsentStatus(userId: string): Promise<ConsentStatus> {
  const supabase = await createSupabaseServerClient();
  const [profileResult, artistResult, exhibitorResult] = await Promise.all([
    supabase.from('profiles').select('role, status').eq('id', userId).maybeSingle(),
    supabase
      .from('artist_applications')
      .select(ARTIST_APPLICATION_CONSENT_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('exhibitor_applications')
      .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다.');
  }

  const profile = profileResult.data;
  return {
    profileRole: (profile?.role as ConsentStatus['profileRole']) || null,
    profileStatus: (profile?.status as ConsentStatus['profileStatus']) || null,
    artistApplication: artistResult.data,
    exhibitorApplication: exhibitorResult.data,
  };
}

export async function submitTermsConsent(
  _prevState: TermsConsentState,
  formData: FormData
): Promise<TermsConsentState> {
  const user = await requireAuth();
  const nextPath = sanitizeInternalPath(
    (formData.get('next_path') as string | null) || null,
    '/onboarding'
  );
  const status = await loadConsentStatus(user.id);

  if (status.profileRole === 'admin') {
    redirect('/admin/dashboard');
  }

  const needsArtistConsent = needsArtistTermsConsent(status.artistApplication);
  const needsExhibitorConsent = needsExhibitorTermsConsent(status.exhibitorApplication);
  const needsPrivacy =
    needsPrivacyConsent(status.artistApplication) ||
    needsPrivacyConsent(status.exhibitorApplication);
  const needsTos =
    needsTosConsent(status.artistApplication) || needsTosConsent(status.exhibitorApplication);

  if (!needsArtistConsent && !needsExhibitorConsent && !needsPrivacy && !needsTos) {
    redirect(
      resolvePostLoginPath({
        role: status.profileRole,
        status: status.profileStatus,
        hasArtistApplication: hasArtistApplication(status.artistApplication),
        hasExhibitorApplication: hasExhibitorApplication(status.exhibitorApplication),
      })
    );
  }

  const artistAgreed = formData.get('agree_artist') === 'on';
  const exhibitorAgreed = formData.get('agree_exhibitor') === 'on';
  const privacyAgreed = formData.get('agree_privacy') === 'on';
  const tosAgreed = formData.get('agree_tos') === 'on';
  const artistTermsReadComplete = formData.get('artist_terms_read_complete') === '1';
  const exhibitorTermsReadComplete = formData.get('exhibitor_terms_read_complete') === '1';
  const privacyReadComplete = formData.get('privacy_read_complete') === '1';
  const tosReadComplete = formData.get('tos_read_complete') === '1';

  if (needsArtistConsent && !artistAgreed) {
    return { message: '전시·판매위탁 계약서 동의가 필요합니다.', error: true };
  }

  if (needsArtistConsent && !artistTermsReadComplete) {
    return { message: '전시·판매위탁 계약서 전문을 끝까지 확인해주세요.', error: true };
  }

  if (needsExhibitorConsent && !exhibitorAgreed) {
    return { message: '출품자 전시위탁 계약서 동의가 필요합니다.', error: true };
  }

  if (needsExhibitorConsent && !exhibitorTermsReadComplete) {
    return { message: '출품자 전시위탁 계약서 전문을 끝까지 확인해주세요.', error: true };
  }

  if (needsPrivacy && !privacyAgreed) {
    return { message: '개인정보처리방침 동의가 필요합니다.', error: true };
  }

  if (needsPrivacy && !privacyReadComplete) {
    return { message: '개인정보처리방침 전문을 끝까지 확인해주세요.', error: true };
  }

  if (needsTos && !tosAgreed) {
    return { message: '이용약관 동의가 필요합니다.', error: true };
  }

  if (needsTos && !tosReadComplete) {
    return { message: '이용약관 전문을 끝까지 확인해주세요.', error: true };
  }

  const requestMetadata = await getRequestMetadata();
  const acceptedAt = new Date().toISOString();
  const supabase = await createSupabaseServerClient();

  const updates: Promise<{ target: string; error: unknown }>[] = [];

  if (
    hasArtistApplication(status.artistApplication) &&
    (needsArtistConsent || needsPrivacy || needsTos)
  ) {
    updates.push(
      (async () => {
        const updateData: Record<string, string | null> = { updated_at: acceptedAt };
        if (needsArtistConsent) {
          updateData.terms_version = ARTIST_APPLICATION_TERMS_VERSION;
          updateData.terms_accepted_at = acceptedAt;
          updateData.terms_accepted_ip = requestMetadata.ip;
          updateData.terms_accepted_user_agent = requestMetadata.userAgent;
        }
        if (needsPrivacy) {
          updateData.privacy_version = PRIVACY_POLICY_VERSION;
          updateData.privacy_accepted_at = acceptedAt;
        }
        if (needsTos) {
          updateData.tos_version = TERMS_OF_SERVICE_VERSION;
          updateData.tos_accepted_at = acceptedAt;
        }
        const { error } = await supabase
          .from('artist_applications')
          .update(updateData)
          .eq('user_id', user.id);
        return { target: '아티스트', error };
      })()
    );
  }

  if (
    hasExhibitorApplication(status.exhibitorApplication) &&
    (needsExhibitorConsent || needsPrivacy || needsTos)
  ) {
    updates.push(
      (async () => {
        const updateData: Record<string, string | null> = { updated_at: acceptedAt };
        if (needsExhibitorConsent) {
          updateData.terms_version = EXHIBITOR_APPLICATION_TERMS_VERSION;
          updateData.terms_accepted_at = acceptedAt;
          updateData.terms_accepted_ip = requestMetadata.ip;
          updateData.terms_accepted_user_agent = requestMetadata.userAgent;
        }
        if (needsPrivacy) {
          updateData.privacy_version = PRIVACY_POLICY_VERSION;
          updateData.privacy_accepted_at = acceptedAt;
        }
        if (needsTos) {
          updateData.tos_version = TERMS_OF_SERVICE_VERSION;
          updateData.tos_accepted_at = acceptedAt;
        }
        const { error } = await supabase
          .from('exhibitor_applications')
          .update(updateData)
          .eq('user_id', user.id);
        return { target: '출품자', error };
      })()
    );
  }

  const results = await Promise.all(updates);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    const targets = failed.map((f) => f.target).join(', ');
    return { message: `${targets} 계약서 동의 저장 중 오류가 발생했습니다.`, error: true };
  }

  redirect(nextPath);
}
