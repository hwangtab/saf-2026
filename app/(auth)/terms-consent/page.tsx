import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  ARTIST_APPLICATION_CONSENT_SELECT,
  EXHIBITOR_APPLICATION_CONSENT_SELECT,
  hasArtistApplication,
  hasExhibitorApplication,
  needsExhibitorTermsConsent,
  needsPrivacyConsent,
  needsTosConsent,
  resolveArtistReconsentRequirements,
  resolvePostLoginPath,
  sanitizeInternalPath,
} from '@/lib/auth/terms-consent';
import { TermsConsentForm } from './terms-consent-form';
import { SignOutButton } from '@/components/auth/SignOutButton';

type SearchParams = {
  next?: string;
};

export default async function TermsConsentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const requestedNextPath = sanitizeInternalPath(params.next, '/onboarding');
  const supabase = await createSupabaseServerClient();

  const [profileResult, artistResult, exhibitorResult] = await Promise.all([
    supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle(),
    supabase
      .from('artist_applications')
      .select(ARTIST_APPLICATION_CONSENT_SELECT)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('exhibitor_applications')
      .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다.');
  }

  if (artistResult.error || exhibitorResult.error) {
    throw new Error('신청 정보를 확인하는 중 오류가 발생했습니다.');
  }

  const profile = profileResult.data;
  const artistApplication = artistResult.data;
  const exhibitorApplication = exhibitorResult.data;

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  const hasArtist = hasArtistApplication(artistApplication);
  const hasExhibitor = hasExhibitorApplication(exhibitorApplication);

  // 단일 역할 시스템: 현재 역할에 해당하는 계약서만 표시
  // role='user'(미승인)이면 출품자 신청 우선 (로그인 콜백과 동일한 우선순위)
  const isArtistRole = profile?.role === 'artist';
  const isExhibitorRole = profile?.role === 'exhibitor';
  const showArtist = isArtistRole || (!isExhibitorRole && !hasExhibitor && hasArtist);
  const showExhibitor = isExhibitorRole || (!isArtistRole && hasExhibitor);

  const artistReconsent = resolveArtistReconsentRequirements(artistApplication);
  const needsArtistConsent = showArtist ? artistReconsent.needsArtistConsent : false;
  const needsExhibitorConsent = showExhibitor
    ? needsExhibitorTermsConsent(exhibitorApplication)
    : false;
  const needsPrivacy = needsPrivacyConsent(exhibitorApplication);
  const needsTos =
    (showArtist ? artistReconsent.needsTosConsent : false) ||
    (showExhibitor ? needsTosConsent(exhibitorApplication) : false);

  if (!needsArtistConsent && !needsExhibitorConsent && !needsPrivacy && !needsTos) {
    redirect(
      resolvePostLoginPath({
        role: profile?.role,
        status: profile?.status,
        hasArtistApplication: hasArtist,
        hasExhibitorApplication: hasExhibitor,
      })
    );
  }

  const nextPath = sanitizeInternalPath(
    requestedNextPath,
    resolvePostLoginPath({
      role: profile?.role,
      status: profile?.status,
      hasArtistApplication: hasArtist,
      hasExhibitorApplication: hasExhibitor,
    })
  );

  const headingText =
    needsArtistConsent || needsExhibitorConsent || needsTos
      ? '계약 재동의가 필요합니다'
      : '개인정보처리방침 재동의가 필요합니다';

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-24 pb-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{headingText}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              문서 내용이 업데이트되었습니다. 변경된 내용을 확인하고 다시 동의해주세요. 동의 후 기존
              화면으로 자동 이동합니다.
            </p>
          </div>
          <SignOutButton />
        </div>

        <TermsConsentForm
          nextPath={nextPath}
          needsArtistConsent={needsArtistConsent}
          needsExhibitorConsent={needsExhibitorConsent}
          needsPrivacyConsent={needsPrivacy}
          needsTosConsent={needsTos}
        />
      </div>
    </div>
  );
}
