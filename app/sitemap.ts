import type { MetadataRoute } from 'next';
import { SITE_URL, CAMPAIGN } from '@/lib/constants';
import { routing } from '@/i18n/routing';
import { getSupabaseArtworks, getSupabaseNews } from '@/lib/supabase-data';

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
  const [allArtworks, allNews] = await Promise.all([getSupabaseArtworks(), getSupabaseNews()]);
  const now = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
    priority: number;
    lastModified?: Date;
  }> = [
    { path: '', changeFrequency: 'weekly', priority: 1.0 },
    {
      path: '/our-reality',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-01-15'),
    },
    {
      path: '/our-proof',
      changeFrequency: 'monthly',
      priority: 0.9,
      lastModified: new Date('2026-03-01'),
    },
    {
      path: '/transparency',
      changeFrequency: 'monthly',
      priority: 0.85,
      lastModified: new Date('2026-03-01'),
    },
    {
      path: '/special/oh-yoon',
      changeFrequency: 'monthly',
      priority: 0.7,
      lastModified: new Date('2026-01-01'),
    },
    {
      path: '/archive/2026',
      changeFrequency: 'monthly',
      priority: 0.8,
      lastModified: new Date('2026-03-15'),
    },
    {
      path: '/archive/2023',
      changeFrequency: 'yearly',
      priority: 0.7,
      lastModified: new Date('2023-12-31'),
    },
    { path: '/artworks', changeFrequency: 'weekly', priority: 0.9 },
    {
      path: '/archive',
      changeFrequency: 'monthly',
      priority: 0.8,
      lastModified: new Date('2026-03-15'),
    },
    { path: '/news', changeFrequency: 'weekly', priority: 0.85 },
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
  const artworkPages: MetadataRoute.Sitemap = allArtworks.flatMap((artwork) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, `/artworks/${artwork.id}`, locale),
      lastModified: exhibitionEndDate,
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.7 : 0.63,
      alternates: createAlternates(baseUrl, `/artworks/${artwork.id}`),
    }))
  );

  // Artist pages (both locales)
  const uniqueArtists = [...new Set(allArtworks.map((a) => a.artist))];
  const artistPages: MetadataRoute.Sitemap = uniqueArtists.flatMap((artist) => {
    const encodedArtist = encodeURIComponent(artist);
    return routing.locales.map((locale) => ({
      url: localizedUrl(baseUrl, `/artworks/artist/${encodedArtist}`, locale),
      lastModified: exhibitionEndDate,
      changeFrequency: 'monthly' as const,
      priority: locale === routing.defaultLocale ? 0.65 : 0.58,
      alternates: createAlternates(baseUrl, `/artworks/artist/${encodedArtist}`),
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

  return [...staticPages, ...artworkPages, ...artistPages, ...newsPages];
}
