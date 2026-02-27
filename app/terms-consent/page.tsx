import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  buildTermsConsentPath,
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
  resolvePostLoginPath,
  sanitizeInternalPath,
} from '@/lib/auth/terms-consent';
import { TermsConsentForm } from './terms-consent-form';

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

  const [{ data: profile }, { data: artistApplication }, { data: exhibitorApplication }] =
    await Promise.all([
      supabase.from('profiles').select('role, status').eq('id', user.id).maybeSingle(),
      supabase
        .from('artist_applications')
        .select('artist_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('exhibitor_applications')
        .select('representative_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  const needsArtistConsent = needsArtistTermsConsent(artistApplication);
  const needsExhibitorConsent = needsExhibitorTermsConsent(exhibitorApplication);
  const hasArtist = hasArtistApplication(artistApplication);
  const hasExhibitor = hasExhibitorApplication(exhibitorApplication);

  if (!needsArtistConsent && !needsExhibitorConsent) {
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

  const routeForDisplay = buildTermsConsentPath({
    nextPath,
    needsArtistConsent,
    needsExhibitorConsent,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl md:p-8">
        <h1 className="text-2xl font-bold text-gray-900">약관 재동의가 필요합니다</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          기존 신청자 보호를 위해 역할별 약관을 한 번 더 확인해주세요. 동의 후 기존 화면으로 자동
          이동합니다.
        </p>
        <p className="mt-2 text-xs text-gray-400">요청 경로: {routeForDisplay}</p>

        <div className="mt-6">
          <TermsConsentForm
            nextPath={nextPath}
            needsArtistConsent={needsArtistConsent}
            needsExhibitorConsent={needsExhibitorConsent}
          />
        </div>
      </div>
    </div>
  );
}
