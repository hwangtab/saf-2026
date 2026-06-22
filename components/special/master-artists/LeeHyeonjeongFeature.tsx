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

// 작가 feature는 작가 페이지(/artworks/artist/이현정)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_HYEONJEONG_PATH = `/artworks/artist/${encodeURIComponent('이현정')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeHyeonjeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이현정' ||
    n === 'lee hyeonjeong' ||
    n === 'lee hyeon-jeong' ||
    n.replace(/[\s-]+/g, '') === 'leehyeonjeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이현정 — 김치, 그리고 DMZ: 발효된 정체성과 경계',
    description:
      '〈김치〉 연작과 평화·DMZ를 주제로 한국적 정체성과 현대사의 흔적을 시각화해 온 중견 작가 이현정. 발효와 숨의 시간을 담은 〈김치〉 작업과 베를린 장벽에서 DMZ로 이어지는 탈경계의 예술로, 분단과 현대사를 가로지른다. 2024 후쿠오카 아트 어워드 우수상, 2026 홍티아트센터 입주작가. 씨앗페 온라인에서 이현정의 작품을 만날 수 있습니다.',
    ogDescription:
      '〈김치〉 연작과 평화·DMZ를 주제로 한국적 정체성과 경계를 시각화하는 작가 이현정. 발효된 정체성에서 탈경계의 예술로.',
    ogAlt: '이현정 대표 작품',
    twitterTitle: '이현정',
    twitterDescription: '김치, 그리고 DMZ — 발효된 정체성과 경계의 작가 이현정',
    keywords:
      '이현정 작가, 김치 연작, DMZ 예술, 평화 미술, 탈경계, 후쿠오카 아트 어워드, 베를린 장벽, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Hyeonjeong — Kimchi and the DMZ',
    description:
      'Selected works by Lee Hyeonjeong, a mid-career artist who has visualized Korean identity and the traces of modern history through her 〈Kimchi〉 series and works on peace and the DMZ. From the time of fermentation and breath in her 〈Kimchi〉 works to a borderless art that runs from the Berlin Wall to the DMZ, she crosses the lines of division and contemporary history. Recipient of an Award of Excellence at the Fukuoka Art Award 2024 and a long-term resident artist at the Hongti Art Center in 2026. View her works at SAF Online.',
    ogDescription:
      'Lee Hyeonjeong — visualizing Korean identity and the border through her 〈Kimchi〉 series and works on peace and the DMZ. From fermented identity to a borderless art.',
    ogAlt: 'Lee Hyeonjeong — featured work',
    twitterTitle: 'Lee Hyeonjeong',
    twitterDescription: 'Kimchi and the DMZ — fermented identity and the border',
    keywords:
      'Lee Hyeonjeong artist, Kimchi series, DMZ art, peace art, transborder, Fukuoka Art Award, Berlin Wall',
  },
} as const;

export async function buildLeeHyeonjeongMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_HYEONJEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이현정');
  const artwork = allArtworks.find((a) => isLeeHyeonjeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Hyeonjeong`
      : `${artwork.title} — 이현정`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_HYEONJEONG_PATH, locale, true),
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

export default async function LeeHyeonjeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_HYEONJEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이현정');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isLeeHyeonjeongArtist(artwork.artist)
  );
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Hyeonjeong' : '이현정', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_HYEONJEONG_PATH}#person-lee-hyeonjeong`,
    name: isEnglish ? 'Lee Hyeonjeong' : '이현정',
    alternateName: isEnglish ? '이현정' : 'Lee Hyeonjeong',
    jobTitle: isEnglish ? 'Artist' : '작가',
    description: isEnglish
      ? 'Lee Hyeonjeong is a mid-career Korean artist who visualizes Korean identity and the traces of modern history through her 〈Kimchi〉 series and works on peace and the DMZ.'
      : '이현정은 〈김치〉 연작과 평화·DMZ를 주제로 한국적 정체성과 현대사의 흔적을 시각화해 온 중견 작가입니다.',
    knowsAbout: ['Kimchi series', 'DMZ', 'Peace art', 'Korean identity', 'Transborder art'],
    award: isEnglish
      ? ['Award of Excellence, Fukuoka Art Award 2024']
      : ['제2회 후쿠오카 아트 어워드 우수상 (2024)'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Hyeonjeong — SAF Online' : '이현정 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Hyeonjeong from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 이현정 작품을 소개합니다.',
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

          {/* Border lines — 경계·DMZ 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-10 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Hyeonjeong · Mid-career' : '이현정 · 중견 작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Kimchi, and the DMZ
                  <br />
                  <span className="text-primary-soft">fermented identity, drawn borders</span>
                </>
              ) : (
                <>
                  김치, 그리고 DMZ
                  <br />
                  <span className="text-primary-soft">발효된 정체성과 경계</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From the breath and fermentation held in a jar of kimchi
                  </span>
                  <span className="mt-2 block">
                    to a borderless art that runs from the Berlin Wall to the DMZ.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">김치 한 항아리에 담긴 숨과 발효의 시간에서,</span>
                  <span className="mt-2 block">
                    베를린 장벽에서 DMZ로 이어지는 탈경계의 예술까지.
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
                    Identity, fermented —<br />
                    <span className="text-primary-strong">a history crossing borders</span>
                  </>
                ) : (
                  <>
                    발효된 정체성 —<br />
                    <span className="text-primary-strong">경계를 가로지르는 현대사</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Hyeonjeong is a mid-career Korean artist who has visualized Korean
                      identity and the traces of modern history through two intertwined bodies of
                      work: the 〈Kimchi〉 series, and works on peace and the DMZ. Across her
                      practice, the most Korean of everyday substances and the most charged of
                      national borders are held in the same gaze.
                    </p>
                    <p>
                      The 〈Kimchi〉 works treat fermentation as metaphor — the slow, living
                      transformation of a culture, the breath held inside a sealed jar. She has
                      shown this series in solo exhibitions including{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Kimchi_Breath〉 (2022, CICA Museum)
                      </strong>
                      , 〈Kimchi〉 (2019, Alternative Art Space IPO), and{' '}
                      <strong className="font-bold text-charcoal">
                        〈GALLERIE LUTÈCE PRESENTS_Kimchi〉 (2024, COEX, Seoul)
                      </strong>
                      — turning a fermented staple into a meditation on what it means to be Korean.
                    </p>
                    <p>
                      Alongside the jar runs the border. From 2018, when she was selected as an
                      artist for the 〈DMZ Art Festa — Peace: Wind〉 at the PyeongChang Winter
                      Olympics, the DMZ and the question of division became a sustained theme. Her
                      work on peace and transborder space has carried her from the demilitarized
                      zone of the Korean peninsula to the former line of another divided nation.
                    </p>
                    <p>
                      In 2023 she was invited to{' '}
                      <strong className="font-bold text-charcoal-deep">〈UTOPIA?! PEACE〉</strong>{' '}
                      at Kunstraum Potsdam, the Berlin Wall Memorial (Bernauer Straße), and
                      Babelsberg Palace in Germany — placing Korea&apos;s DMZ in dialogue with the
                      memory of the Berlin Wall. The Berlin Wall Foundation and Kunstraum Potsdam
                      selected her for the project. Two borders, two divided histories, held in a
                      single line of sight.
                    </p>
                    <p>
                      In 2024 she received an Award of Excellence at the second{' '}
                      <strong className="font-bold text-charcoal">Fukuoka Art Award</strong>{' '}
                      (Fukuoka Art Museum), and in 2026 she was selected as a long-term resident
                      artist at the Hongti Art Center (Busan Cultural Foundation). Her work is held
                      in the collections of the Fukuoka Art Museum and the Goseong DMZ Museum.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이현정은 〈김치〉 연작과 평화·DMZ를 주제로 한 작업, 서로 맞물린 두 갈래의
                      작업을 통해 한국적 정체성과 현대사의 흔적을 시각화해 온 중견 작가다. 가장
                      한국적인 일상의 물질과 가장 첨예한 분단의 경계가, 그의 작업 안에서 하나의
                      시선으로 묶인다.
                    </p>
                    <p>
                      〈김치〉 작업은 발효를 은유로 다룬다 — 한 문화가 천천히, 살아 있는 채로
                      변형되는 시간, 봉인된 항아리 안에 갇힌 숨. 그는 이 연작을{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈김치_숨 Kimchi_Breath〉(2022, CICA 미술관)
                      </strong>
                      , 〈김치〉(2019, 대안예술공간 이포),{' '}
                      <strong className="font-bold text-charcoal">
                        〈GALLERIE LUTÈCE PRESENTS_김치〉(2024, 코엑스, 서울)
                      </strong>{' '}
                      등의 개인전에서 선보이며, 발효된 일상의 음식을 한국인이라는 존재에 대한 사유로
                      바꾸어 놓았다.
                    </p>
                    <p>
                      항아리 곁에는 경계가 흐른다. 2018년 평창동계올림픽 〈DMZ 아트페스타—평화:
                      바람〉 작가로 선정된 이래, DMZ와 분단의 물음은 지속적인 주제가 됐다. 평화와
                      탈경계의 공간을 향한 그의 작업은 한반도의 비무장지대에서 또 다른 분단국의 옛
                      경계선까지 이어진다.
                    </p>
                    <p>
                      2023년 그는 독일{' '}
                      <strong className="font-bold text-charcoal-deep">〈UTOPIA?! PEACE〉</strong>
                      (Kunstraum Potsdam / Berlin Wall Memorial(Bernauer Straße) / Babelsberg
                      Palace)에 초청됐다 — 한국의 DMZ를 베를린 장벽의 기억과 마주 세우는 자리였다.
                      Berlin Wall Foundation과 Kunstraum Potsdam이 그를 이 프로젝트에 선정했다. 두
                      개의 경계, 두 개의 분단된 역사가 하나의 시선 안에 놓였다.
                    </p>
                    <p>
                      2024년 그는 제2회{' '}
                      <strong className="font-bold text-charcoal">후쿠오카 아트 어워드</strong>
                      (후쿠오카시미술관) 우수상을 받았고, 2026년 부산문화재단 홍티아트센터 장기
                      입주작가로 선정됐다. 그의 작품은 후쿠오카시 미술관과 고성 DMZ박물관에 소장되어
                      있다.
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
                        {isEnglish ? 'The 〈Kimchi〉 series' : '〈김치〉 연작'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Fermentation as metaphor for Korean identity — the slow transformation and held breath of a culture, drawn out of the most everyday of substances.'
                          : '한국적 정체성의 은유로서의 발효. 가장 일상적인 물질에서 길어 올린, 한 문화의 느린 변형과 숨.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Peace & the DMZ' : '평화와 DMZ'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the 2018 PyeongChang 〈DMZ Art Festa — Peace: Wind〉 onward, the demilitarized zone and the question of division as a sustained subject.'
                          : '2018 평창 〈DMZ 아트페스타—평화: 바람〉 이래, 비무장지대와 분단의 물음을 지속적으로 다룬다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Crossing borders' : '탈경계'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Placing the DMZ in dialogue with the Berlin Wall — two divided histories held in a single gaze, from Korea to Germany.'
                          : 'DMZ를 베를린 장벽과 마주 세우는 시선. 한국에서 독일까지, 두 개의 분단된 역사를 하나의 시야 안에 담는다.'}
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
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈色卽是空 空卽是色〉, AP Gallery.'
                        : '개인전 〈色卽是空 空卽是色〉, AP갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈WHO AM I?〉, Jeongsu Gallery.'
                        : '개인전 〈WHO AM I?〉, 정수화랑.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as an artist for 〈DMZ Art Festa 2018 — Peace: Wind〉 at the PyeongChang Winter Olympics & Paralympics (Ministry of Culture, Sports and Tourism · Gangwon).'
                        : '〈DMZ 아트페스타 2018—평화: 바람〉(2018 평창동계올림픽·패럴림픽) 작가 선정(문화체육관광부·강원도).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Kimchi〉, Alternative Art Space IPO.'
                        : '개인전 〈김치〉, 대안예술공간이포.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Breath_Profound〉, Art Jamsil; group exhibition 〈After the DMZ, Breath of the Earth〉, Yangpyeong Art Museum.'
                        : '개인전 〈숨_의미심장〉, 아트잠실; 단체전 〈DMZ 이후, 대지의 숨결〉, 양평군립미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Kimchi_Breath〉 (CICA Museum) and 〈Moon of the Top〉 (Gallery HoHo); Changwon Sculpture Biennale Transborder Project.'
                        : '개인전 〈김치_숨 Kimchi_Breath〉(CICA 미술관)·〈팽이의 달〉(갤러리호호); 창원조각비엔날레 탈경계 프로젝트.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Mr. Lee! A Drift Diary〉 (Jeongmungyu Art Museum); invited to 〈UTOPIA?! PEACE〉 in Germany; 〈FREEDOM 2023〉, Fukuoka Asian Art Museum.'
                        : '개인전 〈이씨! 표류기〉(정문규미술관); 독일 〈UTOPIA?! PEACE〉 초청; 〈FREEDOM 2023〉, 후쿠오카 아시아미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award of Excellence, 2nd Fukuoka Art Award (Fukuoka Art Museum); solo exhibition 〈GALLERIE LUTÈCE PRESENTS_Kimchi〉, COEX, Seoul.'
                        : '제2회 후쿠오카 아트 어워드 우수상(후쿠오카시미술관); 개인전 〈GALLERIE LUTÈCE PRESENTS_김치〉, 코엑스, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈80 Years of Liberation: DMZ International Art Exchange Project_Transborder〉, Goseong DMZ Museum · Unification Observatory.'
                        : '단체전 〈광복 80주년 DMZ 국제예술교류 프로젝트_탈경계〉, 고성 DMZ박물관·통일전망대.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as a long-term resident artist at the Hongti Art Center (Busan Cultural Foundation).'
                        : '부산문화재단 홍티아트센터 레지던시 장기 입주작가 선정.'}
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
                        ? 'Solo: 〈Kimchi_Breath〉 (2022, CICA Museum), 〈Kimchi〉 (2019, Alternative Art Space IPO), 〈GALLERIE LUTÈCE PRESENTS_Kimchi〉 (2024, COEX, Seoul)'
                        : '개인전: 〈김치_숨 Kimchi_Breath〉(2022, CICA 미술관), 〈김치〉(2019, 대안예술공간이포), 〈GALLERIE LUTÈCE PRESENTS_김치〉(2024, 코엑스, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈UTOPIA?! PEACE〉 (2023, Kunstraum Potsdam / Berlin Wall Memorial(Bernauer Straße) / Babelsberg Palace, Germany), 〈FREEDOM 2023〉 (Fukuoka Asian Art Museum)'
                        : '단체전: 〈UTOPIA?! PEACE〉(2023, Kunstraum Potsdam / Berlin Wall Memorial(Bernauer Straße) / Babelsberg Palace, 독일), 〈FREEDOM 2023〉(후쿠오카 아시아미술관)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈80 Years of Liberation: DMZ International Art Exchange Project_Transborder〉 (2025, Goseong DMZ Museum · Unification Observatory), 〈After the DMZ, Breath of the Earth〉 (2021, Yangpyeong Art Museum)'
                        : '단체전: 〈광복 80주년 DMZ 국제예술교류 프로젝트_탈경계〉(2025, 고성 DMZ박물관·통일전망대), 〈DMZ 이후, 대지의 숨결〉(2021, 양평군립미술관)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Award of Excellence, 2nd Fukuoka Art Award (2024); selected long-term resident, Hongti Art Center (2026, Busan Cultural Foundation)'
                        : '수상·선정: 제2회 후쿠오카 아트 어워드 우수상(2024); 홍티아트센터 레지던시 장기 입주작가 선정(2026, 부산문화재단)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Fukuoka Art Museum (2024), Goseong DMZ Museum (2018)'
                        : '소장: 후쿠오카시 미술관(2024), 고성 DMZ박물관(2018)'}
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
                  <span className="text-charcoal-deep">on the jar and the border</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">항아리와 경계에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 김치, 발효된 정체성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈Kimchi〉 — fermentation as identity'
                    : '〈김치〉 — 발효로서의 정체성'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kimchi is the most ordinary thing in a Korean home, and one of the most
                        loaded. In Lee Hyeonjeong&apos;s 〈Kimchi〉 series, the fermented dish is
                        not a still-life subject but a way of thinking about identity itself.
                        Fermentation is slow, living transformation — a substance becoming more
                        fully itself over time, in the dark, inside a sealed jar.
                      </p>
                      <p>
                        The subtitle of her 2022 CICA Museum solo exhibition, <em>Kimchi_Breath</em>
                        , names the central image: breath held inside the jar. What ferments is not
                        only cabbage but a culture — its memory, its habits, its sense of who it is.
                        To open the lid is to release that accumulated time. The works ask what it
                        means to be Korean not through symbols of nation but through the chemistry
                        of an everyday thing.
                      </p>
                      <p>
                        She has carried this series from alternative spaces to the COEX exhibition
                        halls — 〈Kimchi〉 (2019, Alternative Art Space IPO) and 〈GALLERIE LUTÈCE
                        PRESENTS_Kimchi〉 (2024, COEX, Seoul) — keeping the same low, domestic
                        material at the center of a sustained inquiry into Korean identity.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김치는 한국의 집에서 가장 평범한 것이자, 가장 많은 것을 짊어진 것이다.
                        이현정의 〈김치〉 연작에서 발효된 음식은 정물의 소재가 아니라 정체성 자체를
                        사유하는 방식이다. 발효는 느린, 살아 있는 변형이다 — 한 물질이 시간 속에서,
                        어둠 속에서, 봉인된 항아리 안에서 더 온전히 자기 자신이 되어 가는 일.
                      </p>
                      <p>
                        2022년 CICA 미술관 개인전의 부제 <em>김치_숨 Kimchi_Breath</em>는 핵심
                        이미지를 이름 붙인다: 항아리 안에 갇힌 숨. 발효되는 것은 배추만이 아니라 한
                        문화다 — 그 기억, 그 습관, 자신이 누구인가에 대한 감각. 뚜껑을 여는 것은 그
                        축적된 시간을 풀어 놓는 일이다. 이 작업들은 한국인이라는 존재의 의미를
                        국가의 상징이 아니라 일상적인 사물의 화학으로 묻는다.
                      </p>
                      <p>
                        그는 이 연작을 대안 공간에서 코엑스 전시장까지 이어 왔다 — 〈김치〉(2019,
                        대안예술공간이포)와 〈GALLERIE LUTÈCE PRESENTS_김치〉(2024, 코엑스, 서울) —
                        가장 낮고 가정적인 물질을 한국적 정체성에 대한 지속적 탐구의 한가운데에
                        둔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. DMZ, 분단의 풍경 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The DMZ — peace as a sustained subject'
                    : 'DMZ — 지속적 주제로서의 평화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2018, Lee Hyeonjeong was selected as an artist for the 〈DMZ Art Festa —
                        Peace: Wind〉, held in conjunction with the PyeongChang Winter Olympics and
                        Paralympics across the Goseong Unification Observatory, the DMZ Museum,
                        Gwanghwamun Square, and Festival Park PyeongChang. From that point, the
                        demilitarized zone became a recurring ground for her work.
                      </p>
                      <p>
                        The DMZ is a paradox: a strip of land emptied by division and, in that
                        emptying, returned to wildness. Her engagement with it runs through a series
                        of group exhibitions on division and its aftermath — 〈After the DMZ, Breath
                        of the Earth〉 (2021, Yangpyeong Art Museum), the Changwon Sculpture
                        Biennale Transborder Project (2022), and 〈80 Years of Liberation: DMZ
                        International Art Exchange Project_Transborder〉 (2025, Goseong DMZ Museum ·
                        Unification Observatory).
                      </p>
                      <p>
                        Across these works, peace is not a slogan but a condition to be examined —
                        the wind that crosses a border no person may cross, the breath of a land
                        held in suspension. Her work entered the collection of the Goseong DMZ
                        Museum in 2018.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2018년, 이현정은 평창동계올림픽·패럴림픽과 함께 고성통일전망대, DMZ박물관,
                        광화문광장, 페스티벌파크 평창에서 열린 〈DMZ 아트페스타—평화: 바람〉의
                        작가로 선정됐다. 그 이후 비무장지대는 그의 작업에 거듭 돌아오는 터전이 됐다.
                      </p>
                      <p>
                        DMZ는 역설이다: 분단으로 비워졌고, 그 비워짐 속에서 야생으로 돌아간 땅. 그
                        땅에 대한 그의 작업은 분단과 그 이후를 다룬 일련의 단체전을 가로지른다 —
                        〈DMZ 이후, 대지의 숨결〉(2021, 양평군립미술관), 창원조각비엔날레 탈경계
                        프로젝트(2022), 그리고 〈광복 80주년 DMZ 국제예술교류
                        프로젝트_탈경계〉(2025, 고성 DMZ박물관·통일전망대).
                      </p>
                      <p>
                        이 작업들에서 평화는 구호가 아니라 들여다보아야 할 상태다 — 누구도 건널 수
                        없는 경계를 건너는 바람, 유예된 채로 멈춰 선 땅의 숨. 그의 작품은 2018년
                        고성 DMZ박물관 소장품이 됐다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 베를린에서 DMZ로 — 탈경계의 예술 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From Berlin to the DMZ — a borderless art'
                    : '베를린에서 DMZ로 — 탈경계의 예술'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2023, Lee Hyeonjeong was invited to 〈UTOPIA?! PEACE〉, a project staged
                        across Kunstraum Potsdam, the Berlin Wall Memorial at Bernauer Straße, and
                        Babelsberg Palace in Germany. She was selected for the project by the Berlin
                        Wall Foundation and Kunstraum Potsdam.
                      </p>
                      <p>
                        The site itself is the argument. Bernauer Straße is where the Berlin Wall
                        ran directly between buildings, where a divided city&apos;s wound is most
                        legible. To bring an artist of the Korean DMZ to that exact line is to set
                        two divided histories side by side — one whose wall has fallen, one whose
                        border still holds. Her transborder works ask what the fallen wall can teach
                        the standing one.
                      </p>
                      <p>
                        This international dimension has continued: 〈FREEDOM 2023〉 at the Fukuoka
                        Asian Art Museum, the Kathmandu Contemporary Art Exhibition (2020, Nepal Art
                        Council), and the recognition of the Fukuoka Art Award in 2024. From a
                        sealed kimchi jar to a fallen wall, Lee Hyeonjeong&apos;s work keeps
                        returning to the same question — how a border holds, and how it might be
                        crossed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2023년, 이현정은 독일 Kunstraum Potsdam, 베를린 장벽 기념관(Bernauer
                        Straße), Babelsberg Palace에 걸쳐 펼쳐진 〈UTOPIA?! PEACE〉에 초청됐다. 그는
                        Berlin Wall Foundation과 Kunstraum Potsdam에 의해 이 프로젝트에 선정됐다.
                      </p>
                      <p>
                        장소 자체가 주장이 된다. Bernauer Straße는 베를린 장벽이 건물과 건물 사이로
                        곧장 지나갔던 곳, 분단된 도시의 상처가 가장 또렷이 읽히는 자리다. 한국 DMZ의
                        작가를 바로 그 선 위로 데려가는 것은 두 개의 분단된 역사를 나란히 세우는
                        일이다 — 장벽이 무너진 쪽과, 경계가 아직 버티는 쪽. 그의 탈경계 작업은
                        무너진 장벽이 서 있는 경계에 무엇을 가르칠 수 있는가를 묻는다.
                      </p>
                      <p>
                        이 국제적 차원은 이어진다: 후쿠오카 아시아미술관 〈FREEDOM 2023〉, 카트만두
                        컨템포러리(2020, Nepal Art Council), 그리고 2024년 후쿠오카 아트 어워드의
                        인정. 봉인된 김치 항아리에서 무너진 장벽까지, 이현정의 작업은 같은 물음으로
                        거듭 돌아온다 — 경계는 어떻게 버티며, 또 어떻게 건널 수 있는가.
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
                      A jar of kimchi and a strip of demilitarized land seem to have nothing in
                      common — until you notice that both are spaces of suspended time, of a
                      transformation held in waiting. Lee Hyeonjeong&apos;s work moves between them,
                      from fermented identity to drawn-out borders, asking how a people becomes
                      itself and how a division might one day be undone. She joins this campaign not
                      as a subject of its cause but as a fellow artist in solidarity — so that those
                      who come after might cross more easily the borders she has spent her work
                      mapping.
                    </>
                  ) : (
                    <>
                      김치 한 항아리와 비무장지대의 한 자락은 아무 공통점이 없어 보인다 — 둘 다
                      유예된 시간의 공간, 기다림 속에 멈춰 선 변형의 공간임을 알아채기 전까지는.
                      이현정의 작업은 그 둘 사이를 오간다, 발효된 정체성에서 그어진 경계까지, 한
                      민족이 어떻게 자기 자신이 되는가와 분단이 언젠가 어떻게 풀릴 수 있는가를
                      물으며. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 다음 세대의 예술인들이 그가 작업으로 그려 온 경계를 더 수월히 건널
                      수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Lee Hyeonjeong
              </span>
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
                    Lee Hyeonjeong joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이현정 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_HYEONJEONG_PATH}
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
