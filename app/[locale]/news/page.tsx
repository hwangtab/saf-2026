import { Fragment } from 'react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import SectionTitle from '@/components/ui/SectionTitle';
import PageHero from '@/components/ui/PageHero';
import ShareButtonsWrapper from '@/components/common/ShareButtonsWrapper';
import { getSupabaseNews } from '@/lib/supabase-data';
import { CONTACT, OG_IMAGE, SITE_URL } from '@/lib/constants';
import { createBreadcrumbSchema, generateNewsArticleSchema } from '@/lib/seo-utils';
import { containsHangul } from '@/lib/search-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveLocale } from '@/lib/server-locale';
import { Link } from '@/i18n/navigation';

export const revalidate = 300;

type LocaleCode = 'ko' | 'en';

type NewsPageCopy = {
  pageTitle: string;
  pageDescription: string;
  heroTitle: string;
  heroDescription: string;
  shareTitle: string;
  shareDescription: string;
  highlightsBadge: string;
  highlightsTitle: string;
  highlightsDescription: string;
  coverageSuffix: string;
  noImage: string;
  readMore: string;
  originalKoreanArticleTitle: string;
  originalKoreanArticleDescription: string;
  collectionName: string;
  collectionDescription: string;
};

const NEWS_COPY: Record<LocaleCode, NewsPageCopy> = {
  ko: {
    pageTitle: '언론 보도',
    pageDescription:
      '언론이 주목한 씨앗페 온라인. 예술인 금융 차별과 상호부조를 다룬 주요 언론 보도·인터뷰·칼럼을 모아 캠페인의 사회적 의미와 예술 현장의 목소리를 전합니다.',
    heroTitle: '언론 보도',
    heroDescription: '씨앗페 캠페인을 조명한 기사와 인터뷰를 모았습니다.',
    shareTitle: '언론 보도 | 씨앗페 온라인',
    shareDescription: '씨앗페 캠페인을 다룬 언론 보도를 한 눈에 확인해보세요.',
    highlightsBadge: '언론 하이라이트',
    highlightsTitle: '언론이 짚어낸 예술인 금융 위기의 핵심 메시지',
    highlightsDescription:
      '언론이 기록한 현장의 목소리와 데이터를 통해,\n예술인이 마주한 금융 사각지대의 현실과 상호부조의 필요성을 확인합니다.',
    coverageSuffix: '보도',
    noImage: '이미지 없음',
    readMore: '자세히 보기',
    originalKoreanArticleTitle: '원문 기사 (한국어)',
    originalKoreanArticleDescription: '이 기사의 본문은 한국어로 제공됩니다.',
    collectionName: '씨앗페 온라인 언론 보도',
    collectionDescription: '주요 매체가 보도한 씨앗페 캠페인 기사 모음입니다.',
  },
  en: {
    pageTitle: 'Press',
    pageDescription:
      'Media coverage of SAF Online. Explore major stories and columns about financial exclusion among artists.',
    heroTitle: 'Press',
    heroDescription: 'A curated collection of articles and interviews covering the SAF campaign.',
    shareTitle: 'Press | SAF Online',
    shareDescription: 'Browse media coverage and interviews about the SAF campaign.',
    highlightsBadge: 'Press Highlights',
    highlightsTitle: 'Key Messages the Press Highlighted',
    highlightsDescription:
      'Through field interviews and data-driven reporting,\nsee why artist financial exclusion requires mutual-aid finance.',
    coverageSuffix: 'coverage',
    noImage: 'No image',
    readMore: 'Read more',
    originalKoreanArticleTitle: 'Original Korean article',
    originalKoreanArticleDescription:
      'This article body is currently available in Korean. Open the source to read the original coverage.',
    collectionName: 'SAF Online Press Coverage',
    collectionDescription: 'A collection of media coverage about the SAF campaign.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveLocale(await getLocale());
  const copy = NEWS_COPY[locale];
  const tSeo = await getTranslations('seo');
  const title = `${copy.pageTitle} | ${tSeo('siteTitle')}`;
  const pageUrl = buildLocaleUrl('/news', locale);

  return {
    title: { absolute: title },
    description: copy.pageDescription,
    keywords:
      locale === 'en'
        ? 'SAF Online press coverage, Korean artist news, artist financial exclusion media, art festival news'
        : '씨앗페 언론 보도, 예술인 금융 차별 뉴스, 한국 예술인 뉴스, 씨앗페 기사',
    alternates: createLocaleAlternates('/news', locale),
    openGraph: {
      title,
      description: copy.pageDescription,
      url: pageUrl,
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: copy.pageDescription,
      images: [{ url: OG_IMAGE.url, alt: locale === 'en' ? OG_IMAGE.altEn : OG_IMAGE.alt }],
    },
  };
}

type HighlightQuote = {
  id: string;
  label: string;
  source: string;
  excerpt: string;
  highlights?: string[];
};

const SOURCE_NAME_MAP: Record<string, { ko: string; en: string }> = {
  한겨레: { ko: '한겨레', en: 'Hankyoreh' },
  '월간 믹싱': { ko: '월간 믹싱', en: 'Mixing Magazine' },
  뉴스아트: { ko: '뉴스아트', en: 'NewsArt' },
  아시아경제: { ko: '아시아경제', en: 'Asia Economy' },
  ABC뉴스: { ko: 'ABC뉴스', en: 'ABC News' },
  소셜임팩트뉴스: { ko: '소셜임팩트뉴스', en: 'Social Impact News' },
};

const localizeSourceName = (source: string, locale: LocaleCode): string => {
  const mapped = SOURCE_NAME_MAP[source];
  if (!mapped) return source;
  return locale === 'en' ? mapped.en : mapped.ko;
};

const localizeArticleDescription = (description: string, locale: LocaleCode): string => {
  if (locale === 'ko') return description;
  if (!description) return '';
  if (!containsHangul(description)) return description;
  return NEWS_COPY.en.originalKoreanArticleDescription;
};

const localizeArticleTitle = (title: string, source: string, locale: LocaleCode): string => {
  if (locale === 'ko') return title;
  if (!title || containsHangul(title)) {
    return `${localizeSourceName(source, locale)} · ${NEWS_COPY.en.originalKoreanArticleTitle}`;
  }
  return title;
};

const highlightQuotesByLocale: Record<LocaleCode, HighlightQuote[]> = {
  ko: [
    {
      id: 'hani-20251105',
      label: '2025.11.5',
      source: '한겨레',
      excerpt:
        '제1금융권에서 거절당한 예술인은 고금리 대출로 향한다. 연극인 이수경씨는 과거 카드빚 600만원을 7년동안 갚은 기억을 전했다. 이씨는 “(이자 부담이 커) 갚은 돈이 1천만원을 넘는 것 같다”고 했다. 채권 추심도 피하지 못했다. “처음에는 전기료나 가스비 같은 공공요금에서 빼가다가 통장이 동결됐어요. 채권 추심 전화를 받는데 영화에서나 본 조폭 같은 목소리였습니다. 끔찍했어요.” 예술인들 사이에 흔한 얘기다.',
      highlights: ['제1금융권', '고금리 대출', '채권 추심', '통장이 동결'],
    },
    {
      id: 'mixing-20251106',
      label: '2025.11.6',
      source: '월간 믹싱',
      excerpt:
        '현재 예술인 집단의 대다수가 금융 사각지대에 놓여 있다는 것은 우리나라 문화예술의 기반을 위협하는 심각한 문제다. 금융기관과 예술 단체, 정부가 예술인의 복지 향상과 대안적 금융에 적극적으로 관심을 기울여야 한다.',
      highlights: ['금융 사각지대', '문화예술의 기반', '대안적 금융'],
    },
    {
      id: 'newsart-20250522',
      label: '2025.05.22',
      source: '뉴스아트',
      excerpt:
        '대출금 상환 성과도 괄목할 만하다. 대위변제율은 금액 기준 5.10%로, 일반 금융기관의 저신용자 대출 연체율과 비교해 낮은 수준을 유지하고 있다. 이는 신용점수가 낮아도 예술인들의 상환 의지와 책임감이 결코 낮지 않다는 것을 증명한다.',
      highlights: ['대위변제율', '5.10%', '상환 의지'],
    },
    {
      id: 'asiae-20251105',
      label: '2025.11.5',
      source: '아시아경제',
      excerpt:
        '은행 문턱을 넘지 못한 예술인 상당수는 고금리 대부업체로 내몰렸으며, 응답자의 48.6%가 연 15% 이상 초고금리 대출을 경험한 것으로 조사됐다.',
      highlights: ['고금리 대부업체', '48.6%', '연 15% 이상'],
    },
    {
      id: 'newsart-20251105',
      label: '2025.11.5',
      source: '뉴스아트',
      excerpt:
        "3단계, '파괴': 결국 빚의 무게는 삶의 기반을 무너뜨린다. 채권 추심을 경험한 예술인의 88.3%가 창작 활동을 중단하거나 현저히 위축됐다. 한 편의 시와 한 곡의 노래가 빚 독촉 전화에 짓밟히는 순간, K-문화의 미래 자산도 함께 소멸되고 있었다.",
      highlights: ['채권 추심', '88.3%', '창작 활동', '빚 독촉'],
    },
    {
      id: 'abcn-20230315',
      label: '2023.03.15',
      source: 'ABC뉴스',
      excerpt:
        '이에 다양한 예술인들이 더 많은 대출기금을 마련하기 위해 발 벗고 나섰는데, 입소문을 타면서 씨앗페의 규모가 훨씬 커졌다. 미술·음악·사진·무용 등 장르와 세대를 아우른 이번 축제는 코로나 이후 최대 규모로, 금융 소외 문제에 대한 사회적 관심을 불러일으킨다.',
      highlights: ['대출기금', '씨앗페', '코로나 이후 최대 규모'],
    },
    {
      id: 'socialimpact-20230619',
      label: '2023.06.19',
      source: '소셜임팩트뉴스',
      excerpt:
        '“(불규칙한 소득 탓에) 신용점수는 낮을 수밖에 없죠. 신용점수가 낮으면 은행에서 대출 받는 게 정말 쉽지 않습니다. 설령 대출을 받는다 해도 저축은행이나 대부업체의 고금리 대출을 받거나 카드론에 손을 대는 게 다반사예요.” 서인형 이사장은 고금리에 빠지면 은행으로 돌아가기가 더 어려워지는 악순환을 지적했다.',
      highlights: ['신용점수', '고금리 대출', '악순환'],
    },
    {
      id: 'newsart-20250918',
      label: '2025.09.18',
      source: '뉴스아트',
      excerpt:
        '이 대담한 뚝심은 예술인들과의 지속적인 관계 맺기가 있었기에 가능했다. 조합은 차가운 서류로 심사하는 기관이 아니다. 씨앗페 등 공동체 활동으로 연대감을 다진 관계금융이 책임감 있는 상환으로 이어졌고, “이번 7억 원 돌파는 예술인들이 스스로 금융 주권을 찾아가고 있다는 증거”라고 서인형 이사장은 말했다.',
      highlights: ['관계금융', '책임감 있는 상환', '금융 주권'],
    },
  ],
  en: [
    {
      id: 'hani-20251105',
      label: '2025.11.5',
      source: 'Hankyoreh',
      excerpt:
        'Artists rejected by primary banks are pushed toward high-interest loans. Interviewees described frozen accounts, aggressive debt collection calls, and long repayment periods that far exceeded original debt.',
      highlights: ['primary banking', 'high-interest loans', 'debt collection', 'frozen accounts'],
    },
    {
      id: 'mixing-20251106',
      label: '2025.11.6',
      source: 'Mixing Magazine',
      excerpt:
        'The financial blind spot faced by artists is a structural threat to cultural sustainability. The article calls for active cooperation between financial institutions, arts organizations, and public policy actors.',
      highlights: ['financial blind spot', 'cultural sustainability', 'alternative finance'],
    },
    {
      id: 'newsart-20250522',
      label: '2025.05.22',
      source: 'NewsArt',
      excerpt:
        'Repayment outcomes remain notable: the subrogation rate stays at 5.10% by amount, lower than delinquency trends often seen in low-credit lending. The report emphasizes strong repayment intent among artists.',
      highlights: ['subrogation rate', '5.10%', 'repayment intent'],
    },
    {
      id: 'asiae-20251105',
      label: '2025.11.5',
      source: 'Asia Economy',
      excerpt:
        'Many artists unable to pass bank screening are pushed to high-interest lenders, with 48.6% of respondents reporting loans at annual rates of 15% or higher.',
      highlights: ['high-interest lenders', '48.6%', '15%+ APR'],
    },
    {
      id: 'newsart-20251105',
      label: '2025.11.5',
      source: 'NewsArt',
      excerpt:
        'Debt pressure eventually breaks creative foundations. Among artists who experienced debt collection, 88.3% reported serious disruption or suspension of creative work.',
      highlights: ['debt collection', '88.3%', 'creative work'],
    },
    {
      id: 'abcn-20230315',
      label: '2023.03.15',
      source: 'ABC News',
      excerpt:
        'Artists across visual art, music, photography, and dance joined to expand loan funds. The campaign grew rapidly by word of mouth and became one of the largest post-pandemic artist solidarity events.',
      highlights: ['loan fund', 'SAF', 'post-pandemic scale'],
    },
    {
      id: 'socialimpact-20230619',
      label: '2023.06.19',
      source: 'Social Impact News',
      excerpt:
        'Irregular income often lowers credit scores, making bank loans difficult to access. The article warns of a vicious cycle where high-interest borrowing makes re-entry to formal finance even harder.',
      highlights: ['credit score', 'high-interest loans', 'vicious cycle'],
    },
    {
      id: 'newsart-20250918',
      label: '2025.09.18',
      source: 'NewsArt',
      excerpt:
        'Sustained relationship-based finance made bold progress possible. The report frames the KRW 700M milestone as evidence that artists are rebuilding financial sovereignty together.',
      highlights: ['relationship finance', 'responsible repayment', 'financial sovereignty'],
    },
  ],
};

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedExcerpt(excerpt: string, highlights?: string[]) {
  if (!highlights || highlights.length === 0) {
    return excerpt;
  }

  const uniqueHighlights = Array.from(new Set(highlights.filter(Boolean)));
  if (uniqueHighlights.length === 0) {
    return excerpt;
  }

  const highlightSet = new Set(uniqueHighlights);
  const pattern = new RegExp(`(${uniqueHighlights.map(escapeRegExp).join('|')})`, 'g');

  return excerpt.split(pattern).map((part, index) => {
    if (highlightSet.has(part)) {
      return (
        <mark
          key={`highlight-${part}-${index}`}
          className="rounded px-1 font-semibold text-primary bg-primary/10"
        >
          {part}
        </mark>
      );
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
}

function formatDate(isoString: string, locale: LocaleCode) {
  return new Date(isoString).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function NewsPage() {
  const locale = resolveLocale(await getLocale());
  const canonicalUrl = buildLocaleUrl('/news', locale);
  const copy = NEWS_COPY[locale];
  const highlightQuotes = highlightQuotesByLocale[locale];
  const tBreadcrumbs = await getTranslations('breadcrumbs');
  const newsArticles = await getSupabaseNews();

  const breadcrumbItems = [
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('news'), url: canonicalUrl },
  ];
  const breadcrumbSchema = createBreadcrumbSchema(breadcrumbItems);

  const latestNewsDate =
    newsArticles.length > 0
      ? newsArticles.reduce(
          (latest, a) => (a.date > latest ? a.date : latest),
          newsArticles[0].date
        )
      : undefined;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${canonicalUrl}#collection`,
    name: copy.collectionName,
    description: copy.collectionDescription,
    url: canonicalUrl,
    isPartOf: { '@id': `${SITE_URL}#website` },
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
    ...(latestNewsDate && { dateModified: latestNewsDate }),
    inLanguage: locale === 'en' ? 'en-US' : 'ko-KR',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#news-hero-description', '#press-highlights-title', '#press-highlights-desc'],
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: newsArticles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: generateNewsArticleSchema({
          title: localizeArticleTitle(article.title, article.source, locale),
          description: localizeArticleDescription(article.description || '', locale),
          datePublished: article.date,
          image: article.thumbnail || OG_IMAGE.url,
          url: buildLocaleUrl(`/news/${article.id}`, locale),
          sourceName: localizeSourceName(article.source, locale),
          locale,
        }),
      })),
    },
  };

  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, structuredData]} />

      <PageHero
        title={copy.heroTitle}
        description={copy.heroDescription}
        descriptionId="news-hero-description"
        breadcrumbItems={breadcrumbItems}
      >
        <ShareButtonsWrapper
          url={canonicalUrl}
          title={copy.shareTitle}
          description={copy.shareDescription}
        />
      </PageHero>

      <Section variant="sun-soft" prevVariant="white">
        <div className="container-max flex flex-col gap-12">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-primary text-primary text-xs font-semibold tracking-wide uppercase mb-4">
              {copy.highlightsBadge}
            </span>
            <SectionTitle id="press-highlights-title" className="mb-4">
              {copy.highlightsTitle}
            </SectionTitle>
            <p
              id="press-highlights-desc"
              className="text-base md:text-lg text-charcoal-muted leading-relaxed text-balance"
            >
              {copy.highlightsDescription.split('\n')[0]} <br className="hidden md:block" />
              {copy.highlightsDescription.split('\n')[1]}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {highlightQuotes.map((item) => (
              <figure
                key={item.id}
                className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <figcaption className="text-xs font-semibold tracking-widest uppercase text-primary">
                  {item.label} · {item.source} {copy.coverageSuffix}
                </figcaption>
                <blockquote className="mt-4 border-l-4 border-primary/30 pl-4 text-base md:text-lg text-gray-900 leading-relaxed">
                  {renderHighlightedExcerpt(item.excerpt, item.highlights)}
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      <Section variant="primary-surface" prevVariant="sun-soft" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {newsArticles.map((article) => {
              const localizedTitle = localizeArticleTitle(article.title, article.source, locale);
              const localizedDescription = localizeArticleDescription(
                article.description || '',
                locale
              );

              return (
                <article
                  key={article.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <Link
                    href={`/news/${article.id}`}
                    className="flex flex-col h-full"
                    aria-label={`${localizedTitle} — ${localizeSourceName(article.source, locale)}`}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      {article.thumbnail ? (
                        <SafeImage
                          src={article.thumbnail}
                          alt={localizedTitle}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                          <span className="text-4xl mb-2">📰</span>
                          <span className="text-sm">{copy.noImage}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
                        <span>{localizeSourceName(article.source, locale)}</span>
                        <span>{formatDate(article.date, locale)}</span>
                      </div>
                      <h3 className="font-sans font-bold text-xl leading-tight text-gray-900">
                        {localizedTitle}
                      </h3>
                      <p className="text-sm text-charcoal-muted leading-relaxed">
                        {localizedDescription}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        {copy.readMore}
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 12h14M13 5l7 7-7 7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </Section>
    </>
  );
}
