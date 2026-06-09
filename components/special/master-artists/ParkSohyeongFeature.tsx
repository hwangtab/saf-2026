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

// 거장/큐레이션 작가 feature는 작가 페이지(/artworks/artist/박소형)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_SOHYEONG_PATH = `/artworks/artist/${encodeURIComponent('박소형')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isParkSohyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '박소형' ||
    n === 'park sohyeong' ||
    n === 'sohyoung park' ||
    n.replace(/[\s-]+/g, '') === 'parksohyeong' ||
    n.replace(/[\s-]+/g, '') === 'sohyoungpark'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박소형 — 버섯포자와 AI를 넘나드는 생태예술가',
    description:
      '서울·보스턴·뉴욕에서 활동하는 조형예술가 박소형. 조각·설치·비디오·AI를 넘나들며 식물과 버섯포자, 기후위기, 과거의 파편과 미래의 조각을 다루는 생태예술. 보스턴대학교 조형예술 석사·뉴욕 스쿨오브비주얼아트 학사. 박소형의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '서울·보스턴·뉴욕을 잇는 조형예술가 박소형. 조각·설치·비디오·AI로 식물·버섯포자와 기후위기를 다루는 생태예술.',
    ogAlt: '박소형 대표 작품',
    twitterTitle: '박소형',
    twitterDescription: '과거의 파편과 미래의 조각 — 버섯포자와 AI를 넘나드는 생태예술가 박소형',
    keywords:
      '박소형 작가, 조형예술, 설치미술, 비디오 아트, AI 미디어아트, 생태예술, 기후위기, 씨앗페 온라인',
  },
  en: {
    title: 'Park Sohyeong — Ecological Artist Between Mushroom Spores and AI',
    description:
      'Selected works by Park Sohyeong, a multidisciplinary artist based in Seoul, Boston, and New York. Across sculpture, installation, video, and AI, she works in an ecological art that moves between plants, mushroom spores, the climate crisis, and the fragments of the past and shards of the future. MFA Sculpture from Boston University, BFA from the School of Visual Arts. View and collect her works at SAF Online.',
    ogDescription:
      'Park Sohyeong — a multidisciplinary artist linking Seoul, Boston, and New York. Ecological art across sculpture, installation, video, and AI, working with plants, mushroom spores, and the climate crisis.',
    ogAlt: 'Park Sohyeong — featured work',
    twitterTitle: 'Park Sohyeong',
    twitterDescription:
      'Fragments of the past and shards of the future — an ecological artist between mushroom spores and AI',
    keywords:
      'Park Sohyeong artist, sculpture, installation art, video art, AI media art, ecological art, climate crisis, SAF Online',
  },
} as const;

