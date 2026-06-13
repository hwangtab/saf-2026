import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageHero from '@/components/ui/PageHero';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { SITE_URL } from '@/lib/constants';
import { createBreadcrumbSchema } from '@/lib/seo-utils';
import { createStandardPageMetadata } from '@/lib/seo';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { loadChangelog, toPublicEntries } from '@/lib/changelog-data';
import { getHeroOverride } from '@/lib/hero-curation';
import ChangelogFeed from './changelog-feed';

export const dynamic = 'force-static';
export const revalidate = false;

const PAGE_PATH = '/changelog';
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_COPY = {
  ko: {
    title: '업데이트 소식',
    description: '씨앗페 온라인이 어떻게 발전해 왔는지 기록입니다.',
  },
  en: {
    title: 'Updates',
    description: 'A record of how SAF Online has evolved over time.',
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
  const base = createStandardPageMetadata(title, copy.description, PAGE_URL, PAGE_PATH, locale);
  // KO도 koOnly alternates로 통일 (2026-06-12 감사) — base(createStandardPageMetadata)는
  // en-US hreflang을 포함하는데 /en 변형이 noindex + KO canonical이라, KO 페이지가
  // noindex 페이지를 hreflang 대상으로 선언하는 비대칭(무효) 클러스터가 됐었다.
  if (locale === 'en') {
    return {
      ...base,
      alternates: createLocaleAlternates(PAGE_PATH, locale, true),
      robots: { index: false, follow: true },
    };
  }
  return {
    ...base,
    alternates: createLocaleAlternates(PAGE_PATH, locale, true),
  };
}

export default async function ChangelogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const pageUrl = buildLocaleUrl(PAGE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('changelog'), url: pageUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);
  const copy = PAGE_COPY[locale];

  const entries = toPublicEntries(loadChangelog());

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} />
      <PageHero
        title={copy.title}
        description={copy.description}
        breadcrumbItems={breadcrumbItems}
        customBackgroundImage={getHeroOverride('changelog')}
      />
      <ChangelogFeed entries={entries} locale={locale} />
    </>
  );
}
