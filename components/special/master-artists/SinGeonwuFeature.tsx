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

// 거장 작가 feature는 작가 페이지(/artworks/artist/신건우)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SIN_GEONWU_PATH = `/artworks/artist/${encodeURIComponent('신건우')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSinGeonwuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '신건우' ||
    n === 'sin geonwu' ||
    n === 'shin geonwu' ||
    n === 'shin gunwoo' ||
    n.replace(/[\s-]+/g, '') === 'singeonwu' ||
    n.replace(/[\s-]+/g, '') === 'shingeonwu' ||
    n.replace(/[\s-]+/g, '') === 'shingunwoo'
  );
};

const PAGE_COPY = {
  ko: {
    title: '신건우 — Cropped City, 잘라낸 도시의 건축적 풍경',
    description:
      '도시와 건축의 풍경을 시각예술로 재구성하는 중견 작가 신건우. 〈Cropped City〉 연작에서 도시의 한 조각을 잘라내고 다시 쌓아 레트로와 디스토피아, 자기복제 시대의 건축적 풍경을 그린다. 신건우의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '신건우 — 〈Cropped City〉 연작의 작가. 도시를 잘라내고 재구성하는 건축적 풍경, 자기복제 시대를 향한 구조적 시선.',
    ogAlt: '신건우 대표 작품',
    twitterTitle: '신건우',
    twitterDescription: '잘라낸 도시, 건축적 풍경 — 〈Cropped City〉 연작의 작가 신건우',
    keywords:
      '신건우 작가, Cropped City, 도시 풍경, 건축적 풍경, 디스토피아, 동시대 미술, 씨앗페 온라인',
  },
  en: {
    title: 'Sin Geonwu — Cropped City, the Architectural Landscape of a Severed City',
    description:
      'Selected works by Sin Geonwu (b. 1986), a mid-career artist who reconstructs the scenery of city and architecture into visual art. In the 〈Cropped City〉 series he crops a fragment of the city and restacks it, painting an architectural landscape of retro, dystopia, and an age of self-replication. View and collect his works at SAF Online.',
    ogDescription:
      'Sin Geonwu — artist of the 〈Cropped City〉 series. An architectural landscape that crops and reassembles the city, a structural gaze on an age of self-replication.',
    ogAlt: 'Sin Geonwu — featured work',
    twitterTitle: 'Sin Geonwu',
    twitterDescription: 'A severed city, an architectural landscape — Sin Geonwu of Cropped City',
    keywords:
      'Sin Geonwu artist, Cropped City, urban landscape, architectural landscape, dystopia, contemporary Korean art',
  },
} as const;

