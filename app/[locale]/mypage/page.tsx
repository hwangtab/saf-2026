import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import MypageTabs from './_components/MypageTabs';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mypage' });
  return {
    title: t('title'),
    robots: { index: false },
  };
}

export default async function MypagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/mypage');
  }

  const [ordersResult, wishlistResult, profileResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_no, artwork_id, status, total_amount, created_at, buyer_name')
      .eq('buyer_user_id', user.id)
      .neq('status', 'pending_payment')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('wishlists')
      .select('artwork_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('role, marketing_consent').eq('id', user.id).maybeSingle(),
  ]);

  const orders = ordersResult.data ?? [];
  const wishlistIds = (wishlistResult.data ?? []).map((w) => w.artwork_id);
  const role =
    (profileResult.data as { role: string; marketing_consent: boolean } | null)?.role ?? null;
  const marketingConsent =
    (profileResult.data as { role: string; marketing_consent: boolean } | null)
      ?.marketing_consent ?? false;
  const showArtistApply = role === 'user';
  const showExhibitorApply = role === 'user';

  const t = await getTranslations({ locale, namespace: 'mypage' });

  return (
    <MypageTabs
      user={{ id: user.id, email: user.email ?? '', name: user.user_metadata?.name ?? '' }}
      initialOrders={orders}
      initialWishlistIds={wishlistIds}
      showArtistApply={showArtistApply}
      showExhibitorApply={showExhibitorApply}
      initialMarketingConsent={marketingConsent}
      messages={{
        title: t('title'),
        tabOrders: t('tabs.orders'),
        tabWishlist: t('tabs.wishlist'),
        tabProfile: t('tabs.profile'),
        tabArtistApply: t('tabs.artistApply'),
        tabExhibitorApply: t('tabs.exhibitorApply'),
        ordersEmpty: t('orders.empty'),
        ordersViewDetail: t('orders.viewDetail'),
        wishlistEmpty: t('wishlist.empty'),
        wishlistBrowse: t('wishlist.browseArtworks'),
        profileName: t('profile.name'),
        profileEmail: t('profile.email'),
        profileSave: t('profile.save'),
        profileSaved: t('profile.saved'),
        profileMarketingConsent: t('profile.marketingConsent'),
        profileMarketingConsentDesc: t('profile.marketingConsentDesc'),
        profileMarketingConsentSaved: t('profile.marketingConsentSaved'),
        artistApplyHeading: t('artistApply.heading'),
        artistApplyBody: t('artistApply.body'),
        artistApplyCta: t('artistApply.cta'),
        exhibitorApplyHeading: t('exhibitorApply.heading'),
        exhibitorApplyBody: t('exhibitorApply.body'),
        exhibitorApplyCta: t('exhibitorApply.cta'),
      }}
    />
  );
}
