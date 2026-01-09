import type { Metadata } from 'next';
import { SITE_URL, OG_IMAGE } from '@/lib/constants';

export function createPageMetadata(
  title: string,
  description: string,
  path: string,
  imageUrl?: string
): Metadata {
  const url = `${SITE_URL}${path}`;
  const images = [
    {
      url: imageUrl || OG_IMAGE.url,
      width: imageUrl ? 1200 : OG_IMAGE.width,
      height: imageUrl ? 630 : OG_IMAGE.height,
      alt: OG_IMAGE.alt,
    },
  ];

  return {
    title: `${title} | 씨앗페 2026`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${title} | 씨앗페 2026`,
      description,
      url,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | 씨앗페 2026`,
      description,
      images: [images[0].url],
    },
  };
}
