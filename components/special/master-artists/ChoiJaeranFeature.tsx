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

// 작가 feature는 작가 페이지(/artworks/artist/최재란)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHOI_JAERAN_PATH = `/artworks/artist/${encodeURIComponent('최재란')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isChoiJaeranArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '최재란' ||
    n === 'choi jaeran' ||
    n === 'choi jae-ran' ||
    n.replace(/[\s-]+/g, '') === 'choijaeran'
  );
};

const PAGE_COPY = {
  ko: {
    title: '최재란 — 쿼크의 시간, 시든 정물에 깃든 우주',
    description:
      '사진과 정물 사이에서 시간의 층위를 응시하는 작가 최재란. 매일의 산책에서 모은 시든 자연물을 검은 배경에 매달고 그 위에 별자리·우주·전통문양을 드로잉하는 「쿼크(Quarks)의 시간」 연작으로, 가장 사소한 사물에 스며든 시간을 사진으로 길어 올린다. 씨앗페 온라인에서 최재란의 작품을 만날 수 있습니다.',
    ogDescription:
      '시간의 층위를 응시하는 작가 최재란. 시든 정물을 검은 배경에 매달아 우주와 별자리를 드로잉한 「쿼크의 시간」 연작.',
    ogAlt: '최재란 대표 작품',
    twitterTitle: '최재란',
    twitterDescription: '가장 사소한 사물에 깃든 시간 — 「쿼크의 시간」의 작가 최재란',
    keywords:
      '최재란 사진가, 쿼크의 시간, 정물 사진, 시간 사진, 화성 묵시의 풍경, 수원 작가, 씨앗페 온라인',
  },
  en: {
    title: 'Choi Jaeran — The Time of Quarks',
    description:
      'Selected works by Choi Jaeran, an artist gazing at the layers of time between photography and still life. In her 〈The Time of Quarks〉 series, she suspends withered natural objects gathered on daily walks against a black ground and draws constellations, the cosmos, and traditional patterns over them — drawing out, through photography, the time that seeps into the smallest of things. View her works at SAF Online.',
    ogDescription:
      'Choi Jaeran — an artist gazing at the layers of time. Her 〈The Time of Quarks〉 series suspends withered still life against black and draws the cosmos over it.',
    ogAlt: 'Choi Jaeran — featured work',
    twitterTitle: 'Choi Jaeran',
    twitterDescription:
      'The time held in the smallest of things — Choi Jaeran, artist of 〈The Time of Quarks〉',
    keywords:
      'Choi Jaeran photographer, The Time of Quarks, still life photography, time photography, Suwon artist',
  },
} as const;

