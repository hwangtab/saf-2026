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

// 작가 feature는 작가 페이지(/artworks/artist/박지혜)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_JIHYE_PATH = `/artworks/artist/${encodeURIComponent('박지혜')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isParkJihyeArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '박지혜' ||
    n === 'park ji-hye' ||
    n === 'park jihye' ||
    n.replace(/[\s-]+/g, '') === 'parkjihye'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박지혜 — 통과와 이행의 감각',
    description:
      "회화와 디지털 매체를 횡단하는 신진 작가 박지혜. '통과(Passing)'와 '이행(Passage)'의 감각을 시각화하며, 프랑스 르아브르에서 시작한 작업이 AI디자인 연구로 확장되는 궤적을 그린다. 흐름과 경계의 톤으로 매체의 경계를 가로지르는 박지혜의 작품을 씨앗페 온라인에서 감상하고 소장하세요.",
    ogDescription:
      "회화와 디지털 매체를 횡단하는 박지혜. '통과'와 '이행'의 감각을 시각화하며 매체와 장르의 경계를 가로지른다.",
    ogAlt: '박지혜 대표 작품',
    twitterTitle: '박지혜',
    twitterDescription: 'Passing & Passage — 통과와 이행의 감각을 횡단하는 작가 박지혜',
    keywords:
      '박지혜 작가, Passing, Passage, 통과, 이행, 회화, 디지털 매체, AI디자인, 씨앗페 온라인',
  },
  en: {
    title: 'Park Ji-hye — The Sense of Passing and Passage',
    description:
      "Selected works by Park Ji-hye, an emerging artist who moves across painting and digital media. She visualizes the sense of 'Passing' and 'Passage,' tracing a trajectory that began in Le Havre, France and expands into AI design research. View and collect her works at SAF Online.",
    ogDescription:
      "Park Ji-hye — an emerging artist who crosses painting and digital media, visualizing the sense of 'Passing' and 'Passage.'",
    ogAlt: 'Park Ji-hye — featured work',
    twitterTitle: 'Park Ji-hye',
    twitterDescription: 'Passing & Passage — crossing the threshold of medium and genre',
    keywords:
      'Park Ji-hye artist, Passing, Passage, painting, digital media, AI design, Korean contemporary art',
  },
} as const;

