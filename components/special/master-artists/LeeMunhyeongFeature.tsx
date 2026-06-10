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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/이문형)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_MUNHYEONG_PATH = `/artworks/artist/${encodeURIComponent('이문형')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeMunhyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이문형' ||
    n === 'lee mun-hyeong' ||
    n === 'lee munhyeong' ||
    n.replace(/[\s-]+/g, '') === 'leemunhyeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이문형 — 민화의 비상, 전통 도상을 현대로',
    description:
      '한국 전통 민화의 도상과 색채를 현대 회화로 풀어내는 민화 작가 이문형. 까치호랑이·화조·책가도 같은 길상(吉祥)의 도상과 화사한 색채를 반복과 패턴의 현대적 화면으로 재해석한다. 한뼘미술관(천안) 첫 개인전을 연 중견 작가 이문형의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '민화의 도상과 색채를 현대로 — 까치호랑이·화조·책가도의 길상을 반복과 패턴으로 재해석하는 민화 작가 이문형.',
    ogAlt: '이문형 대표 작품',
    twitterTitle: '이문형',
    twitterDescription: '민화의 비상 — 전통 도상을 현대로 풀어내는 민화 작가 이문형',
    keywords:
      '이문형 작가, 민화, 현대 민화, 까치호랑이, 화조도, 책가도, 문자도, 길상, 반복과 패턴, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Mun-hyeong — Minhwa Reborn, Tradition Made Contemporary',
    description:
      'Selected works by Lee Mun-hyeong, a minhwa (Korean folk painting) artist who reinterprets the iconography and palette of Korean folk painting in contemporary terms. The auspicious motifs of magpie-and-tiger, flower-and-bird, and the scholar’s bookshelf are recast through repetition and pattern. View and collect the works of this mid-career artist — who held her first solo show at Hanppyeom Museum in Cheonan — at SAF Online.',
    ogDescription:
      'Minhwa made contemporary — Lee Mun-hyeong reinterprets the auspicious iconography of Korean folk painting through repetition and pattern.',
    ogAlt: 'Lee Mun-hyeong — featured work',
    twitterTitle: 'Lee Mun-hyeong',
    twitterDescription: 'Minhwa reborn — folk-painting iconography made contemporary',
    keywords:
      'Lee Mun-hyeong artist, minhwa, Korean folk painting, contemporary minhwa, magpie and tiger, flower and bird, chaekgado, repetition and pattern',
  },
} as const;

export async function buildLeeMunhyeongMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_MUNHYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이문형');
  const artwork = allArtworks.find((a) => isLeeMunhyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Mun-hyeong`
      : `${artwork.title} — 이문형`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_MUNHYEONG_PATH, locale, true),
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

