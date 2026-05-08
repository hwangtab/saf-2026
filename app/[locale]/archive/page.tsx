import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import PageHero from '@/components/ui/PageHero';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SITE_URL, CONTACT } from '@/lib/constants';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';

export const dynamic = 'force-static';
export const revalidate = false;

const PAGE_URL = `${SITE_URL}/archive`;
const PAGE_COPY = {
  ko: {
    title: '아카이브',
    description:
      '서울 현대미술 전시회 일정과 기록을 한눈에. 씨앗페 온라인 전시회 아카이브에서 2023·2026 전시 일정, 추천 전시 작품, 전시회 포스터를 만나보세요. 120여 명 예술가의 연대 발자취.',
  },
  en: {
    title: 'Archive',
    description:
      'Seoul art exhibition records and schedules in one place. Explore SAF exhibition archives from 2023 and 2026 — posters, schedules, and featured artworks.',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const title = `${copy.title} | ${tSeo('siteTitle')}`;
  return {
    ...createStandardPageMetadata(title, copy.description, PAGE_URL, '/archive', locale),
    keywords:
      locale === 'en'
        ? 'SAF exhibition archive, Seoul art exhibition, exhibition schedule, exhibition catalog, Korean art exhibitions, SAF Online'
        : '전시회 일정, 전시회 일정 사이트, 전시회 추천, 서울 전시회, 씨앗페 전시, 현대미술 전시회, 전시회 아카이브',
  };
}

export default async function ArchiveHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/archive', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('archive'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const archive2026Url = buildLocaleUrl('/archive/2026', locale);
  const archive2023Url = buildLocaleUrl('/archive/2023', locale);
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${pageUrl}#webpage`,
    name: locale === 'en' ? 'SAF Archive' : '씨앗페 아카이브',
    description:
      locale === 'en'
        ? 'A collection of SAF event records from 2023 to 2026.'
        : '2023년부터 2026년까지의 씨앗페 행사 기록 모음.',
    url: pageUrl,
    isPartOf: { '@id': `${SITE_URL}#website` },
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    hasPart: [
      {
        '@type': 'WebPage',
        '@id': `${archive2026Url}#webpage`,
        name:
          locale === 'en'
            ? 'SAF 2026 Offline Exhibition Archive'
            : '씨앗페 2026 오프라인 전시 기록',
        url: archive2026Url,
      },
      {
        '@type': 'WebPage',
        '@id': `${archive2023Url}#collection`,
        name: locale === 'en' ? 'SAF 2023 Archive' : '씨앗페 2023 아카이브',
        url: archive2023Url,
      },
    ],
  };

  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, collectionSchema]} />
      <PageHero
        title={isEnglish ? 'Archive' : '아카이브'}
        description={
          isEnglish
            ? 'The SAF journey for artist mutual-aid.'
            : '예술인 상호부조를 위한 씨앗페의 발자취입니다.'
        }
        breadcrumbItems={breadcrumbItems}
      />

      <Section variant="white" className="min-h-[60svh] pb-24 md:pb-32">
        <div className="container-max">
          <SectionTitle className="mb-12">
            {isEnglish ? 'Past event records' : '지난 행사 기록'}
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* 2026 Archive Card */}
            <Link href="/archive/2026" className="group block">
              <div className="bg-canvas rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <SafeImage
                    src="/images/safposter.png"
                    alt={isEnglish ? 'SAF 2026 poster' : '씨앗페 2026 포스터'}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold font-display text-charcoal mb-2 group-hover:text-primary transition-colors">
                    {isEnglish ? 'SAF 2026' : '씨앗페 2026'}
                  </h3>
                  <p className="text-charcoal-muted mb-4">
                    {isEnglish ? (
                      <>
                        The second festival for artist mutual-aid funding. <br />A scene of
                        solidarity unfolded at Insa Art Center.
                      </>
                    ) : (
                      <>
                        예술인 상호부조 기금 마련을 위한 두 번째 축제. <br />
                        인사아트센터에서 펼쳐진 연대의 현장.
                      </>
                    )}
                  </p>
                  <span className="inline-block px-4 py-2 bg-white rounded-full text-sm font-bold text-primary border border-primary/20">
                    {isEnglish ? 'View archive' : '기록 보기'} &rarr;
                  </span>
                </div>
              </div>
            </Link>

            {/* 2023 Archive Card */}
            <Link href="/archive/2023" className="group block">
              <div className="bg-canvas rounded-2xl overflow-hidden border border-gray-200 shadow-sm transition-shadow duration-300 hover:shadow-gallery-hover">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <SafeImage
                    src="/images/saf2023/saf2023poster.png"
                    alt={isEnglish ? 'SAF 2023 poster' : '씨앗페 2023 포스터'}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300" />
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-bold font-display text-charcoal mb-2 group-hover:text-primary transition-colors">
                    {isEnglish ? 'SAF 2023' : '씨앗페 2023'}
                  </h3>
                  <p className="text-charcoal-muted mb-4">
                    {isEnglish ? (
                      <>
                        The beginning of SAF. <br />
                        The first signal flare lit by more than 120 artists together.
                      </>
                    ) : (
                      <>
                        씨앗페의 시작. <br />
                        120여 명의 예술인이 함께 쏘아올린 첫 번째 신호탄.
                      </>
                    )}
                  </p>
                  <span className="inline-block px-4 py-2 bg-white rounded-full text-sm font-bold text-primary border border-primary/20">
                    {isEnglish ? 'View archive' : '기록 보기'} &rarr;
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
