import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { ExhibitorOnboardingForm } from './exhibitor-onboarding-form';

export default async function ExhibitorOnboardingPage() {
  const user = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  // Only exhibitors can access this page
  if (profile?.role !== 'exhibitor') {
    if (profile?.role === 'admin') {
      redirect('/admin/dashboard');
    }
    if (profile?.role === 'artist') {
      redirect('/dashboard');
    }
    redirect('/');
  }

  // If already active, redirect to exhibitor dashboard
  if (profile?.status === 'active') {
    redirect('/exhibitor');
  }

  // Fetch existing application if any
  const { data: application } = await supabase
    .from('exhibitor_applications')
    .select('representative_name, contact, bio, referrer')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center pt-12 pb-16 lg:pb-24 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SAF 2026
          <br />
          <span className="text-xl font-medium text-gray-600">출품자 정보 입력</span>
        </h2>
        <p className="mt-4 text-center text-sm text-gray-500">
          승인 심사를 위해 정보를 제출해주세요. 제출 후에는 관리자 승인 전까지 출품자 대시보드
          접근이 제한됩니다.
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
