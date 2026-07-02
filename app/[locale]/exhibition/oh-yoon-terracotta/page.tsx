import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import LinkButton from '@/components/ui/LinkButton';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { getArtworksByExhibition } from '@/lib/supabase-data';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { resolveLocale } from '@/lib/server-locale';
import { createLocaleAlternates } from '@/lib/locale-alternates';
import { createStandardPageMetadata } from '@/lib/seo';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { resolveEnRobots } from '@/lib/en-indexable';
import { SITE_URL } from '@/lib/constants';
import type { Artwork, ArtworkListItem } from '@/types';

export const dynamic = 'force-static';

const PAGE_PATH = '/exhibition/oh-yoon-terracotta';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'exhibitionOhYoonTerracotta' });

  const title = t('heroTitle');
  const description = t('heroDescription');

  const base = createStandardPageMetadata(title, description, PAGE_URL, PAGE_PATH, locale);

  // EN_INDEXABLE_PAGES에 등록된 색인 대상 — en도 index 허용
  const robots = resolveEnRobots(locale, true);

  return {
    ...base,
    alternates: createLocaleAlternates(PAGE_PATH, locale, false),
    ...(robots && { robots }),
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

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: locale === 'en' ? 'Home' : '홈', url: SITE_URL },
    { name: t('breadcrumb'), url: PAGE_URL },
  ]);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
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
