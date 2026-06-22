import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MasterArtistMediumSections from '@/components/special/MasterArtistMediumSections';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PaperGrain from '@/components/common/PaperGrain';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import { resolveLocale } from '@/lib/server-locale';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import type { Artwork, ArtworkListItem } from '@/types';

// 거장 작가 feature는 작가 페이지(/artworks/artist/고자영)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const GO_JAYEONG_PATH = `/artworks/artist/${encodeURIComponent('고자영')}`;

const GO_JAYEONG_ARTIST_KEYS = new Set([
  '고자영',
  'go jayeong',
  'go ja-yeong',
  'ko jayeong',
  'ko ja-young',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isGoJayeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    GO_JAYEONG_ARTIST_KEYS.has(normalized) ||
    compact === '고자영' ||
    compact === 'gojayeong' ||
    compact === 'kojayeong' ||
    compact === 'kojayoung'
  );
};

const PAGE_COPY = {
  ko: {
    title: '고자영 — 정원과 식물의 판화가',
    description:
      '판화 기반의 중견 작가 고자영. 정원과 식물을 소재로 자아와 세상의 이치를 탐구하며, 다층적 시각체험을 화면에 새긴다. 서울대학교 미술대학 박사, 2007년 제1회 세오 영 아티스트. 식물의 결과 판화의 물성이 만나는 고자영의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '정원과 식물의 판화가 고자영. 정원·식물을 소재로 자아와 세상의 이치를 탐구하는 다층적 시각체험의 판화.',
    ogAlt: '고자영 대표 작품',
    twitterTitle: '고자영',
    twitterDescription: '정원과 식물 — 자아와 세상의 이치를 새기는 판화가 고자영',
    keywords: '고자영 작가, 판화, 정원, 식물, 다층적 시각체험, 세오 영 아티스트, 씨앗페 온라인',
  },
  en: {
    title: 'Go Jayeong — Printmaker of Gardens and Plants',
    description:
      'Selected works by Go Jayeong, a mid-career printmaker. Drawing on gardens and plants, she explores the self and the order of the world, engraving a layered visual experience into the print. Doctor of Fine Arts, Seoul National University; selected as the 1st SEO Young Artist in 2007. View and collect her works at SAF Online.',
    ogDescription:
      'Go Jayeong — printmaker of gardens and plants. Through gardens and plants she explores the self and the order of the world in layered visual experience.',
    ogAlt: 'Go Jayeong — featured work',
    twitterTitle: 'Go Jayeong',
    twitterDescription:
      'Gardens and plants — a printmaker engraving the self and the order of the world',
    keywords:
      'Go Jayeong artist, Korean printmaking, gardens, plants, layered visual experience, SEO Young Artist',
  },
} as const;

