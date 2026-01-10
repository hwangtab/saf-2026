import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { getAllArtworks } from '@/content/saf2026-artworks';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;
  const allArtworks = getAllArtworks();

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
      url: `${baseUrl}/exhibition`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
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
  ];

  // Dynamic artwork detail pages
  const artworkPages: MetadataRoute.Sitemap = allArtworks.map((artwork) => ({
    url: `${baseUrl}/artworks/${artwork.id}`,
    lastModified: new Date('2025-12-26'),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...artworkPages];
}
