import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch profile to determine where to redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        }

        if (profile?.role === 'artist') {
          if (profile.status === 'active') {
            return NextResponse.redirect(`${origin}/dashboard/artworks`);
          }
          if (profile.status === 'pending') {
            return NextResponse.redirect(`${origin}/dashboard/pending`);
          }
          if (profile.status === 'suspended') {
            return NextResponse.redirect(`${origin}/dashboard/suspended`);
          }
        }
      }
    }
  }

  // Default redirect for general users or any fallback
  return NextResponse.redirect(`${origin}/dashboard`);
}
