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

// 홍진희 feature는 작가 페이지(/artworks/artist/홍진희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const HONG_JINHUI_PATH = `/artworks/artist/${encodeURIComponent('홍진희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isHongJinhuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '홍진희' ||
    n === 'hong jinhui' ||
    n === 'hong jin-hui' ||
    n === 'hongjinhui' ||
    n.replace(/[\s-]+/g, '') === 'hongjinhui'
  );
};

const PAGE_COPY = {
  ko: {
    title: '홍진희 — 실로 숲을 그리는 회화 작가',
    description:
      '홍진희는 실(thread)이라는 섬유 매체를 회화의 언어로 풀어내 숲의 생명력을 화면에 옮겨온 작가다. 홍익대학교 미술대학을 졸업하고 〈실로 그린 숲〉 연작을 중심으로 16회 이상의 개인전을 열었으며, 국립현대미술관 미술은행·경기도미술관에 작품이 소장되어 있다. 씨앗페 온라인에서 홍진희의 작품을 감상하고 소장하세요.',
    ogDescription:
      '홍진희 — 실로 숲을 그리는 회화 작가. 〈실로 그린 숲〉 연작으로 섬유와 회화의 경계를 탐구. 국립현대미술관 미술은행·경기도미술관 소장. 경기·서울문화재단 선정작가.',
    ogAlt: '홍진희 대표 작품',
    twitterTitle: '홍진희',
    twitterDescription: '한 올의 실로 숲을 그리다 — 회화 작가 홍진희',
    keywords: '홍진희 작가, 실로 그린 숲, 섬유 회화, 한국 현대 회화, 씨앗페 온라인',
  },
  en: {
    title: 'Hong Jinhui — A Painter Who Draws Forests with Thread',
    description:
      'Hong Jinhui is a Korean painter who translates thread — a fiber medium — into the language of painting, rendering the vitality of forests on canvas. A graduate of Hongik University College of Fine Arts, she has held over 16 solo exhibitions centered on the Forest Drawn with Thread series. Her works are held in the MMCA Art Bank and the Gyeonggi Museum of Modern Art. View and collect her works at SAF Online.',
    ogDescription:
      'Hong Jinhui — a painter who draws forests with thread. Exploring the boundary between fiber and painting through the Forest Drawn with Thread series. Collections: MMCA Art Bank, Gyeonggi Museum of Modern Art.',
    ogAlt: 'Hong Jinhui — featured work',
    twitterTitle: 'Hong Jinhui',
    twitterDescription: 'Drawing a forest, one thread at a time — painter Hong Jinhui',
    keywords:
      'Hong Jinhui artist, forest thread painting, Korean contemporary art, fiber painting, SAF Online',
  },
} as const;

