import {
  getSupabaseArtworks,
  getSupabaseArtworksByArtist,
  getSupabaseStories,
} from '@/lib/supabase-data';
import { CATEGORY_EN_MAP, getCategoryLabel } from '@/lib/artwork-category';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { SITE_URL } from '@/lib/constants';
import {
  generateEnhancedArtistSchema,
  createBreadcrumbSchema,
  generateGalleryAggregateOffer,
  generateArtworkListSchema,
} from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { formatArtistName, resolveArtworkImageUrl } from '@/lib/utils';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { Artwork, ArtworkListItem } from '@/types';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { containsHangul } from '@/lib/search-utils';
import { Link } from '@/i18n/navigation';

import SafeImage from '@/components/common/SafeImage';
import ArtworkGalleryWithSort from '@/components/features/ArtworkGalleryWithSort';
import GalleryCampaignBanner from '@/components/features/GalleryCampaignBanner';

export const revalidate = 600;

interface Props {
  params: Promise<{
    artist: string;
  }>;
}

// Generate metadata for Artist Page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const { artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artistArtworks = await getSupabaseArtworksByArtist(artistName);
  const t = await getTranslations('artistPage');

  if (artistArtworks.length === 0) {
    return {
      title: t('notFound'),
    };
  }

  // Use the first artwork's image as the representative image for the artist
  const representativeArtwork = artistArtworks[0];
  // OG 이미지는 1200px 최적화 URL 사용 (resolveSeoArtworkImageUrl)
  const seoImageUrl = resolveSeoArtworkImageUrl(representativeArtwork.images[0] ?? '');
  const imageUrl = seoImageUrl.startsWith('http') ? seoImageUrl : `${SITE_URL}${seoImageUrl}`;
  const artistPath = `/artworks/artist/${encodeURIComponent(artistName)}`;
  const pageUrl = buildLocaleUrl(artistPath, locale);

  // Find valid profile, history, or note from any of the artist's artworks
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile || '';
  const artistProfileEn = artistArtworks.find((a) => a.profile_en)?.profile_en || '';
  const artistHistory = artistArtworks.find((a) => a.history)?.history || '';
  const artistHistoryEn = artistArtworks.find((a) => a.history_en)?.history_en || '';
  const artistNote = artistArtworks.find((a) => a.description)?.description || '';

  const effectiveProfile = locale === 'en' && artistProfileEn ? artistProfileEn : artistProfile;
  const effectiveHistory = locale === 'en' && artistHistoryEn ? artistHistoryEn : artistHistory;
  const profileSnippet =
    effectiveProfile && !(locale === 'en' && containsHangul(effectiveProfile))
      ? `${effectiveProfile.substring(0, 200)}... `
      : '';
  const historySnippet =
    effectiveHistory && !(locale === 'en' && containsHangul(effectiveHistory))
      ? `${effectiveHistory.substring(0, 200)}... `
      : '';
  const noteSnippet =
    artistNote && !(locale === 'en' && containsHangul(artistNote))
      ? `${artistNote.substring(0, 200)}... `
      : '';

  const displayArtistName =
    locale === 'en' && artistArtworks[0]?.artist_en ? artistArtworks[0].artist_en : artistName;
  const formattedName = formatArtistName(displayArtistName, locale !== 'en');
  const availableCount = artistArtworks.filter((a) => !a.sold).length;
  const availabilitySnippet =
    availableCount > 0
      ? locale === 'en'
        ? ` ${availableCount} work${availableCount > 1 ? 's' : ''} available now.`
        : ` 현재 ${availableCount}점 구매 가능.`
      : locale === 'en'
        ? ' All works sold.'
        : ' 전 작품 판매 완료.';
  const seoDescription =
    t('metaDescription', { artist: formattedName }) +
    ' ' +
    (profileSnippet || historySnippet || noteSnippet || t('metaFallback')) +
    availabilitySnippet;

  const metaTitle = t('metaTitle', { artist: formattedName });
  const primaryCategory = artistArtworks[0]?.category;

  return {
    title: metaTitle,
    description: seoDescription.substring(0, 160),
    keywords: (locale === 'en'
      ? [artistName, 'SAF Online', 'Korean artist', 'contemporary art', primaryCategory || null]
      : [
          artistName,
          '씨앗페',
          '한국 작가',
          '현대미술',
          primaryCategory || null,
          primaryCategory ? `${primaryCategory} 작가` : null,
        ]
    ).filter((k): k is string => Boolean(k)),
    alternates: createLocaleAlternates(artistPath, locale, true),
    openGraph: {
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      url: pageUrl,
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName: locale === 'en' ? 'SAF Online' : '씨앗페 온라인',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: t('metaImageAlt', {
            artist: formattedName,
            title:
              locale === 'en' && representativeArtwork.title_en
                ? representativeArtwork.title_en
                : representativeArtwork.title,
          }),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: seoDescription.substring(0, 200),
      images: [
        {
          url: imageUrl,
          alt: t('metaImageAlt', {
            artist: formattedName,
            title:
              locale === 'en' && representativeArtwork.title_en
                ? representativeArtwork.title_en
                : representativeArtwork.title,
          }),
        },
      ],
    },
    // 영어 아티스트 페이지는 한국어 콘텐츠만 있어 thin content — 색인 제외
    ...(locale === 'en' ? { robots: { index: false, follow: true } } : {}),
  };
}

