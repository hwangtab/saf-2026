import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import PageLoader from '@/components/common/PageLoader';
import { Analytics } from '@vercel/analytics/react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import AnimationProvider from '@/components/providers/AnimationProvider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { OG_IMAGE, SITE_URL, SITE_URL_ALIAS, SOCIAL_LINKS, CONTACT } from '@/lib/constants';
import { BRAND_COLORS } from '@/lib/colors';
import '@/styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_COLORS.primary.DEFAULT,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '씨앗페 2026 | 예술인 상호부조 기금 마련 특별전',
    template: '%s | 씨앗페 2026',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ko-KR': SITE_URL,
      'x-default': SITE_URL_ALIAS,
    },
  },
  description:
    '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 상호부조 대출, 작품 전시, 후원에 참여하세요.',
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
    'G&J 갤러리',
  ],
  authors: [{ name: CONTACT.ORGANIZATION_NAME }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    title: '씨앗페 2026 | 예술인 상호부조 기금 마련 특별전',
    description:
      '한국 예술인들의 상호부조 기금 마련을 위한 특별전. 상호부조 대출, 작품 전시, 후원에 참여하세요.',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: CONTACT.ORGANIZATION_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/og-image2.png`,
    description: '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    sameAs: [
      SOCIAL_LINKS.INSTAGRAM,
      SOCIAL_LINKS.FACEBOOK,
      SOCIAL_LINKS.TWITTER,
      SOCIAL_LINKS.YOUTUBE,
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.ADDRESS,
      addressLocality: '서울시',
      addressCountry: 'KR',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: CONTACT.PHONE,
      email: CONTACT.EMAIL,
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '씨앗페 2026',
    alternateName: 'SAF 2026',
    url: SITE_URL,
    description: '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
    inLanguage: 'ko-KR',
    publisher: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
    },
  };

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://t1.daumcdn.net" />
        <link rel="preconnect" href="https://dapi.kakao.com" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen">
        <AnimationProvider>
          <a href="#main-content" className="skip-to-main">
            메인 콘텐츠로 이동
          </a>
          <Header />
          <main id="main-content" role="main" className="flex-1">
            <Suspense fallback={<PageLoader />}>{children}</Suspense>
          </main>
          <Footer />
        </AnimationProvider>

        <JsonLdScript data={organizationSchema} />
        <JsonLdScript data={websiteSchema} />

        <Analytics />
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
