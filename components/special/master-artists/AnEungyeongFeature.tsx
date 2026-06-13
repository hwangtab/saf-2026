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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/안은경)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const AN_EUNGYEONG_PATH = `/artworks/artist/${encodeURIComponent('안은경')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isAnEungyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '안은경' ||
    n === 'an eun-gyeong' ||
    n === 'an eungyeong' ||
    n.replace(/[\s-]+/g, '') === 'aneungyeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '안은경 — 여행가방의 작가, 떠남과 회복의 동양화',
    description:
      "동양화에 기반을 둔 중견 작가 안은경. '여행가방'을 현대인의 불안과 소외, 그리고 회복의 심리적 안식처로 그려온 작가입니다. 홍익대 동양화과 박사, 서울·뉴욕·도쿄를 오간 개인전의 여정을 씨앗페 온라인에서 감상하고 소장하세요.",
    ogDescription:
      "안은경 — 여행가방의 작가. '여행가방' 속 가상 공간으로 일상의 무게를 내려놓고 자신을 향해 떠나는 회복의 시간을 그리는 동양화.",
    ogAlt: '안은경 대표 작품',
    twitterTitle: '안은경',
    twitterDescription: '누구에게나 떠날 수 있는 빈 가방 하나 — 떠남과 회복의 작가 안은경',
    keywords: '안은경 작가, 여행가방, 동양화, 홍익대 동양화, 울산 작가, 씨앗페 온라인',
  },
  en: {
    title: 'An Eun-gyeong — The Artist of the Suitcase: Departure and Recovery',
    description:
      "Selected works by An Eun-gyeong, a mid-career artist rooted in Korean ink painting (dongyanghwa). Through the motif of the 'suitcase,' she renders the anxiety and isolation of modern life — and the suitcase as a psychological refuge for recovery. A Ph.D. in Oriental Painting from Hongik University whose solo exhibitions have traveled across Seoul, New York, and Tokyo. View and collect her works at SAF Online.",
    ogDescription:
      'An Eun-gyeong — the artist of the suitcase. Through the virtual space inside a suitcase, she paints the time of recovery: setting down the weight of the everyday and departing toward oneself.',
    ogAlt: 'An Eun-gyeong — featured work',
    twitterTitle: 'An Eun-gyeong',
    twitterDescription:
      'Everyone keeps an empty suitcase to leave with — An Eun-gyeong, artist of departure and recovery',
    keywords:
      'An Eun-gyeong artist, suitcase, Korean ink painting, dongyanghwa, Oriental painting, SAF Online',
  },
} as const;

export async function buildAnEungyeongMetadata({
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
  const pageUrl = buildLocaleUrl(AN_EUNGYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('안은경');
  const artwork = allArtworks.find((a) => isAnEungyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — An Eun-gyeong`
      : `${artwork.title} — 안은경`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(AN_EUNGYEONG_PATH, locale, true),
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

