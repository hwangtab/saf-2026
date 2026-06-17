import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import CollectionCard from '@/components/features/CollectionCard';
import { OG_IMAGE } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveEnRobots } from '@/lib/en-indexable';
import { getHeroOverride, pickListingHeroImage } from '@/lib/hero-curation';
import { resolveLocale } from '@/lib/server-locale';
import { getSpaceCollections, getCollectionArtworks } from '@/lib/space-collections';

export const dynamic = 'force-static';
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'collections' });
  const base = createPageMetadata(
    // <title>/OG는 구매 쿼리 키워드+브랜드 포함 SEO 타이틀, H1은 landingTitle(감성 카피) 유지
    t('landingSeoTitle'),
    t('landingSubtitle'),
    '/collections',
    OG_IMAGE.url,
    locale
  );
  // 영문 컬렉션은 noindex + ko canonical — 고유 영문 콘텐츠가 큐레이션 카피로 한정돼
  // EN_INDEXABLE(native-level 정보 페이지) 기준에 못 미침. 영문 SEO는 핵심 페이지에 집중.
  const robots = resolveEnRobots(locale, false);
  return {
    ...base,
    alternates: createLocaleAlternates('/collections', locale, true),
    ...(robots && { robots }),
  };
}

export default async function CollectionsLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'collections' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const collections = getSpaceCollections();
  // 각 컬렉션 대표작 1점 (썸네일). getAvailableArtworksLight는 react cache라 풀은 1회만 fetch.
  const cards = await Promise.all(
    collections.map(async (c) => ({
      collection: c,
      cover: (await getCollectionArtworks(c.slug))[0] ?? null,
    }))
  );

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: t('landingTitle'), url: buildLocaleUrl('/collections', locale) },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const heroImage =
    getHeroOverride('collections') ??
    pickListingHeroImage(cards, ({ cover }) => cover?.images?.[0] || undefined);

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title={t('landingTitle')}
        description={t('landingSubtitle')}
        breadcrumbItems={breadcrumbItems}
        customBackgroundImage={heroImage}
      />

      <Section variant="canvas-soft">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {cards.map(({ collection: c, cover }, idx) => (
            <CollectionCard
              key={c.slug}
              collection={c}
              cover={cover}
              locale={locale}
              cta={t('viewCollection')}
              priority={idx < 3}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
