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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          return NextResponse.redirect(`${origin}/login`);
        }

        if (profile?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        }

        if (profile?.role === 'artist') {
          if (profile.status === 'active') {
            return NextResponse.redirect(`${origin}/dashboard/artworks`);
          }
          if (profile.status === 'pending') {
            const { data: application } = await supabase
              .from('artist_applications')
              .select('artist_name, contact, bio')
              .eq('user_id', user.id)
              .maybeSingle();

            const hasApplication =
              !!application?.artist_name?.trim() &&
              !!application?.contact?.trim() &&
              !!application?.bio?.trim();

            return NextResponse.redirect(
              hasApplication ? `${origin}/dashboard/pending` : `${origin}/onboarding`
            );
          }
          if (profile.status === 'suspended') {
            return NextResponse.redirect(`${origin}/dashboard/suspended`);
          }
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
