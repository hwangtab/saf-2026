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

// 작가 feature는 작가 페이지(/artworks/artist/정서온)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JEONG_SEOON_PATH = `/artworks/artist/${encodeURIComponent('정서온')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongSeoonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정서온' ||
    n === 'jeong seoon' ||
    n === 'jeong seo-on' ||
    n.replace(/[\s-]+/g, '') === 'jeongseoon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정서온 — 집, 공간과 존재 사이',
    description:
      "'집'이라는 형상을 매개로 공간·사물·인간과 세계의 관계를 탐구하는 작가 정서온(1984–). 대구와 베를린을 오가며 물리적 공간을 넘어 정신적 공간까지 다루는 회화로, 존재와 관계에 대한 통찰을 제시한다. 「슈필렌」, 「이동하는 세계」 등으로 이어지는 정서온의 작품을 씨앗페 온라인에서 만날 수 있습니다.",
    ogDescription:
      "'집'이라는 형상을 매개로 공간과 존재의 관계를 탐구하는 작가 정서온. 대구와 베를린을 오간 사유의 회화.",
    ogAlt: '정서온 대표 작품',
    twitterTitle: '정서온',
    twitterDescription: '집, 공간과 존재 사이 — 대구와 베를린을 오간 회화의 작가 정서온',
    keywords:
      '정서온 화가, 집 회화, 공간 회화, 대구 작가, 베를린 레지던시, 이동하는 세계, 슈필렌, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Seoon — House, Between Space and Being',
    description:
      "Selected works by Jeong Seoon (b. 1984), an artist who explores the relationship between space, objects, the human, and the world through the figure of the 'house.' Moving between Daegu and Berlin, her painting reaches beyond physical space into psychic space, offering insight into being and relation. View her works — including 〈Spielen〉 and 〈A Moving World〉 — at SAF Online.",
    ogDescription:
      "Jeong Seoon — an artist exploring space and being through the figure of the 'house.' Painting shaped by years moving between Daegu and Berlin.",
    ogAlt: 'Jeong Seoon — featured work',
    twitterTitle: 'Jeong Seoon',
    twitterDescription:
      'House, between space and being — Jeong Seoon, a painter who moved between Daegu and Berlin',
    keywords:
      'Jeong Seoon painter, house painting, space painting, Daegu artist, Berlin residency, A Moving World',
  },
} as const;

