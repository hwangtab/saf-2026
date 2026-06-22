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

// 작가 feature는 작가 페이지(/artworks/artist/림지언)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='림지언', name_en 원문='림지언(Ji-oen Lim)' — 컴포넌트에선 로마자 표기 'Lim Jieon' 사용.
const LIM_JIEON_PATH = `/artworks/artist/${encodeURIComponent('림지언')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLimJieonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '림지언' ||
    n.startsWith('림지언') ||
    n === 'lim jieon' ||
    n === 'lim ji-eon' ||
    n === 'lim ji-oen' ||
    n.replace(/[\s-]+/g, '') === 'limjieon' ||
    n.replace(/[\s-]+/g, '') === 'limjioen'
  );
};

const PAGE_COPY = {
  ko: {
    title: '림지언 — 일상의 순간과 자연의 결을 그리는 회화 작가',
    description:
      '일상의 순간과 자연의 결을 회화로 옮겨 가는 작가 림지언. 〈모먼트〉, 〈진달래 진달래〉, 〈풀, 꽃!〉 등의 작업을 통해 평범한 풍경에 깃든 정서를 색채와 선으로 풀어낸다. 2018년 서울에서 첫 개인전을 열고 2025년 서울 단체전에 참여한 회화 작가 림지언의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '일상의 순간과 자연의 결을 회화로 옮기는 작가 림지언. 평범한 풍경에 깃든 정서를 색채와 선으로 풀어낸다.',
    ogAlt: '림지언 대표 작품',
    twitterTitle: '림지언',
    twitterDescription:
      '평범한 풍경에 깃든 정서 — 일상의 순간과 자연의 결을 그리는 회화 작가 림지언',
    keywords: '림지언 작가, 회화, 모먼트, 진달래 진달래, 풀 꽃, 일상, 자연의 결, 씨앗페 온라인',
  },
  en: {
    title: 'Lim Jieon — Painter of Everyday Moments and the Grain of Nature',
    description:
      'Selected works by Lim Jieon, a painter who carries everyday moments and the grain of nature into paint. Through works such as 〈Moment〉, 〈Azalea, Azalea〉, and 〈Grass, Flower!〉, she draws out the feeling embedded in ordinary scenery with colour and line. She held her first solo exhibition in Seoul in 2018 and took part in a Seoul group exhibition in 2025. View and collect her works at SAF Online.',
    ogDescription:
      'Lim Jieon — a painter carrying everyday moments and the grain of nature into paint, drawing out the feeling in ordinary scenery with colour and line.',
    ogAlt: 'Lim Jieon — featured work',
    twitterTitle: 'Lim Jieon',
    twitterDescription:
      'The feeling in ordinary scenery — a painter of everyday moments and the grain of nature',
    keywords:
      'Lim Jieon artist, Korean contemporary painting, everyday, nature, Moment, Azalea, colour and line',
  },
} as const;

export async function buildLimJieonMetadata({
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
  const pageUrl = buildLocaleUrl(LIM_JIEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('림지언');
  const artwork = allArtworks.find((a) => isLimJieonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lim Jieon`
      : `${artwork.title} — 림지언`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LIM_JIEON_PATH, locale, true),
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

