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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/김규학)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_GYUHAK_PATH = `/artworks/artist/${encodeURIComponent('김규학')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimGyuhakArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김규학' ||
    n === 'kim gyu-hak' ||
    n === 'kim gyuhak' ||
    n.replace(/[\s-]+/g, '') === 'kimgyuhak'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김규학 — 21세기 도시를 그리는 회화',
    description:
      '인천을 기반으로 도시의 풍경을 회화 언어로 재해석해 온 중견 작가 김규학. 12회의 개인전과 250여 회의 단체전을 거치며 현대 도시의 구조와 색을 화면에 옮겨 왔다. 국립현대미술관 미술은행·광주시립미술관 등이 소장한 김규학의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '인천 기반의 도시 회화 — 현대 도시의 풍경을 회화 언어로 재해석하는 중견 작가 김규학. ‘pixel: 풍경의 재해석’.',
    ogAlt: '김규학 대표 작품',
    twitterTitle: '김규학',
    twitterDescription: '21세기 도시 — 풍경의 재해석. 인천 기반의 도시 회화 김규학',
    keywords:
      '김규학 화가, 도시 풍경, 도시 회화, 21세기 도시, 인천 작가, 풍경의 재해석, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Gyu-hak — Painting the 21st-Century City',
    description:
      'Selected works by Kim Gyu-hak, a mid-career artist based in Incheon who reinterprets the urban landscape through the language of painting. Across 12 solo exhibitions and some 250 group shows, he has translated the structure and colour of the modern city onto the canvas. View and collect his works — held by the MMCA Art Bank, the Gwangju Museum of Art, and others — at SAF Online.',
    ogDescription:
      'Incheon-based urban painting — Kim Gyu-hak reinterprets the modern cityscape through the language of painting. “pixel: a reinterpretation of landscape.”',
    ogAlt: 'Kim Gyu-hak — featured work',
    twitterTitle: 'Kim Gyu-hak',
    twitterDescription: 'The 21st-century city — a reinterpretation of landscape. Kim Gyu-hak',
    keywords:
      'Kim Gyu-hak artist, urban landscape, cityscape painting, 21st century city, Incheon artist, Korean contemporary painting',
  },
} as const;

export async function buildKimGyuhakMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_GYUHAK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김규학');
  const artwork = allArtworks.find((a) => isKimGyuhakArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Gyu-hak`
      : `${artwork.title} — 김규학`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_GYUHAK_PATH, locale, true),
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

