import { SignOutButton } from '@/components/auth/SignOutButton';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import { requireAuth } from '@/lib/auth/guards';
import {
  EXHIBITOR_APPLICATION_CONSENT_SELECT,
  buildTermsConsentPath,
  hasExhibitorApplication,
  needsExhibitorTermsConsent,
  needsPrivacyConsent,
  needsTosConsent,
} from '@/lib/auth/terms-consent';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

export default async function ExhibitorPendingPage() {
  const t = await getTranslations('exhibitor.pending');
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

  if (!profile || (profile.role !== 'exhibitor' && profile.role !== 'user')) {
    redirect('/');
  }

  if (profile.role === 'exhibitor' && profile.status === 'active') {
    redirect('/exhibitor');
  }

  if (profile.role === 'exhibitor' && profile.status === 'suspended') {
    redirect('/exhibitor/suspended');
  }

  const { data: application, error: applicationError } = await supabase
    .from('exhibitor_applications')
    .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
    .eq('user_id', user.id)
    .maybeSingle();

  if (applicationError) {
    throw new Error('신청 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  const hasApplication = hasExhibitorApplication(application);
  const needsTermsConsent = needsExhibitorTermsConsent(application);
  const needsPrivacy = needsPrivacyConsent(application);
  const needsTos = needsTosConsent(application);

  if (needsTermsConsent || needsPrivacy || needsTos) {
    redirect(
      buildTermsConsentPath({
        nextPath: '/exhibitor/pending',
        needsExhibitorConsent: needsTermsConsent,
        needsPrivacyConsent: needsPrivacy,
        needsTosConsent: needsTos,
      })
    );
  }

  if (!hasApplication) {
    redirect('/exhibitor/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-charcoal">{t('title')}</h2>
          <div className="mt-4 text-5xl">⏳</div>
          <p className="mt-6 text-sm text-charcoal-muted leading-relaxed">
            {t('applicationSubmitted')}
            <br />
            {t('awaitingApproval')}
            <br />
            {t('readyToUse')}
          </p>
        </div>
        <div className="rounded-md bg-success/10 px-4 py-3 text-sm text-success-a11y">
          {t('submitted')} {application?.representative_name}
        </div>
        <div className="pt-4 border-t border-charcoal/10">
          <SignOutButton />
        </div>
      </div>
      <FeedbackButton />
    </div>
  );
}
