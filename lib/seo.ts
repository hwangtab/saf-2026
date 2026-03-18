import type { Metadata } from 'next';
import { SITE_URL, OG_IMAGE } from '@/lib/constants';
import { createLocaleAlternates } from '@/lib/locale-alternates';

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  imageUrl?: string,
  locale: 'ko' | 'en' = 'ko'
): Metadata {
  const url = `${SITE_URL}${path}`;
  const siteTitle = locale === 'en' ? 'SAF 2026' : '씨앗페 2026';
  const ogLocale = locale === 'en' ? 'en_US' : 'ko_KR';
  const images = [
    {
      url: imageUrl || OG_IMAGE.url,
      width: imageUrl ? 1200 : OG_IMAGE.width,
      height: imageUrl ? 630 : OG_IMAGE.height,
      alt: OG_IMAGE.alt,
    },
  ];

  // title: layout template '%s | 씨앗페 2026' handles the suffix for <title> tag
  // OG/Twitter: no template applied, so we add the suffix manually
  return {
    title,
    description,
    alternates: createLocaleAlternates(path),
    openGraph: {
      title: `${title} | ${siteTitle}`,
      description,
      url,
      locale: ogLocale,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${siteTitle}`,
      description,
      images: [images[0].url],
    },
  };
}
