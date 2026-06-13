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

// 거장 작가 feature는 작가 페이지(/artworks/artist/김호성)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_HOSEONG_PATH = `/artworks/artist/${encodeURIComponent('김호성')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimHoseongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김호성' ||
    n === 'kim hoseong' ||
    n === 'kim ho-seong' ||
    n === 'kim ho-sung' ||
    n.replace(/[\s-]+/g, '') === 'kimhoseong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김호성 — 먼슬리 프로젝트, 경계를 넘는 개념미술',
    description:
      '사진·영상에서 출발해 매체의 경계를 넘나드는 현대미술가 김호성. 2018~2019년 24시간 무인 갤러리를 운영하며 매달 전시한 〈먼슬리 프로젝트〉로 다양한 개념미술을 발표했고, 개인전 〈들풀은 아무렇게나 자란다〉(2025, 리각미술관)·〈이것은 전시가 아니다〉(2025, N2 ART SPACE) 등을 이어 왔다. 현대인의 욕망과 방황, 인간·예술·사회에 관한 사유를 풀어내는 김호성의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '김호성 — 사진·영상에서 출발해 매체의 경계를 넘나드는 현대미술가. 무인 갤러리 〈먼슬리 프로젝트〉로 매달 발표한 개념미술, 현대인의 욕망과 방황에 관한 사유.',
    ogAlt: '김호성 대표 작품',
    twitterTitle: '김호성',
    twitterDescription: '경계를 넘는 개념미술 — 먼슬리 프로젝트의 작가 김호성',
    keywords:
      '김호성 작가, 먼슬리 프로젝트, 개념미술, 무인 갤러리, 사진, 영상, 현대미술, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Hoseong — Monthly Project, Concept Art Across Boundaries',
    description:
      'Selected works by Kim Hoseong, a contemporary artist who began in photography and video and moves freely across the boundaries of media. From 2018 to 2019 he ran a 24-hour unmanned gallery, presenting concept art every month through the 〈Monthly Project〉, and has continued with solo exhibitions including 〈Wild Grass Grows As It Will〉 (2025, Rigak Museum of Art) and 〈This Is Not an Exhibition〉 (2025, N2 ART SPACE). View and collect his works — works that unfold reflections on the desire and wandering of modern people and on humanity, art, and society — at SAF Online.',
    ogDescription:
      'Kim Hoseong — a contemporary artist who began in photography and video and crosses the boundaries of media. Concept art presented monthly through an unmanned gallery, the 〈Monthly Project〉.',
    ogAlt: 'Kim Hoseong — featured work',
    twitterTitle: 'Kim Hoseong',
    twitterDescription: 'Concept art across boundaries — Kim Hoseong of the Monthly Project',
    keywords:
      'Kim Hoseong artist, monthly project, concept art, unmanned gallery, photography, video, Korean contemporary art',
  },
} as const;

