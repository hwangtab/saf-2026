import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { SITE_URL, SITE_URL_ALIAS } from '@/lib/constants';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '씨앗:페 2026 | 예술인 금융 위기 해결 캠페인',
    template: '%s | 씨앗:페 2026',
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
  ],
  authors: [{ name: '한국스마트협동조합' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    title: '씨앗:페 2026 | 예술인 금융 위기 해결 캠페인',
    description:
      '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인. 상호부조 대출, 작품 전시, 후원에 참여하세요.',
    siteName: '씨앗:페 2026',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: '씨앗:페 2026 캠페인 홍보 이미지',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '씨앗:페 2026',
    description:
      '한국 예술인들의 금융 위기를 해결하기 위한 상호부조 캠페인',
    images: ['/images/og-image.png'],
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#5B532C" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-gray-50 text-charcoal flex flex-col min-h-screen">
        <a href="#main-content" className="skip-to-main">
          메인 콘텐츠로 이동
        </a>
        <Header />
        <main id="main-content" role="main" className="flex-1">
          <Suspense fallback={<div>로딩 중...</div>}>{children}</Suspense>
        </main>
        <Footer />

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
