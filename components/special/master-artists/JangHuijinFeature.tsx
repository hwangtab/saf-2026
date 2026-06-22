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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/장희진)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JANG_HUIJIN_PATH = `/artworks/artist/${encodeURIComponent('장희진')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJangHuijinArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '장희진' ||
    n === 'jang hui-jin' ||
    n === 'jang huijin' ||
    n === 'jang hee-jin' ||
    n === 'jang heejin' ||
    n.replace(/[\s-]+/g, '') === 'janghuijin' ||
    n.replace(/[\s-]+/g, '') === 'jangheejin'
  );
};

const PAGE_COPY = {
  ko: {
    title: '장희진 — 캔버스의 요철에 색을 새기는 회화가',
    description:
      '캔버스 표면의 요철과 색채의 상호작용을 탐구하는 〈Folded tint〉 연작의 회화가 장희진. 캔버스 위에 모델링 컴파운드를 발라 요철을 만들고, 그 위에 채색한 뒤 표면을 갈아내는 수행적·노동집약적 과정으로 평면 회화의 한계를 넘어선 공간적 깊이와 리듬을 빚는다. 홍익대 회화 박사 장희진의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '캔버스의 요철과 색의 상호작용 — 모델링 컴파운드로 표면을 빚고, 채색하고, 갈아내어 공간적 깊이를 여는 〈Folded tint〉 연작의 회화가 장희진.',
    ogAlt: '장희진 대표 작품',
    twitterTitle: '장희진',
    twitterDescription: '요철에 색을 새기다 — 〈Folded tint〉 연작의 회화가 장희진',
    keywords:
      '장희진 작가, Folded tint, 회화, 모델링 컴파운드, 요철 회화, 질감 회화, 홍익대 박사, 씨앗페 온라인',
  },
  en: {
    title: 'Jang Huijin — A Painter Inscribing Colour into the Canvas Relief',
    description:
      'Selected works by Jang Huijin, painter of the 〈Folded tint〉 series, which explores the interplay of colour and the relief of the canvas surface. She spreads modelling compound across the canvas to build a textured relief, colours over it, then grinds the surface back — a performative, labour-intensive process that opens a spatial depth and rhythm beyond the limits of flat painting. View and collect the works of Jang Huijin, a Hongik painting doctorate, at SAF Online.',
    ogDescription:
      'The interplay of colour and relief — Jang Huijin builds the surface with modelling compound, colours it, and grinds it back to open spatial depth in the 〈Folded tint〉 series.',
    ogAlt: 'Jang Huijin — featured work',
    twitterTitle: 'Jang Huijin',
    twitterDescription: 'Inscribing colour into relief — painter of the 〈Folded tint〉 series',
    keywords:
      'Jang Huijin artist, Folded tint, painting, modelling compound, relief painting, textured surface, Hongik University',
  },
} as const;

export async function buildJangHuijinMetadata({
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
  const pageUrl = buildLocaleUrl(JANG_HUIJIN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('장희진');
  const artwork = allArtworks.find((a) => isJangHuijinArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jang Huijin`
      : `${artwork.title} — 장희진`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JANG_HUIJIN_PATH, locale, true),
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

