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

// 거장/큐레이션 작가 feature는 작가 페이지(/artworks/artist/예미킴)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const YEMIKIM_PATH = `/artworks/artist/${encodeURIComponent('예미킴')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isYemikimArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === '예미킴' || n === 'yemikim' || n.replace(/[\s-]+/g, '') === 'yemikim';
};

const PAGE_COPY = {
  ko: {
    title: '예미킴 — 공학자의 시선으로 재구성하는 시각예술',
    description:
      'KAIST에서 건설환경공학과 산업공학을 전공한 뒤 공학자의 시선으로 시각예술을 재구성하는 작가 예미킴. 15회의 개인전과 70여 회의 기획 단체전, 2024년 서울 청년비엔날레 미술 평론가상 수상. 빛의 미디어아트 〈피어나다〉의 작가 예미킴의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '공학자의 시선으로 시각예술을 재구성하는 작가 예미킴. 정밀한 구조 위에서 피어나는 이미지 — 빛의 미디어아트 〈피어나다〉.',
    ogAlt: '예미킴 대표 작품',
    twitterTitle: '예미킴',
    twitterDescription: '공학자의 시선으로 재구성하는 시각예술 — 예미킴',
    keywords:
      '예미킴, 예미킴 작가, KAIST 작가, 미디어아트, 피어나다, 빛의벙커, 공학과 예술, 씨앗페 온라인',
  },
  en: {
    title: "Yemikim — Reconstructing Visual Art Through an Engineer's Eye",
    description:
      'Selected works by Yemikim, an artist who reconstructs visual art through the perspective of an engineer. After studying Civil & Environmental Engineering and Industrial Engineering at KAIST, she has held 15 solo exhibitions and participated in over 70 curated group exhibitions, receiving the Art Critic Award at the 2024 Seoul Youth Biennale. View and collect her works at SAF Online.',
    ogDescription:
      "Yemikim — reconstructing visual art through an engineer's eye. Images that bloom upon precise structure, including the light media-art work 〈Bloom〉.",
    ogAlt: 'Yemikim — featured work',
    twitterTitle: 'Yemikim',
    twitterDescription: "Reconstructing visual art through an engineer's eye — Yemikim",
    keywords:
      'Yemikim artist, KAIST artist, media art, light art, engineering and art, Korean contemporary art',
  },
} as const;

