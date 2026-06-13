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

// 작가 feature는 작가 페이지(/artworks/artist/이동구)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='이동구', name_en='Lee Donggu', 매체=도예.
const LEE_DONGGU_PATH = `/artworks/artist/${encodeURIComponent('이동구')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeDongguArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이동구' ||
    n === 'lee donggu' ||
    n === 'lee dong-gu' ||
    n.replace(/[\s-]+/g, '') === 'leedonggu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이동구 — 흙과 불로 빚는 도예가',
    description:
      '흙과 물레, 가마와 유약으로 빚어 온 도예가 이동구. 서울산업대(현 서울과학기술대) 도예과를 졸업하고 다수의 공예대전 수상 경력을 쌓았으며, ‘이동구 도예공방’을 운영하며 활발한 작품 활동과 소통을 이어가는 현역 도예가. 손과 불의 시간을 담은 이동구의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '흙과 물레, 가마와 유약으로 빚는 도예가 이동구. ‘이동구 도예공방’을 운영하며 손과 불의 시간을 담은 현역 도예가.',
    ogAlt: '이동구 대표 작품',
    twitterTitle: '이동구',
    twitterDescription: '흙과 불로 빚는 시간 — 이동구 도예공방을 운영하는 도예가 이동구',
    keywords:
      '이동구 도예가, 도예, 도자, 물레, 가마, 유약, 공예대전, 이동구 도예공방, 서울과학기술대 도예과, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Donggu — Ceramic Artist Shaping Clay and Fire',
    description:
      'Selected works by Lee Donggu, a ceramic artist who shapes clay on the wheel and brings it through glaze and kiln. He graduated from Seoul National University of Technology (now Seoul National University of Science and Technology), Department of Ceramics, earned numerous craft competition awards, and runs the Lee Donggu Ceramics Studio, continuing active practice and engagement. View and collect his works at SAF Online.',
    ogDescription:
      'Lee Donggu — a working ceramic artist who shapes clay on the wheel and brings it through glaze and kiln, running the Lee Donggu Ceramics Studio.',
    ogAlt: 'Lee Donggu — featured work',
    twitterTitle: 'Lee Donggu',
    twitterDescription:
      'The time of clay and fire — a ceramic artist running the Lee Donggu Ceramics Studio',
    keywords:
      'Lee Donggu ceramic artist, Korean ceramics, pottery, wheel throwing, kiln, glaze, craft competition, Lee Donggu Ceramics Studio',
  },
} as const;

export async function buildLeeDongguMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_DONGGU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이동구');
  const artwork = allArtworks.find((a) => isLeeDongguArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Donggu`
      : `${artwork.title} — 이동구`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_DONGGU_PATH, locale, true),
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

