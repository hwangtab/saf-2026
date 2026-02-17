import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (profile?.role === 'exhibitor') {
    redirect('/exhibitor');
  }

  if (profile?.role === 'artist') {
    if (profile.status === 'active') {
      redirect('/dashboard/artworks');
    }
    if (profile.status === 'pending') {
      const { data: application, error: applicationError } = await supabase
        .from('artist_applications')
        .select('artist_name, contact, bio')
        .eq('user_id', user.id)
        .maybeSingle();

      if (applicationError) {
        throw new Error('신청 상태를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }

      const hasApplication =
        !!application?.artist_name?.trim() &&
        !!application?.contact?.trim() &&
        !!application?.bio?.trim();

      redirect(hasApplication ? '/dashboard/pending' : '/onboarding');
    }
    if (profile.status === 'suspended') {
      redirect('/dashboard/suspended');
    }
  }

  if (profile?.role === 'user') {
    const [{ data: exhibitorApplication }, { data: artistApplication }] = await Promise.all([
      supabase
        .from('exhibitor_applications')
        .select('representative_name, contact, bio')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('artist_applications')
        .select('artist_name, contact, bio')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const hasExhibitorApplication =
      !!exhibitorApplication?.representative_name?.trim() &&
      !!exhibitorApplication?.contact?.trim() &&
      !!exhibitorApplication?.bio?.trim();

    const hasArtistApplication =
      !!artistApplication?.artist_name?.trim() &&
      !!artistApplication?.contact?.trim() &&
      !!artistApplication?.bio?.trim();

    if (hasExhibitorApplication) {
      redirect('/exhibitor/pending');
    }

    if (hasArtistApplication) {
      redirect('/dashboard/pending');
    }
  }

  redirect('/onboarding');
}