export async function buildParkSohyeongMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_SOHYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박소형');
  const artwork = allArtworks.find((a) => isParkSohyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Sohyeong`
      : `${artwork.title} — 박소형`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_SOHYEONG_PATH, locale, true),
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

export default async function ParkSohyeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_SOHYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박소형');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkSohyeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Park Sohyeong' : '박소형', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_SOHYEONG_PATH}#person-park-sohyeong`,
    name: isEnglish ? 'Park Sohyeong' : '박소형',
    alternateName: isEnglish ? '박소형' : 'Park Sohyeong',
    jobTitle: isEnglish ? 'Artist' : '조형예술가',
    description: isEnglish
      ? 'Park Sohyeong is a multidisciplinary artist active in Seoul, Boston, and New York, working across sculpture, installation, and video — including AI-based media work and ecological art that moves between plants and mushroom spores.'
      : '박소형은 서울·보스턴·뉴욕에서 활동하는 조형예술가로, 조각·설치미술·비디오 아트를 넘나들며 AI를 결합한 미디어 작업과 식물·버섯포자를 다루는 생태예술 작업을 이어가고 있습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Boston University, MFA Sculpture'
          : '보스턴대학교 조형예술 석사 (BU MFA Sculpture)',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'School of Visual Arts, BFA'
          : '뉴욕 스쿨오브비주얼아트 순수예술 학사 (SVA BFA)',
      },
    ],
    knowsAbout: [
      'Sculpture',
      'Installation art',
      'Video art',
      'AI media art',
      'Ecological art',
      'Climate crisis',
    ],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Sohyeong — SAF Online' : '박소형 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Sohyeong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박소형 작품들을 소개합니다.',
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

          {/* Spore-drift verticals — 버섯포자·지층 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish
                  ? 'Park Sohyeong · Seoul · Boston · New York'
                  : '박소형 · 서울·보스턴·뉴욕'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Fragments of the past,
                  <br />
                  <span className="text-primary-soft">shards of the future</span>
                </>
              ) : (
                <>
                  과거의 파편과
                  <br />
                  <span className="text-primary-soft">미래의 조각</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Sculpture, installation, video, and AI — an ecology of forms.
                  </span>
                  <span className="mt-2 block">
                    Plants and mushroom spores, drifting between the climate crisis and tomorrow.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">조각·설치·비디오·AI를 넘나드는 형태의 생태학.</span>
                  <span className="mt-2 block">
                    식물과 버섯포자가 기후위기와 내일 사이를 떠돈다.
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
                    Between spore and circuit —<br />
                    <span className="text-primary-strong">an ecology of forms</span>
                  </>
                ) : (
                  <>
                    포자와 회로 사이 —<br />
                    <span className="text-primary-strong">형태의 생태학</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Sohyeong is a multidisciplinary artist who works across Seoul, Boston,
                      and New York. She earned her MFA in Sculpture from Boston University (2023)
                      and her BFA in Fine Arts from the School of Visual Arts in New York (2021) — a
                      trajectory that has carried her practice across three cities and several
                      disciplines at once.
                    </p>
                    <p>
                      She moves freely between sculpture, installation, and video, and increasingly
                      between media and ecology. AI-driven media work sits alongside an ecological
                      art rooted in living material — plants and{' '}
                      <strong className="font-bold text-charcoal">mushroom spores</strong> — so that
                      the boundary between the synthetic and the organic becomes the very subject of
                      the work.
                    </p>
                    <p>
                      Her practice is held within several communities of artists. She is a member of
                      the New England Sculpture Association (NESA), of the Boston climate-crisis
                      artist group I3C (Inspiring Climate Change), and of Green Recipe Lab, a group
                      of Korean women artists. These affiliations locate her work within a wider
                      conversation about{' '}
                      <strong className="font-bold text-charcoal-deep">
                        ecology, climate, and collective practice
                      </strong>
                      .
                    </p>
                    <p>
                      In 2025 she held the invited solo exhibition 〈Recording the Day When
                      Fragments of the Past and Shards of the Future Pass By〉 at Gallery Cheongpung
                      in Gangneung — a title that distils her central preoccupation: how a form can
                      hold both what has decayed and what has not yet arrived. The same year her
                      work appeared in group exhibitions including 〈Future Yarning〉 (Piano Craft
                      Gallery, Boston), 〈Boundary and Beyond〉 (Arts Collaborative Medford), and
                      〈Urban Resistance〉 (Arise Artspace, Busan).
                    </p>
                    <p>
                      Earlier exhibitions trace the same arc across Boston and beyond:{' '}
                      <strong className="font-bold text-charcoal-deep">2024</strong>&apos;s
                      〈Changing tides〉 (Hopkinton Center for the Art) and the 〈Digital Soup
                      residency〉 (Fountain Street art, Boston), and, in 2022, 〈What&apos;s Next:
                      Perspectives, Micro to Macro〉 (Emerson College Media Art Gallery, Boston).
                      Across them, the work keeps asking how the smallest living thing — a spore, a
                      seed — carries the scale of a planet.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박소형은 서울·보스턴·뉴욕에서 활동하는 조형예술가다. 보스턴대학교에서 조형예술
                      석사(BU MFA Sculpture, 2023)를, 뉴욕 스쿨오브비주얼아트에서 순수예술 학사(SVA
                      BFA, 2021)를 마쳤다 — 세 도시와 여러 매체를 동시에 가로지르는 궤적이다.
                    </p>
                    <p>
                      그는 조각·설치미술·비디오 아트를 자유롭게 넘나들며, 점차 미디어와 생태 사이를
                      오간다. AI를 결합한 미디어 작업이{' '}
                      <strong className="font-bold text-charcoal">식물·버섯포자</strong> 같은 살아
                      있는 재료에 뿌리내린 생태예술과 나란히 놓여, 인공과 유기의 경계 그 자체가
                      작업의 주제가 된다.
                    </p>
                    <p>
                      그의 작업은 여러 예술가 공동체 안에 놓여 있다. 그는 뉴잉글랜드 스컬프처
                      어소시에이션(NESA), 보스턴 기후위기 아티스트 그룹{' '}
                      <strong className="font-bold text-charcoal-deep">
                        I3C(Inspiring Climate Change)
                      </strong>
                      , 한국여성 아티스트 그룹 그린 레시피 랩의 멤버다. 이 소속들은 그의 작업을
                      생태와 기후, 그리고 공동의 실천에 관한 더 넓은 대화 속에 자리매김한다.
                    </p>
                    <p>
                      2025년에는 강릉 갤러리 청풍에서 초대 개인전 ‘과거의 파편과 미래의 조각이 스쳐
                      지나가는 그날을 기록하다’를 열었다. 이 제목은 그의 핵심 관심을 압축한다 —
                      하나의 형태가 어떻게 이미 스러진 것과 아직 오지 않은 것을 동시에 품을 수
                      있는가. 같은 해 그의 작업은 〈Future Yarning〉(Piano Craft Gallery, 보스턴),
                      〈Boundary and Beyond〉(Arts Collaborative Medford), 〈Urban
                      Resistance〉(Arise Artspace, 부산) 등의 그룹전에 소개됐다.
                    </p>
                    <p>
                      이전 전시들도 보스턴 안팎에서 같은 궤적을 그린다:{' '}
                      <strong className="font-bold text-charcoal-deep">2024년</strong> 〈Changing
                      tides〉(Hopkinton Center for the Art)와 〈Digital Soup residency〉(Fountain
                      Street art, 보스턴), 그리고 2022년 〈What&apos;s Next: Perspectives, Micro to
                      Macro〉(Emerson College Media Art Gallery, 보스턴). 이 전시들을 가로질러,
                      작업은 가장 작은 생명 — 포자 하나, 씨앗 하나 — 이 어떻게 행성의 규모를
                      짊어지는지를 계속 묻는다.
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
                        {isEnglish ? 'Spore & ecology' : '버섯포자와 생태'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Plants and mushroom spores as living material — an ecological art where the smallest organism holds a planetary scale.'
                          : '식물과 버섯포자를 살아 있는 재료로 — 가장 작은 생명이 행성의 규모를 품는 생태예술.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'AI & media' : 'AI와 미디어'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'AI-driven media work set beside organic material, so the line between synthetic and living becomes the subject itself.'
                          : '유기적 재료 곁에 놓인 AI 미디어 작업 — 인공과 생명 사이의 경계가 곧 주제가 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Past fragment, future shard' : '과거의 파편, 미래의 조각'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A form that holds both what has decayed and what has not yet arrived — sculpture as a record of overlapping time.'
                          : '이미 스러진 것과 아직 오지 않은 것을 함께 품는 형태 — 겹친 시간을 기록하는 조각.'}
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
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Earns a BFA in Fine Arts from the School of Visual Arts, New York (SVA BFA).'
                        : '뉴욕 스쿨오브비주얼아트 순수예술 학사 졸업(SVA BFA).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈What’s Next: Perspectives, Micro to Macro〉, Emerson College Media Art Gallery, Boston.'
                        : '그룹전 〈What’s Next: Perspectives, Micro to Macro〉, Emerson College Media Art Gallery, 보스턴.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Earns an MFA in Sculpture from Boston University (BU MFA Sculpture).'
                        : '보스턴대학교 조형예술 석사 졸업(BU MFA Sculpture).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Changing tides〉 (Hopkinton Center for the Art); 〈Digital Soup residency〉 (Fountain Street art, Boston).'
                        : '그룹전 〈Changing tides〉(Hopkinton Center for the Art); 〈Digital Soup residency〉(Fountain Street art, 보스턴).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited solo exhibition 〈Recording the Day When Fragments of the Past and Shards of the Future Pass By〉, Gallery Cheongpung, Gangneung.'
                        : '초대 개인전 ‘과거의 파편과 미래의 조각이 스쳐 지나가는 그날을 기록하다’, 갤러리 청풍, 강릉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions 〈Future Yarning〉 (Piano Craft Gallery, Boston), 〈Boundary and Beyond〉 (Arts Collaborative Medford), 〈Urban Resistance〉 (Arise Artspace, Busan).'
                        : '그룹전 〈Future Yarning〉(Piano Craft Gallery, 보스턴), 〈Boundary and Beyond〉(Arts Collaborative Medford), 〈Urban Resistance〉(Arise Artspace, 부산).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & affiliations' : '주요 전시 및 활동'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo exhibition (invited): 〈Recording the Day When Fragments of the Past
                          and Shards of the Future Pass By〉, Gallery Cheongpung, Gangneung (2025)
                        </>
                      ) : (
                        <>
                          초대 개인전: ‘과거의 파편과 미래의 조각이 스쳐 지나가는 그날을 기록하다’,
                          갤러리 청풍, 강릉 (2025)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibitions (2025): 〈Future Yarning〉 (Piano Craft Gallery,
                          Boston), 〈Boundary and Beyond〉 (Arts Collaborative Medford), 〈Urban
                          Resistance〉 (Arise Artspace, Busan)
                        </>
                      ) : (
                        <>
                          그룹전 (2025): 〈Future Yarning〉(Piano Craft Gallery, 보스턴), 〈Boundary
                          and Beyond〉(Arts Collaborative Medford), 〈Urban Resistance〉(Arise
                          Artspace, 부산)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibitions (2024): 〈Changing tides〉 (Hopkinton Center for the
                          Art), 〈Digital Soup residency〉 (Fountain Street art, Boston)
                        </>
                      ) : (
                        <>
                          그룹전 (2024): 〈Changing tides〉(Hopkinton Center for the Art), 〈Digital
                          Soup residency〉(Fountain Street art, 보스턴)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Education: MFA Sculpture, Boston University (2023); BFA, School of Visual Arts, New York (2021)'
                        : '학력: 보스턴대학교 조형예술 석사(BU MFA Sculpture, 2023); 뉴욕 스쿨오브비주얼아트 순수예술 학사(SVA BFA, 2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Affiliations: New England Sculpture Association (NESA); I3C (Inspiring Climate Change), Boston; Green Recipe Lab (Korean women artists)'
                        : '활동: 뉴잉글랜드 스컬프처 어소시에이션(NESA); 보스턴 기후위기 아티스트 그룹 I3C(Inspiring Climate Change); 한국여성 아티스트 그룹 그린 레시피 랩'}
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
                  <span className="text-charcoal-deep">on the work and its ecology</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 생태에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 세 도시, 여러 매체 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Three cities, many media — a practice in motion'
                    : '세 도시, 여러 매체 — 움직이는 작업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Sohyeong&apos;s practice has never settled into a single medium or a
                        single city. After a BFA at the School of Visual Arts in New York (2021) and
                        an MFA in Sculpture at Boston University (2023), she has continued to work
                        across Seoul, Boston, and New York — three art ecologies with different
                        materials, audiences, and weather.
                      </p>
                      <p>
                        Sculpture is her base, but installation and video pull the work outward into
                        space and time, and AI-based media work pulls it toward the screen. Rather
                        than treating these as separate practices, she lets them inform one another:
                        a sculpture can become the set for a video; a video can become the
                        documentation of an installation that no longer exists. The result is a
                        practice that is less a fixed object than an ongoing process.
                      </p>
                      <p>
                        That mobility is also a method. Moving between cities and disciplines, she
                        keeps the work attentive to context — to what a given place, material, or
                        technology makes newly visible.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박소형의 작업은 한 매체나 한 도시에 정착한 적이 없다. 뉴욕
                        스쿨오브비주얼아트 학사(2021)와 보스턴대학교 조형예술 석사(2023)를 거친 뒤,
                        그는 서울·보스턴·뉴욕을 오가며 작업을 이어왔다 — 재료도, 관객도, 날씨도 다른
                        세 개의 미술 생태계다.
                      </p>
                      <p>
                        조각이 기반이지만, 설치와 비디오는 작업을 공간과 시간으로 끌어내고, AI를
                        결합한 미디어 작업은 작업을 화면 쪽으로 끌어당긴다. 그는 이들을 분리된
                        작업으로 다루지 않고 서로 스미게 둔다: 조각은 비디오의 무대가 되고, 비디오는
                        이미 사라진 설치의 기록이 된다. 그 결과는 고정된 사물이라기보다 이어지는
                        과정에 가깝다.
                      </p>
                      <p>
                        이 이동성은 동시에 하나의 방법이다. 도시와 매체 사이를 오가며, 그는 작업이
                        맥락에 민감하도록 — 특정 장소·재료·기술이 새롭게 드러내는 것에 깨어 있도록 —
                        유지한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 버섯포자, 식물, 생태 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Spores and the climate — an ecological art'
                    : '포자와 기후 — 생태예술'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        At the centre of the work is living material. Plants and{' '}
                        <strong className="font-bold text-charcoal-deep">mushroom spores</strong>{' '}
                        recur not as decoration but as collaborators — organisms with their own
                        time, growth, and decay. Working with spores means working with something
                        that changes after it leaves the artist&apos;s hands; the sculpture is never
                        quite finished.
                      </p>
                      <p>
                        This ecological attention is also a political one. Park is a member of I3C
                        (Inspiring Climate Change), a Boston artist group responding to the climate
                        crisis, and of Green Recipe Lab, a group of Korean women artists. Her
                        exhibitions — 〈Changing tides〉, 〈Future Yarning〉, the 〈Digital Soup
                        residency〉 — return again and again to questions of environment, scale, and
                        what it means to make art on a warming planet.
                      </p>
                      <p>
                        The smallest organism, in her work, carries the largest scale: a single
                        spore stands in for an ecosystem, and an ecosystem for a planet under
                        pressure.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        작업의 중심에는 살아 있는 재료가 있다. 식물과{' '}
                        <strong className="font-bold text-charcoal-deep">버섯포자</strong>는 장식이
                        아니라 협력자로 거듭 등장한다 — 자신만의 시간과 성장과 소멸을 가진 생명이다.
                        포자와 작업한다는 것은 작가의 손을 떠난 뒤에도 변하는 무언가와 작업한다는 뜻
                        이다. 그렇게 조각은 결코 완전히 끝나지 않는다.
                      </p>
                      <p>
                        이 생태적 관심은 동시에 정치적이다. 박소형은 보스턴의 기후위기 대응 아티스트
                        그룹 I3C(Inspiring Climate Change)의 멤버이자, 한국여성 아티스트 그룹 그린
                        레시피 랩의 멤버다. 〈Changing tides〉, 〈Future Yarning〉, 〈Digital Soup
                        residency〉로 이어진 그의 전시들은 환경과 규모, 그리고 뜨거워지는 행성
                        위에서 예술을 만든다는 것의 의미로 거듭 돌아온다.
                      </p>
                      <p>
                        그의 작업에서 가장 작은 생명은 가장 큰 규모를 짊어진다: 포자 하나가
                        생태계를, 생태계가 압박받는 행성 하나를 대신한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 과거의 파편과 미래의 조각 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Fragments and shards — the 2025 solo exhibition'
                    : '파편과 조각 — 2025년 개인전'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2025, Park Sohyeong held an invited solo exhibition at Gallery Cheongpung
                        in Gangneung, under the title 〈Recording the Day When Fragments of the Past
                        and Shards of the Future Pass By〉. The title is itself a thesis: a form
                        that can register both what has already broken away and what has not yet
                        taken shape.
                      </p>
                      <p>
                        For an artist who works with spores and AI in the same breath, the title
                        opens a reading. The spore can read as a fragment of the past — a remnant, a
                        survival, a carrier of deep biological time. The AI-generated image can read
                        as a shard of the future — provisional, synthetic, arriving before we are
                        ready for it. To hold both in a single work might be to make time itself the
                        material.
                      </p>
                      <p>
                        Across her shows — from Boston to Busan, from Emerson College to Gallery
                        Cheongpung — the work keeps recording that passing day: the moment when the
                        decayed and the not-yet-arrived brush past each other, and a form is left to
                        hold the trace.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2025년, 박소형은 강릉 갤러리 청풍에서 ‘과거의 파편과 미래의 조각이 스쳐
                        지나가는 그날을 기록하다’라는 제목으로 초대 개인전을 열었다. 제목 자체가
                        하나의 명제다: 이미 떨어져 나간 것과 아직 형태를 갖추지 못한 것을 함께
                        기록할 수 있는 형태.
                      </p>
                      <p>
                        포자와 AI를 한 호흡에 다루는 작가에게 이 제목은 하나의 읽기를 열어 둔다.
                        포자는 과거의 파편처럼 — 잔존하고, 살아남고, 깊은 생물학적 시간을 실어
                        나른다. AI가 생성한 이미지는 미래의 조각처럼 — 잠정적이고, 인공적이며,
                        우리가 준비되기 전에 먼저 도착한다. 이 둘을 한 작업 안에 품는 일은 시간 그
                        자체를 재료로 삼는 시도로 읽힌다.
                      </p>
                      <p>
                        보스턴에서 부산까지, 에머슨 칼리지에서 갤러리 청풍까지 — 그의 전시들을
                        가로질러 작업은 그 스쳐 가는 날을 계속 기록한다: 스러진 것과 아직 오지 않은
                        것이 서로를 스치는 순간, 그리고 그 흔적을 품도록 남겨진 하나의 형태.
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
                      From the studios of New York and Boston to galleries in Gangneung and Busan,
                      Park Sohyeong&apos;s work pursues a single question: how can a form hold
                      living time — the spore that decays, the image that has not yet arrived? She
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that the next generation of artists might work without the
                      financial weight so many carry today.
                    </>
                  ) : (
                    <>
                      뉴욕과 보스턴의 작업실에서 강릉과 부산의 갤러리까지, 박소형의 작업은 하나의
                      물음을 추구한다: 어떻게 하나의 형태가 살아 있는 시간을 — 스러지는 포자와 아직
                      오지 않은 이미지를 — 품을 수 있는가. 그는 씨앗페에 이 캠페인의 대상으로서가
                      아니라, 동료 예술인과의 연대자로서 함께한다 — 다음 세대의 예술인들이 오늘 많은
                      이가 짊어진 금융의 무게 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Park Sohyeong</span>
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
                    Park Sohyeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박소형 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_SOHYEONG_PATH}
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
