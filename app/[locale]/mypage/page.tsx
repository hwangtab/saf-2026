import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import MypageClient from './_components/MypageClient';

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

  const t = await getTranslations({ locale, namespace: 'mypage' });

  return (
    <MypageClient
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
        profilePhone: t('profile.phone'),
        profilePhonePlaceholder: t('profile.phonePlaceholder'),
        profileInvalidPhone: t('profile.invalidPhone'),
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