export async function buildSinGeonwuMetadata({
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
  const pageUrl = buildLocaleUrl(SIN_GEONWU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('신건우');
  const artwork = allArtworks.find((a) => isSinGeonwuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Sin Geonwu`
      : `${artwork.title} — 신건우`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SIN_GEONWU_PATH, locale, true),
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

export default async function SinGeonwuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SIN_GEONWU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('신건우');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isSinGeonwuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Sin Geonwu' : '신건우', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SIN_GEONWU_PATH}#person-sin-geonwu`,
    name: isEnglish ? 'Sin Geonwu' : '신건우',
    alternateName: isEnglish ? '신건우' : 'Sin Geonwu',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Sin Geonwu (b. 1986) is a mid-career artist who reconstructs the scenery of city and architecture into visual art, exploring retro, dystopia, and an age of self-replication through the 〈Cropped City〉 series.'
      : '신건우(1986–)는 도시와 건축의 풍경을 시각예술로 재구성하는 중견 작가로, 〈Cropped City〉 연작을 통해 레트로와 디스토피아, 자기복제 시대를 탐구합니다.',
    birthDate: '1986',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Induk University, Dept. of Media Art & Design'
        : '인덕대학교 미디어아트 & 디자인과',
    },
    knowsAbout: ['Urban landscape', 'Architectural painting', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Sin Geonwu — SAF Online' : '신건우 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Sin Geonwu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 신건우 작품들을 소개합니다.',
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

          {/* Architectural grid lines — 잘라낸 도시·건축 격자 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-24 h-full w-px bg-primary/30" />
          <div className="absolute top-1/3 left-0 h-px w-full bg-white/10" />
          <div className="absolute bottom-12 right-12 w-28 h-28 border-2 border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Sin Geonwu · b. 1986' : '신건우 · 1986–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A city, cropped
                  <br />
                  <span className="text-primary-soft">and restacked into landscape</span>
                </>
              ) : (
                <>
                  도시를 잘라내어
                  <br />
                  <span className="text-primary-soft">건축적 풍경으로 다시 쌓다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">He crops a fragment of the city and reassembles it.</span>
                  <span className="mt-2 block">
                    Retro and dystopia — the architecture of an age of self-replication.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">도시의 한 조각을 잘라내어 다시 짜 맞춘다.</span>
                  <span className="mt-2 block">
                    레트로와 디스토피아 — 자기복제 시대의 건축적 풍경.
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
                    The cropped city —<br />
                    <span className="text-primary-strong">
                      architecture as a reconstructed gaze
                    </span>
                  </>
                ) : (
                  <>
                    잘라낸 도시 —<br />
                    <span className="text-primary-strong">재구성된 시선으로서의 건축</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Sin Geonwu (b. 1986) is a mid-career artist who reconstructs the scenery of
                      city and architecture into visual art. He studied at Induk University,
                      receiving a bachelor&apos;s degree in Media Art &amp; Design in 2016. From the
                      grammar of media and design he carries a structural eye for surface, frame,
                      and reproduction — the building blocks of the contemporary city.
                    </p>
                    <p>
                      His practice crops a fragment of the urban scene and restacks it. In the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Cropped City〉 series
                      </strong>{' '}
                      — shown at Gallery Onui, Seoul, in 2022 — the city is not described but cut
                      apart and reassembled, its architectural blocks rearranged into a landscape
                      that is at once familiar and estranged. The frame of the canvas behaves like a
                      camera crop: what is left out matters as much as what remains.
                    </p>
                    <p>
                      Across solo exhibitions he has returned to the registers of retro and
                      dystopia. In 2021 <em>PRESENT</em> (Gallery Chosun) and{' '}
                      <em>Architectural Landscape</em> (YOONION ART SPACE, Seoul) framed the built
                      environment as a structural subject; in 2019 <em>RETRO</em> (Coutances Art
                      Center, France) and in 2018 <em>Destroy the Distopia</em> (Monthly) pressed
                      the city&apos;s nostalgic and apocalyptic registers against each other.
                    </p>
                    <p>
                      The question of reproduction runs through the work. His 2022 exhibition{' '}
                      <em>DUAL: The Artwork in the Age of Self-Replication</em> (BGM Gallery, Lotte
                      World Tower) takes the title&apos;s wager seriously — what does an original
                      mean when the city itself is built from repetition, copy, and template? From
                      the 2016 <em>Self-Funeral</em> (MAKSA) onward, his exhibitions have treated
                      the city as a body that endlessly duplicates and discards itself.
                    </p>
                    <p>
                      He has built his practice through residencies as much as galleries — Daegu Art
                      Factory (15th, 2025), Dalcheon Art Creation Space (4th, 2024), Science Walden
                      at UNIST (2021), Suchang Youth Mansion (2nd, 2020), and Coutances Art Center
                      in France (1st, 2019). His work is held in the collections of the Gangwon
                      Cultural Foundation, Hori Art Space, the Coutances Art Center, the Coutances
                      municipal museum, Galerie Pont des Arts, and Gallery Yiang.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      신건우(1986–)는 도시와 건축의 풍경을 시각예술로 재구성하는 중견 작가다. 그는
                      인덕대학교에서 수학하며 2016년 미디어아트 &amp; 디자인과 학사를 받았다.
                      미디어와 디자인의 문법에서 그는 표면과 프레임, 그리고 복제에 대한 구조적
                      시선을 가져온다 — 동시대 도시를 이루는 구성 요소들이다.
                    </p>
                    <p>
                      그의 작업은 도시 풍경의 한 조각을 잘라내어 다시 쌓는다.{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Cropped City〉 연작
                      </strong>
                      은 2022년 갤러리오누이(서울)에서 선보였는데, 여기서 도시는 묘사되는 것이
                      아니라 잘려 나뉘고 다시 짜 맞춰진다. 건축의 블록들이 재배열되어, 친숙하면서도
                      낯선 풍경을 이룬다. 캔버스의 프레임은 카메라의 크롭처럼 작동한다 — 무엇을
                      남겼는가만큼 무엇을 잘라냈는가가 중요하다.
                    </p>
                    <p>
                      여러 개인전을 통해 그는 레트로와 디스토피아의 음역을 거듭 다뤄 왔다. 2021년{' '}
                      〈PRESENT〉(갤러리조선)와 〈건축적 풍경〉(YOONION ART SPACE, 서울)은 지어진
                      환경을 구조적 주제로 다뤘고, 2019년 〈RETRO〉(꾸탕스 아트 센터, 프랑스),
                      2018년 〈Destroy the Distopia〉(먼슬리)는 도시의 향수와 종말의 음역을 서로
                      맞부딪쳤다.
                    </p>
                    <p>
                      복제에 대한 물음은 작업을 관통한다. 2022년 전시 〈DUAL: 자기복제 시대의
                      예술작품〉(BGM갤러리 롯데월드타워점)은 그 제목의 내기를 진지하게 받는다 — 도시
                      자체가 반복과 복제, 템플릿으로 지어질 때 원본이란 무엇을 뜻하는가. 2016년
                      〈셀프장례〉(MAKSA) 이래, 그의 전시들은 도시를 끝없이 자기를 복제하고 폐기하는
                      하나의 몸으로 다뤄 왔다.
                    </p>
                    <p>
                      그는 갤러리만큼이나 레지던시를 통해 작업을 구축해 왔다 — 대구예술발전소(15기,
                      2025), 달천예술창작공간(4기, 2024), 사이언스월든(UNIST, 2021),
                      수창청춘맨숀(2기, 2020), 프랑스 꾸탕스 아트 센터(1기, 2019). 그의 작품은
                      강원문화재단, 호리아트스페이스, 꾸탕스 아트 센터, 꾸탕스 시립미술관, 갤러리
                      퐁데자르, 갤러리 이앙에 소장되어 있다.
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
                        {isEnglish ? 'Cropped City' : '잘라낸 도시'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A fragment of the urban scene is cut out and restacked — the frame works like a camera crop, where what is left out matters as much as what remains.'
                          : '도시 풍경의 한 조각을 잘라내어 다시 쌓는다. 프레임은 카메라의 크롭처럼 작동하며, 잘라낸 것이 남긴 것만큼 중요하다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Retro and dystopia' : '레트로와 디스토피아'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The built environment held between nostalgia and apocalypse — the city read as both a memory and a warning.'
                          : '향수와 종말 사이에 놓인 지어진 환경. 도시는 기억이자 동시에 경고로 읽힌다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The age of self-replication' : '자기복제 시대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A structural question about the original when the city is built from repetition, copy, and template.'
                          : '도시가 반복과 복제, 템플릿으로 지어질 때 원본이란 무엇인가에 대한 구조적 물음.'}
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
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born.' : '출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'B.A. in Media Art & Design, Induk University; solo exhibition 〈Self-Funeral〉 (MAKSA).'
                        : '인덕대학교 미디어아트 & 디자인과 학사; 개인전 〈셀프장례〉(MAKSA).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Walking Narratives〉 (Space55) and 〈Destroy the Distopia〉 (Monthly).'
                        : '개인전 〈Walking Narratives〉(스페이스55)·〈Destroy the Distopia〉(먼슬리).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈RETRO〉, Coutances Art Center, France; residency, Coutances Art Center (1st).'
                        : '개인전 〈RETRO〉(꾸탕스 아트 센터, 프랑스); 꾸탕스 아트 센터 레지던시(1기).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residency, Suchang Youth Mansion (2nd); participating artist in MMCA Seoul education programs 〈Just Modern〉 / 〈Gathering〉.'
                        : '수창청춘맨숀 레지던시(2기); 국립현대미술관 서울관 교육 프로그램 〈Just Modern〉·〈모임 Gathering〉 참여작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈PRESENT〉 (Gallery Chosun) and 〈Architectural Landscape〉 (YOONION ART SPACE, Seoul); residency, Science Walden (UNIST).'
                        : '개인전 〈PRESENT〉(갤러리조선)·〈건축적 풍경〉(YOONION ART SPACE, 서울); 사이언스월든(UNIST) 레지던시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Cropped City〉 (Gallery Onui, Seoul), 〈Sin Geonwu’s Strolling Mind〉 (Mir Gallery, Daegu), and 〈DUAL: The Artwork in the Age of Self-Replication〉 (BGM Gallery, Lotte World Tower).'
                        : '개인전 〈Cropped City〉(갤러리오누이, 서울)·〈신건우의 산책하는 마음〉(미르갤러리, 대구)·〈DUAL: 자기복제 시대의 예술작품〉(BGM갤러리 롯데월드타워점).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Banal Is the New〉 (Dalcheon Art Creation Space, Daegu); residency, Dalcheon Art Creation Space (4th).'
                        : '개인전 〈진부한 것이 새로운 것이다〉(달천예술창작공간, 대구); 달천예술창작공간 레지던시(4기).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residency, Daegu Art Factory (15th); group exhibitions at the Dalseong Daegu Contemporary Art Festival and 〈Time That Became Art〉 (Hyundai Department Store, Apgujeong).'
                        : '대구예술발전소 레지던시(15기); 달성 대구현대미술제·〈현대, 예술이 된 시간〉(현대백화점 압구정) 단체전.'}
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
                        ? 'Solo: 〈Cropped City〉, Gallery Onui, Seoul (2022); 〈DUAL: The Artwork in the Age of Self-Replication〉, BGM Gallery, Lotte World Tower (2022)'
                        : '개인전: 〈Cropped City〉, 갤러리오누이, 서울 (2022); 〈DUAL: 자기복제 시대의 예술작품〉, BGM갤러리 롯데월드타워점 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈PRESENT〉, Gallery Chosun (2021); 〈RETRO〉, Coutances Art Center, France (2019); 〈The Banal Is the New〉, Dalcheon Art Creation Space, Daegu (2024)'
                        : '개인전: 〈PRESENT〉, 갤러리조선 (2021); 〈RETRO〉, 꾸탕스 아트 센터, 프랑스 (2019); 〈진부한 것이 새로운 것이다〉, 달천예술창작공간, 대구 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Dalseong Daegu Contemporary Art Festival (2025); 〈Time That Became Art〉, Hyundai Department Store, Apgujeong (2025)'
                        : '단체전: 달성 대구현대미술제 (2025); 〈현대, 예술이 된 시간〉, 현대백화점 압구정 (2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Gangwon Cultural Foundation, Hori Art Space, Coutances Art Center, Coutances municipal museum, Galerie Pont des Arts, Gallery Yiang'
                        : '소장: 강원문화재단, 호리아트스페이스, 꾸탕스 아트 센터, 꾸탕스 시립미술관, 갤러리 퐁데자르, 갤러리 이앙'}
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
                  <span className="text-charcoal-deep">on the city he cuts and rebuilds</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">그가 자르고 다시 짓는 도시에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 미디어·디자인에서 도시 풍경으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From media and design to the urban landscape'
                    : '미디어·디자인에서 도시 풍경으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Sin Geonwu came to painting through media and design. His 2016
                        bachelor&apos;s degree in Media Art &amp; Design at Induk University gave
                        him a grammar of surface, screen, and frame rather than the inherited
                        vocabulary of landscape painting. That origin shows in how he treats the
                        city: not as a view to be rendered, but as material to be edited.
                      </p>
                      <p>
                        From his earliest solo exhibitions — 〈Self-Funeral〉 (MAKSA, 2016),
                        〈Walking Narratives〉 (Space55, 2018) — the work moves like a
                        designer&apos;s layout: cropping, framing, repeating. The architectural
                        scene is composed in blocks, each one selected and placed, so that the
                        finished image reads as a constructed proposition about the city rather than
                        a transcription of it.
                      </p>
                      <p>
                        By 〈Architectural Landscape〉 (YOONION ART SPACE, 2021), the building had
                        become his explicit subject. The structures are not backdrops for human
                        narrative; they are the narrative — stacked, mirrored, and cut to expose the
                        logic of how a contemporary city is assembled.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        신건우는 미디어와 디자인을 통해 회화에 이르렀다. 2016년 인덕대학교
                        미디어아트 &amp; 디자인과 학사는 그에게 풍경화의 전승된 어휘 대신 표면과
                        스크린, 프레임의 문법을 주었다. 그 출발은 그가 도시를 다루는 방식에서
                        드러난다 — 도시는 그려야 할 풍경이 아니라 편집되는 재료다.
                      </p>
                      <p>
                        초기 개인전 〈셀프장례〉(MAKSA, 2016), 〈Walking Narratives〉(스페이스55,
                        2018)부터 작업은 디자이너의 레이아웃처럼 움직인다 — 잘라내고, 프레이밍하고,
                        반복하면서. 건축적 장면은 블록으로 구성되며, 각각의 블록이 선택되고
                        배치되어, 완성된 이미지는 도시의 전사가 아니라 도시에 관해 구축된 명제로
                        읽힌다.
                      </p>
                      <p>
                        〈건축적 풍경〉(YOONION ART SPACE, 2021)에 이르러 건물은 그의 명시적 주제가
                        됐다. 구조물들은 인간 서사의 배경이 아니다 — 그것들 자체가 서사다. 쌓이고,
                        반사되고, 잘려 나가며 동시대 도시가 짜이는 논리를 드러낸다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Cropped City — 잘라낸 도시의 형식 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Cropped City〉 — the form of a severed city'
                    : '〈Cropped City〉 — 잘라낸 도시의 형식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 2022 exhibition 〈Cropped City〉 (Gallery Onui, Seoul) names the method.
                        To crop is to choose an edge — to decide where the world stops. Sin
                        Geonwu&apos;s canvases take that editorial cut as their first gesture: a
                        fragment of the city is severed from its context and set on its own terms.
                      </p>
                      <p>
                        What follows the cut is reassembly. The cropped blocks are restacked,
                        sometimes mirrored, sometimes repeated, into a landscape that holds together
                        by composition rather than by geography. The result is a city you recognize
                        without being able to locate — a place built from the grammar of urban form
                        rather than from any single street.
                      </p>
                      <p>
                        The frame thus carries the argument. By making the crop visible — by letting
                        the cut be felt as a cut — the series asks how much of what we call
                        &ldquo;the city&rdquo; is already a matter of framing: of what the camera,
                        the developer, the map chooses to include and discard.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2022년 전시 〈Cropped City〉(갤러리오누이, 서울)는 그 방법을 명명한다.
                        잘라낸다는 것은 가장자리를 선택하는 일이다 — 세계가 어디서 멈추는지를 정하는
                        일. 신건우의 화면은 그 편집적 절단을 첫 제스처로 삼는다. 도시의 한 조각이
                        맥락에서 잘려 나와 스스로의 조건 위에 놓인다.
                      </p>
                      <p>
                        절단 다음에 오는 것은 재조립이다. 잘라낸 블록들이 다시 쌓이고, 때로
                        반사되고, 때로 반복되어, 지리가 아니라 구성으로 버티는 풍경을 이룬다. 그
                        결과는 위치를 특정할 수 없는데도 알아보게 되는 도시다 — 어느 하나의 거리가
                        아니라 도시 형식의 문법으로 지어진 장소.
                      </p>
                      <p>
                        그리하여 프레임이 주장을 떠맡는다. 크롭을 보이게 함으로써 — 절단을 절단으로
                        느끼게 함으로써 — 이 연작은 우리가 ‘도시’라 부르는 것이 이미 얼마나
                        프레이밍의 문제인지를 묻는다. 카메라가, 개발자가, 지도가 무엇을 포함하고
                        무엇을 버리는지의 문제로서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 자기복제 시대의 예술작품 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The artwork in the age of self-replication'
                    : '자기복제 시대의 예술작품'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        His 2022 exhibition 〈DUAL: The Artwork in the Age of Self-Replication〉
                        (BGM Gallery, Lotte World Tower) turns the question of reproduction onto the
                        work itself. If the contemporary city is built from repetition — the same
                        tower, the same template, the same façade copied block by block — then what
                        does an original painting of that city mean?
                      </p>
                      <p>
                        The retro and dystopian registers he had already explored in 〈RETRO〉
                        (Coutances Art Center, 2019) and 〈Destroy the Distopia〉 (Monthly, 2018)
                        return here as the affective tone of self-replication: nostalgia for an
                        origin that may never have existed, and dread of a future that is only more
                        of the same. The city duplicates and discards itself, and the painting
                        records both the duplication and the discard.
                      </p>
                      <p>
                        With the 2024 exhibition 〈The Banal Is the New〉 (Dalcheon Art Creation
                        Space), the wager sharpens: in an age where everything is reproduced, the
                        banal — the repeated, the templated, the ordinary block of the city — is
                        precisely where the new must be found. It is a structural, unsentimental
                        position, and it is the through-line of his practice.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2022년 전시 〈DUAL: 자기복제 시대의 예술작품〉(BGM갤러리 롯데월드타워점)은
                        복제의 물음을 작품 자체로 되돌린다. 동시대 도시가 반복으로 지어진다면 — 같은
                        타워, 같은 템플릿, 블록 단위로 복제된 같은 파사드라면 — 그 도시를 그린 원본
                        회화란 무엇을 뜻하는가.
                      </p>
                      <p>
                        그가 이미 〈RETRO〉(꾸탕스 아트 센터, 2019), 〈Destroy the
                        Distopia〉(먼슬리, 2018)에서 탐구한 레트로와 디스토피아의 음역은 여기서
                        자기복제의 정서적 톤으로 돌아온다 — 존재한 적 없을지 모를 기원에 대한 향수,
                        그리고 더 많은 같음일 뿐인 미래에 대한 두려움. 도시는 자기를 복제하고
                        폐기하며, 회화는 그 복제와 폐기를 함께 기록한다.
                      </p>
                      <p>
                        2024년 전시 〈진부한 것이 새로운 것이다〉(달천예술창작공간)에서 그 내기는 더
                        날카로워진다 — 모든 것이 복제되는 시대에, 진부한 것이야말로 — 반복된 것,
                        템플릿화된 것, 도시의 평범한 블록이야말로 — 새로움을 찾아야 할 바로 그
                        자리다. 구조적이고 감상에 기대지 않는 입장이며, 그의 작업을 관통하는 선이다.
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
                      From 〈Self-Funeral〉 to 〈Cropped City〉, Sin Geonwu&apos;s work has pursued
                      a single question: how is a city assembled, and what does it mean to cut a
                      piece of it free and call it a landscape? The answer, built across galleries
                      and residencies in Korea and France, is an architectural vocabulary of
                      cropping and restacking. He joins this campaign not as a subject of its cause
                      but as a fellow artist in solidarity — so that those who come after might have
                      the room to build.
                    </>
                  ) : (
                    <>
                      〈셀프장례〉에서 〈Cropped City〉까지, 신건우의 작업은 하나의 물음을 추구해
                      왔다: 도시는 어떻게 짜이는가, 그리고 그 한 조각을 잘라내어 풍경이라 부른다는
                      것은 무엇을 뜻하는가. 한국과 프랑스의 갤러리와 레지던시를 거쳐 구축된 대답이
                      잘라내고 다시 쌓는 건축적 어휘다. 그는 씨앗페에 이 캠페인의 대상으로서가
                      아니라, 동료 예술인과의 연대자로서 함께한다 — 다음 세대의 예술인들이 지을
                      자리를 가질 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Sin Geonwu</span>
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
                    Sin Geonwu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    신건우 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SIN_GEONWU_PATH}
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
