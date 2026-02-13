import { SignOutButton } from '@/components/auth/SignOutButton';
import Button from '@/components/ui/Button';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export default async function PendingPage() {
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

  if (profile.status === 'suspended') {
    redirect('/dashboard/suspended');
  }

  const { data: application } = await supabase
    .from('artist_applications')
    .select('artist_name, contact, bio')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasApplication =
    !!application?.artist_name?.trim() &&
    !!application?.contact?.trim() &&
    !!application?.bio?.trim();

  // If already active, go to artist dashboard
  if (profile?.status === 'active') {
    redirect('/dashboard/artworks');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">승인 대기 중</h2>
          <div className="mt-4 text-5xl">⏳</div>
          <p className="mt-6 text-sm text-gray-600 leading-relaxed">
            회원가입 신청이 접수되었습니다.
            <br />
            관리자의 승인 후 작가 활동을 시작할 수 있습니다.
            <br />
            승인이 완료되면 서비스를 이용하실 수 있습니다.
          </p>
        </div>
        {!hasApplication ? (
          <div className="pt-2">
            <Button href="/onboarding" variant="primary" className="w-full">
              작가 정보 입력하기
            </Button>
          </div>
        ) : (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
            제출 완료: {application?.artist_name}
          </div>
        )}
        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
