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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이유지)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_YUJI_PATH = `/artworks/artist/${encodeURIComponent('이유지')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeYujiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이유지' ||
    n === 'lee yuji' ||
    n === 'yi yuji' ||
    n.replace(/[\s-]+/g, '') === 'leeyuji' ||
    n.replace(/[\s-]+/g, '') === 'yiyuji'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이유지 — 심연에서 피어나는 염원의 풍경',
    description:
      '회화 작가 이유지. 깊은 내면의 풍경과 염원의 정서를 화폭에 담는다. 심연과 습지에서 피어나는 자아의 꽃, 꿈과 파라다이스의 환상을 사색적이고 서정적인 톤으로 그려낸다. 이유지의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '이유지 — 깊은 내면의 풍경과 염원을 그리는 회화 작가. 심연·습지에서 피어나는 자아의 꽃, 사색적이고 서정적인 화면.',
    ogAlt: '이유지 대표 작품',
    twitterTitle: '이유지',
    twitterDescription: '심연에서 피어나는 염원의 풍경 — 회화 작가 이유지',
    keywords: '이유지 작가, 회화, 심연의 풍경, 염원, 서정 회화, 신진 작가, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Yuji — Landscapes of Longing, Blooming from the Depths',
    description:
      'Selected works by Lee Yuji, a painter who renders deep inner landscapes and the emotion of longing. Flowers of the self that bloom from the abyss and the wetland, fantasies of dream and paradise, painted in a contemplative and lyrical tone. View and collect her works at SAF Online.',
    ogDescription:
      'Lee Yuji — a painter of deep inner landscapes and longing. Flowers of the self blooming from the depths, in a contemplative and lyrical register.',
    ogAlt: 'Lee Yuji — featured work',
    twitterTitle: 'Lee Yuji',
    twitterDescription: 'Landscapes of longing, blooming from the depths — painter Lee Yuji',
    keywords:
      'Lee Yuji artist, painting, inner landscape, longing, lyrical painting, emerging Korean artist',
  },
} as const;

export async function buildLeeYujiMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_YUJI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이유지');
  const artwork = allArtworks.find((a) => isLeeYujiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Yuji`
      : `${artwork.title} — 이유지`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_YUJI_PATH, locale, true),
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