export async function buildGoJayeongMetadata({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl(GO_JAYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('고자영');
  const artwork = allArtworks.find((a) => isGoJayeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Go Jayeong`
      : `${artwork.title} — 고자영`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(GO_JAYEONG_PATH, locale, true),
    ...(locale === 'en' ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: copy.title,
      description: copy.ogDescription,
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: [{ url: ogImageUrl, alt: ogImageAlt }],
    },
  };
}

export default async function GoJayeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(GO_JAYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('고자영');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isGoJayeongArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Go Jayeong' : '고자영', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${GO_JAYEONG_PATH}#person-go-jayeong`,
    name: isEnglish ? 'Go Jayeong' : '고자영',
    alternateName: isEnglish ? '고자영' : 'Go Jayeong',
    jobTitle: isEnglish ? 'Printmaker' : '판화가',
    description: isEnglish
      ? 'Go Jayeong is a mid-career Korean printmaker who explores the self and the order of the world through gardens and plants, engraving a layered visual experience into the print.'
      : '고자영은 정원과 식물을 소재로 자아와 세상의 이치를 탐구하며 다층적 시각체험을 화면에 새기는 판화 기반의 중견 작가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Seoul National University, College of Fine Arts (Ph.D.)'
        : '서울대학교 미술대학 박사',
    },
    knowsAbout: ['Printmaking', 'Gardens', 'Plants', 'Layered visual experience'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Go Jayeong — SAF Online' : '고자영 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Go Jayeong from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 고자영 작품을 소개합니다.',
    url: pageUrl,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: { '@type': 'VirtualLocation', url: pageUrl },
    startDate: '2026-01-14',
    organizer: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    about: artistPerson,
    isAccessibleForFree: true,
  };

  const itemListSchema = generateArtworkListSchema(
    fullArtworks,
    locale,
    fullArtworks.length,
    pageUrl
  );
  const aggregateOfferSchema = generateGalleryAggregateOffer(fullArtworks, locale, pageUrl);

  return (
    <>
      <JsonLdScript data={[breadcrumbSchema, exhibitionEventSchema, itemListSchema]} />
      {aggregateOfferSchema && <JsonLdScript data={aggregateOfferSchema} />}
      <PaperGrain />
      <div className="w-full bg-canvas-soft min-h-screen font-sans">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Vertical strata lines — 식물의 결·줄기 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Go Jayeong · Printmaker' : '고자영 · 판화가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A garden is a way
                  <br />
                  <span className="text-primary-soft">of knowing the world</span>
                </>
              ) : (
                <>
                  정원은 세상을
                  <br />
                  <span className="text-primary-soft">읽는 하나의 방식</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Through gardens and plants she traces the self and the order of the world.
                  </span>
                  <span className="mt-2 block">
                    The grain of a leaf meets the grain of the woodblock.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">정원과 식물로 자아와 세상의 이치를 더듬다.</span>
                  <span className="mt-2 block">식물의 결이 판화의 결과 만나는 자리.</span>
                </>
              )}
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    A garden, layered —<br />
                    <span className="text-primary-strong">plants as a way of seeing</span>
                  </>
                ) : (
                  <>
                    겹겹의 정원 —<br />
                    <span className="text-primary-strong">하나의 시선이 된 식물</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Go Jayeong is a mid-career printmaker whose practice is rooted in the
                      woodblock and the print. Taking the{' '}
                      <strong className="font-bold text-charcoal-deep">garden and the plant</strong>{' '}
                      as her recurring subjects, she uses them to feel her way toward the self and
                      the order of the world. Her images are quiet and contemplative, attentive to
                      the small grammar of growing things.
                    </p>
                    <p>
                      She completed a doctorate at the College of Fine Arts, Seoul National
                      University; her 2001 dissertation, &ldquo;A Study on the Expression of Layered
                      Visual Experience Using Plants as Subject Matter,&rdquo; already names the
                      concern that runs through her work — the{' '}
                      <strong className="font-bold text-charcoal">layered visual experience</strong>{' '}
                      of looking at a plant, where surface and depth, image and ground, fold into
                      one another.
                    </p>
                    <p>
                      In 2007 she was selected as the 1st SEO Young Artist, and her work entered an
                      active decade of solo and group exhibitions. The plant, in her hands, is never
                      mere decoration: it is a figure for the self that grows, branches, and bears
                      its season — a way of reading the world through the patient logic of a garden.
                    </p>
                    <p>
                      The material of the print matters as much as the motif. The grain of the
                      woodblock, the pressure of the press, the registered layers of an edition —
                      these physical facts of printmaking become, in her work, a second botany. The
                      grain of a leaf and the grain of the block belong to the same family of marks.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      고자영은 목판과 판화에 뿌리를 둔 중견 작가다. 그는{' '}
                      <strong className="font-bold text-charcoal-deep">정원과 식물</strong>을
                      거듭되는 소재로 삼아, 그것을 통해 자아와 세상의 이치를 더듬는다. 그의 화면은
                      조용하고 사색적이며, 자라나는 것들의 작은 문법에 주의를 기울인다.
                    </p>
                    <p>
                      그는 서울대학교 미술대학에서 박사 과정을 마쳤다. 2001년 박사 논문 「식물을
                      소재로 한 다층적 시각체험의 표현연구」는 그의 작업을 관통하는 관심을 이미 그
                      제목에 담고 있다 — 식물을 바라볼 때 일어나는{' '}
                      <strong className="font-bold text-charcoal">다층적 시각체험</strong>, 표면과
                      깊이, 이미지와 바탕이 서로 접히는 자리.
                    </p>
                    <p>
                      2007년 그는 제1회 세오 영 아티스트로 선정되었고, 그의 작업은 개인전과 단체전이
                      활발히 이어지는 한 시기로 들어선다. 그의 손에서 식물은 결코 장식에 머물지
                      않는다. 그것은 자라고 가지를 뻗고 제 계절을 맺는 자아의 형상이며, 정원의 더딘
                      이치로 세상을 읽어 내는 하나의 방식이다.
                    </p>
                    <p>
                      모티프만큼이나 판화의 물성이 중요하다. 목판의 결, 프레스의 압력, 에디션으로
                      쌓인 층 — 판화의 이 물리적 사실들이 그의 작업에서는 또 하나의 식물학이 된다.
                      잎의 결과 판목의 결은 같은 결의 가족이다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Major themes' : '주요 테마'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Gardens and plants' : '정원과 식물'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The garden and the plant as recurring subjects — figures through which she explores the self and the order of the world.'
                          : '거듭되는 소재로서의 정원과 식물 — 자아와 세상의 이치를 탐구하는 형상.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Layered visual experience' : '다층적 시각체험'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The concern named in her 2001 doctoral dissertation — surface and depth folding into one another as the eye reads a plant.'
                          : '2001년 박사 논문이 명명한 관심 — 식물을 읽는 눈에서 표면과 깊이가 서로 접히는 체험.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The matter of the print' : '판화의 물성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The grain of the woodblock and the layered logic of the edition become a second botany — the grain of leaf and block meeting.'
                          : '목판의 결과 에디션의 층위가 또 하나의 식물학이 된다 — 잎의 결과 판목의 결이 만나는 자리.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Special Prize, Korea Contemporary Printmakers Association open call.'
                        : '한국현대판화가협회공모전 특선.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ph.D. dissertation: "A Study on the Expression of Layered Visual Experience Using Plants as Subject Matter"; Excellence Prize, Korea Contemporary Printmakers Association open call.'
                        : '박사 논문 「식물을 소재로 한 다층적 시각체험의 표현연구」; 한국현대판화가협회공모전 우수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions at Gallery Artlink and Sejong Gallery.'
                        : '개인전 — 갤러리 아트링크·세종갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected Works, Space International Print Biennale.'
                        : '공간 국제 판화 비엔날레 Selected Works.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as the 1st SEO Young Artist; solo exhibition at SEO Gallery.'
                        : '제1회 세오 영 아티스트 선정; SEO갤러리 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected Artist, 30th JoongAng Fine Arts Prize; solo exhibition at Dr. Park Gallery.'
                        : '제30회 중앙미술대전 선정작가; 닥터 박 갤러리 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected Artist, SongEun Art Award (SongEun Art Award Exhibition, Insa Art Center).'
                        : '송은미술대상 선정작가 (송은미술대상전, 인사아트센터).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition at Gallery Artlink.'
                        : '개인전 — 갤러리 아트링크.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition: 《Korean Contemporary Prints 1958–2008》, MMCA Gwacheon (2008)'
                        : '단체전: 《한국현대판화 1958–2008》, 국립현대미술관 과천 (2008)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'New Acquisitions exhibition, Seoul Museum of Art (2008); Seoul Art Exhibition — Prints, Seoul Museum of Art (2007)'
                        : '신 소장품전, 서울시립미술관 (2008); 서울미술대전 판화, 서울시립미술관 (2007)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Incheon International Women Artists Biennale (2007); Spectrum of the Korean Contemporary Print, Russia (2007)'
                        : '인천국제여성미술비엔날레 (2007); 스펙트럼 오브 더 코리안 컨템포러리 프린트, 러시아 (2007)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA Art Bank (Gwacheon), Seoul Museum of Art, Samsung Medical Center Cancer Center, Industrial Bank of Korea'
                        : '소장: 국립현대미술관 미술은행(과천), 서울시립미술관, 삼성병원 암센터, 기업은행'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Seoul Central District Court, Namseoul University, SEO Gallery'
                        : '소장: 서울중앙지방법원, 남서울대학교, 세오갤러리'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the garden and the grain</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">정원과 결에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 정원이라는 소재 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The garden as subject — self and the order of the world'
                    : '소재로서의 정원 — 자아와 세상의 이치'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For Go Jayeong, the garden is not a backdrop but a method. A garden is a
                        place where wild growth and human care meet — where things are allowed to
                        grow, but along lines someone has chosen. To take the garden as a subject is
                        to ask how the self and the world arrange themselves: what is cultivated,
                        what is left to its own season, what returns each year.
                      </p>
                      <p>
                        The plants she draws are read this way — not as still life but as figures of
                        a self that grows. A stem that branches, a leaf that unfolds, a root held in
                        the dark: each is a small grammar of becoming. Through them she feels her
                        way toward the order of the world, the slow logic by which living things
                        take their shape.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        고자영에게 정원은 배경이 아니라 방법이다. 정원은 야생의 자람과 사람의 돌봄이
                        만나는 자리다 — 자라도록 허락하되, 누군가 택한 선을 따라. 정원을 소재로
                        삼는다는 것은 자아와 세상이 어떻게 스스로를 배열하는지 묻는 일이다. 무엇을
                        가꾸고, 무엇을 제 계절에 맡기고, 무엇이 해마다 돌아오는가.
                      </p>
                      <p>
                        그가 그리는 식물은 이렇게 읽힌다 — 정물이 아니라 자라나는 자아의 형상으로.
                        가지를 뻗는 줄기, 펼쳐지는 잎, 어둠 속에 붙든 뿌리. 각각은 되어 감의 작은
                        문법이다. 그것들을 통해 그는 세상의 이치를, 살아 있는 것들이 제 모양을 얻는
                        더딘 논리를 더듬는다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 다층적 시각체험 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Layered visual experience — the 2001 dissertation'
                    : '다층적 시각체험 — 2001년 박사 논문'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her 2001 doctoral dissertation at Seoul National University,{' '}
                        <em>
                          A Study on the Expression of Layered Visual Experience Using Plants as
                          Subject Matter
                        </em>
                        , gives her practice its vocabulary. To look at a plant is never to look at
                        one thing: there is the surface and the depth behind it, the part lit and
                        the part in shadow, the image and the ground that holds it. The eye moves
                        through these as through layers.
                      </p>
                      <p>
                        Printmaking is uniquely suited to this. An edition is built in passes; each
                        layer of ink rests on the one before, and the final image carries the memory
                        of every press. In her work the layered seeing of a plant and the layered
                        making of a print become the same operation — a way of giving depth its own
                        visible structure.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2001년 서울대학교 박사 논문 「식물을 소재로 한 다층적 시각체험의
                        표현연구」는 그의 작업에 어휘를 부여한다. 식물을 본다는 것은 결코 하나를
                        보는 일이 아니다. 표면과 그 뒤의 깊이, 빛이 닿은 부분과 그늘에 잠긴 부분,
                        이미지와 그것을 받치는 바탕이 있다. 눈은 이것들을 층을 지나듯 통과한다.
                      </p>
                      <p>
                        판화는 이 일에 유독 어울린다. 에디션은 여러 번의 찍음으로 쌓이고, 잉크의 각
                        층은 앞선 층 위에 얹히며, 최종 이미지는 모든 프레스의 기억을 품는다. 그의
                        작업에서 식물을 보는 다층적 시선과 판화를 만드는 다층적 작업은 같은 동작이
                        된다 — 깊이에 그 자신의 보이는 구조를 부여하는 방식.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 판화의 물성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The grain of the block — print as a second botany'
                    : '판목의 결 — 또 하나의 식물학이 된 판화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A woodblock has a grain before any image is cut into it. The carver works
                        with and against that grain; the wood resists, gives, and leaves its own
                        mark in the print. In Go Jayeong&apos;s hands this is not an accident to be
                        smoothed away but a kinship to be kept — the grain of the block and the
                        grain of the leaf are the same kind of line.
                      </p>
                      <p>
                        This is why her plants feel grown rather than drawn. The physical facts of
                        printmaking — pressure, registration, the layered edition — become a second
                        botany, a way of making images that obey the patience of living things. The
                        result is a body of work that is quiet, contemplative, and rooted: a garden
                        kept in ink and wood.
                      </p>
                      <p>
                        Go Jayeong joins this campaign not as a subject of its cause but as a fellow
                        artist in solidarity — so that those who tend their own gardens of work
                        might do so without the weight of financial exclusion.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        목판에는 어떤 이미지가 새겨지기 전에 이미 결이 있다. 새기는 이는 그 결을
                        따라, 때로 거슬러 작업한다. 나무는 저항하고, 내어 주고, 판화에 제 흔적을
                        남긴다. 고자영의 손에서 이것은 매끈하게 지워야 할 우연이 아니라 지켜야 할
                        혈연이다 — 판목의 결과 잎의 결은 같은 종류의 선이다.
                      </p>
                      <p>
                        그래서 그의 식물은 그려졌다기보다 자라난 듯하다. 판화의 물리적 사실들 —
                        압력, 정합, 층으로 쌓인 에디션 — 이 또 하나의 식물학이 된다. 살아 있는
                        것들의 더딤을 따르는 이미지 제작의 방식. 그 결과는 조용하고 사색적이며
                        뿌리내린 작업이다. 잉크와 나무로 가꾼 한 채의 정원.
                      </p>
                      <p>
                        고자영 작가는 씨앗페에 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                        함께한다 — 저마다의 작업이라는 정원을 가꾸는 이들이 금융 차별의 무게 없이 그
                        일을 이어 갈 수 있도록.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium">
                  {isEnglish ? (
                    <>
                      From the garden to the woodblock, Go Jayeong&apos;s work pursues a single
                      question: how does a living thing take its shape, and how can a print hold
                      that becoming? The answer, built over two decades of plants and prints, is a
                      quiet botany of the self — and she offers it here in solidarity, so that
                      fellow artists might keep growing.
                    </>
                  ) : (
                    <>
                      정원에서 판목까지, 고자영의 작업은 하나의 물음을 추구한다: 살아 있는 것은
                      어떻게 제 모양을 얻는가, 그리고 판화는 어떻게 그 되어 감을 붙들 수 있는가.
                      식물과 판화로 20여 년에 걸쳐 구축한 대답은 자아의 조용한 식물학이다 — 그는
                      그것을 연대의 뜻으로 이 자리에 내어 놓는다. 동료 예술인들이 계속 자라날 수
                      있도록.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="relative py-20 bg-charcoal text-white">
          <div className="max-w-[1440px] mx-auto px-4 mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/20 pb-8">
            <div className="relative">
              <h2 className="text-4xl md:text-5xl mb-4 text-white font-black font-display text-balance">
                {isEnglish ? 'Selected Works' : '주요 작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                GARDEN
              </div>
              <p className="text-base sm:text-lg text-white/70 font-medium">
                {isEnglish ? (
                  <>
                    <span className="text-white font-bold text-xl">{artworkCountLabel}</span> works
                    are featured here.
                  </>
                ) : (
                  <>
                    총 <span className="text-white font-bold text-xl">{artworkCountLabel}</span>
                    점의 작품을 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Go Jayeong</span>
              <span className="text-sm text-white/60">
                {isEnglish
                  ? 'Click a work to view its details'
                  : '작품을 클릭하여 상세 정보를 확인하세요'}
              </span>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-4 mb-12">
            <div className="bg-white/5 border border-white/20 p-6 md:p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2 h-2 bg-primary rotate-45" />
                <span className="text-xs text-white/60 uppercase tracking-widest font-medium">
                  {isEnglish ? 'Artist mutual-aid' : '예술인 상호부조'}
                </span>
              </div>
              <p className="text-base md:text-lg text-white/90 leading-relaxed break-keep font-medium">
                {isEnglish ? (
                  <>
                    Go Jayeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    고자영 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
                    수익은 전액 <strong className="text-white">예술인 상호부조 대출 기금</strong>
                    으로 이어집니다. 작품 한 점의 구매가, 오늘 금융 차별을 겪는 예술인 한 사람의
                    다음 한 달이 됩니다.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-4">
            {ARTWORKS.length > 0 ? (
              <MasterArtistMediumSections
                artworks={ARTWORKS}
                isEnglish={isEnglish}
                returnTo={GO_JAYEONG_PATH}
              />
            ) : (
              <section className="py-24 text-center">
                <div className="inline-block rounded-xl border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-white text-balance mb-4">
                    {isEnglish ? 'Artwork data is being prepared' : '작품 데이터 준비 중입니다'}
                  </h3>
                  <p className="text-white/60 text-balance mb-8 break-keep">
                    {isEnglish ? (
                      <>
                        <span className="block">We are currently organizing the works.</span>
                        <span className="mt-1 block">
                          In the meantime, you are warmly invited to browse the rest of the
                          collection.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block">작품 정보를 정리 중입니다.</span>
                        <span className="mt-1 block">
                          전체 출품작 목록에서 다른 작품을 먼저 감상할 수 있습니다.
                        </span>
                      </>
                    )}
                  </p>
                  <Link
                    href="/artworks"
                    className="inline-flex items-center justify-center px-6 py-3 border border-white/30 rounded text-white hover:bg-white hover:text-charcoal transition-colors font-medium"
                  >
                    {isEnglish ? 'Browse all artworks' : '전체 작품 보러 가기'}
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
