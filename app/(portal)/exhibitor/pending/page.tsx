import { SignOutButton } from '@/components/auth/SignOutButton';
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

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

  const { data: application } = await supabase
    .from('exhibitor_applications')
    .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
    .eq('user_id', user.id)
    .maybeSingle();

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
          {t('submitted')} {application?.representative_name}
        </div>
        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