export default async function LeeMunhyeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_MUNHYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이문형');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isLeeMunhyeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Lee Mun-hyeong' : '이문형', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_MUNHYEONG_PATH}#person-lee-munhyeong`,
    name: isEnglish ? 'Lee Mun-hyeong' : '이문형',
    alternateName: isEnglish ? '이문형' : 'Lee Mun-hyeong',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Lee Mun-hyeong is a mid-career minhwa (Korean folk painting) artist who reinterprets the iconography and palette of Korean folk painting in contemporary terms, working through repetition and pattern.'
      : '이문형은 한국 전통 민화의 도상과 색채를 반복과 패턴의 현대 회화로 풀어내는 중견 민화 작가입니다.',
    knowsAbout: ['Minhwa', 'Korean folk painting', 'Magpie and tiger', 'Chaekgado'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Mun-hyeong — SAF Online' : '이문형 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Mun-hyeong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이문형 작품들을 소개합니다.',
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
        {/* Hero Section — 민화 길상의 밝은 톤, chrome 배경은 화이트 스케일 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-charcoal/10 bg-canvas-strong">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Repetition & pattern 모티프 — 민화의 반복하는 격자 */}
          <div className="absolute top-0 left-8 h-full w-px bg-charcoal/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-charcoal/10" />
          <div className="absolute top-12 left-0 w-full h-px bg-charcoal/5" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Mun-hyeong · Minhwa' : '이문형 · 민화(民畵)'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-charcoal-deep tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Folk painting,
                  <br />
                  <span className="text-primary-strong">reborn in repetition</span>
                </>
              ) : (
                <>
                  민화의 길상이
                  <br />
                  <span className="text-primary-strong">오늘의 화면으로</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-charcoal max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-charcoal/15 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The auspicious icons of Korean folk painting — magpie and tiger, flower and
                    bird, the scholar&apos;s bookshelf.
                  </span>
                  <span className="mt-2 block">
                    Recast through repetition, pattern, and a vivid contemporary palette.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">까치호랑이, 화조, 책가도 — 민화의 길상(吉祥)을.</span>
                  <span className="mt-2 block">
                    반복과 패턴, 화사한 색채의 현대 회화로 다시 그리다.
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
                    Tradition, repeated —<br />
                    <span className="text-primary-strong">an old grammar made new</span>
                  </>
                ) : (
                  <>
                    반복되는 전통 —<br />
                    <span className="text-primary-strong">옛 문법을 새 화면으로</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Mun-hyeong is a mid-career minhwa artist who reinterprets the iconography
                      and palette of Korean folk painting in contemporary terms. Minhwa — the folk
                      painting tradition of the late Joseon period — was never the art of court
                      academies. It was painted for ordinary homes: bright, frontal, and unafraid of
                      repetition, carrying wishes for long life, good fortune, and protection from
                      harm.
                    </p>
                    <p>
                      Her work takes up that grammar directly. The magpie-and-tiger, the
                      flower-and-bird, the scholar&apos;s bookshelf (chaekgado), the ten symbols of
                      longevity — these auspicious motifs return in her canvases not as quotation
                      but as living structure, arranged through{' '}
                      <strong className="font-bold text-charcoal-deep">
                        repetition and pattern
                      </strong>
                      . Where the old folk painters filled a folding screen with rhythmic
                      recurrence, she lets that recurrence become the very subject of the picture.
                    </p>
                    <p>
                      She held her first solo exhibition,{' '}
                      <em>Lee Mun-hyeong Solo Exhibition 2025</em>, at Hanppyeom Museum in Cheonan.
                      She has taken part in some twenty group exhibitions, including{' '}
                      <em>Minhwa Reborn — Chapter 6: Repetition and Pattern</em> at the Korea Museum
                      of Art, and presented a solo booth at the 7th Korea Minhwa Art Fair (SETEC).
                    </p>
                    <p>
                      Her practice was recognised with the Award of Excellence at the 13th
                      Contemporary Minhwa Open Call — a sign that folk painting, far from a museum
                      relic, remains a living language for artists working now. In her hands the
                      bright, auspicious tones of minhwa and its free, unbounded imagination are
                      carried into the present.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이문형은 한국 전통 민화의 도상과 색채를 현대 회화로 풀어내는 중견 민화 작가다.
                      민화(民畵)는 조선 후기 서민의 그림이었다. 궁중 화원의 예술이 아니라 여느
                      살림집을 위해 그려진 그림 — 밝고, 정면을 향하며, 반복을 두려워하지 않고,
                      장수와 복(福), 액막이의 염원을 담은 그림이었다.
                    </p>
                    <p>
                      그의 작업은 그 문법을 정면으로 이어받는다. 까치호랑이, 화조(花鳥),
                      책가도(冊架圖), 십장생 — 이 길상의 도상들이 그의 화면에서 인용이 아니라 살아
                      있는 구조로 돌아온다.{' '}
                      <strong className="font-bold text-charcoal-deep">반복과 패턴</strong>으로
                      배열되며, 옛 민화가 병풍을 리드미컬한 되풀이로 채웠듯, 그는 그 되풀이 자체를
                      그림의 주제로 삼는다.
                    </p>
                    <p>
                      그는 천안 한뼘미술관에서 첫 개인전 〈이문형 개인전 2025〉를 열었다. 한국미술관
                      〈민화의 비상전—제6장. 반복과 패턴〉을 비롯해 20여 회의 단체전에 참여했고,
                      제7회 대한민국 민화아트페어(SETEC)에서 개인 부스전을 선보였다.
                    </p>
                    <p>
                      그의 작업은 제13회 현대민화공모전 우수상으로 평가받았다 — 민화가 박물관의
                      유물이 아니라 지금 작업하는 이들에게 여전히 살아 있는 언어임을 보여주는
                      신호다. 그의 손에서 민화의 밝고 길상적인 톤과 자유분방한 상상력이 오늘로
                      이어진다.
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
                        {isEnglish ? 'Auspicious iconography' : '길상의 도상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Magpie-and-tiger, flower-and-bird, the scholar’s bookshelf — folk motifs that carried wishes for fortune, long life, and protection are reread as contemporary form.'
                          : '까치호랑이·화조·책가도 — 복과 장수, 액막이의 염원을 담던 민화 도상을 현대적 형식으로 다시 읽는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Repetition and pattern' : '반복과 패턴'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The rhythmic recurrence that filled folk-painting folding screens becomes the very subject — pattern as structure rather than decoration.'
                          : '민화 병풍을 채우던 리드미컬한 되풀이가 그림의 주제가 된다 — 장식이 아니라 구조로서의 패턴.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Vivid colour, free imagination'
                          : '화사한 색채, 자유로운 상상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The bright, fearless palette and the unbounded imagination of folk painting — carried into the present as a living language.'
                          : '민화 특유의 밝고 거침없는 색채와 자유분방한 상상력을, 오늘의 살아 있는 언어로 잇는다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's path" : '작가의 행보'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Solo' : '개인전'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition 〈Lee Mun-hyeong Solo Exhibition 2025〉, Hanppyeom Museum, Cheonan.'
                        : '첫 개인전 〈이문형 개인전 2025〉, 한뼘미술관(천안).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Booth' : '부스전'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo booth at the 7th Korea Minhwa Art Fair (SETEC).'
                        : '제7회 대한민국 민화아트페어(SETEC) 개인 부스전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Group' : '단체전'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Minhwa Reborn — Chapter 6: Repetition and Pattern〉, Korea Museum of Art; some twenty group exhibitions in all.'
                        : '한국미술관 〈민화의 비상전—제6장. 반복과 패턴〉 등 단체전 20여 회.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Award' : '수상'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award of Excellence, 13th Contemporary Minhwa Open Call.'
                        : '제13회 현대민화공모전 우수상 수상.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'The grammar of minhwa' : '민화의 문법'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Magpie-and-tiger (jakhodo): the tiger wards off misfortune, the magpie brings good news.'
                        : '까치호랑이(작호도): 호랑이는 액막이, 까치는 좋은 소식을 전하는 길상.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Flower-and-bird (hwajodo): flowers and birds painted for marriage chambers and inner rooms, wishing harmony and fortune.'
                        : '화조도(花鳥圖): 꽃과 새를 신방·안방 장식으로 그려 화목과 복을 빌던 그림.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "The scholar's bookshelf (chaekgado): books and stationery arrayed in shelves, a wish for learning and refinement."
                        : '책가도(冊架圖): 책과 문방사우를 서가에 늘어놓아 학문과 교양을 기원한 그림.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ten symbols of longevity (sipjangsaeng): sun, mountain, pine, crane, deer, turtle and more, gathered as a wish for long life.'
                        : '십장생도(十長生圖): 해·산·소나무·학·사슴·거북 등을 모아 불로장생을 기원한 그림.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 민화 길상 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on folk painting made new</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">새로워진 민화에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 서민의 그림에서 동시대의 회화로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? "From the people's painting to a contemporary canvas"
                    : '서민의 그림에서 동시대의 회화로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Minhwa is, by definition, the painting of the people. It flourished in the
                        late Joseon period not in court academies but in ordinary homes — folding
                        screens for a newlywed&apos;s room, a tiger pasted by the front gate, a
                        bookshelf painted where there were no books. Its makers were often
                        anonymous, its wishes plain: live long, prosper, be protected from harm.
                      </p>
                      <p>
                        That plainness is precisely its strength. Free of academic rule, minhwa
                        could be frontal, bright, and gloriously repetitive — a grammar of
                        recurrence rather than perspective. Lee Mun-hyeong takes up this inheritance
                        not as nostalgia but as a working method. The auspicious icons return in her
                        canvases as living structure, the old wish for good fortune translated into
                        a contemporary surface.
                      </p>
                      <p>
                        In recent years museums and open calls have made clear that folk painting is
                        no relic. Korea&apos;s dedicated minhwa institutions now show contemporary
                        practitioners alongside Joseon-era screens, tracing a single tradition
                        across centuries. Lee&apos;s work belongs to that arc — proof that an old
                        vernacular can still speak now.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민화는 글자 그대로 백성의 그림이다. 조선 후기, 그것은 궁중 화원이 아니라
                        여느 살림집에서 번성했다 — 신혼 방을 위한 병풍, 대문 앞에 붙인 호랑이, 책이
                        없는 자리에 그려 넣은 책가도. 그린 이는 흔히 이름이 없었고, 그 염원은
                        소박했다: 오래 살고, 복을 누리고, 액을 피하기를.
                      </p>
                      <p>
                        그 소박함이 바로 힘이다. 화단의 규범에서 자유로웠기에 민화는 정면을 향하고,
                        밝고, 거리낌 없이 반복될 수 있었다 — 원근이 아니라 되풀이의 문법. 이문형은
                        이 유산을 향수가 아니라 작업의 방법으로 이어받는다. 길상의 도상들이 그의
                        화면에서 살아 있는 구조로 돌아오고, 복을 비는 옛 마음이 동시대의 표면으로
                        번역된다.
                      </p>
                      <p>
                        근래 박물관과 공모전은 민화가 유물이 아님을 분명히 보여 왔다. 국내 민화 전문
                        기관들은 이제 조선의 병풍과 현대 작가의 작업을 나란히 걸어, 수 세기를
                        가로지른 하나의 전통을 짚는다. 이문형의 작업은 그 궤적 위에 있다 — 옛 토착
                        언어가 지금도 말할 수 있다는 증거로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 반복과 패턴 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Repetition and pattern — recurrence as subject'
                    : '반복과 패턴 — 되풀이가 주제가 될 때'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Traditional folk painting is built on recurrence. A ten-panel screen of the
                        ten longevity symbols repeats its motifs across each fold; a flower-and-bird
                        screen returns to the same blossoms in steady rhythm. Repetition was never a
                        failure of invention — it was the structure that carried meaning, a wish
                        restated until it filled the room.
                      </p>
                      <p>
                        Lee Mun-hyeong makes that recurrence the explicit subject. In her work the
                        pattern is not background but argument: the motif multiplies, aligns, and
                        tiles across the surface until rhythm itself becomes the image. The
                        exhibition title she has shown under — <em>Repetition and Pattern</em> —
                        names the very method, placing her among contemporary minhwa artists who
                        treat the folk grammar of recurrence as a living formal language.
                      </p>
                      <p>
                        It is a quietly radical move. By foregrounding pattern, she shifts folk
                        painting from illustration toward structure — keeping the auspicious motif
                        but letting its repetition do the work that, in modern painting, abstraction
                        once claimed for itself.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        전통 민화는 되풀이 위에 세워진다. 십폭 십장생 병풍은 폭마다 도상을 반복하고,
                        화조 병풍은 일정한 리듬으로 같은 꽃으로 돌아온다. 반복은 발상의 실패가
                        아니라 의미를 실어 나르는 구조였다 — 방을 가득 채울 때까지 되풀이된 염원.
                      </p>
                      <p>
                        이문형은 그 되풀이를 명시적인 주제로 삼는다. 그의 작업에서 패턴은 배경이
                        아니라 주장이다: 도상이 증식하고, 정렬하고, 표면을 타일처럼 메우며 리듬
                        자체가 이미지가 된다. 그가 출품해 온 전시 제목 〈반복과 패턴〉은 바로 그
                        방법을 가리키며, 되풀이라는 민화의 문법을 살아 있는 조형 언어로 다루는 현대
                        민화 작가들 가운데 그를 세운다.
                      </p>
                      <p>
                        그것은 조용히 급진적인 선택이다. 패턴을 전면에 둠으로써 그는 민화를 삽화에서
                        구조로 옮긴다 — 길상의 도상은 지키되, 그 반복이 근대 회화에서 한때 추상이
                        자처했던 역할을 맡게 한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 화사한 색채와 자유분방한 상상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Vivid colour and the free imagination of minhwa'
                    : '화사한 색채와 민화의 자유분방한 상상'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Folk painting was never timid with colour. Tigers could be comic, fish could
                        smile, peonies could blaze in reds and blues no academy would have
                        permitted. Released from the rules of literati ink painting, minhwa embraced
                        a frank, decorative brightness — colour as joy, colour as a wish made
                        visible.
                      </p>
                      <p>
                        Lee Mun-hyeong keeps that fearlessness. Her palette stays bright and
                        auspicious, her imagination free in the way folk painting always allowed:
                        creatures slightly impossible, compositions that prize delight over
                        likeness. This is not a softening of tradition but a faithful extension of
                        its spirit — the part of minhwa that was always playful, always generous.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민화는 색 앞에서 결코 소심하지 않았다. 호랑이는 익살스러울 수 있었고,
                        물고기는 웃을 수 있었으며, 모란은 어느 화원도 허락하지 않았을 붉고
                        푸른빛으로 타오를 수 있었다. 문인 수묵화의 규범에서 풀려난 민화는 솔직하고
                        장식적인 밝음을 끌어안았다 — 기쁨으로서의 색, 눈에 보이게 된 염원으로서의
                        색.
                      </p>
                      <p>
                        이문형은 그 거침없음을 지킨다. 그의 색채는 밝고 길상적인 채로 남고, 그
                        상상력은 민화가 늘 허락했던 방식으로 자유롭다: 조금은 불가능한 짐승들,
                        닮음보다 즐거움을 앞세우는 구성. 이것은 전통의 순화가 아니라 그 정신의
                        충실한 연장이다 — 언제나 장난스럽고, 언제나 너그러웠던 민화의 그 부분.
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
                      From the folding screens of ordinary Joseon homes to a contemporary canvas,
                      Lee Mun-hyeong&apos;s work pursues a single question: how does an old
                      vernacular keep speaking? Her answer is repetition — the auspicious icon
                      restated until it becomes structure, the bright wish of folk painting carried
                      into the present. She joins this campaign not as a subject of its cause but as
                      a fellow artist in solidarity — so that those who come after might work
                      without the weight of financial exclusion.
                    </>
                  ) : (
                    <>
                      조선 살림집의 병풍에서 동시대의 캔버스까지, 이문형의 작업은 하나의 물음을
                      추구한다: 옛 토착 언어는 어떻게 계속 말하는가. 그의 대답은 반복이다 — 구조가
                      될 때까지 되풀이된 길상의 도상, 오늘로 이어진 민화의 밝은 염원. 그는 씨앗페에
                      이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음
                      세대의 예술인들이 금융 차별의 무게 없이 일할 수 있도록.
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
                MINHWA
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Lee Mun-hyeong
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
                    Lee Mun-hyeong joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이문형 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_MUNHYEONG_PATH}
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
