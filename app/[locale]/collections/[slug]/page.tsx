import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import CollectionArtworkGrid from '@/components/features/CollectionArtworkGrid';
import CollectionCard from '@/components/features/CollectionCard';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';
import { createBreadcrumbSchema, generateArtworkListSchema } from '@/lib/seo-utils';
import { createPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveEnRobots } from '@/lib/en-indexable';
import { getHeroOverride, pickListingHeroImage } from '@/lib/hero-curation';
import { resolveLocale } from '@/lib/server-locale';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import {
  SPACE_COLLECTIONS,
  getSpaceCollections,
  getSpaceCollectionBySlug,
  getCollectionArtworks,
} from '@/lib/space-collections';

export const dynamic = 'force-static';
export const revalidate = 600;
// generateStaticParams의 6개 slug 외 잘못된 경로는 404 — 임의 slug로 ISR 렌더 시도 시
// 500 박힘 방지 (artworks/category/[category]와 동일 정책).
export const dynamicParams = false;

export function generateStaticParams() {
  return SPACE_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const collection = getSpaceCollectionBySlug(slug);
  if (!collection) return {};
  const isEn = locale === 'en';
  // <title>/OG는 구매 쿼리 키워드+브랜드가 포함된 SEO 타이틀, H1은 감성 카피(titleKo) 유지
  const title = isEn ? collection.seoTitleEn : collection.seoTitleKo;
  const description = isEn ? collection.descriptionEn : collection.descriptionKo;

  // limit 없이 호출해 본문(page)과 동일 react cache 키 공유 → OG 이미지 = 페이지 첫 작품 일치.
  const artworks = await getCollectionArtworks(slug);
  const rawImg = artworks[0]?.images?.[0]
    ? resolveSeoArtworkImageUrl(artworks[0].images[0])
    : OG_IMAGE.url;
  const imageUrl = rawImg.startsWith('http') ? rawImg : `${SITE_URL}${rawImg}`;

  const base = createPageMetadata(
    title,
    description.slice(0, 160),
    `/collections/${slug}`,
    imageUrl,
    locale
  );
  // 영문 컬렉션은 noindex + ko canonical — 고유 영문 콘텐츠가 큐레이션 카피로 한정.
  // sitemap(ko-only)·중복 hreflang 방지와 정합. 영문 SEO는 핵심 페이지에 집중.
  const robots = resolveEnRobots(locale, false);
  return {
    ...base,
    alternates: createLocaleAlternates(`/collections/${slug}`, locale, true),
    ...(robots && { robots }),
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const collection = getSpaceCollectionBySlug(slug);
  if (!collection) notFound();

  const isEn = locale === 'en';
  const t = await getTranslations({ locale, namespace: 'collections' });
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const title = isEn ? collection.titleEn : collection.titleKo;
  const subtitle = isEn ? collection.subtitleEn : collection.subtitleKo;
  const description = isEn ? collection.descriptionEn : collection.descriptionKo;
  const pageUrl = buildLocaleUrl(`/collections/${slug}`, locale);
  const returnTo = encodeURIComponent(`/collections/${slug}`);

  const artworks = await getCollectionArtworks(slug);
  const others = getSpaceCollections().filter((c) => c.slug !== slug);
  const otherCards = await Promise.all(
    others.map(async (c) => ({
      collection: c,
      cover: (await getCollectionArtworks(c.slug))[0] ?? null,
    }))
  );

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: t('landingTitle'), url: buildLocaleUrl('/collections', locale) },
    { name: title, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const itemListSchema = artworks.length
    ? generateArtworkListSchema(artworks, locale, artworks.length, pageUrl, {
        name: title,
        description: subtitle,
      })
    : null;
  const heroImage =
    getHeroOverride(`collections/${slug}`) ??
    pickListingHeroImage(artworks, (artwork) => artwork.images?.[0] || undefined);

  return (
    <>
      <JsonLdScript
        data={itemListSchema ? [breadcrumbSchema, itemListSchema] : [breadcrumbSchema]}
      />
      <PageHero
        title={title}
        description={subtitle}
        breadcrumbItems={breadcrumbItems}
        customBackgroundImage={heroImage}
      />

      <Section variant="canvas-soft">
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg leading-relaxed text-charcoal-muted text-pretty break-keep">
          {description}
        </p>

        {artworks.length > 0 ? (
          <>
            <p className="mb-10 text-center text-sm text-charcoal-soft">
              {t('artworkCount', { count: artworks.length })}
            </p>
            <CollectionArtworkGrid artworks={artworks} locale={locale} returnTo={returnTo} />
          </>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-gallery-hairline bg-white p-10 text-center shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-charcoal-deep text-balance">
              {t('emptyTitle')}
            </h2>
            <p className="mb-6 text-charcoal-muted break-keep">{t('emptyDesc')}</p>
            <Link
              href="/artworks"
              className="inline-flex items-center justify-center rounded-full border border-charcoal/30 px-6 py-3 font-medium text-charcoal-deep transition-colors hover:bg-charcoal hover:text-white"
            >
              {t('browseAll')}
            </Link>
          </div>
        )}
      </Section>

      <Section variant="white" prevVariant="canvas-soft">
        <SectionTitle className="mb-8 text-center">{t('exploreOthers')}</SectionTitle>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {otherCards.map(({ collection, cover }) => (
            <CollectionCard
              key={collection.slug}
              collection={collection}
              cover={cover}
              locale={locale}
              cta={t('viewCollection')}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
