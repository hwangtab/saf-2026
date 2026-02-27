import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { ExhibitorOnboardingForm } from './exhibitor-onboarding-form';

export default async function ExhibitorOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ recover?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const isRecoveryFlow = params.recover === '1';
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

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

  // Fetch existing application if any
  const { data: application } = await supabase
    .from('exhibitor_applications')
    .select('representative_name, contact, bio, referrer')
    .eq('user_id', user.id)
    .maybeSingle();

  const isExhibitorRecovery =
    isRecoveryFlow && profile?.role === 'exhibitor' && profile?.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center pt-12 pb-16 lg:pb-24 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SAF 2026
          <br />
          <span className="text-xl font-medium text-gray-600">
            {isExhibitorRecovery ? '출품자 정보 복구' : '출품자 정보 입력'}
          </span>
        </h2>
        <p className="mt-4 text-center text-sm text-gray-500">
          {isExhibitorRecovery
            ? '기존 출품자 계정의 신청서 정보가 누락되어 복구가 필요합니다. 정보 저장 후 바로 출품자 대시보드로 이동합니다.'
            : '승인 심사를 위해 정보를 제출해주세요. 제출 후에는 관리자 승인 전까지 출품자 대시보드 접근이 제한됩니다.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <ExhibitorOnboardingForm defaultValues={application} />
        </div>
      </div>
    </div>
  );
}
