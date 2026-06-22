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

// 거장 작가 feature는 작가 페이지(/artworks/artist/안소현)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const AN_SOHYEON_PATH = `/artworks/artist/${encodeURIComponent('안소현')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isAnSohyeonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '안소현' ||
    n === 'an sohyeon' ||
    n === 'an so-hyun' ||
    n === 'ahn sohyeon' ||
    n.replace(/[\s-]+/g, '') === 'ansohyeon' ||
    n.replace(/[\s-]+/g, '') === 'ahnsohyeon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '안소현 — 유영하는 도시의 몽환, CITY OASIS',
    description:
      '사진을 기반으로 도시 풍경을 회화적으로 재구성하는 시각예술가 안소현. 갤러리 브레송에서 〈Authentic City(공기도시)〉·〈NEW REMINISCENCE〉 연작을 선보였고, 무성 무용 영화 〈LUNATIC〉을 연출했다. 몽환적 색채와 실제·허구의 간극을 통해 본 도시의 일상을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '안소현 — 사진으로 도시 풍경을 회화적으로 재구성하는 시각예술가. 몽환적 색채와 실제·허구의 간극, 그리고 무용 영화 〈LUNATIC〉의 연출자.',
    ogAlt: '안소현 대표 작품',
    twitterTitle: '안소현',
    twitterDescription: '유영하는 도시의 몽환 — CITY OASIS 연작의 시각예술가 안소현',
    keywords:
      '안소현 작가, 사진, 도시 풍경, CITY OASIS, 갤러리 브레송, LUNATIC, 무용 영화, 씨앗페 온라인',
  },
  en: {
    title: 'An Sohyeon — CITY OASIS, the Dream of a Drifting City',
    description:
      'Selected works by An Sohyeon, a visual artist who reconstructs the urban landscape pictorially from a photographic base. At Gallery Bresson she presented the 〈Authentic City〉 and 〈NEW REMINISCENCE〉 series, and she directed the silent dance film 〈LUNATIC〉. View and collect her works at SAF Online.',
    ogDescription:
      'An Sohyeon — a visual artist who reconstructs the city pictorially from photographs, working in dreamlike colour and the gap between the real and the imagined. Director of the dance film 〈LUNATIC〉.',
    ogAlt: 'An Sohyeon — featured work',
    twitterTitle: 'An Sohyeon',
    twitterDescription: 'The dream of a drifting city — visual artist An Sohyeon of CITY OASIS',
    keywords:
      'An Sohyeon artist, photography, urban landscape, CITY OASIS, Gallery Bresson, LUNATIC, dance film, Korean contemporary art',
  },
} as const;

