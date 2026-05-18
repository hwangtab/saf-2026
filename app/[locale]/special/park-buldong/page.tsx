import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
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

export const dynamic = 'force-static';
export const revalidate = 600;

const PARK_BULDONG_ARTIST_KEYS = new Set([
  '박불똥',
  'park bul-ttong',
  'park bulttong',
  'park buldong',
  'parkbulttong',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isParkBuldongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    PARK_BULDONG_ARTIST_KEYS.has(normalized) ||
    compact === '박불똥' ||
    compact === 'parkbulttong' ||
    compact === 'parkbuldong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박불똥 특별전: Park Bul-ttong Special Exhibition',
    description:
      '콜라주·정치 미술의 거장 박불똥(1956–). 신문·잡지를 잘라 붙여 권력의 언어를 해체하고 재조립하는 작가. 한국 민중미술 운동의 날카로운 목소리, 박불똥의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '콜라주·정치 미술의 거장 박불똥 특별전. 대중매체 이미지를 해체·재조합하여 권력의 이면을 폭로하는 한국 민중미술의 날카로운 목소리.',
    ogAlt: '박불똥 특별전 대표 이미지',
    twitterTitle: '박불똥 특별전',
    twitterDescription: '잘라내고 붙이며 세상을 읽는다 — 콜라주·정치 미술의 거장 박불똥',
  },
  en: {
    title: 'Park Bul-ttong Special Exhibition',
    description:
      'A special online exhibition featuring Park Bul-ttong (b. 1956), master of collage and political art. Cutting and reassembling images from newspapers and magazines, he exposes the hidden structures of power. A sharp voice of the Korean minjung art movement. View and collect selected works at SAF Online.',
    ogDescription:
      'Park Bul-ttong Special Exhibition — master of collage and political art. Cutting and reassembling mass media images to expose the hidden structures of power.',
    ogAlt: 'Park Bul-ttong Special Exhibition key visual',
    twitterTitle: 'Park Bul-ttong Special Exhibition',
    twitterDescription: 'Cut, paste, read the world — master of Korean political collage art',
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl('/special/park-buldong', locale);

  const allArtworks = await getSupabaseArtworksByArtist('박불똥');
  const artwork = allArtworks.find((a) => isParkBuldongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Bul-ttong Special Exhibition`
      : `${artwork.title} — 박불똥 특별전`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Park Bul-ttong artist, Korean political art, Korean collage art, minjung misul, political collage'
        : '박불똥 화가, 한국 정치 미술, 콜라주 아트, 민중미술, 정치 콜라주, 온라인 특별전',
    alternates: createLocaleAlternates('/special/park-buldong', locale),
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

export default async function ParkBuldongPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/special/park-buldong', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박불똥');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkBuldongArtist(artwork.artist)
  );
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('parkBuldong'), url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    name: isEnglish ? 'Park Bul-ttong' : '박불똥',
    alternateName: isEnglish ? '박불똥' : 'Park Bul-ttong',
    jobTitle: isEnglish ? 'Artist' : '화가·콜라주 작가',
    description: isEnglish
      ? 'Park Bul-ttong (b. 1956) is a Korean master of collage and political art, known for works that cut and reassemble mass media images to expose hidden power structures.'
      : '박불똥(1956-)은 대중매체 이미지를 해체·재조합하는 콜라주와 정치 미술로 권력의 이면을 폭로해온 한국 민중미술의 거장입니다.',
    birthDate: '1956',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Hadong, South Gyeongsang, South Korea' : '경남 하동',
    },
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Bul-ttong Special Exhibition' : '박불똥 특별전',
    description: isEnglish
      ? 'A special online exhibition featuring selected works by Park Bul-ttong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박불똥 작품들을 선보이는 온라인 특별전입니다.',
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
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block relative mb-8">
              <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
                {isEnglish ? 'Park Bul-ttong Special Exhibition' : '박불똥 특별전'}
              </span>
              <div className="absolute inset-0 border-4 border-primary transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black">
              {isEnglish ? (
                <>
                  Cut, Paste,
                  <br />
                  and Read the World
                </>
              ) : (
                <>
                  잘라내고 붙이며
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-primary">세상을 읽는다</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">The image was theirs. The meaning is ours.</span>
                  <span className="mt-2 block">
                    Park Bul-ttong tears the picture apart to show you what was always hidden
                    inside.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">이미지는 그들의 것이었다. 의미는 우리가 만든다.</span>
                  <span className="mt-2 block">
                    박불똥은 그림을 해체하여 그 안에 숨겨진 것을 꺼내 보입니다.
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="absolute top-0 left-0 w-32 h-32 border-l-[12px] border-t-[12px] border-white/15" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-r-[12px] border-b-[12px] border-white/15" />
          <div className="absolute top-1/2 left-4 w-4 h-4 rounded-full bg-primary opacity-40" />
          <div className="absolute top-1/3 right-8 w-6 h-6 rounded-full bg-white opacity-10" />
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    Scissors as critique —<br />
                    <span className="text-primary-strong">the collage that cuts through power</span>
                  </>
                ) : (
                  <>
                    가위가 곧 비평 —<br />
                    <span className="text-primary-strong">권력을 오려내는 콜라주</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Bul-ttong (b. 1956) chose his medium deliberately:{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        collage
                      </strong>
                      . Not painting, not printmaking — but the act of cutting images produced by
                      power and rearranging them into new, unauthorized meanings. Newspapers,
                      magazines, advertisements: the raw material of his work is the very media
                      through which authority speaks.
                    </p>
                    <p>
                      In the Korea of the 1980s, this was a radical choice. As a member of the
                      Minjung Misul Hyeopuihoe (National Artists&apos; Association), Park understood
                      that the most effective critique of a media-saturated world was to{' '}
                      <strong className="font-bold text-charcoal">work from inside it</strong> —
                      taking the images that were fed to people and showing, by simple
                      rearrangement, what they concealed.
                    </p>
                    <p>
                      His collages are direct without being blunt, political without being didactic.
                      The scissors do the arguing. And the result — a world reassembled honestly —
                      is both a critique and a kind of liberation.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박불똥(1956-)은 자신의 매체를 의도적으로 선택했습니다:{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        콜라주
                      </strong>
                      . 회화도 판화도 아닌, 권력이 생산한 이미지를 오려내어 승인받지 않은 새로운
                      의미로 재배열하는 행위. 신문, 잡지, 광고 — 그의 작업 재료는 권력이 말하는 바로
                      그 매체입니다.
                    </p>
                    <p>
                      1980년대 한국에서 이것은 급진적인 선택이었습니다. 민족미술협의회의 일원으로서,
                      박불똥은 미디어로 포화된 세계를 가장 효과적으로 비판하는 방법이{' '}
                      <strong className="font-bold text-charcoal">그 안에서 작업하는 것</strong>임을
                      알았습니다. 사람들에게 공급된 이미지를 가져다가, 단순한 재배열만으로, 그
                      이미지가 감추고 있던 것을 드러내는 방법으로.
                    </p>
                    <p>
                      그의 콜라주는 직접적이지만 무디지 않고, 정치적이지만 설교하지 않습니다. 가위가
                      논증합니다. 그리고 그 결과 — 정직하게 재조합된 세계 — 는 비평이자 하나의
                      해방입니다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]">
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
                        {isEnglish ? 'Deconstruction of image' : '이미지의 해체'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Mass media images are cut apart and reassembled to expose the power structures hidden within them.'
                          : '대중매체 이미지를 해체·재조합하여 그 이면의 권력 구조를 드러냅니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Satire and directness' : '풍자와 직접성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Without detour, his works deliver social and political messages with immediate visual impact.'
                          : '우회 없이 사회·정치적 메시지를 직접적이고 강렬한 시각 언어로 전달합니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Democracy of collage' : '콜라주의 민주성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Using everyday printed materials rather than costly supplies, he lowers the threshold of art while raising the stakes of critique.'
                          : '값비싼 재료 대신 누구나 접할 수 있는 인쇄물로, 예술의 문턱은 낮추고 비평의 날은 높입니다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1956
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Hadong, South Gyeongsang province.' : '경남 하동 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Department of Western Painting.'
                        : '홍익대학교 서양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "First solo exhibition 〈Nunbit〉 at Gwanhun Gallery; co-founds the Minjung Misul Hyeopuihoe (National Artists' Association)."
                        : '첫 개인전 〈눈빛展〉 (관훈미술관); 「민족미술협의회」 창립 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1980s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Develops his signature political collage style, using mass media materials to critique power.'
                        : '대중매체 재료를 활용한 정치 콜라주 스타일 확립, 권력 비판 작업 다수 발표.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1990s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Continues exhibiting nationally and internationally; work acquired by major collections.'
                        : '국내외 지속 전시, 주요 기관 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Continues working; his collages remain one of the sharpest visual critiques in contemporary Korean art.'
                        : '작업 지속. 한국 현대미술에서 가장 날카로운 시각 비평의 목소리 중 하나.'}
                    </span>
                  </li>
                </ol>
              </div>
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Nunbit〉 (1985) · 〈Joljak〉 (1987) · 〈Gyeolsa Bandae〉 (1989) — Geurimadang Min, Seoul'
                        : '〈눈빛展〉 (1985) · 〈졸작展〉 (1987) · 〈결사반대展〉 (1989) — 그림마당 민, 서울'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Confession on the Disability of Desire〉, Kumho Museum of Art (1992); 〈Park Bul-ttong 1985–2016〉, Gallery 175 (2016)'
                        : '〈관능의 불구에 대한 자백展〉 금호미술관 (1992); 〈박불똥, 1985–2016〉 갤러리 175 (2016)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Permanent collections: National Museum of Modern and Contemporary Art (MMCA) · Seoul Museum of Art (SeMA) · Gwangju Museum of Art · Jeju 4·3 Memorial Museum'
                        : '국립현대미술관(MMCA) · 서울시립미술관(SeMA) · 광주시립미술관 · 제주 4·3역사기념관 소장'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="relative py-20 bg-charcoal text-white">
          <div className="max-w-[1440px] mx-auto px-4 mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/20 pb-8">
            <div className="relative">
              <h2 className="text-4xl md:text-5xl mb-4 text-white font-black font-display text-balance">
                {isEnglish ? 'Exhibition Works' : '전시 작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                ARCHIVE
              </div>
              <p className="text-base sm:text-lg text-white/70 font-medium">
                {isEnglish ? (
                  <>
                    <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>{' '}
                    works are currently on view.
                  </>
                ) : (
                  <>
                    총 <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>
                    점의 작품이 전시되어 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                Park Bul-ttong
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
                    Park Bul-ttong joined this exhibition in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박불똥 작가는 동료 예술인을 위한 연대의 뜻으로 이 전시에 참여했습니다. 작품 판매
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
              <MasterArtistGallery artworks={ARTWORKS} returnTo="/special/park-buldong" />
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