export async function buildJeongSeoonMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_SEOON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정서온');
  const artwork = allArtworks.find((a) => isJeongSeoonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Seoon`
      : `${artwork.title} — 정서온`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_SEOON_PATH, locale, true),
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

export default async function JeongSeoonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_SEOON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정서온');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isJeongSeoonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Jeong Seoon' : '정서온', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_SEOON_PATH}#person-jeong-seoon`,
    name: isEnglish ? 'Jeong Seoon' : '정서온',
    alternateName: isEnglish ? '정서온' : 'Jeong Seoon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? "Jeong Seoon (b. 1984) is a Korean painter who explores the relationship between space, objects, the human, and the world through the figure of the 'house.' Based in Daegu and shaped by years living in Berlin, her work reaches beyond physical space into psychic space."
      : "정서온(1984–)은 '집'이라는 형상을 매개로 공간·사물·인간과 세계의 관계를 탐구하는 화가입니다. 대구를 기반으로 베를린 거주 경험을 거치며, 물리적 공간을 넘어 정신적 공간까지 다룹니다.",
    birthDate: '1984',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Daegu University, Graduate School (M.A. in Painting, Fine Art & Design)'
        : '대구대학교 대학원 미술디자인 회화과(석사)',
    },
    knowsAbout: ['Painting', 'House', 'Space', 'Being'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Seoon — SAF Online' : '정서온 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Seoon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 정서온 작품을 소개합니다.',
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
        {/* Hero Section — '집'의 형상, 건축적 윤곽선 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 집의 윤곽 — 공간의 골격을 암시하는 수직·사선 라인 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" aria-hidden="true" />
          <div className="absolute top-0 left-20 h-full w-px bg-primary/30" aria-hidden="true" />
          <div className="absolute top-0 right-14 h-full w-px bg-white/10" aria-hidden="true" />
          <div
            className="absolute top-16 right-20 w-10 h-10 border-t border-r border-white/15 rotate-45"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Seoon · b. 1984' : '정서온 · 1984–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A house is built
                  <br />
                  <span className="text-primary-soft">between space and being</span>
                </>
              ) : (
                <>
                  집은 공간과 존재
                  <br />
                  <span className="text-primary-soft">사이에 지어진다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Through the figure of the house, space, objects, and the world meet.
                  </span>
                  <span className="mt-2 block">
                    Beyond the physical room lies a psychic space — and a question about being.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">‘집’이라는 형상에서 공간과 사물과 세계가 만난다.</span>
                  <span className="mt-2 block">
                    물리적 방 너머에 정신의 공간이, 그리고 존재에 대한 물음이 있다.
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
                    Between Daegu and Berlin —<br />
                    <span className="text-primary-strong">a house as a way of seeing</span>
                  </>
                ) : (
                  <>
                    대구와 베를린 사이 —<br />
                    <span className="text-primary-strong">하나의 사유로서의 집</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Seoon (b. 1984) majored in painting in the Department of Fine Art &amp;
                      Design at Daegu University and its graduate school, completing her
                      master&apos;s degree in 2009. Beginning her practice in Daegu, she has since
                      expanded her work both at home and abroad.
                    </p>
                    <p>
                      In 2009 she made her first works in residence at the Yeongcheon Art Studio.
                      From 2013 to 2017, and again in 2020, she lived in Berlin, taking part in
                      exhibitions and projects there. The German exhibition titles that run through
                      her record — <em>Die Nacht</em>, <em>Die unvollendete Welt</em>,{' '}
                      <em>Mein Blau und Weiß</em> &mdash; mark the depth of those Berlin years.
                    </p>
                    <p>
                      Through the figure of the{' '}
                      <strong className="font-bold text-charcoal-deep">house</strong>, her work
                      explores the relationship between space, objects, the human, and the world.
                      Reaching beyond physical space into{' '}
                      <strong className="font-bold text-charcoal">psychic space</strong>, she offers
                      insight into being and relation.
                    </p>
                    <p>
                      After returning, she continued to show steadily — a 2023 solo exhibition at
                      Apsan Gallery in Daegu, and in 2024 a solo show at the Culture &amp; Arts
                      Factory in Pohang. The house, in her hands, is less a building than a way of
                      seeing: a frame in which space and existence are held together.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정서온(1984–)은 대구대학교 및 동 대학원 미술디자인학과에서 회화를 전공하고
                      2009년 학위를 취득했다. 대구를 기반으로 작업을 시작해 국내외로 작품 세계를
                      확장해 왔다.
                    </p>
                    <p>
                      2009년 영천창작스튜디오에서 첫 창작을 했고, 2013년부터 2017년까지, 그리고
                      2020년에 베를린에 거주하며 전시와 프로젝트에 참여했다. 그의 이력에 흐르는
                      독일어 전시명 &mdash; 「Die Nacht」, 「Die unvollendete Welt」, 「Mein Blau
                      und Weiß」 &mdash; 은 그 베를린 시기의 깊이를 보여준다.
                    </p>
                    <p>
                      그의 작업은 <strong className="font-bold text-charcoal-deep">‘집’</strong>
                      이라는 형상을 매개로 공간·사물·인간과 세계의 관계를 탐구한다. 물리적 공간을
                      넘어 <strong className="font-bold text-charcoal">정신적 공간</strong>까지
                      다루며, 존재와 관계에 대한 통찰을 제시한다.
                    </p>
                    <p>
                      귀국 후에도 꾸준히 작업을 선보였다. 2023년 대구 앞산갤러리, 2024년
                      문화예술팩토리(포항)에서 개인전을 열었다. 그에게 집은 건물이라기보다 하나의
                      시선이다 &mdash; 공간과 존재가 함께 담기는 하나의 틀.
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
                        {isEnglish ? 'The figure of the house' : "'집'이라는 형상"}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The house as a medium through which space, objects, the human, and the world are brought into relation.'
                          : '공간·사물·인간과 세계를 관계 맺게 하는 매개로서의 집.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Psychic space' : '정신적 공간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A reach beyond the physical room toward inner, psychic space — and insight into being and relation.'
                          : '물리적 방을 넘어 내면의 정신적 공간으로 향하는 시선 — 존재와 관계에 대한 통찰.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Daegu and Berlin' : '대구와 베를린'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A practice shaped by moving between cities — German exhibition titles marking the depth of the Berlin years.'
                          : '도시를 오가며 형성된 작업 — 베를린 시기의 깊이를 새긴 독일어 전시명들.'}
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
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes M.A. in painting, Daegu University Graduate School; first residency at Yeongcheon Art Studio.'
                        : '대구대학교 대학원 회화 석사 취득; 영천창작스튜디오 2기 입주 — 첫 창작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Mongsang-House〉 solo exhibition, Yeongcheon Art Studio.'
                        : '「몽상-House」 개인전, 영천창작스튜디오.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lives in Berlin (through 2017, and again in 2020), joining exhibitions and projects.'
                        : '베를린 거주(~2017, 그리고 2020년) — 전시·프로젝트 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Augen zu und sehen〉 solo exhibition, Damso Galerie & Teehaus, Berlin.'
                        : '「Augen zu und sehen」 개인전, Damso Galerie & Teehaus, 베를린.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Die Nacht〉 solo exhibition, Dongseong Salon, Daegu.'
                        : '「Die Nacht 밤」 개인전, 동성살롱, 대구.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Die unvollendete Welt〉 solo exhibition, Smile Art Center, Daegu.'
                        : '「Die unvollendete Welt」 개인전, 웃는얼굴 아트센터, 대구.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Mein Blau und Weiß〉 solo exhibition, Omoke Gallery, Gyeongbuk; resident artist, Art Lab Beomeo (2022–2024).'
                        : '「Mein Blau und Weiß」 개인전, Omoke Gallery, 경북; 아트랩범어 입주예술인(2022~2024).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Spielen〉 solo exhibition, Apsan Gallery, Daegu.'
                        : '「슈필렌 Spielen: 형태놀이」 개인전, 앞산갤러리, 대구.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈A Moving World〉 solo exhibition, Culture & Arts Factory, Pohang.'
                        : '「이동하는 세계」 개인전, 문화예술팩토리, 포항.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected for the Suseong Renaissance Project artwork-lending program (Suseong Cultural Foundation).'
                        : '수성르네상스프로젝트 미술작품 대여사업 선정(수성문화재단).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & selections' : '주요 전시 및 선정'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈A Garden Bloomed from Flame〉, Daegu Art Factory (2025); 〈Busan, Connected〉, Busan Modern & Contemporary History Museum, Vault Art Space (2024).'
                        : '단체전: 「불꽃에서 피어난 정원」, 대구예술발전소(2025); 「부산, 커넥티드」, 부산근현대역사관 금고미술관(2024).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Berlin group exhibitions: 〈Moonlight Project — The Unsent Letter〉 & 〈Sewol Passion〉, PG Berlin Gallery (2017); 48 Stunden Neukölln, Berlin (2015).'
                        : '베를린 단체전: 「달빛 프로젝트-보내지 못한 편지」·「Sewol Passion」, PG Berlin Gallery(2017); 48 Stunden Neukölln, 베를린(2015).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selections: Pohang culture & arts support program / emerging-artist open call (Busan, Connected, 2024); regional-artist artwork-lending program, Daegu Cultural Foundation (2021).'
                        : '선정: 포항문화예술지원사업·신진작가 공모당선(부산 커넥티드, 2024); 지역작가 미술작품 대여사업, 대구문화재단(2021).'}
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
                  Two essays —
                  <br />
                  <span className="text-charcoal-deep">on the house and its space</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">집과 그 공간에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. '집'이라는 형상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The figure of the house — beyond the physical room'
                    : "'집'이라는 형상 — 물리적 방을 넘어"}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jeong Seoon&apos;s work returns, again and again, to a single figure: the
                        house. Not a particular building, but the idea of one — a frame that gathers
                        space, objects, the human, and the world, and holds them in relation. In her
                        hands the house is less an architecture to be inhabited than a structure of
                        thought to be looked through.
                      </p>
                      <p>
                        What makes the figure hers is the move beyond the physical. The walls and
                        rooms of her paintings open onto a{' '}
                        <strong className="font-bold text-charcoal-deep">psychic space</strong> — an
                        inner geometry where being and relation become visible. To enter one of her
                        houses is to enter a question: what does it mean to dwell, to belong, to
                        stand in relation to the world?
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정서온의 작업은 하나의 형상으로 거듭 돌아온다 — 집. 특정한 건물이 아니라,
                        집이라는 관념으로. 공간과 사물과 인간과 세계를 한데 모아 관계 맺게 하는 틀.
                        그의 손에서 집은 거주할 건축이라기보다, 그것을 통해 바라보는 사유의 구조에
                        가깝다.
                      </p>
                      <p>
                        이 형상을 그만의 것으로 만드는 것은 물리적인 것 너머로의 이동이다. 그의 그림
                        속 벽과 방은{' '}
                        <strong className="font-bold text-charcoal-deep">정신적 공간</strong>으로
                        열린다 — 존재와 관계가 드러나는 내면의 기하학. 그의 집에 들어선다는 것은
                        하나의 물음에 들어서는 일이다: 거주한다는 것, 속한다는 것, 세계와 관계 맺고
                        선다는 것은 무엇인가.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 대구와 베를린 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Between Daegu and Berlin — a moving world'
                    : '대구와 베를린 사이 — 이동하는 세계'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Beginning in Daegu and making her first works at the Yeongcheon Art Studio
                        in 2009, Jeong Seoon soon carried her practice outward. From 2013 to 2017,
                        and again in 2020, she lived in Berlin, joining exhibitions and projects
                        there. The German exhibition titles that recur in her record &mdash;{' '}
                        <em>Die Nacht</em> (the night), <em>Die unvollendete Welt</em> (the
                        unfinished world), <em>Mein Blau und Weiß</em> (my blue and white) &mdash;
                        read like a quiet diary of those years.
                      </p>
                      <p>
                        That movement between cities is not incidental to the work; it is part of
                        its subject. A house imagined by someone who has lived between places is a
                        house about belonging and its absence, about the space one carries rather
                        than the space one owns. By 2024, her solo exhibition in Pohang took the
                        title 〈A Moving World〉 — naming directly the condition her painting has
                        long held: a world, and a self, in transit, looking for where to dwell.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대구에서 시작해 2009년 영천창작스튜디오에서 첫 작품을 낸 정서온은 이내
                        작업을 바깥으로 가져갔다. 2013년부터 2017년까지, 그리고 2020년에 그는
                        베를린에 거주하며 전시와 프로젝트에 참여했다. 이력에 반복되는 독일어 전시명
                        &mdash; 「Die Nacht(밤)」, 「Die unvollendete Welt(미완의 세계)」, 「Mein
                        Blau und Weiß(나의 파랑과 하양)」 &mdash; 은 그 시절의 조용한 일기처럼
                        읽힌다.
                      </p>
                      <p>
                        도시를 오간 이 이동은 작업에 우연히 더해진 것이 아니라, 작업의 주제의
                        일부다. 여러 곳을 거쳐 산 사람이 상상하는 집은 소속과 그 부재에 관한 집,
                        소유한 공간이 아니라 지니고 다니는 공간에 관한 집이다. 2024년 포항 개인전이
                        「이동하는 세계」라는 제목을 단 것은 우연이 아니다 &mdash; 그의 회화가
                        오랫동안 품어 온 조건을 곧바로 호명한 것이다: 어디에 거주할지를 찾으며, 이동
                        중인 세계와 자아.
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
                      From the studios of Daegu to the galleries of Berlin and back, Jeong Seoon has
                      built a body of work in which the house is a way of thinking about space and
                      being. She joins this campaign in solidarity with fellow artists — so that the
                      next generation might keep building, in paint, the spaces in which a life can
                      be held.
                    </>
                  ) : (
                    <>
                      대구의 작업실에서 베를린의 화랑으로, 그리고 다시 돌아오기까지, 정서온은 집이
                      공간과 존재를 사유하는 방식이 되는 작업을 쌓아왔다. 그는 동료 예술인과의
                      연대의 뜻으로 씨앗페에 함께한다 &mdash; 다음 세대의 예술인들이 한 사람의 삶을
                      담을 수 있는 공간을, 그림으로 계속 지어 갈 수 있도록.
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
                HOUSE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jeong Seoon</span>
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
                    Jeong Seoon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정서온 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_SEOON_PATH}
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
