import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import LinkButton from '@/components/ui/LinkButton';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
import { getArtworksByExhibition } from '@/lib/supabase-data';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { resolveLocale } from '@/lib/server-locale';
import type { Artwork, ArtworkListItem } from '@/types';

export const dynamic = 'force-static';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });
  return {
    title: t('heroTitle'),
    description: t('heroDescription'),
  };
}

export default async function ExhibitionOhYoonTerracottaPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });

  const artworks = await getArtworksByExhibition(OH_YOON_TERRACOTTA_EXHIBITION.slug);

  // OhYoonFeature.tsx:147-149의 매핑을 그대로 따른다.
  // ArtworkListItem = Omit<HydratedArtwork, 'profile' | 'history' | 'profile_en' | 'history_en'>
  const listArtworks: ArtworkListItem[] = artworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );

  return (
    <>
      <PageHero title={t('heroTitle')} description={t('heroDescription')}>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.fundingHref} variant="primary">
            {t('fundingCta')}
          </LinkButton>
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
            {t('petitionCta')}
          </LinkButton>
        </div>
      </PageHero>

      <Section>
        {listArtworks.length === 0 ? (
          <p className="text-center text-charcoal-muted">{t('emptyState')}</p>
        ) : (
          <MasterArtistGallery
            artworks={listArtworks}
            returnTo="%2Fexhibition%2Foh-yoon-terracotta"
          />
        )}
      </Section>
    </>
  );
}