export async function buildChoiJaeranMetadata({
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
  const pageUrl = buildLocaleUrl(CHOI_JAERAN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('최재란');
  const artwork = allArtworks.find((a) => isChoiJaeranArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Choi Jaeran`
      : `${artwork.title} — 최재란`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHOI_JAERAN_PATH, locale, true),
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

export default async function ChoiJaeranFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHOI_JAERAN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('최재란');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isChoiJaeranArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Choi Jaeran' : '최재란', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHOI_JAERAN_PATH}#person-choi-jaeran`,
    name: isEnglish ? 'Choi Jaeran' : '최재란',
    alternateName: isEnglish ? '최재란' : 'Choi Jaeran',
    jobTitle: isEnglish ? 'Artist' : '사진가',
    description: isEnglish
      ? 'Choi Jaeran is a Korean artist working between photography and still life. She studied photography at Chung-Ang University and is known for her 〈The Time of Quarks〉 series, which suspends withered natural objects against a black ground and draws the cosmos over them.'
      : '최재란은 사진과 정물 사이에서 작업하는 작가입니다. 중앙대학교에서 사진을 전공했으며, 시든 자연물을 검은 배경에 매달고 그 위에 우주를 드로잉하는 「쿼크의 시간」 연작으로 알려져 있습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chung-Ang University, B.F.A. in Photography'
          : '중앙대학교 미술학사(사진전공)',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Ajou University, Graduate School of Public Policy (M.A. in Public Administration)'
          : '아주대학교 공공정책대학원 행정학 석사',
      },
    ],
    knowsAbout: ['Photography', 'Still life', 'Time', 'Cosmos'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Choi Jaeran — SAF Online' : '최재란 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Choi Jaeran from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 최재란 작품을 소개합니다.',
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
        {/* Hero Section — 쿼크의 시간, 검은 배경에 떠오른 별·정물 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 별자리 점광 — 미시(쿼크)와 거시(우주)가 겹치는 모티프 */}
          <div
            className="absolute top-14 left-12 w-1.5 h-1.5 bg-white/20 rounded-full"
            aria-hidden="true"
          />
          <div
            className="absolute top-24 left-24 w-1 h-1 bg-primary/40 rounded-full"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/3 right-16 w-1.5 h-1.5 bg-white/15 rounded-full"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 right-24 w-1 h-1 bg-white/20 rounded-full"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-28 left-1/3 w-1 h-1 bg-primary/30 rounded-full"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-16 w-1 h-1 bg-white/10 rounded-full"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Choi Jaeran' : '최재란'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The time held
                  <br />
                  <span className="text-primary-soft">in the smallest of things</span>
                </>
              ) : (
                <>
                  가장 사소한 사물에
                  <br />
                  <span className="text-primary-soft">깃든 시간</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Withered natural things, suspended against the dark.
                  </span>
                  <span className="mt-2 block">
                    Where the micro and the cosmos overlap — the time of quarks.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">시든 자연물을 어둠 위에 매달다.</span>
                  <span className="mt-2 block">미시와 우주가 겹치는 자리 — 쿼크의 시간.</span>
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
                    A daily ritual —<br />
                    <span className="text-primary-strong">photography as the density of time</span>
                  </>
                ) : (
                  <>
                    매일의 의식 —<br />
                    <span className="text-primary-strong">시간의 밀도를 드러내는 사진</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Choi Jaeran studied photography at Chung-Ang University and went on to take a
                      master&apos;s degree in public administration at Ajou University&apos;s
                      Graduate School of Public Policy. Based in Suwon, she has long explored the
                      landscapes around the fortress walls of Hwaseong.
                    </p>
                    <p>
                      Her work begins with attention. As she puts it, she has continued{' '}
                      <em>
                        &ldquo;observing and exploring the traces of time through objects and
                        landscapes we pass by without a second thought.&rdquo;
                      </em>{' '}
                      Grass and trees, stones, withered petals and dried fruit — the experience of
                      looking long at small, trivial things made her aware of a layer of time that
                      is invisible yet unmistakably present, and this became the starting point of
                      her practice.
                    </p>
                    <p>
                      Her central project, 〈The Time of Quarks〉, begins from a question about the
                      most fundamental unit that composes the world. Just as the elementary particle
                      &mdash; the &ldquo;quark&rdquo; &mdash; threads through all matter, she takes
                      time to be a universal presence that seeps even into the smallest everyday
                      object, drawing an analogy between the structure of matter and the structure
                      of time.
                    </p>
                    <p>
                      Her method is at once everyday and ritual. Walking each day, she observes and
                      gathers natural objects, then suspends withered nature on wire against a black
                      ground, attaching seeds and fruit to reconstruct a{' '}
                      <strong className="font-bold text-charcoal-deep">still life</strong>. Over
                      that, she draws constellations, the cosmos, and traditional patterns as
                      symbols. Here the photograph is no longer a device for capturing an instant
                      but one for revealing the accumulation and density of time.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      최재란은 중앙대학교에서 사진을 전공하고, 아주대학교 공공정책대학원에서 행정학
                      석사를 취득했다. 수원에 거주하며 수원화성 성곽 언저리의 풍경을 오래 탐구해
                      왔다.
                    </p>
                    <p>
                      그의 작업은 응시에서 출발한다. 작가의 말처럼 그는{' '}
                      <em>
                        &ldquo;일상 속에서 무심히 지나치는 사물과 풍경을 통해 시간의 흔적을 관찰하고
                        탐구하는 작업&rdquo;
                      </em>
                      을 이어오고 있다. 풀과 나무, 돌, 시든 꽃잎과 말라버린 열매처럼 작고 사소한
                      대상들을 오래 바라보는 경험은, 보이지 않지만 분명히 존재하는 시간의 층위를
                      인식하게 만들었고, 이는 그의 작업의 출발점이 되었다.
                    </p>
                    <p>
                      대표 연작 「쿼크(Quarks)의 시간」은 세계를 구성하는 가장 근원적 단위에 대한
                      물음에서 시작한다. 우주 물질의 기본입자 &lsquo;쿼크&rsquo;가 세계를 꿰고
                      있듯이, 그는 시간을 가장 사소한 일상 사물에까지 스며드는{' '}
                      <strong className="font-bold text-charcoal-deep">보편적 존재</strong>로
                      응시하며, 물질의 구조와 시간의 구조 사이의 유사성을 보여준다.
                    </p>
                    <p>
                      작업 방식은 일상적이면서 동시에 의식(ritual)적이다. 매일 산책하며 자연물을
                      관찰·수집한 뒤, 검은 배경 위에 시든 자연물을 와이어로 매달고 씨앗과 열매를
                      붙여{' '}
                      <strong className="font-bold text-charcoal-deep">정물(Still Life)</strong>로
                      재구성한다. 그 위에 별자리·우주·전통문양을 상징적으로 드로잉한다. 여기서
                      사진은 순간을 포착하는 매체가 아니라, 시간의 축적과 밀도를 드러내는 장치로
                      작동한다.
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
                        {isEnglish ? 'The traces of time' : '시간의 흔적'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Withered petals and dried fruit — looking long at small things reveals an invisible layer of time.'
                          : '시든 꽃잎과 말라버린 열매 — 작은 사물을 오래 바라보며 보이지 않는 시간의 층위를 드러낸다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? '〈The Time of Quarks〉' : '「쿼크의 시간」'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'As the quark threads through all matter, time seeps into the smallest object — the micro and the cosmos overlapping.'
                          : '쿼크가 모든 물질을 꿰듯, 시간은 가장 사소한 사물에 스며든다 — 미시와 우주가 겹치는 자리.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Reconstructed still life' : '재구성된 정물'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Withered nature suspended on wire against black, drawn over with constellations and patterns — photography as accumulated time.'
                          : '검은 배경에 와이어로 매단 시든 자연물 위에 별자리와 문양을 드로잉 — 축적된 시간으로서의 사진.'}
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
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'B.F.A. in Photography, Chung-Ang University; M.A. in Public Administration, Ajou University Graduate School of Public Policy.'
                        : '중앙대학교 미술학사(사진전공); 아주대학교 공공정책대학원 행정학 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Dreaming Love Song〉 solo exhibition, Nosong Gallery, Suwon.'
                        : '「꿈꾸는 연가」 개인전, 노송갤러리, 수원.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Tears〉, DDP; 〈Hwaseong, the Surrounding Landscape〉, Ideale, Suwon.'
                        : '「Tears」, DDP; 「화성, 언저리풍경」, 이데알레, 수원.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Hwaseong, Apocalyptic Landscape〉, Haenggungjae Gallery.'
                        : '「화성, 묵시의 풍경」, 행궁재갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Hwaseong, Apocalyptic Landscape〉, Suwon SK Artrium.'
                        : '「화성, 묵시의 풍경」, 수원SK아트리움.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Kairos Mural〉, Art Space Areum, Suwon.'
                        : '「카이로스 벽화」, 예술공간 아름, 수원.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Kairos Mural〉, Starfield Suwon.'
                        : '「카이로스 벽화」, 스타필드 수원점.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Time of Quarks〉 — two-person show at Gallery 712 / invited exhibition at Jaejae Gallery, Seoul.'
                        : '「쿼크(Quarks)의 시간」 — 갤러리712 2인전 / 재재갤러리 초대전, 서울.'}
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
                        ? 'Group exhibitions: SAF (G&J Gallery, Insa Art Center, 2026); Busan International Photo Festival open-call special exhibition (2025); Korea International Photo Festival, Hangaram Art Museum, Seoul Arts Center (2023).'
                        : '단체전: 씨앗페(인사아트센터 G&J갤러리, 2026); 부산국제사진제 오픈콜 특별전(2025); 대한민국국제포토페스티벌, 예술의전당 한가람미술관(2023).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Awards: 'Hyeonghyeong-saeksaek' Award, Korea International Photo Festival (2023); selected artist, 8th Contemporary Photography Open Call, Gallery Index (2021); selected artist, Art Gyeonggi, Gyeonggi Cultural Foundation (2021)."
                        : "수상·지원: 대한민국국제포토페스티벌 '형형색색' 수상(2023); 제8회 현대사진공모 작가 선정, 갤러리인덱스(2021); 아트경기 작가 선정, 경기문화재단(2021)."}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as a 2024 Suwon Culture & Arts generative-AI media-art artist.'
                        : '2024 수원문화예술인 생성형AI미디어아트 작가 선정.'}
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
                  <span className="text-charcoal-deep">on the work and its time</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 시간에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 시간의 흔적 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The traces of time — looking long at small things'
                    : '시간의 흔적 — 작은 것을 오래 바라보기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Choi Jaeran&apos;s practice does not begin with a grand subject. It begins
                        with the things we pass by without a second thought: grass and trees, a
                        stone, a withered petal, a dried fruit. Looking long at such small, trivial
                        objects, she came to sense a layer that ordinary attention misses — a layer
                        of time that is invisible yet unmistakably there.
                      </p>
                      <p>
                        That recognition became the starting point of everything she makes. In her
                        own words, she has continued{' '}
                        <em>
                          &ldquo;observing and exploring the traces of time through objects and
                          landscapes we pass by without a second thought.&rdquo;
                        </em>{' '}
                        Time, in her work, is not measured but accumulated — held in the wrinkle of
                        a dried leaf, in the curl of a withered stem, in the slow surrender of a
                        fruit to dryness.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        최재란의 작업은 거창한 소재에서 시작하지 않는다. 무심히 지나치는 것들에서
                        시작한다 — 풀과 나무, 돌 하나, 시든 꽃잎, 말라버린 열매. 그런 작고 사소한
                        대상을 오래 바라보며, 그는 평범한 시선이 놓치는 층위를 감지하게 됐다. 보이지
                        않지만 분명히 거기 있는 시간의 층위를.
                      </p>
                      <p>
                        그 인식이 그가 만드는 모든 것의 출발점이 됐다. 작가 자신의 말로, 그는{' '}
                        <em>
                          &ldquo;일상 속에서 무심히 지나치는 사물과 풍경을 통해 시간의 흔적을
                          관찰하고 탐구하는 작업&rdquo;
                        </em>
                        을 이어오고 있다. 그의 작업에서 시간은 측정되는 것이 아니라 축적되는 것이다
                        — 마른 잎의 주름에, 시든 줄기의 굽이에, 천천히 메말라 가는 열매에 깃든 채로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 쿼크의 시간 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈The Time of Quarks〉 — where the micro meets the cosmos'
                    : '「쿼크의 시간」 — 미시와 우주가 만나는 곳'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her central series, 〈The Time of Quarks〉, begins from a question about the
                        most fundamental unit that composes the world. The quark — the elementary
                        particle of cosmic matter — threads through all things, invisible yet
                        everywhere. Choi takes time to be exactly such a presence: universal,
                        unseen, seeping even into the smallest everyday object. The series sets the
                        structure of matter and the structure of time side by side, and lets one
                        illuminate the other.
                      </p>
                      <p>
                        The making is both daily and ritual. Walking each day, she observes and
                        gathers natural objects; then, against a black ground, she suspends withered
                        nature on wire and attaches seeds and fruit, reconstructing a still life.
                        Over that constructed image she draws constellations, the cosmos, and
                        traditional patterns — so that a single dried stem and the whole night sky
                        share one frame. The photograph here is not a way of stopping an instant but
                        of revealing the accumulation and density of time.
                      </p>
                      <p>
                        The series is also opening outward. A planned extension, 〈The Time of
                        Quarks: Sea〉, turns to small fragments worn smooth by the waves, composed
                        as still life and drawn over in the same way — time read, again, in what the
                        world has slowly worn down.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대표 연작 「쿼크의 시간」은 세계를 구성하는 가장 근원적 단위에 대한 물음에서
                        시작한다. 우주 물질의 기본입자인 쿼크는 모든 것을 꿰뚫는다 — 보이지 않지만
                        어디에나 있다. 최재란은 시간을 바로 그런 존재로 본다. 보편적이고, 보이지
                        않으며, 가장 사소한 일상 사물에까지 스며드는 존재로. 연작은 물질의 구조와
                        시간의 구조를 나란히 두고, 하나가 다른 하나를 비추게 한다.
                      </p>
                      <p>
                        만드는 과정은 일상적이면서 의식적이다. 매일 산책하며 자연물을 관찰·수집하고,
                        검은 배경 위에 시든 자연물을 와이어로 매달고 씨앗과 열매를 붙여 정물로
                        재구성한다. 그 구성된 이미지 위에 별자리·우주·전통문양을 드로잉한다 — 마른
                        줄기 하나와 밤하늘 전체가 한 화면을 나누어 갖도록. 여기서 사진은 순간을
                        멈추는 방법이 아니라, 시간의 축적과 밀도를 드러내는 방법이다.
                      </p>
                      <p>
                        연작은 바깥으로도 열리고 있다. 예정된 확장 「쿼크의 시간: 바다」는 파도에
                        닳은 작은 조각들로 향한다 — 같은 방식으로 정물적 구성과 드로잉을 거쳐,
                        세계가 천천히 닳려 놓은 것들 속에서 다시 시간을 읽는다.
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
                      Between the withered stem and the night sky, between the micro and the cosmos,
                      Choi Jaeran has built a quiet, patient body of work about the time that seeps
                      into the smallest of things. She joins this campaign in solidarity with fellow
                      artists — so that the next generation might keep working, slowly, at what
                      others pass by.
                    </>
                  ) : (
                    <>
                      시든 줄기와 밤하늘 사이, 미시와 우주 사이에서, 최재란은 가장 사소한 사물에
                      스며든 시간에 관한 조용하고 끈기 있는 작업을 쌓아왔다. 그는 동료 예술인과의
                      연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들이 남들이 지나치는 것을
                      천천히 들여다보며 계속 일할 수 있도록.
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
                QUARKS
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Choi Jaeran</span>
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
                    Choi Jaeran joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    최재란 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHOI_JAERAN_PATH}
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
