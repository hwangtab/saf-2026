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

// 거장 작가 feature는 작가 페이지(/artworks/artist/최혜수)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHOE_HYESU_PATH = `/artworks/artist/${encodeURIComponent('최혜수')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isChoeHyesuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '최혜수' ||
    n === 'choe hyesu' ||
    n === 'choi hyesu' ||
    n.replace(/[\s-]+/g, '') === 'choehyesu' ||
    n.replace(/[\s-]+/g, '') === 'choihyesu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '최혜수 — 자취의 기록, 유한한 생의 관찰',
    description:
      '조각 기반의 시각 예술가 최혜수. 인간 존재와 삶의 의미를 묻고, 유한한 생을 관찰하며 재해석한다. 반복되는 일상 속 충만과 결핍, 연결과 단절을 기록하는 사색의 작업. 벨기에·프랑스에서 수학한 조각가 최혜수의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '최혜수 — 조각 기반의 시각 예술가. 유한한 생을 관찰·재해석하며 충만과 결핍, 연결과 단절을 기록하는 사색의 작업.',
    ogAlt: '최혜수 대표 작품',
    twitterTitle: '최혜수',
    twitterDescription: '자취의 기록 — 유한한 생을 관찰하는 조각가 최혜수',
    keywords: '최혜수 작가, 조각, 시각예술, 존재론, 자취의 기록, 동시대 미술, 씨앗페 온라인',
  },
  en: {
    title: 'Choe Hyesu — Records of a Trace, Observing a Finite Life',
    description:
      'Selected works by Choe Hyesu, a sculpture-based visual artist. She questions human existence and the meaning of life, observing and reinterpreting our finite span, recording the fullness and lack, the connection and disconnection of repeated days. Having studied in Belgium and France, she invites viewers to reflect on their own being and journey. View and collect her works at SAF Online.',
    ogDescription:
      'Choe Hyesu — a sculpture-based visual artist who observes and reinterprets a finite life, recording fullness and lack, connection and disconnection.',
    ogAlt: 'Choe Hyesu — featured work',
    twitterTitle: 'Choe Hyesu',
    twitterDescription: 'Records of a trace — sculptor Choe Hyesu, observing a finite life',
    keywords:
      'Choe Hyesu artist, sculpture, visual art, existence, contemporary art, Korean sculpture',
  },
} as const;

