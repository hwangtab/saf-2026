'use server';

import { redirect } from 'next/navigation';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
} from '@/lib/constants';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
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
  const [{ data: profile }, { data: artistApplication }, { data: exhibitorApplication }] =
    await Promise.all([
      supabase.from('profiles').select('role, status').eq('id', userId).maybeSingle(),
      supabase
        .from('artist_applications')
        .select('artist_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('exhibitor_applications')
        .select('representative_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  return {
    profileRole: (profile?.role as ConsentStatus['profileRole']) || null,
    profileStatus: (profile?.status as ConsentStatus['profileStatus']) || null,
    artistApplication,
    exhibitorApplication,
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

  if (!needsArtistConsent && !needsExhibitorConsent) {
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

  if (needsArtistConsent && !artistAgreed) {
    return { message: '아티스트 이용약관 동의가 필요합니다.', error: true };
  }

  if (needsExhibitorConsent && !exhibitorAgreed) {
    return { message: '출품자 이용약관 동의가 필요합니다.', error: true };
  }

  const requestMetadata = await getRequestMetadata();
  const acceptedAt = new Date().toISOString();
  const supabase = await createSupabaseServerClient();

  if (needsArtistConsent && hasArtistApplication(status.artistApplication)) {
    const { error } = await supabase
      .from('artist_applications')
      .update({
        terms_version: ARTIST_APPLICATION_TERMS_VERSION,
        terms_accepted_at: acceptedAt,
        terms_accepted_ip: requestMetadata.ip,
        terms_accepted_user_agent: requestMetadata.userAgent,
        updated_at: acceptedAt,
      })
      .eq('user_id', user.id);

    if (error) {
      return { message: `약관 동의 저장 중 오류가 발생했습니다: ${error.message}`, error: true };
    }
  }

  if (needsExhibitorConsent && hasExhibitorApplication(status.exhibitorApplication)) {
    const { error } = await supabase
      .from('exhibitor_applications')
      .update({
        terms_version: EXHIBITOR_APPLICATION_TERMS_VERSION,
        terms_accepted_at: acceptedAt,
        terms_accepted_ip: requestMetadata.ip,
        terms_accepted_user_agent: requestMetadata.userAgent,
        updated_at: acceptedAt,
      })
      .eq('user_id', user.id);

    if (error) {
      return { message: `약관 동의 저장 중 오류가 발생했습니다: ${error.message}`, error: true };
    }
  }

  redirect(nextPath);
}
