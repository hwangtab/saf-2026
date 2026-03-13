import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { getServerLocale } from '@/lib/server-locale';

export default async function ExhibitorSuspendedPage() {
  const locale = await getServerLocale();
  const isEnglish = locale === 'en';
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

  if (profile?.role !== 'exhibitor') {
    redirect('/');
  }

  if (profile.status === 'active') {
    redirect('/exhibitor');
  }

  if (profile.status === 'pending') {
    redirect('/exhibitor/pending');
  }

  if (profile.status !== 'suspended') {
    redirect('/exhibitor/onboarding');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md border border-red-100">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-red-600">
            {isEnglish ? 'Exhibitor Account Suspended' : '출품자 계정 정지됨'}
          </h2>
          <div className="mt-4 text-5xl">🚫</div>
          <p className="mt-6 text-sm text-gray-600 leading-relaxed">
            {isEnglish
              ? 'Your exhibitor account has been restricted based on operating policies.'
              : '출품자 계정이 운영 정책에 따라 제한되었습니다.'}
            <br />
            {isEnglish
              ? 'If you need help, please contact the operations team.'
              : '문의가 필요하면 운영팀으로 연락해주세요.'}
          </p>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