export async function buildKimHoseongMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_HOSEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김호성');
  const artwork = allArtworks.find((a) => isKimHoseongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Hoseong`
      : `${artwork.title} — 김호성`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_HOSEONG_PATH, locale, true),
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

export default async function KimHoseongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_HOSEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김호성');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimHoseongArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Hoseong' : '김호성', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_HOSEONG_PATH}#person-kim-hoseong`,
    name: isEnglish ? 'Kim Hoseong' : '김호성',
    alternateName: isEnglish ? '김호성' : 'Kim Hoseong',
    jobTitle: isEnglish ? 'Artist' : '현대미술가',
    description: isEnglish
      ? 'Kim Hoseong is a mid-career contemporary artist who began in photography and video and moves across the boundaries of media. From 2018 to 2019 he ran a 24-hour unmanned gallery, presenting concept art every month through the 〈Monthly Project〉, and unfolds reflections on the desire and wandering of modern people and on humanity, art, and society.'
      : '김호성은 사진·영상에서 출발해 매체의 경계를 넘나드는 중견 현대미술가로, 2018~2019년 24시간 무인 갤러리를 운영하며 매달 전시한 〈먼슬리 프로젝트〉로 다양한 개념미술을 발표했고, 현대인의 욕망과 방황, 인간·예술·사회에 관한 사유를 작품으로 풀어냅니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Kyung Hee University, Dept. of History' : '경희대학교 사학과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Chung-Ang University, Dept. of Photography' : '중앙대학교 사진학과',
      },
    ],
    knowsAbout: ['Concept art', 'Photography', 'Video art', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Hoseong — SAF Online' : '김호성 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Hoseong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김호성 작품들을 소개합니다.',
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

          {/* Monthly grid 모티프 — 달력처럼 반복되는 수직선, 매달의 전시 */}
          <div className="absolute top-0 left-1/4 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-1/4 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Hoseong · concept art' : '김호성 · 개념미술'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Every month, a new question
                  <br />
                  <span className="text-primary-soft">across the boundaries of media</span>
                </>
              ) : (
                <>
                  매달 새로운 물음을
                  <br />
                  <span className="text-primary-soft">매체의 경계를 넘어</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From photography and video to an unmanned gallery open around the clock.
                  </span>
                  <span className="mt-2 block">
                    Concept art on the desire and wandering of modern people.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사진과 영상에서 24시간 무인 갤러리까지.</span>
                  <span className="mt-2 block">현대인의 욕망과 방황을 담은 개념미술.</span>
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
                    Crossing media —<br />
                    <span className="text-primary-strong">concept art, month by month</span>
                  </>
                ) : (
                  <>
                    매체를 가로질러 —<br />
                    <span className="text-primary-strong">매달의 개념미술</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Hoseong is a contemporary artist who arrived at art by an unusual route.
                      He graduated from the Department of History at Kyung Hee University, then from
                      the Department of Photography at Chung-Ang University — a path that runs from
                      the study of the past to the recording of the present.
                    </p>
                    <p>
                      In his early years he worked from a base in photography and video, taking the{' '}
                      <strong className="font-bold text-charcoal">
                        desire and wandering of modern people
                      </strong>{' '}
                      as his subject. The camera, for him, was less a tool for capturing beauty than
                      a way of looking hard at the restlessness of contemporary life.
                    </p>
                    <p>
                      From 2018 to 2019 he ran an unmanned gallery open twenty-four hours a day,
                      presenting an exhibition every month through the{' '}
                      <strong className="font-bold text-charcoal-deep">〈Monthly Project〉</strong>.
                      Across that run he released a wide range of concept art — a self-imposed
                      discipline of making and showing on a monthly rhythm, with the gallery itself
                      left open to whoever might walk in.
                    </p>
                    <p>
                      Since then he has continued to experiment across the boundaries of media,
                      unfolding reflections on humanity, art, and society as works. His recent solo
                      exhibitions — 〈Wild Grass Grows As It Will〉 (2025, Rigak Museum of Art,
                      Cheonan) and 〈This Is Not an Exhibition〉 (2025, N2 ART SPACE, Seoul) —
                      extend the same questioning, conceptual temper that the Monthly Project first
                      set in motion.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김호성은 흔치 않은 경로로 미술에 닿은 현대미술가다. 경희대학교 사학과를 졸업한
                      뒤 중앙대학교 사진학과를 졸업했다 — 지난 시간을 공부하던 자리에서 지금의
                      시간을 기록하는 자리로 옮겨온 길이다.
                    </p>
                    <p>
                      초기에 그는 사진·영상을 기반으로{' '}
                      <strong className="font-bold text-charcoal">현대인의 욕망과 방황</strong>을
                      주제로 삼았다. 그에게 카메라는 아름다움을 포착하는 도구라기보다, 동시대 삶의
                      불안과 방황을 똑바로 들여다보는 방식이었다.
                    </p>
                    <p>
                      2018년부터 2019년까지 그는 24시간 출입이 가능한 무인 갤러리를 운영하며 매달
                      전시하는{' '}
                      <strong className="font-bold text-charcoal-deep">〈먼슬리 프로젝트〉</strong>
                      를 통해 다양한 개념미술을 발표했다. 매달의 리듬으로 만들고 내거는 자기 규율,
                      그리고 누구든 들어올 수 있도록 열어둔 갤러리 — 그 운영 자체가 작업의 일부였다.
                    </p>
                    <p>
                      이후에도 그는 매체의 경계를 넘나드는 실험을 지속하며 인간·예술·사회에 관한
                      사유를 작품으로 풀어내고 있다. 최근의 개인전 〈들풀은 아무렇게나
                      자란다〉(2025, 리각미술관, 천안)·〈이것은 전시가 아니다〉(2025, N2 ART SPACE,
                      서울)는 먼슬리 프로젝트가 먼저 열어둔 묻고 또 묻는 개념적 태도를 이어 간다.
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
                        {isEnglish ? 'The Monthly Project' : '먼슬리 프로젝트'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A 24-hour unmanned gallery (2018–2019) where he presented a new exhibition every month — a sustained practice of concept art on a monthly rhythm.'
                          : '24시간 무인 갤러리(2018~2019)에서 매달 새 전시를 발표한 작업. 매달의 리듬으로 이어 간 개념미술의 실천.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Crossing media' : '매체의 경계 넘기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Beginning in photography and video, he moves freely across the boundaries of media — refusing to settle into a single form.'
                          : '사진·영상에서 출발해 매체의 경계를 넘나드는 실험. 하나의 형식에 머물지 않는 태도.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Desire and wandering' : '욕망과 방황의 사유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The desire and wandering of modern people, and reflection on humanity, art, and society — the recurring questions his work keeps returning to.'
                          : '현대인의 욕망과 방황, 그리고 인간·예술·사회에 관한 사유. 그의 작업이 거듭 되돌아가는 물음들이다.'}
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
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'B.A. in History, Kyung Hee University; B.F.A. in Photography, Chung-Ang University.'
                        : '경희대학교 사학과 졸업, 중앙대학교 사진학과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Busan International Video Art Festival, Busan Museum of Art.'
                        : '부산국제비디오아트페스티벌, 부산시립미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Animamix Biennale, Daegu Art Museum; 〈Stars of the World〉, Hangaram Art Museum, Seoul Arts Center.'
                        : '애니마믹 비엔날레, 대구미술관; 〈세계의 스타전〉, 예술의전당 한가람미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Seen vs Shown〉, Korean Cultural Center, Washington, D.C., USA; 〈Hello Media Art〉, kt sangsang madang.'
                        : '〈Seen vs Shown〉, 워싱턴 한국문화원(미국); 〈Hello Media Art〉, kt 상상마당.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Runs a 24-hour unmanned gallery, presenting concept art monthly through the 〈Monthly Project〉 (through 2019).'
                        : '24시간 무인 갤러리 운영, 〈먼슬리 프로젝트〉로 매달 개념미술 발표(~2019).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Surface of Time〉, CICA Museum, Gyeonggi.'
                        : '개인전 〈시간의 표면〉, CICA미술관, 경기.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Donggang International Photo Festival open call, Donggang Museum of Photography; 〈Beyond the Journey〉, KTX 20th anniversary, Culture Station Seoul 284.'
                        : '동강사진축제 국제공모전, 동강사진박물관; KTX 20주년 전시 〈여정 그 너머〉, 문화역284.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Wild Grass Grows As It Will〉 (Rigak Museum of Art, Cheonan) and 〈This Is Not an Exhibition〉 (N2 ART SPACE, Seoul).'
                        : '개인전 〈들풀은 아무렇게나 자란다〉(리각미술관, 천안)·〈이것은 전시가 아니다〉(N2 ART SPACE, 서울).'}
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
                        ? 'Solo: 〈Wild Grass Grows As It Will〉, Rigak Museum of Art, Cheonan (2025); 〈This Is Not an Exhibition〉, N2 ART SPACE, Seoul (2025)'
                        : '개인전: 〈들풀은 아무렇게나 자란다〉, 리각미술관, 천안 (2025); 〈이것은 전시가 아니다〉, N2 ART SPACE, 서울 (2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈The Surface of Time〉, CICA Museum, Gyeonggi (2023)'
                        : '개인전: 〈시간의 표면〉, CICA미술관, 경기 (2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Donggang International Photo Festival open call, Donggang Museum of Photography (2024); 〈Beyond the Journey〉, KTX 20th anniversary, Culture Station Seoul 284 (2024)'
                        : '단체전: 동강사진축제 국제공모전, 동강사진박물관 (2024); KTX 20주년 전시 〈여정 그 너머〉, 문화역284 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈Seen vs Shown〉, Korean Cultural Center, Washington, D.C., USA (2016); 〈Hello Media Art〉, kt sangsang madang (2016)'
                        : '단체전: 〈Seen vs Shown〉, 워싱턴 한국문화원(미국) (2016); 〈Hello Media Art〉, kt 상상마당 (2016)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Animamix Biennale, Daegu Art Museum (2013); 〈Stars of the World〉, Hangaram Art Museum, Seoul Arts Center (2013); Busan International Video Art Festival, Busan Museum of Art (2012)'
                        : '단체전: 애니마믹 비엔날레, 대구미술관 (2013); 〈세계의 스타전〉, 예술의전당 한가람미술관 (2013); 부산국제비디오아트페스티벌, 부산시립미술관 (2012)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 개념적·실험적 톤, charcoal 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its restlessness</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 끊임없는 물음에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 사학과 사진학을 거쳐 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From history to photography — an unusual route'
                    : '사학과 사진학을 거쳐 — 흔치 않은 경로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Hoseong did not arrive at contemporary art by the usual studio route. He
                        first studied history at Kyung Hee University, then photography at Chung-Ang
                        University. The two fields share a quiet logic: history is the discipline of
                        reading what has already happened; photography is the discipline of fixing
                        what is happening now.
                      </p>
                      <p>
                        That double training shows in the temper of his work. His early photography
                        and video took the <em>desire and wandering of modern people</em> as subject
                        — not as documentary record but as a way of looking hard at the restlessness
                        of contemporary life. The camera was a lens for examining the present as if
                        it were already a kind of history.
                      </p>
                      <p>
                        From there his practice opened outward, refusing to settle into a single
                        medium. What began with the photographic image became a wider field of
                        concept art — a movement from recording toward questioning.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김호성은 통상의 스튜디오 경로로 현대미술에 닿지 않았다. 그는 경희대학교에서
                        사학을, 이어 중앙대학교에서 사진학을 공부했다. 두 분야에는 조용한 공통의
                        논리가 있다 — 역사는 이미 일어난 일을 읽는 학문이고, 사진은 지금 일어나는
                        일을 붙드는 학문이다.
                      </p>
                      <p>
                        그 이중의 훈련은 작업의 기질로 드러난다. 초기의 사진·영상은{' '}
                        <em>현대인의 욕망과 방황</em>을 주제로 삼았다 — 기록을 위한 다큐멘터리가
                        아니라, 동시대 삶의 불안을 똑바로 들여다보는 방식으로. 카메라는 지금 이
                        순간을, 마치 이미 일종의 역사인 것처럼 들여다보는 렌즈였다.
                      </p>
                      <p>
                        거기서부터 그의 작업은 하나의 매체에 머물기를 거부하며 바깥으로 열렸다. 사진
                        이미지에서 시작한 것이 더 넓은 개념미술의 장으로 번져 갔다 — 기록에서
                        물음으로의 이동.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 먼슬리 프로젝트 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The Monthly Project — a gallery that never closes'
                    : '먼슬리 프로젝트 — 닫히지 않는 갤러리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Between 2018 and 2019, Kim Hoseong ran a gallery that was open twenty-four
                        hours a day and had no attendant — an unmanned space anyone could enter at
                        any hour. There, every month, he mounted a new exhibition under the title{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈Monthly Project〉
                        </strong>
                        .
                      </p>
                      <p>
                        The structure was itself a concept. A monthly cadence is a discipline: it
                        leaves no room to wait for the perfect work, and forces making and showing
                        into a continuous rhythm. The unmanned, always-open gallery removed the
                        usual thresholds of art — opening hours, a watching attendant, a fixed
                        audience — and left the work to meet whoever happened to arrive.
                      </p>
                      <p>
                        Across that run he presented a wide range of concept art. The Monthly
                        Project reads less as a series of separate shows than as a single sustained
                        gesture: the act of keeping a space and a practice open, month after month,
                        as a form in its own right.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2018년부터 2019년까지, 김호성은 24시간 열려 있고 관리자가 없는 갤러리를
                        운영했다 — 누구든 어느 시각에나 들어올 수 있는 무인 공간이다. 그곳에서 그는
                        매달 새 전시를{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈먼슬리 프로젝트〉
                        </strong>
                        라는 이름으로 열었다.
                      </p>
                      <p>
                        그 구조 자체가 하나의 개념이었다. 매달의 주기는 규율이다 — 완벽한 작품을
                        기다릴 여지를 두지 않고, 만들고 내거는 일을 끊임없는 리듬 속으로 밀어
                        넣는다. 무인의, 늘 열려 있는 갤러리는 미술의 통상적 문턱 — 운영 시간,
                        지켜보는 관리자, 정해진 관객 — 을 걷어내고, 작품을 마침 그 자리에 닿은 이와
                        만나게 했다.
                      </p>
                      <p>
                        그 기간 동안 그는 다양한 개념미술을 발표했다. 먼슬리 프로젝트는 별개의 전시
                        여러 개라기보다, 하나의 지속된 몸짓으로 읽힌다 — 공간과 작업을 매달 열어두는
                        그 행위 자체가 하나의 형식인 것이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 매체의 경계를 넘어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Across the boundaries — humanity, art, society'
                    : '경계를 넘어 — 인간·예술·사회'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        After the Monthly Project, Kim Hoseong has continued to experiment across
                        the boundaries of media, unfolding reflections on humanity, art, and society
                        as works. Rather than mastering one form, he treats each medium as a
                        question to be tested and then left behind.
                      </p>
                      <p>
                        His recent solo exhibitions carry that conceptual temper in their very
                        titles. 〈This Is Not an Exhibition〉 (2025, N2 ART SPACE) turns the frame
                        of the show back on itself; 〈Wild Grass Grows As It Will〉 (2025, Rigak
                        Museum of Art) lets an image of unruly growth stand for a way of working
                        that resists being tidied into a single line.
                      </p>
                      <p>
                        Across photography, video, and the concept works between them, the through
                        line is a refusal to settle — a practice that keeps asking what art is, who
                        it is for, and how a single person might keep making, month after month,
                        without waiting for permission. He joins this campaign not as a subject of
                        its cause but as a fellow artist in solidarity.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        먼슬리 프로젝트 이후에도 김호성은 매체의 경계를 넘나드는 실험을 지속하며
                        인간·예술·사회에 관한 사유를 작품으로 풀어내고 있다. 하나의 형식을 완성하기
                        보다, 매체 각각을 시험해 보고는 뒤로 두고 떠나는 물음으로 다룬다.
                      </p>
                      <p>
                        최근의 개인전들은 그 개념적 태도를 제목에서부터 품고 있다. 〈이것은 전시가
                        아니다〉(2025, N2 ART SPACE)는 전시라는 틀 자체를 되돌려 묻고, 〈들풀은
                        아무렇게나 자란다〉(2025, 리각미술관)는 제멋대로 자라는 들풀의 이미지로
                        하나의 선으로 정돈되기를 거부하는 작업의 방식을 대신한다.
                      </p>
                      <p>
                        사진과 영상, 그리고 그 사이의 개념 작업을 가로지르며 일관된 한 줄기는
                        머무르기를 거부하는 태도다 — 예술이 무엇인지, 누구를 위한 것인지, 한 사람이
                        허락을 기다리지 않고 어떻게 매달 계속 만들 수 있는지를 거듭 묻는 작업. 그는
                        씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                        함께한다.
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
                      From a 24-hour unmanned gallery to exhibitions that question the very idea of
                      an exhibition, Kim Hoseong&apos;s work pursues a single restlessness: to keep
                      crossing the boundaries of media, and to keep asking what art and society owe
                      each other. He stands with this campaign as a fellow artist in solidarity — so
                      that those who come after might keep making without waiting for permission.
                    </>
                  ) : (
                    <>
                      24시간 무인 갤러리에서 전시라는 관념 자체를 묻는 전시까지, 김호성의 작업은
                      하나의 끊임없음을 추구한다 — 매체의 경계를 계속 넘고, 예술과 사회가 서로에게
                      무엇을 빚지는지를 거듭 묻는 일. 그는 동료 예술인과의 연대자로서 이 캠페인에
                      함께한다 — 다음 세대의 예술인들이 허락을 기다리지 않고 계속 만들 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Hoseong</span>
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
                    Kim Hoseong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김호성 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_HOSEONG_PATH}
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