export async function buildAnSohyeonMetadata({
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
  const pageUrl = buildLocaleUrl(AN_SOHYEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('안소현');
  const artwork = allArtworks.find((a) => isAnSohyeonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — An Sohyeon`
      : `${artwork.title} — 안소현`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(AN_SOHYEON_PATH, locale, true),
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

export default async function AnSohyeonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(AN_SOHYEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('안소현');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isAnSohyeonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'An Sohyeon' : '안소현', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${AN_SOHYEON_PATH}#person-an-sohyeon`,
    name: isEnglish ? 'An Sohyeon' : '안소현',
    alternateName: isEnglish ? '안소현' : 'An Sohyeon',
    jobTitle: isEnglish ? 'Visual artist' : '시각예술가',
    description: isEnglish
      ? 'An Sohyeon is a visual artist who reconstructs the urban landscape pictorially from a photographic base, working in dreamlike colour and the gap between the real and the imagined. She also directed the silent dance film 〈LUNATIC〉.'
      : '안소현은 사진을 기반으로 도시 풍경을 회화적 감각으로 재구성하는 시각예술가로, 몽환적 색채와 실제·허구 사이의 간극을 다룹니다. 무성 무용 영화 〈LUNATIC〉을 연출하기도 했습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Sangmyung University, Dept. of Photography, Video & Media (B.F.A. 2016)'
        : '상명대학교 예술학부 사진영상미디어학과',
    },
    knowsAbout: ['Photography', 'Urban landscape', 'Dance film', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'An Sohyeon — SAF Online' : '안소현 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by An Sohyeon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 안소현 작품을 소개합니다.',
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

          {/* Drifting haze — 도시를 유영하는 몽환 모티프 */}
          <div className="absolute top-12 left-10 w-32 h-32 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-12 right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full border border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'An Sohyeon · visual artist' : '안소현 · 시각예술가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The city, drifting —
                  <br />
                  <span className="text-primary-soft">somewhere between real and imagined</span>
                </>
              ) : (
                <>
                  유영하는 도시 —
                  <br />
                  <span className="text-primary-soft">실제와 허구 사이 어딘가</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">A photograph, reconstructed into a painting.</span>
                  <span className="mt-2 block">
                    Dreamlike colour, and the everyday glimpsed while walking the city.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한 장의 사진을, 회화로 재구성한다.</span>
                  <span className="mt-2 block">몽환적 색채와, 도시를 걷다 마주친 일상의 찰나.</span>
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
                    From photograph to painting —<br />
                    <span className="text-primary-strong">a city walked, then re-seen</span>
                  </>
                ) : (
                  <>
                    사진에서 회화로 —<br />
                    <span className="text-primary-strong">걷고, 다시 본 도시</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      An Sohyeon is a mid-career visual artist who works from a photographic base,
                      reconstructing the urban landscape with a painterly sensibility. She graduated
                      from the Department of Photography, Video &amp; Media at Sangmyung University
                      in 2016.
                    </p>
                    <p>
                      Her work begins in the everyday — in walking the city as if drifting through
                      it. From that walking comes the raw material: the ordinary streets, airports,
                      and edges of a metropolis, caught in passing. She then reworks these
                      photographs into images closer to painting, in which dreamlike colour and the
                      gap between perception and reality build an{' '}
                      <strong className="font-bold text-charcoal-deep">emotional density</strong>{' '}
                      that hovers between the real and the imagined.
                    </p>
                    <p>
                      From 2017 onward she presented this practice in a sustained run of solo
                      exhibitions at Gallery Bresson in Seoul — 〈LUCK 喜〉 (2017), 〈CITY OASIS〉
                      (2018), and 〈NEW REMINISCENCE〉 (2021) — alongside 〈Authentic City〉 (2023)
                      and 〈나의이름은〉 (2024). The titles trace a single line of inquiry: the city
                      not as document but as a space of reverie.
                    </p>
                    <p>
                      Her practice is also{' '}
                      <strong className="font-bold text-charcoal">multi-layered</strong>. An Sohyeon
                      is an actor as well as a visual artist, and in 2021 she directed and appeared
                      in the silent dance film 〈LUNATIC〉, which went on to awards and invitations
                      at overseas film festivals. The same attention to image, body, and atmosphere
                      runs through both her photographs and her film.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      안소현은 사진을 기반으로 도시 풍경을 회화적 감각으로 재구성하는 중견
                      시각예술가다. 2016년 상명대학교 예술학부 사진영상미디어학과를 졸업했다.
                    </p>
                    <p>
                      그의 작업은 일상에서 출발한다 — 도시를 유영하듯 걷는 일에서. 그 걸음에서
                      원재료가 나온다: 평범한 거리와 공항, 대도시의 가장자리를 지나며 포착한 장면들.
                      그는 이 사진들을 회화에 가까운 이미지로 다시 손질하는데, 몽환적 색채와 인식의
                      간극이 실제와 허구 사이를 떠도는{' '}
                      <strong className="font-bold text-charcoal-deep">정서적 밀도</strong>를 만들어
                      낸다.
                    </p>
                    <p>
                      2017년부터 그는 이 작업을 서울 갤러리 브레송에서 꾸준히 선보였다 — 〈LUCK 喜〉
                      (2017), 〈CITY OASIS〉 (2018), 〈NEW REMINISCENCE〉 (2021), 그리고 〈Authentic
                      City(공기도시)〉 (2023). 2024년에는 노을아티잔센터에서 〈나의이름은〉을
                      열었다. 전시 제목들은 하나의 탐구 선을 그린다: 기록으로서의 도시가 아니라,
                      몽상의 공간으로서의 도시.
                    </p>
                    <p>
                      그의 실천은 <strong className="font-bold text-charcoal">다층적</strong>이기도
                      하다. 안소현은 시각예술가이자 배우이며, 2021년에는 무성 무용 영화
                      〈LUNATIC〉을 직접 연출하고 출연했다. 이 작품은 해외 영화제에서 수상하고
                      초청받았다. 이미지와 몸, 분위기를 향한 같은 주의가 그의 사진과 영화를
                      가로지른다.
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
                        {isEnglish ? 'The city, reconstructed' : '재구성된 도시'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A photographic base reworked with a painterly sensibility — the everyday city turned into something closer to reverie than record.'
                          : '사진을 회화적 감각으로 다시 손질한다. 일상의 도시가 기록보다 몽상에 가까운 무엇이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Between real and imagined' : '실제와 허구 사이'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Dreamlike colour and the gap in perception build an emotional density that hovers between what is there and what is imagined.'
                          : '몽환적 색채와 인식의 간극이, 그곳에 있는 것과 상상된 것 사이를 떠도는 정서적 밀도를 만든다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Image, body, film' : '이미지·몸·영화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A multi-layered practice — as actor and director as well as visual artist, she carries the same attention to image and atmosphere into the dance film 〈LUNATIC〉.'
                          : '다층적 실천 — 배우이자 연출가로서, 그는 이미지와 분위기를 향한 같은 주의를 무용 영화 〈LUNATIC〉으로 이어 간다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Selected solo exhibitions' : '주요 개인전'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈나의이름은〉 (Noeul Artisan Center)'
                        : '〈나의이름은〉 (노을아티잔센터)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Authentic City〉 (Gallery Bresson, Seoul)'
                        : '〈Authentic City(공기도시)〉 (갤러리 브레송, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈NEW REMINISCENCE〉 (Gallery Bresson, Seoul)'
                        : '〈NEW REMINISCENCE〉 (갤러리 브레송, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈NEW REMINISCENCE〉 (Ewha Womans University Seoul Hospital Art Cube)'
                        : '〈NEW REMINISCENCE〉 (이대서울병원 아트큐브)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈CITY OASIS〉 (Gallery Bresson, Seoul)'
                        : '〈CITY OASIS〉 (갤러리 브레송, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈LUCK 喜〉 (Gallery Bresson, Seoul)'
                        : '〈LUCK 喜〉 (갤러리 브레송, 서울)'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Group shows · film · awards' : '단체전 · 영화 · 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈Invisible Cities〉 (Gallery Bresson, Seoul, 2025); 〈CRAFT + MAN = SHIP〉 (Seoul Battleship, Hangang Park, 2024)'
                        : '단체전: 〈보이지않는 도시들〉 (갤러리 브레송, 서울, 2025); 〈CRAFT + MAN = SHIP〉 (한강공원 서울함, 2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈SEEA 2021〉 (Seoul Arts Center); selected for Porsche Dreamers.On Artists and shown at the Gwangju Design Biennale (2021)'
                        : '단체전: 〈SEEA 2021〉 (예술의전당); 포르쉐 Dreamers.On Artists 선정 및 광주디자인비엔날레 전시 (2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Film: 〈LUNATIC〉 (2021), a silent dance film — directed, performed; awarded and invited at overseas film festivals'
                        : '영화: 무성 무용 영화 〈LUNATIC〉 (2021) 연출·출연 — 해외 영화제 수상·초청'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards / selections: Porsche Dreamers.On Artists 20 (2021); Ewha Womans University Seoul Hospital Art Cube open call (2020); Grand Prize, Suwon Hwaseong Photography Contest (2011); Silver Prize, Jeju International Airport Photo Exhibition (2010)'
                        : '수상·선정: 포르쉐 Dreamers.On Artists 20 선정 (2021); 이대서울병원 아트큐브 공모 선정 (2020); 수원 화성 사진 공모전 대상 (2011); 제주국제공항 사진전 은상 (2010)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Book: 《사랑만이 정답일 뿐: 센스의 탄생》 (under the name 안쏘쥬, 2023)'
                        : '저서: 《사랑만이 정답일 뿐: 센스의 탄생》 (안쏘쥬 저, 2023)'}
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
                  <span className="text-charcoal-deep">on the city, the dream, and the body</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">도시와 몽환, 그리고 몸에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 걷는 일에서 시작하는 작업 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'A practice that begins in walking' : '걷는 일에서 시작하는 작업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        An Sohyeon&apos;s work begins where most of us pass without looking: the
                        ordinary surfaces of the city, met while walking. She describes the act as
                        drifting — moving through the metropolis as if floating through it, letting
                        the streets, the airports, the unremarkable edges arrive of their own
                        accord.
                      </p>
                      <p>
                        The camera comes first, but it is not the end. The photograph is a starting
                        point, a record of a passing moment that she then reworks into something
                        closer to painting. What begins as document becomes, through her handling of
                        colour and surface, a held image — a place the eye can return to rather than
                        merely glance at.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        안소현의 작업은 대부분의 사람이 보지 않고 지나치는 곳에서 시작한다 — 걷다
                        마주친 도시의 평범한 표면. 그는 그 행위를 유영이라 말한다. 대도시를 떠다니듯
                        지나며, 거리와 공항, 눈에 띄지 않는 가장자리가 스스로 도착하게 두는 것.
                      </p>
                      <p>
                        카메라가 먼저지만, 그것이 끝은 아니다. 사진은 출발점이다 — 지나가는 한
                        순간의 기록이고, 그는 이를 회화에 가까운 무엇으로 다시 손질한다. 기록으로
                        시작된 것이, 색채와 표면을 다루는 손길을 거쳐 머무는 이미지가 된다 — 그저
                        흘끗 보는 것이 아니라, 눈이 되돌아올 수 있는 자리.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 실제와 허구 사이의 정서적 밀도 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Emotional density between the real and the imagined'
                    : '실제와 허구 사이의 정서적 밀도'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The dreamlike quality of An Sohyeon&apos;s images is not decoration. It
                        comes from a gap — between what the eye records and what perception makes of
                        it. Her colour pulls the familiar city slightly out of true, so that a
                        recognizable street reads at the same time as a remembered or imagined one.
                      </p>
                      <p>
                        Across the 〈CITY OASIS〉, 〈NEW REMINISCENCE〉, and 〈Authentic City〉
                        series, that gap is the subject. The titles themselves point to it: an oasis
                        inside the city, a new reminiscence, an authentic city that is also an
                        atmospheric one. The work does not ask whether these places are real or
                        imagined; it lives in the emotional density that gathers between the two.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        안소현의 이미지가 지닌 몽환성은 장식이 아니다. 그것은 간극에서 온다 — 눈이
                        기록하는 것과, 인식이 그것으로 만들어 내는 것 사이의 간극. 그의 색채는
                        익숙한 도시를 살짝 비틀어, 알아볼 수 있는 거리가 동시에 기억되거나 상상된
                        거리로 읽히게 한다.
                      </p>
                      <p>
                        〈CITY OASIS〉, 〈NEW REMINISCENCE〉, 〈Authentic City(공기도시)〉 연작을
                        가로질러, 그 간극이 곧 주제다. 제목들 자체가 그것을 가리킨다: 도시 안의
                        오아시스, 새로운 회상, 진짜이면서 동시에 공기처럼 떠도는 도시. 작업은 이
                        장소들이 실재인지 상상인지를 묻지 않는다. 그 둘 사이에 고이는 정서적 밀도
                        안에 머문다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 배우·연출가로서의 다층적 실천 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈LUNATIC〉 — the same attention, in motion'
                    : '〈LUNATIC〉 — 움직임으로 옮겨진 같은 주의'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        An Sohyeon&apos;s practice is not confined to the still image. She is an
                        actor and a director as well as a visual artist, and in 2021 she made the
                        silent dance film 〈LUNATIC〉 — a wordless work built on movement rather
                        than dialogue, which she both directed and performed in.
                      </p>
                      <p>
                        The film carried the same concerns as her photographs — image, atmosphere,
                        the body in a charged space — into time and motion, and went on to awards
                        and invitations at overseas film festivals. Seen alongside her urban
                        landscapes, it makes the shape of her practice clear: a single sensibility
                        moving across photograph, painting, performance, and film.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        안소현의 실천은 정지된 이미지에 머물지 않는다. 그는 시각예술가이자 배우이며
                        연출가다. 2021년 그는 무성 무용 영화 〈LUNATIC〉을 만들었다 — 대사가 아니라
                        움직임 위에 세운 말 없는 작품으로, 그는 이를 직접 연출하고 출연했다.
                      </p>
                      <p>
                        영화는 그의 사진과 같은 관심 — 이미지, 분위기, 긴장된 공간 속의 몸 — 을
                        시간과 움직임으로 옮겼고, 해외 영화제에서 수상하고 초청받았다. 그의 도시
                        풍경과 나란히 두고 보면 작업의 형태가 분명해진다: 사진과 회화, 퍼포먼스와
                        영화를 가로지르며 움직이는 하나의 감각.
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
                      From a city walked to a city re-seen, from the still photograph to the moving
                      body, An Sohyeon&apos;s work pursues a single question: how does the ordinary
                      become a place worth dwelling in? She joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity — offering her work so that
                      those navigating financial exclusion today might find a way through.
                    </>
                  ) : (
                    <>
                      걷는 도시에서 다시 보는 도시로, 정지된 사진에서 움직이는 몸으로, 안소현의
                      작업은 하나의 물음을 추구한다: 평범한 것은 어떻게 머물 만한 자리가 되는가.
                      씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 오늘
                      금융 차별을 헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의 작품을 내놓는다.
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
                CITY OASIS
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
              <span className="text-xs text-white/70 uppercase tracking-widest">An Sohyeon</span>
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
                    An Sohyeon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    안소현 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={AN_SOHYEON_PATH}
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
