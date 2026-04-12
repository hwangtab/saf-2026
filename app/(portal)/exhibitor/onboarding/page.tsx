import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { ExhibitorOnboardingForm } from './exhibitor-onboarding-form';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { getTranslations } from 'next-intl/server';

export default async function ExhibitorOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ recover?: string }>;
}) {
  const t = await getTranslations('exhibitor.onboarding');
  const user = await requireAuth();
  const params = await searchParams;
  const isRecoveryFlow = params.recover === '1';
  const supabase = await createSupabaseServerClient();

  // Fetch profile and existing application in parallel (both need only user.id).
  const [profileResult, applicationResult] = await Promise.all([
    supabase.from('profiles').select('role, status').eq('id', user.id).single(),
    supabase
      .from('exhibitor_applications')
      .select('representative_name, contact, bio, referrer')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (applicationResult.error) {
    throw new Error('신청 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  const profile = profileResult.data;
  const application = applicationResult.data;

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (profile?.role === 'artist' && profile?.status === 'active') {
    redirect('/onboarding?recover=1');
  }

  if (profile?.role === 'exhibitor' && profile?.status === 'active') {
    if (!isRecoveryFlow) {
      redirect('/exhibitor');
    }
  }

  if (profile?.role === 'exhibitor' && profile?.status === 'suspended') {
    redirect('/exhibitor/suspended');
  }

  const isExhibitorRecovery =
    isRecoveryFlow && profile?.role === 'exhibitor' && profile?.status === 'active';

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col justify-center pt-12 pb-16 lg:pb-24 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <SignOutButton />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SAF Online
          <br />
          <span className="text-xl font-medium text-gray-600">
            {isExhibitorRecovery ? t('recoveryTitle') : t('onboardingTitle')}
          </span>
        </h2>
        <p className="mt-4 text-center text-sm text-gray-500">
          {isExhibitorRecovery ? t('recoveryDescription') : t('onboardingDescription')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-2xl sm:px-10">
          <ExhibitorOnboardingForm defaultValues={application} />
        </div>
      </div>
    </div>
  );
}
