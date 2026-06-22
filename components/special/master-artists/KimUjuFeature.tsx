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

// 거장 작가 feature는 작가 페이지(/artworks/artist/김우주)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_UJU_PATH = `/artworks/artist/${encodeURIComponent('김우주')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimUjuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김우주' ||
    n === 'kim uju' ||
    n === 'kim woo-ju' ||
    n === 'kim wooju' ||
    n.replace(/[\s-]+/g, '') === 'kimuju' ||
    n.replace(/[\s-]+/g, '') === 'kimwooju'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김우주 — 들꽃의 생멸을 그리다, Wildflower',
    description:
      '들꽃이 피고 지는 생멸과 풍경을 회화로 담아내는 신진 작가 김우주. 홍익대학교 일반대학원 회화과에서 석사를 마치고 박사를 수료했으며, 2023년 홍익대학교 현대미술관에서 개인전 〈Wildflower season1〉을 선보였다. 작고 덧없는 것들의 시간을 응시하는 회화적 충동을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '김우주 — 들꽃이 피고 지는 생멸과 풍경을 회화로 담아내는 신진 작가. 작고 덧없는 것들의 시간, 그 회화적 충동.',
    ogAlt: '김우주 대표 작품',
    twitterTitle: '김우주',
    twitterDescription: '들꽃의 생멸을 그리다 — Wildflower 연작의 회화 작가 김우주',
    keywords:
      '김우주 작가, 들꽃, Wildflower, 회화, 풍경화, 홍익대학교 현대미술관, 회화적 충동, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Uju — Painting the Life and Death of Wildflowers',
    description:
      'Selected works by Kim Uju, an emerging painter who renders the blooming and withering of wildflowers and landscape in paint. She earned her M.F.A. and completed doctoral coursework in the Department of Painting at Hongik University Graduate School, and presented the solo exhibition 〈Wildflower Season 1〉 at the Hongik Museum of Art in 2023. View and collect her works at SAF Online.',
    ogDescription:
      'Kim Uju — an emerging painter who renders the life and death of wildflowers and landscape in paint. The time of small, fleeting things, and the pictorial impulse it stirs.',
    ogAlt: 'Kim Uju — featured work',
    twitterTitle: 'Kim Uju',
    twitterDescription:
      'Painting the life and death of wildflowers — painter Kim Uju of Wildflower',
    keywords:
      'Kim Uju artist, wildflower, painting, landscape painting, Hongik Museum of Art, pictorial impulse, Korean contemporary art',
  },
} as const;