export async function buildParkJihyeMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_JIHYE_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박지혜');
  const artwork = allArtworks.find((a) => isParkJihyeArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Ji-hye`
      : `${artwork.title} — 박지혜`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_JIHYE_PATH, locale, true),
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

export default async function ParkJihyeFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_JIHYE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박지혜');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isParkJihyeArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Park Ji-hye' : '박지혜', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_JIHYE_PATH}#person-park-jihye`,
    name: isEnglish ? 'Park Ji-hye' : '박지혜',
    alternateName: isEnglish ? '박지혜' : 'Park Ji-hye',
    jobTitle: isEnglish ? 'Artist' : '작가',
    description: isEnglish
      ? "Park Ji-hye is an emerging artist who moves across painting and digital media, visualizing the sense of 'Passing' and 'Passage.'"
      : "박지혜는 회화와 디지털 매체를 횡단하며 '통과(Passing)'와 '이행(Passage)'의 감각을 시각화하는 신진 작가입니다.",
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? "L'École Supérieure d'Art et Design Le Havre-Rouen, France"
          : "프랑스 L'École Supérieure d'Art et Design Le Havre-Rouen",
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Hongik University, Dept. of Painting' : '홍익대학교 회화과',
      },
    ],
    knowsAbout: ['Painting', 'Digital media art', 'AI design'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Ji-hye — SAF Online' : '박지혜 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Ji-hye from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 박지혜 작품을 소개합니다.',
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

          {/* Flowing threshold lines — 통과·이행 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Park Ji-hye · Painting × Digital' : '박지혜 · 회화 × 디지털'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Passing &amp; Passage —
                  <br />
                  <span className="text-primary-soft">crossing the threshold</span>
                </>
              ) : (
                <>
                  통과와 이행 —
                  <br />
                  <span className="text-primary-soft">경계를 가로지르다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She visualizes the sense of passing through and passing over.
                  </span>
                  <span className="mt-2 block">
                    A trajectory that began in Le Havre and reaches toward AI design.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">통과하고 이행하는 감각을 시각화하다.</span>
                  <span className="mt-2 block">
                    르아브르에서 시작해 AI디자인으로 확장되는 궤적.
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
                    Passing, Passage —<br />
                    <span className="text-primary-strong">a practice that crosses media</span>
                  </>
                ) : (
                  <>
                    통과, 이행 —<br />
                    <span className="text-primary-strong">매체를 가로지르는 작업</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Ji-hye is an emerging artist who moves across painting and digital media.
                      Her work began in France: she earned her bachelor&apos;s degree (DNAP) in fine
                      art at L&apos;École Supérieure d&apos;Art et Design Le Havre-Rouen in 2010,
                      after presenting painting, installation, and video work at the ESAH Gallery
                      between 2008 and 2010.
                    </p>
                    <p>
                      Returning to Korea, she deepened her practice at Hongik University&apos;s
                      Graduate School, Department of Painting — completing her master&apos;s degree
                      in 2015 and her doctorate in 2025. Since 2024 she has been enrolled in the
                      doctoral program of the AI Design Lab at Kookmin University&apos;s Graduate
                      School of Techno Design, extending her inquiry from canvas into computational
                      media.
                    </p>
                    <p>
                      Across this trajectory, two words recur:{' '}
                      <strong className="font-bold text-charcoal">
                        &lsquo;Passing&rsquo; and &lsquo;Passage&rsquo;
                      </strong>
                      . Her 2013 and 2014 solo exhibitions at the Hangaram Art Museum carried those
                      titles directly — <em>Passing</em> and <em>Passage</em> — naming a sustained
                      preoccupation with the sense of passing through a boundary and of passing over
                      into another state.
                    </p>
                    <p>
                      In 2024 her solo exhibition <em>Visual Dialogue</em> at the Hongik University
                      Museum of Contemporary Art brought painting into conversation with digital
                      tools, treating the canvas and the screen not as rivals but as a single field
                      of flow. The boundary between media becomes, in her hands, a passage rather
                      than a wall.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박지혜는 회화와 디지털 매체를 횡단하는 신진 작가다. 그의 작업은 프랑스에서
                      시작됐다. 2008년부터 2010년까지 ESAH Gallery에서 페인팅·설치·영상 작업을
                      선보인 뒤, 2010년 프랑스 L&apos;École Supérieure d&apos;Art et Design Le
                      Havre-Rouen에서 순수미술 학사(DNAP)를 취득했다.
                    </p>
                    <p>
                      한국으로 돌아와 홍익대학교 일반대학원 회화과에서 작업을 심화했다 — 2015년
                      석사, 2025년 박사 학위를 마쳤다. 2024년부터는 국민대학교
                      테크노디자인전문대학원 AI디자인 랩 박사과정에 재학하며, 작업의 탐구를
                      캔버스에서 컴퓨팅 매체로 확장하고 있다.
                    </p>
                    <p>
                      이 궤적을 가로질러 두 단어가 반복된다:{' '}
                      <strong className="font-bold text-charcoal">
                        ‘통과(Passing)’와 ‘이행(Passage)’
                      </strong>
                      . 2013년과 2014년 한가람미술관에서 열린 개인전은 〈Passing〉과 〈Passage〉라는
                      제목을 그대로 내걸었다 — 경계를 통과하는 감각, 그리고 다른 상태로 이행하는
                      감각에 대한 지속적 관심을 이름 붙인 것이다.
                    </p>
                    <p>
                      2024년 홍익대학교 현대미술관에서 열린 개인전 〈시각적 대화〉는 회화를 디지털
                      도구와 대화시켰다. 캔버스와 화면을 경쟁 관계가 아니라 하나의 흐름의 장으로
                      다룬 것이다. 그의 손에서 매체 사이의 경계는 벽이 아니라 통로가 된다.
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
                        {isEnglish ? 'Passing & Passage' : '통과와 이행'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The sense of passing through a boundary and passing over into another state — a motif carried through her solo exhibitions.'
                          : '경계를 통과하고 다른 상태로 이행하는 감각. 개인전 제목으로 이어져 온 모티프다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Crossing media' : '매체의 횡단'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Painting and digital media treated as a single field of flow rather than rival camps — the canvas and the screen in dialogue.'
                          : '회화와 디지털 매체를 경쟁이 아닌 하나의 흐름으로 다룬다. 캔버스와 화면이 대화하는 작업.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'From Le Havre to AI design' : '르아브르에서 AI디자인으로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A trajectory from fine-art training in France to doctoral research in AI design — the practice keeps moving across thresholds.'
                          : '프랑스 순수미술에서 AI디자인 박사 연구로 이어지는 궤적. 작업은 경계를 계속 넘어간다.'}
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
                      2008–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Presents painting, installation, and video at ESAH Gallery, France (through 2010).'
                        : 'ESAH Gallery(프랑스)에서 페인팅·설치·영상 발표(~2010).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Bachelor of fine art (DNAP), L'École Supérieure d'Art et Design Le Havre-Rouen."
                        : "프랑스 L'École Supérieure d'Art et Design Le Havre-Rouen 순수미술 학사(DNAP)."}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Passing〉, Gallery Seven, Hangaram Art Museum.'
                        : '개인전 〈Passing〉, 갤러리 세븐(한가람미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Passing〉 (Art Seoul) and 〈Passage〉 (Gallery Seven), Hangaram Art Museum; master&apos;s thesis exhibition.'
                        : '개인전 〈Passing〉(아트서울)·〈Passage〉(갤러리 세븐), 한가람미술관; 석사학위청구전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Master&apos;s degree, Dept. of Painting, Hongik University Graduate School.'
                        : '홍익대학교 일반대학원 회화과 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Visual Dialogue〉, Hongik University Museum of Contemporary Art, Seoul.'
                        : '개인전 〈시각적 대화〉, 홍익대학교 현대미술관(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Doctoral program, AI Design Lab, Graduate School of Techno Design, Kookmin University.'
                        : '국민대학교 테크노디자인전문대학원 AI디자인 랩 박사과정 재학.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Doctorate, Dept. of Painting, Hongik University Graduate School.'
                        : '홍익대학교 일반대학원 회화과 박사.'}
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
                      {isEnglish
                        ? 'Solo: 〈Visual Dialogue〉, Hongik University Museum of Contemporary Art, Seoul (2024)'
                        : '개인전: 〈시각적 대화〉, 홍익대학교 현대미술관, 서울 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈Passing〉 (Art Seoul) & 〈Passage〉 (Gallery Seven), Hangaram Art Museum (2014); 〈Passing〉, Gallery Seven (2013)'
                        : '개인전: 〈Passing〉(아트서울)·〈Passage〉(갤러리 세븐), 한가람미술관 (2014); 〈Passing〉, 갤러리 세븐 (2013)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈Reloaded〉, Dapsimni Art Lab, Korea Media Art Association (2025)'
                        : '단체전: 〈Reloaded〉, 답십리아트랩, 한국미디어아트협회 (2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Asian Young Artists Exhibition, Sejong Center (Gwanghwamun International Art Festival) & Herald Arcade 15, Herald Auction (2024)'
                        : '단체전: 아시아청년작가전, 세종문화회관(광화문국제아트 페스티벌) · 헤럴드 아케이드 15, 헤럴드옥션 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Hanam Fringe Art Fair (2023); 〈Art and Nature〉, Jardin suspendu au Havre, France (2010)'
                        : '단체전: 하남 프린지 아트 페어 (2023); 〈Art and Nature〉, Jardin suspendu au Havre, 프랑스 (2010)'}
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
                  <span className="text-charcoal-deep">on the work and its thresholds</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 경계에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 르아브르에서 시작한 작업 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Beginning in Le Havre — a practice rooted in two places'
                    : '르아브르에서 시작한 작업 — 두 장소에 뿌리내린 작업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Ji-hye&apos;s practice begins in France. Between 2008 and 2010 she
                        presented painting, installation, and video work at the ESAH Gallery, and in
                        2010 she earned her bachelor&apos;s degree in fine art (DNAP) from
                        L&apos;École Supérieure d&apos;Art et Design Le Havre-Rouen — an art and
                        design school in the port city of Le Havre.
                      </p>
                      <p>
                        That early period was not confined to the studio. In 2010 she took part in
                        the group exhibition <em>Art and Nature</em> at the Jardin suspendu au
                        Havre, placing her work in dialogue with a landscape — a hanging garden
                        built into the city&apos;s old fortifications. The instinct to situate the
                        work between a made image and a lived environment would persist.
                      </p>
                      <p>
                        Returning to Korea, she continued at Hongik University&apos;s Graduate
                        School, Department of Painting. The two contexts — a French port city and a
                        Seoul painting program — form the double root of a practice that has never
                        settled into a single medium or a single place.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박지혜의 작업은 프랑스에서 시작된다. 2008년부터 2010년까지 그는 ESAH
                        Gallery에서 페인팅·설치·영상 작업을 선보였고, 2010년 항구 도시 르아브르에
                        자리한 미술·디자인 학교 L&apos;École Supérieure d&apos;Art et Design Le
                        Havre-Rouen에서 순수미술 학사(DNAP)를 취득했다.
                      </p>
                      <p>
                        이 초기 시기는 스튜디오 안에만 머물지 않았다. 2010년 그는 르아브르의 옛
                        요새에 조성된 매달린 정원 Jardin suspendu au Havre에서 열린 단체전 〈Art and
                        Nature〉에 참여하며, 작업을 풍경과 대화시켰다. 만들어진 이미지와 살아 있는
                        환경 사이에 작업을 놓으려는 감각은 이후로도 이어진다.
                      </p>
                      <p>
                        한국으로 돌아온 그는 홍익대학교 일반대학원 회화과에서 작업을 이어갔다.
                        프랑스의 항구 도시와 서울의 회화과라는 두 맥락은, 하나의 매체나 하나의
                        장소에 정착하지 않는 작업의 이중 뿌리를 이룬다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Passing과 Passage */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Passing and Passage — the two words that name the work'
                    : 'Passing과 Passage — 작업을 이름 짓는 두 단어'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Two English words recur across Park Ji-hye&apos;s exhibition history:{' '}
                        <em>Passing</em> and <em>Passage</em>. In 2013 her solo exhibition{' '}
                        <em>Passing</em> opened at Gallery Seven in the Hangaram Art Museum; in 2014
                        she returned to the same museum with both <em>Passing</em> (at Art Seoul)
                        and <em>Passage</em> (at Gallery Seven), alongside her master&apos;s thesis
                        exhibition.
                      </p>
                      <p>
                        The pairing is deliberate.{' '}
                        <strong className="font-bold text-charcoal-deep">Passing</strong> is the
                        sense of moving through a threshold — the moment of crossing a boundary.{' '}
                        <strong className="font-bold text-charcoal-deep">Passage</strong> is both
                        the passing-over into another state and the corridor that makes it possible.
                        The titles do not describe a fixed subject so much as a sustained attention
                        to transition itself.
                      </p>
                      <p>
                        Read together, the two exhibitions propose that an image is less a
                        destination than a place one moves through — a way station rather than an
                        endpoint. That proposition would later make the move from canvas to digital
                        media feel less like a break than a continuation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박지혜의 전시 이력을 가로질러 두 영어 단어가 반복된다: <em>Passing</em>과{' '}
                        <em>Passage</em>. 2013년 한가람미술관 갤러리 세븐에서 개인전 〈Passing〉이
                        열렸고, 2014년 그는 같은 미술관으로 돌아와 〈Passing〉(아트서울)과
                        〈Passage〉(갤러리 세븐)를 석사학위청구전과 함께 선보였다.
                      </p>
                      <p>
                        이 짝지음은 의도적이다.{' '}
                        <strong className="font-bold text-charcoal-deep">Passing</strong>은 문턱을
                        통과하는 감각 — 경계를 가로지르는 순간이다.{' '}
                        <strong className="font-bold text-charcoal-deep">Passage</strong>는 다른
                        상태로 이행함인 동시에, 그것을 가능하게 하는 통로이기도 하다. 두 제목은
                        고정된 주제를 묘사한다기보다, 이행 그 자체에 대한 지속적 주목을 가리킨다.
                      </p>
                      <p>
                        두 전시를 함께 읽으면, 이미지란 도달점이라기보다 통과해 지나가는 장소 —
                        종착지가 아니라 경유지라는 제안이 떠오른다. 이 제안은 훗날 캔버스에서 디지털
                        매체로의 이동을 단절이 아닌 연속으로 느끼게 한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 회화에서 AI디자인으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From painting to AI design — extending the field'
                    : '회화에서 AI디자인으로 — 장을 넓히다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Ji-hye&apos;s recent trajectory carries the logic of <em>passage</em>
                        into her own working method. Having completed her master&apos;s (2015) and
                        doctorate (2025) in painting at Hongik University, she enrolled in 2024 in
                        the doctoral program of the AI Design Lab at Kookmin University&apos;s
                        Graduate School of Techno Design.
                      </p>
                      <p>
                        Her 2024 solo exhibition <em>Visual Dialogue</em>, at the Hongik University
                        Museum of Contemporary Art, stages this crossing directly. Painting is set
                        in conversation with digital tools; the canvas and the screen are treated as
                        a single field of flow rather than opposing camps. The same year she joined
                        group exhibitions including the Asian Young Artists Exhibition at the Sejong
                        Center and, in 2025, <em>Reloaded</em> with the Korea Media Art Association.
                      </p>
                      <p>
                        The throughline is consistent. Whether in painting or in computational
                        media, the work attends to the moment of crossing — the threshold where one
                        state becomes another. Park Ji-hye joins this campaign not as a subject of
                        its cause but as a fellow artist in solidarity, so that emerging artists who
                        come after might cross those thresholds with less friction than they face
                        today.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박지혜의 최근 궤적은 <em>이행</em>의 논리를 자신의 작업 방법 안으로
                        끌어들인다. 홍익대학교에서 회화로 석사(2015)와 박사(2025)를 마친 그는,
                        2024년 국민대학교 테크노디자인전문대학원 AI디자인 랩 박사과정에 들어섰다.
                      </p>
                      <p>
                        2024년 홍익대학교 현대미술관에서 열린 개인전 〈시각적 대화〉는 이 횡단을
                        그대로 무대에 올린다. 회화는 디지털 도구와 대화하고, 캔버스와 화면은
                        대립하는 진영이 아니라 하나의 흐름의 장으로 다뤄진다. 같은 해 그는
                        세종문화회관 아시아청년작가전 등 단체전에 참여했고, 2025년에는
                        한국미디어아트협회의 〈Reloaded〉에 함께했다.
                      </p>
                      <p>
                        관통하는 선은 일관된다. 캔버스 위의 회화든 컴퓨팅 매체든, 작업은 가로지르는
                        순간 — 한 상태가 다른 상태가 되는 문턱에 주목한다. 박지혜는 씨앗페에 이
                        캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 뒤따르는 신진
                        예술인들이 오늘보다 적은 마찰로 그 문턱을 넘을 수 있도록.
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
                      From a port city in France to an AI design lab in Seoul, Park Ji-hye&apos;s
                      work has pursued a single sensation: the feeling of passing through, and
                      passing over. Across painting, installation, video, and digital media, the
                      threshold — not the destination — is the subject. She stands with this
                      campaign as a fellow artist in solidarity, so that others might cross more
                      freely.
                    </>
                  ) : (
                    <>
                      프랑스의 항구 도시에서 서울의 AI디자인 랩까지, 박지혜의 작업은 하나의 감각을
                      추구해 왔다: 통과하는 느낌, 그리고 이행하는 느낌. 회화·설치·영상·디지털 매체를
                      가로질러, 종착지가 아니라 문턱이 주제가 된다. 그는 동료 예술인과의 연대자로 이
                      캠페인에 함께한다 — 다른 이들이 더 자유롭게 경계를 넘을 수 있도록.
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
                PASSAGE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Park Ji-hye</span>
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
                    Park Ji-hye joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박지혜 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_JIHYE_PATH}
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
