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

// 작가 feature는 작가 페이지(/artworks/artist/정미정)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JEONG_MIJEONG_PATH = `/artworks/artist/${encodeURIComponent('정미정')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongMijeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정미정' ||
    n === 'jeong mijeong' ||
    n === 'jeong mi-jeong' ||
    n === 'jeongmijeong' ||
    n === 'chung mijung' ||
    n.replace(/[\s-]+/g, '') === 'jeongmijeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정미정 — 시간을 겹겹이 쌓아, 기억이 되다',
    description:
      '회화 작가 정미정. 세종대학교 회화과(서양화)를 졸업하고 런던 첼시 예술대학교(Chelsea College of Arts, UAL)에서 MA Fine Art를 마친 그는, 시간과 공간, 기억의 결을 다층적으로 쌓아 올리는 회화로 국립현대미술관 미술은행 등 주요 기관에 소장되어 있다. 씨앗페 온라인에서 정미정의 작품을 만날 수 있습니다.',
    ogDescription:
      '회화 작가 정미정. 시간과 공간, 기억의 결을 켜켜이 쌓아 올린 다층 회화 — 유화의 물성이 기억의 층위와 시간의 깊이를 드러낸다.',
    ogAlt: '정미정 대표 작품',
    twitterTitle: '정미정',
    twitterDescription: '시간을 겹겹이 쌓아, 기억이 되다 — 회화 작가 정미정',
    keywords:
      '정미정 화가, 정미정 회화, Jeong Mijeong painter, 세종대학교 회화과, 첼시 예술대학교, 다층 회화 기억, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Mijeong — Layering time until it becomes memory',
    description:
      'Selected works by Jeong Mijeong, a painter who builds time, space, and the textures of memory into multi-stratified paintings. A graduate of Sejong University (Western Painting) and the MA Fine Art programme at Chelsea College of Arts, University of the Arts London. Her works are held in the MMCA Art Bank, Gyeonggi Museum of Art, and other major institutions. View her works at SAF Online.',
    ogDescription:
      'Jeong Mijeong — a painter of layered time and memory. Oil paint accumulated layer by layer, revealing the depths of how we hold the past.',
    ogAlt: 'Jeong Mijeong — featured work',
    twitterTitle: 'Jeong Mijeong',
    twitterDescription: 'Layering time until it becomes memory — Jeong Mijeong, painter',
    keywords:
      'Jeong Mijeong painter, Korean contemporary painting, layered painting time memory, Sejong University, Chelsea College of Arts UAL',
  },
} as const;