export default async function AnEungyeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(AN_EUNGYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('안은경');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isAnEungyeongArtist(artwork.artist)
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
    { name: isEnglish ? 'An Eun-gyeong' : '안은경', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${AN_EUNGYEONG_PATH}#person-an-eungyeong`,
    name: isEnglish ? 'An Eun-gyeong' : '안은경',
    alternateName: isEnglish ? '안은경' : 'An Eun-gyeong',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? "An Eun-gyeong is a mid-career Korean artist rooted in ink painting (dongyanghwa) who explores the 'suitcase' as a symbol of modern anxiety, isolation, and a psychological refuge for recovery."
      : "안은경은 동양화에 기반을 둔 중견 작가로, '여행가방'을 현대인의 불안과 소외, 그리고 회복의 심리적 안식처로 탐구해 왔습니다.",
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University, Ph.D. in Oriental Painting'
        : '홍익대학교 미술대학 동양화과 박사',
    },
    knowsAbout: isEnglish
      ? ['Korean ink painting', 'Oriental painting', 'Suitcase as motif']
      : ['동양화', '여행가방 모티프', '회복의 풍경'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'An Eun-gyeong — SAF Online' : '안은경 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by An Eun-gyeong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 안은경 작품들을 소개합니다.',
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
        {/* Hero Section — 여행가방·여정 모티프. chrome은 charcoal scale 유지, 색은 작품에서만. */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 여정의 결 — 떠남의 궤도를 암시하는 가로 지평선 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 bottom-1/3 h-px w-full bg-primary/30" />
          <div className="absolute right-12 top-0 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'An Eun-gyeong · Ink Painting' : '안은경 · 동양화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  An empty suitcase
                  <br />
                  <span className="text-primary-soft">to depart toward oneself</span>
                </>
              ) : (
                <>
                  자신을 향해 떠나는
                  <br />
                  <span className="text-primary-soft">빈 가방 하나</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The suitcase is not a tool for carrying luggage, but a refuge.
                  </span>
                  <span className="mt-2 block">
                    A virtual space where the weight of the everyday is set down.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">여행가방은 짐을 옮기는 도구가 아니라 안식처다.</span>
                  <span className="mt-2 block">일상의 무게를 내려놓는 가방 속 가상 공간.</span>
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
                    The suitcase —<br />
                    <span className="text-primary-strong">a refuge of departure and recovery</span>
                  </>
                ) : (
                  <>
                    여행가방 —<br />
                    <span className="text-primary-strong">떠남과 회복의 안식처</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      An Eun-gyeong is a mid-career artist rooted in Korean ink painting
                      (dongyanghwa). She earned her Ph.D. in Oriental Painting from the College of
                      Fine Arts at Hongik University, and has taught as a visiting professor at the
                      University of Ulsan and as a lecturer at Kyungsung, Chosun, and Ulsan
                      Universities.
                    </p>
                    <p>
                      Across her practice, a single object returns again and again: the suitcase. In
                      her words, the suitcase &ldquo;is not simply a tool for carrying luggage, but
                      something that holds the anxiety and isolation of modern life, a psychological
                      refuge for the search toward a new self.&rdquo; We live along the orbit of a
                      repeating everyday — yet each of us, she suggests, keeps one empty suitcase of
                      our own, ready to be packed and carried away at any moment.
                    </p>
                    <p>
                      Through the virtual space she builds inside the suitcase, An offers
                      consolation for the weariness of the real. Her hope, in her own words, is that
                      viewers might &ldquo;set down, however briefly, the weight of the everyday,
                      and experience a time of recovery that departs toward the self alone.&rdquo;
                      The tone of the work is warm: not escape, but rest; not flight, but return.
                    </p>
                    <p>
                      That sense of journey runs through her exhibition history as well. From{' '}
                      <em>Joy of Voyage</em> and <em>Only Dream-ing Traveler</em> to{' '}
                      <em>The Journey to The Recovery</em>, <em>&ldquo;Boundary&rdquo; Travel</em>,
                      and the 2024 <em>Rumination</em>, the titles themselves trace a path of
                      leaving and coming back — solo shows that have moved between Seoul, Tokyo, New
                      York, and Ulsan.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      안은경은 동양화에 기반을 둔 중견 작가다. 홍익대학교 미술대학 동양화과에서 박사
                      학위를 받았으며, 울산대학교 객원교수를 역임하고 경성대·조선대·울산대에서
                      강사로 가르쳤다.
                    </p>
                    <p>
                      그의 작업에는 하나의 사물이 거듭 돌아온다 — 여행가방. 작가의 말처럼 여행가방은
                      &ldquo;단순히 짐을 옮기는 도구가 아니라, 현대인의 불안과 소외를 담아내며
                      새로운 자아를 찾아가는 심리적 안식처&rdquo;를 상징한다. 우리는 반복되는
                      일상이라는 궤도 위에서 살아가지만, 누구에게나 언제든 짐을 꾸려 떠날 수 있는
                      자기만의 빈 가방 하나쯤은 지니고 있다는 것이다.
                    </p>
                    <p>
                      안은경은 가방 속에 구축한 가상 공간을 통해 현실의 고단함을 위로한다. 작가의
                      바람은 관객들이 &ldquo;잠시나마 일상의 무게를 내려놓고, 자신만을 향해 떠나는
                      회복의 시간을 경험&rdquo;하는 것이다. 작업의 톤은 따뜻하다 — 도피가 아니라
                      쉼이고, 탈출이 아니라 돌아옴이다.
                    </p>
                    <p>
                      그 여정의 정서는 전시 이력에도 흐른다. <em>「Joy of Voyage」</em>와{' '}
                      <em>「Only Dream-ing Traveler」</em>부터{' '}
                      <em>「The Journey to The Recovery」</em>, <em>「바운더리(Boundary)여행」</em>,
                      그리고 2024년 <em>「반추(反芻)」</em>까지 — 제목 자체가 떠나고 돌아오는 길을
                      그린다. 서울·도쿄·뉴욕·울산을 오가며 이어진 개인전들이다.
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
                        {isEnglish ? 'The suitcase as refuge' : '안식처로서의 여행가방'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not a tool for carrying luggage, but a vessel for modern anxiety and isolation — a psychological refuge for the search toward a new self.'
                          : '짐을 옮기는 도구가 아니라 현대인의 불안과 소외를 담는 그릇. 새로운 자아를 찾아가는 심리적 안식처다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A virtual space within' : '가방 속 가상 공간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Inside the suitcase she builds a virtual space that consoles the weariness of the real — a place to set down the weight of the everyday.'
                          : '가방 속에 구축한 가상 공간으로 현실의 고단함을 위로한다. 일상의 무게를 내려놓는 자리다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The time of recovery' : '회복의 시간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A warm gaze toward rest and return — a departure toward oneself rather than escape, rooted in the texture of Korean ink painting.'
                          : '쉼과 돌아옴을 향하는 따뜻한 시선. 도피가 아닌 자신을 향한 떠남을, 동양화의 결 위에 담는다.'}
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
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Gallery Spacs pause, Tokyo.'
                        : '개인전, Gallery Spacs pause, 도쿄.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Joy within Deviation〉, Gallery Young, Seoul.'
                        : '개인전 「일탈 속 즐거움」, Gallery Young, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Joy of Voyage〉 — Gallery HOSI, Tokyo; Young Art Gallery, Seoul.'
                        : '「Joy of Voyage」 — Gallery HOSI, 도쿄; 영아트갤러리, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Only Dream-ing Traveler〉 — THE K Gallery & Hwabong Gallery, Seoul.'
                        : '「Only Dream-ing Traveler」 — THE K Gallery·화봉갤러리, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'ARPNY Artist Residency Program, New York; Special Award, 18th Ulsan Art Exhibition.'
                        : 'ARPNY 레지던시, 뉴욕; 제18회 울산미술대전 특별상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, THE WHEEL HOUSE, New York.'
                        : '개인전, THE WHEEL HOUSE, 뉴욕.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Caffebene Time Square, New York.'
                        : '개인전, Caffebene Time Square, 뉴욕.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Journey to The Recovery〉 — Gana Art Space, Seoul.'
                        : '「The Journey to The Recovery」 — 가나아트스페이스, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈"Boundary" Travel〉 — Buk-gu Culture & Arts Center, Ulsan.'
                        : '「바운더리(Boundary)여행」 — 북구문화예술회관, 울산.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Rumination〉 — Gagi Gallery, Ulsan.'
                        : '「반추(反芻)」 — 가기갤러리, 울산.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Awards & collections' : '수상 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Special Award, 18th Ulsan Art Exhibition (2014); Selected, 28th Grand Art Exhibition of Korea (2008).'
                        : '제18회 울산미술대전 특별상(2014); 제28회 대한민국미술대전 입선(2008).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Special Selection, 36th Gusangjeon & 9th Danwon Art Exhibition (2007); Special Selection, 34th Gusangjeon (2005).'
                        : '제36회 구상전 특선·제9회 단원미술대전 특선(2007); 제34회 구상전 특선(2005).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Ulsan Culture & Arts Center, University of Ulsan, Ulju World Mountain Film Festival, corporate and private collections.'
                        : '소장: 울산문화예술회관, 울산대학교, 울주세계산악영화제, 기업·개인 소장.'}
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
                  <span className="text-charcoal-deep">on the suitcase and the journey</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">여행가방과 여정에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 여행가방이라는 사물 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Why a suitcase — the object as inner space'
                    : '왜 여행가방인가 — 내면의 공간이 된 사물'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A suitcase is an everyday object, easy to overlook. We fill it, close it,
                        carry it, and set it down. In An Eun-gyeong&apos;s work, that ordinary thing
                        is turned inside out: the suitcase becomes not a container for clothes but a
                        container for a state of mind. It holds, in her words, &ldquo;the anxiety
                        and isolation of modern life,&rdquo; and at the same time offers &ldquo;a
                        psychological refuge for the search toward a new self.&rdquo;
                      </p>
                      <p>
                        The choice is precise. A suitcase already belongs to the grammar of leaving;
                        no one packs a bag to stay. By making it the central motif, An lets a single
                        familiar form carry the whole weight of a wish — the wish to be able to go,
                        even if one never does. The bag need not be used. It is enough that it
                        exists, empty and ready, somewhere within reach.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        여행가방은 흔하고 쉽게 지나치는 사물이다. 우리는 그것을 채우고, 닫고, 들고,
                        내려놓는다. 안은경의 작업에서 그 평범한 물건은 안팎이 뒤집힌다. 가방은 옷을
                        담는 그릇이 아니라 마음의 상태를 담는 그릇이 된다. 그것은 작가의 말처럼
                        &ldquo;현대인의 불안과 소외&rdquo;를 담아내며, 동시에 &ldquo;새로운 자아를
                        찾아가는 심리적 안식처&rdquo;가 된다.
                      </p>
                      <p>
                        선택은 정확하다. 가방은 이미 떠남의 문법에 속한다 — 머물기 위해 짐을 싸는
                        사람은 없다. 안은경은 이 익숙한 형태를 중심 모티프로 삼아, 하나의 사물이 한
                        가지 소망의 무게를 온전히 짊어지게 한다. 끝내 떠나지 않더라도 떠날 수 있기를
                        바라는 마음. 가방은 쓰이지 않아도 된다. 빈 채로, 떠날 준비가 된 채로, 손이
                        닿는 어딘가에 있다는 것으로 충분하다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 일상의 궤도와 빈 가방 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The orbit of the everyday — and the empty bag we keep'
                    : '일상의 궤도 — 그리고 우리가 지닌 빈 가방'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        We live, the artist observes, along the orbit of a repeating everyday. The
                        days turn; the route is fixed. And yet, she suggests, each of us keeps one
                        empty suitcase of our own — ready to be packed and carried away at any
                        moment. The painting does not ask us to break the orbit. It asks us to
                        notice the bag that has been there all along.
                      </p>
                      <p>
                        Inside the suitcase, An constructs a virtual space — an interior that
                        consoles the weariness of the real. This is the quiet argument of the work:
                        recovery does not require escape. It requires only the knowledge that
                        departure is possible. The image of the empty bag is, in this sense,
                        generous. It does not demand a journey. It keeps the door open.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        작가는 말한다. 우리는 반복되는 일상이라는 궤도 위에서 살아간다고. 날들은
                        돌고, 경로는 정해져 있다. 그럼에도 누구에게나 언제든 짐을 꾸려 떠날 수 있는
                        자기만의 빈 가방 하나쯤은 있다고 그는 말한다. 그림은 궤도를 깨라고 요구하지
                        않는다. 줄곧 거기 있던 가방을 알아보라고 청할 뿐이다.
                      </p>
                      <p>
                        가방 속에서 안은경은 가상 공간을 구축한다 — 현실의 고단함을 위로하는 내면.
                        그것이 이 작업의 조용한 주장이다. 회복은 도피를 요구하지 않는다. 떠남이
                        가능하다는 앎만을 요구한다. 빈 가방의 이미지는 그런 의미에서 너그럽다.
                        여정을 강요하지 않는다. 다만 문을 열어 둔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 떠남에서 회복으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From departure to recovery — a journey read through titles'
                    : '떠남에서 회복으로 — 제목으로 읽는 여정'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Read in sequence, An Eun-gyeong&apos;s solo exhibitions trace an arc. The
                        early shows speak the language of setting out: <em>Joy of Voyage</em>{' '}
                        (2009), <em>Only Dream-ing Traveler</em> (2012). The voyage is still a
                        dream, still a joy. Then the vocabulary shifts toward return and repair:{' '}
                        <em>The Journey to The Recovery</em> (2017),{' '}
                        <em>&ldquo;Boundary&rdquo; Travel</em> (2022), and most recently{' '}
                        <em>Rumination</em> (2024) — to ruminate is to bring something back, to chew
                        it over slowly, to take it in again.
                      </p>
                      <p>
                        The geography of these shows is itself a journey: Tokyo, Seoul, New York,
                        Ulsan. Yet the destination the work keeps pointing toward is not a place on
                        a map. It is the self — &ldquo;a time of recovery that departs toward the
                        self alone.&rdquo; The suitcase, finally, is round-trip. One leaves in order
                        to come back changed, lighter, restored.
                      </p>
                      <p>
                        An Eun-gyeong joins this campaign not as a subject of its cause but as a
                        fellow artist in solidarity — offering her work so that another artist might
                        find, today, the room to set down their own weight.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        순서대로 읽으면, 안은경의 개인전들은 하나의 곡선을 그린다. 초기 전시는
                        떠남의 언어를 말한다. <em>「Joy of Voyage」</em>(2009),{' '}
                        <em>「Only Dream-ing Traveler」</em>(2012). 항해는 아직 꿈이고, 아직
                        즐거움이다. 그러다 어휘는 돌아옴과 회복 쪽으로 옮겨 간다.{' '}
                        <em>「The Journey to The Recovery」</em>(2017),{' '}
                        <em>「바운더리(Boundary)여행」</em>(2022), 그리고 가장 최근의{' '}
                        <em>「반추(反芻)」</em>(2024) — 반추란 무언가를 다시 불러와, 천천히 곱씹어,
                        다시 받아들이는 일이다.
                      </p>
                      <p>
                        이 전시들의 지리 자체가 여정이다. 도쿄, 서울, 뉴욕, 울산. 그러나 작업이 거듭
                        가리키는 목적지는 지도 위의 장소가 아니다. 그것은 자신 — &ldquo;자신만을
                        향해 떠나는 회복의 시간&rdquo;이다. 여행가방은 끝내 왕복이다. 떠나는 것은
                        달라져서, 가벼워져서, 회복되어 돌아오기 위함이다.
                      </p>
                      <p>
                        안은경은 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                        연대자로서 함께한다 — 다른 예술인이 오늘 자신의 무게를 내려놓을 자리를 찾을
                        수 있도록 작품을 내놓는다.
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
                      From Tokyo to New York to Ulsan, An Eun-gyeong&apos;s work has returned, again
                      and again, to one quiet object and one quiet wish: that we might set down the
                      weight of the everyday and depart, however briefly, toward ourselves — and
                      come back restored.
                    </>
                  ) : (
                    <>
                      도쿄에서 뉴욕으로, 다시 울산으로, 안은경의 작업은 하나의 조용한 사물과 하나의
                      조용한 소망으로 거듭 돌아왔다. 일상의 무게를 내려놓고, 잠시나마 자신을 향해
                      떠나, 회복되어 돌아오기를.
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
                JOURNEY
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
              <span className="text-xs text-white/70 uppercase tracking-widest">An Eun-gyeong</span>
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
                    An Eun-gyeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    안은경 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={AN_EUNGYEONG_PATH}
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
