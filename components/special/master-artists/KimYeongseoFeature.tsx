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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/김영서)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_YEONGSEO_PATH = `/artworks/artist/${encodeURIComponent('김영서')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimYeongseoArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김영서' ||
    n === 'kim yeong-seo' ||
    n === 'kim yeongseo' ||
    n === 'kim young-seo' ||
    n.replace(/[\s-]+/g, '') === 'kimyeongseo' ||
    n.replace(/[\s-]+/g, '') === 'kimyoungseo'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김영서 — 사라지는 것들의 아름다움을 기록하는 동양화가',
    description:
      '사라지는 것들에 깃든 시간의 결을 동양화의 언어로 기록하는 신진 작가 김영서. 장지에 옅은 먹을 여러 번 쌓아 올리는 적묵(積墨)으로 기억과 노스탤지어의 깊이를 그린다. 흔적의 깊이, 고운 기록 — 일상의 미세한 결을 사색하는 김영서의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '사라지는 것들의 아름다움 — 장지에 옅은 먹을 겹겹이 쌓아 기억과 시간의 결을 기록하는 동양화가 김영서.',
    ogAlt: '김영서 대표 작품',
    twitterTitle: '김영서',
    twitterDescription: '사라지는 것들의 아름다움 — 시간의 결을 기록하는 동양화가 김영서',
    keywords:
      '김영서 작가, 동양화, 한국화, 적묵, 장지, 먹, 사라지는 것들의 아름다움, 흔적의 깊이, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Yeong-seo — Painter Recording the Beauty of Vanishing Things',
    description:
      'Selected works by Kim Yeong-seo, an emerging Korean ink painter who records the grain of time embedded in vanishing things. Through accumulated ink (jeongmuk) — layering thin washes of ink over and over on jangji paper — she paints the depth of memory and nostalgia. The depth of traces, a tender record of the fine grain of the everyday. View and collect her works at SAF Online.',
    ogDescription:
      'The beauty of vanishing things — Kim Yeong-seo layers thin ink washes on jangji paper to record memory and the grain of time.',
    ogAlt: 'Kim Yeong-seo — featured work',
    twitterTitle: 'Kim Yeong-seo',
    twitterDescription:
      'The beauty of vanishing things — an ink painter recording the grain of time',
    keywords:
      'Kim Yeong-seo artist, Korean ink painting, oriental painting, jeongmuk, jangji, memory, nostalgia',
  },
} as const;

export async function buildKimYeongseoMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_YEONGSEO_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김영서');
  const artwork = allArtworks.find((a) => isKimYeongseoArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Yeong-seo`
      : `${artwork.title} — 김영서`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_YEONGSEO_PATH, locale, true),
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

