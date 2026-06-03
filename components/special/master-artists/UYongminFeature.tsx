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

// 거장 작가 feature는 작가 페이지(/artworks/artist/우용민)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const U_YONGMIN_PATH = `/artworks/artist/${encodeURIComponent('우용민')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isUYongminArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '우용민' ||
    n === 'u yongmin' ||
    n === 'u yong-min' ||
    n === 'woo yongmin' ||
    n === 'woo yong-min' ||
    n.replace(/[\s-]+/g, '') === 'uyongmin' ||
    n.replace(/[\s-]+/g, '') === 'wooyongmin'
  );
};

const PAGE_COPY = {
  ko: {
    title: '우용민 — 탕진수묵, 먹으로 그린 지리와 두륜',
    description:
      '수묵의 가능성을 현대적 감성으로 확장해 온 한국화 작가 우용민. 〈탕진수묵〉(2019)부터 〈수묵_사군자〉(2025)까지 행촌미술관·인영갤러리·두인미술관에서 개인전을 이어 왔고, 전남국제수묵비엔날레와 풍류남도 아트프로젝트에 참여했다. 198×545cm에 이르는 대형 한지 수묵의 스케일로 지리산·두륜산·자작나무·사군자를 그린 우용민의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '우용민 — 수묵의 가능성을 현대적 감성으로 확장하는 한국화 작가. 대형 한지에 먹으로 그린 지리·두륜의 깊고 유려한 먹빛.',
    ogAlt: '우용민 대표 작품',
    twitterTitle: '우용민',
    twitterDescription: '먹으로 그린 지리와 두륜 — 남도 수묵의 작가 우용민',
    keywords:
      '우용민 작가, 탕진수묵, 수묵화, 한국화, 한지에 먹, 지리, 두륜, 사군자, 전남국제수묵비엔날레, 씨앗페 온라인',
  },
  en: {
    title: 'U Yongmin — Tangjin Sumuk, Jiri and Dureun Drawn in Ink',
    description:
      'Selected works by U Yongmin, a Korean ink painter who has expanded the possibilities of sumuk with a contemporary sensibility. From 〈Tangjin Sumuk〉 (2019) to 〈Sumuk — Four Gentlemen〉 (2025), he has held solo exhibitions at Haengchon Art Museum, Inyoung Gallery, and Duin Art Museum, and taken part in the Jeonnam International Sumuk Biennale and the Pungnyu Namdo Art Project. Working at the scale of large hanji ink paintings up to 198×545cm, he draws Jirisan, Dureunsan, birch forests, and the Four Gentlemen. View and collect his works at SAF Online.',
    ogDescription:
      'U Yongmin — a Korean ink painter expanding sumuk with a contemporary sensibility. The deep, flowing ink of Jiri and Dureun on large hanji.',
    ogAlt: 'U Yongmin — featured work',
    twitterTitle: 'U Yongmin',
    twitterDescription: 'Jiri and Dureun drawn in ink — U Yongmin of Namdo sumuk',
    keywords:
      'U Yongmin artist, Tangjin Sumuk, ink painting, Korean painting, ink on hanji, Korean contemporary art',
  },
} as const;

