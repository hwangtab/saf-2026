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

// 거장 작가 feature는 작가 페이지(/artworks/artist/조신욱)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JO_SINUK_PATH = `/artworks/artist/${encodeURIComponent('조신욱')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJoSinukArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '조신욱' ||
    n === 'jo sinuk' ||
    n === 'jo sin-uk' ||
    n.replace(/[\s-]+/g, '') === 'josinuk'
  );
};

const PAGE_COPY = {
  ko: {
    title: '조신욱 — 책가도, 서가에 담은 삶',
    description:
      '조선 〈책가도(冊架圖)〉의 도상을 현대 회화로 재해석해 온 작가 조신욱. 격자 틀의 서가에 일상의 사물과 삶의 풍경을 쌓아 올린 정물의 세계. 〈책가도—삶의 풍경〉(2025 갤러리활), 〈책가도—삶을 품다〉(2022 CICA미술관)로 이어 온 조신욱의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '조신욱 — 조선 책가도의 도상을 현대 회화로 재해석. 격자 틀의 서가에 일상의 사물과 빛, 삶의 풍경을 담아낸 정물의 세계.',
    ogAlt: '조신욱 대표 작품',
    twitterTitle: '조신욱',
    twitterDescription: '서가에 담은 삶 — 책가도를 현대 회화로 재해석한 작가 조신욱',
    keywords: '조신욱 작가, 책가도, 冊架圖, 현대 정물화, 민화 재해석, 인천가톨릭대, 씨앗페 온라인',
  },
  en: {
    title: 'Jo Sinuk — Chaekgado: A Life Held on the Shelf',
    description:
      'Selected works by Jo Sinuk, who reinterprets the iconography of the Joseon-era 〈Chaekgado〉 (books-and-things still life) through contemporary painting. Everyday objects and scenes of life stacked across the grid-framed shelves of a bookcase. View and collect his works — from 〈Chaekgado—Scenes of Life〉 (2025, Gallery Hwal) to 〈Chaekgado—Embracing Life〉 (2022, CICA Museum) — at SAF Online.',
    ogDescription:
      'Jo Sinuk — reinterpreting the Joseon Chaekgado through contemporary painting. A still-life world of everyday objects, light, and scenes of life held on grid-framed shelves.',
    ogAlt: 'Jo Sinuk — featured work',
    twitterTitle: 'Jo Sinuk',
    twitterDescription:
      'A life held on the shelf — reinterpreting Chaekgado in contemporary painting',
    keywords:
      'Jo Sinuk artist, Chaekgado, books and things still life, contemporary Korean painting, minhwa reinterpretation',
  },
} as const;