export async function buildHongJinhuiMetadata({
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
  const pageUrl = buildLocaleUrl(HONG_JINHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('홍진희');
  const artwork = allArtworks.find((a) => isHongJinhuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Hong Jinhui`
      : `${artwork.title} — 홍진희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(HONG_JINHUI_PATH, locale, true),
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

export default async function HongJinhuiFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(HONG_JINHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('홍진희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isHongJinhuiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Hong Jinhui' : '홍진희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${HONG_JINHUI_PATH}#person-hong-jinhui`,
    name: isEnglish ? 'Hong Jinhui' : '홍진희',
    alternateName: isEnglish ? '홍진희' : 'Hong Jinhui',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Hong Jinhui is a Korean painter who translates thread — a fiber medium — into the language of painting, rendering the vitality of forests on canvas. A graduate of Hongik University College of Fine Arts, she is known for the Forest Drawn with Thread series and has held over 16 solo exhibitions. Her works are held in the MMCA Art Bank and the Gyeonggi Museum of Modern Art.'
      : '홍진희는 실(thread)이라는 섬유 매체를 회화의 언어로 풀어내 숲의 생명력을 화면에 옮겨온 작가입니다. 홍익대학교 미술대학을 졸업하고 〈실로 그린 숲〉 연작으로 잘 알려져 있으며, 16회 이상의 개인전을 열었습니다. 국립현대미술관 미술은행과 경기도미술관에 작품이 소장되어 있습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, College of Fine Arts' : '홍익대학교 미술대학',
    },
    knowsAbout: ['Painting', 'Fiber art', 'Contemporary art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Hong Jinhui — SAF Online' : '홍진희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Hong Jinhui from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 홍진희 작품들을 소개합니다.',
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
        {/* Hero Section — 실과 숲, 선의 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 실의 궤적 — 가는 대각선 선들 */}
          <div
            className="absolute top-0 left-0 w-full h-full opacity-[0.06]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, transparent, transparent 28px, rgba(255,255,255,0.25) 29px)',
            }}
          />
          <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-0 left-0 h-full w-px bg-white/8" />
          <div className="absolute top-0 right-0 h-full w-px bg-white/8" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Hong Jinhui' : '홍진희'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Drawing a forest,
                  <br />
                  <span className="text-primary-soft">one thread at a time</span>
                </>
              ) : (
                <>
                  한 올의 실로
                  <br />
                  <span className="text-primary-soft">숲을 그리다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Thread is not embroidery — it is the painter&apos;s line itself.
                  </span>
                  <span className="mt-2 block">
                    A painter who renders the living forest through the language of fiber.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">실은 자수가 아니라, 화가의 선 그 자체다.</span>
                  <span className="mt-2 block">
                    섬유의 언어로 살아 있는 숲을 그려내는 회화 작가.
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
                    Weaving the forest —<br />
                    <span className="text-primary-strong">thread as the grammar of painting</span>
                  </>
                ) : (
                  <>
                    숲을 엮다 —<br />
                    <span className="text-primary-strong">실을 회화의 문법으로</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Hong Jinhui is a painter who has spent her career unfolding the forest in the
                      language of painting — through thread. A graduate of the College of Fine Arts
                      at Hongik University, she works with thread not as embroidery or craft but as
                      a fundamental painterly element: the line, the mark, the trace that
                      accumulates into image. In her hands, a single thread becomes a branch, a
                      cluster of threads becomes a canopy, and the forest emerges — not depicted but
                      built.
                    </p>
                    <p>
                      Her central body of work, the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Forest Drawn with Thread〉
                      </strong>{' '}
                      series, began in 2011 and has continued across multiple presentations: at KB
                      Kookmin Bank Seocho PB Center (2011), JH Gallery (2012), and Seongbuk Art
                      Creation Center (2015). Each iteration has brought the series into new
                      contexts, each time demonstrating how the logic of thread — its linearity, its
                      texture, its capacity to interlace — translates into the visual language of
                      the forest.
                    </p>
                    <p>
                      Across more than sixteen solo exhibitions — including{' '}
                      <em>Forest of Memory</em> (Gallery Gabi, 2017),{' '}
                      <em>Forest, Circulation and Healing</em> (Beotyi Museum, 2024), and{' '}
                      <em>With the Forest</em> (Gallery Or, Yongin, 2025) — Hong Jinhui has extended
                      the forest motif through seasons and states of mind: grief, consolation,
                      renewal. The forest in her work is never merely landscape; it is a language
                      for what otherwise remains unsaid.
                    </p>
                    <p>
                      Her work has been supported by the Gyeonggi Cultural Foundation (2018, 2019,
                      2021), the Seoul Foundation for Arts and Culture through Seongbuk Art Creation
                      Center (2015), and the Yongin Cultural Foundation (2024). Works are held in
                      the MMCA Art Bank and the Gyeonggi Museum of Modern Art — two of the principal
                      institutional collections for Korean contemporary art.
                    </p>
                    <p>
                      Hong Jinhui joins SAF not as a subject of its cause but as a fellow artist in
                      solidarity — contributing her work so that proceeds may support the mutual-aid
                      loan fund for artists navigating financial exclusion.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      홍진희는 실로 숲을 회화의 언어로 풀어내는 작업을 이어온 회화 작가다.
                      홍익대학교 미술대학을 졸업한 그는 실을 자수나 공예의 맥락이 아니라 회화의
                      근본적인 요소 — 선, 자국, 이미지를 쌓아가는 흔적 — 로서 다룬다. 한 올의 실이
                      나뭇가지가 되고, 실의 집합이 수관이 되면서 숲이 그려지는 것이 아니라 지어진다.
                    </p>
                    <p>
                      핵심 연작인{' '}
                      <strong className="font-bold text-charcoal-deep">〈실로 그린 숲〉</strong>은
                      2011년 KB국민은행 서초PB센터 초대전을 시작으로, 2012년 JH갤러리, 2015년
                      성북예술창작센터 선정작가전으로 이어지며 지속되어 왔다. 각 전시에서 실의 논리
                      — 선형성, 질감, 교차하는 능력 — 가 숲의 시각 언어로 번역되는 방식이 새로운
                      맥락에서 제시되었다.
                    </p>
                    <p>
                      〈기억의 숲〉(갤러리가비, 2017), 〈숲, 순환과 치유〉(벗이미술관, 2024),
                      〈더불어 숲〉(갤러리오르 용인, 2025)을 비롯한 16회 이상의 개인전을 통해,
                      홍진희는 숲의 모티프를 계절과 마음의 결에 따라 확장해왔다 — 슬픔, 위로,
                      새로남으로. 그의 작업에서 숲은 단순한 풍경이 아니라, 달리 표현되지 못했을
                      것들을 위한 언어다.
                    </p>
                    <p>
                      경기문화재단(2018·2019·2021), 서울문화재단 성북예술창작센터(2015),
                      용인문화재단(2024) 등 다년간 공공 지원을 받으며 작업을 이어왔다.
                      국립현대미술관 미술은행과 경기도미술관 — 한국 현대미술의 주요 기관 컬렉션 두
                      곳 — 에 작품이 소장되어 있다.
                    </p>
                    <p>
                      홍진희는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다 — 작품 판매 수익이 금융 차별을 겪는 예술인을 위한 상호부조 대출
                      기금으로 이어지도록.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* 작업을 관통하는 세 가지 언어 */}
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Three signatures of the work' : '작업을 관통하는 세 가지 언어'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Thread as painterly line' : '실이라는 회화적 선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Thread in Hong Jinhui's work is not applied as decoration but used as the fundamental unit of mark-making. Like a brushstroke on canvas, each thread is a decision — its direction, tension, and placement building the image from the inside out."
                          : '홍진희의 실은 장식으로 얹히는 것이 아니라 화면을 만드는 기본 단위로 사용된다. 캔버스 위의 붓질처럼, 한 올 한 올의 실은 하나의 결정이다 — 그 방향, 긴장, 위치가 이미지를 안에서부터 지어 올린다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The forest as emotional language' : '숲이라는 감정의 언어'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Across series titled Memory, Circulation, Healing, Pink, Summer — the forest is always a vehicle for emotional states. It is the space into which feeling is projected and from which consolation returns. The subject is nature; the subject is also human interiority.'
                          : '〈기억〉, 〈순환〉, 〈치유〉, 〈분홍〉, 〈여름〉 — 연작의 제목들이 보여주듯, 숲은 항상 감정 상태를 담는 그릇이다. 감정이 투영되고 위로가 돌아오는 공간. 주제는 자연이고, 주제는 동시에 인간의 내면이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Accumulation as method' : '쌓음이라는 방법론'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The forest is not drawn in one gesture but built through the patient accumulation of thread upon thread. This durational, meditative process is central to the work — the image arrives through sustained attention, in the same way a forest grows through time.'
                          : '숲은 한 번의 몸짓으로 그려지는 것이 아니라 실 위에 실을 쌓아가는 인내로운 축적을 통해 지어진다. 이 지속적이고 명상적인 과정이 작업의 핵심이다 — 이미지는 오랜 주의를 통해 도달하는 것이고, 숲이 시간을 통해 자라는 것과 같은 방식으로.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가의 시간 — timeline */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition: When I Miss the Green, Gallery Topohaus, Seoul.'
                        : '첫 개인전: 초록이 그리울 때, 갤러리토포하우스, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Forest Drawn with Thread〉 series debut, KB Kookmin Bank Seocho PB Center, Seoul. Encouragement Prize, 6th Kyunghyang Art Competition.'
                        : '〈실로 그린 숲〉 연작 시작, KB국민은행 서초PB센터 초대전, 서울. 제6회 경향미술대전 장려상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Forest Drawn with Thread〉, JH Gallery, Seoul. Published Healing Forest Created by Threads (Orange Digit Korea).'
                        : '〈실로 그린 숲〉, JH갤러리 선정작가전, 서울. 저서 《Healing Forest Created by Threads》 출간 (오렌지디지트코리아).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Forest Drawn with Thread〉, Seongbuk Art Creation Center, Seoul. Seoul Foundation for Arts and Culture selected artist.'
                        : '〈실로 그린 숲〉, 성북예술창작센터 갤러리맺음 선정작가전, 서울. 서울문화재단 선정작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Pink Forest〉, Gallery Life, Seoul. Singapore Affordable Art Fair, F1 Pit Building.'
                        : '〈분홍 숲〉, 갤러리라이프 초대전, 서울. 싱가폴 어포더블 아트페어.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Forest of Memory〉, Gallery Gabi, Seoul.'
                        : '〈기억의 숲〉, 갤러리가비 선정작가전, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018–21
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gyeonggi Cultural Foundation selected artist (2018, 2019, 2021). Songjeong Art Culture Foundation support (2021). Donuimun Museum Village artist (2020, 2021). 38th Galleries Art Fair, COEX (2020).'
                        : '경기문화재단 선정작가(2018·2019·2021). 송정미술문화재단 창작지원(2021). 돈의문박물관마을 선정작가(2020·2021). 제38회 화랑미술제 COEX 참가(2020).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Forest, Circulation and Healing〉, Beotyi Museum Gallery, Yongin. Yongin Cultural Foundation selected artist.'
                        : '〈숲, 순환과 치유〉, 벗이미술관 갤러리, 용인. 용인문화재단 선정작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈With the Forest〉, Gallery Or, Yongin. Yongin Special City Cultural Arts selected artist.'
                        : '〈더불어 숲〉, 갤러리오르, 용인. 용인특례시 문화예술공모사업 선정작가.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* 소장처 */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Collections' : '소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MMCA Art Bank (National Museum of Modern and Contemporary Art), Korea'
                        : '국립현대미술관 미술은행'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gyeonggi Museum of Modern Art, Gyeonggi-do'
                        : '경기도미술관, 경기도'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gallery Gabi, Daelim Changgo Gallery, JH Gallery, THE K Gallery, and numerous private collections'
                        : '갤러리가비, 대림창고갤러리, JH갤러리, THE K갤러리, 그 외 개인소장 다수'}
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
                  Two essays —
                  <br />
                  <span className="text-charcoal-deep">on thread, forest, and painting</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">실, 숲, 그리고 회화에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 실로 그린 숲 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈Forest Drawn with Thread〉 — the meeting point of fiber and painting'
                    : '〈실로 그린 숲〉 — 섬유와 회화가 만나는 지점'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of Hong Jinhui&apos;s central series is a precise description of
                        its method: <em>Forest Drawn with Thread</em>. Not a forest embroidered,
                        stitched, or woven — but drawn. The verb is borrowed from painting, and this
                        borrowing is deliberate. Thread, in her practice, is not what it is in craft
                        tradition; it is the painter&apos;s instrument, applied to the surface as
                        one would apply a line.
                      </p>
                      <p>
                        This reframing opens a productive ambiguity. Thread carries the memory of
                        the textile — its weight, its texture, its capacity to interlock — but it
                        performs the function of the brushstroke: it describes, it suggests, it
                        accumulates into image. A forest built from thread is neither painting nor
                        fiber art in the conventional sense; it is something that works at the
                        boundary between them, drawing energy from both.
                      </p>
                      <p>
                        The series premiered in 2011 at KB Kookmin Bank Seocho PB Center and
                        continued through JH Gallery (2012) and Seongbuk Art Creation Center (2015).
                        Each presentation returned to the same question — what does it mean to draw
                        a forest with thread? — and found a different answer. The forest shifts with
                        the season, the light, the mood of the making. It is not a fixed image but a
                        recurring inquiry.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        홍진희의 핵심 연작 제목은 방법론을 정확하게 서술한다: <em>실로 그린 숲</em>.
                        자수로 만든 숲, 짜거나 꿰맨 숲이 아니라 — 그린 숲. 동사는 회화에서 빌려온
                        것이며, 이 차용은 의도적이다. 그의 실천에서 실은 공예 전통에서와 같은 것이
                        아니다 — 그것은 화가의 도구로, 선을 그리듯 표면에 적용된다.
                      </p>
                      <p>
                        이 재정의는 생산적인 양의성을 열어놓는다. 실은 섬유의 기억을 담고 있다 —
                        무게, 질감, 엮이는 능력. 하지만 붓질의 기능을 수행한다: 묘사하고, 암시하고,
                        이미지로 쌓인다. 실로 지어진 숲은 관습적 의미에서 회화도 섬유 예술도 아니다
                        — 둘 사이의 경계에서 작동하면서 양쪽에서 에너지를 끌어오는 무언가다.
                      </p>
                      <p>
                        연작은 2011년 KB국민은행 서초PB센터에서 첫 선을 보였고, JH갤러리(2012),
                        성북예술창작센터(2015)로 이어졌다. 각 전시는 같은 질문으로 돌아왔다 — 실로
                        숲을 그린다는 것은 무슨 의미인가? — 그리고 매번 다른 답을 찾았다. 숲은 계절,
                        빛, 만드는 과정의 결에 따라 이동한다. 고정된 이미지가 아니라 반복되는
                        탐구다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 실과 회화 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Between thread and painting — a practice of sustained attention'
                    : '실과 회화 사이 — 지속적 주의의 실천'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Hong Jinhui&apos;s practice is distinguished by duration. To build a forest
                        from thread is to engage in a process of patient, repetitive attention —
                        placing one thread, then another, then another, until the image emerges from
                        the accumulation. This is not fast work. It asks for the kind of sustained
                        concentration that allows the maker to notice things about the material that
                        hurried work would miss.
                      </p>
                      <p>
                        The process is meditative in a specific sense: not passive or emptying, but
                        actively attentive. Each thread placed is a question about the next: where
                        does it go, how does it lie, what does it change in what was there before?
                        The forest is built incrementally, the way actual forests grow — not in one
                        act of creation but through the quiet accumulation of time and material.
                      </p>
                      <p>
                        This attentiveness to material and process is reflected in the themes that
                        run through the series: healing, memory, circulation, togetherness. These
                        are not concepts imposed on the work from outside; they arise from within
                        the making. An artwork entitled <em>Forest, Circulation and Healing</em> or{' '}
                        <em>With the Forest</em> is already describing what the process of making it
                        felt like — the movement through the forest, the companionship of the trees.
                        Hong Jinhui joins SAF in this same spirit of attentive solidarity:
                        contributing her work so that the field she loves might remain open to those
                        who come after.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        홍진희의 작업은 지속 시간으로 특징지어진다. 실로 숲을 짓는다는 것은 인내롭고
                        반복적인 주의의 과정에 참여하는 것이다 — 한 올, 또 한 올, 또 한 올을
                        놓으면서 이미지가 쌓임에서 나타날 때까지. 빠른 작업이 아니다. 급한
                        작업이라면 놓쳤을 소재에 관한 것들을 알아챌 수 있게 해주는 오랜 집중이
                        필요하다.
                      </p>
                      <p>
                        이 과정은 특정한 의미에서 명상적이다 — 수동적이거나 비우는 것이 아니라,
                        능동적으로 주의를 기울이는. 놓인 각각의 실은 다음에 관한 질문이다: 어디로
                        가는가, 어떻게 눕는가, 앞에 있던 것에서 무엇을 바꾸는가. 숲은 점진적으로
                        지어지는데, 실제 숲이 자라는 방식처럼 — 한 번의 창조 행위가 아니라 시간과
                        재료의 조용한 축적을 통해.
                      </p>
                      <p>
                        소재와 과정에 대한 이 주의 깊음은 연작을 관통하는 주제들에 반영된다: 치유,
                        기억, 순환, 더불어 함께. 이것들은 외부에서 작업에 부과된 개념이 아니라
                        만드는 과정 안에서 생겨난다. 〈숲, 순환과 치유〉 또는 〈더불어 숲〉이라는
                        제목의 작품은 이미 그것을 만드는 과정이 어떤 것이었는지를 묘사하고 있다 —
                        숲을 통한 움직임, 나무들과의 동행. 홍진희는 이 같은 주의 깊은 연대의
                        마음으로 씨앗페에 함께한다: 자신이 사랑하는 현장이 다음 세대에게도 열려
                        있도록 작품을 내놓으면서.
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
                      Thread is perhaps the most patient of materials — it holds whatever shape it
                      is given, accumulates quietly, and builds, over time, something that exceeds
                      its individual parts. In Hong Jinhui&apos;s work, this patience becomes a
                      method, and the forest that emerges from it becomes a language for everything
                      that grows quietly, without announcement, into something larger than itself.
                    </>
                  ) : (
                    <>
                      실은 아마도 가장 인내심 있는 소재일 것이다 — 주어진 어떤 형태든 붙들고, 조용히
                      쌓이며, 시간이 지나면서 개별 부분의 합을 넘어서는 무언가를 짓는다. 홍진희의
                      작업에서 이 인내는 방법론이 되고, 거기서 나타나는 숲은 선언 없이 조용히
                      자신보다 더 큰 무언가로 자라나는 모든 것을 위한 언어가 된다.
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
                FOREST
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Hong Jinhui</span>
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
                    Hong Jinhui joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    홍진희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={HONG_JINHUI_PATH}
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