export async function buildJeongMijeongMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_MIJEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정미정');
  const artwork = allArtworks.find((a) => isJeongMijeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Mijeong`
      : `${artwork.title} — 정미정`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_MIJEONG_PATH, locale, true),
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

export default async function JeongMijeongFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_MIJEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정미정');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJeongMijeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Jeong Mijeong' : '정미정', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_MIJEONG_PATH}#person-jeong-mijeong`,
    name: isEnglish ? 'Jeong Mijeong' : '정미정',
    alternateName: isEnglish ? '정미정' : 'Jeong Mijeong',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Jeong Mijeong is a Korean painter who layers time, space, and the textures of memory into multi-stratified works. She graduated from the Department of Painting (Western Painting) at Sejong University and completed her MA in Fine Art at Chelsea College of Arts, University of the Arts London. Her works are held in the MMCA Art Bank, Seoul City Hall Museum, Gyeonggi Museum of Art, and Yangju Museum of Art Chang Ucchin, among others. She has held numerous solo exhibitions in Seoul and participated in major art fairs including the Galleries Art Fair (화랑미술제) ZOOM IN Edition 7 (2026).'
      : '정미정은 시간과 공간, 기억의 결을 회화로 다층적으로 쌓아 올리는 작가입니다. 세종대학교 회화과(서양화)를 졸업한 뒤 런던 첼시 예술대학교(Chelsea College of Arts, University of the Arts London)에서 MA Fine Art를 마쳤습니다. 국립현대미술관 미술은행, 서울시청 박물관, 경기도미술관, 양주시립장욱진미술관 등에 작품이 소장되어 있으며, 2026 화랑미술제 신진작가 특별전 《ZOOM IN Edition 7》에 선정되었습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Sejong University, Dept. of Painting — Western Painting (BFA)'
          : '세종대학교 회화과(서양화) 학사',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chelsea College of Arts, University of the Arts London (MA Fine Art)'
          : '첼시 예술대학교, University of the Arts London (MA Fine Art)',
      },
    ],
    knowsAbout: ['Painting', 'Contemporary painting', 'Oil on canvas', 'Layered painting'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Mijeong — SAF Online' : '정미정 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Mijeong from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 정미정 작품을 소개합니다.',
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
        {/* Hero Section — 다층 회화, 시간의 켜 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 층층이 쌓인 수평선 모티프 — 팔림프세스트의 시각적 은유 */}
          <div className="absolute top-20 left-0 right-0 h-px bg-white/8" aria-hidden="true" />
          <div className="absolute top-28 left-0 right-0 h-px bg-white/6" aria-hidden="true" />
          <div className="absolute top-36 left-0 right-0 h-px bg-white/4" aria-hidden="true" />
          <div
            className="absolute bottom-24 left-0 right-0 h-px bg-primary/10"
            aria-hidden="true"
          />
          <div className="absolute bottom-32 left-0 right-0 h-px bg-primary/6" aria-hidden="true" />
          <div className="absolute bottom-40 left-0 right-0 h-px bg-white/5" aria-hidden="true" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Mijeong' : '정미정'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Layering time
                  <br />
                  <span className="text-primary-soft">until it becomes memory</span>
                </>
              ) : (
                <>
                  시간을 겹겹이 쌓아
                  <br />
                  <span className="text-primary-soft">기억이 되다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A painter who builds the past into the surface of the canvas,
                  </span>
                  <span className="mt-2 block">
                    layer by layer, until time itself becomes visible.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">지나간 시간을 켜켜이 캔버스 위에 쌓아 올리는 화가.</span>
                  <span className="mt-2 block">유화의 층이 깊어질수록, 기억도 선명해진다.</span>
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
                    From Seoul to London —<br />
                    <span className="text-primary-strong">a practice of layered time</span>
                  </>
                ) : (
                  <>
                    서울에서 런던으로 —<br />
                    <span className="text-primary-strong">시간을 쌓는 회화</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Mijeong studied Western Painting at Sejong University in Seoul, building
                      the structural and technical foundation of her practice in the discipline of
                      oil painting. After graduating, she crossed to London to pursue an MA in Fine
                      Art at Chelsea College of Arts, University of the Arts London — an immersion
                      in international contemporary art practice that deepened her thinking about
                      what painting can hold and what it can do.
                    </p>
                    <p>
                      The core of her work is accumulation. Her paintings are built through the
                      repeated application of oil paint: layer upon layer, each allowed to settle
                      before the next is laid down. With each addition the colour{' '}
                      <strong className="font-bold text-charcoal-deep">deepens and changes</strong>{' '}
                      — the intended hue and an unexpected one emerging together, inseparable. The
                      resulting surface is not a record of a single moment but of many: time made
                      visible, made material.
                    </p>
                    <p>
                      All of her work begins with personal memory and the process by which memory
                      transforms. Photographs serve as a starting point — not as documents to be
                      reproduced faithfully, but as traces to be reinterpreted from the present,
                      reconstructed and restaged on the canvas. When one memory rises, others arrive
                      with it; the past is never singular. Her paintings are built to show this:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        images that overlap and tremble
                      </strong>
                      , impressions that shift within a single surface.
                    </p>
                    <p>
                      The concept of the palimpsest — a manuscript where earlier writing has been
                      partially erased but still shows through beneath new text — runs through her
                      most recent work. The 2025 solo exhibition at Space Thunder was titled
                      〈Palimpsest — Things That Remain While Disappearing〉: an acknowledgement
                      that nothing in painting is ever truly covered. Each earlier layer persists,
                      visible to those who look closely, shaping the surface above it. This is how
                      memory works, and how her paintings work.
                    </p>
                    <p>
                      Her practice has been recognised through major awards — the Grand Prize at the
                      IBK Emerging Artist Competition (2018) and the New Wave Excellence Award at
                      the Busan International Art Fair (2021) — and her works are held in the MMCA
                      Art Bank, the Seoul City Hall Museum, Gyeonggi Museum of Art, and the Yangju
                      Museum of Art Chang Ucchin, among others. In 2026 she was selected — from over
                      700 applicants — for the Galleries Art Fair special exhibition 〈ZOOM IN
                      Edition 7〉, one of ten artists chosen.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정미정은 세종대학교에서 서양화를 공부하며 유화 기법의 구조적·기술적 토대를
                      다졌다. 졸업 후에는 런던으로 건너가 첼시 예술대학교(Chelsea College of Arts,
                      University of the Arts London)에서 MA Fine Art를 이수했다. 국제적인 현대미술
                      현장에의 침잠은 회화가 무엇을 담을 수 있는지, 무엇을 할 수 있는지에 대한 그의
                      사유를 더욱 깊게 만들었다.
                    </p>
                    <p>
                      그의 작업의 핵심은 축적이다. 유화 물감을 거듭 올려 그림을 짓는다. 층층이,
                      각각이 자리를 잡으면 다시 다음 층을 놓는다. 층이 더해질수록 색은{' '}
                      <strong className="font-bold text-charcoal-deep">깊어지고 변한다</strong> —
                      의도한 색과 예상치 못한 색이 함께 나타나, 분리될 수 없이 섞인다. 완성된 화면은
                      단일한 순간의 기록이 아니라 여러 순간들의 기록이다. 시간이 눈에 보이는 것이
                      되고, 물질이 된다.
                    </p>
                    <p>
                      모든 작업은 개인적 기억과 기억이 변형되는 과정에 대한 관심에서 출발한다.
                      사진은 출발점이 된다 — 충실하게 재현해야 할 문서로서가 아니라, 현재의 시점에서
                      다시 읽고 재구성하고 재연출할 흔적으로서. 하나의 기억이 떠오르면 그와 연결된
                      다른 기억들이 함께 온다. 과거는 결코 단수가 아니다. 그의 회화는 이것을
                      보여주기 위해 지어진다:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        중첩되며 흔들리는 이미지
                      </strong>
                      , 하나의 화면 안에서 흔들리는 인상.
                    </p>
                    <p>
                      팔림프세스트 — 앞서 쓴 글이 부분적으로 지워졌지만 새 글 아래에서 여전히 비치는
                      양피지 — 의 개념이 그의 최근 작업을 관통한다. 2025년 공간썬더에서의 개인전
                      제목은 〈팔림프세스트 — 사라지며 남는 것들〉이었다. 회화에서는 어떤 것도
                      완전히 덮이지 않는다는 인정이었다. 이전의 모든 층이 지속되어, 자세히 보는
                      이에게 보이며, 위의 화면을 빚는다. 기억이 작동하는 방식이고, 그의 회화가
                      작동하는 방식이다.
                    </p>
                    <p>
                      IBK 기업은행 신진작가 공모대전 최우수상(2018), 부산국제아트페어(BIAF) New Wave
                      신진우수작가상(2021) 등을 수상했고, 국립현대미술관 미술은행, 서울시청 박물관,
                      경기도미술관, 양주시립장욱진미술관 등에 작품이 소장되어 있다. 2026년에는 700여
                      명의 지원자 중 10명에 선정되어 화랑미술제 신진작가 특별전 《ZOOM IN Edition
                      7》에 참여했다.
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
                        {isEnglish
                          ? 'Multi-layered painting as temporal record'
                          : '다층 회화 — 시간의 기록'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Each layer of oil paint carries a moment; together they form a surface in which past and present are simultaneously present.'
                          : '유화의 각 층은 하나의 순간을 담는다. 겹겹이 쌓여, 과거와 현재가 동시에 현존하는 화면이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Memory as reconstruction' : '기억의 재구성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Photographs are a starting point, not an end: reinterpreted and restaged from the present, overlapping until the image trembles with accumulated meaning.'
                          : '사진은 출발점이지 목적지가 아니다. 현재의 시점에서 다시 읽고 재구성하여, 겹쳐진 의미로 이미지가 흔들릴 때까지.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Palimpsest — what remains while disappearing'
                          : '팔림프세스트 — 사라지며 남는 것들'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Nothing is ever entirely covered. Earlier layers persist, shaping the surface above — as in memory, where traces of the past show through the present.'
                          : '어떤 것도 완전히 덮이지 않는다. 이전의 층들이 지속되어 위의 화면을 빚는다 — 과거의 흔적이 현재를 통해 비치는 기억처럼.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BFA, Dept. of Painting (Western Painting), Sejong University, Seoul.'
                        : '세종대학교 회화과(서양화) 학사, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MA Fine Art, Chelsea College of Arts, University of the Arts London, UK.'
                        : 'MA Fine Art, Chelsea College of Arts, University of the Arts London, 런던.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014–15
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions in London — Chelsea Salon, Cons Project; Passport Pimlico; The Lewis PR Orbital Gallery, Milbank.'
                        : '런던 단체전 — Chelsea Salon/Cons Project; Passport Pimlico; The Lewis PR Orbital Gallery (Milbank).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016–18
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Self-Transformation〉 (Jeong Gallery, 2016); 〈MY STORY〉, 〈Remembrance〉 (Fill Gallery / Sai Art Document, 2017); 〈Intersected Time〉 (Seum Art Space, 2018).'
                        : '「Self-Transformation」(정 갤러리, 2016); 「MY STORY」·「Remembrance」(필 갤러리·사이아트 도큐먼트, 2017); 「교차된 시간」(세움아트스페이스, 2018).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Grand Prize — IBK Industrial Bank of Korea Emerging Artist Competition.'
                        : 'IBK 기업은행 신진작가 공모대전 최우수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020–21
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Rendezvous〉 (E-Land World HQ, 2020); 〈TIME〉 (Fill Gallery, 2020); 〈Line and Light〉 (Art Space W, 2021); 〈I Run Into You〉 (Art Soombi, 2021). BIAF New Wave Excellence Award (2021).'
                        : '「랑데부」(이랜드 월드사옥, 2020); 「TIME」(필 갤러리, 2020); 「선 그리고 빛」(아트스페이스 W, 2021); 「I Run Into You」(아트숨비, 2021). BIAF New Wave 신진우수작가상(2021).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022–24
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈YONDER〉 (Fill Gallery, 2022); 〈The Time in Between〉 (Seoul Gallery, 2022); 〈Time, Space and Memory〉 (E-Land Gallery, 2023–24); 〈Connection〉 (Gallery Sil, 2024).'
                        : '「저 너머에: YONDER」(필 갤러리, 2022); 「The time in between」(서울갤러리, 2022); 「시간, 공간 그리고 기억」(이랜드 갤러리, 2023–24); 「연결: Connection」(갤러리 실, 2024).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025–26
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Palimpsest — Things That Remain While Disappearing〉 (Space Thunder, 2025); selected for Galleries Art Fair 〈ZOOM IN Edition 7〉 (2026, one of 10 from 700+ applicants).'
                        : '「팔림프세스트 — 사라지며 남는 것들」(공간썬더, 2025); 2026 화랑미술제 《ZOOM IN Edition 7》 선정 (700여 명 중 10명).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Awards & public collections' : '수상 및 주요 소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2018 IBK Industrial Bank of Korea Emerging Artist Competition — Grand Prize'
                        : '2018 IBK 기업은행 신진작가 공모대전 최우수상'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2021 Busan International Art Fair (BIAF) — New Wave Emerging Artist Excellence Award'
                        : '2021 BIAF 부산국제아트페어 — New Wave 신진우수작가상'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA Art Bank (National Museum of Modern and Contemporary Art, Korea); Seoul City Hall Museum; Gyeonggi Museum of Art; Yangju Museum of Art Chang Ucchin'
                        : '소장처: 국립현대미술관 미술은행; 서울시청 박물관; 경기도미술관; 양주시립장욱진미술관'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2026 Galleries Art Fair — ZOOM IN Edition 7, selected from 700+ applicants (one of 10 artists)'
                        : '2026 화랑미술제 신진작가 특별전 《ZOOM IN Edition 7》 선정 (700여 명 중 10명)'}
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
                  <span className="text-charcoal-deep">on painting, time, and memory</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">회화, 시간, 기억에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 다층적으로 쌓는 회화 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Multi-layered painting — building time into the surface'
                    : '다층적으로 쌓는 회화 — 시간을 화면에 새기다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The process of Jeong Mijeong&apos;s painting is also its subject. She works
                        in oil: a medium that requires patience, where each layer must dry before
                        the next can be applied, where the colour deepens and shifts with every
                        addition, where the hand cannot rush the material. To paint in oil this way
                        is to work in time as much as in paint.
                      </p>
                      <p>
                        The result is a surface where nothing is ever finished in a single pass. A
                        ground colour is laid, then modified, then partially obscured, then built
                        upon again. Colours that were intended produce other colours; the unexpected
                        and the deliberate become indistinguishable. This accumulation is not merely
                        technical: it is{' '}
                        <strong className="font-bold text-charcoal-deep">
                          the method made identical to the meaning
                        </strong>
                        . A painting about layered time is made by layering, over time.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정미정의 회화 과정은 곧 작업의 주제이기도 하다. 그는 유화로 작업한다. 인내가
                        필요한 재료다. 각각의 층이 마를 때까지 기다려야 다음 층을 올릴 수 있고, 층이
                        더해질수록 색은 깊어지고 변하며, 손은 재료를 서두를 수 없다. 이런 방식으로
                        유화를 그린다는 것은, 물감만큼이나 시간 속에서 작업하는 것이다.
                      </p>
                      <p>
                        그 결과는 단번에 완성되는 일이 없는 화면이다. 바닥색이 깔리고, 수정되고,
                        부분적으로 덮이고, 다시 쌓인다. 의도한 색이 다른 색을 만들고, 예상치 못한
                        것과 의도한 것은 분리될 수 없게 된다. 이 축적은 단순한 기법이 아니다:{' '}
                        <strong className="font-bold text-charcoal-deep">
                          방법이 의미와 동일해지는 것
                        </strong>
                        이다. 켜켜이 쌓인 시간에 관한 회화는, 시간을 두고 겹겹이 쌓음으로써
                        만들어진다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 시간·공간·기억 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Time, space, and memory — how the past returns'
                    : '시간, 공간, 기억 — 과거가 돌아오는 방식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jeong Mijeong&apos;s paintings begin with personal memory — not as something
                        stable and fixed, but as something that transforms each time it is recalled.
                        Photographs are the starting point: a record of a moment as it was seen, not
                        as it is remembered. She takes these documents and reinterprets them from
                        the present, restaging and reconstructing them on the canvas until the
                        distinction between what was and what is remembered dissolves.
                      </p>
                      <p>
                        Memory does not arrive alone. When one scene from the past rises to the
                        surface, others rise with it — connected by mood, by place, by the quality
                        of light. The painting is built to carry this multiplicity. Images overlap;
                        impressions tremble; what was once distinct becomes diffuse. The finished
                        work contains many moments simultaneously, none of them quite complete,{' '}
                        <strong className="font-bold text-charcoal-deep">
                          all of them still present
                        </strong>
                        . This is how memory works, and this is what her canvases show.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정미정의 회화는 개인적 기억에서 출발한다 — 안정되고 고정된 것으로서가
                        아니라, 떠올릴 때마다 변형되는 것으로서. 사진이 출발점이 된다. 기억되는
                        것으로서가 아니라, 보았던 것으로서의 순간의 기록. 그는 이 기록들을 현재의
                        시점에서 다시 읽고, 캔버스 위에서 재연출하고 재구성하여, 있었던 것과
                        기억되는 것의 경계가 흐려질 때까지 나아간다.
                      </p>
                      <p>
                        기억은 혼자 오지 않는다. 과거의 한 장면이 떠오르면, 기분으로, 장소로, 빛의
                        질로 연결된 다른 것들이 함께 떠오른다. 회화는 이 복수성을 담기 위해
                        지어진다. 이미지가 중첩되고, 인상이 흔들리며, 한때 뚜렷했던 것이 흐릿해진다.
                        완성된 작품은 여러 순간들을 동시에 담는다. 어느 것도 완전히 완성되지 않은
                        채,{' '}
                        <strong className="font-bold text-charcoal-deep">
                          모두 여전히 현존하는 채로
                        </strong>
                        . 기억이 작동하는 방식이고, 그의 캔버스가 보여주는 것이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 팔림프세스트 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Palimpsest — what remains while disappearing'
                    : '팔림프세스트 — 사라지며 남는 것들'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The palimpsest — a manuscript scraped clean so it can be reused, yet still
                        bearing the ghost of the earlier writing — has become the governing image of
                        Jeong Mijeong&apos;s most recent practice. Her 2025 solo exhibition at Space
                        Thunder was titled〈Palimpsest — Things That Remain While Disappearing〉,
                        and the idea applies equally to her method and her subject.
                      </p>
                      <p>
                        On the canvas: layers are added, partially covering what came before — but
                        not erasing it. Earlier marks continue to act beneath the surface, affecting
                        tone, affecting texture, affecting the quality of what is seen from above.
                        Nothing is neutral; every present moment in the painting is shaped by
                        everything that preceded it.
                      </p>
                      <p>
                        This is also true of memory. The past is not simply stored and retrieved; it
                        is present in the present, shaping how we see now. The places and people and
                        light of years ago persist in how we read the places and people and light of
                        today. Jeong Mijeong&apos;s paintings make this structure visible:{' '}
                        <strong className="font-bold text-charcoal-deep">
                          the past showing through the present
                        </strong>
                        , faint but indelible, part of every surface we see.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        팔림프세스트 — 다시 쓸 수 있도록 긁어낸 양피지이지만, 이전에 쓴 글의 흔적이
                        여전히 남아 있는 — 는 정미정의 최근 작업을 지배하는 이미지가 되었다. 2025년
                        공간썬더 개인전의 제목은 〈팔림프세스트 — 사라지며 남는 것들〉이었고, 이
                        개념은 그의 방법과 주제 모두에 동등하게 적용된다.
                      </p>
                      <p>
                        캔버스 위에서: 층들이 더해지며 이전 것을 부분적으로 덮는다 — 하지만 지우지
                        않는다. 이전의 자국들은 화면 아래에서 계속 작용하며, 색조에, 질감에, 위에서
                        보이는 것의 질에 영향을 미친다. 중립적인 것은 없다. 회화 안의 모든 현재적
                        순간은 그것에 앞선 모든 것에 의해 빚어진다.
                      </p>
                      <p>
                        기억에 대해서도 마찬가지다. 과거는 단순히 저장되고 인출되는 것이 아니다.
                        현재 안에 현존하며, 지금 우리가 보는 방식을 빚는다. 수년 전의 장소와
                        사람들과 빛은, 오늘의 장소와 사람들과 빛을 우리가 읽는 방식 안에 지속된다.
                        정미정의 회화는 이 구조를 눈에 보이게 만든다:{' '}
                        <strong className="font-bold text-charcoal-deep">
                          현재를 통해 비치는 과거
                        </strong>
                        , 희미하지만 지워지지 않는, 우리가 보는 모든 화면의 일부인.
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
                      From Seoul to London and back, Jeong Mijeong has built a patient, layered
                      practice of painting grounded in the question of how time and memory persist.
                      She joins this campaign in solidarity with fellow artists — so that the next
                      generation might keep adding their own layers.
                    </>
                  ) : (
                    <>
                      서울에서 런던으로, 그리고 다시 서울로. 정미정은 시간과 기억이 어떻게
                      지속되는가라는 물음에 뿌리를 둔, 인내하고 층층이 쌓는 회화 작업을 이어왔다.
                      동료 예술인과의 연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들도
                      자신의 층을 계속 쌓아나갈 수 있도록.
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
                LAYER
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jeong Mijeong</span>
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
                    Jeong Mijeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정미정 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_MIJEONG_PATH}
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
