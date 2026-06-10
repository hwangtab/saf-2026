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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이채원)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_CHAEWON_PATH = `/artworks/artist/${encodeURIComponent('이채원')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeChaewonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이채원' ||
    n === 'lee chae-won' ||
    n === 'lee chaewon' ||
    n.replace(/[\s-]+/g, '') === 'leechaewon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이채원 — 이어지는 그림, 매릴랜드의 신진 회화 작가',
    description:
      '미국 매릴랜드에서 활동하는 신진 회화 작가 이채원. 2024년 Maryland Institute College of Art(MICA) 회화과를 summa cum laude로 졸업하고, 같은 해 볼티모어 Lazarus Hall Gallery에서 첫 개인전 〈To Be Continued〉를 열었다. 유학에서 졸업, 첫 개인전으로 이어지는 한 화가의 여정을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '매릴랜드의 신진 회화 작가 이채원. MICA 회화과 summa cum laude 졸업, 첫 개인전 〈To Be Continued〉로 이어지는 여정.',
    ogAlt: '이채원 대표 작품',
    twitterTitle: '이채원',
    twitterDescription: '이어지는 그림 — 매릴랜드의 신진 회화 작가 이채원',
    keywords:
      '이채원 작가, MICA, Maryland Institute College of Art, 회화, To Be Continued, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Chaewon — A Painting That Continues, an Emerging Painter in Maryland',
    description:
      'Selected works by Lee Chaewon, an emerging painter based in Maryland, USA. She graduated summa cum laude from the Maryland Institute College of Art (MICA) with a B.F.A. in Painting in 2024 and held her first solo exhibition 〈To Be Continued〉 at Lazarus Hall Gallery in Baltimore that same year. Follow a young painter&apos;s journey — from study abroad to graduation to a first solo show — at SAF Online.',
    ogDescription:
      'Lee Chaewon — an emerging painter in Maryland. A summa cum laude MICA graduate whose journey continues through her first solo show, 〈To Be Continued〉.',
    ogAlt: 'Lee Chaewon — featured work',
    twitterTitle: 'Lee Chaewon',
    twitterDescription: 'A painting that continues — an emerging painter in Maryland',
    keywords:
      'Lee Chaewon artist, MICA, Maryland Institute College of Art, painting, emerging Korean artist, To Be Continued',
  },
} as const;

export async function buildLeeChaewonMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_CHAEWON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이채원');
  const artwork = allArtworks.find((a) => isLeeChaewonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Chaewon`
      : `${artwork.title} — 이채원`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_CHAEWON_PATH, locale, true),
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