export async function buildKimUjuMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_UJU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김우주');
  const artwork = allArtworks.find((a) => isKimUjuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Uju`
      : `${artwork.title} — 김우주`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_UJU_PATH, locale, true),
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

export default async function KimUjuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_UJU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김우주');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimUjuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Uju' : '김우주', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_UJU_PATH}#person-kim-uju`,
    name: isEnglish ? 'Kim Uju' : '김우주',
    alternateName: isEnglish ? '김우주' : 'Kim Uju',
    jobTitle: isEnglish ? 'Painter' : '회화 작가',
    description: isEnglish
      ? 'Kim Uju is an emerging Korean painter who renders the blooming and withering of wildflowers and landscape in paint. She earned her M.F.A. and completed doctoral coursework in the Department of Painting at Hongik University Graduate School.'
      : '김우주는 들꽃이 피고 지는 생멸과 풍경을 회화로 담아내는 신진 작가로, 홍익대학교 일반대학원 회화과에서 석사를 마치고 박사를 수료했습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University Graduate School, Dept. of Painting'
        : '홍익대학교 일반대학원 회화과',
    },
    knowsAbout: ['Painting', 'Wildflowers', 'Landscape painting', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Uju — SAF Online' : '김우주 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Uju from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김우주 작품을 소개합니다.',
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

          {/* Wildflower stems & soft bloom — 들꽃의 생멸 모티프 */}
          <div className="absolute top-0 left-12 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-24 h-full w-px bg-primary/20" />
          <div className="absolute top-16 right-16 w-28 h-28 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-14 left-1/4 w-24 h-24 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Uju · painter' : '김우주 · 회화 작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Small, fleeting things —
                  <br />
                  <span className="text-primary-soft">a wildflower, blooming and gone</span>
                </>
              ) : (
                <>
                  작고 덧없는 것들 —
                  <br />
                  <span className="text-primary-soft">피었다 지는 들꽃</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">She paints the life and death of a wildflower.</span>
                  <span className="mt-2 block">
                    The time of the small and the passing, held on canvas.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">들꽃의 생멸을 그린다.</span>
                  <span className="mt-2 block">
                    작고 스쳐 지나는 것들의 시간을, 화면에 머물게 한다.
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
                    The life and death of a wildflower —<br />
                    <span className="text-primary-strong">painted as landscape</span>
                  </>
                ) : (
                  <>
                    들꽃의 생멸 —<br />
                    <span className="text-primary-strong">풍경으로 그리다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Uju is an emerging painter who renders the blooming and withering of
                      wildflowers, and the landscapes that hold them, in paint. She earned her
                      M.F.A. from the Department of Painting at Hongik University Graduate School in
                      2013, and completed her doctoral coursework there in 2024.
                    </p>
                    <p>
                      Her subject is deliberately small. Where landscape painting has often reached
                      for the grand vista, Kim turns toward the wildflower — the bloom no one
                      planted, growing at the edge of a path and gone within a season. In her work
                      that smallness is not a limitation but a{' '}
                      <strong className="font-bold text-charcoal-deep">way of seeing time</strong>:
                      a flower that opens and fades carries, within a single short span, the whole
                      arc of living and dying.
                    </p>
                    <p>
                      This concern took its clearest form in her 2023 solo exhibition 〈Wildflower
                      Season 1〉 at the Hongik Museum of Art in Seoul, which followed her earlier
                      solo show 〈Pictorial Impulse〉 at PiaLuxART Gallery in 2016. The phrase{' '}
                      <em>pictorial impulse</em> names something at the centre of her practice: the
                      urge to paint not because a scene is important, but because it asks, quietly,
                      to be looked at and kept.
                    </p>
                    <p>
                      As a younger artist, Kim has built her practice through a steady run of group
                      exhibitions — from the 2024 Bank of Korea emerging artists exhibition and the
                      Seoul young-artist discovery projects, to earlier shows at the Kansong Art
                      &amp; Culture Foundation and POSCO Art Museum. Across these, the wildflower
                      has remained her constant: small, ordinary, and exactly for that reason worth
                      the length of a painting&apos;s attention.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김우주는 들꽃이 피고 지는 생멸과, 그것을 품은 풍경을 회화로 담아내는 신진
                      작가다. 2013년 홍익대학교 일반대학원 회화과에서 석사를 마쳤고, 2024년 같은
                      곳에서 박사를 수료했다.
                    </p>
                    <p>
                      그의 소재는 의도적으로 작다. 풍경화가 종종 장대한 전경을 향해 온 자리에서,
                      김우주는 들꽃으로 돌아선다 — 아무도 심지 않았으나 길가에 돋아, 한 계절 안에
                      사라지는 꽃. 그의 작업에서 그 작음은 한계가 아니라{' '}
                      <strong className="font-bold text-charcoal-deep">시간을 보는 방식</strong>
                      이다. 피었다 지는 꽃 한 송이는, 짧은 한 호흡 안에 살고 죽는 일의 전체를
                      담는다.
                    </p>
                    <p>
                      이 관심은 2023년 홍익대학교 현대미술관 개인전 〈Wildflower season1〉에서 가장
                      또렷한 형태를 얻었다. 그에 앞서 2016년 PiaLuxART갤러리에서 개인전 〈Pictorial
                      impulse〉를 열었다. <em>회화적 충동</em>이라는 말은 그의 작업 한가운데 있는
                      무엇을 가리킨다 — 어떤 장면이 중요해서가 아니라, 그것이 조용히 보아 달라고,
                      머물게 해 달라고 청하기에 그리는 충동.
                    </p>
                    <p>
                      신진 작가로서 김우주는 꾸준한 단체전을 통해 작업을 쌓아 왔다 — 2024년 한국은행
                      신진 작가전과 서울시 청년작가 신예발굴 프로젝트들에서부터, 그에 앞선 간송 Art
                      &amp; Culture Foundation과 포스코미술관의 전시까지. 그 모든 자리에서 들꽃은
                      그의 한결같은 주인공으로 남는다 — 작고 평범하기에, 바로 그 이유로 한 점의
                      그림이 기울이는 주의를 받을 자격이 있는 존재.
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
                        {isEnglish ? 'The life and death of wildflowers' : '들꽃의 생멸'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A bloom that opens and fades within a season — the whole arc of living and dying, held in something small.'
                          : '한 계절 안에 피었다 지는 꽃. 작은 것 안에 담긴, 살고 죽는 일의 전체.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Landscape, made small' : '작게 빚은 풍경'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not the grand vista but the edge of a path — landscape narrowed to where a wildflower actually grows.'
                          : '장대한 전경이 아니라 길가의 한 자리. 들꽃이 실제로 돋는 곳으로 좁혀진 풍경.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The pictorial impulse' : '회화적 충동'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The urge to paint what quietly asks to be looked at and kept — the impulse named in her 2016 exhibition.'
                          : '조용히 보아 달라고, 머물게 해 달라고 청하는 것을 그리는 충동 — 2016년 전시의 이름이 된 그 충동.'}
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
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'M.F.A., Dept. of Painting, Hongik University Graduate School.'
                        : '홍익대학교 일반대학원 회화과 석사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Pictorial Impulse〉 (PiaLuxART Gallery, Seoul).'
                        : '개인전 〈Pictorial impulse〉 (PiaLuxART갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Wildflower Season 1〉 (Hongik Museum of Art, Seoul).'
                        : '개인전 〈Wildflower season1〉 (홍익대학교 현대미술관, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes doctoral coursework, Dept. of Painting, Hongik University Graduate School.'
                        : '홍익대학교 일반대학원 회화과 박사 수료.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: Bank of Korea emerging artists exhibition; Seoul young-artist discovery projects 〈Soar〉 (Sewoon Hall) and 〈A Seed of Leaping〉 (Tapgol Art Museum).'
                        : '단체전: 한국은행 신진 작가전; 서울시 청년작가 신예발굴 프로젝트 〈비상〉(세운홀)·〈도약의 단초〉(탑골미술관).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected group exhibitions' : '주요 단체전'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2024 — Seoul young-artist discovery project 〈Soar〉 (Sewoon Hall); 〈A Seed of Leaping〉 (Tapgol Art Museum); Bank of Korea emerging artists exhibition (Bank of Korea Gallery)'
                        : '2024 — 서울시 청년작가 신예발굴 프로젝트 〈비상〉 (세운홀); 〈도약의 단초〉 (탑골미술관); 한국은행 신진 작가전 (한국은행 갤러리)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2021 — 〈Space Simulation〉 (AI Museum × VR Museum)'
                        : '2021 — 〈Space Simulation〉 (AI Museum × VR Museum)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2016 — 〈OLD & NEW〉 (Kansong Art & Culture Foundation); 〈Oktopsari〉 (Alternative Space Oktop)'
                        : '2016 — 〈OLD & NEW〉 (간송 Art & Culture Foundation); 〈옥탑사리 전〉 (Alternative space Oktop)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2014 — 〈Flea market + Another Christmas〉 (POSCO Art Museum)'
                        : '2014 — 〈Flea market+Another Christmas〉 (포스코미술관)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2013 — 〈Challenge〉 (Hongik Museum of Art)'
                        : '2013 — 〈도전〉 (홍익대학교 현대미술관)'}
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
                  <span className="text-charcoal-deep">
                    on the wildflower, time, and the impulse
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">들꽃과 시간, 그리고 충동에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 작은 것을 택한다는 일 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'On choosing the small' : '작은 것을 택한다는 일'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A wildflower is, by definition, what no one chose. No one planted it, no one
                        tends it, and when it is gone no one records the loss. To make it the centre
                        of a painting is already a quiet argument — that the unchosen and the
                        overlooked are worth the full length of an artist&apos;s looking.
                      </p>
                      <p>
                        Kim Uju&apos;s practice begins from that argument. Where the grand landscape
                        offers the eye a great deal at once, the wildflower offers almost nothing —
                        and asks, in exchange, that you stay. The smallness of the subject sets the
                        pace of the work: slow, attentive, returning again to the same modest thing
                        until it gives up its weight.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        들꽃은 정의상 아무도 택하지 않은 것이다. 아무도 심지 않았고, 아무도 돌보지
                        않으며, 사라져도 아무도 그 상실을 기록하지 않는다. 그것을 그림의 중심에
                        둔다는 것은 이미 조용한 주장이다 — 택해지지 않은 것, 지나쳐지는 것이 한
                        작가의 응시 전부를 받을 가치가 있다는.
                      </p>
                      <p>
                        김우주의 작업은 그 주장에서 시작한다. 장대한 풍경이 눈에 한꺼번에 많은 것을
                        내준다면, 들꽃은 거의 아무것도 내주지 않는다 — 대신, 머물러 달라 청한다.
                        소재의 작음이 작업의 속도를 정한다: 느리게, 주의 깊게, 같은 수수한 대상으로
                        다시 돌아가, 그것이 제 무게를 내어놓을 때까지.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 생멸 — 한 송이 안의 시간 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Life and death — the time inside a single bloom'
                    : '생멸 — 한 송이 안의 시간'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        To paint a wildflower honestly is to paint time. A bloom opens, holds for a
                        few days, and fades; the whole cycle of living and dying is compressed into
                        a single short season. The flower does not narrate this — it simply is it.
                        In Kim&apos;s 〈Wildflower Season 1〉, that compressed arc is the real
                        subject: not the flower as decoration, but the flower as a small clock.
                      </p>
                      <p>
                        Painting, oddly, is the right medium for this. The canvas stops a moment
                        that in life cannot be stopped — the flower at the edge of fading — and
                        holds it open. What is most fleeting in the world becomes, on the wall, the
                        most durable: a passing thing made to stay long enough to be properly seen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        들꽃을 정직하게 그린다는 것은 시간을 그린다는 것이다. 꽃은 피어, 며칠을
                        버티고, 진다. 살고 죽는 전체 순환이 짧은 한 계절 안에 응축된다. 꽃은 그것을
                        서술하지 않는다 — 그저 그것일 뿐이다. 김우주의 〈Wildflower season1〉에서 그
                        응축된 호흡이 진짜 주제다. 장식으로서의 꽃이 아니라, 작은 시계로서의 꽃.
                      </p>
                      <p>
                        이상하게도, 회화는 이에 꼭 맞는 매체다. 화면은 삶에서 멈출 수 없는 한 순간 —
                        지기 직전의 꽃 — 을 멈춰, 열린 채로 붙든다. 세상에서 가장 덧없는 것이 벽
                        위에서 가장 오래가는 것이 된다: 제대로 보일 만큼 머물도록 붙들린, 스쳐 가던
                        것.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 회화적 충동 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈Pictorial Impulse〉 — why paint at all'
                    : '〈Pictorial impulse〉 — 왜 그리는가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Uju named her 2016 solo exhibition 〈Pictorial Impulse〉, and the phrase
                        reads almost as a statement of method. The impulse it names is not grand. It
                        is the small, recurring pull to put down in paint a thing that, by any
                        practical measure, did not need painting — a wildflower at the roadside,
                        unimportant to everyone but the one who stopped.
                      </p>
                      <p>
                        That impulse is, finally, an argument for attention itself. In a world that
                        rewards the large and the loud, choosing to paint the small and the quiet is
                        a way of insisting that looking closely is its own value. From the early
                        〈Pictorial Impulse〉 to 〈Wildflower Season 1〉 and the years of doctoral
                        study between, Kim has stayed with that one insistence — and made of it a
                        body of work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김우주는 2016년 개인전을 〈Pictorial impulse〉라 이름 붙였고, 그 말은 거의
                        방법의 선언처럼 읽힌다. 그것이 가리키는 충동은 장대하지 않다. 어떤 실용적
                        척도로도 그릴 필요가 없던 것 — 길가의 들꽃, 멈춰 선 이를 제외한 모두에게
                        대수롭지 않은 것 — 을 굳이 물감으로 옮기게 만드는, 작고 거듭되는 이끌림이다.
                      </p>
                      <p>
                        그 충동은 결국 주의(注意) 자체를 향한 주장이다. 크고 시끄러운 것이 보상받는
                        세계에서, 작고 조용한 것을 그리기로 택하는 일은 가까이 들여다보는 것이 그
                        자체로 가치임을 고집하는 방식이다. 초기 〈Pictorial impulse〉에서
                        〈Wildflower season1〉으로, 그 사이의 박사 과정 시간을 거치며, 김우주는 그
                        하나의 고집과 함께 머물러 왔다 — 그리고 그것으로 한 몸의 작업을 이루었다.
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
                      From a flower no one planted to a canvas that asks you to stay, Kim Uju&apos;s
                      work pursues a single question: what does it mean to give the small and the
                      fleeting the full weight of our looking? She joins this campaign not as a
                      subject of its cause but as a fellow artist in solidarity — offering her work
                      so that those navigating financial exclusion today might find a way through.
                    </>
                  ) : (
                    <>
                      아무도 심지 않은 꽃에서, 머물러 달라 청하는 화면으로, 김우주의 작업은 하나의
                      물음을 추구한다: 작고 덧없는 것에 우리 응시의 온 무게를 내준다는 것은 무엇을
                      뜻하는가. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 오늘 금융 차별을 헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의
                      작품을 내놓는다.
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
                WILDFLOWER
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Uju</span>
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
                    Kim Uju joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김우주 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_UJU_PATH}
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
