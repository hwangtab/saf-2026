import type { Metadata } from 'next';
import SafeImage from '@/components/common/SafeImage';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import ParkSaenggwangDrawingGallery from '@/components/special/ParkSaenggwangDrawingGallery';
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

const PARK_SAENGGWANG_ARTIST_KEYS = new Set([
  '박생광',
  'park saenggwang',
  'parksaenggwang',
  'park saeng-gwang',
  'park saeng gwang',
  'park saengkwang',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isParkSaenggwangArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    PARK_SAENGGWANG_ARTIST_KEYS.has(normalized) ||
    compact === '박생광' ||
    compact === 'parksaenggwang' ||
    compact === 'parksaengkwang'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박생광 드로잉전: Park Saeng-gwang Drawings',
    description:
      '오방색의 거장 박생광(1904–1985)이 채색 이전에 연필로 잡아둔 첫 호흡. 2023년 예술의전당 한가람미술관에서 100점이 처음 본격 공개된, 거장의 드물게 알려진 영역. 2026년 5월 20일부터 6월 8일까지 서울 은평구 M타워 6층에서 만나보세요.',
    ogDescription:
      '오방색의 거장 박생광이 연필로 잡아둔 첫 호흡 — 채색 이전의 골격을 보는 드로잉 특별전. 5/20~6/8 서울 은평 M타워.',
    ogAlt: '박생광 드로잉전 대표 이미지',
    twitterTitle: '박생광 드로잉전',
    twitterDescription: '오방색의 거장이 연필로 잡아둔 첫 호흡 — 채색 이전의 박생광',
  },
  en: {
    title: 'Park Saeng-gwang Drawings',
    description:
      'Drawings by Park Saeng-gwang (1904–1985), master of obangsaek (the five cardinal colors of Korean tradition) — first breaths the artist held in pencil before color. Following the 2023 Seoul Arts Center exhibition that first publicly showcased 100 of these works, this special show invites collectors and viewers to a rarely seen side of the master. May 20–June 8, 2026, M-Tower 6F, Eunpyeong, Seoul.',
    ogDescription:
      'First breaths the master of five colors held in pencil — a rare drawings exhibition by Park Saeng-gwang. May 20–Jun 8 at M-Tower, Eunpyeong, Seoul.',
    ogAlt: 'Park Saeng-gwang Drawings exhibition key visual',
    twitterTitle: 'Park Saeng-gwang Drawings',
    twitterDescription: 'First breaths the master of five colors held in pencil',
  },
} as const;

