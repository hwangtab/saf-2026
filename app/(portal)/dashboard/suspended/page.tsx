import { SignOutButton } from '@/components/auth/SignOutButton';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function SuspendedPage() {
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

  if (profile?.role !== 'artist') {
    redirect('/');
  }

  if (profile.status === 'active') {
    redirect('/dashboard/artworks');
  }

  if (profile.status === 'pending') {
    redirect('/dashboard/pending');
  }

  if (profile.status !== 'suspended') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md border border-red-100">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-red-600">계정 정지됨</h2>
          <div className="mt-4 text-5xl">🚫</div>
          <p className="mt-6 text-sm text-gray-600 leading-relaxed">
            회원님의 계정은 운영 정책 위반 또는 관리자의 판단에 의해
            <br />
            이용이 제한되었습니다.
            <br />
            문의사항이 있으시면 관리자에게 연락해주세요.
          </p>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
