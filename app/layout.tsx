import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import AnimationProvider from '@/components/providers/AnimationProvider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { OG_IMAGE, SITE_URL, SITE_URL_ALIAS, SOCIAL_LINKS, CONTACT } from '@/lib/constants';
import '@/styles/globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2176FF',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '씨앗페 2026 | 예술인 금융 위기 해결 캠페인',
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
    '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인. 상호부조 대출, 작품 전시, 후원에 참여하세요.',
  keywords: [
    '예술인',
    '금융',
    '상호부조',
    '대출',
    '씨앗페',
    '한국스마트협동조합',
    '예술인 대출 받는 법',
    '예술인 지원금',
    '예술인 후원하기',
    '씨앗페 전시 일정',
  ],
  authors: [{ name: CONTACT.ORGANIZATION_NAME }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    title: '씨앗페 2026 | 예술인 금융 위기 해결 캠페인',
    description:
      '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인. 상호부조 대출, 작품 전시, 후원에 참여하세요.',
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
    description: '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: CONTACT.ORGANIZATION_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/og-image2.png`,
    description: '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
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
    description: '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
    inLanguage: 'ko-KR',
    publisher: {
      '@type': 'Organization',
      name: CONTACT.ORGANIZATION_NAME,
    },
  };

  return (
    <html lang="ko">
      <head>
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansBold.woff"
          as="font"
          type="font/woff"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen">
        <AnimationProvider>
          <a href="#main-content" className="skip-to-main">
            메인 콘텐츠로 이동
          </a>
          <Header />
          <main id="main-content" role="main" className="flex-1">
            <Suspense fallback={<div>로딩 중...</div>}>{children}</Suspense>
          </main>
          <Footer />
        </AnimationProvider>

        <JsonLdScript data={organizationSchema} />
        <JsonLdScript data={websiteSchema} />

        <script src="https://developers.kakao.com/sdk/js/kakao.js" async defer></script>
        <Analytics />
      </body>
    </html>
  );
}