export default async function LeeDongguFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_DONGGU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이동구');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeDongguArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Donggu' : '이동구', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_DONGGU_PATH}#person-lee-donggu`,
    name: isEnglish ? 'Lee Donggu' : '이동구',
    alternateName: isEnglish ? '이동구' : 'Lee Donggu',
    jobTitle: isEnglish ? 'Ceramic Artist' : '도예가',
    description: isEnglish
      ? 'Lee Donggu is a working ceramic artist who shapes clay on the wheel and brings it through glaze and kiln, running the Lee Donggu Ceramics Studio with numerous craft competition awards to his credit.'
      : '이동구는 흙과 물레, 가마와 유약으로 작업하는 현역 도예가로, 다수의 공예대전 수상 경력을 쌓았으며 ‘이동구 도예공방’을 운영하고 있습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Seoul National University of Science and Technology (formerly Seoul National University of Technology), Department of Ceramics'
        : '서울과학기술대학교(전 서울산업대학교) 도예과',
    },
    worksFor: {
      '@type': 'Organization',
      name: isEnglish ? 'Lee Donggu Ceramics Studio' : '이동구 도예공방',
    },
    knowsAbout: isEnglish
      ? ['Ceramics', 'Wheel throwing', 'Glaze and kiln firing']
      : ['도예', '물레 성형', '유약과 가마'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Donggu — SAF Online' : '이동구 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Donggu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이동구 작품들을 소개합니다.',
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
        {/* Hero Section — 흙·물레·가마의 도예 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 물레의 동심원 모티프 — 가운데서 번지는 결 */}
          <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          <div className="absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20" />
          <div className="absolute left-1/2 top-1/2 h-[12rem] w-[12rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          {/* 가마의 불기운 — 하단의 은은한 온기 */}
          <div className="absolute -bottom-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Donggu · Ceramic Artist' : '이동구 · 도예'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Shaped by
                  <br />
                  <span className="text-primary-soft">clay and fire</span>
                </>
              ) : (
                <>
                  흙과 불이
                  <br />
                  <span className="text-primary-soft">빚어내는 형태</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">A form rises between the hand and the wheel.</span>
                  <span className="mt-2 block">
                    Glaze and kiln decide what the clay will finally become.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">손과 물레 사이에서 하나의 형태가 떠오른다.</span>
                  <span className="mt-2 block">유약과 가마가 흙이 끝내 무엇이 될지를 정한다.</span>
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
                    The hand, the wheel —<br />
                    <span className="text-primary-strong">and the patience of fire</span>
                  </>
                ) : (
                  <>
                    손과 물레 —<br />
                    <span className="text-primary-strong">그리고 불의 인내</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Donggu is a working ceramic artist. He graduated from the Department of
                      Ceramics at Seoul National University of Technology — now Seoul National
                      University of Science and Technology — and has built up{' '}
                      <strong className="font-bold text-charcoal-deep">
                        numerous craft competition awards
                      </strong>{' '}
                      over the course of his practice. Today he runs the Lee Donggu Ceramics Studio,
                      where he continues to make work and to keep open the conversation between
                      maker and viewer.
                    </p>
                    <p>
                      Ceramics is among the most patient of disciplines. It begins in earth — clay
                      wedged and centred until it will hold a form — and it ends only after the kiln
                      has had its say. Between those two points lies the wheel: the steady rotation
                      against which the hand draws a vessel upward, wall by wall, out of a shapeless
                      mass. Nothing here is instant. The material must be understood before it can
                      be led.
                    </p>
                    <p>
                      Then comes the part the maker cannot fully command. Glaze goes on as a dull,
                      chalky coat and only the heat reveals its true colour and depth; the kiln, at
                      its peak, can lift a surface to brilliance or quietly undo a week of work. To
                      work in clay is to accept this collaboration with{' '}
                      <strong className="font-bold text-charcoal">fire</strong> — to plan
                      meticulously and then to let the kiln finish the sentence.
                    </p>
                    <p>
                      Running a studio of one&apos;s own name adds a further dimension to that
                      practice. A studio is not only a workshop but a place of exchange — where the
                      slow knowledge of throwing, glazing, and firing is shared, and where pieces
                      meet the people who will live with them. Lee Donggu&apos;s engagement is of
                      this kind: not the spotlight of a single exhibition but the steady, daily
                      keeping of a craft.
                    </p>
                    <p>
                      He joins this campaign in that same spirit of steadiness. A working ceramic
                      artist, secure in his own practice, he sets his work down here in solidarity —
                      so that its sale might become a low-interest lifeline for fellow artists
                      facing financial exclusion today.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이동구는 현역 도예가다. 서울산업대학교 — 지금의 서울과학기술대학교 — 도예과를
                      졸업했고, 작업을 이어 오는 동안{' '}
                      <strong className="font-bold text-charcoal-deep">
                        다수의 공예대전 수상 경력
                      </strong>
                      을 쌓았다. 오늘날 그는 ‘이동구 도예공방’을 운영하며, 작품을 빚는 일과 만드는
                      이와 보는 이 사이의 대화를 함께 이어 가고 있다.
                    </p>
                    <p>
                      도예는 가장 인내가 필요한 작업 가운데 하나다. 그것은 흙에서 시작한다 — 형태를
                      품을 수 있을 때까지 반죽되고 중심이 잡힌 흙. 그리고 가마가 제 몫의 말을 마친
                      뒤에야 끝난다. 그 두 지점 사이에 물레가 있다. 한결같이 돌아가는 회전에 손을
                      대어, 형태 없는 덩어리에서 한 겹 한 겹 벽을 끌어 올려 그릇을 세우는 일. 여기엔
                      즉각적인 것이 없다. 재료는 이끌어지기 전에 먼저 이해되어야 한다.
                    </p>
                    <p>
                      그다음에는 만드는 이가 온전히 다스릴 수 없는 영역이 온다. 유약은 칙칙하고 분필
                      같은 막으로 입혀지고, 그 본래의 빛깔과 깊이는 오직 열만이 드러낸다. 가마는
                      절정에서 표면을 찬란함으로 끌어올리기도 하고, 일주일의 작업을 조용히 허물기도
                      한다. 흙을 다룬다는 것은 이{' '}
                      <strong className="font-bold text-charcoal">불</strong>과의 협업을 받아들이는
                      일이다 — 치밀하게 계획하고, 그 문장의 마지막은 가마에게 맡기는 일.
                    </p>
                    <p>
                      자기 이름을 건 공방을 운영한다는 것은 그 작업에 또 하나의 차원을 더한다.
                      공방은 작업실이기만 한 것이 아니라 교류의 자리다 — 물레 성형과 시유, 소성의
                      더딘 지식이 나누어지고, 작품이 그것과 함께 살아갈 사람들을 만나는 곳. 이동구의
                      소통은 그런 종류다. 한 번의 전시가 비추는 조명이 아니라, 한 공예를 날마다 지켜
                      가는 꾸준함.
                    </p>
                    <p>
                      그는 같은 꾸준함의 마음으로 이 캠페인에 함께한다. 자기 작업 안에 단단히 선
                      현역 도예가로서, 그는 연대의 뜻으로 이곳에 작품을 내려놓는다 — 그 판매가 오늘
                      금융 차별을 겪는 동료 예술인에게 저금리의 버팀목이 될 수 있도록.
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
                        {isEnglish ? 'Clay and the wheel' : '흙과 물레'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A form drawn upward from a shapeless mass on the steady rotation of the wheel — nothing instant, the material understood before it is led.'
                          : '물레의 한결같은 회전 위에서 형태 없는 덩어리로부터 끌어 올린 형태. 즉각적인 것은 없고, 재료는 이끌어지기 전에 이해된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Glaze and kiln' : '유약과 가마'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Glaze goes on dull and only the heat reveals its colour and depth — the maker plans meticulously and lets the fire finish the sentence.'
                          : '칙칙하게 입혀진 유약의 빛깔과 깊이는 오직 열만이 드러낸다. 치밀하게 계획하고, 문장의 마지막은 불에게 맡긴다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A studio of one’s own' : '자기 이름의 공방'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The Lee Donggu Ceramics Studio is a place of exchange — the slow knowledge of a craft shared, and pieces meeting those who will live with them.'
                          : '이동구 도예공방은 교류의 자리다. 한 공예의 더딘 지식이 나누어지고, 작품이 그것과 함께 살아갈 사람을 만난다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'At a glance' : '한눈에 보기'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Medium' : '매체'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ceramics — clay, wheel, glaze, kiln.'
                        : '도예 — 흙·물레·유약·가마.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Education' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduated, Dept. of Ceramics, Seoul National University of Technology (now Seoul National University of Science and Technology).'
                        : '서울산업대학교(현 서울과학기술대학교) 도예과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Awards' : '수상'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Numerous craft competition awards.'
                        : '다수의 공예대전 수상 경력.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Studio' : '공방'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Runs the Lee Donggu Ceramics Studio — active practice and engagement.'
                        : '‘이동구 도예공방’ 운영 — 활발한 작품 활동과 소통.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Practice & background' : '작업과 이력'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduated from the Department of Ceramics, Seoul National University of Technology (now Seoul National University of Science and Technology)'
                        : '서울산업대학교(현 서울과학기술대학교) 도예과 졸업'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Numerous craft competition awards to his credit'
                        : '다수의 공예대전 수상 경력'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Runs the Lee Donggu Ceramics Studio, continuing active artistic practice and engagement'
                        : '‘이동구 도예공방’을 운영하며 활발한 작품 활동과 소통을 이어 가는 중'}
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
                  <span className="text-charcoal-deep">on clay, fire, and the studio</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">흙과 불, 그리고 공방에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 흙과 물레 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Clay and the wheel — form drawn from the centre'
                    : '흙과 물레 — 중심에서 끌어 올린 형태'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Before a vessel can be made, the clay has to be brought to centre. Wedged to
                        drive out air and even the moisture, then pressed against the spinning wheel
                        until it runs true, the material is prepared more than it is shaped. A
                        wobble left in the body of the clay will widen into a fault as the walls
                        rise; the patience spent here is invisible in the finished piece, and
                        decisive to it.
                      </p>
                      <p>
                        Only then does the form begin — the hand bracing against the rotation,
                        opening the mass, pulling the wall upward in slow, repeated passes. Each
                        pass is a negotiation between the speed of the wheel, the wetness of the
                        clay, and the steadiness of the hand. Ceramics rewards the maker who has
                        learned to listen to the material rather than to impose on it.
                      </p>
                      <p>
                        This is the discipline at the root of Lee Donggu&apos;s practice. A trained
                        ceramic artist, he works in the long tradition of the wheel, where mastery
                        is measured not in speed but in the quiet authority of a form that stands
                        true.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그릇이 만들어지기 전에, 흙은 먼저 중심에 와야 한다. 공기와 수분을 고르게
                        몰아내도록 반죽되고, 곧게 돌 때까지 돌아가는 물레에 눌려 — 재료는 빚어지기
                        앞서 준비된다. 흙 몸통에 남은 작은 흔들림은 벽이 올라가며 결함으로 벌어진다.
                        여기 들인 인내는 완성된 작품에서는 보이지 않지만, 그 작품을 결정짓는다.
                      </p>
                      <p>
                        그제야 형태가 시작된다 — 회전에 손을 받쳐 덩어리를 열고, 느리고 반복된
                        손길로 벽을 끌어 올린다. 한 번 한 번의 손길은 물레의 속도와 흙의 물기,
                        그리고 손의 한결같음 사이의 협상이다. 도예는 재료에 강요하기보다 재료에 귀
                        기울이는 법을 익힌 이에게 보답한다.
                      </p>
                      <p>
                        이것이 이동구 작업의 뿌리에 있는 규율이다. 정식으로 수련한 도예가로서, 그는
                        물레의 오랜 전통 안에서 작업한다. 그 전통에서 숙련은 속도가 아니라, 곧게 선
                        형태의 조용한 권위로 가늠된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 유약과 가마 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Glaze and kiln — the part the fire decides'
                    : '유약과 가마 — 불이 정하는 몫'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Glaze is the great act of trust in ceramics. Applied as a dull, chalky
                        suspension, it gives almost no sign of what it will become. Its colour, its
                        gloss, the way it pools and breaks over an edge — all of this is locked
                        inside the chemistry of the heat, released only when the kiln reaches
                        temperature. The maker chooses and layers in faith, then waits.
                      </p>
                      <p>
                        The firing itself is the least controllable hour of the whole process. A few
                        degrees, a draft, the placement of a piece on the shelf — small variables
                        can lift a surface to unexpected brilliance or quietly ruin a week of work.
                        Every ceramic artist knows the particular suspense of opening a kiln, and
                        the discipline of accepting what the fire returns.
                      </p>
                      <p>
                        To make in clay, then, is to plan with precision and to surrender the ending
                        — to collaborate with a force that cannot be fully directed. The finished
                        glaze is a record of that collaboration: the maker&apos;s intention and the
                        kiln&apos;s verdict, fused into a single surface.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        유약은 도예에서 가장 큰 신뢰의 행위다. 칙칙하고 분필 같은 현탁액으로
                        입혀지는 그것은, 무엇이 될지 거의 아무런 기미도 내비치지 않는다. 빛깔과
                        광택, 가장자리에서 고이고 갈라지는 방식 — 이 모든 것이 열의 화학 안에 잠겨
                        있다가, 가마가 온도에 이를 때에야 풀려난다. 만드는 이는 믿음 속에서 고르고
                        겹쳐 바르고, 그다음에 기다린다.
                      </p>
                      <p>
                        소성 그 자체는 전 과정에서 가장 통제하기 어려운 시간이다. 몇 도의 차이, 한
                        줄기 바람, 가마 칸에 놓인 작품의 자리 — 작은 변수가 표면을 뜻밖의 찬란함으로
                        들어 올리기도 하고, 일주일의 작업을 조용히 망치기도 한다. 모든 도예가는
                        가마를 여는 그 특유의 긴장을, 그리고 불이 돌려주는 것을 받아들이는 규율을
                        안다.
                      </p>
                      <p>
                        그러니 흙으로 만든다는 것은 정밀하게 계획하고 그 끝맺음을 내어 주는 일이다 —
                        온전히 부릴 수 없는 힘과 협업하는 일. 완성된 유약은 그 협업의 기록이다.
                        만드는 이의 의도와 가마의 판결이, 하나의 표면 위에 녹아든.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 공방이라는 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The studio — craft kept day by day'
                    : '공방이라는 자리 — 날마다 지켜 가는 공예'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        To run a studio under one&apos;s own name is to commit to a craft as an
                        ongoing way of life rather than an occasional event. The Lee Donggu Ceramics
                        Studio is such a place — a working room where clay is thrown, glazed, and
                        fired in a continuous rhythm, and where the slow knowledge of the medium
                        accumulates through repetition.
                      </p>
                      <p>
                        A studio is also a place of exchange. It is where finished pieces meet the
                        people who will use and live with them, and where the conversation between
                        maker and viewer stays open — the engagement that keeps a craft tradition
                        breathing rather than merely preserved. Numerous craft competition awards
                        mark a body of work recognised along the way, but the deeper measure is this
                        steadiness: the daily keeping of the craft.
                      </p>
                      <p>
                        It is from this position of steadiness — a working artist secure in his own
                        practice — that Lee Donggu sets his work down in this campaign, in
                        solidarity with fellow artists who carry the weight of financial exclusion.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        자기 이름을 건 공방을 운영한다는 것은, 공예를 이따금의 사건이 아니라
                        계속되는 삶의 방식으로 받아들이는 일이다. 이동구 도예공방은 그런 자리다 —
                        흙이 성형되고, 시유되고, 소성되는 일이 끊이지 않는 리듬으로 이어지는 작업실,
                        그리고 매체의 더딘 지식이 반복을 통해 쌓이는 곳.
                      </p>
                      <p>
                        공방은 또한 교류의 자리다. 완성된 작품이 그것을 쓰고 함께 살아갈 사람들을
                        만나는 곳이며, 만드는 이와 보는 이 사이의 대화가 열린 채로 이어지는 곳 — 한
                        공예의 전통을 단지 보존하는 것이 아니라 숨 쉬게 하는 소통. 다수의 공예대전
                        수상 경력은 그 과정에서 인정받은 작업을 가리키지만, 더 깊은 척도는 이
                        꾸준함이다. 공예를 날마다 지켜 가는 일.
                      </p>
                      <p>
                        이 꾸준함의 자리에서 — 자기 작업 안에 단단히 선 현역 작가로서 — 이동구는
                        금융 차별의 무게를 짊어진 동료 예술인과의 연대로 이 캠페인에 작품을 내려
                        놓는다.
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
                      From the centred clay on the wheel to the verdict of the kiln, Lee
                      Donggu&apos;s practice follows the patient arc of ceramics — a craft kept day
                      by day in a studio of his own name. He joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity, so that the proceeds of his
                      work might become a low-interest lifeline for artists facing financial
                      exclusion today.
                    </>
                  ) : (
                    <>
                      물레 위 중심 잡힌 흙에서 가마의 판결에 이르기까지, 이동구의 작업은 도예의
                      인내로운 궤적을 따른다 — 자기 이름의 공방에서 날마다 지켜 가는 공예. 그는
                      씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 작품 판매 수익이 오늘 금융 차별을 겪는 예술인에게 저금리의 버팀목이 될 수
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
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Donggu</span>
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
                    Lee Donggu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이동구 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_DONGGU_PATH}
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