const EXHIBITION_START = '2026-05-20';
const EXHIBITION_END = '2026-06-08';
const VENUE_NAME_KO = 'M타워 6층';
const VENUE_NAME_EN = 'M-Tower 6F';
const VENUE_ADDRESS_KO = '서울특별시 은평구 통일로 870 M타워 6층';
const VENUE_ADDRESS_EN = 'M-Tower 6F, 870 Tongil-ro, Eunpyeong-gu, Seoul, Korea';
const VENUE_STREET = '통일로 870 M타워 6층';
const VENUE_REGION = 'Seoul';
const VENUE_LOCALITY_KO = '은평구';
const VENUE_LOCALITY_EN = 'Eunpyeong-gu';
const HOURS_KO = '오전 11시 ~ 오후 8시';
const HOURS_EN = '11:00 AM – 8:00 PM';

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
  const pageUrl = buildLocaleUrl('/special/park-saenggwang', locale);

  // OG 이미지 — 박생광 실 작품(드로잉) 이미지 우선, 없으면 사이트 기본 OG.
  const allArtworks = await getSupabaseArtworksByArtist('박생광');
  const artwork = allArtworks.find((a) => isParkSaenggwangArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Saeng-gwang Drawings`
      : `${artwork.title} — 박생광 드로잉전`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Park Saeng-gwang, Korean drawings, pencil drawings, master painter, obangsaek, Korean art exhibition'
        : '박생광, 박생광 드로잉, 한국화 거장, 오방색, 채색화, 박생광 드로잉전, 박생광 특별전, 한국 현대미술',
    alternates: createLocaleAlternates('/special/park-saenggwang', locale),
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

export default async function ParkSaenggwangPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/special/park-saenggwang', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박생광');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkSaenggwangArtist(artwork.artist)
  );
  const drawings: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const drawingCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    drawings.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('parkSaenggwang'), url: pageUrl },
  ]);

  const parkSaenggwangPerson = {
    '@type': 'Person',
    name: isEnglish ? 'Park Saeng-gwang' : '박생광',
    alternateName: isEnglish ? '박생광 (朴生光)' : 'Park Saeng-gwang (朴生光)',
    birthDate: '1904',
    deathDate: '1985',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Park Saeng-gwang (1904–1985), Korean master of colored ink painting who, after returning to Korea in 1977, combined obangsaek (the five cardinal colors) with traditional ink painting to forge a new genre in Korean contemporary art. Hailed in 1985 at the Grand Palais Paris as "the Korean Picasso."'
      : '박생광(1904–1985)은 1977년 영구 귀국 후 한국 전통의 오방색(청·적·황·백·흑)을 수묵화에 결합해 한국 현대미술의 새로운 장르를 구축한 채색화의 거장. 1985년 파리 그랑팔레 〈르 살롱전〉 특별전에서 비평가들이 "한국의 피카소"로 환영한 작가.',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    sameAs: ['https://ko.wikipedia.org/wiki/박생광'],
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Saeng-gwang Drawings' : '박생광 드로잉전',
    description: isEnglish
      ? 'A rare drawings exhibition by Korean master Park Saeng-gwang (1904–1985). Pencil works showing the bare structure beneath obangsaek color — first breaths the master held before painting.'
      : '한국 채색화의 거장 박생광(1904–1985)이 채색 이전에 연필로 잡아둔 첫 호흡 — 오방색이 입혀지기 전 골격을 드러내는 드물게 알려진 드로잉 특별전.',
    url: pageUrl,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: isEnglish ? VENUE_NAME_EN : VENUE_NAME_KO,
      address: {
        '@type': 'PostalAddress',
        streetAddress: VENUE_STREET,
        addressLocality: isEnglish ? VENUE_LOCALITY_EN : VENUE_LOCALITY_KO,
        addressRegion: VENUE_REGION,
        addressCountry: 'KR',
      },
    },
    startDate: EXHIBITION_START,
    endDate: EXHIBITION_END,
    organizer: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    about: parkSaenggwangPerson,
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
        {/* Hero Section — bg-charcoal + sun-strong 액센트 (오방색 중 황 한 자만 인용). */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block relative mb-8">
              <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
                {isEnglish ? 'Park Saeng-gwang Drawings' : '박생광 드로잉전'}
              </span>
              <div className="absolute inset-0 border-4 border-sun transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black">
              {isEnglish ? (
                <>
                  Before the Color,
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-sun-strong">First Breaths</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                  <br />
                  in Pencil
                </>
              ) : (
                <>
                  채색 이전,
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-sun-strong">연필로 잡아둔</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                  <br />첫 호흡
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Drawings by the master of obangsaek — the bare structure beneath color.
                  </span>
                  <span className="mt-2 block text-base sm:text-lg md:text-xl text-white/70">
                    <span className="inline-block">May 20 – Jun 8, 2026</span>
                    <span className="mx-2 text-white/40">·</span>
                    <span className="inline-block">M-Tower 6F, Eunpyeong</span>
                    <span className="mx-2 text-white/40">·</span>
                    <span className="inline-block">11am–8pm</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    오방색의 거장이 색을 입히기 전, 그 골격을 그대로 드러낸 드로잉.
                  </span>
                  <span className="mt-2 block text-base sm:text-lg md:text-xl text-white/70">
                    <span className="inline-block">2026년 5월 20일 ~ 6월 8일</span>
                    <span className="mx-2 text-white/40">·</span>
                    <span className="inline-block">서울 은평 M타워 6층</span>
                    <span className="mx-2 text-white/40">·</span>
                    <span className="inline-block">오전 11시 ~ 오후 8시</span>
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Background decorative elements — sun(yellow) 한 점 액센트. */}
          <div className="absolute top-0 left-0 w-32 h-32 border-l-[12px] border-t-[12px] border-white/15" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-r-[12px] border-b-[12px] border-white/15" />
          <div className="absolute top-1/2 left-4 w-4 h-4 rounded-full bg-sun opacity-50" />
          <div className="absolute top-1/3 right-8 w-6 h-6 rounded-full bg-white opacity-10" />
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Quote — 박생광 명언. */}
          <div className="mb-24 flex justify-center">
            <blockquote className="relative p-8 sm:p-10 md:p-16 text-center max-w-4xl border-4 border-charcoal bg-white shadow-[8px_8px_0px_0px_rgba(253,202,64,0.3)]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-sun-strong flex items-center justify-center rounded-full text-white font-display font-black text-3xl">
                &ldquo;
              </div>
              <p className="text-2xl sm:text-3xl md:text-5xl text-charcoal leading-relaxed text-balance pt-4 font-display font-black">
                {isEnglish ? (
                  <>
                    No nation departs from its history.
                    <br />
                    No nation departs from its tradition.
                  </>
                ) : (
                  <>
                    역사를 떠난 민족은 없다
                    <br className="md:hidden" /> 전통을 떠난 민족은 없다
                  </>
                )}
              </p>
              <footer className="mt-8 flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-charcoal/40"></span>
                <span className="text-xl text-charcoal font-bold tracking-widest">
                  {isEnglish ? 'Park Saeng-gwang' : '박생광'}
                </span>
                <span className="h-px w-8 bg-charcoal/40"></span>
              </footer>
            </blockquote>
          </div>

          {/* Section 1 — 드로잉이란? 미술사적 개념 narrative. */}
          <div className="mb-32 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-sun-strong pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Drawing —
                  <br />
                  <span className="text-charcoal-deep">the most personal of all</span>
                </>
              ) : (
                <>
                  드로잉 —
                  <br />
                  <span className="text-charcoal-deep">가장 개인적인 예술 언어</span>
                </>
              )}
            </h2>
            <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
              {isEnglish ? (
                <>
                  <p>
                    Drawing is the oldest of visual disciplines. Britannica defines it bluntly —{' '}
                    <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                      &ldquo;the most personal of all artistic statements.&rdquo;
                    </strong>{' '}
                    A line moves across paper; the artist&apos;s hand is the work. There is no layer
                    of paint to mediate the moment. What you see is the moment of seeing itself.
                  </p>
                  <p>
                    For most of art history, drawing was a step before painting — preparation,
                    rehearsal, hidden under color. Then, beginning around Leonardo, drawing came
                    forward as an autonomous form, &ldquo;aiming at nothing other than
                    itself.&rdquo; In 1976 MoMA&apos;s landmark <em>Drawing Now</em> declared the
                    medium &ldquo;a major and independent means of expression.&rdquo;
                  </p>
                  <p>
                    Korean tradition arrived at the same conviction by another road. In{' '}
                    <strong className="font-bold text-charcoal">필묵 (筆墨, pil-muk)</strong> — the
                    ink-and-brush practice of East Asian painting — a single line carries the
                    artist&apos;s breath, temperament, and sense of the world. The Korean phrase{' '}
                    <em>사의 (寫意)</em>, &ldquo;to depict the intent,&rdquo; values not likeness
                    but the mind behind the stroke. A drawing exhibition is, by this measure, the
                    most intimate room in an artist&apos;s house.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    드로잉(drawing, 소묘)은 시각예술 가장 오래된 기술이다. 영국 백과사전
                    브리태니커는 그 본질을 한 줄로 적었다 —{' '}
                    <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                      &ldquo;모든 예술적 진술 가운데 가장 개인적인 것.&rdquo;
                    </strong>{' '}
                    선이 종이를 가로지르고, 그 순간 작가의 손이 곧 작품이 된다. 채색이라는 두꺼운
                    절차가 없다. 보이는 것은 작가가 본 순간 그대로다.
                  </p>
                  <p>
                    미술사 대부분의 시간 동안 드로잉은 회화의 예비 단계였다. 리허설, 채색에 덮이는
                    골격. 그러다 레오나르도를 기점으로 드로잉은 &ldquo;다른 어떤 목적도 없이 오직
                    자기 자신을 향하는&rdquo; 자율적 예술이 되었다. 1976년 뉴욕 현대미술관(MoMA)이
                    기념비적 전시 〈Drawing Now〉에서 드로잉을 &ldquo;주요하고 독립적인 표현
                    수단&rdquo;으로 선언한 것은 그 흐름의 정점이다.
                  </p>
                  <p>
                    한국 전통도 다른 길로 같은 결론에 닿았다.{' '}
                    <strong className="font-bold text-charcoal">필묵(筆墨)</strong>의 자리에서 선 한
                    줄은 작가의 호흡과 기질, 세계를 보는 시선을 그대로 싣는다. <em>사의(寫意)</em> —
                    &ldquo;뜻을 그린다&rdquo;는 동양화의 화법은 닮음이 아니라 선 뒤의 마음을 본다.
                    드로잉전은, 이 척도로 보자면, 한 작가의 집에서 가장 사적인 방이다.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Section 2 — 박생광 Bio (3열 비대칭 grid: 인물 / 본문 / 카드). */}
          <div className="grid lg:grid-cols-[280px_1fr_1fr] gap-8 lg:gap-16 mb-32 items-start">
            {/* Portrait — 박생광 흑백 인물 사진. 페이지 톤(드로잉전 흑백 매체)과 일치. */}
            <div className="flex flex-col items-center lg:items-start lg:sticky lg:top-24">
              <figure className="relative w-full max-w-[260px] lg:max-w-none">
                <div className="border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(253,202,64,0.3)] overflow-hidden">
                  <SafeImage
                    src="/images/park-saenggwang.webp"
                    alt={isEnglish ? 'Park Saeng-gwang (1904–1985)' : '박생광 작가 (1904–1985)'}
                    width={400}
                    height={533}
                    className="w-full object-cover"
                    priority
                  />
                </div>
                <figcaption className="mt-3 text-xs text-charcoal-soft font-medium tracking-widest uppercase text-center">
                  {isEnglish ? 'Park Saeng-gwang, 1904–1985' : '박생광, 1904–1985'}
                </figcaption>
              </figure>
            </div>

            {/* Bio narrative */}
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    From Jinju
                    <br />
                    <span className="text-sun-strong">to the Grand Palais</span>
                  </>
                ) : (
                  <>
                    진주에서
                    <br />
                    <span className="text-sun-strong">그랑팔레까지</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Saeng-gwang (朴生光, 1904–1985) was born in Jinju, South Gyeongsang
                      Province. In 1920 he crossed to Kyoto, where he studied at the Kyoto Municipal
                      School of Painting under the masters of <em>shin-nihonga</em> — Takeuchi Seihō
                      and Murakami Kagaku. For decades he worked within their idiom, regarded by
                      Korean critics as a painter in a &ldquo;Japanese style.&rdquo;
                    </p>
                    <p>
                      Then, in 1977, after a second period in Japan, he returned permanently to
                      Korea. At seventy-three he upended his own practice. He set aside the Japanese
                      palette and reached for{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        obangsaek
                      </strong>{' '}
                      — the five cardinal colors of Korean tradition: blue, red, yellow, white,
                      black. He drew his subjects from shamanic rites, Buddhist iconography, folk
                      tales, and the history of his people: Jeon Bong-jun, the mudang, Dangun,
                      Empress Myeongseong.
                    </p>
                    <p>
                      The final eight years were a transformation. In 1985, at the Grand Palais in
                      Paris, critics greeted him as &ldquo;the Korean Picasso.&rdquo; That same year
                      he died. The hundred or so works he left behind — the late paintings and the
                      drawings beneath them — are now read as the moment when Korean colored ink
                      painting found a new ground.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박생광(朴生光, 1904–1985)은 경상남도 진주에서 태어났다. 1920년 일본 교토로
                      건너가 교토시립회화전문학교에서 <em>신일본화(新日本畵)</em>의 거장 다케우치
                      세이호(竹內栖鳳)와 무라카미 가가쿠(村上華岳)에게 사사했다. 이후 수십 년, 한국
                      화단은 그를 &ldquo;일본풍의 그림을 그리는 화가&rdquo;로 분류했다.
                    </p>
                    <p>
                      1977년, 그는 일본에서의 두 번째 시기를 마감하고 영구 귀국한다. 일흔셋의 그가
                      스스로의 화풍을 뒤집은 자리에서{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        오방색
                      </strong>{' '}
                      — 한국 전통의 다섯 색, 청·적·황·백·흑이 솟구쳐 올라왔다. 무속의 굿판, 불교의
                      도상, 민속, 그리고 민족의 역사 — 전봉준, 무당, 단군, 명성황후가 그의 화폭에
                      들어섰다.
                    </p>
                    <p>
                      마지막 8년은 그의 진정한 황금기였다. 1985년 파리 그랑팔레 〈르 살롱전〉
                      특별전에서 비평가들은 그를 &ldquo;한국의 피카소&rdquo;로 환영했다. 같은 해
                      그는 세상을 떠났다. 그가 남긴 백여 점의 만년 채색화, 그리고 그 아래에 놓였던
                      드로잉들은 이제 한국 채색화가 새로운 지반을 얻은 순간으로 다시 읽힌다.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 카드: 주요 소재 + Timeline */}
            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(253,202,64,0.3)]">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-sun-strong rotate-45" />
                  {isEnglish ? 'Major subjects' : '주요 소재'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-sun-strong transition-colors">
                        {isEnglish ? 'Shamanic rite' : '무속 (Mudang)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Mudang, gut rituals, talismans — the spirit world of Korean shamanism rendered in surging color.'
                          : '무당과 굿판, 부적의 도상 — 신령한 기운을 강렬한 색면으로 옮긴 박생광 후기 회화의 정점.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-sun-strong transition-colors">
                        {isEnglish ? 'History' : '역사 (History)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Jeon Bong-jun, Empress Myeongseong, Yi Sun-sin — the figures of Korean history rendered with ritual color.'
                          : '전봉준·명성황후·이순신·논개 — 한국 역사 속 인물을 의례적 채색으로 기념한 대작 시리즈.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-sun-strong transition-colors">
                        {isEnglish ? 'Folk & Buddhism' : '민속·불교 (Folk & Buddhism)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Folk paintings, Buddhist iconography, dancheong patterns — gathered into a single contemporary canvas.'
                          : '민화·탱화·단청 문양 — 전국 절집을 다니며 채집한 한국 토속 도상을 현대 회화로 재구축했다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Timeline */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1904
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Jinju, South Gyeongsang Province.' : '경남 진주 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1923
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Enters Kyoto Municipal School of Painting; studies under Takeuchi Seihō.'
                        : '교토시립회화전문학교 입학. 다케우치 세이호에게 사사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1977
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Returns permanently to Korea; turns to obangsaek and Korean subjects.'
                        : '영구 귀국. 오방색과 한국적 소재로 화풍 전환.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1981
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition at Baeksang Memorial Museum.'
                        : '백상기념미술관 개인전 — 화풍 전환을 화단에 알리다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Le Salon Special Exhibition, Grand Palais, Paris — "the Korean Picasso." Dies in July.'
                        : '파리 그랑팔레 〈르 살롱전〉 특별전 — "한국의 피카소". 7월 별세.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul Arts Center retrospective publicly shows 100 drawings — a rarely known body of work.'
                        : '예술의전당 회고전 — 박생광 스케치 100점 첫 본격 공개.'}
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Section 3 — 이번 전시: 채색 이전의 호흡. */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-sun-strong pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  This exhibition —
                  <br />
                  <span className="text-charcoal-deep">the breath beneath color</span>
                </>
              ) : (
                <>
                  이번 전시 —
                  <br />
                  <span className="text-charcoal-deep">채색 이전의 호흡</span>
                </>
              )}
            </h2>
            <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
              {isEnglish ? (
                <>
                  <p>
                    For most of the past century the name <em>Park Saeng-gwang</em> has been
                    inseparable from color. The dense reds and ultramarines of his late paintings
                    crowd the imagination of any viewer who has met them. Yet the drawings — the
                    bare structure beneath that color — have remained, until recently, an almost
                    private body of work.
                  </p>
                  <p>
                    In March 2023, the Seoul Arts Center Hangaram Museum opened{' '}
                    <em>The Great Encounter: Park Saeng-gwang and Park Rae-hyun</em>. Among Park
                    Saeng-gwang&apos;s 181 contributions, <strong>100 were drawings</strong> — the
                    first time so many had been gathered for public view. Critics took the occasion
                    to register what had been suspected: a master of Korean colored ink painting was
                    also a draftsman of rare patience and economy.
                  </p>
                  <p>
                    The works here are pencil on paper, small in scale — most around 25 × 18 cm —
                    and direct in their address. They were the steps a master took to find the
                    figure before he found the color. To see them is to stand next to him at the
                    moment of first seeing.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    지난 한 세기 동안 박생광이라는 이름은 색에서 분리되지 않았다. 만년 채색화의 깊은
                    적색과 군청이 그의 화면을 만난 모든 사람의 기억을 채운다. 그러나 그 색 아래
                    놓였던 골격 — 드로잉들은, 최근까지도 거의 사적인 작업으로 남아 있었다.
                  </p>
                  <p>
                    2023년 3월 예술의전당 한가람미술관이 연 〈위대한 만남 — 박생광·박래현〉전이 그
                    영역을 처음 열어보였다. 박생광이 출품한 181점 중 <strong>스케치만 100점</strong>
                    . 한 자리에 이렇게 모인 적이 없던 분량이었다. 평론가들은 이 자리를 빌려 짐작해온
                    사실을 기록했다 — 채색화의 거장은 동시에 드문 인내와 절제의 드로잉 작가였다는
                    것을.
                  </p>
                  <p>
                    이번 전시에 걸리는 작품은 종이에 연필. 25×18cm 안팎의 소품이며 화면은
                    직설적이다. 거장이 색을 찾기 전에 형(形)을 찾았던 단계 — 그가 처음 본 순간 옆에
                    함께 서는 경험. 그것이 박생광 드로잉을 만나는 방식이다.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Gallery — bg-canvas (gallery-pearl), 연필 드로잉이 가장 잘 보이는 흰 벽. */}
        <div className="relative py-20 bg-canvas">
          <div className="max-w-[1440px] mx-auto px-4 mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-charcoal/20 pb-8">
            <div className="relative">
              <h2 className="text-4xl md:text-5xl mb-4 text-charcoal-deep font-black font-display text-balance">
                {isEnglish ? 'Exhibition Works' : '전시 작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-charcoal/5 -z-10 font-display font-black select-none">
                DRAWING
              </div>
              <p className="text-base sm:text-lg text-charcoal-muted font-medium">
                {isEnglish ? (
                  <>
                    <span className="text-sun-strong font-bold text-xl">{drawingCountLabel}</span>{' '}
                    drawings are currently on view.
                  </>
                ) : (
                  <>
                    총{' '}
                    <span className="text-sun-strong font-bold text-xl">{drawingCountLabel}</span>
                    점의 드로잉이 전시되어 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-charcoal-muted uppercase tracking-widest">
                Park Saeng-gwang Drawings
              </span>
              <span className="text-sm text-charcoal-soft">
                {isEnglish
                  ? 'Click a work to view its details'
                  : '작품을 클릭하여 상세 정보를 확인하세요'}
              </span>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto px-4">
            {drawings.length > 0 ? (
              <ParkSaenggwangDrawingGallery artworks={drawings} />
            ) : (
              <section className="py-24 text-center">
                <div className="inline-block rounded-xl border border-charcoal/10 bg-white p-12">
                  <h3 className="text-2xl font-bold text-charcoal-deep text-balance mb-4">
                    {isEnglish
                      ? 'Drawing data is being prepared'
                      : '드로잉 작품 데이터 준비 중입니다'}
                  </h3>
                  <p className="text-charcoal-muted text-balance mb-8 break-keep">
                    {isEnglish ? (
                      <>
                        <span className="block">
                          We are currently organizing works for the Park Saeng-gwang Drawings
                          exhibition.
                        </span>
                        <span className="mt-1 block">
                          In the meantime, you are warmly invited to browse the rest of the
                          collection.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block">
                          현재 박생광 드로잉전 작품 정보를 정리하고 있습니다.
                        </span>
                        <span className="mt-1 block">
                          전체 출품작 목록에서 다른 작품들을 먼저 감상하실 수 있습니다.
                        </span>
                      </>
                    )}
                  </p>
                  <Link
                    href="/artworks"
                    className="inline-flex items-center justify-center px-6 py-3 border border-charcoal/30 rounded text-charcoal-deep hover:bg-charcoal hover:text-white transition-colors font-medium"
                  >
                    {isEnglish ? 'Browse all artworks' : '전체 작품 보러 가기'}
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Visit — 전시 정보 카드. */}
        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          <h2 className="text-4xl md:text-5xl mb-12 text-charcoal-deep font-black font-display text-balance text-center">
            {isEnglish ? 'Visit' : '전시 안내'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white p-7 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(253,202,64,0.3)]">
              <h3 className="text-sm text-charcoal-muted font-bold tracking-widest uppercase mb-3">
                {isEnglish ? 'Dates' : '전시 기간'}
              </h3>
              <p className="text-xl text-charcoal-deep font-bold leading-tight break-keep">
                {isEnglish ? (
                  <>
                    <span className="block">May 20 (Wed)</span>
                    <span className="block">— Jun 8 (Mon), 2026</span>
                  </>
                ) : (
                  <>
                    <span className="block">2026. 5. 20 (수)</span>
                    <span className="block">— 6. 8 (월)</span>
                  </>
                )}
              </p>
            </div>

            <div className="bg-white p-7 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(253,202,64,0.3)]">
              <h3 className="text-sm text-charcoal-muted font-bold tracking-widest uppercase mb-3">
                {isEnglish ? 'Venue' : '장소'}
              </h3>
              <p className="text-xl text-charcoal-deep font-bold leading-tight mb-2">
                {isEnglish ? VENUE_NAME_EN : VENUE_NAME_KO}
              </p>
              <p className="text-sm text-charcoal-muted leading-relaxed">
                {isEnglish ? VENUE_ADDRESS_EN : VENUE_ADDRESS_KO}
              </p>
            </div>

            <div className="bg-white p-7 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(253,202,64,0.3)]">
              <h3 className="text-sm text-charcoal-muted font-bold tracking-widest uppercase mb-3">
                {isEnglish ? 'Hours' : '관람 시간'}
              </h3>
              <p className="text-xl text-charcoal-deep font-bold leading-tight mb-2">
                {isEnglish ? HOURS_EN : HOURS_KO}
              </p>
              <p className="text-sm text-charcoal-muted leading-relaxed">
                {isEnglish ? 'Free admission' : '무료 관람'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
