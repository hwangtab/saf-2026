import { SignOutButton } from '@/components/auth/SignOutButton';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import { requireAuth } from '@/lib/auth/guards';
import {
  ARTIST_APPLICATION_CONSENT_SELECT,
  buildTermsConsentPath,
  hasArtistApplication,
  resolveArtistReconsentRequirements,
} from '@/lib/auth/terms-consent';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

export default async function PendingPage() {
  const t = await getTranslations('dashboard.pending');
  const user = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (!profile || (profile.role !== 'artist' && profile.role !== 'user')) {
    redirect('/');
  }

  if (profile.role === 'artist' && profile.status === 'suspended') {
    redirect('/dashboard/suspended');
  }

  const { data: application, error: applicationError } = await supabase
    .from('artist_applications')
    .select(ARTIST_APPLICATION_CONSENT_SELECT)
    .eq('user_id', user.id)
    .maybeSingle();

  if (applicationError) {
    throw new Error('신청 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  const hasApplication = hasArtistApplication(application);
  const artistReconsent = resolveArtistReconsentRequirements(application);

  if (
    artistReconsent.needsArtistConsent ||
    artistReconsent.needsPrivacyConsent ||
    artistReconsent.needsTosConsent
  ) {
    redirect(
      buildTermsConsentPath({
        nextPath: '/dashboard/pending',
        needsArtistConsent: artistReconsent.needsArtistConsent,
        needsPrivacyConsent: artistReconsent.needsPrivacyConsent,
        needsTosConsent: artistReconsent.needsTosConsent,
      })
    );
  }

  if (profile.role === 'artist' && profile.status === 'active') {
    redirect('/dashboard/artworks');
  }

  if (!hasApplication) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{t('title')}</h2>
          <div className="mt-4 text-5xl">⏳</div>
          <p className="mt-6 text-sm text-gray-600 leading-relaxed">
            {t('applicationSubmitted')}
            <br />
            {t('awaitingApproval')}
            <br />
            {t('readyToUse')}
          </p>
        </div>
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
          {t('submitted')} {application?.artist_name}
        </div>
        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
      <FeedbackButton />
    </div>
  );
}