export async function buildYemikimMetadata({
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
  const pageUrl = buildLocaleUrl(YEMIKIM_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('예미킴');
  const artwork = allArtworks.find((a) => isYemikimArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Yemikim`
      : `${artwork.title} — 예미킴`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(YEMIKIM_PATH, locale, true),
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

export default async function YemikimFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(YEMIKIM_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('예미킴');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isYemikimArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Yemikim' : '예미킴', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${YEMIKIM_PATH}#person-yemikim`,
    name: isEnglish ? 'Yemikim' : '예미킴',
    alternateName: isEnglish ? '예미킴' : 'Yemikim',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Yemikim is an artist who reconstructs visual art through the perspective of an engineer. After studying Civil & Environmental Engineering and Industrial Engineering at KAIST, she has held 15 solo exhibitions and participated in over 70 curated group exhibitions.'
      : '예미킴은 공학자의 시선으로 시각예술을 재구성하는 작가입니다. KAIST에서 건설환경공학과 산업공학을 전공한 뒤 15회의 개인전과 70여 회의 기획 단체전에 참여했습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'KAIST (Civil & Environmental Engineering, Industrial Engineering)'
        : 'KAIST 건설환경공학·산업공학',
    },
    knowsAbout: ['Media art', 'Civil & environmental engineering', 'Industrial engineering'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Yemikim — SAF Online' : '예미킴 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Yemikim from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 예미킴 작품을 소개합니다.',
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

          {/* Structural grid lines — 공학적 격자 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Yemikim · Mid-career' : '예미킴 · 중견 작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Precise structure,
                  <br />
                  <span className="text-primary-soft">an image that blooms</span>
                </>
              ) : (
                <>
                  정밀한 구조 위에서
                  <br />
                  <span className="text-primary-soft">이미지가 피어난다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">An engineer&apos;s eye, turned toward visual art.</span>
                  <span className="mt-2 block">
                    From the lecture halls of KAIST to the light of media art.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">공학자의 시선이 시각예술을 향할 때.</span>
                  <span className="mt-2 block">KAIST의 강의실에서 빛의 미디어아트까지.</span>
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
                    The engineer&apos;s eye —<br />
                    <span className="text-primary-strong">structure that becomes image</span>
                  </>
                ) : (
                  <>
                    공학자의 시선 —<br />
                    <span className="text-primary-strong">구조가 이미지가 되는 자리</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Yemikim is an artist who reconstructs visual art through the perspective of an
                      engineer. She studied Civil &amp; Environmental Engineering and Industrial
                      Engineering at KAIST — disciplines built on measurement, system, and the logic
                      of structure — before turning that trained eye toward the making of images.
                    </p>
                    <p>
                      Across her practice she has held{' '}
                      <strong className="font-bold text-charcoal-deep">15 solo exhibitions</strong>{' '}
                      and participated in{' '}
                      <strong className="font-bold text-charcoal-deep">
                        more than 70 curated group exhibitions
                      </strong>
                      , a body of work sustained over years of steady exhibition. In 2024 she
                      received the Art Critic Award at the Seoul Youth Biennale.
                    </p>
                    <p>
                      Her engineer&apos;s sensibility extends into light and media. In 2023 she
                      presented 〈Bloom〉 at the Bunker de Lumières media art exhibition in Jeju — a
                      work in which precise structure gives way to an image that opens and flowers.
                      In 2022 she took part in the International Invitational of the Gwanghwamun
                      International Art Festival as an invited artist.
                    </p>
                    <p>
                      Her work is not confined to the canvas. In 2019 she served as a co-curator of
                      the West Sea Peace Art Project for the Incheon Foundation for Arts &amp;
                      Culture — extending an engineer&apos;s instinct for systems and collaboration
                      into the structuring of a project itself.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      예미킴은 공학자의 시선으로 시각예술을 재구성하는 작가다. KAIST에서{' '}
                      <strong className="font-bold text-charcoal-deep">
                        건설환경공학과 산업공학
                      </strong>
                      을 전공했다 — 측정과 시스템, 구조의 논리 위에 세워진 학문들. 그렇게 훈련된
                      시선을 그는 이미지를 만드는 일로 돌렸다.
                    </p>
                    <p>
                      그는 지금까지{' '}
                      <strong className="font-bold text-charcoal-deep">15회의 개인전</strong>과{' '}
                      <strong className="font-bold text-charcoal-deep">
                        70여 회의 기획 단체전
                      </strong>
                      에 참여하며, 오랜 시간에 걸쳐 꾸준히 전시를 이어 온 작업의 두께를 쌓아 왔다.
                      2024년에는 서울 청년비엔날레에서 미술 평론가상을 수상했다.
                    </p>
                    <p>
                      공학자의 감각은 빛과 미디어로 확장된다. 2023년 그는 제주 빛의벙커미디어아트
                      전시 〈피어나다〉를 선보였다 — 정밀한 구조가 열리고 피어나는 이미지로 전환되는
                      작업이다. 2022년에는 광화문 국제 아트 페스티벌 국제 초대전 초대작가로
                      참여했다.
                    </p>
                    <p>
                      그의 작업은 화면 안에만 머물지 않는다. 2019년 그는 인천문화재단 서해평화예술
                      프로젝트의 공동기획자로 활동하며, 시스템과 협업을 향한 공학자의 본능을
                      프로젝트 자체를 구조화하는 일로 확장했다.
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
                        {isEnglish ? "The engineer's eye" : '공학자의 시선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A training in Civil & Environmental and Industrial Engineering, turned toward the structuring of images — measurement and system as a way of seeing.'
                          : '건설환경공학과 산업공학의 훈련을 이미지의 구조화로 돌린다 — 측정과 시스템을 하나의 보는 방식으로.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Light and media art — 〈Bloom〉'
                          : '빛과 미디어아트 — 〈피어나다〉'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In her 2023 Bunker de Lumières work 〈Bloom〉, precise structure opens into an image that flowers — engineering rendered as light.'
                          : '2023년 빛의벙커 작업 〈피어나다〉에서 정밀한 구조는 피어나는 이미지로 열린다 — 빛으로 구현된 공학.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Exhibition and curation' : '전시와 기획'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? '15 solo and over 70 group exhibitions, plus co-curation of a public art project — an artist who structures projects as well as images.'
                          : '15회의 개인전과 70여 회의 단체전, 그리고 공공예술 프로젝트의 공동기획 — 이미지뿐 아니라 프로젝트를 구조화하는 작가.'}
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
                      KAIST
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studies Civil & Environmental Engineering and Industrial Engineering.'
                        : '건설환경공학·산업공학 전공.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Co-curator, West Sea Peace Art Project, Incheon Foundation for Arts & Culture.'
                        : '인천문화재단 서해평화예술 프로젝트 공동기획자.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited artist, International Invitational, Gwanghwamun International Art Festival.'
                        : '광화문 국제 아트 페스티벌 국제 초대전 초대작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Presents 〈Bloom〉 at the Bunker de Lumières media art exhibition, Jeju.'
                        : '제주 빛의벙커미디어아트 전시 〈피어나다〉 발표.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the Art Critic Award at the Seoul Youth Biennale.'
                        : '서울 청년비엔날레 미술 평론가상 수상.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & awards' : '주요 전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '15 solo exhibitions and more than 70 curated group exhibitions.'
                        : '개인전 15회, 기획 단체전 70여 회.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art Critic Award, Seoul Youth Biennale (2024).'
                        : '서울 청년비엔날레 미술 평론가상 수상 (2024).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Bloom〉, Bunker de Lumières media art exhibition, Jeju (2023).'
                        : '〈피어나다〉, 제주 빛의벙커미디어아트 전시 (2023).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited artist, International Invitational, Gwanghwamun International Art Festival (2022).'
                        : '광화문 국제 아트 페스티벌 국제 초대전 초대작가 (2022).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Co-curator, West Sea Peace Art Project, Incheon Foundation for Arts & Culture (2019).'
                        : '인천문화재단 서해평화예술 프로젝트 공동기획자 (2019).'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 예미킴 공학·빛 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on structure, light, and bloom</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">구조와 빛, 그리고 피어남에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 공학에서 시각예술로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From engineering to visual art — a trained eye'
                    : '공학에서 시각예술로 — 훈련된 시선'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Yemikim came to art by way of engineering. At KAIST she studied Civil &amp;
                        Environmental Engineering and Industrial Engineering — fields concerned with
                        load and tolerance, with systems, optimization, and the discipline of making
                        things hold together. These are not the usual antecedents of a painter, and
                        that difference is precisely the point of her work.
                      </p>
                      <p>
                        An engineer learns to see structure beneath surface: the frame under the
                        façade, the system under the appearance. When that gaze is turned toward
                        visual art, the image is no longer only something to be looked at, but
                        something to be <em>constructed</em> — built up from logic, measurement, and
                        an understanding of how parts relate to a whole.
                      </p>
                      <p>
                        This is what it means to reconstruct visual art through an engineer&apos;s
                        eye. Not to illustrate engineering, but to bring its way of seeing into the
                        making of images — so that structure and image are no longer separate
                        things.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        예미킴은 공학을 거쳐 예술에 이르렀다. KAIST에서 그는 건설환경공학과
                        산업공학을 전공했다 — 하중과 허용치, 시스템과 최적화, 그리고 무언가를 버티게
                        만드는 규율을 다루는 학문들. 화가의 통상적인 출발점은 아니지만, 바로 그
                        차이가 그의 작업의 핵심이다.
                      </p>
                      <p>
                        공학자는 표면 아래의 구조를 보는 법을 익힌다: 외피 아래의 골조, 외양 아래의
                        시스템. 그 시선이 시각예술을 향할 때, 이미지는 단지 바라보는 대상이 아니라{' '}
                        <em>구축하는 것</em>이 된다 — 논리와 측정, 부분이 전체와 맺는 관계에 대한
                        이해로부터 쌓아 올려지는 것.
                      </p>
                      <p>
                        공학자의 시선으로 시각예술을 재구성한다는 것은 이런 의미다. 공학을 삽화로
                        그리는 것이 아니라, 그 보는 방식을 이미지 제작 안으로 들여오는 것 — 그리하여
                        구조와 이미지가 더 이상 별개의 것이 아니게 하는 것.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 빛으로 피어나다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Blooming in light — 〈Bloom〉 and media art'
                    : '빛으로 피어나다 — 〈피어나다〉와 미디어아트'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2023, Yemikim presented 〈Bloom〉 at the Bunker de Lumières media art
                        exhibition in Jeju. The title names the movement at the heart of the work:
                        an opening, an unfolding — a structure that does not stay closed but flowers
                        outward.
                      </p>
                      <p>
                        Media art was a natural extension of her engineer&apos;s sensibility. Light,
                        projection, and time-based image are themselves systems — governed by
                        sequence, timing, and the precise coordination of parts. Where a painter
                        might reach for pigment, she could reach for the architecture of light
                        itself.
                      </p>
                      <p>
                        The tone of her work lives in this tension: precise and structural on one
                        side, generative and blooming on the other. Rigor does not foreclose beauty;
                        it is the ground from which beauty opens. In 〈Bloom〉, the engineering of
                        light becomes the condition for an image to flower.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2023년, 예미킴은 제주 빛의벙커미디어아트 전시 〈피어나다〉를 선보였다.
                        제목은 작업의 핵심에 있는 움직임을 가리킨다: 열림, 펼쳐짐 — 닫혀 있지 않고
                        바깥으로 피어나는 구조.
                      </p>
                      <p>
                        미디어아트는 그의 공학적 감각의 자연스러운 확장이었다. 빛과 프로젝션, 시간
                        기반의 이미지는 그 자체로 시스템이다 — 순서와 타이밍, 부분들의 정밀한 조율로
                        다스려지는. 화가가 안료에 손을 뻗을 자리에서, 그는 빛 그 자체의 구조에 손을
                        뻗을 수 있었다.
                      </p>
                      <p>
                        그의 작업의 톤은 이 긴장 속에 산다: 한쪽은 정밀하고 구조적이며, 다른 한쪽은
                        생성하며 피어난다. 엄밀함은 아름다움을 가로막지 않는다 — 그것은 아름다움이
                        열려 나오는 바탕이다. 〈피어나다〉에서 빛의 공학은 이미지가 피어나기 위한
                        조건이 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 작업과 기획 사이에서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Between making and structuring — exhibition and curation'
                    : '작업과 기획 사이에서 — 전시와 기획'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Fifteen solo exhibitions and more than seventy curated group exhibitions
                        describe a practice sustained over years — not a single breakthrough but a
                        steady accumulation. In 2024 that body of work was recognized with the Art
                        Critic Award at the Seoul Youth Biennale, and in 2022 she was an invited
                        artist at the International Invitational of the Gwanghwamun International
                        Art Festival.
                      </p>
                      <p>
                        Her engagement reaches beyond her own canvas. In 2019 she served as a
                        co-curator of the West Sea Peace Art Project for the Incheon Foundation for
                        Arts &amp; Culture — taking on the structuring of a project itself. For an
                        artist trained in industrial engineering, curation is a familiar problem:
                        how to coordinate parts, people, and intentions into a working whole.
                      </p>
                      <p>
                        Making and structuring, the image and the system — across her practice these
                        are not opposites but two faces of a single sensibility. She joins this
                        campaign in that same spirit: not as a subject of its cause but as a fellow
                        artist in solidarity, lending her structure to a shared one.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        15회의 개인전과 70여 회의 기획 단체전은 오랜 시간에 걸쳐 이어 온 작업을
                        말한다 — 한 번의 돌파가 아니라 꾸준한 축적. 2024년 그 작업의 두께는 서울
                        청년비엔날레 미술 평론가상으로 인정받았고, 2022년에는 광화문 국제 아트
                        페스티벌 국제 초대전 초대작가로 참여했다.
                      </p>
                      <p>
                        그의 활동은 자신의 화면 너머로 뻗는다. 2019년 그는 인천문화재단 서해평화예술
                        프로젝트의 공동기획자로 활동하며, 프로젝트 자체를 구조화하는 일을 맡았다.
                        산업공학을 훈련한 작가에게 기획은 익숙한 문제다: 부분과 사람, 의도를 어떻게
                        하나의 작동하는 전체로 조율할 것인가.
                      </p>
                      <p>
                        만드는 일과 구조화하는 일, 이미지와 시스템 — 그의 작업 전반에서 이 둘은
                        대립이 아니라 하나의 감각이 지닌 두 얼굴이다. 그는 같은 마음으로 이 캠페인에
                        함께한다: 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로, 자신의 구조를
                        함께하는 구조에 보태며.
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
                      From the engineering halls of KAIST to the light of media art, Yemikim&apos;s
                      work pursues a single question: how does precise structure give rise to an
                      image that blooms? She joins this campaign not as a subject of its cause but
                      as a fellow artist in solidarity — so that those navigating financial
                      exclusion today might find firmer ground to build upon.
                    </>
                  ) : (
                    <>
                      KAIST의 공학 강의실에서 빛의 미디어아트까지, 예미킴의 작업은 하나의 물음을
                      추구한다: 정밀한 구조는 어떻게 피어나는 이미지를 낳는가. 씨앗페에는 이
                      캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 오늘 금융 차별을
                      겪는 예술인들이 그 위에 무언가를 세울 더 단단한 바닥을 얻을 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Yemikim</span>
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
                    Yemikim joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    예미킴 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={YEMIKIM_PATH}
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