export async function buildChoeHyesuMetadata({
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
  const pageUrl = buildLocaleUrl(CHOE_HYESU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('최혜수');
  const artwork = allArtworks.find((a) => isChoeHyesuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Choe Hyesu`
      : `${artwork.title} — 최혜수`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHOE_HYESU_PATH, locale, true),
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

export default async function ChoeHyesuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHOE_HYESU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('최혜수');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isChoeHyesuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Choe Hyesu' : '최혜수', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHOE_HYESU_PATH}#person-choe-hyesu`,
    name: isEnglish ? 'Choe Hyesu' : '최혜수',
    alternateName: isEnglish ? '최혜수' : 'Choe Hyesu',
    jobTitle: isEnglish ? 'Visual artist' : '시각 예술가',
    description: isEnglish
      ? 'Choe Hyesu is a sculpture-based visual artist who questions human existence and the meaning of life, observing and reinterpreting our finite span and recording the fullness and lack, the connection and disconnection of everyday life.'
      : '최혜수는 인간 존재와 삶의 의미를 묻고, 유한한 생을 관찰·재해석하며 반복되는 일상 속 충만과 결핍, 연결과 단절을 기록하는 조각 기반의 시각 예술가입니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Royal Academy of Fine Arts, Brussels (Sculpture)'
          : '벨기에 브뤼셀 왕립 미술대학교 조각과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Beaux-Arts de Toulon, France' : '프랑스 뚤롱 보자르 예술학부',
      },
    ],
    knowsAbout: ['Sculpture', 'Visual art', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Choe Hyesu — SAF Online' : '최혜수 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Choe Hyesu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 최혜수 작품들을 소개합니다.',
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

          {/* Quiet horizontal strata — 유한한 생의 지층/명상 모티프 */}
          <div className="absolute left-0 right-0 top-1/3 h-px bg-white/10" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/20" />
          <div className="absolute left-0 right-0 top-2/3 h-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Choe Hyesu · sculpture' : '최혜수 · 조각'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A finite life,
                  <br />
                  <span className="text-primary-soft">observed and recorded</span>
                </>
              ) : (
                <>
                  유한한 생을
                  <br />
                  <span className="text-primary-soft">관찰하고 기록하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Fullness and lack, connection and disconnection — in the repetition of days.
                  </span>
                  <span className="mt-2 block">
                    A sculptor&apos;s meditation on existence and the meaning of life.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">반복되는 일상 속 충만과 결핍, 연결과 단절.</span>
                  <span className="mt-2 block">존재와 삶의 의미를 향한 조각가의 사색.</span>
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
                    Records of a trace —<br />
                    <span className="text-primary-strong">the observation of a finite life</span>
                  </>
                ) : (
                  <>
                    자취의 기록 —<br />
                    <span className="text-primary-strong">유한한 생의 관찰</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Choe Hyesu is a sculpture-based visual artist whose work records questions
                      about human existence and the meaning of life. Her practice begins from a
                      single, persistent attention: the fact that a life is finite, and that this
                      finitude is what gives it weight.
                    </p>
                    <p>
                      She observes and reinterprets that finite span. Within the repetition of
                      ordinary days, she traces the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        fullness and the lack, the connection and the disconnection
                      </strong>{' '}
                      that move quietly beneath the surface of living. The work does not announce;
                      it attends.
                    </p>
                    <p>
                      Her formation crossed borders. She earned a Bachelor&apos;s degree (DNAP) from
                      the Beaux-Arts faculty in Toulon, France (2015), then a Bachelor&apos;s (2016)
                      and a Master&apos;s (2019) in Sculpture from the Royal Academy of Fine Arts in
                      Brussels, Belgium. That European training in sculpture grounds the material
                      patience of her work.
                    </p>
                    <p>
                      Through these means she invites the viewer toward reflection — to consider
                      one&apos;s own existence and the journey of one&apos;s own life. The work is
                      less a statement than a space cleared for that quiet act of looking inward.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      최혜수는 인간 존재와 삶의 의미에 대한 질문을 기록하는 조각 기반의 시각
                      예술가다. 그의 작업은 하나의 끈질긴 주의에서 출발한다 — 생이 유한하다는 사실,
                      그리고 그 유한함이야말로 생에 무게를 부여한다는 것.
                    </p>
                    <p>
                      그는 그 유한한 생을 관찰하고 재해석한다. 반복되는 일상 속에서, 살아감의 표면
                      아래로 조용히 흐르는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        충만과 결핍, 연결과 단절
                      </strong>
                      을 더듬는다. 작업은 선언하지 않는다. 다만 주의를 기울인다.
                    </p>
                    <p>
                      그의 수학(修學)은 국경을 넘나들었다. 2015년 프랑스 뚤롱 보자르 예술학부에서
                      학사(DNAP)를 마치고, 이후 벨기에 브뤼셀 왕립 미술대학교 조각과에서
                      학사(2016)와 석사(2019)를 취득했다. 유럽에서 다진 조각 수련은 그의 작업이 지닌
                      재료적 인내의 바탕이 된다.
                    </p>
                    <p>
                      이러한 작업을 통해 그는 관객을 성찰로 이끈다 — 자신의 존재와 자기 삶의 여정을
                      돌아보도록. 작업은 진술이라기보다, 그 조용한 내면의 응시를 위해 비워 둔 공간에
                      가깝다.
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
                        {isEnglish ? 'A finite life' : '유한한 생'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'She observes and reinterprets the finite span of a life, attending to the weight that finitude gives to existence.'
                          : '유한한 생을 관찰하고 재해석하며, 그 유한함이 존재에 부여하는 무게에 주의를 기울인다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Fullness and lack' : '충만과 결핍'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Within the repetition of everyday days, she records the fullness and the lack, the connection and the disconnection that move beneath the surface.'
                          : '반복되는 일상 속에서, 표면 아래로 흐르는 충만과 결핍, 연결과 단절을 기록한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'An invitation to reflect' : '성찰로의 초대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The work invites the viewer to reflect on their own existence and the journey of their own life.'
                          : '작업은 관객이 자신의 존재와 자기 삶의 여정을 성찰하도록 이끈다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Education & awards' : '학력 및 수상'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Angeli Museum Award' : '안젤리미술관상 수상'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected, Nowon Cultural Foundation Gyeongchunseon Forest Trail Gallery visual-arts exhibition support'
                        : '노원문화재단 경춘선숲길 갤러리 시각예술 전시지원 선정'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Selected, Porsche Korea 'Dreamers. On Art Award'; Award of Excellence, 7th Gasong Art Prize (Dong Wha Pharm Gasong Foundation)"
                        : '포르쉐 코리아 ‘드리머스 온 아트 어워드’ 선정; 제7회 가송예술상 우수상(동화약품 가송재단)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MFA in Sculpture, Royal Academy of Fine Arts, Brussels, Belgium'
                        : '벨기에 브뤼셀 왕립 미술대학교 조각과 석사'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Selected, 'Young Belgian Talents' (Affordable Art Fair Brussels)"
                        : '‘Young Belgian Talents’ 선정 (Affordable Art Fair Brussels)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BFA in Sculpture, Royal Academy of Fine Arts, Brussels, Belgium'
                        : '벨기에 브뤼셀 왕립 미술대학교 조각과 학사'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BFA (DNAP), Beaux-Arts faculty, Toulon, France'
                        : '프랑스 뚤롱 보자르 예술학부 학사(DNAP)'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈Records of a Trace n&apos;1〉 (CICA Museum, Gimpo, 2023)'
                        : '개인전: 〈자취의 기록 n&apos;1〉 (CICA미술관, 김포, 2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Drawing Now 2024 (CICA Museum); 19th Gwanghwamun International Art Festival (Sejong Center Museum); AAC The Beautiful Companion (Angeli Museum), 2024'
                        : '단체전: Drawing now 2024 (CICA미술관); 제19회 광화문국제아트페스티벌 (세종문화회관미술관); AAC 아름다운 동행 (안젤리미술관), 2024'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: Gwangju Design Biennale Dreamers.On (Porsche Korea, 2021); exhibitions in Belgium and France (Brussels, Paris, Cachan Biennale, and others)'
                        : '단체전: 광주디자인비엔날레 Dreamers.On (포르쉐 코리아, 2021); 벨기에·프랑스 다수 (브뤼셀·파리·까샹 비엔날레 등)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Collection: Dong Wha Pharm' : '소장: 동화약품'}
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
                  <span className="text-charcoal-deep">on finitude, the everyday, and looking</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">유한함과 일상, 그리고 응시에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 조각이라는 시간 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Sculpture as time — material patience'
                    : '조각이라는 시간 — 재료의 인내'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Sculpture is among the slowest of the arts. It resists speed: a form has to
                        be carried in the hands, turned, weighed, returned to. Choe Hyesu was
                        trained in this slowness — first in Toulon, then across years of study in
                        Brussels, where she completed both her bachelor&apos;s and master&apos;s
                        degrees in sculpture.
                      </p>
                      <p>
                        That training shows less as style than as temperament. Her work carries the
                        patience of a maker who has spent a long time with material, who understands
                        that a finite thing — a body, a day, a life — is exactly the kind of thing
                        worth attending to. Finitude is not a loss in her practice; it is the
                        condition that makes attention possible.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        조각은 가장 느린 예술에 속한다. 그것은 속도에 저항한다. 형태는 손에 들려야
                        하고, 돌려 보고, 무게를 가늠하고, 다시 돌아와야 한다. 최혜수는 이 느림
                        속에서 훈련받았다 — 처음은 뚤롱에서, 이후 브뤼셀에서 보낸 여러 해 동안.
                        그곳에서 그는 조각으로 학사와 석사를 모두 마쳤다.
                      </p>
                      <p>
                        그 수련은 양식이라기보다 기질로 드러난다. 그의 작업은 재료와 오랜 시간을
                        보낸 제작자의 인내를 품는다 — 유한한 것이, 즉 하나의 몸, 하루, 한 생이야말로
                        주의를 기울일 만한 것임을 아는 사람의 인내. 그의 작업에서 유한함은 상실이
                        아니다. 그것은 주의를 가능하게 하는 조건이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 자취의 기록 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Records of a trace — the everyday as material'
                    : '자취의 기록 — 재료가 되는 일상'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her 2023 solo exhibition at the CICA Museum took the title{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈Records of a Trace n&apos;1〉
                        </strong>
                        . The word <em>trace</em> is exact: what remains after something has passed.
                        Her subject is not the dramatic event but the residue of ordinary living —
                        the marks a finite life leaves behind in its repetitions.
                      </p>
                      <p>
                        Within those repetitions she finds a quiet polarity:{' '}
                        <strong className="font-bold text-charcoal">
                          fullness and lack, connection and disconnection
                        </strong>
                        . A day can hold both at once. The work does not resolve the tension; it
                        records it, the way a trace records a presence that is no longer there. To
                        record, here, is itself a form of care.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2023년 CICA미술관에서 연 개인전의 제목은{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈자취의 기록 n&apos;1〉
                        </strong>
                        이었다. <em>자취</em>라는 말은 정확하다 — 무언가 지나간 뒤에 남는 것. 그의
                        주제는 극적인 사건이 아니라 평범한 살아감의 잔여다. 유한한 생이 반복 속에
                        남기는 흔적들.
                      </p>
                      <p>
                        그 반복 속에서 그는 조용한 양극을 발견한다 —{' '}
                        <strong className="font-bold text-charcoal">
                          충만과 결핍, 연결과 단절
                        </strong>
                        . 하루는 둘을 동시에 품을 수 있다. 작업은 그 긴장을 해소하지 않는다. 다만
                        그것을 기록한다 — 자취가 더는 그곳에 없는 현존을 기록하듯이. 여기서
                        기록한다는 것은 그 자체로 하나의 돌봄이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 관객을 향한 응시 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'A space for looking inward' : '내면을 향한 응시의 공간'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        What the work asks of the viewer is unusually open. It does not deliver a
                        message to be decoded. Instead it clears a space — and invites the person
                        standing before it to reflect on their own existence and the journey of
                        their own life.
                      </p>
                      <p>
                        This is the quiet ambition beneath the meditative surface. The questions she
                        carries — about human existence, about the meaning of a finite life — are
                        not hers to answer alone. The work hands them across. Studying in Belgium
                        and France, then returning to make and to show here, she has built a
                        practice whose final material is the viewer&apos;s own attention.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        작업이 관객에게 요구하는 것은 유난히 열려 있다. 그것은 해독해야 할 메시지를
                        건네지 않는다. 대신 하나의 공간을 비운다 — 그리고 그 앞에 선 사람에게 자신의
                        존재와 자기 삶의 여정을 성찰하도록 청한다.
                      </p>
                      <p>
                        이것이 명상적 표면 아래 놓인 조용한 야심이다. 그가 품은 물음들 — 인간 존재에
                        관한, 유한한 생의 의미에 관한 — 은 혼자 답할 수 있는 것이 아니다. 작업은
                        그것을 건너편으로 건넨다. 벨기에와 프랑스에서 수학하고 이곳으로 돌아와
                        만들고 보여 주며, 그는 마지막 재료가 관객 자신의 주의인 작업을 구축해 왔다.
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
                      From the slow patience of sculpture to the quiet record of a trace, Choe
                      Hyesu&apos;s work pursues a single question: how does one attend to a finite
                      life without looking away? She joins this campaign not as a subject of its
                      cause but as a fellow artist in solidarity — offering her work so that those
                      navigating financial exclusion today might find a way through.
                    </>
                  ) : (
                    <>
                      조각의 느린 인내에서 자취의 조용한 기록까지, 최혜수의 작업은 하나의 물음을
                      추구한다: 유한한 생을, 외면하지 않고 어떻게 응시할 것인가. 그는 씨앗페에 이
                      캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 오늘 금융
                      차별을 헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의 작품을 내놓는다.
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
                TRACE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Choe Hyesu</span>
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
                    Choe Hyesu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    최혜수 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHOE_HYESU_PATH}
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