export default async function LeeChaewonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_CHAEWON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이채원');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeChaewonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Chaewon' : '이채원', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_CHAEWON_PATH}#person-lee-chaewon`,
    name: isEnglish ? 'Lee Chaewon' : '이채원',
    alternateName: isEnglish ? '이채원' : 'Lee Chaewon',
    jobTitle: isEnglish ? 'Painter' : '회화 작가',
    description: isEnglish
      ? 'Lee Chaewon is an emerging painter based in Maryland, USA, who graduated summa cum laude from the Maryland Institute College of Art (MICA) in 2024 and held her first solo exhibition 〈To Be Continued〉 that same year.'
      : '이채원은 미국 매릴랜드에서 활동하는 신진 회화 작가로, 2024년 Maryland Institute College of Art(MICA)를 summa cum laude로 졸업하고 같은 해 첫 개인전 〈To Be Continued〉를 열었습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Maryland Institute College of Art (MICA), B.F.A. in Painting'
        : 'Maryland Institute College of Art(MICA) 회화과',
    },
    knowsAbout: ['Painting', 'Contemporary art', 'Fine art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Chaewon — SAF Online' : '이채원 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Chaewon from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이채원 작품들을 소개합니다.',
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

          {/* Ascending lines — 성장·이어짐 모티프 */}
          <div className="absolute bottom-0 left-10 h-2/3 w-px bg-white/10" />
          <div className="absolute bottom-0 left-20 h-3/4 w-px bg-primary/30" />
          <div className="absolute bottom-0 right-14 h-1/2 w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Chaewon · Maryland' : '이채원 · 매릴랜드'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A painting that
                  <br />
                  <span className="text-primary-soft">continues</span>
                </>
              ) : (
                <>
                  이어지는
                  <br />
                  <span className="text-primary-soft">그림</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">From study abroad in Maryland to a first solo show.</span>
                  <span className="mt-2 block">
                    A young painter&apos;s journey — still to be continued.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">매릴랜드 유학에서 첫 개인전까지.</span>
                  <span className="mt-2 block">아직 이어지고 있는, 한 화가의 여정.</span>
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
                    From Seoul to Baltimore —<br />
                    <span className="text-primary-strong">a painter still beginning</span>
                  </>
                ) : (
                  <>
                    서울에서 볼티모어로 —<br />
                    <span className="text-primary-strong">이제 시작하는 화가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Chaewon is an emerging painter based in Maryland, in the United States.
                      Her path is one many young Korean artists share but few complete: she crossed
                      an ocean to study painting, and over four years — from 2021 to 2024 — built a
                      practice at the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Maryland Institute College of Art (MICA)
                      </strong>
                      , one of the oldest and most respected art colleges in the United States.
                    </p>
                    <p>
                      In 2024 she graduated with a B.F.A. in Painting{' '}
                      <strong className="font-bold text-charcoal">summa cum laude</strong> — the
                      highest academic distinction a graduating student can receive. For an
                      international student working in a second language, in a country far from
                      home, that honor is not a line on a résumé so much as the record of a
                      sustained, disciplined devotion to the work.
                    </p>
                    <p>
                      Recognition arrived steadily along the way. MICA awarded her the{' '}
                      <strong className="font-bold text-charcoal">
                        Distinguished International Student Award
                      </strong>{' '}
                      twice (2022 and 2024), alongside the Presidential Scholarship, the MICA
                      Visionary Scholarship, and departmental recognition awards. These were not a
                      single lucky break but a continuous affirmation, year after year, that her
                      painting was being seen.
                    </p>
                    <p>
                      The same year she graduated, she opened her first solo exhibition,{' '}
                      <strong className="font-bold text-charcoal-deep">〈To Be Continued〉</strong>,
                      at Lazarus Hall Gallery in Baltimore. The title is its own quiet statement of
                      intent: a graduation is not an ending but a comma. The work, and the life
                      around it, is to be continued.
                    </p>
                    <p>
                      She joins this campaign not as someone in need of its cause but as a fellow
                      artist standing in solidarity. A painter at the very start of her career lends
                      her work so that other artists — those navigating financial exclusion today —
                      might also continue.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이채원은 미국 매릴랜드에서 활동하는 신진 회화 작가다. 그의 길은 많은 한국의
                      젊은 예술인이 꿈꾸지만 끝까지 걸어내는 이는 드문 여정이다. 그는 회화를
                      공부하기 위해 바다를 건넜고, 2021년부터 2024년까지 4년에 걸쳐 미국에서 가장
                      오래되고 존경받는 미술대학 중 하나인{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Maryland Institute College of Art(MICA)
                      </strong>
                      에서 자신의 작업을 쌓아 올렸다.
                    </p>
                    <p>
                      2024년, 그는 회화과를{' '}
                      <strong className="font-bold text-charcoal">summa cum laude</strong>로
                      졸업했다. 졸업생이 받을 수 있는 가장 높은 학업 영예다. 모국을 멀리 떠나
                      제2언어로 작업하는 유학생에게 이 영예는 이력서의 한 줄이라기보다, 작업을 향한
                      꾸준하고 단단한 헌신의 기록에 가깝다.
                    </p>
                    <p>
                      그 길 위에서 인정은 꾸준히 따라왔다. MICA는 그에게{' '}
                      <strong className="font-bold text-charcoal">
                        Distinguished International Student Award
                      </strong>
                      를 두 차례(2022·2024) 수여했고, Presidential Scholarship과 MICA Visionary
                      Scholarship, 그리고 학과 표창이 그 곁에 함께했다. 한 번의 행운이 아니라 해마다
                      이어진 확인이었다 — 그의 그림이 보이고 있다는 확인.
                    </p>
                    <p>
                      졸업한 그해, 그는 볼티모어 Lazarus Hall Gallery에서 첫 개인전{' '}
                      <strong className="font-bold text-charcoal-deep">〈To Be Continued〉</strong>
                      를 열었다. 제목 자체가 조용한 선언이다. 졸업은 끝이 아니라 쉼표다. 작업도, 그
                      둘레의 삶도, 계속 이어질 것이다.
                    </p>
                    <p>
                      그는 이 캠페인에 도움이 필요한 당사자로서가 아니라, 연대하는 동료 예술인으로
                      함께한다. 막 출발선에 선 한 화가가 자신의 작품을 내놓는 것은, 오늘 금융 차별을
                      겪는 다른 예술인들 또한 작업을 이어갈 수 있도록 하기 위해서다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'On this journey' : '이 여정에 대하여'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Painting, abroad' : '바다 건너의 회화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Four years of study at MICA in Baltimore — a young Korean painter building a practice in a second language, far from home.'
                          : '볼티모어 MICA에서의 4년. 모국을 떠나 제2언어로 자신의 회화를 쌓아 올린 젊은 한국 작가.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Summa cum laude' : 'summa cum laude'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Graduated in 2024 with the highest academic distinction — the record of a sustained devotion to the work, year after year.'
                          : '2024년, 최우등으로 졸업. 해마다 이어진, 작업을 향한 꾸준한 헌신의 기록.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? '〈To Be Continued〉' : '〈To Be Continued〉'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Her first solo exhibition (2024, Baltimore). The title says it plainly — a graduation is a comma, not a period.'
                          : '첫 개인전(2024, 볼티모어). 제목이 그대로 말한다 — 졸업은 마침표가 아니라 쉼표라고.'}
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
                      2021–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins study at the Maryland Institute College of Art (MICA), Painting, Baltimore.'
                        : 'Maryland Institute College of Art(MICA) 회화과 입학(볼티모어).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the MICA Distinguished International Student Award and the Foundation Department Recognition Award.'
                        : 'MICA Distinguished International Student Award·Foundation Department Recognition Award 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Juried Undergraduate Exhibition〉 at Deckers Gallery; receives the General Fine Arts Department Recognition Award and a Merit Award.'
                        : 'Deckers Gallery 단체전 〈Juried Undergraduate Exhibition〉 참여; General Fine Arts Department Recognition Award·Merit Award 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates summa cum laude (B.F.A., Painting); group shows 〈Summer Comes to My Hometown, Seoul〉 (Korean Consulate, Washington D.C.) and 〈Spotlight: Graduating Seniors in Focus〉 (MICA Fox Gallery).'
                        : 'summa cum laude로 졸업(B.F.A., 회화); 워싱턴 DC 한국 영사관 단체전 〈Summer Comes to My Hometown, Seoul〉·MICA Fox Gallery 〈Spotlight, Graduating Seniors in Focus〉 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Opens her first solo exhibition 〈To Be Continued〉 at Lazarus Hall Gallery, Baltimore.'
                        : '볼티모어 Lazarus Hall Gallery에서 첫 개인전 〈To Be Continued〉 개최.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Exhibitions & honors' : '전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo: <em>To Be Continued</em>, Lazarus Hall Gallery, Baltimore, Maryland
                          (2024)
                        </>
                      ) : (
                        <>
                          개인전: 〈To Be Continued〉, Lazarus Hall Gallery, 볼티모어, 매릴랜드
                          (2024)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group: <em>Summer Comes to My Hometown, Seoul</em>, Korean Consulate,
                          Washington D.C. (2024); <em>Spotlight: Graduating Seniors in Focus</em>,
                          MICA Fox Gallery, Baltimore (2024)
                        </>
                      ) : (
                        <>
                          단체전: 〈Summer Comes to My Hometown, Seoul〉, 워싱턴 DC 한국 영사관
                          (2024); 〈Spotlight, Graduating Seniors in Focus〉, MICA Fox Gallery,
                          볼티모어 (2024)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group: <em>Juried Undergraduate Exhibition</em>, Deckers Gallery,
                          Baltimore (2023)
                        </>
                      ) : (
                        <>
                          단체전: 〈Juried Undergraduate Exhibition〉, Deckers Gallery, 볼티모어
                          (2023)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MICA honors: Distinguished International Student Award (2022, 2024), Presidential Scholarship, MICA Visionary Scholarship, General Fine Arts & Foundation Department Recognition Awards, Juried Undergraduate Merit Award.'
                        : 'MICA 교내 수상: Distinguished International Student Award (2022·2024), Presidential Scholarship, MICA Visionary Scholarship, General Fine Arts·Foundation Department Recognition Award, Juried Undergraduate Merit Award.'}
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
                  <span className="text-charcoal-deep">on a journey still continuing</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">아직 이어지는 여정에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 바다를 건넌 회화 공부 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Crossing an ocean to study painting'
                    : '회화를 공부하러 바다를 건너다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        To choose painting is already a kind of courage. To choose to study it
                        thousands of miles from home, in a language not your own, is something more.
                        Lee Chaewon&apos;s story begins with that decision: leaving Korea to enroll
                        at the Maryland Institute College of Art in Baltimore, one of the oldest
                        degree-granting art colleges in the United States.
                      </p>
                      <p>
                        MICA&apos;s painting program is among the most regarded in the country, and
                        for an international undergraduate the demands are doubled — the work
                        itself, and the daily labor of building a life and a practice in an
                        unfamiliar place. Over four years, from 2021 to 2024, she did both. The
                        recognition that came her way along the road — institutional scholarships,
                        departmental honors — was the quiet evidence that she belonged in the room.
                      </p>
                      <p>
                        This is the part of an artist&apos;s biography that rarely makes the wall
                        text: the years before the first solo show, when the work is being built and
                        no one is yet watching. Lee Chaewon&apos;s presence in this campaign is, in
                        part, a portrait of that period — the long, unglamorous beginning that every
                        sustained practice requires.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        회화를 택하는 것은 그 자체로 일종의 용기다. 모국에서 수천 마일 떨어진
                        곳에서, 자신의 언어가 아닌 언어로 그것을 공부하기로 하는 것은 그 이상이다.
                        이채원의 이야기는 바로 그 결심에서 시작된다 — 한국을 떠나 볼티모어의
                        Maryland Institute College of Art에 입학한 것. 미국에서 가장 오래된 학위
                        수여 미술대학 중 하나다.
                      </p>
                      <p>
                        MICA의 회화 프로그램은 미국에서 손꼽히는 과정이고, 유학생 학부생에게 그
                        부담은 두 배가 된다 — 작업 그 자체, 그리고 낯선 곳에서 삶과 작업을 함께 쌓아
                        올리는 매일의 노동. 2021년부터 2024년까지 4년에 걸쳐 그는 그 둘을 모두
                        해냈다. 그 길 위에서 따라온 인정 — 교내 장학과 학과 표창 — 은 그가 그 자리에
                        속해 있다는 조용한 증거였다.
                      </p>
                      <p>
                        이것은 작가의 약력에서 좀처럼 벽면 텍스트에 오르지 않는 부분이다. 첫 개인전
                        이전의 시간들, 작업이 쌓이고 있지만 아직 아무도 지켜보지 않는 시간. 이
                        캠페인 속 이채원의 존재는 어떤 의미에서 그 시기의 초상이다 — 지속되는 모든
                        작업이 요구하는, 길고 화려하지 않은 시작.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. summa cum laude의 무게 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'What summa cum laude actually means'
                    : 'summa cum laude가 실제로 뜻하는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2024 Lee Chaewon graduated from MICA with a B.F.A. in Painting{' '}
                        <em>summa cum laude</em> — &ldquo;with highest honor.&rdquo; It is the top
                        of three Latin distinctions and is reserved for the very narrow band of
                        students at the top of a graduating class.
                      </p>
                      <p>
                        It is worth pausing on what that distinction asks of an international
                        student specifically. The honor is calculated over the full arc of a degree,
                        which means it cannot be won in a single strong semester; it requires
                        consistency across years — through the disorientation of a first year
                        abroad, through the accumulating pressure of upper-level critique, through a
                        thesis. Earned in a second language and a foreign system, the distinction is
                        less a trophy than a measure of stamina.
                      </p>
                      <p>
                        Read alongside her record at MICA — the repeated international-student
                        award, the scholarships, the departmental recognitions — the pattern is not
                        of a single breakthrough but of steady, compounding work. That is the most
                        reliable predictor of a long career: not a flash, but a habit.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2024년, 이채원은 MICA 회화과를 <em>summa cum laude</em> —
                        &lsquo;최우등&rsquo; — 으로 졸업했다. 세 단계의 라틴어 영예 중 가장 높은
                        등급으로, 졸업 학년의 맨 위 아주 좁은 구간의 학생에게만 주어진다.
                      </p>
                      <p>
                        이 영예가 특히 유학생에게 무엇을 요구하는지 잠시 짚어볼 만하다. 이 명예는
                        학위 전 과정에 걸쳐 산정되므로, 한 학기를 잘 보낸다고 얻어지지 않는다. 여러
                        해에 걸친 일관성이 필요하다 — 낯선 첫 유학 생활의 혼란을 지나, 고학년 비평의
                        누적되는 압박을 지나, 졸업 작업까지. 제2언어와 낯선 제도 안에서 얻은 이
                        영예는 트로피라기보다 지구력의 척도에 가깝다.
                      </p>
                      <p>
                        MICA에서의 이력 — 거듭된 유학생상, 장학금, 학과 표창 — 과 나란히 읽으면, 한
                        번의 돌파가 아니라 꾸준히 누적되는 작업의 패턴이 보인다. 그것이 긴 작가
                        인생을 가장 믿을 만하게 예고하는 신호다. 섬광이 아니라 습관.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. To Be Continued */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈To Be Continued〉 — a first solo show as a comma'
                    : '〈To Be Continued〉 — 쉼표로서의 첫 개인전'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A first solo exhibition is a threshold. For many artists it arrives years
                        after graduation, if at all. Lee Chaewon held hers the same year she
                        finished her degree, at Lazarus Hall Gallery in Baltimore, on West North
                        Avenue, in the heart of the city&apos;s arts district.
                      </p>
                      <p>
                        The title she chose — <em>To Be Continued</em> — is the quiet center of her
                        story so far. It refuses the temptation to treat a first show as an arrival.
                        A graduation, the title insists, is punctuation, not a full stop: the comma
                        between a beginning and everything that follows. It is a young artist&apos;s
                        promise to keep going, made in public.
                      </p>
                      <p>
                        That promise is also what brings her to this campaign. The works gathered
                        here are early works by an emerging painter — and that is precisely the
                        point. A purchase here is not a memorial to a finished career but an
                        investment in one still being made, and at the same time a contribution to
                        the mutual-aid fund that lets other artists keep working. Her sentence, and
                        theirs, is to be continued.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        첫 개인전은 하나의 문턱이다. 많은 작가에게 그것은 졸업 후 여러 해가
                        지나서야, 혹은 끝내 오지 않을 수도 있다. 이채원은 학위를 마친 바로 그해,
                        볼티모어 West North Avenue, 도시의 예술 지구 한복판에 자리한 Lazarus Hall
                        Gallery에서 첫 개인전을 열었다.
                      </p>
                      <p>
                        그가 택한 제목 — <em>To Be Continued</em> — 은 지금까지의 이야기의 조용한
                        중심이다. 그것은 첫 전시를 도착점으로 여기려는 유혹을 거부한다. 졸업은
                        마침표가 아니라 문장부호라고, 제목은 말한다. 시작과 그 뒤에 이어질 모든 것
                        사이의 쉼표. 계속 나아가겠다는, 한 젊은 작가가 공개적으로 건넨 약속이다.
                      </p>
                      <p>
                        그 약속이 그를 이 캠페인으로 이끈다. 이곳에 모인 작품들은 한 신진 화가의
                        초기 작업이다 — 그리고 바로 그 점이 핵심이다. 이곳에서의 구매는 완성된
                        이력에 대한 기념이 아니라, 아직 만들어지고 있는 한 작가에 대한 투자이자,
                        동시에 다른 예술인이 작업을 이어갈 수 있게 하는 상호부조 기금에 대한 기여다.
                        그의 문장도, 그들의 문장도, 계속 이어진다.
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
                      From a classroom in Baltimore to a first gallery wall, Lee Chaewon&apos;s
                      practice has only just begun — and that is its quiet strength. She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity,
                      so that the next generation of artists might begin without the weight of
                      financial exclusion. The story, as her first show declared, is to be
                      continued.
                    </>
                  ) : (
                    <>
                      볼티모어의 한 강의실에서 첫 갤러리 벽면까지, 이채원의 작업은 이제 막 시작됐다
                      — 그리고 그것이 그 작업의 조용한 힘이다. 그는 이 캠페인에 이 대의의
                      대상으로서가 아니라 동료 예술인과의 연대자로서 함께한다. 다음 세대의
                      예술인들이 금융 차별의 무게 없이 시작할 수 있도록. 이야기는, 그의 첫 전시가
                      선언했듯, 계속 이어진다.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Chaewon</span>
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
                    Lee Chaewon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이채원 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_CHAEWON_PATH}
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
