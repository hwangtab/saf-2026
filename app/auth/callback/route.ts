import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  buildTermsConsentPath,
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
} from '@/lib/auth/terms-consent';

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

        if (profile?.role === 'exhibitor') {
          const { data: application } = await supabase
            .from('exhibitor_applications')
            .select('representative_name, contact, bio, terms_version, terms_accepted_at')
            .eq('user_id', user.id)
            .maybeSingle();

          const hasApplication = hasExhibitorApplication(application);
          const needsTermsConsent = needsExhibitorTermsConsent(application);

          if (profile.status === 'suspended') {
            return NextResponse.redirect(`${origin}/exhibitor/suspended`);
          }

          if (profile.status === 'active') {
            return NextResponse.redirect(
              hasApplication
                ? `${origin}${
                    needsTermsConsent
                      ? buildTermsConsentPath({
                          nextPath: '/exhibitor',
                          needsExhibitorConsent: true,
                        })
                      : '/exhibitor'
                  }`
                : `${origin}/exhibitor/onboarding?recover=1`
            );
          }

          return NextResponse.redirect(
            hasApplication
              ? `${origin}${
                  needsTermsConsent
                    ? buildTermsConsentPath({
                        nextPath: '/exhibitor/pending',
                        needsExhibitorConsent: true,
                      })
                    : '/exhibitor/pending'
                }`
              : `${origin}/exhibitor/onboarding`
          );
        }

        if (profile?.role === 'artist') {
          const { data: application } = await supabase
            .from('artist_applications')
            .select('artist_name, contact, bio, terms_version, terms_accepted_at')
            .eq('user_id', user.id)
            .maybeSingle();

          const hasApplication = hasArtistApplication(application);
          const needsTermsConsent = needsArtistTermsConsent(application);

          if (profile.status === 'active') {
            return NextResponse.redirect(
              hasApplication
                ? `${origin}${
                    needsTermsConsent
                      ? buildTermsConsentPath({
                          nextPath: '/dashboard/artworks',
                          needsArtistConsent: true,
                        })
                      : '/dashboard/artworks'
                  }`
                : `${origin}/onboarding?recover=1`
            );
          }

          if (profile.status === 'pending') {
            return NextResponse.redirect(
              hasApplication
                ? `${origin}${
                    needsTermsConsent
                      ? buildTermsConsentPath({
                          nextPath: '/dashboard/pending',
                          needsArtistConsent: true,
                        })
                      : '/dashboard/pending'
                  }`
                : `${origin}/onboarding`
            );
          }
          if (profile.status === 'suspended') {
            return NextResponse.redirect(`${origin}/dashboard/suspended`);
          }
        }

        if (profile?.role === 'user') {
          const [{ data: exhibitorApplication }, { data: artistApplication }] = await Promise.all([
            supabase
              .from('exhibitor_applications')
              .select('representative_name, contact, bio, terms_version, terms_accepted_at')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('artist_applications')
              .select('artist_name, contact, bio, terms_version, terms_accepted_at')
              .eq('user_id', user.id)
              .maybeSingle(),
          ]);

          const hasExhibitorApplicationData = hasExhibitorApplication(exhibitorApplication);
          const hasArtistApplicationData = hasArtistApplication(artistApplication);
          const needsExhibitorConsent = needsExhibitorTermsConsent(exhibitorApplication);
          const needsArtistConsent = needsArtistTermsConsent(artistApplication);

          if (hasExhibitorApplicationData) {
            return NextResponse.redirect(
              `${origin}${
                needsExhibitorConsent
                  ? buildTermsConsentPath({
                      nextPath: '/exhibitor/pending',
                      needsExhibitorConsent: true,
                    })
                  : '/exhibitor/pending'
              }`
            );
          }

          if (hasArtistApplicationData) {
            return NextResponse.redirect(
              `${origin}${
                needsArtistConsent
                  ? buildTermsConsentPath({
                      nextPath: '/dashboard/pending',
                      needsArtistConsent: true,
                    })
                  : '/dashboard/pending'
              }`
            );
          }

          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