export default async function KimYeongseoFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_YEONGSEO_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김영서');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKimYeongseoArtist(artwork.artist)
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
    { name: isEnglish ? 'Kim Yeong-seo' : '김영서', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_YEONGSEO_PATH}#person-kim-yeongseo`,
    name: isEnglish ? 'Kim Yeong-seo' : '김영서',
    alternateName: isEnglish ? '김영서' : 'Kim Yeong-seo',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Yeong-seo is an emerging Korean ink painter who records the grain of time embedded in vanishing things, layering thin washes of ink on jangji paper to paint the depth of memory and nostalgia.'
      : '김영서는 사라지는 것들에 깃든 시간의 결을 동양화의 언어로 기록하는 신진 작가로, 장지에 옅은 먹을 겹겹이 쌓아 기억과 노스탤지어의 깊이를 그립니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University Graduate School, Dept. of Oriental Painting (M.F.A.)'
        : '홍익대학교 일반대학원 동양화과 석사',
    },
    knowsAbout: isEnglish
      ? ['Korean ink painting', 'Accumulated ink (jeongmuk)', 'Memory and nostalgia']
      : ['동양화', '적묵', '기억과 노스탤지어'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Yeong-seo — SAF Online' : '김영서 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Yeong-seo from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김영서 작품들을 소개합니다.',
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

          {/* Faint horizontal washes — 적묵의 결 모티프 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Yeong-seo · Ink Painter' : '김영서 · 동양화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The beauty of
                  <br />
                  <span className="text-primary-soft">vanishing things</span>
                </>
              ) : (
                <>
                  사라지는 것들의
                  <br />
                  <span className="text-primary-soft">아름다움</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She layers thin ink washes until time itself surfaces.
                  </span>
                  <span className="mt-2 block">
                    The grain of memory, recorded in the language of ink.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">옅은 먹을 겹겹이 쌓아 시간을 떠오르게 하다.</span>
                  <span className="mt-2 block">
                    사라지는 것들에 깃든 기억의 결을 동양화의 언어로.
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
                    Layered ink —<br />
                    <span className="text-primary-strong">the grain of time made visible</span>
                  </>
                ) : (
                  <>
                    겹겹이 쌓은 먹 —<br />
                    <span className="text-primary-strong">눈에 보이게 된 시간의 결</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Yeong-seo is an emerging Korean ink painter who completed her
                      master&apos;s degree in the Department of Oriental Painting at the Hongik
                      University Graduate School. Her practice begins from a single, patient
                      premise: that what is disappearing carries a beauty all its own, and that the
                      task of painting is to record the grain of time embedded in it.
                    </p>
                    <p>
                      She works on jangji — traditional Korean mulberry paper — and on linen,
                      layering thin washes of ink over and over in the manner known as{' '}
                      <strong className="font-bold text-charcoal-deep">jeongmuk (積墨)</strong>, the
                      accumulation of ink. Each wash is allowed to dry before the next is drawn over
                      it, so that the surface deepens not by force but by repetition. Pencil and
                      conté enter quietly into the work, and a drawn line becomes the act of giving
                      memory a shape.
                    </p>
                    <p>
                      In her solo exhibition <em>The Beauty of Vanishing Things</em> (Cyart Space,
                      Seoul, 2022), she set out this artistic premise in full. The subject of her
                      work is not a single scene but the atmosphere and scent peculiar to each
                      person&apos;s recollection — the way a childhood sensibility, glimpsed only
                      for an instant, returns to console those enduring the present.
                    </p>
                    <p>
                      Her restraint is deliberate. By withholding colour and building tone from
                      layer upon layer of pale ink, she lets the form recede so that{' '}
                      <strong className="font-bold text-charcoal">the depth of the trace</strong>{' '}
                      can come forward. What is left on the paper is not a record of an object but a
                      record of attention: the fine grain of the everyday, held long enough to be
                      seen.
                    </p>
                    <p>
                      Across her group exhibitions — from <em>The Depth of Traces</em> at Dongjak
                      Art Gallery (2024) to <em>A Tender Record</em> at the Cultural Experiment
                      Space Hosu (2024) — the same quiet question recurs: how does one keep what is
                      passing without stopping it? Her answer is not to seize the vanishing thing
                      but to sit with it, wash after wash, until its time becomes legible on the
                      surface of the paper.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김영서는 홍익대학교 일반대학원 동양화과에서 석사 과정을 마친 신진 작가다. 그의
                      작업은 하나의 차분한 전제에서 출발한다 — 사라지는 것에는 그 나름의 아름다움이
                      깃들어 있으며, 그림이 할 일은 거기 새겨진{' '}
                      <strong className="font-bold text-charcoal-deep">시간의 결</strong>을 기록하는
                      것이라는 믿음.
                    </p>
                    <p>
                      그는 장지와 린넨 위에서 작업한다. 옅은 먹을 여러 번 쌓아 올리는{' '}
                      <strong className="font-bold text-charcoal-deep">적묵(積墨)</strong>의
                      방식이다. 한 겹을 충분히 말린 뒤에야 다음 겹을 올리기에, 화면은 힘이 아니라
                      반복으로 깊어진다. 연필과 콘테가 조용히 개입하고, 그어진 선은 기억에 형상을
                      부여하는 행위가 된다.
                    </p>
                    <p>
                      개인전 「사라지는 것들의 아름다움」(사이아트스페이스, 서울, 2022)에서 그는 이
                      작업론을 온전히 펼쳐 보였다. 작품의 주제는 하나의 풍경이 아니라, 사람마다
                      다르게 간직된 회상의 분위기와 냄새다 — 찰나로 스쳐 간 어린 시절의 감성이
                      돌아와 현재를 견디는 이들에게 위로가 되는 방식.
                    </p>
                    <p>
                      그의 절제는 의도된 것이다. 색을 덜어내고 옅은 먹을 겹겹이 쌓아 톤을 짓는 동안,
                      형상은 한 걸음 물러나고 그 자리에{' '}
                      <strong className="font-bold text-charcoal">흔적의 깊이</strong>가 떠오른다.
                      화면에 남는 것은 대상의 기록이 아니라 응시의 기록이다 — 보일 만큼 충분히 오래
                      머문 일상의 미세한 결.
                    </p>
                    <p>
                      동작아트갤러리의 「흔적의 깊이」(2024)부터 문화실험공간 호수의 「고운
                      기록」(2024)에 이르기까지, 그의 단체전에는 같은 물음이 잔잔히 되돌아온다 —
                      지나가는 것을 멈추지 않으면서 어떻게 간직할 것인가. 그의 대답은 사라지는 것을
                      붙드는 것이 아니라, 한 겹 한 겹 곁에 머무는 것이다. 그 시간이 종이의 표면 위로
                      읽힐 때까지.
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
                        {isEnglish ? 'Accumulated ink (jeongmuk)' : '적묵 — 쌓아 올린 먹'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Thin washes of ink layered on jangji, each dried before the next — depth built by patience rather than force.'
                          : '장지에 옅은 먹을 한 겹씩 말려 가며 쌓는 적묵. 깊이는 힘이 아닌 인내로 짓는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Memory and nostalgia' : '기억과 노스탤지어'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not a single scene but the atmosphere and scent peculiar to each recollection — a childhood sensibility returning to console the present.'
                          : '하나의 풍경이 아니라 회상마다 다른 분위기와 냄새. 어린 시절의 감성이 돌아와 현재를 위로한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The depth of the trace' : '흔적의 깊이'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Colour withheld, form receding — what remains is a record of attention to the fine grain of the everyday.'
                          : '색을 덜어내고 형상은 물러난 자리. 남는 것은 일상의 미세한 결을 향한 응시의 기록이다.'}
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
                      M.F.A.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Master of Fine Arts, Dept. of Oriental Painting, Hongik University Graduate School.'
                        : '홍익대학교 일반대학원 동양화과 석사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Beauty of Vanishing Things〉, Cyart Space, Seoul.'
                        : '개인전 「사라지는 것들의 아름다움」, 사이아트스페이스(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: 〈A Shop of Artist H〉, Dongtan Art Square; 〈Dongjak: Expansion〉, Dongjak Art Gallery.'
                        : '단체전: 「작가 H의 상점」(동탄아트스퀘어), 「동작:확장」(동작아트갤러리).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: 〈The Depth of Traces〉, Dongjak Art Gallery; 〈A Tender Record〉, Cultural Experiment Space Hosu; 〈Art Alliance〉, N2 Art Space.'
                        : '단체전: 「흔적의 깊이」(동작아트갤러리), 「고운 기록」(문화실험공간 호수), 「동시다발전 Art Alliance」(N2아트스페이스).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: 〈Manryugwijong〉, Idea Hoegwan; 〈Sai, or _ Sai〉, Gallery Ilho (Hankyoreh Curating School 3rd selected artist); 〈NO MATTER〉, N2 Art Space.'
                        : '단체전: 「만류귀종」(아이디어회관), 「사이, 혹은_사이」(갤러리 일호, 한겨레 큐레이팅스쿨 3기 선정작가), 4인전 「NO MATTER」(N2아트스페이스).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions' : '주요 전시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo exhibition: <em>The Beauty of Vanishing Things</em>, Cyart Space,
                          Seoul (2022)
                        </>
                      ) : (
                        <>개인전: 「사라지는 것들의 아름다움」, 사이아트스페이스, 서울 (2022)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibition: <em>The Depth of Traces</em>, Dongjak Art Gallery (2024)
                          — Dongjak Art Gallery curatorial open call
                        </>
                      ) : (
                        <>
                          단체전: 「흔적의 깊이」, 동작아트갤러리 (2024) — 동작아트갤러리 전시기획
                          공모
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibition: <em>A Tender Record</em>, Cultural Experiment Space Hosu
                          (2024) — emerging-artist open call
                        </>
                      ) : (
                        <>단체전: 「고운 기록」, 문화실험공간 호수 (2024) — 신진예술가 공모전시</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibition: <em>Sai, or _ Sai</em>, Gallery Ilho (2025) — Hankyoreh
                          Curating School 3rd-cohort selected artist
                        </>
                      ) : (
                        <>
                          단체전: 「사이, 혹은_사이」, 갤러리 일호 (2025) — 한겨레 큐레이팅스쿨 3기
                          선정작가
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈Manryugwijong〉, Idea Hoegwan (2025); 〈Sai Sai Swim〉, Cultural Experiment Space Hosu (2025); 〈NO MATTER〉, N2 Art Space (2025)'
                        : '단체전: 「만류귀종」(아이디어회관, 2025), 청년예술인 기획전 「사이 사이 쉼」(문화실험공간 호수, 2025), 4인전 「NO MATTER」(N2아트스페이스, 2025)'}
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
                  <span className="text-charcoal-deep">on ink, memory, and what remains</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">먹과 기억, 그리고 남는 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 적묵 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Jeongmuk — depth built by repetition' : '적묵 — 반복으로 짓는 깊이'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The technical heart of Kim Yeong-seo&apos;s work is jeongmuk (積墨), the
                        accumulation of ink. Rather than seeking depth through a single dark stroke,
                        she lays down a thin, pale wash, waits for it to dry, and draws another over
                        it — and another, and another. Tone is not applied; it is grown.
                      </p>
                      <p>
                        This is a slow method, and the slowness is the meaning. Each layer holds the
                        time it took to dry, so the finished surface is not a picture of a moment
                        but a sediment of many moments. On jangji paper — absorbent, unforgiving —
                        there is no undoing a wash once it is laid. The painter must commit to
                        patience as a form, accepting that the image will arrive only after the hand
                        has repeated itself enough times for the paper to remember.
                      </p>
                      <p>
                        Pencil and conté enter at the edges of this process, and the drawn line
                        takes on a particular role: it gives memory a shape. Where the ink builds
                        atmosphere, the line traces the contour of a thing half-remembered — present
                        enough to recognise, faint enough to keep dissolving.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김영서 작업의 기술적 핵심은 적묵(積墨), 먹을 쌓는 일이다. 단 한 번의 짙은
                        붓질로 깊이를 구하는 대신, 그는 옅은 먹을 한 겹 올리고, 마르기를 기다렸다가,
                        그 위에 다시 한 겹을 올린다 — 그리고 또 한 겹, 또 한 겹. 톤은 칠해지는 것이
                        아니라 길러지는 것이다.
                      </p>
                      <p>
                        이것은 느린 방법이고, 그 느림이 곧 의미다. 한 겹마다 마르는 데 걸린 시간이
                        담기기에, 완성된 화면은 한 순간의 그림이 아니라 여러 순간의 퇴적이 된다.
                        흡수가 강하고 되돌릴 수 없는 장지 위에서, 한번 올린 먹은 지울 수 없다.
                        작가는 인내를 하나의 형식으로 받아들여야 한다 — 손이 충분히 반복되어 종이가
                        기억할 때에야 이미지가 도착한다는 것을.
                      </p>
                      <p>
                        연필과 콘테는 이 과정의 가장자리에서 개입하고, 그어진 선은 특정한 역할을
                        맡는다 — 기억에 형상을 부여하는 것. 먹이 분위기를 짓는 자리에서, 선은
                        어렴풋이 떠오른 것의 윤곽을 더듬는다. 알아볼 만큼은 또렷하고, 계속 흩어질
                        만큼은 옅게.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 사라지는 것들 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Vanishing things — beauty in what is leaving'
                    : '사라지는 것들 — 떠나는 것에 깃든 아름다움'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In her 2022 solo exhibition <em>The Beauty of Vanishing Things</em> at Cyart
                        Space, Kim Yeong-seo named the premise that has organised her practice
                        since. Her subject is not loss as grief but loss as texture — the particular
                        atmosphere and scent that each person&apos;s recollection carries, distorted
                        and softened by the time it has spent inside memory.
                      </p>
                      <p>
                        A childhood sensibility, glimpsed only for an instant, returns in her work
                        not to be possessed but to console. The paintings are addressed, in a sense,
                        to everyone enduring the present: they offer the small comfort of
                        recognising that what is gone has not simply disappeared but settled into
                        us, changing colour as it goes.
                      </p>
                      <p>
                        This is why she withholds bright colour. A vanishing thing is not vivid; it
                        is muted, half-erased, surfacing in tones of pale ink. To paint it loudly
                        would be to falsify it. By keeping the palette quiet, she lets the work hold
                        the true register of memory — the way the past speaks softly, and only to
                        those who stop to listen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2022년 사이아트스페이스 개인전 「사라지는 것들의 아름다움」에서, 김영서는
                        이후 작업을 관통하게 될 전제에 이름을 붙였다. 그의 주제는 슬픔으로서의
                        상실이 아니라 질감으로서의 상실이다 — 사람마다 다르게 간직한 회상이 품은,
                        기억 속에서 보낸 시간만큼 일그러지고 부드러워진 분위기와 냄새.
                      </p>
                      <p>
                        찰나로 스쳐 간 어린 시절의 감성이 그의 작품 속에서 돌아오는 것은 소유되기
                        위해서가 아니라 위로하기 위해서다. 그림은 어떤 의미에서 현재를 견디는 모든
                        이에게 건네진다 — 사라진 것이 그저 없어진 것이 아니라 우리 안에 가라앉아,
                        가는 길에 빛깔을 바꾸며 남아 있다는 사실을 알아차리는, 작은 위안.
                      </p>
                      <p>
                        그가 밝은 색을 덜어내는 이유가 여기 있다. 사라지는 것은 선명하지 않다.
                        그것은 흐릿하고, 반쯤 지워졌으며, 옅은 먹의 톤으로 떠오른다. 그것을 요란하게
                        그리는 일은 그것을 위조하는 일이 될 것이다. 팔레트를 고요히 유지함으로써,
                        그는 작품이 기억의 진짜 음역을 간직하게 한다 — 과거가 나직이 말하는 방식,
                        멈춰 서서 귀 기울이는 이에게만 들리는 방식.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 고운 기록 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'A tender record — attention as a form of keeping'
                    : '고운 기록 — 간직의 한 형식으로서의 응시'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Titles recur across Kim Yeong-seo&apos;s exhibitions like a private
                        vocabulary: <em>The Depth of Traces</em>, <em>A Tender Record</em>. Together
                        they describe a single working ethic — that to record carefully is itself a
                        way of keeping what is passing, without pretending to stop it.
                      </p>
                      <p>
                        Her work does not seize the vanishing thing. It sits with it. The depth that
                        accumulates on the paper is the depth of attention paid over time — wash
                        after wash, a record not of the object but of how long the painter looked.
                        In this sense her paintings are documents of patience as much as of memory.
                      </p>
                      <p>
                        From <em>The Depth of Traces</em> at Dongjak Art Gallery to{' '}
                        <em>A Tender Record</em> at Hosu, the same quiet question returns: how does
                        one hold what is leaving without arresting it? Kim Yeong-seo&apos;s answer
                        is offered in ink — keep company with the thing as it fades, layer by layer,
                        until its time becomes legible on the surface of the page.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김영서의 전시들에는 마치 사적인 어휘처럼 제목이 되풀이된다 — 「흔적의
                        깊이」, 「고운 기록」. 이 제목들은 함께 하나의 작업 윤리를 그린다. 정성껏
                        기록하는 일이 곧 지나가는 것을 멈추는 척하지 않으면서 간직하는 한 방식이라는
                        것.
                      </p>
                      <p>
                        그의 작업은 사라지는 것을 붙들지 않는다. 그 곁에 머문다. 종이 위에 쌓이는
                        깊이는 시간을 두고 들인 응시의 깊이다 — 한 겹 또 한 겹, 대상의 기록이 아니라
                        작가가 얼마나 오래 바라보았는가의 기록. 그런 의미에서 그의 그림은 기억의
                        문서인 만큼이나 인내의 문서다.
                      </p>
                      <p>
                        동작아트갤러리의 「흔적의 깊이」에서 호수의 「고운 기록」까지, 같은 고요한
                        물음이 되돌아온다 — 떠나는 것을 멈춰 세우지 않으면서 어떻게 간직할 것인가.
                        김영서의 대답은 먹으로 건네진다. 사라져 가는 것의 곁을 지키는 것, 한 겹 한
                        겹, 그 시간이 종이의 표면 위로 읽힐 때까지.
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
                      From her first solo exhibition to her recent group shows, Kim Yeong-seo&apos;s
                      work has pursued a single, patient question: how does one record the grain of
                      time embedded in vanishing things? The answer, built wash by wash, is an ink
                      practice attentive to the fine texture of the everyday. She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those who come after might work with a little less of the weight that
                      financial exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      첫 개인전부터 최근의 단체전까지, 김영서의 작업은 하나의 차분한 물음을 추구해
                      왔다 — 사라지는 것들에 깃든 시간의 결을 어떻게 기록할 것인가. 한 겹 한 겹 쌓아
                      올린 대답이 일상의 미세한 결을 향한 먹의 작업이다. 그는 씨앗페에 이 캠페인의
                      대상으로 서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음 세대의
                      예술인들이 한국 예술인에게 지워진 금융 차별의 무게를 조금이라도 덜 짊어진 채
                      일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Yeong-seo</span>
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
                    Kim Yeong-seo joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김영서 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_YEONGSEO_PATH}
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
