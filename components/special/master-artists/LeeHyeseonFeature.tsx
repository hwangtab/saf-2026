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

// 작가 feature는 작가 페이지(/artworks/artist/이혜선)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_HYESEON_PATH = `/artworks/artist/${encodeURIComponent('이혜선')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeHyeseonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이혜선' ||
    n === 'lee hye-seon' ||
    n === 'lee hyeseon' ||
    n.replace(/[\s-]+/g, '') === 'leehyeseon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이혜선 — 파도의 균열, 블루의 심연',
    description:
      '제주의 푸른 바다를 드리핑과 액션 페인팅의 즉흥적 운동성으로 풀어낸 추상 회화 작가 이혜선. 〈Glory_moment#+〉 연작은 ‘당신의 존엄한 삶을 대도약하라’는 화두 아래 도약과 희망의 정서를 화면에 새긴다. 다양한 블루의 심연과 파도의 균열을 만나는 이혜선의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '제주의 푸른 바다를 드리핑·액션 페인팅으로 풀어낸 추상 회화 작가 이혜선. 〈Glory_moment#+〉 연작 — 파도의 균열, 블루의 심연.',
    ogAlt: '이혜선 대표 작품',
    twitterTitle: '이혜선',
    twitterDescription: '파도의 균열, 블루의 심연 — 〈Glory_moment#+〉 연작의 이혜선',
    keywords:
      '이혜선 작가, 추상 회화, 드리핑, 액션 페인팅, 제주 바다, Glory moment, 블루 추상, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Hye-seon — Cracks of the Wave, the Blue Abyss',
    description:
      'Selected works by Lee Hye-seon, an abstract painter who renders the blue sea of Jeju through the improvised motion of dripping and action painting. Her 〈Glory_moment#+〉 series inscribes a sense of leap and hope under a single guiding phrase — “Make a great leap toward your dignified life.” View and collect her works at SAF Online.',
    ogDescription:
      'Lee Hye-seon — an abstract painter rendering the blue sea of Jeju through dripping and action painting. The 〈Glory_moment#+〉 series: cracks of the wave, the blue abyss.',
    ogAlt: 'Lee Hye-seon — featured work',
    twitterTitle: 'Lee Hye-seon',
    twitterDescription: 'Cracks of the wave, the blue abyss — the 〈Glory_moment#+〉 series',
    keywords:
      'Lee Hye-seon artist, abstract painting, dripping, action painting, Jeju sea, Glory moment, blue abstraction',
  },
} as const;