export default async function JangHuijinFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JANG_HUIJIN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('장희진');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isJangHuijinArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Jang Huijin' : '장희진', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JANG_HUIJIN_PATH}#person-jang-huijin`,
    name: isEnglish ? 'Jang Huijin' : '장희진',
    alternateName: isEnglish ? '장희진' : 'Jang Huijin',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Jang Huijin is a Korean painter of the 〈Folded tint〉 series, which explores the interplay of colour and the relief of the canvas surface. She builds a textured relief with modelling compound, colours over it, then grinds the surface back to open a spatial depth beyond flat painting.'
      : '장희진은 캔버스 표면의 요철과 색채의 상호작용을 탐구하는 〈Folded tint〉 연작의 회화가입니다. 모델링 컴파운드로 요철을 빚고, 채색한 뒤 표면을 갈아내어 평면 회화를 넘어선 공간적 깊이를 엽니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University Graduate School, Dept. of Painting (Ph.D.)'
        : '홍익대학교 일반대학원 미술학과 회화전공 박사',
    },
    knowsAbout: isEnglish
      ? ['Painting', 'Modelling compound relief', 'Colour and texture', 'Folded tint series']
      : ['회화', '모델링 컴파운드 요철', '색채와 질감', 'Folded tint 연작'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jang Huijin — SAF Online' : '장희진 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jang Huijin from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 장희진 작품을 소개합니다.',
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

          {/* Stacked relief ridges — 요철의 결 모티프 */}
          <div className="absolute left-0 top-[38%] h-px w-full bg-white/10" />
          <div className="absolute left-0 top-[46%] h-px w-full bg-primary/25" />
          <div className="absolute left-0 top-[54%] h-px w-full bg-white/10" />
          <div className="absolute left-0 top-[62%] h-px w-full bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jang Huijin · Painter' : '장희진 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Colour inscribed
                  <br />
                  <span className="text-primary-soft">into the relief</span>
                </>
              ) : (
                <>
                  요철에 새겨 넣은
                  <br />
                  <span className="text-primary-soft">색의 깊이</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She builds the surface, colours it, and grinds it back.
                  </span>
                  <span className="mt-2 block">
                    A spatial depth opened beyond the limits of flat painting.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">표면을 빚고, 색을 입히고, 다시 갈아낸다.</span>
                  <span className="mt-2 block">평면 회화의 한계를 넘어 열리는 공간적 깊이.</span>
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
                    Surface as depth —<br />
                    <span className="text-primary-strong">when a plane becomes a space</span>
                  </>
                ) : (
                  <>
                    표면이 곧 깊이 —<br />
                    <span className="text-primary-strong">평면이 공간이 될 때</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jang Huijin is a Korean painter who graduated from Hongik University and
                      completed her doctorate at the same institution&apos;s graduate school. Her
                      practice begins from a single, stubborn question: can a painting hold real
                      depth without abandoning the canvas — can a flat surface itself become a
                      space?
                    </p>
                    <p>
                      Her answer is the{' '}
                      <strong className="font-bold text-charcoal-deep">〈Folded tint〉</strong>{' '}
                      series, an extended inquiry into the interplay between the relief of the
                      canvas surface and colour. Rather than painting an image onto a flat ground,
                      she builds the ground itself, treating the surface as something to be shaped
                      before it is coloured.
                    </p>
                    <p>
                      The method is exacting. She spreads{' '}
                      <strong className="font-bold text-charcoal">modelling compound</strong> across
                      the canvas and works it into a relief of ridges and hollows; she colours over
                      that relief; and then she{' '}
                      <strong className="font-bold text-charcoal">grinds the surface back</strong>,
                      so that the colour buried in the texture is revealed only where the abrasion
                      reaches it. Building, colouring, grinding — the sequence is repeated, and each
                      pass is slow, physical labour.
                    </p>
                    <p>
                      What emerges is a singular texture and a visual depth that flat painting
                      cannot reach. Light catches the ridges differently from the hollows; colour
                      appears to surface and recede across the same plane. The painting stops being
                      a window onto an image and becomes a low landscape of its own — a plane that
                      has been made spatial, holding a quiet rhythm in its folds.
                    </p>
                    <p>
                      In this sense her work pushes past the conventional limit of painting as a
                      flat medium. The performative, labour-intensive process is not a means to an
                      illusion but the subject itself: the accumulation of the hand&apos;s
                      repetition made visible, the trace of time spent building and abrading the
                      surface left legible in the final work.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      장희진은 홍익대학교 회화과를 졸업하고 동 대학원에서 박사를 마친 회화가다. 그의
                      작업은 하나의 집요한 물음에서 출발한다 — 캔버스를 떠나지 않고도 회화가
                      실재하는 깊이를 가질 수 있는가, 평면 자체가 하나의 공간이 될 수 있는가.
                    </p>
                    <p>
                      그 대답이{' '}
                      <strong className="font-bold text-charcoal-deep">〈Folded tint〉</strong>{' '}
                      연작, 캔버스 표면의 요철과 색채 사이의 상호작용을 길게 탐구한 작업이다. 평평한
                      바탕 위에 이미지를 그리는 대신, 그는 바탕 그 자체를 빚는다. 표면을 채색하기에
                      앞서, 먼저 형상을 부여해야 할 무엇으로 다룬다.
                    </p>
                    <p>
                      방법은 엄정하다. 캔버스 위에{' '}
                      <strong className="font-bold text-charcoal">모델링 컴파운드</strong>를 발라
                      마루와 골의 요철을 만들고, 그 요철 위에 채색한 뒤,{' '}
                      <strong className="font-bold text-charcoal">표면을 갈아낸다</strong>. 질감
                      속에 묻힌 색은 갈아낸 자리에서만 드러난다. 쌓고, 칠하고, 갈아내는 — 이 순서가
                      되풀이되고, 매 공정은 느리고 육체적인 노동이다.
                    </p>
                    <p>
                      그렇게 평면 회화가 닿지 못하는 독특한 질감과 시각적 깊이가 떠오른다. 빛은
                      마루와 골에 서로 다르게 걸리고, 색은 같은 평면 위에서 떠오르고 가라앉기를
                      반복한다. 그림은 이미지를 향한 창이기를 멈추고, 그 자체로 낮은 풍경이 된다 —
                      공간이 된 평면, 접힌 결 속에 고요한 리듬을 품은.
                    </p>
                    <p>
                      이런 의미에서 그의 작업은 평면 매체로서 회화의 통상적 한계를 밀고 나아간다.
                      수행적이고 노동집약적인 과정은 환영을 만드는 수단이 아니라 그 자체가 주제다 —
                      손의 반복이 축적되어 눈에 보이게 되고, 표면을 쌓고 갈아낸 시간의 흔적이
                      완성작에 그대로 읽힌다.
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
                        {isEnglish ? 'Relief and colour' : '요철과 색채'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The interplay of the textured relief and colour — light reads the ridges and hollows differently, and colour surfaces and recedes across one plane.'
                          : '요철과 색채의 상호작용. 빛이 마루와 골을 다르게 읽고, 색이 한 평면 위에서 떠오르고 가라앉는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Building, colouring, grinding' : '쌓고, 칠하고, 갈아내기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Modelling compound spread into a relief, coloured over, then ground back — a performative, labour-intensive sequence repeated until the surface holds time.'
                          : '모델링 컴파운드로 빚은 요철에 채색하고 다시 갈아내는, 수행적·노동집약적 공정의 반복. 표면이 시간을 머금을 때까지.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Beyond the flat plane' : '평면을 넘어서'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A spatial depth and rhythm carried past the limits of flat painting — the plane itself made into a low landscape.'
                          : '평면 회화의 한계를 넘어선 공간적 깊이와 리듬. 평면 그 자체가 하나의 낮은 풍경이 된다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Education & practice' : '학력과 작업'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-16">
                      B.F.A.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Hongik University, College of Fine Arts, Dept. of Painting.'
                        : '홍익대학교 미술대학 회화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-16">
                      M.F.A.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Hongik University Graduate School, Dept. of Painting.'
                        : '홍익대학교 동대학원 회화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-16">
                      Ph.D.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Hongik University Graduate School, Ph.D. in Fine Arts, Painting major.'
                        : '홍익대학교 일반대학원 미술학과 회화전공 박사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-16">
                      {isEnglish ? 'Series' : '연작'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Folded tint〉 — an inquiry into the interplay of the canvas relief and colour.'
                        : '〈Folded tint〉 — 캔버스 요철과 색채의 상호작용에 대한 탐구.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-16">
                      {isEnglish ? 'Method' : '방법'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Modelling compound relief → colouring → grinding the surface back, repeated.'
                        : '모델링 컴파운드 요철 → 채색 → 표면 갈아내기, 반복.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'On the process' : '작업 과정에 관하여'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Modelling compound is spread across the canvas and worked into a relief of ridges and hollows.'
                        : '캔버스 위에 모델링 컴파운드를 발라 마루와 골의 요철을 만든다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Colour is applied over the textured relief.'
                        : '요철이 만들어진 표면 위에 채색한다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The surface is ground back, revealing colour buried in the texture only where the abrasion reaches.'
                        : '표면을 갈아내어, 질감 속에 묻힌 색을 갈린 자리에서만 드러낸다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The performative, labour-intensive sequence is repeated until a singular texture and spatial depth emerge.'
                        : '수행적·노동집약적 공정을 반복하여 독특한 질감과 공간적 깊이를 빚는다.'}
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
                  <span className="text-charcoal-deep">on relief, colour, and labour</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">요철과 색, 그리고 노동에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 모델링 컴파운드 — 표면을 빚다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Modelling compound — building the surface'
                    : '모델링 컴파운드 — 표면을 빚다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most painting treats the canvas as a given — a flat ground waiting to
                        receive an image. Jang Huijin begins one step earlier. Before any colour is
                        laid, she spreads modelling compound across the surface and works it into a
                        relief, raising ridges and sinking hollows so that the canvas acquires a
                        topography of its own.
                      </p>
                      <p>
                        This is a decision about what a painting is. By shaping the ground rather
                        than merely covering it, she makes the surface itself a site of form. The
                        relief is not decoration applied to an image; it is the structure the image
                        will later inhabit. The flat plane has already become a low landscape before
                        a single colour arrives.
                      </p>
                      <p>
                        The 〈Folded tint〉 series takes its character from this. The fold is
                        literal — a physical ridge in the compound — and also a logic: colour and
                        texture folded into one another so that neither can be read apart from the
                        other.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대개의 회화는 캔버스를 주어진 것으로 다룬다 — 이미지를 받아들이기를 기다리는
                        평평한 바탕으로. 장희진은 한 걸음 앞에서 시작한다. 색을 올리기에 앞서, 그는
                        표면 위에 모델링 컴파운드를 발라 요철을 빚는다. 마루를 세우고 골을 파,
                        캔버스가 그 자신의 지형을 갖게 한다.
                      </p>
                      <p>
                        이것은 회화란 무엇인가에 대한 결정이다. 바탕을 단지 덮는 대신 빚음으로써,
                        그는 표면 그 자체를 형상의 자리로 만든다. 요철은 이미지에 덧붙인 장식이
                        아니라, 이미지가 나중에 깃들 구조다. 단 한 번의 색이 도착하기도 전에, 평면은
                        이미 낮은 풍경이 되어 있다.
                      </p>
                      <p>
                        〈Folded tint〉 연작의 성격이 여기서 나온다. 접힘은 문자 그대로 컴파운드
                        속의 물리적 마루이자, 동시에 하나의 논리다 — 색과 질감이 서로 접혀 들어,
                        어느 하나도 다른 하나와 떼어 읽을 수 없게 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 채색과 갈아내기 — 묻힌 색을 드러내다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Colouring and grinding — revealing the buried tint'
                    : '채색과 갈아내기 — 묻힌 색을 드러내다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Once the relief has set, Jang Huijin colours over it — and then does the
                        thing that defines the work: she grinds the surface back. Abrasion removes
                        the upper layer unevenly, biting into the ridges and sparing the hollows, so
                        that the colour buried in the texture is revealed only where the grinding
                        reaches it.
                      </p>
                      <p>
                        This reversal — subtracting to disclose rather than adding to depict — gives
                        the surface its particular optical behaviour. The same plane reads as raised
                        and recessed at once; a single colour appears at different depths depending
                        on where the abrasion has cut. Nothing is illusionistic. The depth is real,
                        held in the physical thickness of the compound and exposed by the hand.
                      </p>
                      <p>
                        Building, colouring, grinding — the cycle repeats, each pass adjusting what
                        the last one left. The final surface is therefore not a single gesture but
                        an accumulation, a record of how many times the hand returned to the same
                        ground.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        요철이 굳고 나면, 장희진은 그 위에 채색한다 — 그리고 작업을 규정하는 일을
                        한다. 표면을 갈아내는 것이다. 갈아냄은 윗층을 고르지 않게 덜어낸다. 마루를
                        파고 골을 비껴가, 질감 속에 묻힌 색은 갈린 자리에서만 드러난다.
                      </p>
                      <p>
                        이 역전 — 묘사하기 위해 더하는 대신 드러내기 위해 덜어내는 — 이 표면에
                        특유의 광학적 거동을 부여한다. 같은 평면이 동시에 솟아오르고 가라앉은 것으로
                        읽히고, 하나의 색이 갈림의 깊이에 따라 서로 다른 층위로 나타난다. 환영은
                        없다. 깊이는 실재한다. 컴파운드의 물리적 두께에 담겨, 손에 의해 드러난다.
                      </p>
                      <p>
                        쌓고, 칠하고, 갈아내고 — 그 순환이 되풀이되며, 매 공정은 앞 공정이 남긴 것을
                        조정한다. 그리하여 완성된 표면은 단 한 번의 제스처가 아니라 축적이다 — 손이
                        같은 바탕으로 몇 번이나 되돌아왔는가의 기록.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 노동, 그리고 평면 너머의 깊이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Labour, and a depth beyond the plane'
                    : '노동, 그리고 평면 너머의 깊이'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈Folded tint〉 process is performative and labour-intensive, and that
                        is not incidental to the work — it is the work. Each stage demands physical
                        repetition: spreading and shaping the compound, waiting, colouring,
                        grinding, and beginning again. The painting carries the time it took to make
                        in the very grain of its surface.
                      </p>
                      <p>
                        Through this labour, Jang Huijin pushes painting past its conventional limit
                        as a flat medium. The result is a singular texture and a visual depth that
                        ordinary painting cannot reach — a spatial depth and a rhythm felt in the
                        folds, where the plane has been made to hold space without ceasing to be a
                        plane.
                      </p>
                      <p>
                        What the viewer finally sees is not an image of depth but depth itself,
                        accumulated by hand. The 〈Folded tint〉 surface stands as a quiet argument:
                        that a painting can be a constructed landscape, and that the patient labour
                        of building and abrading it is itself the meaning.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈Folded tint〉의 과정은 수행적이고 노동집약적이며, 그것은 작업에 부수적인
                        것이 아니라 — 곧 작업 그 자체다. 매 단계가 육체적 반복을 요구한다.
                        컴파운드를 바르고 빚고, 기다리고, 채색하고, 갈아내고, 다시 시작하는. 그림은
                        만들어지는 데 든 시간을 표면의 결 그대로 품는다.
                      </p>
                      <p>
                        이 노동을 통해 장희진은 평면 매체로서 회화의 통상적 한계를 밀고 나아간다. 그
                        결과는 보통의 회화가 닿지 못하는 독특한 질감과 시각적 깊이다 — 접힌 결에서
                        느껴지는 공간적 깊이와 리듬, 평면이 평면이기를 그치지 않으면서도 공간을
                        머금게 된 자리.
                      </p>
                      <p>
                        보는 이가 끝내 마주하는 것은 깊이의 이미지가 아니라 손으로 축적된 깊이 그
                        자체다. 〈Folded tint〉의 표면은 하나의 고요한 주장으로 선다 — 회화는 지어진
                        풍경일 수 있으며, 그것을 쌓고 갈아내는 인내의 노동이 곧 의미라는.
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
                      From the first relief raised in modelling compound to the last pass of the
                      grinding hand, Jang Huijin&apos;s work pursues a single question: how does a
                      flat surface become a space? The answer, built and abraded wash after wash, is
                      the 〈Folded tint〉 series — a painting made spatial through patient labour.
                      She joins this campaign not as a subject of its cause but as a fellow artist
                      in solidarity — so that those who come after might work with a little less of
                      the weight that financial exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      모델링 컴파운드로 세운 첫 요철부터 갈아내는 손의 마지막 공정까지, 장희진의
                      작업은 하나의 물음을 추구한다 — 평면은 어떻게 공간이 되는가. 한 겹 한 겹 쌓고
                      갈아내며 지은 대답이 〈Folded tint〉 연작, 인내의 노동으로 공간이 된 회화다.
                      씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 다음
                      세대의 예술인들이 한국 예술인에게 지워진 금융 차별의 무게를 조금이라도 덜
                      짊어진 채 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jang Huijin</span>
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
                    Jang Huijin joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    장희진 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JANG_HUIJIN_PATH}
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
