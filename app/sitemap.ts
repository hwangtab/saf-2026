import type { MetadataRoute } from 'next';
import { SITE_URL, CAMPAIGN } from '@/lib/constants';
import { routing } from '@/i18n/routing';
import { getSupabaseArtworks, getSupabaseNews, getSupabaseStories } from '@/lib/supabase-data';
import { CATEGORY_EN_MAP } from '@/lib/artwork-category';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';

export const dynamic = 'force-static';

function localizedUrl(baseUrl: string, path: string, locale: string): string {
  if (locale === routing.defaultLocale) {
    return `${baseUrl}${path}`;
  }
  return `${baseUrl}/${locale}${path}`;
}

function createAlternates(baseUrl: string, path: string) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const langCode = locale === 'ko' ? 'ko-KR' : 'en-US';
    languages[langCode] = localizedUrl(baseUrl, path, locale);
  }
  languages['x-default'] = localizedUrl(baseUrl, path, routing.defaultLocale);
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const [allArtworks, allNews, allStories] = await Promise.all([
    getSupabaseArtworks(),
    getSupabaseNews(),
    getSupabaseStories(),
  ]);
  const now = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
    priority: number;
    lastModified?: Date;
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1.0, lastModified: now },
    {
      path: '/our-reality',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-04-06'),
    },
    {
      path: '/our-proof',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-04-06'),
    },
    {
      path: '/transparency',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-04-06'),
    },
    {
      path: '/special/oh-yoon',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/archive/2026',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-03-15'),
    },
    {
      path: '/archive/2023',
      changeFrequency: 'yearly',
      priority: 0.7,
      lastModified: new Date('2023-12-31'),
    },
    {
      path: '/artworks',
      changeFrequency: 'weekly',
      priority: 0.9,
      lastModified: now,
    },
    {
      path: '/archive',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-03-15'),
    },
    {
      path: '/news',
      changeFrequency: 'weekly',
      priority: 0.85,
      lastModified: now,
    },
    {
      path: '/stories',
      changeFrequency: 'weekly',
      priority: 0.85,
      lastModified: now,
    },
    {
      path: '/privacy',
      changeFrequency: 'yearly',
      priority: 0.4,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/terms',
      changeFrequency: 'yearly',
      priority: 0.4,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/terms/artist',
      changeFrequency: 'yearly',
      priority: 0.35,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/terms/exhibitor',
      changeFrequency: 'yearly',
      priority: 0.35,
      lastModified: new Date('2026-01-01'),
    },
  ];

  // Generate entries for both locales with hreflang alternates
  const staticPages: MetadataRoute.Sitemap = staticPaths.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, page.path, locale),
      lastModified: page.lastModified || now,
      changeFrequency: page.changeFrequency,
      priority: locale === routing.defaultLocale ? page.priority : page.priority * 0.9,
      alternates: createAlternates(baseUrl, page.path),
    }))
  );

  // Dynamic artwork detail pages (both locales)
  // lastModified: 전시 종료일 고정 (updated_at 미제공 — 빌드마다 false freshness 방지)
  const exhibitionEndDate = new Date(CAMPAIGN.END_DATE);
  const artworkPages: MetadataRoute.Sitemap = allArtworks.flatMap((artwork) => {
    const artworkPath = `/artworks/${artwork.id}`;
    const isAvailable = !artwork.sold;
    // 판매 중인 작품: 더 높은 우선순위 + 주간 크롤링 (판매 완료 시 빠른 업데이트)
    // 판매 완료 작품: 낮은 우선순위 + 월간 크롤링
    const basePriority = isAvailable ? 0.8 : 0.55;
    const freq: 'weekly' | 'monthly' = isAvailable ? 'weekly' : 'monthly';

    // Image URL for Google Images indexing (절대 URL 필요)
    const rawImageUrl = artwork.images?.[0] ? resolveSeoArtworkImageUrl(artwork.images[0]) : null;
    const absoluteImageUrl = rawImageUrl
      ? rawImageUrl.startsWith('http')
        ? rawImageUrl
        : `${baseUrl}${rawImageUrl}`
      : null;

    // lastModified: 판매 완료 시 sold_at 날짜, 판매 중이면 전시 종료일
    const artworkLastModified = artwork.sold_at ? new Date(artwork.sold_at) : exhibitionEndDate;

    return routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, artworkPath, locale),
      lastModified: artworkLastModified,
      changeFrequency: freq,
      priority: locale === routing.defaultLocale ? basePriority : basePriority * 0.9,
      alternates: createAlternates(baseUrl, artworkPath),
      ...(absoluteImageUrl ? { images: [absoluteImageUrl] } : {}),
    }));
  });

  // Artist pages (both locales)
  const uniqueArtists = [...new Set(allArtworks.map((a) => a.artist))];
  const artistPages: MetadataRoute.Sitemap = uniqueArtists.flatMap((artist) => {
    const encodedArtist = encodeURIComponent(artist);
    // 작가 대표 이미지: 판매 중인 첫 번째 작품 이미지 (Google Images 인덱싱용)
    const artistWorks = allArtworks.filter((a) => a.artist === artist);
    const repWork = artistWorks.find((a) => !a.sold && a.images?.[0]) || artistWorks[0];
    const rawArtistImg = repWork?.images?.[0] ? resolveSeoArtworkImageUrl(repWork.images[0]) : null;
    const absoluteArtistImg = rawArtistImg
      ? rawArtistImg.startsWith('http')
        ? rawArtistImg
        : `${baseUrl}${rawArtistImg}`
      : null;

    return routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, `/artworks/artist/${encodedArtist}`, locale),
      lastModified: exhibitionEndDate,
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.65 : 0.58,
      alternates: createAlternates(baseUrl, `/artworks/artist/${encodedArtist}`),
      ...(absoluteArtistImg ? { images: [absoluteArtistImg] } : {}),
    }));
  });

  const newsPages: MetadataRoute.Sitemap = allNews.flatMap((article) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, `/news/${article.id}`, locale),
      lastModified: article.date ? new Date(article.date) : now,
      changeFrequency: 'yearly' as const,
      priority: locale === routing.defaultLocale ? 0.6 : 0.54,
      alternates: createAlternates(baseUrl, `/news/${article.id}`),
    }))
  );

  // Category landing pages (SEO: "한국 회화 작품 구매" 등 카테고리별 구매 의도 검색 대응)
  const categoryPages: MetadataRoute.Sitemap = Object.keys(CATEGORY_EN_MAP).flatMap((category) => {
    const encodedCategory = encodeURIComponent(category);
    const categoryWorks = allArtworks.filter((a) => a.category === category);
    const repCatWork = categoryWorks.find((a) => !a.sold && a.images?.[0]) || categoryWorks[0];
    const rawCatImg = repCatWork?.images?.[0]
      ? resolveSeoArtworkImageUrl(repCatWork.images[0])
      : null;
    const absoluteCatImg = rawCatImg
      ? rawCatImg.startsWith('http')
        ? rawCatImg
        : `${baseUrl}${rawCatImg}`
      : null;

    return routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, `/artworks/category/${encodedCategory}`, locale),
      lastModified: exhibitionEndDate,
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.75 : 0.67,
      alternates: createAlternates(baseUrl, `/artworks/category/${encodedCategory}`),
      ...(absoluteCatImg ? { images: [absoluteCatImg] } : {}),
    }));
  });

  const storyPages: MetadataRoute.Sitemap = allStories.flatMap((story) => {
    const storyPath = `/stories/${story.slug}`;

    // 이미지: thumbnail 우선, 없으면 body 마크다운 첫 번째 이미지
    let storyImageUrl: string | null = story.thumbnail || null;
    if (!storyImageUrl && story.body) {
      const match = story.body.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
      storyImageUrl = match?.[1] ?? null;
    }
    const absoluteStoryImage =
      storyImageUrl && storyImageUrl.startsWith('http') ? storyImageUrl : null;

    return routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, storyPath, locale),
      lastModified: story.updated_at ? new Date(story.updated_at) : new Date(story.published_at),
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.7 : 0.63,
      alternates: createAlternates(baseUrl, storyPath),
      ...(absoluteStoryImage ? { images: [absoluteStoryImage] } : {}),
    }));
  });

  return [
    ...staticPages,
    ...categoryPages,
    ...artworkPages,
    ...artistPages,
    ...newsPages,
    ...storyPages,
  ];
}
