import type { Metadata } from 'next';
import SafeImage from '@/components/common/SafeImage';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MasterArtistMediumSections from '@/components/special/MasterArtistMediumSections';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PaperGrain from '@/components/common/PaperGrain';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { resolveEnRobots } from '@/lib/en-indexable';
import { getSupabaseArtworksByArtist } from '@/lib/supabase-data';
import { resolveLocale } from '@/lib/server-locale';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import type { Artwork, ArtworkListItem } from '@/types';

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/박생광)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_SAENGGWANG_PATH = `/artworks/artist/${encodeURIComponent('박생광')}`;

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
    title: '박생광 드로잉전 — 오방색 거장의 연필화 | 씨앗페',
    description:
      '오방색의 거장 박생광(1904–1985)의 연필화. 1950년 전쟁이 그 이전의 모든 작품을 소실시켰고, 이 연필화들이 현존하는 박생광의 가장 이른 그림들이다. 2023년 예술의전당 한가람미술관에서 100점이 처음 공개된 이래 첫 전문 전시. 2026년 5월 20일부터 6월 28일까지 갤러리 PEG(서울특별시 은평구 통일로 870 M타워 6층).',
    ogDescription:
      '전쟁이 모든 것을 태운 자리에서 연필로 다시 그린 박생광 — 현존 최초의 작품을 만나는 연필화 특별전. 5/20~6/28 갤러리 PEG · 서울특별시 은평구 통일로 870 M타워 6층.',
    ogAlt: '박생광 드로잉전 대표 이미지',
    twitterTitle: '박생광 드로잉전',
    twitterDescription: '전쟁이 모든 것을 태웠다. 연필이 남긴 것이 현존하는 가장 이른 박생광이다.',
  },
  en: {
    title: 'Park Saeng-gwang Drawings',
    description:
      'Pencil works by Park Saeng-gwang (1904–1985), master of obangsaek. The 1950 war destroyed his entire prior body of work; these pencil drawings are the earliest surviving traces of his hand. Following the 2023 Seoul Arts Center retrospective that first assembled 100 of these works publicly, this special exhibition presents them to collectors and viewers. May 20–June 28, 2026 at Gallery PEG (M-Tower 6F, Eunpyeong, Seoul).',
    ogDescription:
      'War erased everything that came before — these pencil works are the earliest Park Saeng-gwang that survives. Drawings exhibition, May 20–Jun 28, Gallery PEG, Eunpyeong, Seoul.',
    ogAlt: 'Park Saeng-gwang Drawings exhibition key visual',
    twitterTitle: 'Park Saeng-gwang Drawings',
    twitterDescription:
      'War erased everything before. These pencil works are the earliest Park Saeng-gwang that survives.',
  },
} as const;

const EXHIBITION_START = '2026-05-20';
const EXHIBITION_END = '2026-06-28';
const VENUE_NAME_KO = '갤러리 PEG';
const VENUE_NAME_EN = 'Gallery PEG';
const VENUE_ADDRESS_KO = '서울특별시 은평구 통일로 870 M타워 6층';
const VENUE_ADDRESS_EN = 'M-Tower 6F, 870 Tongil-ro, Eunpyeong-gu, Seoul, Korea';
const VENUE_STREET = '통일로 870 M타워 6층';
const VENUE_REGION = 'Seoul';
const VENUE_LOCALITY_KO = '은평구';
const VENUE_LOCALITY_EN = 'Eunpyeong-gu';
const HOURS_KO = '오전 11시 ~ 오후 8시';
const HOURS_EN = '11:00 AM – 8:00 PM';

export async function buildParkSaenggwangMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_SAENGGWANG_PATH, locale);

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
    // koOnly=false: EN 특별전은 영문 native 콘텐츠(EN_INDEXABLE_PAGES 등재 + sitemap
    // bilingual 발행)이므로 self-canonical + 양방향 hreflang으로 sitemap과 신호 일치.
    // (오윤 특별전과 동일한 3중 신호 충돌 해소 — 2026-06-12 감사)
    alternates: createLocaleAlternates(PARK_SAENGGWANG_PATH, locale, false),
    ...(() => {
      const enRobots = resolveEnRobots(locale, true);
      return enRobots ? { robots: enRobots } : {};
    })(),
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

