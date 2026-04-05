import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/react';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateLocalBusinessSchema,
} from '@/lib/seo-utils';
import { BRAND_COLORS } from '@/lib/colors';
import '@/styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_COLORS.primary.DEFAULT,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  metadataBase: new URL(SITE_URL),
  title: {
    default: '씨앗페 온라인 | 한국 현대미술 작품 구매',
    template: '%s | 씨앗페 온라인 갤러리',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ko-KR': SITE_URL,
      'en-US': `${SITE_URL}/en`,
      'x-default': SITE_URL,
    },
  },
  description:
    '한국 현대미술 원화 127점을 온라인에서 구매하세요. 회화, 판화, 사진, 조각 등 다양한 장르의 작품을 합리적인 가격에 만나볼 수 있습니다.',
  keywords: [
    '미술품 구매',
    '그림 판매',
    '원화 구매',
    '한국 현대미술',
    '미술품 쇼핑',
    '온라인 갤러리',
    '작품 구매',
    '미술품 판매',
    '현대미술 컬렉션',
    '한국 작가 그림',
    '회화 판매',
    '판화 구매',
    'buy Korean art',
    'Korean art for sale',
    'contemporary Korean art',
    'original artwork',
    '씨앗페',
    'SAF Online',
  ],
  authors: [{ name: CONTACT.ORGANIZATION_NAME }],
  icons: {
    icon: '/favicon.ico',
    apple: '/images/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    title: '씨앗페 온라인 | 한국 현대미술 작품 구매',
    description:
      '한국 현대미술 원화 127점을 온라인에서 구매하세요. 회화, 판화, 사진, 조각 등 다양한 장르의 작품을 합리적인 가격에 만나볼 수 있습니다.',
    siteName: '씨앗페 온라인',
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@saf2026',
    title: '씨앗페 온라인',
    description: '한국 현대미술 원화 127점 온라인 구매 — 회화, 판화, 사진, 조각',
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_NAVER_VERIFICATION
      ? { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_VERIFICATION }
      : undefined,
  },
  other: {
    'pinterest-rich-pin': 'true',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const resolvedLocale = locale === 'en' ? 'en' : 'ko';
  const organizationSchema = generateOrganizationSchema(resolvedLocale);
  const websiteSchema = generateWebsiteSchema(resolvedLocale);
  const localBusinessSchema = generateLocalBusinessSchema(resolvedLocale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/Paperlogy-4Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/PartialSansKR-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        {children}

        <JsonLdScript data={organizationSchema} />
        <JsonLdScript data={websiteSchema} />
        <JsonLdScript data={localBusinessSchema} />

        <Analytics />
      </body>
    </html>
  );
}