export default async function LeeYujiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_YUJI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이유지');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeYujiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Yuji' : '이유지', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_YUJI_PATH}#person-lee-yuji`,
    name: isEnglish ? 'Lee Yuji' : '이유지',
    alternateName: isEnglish ? '이유지' : 'Lee Yuji',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Lee Yuji is a painter who renders deep inner landscapes and the emotion of longing — flowers of the self that bloom from the abyss and the wetland, painted in a contemplative and lyrical tone.'
      : '이유지는 깊은 내면의 풍경과 염원의 정서를 그리는 회화 작가입니다. 심연과 습지에서 피어나는 자아의 꽃을 사색적이고 서정적인 톤으로 화폭에 담아냅니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Suwon University, Dept. of Western Painting' : '수원대학교 서양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Kookmin University Graduate School' : '국민대학교 대학원',
      },
    ],
    knowsAbout: ['Painting', 'Inner landscape', 'Lyrical figuration', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Yuji — SAF Online' : '이유지 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Yuji from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 이유지 작품을 소개합니다.',
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

          {/* Abyssal bloom — 심연에서 피어나는 빛 모티프 */}
          <div className="absolute top-8 left-1/4 w-40 h-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-6 right-12 w-32 h-32 rounded-full bg-sun/10 blur-3xl" />
          <div className="absolute top-1/2 left-10 h-px w-32 bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Yuji · painting' : '이유지 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  From the depths,
                  <br />
                  <span className="text-primary-soft">a flower of longing blooms</span>
                </>
              ) : (
                <>
                  심연에서,
                  <br />
                  <span className="text-primary-soft">염원의 꽃이 피어난다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Inner landscapes, drawn quietly into color.</span>
                  <span className="mt-2 block">
                    The self that surfaces from the abyss and the wetland — dream and paradise.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">깊은 내면의 풍경을, 고요히 색으로 길어 올린다.</span>
                  <span className="mt-2 block">
                    심연과 습지에서 떠오르는 자아 — 꿈과 파라다이스의 환상.
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
                    The inner landscape —<br />
                    <span className="text-primary-strong">
                      where longing settles and rises again
                    </span>
                  </>
                ) : (
                  <>
                    내면의 풍경 —<br />
                    <span className="text-primary-strong">바램이 머물다 다시 일어서는 곳</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Yuji is a painter who renders deep inner landscapes and the emotion of
                      longing. She graduated from the Department of Western Painting at Suwon
                      University and completed her master&apos;s degree at the Graduate School of
                      Kookmin University. Across her work, the canvas becomes a place where the
                      interior is made visible — not as illustration, but as a weather of feeling.
                    </p>
                    <p>
                      Her recurring image is a flower that blooms from the depths. In works such as{' '}
                      <em>The Self that Bloomed in the Wetland, Flower of the Abyss</em>, the self
                      surfaces from dark water and marshland, finding form as a bloom. The abyss is
                      not a place of despair in her painting but a ground — the soil from which
                      longing germinates and rises.
                    </p>
                    <p>
                      Across solo exhibitions — from <em>Landscape of the Abyss</em> (2017) through{' '}
                      <em>Paradise of the Dreamer</em> (2024) and <em>Party of Longing</em> (2024)
                      to <em>Where Longing Settles and Rises Again</em> (2025) — she has built a
                      vocabulary of dream and paradise. The fantasy in her canvases is not escape
                      but a way of dwelling: a contemplative, lyrical register in which the interior
                      life is given room to breathe.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이유지는 깊은 내면의 풍경과 염원의 정서를 그리는 회화 작가다. 수원대학교
                      서양화과를 졸업하고 국민대학교 대학원에서 석사 과정을 마쳤다. 그의 화면에서
                      캔버스는 내면이 드러나는 자리가 된다 — 설명이 아니라, 감정의 기후로서.
                    </p>
                    <p>
                      그가 반복해 그리는 이미지는 심연에서 피어나는 꽃이다.{' '}
                      <em>습지에 피어난 자아, 심연의 꽃</em> 같은 작업에서, 자아는 어두운 물과
                      습지로부터 떠올라 한 송이 꽃으로 형상을 얻는다. 그의 그림에서 심연은 절망의
                      자리가 아니라 바탕 — 염원이 싹트고 일어서는 토양이다.
                    </p>
                    <p>
                      <em>심연의 풍경</em>(2017)에서 <em>몽상가의 파라다이스</em>(2024),{' '}
                      <em>염원의 파티</em>(2024)를 거쳐 <em>바램이 머물다 다시 일어서는 곳</em>
                      (2025)에 이르는 개인전들을 통해, 그는 꿈과 파라다이스의 어휘를 쌓아 왔다. 그의
                      화면 속 환상은 도피가 아니라 머무는 방식이다 — 내면의 삶에 숨 쉴 자리를 내어
                      주는 사색적이고 서정적인 톤.
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
                        {isEnglish ? 'Flowers from the abyss' : '심연에서 피어나는 꽃'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The self surfaces from dark water and wetland to bloom — the abyss as ground rather than despair.'
                          : '어두운 물과 습지에서 자아가 떠올라 한 송이 꽃으로 피어난다 — 절망이 아닌 바탕으로서의 심연.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Longing and paradise' : '염원과 파라다이스'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Dream and paradise appear not as escape but as a way of dwelling — a place where longing settles and rises again.'
                          : '꿈과 파라다이스는 도피가 아니라 머무는 방식으로 나타난다 — 바램이 머물다 다시 일어서는 자리.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A contemplative, lyrical tone' : '사색적이고 서정적인 톤'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The interior life is given room to breathe — painting as a quiet weather of feeling rather than narration.'
                          : '내면의 삶에 숨 쉴 자리를 내어 준다 — 서술이 아니라 고요한 감정의 기후로서의 회화.'}
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
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Landscape of the Abyss〉, SAI Art Document, Seoul.'
                        : '개인전 〈심연의 풍경〉, 사이아트도큐먼트, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Excellence Prize, Art Prize Gangnam; 〈Forest of the Abyss 2〉 enters the Seoul Cultural Bureau museum collection.'
                        : '아트프라이즈 강남 우수상; 〈심연의 숲 2〉 서울 문화 본부 박물관과 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Party of Longing〉 (The Squares Gallery, Seoul) and 〈Paradise of the Dreamer〉 (Eunpyeong Culture Foundation); Excellence Prize, Gyeomjae Jeong Seon Museum “Artist of Tomorrow.”'
                        : '개인전 〈염원의 파티〉(더 스퀘어즈 갤러리, 서울)·〈몽상가의 파라다이스〉(은평문화재단); 겸재 정선 미술관 ‘내일의 작가’ 우수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Where Longing Settles and Rises Again〉 (Art Boda Gallery, Seoul) and 〈Karmadaiseu〉 (Museolljeon, Jeondeungsa / Seoun Gallery, Ganghwa).'
                        : '개인전 〈바램이 머물다 다시 일어서는 곳〉(아트보다갤러리, 서울)·〈카르마다이스〉(강화 전등사 무설전 / 서운갤러리).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident, Chuncheon Art Village 4th cohort (Chuncheon Culture Foundation).'
                        : '춘천예술촌 4기 입주작가(춘천문화재단).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions, awards & collections' : '주요 전시·수상·소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈Landscape of the Abyss〉 (2017), 〈Party of Longing〉 (2024), 〈Paradise of the Dreamer〉 (2024), 〈Where Longing Settles and Rises Again〉 (2025), 〈Karmadaiseu〉 (2025)'
                        : '개인전: 〈심연의 풍경〉(2017), 〈염원의 파티〉(2024), 〈몽상가의 파라다이스〉(2024), 〈바램이 머물다 다시 일어서는 곳〉(2025), 〈카르마다이스〉(2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Excellence Prize, Gyeomjae Jeong Seon Museum “Artist of Tomorrow” (2024); Encouragement Prize, JDC Jeju Art Exhibition (2024); Excellence Prize, Art Prize Gangnam (2020); Special Selection, Hanseong Baekje Art Grand Prize Exhibition (2015)'
                        : '수상: 겸재 정선 미술관 ‘내일의 작가’ 우수상(2024); JDC 제주미술대전 장려상(2024); 아트프라이즈 강남 우수상(2020); 한성백제미술대상전 특선(2015)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: 〈The Self that Bloomed in the Wetland, Flower of the Abyss〉, Gyeomjae Jeong Seon Museum (2024); 〈Forest of the Abyss 2〉, Seoul Cultural Bureau museum (2020); 〈The Red Room〉, Hana Bank Art Bank (2016)'
                        : '소장: 〈습지에 피어난 자아, 심연의 꽃〉 겸재 정선 미술관(2024); 〈심연의 숲 2〉 서울 문화 본부 박물관과(2020); 〈붉은 방〉 하나은행 아트뱅크(2016)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residency & two-person shows: Chuncheon Art Village 4th cohort (2026); two-person exhibitions including 〈Exploring Life〉 and 〈1st Track: Healing〉 with Yungyeom'
                        : '레지던시·2인전: 춘천예술촌 4기(2026); 윤겸과 함께한 2인전 〈Exploring Life〉·〈1st Track 치유〉 등 다수'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 신학철·최윤정 패턴 차용, 이유지 심연 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the depths and what rises from them</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">심연과 거기서 떠오르는 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 심연이라는 바탕 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The abyss as ground — not despair but soil'
                    : '바탕으로서의 심연 — 절망이 아닌 토양'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The word that recurs across Lee Yuji&apos;s titles is the abyss — the
                        depths. It would be easy to read it as a sign of despair. In her painting it
                        is the opposite: a ground. The dark water and the wetland are where things
                        take root. From 〈Landscape of the Abyss〉 (2017) onward, the depth is not a
                        fall but a soil — the place a bloom comes from.
                      </p>
                      <p>
                        This is why her surfaces, for all their introspection, are not heavy. The
                        interior is rendered as a weather rather than a wound: a contemplative,
                        lyrical register in which feeling is allowed to settle, gather, and surface
                        again. The depth holds; the flower rises.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이유지의 작품 제목에 반복해서 등장하는 단어는 심연이다. 그것을 절망의 기호로
                        읽기는 쉽다. 그의 회화에서는 정반대다 — 심연은 바탕이다. 어두운 물과 습지는
                        무언가가 뿌리내리는 자리다. 〈심연의 풍경〉(2017) 이후로, 깊이는 추락이
                        아니라 토양이다 — 한 송이 꽃이 비롯되는 자리.
                      </p>
                      <p>
                        그래서 그의 화면은 내성적이면서도 무겁지 않다. 내면은 상처가 아니라 기후로
                        그려진다: 감정이 가라앉고, 고이고, 다시 떠오르도록 허락되는 사색적이고
                        서정적인 톤. 심연이 받쳐 주고, 꽃이 일어선다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 습지에 피어난 자아 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The self that bloomed in the wetland' : '습지에 피어난 자아'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The image at the center of her practice is a flower of the self that blooms
                        from marshland — the title of the work held in the Gyeomjae Jeong Seon
                        Museum collection. The wetland is liminal: neither solid land nor open
                        water, a threshold where form is still negotiable. To paint the self there
                        is to paint it in the act of becoming.
                      </p>
                      <p>
                        Across the solo exhibitions — 〈Paradise of the Dreamer〉, 〈Party of
                        Longing〉, 〈Where Longing Settles and Rises Again〉 — the same logic
                        returns in different keys. Dream and paradise are not destinations elsewhere
                        but conditions of the interior, fantasies that let the self find a shape it
                        can live in. Recognition has followed: the “Artist of Tomorrow” Excellence
                        Prize and collections at the Gyeomjae Jeong Seon Museum and the Hana Bank
                        Art Bank.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 작업 한가운데 놓인 이미지는 습지에서 피어나는 자아의 꽃이다 — 겸재 정선
                        미술관 소장작의 제목이기도 하다. 습지는 경계의 지대다: 단단한 땅도 트인 물도
                        아닌, 형상이 아직 협상 가능한 문턱. 그곳에 자아를 그린다는 것은, 되어 가는
                        과정 속의 자아를 그리는 일이다.
                      </p>
                      <p>
                        〈몽상가의 파라다이스〉, 〈염원의 파티〉, 〈바램이 머물다 다시 일어서는
                        곳〉으로 이어지는 개인전들에서, 같은 논리가 다른 음역으로 되돌아온다. 꿈과
                        파라다이스는 저 너머의 목적지가 아니라 내면의 조건이며, 자아가 살아갈 수
                        있는 형상을 찾도록 해 주는 환상이다. 평가도 뒤따랐다 — ‘내일의 작가’ 우수상,
                        그리고 겸재 정선 미술관과 하나은행 아트뱅크 소장.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 신진 작가의 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'An emerging painter, building a vocabulary'
                    : '어휘를 쌓아 가는 신진 작가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Yuji belongs to a younger generation of painters still building their
                        vocabulary. The arc from her graduate years at Kookmin University to the
                        2026 residency at Chuncheon Art Village shows a practice consolidating its
                        language: the abyss, the wetland, the bloom, the longing that settles and
                        rises. Two-person exhibitions — 〈Exploring Life〉 and 〈1st Track:
                        Healing〉 among them — extend that conversation outward.
                      </p>
                      <p>
                        For an emerging artist, each exhibition is also a question of footing: of
                        whether the work can continue. That is where this campaign meets her. Lee
                        Yuji joins it not as a subject of its cause but as a fellow artist in
                        solidarity — lending her quiet, lyrical canvases so that another artist
                        might find the ground to keep working.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이유지는 여전히 자신의 어휘를 쌓아 가는 젊은 세대의 회화 작가다. 국민대학교
                        대학원 시절부터 2026년 춘천예술촌 입주에 이르는 궤적은, 한 작업이 자신의
                        언어를 다져 가는 과정을 보여 준다 — 심연, 습지, 피어남, 머물다 다시 일어서는
                        염원. 〈Exploring Life〉와 〈1st Track 치유〉를 비롯한 2인전들은 그 대화를
                        바깥으로 넓힌다.
                      </p>
                      <p>
                        신진 작가에게 전시는 발 디딜 자리에 대한 물음이기도 하다 — 이 작업을 계속할
                        수 있는가에 대한. 이 캠페인이 그를 만나는 지점이 바로 거기다. 이유지는 이
                        캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 자신의 고요하고
                        서정적인 화면을 내어, 또 다른 예술인이 일을 계속할 토양을 찾을 수 있도록.
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
                      From 〈Landscape of the Abyss〉 to the wetland blooms of recent years, Lee
                      Yuji&apos;s painting has pursued a single quiet question: what rises from the
                      depths, and how does longing find a form it can live in? She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those navigating financial exclusion today might find the ground to
                      keep painting.
                    </>
                  ) : (
                    <>
                      〈심연의 풍경〉에서 근작의 습지 꽃에 이르기까지, 이유지의 회화는 하나의 고요한
                      물음을 추구해 왔다: 심연에서 무엇이 떠오르는가, 그리고 염원은 어떻게 살아갈
                      형상을 찾는가. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 오늘 금융 차별을 겪는 예술인들이 계속 그림을 그릴 토양을 찾을 수
                      있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Yuji</span>
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
                    Lee Yuji joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이유지 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_YUJI_PATH}
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
