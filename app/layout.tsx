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
    default: '씨앗페 2026 | 예술인 상호부조 기금 마련 특별전',
    template: '%s | 씨앗페 2026',
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
    '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 조합원 가입과 작품 구매로 창작의 시간을 살려내는 연대에 참여하세요.',
  keywords: [
    '씨앗페',
    '씨앗페 2026',
    'SAF 2026',
    'Seed Art Festival',
    '예술인 상호부조',
    '예술인 기금',
    '예술인 대출',
    '한국스마트협동조합',
    '전시회',
    '미술 전시',
    '인사아트센터',
    '온라인 전시',
    '온라인 갤러리',
    '작품 구매',
    '예술인 연대',
    '예술인 상생',
  ],
  authors: [{ name: CONTACT.ORGANIZATION_NAME }],
  icons: {
    icon: '/favicon.ico',
    apple: '/images/logo/saf-logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    title: '씨앗페 2026 | 예술인 상호부조 기금 마련 특별전',
    description:
      '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 조합원 가입과 작품 구매로 창작의 시간을 살려내는 연대에 참여하세요.',
    siteName: '씨앗페 2026',
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
    title: '씨앗페 2026',
    description: '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
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
