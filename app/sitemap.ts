import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { getSupabaseArtworks } from '@/lib/supabase-data';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const allArtworks = await getSupabaseArtworks();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/our-reality`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/our-proof`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/archive/2026`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/artworks`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/archive`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms/artist`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.35,
    },
    {
      url: `${baseUrl}/terms/exhibitor`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.35,
    },
  ];

  // Dynamic artwork detail pages
  const artworkPages: MetadataRoute.Sitemap = allArtworks.map((artwork) => ({
    url: `${baseUrl}/artworks/${artwork.id}`,
    lastModified: new Date('2025-12-26'),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Artist pages (unique artists from artworks)
  const uniqueArtists = [...new Set(allArtworks.map((a) => a.artist))];
  const artistPages: MetadataRoute.Sitemap = uniqueArtists.map((artist) => ({
    url: `${baseUrl}/artworks/artist/${encodeURIComponent(artist)}`,
    lastModified: new Date('2025-12-26'),
    changeFrequency: 'monthly' as const,
    priority: 0.65,
  }));

  return [...staticPages, ...artworkPages, ...artistPages];
}