export async function buildJoSinukMetadata({
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
  const pageUrl = buildLocaleUrl(JO_SINUK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('조신욱');
  const artwork = allArtworks.find((a) => isJoSinukArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jo Sinuk`
      : `${artwork.title} — 조신욱`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JO_SINUK_PATH, locale, true),
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

export default async function JoSinukFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JO_SINUK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('조신욱');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isJoSinukArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Jo Sinuk' : '조신욱', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JO_SINUK_PATH}#person-jo-sinuk`,
    name: isEnglish ? 'Jo Sinuk' : '조신욱',
    alternateName: isEnglish ? '조신욱' : 'Jo Sinuk',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Jo Sinuk is a mid-career Korean painter who reinterprets the iconography of the Joseon-era Chaekgado (books-and-things still life) through contemporary painting, arranging everyday objects and scenes of life across grid-framed shelves.'
      : '조신욱은 조선 〈책가도(冊架圖)〉의 도상을 현대 회화로 재해석해 온 중견 작가로, 격자 틀의 서가에 일상의 사물과 삶의 풍경을 쌓아 올린다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Incheon Catholic University, Dept. of Painting'
        : '인천가톨릭대학교 회화학과',
    },
    knowsAbout: ['Chaekgado', 'Contemporary still-life painting', 'Korean minhwa reinterpretation'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jo Sinuk — SAF Online' : '조신욱 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jo Sinuk from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 조신욱 작품을 소개합니다.',
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

          {/* Shelf grid lines — 책가도 서가의 격자 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-2/3 left-0 w-full h-px bg-primary/25" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jo Sinuk · Chaekgado' : '조신욱 · 책가도(冊架圖)'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A life
                  <br />
                  <span className="text-primary-soft">held on the shelf</span>
                </>
              ) : (
                <>
                  서가에 담은
                  <br />
                  <span className="text-primary-soft">한 사람의 삶</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He reinterprets the Joseon Chaekgado in contemporary painting.
                  </span>
                  <span className="mt-2 block">
                    Everyday objects and scenes of life, stacked on grid-framed shelves.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">조선의 책가도를 현대 회화로 재해석하다.</span>
                  <span className="mt-2 block">
                    격자 틀의 서가에 쌓아 올린 일상의 사물과 삶의 풍경.
                  </span>
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
                    The bookcase, reopened —<br />
                    <span className="text-primary-strong">a still life of one&apos;s own life</span>
                  </>
                ) : (
                  <>
                    다시 열어 본 책가 —<br />
                    <span className="text-primary-strong">삶을 담은 정물</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jo Sinuk is a mid-career painter who has built his practice on a single
                      enduring subject: the 〈Chaekgado〉, the Joseon-era still life of books and
                      scholarly objects. He graduated from the Department of Painting at Incheon
                      Catholic University in 2018, and has held numerous solo exhibitions reworking
                      this traditional iconography for the present.
                    </p>
                    <p>
                      The Chaekgado — literally &ldquo;painting of a bookshelf&rdquo; — emerged in
                      the late Joseon period as a court genre and spread through the nineteenth
                      century into folk painting (minhwa). Its frame is an{' '}
                      <strong className="font-bold text-charcoal-deep">
                        architecture of shelves
                      </strong>
                      : a grid of compartments, each holding books, vessels, and treasured objects.
                      Jo Sinuk keeps this grid but exchanges its contents. Onto the shelves he
                      places the things and scenes of a contemporary life, so that the bookcase
                      becomes a portrait of who lives among these objects.
                    </p>
                    <p>
                      His exhibition titles trace the through-line. 〈Color of Light〉 (2019, Film
                      Forum Gallery) foregrounded light as a subject in its own right; 〈Chaekgado —
                      Embracing Life〉 (2022, CICA Museum, Gimpo / Gallery Knot, Seoul) read the
                      shelf as a vessel that holds a life; and 〈Chaekgado — Scenes of Life〉 (2025,
                      Gallery Hwal, Seoul) opened the compartments onto everyday scenes. Across
                      them, the traditional and the contemporary are laid one over the other.
                    </p>
                    <p>
                      He was selected as a solo-booth artist for{' '}
                      <strong className="font-bold text-charcoal">
                        MANIF 2021 — Art Figuratif
                      </strong>{' '}
                      at the Seoul Arts Center, and as a featured artist of the Gwanghwamun
                      International Art Festival. His awards include the Excellence Prize at the
                      Korea Creative Art Exhibition (2021) and the Seoul Metropolitan Council
                      Chair&apos;s Prize at the Seoul International Art Grand Prize Exhibition
                      (2025).
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      조신욱은 하나의 오랜 주제 위에 작업을 쌓아 온 중견 작가다. 그 주제는 조선의
                      정물화 장르인 〈책가도(冊架圖)〉 — 책과 기물을 그린 서가의 그림이다. 2018년
                      인천가톨릭대학교 회화학과를 졸업했고, 이 전통 도상을 오늘의 회화로 다시 쓰는
                      다수의 개인전을 열어 왔다.
                    </p>
                    <p>
                      책가도는 말 그대로 &lsquo;책장을 그린 그림&rsquo;으로, 조선 후기 궁중 회화에서
                      출발해 19세기를 지나며 민화로 확산된 장르다. 그 틀은{' '}
                      <strong className="font-bold text-charcoal-deep">서가의 건축</strong>이다:
                      격자로 나뉜 칸마다 책과 기물, 아끼는 사물들이 놓인다. 조신욱은 이 격자를
                      유지하되 그 안의 내용을 바꾼다. 그는 칸칸에 오늘을 사는 사람의 사물과 풍경을
                      들여놓아, 책가가 그 사물들 사이에 사는 이의 초상이 되게 한다.
                    </p>
                    <p>
                      그의 전시 제목들이 이 흐름을 보여 준다. 〈Color of Light〉(2019,
                      필름포럼갤러리)는 빛 그 자체를 하나의 주제로 끌어올렸고, 〈책가도—삶을
                      품다〉(2022, CICA미술관 김포 / 갤러리너트 서울)는 서가를{' '}
                      <strong className="font-bold text-charcoal">삶을 품는 그릇</strong>으로
                      읽었으며, 〈책가도—삶의 풍경〉(2025, 갤러리활 서울)은 그 칸들을 일상의
                      풍경으로 열었다. 그 사이로 전통과 현대가 겹쳐진다.
                    </p>
                    <p>
                      그는 예술의전당에서 열린{' '}
                      <strong className="font-bold text-charcoal">MANIF 2021—Art Figuratif</strong>
                      의 솔로 부스 작가로, 또 광화문국제아트페스티벌의 선정 작가로 참여했다.
                      한국창조 미술대전 우수상(2021), 서울국제미술대상전 서울특별시의회장상(2025)
                      등을 수상했다.
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
                        {isEnglish ? 'The shelf as grid' : '격자로서의 서가'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The Chaekgado frame — a grid of compartments — becomes the structure of the work, each cell an independent space for objects and scenes.'
                          : '칸칸이 나뉜 책가도의 격자 틀이 작업의 구조가 된다. 각 칸은 사물과 풍경이 놓이는 독립된 공간이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Tradition reinterpreted' : '전통의 재해석'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A late-Joseon court-and-folk genre carried into contemporary painting — the traditional and the present-day laid over each other.'
                          : '조선 후기 궁중·민화 장르를 현대 회화로 옮긴다. 전통과 오늘이 한 화면에 겹쳐진다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Objects, light, and a life' : '사물·빛·삶'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Everyday objects and the light that falls on them — the shelf read as a vessel that holds the scenes of a life.'
                          : '일상의 사물과 그 위에 내리는 빛. 서가는 한 사람의 삶의 풍경을 품는 그릇으로 읽힌다.'}
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
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Another Me〉, Film Forum Gallery.'
                        : '개인전 〈Another Me〉, 필름포럼갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Incheon Catholic University, Dept. of Painting.'
                        : '인천가톨릭대학교 회화학과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Color of Light〉, Film Forum Gallery.'
                        : '개인전 〈Color of Light〉, 필름포럼갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo-booth artist at MANIF 2021 — Art Figuratif, Seoul Arts Center; Excellence Prize, Korea Creative Art Exhibition.'
                        : 'MANIF 2021—Art Figuratif 솔로 부스 작가(예술의전당); 한국창조미술대전 우수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Chaekgado — Embracing Life〉, CICA Museum (Gimpo) / Gallery Knot (Seoul).'
                        : '개인전 〈책가도—삶을 품다〉, CICA미술관(김포) / 갤러리너트(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gwanghwamun International Art Festival, Sejong Center Museum; selected at the 10th Korea Creative Art Exhibition.'
                        : '광화문국제아트페스티벌(세종문화회관 미술관); 제10회 한국창조미술대전 특선.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Shining Moments〉, Coffee Esperanto, Seoul.'
                        : '개인전 〈Shining moments〉, 커피에스페란토(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Chaekgado — Scenes of Life〉, Gallery Hwal, Seoul; Seoul Metropolitan Council Chair’s Prize, Seoul International Art Grand Prize Exhibition.'
                        : '개인전 〈책가도—삶의 풍경〉, 갤러리활(서울); 서울국제미술대상전 서울특별시의회장상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Scheduled to participate in SAF (Seed Art Festival), Insa Art Center G&J Gallery.'
                        : '씨앗페 참여 예정(인사아트센터 G&J갤러리).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & awards' : '주요 전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈Chaekgado — Scenes of Life〉, Gallery Hwal, Seoul (2025); 〈Shining Moments〉, Coffee Esperanto, Seoul (2024)'
                        : '개인전: 〈책가도—삶의 풍경〉, 갤러리활 서울 (2025); 〈Shining moments〉, 커피에스페란토 서울 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈Chaekgado — Embracing Life〉, CICA Museum (Gimpo) / Gallery Knot (Seoul) (2022); MANIF 2021 — Art Figuratif solo booth, Seoul Arts Center (2021)'
                        : '개인전: 〈책가도—삶을 품다〉, CICA미술관 김포 / 갤러리너트 서울 (2022); MANIF 2021—Art Figuratif 솔로 부스, 예술의전당 (2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Gwanghwamun International Art Festival, Sejong Center Museum (2023); CICA international exhibitions'
                        : '단체전: 광화문국제아트페스티벌, 세종문화회관 미술관 (2023); CICA 국제전 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Seoul Metropolitan Council Chair’s Prize, Seoul International Art Grand Prize Exhibition (2025); Excellence Prize (2021) & Selected (2023), Korea Creative Art Exhibition; Silver Prize, Korea Culture & Arts Grand Exhibition (2022)'
                        : '수상: 서울국제미술대상전 서울특별시의회장상 (2025); 한국창조미술대전 우수상 (2021)·특선 (2023); 대한민국문화예술대전 은상 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Special Selection, Korea Healing Art Exhibition (2025); Bronze Prize, Starbucks painting open call (2025)'
                        : '수상: 대한민국 힐링미술대전 특선 (2025); 스타벅스 그림 공모전 동상 (2025)'}
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
                  <span className="text-charcoal-deep">on the shelf and what it holds</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">서가와 그것이 품은 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 책가도라는 장르 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'What a Chaekgado is — a genre of books and things'
                    : '책가도라는 장르 — 책과 기물의 그림'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The Chaekgado, or &ldquo;books-and-bookshelf painting,&rdquo; emerged as a
                        court genre in the late Joseon period and spread, through the nineteenth
                        century, into folk painting. Its premise is simple and strange: a still life
                        of a scholar&apos;s shelf, its compartments filled with books, brushes,
                        vessels, fruit, and treasured objects, often rendered in a flattened,
                        many-angled perspective that lets every object face the viewer at once.
                      </p>
                      <p>
                        Historically the genre carried meaning beyond decoration. To paint a
                        bookshelf was to picture learning, aspiration, and the inner life of its
                        owner — a portrait by way of possessions. The grid of the shelf gave the
                        painter a ready architecture: a set of frames within the frame, each its own
                        small stage.
                      </p>
                      <p>
                        It is this inherited structure that Jo Sinuk takes up. He does not
                        reconstruct the antique shelf so much as borrow its logic — the compartment,
                        the catalogue of objects, the portrait-through-things — and ask what it
                        holds when the objects belong to now.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        책가도, 곧 &lsquo;책과 책장을 그린 그림&rsquo;은 조선 후기 궁중 장르로
                        나타나 19세기를 지나며 민화로 퍼졌다. 그 전제는 단순하면서도 낯설다: 선비의
                        서가를 그린 정물화로, 칸칸이 책과 붓, 기물, 과일, 아끼는 사물로 채워진다.
                        흔히 여러 각도가 한 화면에 평면적으로 펼쳐져, 모든 사물이 동시에 보는 이를
                        향하도록 그려진다.
                      </p>
                      <p>
                        역사적으로 이 장르는 장식 이상의 뜻을 지녔다. 책장을 그린다는 것은 학문과
                        지향, 그리고 그 주인의 내면을 그리는 일 — 사물을 통한 초상이었다. 서가의
                        격자는 화가에게 마련된 건축을 주었다. 틀 안의 또 다른 틀들, 저마다 작은
                        무대.
                      </p>
                      <p>
                        조신욱이 이어받는 것이 바로 이 물려받은 구조다. 그는 옛 서가를 복원하기보다
                        그 논리 — 칸, 사물의 목록, 사물을 통한 초상 — 를 빌려 와, 그 칸들이 오늘의
                        사물로 채워질 때 무엇을 품는지를 묻는다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 격자 안의 오늘 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Today inside the grid — the contemporary reading'
                    : '격자 안의 오늘 — 현대적 재해석'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jo Sinuk keeps the grammar of the Chaekgado — the grid, the catalogue of
                        objects, the frontal stillness — and changes its vocabulary. Into the
                        compartments he sets the objects of a contemporary life, so that each cell
                        becomes an independent space and the whole shelf reads as the portrait of
                        whoever lives among these things.
                      </p>
                      <p>
                        The exhibition titles name the shift in register. 〈Chaekgado — Embracing
                        Life〉 (2022) treats the shelf as a vessel; 〈Chaekgado — Scenes of Life〉
                        (2025) opens its compartments onto everyday scenes. The bookcase is no
                        longer only a sign of learning but a container for a life lived now — the
                        cup, the plant, the small kept thing.
                      </p>
                      <p>
                        Held within a centuries-old frame, the present looks neither nostalgic nor
                        ironic. Tradition and the contemporary are simply laid one over the other,
                        and the seam between them is where the work lives.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        조신욱은 책가도의 문법 — 격자, 사물의 목록, 정면의 고요 — 을 유지하되 그
                        어휘를 바꾼다. 그는 칸칸에 오늘을 사는 사물을 들여놓아, 각 칸이 독립된
                        공간이 되고 서가 전체가 그 사물들 사이에 사는 이의 초상으로 읽히게 한다.
                      </p>
                      <p>
                        전시 제목들이 그 어조의 변화를 일러 준다. 〈책가도—삶을 품다〉(2022)는
                        서가를 그릇으로 다루고, 〈책가도—삶의 풍경〉(2025)은 그 칸들을 일상의
                        풍경으로 연다. 책가는 더 이상 학문의 표상만이 아니라, 지금 살아가는 삶을
                        담는 그릇이 된다 — 컵 하나, 화분 하나, 간직한 작은 사물 하나.
                      </p>
                      <p>
                        수백 년 된 틀 안에 놓인 오늘은 향수에 젖지도, 빈정대지도 않는다. 전통과
                        현대가 그저 한 화면에 겹쳐지고, 그 둘 사이의 이음매가 곧 작업이 머무는
                        자리다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 빛, 그리고 삶의 풍경 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Light, and scenes of a life' : '빛, 그리고 삶의 풍경'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Light is its own subject in Jo Sinuk&apos;s work, named outright in 〈Color
                        of Light〉 (2019). On a shelf of still objects, light is what moves —
                        falling across a surface, gathering in a corner, lifting an ordinary thing
                        into attention. It is the element that turns inventory into a scene.
                      </p>
                      <p>
                        That is the wager of the recent work: that a bookcase, carefully looked at,
                        becomes a landscape. The 2025 title 〈Scenes of Life〉 says as much. What
                        the compartments hold is not only objects but the time and light that pass
                        over them — the quiet record of a life kept on a shelf.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        조신욱의 작업에서 빛은 그 자체로 하나의 주제이며, 〈Color of
                        Light〉(2019)에서 그 이름이 곧장 드러난다. 정지한 사물의 서가 위에서
                        움직이는 것은 빛이다 — 표면을 가로질러 내리고, 한 구석에 모이고, 평범한
                        사물을 시선 위로 들어 올린다. 목록을 풍경으로 바꾸는 것이 빛이다.
                      </p>
                      <p>
                        최근 작업의 내기가 바로 그것이다: 가만히 들여다본 책가가 하나의 풍경이
                        된다는 것. 2025년의 제목 〈삶의 풍경〉이 그렇게 말한다. 칸들이 품는 것은
                        사물만이 아니라 그 위를 지나는 시간과 빛이다 — 서가에 간직된, 한 삶의 조용한
                        기록.
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
                      From the early 〈Another Me〉 to the recent 〈Scenes of Life〉, Jo Sinuk has
                      kept returning to the same shelf and asking it to hold more — books, objects,
                      light, a life. He joins this campaign not as a subject of its cause but as a
                      fellow artist in solidarity, so that the works on these shelves might become
                      the next month&apos;s lifeline for an artist facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      초기의 〈Another Me〉에서 최근의 〈삶의 풍경〉까지, 조신욱은 같은 서가로 거듭
                      돌아와 그것이 더 많은 것을 품게 했다 — 책과 사물, 빛, 그리고 삶. 씨앗페에는 이
                      캠페인의 대상이 아니라 동료 예술인과의 연대자로 함께한다. 이 서가 위의
                      작품들이, 오늘 금융 차별을 겪는 예술인 한 사람의 다음 한 달이 될 수 있도록.
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
                ARCHIVE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jo Sinuk</span>
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
                    Jo Sinuk joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    조신욱 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JO_SINUK_PATH}
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