export async function buildUYongminMetadata({
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
  const pageUrl = buildLocaleUrl(U_YONGMIN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('우용민');
  const artwork = allArtworks.find((a) => isUYongminArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — U Yongmin`
      : `${artwork.title} — 우용민`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(U_YONGMIN_PATH, locale, true),
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

export default async function UYongminFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(U_YONGMIN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('우용민');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isUYongminArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'U Yongmin' : '우용민', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${U_YONGMIN_PATH}#person-u-yongmin`,
    name: isEnglish ? 'U Yongmin' : '우용민',
    alternateName: isEnglish ? '우용민' : 'U Yongmin',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'U Yongmin is a mid-career Korean ink painter who has expanded the possibilities of sumuk with a contemporary sensibility, drawing the landscapes of Jirisan and Dureunsan, birch forests, and the Four Gentlemen on large hanji. He has published the art books 《Dureun》 (Hexagon, 2020) and 《Jiri》 (Hexagon, 2025).'
      : '우용민은 수묵의 가능성을 현대적 감성으로 확장해 온 중견 한국화 작가로, 지리산·두륜산의 풍경과 자작나무, 사군자를 대형 한지에 먹으로 그립니다. 작품집 《두륜》(헥사곤, 2020)과 《지리》(헥사곤, 2025)를 펴냈습니다.',
    knowsAbout: ['Ink painting', 'Sumuk', 'Korean painting', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'U Yongmin — SAF Online' : '우용민 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by U Yongmin from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 우용민 작품들을 소개합니다.',
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

          {/* Ink-stroke vertical lines — 한지에 흘러내리는 먹선 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/12" />
          <div className="absolute top-0 left-1/3 h-full w-px bg-white/8" />
          <div className="absolute top-0 right-12 h-full w-px bg-primary/25" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'U Yongmin · ink on hanji' : '우용민 · 한지에 먹'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Jiri and Dureun,
                  <br />
                  <span className="text-primary-soft">drawn in ink</span>
                </>
              ) : (
                <>
                  먹으로 그린
                  <br />
                  <span className="text-primary-soft">지리와 두륜</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Sumuk expanded into a contemporary sensibility.</span>
                  <span className="mt-2 block">
                    The deep, flowing ink of the southern mountains on large hanji.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">수묵의 가능성을 현대적 감성으로 확장하다.</span>
                  <span className="mt-2 block">
                    대형 한지 위에 흐르는 남도 산하의 깊고 유려한 먹빛.
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
                    Ink, expanded —<br />
                    <span className="text-primary-strong">sumuk in a contemporary key</span>
                  </>
                ) : (
                  <>
                    확장된 수묵 —<br />
                    <span className="text-primary-strong">현대적 감성의 먹빛</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      U Yongmin is a mid-career Korean painter who has expanded the possibilities of{' '}
                      <em>sumuk</em> — Korean ink painting — with a contemporary sensibility. His
                      subjects gather around the landscapes of the Namdo region: the ranges of
                      Jirisan and Dureunsan, the temple grounds of Daeheungsa, birch forests, and
                      the Four Gentlemen of classical painting.
                    </p>
                    <p>
                      He has held solo exhibitions at a steady pace —{' '}
                      <strong className="font-bold text-charcoal-deep">〈Tangjin Sumuk〉</strong> at
                      Inyoung Gallery, Seoul (2019); 〈Dureun〉 at Haengchon Art Museum, Haenam
                      (2020); 〈Permano〉 at Duin Art Museum, Seoul (2023); and 〈Sumuk — Four
                      Gentlemen〉 at Haengchon Art Museum (2025), among others. Alongside the solo
                      work he has taken part in the Jeonnam International Sumuk Biennale, the
                      Pungnyu Namdo Art Project, and the Kim Whanki Art Festival.
                    </p>
                    <p>
                      What distinguishes the work is its scale. The painting{' '}
                      <strong className="font-bold text-charcoal">〈Dureun〉</strong> (2020), held
                      in the collection of Haengchon Art Museum, measures 198×545cm in ink on hanji
                      — a single sheet of mulberry paper that carries an entire mountain range. To
                      work at this size in ink is to commit to a single, unrepeatable gesture across
                      an expanse of paper, where every stroke must hold.
                    </p>
                    <p>
                      His works are held by Haengchon Art Museum, the Jeonnam Museum of Art, and
                      Gallery Northbruga in Austria, among others. He has published two art books
                      with Hexagon —{' '}
                      <strong className="font-bold text-charcoal-deep">《Dureun》</strong> (2020)
                      and <strong className="font-bold text-charcoal-deep">《Jiri》</strong> (2025)
                      — gathering the southern landscapes that have anchored his practice.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      우용민은 수묵의 가능성을 현대적 감성으로 확장해 온 중견 한국화 작가다. 그의
                      소재는 남도의 산하로 모인다 — 지리산과 두륜산의 능선, 대흥사의 경내, 자작나무
                      숲, 그리고 고전 회화의 사군자.
                    </p>
                    <p>
                      그는 꾸준한 호흡으로 개인전을 이어 왔다 —{' '}
                      <strong className="font-bold text-charcoal-deep">〈탕진수묵〉</strong>
                      (인영갤러리, 서울, 2019), 〈두륜〉(행촌미술관, 해남, 2020),
                      〈페르마노〉(두인미술관, 서울, 2023), 〈수묵_사군자〉(행촌미술관, 해남, 2025)
                      등. 개인전과 더불어 전남국제수묵비엔날레, 풍류남도 아트프로젝트, 김환기미술제
                      등 국내외 비엔날레와 기획전에 활발히 참여했다.
                    </p>
                    <p>
                      작업을 특징짓는 것은 그 스케일이다. 행촌미술관이 소장한{' '}
                      <strong className="font-bold text-charcoal">〈두륜〉</strong>(2020)은 한지에
                      먹, 198×545cm에 이른다 — 한 장의 닥종이가 산맥 하나를 통째로 감당한다. 이
                      크기로 수묵을 한다는 것은, 종이의 너른 폭을 가로지르는 단 한 번의 되돌릴 수
                      없는 운필에 자신을 맡기는 일이다. 모든 획이 버텨야 한다.
                    </p>
                    <p>
                      작품은 행촌미술관, 전남도립미술관, 오스트리아 Gallery Northbruga 등에 소장되어
                      있다. 그는 헥사곤에서 두 권의 작품집을 펴냈다 —{' '}
                      <strong className="font-bold text-charcoal-deep">《두륜》</strong>(2020)과{' '}
                      <strong className="font-bold text-charcoal-deep">《지리》</strong>(2025) —
                      그의 작업을 지탱해 온 남도의 풍경을 묶었다.
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
                        {isEnglish ? 'Jiri and Dureun' : '지리와 두륜'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The ranges of Jirisan and Dureunsan, drawn again and again — the landscapes of the Namdo region as the steady ground of the work.'
                          : '지리산과 두륜산의 능선을 거듭 그린다. 남도의 산하가 작업의 변함없는 토대가 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The scale of large hanji' : '대형 한지의 스케일'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Ink on hanji at 198×545cm and beyond — a single sheet of paper carrying an entire mountain range, where each stroke is unrepeatable.'
                          : '198×545cm를 넘나드는 한지에 먹. 한 장의 종이가 산맥 하나를 감당하며, 모든 획이 단 한 번의 운필로 결정된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Tangjin Sumuk' : '탕진수묵'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A long-running engagement with sumuk — birch forests and the Four Gentlemen carried into a contemporary sensibility.'
                          : '수묵에 대한 오랜 천착 — 자작나무 숲과 사군자를 현대적 감성으로 끌어온다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Selected solo exhibitions' : '주요 개인전'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Sumuk — Four Gentlemen〉, Haengchon Art Museum, Haenam.'
                        : '〈수묵_사군자〉 행촌미술관, 해남.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Birch — Given by the Sky, Tended by Inje〉, Miracle Library, Inje.'
                        : '〈하늘이 내린천 인제가 가꾼 자작나무〉 기적의 도서관, 인제.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Permano〉, Duin Art Museum, Seoul.'
                        : '〈페르마노〉 두인미술관, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Hwaeom Jiri〉, Hwaeomsa Museum; 〈The Tiger Comes Down, Fortune Comes Down〉, Sinan.'
                        : '〈화엄지리〉 화엄사 성보박물관; 〈범 내려온다, 복 내려온다〉 신안.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Moon and Stars of the Kim Whanki House〉, Kim Whanki House.'
                        : '〈김환기 고택의 달과 별〉 김환기고택.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Dureun〉, Haengchon Art Museum, Haenam.'
                        : '〈두륜〉 행촌미술관, 해남.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Tangjin Sumuk〉, Inyoung Gallery, Seoul.'
                        : '〈탕진수묵〉 인영갤러리, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Artists Center, Seoul.' : '예술인센터, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Lee Hyoung Gallery.' : '이형갤러리.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish
                    ? 'Selected group shows, collections & books'
                    : '주요 그룹전 · 소장 · 저서'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: Jeonnam International Sumuk Biennale (2017, 2018, 2021 Haenam, 2023); Pungnyu Namdo Art Project; the 1st Kim Whanki Art Festival (2021); and exhibitions abroad in Thailand (Chiang Mai, Bangkok) and Austria (Northbruga Gallery, Innsbruck).'
                        : '그룹전: 전남국제수묵비엔날레(2017·2018·2021 해남전·2023), 풍류남도 아트프로젝트, 제1회 김환기미술제(2021), 그리고 태국(치앙마이·방콕)·오스트리아(인스브루크 노스부르가갤러리) 등 국내외 전시.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Haengchon Art Museum collection: 〈Dureun〉 (2020), ink on hanji, 198×545cm.'
                        : '행촌미술관 소장: 〈두륜〉(2020), 한지에 먹, 198×545cm.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Jeonnam Museum of Art collection: 〈Snow Blossom〉 (2022) and 〈Jirisan Banyabong〉 (2022), ink on hanji.'
                        : '전남도립미술관 소장: 〈눈꽃〉(2022), 〈지리산 반야봉〉(2022), 한지에 먹.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gallery Northbruga (Austria) collection: 〈Snow-Pine Tiger〉 (2022) and 〈Peacock〉 (2025), ink on hanji.'
                        : '오스트리아 Gallery Northbruga 소장: 〈설송호랑이〉(2022), 〈공작〉(2025), 한지에 먹.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>Art books: 《Dureun》 (Hexagon, 2020) and 《Jiri》 (Hexagon, 2025).</>
                      ) : (
                        <>작품집: 《두륜》(헥사곤, 2020), 《지리》(헥사곤, 2025).</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Special Selection, Mudeung Art Exhibition (2005); selected, Seoul Art Grand Exhibition (2004); selected, National Art Exhibition (1989); selected, Mogwoo Association (1988).'
                        : '수상: 무등미술대전 특선(2005), 서울미술대상전 입선(2004), 국전 입선(1989), 목우회 입선(1988).'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광 패턴 차용, 우용민 먹빛 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on ink, scale, and the mountain</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">먹과 스케일, 그리고 산에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 수묵을 현대적 감성으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Sumuk, in a contemporary key' : '수묵을 현대적 감성으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Sumuk — painting in ink and water on paper — is among the oldest continuous
                        traditions in East Asian art. Its difficulty is also its discipline: ink
                        does not forgive. A stroke laid on hanji cannot be lifted, corrected, or
                        painted over. What the brush does, the paper keeps.
                      </p>
                      <p>
                        U Yongmin&apos;s practice has been a long engagement with that discipline,
                        and an effort to carry it into a contemporary sensibility. He does not treat
                        sumuk as a museum language to be preserved unchanged; he treats it as a
                        living medium, open to the scale, the subjects, and the feeling of the
                        present. Birch forests, mountain ranges seen up close, the Four Gentlemen
                        rendered with a modern hand — these are the materials through which he tests
                        how far ink can travel.
                      </p>
                      <p>
                        The recurring title <em>Tangjin Sumuk</em> — roughly, &ldquo;ink spent to
                        exhaustion&rdquo; — names the attitude. It is not ink used sparingly but ink
                        given fully, an aesthetic of commitment rather than restraint.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        수묵 — 종이 위에 먹과 물로 그리는 그림 — 은 동아시아 미술에서 가장 오래
                        이어져 온 전통의 하나다. 그 어려움이 곧 규율이다: 먹은 용서하지 않는다.
                        한지에 한 번 놓인 획은 들어낼 수도, 고칠 수도, 덧칠로 가릴 수도 없다. 붓이
                        한 일을, 종이는 그대로 간직한다.
                      </p>
                      <p>
                        우용민의 작업은 그 규율과의 오랜 대면이자, 그것을 현대적 감성으로 끌어오려는
                        노력이었다. 그는 수묵을 변함없이 보존해야 할 박물관의 언어로 다루지 않는다.
                        그에게 수묵은 지금의 스케일과 소재와 감정에 열린 살아 있는 매체다. 자작나무
                        숲, 가까이 다가선 산의 능선, 현대적 손길로 다시 그린 사군자 — 이것들이 먹이
                        얼마나 멀리 갈 수 있는지를 시험하는 재료가 된다.
                      </p>
                      <p>
                        거듭 등장하는 제목 <em>탕진수묵</em> — 먹을 다 써서 탕진한다는 뜻 — 이 그
                        태도를 이름한다. 아껴 쓰는 먹이 아니라 온전히 내어 주는 먹, 절제가 아닌
                        몰입의 미학이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 198x545, 한 장의 종이가 감당하는 산 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The scale of 〈Dureun〉 — a single sheet carrying a mountain'
                    : '〈두륜〉의 스케일 — 한 장의 종이가 감당하는 산'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        〈Dureun〉 (2020), held by Haengchon Art Museum, measures 198×545cm in ink
                        on hanji. The number is not a detail but a decision. At that width, the
                        paper is no longer a surface the hand can reach across in a single gesture —
                        it must be navigated, the brush carried over an expanse that exceeds the
                        body.
                      </p>
                      <p>
                        Scale in ink painting is unlike scale in oil. A large oil canvas can be
                        built up over weeks, layer over layer. A large sumuk work compresses time:
                        the ground tone, the mountain ridge, the weight of a shadow — much of it has
                        to be committed while the ink is still wet, in passages that cannot be
                        undone. To make a five-metre painting in ink is to accept that the whole
                        thing rests on gestures that allow no second chance.
                      </p>
                      <p>
                        This is why the recurring subject — Dureunsan, Jirisan, the southern ranges
                        seen near and whole — matters. A mountain is large; a painting that wants to
                        carry its weight must be large too. The scale is not display but fidelity:
                        an attempt to give the mountain a surface equal to it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        행촌미술관이 소장한 〈두륜〉(2020)은 한지에 먹, 198×545cm다. 이 숫자는
                        세부가 아니라 하나의 결단이다. 그 폭에서 종이는 더 이상 손이 단번에 가로지를
                        수 있는 표면이 아니다 — 그것은 항해되어야 하고, 붓은 몸을 넘어서는 너비 위로
                        옮겨져야 한다.
                      </p>
                      <p>
                        수묵에서의 스케일은 유화에서의 스케일과 다르다. 큰 유화 캔버스는 몇 주에
                        걸쳐 겹겹이 쌓아 올릴 수 있다. 큰 수묵 작업은 시간을 압축한다: 바탕의 톤,
                        산의 능선, 그림자의 무게 — 그 많은 부분이 먹이 채 마르기 전에, 되돌릴 수
                        없는 운필 안에서 결정되어야 한다. 5미터의 그림을 먹으로 그린다는 것은, 그
                        전부가 두 번째 기회를 허락하지 않는 획들 위에 놓인다는 사실을 받아들이는
                        일이다.
                      </p>
                      <p>
                        거듭되는 소재 — 두륜산, 지리산, 가까이 그리고 통째로 바라본 남도의 능선 — 이
                        중요한 이유가 여기 있다. 산은 크다. 그 무게를 감당하려는 그림은 함께 커져야
                        한다. 그 스케일은 과시가 아니라 충실함이다: 산에게 그에 걸맞은 한 면을 내어
                        주려는 시도다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 남도, 산하의 좌표 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Namdo — the coordinates of a landscape' : '남도 — 산하의 좌표'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The work is rooted in a place. Haenam, at the southwestern edge of the
                        peninsula, with Dureunsan and Daeheungsa nearby; the broad reach of Jirisan;
                        the islands and shores of Sinan and the Namdo coast. Many of the exhibitions
                        name these coordinates directly — <em>Hwaeom Jiri</em>,{' '}
                        <em>The Moon and Stars of the Kim Whanki House</em>, the Pungnyu Namdo Art
                        Project.
                      </p>
                      <p>
                        To paint the same region across years is not repetition but deepening. The
                        landscape becomes less a subject to be captured than a place to be known —
                        in different seasons, at different scales, under different states of ink.
                        The Jeonnam International Sumuk Biennale, in which he has taken part across
                        several editions, is itself an expression of this regional commitment: an
                        argument that the Namdo tradition of ink painting is a living, contemporary
                        practice, not a heritage display.
                      </p>
                      <p>
                        His art books gather these coordinates into form —{' '}
                        <strong className="font-bold text-charcoal-deep">《Dureun》</strong> (2020)
                        and <strong className="font-bold text-charcoal-deep">《Jiri》</strong>{' '}
                        (2025), two volumes that take the names of the mountains and make them the
                        names of a body of work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        작업은 한 장소에 뿌리내린다. 한반도 남서쪽 끝의 해남, 가까이 두륜산과
                        대흥사; 지리산의 너른 품; 신안과 남도 해안의 섬과 갯가. 많은 전시가 이
                        좌표들을 직접 이름한다 — <em>화엄지리</em>, <em>김환기 고택의 달과 별</em>,
                        풍류남도 아트프로젝트.
                      </p>
                      <p>
                        같은 지역을 여러 해에 걸쳐 그리는 것은 반복이 아니라 심화다. 풍경은 포착해야
                        할 소재라기보다 알아 가야 할 장소가 된다 — 다른 계절에, 다른 스케일로, 다른
                        먹의 상태에서. 그가 여러 회에 걸쳐 참여한 전남국제수묵비엔날레는 그 자체로
                        이 지역적 천착의 표현이다: 남도의 수묵 전통이 유산의 전시가 아니라 살아 있는
                        현대의 실천이라는 주장이다.
                      </p>
                      <p>
                        그의 작품집은 이 좌표들을 형태로 묶는다 —{' '}
                        <strong className="font-bold text-charcoal-deep">《두륜》</strong>(2020)과{' '}
                        <strong className="font-bold text-charcoal-deep">《지리》</strong>(2025),
                        산의 이름을 가져와 한 작업의 이름으로 삼은 두 권이다.
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
                      From the solo shows of the 2000s to the large hanji works of the 2020s, U
                      Yongmin&apos;s practice has pursued a single discipline: to give the southern
                      mountains a surface equal to their weight, in a medium that allows no second
                      stroke. He joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that those who come after might work without the
                      financial weight that should never have been theirs.
                    </>
                  ) : (
                    <>
                      2000년대의 개인전에서 2020년대의 대형 한지 작업까지, 우용민의 작업은 하나의
                      규율을 추구해 왔다: 두 번째 획을 허락하지 않는 매체로, 남도의 산에게 그 무게에
                      걸맞은 한 면을 내어 주는 일. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라,
                      동료 예술인과의 연대자로서 함께한다 — 다음 세대의 예술인들이 결코 그들의 몫이
                      아니었을 금융의 무게 없이 일할 수 있도록.
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
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">U Yongmin</span>
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
                    U Yongmin joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    우용민 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={U_YONGMIN_PATH}
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
