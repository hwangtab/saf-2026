import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';

import Section from '@/components/ui/Section';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import PageHero from '@/components/ui/PageHero';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';
import GalleryStatusBar from '@/components/features/GalleryStatusBar';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SITE_URL } from '@/lib/constants';
import { createPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { createBreadcrumbSchema, generateArtworkListSchema } from '@/lib/seo-utils';
import { generateArtworkPurchaseHowTo } from '@/lib/schemas/howto';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { parseArtworkPrice } from '@/lib/schemas/utils';
import type { Artwork, ArtworkListItem } from '@/types';

export const revalidate = 600;

const PAGE_URL = `${SITE_URL}/artworks`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('artworksPage');

  // 실시간 작품 수와 가격 범위를 메타 description에 반영
  const artworks = await getSupabaseArtworks();
  const availableCount = artworks.filter((a) => !a.sold).length;
  const prices = artworks
    .map((a) => parseArtworkPrice(a.price))
    .filter((p): p is number => p !== null && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices).toLocaleString('ko-KR') : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices).toLocaleString('ko-KR') : null;

  const dynamicDescription =
    locale === 'en'
      ? `Browse ${artworks.length} original Korean artworks (${availableCount} available) — paintings, prints, photography, sculpture. Price range ₩${minPrice}–₩${maxPrice}. Free shipping, 7-day returns.`
      : `씨앗페 온라인에서 총 ${artworks.length}점의 작품 중 현재 ${availableCount}점 구매 가능. 가격대 ₩${minPrice}–₩${maxPrice}. 무료 배송, 7일 반품. 회화·판화·사진·조각 등 다양한 장르.`;

  return {
    ...createPageMetadata(t('title'), dynamicDescription, '/artworks', undefined, locale),
    keywords:
      locale === 'en'
        ? 'Korean art, contemporary art, paintings for sale, original artworks, prints, sculpture, photography, art gallery'
        : '한국미술, 현대미술, 작품 구매, 회화, 판화, 조각, 사진, 미술 작품 판매',
  };
}

export default async function ArtworksPage() {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('artworksPage');
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const artworks = await getSupabaseArtworks();
  const listArtworks: ArtworkListItem[] = artworks.map(
    ({
      profile: _profile,
      history: _history,
      profile_en: _pe,
      history_en: _he,
      ...rest
    }: Artwork) => rest
  );
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const itemListSchema = generateArtworkListSchema(artworks, locale);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />
      <JsonLdScript data={generateArtworkPurchaseHowTo(locale)} />
      <div className="min-h-screen">
        <PageHero
          title={t('title')}
          description={t('heroDescription')}
          breadcrumbItems={breadcrumbItems}
        >
          <ShareButtonsWrapper
            url={PAGE_URL}
            title={t('shareTitle')}
            description={t('shareDescription')}
          />
        </PageHero>

        {/* Gallery Section */}
        <Section
          variant="primary-surface"
          prevVariant="white"
          padding="none"
          className="pt-6 md:pt-10 pb-12 md:pb-20"
        >
          <div className="container-max">
            <GalleryStatusBar className="mb-6" />
            <ArtworkGalleryWithSort artworks={listArtworks} />
          </div>
        </Section>

        {/* Campaign Banner */}
        <Section variant="white" prevVariant="primary-surface" className="pb-24 md:pb-32">
          <GalleryCampaignBanner />
        </Section>
      </div>
    </>
  );
}