export default async function KimGyuhakFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_GYUHAK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김규학');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimGyuhakArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Gyu-hak' : '김규학', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_GYUHAK_PATH}#person-kim-gyuhak`,
    name: isEnglish ? 'Kim Gyu-hak' : '김규학',
    alternateName: isEnglish ? '김규학' : 'Kim Gyu-hak',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Gyu-hak is a mid-career Korean artist based in Incheon who reinterprets the urban landscape through the language of painting.'
      : '김규학은 인천을 기반으로 도시의 풍경을 회화 언어로 재해석해 온 중견 작가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Chung-Ang University Graduate School of Art, Plastic Arts'
        : '중앙대학교 예술대학원 조형예술학과',
    },
    knowsAbout: isEnglish
      ? ['Urban landscape painting', 'Cityscape', 'Contemporary painting']
      : ['도시 풍경 회화', '도시 회화', '현대 회화'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Gyu-hak — SAF Online' : '김규학 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Gyu-hak from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김규학 작품들을 소개합니다.',
    url: pageUrl,
    eventStatus: 'https://schema.org/EventMovedOnline',
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

          {/* Vertical strata lines — 도시의 격자·픽셀 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Gyu-hak · Incheon' : '김규학 · 인천'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The 21st-century city,
                  <br />
                  <span className="text-primary-soft">reinterpreted as landscape</span>
                </>
              ) : (
                <>
                  21세기 도시를
                  <br />
                  <span className="text-primary-soft">풍경으로 다시 읽다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He translates the structure and colour of the modern city onto the canvas.
                  </span>
                  <span className="mt-2 block">
                    An urban painting rooted in Incheon — a reinterpretation of landscape.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">현대 도시의 구조와 색을 화면으로 옮기다.</span>
                  <span className="mt-2 block">인천에 뿌리내린 도시 회화 — 풍경의 재해석.</span>
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
                    The city, as painting —<br />
                    <span className="text-primary-strong">structure and colour on a surface</span>
                  </>
                ) : (
                  <>
                    회화가 된 도시 —<br />
                    <span className="text-primary-strong">화면 위의 구조와 색</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Gyu-hak is a mid-career Korean artist based in Incheon. He graduated from
                      the Graduate School of Art at Chung-Ang University, in the Department of
                      Plastic Arts, and has built a practice centred on a single subject: the city.
                      Across his work, the modern urban landscape is reinterpreted through the
                      language of painting — its structure, its grid, its colour.
                    </p>
                    <p>
                      His practice spans{' '}
                      <strong className="font-bold text-charcoal-deep">
                        twelve solo exhibitions and some 250 group shows
                      </strong>
                      . The 2024 solo exhibition <em>21st Century City</em> (KMJ Art Gallery,
                      Incheon) is among the most recent, part of a sustained inquiry into how the
                      contemporary city can be held within a frame.
                    </p>
                    <p>
                      That inquiry has a name in his recent work:{' '}
                      <strong className="font-bold text-charcoal">
                        pixel — a reinterpretation of landscape
                      </strong>
                      . Where a city dissolves into the smallest units of perception, Kim
                      reassembles it as a painted surface, neither documentary record nor pure
                      abstraction but something in between: the city seen as both structure and
                      sensation.
                    </p>
                    <p>
                      His works are held in major public collections — the MMCA Art Bank, the
                      Gwangju Museum of Art, the Yeoju Museum of Art &ldquo;Ryeo,&rdquo; the Incheon
                      Foundation for Arts &amp; Culture Art Bank, the Yangpyeong Museum of Art, the
                      Gyeonggi Cultural Foundation, the Anguk Cultural Foundation, and Samtan Art
                      Mine, among others. He joins this campaign not as a subject of its cause but
                      as a fellow artist in solidarity.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김규학은 인천을 기반으로 활동하는 중견 작가다. 중앙대학교 예술대학원
                      조형예술학과를 졸업했으며, 하나의 주제 — 도시 — 를 중심으로 작업을 이어 왔다.
                      그의 화면에서 현대 도시의 풍경은 회화의 언어로 재해석된다. 구조, 격자, 그리고
                      색으로.
                    </p>
                    <p>
                      그의 작업은{' '}
                      <strong className="font-bold text-charcoal-deep">
                        12회의 개인전과 250여 회의 단체전
                      </strong>
                      에 걸쳐 있다. 2024년 개인전 「21세기 도시」(KMJ아트갤러리, 인천)는 그 가장
                      최근의 한 장면으로, 동시대 도시를 어떻게 한 화면 안에 담을 것인가에 대한
                      지속적인 탐구의 일부다.
                    </p>
                    <p>
                      그 탐구는 근작에서 하나의 이름을 갖는다:{' '}
                      <strong className="font-bold text-charcoal">픽셀, 풍경의 재해석</strong>.
                      도시가 지각의 최소 단위로 분해되는 지점에서, 김규학은 그것을 다시 회화의
                      화면으로 조립한다. 기록도 순수 추상도 아닌 그 사이의 무엇 — 구조이자 감각으로
                      바라본 도시다.
                    </p>
                    <p>
                      그의 작품은 국립현대미술관 미술은행, 광주시립미술관, 여주시미술관 아트뮤지엄
                      려, 인천문화재단 미술은행, 양평군립미술관, 경기문화재단, 안국문화재단,
                      삼탄아트마인 등 주요 공공 컬렉션에 소장돼 있다. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다.
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
                        {isEnglish ? 'The 21st-century city' : '21세기 도시'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The modern city as primary subject — its structure and colour translated onto the painted surface.'
                          : '현대 도시를 일관된 주제로 삼는다. 도시의 구조와 색을 화면으로 옮긴다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'pixel — reinterpreting landscape' : '픽셀 — 풍경의 재해석'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A landscape resolved into its smallest units, then reassembled as a painted surface — neither pure record nor pure abstraction.'
                          : '풍경을 최소 단위로 분해해 다시 회화의 화면으로 조립한다. 기록도 추상도 아닌 그 사이.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Rooted in Incheon' : '인천에 뿌리내린 작업'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Based in Incheon across 12 solo and some 250 group exhibitions — a regional practice with national reach.'
                          : '인천을 기반으로 12회 개인전·250여 회 단체전. 지역에 뿌리를 둔 채 전국으로 닿는 작업.'}
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
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Grand Prize, Incheon Art Exhibition.' : '인천미술대전 대상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Grand Prize, Angyeon-sarang National Art Exhibition; Best Award, Indépendant KOREA.'
                        : '안견사랑전국미술대전 대상; 앙데팡당KOREA 최우수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected for the Incheon Foundation for Arts & Culture art-creation grant and the Seoul Foundation for Arts & Culture senior-artist support.'
                        : '인천문화재단 예술창작 지원·서울문화재단 원로예술지원 선정.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈21st Century City〉 (KMJ Art Gallery, Incheon); selected again for the Incheon art-creation grant.'
                        : '개인전 「21세기 도시」(KMJ아트갤러리, 인천); 인천문화재단 예술창작 지원 재선정.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Group exhibition 〈Art·T Incheon〉, Incheon Foundation Art Bank curated show (Namdong Culture Center); the acquisitions show 〈pixel: a reinterpretation of landscape〉, Yeoju Museum of Art 'Ryeo.'"
                        : '「아트·T 인천」 미술은행 기획전시(남동문화센터); 구입소장품전 「픽셀(pixel): 풍경의 재해석」(여주시미술관 아트뮤지엄 려).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition ASYAAF (Culture Station Seoul 284).'
                        : '단체전 아시아프(문화역서울284).'}
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
                      {isEnglish ? (
                        <>
                          Solo exhibition: 〈21st Century City〉, KMJ Art Gallery, Incheon (2024) —
                          one of twelve solo shows
                        </>
                      ) : (
                        <>개인전: 「21세기 도시」, KMJ아트갤러리, 인천 (2024) — 총 12회 개인전 중</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibitions: ASYAAF, Culture Station Seoul 284 (2025); 〈Art·T
                          Incheon〉 Art Bank curated show, Namdong Culture Center (2024)
                        </>
                      ) : (
                        <>
                          단체전: 아시아프, 문화역서울284 (2025); 「아트·T 인천」 미술은행 기획전시,
                          남동문화센터 (2024)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Acquisitions show: 〈pixel: a reinterpretation of landscape〉, Yeoju
                          Museum of Art &ldquo;Ryeo&rdquo; (2024)
                        </>
                      ) : (
                        <>
                          구입소장품전: 「픽셀(pixel): 풍경의 재해석」, 여주시미술관 아트뮤지엄 려
                          (2024)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Public collections: MMCA Art Bank; Gwangju Museum of Art; Yeoju Museum of Art "Ryeo"; Incheon Foundation for Arts & Culture Art Bank; Yangpyeong Museum of Art; Gyeonggi Cultural Foundation; Anguk Cultural Foundation; Samtan Art Mine, among others'
                        : '소장: 국립현대미술관 미술은행; 광주시립미술관; 여주시미술관 아트뮤지엄 려; 인천문화재단 미술은행; 양평군립미술관; 경기문화재단; 안국문화재단; 삼탄아트마인 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Grand Prize, Angyeon-sarang National Art Exhibition (2019); Best Award, Indépendant KOREA (2019); Grand Prize, Incheon Art Exhibition (2018)'
                        : '수상: 안견사랑전국미술대전 대상 (2019); 앙데팡당KOREA 최우수상 (2019); 인천미술대전 대상 (2018)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 김규학 도시 회화 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and the city</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 도시에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 하나의 주제, 도시 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'One subject, sustained — the city' : '하나의 주제를 오래 — 도시'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Some artists range widely; others choose a single subject and stay with it
                        until it opens. Kim Gyu-hak belongs to the second kind. Trained at the
                        Graduate School of Art at Chung-Ang University in plastic arts, he has held
                        twelve solo exhibitions and shown in some 250 group exhibitions — and across
                        that span, the city has remained his constant.
                      </p>
                      <p>
                        The 2024 solo exhibition <em>21st Century City</em> at KMJ Art Gallery in
                        Incheon names the project plainly. Not a city of nostalgia or ruin, but the
                        contemporary city as it is now: a dense field of structure, surface, and
                        colour. Kim does not document it so much as translate it — into the slower,
                        more deliberate language of paint.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        어떤 작가는 폭넓게 옮겨 다니고, 어떤 작가는 하나의 주제를 골라 그것이 열릴
                        때까지 머문다. 김규학은 후자에 속한다. 중앙대학교 예술대학원
                        조형예술학과에서 수련한 그는 12회의 개인전과 250여 회의 단체전을 거치는
                        동안, 도시를 변함없는 주제로 삼아 왔다.
                      </p>
                      <p>
                        2024년 인천 KMJ아트갤러리에서 연 개인전 「21세기 도시」는 그 작업의 이름을
                        그대로 드러낸다. 향수도 폐허도 아닌, 지금 이대로의 동시대 도시 — 구조와
                        표면, 색이 빽빽이 들어찬 장(場)이다. 김규학은 그것을 기록한다기보다 옮긴다.
                        더 느리고 더 의식적인 회화의 언어로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 픽셀, 풍경의 재해석 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'pixel — a reinterpretation of landscape' : '픽셀 — 풍경의 재해석'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of the 2024 acquisitions show at the Yeoju Museum of Art
                        &ldquo;Ryeo&rdquo; — <em>pixel: a reinterpretation of landscape</em> —
                        points to the formal logic of the recent work. A pixel is the smallest unit
                        of a screen image; landscape is one of the oldest subjects in painting. Kim
                        sets the two against each other.
                      </p>
                      <p>
                        The result is a surface that holds both registers at once: read closely, it
                        resolves into discrete units of mark and colour; stepped back, it gathers
                        into the recognisable structure of a city. The painting becomes a place
                        where the digital grain of contemporary vision and the slow accumulation of
                        painted landscape meet — neither pure record nor pure abstraction, but the
                        city held as both structure and sensation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2024년 여주시미술관 아트뮤지엄 려에서 연 구입소장품전의 제목 —
                        「픽셀(pixel): 풍경의 재해석」 — 은 근작의 형식 논리를 가리킨다. 픽셀은 화면
                        이미지의 최소 단위이고, 풍경은 회화의 가장 오래된 주제 가운데 하나다.
                        김규학은 그 둘을 마주 세운다.
                      </p>
                      <p>
                        그 결과는 두 층위를 동시에 품는 화면이다. 가까이서 보면 마크와 색의 낱낱한
                        단위로 흩어지고, 물러서면 알아볼 수 있는 도시의 구조로 모인다. 회화는 동시대
                        시각의 디지털 입자와, 천천히 축적되는 회화적 풍경이 만나는 자리가 된다 —
                        기록도 추상도 아닌, 구조이자 감각으로 붙든 도시.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 인천에서, 공공 컬렉션으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From Incheon, into public collections'
                    : '인천에서, 공공 컬렉션으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim&apos;s practice is rooted in Incheon, and that rootedness has been
                        rewarded close to home — the Grand Prize at the Incheon Art Exhibition in
                        2018, and repeated selection for the Incheon Foundation for Arts &amp;
                        Culture art-creation grant. In 2019 he took the Grand Prize at the
                        Angyeon-sarang National Art Exhibition and the Best Award at Indépendant
                        KOREA, widening the recognition beyond his region.
                      </p>
                      <p>
                        That recognition is legible above all in where the work now rests. His
                        paintings have entered the collections of the MMCA Art Bank, the Gwangju
                        Museum of Art, the Yeoju Museum of Art &ldquo;Ryeo,&rdquo; the Incheon
                        Foundation Art Bank, the Yangpyeong Museum of Art, the Gyeonggi Cultural
                        Foundation, the Anguk Cultural Foundation, and Samtan Art Mine — public
                        institutions that hold the work in trust for a wider public.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김규학의 작업은 인천에 뿌리를 둔다. 그 뿌리내림은 가까운 곳에서 먼저
                        응답받았다 — 2018년 인천미술대전 대상, 그리고 인천문화재단 예술창작 지원의
                        거듭된 선정. 2019년에는 안견사랑전국미술대전 대상과 앙데팡당KOREA 최우수상을
                        받으며, 그 인정의 폭을 지역 너머로 넓혔다.
                      </p>
                      <p>
                        그 인정은 무엇보다 작품이 지금 놓인 자리에서 읽힌다. 그의 회화는
                        국립현대미술관 미술은행, 광주시립미술관, 여주시미술관 아트뮤지엄 려,
                        인천문화재단 미술은행, 양평군립미술관, 경기문화재단, 안국문화재단,
                        삼탄아트마인의 컬렉션에 들어갔다 — 더 넓은 대중을 위해 작품을 위탁받아
                        보관하는 공공 기관들이다.
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
                      Across twelve solo exhibitions and some 250 group shows, Kim Gyu-hak has
                      pursued a single question: how does the 21st-century city become a painting,
                      and how does a painting hold the city? He joins this campaign not as a subject
                      of its cause but as a fellow artist in solidarity — so that the artists who
                      come after might work with the support a financial system still denies them.
                    </>
                  ) : (
                    <>
                      12회의 개인전과 250여 회의 단체전을 거치며, 김규학은 하나의 물음을 추구해
                      왔다: 21세기 도시는 어떻게 회화가 되고, 회화는 어떻게 도시를 붙드는가. 그는
                      씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 다음 세대의 예술인들이, 금융 제도가 아직 내어주지 않는 뒷받침과 함께 일할 수
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
                CITY
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
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Gyu-hak</span>
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
                    Kim Gyu-hak joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김규학 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_GYUHAK_PATH}
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
                        <span className="block">현재 작품 정보를 정리하고 있습니다.</span>
                        <span className="mt-1 block">
                          전체 출품작 목록에서 다른 작품들을 먼저 감상하실 수 있습니다.
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