export default async function LimJieonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LIM_JIEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('림지언');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLimJieonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lim Jieon' : '림지언', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LIM_JIEON_PATH}#person-lim-jieon`,
    name: isEnglish ? 'Lim Jieon' : '림지언',
    alternateName: isEnglish ? '림지언' : 'Lim Jieon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Lim Jieon is a painter who carries everyday moments and the grain of nature into paint, drawing out the feeling embedded in ordinary scenery through colour and line.'
      : '림지언은 일상의 순간과 자연의 결을 회화로 옮겨 가는 작가로, 평범한 풍경에 깃든 정서를 색채와 선으로 풀어냅니다.',
    knowsAbout: isEnglish
      ? ['Contemporary painting', 'Everyday scenery', 'Nature']
      : ['회화', '일상의 풍경', '자연'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lim Jieon — SAF Online' : '림지언 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lim Jieon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 림지언 작품을 소개합니다.',
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
        {/* Hero Section — 일상과 자연의 결: 맑고 차분한 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 자연의 결 모티프 — 화면을 가로지르는 잔잔한 선 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lim Jieon · Painter' : '림지언 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The feeling in
                  <br />
                  <span className="text-primary-soft">an ordinary scene</span>
                </>
              ) : (
                <>
                  평범한 풍경에
                  <br />
                  <span className="text-primary-soft">깃든 정서</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Everyday moments and the grain of nature, carried into paint.
                  </span>
                  <span className="mt-2 block">
                    The quiet feeling of a passing scene, drawn out in colour and line.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">일상의 순간과 자연의 결을 회화로 옮기다.</span>
                  <span className="mt-2 block">
                    스쳐 가는 풍경의 정서를 색채와 선으로 풀어낸다.
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
                    Colour and line —<br />
                    <span className="text-primary-strong">the grain of the everyday</span>
                  </>
                ) : (
                  <>
                    색채와 선 —<br />
                    <span className="text-primary-strong">일상에 깃든 결</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lim Jieon is a painter who carries the moments of daily life and the grain of
                      nature into paint. Her premise is patient and unassuming: that ordinary
                      scenery — the kind one passes without a second glance — holds a feeling worth
                      keeping, and that the work of painting is to draw that feeling out in colour
                      and line.
                    </p>
                    <p>
                      Her practice gathers around a small vocabulary of recurring works.{' '}
                      <strong className="font-bold text-charcoal-deep">〈Moment〉</strong> names the
                      instant her painting is most attentive to — not the grand event but the brief,
                      passing now.{' '}
                      <strong className="font-bold text-charcoal-deep">〈Azalea, Azalea〉</strong>{' '}
                      and{' '}
                      <strong className="font-bold text-charcoal-deep">〈Grass, Flower!〉</strong>{' '}
                      turn to the close, low growth of the natural world — the flowers and grasses
                      that crowd the edge of a familiar path.
                    </p>
                    <p>
                      What unites these works is a way of looking rather than a single subject. The
                      feeling she pursues is not declared; it is allowed to surface through how a
                      colour is set beside another, how a line follows the contour of a petal or a
                      blade of grass. The painting becomes a record of attention paid to what is
                      usually overlooked.
                    </p>
                    <p>
                      She held her first solo exhibition in Seoul in 2018, and in 2025 took part in
                      a group exhibition, also in Seoul. Between these markers the work has
                      continued along a single, quiet line of enquiry — how an ordinary moment, and
                      the nature that frames it, can be kept on the surface of a canvas.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      림지언은 일상의 순간과 자연의 결을 회화로 옮겨 가는 작가다. 그의 전제는
                      차분하고 나직하다 — 무심코 지나치는 평범한 풍경에도 간직할 만한 정서가 깃들어
                      있으며, 그림이 할 일은 그 정서를{' '}
                      <strong className="font-bold text-charcoal-deep">색채와 선</strong>으로
                      풀어내는 것이라는 믿음.
                    </p>
                    <p>
                      그의 작업은 되풀이되는 작은 어휘들 둘레로 모인다.{' '}
                      <strong className="font-bold text-charcoal-deep">〈모먼트〉</strong>는 그의
                      그림이 가장 깊이 귀 기울이는 순간을 이름 짓는다 — 거창한 사건이 아니라, 짧게
                      스쳐 가는 지금.{' '}
                      <strong className="font-bold text-charcoal-deep">〈진달래 진달래〉</strong>와{' '}
                      <strong className="font-bold text-charcoal-deep">〈풀, 꽃!〉</strong>은 자연의
                      낮고 가까운 자리로 향한다 — 익숙한 길가에 빼곡한 꽃과 풀들.
                    </p>
                    <p>
                      이 작업들을 하나로 묶는 것은 단일한 소재가 아니라 바라보는 방식이다. 그가 좇는
                      정서는 선언되지 않는다. 그것은 한 색이 다른 색 곁에 놓이는 방식, 선이 꽃잎이나
                      풀잎의 윤곽을 따라가는 방식을 통해 떠오르도록 허락된다. 그림은 흔히 간과되는
                      것을 향한 응시의 기록이 된다.
                    </p>
                    <p>
                      그는 2018년 서울에서 첫 개인전을 열었고, 2025년에는 역시 서울에서 열린
                      단체전에 참여했다. 이 두 지점 사이에서, 작업은 하나의 고요한 물음을 따라
                      이어져 왔다 — 평범한 한 순간과 그것을 둘러싼 자연을 어떻게 캔버스의 표면 위에
                      간직할 것인가.
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
                        {isEnglish ? 'The everyday moment' : '일상의 순간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In the 〈Moment〉 works she attends not to the grand event but to the brief, passing now of ordinary life.'
                          : '〈모먼트〉 연작에서 그는 거창한 사건이 아니라 일상의 짧게 스쳐 가는 지금에 귀 기울인다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The grain of nature' : '자연의 결'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? '〈Azalea, Azalea〉 and 〈Grass, Flower!〉 turn to the close, low growth of the natural world — the flowers and grasses at the edge of a familiar path.'
                          : '〈진달래 진달래〉와 〈풀, 꽃!〉은 자연의 낮고 가까운 자리로 향한다 — 익숙한 길가의 꽃과 풀.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Feeling in colour and line' : '색채와 선의 정서'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The feeling she pursues is not declared but allowed to surface through how a colour meets a colour and a line follows a contour.'
                          : '그가 좇는 정서는 선언되지 않고, 색이 색을 만나고 선이 윤곽을 따라가는 방식을 통해 떠오른다.'}
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
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'First solo exhibition, Seoul.' : '첫 개인전, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in a group exhibition, Seoul.'
                        : '단체전 참여, 서울.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Recurring works' : '되풀이되는 작업'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <em>Moment</em> — the brief, passing now of everyday life
                        </>
                      ) : (
                        <>〈모먼트〉 — 일상의 짧게 스쳐 가는 지금</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <em>Azalea, Azalea</em> — the close, low growth of the natural world
                        </>
                      ) : (
                        <>〈진달래 진달래〉 — 자연의 낮고 가까운 자리</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <em>Grass, Flower!</em> — flowers and grasses at the edge of a familiar
                          path
                        </>
                      ) : (
                        <>〈풀, 꽃!〉 — 익숙한 길가의 꽃과 풀</>
                      )}
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
                  <span className="text-charcoal-deep">on the moment, nature, and looking</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">순간과 자연, 그리고 바라봄에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 모먼트 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈Moment〉 — the small now made visible'
                    : '〈모먼트〉 — 작은 지금을 보이게 하기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title 〈Moment〉 sets the scale of Lim Jieon&apos;s attention. Her
                        painting is not addressed to the large event — the kind that announces
                        itself and demands to be remembered — but to the brief, ordinary now that
                        passes before it is noticed: a quality of light, a turn of weather, the look
                        of a thing seen in passing.
                      </p>
                      <p>
                        To paint such a moment is, in part, to slow it down. What lasts only an
                        instant in life is held on the canvas long enough to be looked at properly.
                        In this sense the work is less a depiction of a scene than a way of keeping
                        company with it — staying with the small now until its feeling becomes
                        legible.
                      </p>
                      <p>
                        This is why colour and line carry so much in her work. A moment has no plot
                        to recount; its meaning lives in tone and texture, in how the eye moves
                        across the surface. By trusting these quiet means, Lim Jieon lets the
                        ordinary instant speak in its own register, without raising its voice.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈모먼트〉라는 제목은 림지언이 기울이는 주의의 척도를 정한다. 그의 그림은
                        스스로를 알리며 기억되기를 요구하는 큰 사건이 아니라, 알아차리기도 전에 스쳐
                        가는 짧고 평범한 지금을 향한다 — 빛의 결, 날씨의 기색, 지나가며 본 어떤 것의
                        모습.
                      </p>
                      <p>
                        그런 순간을 그린다는 것은 어느 정도 그것을 늦추는 일이다. 삶에서는 찰나로만
                        머무는 것이 캔버스 위에서는 제대로 바라볼 수 있을 만큼 오래 붙들린다. 그런
                        의미에서 이 작업은 한 장면의 묘사라기보다 그 곁에 머무는 한 방식이다 — 그
                        정서가 읽힐 때까지 작은 지금에 함께 있는 것.
                      </p>
                      <p>
                        그래서 그의 작업에서 색채와 선이 그토록 많은 것을 짊어진다. 한 순간에는
                        들려줄 줄거리가 없다. 그 의미는 톤과 질감 속에, 눈이 화면 위를 움직이는 방식
                        속에 깃든다. 이 고요한 수단을 신뢰함으로써, 림지언은 평범한 한순간이
                        목소리를 높이지 않고도 제 음역으로 말하게 한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 진달래, 풀, 꽃 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Azalea, Azalea〉 and 〈Grass, Flower!〉 — nature at eye level'
                    : '〈진달래 진달래〉와 〈풀, 꽃!〉 — 눈높이의 자연'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Where the 〈Moment〉 works frame time, the nature series frame place — and
                        they choose a particular kind of place. 〈Azalea, Azalea〉 and 〈Grass,
                        Flower!〉 do not reach for the grand landscape, the distant mountain or the
                        sweeping vista. They turn instead to the low, near growth that lives at the
                        edge of an ordinary path: azaleas, grasses, the small flowers one steps
                        past.
                      </p>
                      <p>
                        The repetition in the titles — <em>azalea, azalea</em> — already carries a
                        tone. It is the cadence of noticing, of saying a thing twice because seeing
                        it once was not enough. The exclamation in <em>Grass, Flower!</em> does the
                        same work: it marks the small surprise of finding, at close range, something
                        worth a painting.
                      </p>
                      <p>
                        This is nature met at eye level rather than admired from a height. By
                        choosing the close and the common, Lim Jieon keeps faith with her central
                        premise — that the ordinary scene, fully attended to, holds as much feeling
                        as any grander subject, and that colour and line are enough to draw it out.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈모먼트〉 연작이 시간을 틀 짓는다면, 자연 연작은 장소를 틀 짓는다 — 그리고
                        특정한 종류의 장소를 고른다. 〈진달래 진달래〉와 〈풀, 꽃!〉은 거창한 풍경,
                        먼 산이나 탁 트인 조망으로 나아가지 않는다. 대신 평범한 길가에 사는 낮고
                        가까운 것들로 향한다 — 진달래, 풀, 무심히 지나치는 작은 꽃들.
                      </p>
                      <p>
                        제목의 되풀이 — <em>진달래, 진달래</em> — 는 이미 하나의 어조를 품는다.
                        그것은 알아차림의 가락이다. 한 번 보아서는 부족했기에 두 번 부르는. 〈풀,
                        꽃!〉의 느낌표도 같은 일을 한다. 가까이에서, 그림 한 점의 값어치를 지닌 것을
                        발견한 작은 놀라움을 새긴다.
                      </p>
                      <p>
                        이것은 높은 곳에서 우러르는 자연이 아니라 눈높이에서 마주하는 자연이다.
                        가깝고 흔한 것을 택함으로써, 림지언은 그의 중심 전제에 충실하다 — 충분히
                        응시된 평범한 풍경은 그 어떤 거창한 소재 못지않은 정서를 품으며, 색채와 선만
                        으로 그것을 풀어내기에 족하다는 것.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 바라봄이라는 작업 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Looking as the work — attention to the overlooked'
                    : '바라봄이라는 작업 — 간과되는 것을 향한 응시'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Across Lim Jieon&apos;s recurring works — 〈Moment〉, 〈Azalea, Azalea〉,
                        〈Grass, Flower!〉 — what binds them is not a subject but a discipline of
                        looking. Each begins from the same modest act: stopping in front of
                        something that most people walk past, and staying long enough for its
                        feeling to register.
                      </p>
                      <p>
                        In this practice the painting is, in a sense, the evidence of attention. The
                        finished surface records not only what was seen but how carefully it was
                        seen — the time given to an ordinary flower, an ordinary hour. To paint the
                        overlooked is quietly to argue that it was always worth looking at.
                      </p>
                      <p>
                        From her first solo exhibition in Seoul in 2018 to her recent group showing
                        in 2025, this is the line her work has kept: the conviction that everyday
                        moments and the grain of nature hold a feeling worth keeping, and that
                        colour and line, patiently used, are enough to keep it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        림지언의 되풀이되는 작업들 — 〈모먼트〉, 〈진달래 진달래〉, 〈풀, 꽃!〉 — 을
                        하나로 묶는 것은 소재가 아니라 바라봄의 규율이다. 각각은 같은 소박한
                        행위에서 출발한다. 대부분의 사람이 지나치는 무언가 앞에 멈춰 서서, 그 정서가
                        새겨질 만큼 오래 머무는 것.
                      </p>
                      <p>
                        이 작업에서 그림은 어떤 의미로는 응시의 증거다. 완성된 화면은 무엇을
                        보았는가뿐 아니라 얼마나 정성껏 보았는가를 기록한다 — 평범한 꽃 한 송이,
                        평범한 한 시각에 들인 시간을. 간과되는 것을 그린다는 것은, 그것이 언제나
                        바라볼 만한 가치가 있었음을 나직이 주장하는 일이다.
                      </p>
                      <p>
                        2018년 서울의 첫 개인전에서 2025년의 최근 단체전에 이르기까지, 그의 작업이
                        지켜 온 선이 이것이다 — 일상의 순간과 자연의 결이 간직할 만한 정서를 품으며,
                        인내로 쓰인 색채와 선이 그것을 간직하기에 족하다는 믿음.
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
                      From an ordinary moment to a flower at the edge of a path, Lim Jieon&apos;s
                      work pursues a single, patient question: how does one keep the feeling
                      embedded in everyday scenery? Her answer, set down in colour and line, is an
                      art of careful looking. She joins this campaign not as a subject of its cause
                      but as a fellow artist in solidarity — so that the proceeds of her work might
                      become a low-interest lifeline for artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      평범한 한순간에서 길가의 꽃 한 송이까지, 림지언의 작업은 하나의 차분한 물음을
                      추구해 왔다 — 일상의 풍경에 깃든 정서를 어떻게 간직할 것인가. 색채와 선으로
                      내려놓은 그의 대답은 정성껏 바라보는 예술이다. 씨앗페에는 이 캠페인의 대상이
                      아니라, 동료 예술인과의 연대자로 함께한다 — 작품 판매 수익이 오늘 금융 차별을
                      겪는 예술인에게 저금리의 버팀목이 될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lim Jieon</span>
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
                    Lim Jieon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    림지언 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LIM_JIEON_PATH}
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
