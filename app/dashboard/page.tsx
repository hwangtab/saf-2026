import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (profile?.role === 'artist') {
    if (profile.status === 'active') {
      redirect('/dashboard/artworks');
    }
    if (profile.status === 'pending') {
      redirect('/dashboard/pending');
    }
    if (profile.status === 'suspended') {
      redirect('/dashboard/suspended');
    }
  }

  // Default fallback for general users or missing profiles
  redirect('/');
}
