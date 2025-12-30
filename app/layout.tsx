import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { OG_IMAGE, SITE_URL, SITE_URL_ALIAS } from '@/lib/constants';
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
  authors: [{ name: '한국스마트협동조합' }],
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
    description:
      '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#2176FF" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen">
        <a href="#main-content" className="skip-to-main">
          메인 콘텐츠로 이동
        </a>
        <Header />
        <main id="main-content" role="main" className="flex-1">
          <Suspense fallback={<div>로딩 중...</div>}>{children}</Suspense>
        </main>
        <Footer />

        {/* Organization JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: '한국스마트협동조합',
              url: 'https://www.saf2026.com',
              logo: 'https://www.saf2026.com/images/og-image2.png',
              description:
                '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
              sameAs: [
                'https://www.instagram.com/koreasmartcoop',
                'https://www.facebook.com/koreasmartcoop',
                'https://twitter.com/saf2026',
                'https://www.youtube.com/@Social_Mutual_ART',
              ],
              address: {
                '@type': 'PostalAddress',
                streetAddress:
                  '서울특별시 은평구 통일로 68길 4 302호',
                addressLocality: '서울시',
                addressRegion: '은평구',
                postalCode: '03100',
                addressCountry: 'KR',
              },
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                telephone: '+82-2-764-3114',
                email: 'contact@kosmart.co.kr',
              },
            }),
          }}
        />

        {/* WebSite JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: '씨앗페 2026',
              alternateName: 'SAF 2026',
              url: 'https://www.saf2026.com',
              description:
                '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
              inLanguage: 'ko-KR',
              publisher: {
                '@type': 'Organization',
                name: '한국스마트협동조합',
              },
            }),
          }}
        />

        {/* Kakao SDK for Share functionality */}
        <script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          async
          defer
        ></script>
      </body>
    </html>
  );
}