// Generate static params for all artists
export async function generateStaticParams() {
  const artworks = await getSupabaseArtworks();

  // Extract unique artist names
  const artists = Array.from(new Set(artworks.map((a) => a.artist)));

  return artists.map((artist) => ({
    artist: artist,
  }));
}

export default async function ArtistPage({ params }: Props) {
  const locale = resolveLocale(await getLocale());
  const isEnglish = locale === 'en';
  const { artist } = await params;
  const artistName = decodeURIComponent(artist);
  const artistArtworks = await getSupabaseArtworksByArtist(artistName);
  const allArtworks = await getSupabaseArtworks();
  const listArtworks: ArtworkListItem[] = artistArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const t = await getTranslations('artistPage');

  if (artistArtworks.length === 0) {
    notFound();
  }

  // Use the first artwork's image as the hero background
  const representativeArtwork = artistArtworks[0];
  const resolvedImageUrl = resolveArtworkImageUrl(representativeArtwork.images[0] ?? '');
  const heroBackgroundImage = resolvedImageUrl;

  // Description Logic: Profile > History (CV) > Description (Note) > Default
  // Find valid profile, history, or note from any of the artist's artworks
  const artistProfile = artistArtworks.find((a) => a.profile)?.profile;
  const artistProfileEn = artistArtworks.find((a) => a.profile_en)?.profile_en;
  const artistHistoryHero = artistArtworks.find((a) => a.history)?.history;
  const artistHistoryHeroEn = artistArtworks.find((a) => a.history_en)?.history_en;
  const artistNote = artistArtworks.find((a) => a.description)?.description;

  const displayArtistName =
    locale === 'en' && artistArtworks[0]?.artist_en ? artistArtworks[0].artist_en : artistName;
  const formattedName = formatArtistName(displayArtistName, locale !== 'en');
  const rawDescription =
    locale === 'en'
      ? artistProfileEn ||
        artistProfile ||
        artistHistoryHeroEn ||
        artistHistoryHero ||
        artistNote ||
        t('defaultDescription', { artist: formattedName })
      : artistProfile ||
        artistHistoryHero ||
        artistNote ||
        t('defaultDescription', { artist: formattedName });
  const localizedDescription =
    locale === 'en' && containsHangul(rawDescription)
      ? t('originalKoreanDescription')
      : rawDescription;

  // Truncate to 100 characters for visual balance
  const isTruncated = localizedDescription.length > 100;
  const heroDescription = isTruncated
    ? `${localizedDescription.substring(0, 100)}...`
    : localizedDescription;

  const pageUrl = buildLocaleUrl(`/artworks/artist/${encodeURIComponent(artistName)}`, locale);

  // Person JSON-LD Schema for SEO (enhanced with credentials, expertise, work samples)
  const artistHistory = artistArtworks.find((a) => a.history)?.history;
  const artistHistoryEn = artistArtworks.find((a) => a.history_en)?.history_en;
  const schemaProfile = locale === 'en' ? artistProfileEn || artistProfile : artistProfile;
  const schemaDescription =
    locale === 'en' && schemaProfile && containsHangul(schemaProfile)
      ? t('originalKoreanDescription')
      : schemaProfile || artistNote || undefined;
  const effectiveHistory = locale === 'en' ? artistHistoryEn || artistHistory : artistHistory;
  const schemaHistory =
    locale === 'en' && effectiveHistory && containsHangul(effectiveHistory)
      ? undefined
      : effectiveHistory;
  const personSchema = generateEnhancedArtistSchema({
    name: displayArtistName,
    description: schemaDescription,
    image: representativeArtwork.images[0] ?? '',
    url: pageUrl,
    jobTitle: 'Artist',
    history: schemaHistory,
    artworks: artistArtworks.map((a) => ({
      id: a.id,
      title: locale === 'en' && a.title_en ? a.title_en : a.title,
      image: a.images[0] ?? '',
    })),
  });

  // Related magazine stories (where tags include the artist name)
  const allStories = await getSupabaseStories();
  const relatedStories = allStories
    .filter((s) => s.tags?.some((tag) => tag === artistName || tag === displayArtistName))
    .slice(0, 3);

  // Breadcrumb Schema: Home > Artworks > Artist Name
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: formattedName, url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const artistPageUrl = buildLocaleUrl(
    `/artworks/artist/${encodeURIComponent(artistName)}`,
    locale
  );
  // AggregateOffer: 작가명 검색 시 가격 범위를 리치 스니펫에 노출
  const aggregateOfferSchema = generateGalleryAggregateOffer(artistArtworks, locale, artistPageUrl);
  const itemListSchema = generateArtworkListSchema(
    artistArtworks,
    locale,
    artistArtworks.length,
    artistPageUrl
  );
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${artistPageUrl}#webpage`,
    name:
      locale === 'en'
        ? `${formattedName} — Artworks at SAF Online`
        : `${formattedName} 작가 — 씨앗페 온라인`,
    url: artistPageUrl,
    isPartOf: { '@id': `${SITE_URL}#website` },
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    mainEntity: { '@id': `${artistPageUrl}#item-list` },
  };

  return (
    <div className="min-h-screen">
      <JsonLdScript data={personSchema} />
      <JsonLdScript data={breadcrumbSchema} />
      <JsonLdScript data={collectionPageSchema} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      <JsonLdScript data={itemListSchema} />
      <PageHero
        title={formattedName}
        description={heroDescription}
        customBackgroundImage={heroBackgroundImage}
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={pageUrl}
          title={t('shareTitle', { artist: formattedName })}
          description={t('shareDescription', { artist: formattedName })}
        />
      </PageHero>

      {/* Gallery Section */}
      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <ArtworkGalleryWithSort artworks={listArtworks} initialArtist={artistName} />
        </div>
      </Section>

      {/* 카테고리 바로가기 — 작가 페이지에서 카테고리 페이지로 내부 링크 연결 */}
      {(() => {
        const primaryCategory = artistArtworks[0]?.category;
        const categoryLinks = Object.keys(CATEGORY_EN_MAP)
          .map((cat) => ({
            cat,
            displayName: getCategoryLabel(cat, locale),
            path: `/artworks/category/${encodeURIComponent(cat)}`,
            isPrimary: cat === primaryCategory,
          }))
          .filter((c) => allArtworks.some((a) => a.category === c.cat));
        if (categoryLinks.length === 0) return null;
        return (
          <Section variant="white" prevVariant="primary-surface" className="pb-8">
            <div className="container-max">
              <p className="text-sm font-medium text-gray-500 mb-3">
                {isEnglish ? 'Browse by category' : '카테고리별 작품 보기'}
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryLinks.map(({ cat, displayName, path, isPrimary }) => (
                  <Link
                    key={cat}
                    href={path}
                    className={`px-3 md:px-4 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      isPrimary
                        ? 'border-primary bg-primary/5 text-primary hover:bg-primary/10'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {displayName}
                  </Link>
                ))}
              </div>
            </div>
          </Section>
        );
      })()}

      {/* 관련 매거진 */}
      {relatedStories.length > 0 && (
        <Section variant="canvas-soft" prevVariant="white" className="pb-8">
          <div className="container-max">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display text-charcoal">
                {isEnglish ? 'Magazine' : '관련 매거진'}
              </h2>
              <Link
                href="/stories"
                className="text-sm font-medium text-primary hover:text-primary-strong transition-colors"
              >
                {isEnglish ? 'View all →' : '전체 보기 →'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedStories.map((s, i) => {
                const storyTitle = isEnglish && s.title_en ? s.title_en : s.title;
                const storyExcerpt = isEnglish && s.excerpt_en ? s.excerpt_en : s.excerpt;
                return (
                  <Link
                    key={s.id}
                    href={`/stories/${s.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl motion-safe:opacity-0 motion-safe:animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
                  >
                    {s.thumbnail && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <SafeImage
                          src={s.thumbnail}
                          alt={storyTitle}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-sm font-bold text-charcoal line-clamp-2 group-hover:text-primary transition-colors duration-300">
                        {storyTitle}
                      </h3>
                      {storyExcerpt && (
                        <p className="text-xs text-charcoal-muted mt-2 line-clamp-2 leading-relaxed">
                          {storyExcerpt}
                        </p>
                      )}
                      <span className="text-xs text-charcoal-muted/60 mt-3 block">
                        {s.published_at}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Campaign Banner */}
      <Section
        variant="white"
        prevVariant={relatedStories.length > 0 ? 'canvas-soft' : 'white'}
        className="pb-24 md:pb-32"
      >
        <GalleryCampaignBanner />
      </Section>
    </div>
  );
}
