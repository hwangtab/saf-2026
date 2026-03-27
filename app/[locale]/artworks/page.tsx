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
import { createBreadcrumbSchema, generateArtworkListSchema } from '@/lib/seo-utils';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import type { Artwork, ArtworkListItem } from '@/types';

export const revalidate = 600;

const PAGE_URL = `${SITE_URL}/artworks`;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('artworksPage');
  return createPageMetadata(t('title'), t('metaDescription'), '/artworks', undefined, locale);
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
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: SITE_URL },
    { name: tBreadcrumbs('artworks'), url: `${SITE_URL}/artworks` },
  ]);
  const itemListSchema = generateArtworkListSchema(artworks, locale);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={itemListSchema} />
      <main className="min-h-screen">
        <PageHero title={t('title')} description={t('heroDescription')}>
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
      </main>
    </>
  );
}