export async function buildLeeHyeseonMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_HYESEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이혜선');
  const artwork = allArtworks.find((a) => isLeeHyeseonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Hye-seon`
      : `${artwork.title} — 이혜선`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_HYESEON_PATH, locale, true),
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

export default async function LeeHyeseonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_HYESEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이혜선');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeHyeseonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Hye-seon' : '이혜선', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_HYESEON_PATH}#person-lee-hyeseon`,
    name: isEnglish ? 'Lee Hye-seon' : '이혜선',
    alternateName: isEnglish ? '이혜선' : 'Lee Hye-seon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Lee Hye-seon is an abstract painter who renders the blue sea of Jeju through the improvised motion of dripping and action painting, pursuing the 〈Glory_moment#+〉 series.'
      : '이혜선은 제주의 푸른 바다를 드리핑과 액션 페인팅의 즉흥적 운동성으로 풀어내며 〈Glory_moment#+〉 연작을 이어 온 추상 회화 작가입니다.',
    knowsAbout: ['Abstract painting', 'Action painting', 'Dripping', 'Jeju seascape'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Hye-seon — SAF Online' : '이혜선 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Hye-seon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 이혜선 작품을 소개합니다.',
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
        {/* Hero Section — 블루의 심연 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Wave strata — 파도의 균열·운동성 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-primary/30" />
          <div className="absolute top-0 left-20 h-full w-px bg-white/10" />
          <div className="absolute top-0 right-12 h-full w-px bg-primary/20" />
          <div className="absolute -bottom-1/3 -right-1/4 h-[80%] w-[80%] rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Hye-seon · Abstract painting' : '이혜선 · 추상 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The wave cracks open
                  <br />
                  <span className="text-primary-soft">into a blue abyss</span>
                </>
              ) : (
                <>
                  파도가 갈라지며
                  <br />
                  <span className="text-primary-soft">블루의 심연이 열린다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The improvised motion of dripping and action painting.
                  </span>
                  <span className="mt-2 block">
                    The blue sea of Jeju, set down as a leap toward hope.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">드리핑과 액션 페인팅의 즉흥적 운동성.</span>
                  <span className="mt-2 block">
                    제주의 푸른 바다를, 희망을 향한 도약으로 새기다.
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
                    The body in motion —<br />
                    <span className="text-primary-strong">a wave set down as paint</span>
                  </>
                ) : (
                  <>
                    운동하는 몸 —<br />
                    <span className="text-primary-strong">물감으로 내려앉는 파도</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Hye-seon is an abstract painter who takes the blue sea of Jeju as her
                      central motif. Where many landscape painters seek to depict the sea, she seeks
                      to <strong className="font-bold text-charcoal-deep">move with it</strong> —
                      letting the rhythm of the wave pass through her arm, her shoulder, her whole
                      body, and arrive on the canvas as gesture rather than image.
                    </p>
                    <p>
                      Her method is dripping and action painting: paint poured, flung, and let to
                      run, so that the surface records the speed and pressure of the moment it was
                      made. Each work is the residue of an event. The cracks that open across her
                      blues are not drawn but <em>found</em> — the trace of where motion met
                      resistance, where the wave broke and the surface split.
                    </p>
                    <p>
                      Out of this practice comes the 〈Glory_moment#+〉 series, her continuing body
                      of work. The title carries a single guiding phrase —{' '}
                      <strong className="font-bold text-charcoal">
                        &ldquo;Make a great leap toward your dignified life.&rdquo;
                      </strong>{' '}
                      The sea here is not scenery but a charge of vitality: the dynamic energy of
                      the wave stands in for the will to rise, to leap, to begin again.
                    </p>
                    <p>
                      Texture is essential to her surfaces. Layered, ridged, and at times almost
                      sculptural, the paint builds into a relief through which the many registers of
                      blue — from the bright skin of the shallows to the dark pressure of the deep —
                      open one onto another. To stand before the work is to look not at the sea but
                      into it: down through the cracks of the wave toward{' '}
                      <strong className="font-bold text-charcoal-deep">the blue abyss</strong>.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이혜선은 제주의 푸른 바다를 중심 모티프로 삼는 추상 회화 작가다. 많은 풍경
                      화가가 바다를 <em>그리려</em> 한다면, 그는 바다와{' '}
                      <strong className="font-bold text-charcoal-deep">함께 움직이려</strong> 한다 —
                      파도의 리듬이 팔과 어깨를, 몸 전체를 통과해 캔버스 위에 이미지가 아닌 몸짓으로
                      도착하게 한다.
                    </p>
                    <p>
                      그의 방법은 드리핑과 액션 페인팅이다. 물감을 붓고, 뿌리고, 흐르게 두어 화면이
                      만들어진 그 순간의 속도와 압력을 기록하게 한다. 한 점 한 점이 하나의 사건이
                      남긴 흔적이다. 블루를 가로지르며 갈라지는 균열은 그려진 것이 아니라{' '}
                      <em>발견된 것</em> — 운동이 저항과 만난 자리, 파도가 부서지며 표면이 쪼개진
                      자리의 자취다.
                    </p>
                    <p>
                      이 작업에서 〈Glory_moment#+〉 연작이 태어나, 지금도 이어진다. 제목은 하나의
                      화두를 품는다 —{' '}
                      <strong className="font-bold text-charcoal">
                        ‘당신의 존엄한 삶을 대도약하라.’
                      </strong>{' '}
                      여기서 바다는 풍경이 아니라 생명력의 충전이다. 파도의 역동적 에너지가,
                      일어서고 도약하고 다시 시작하려는 의지를 대신한다.
                    </p>
                    <p>
                      질감은 그의 화면에서 핵심이다. 겹겹이 쌓이고, 융기하고, 때로 거의 부조에
                      가까운 물감이 릴리프를 이루며, 그 사이로 다양한 블루의 층위 — 얕은 물의 밝은
                      살결부터 심해의 어두운 압력까지 — 가 서로에게로 열린다. 작품 앞에 선다는 것은
                      바다를 <em>바라보는</em> 것이 아니라 그 안으로 들어가는 일이다. 파도의 균열을
                      따라 아래로,{' '}
                      <strong className="font-bold text-charcoal-deep">블루의 심연</strong>을 향해.
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
                        {isEnglish ? 'Dripping & action painting' : '드리핑과 액션 페인팅'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The whole body in motion. Paint poured and flung, so the surface records the speed and pressure of the moment it was made.'
                          : '몸 전체의 운동. 붓고 뿌린 물감이 만들어진 순간의 속도와 압력을 화면에 기록한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The 〈Glory_moment#+〉 series' : '〈Glory_moment#+〉 연작'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A continuing body of work under one phrase — “Make a great leap toward your dignified life.” The wave stands in for the will to rise.'
                          : '하나의 화두 아래 이어지는 연작 — ‘당신의 존엄한 삶을 대도약하라.’ 파도가 일어서려는 의지를 대신한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Texture & the blue abyss' : '질감과 블루의 심연'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Layered, ridged, almost sculptural paint — through which the cracks of the wave and many registers of blue open onto the deep.'
                          : '겹겹이 쌓여 거의 부조에 이르는 물감 — 그 사이로 파도의 균열과 다양한 블루가 심연으로 열린다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'On the work' : '작업에 관하여'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium — abstract painting; dripping and action painting on canvas.'
                        : '매체 — 추상 회화. 캔버스 위 드리핑·액션 페인팅.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Motif — the blue sea of Jeju; the motion and crack of the wave.'
                        : '모티프 — 제주의 푸른 바다. 파도의 운동성과 균열.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Signature series — <em>Glory_moment#+</em>, an ongoing numbered body of
                          work.
                        </>
                      ) : (
                        <>
                          대표 연작 — <em>Glory_moment#+</em>, 번호로 이어지는 진행형 연작.
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Theme — a leap toward hope; the dignity and vitality of a life that rises again.'
                        : '주제 — 희망을 향한 도약. 다시 일어서는 삶의 존엄과 생명력.'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'A note in the artist’s words' : '작가의 화두 한 줄'}
                </h3>
                <blockquote className="border-l-[6px] border-primary pl-6 py-1">
                  <p className="text-charcoal text-lg md:text-xl leading-relaxed break-keep font-medium">
                    {isEnglish
                      ? '“Make a great leap toward your dignified life.”'
                      : '‘당신의 존엄한 삶을 대도약하라.’'}
                  </p>
                  <p className="mt-3 text-charcoal-muted text-sm leading-snug break-keep">
                    {isEnglish
                      ? 'The guiding phrase of the 〈Glory_moment#+〉 series.'
                      : '〈Glory_moment#+〉 연작을 이끄는 화두.'}
                  </p>
                </blockquote>
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
                  <span className="text-charcoal-deep">on motion, the blue, and the leap</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">운동, 블루, 그리고 도약에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 몸으로 그리는 바다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Painting with the body — dripping as method'
                    : '몸으로 그리는 바다 — 방법으로서의 드리핑'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Action painting begins from a refusal: the refusal to stand outside the
                        thing being painted and copy its appearance. Lee Hye-seon&apos;s sea is not
                        observed from a safe distance but entered. Paint is poured and flung; the
                        arm sweeps; the surface receives the gesture at the speed it was given. What
                        results is not a picture of a wave but the record of a movement that
                        resembles one.
                      </p>
                      <p>
                        Dripping makes chance a collaborator. Where the paint runs, pools, and
                        breaks is not fully decided in advance — it is negotiated, in the moment,
                        between the artist&apos;s intention and the material&apos;s own behaviour.
                        This is why her surfaces feel alive: they hold the memory of an event that
                        could only have happened once, exactly as it did.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        액션 페인팅은 하나의 거부에서 시작한다. 그려지는 대상 바깥에 서서 그 외양을
                        베끼기를 거부하는 것. 이혜선의 바다는 안전한 거리에서 관찰되지 않고 그
                        안으로 들어가진다. 물감을 붓고 뿌리고, 팔이 휘둘리며, 화면은 그 몸짓을
                        주어진 속도 그대로 받아낸다. 그 결과는 파도의 <em>그림</em>이 아니라, 파도를
                        닮은 운동의 기록이다.
                      </p>
                      <p>
                        드리핑은 우연을 협력자로 삼는다. 물감이 흐르고, 고이고, 갈라지는 자리는 미리
                        온전히 결정되지 않는다 — 작가의 의도와 재료 자신의 거동 사이에서, 그 순간에
                        교섭된다. 그의 화면이 살아 있게 느껴지는 이유다. 단 한 번, 정확히 그렇게밖에
                        일어날 수 없었던 사건의 기억을 품고 있기 때문이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 다양한 블루의 심연 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The many blues — texture, crack, and depth'
                    : '다양한 블루의 심연 — 질감, 균열, 그리고 깊이'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Blue is rarely a single colour in her work. The shallows carry a bright,
                        near translucent skin; the deep presses down in dark, saturated weight;
                        between them lies a whole register of greens, indigos, and greys that the
                        eye reads as distance and pressure. The blue is not flat. It is built —
                        layer over layer — until the surface itself acquires depth.
                      </p>
                      <p>
                        And it cracks. The ridges and fissures that run through the paint are where
                        motion met resistance, where the wave broke. These cracks are the door of
                        the work: they invite the eye down, away from the surface and into the abyss
                        beneath it. To look at one of her paintings for long enough is to feel the
                        pull of that depth — the blue not as a wall of colour but as an opening.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 작업에서 블루는 좀처럼 한 가지 색이 아니다. 얕은 물은 밝고 거의 투명한
                        살결을 띠고, 심해는 어둡고 짙은 무게로 내리누르며, 그 사이에는 눈이 거리와
                        압력으로 읽어내는 초록과 인디고와 회색의 층위가 펼쳐진다. 블루는 평면이
                        아니다. 겹 위에 겹으로 쌓여 — 화면 자체가 깊이를 얻을 때까지 — 지어진다.
                      </p>
                      <p>
                        그리고 그것은 갈라진다. 물감을 가로지르는 융기와 균열은 운동이 저항과 만난
                        자리, 파도가 부서진 자리다. 이 균열은 작품의 문이다. 눈을 표면에서 떼어, 그
                        아래의 심연으로 끌어내린다. 그의 그림 한 점을 충분히 오래 들여다본다는 것은
                        그 깊이의 인력을 느끼는 일이다 — 블루를 색의 벽이 아니라 하나의 열림으로
                        만나는 일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 대도약 — Glory moment */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The great leap — what Glory_moment means'
                    : '대도약 — Glory_moment의 의미'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈Glory_moment#+〉 series takes its charge from a single phrase:
                        &ldquo;Make a great leap toward your dignified life.&rdquo; The sea, in this
                        light, is not a place but a force — the vitality of the wave borrowed as an
                        image of the will to rise. Each canvas is a glory moment: the instant a wave
                        gathers itself and leaps.
                      </p>
                      <p>
                        That is also why the work belongs in this campaign. Lee Hye-seon takes part
                        not as someone the cause is meant to rescue, but as a fellow artist in
                        solidarity — offering work so that the proceeds become a mutual-aid fund for
                        peers navigating financial exclusion. The leap her paintings describe is the
                        one she wishes for them: a dignified life, and the room to make it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈Glory_moment#+〉 연작은 하나의 문장에서 힘을 얻는다 — ‘당신의 존엄한 삶을
                        대도약하라.’ 이 빛 아래에서 바다는 장소가 아니라 힘이다. 파도의 생명력을
                        일어서려는 의지의 이미지로 빌려 온 것. 한 점 한 점이 하나의 영광의 순간이다.
                        파도가 스스로를 그러모아 도약하는 그 찰나.
                      </p>
                      <p>
                        그것이 이 작업이 이 캠페인에 속하는 이유이기도 하다. 이혜선은 이 운동이
                        구해야 할 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 작품을 내어 그
                        수익이 금융 차별을 헤쳐가는 동료들의 상호부조 기금이 되도록. 그의 그림이
                        그리는 도약은, 그가 그들에게 바라는 도약이다. 존엄한 삶과, 그것을 이룰 여지.
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
                      A wave is motion that briefly takes form, and breaks, and rises again. Lee
                      Hye-seon&apos;s paintings hold that rhythm in paint: the body&apos;s movement,
                      the crack of the surface, the blue that opens onto depth. She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that the leap her work imagines might be possible for those who come after.
                    </>
                  ) : (
                    <>
                      파도는 잠시 형태를 얻었다가 부서지고 다시 일어서는 운동이다. 이혜선의 그림은
                      그 리듬을 물감으로 붙든다. 몸의 운동, 표면의 균열, 깊이로 열리는 블루. 그는
                      씨앗페에 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 그의
                      작업이 상상하는 도약이, 다음에 올 이들에게도 가능해지도록.
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
                GLORY
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Hye-seon</span>
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
                    Lee Hye-seon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이혜선 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_HYESEON_PATH}
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