export default async function ParkSaenggwangFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_SAENGGWANG_PATH, locale);
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
    '@id': `${SITE_URL}${PARK_SAENGGWANG_PATH}#person-park-saenggwang`,
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
    sameAs: ['https://ko.wikipedia.org/wiki/박생광', 'https://www.wikidata.org/wiki/Q16174513'],
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Saeng-gwang Drawings' : '박생광 드로잉전',
    description: isEnglish
      ? 'A pencil works exhibition by Korean master Park Saeng-gwang (1904–1985). The 1950 war destroyed everything before; these pencil drawings are the earliest surviving works he left.'
      : '오방색의 거장 박생광(1904–1985)의 연필화 특별전. 1950년 전쟁이 그 이전의 모든 작품을 소실시켰고, 이 연필화들이 현존하는 박생광의 가장 이른 그림들이다.',
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
      <div className={`w-full bg-canvas-soft min-h-screen font-sans ${SAWTOOTH_TOP_SAFE_PADDING}`}>
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
                  War Erased Everything Before.
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-sun-strong">Pencil Survived.</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                  <br />
                  The First Works He Left.
                </>
              ) : (
                <>
                  전쟁이 모든 것을 태웠다.
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-sun-strong">연필은 남았다.</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                  <br />
                  그가 남긴 최초의 그림.
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The pencil works of Park Saeng-gwang — the earliest that survive. War destroyed
                    everything before; these drawings are where his extant oeuvre begins.
                  </span>
                  <span className="mt-2 block text-base sm:text-lg md:text-xl text-white/70">
                    <span className="inline-block">May 20 – Jun 28, 2026</span>
                    <span className="mx-2 text-white/40" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-block">Gallery PEG · M-Tower 6F, Eunpyeong</span>
                    <span className="mx-2 text-white/40" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-block">11am–8pm</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    오방색의 거장이 연필로 남긴 가장 이른 작품들. 전쟁이 그 이전의 모든 것을 태웠고,
                    이 연필화들이 실물로 현존하는 최초의 박생광이다.
                  </span>
                  <span className="mt-2 block text-base sm:text-lg md:text-xl text-white/70">
                    <span className="inline-block">2026년 5월 20일 ~ 6월 28일</span>
                    <span className="mx-2 text-white/40" aria-hidden="true">
                      ·
                    </span>
                    <span className="inline-block">
                      갤러리 PEG · 서울특별시 은평구 통일로 870 M타워 6층
                    </span>
                    <span className="mx-2 text-white/40" aria-hidden="true">
                      ·
                    </span>
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
                    <span className="text-charcoal-deep underline decoration-sun-strong decoration-4 underline-offset-4">
                      to the Grand Palais
                    </span>
                  </>
                ) : (
                  <>
                    진주에서
                    <br />
                    <span className="text-charcoal-deep underline decoration-sun-strong decoration-4 underline-offset-4">
                      그랑팔레까지
                    </span>
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
                      pencil drawings that ran alongside a lifetime — are now read as the moment
                      when Korean colored ink painting found a new ground.
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
                      그는 세상을 떠났다. 그가 남긴 백여 점의 만년 채색화, 그리고 생애를 가로지른
                      연필화들은 이제 한국 채색화가 새로운 지반을 얻은 순간으로 다시 읽힌다.
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

          {/* Section 3 — 이번 전시: 연필이 남긴 가장 이른 그림. */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-sun-strong pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  This exhibition —
                  <br />
                  <span className="text-charcoal-deep">the earliest works, in pencil</span>
                </>
              ) : (
                <>
                  이번 전시 —
                  <br />
                  <span className="text-charcoal-deep">연필이 남긴 가장 이른 그림</span>
                </>
              )}
            </h2>
            <div className="space-y-12">
              {/* Intro */}
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Saeng-gwang&apos;s name has long been inseparable from color. The deep
                      reds and ultramarines of his late paintings crowd the memory of anyone who has
                      met them. But the pencil works tell a different story. The 1950 war destroyed
                      everything that came before — every canvas he had brought from Japan, every
                      drawing he had stored. From the ruins Park began again: pencil on paper, the
                      devastated landscape around him as his subject. Those pencil drawings are the
                      earliest surviving works he left.
                    </p>
                    <p>
                      In March 2023 the Seoul Arts Center Hangaram Museum gathered{' '}
                      <strong>100</strong> of these pencil works publicly for the first time, in{' '}
                      <em>The Great Encounter: Park Saeng-gwang and Park Rae-hyun</em>. This showing
                      continues that effort — pencil on paper, most around 25 × 18 cm, presented as
                      the independent works they are.
                    </p>
                    <p>
                      These pencil lines trace a journey that begins in the ruins of Jinju in 1950 —
                      through thirty years of suspicion, a landscape slowly returning to itself, and
                      a season of renewed purpose in Japan — arriving at last at the sacred sites of
                      India in 1979. One medium, across a lifetime.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박생광이라는 이름 앞에는 오랫동안 색이 따라붙었다. 만년 채색화의 깊은 적색과
                      군청이 그를 본 모든 이의 기억을 채운다. 그러나 연필화들은 다른 차원의 이야기를
                      담는다. 1950년 전쟁은 그가 일본에서 제작·보관하던 작품까지 포함해 그 이전의
                      모든 것을 태워버렸다. 잿더미 위에서 박생광은 다시 시작했다 — 종이에 연필로,
                      폐허가 된 주위를 그리는 것으로. 그 연필화들이 실물로 남아 있는 박생광의 가장
                      이른 그림들이다.
                    </p>
                    <p>
                      2023년 3월 예술의전당 한가람미술관 〈위대한 만남 — 박생광·박래현〉에서
                      박생광의 연필화 <strong>100점</strong>이 처음 한자리에 공개됐다. 이번 전시는
                      그 흐름 위에서, 종이에 연필 25×18cm 안팎의 작품들을 자율적 완성작으로 다시
                      모은다.
                    </p>
                    <p>
                      그 연필 선들의 여정은 1950년 폐허가 된 진주에서 시작한다. 30년의 혐의를
                      감내하며 다시 살아난 풍경들을 그리고, 한 번 더 일본을 찾아 작업에 매진하다가,
                      마침내 1979년 불교 발상지 인도에 닿는다. 연필 하나로 관통한 생애의 궤적이다.
                    </p>
                  </>
                )}
              </div>

              {/* 큐레이터 원문 5개 서사 */}
              <div className="space-y-10">
                {/* 1. 파괴된 터전에서 */}
                <div>
                  <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                    <span className="w-2 h-2 bg-sun-strong rotate-45 shrink-0" />
                    {isEnglish
                      ? 'From the ruins — drawing Jinju in rubble'
                      : '파괴된 터전에서 — 폐허의 진주를 그리다'}
                  </h3>
                  <p className="text-xl leading-[1.8] text-charcoal font-medium">
                    {isEnglish ? (
                      <>
                        When the war reached Jinju in 1950, Park Saeng-gwang lost everything — his
                        home, his paintings, the canvases he had carried back from Japan. He had
                        already lived through the Tokyo firebombing. He started over. Drawing pencil
                        lines across paper, he took the ruined landscape of Jinju as his subject. In
                        one sketch looking across the Namgang River toward Jinju Fortress, the
                        famous Chokseongnu pavilion is absent — it had been bombed to rubble. The
                        Chokseongnu standing there today is a later reconstruction. These drawings
                        are witnesses to that destruction, and they are the earliest surviving works
                        Park Saeng-gwang left behind.
                      </>
                    ) : (
                      <>
                        1950년 전쟁이 터지자 박생광이 살던 집은 물론, 일본에서 힘들게 가져와
                        보관하던 작품들까지 모두 잿더미가 됐다. 도쿄 폭격을 이미 겪은 그는 모든 것을
                        다시 시작하는 마음으로 폐허가 된 진주의 풍경을 그리기 시작했다. 남강
                        건너에서 진주성 쪽을 바라보며 그린 연필화에는 그 유명한 촉석루가 없다.
                        폭격으로 무너졌기 때문이다. 지금의 촉석루는 그 후에 복원한 건물이다. 이
                        연필화들은 그 파괴의 증언인 동시에, 박생광이 실물로 남긴 가장 이른
                        작품들이다.
                      </>
                    )}
                  </p>
                </div>

                {/* 2. 30년의 혐의 */}
                <div>
                  <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                    <span className="w-2 h-2 bg-sun-strong rotate-45 shrink-0" />
                    {isEnglish
                      ? 'Thirty years of suspicion — but not in pencil'
                      : '30년의 혐의, 그러나 연필화에는'}
                  </h3>
                  <p className="text-xl leading-[1.8] text-charcoal font-medium">
                    {isEnglish ? (
                      <>
                        Throughout those years in the ruins — and carrying a weight that had begun
                        long before — Park Saeng-gwang faced another burden. His father was a
                        Donghak believer — a member of the guard for Jeon Bong-jun, the peasant
                        leader, who survived when others did not. And it was this man&apos;s son who
                        crossed to Japan to study art. Unlike most students of his generation, Park
                        stayed long — moving from Kyoto to Tokyo, building a house with a
                        patron&apos;s support, and eventually his staunchly anti-Japanese father
                        came to spend his final years and die in Japan too. For thirty years after
                        liberation, Park bore the suspicion of a so-called Japanese-color aesthetic.
                        But nowhere in the pencil works of those decades is any such trace to be
                        found.
                      </>
                    ) : (
                      <>
                        폐허를 그리던 그 세월에도, 또 하나의 무게가 그를 눌렀다. 그 연원은 아버지로
                        거슬러 올라간다 — 동학교도이자, 농민군의 우두머리 전봉준의 호위 부대에
                        속했다가 마지막에 살아남은 사람. 그 아들이 적국 일본으로 건너가 미술을
                        공부했다. 더구나 대부분의 유학생과 달리 교토에서 도쿄로 옮기며 오래 머물렀다
                        — 후원으로 집을 짓고, 심지어 극렬 반일인사였던 아버지까지 만년을 일본에서
                        보내다 눈을 감았다. 광복 후 30년 동안 박생광은 이른바 &lsquo;일본색&rsquo;
                        혐의의 아픔을 감내해야 했다. 그러나 그 시간 동안의 연필화 어디에도 그런
                        흔적은 없다.
                      </>
                    )}
                  </p>
                </div>

                {/* 3. 되살아나는 풍경 */}
                <div>
                  <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                    <span className="w-2 h-2 bg-sun-strong rotate-45 shrink-0" />
                    {isEnglish ? 'Landscape returning' : '되살아나는 풍경'}
                  </h3>
                  <p className="text-xl leading-[1.8] text-charcoal font-medium">
                    {isEnglish ? (
                      <>
                        Through those decades of suspicion, Park&apos;s pencil never stopped — and
                        his gaze widened beyond Jinju. Among the surviving works are pencil drawings
                        of Baengnoktam, the crater lake of Hallasan on Jeju Island — a few of them
                        were later reworked as colored paintings. There are also drawings of
                        Haeundae in Busan. Many landscapes carry neither a place name nor a date,
                        which is itself a kind of testimony: these were not made as documents but as
                        acts of looking, recorded in the ordinary flow of a life being lived. And
                        that eye, in time, was finding its way toward somewhere farther still.
                      </>
                    ) : (
                      <>
                        혐의를 감내하는 긴 시간 동안에도, 박생광의 연필은 멈추지 않았다. 진주를
                        넘어, 더 넓은 곳으로 시선이 열려갔다. 제주 한라산 백록담을 담은 연필화들이
                        있다 — 이 중 몇 점은 훗날 채색화로 이어지기도 했다. 부산 해운대의 풍경을
                        그린 것도 남아 있다. 상당히 많은 연필화들은 장소와 그린 때를 알 수 없어
                        아쉬움을 남기지만, 그 불확실성 자체가 이 시기 그림들의 성격을 말해준다 —
                        기록이 아닌 눈의 운동, 그가 살아낸 자리에서 자연스럽게 그려낸 풍경들. 그리고
                        그 시선은, 이내 더 먼 곳을 향하기 시작했다.
                      </>
                    )}
                  </p>
                </div>

                {/* 4. 다시 일본에서 */}
                <div>
                  <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                    <span className="w-2 h-2 bg-sun-strong rotate-45 shrink-0" />
                    {isEnglish ? 'Japan, once more' : '다시 일본에서'}
                  </h3>
                  <p className="text-xl leading-[1.8] text-charcoal font-medium">
                    {isEnglish ? (
                      <>
                        The Japanese painters Park had known in his youth were flourishing, their
                        careers rebuilt on postwar prosperity. Some of them remembered their old
                        colleague and called him back. Around the same time his youngest daughter
                        was awarded a national scholarship to study pharmacology at the University
                        of Tokyo. He decided to go — to support her studies, and to work. Looking
                        back on those years, he recalled them as a return to his younger self:{' '}
                        <em>
                          &ldquo;years in which, for the first time in decades, I threw myself into
                          work with the eagerness of youth.&rdquo;
                        </em>
                      </>
                    ) : (
                      <>
                        일본에서 젊은 시절을 보내며 사귀었던 동료 화가들은 전후 복구된 경제를
                        바탕으로 활발히 활동하고 있었다. 그 중 몇몇이 오랜 벗 박생광을 기억하고
                        불렀다. 마침 막내 딸이 도쿄대학교 약학과 국비장학생으로 초청을 받아 일본에
                        살게 됐다. 딸의 유학 생활을 돕는 동시에 자신도 제작에 몰두하기로 결심했다.
                        그 시절을 뒤돌아보며 박생광은 회상했다 —{' '}
                        <em>
                          &ldquo;수십 년 만에 다시 의욕에 가득 찼던 젊은 시절로 돌아가 작품 활동에
                          매진한 수년이었다.&rdquo;
                        </em>
                      </>
                    )}
                  </p>
                </div>

                {/* 5. 인도 */}
                <div>
                  <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                    <span className="w-2 h-2 bg-sun-strong rotate-45 shrink-0" />
                    {isEnglish ? 'India — toward the source' : '인도 — 근원을 찾아'}
                  </h3>
                  <p className="text-xl leading-[1.8] text-charcoal font-medium">
                    {isEnglish ? (
                      <>
                        In 1979, at seventy-five, Park Saeng-gwang astonished the Korean art world
                        with a dramatic transformation and received extraordinary acclaim. Standing
                        at the height of his recognition, he accepted a patron&apos;s help and set
                        out for India. The arc was long: a Japanese teacher had noticed his drawing
                        gift in a small Jinju school and urged him toward Kyoto; in Japan he had
                        sought traces of Chinese and Korean art in what he called the &ldquo;museum
                        of Asian civilization&rdquo;; with a patron&apos;s support he had traveled
                        to China. Now, at last, he reached the other axis of Asian civilization —
                        the birthplace of Buddhism. In India he drew as if possessed, making pencil
                        works everywhere his feet touched ground.
                      </>
                    ) : (
                      <>
                        1979년, 75세의 박생광은 노익장을 과시하듯 놀라운 변화를 보이며 화단의 주목을
                        받았다. 이 성취 위에서 그는 한 후원자의 도움으로 인도를 향했다. 여정은
                        길었다 — 진주의 작은 학교에서 그림 솜씨를 알아본 일본인 교사의 권유로 교토
                        유학이 시작됐고, 일본에서는 &lsquo;아시아문명의 박물관&rsquo;이라고 한
                        곳에서 중국과 한국 미술의 흔적을 찾았으며, 후원자의 도움으로 중국 여행도 할
                        수 있었다. 그리고 마침내 아시아문명의 또 다른 축, 불교의 발상지 인도로 발을
                        내딛었다. 인도에서 그는 발디디는 곳마다 신들린 듯 연필화를 그렸다.
                      </>
                    )}
                  </p>
                </div>
              </div>
              {/* 종합 마무리 — 연필화 coda */}
              <div className="border-l-[6px] border-sun-strong pl-8 py-3 mt-4">
                <p className="text-xl leading-[1.8] text-charcoal font-medium">
                  {isEnglish ? (
                    <>
                      From the rubble of Jinju in 1950 to the sacred sites of India in 1979, the
                      pencil was the one unbroken thread. If the late colored paintings announced
                      him to the world, these pencil drawings were there before those colors, and
                      still there after — the artist&apos;s most continuous voice. This exhibition
                      is that voice, heard on its own terms.
                    </>
                  ) : (
                    <>
                      1950년 폐허의 진주에서 1979년 인도의 성지까지, 연필은 그를 관통한 단 하나의
                      끊어지지 않은 선이었다. 만년 채색화가 그를 세계에 알렸다면, 연필화는 그 색이
                      오기 전에도, 그 색이 완성된 뒤에도 끝까지 그와 함께한 언어였다. 이번 전시는 그
                      언어를, 그 자체로 듣는 자리다.
                    </>
                  )}
                </p>
              </div>
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
                    <span className="text-charcoal-deep font-bold text-xl">
                      {drawingCountLabel}
                    </span>{' '}
                    drawings are currently on view.
                  </>
                ) : (
                  <>
                    총{' '}
                    <span className="text-charcoal-deep font-bold text-xl">
                      {drawingCountLabel}
                    </span>
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
              <MasterArtistMediumSections
                artworks={drawings}
                isEnglish={isEnglish}
                returnTo={PARK_SAENGGWANG_PATH}
                theme="light"
              />
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
                          전체 출품작 목록에서 다른 작품을 먼저 감상할 수 있습니다.
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

        {/* Retention — 박생광 관련 한국화/민화 hub. (작가 페이지 자기 자신 링크는 제거) */}
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-charcoal-deep mb-3 text-center break-keep">
            {isEnglish ? 'Explore Park Saeng-gwang Deeper' : '박생광을 더 깊이 만나기'}
          </h2>
          <p className="text-sm md:text-base text-charcoal-muted mb-8 text-center break-keep">
            {isEnglish
              ? 'Continue with related Korean painting masters, traditional minhwa, and master interviews.'
              : '박생광 작가의 다른 작품과 한국화·민화의 계보를 씨앗페에서 이어볼 수 있습니다.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/stories/park-saenggwang-last-transformation"
              className="block rounded-2xl border border-charcoal/15 bg-white p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-primary-strong mb-2">
                {isEnglish ? 'Magazine essay' : '매거진 정전 에세이'}
              </div>
              <div className="text-base font-medium text-charcoal-deep leading-snug break-keep">
                {isEnglish
                  ? 'Park Saeng-gwang — the master who reinvented himself in his final 8 years'
                  : '박생광 — 마지막 8년의 폭발적 변신, 오방색 한국화로 거듭난 화가'}
              </div>
            </Link>
            <Link
              href="/stories/korean-painting-tradition-meets-modern"
              className="block rounded-2xl border border-charcoal/15 bg-white p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-primary-strong mb-2">
                {isEnglish ? 'Korean painting hub' : '한국화 hub'}
              </div>
              <div className="text-base font-medium text-charcoal-deep leading-snug break-keep">
                {isEnglish
                  ? 'Korean painting tradition meets modern — masters and inheritors'
                  : '한국 회화 전통과 현대의 만남 — 거장과 계승자들'}
              </div>
            </Link>
            <Link
              href="/stories/stone-pigment-seokchae-aesthetics"
              className="block rounded-2xl border border-charcoal/15 bg-white p-5 hover:bg-canvas-strong transition-colors"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-primary-strong mb-2">
                {isEnglish ? 'Material story' : '재료 이야기'}
              </div>
              <div className="text-base font-medium text-charcoal-deep leading-snug break-keep">
                {isEnglish
                  ? 'Stone pigment (seokchae) — mineral colors that last a thousand years'
                  : '석채(石彩)의 세계 — 광물 분쇄에서 천 년 가는 색까지'}
              </div>
            </Link>
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
                    <span className="block">— Jun 28 (Sun), 2026</span>
                  </>
                ) : (
                  <>
                    <span className="block">2026. 5. 20 (수)</span>
                    <span className="block">— 6. 28 (일)</span>
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
