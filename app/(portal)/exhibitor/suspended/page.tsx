import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/auth/SignOutButton';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { getTranslations } from 'next-intl/server';

export default async function ExhibitorSuspendedPage() {
  const t = await getTranslations('exhibitor.suspended');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-2xl shadow-sm border border-danger/20">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-danger-a11y">{t('title')}</h2>
          <div className="mt-4 text-5xl">🚫</div>
          <p className="mt-6 text-sm text-charcoal-muted leading-relaxed">
            {t('description')}
            <br />
            {t('contactSupport')}
          </p>
        </div>
        <div className="pt-4 border-t border-charcoal/10">
          <SignOutButton />
        </div>
      </div>
      <FeedbackButton />
    </div>
  );
}
