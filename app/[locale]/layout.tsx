import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { CONTACT, OG_IMAGE } from '@/lib/constants';
import { ARTIST_COUNT, ARTWORK_COUNT, LOAN_COUNT } from '@/lib/site-stats';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ToastProvider from '@/components/providers/ToastProvider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateLocalBusinessSchema,
} from '@/lib/seo-utils';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  const tSeo = await getTranslations({ locale, namespace: 'seo' });

  // /en 페이지에서 root layout의 한국어 description/keywords/authors/openGraph/twitter가
  // 그대로 inherit되던 누수를 차단 — locale-specific 필드를 여기서 명시 override.
  // /ko는 root metadata가 제거됐으므로 여기서 KO 기본값을 직접 제공.
  // (af693bae·7039e846 후속, root layout은 정적 렌더링 호환 위해 locale-agnostic 유지)
  const isEn = locale === 'en';

  const ogTitle = isEn
    ? `SAF Online | ${ARTWORK_COUNT} original Korean contemporary artworks`
    : `씨앗페 온라인 | 한국 현대미술 원본 작품 ${ARTWORK_COUNT}점`;
  const ogDescription = isEn
    ? `${ARTIST_COUNT} Korean artists offer paintings, prints, photography, and sculpture to support fellow artists. Sale proceeds fund ${LOAN_COUNT} low-rate mutual-aid loans. Free shipping, 7-day returns.`
    : `${ARTIST_COUNT}명 한국 작가가 동료 예술인을 돕기 위해 내놓은 회화·판화·사진·조각 원본. 구매 수익이 ${LOAN_COUNT}건의 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`;
  const twitterDescription = isEn
    ? `${ARTIST_COUNT} Korean artists' paintings, prints, photography, and sculpture — purchases fund ${LOAN_COUNT} mutual-aid loans for fellow artists. Free shipping, 7-day returns.`
    : `${ARTIST_COUNT}명 한국 작가의 회화·판화·사진·조각 원본. 구매가 ${LOAN_COUNT}건 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`;

  return {
    title: {
      default: tSeo('siteTitle'),
      template: tSeo('titleTemplate'),
    },
    description: tSeo('siteDescription', { artistCount: ARTIST_COUNT, loanCount: LOAN_COUNT }),
    keywords: isEn
      ? 'Korean contemporary art, original artworks for sale, art gallery, artist mutual aid, SAF Online, Seed Art Festival, paintings, prints, sculpture, photography, Seoul art exhibition'
      : '한국 현대미술, 미술 작품 구매, 작품 원본 구매, 회화 원본, 판화 원본, 사진 작품, 조각 작품, 서울 전시회, 현대미술 전시회, 씨앗페, 씨앗페 온라인, 예술인 상호부조, 예술인 금융 차별, 예술인 대출',
    authors: [{ name: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME }],
    // 영문 사이트는 색인 제외 (자동 번역 수준이라 thin/duplicate content). follow는 유지해 내부
    // 링크 발견·평가에는 영향 없음. /ko는 root layout robots를 그대로 inherit (index:true).
    // Next.js metadata 머지 규칙상 자식이 robots를 설정하면 부모 robots 객체가 통째로 교체됨 →
    // /en만 명시 override해 googleBot 디렉티브 함께 유지. 페이지별 robots는 그쪽이 우선.
    ...(isEn && {
      robots: {
        index: false,
        follow: true,
        googleBot: {
          index: false,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large' as const,
          'max-video-preview': -1,
        },
      },
    }),
    openGraph: {
      type: 'website',
      locale: isEn ? 'en_US' : 'ko_KR',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      title: ogTitle,
      description: ogDescription,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: twitterDescription,
      images: [{ url: OG_IMAGE.url, alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
  };
}

const EXCLUDED_PUBLIC_NAMESPACES = new Set([
  'admin',
  'dashboard',
  'exhibitor',
  'onboarding',
  'onboardingForm',
]);

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // 정적 렌더링 활성화 — generateStaticParams로 빌드 시 'ko'/'en' 페이지가 prerender되며,
  // setRequestLocale로 next-intl이 헤더 대신 인자로 받은 locale을 사용해 dynamic API
  // 의존을 끊는다. 결과: 동적(ƒ) → 정적(●) 라우트 전환, TTFB 크롤 예산 + LCP 개선.
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  // force-static 빌드에서 setRequestLocale의 request scope가 일부 sub-component에
  // 전파되지 않아 default locale fallback이 발생한 사고가 있어 명시 locale 전달.
  const messages = await getMessages({ locale });
  const publicMessages = Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => !EXCLUDED_PUBLIC_NAMESPACES.has(namespace))
  );

  // 사이트 전역 JSON-LD — root layout이 정적 렌더링 제약으로 KO 고정 fallback이었던 회귀를
  // [locale] 레벨에서 locale-aware로 재생성. setRequestLocale로 정적 prerender 호환.
  // /en, /ko 각각 빌드 시점에 영문/한글 schema가 prerender됨.
  const localeForSchema = locale === 'en' ? 'en' : 'ko';
  const organizationSchema = generateOrganizationSchema(localeForSchema);
  const websiteSchema = generateWebsiteSchema(localeForSchema);
  const localBusinessSchema = generateLocalBusinessSchema(localeForSchema);

  return (
    <NextIntlClientProvider locale={locale} messages={publicMessages}>
      <ToastProvider>
        <a href="#main-content" className="skip-to-main">
          {locale === 'en' ? 'Skip to main content' : '메인 콘텐츠로 이동'}
        </a>
        <Header />
        <main id="main-content" className="flex-1 min-h-[100svh]">
          <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
            {children}
          </Suspense>
        </main>
        <Suspense>
          <Footer locale={locale} />
        </Suspense>
        <JsonLdScript data={organizationSchema} />
        <JsonLdScript data={websiteSchema} />
        <JsonLdScript data={localBusinessSchema} />
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
