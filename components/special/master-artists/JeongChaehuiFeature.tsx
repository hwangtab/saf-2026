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

// 거장 작가 feature는 작가 페이지(/artworks/artist/정채희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JEONG_CHAEHUI_PATH = `/artworks/artist/${encodeURIComponent('정채희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongChaehuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정채희' ||
    n === 'jeong chaehui' ||
    n === 'jeong chae-hui' ||
    n.replace(/[\s-]+/g, '') === 'jeongchaehui'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정채희 — 옻칠로 그린 심상의 풍경',
    description:
      '옻칠화가 정채희(丁彩僖). 서울대 회화에서 북경 벽화로, 다시 옻칠로 이어진 동양 전통 기법의 천착. 칠화·칠벽화를 주된 재료로 천연 재료의 깊은 물성과 심상의 풍경을 담아온 중견 작가의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '옻칠화가 정채희. 서울대 회화·북경 벽화를 거쳐 옻칠에 천착한 중견 작가 — 천연 재료의 깊은 물성으로 심상의 풍경을 그린다.',
    ogAlt: '정채희 대표 작품',
    twitterTitle: '정채희',
    twitterDescription: '옻칠로 그린 심상의 풍경 — 옻칠화가 정채희',
    keywords: '정채희 작가, 옻칠화, 칠화, 칠벽화, 옻칠, 동양 전통 기법, 벽화, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Chaehui — Landscapes of the Mind in Lacquer',
    description:
      'Selected works by lacquer painter Jeong Chaehui (丁彩僖). From painting at Seoul National University to mural studies in Beijing, and onward to lacquer — a sustained pursuit of East Asian traditional technique. A mid-career artist who renders inner landscapes through the deep materiality of natural lacquer (chilhwa, lacquer murals). View and collect her works at SAF Online.',
    ogDescription:
      'Jeong Chaehui — lacquer painter. From Seoul National University painting through Beijing murals to lacquer, she renders landscapes of the mind in the deep materiality of natural lacquer.',
    ogAlt: 'Jeong Chaehui — featured work',
    twitterTitle: 'Jeong Chaehui',
    twitterDescription: 'Landscapes of the mind in lacquer — painter Jeong Chaehui',
    keywords:
      'Jeong Chaehui artist, lacquer painting, chilhwa, lacquer mural, ottchil, East Asian technique',
  },
} as const;

export async function buildJeongChaehuiMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_CHAEHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정채희');
  const artwork = allArtworks.find((a) => isJeongChaehuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Chaehui`
      : `${artwork.title} — 정채희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_CHAEHUI_PATH, locale, true),
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

export default async function JeongChaehuiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_CHAEHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정채희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJeongChaehuiArtist(artwork.artist)
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
    { name: isEnglish ? 'Jeong Chaehui' : '정채희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_CHAEHUI_PATH}#person-jeong-chaehui`,
    name: isEnglish ? 'Jeong Chaehui' : '정채희',
    alternateName: isEnglish ? '정채희' : 'Jeong Chaehui',
    jobTitle: isEnglish ? 'Lacquer Painter' : '옻칠화가',
    description: isEnglish
      ? 'Jeong Chaehui is a mid-career Korean lacquer painter who, after studying painting at Seoul National University and murals in Beijing, has devoted her practice to lacquer (chilhwa and lacquer murals), rendering inner landscapes through the deep materiality of natural lacquer.'
      : '정채희는 서울대 회화와 북경 벽화를 거쳐 옻칠(칠화·칠벽화)에 천착해 온 중견 옻칠화가로, 천연 재료의 깊은 물성으로 심상의 풍경을 그립니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Seoul National University, College of Fine Arts (Painting)'
          : '서울대학교 미술대학 회화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Central Academy of Fine Arts, Beijing (Mural Painting, MFA)'
          : '중국 북경 중앙미술학원 대학원 벽화 전공',
      },
    ],
    knowsAbout: isEnglish
      ? ['Lacquer painting', 'Lacquer murals', 'East Asian traditional materials and technique']
      : ['옻칠화', '칠벽화', '동양 전통 재료·기법'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Chaehui — SAF Online' : '정채희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Chaehui from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 정채희 작품을 소개합니다.',
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

          {/* Vertical strata lines — 옻칠 층위 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Chaehui · Lacquer Painter' : '정채희 · 옻칠화가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Landscapes of the mind,
                  <br />
                  <span className="text-primary-soft">drawn in lacquer</span>
                </>
              ) : (
                <>
                  심상의 풍경을
                  <br />
                  <span className="text-primary-soft">옻칠로 그리다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From painting at Seoul National University to murals in Beijing.
                  </span>
                  <span className="mt-2 block">
                    A sustained pursuit of East Asian technique that returns, in the end, to
                    lacquer.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">서울대 회화에서 북경 벽화로.</span>
                  <span className="mt-2 block">
                    동양 전통 기법의 천착이 끝내 옻칠로 돌아온 자리.
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
                    A path traced through technique —<br />
                    <span className="text-primary-strong">painting, murals, and lacquer</span>
                  </>
                ) : (
                  <>
                    기법을 따라 그린 길 —<br />
                    <span className="text-primary-strong">회화에서 벽화로, 다시 옻칠로</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Chaehui (丁彩僖) graduated from the College of Fine Arts at Seoul
                      National University, where she majored in Western painting, and went on to
                      complete a graduate degree in mural painting at the Central Academy of Fine
                      Arts in Beijing. Drawn to the artistic values of East Asia, she undertook a
                      long study of traditional materials and techniques, visiting old temples and
                      sites across China, Japan, India, and Southeast Asia.
                    </p>
                    <p>
                      Since her first solo exhibition in 1990, she has held twenty-one solo shows
                      and taken part in roughly 130 group exhibitions. The decisive turn came in
                      2003, when she returned to Korea from China and presented — across the entire
                      third floor of Gallery Artside — what is regarded as the country&apos;s first
                      full-scale solo exhibition of lacquer painting and lacquer murals. From that
                      point, lacquer (ottchil) became her principal material.
                    </p>
                    <p>
                      From 2005 to 2006 she was a resident artist in the second cohort of the MMCA
                      Goyang Art Studio. Between 2003 and 2022 she taught mural painting and lacquer
                      materials-and-technique at institutions including Seoul National University.
                      In 2013 she was an invited artist at the Kottayam international mural festival
                      in South India; she received an award at the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Ishikawa International Urushi (Lacquer) Exhibition
                      </strong>{' '}
                      (石川國際漆展) in Japan, and earned national fine-art and Central Academy
                      excellence awards in China (2001, 2002).
                    </p>
                    <p>
                      Working with natural materials and East Asian traditional methods, Jeong
                      renders the experiences of life and the{' '}
                      <strong className="font-bold text-charcoal">landscapes of the mind</strong> —
                      centred on lacquer, and extending the medium toward relief and installation.
                      The deep, lustrous tone of lacquer is not a finish but the very ground of the
                      image.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정채희(丁彩僖)는 서울대학교 미술대학 회화과(서양화 전공)를 졸업하고, 중국 북경
                      중앙미술학원 대학원에서 벽화를 전공해 졸업했다. 동양의 예술적 가치에 매료된
                      그는 전통 재료와 기법을 오래 연구했다 — 중국·일본·인도·동남아의 고찰을 찾아
                      다니며.
                    </p>
                    <p>
                      1990년 첫 개인전 이후 그는 총 21회의 개인전과 130여 회의 단체전에 참여해 왔다.
                      전환점은 2003년이었다. 중국에서 귀국하며 그는{' '}
                      <strong className="font-bold text-charcoal-deep">아트사이드 갤러리</strong>
                      3층 전관에서 국내 처음으로 본격적인 칠화·칠벽화 개인전을 열었다. 그때부터
                      옻칠은 그의 주된 재료가 됐다.
                    </p>
                    <p>
                      2005년부터 2006년까지 그는 국립현대미술관 미술창작스튜디오 고양 2기 입주작가로
                      머물렀다. 2003년부터 2022년까지 서울대학교 등에서 벽화와 옻칠 재료기법을
                      강의했다. 2013년에는 남인도 코타얌 국제 벽화축제의 초청작가로 참여했고, 일본의{' '}
                      <strong className="font-bold text-charcoal-deep">
                        이시카와(石川) 국제 옻칠전(石川國際漆展)
                      </strong>
                      에서 입상했으며, 중국에서 중앙미술대학원·전국미술 우수작품상(2001·2002)을
                      받았다.
                    </p>
                    <p>
                      천연 재료와 동양의 전통 기법으로, 정채희는 삶의 경험과{' '}
                      <strong className="font-bold text-charcoal">심상의 풍경</strong>을 그린다 —
                      옻칠을 중심에 두고, 그 매체를 부조와 설치로 확장하면서. 깊고 윤기 있는 옻빛은
                      마감이 아니라 이미지가 서는 바탕 그 자체다.
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
                        {isEnglish ? 'Lacquer as ground' : '바탕으로서의 옻칠'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Lacquer (chilhwa, lacquer murals) is her principal material — its deep, lustrous tone is the ground of the image, not a finishing coat.'
                          : '칠화·칠벽화 — 옻칠이 주된 재료다. 깊고 윤기 있는 옻빛은 마감이 아니라 이미지의 바탕이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'East Asian technique' : '동양 전통 기법의 천착'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From painting at Seoul National University to murals in Beijing, and on to lacquer — a long study of traditional materials drawn from temples across Asia.'
                          : '서울대 회화에서 북경 벽화로, 다시 옻칠로. 아시아의 고찰을 찾아 이어 온 전통 재료·기법 연구.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Landscapes of the mind' : '심상의 풍경'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The experiences of life and inner landscapes, rendered with natural materials and extended from painting toward relief and installation.'
                          : '삶의 경험과 마음의 풍경. 천연 재료로 그려, 회화에서 부조·설치로 확장한다.'}
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
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'First solo exhibition.' : '첫 개인전 개최.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001–02
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'National fine-art and Central Academy excellence awards, China.'
                        : '중국 중앙미술대학원·전국미술 우수작품상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2003
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Returns to Korea; first full-scale solo show of lacquer painting & murals at Gallery Artside.'
                        : '귀국, 갤러리 아트사이드에서 국내 첫 본격 칠화·칠벽화 개인전 「漆로 그린 그림전」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2005–06
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident artist, MMCA Goyang Art Studio (2nd cohort).'
                        : '국립현대미술관 미술창작스튜디오 고양 2기 입주작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈慈雲遊月〉, Hakgojae (Seoul Foundation for Arts & Culture grant).'
                        : '개인전 「慈雲遊月」, 학고재 — 서울문화재단 창작지원.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited artist, Kottayam international mural festival, South India; award at the Ishikawa International Urushi Exhibition, Japan.'
                        : '남인도 코타얌 국제 벽화축제 초청작가; 일본 이시카와 국제 옻칠전 입상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈A Deep Room〉, Samtoh Gallery.'
                        : '개인전 「깊은 방」, 샘터 갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Landscape Beyond〉, Gallery Naeil, Seoul.'
                        : '개인전 「너머의 풍경」, 갤러리 내일, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Breath, Rest〉, Nook Gallery, Seoul.'
                        : '개인전 「숨,쉼」, 누크갤러리, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈A Bittersweet Leaf〉, Sea of the Universe Gallery, Busan.'
                        : '개인전 「쌉살한 잎새」, 우주의 바다 갤러리, 부산.'}
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
                        ? 'Solo: 〈A Bittersweet Leaf〉 (Sea of the Universe Gallery, Busan, 2023); 〈Breath, Rest〉 (Nook Gallery, Seoul, 2021); 〈Landscape Beyond〉 (Gallery Naeil, Seoul, 2020)'
                        : '개인전: 「쌉살한 잎새」(우주의 바다 갤러리, 부산, 2023); 「숨,쉼」(누크갤러리, 서울, 2021); 「너머의 풍경」(갤러리 내일, 서울, 2020)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈A Deep Room〉 (Samtoh Gallery, 2014); 〈慈雲遊月〉 (Hakgojae, 2006); 〈Painting Drawn in Lacquer〉 (Gallery Artside, 2003)'
                        : '개인전: 「깊은 방」(샘터 갤러리, 2014); 「慈雲遊月」(학고재, 2006); 「漆로 그린 그림전」(갤러리 아트사이드, 2003)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈Walking the Old Path with Gyeomjae〉 (Gyeomjae Jeong Seon Museum, 2017); Kottayam International Mural Festival (South India, 2013)'
                        : '단체전: 「겸재와 함께 옛길을 걷다」(겸재정선미술관, 2017); 코타얌 국제 벽화축제(남인도, 2013)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: KIAF 10 (COEX, 2010); 〈New Millennium of Oriental Painting — Contemporary Transformations of Korean Painting〉 (Hangaram Art Museum, Seoul Arts Center, 2009)'
                        : '단체전: KIAF 10(COEX, 2010); 「동양화 새 천년기획 — 한국화의 현대적 변용전」(예술의전당 한가람미술관, 2009)'}
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
                  <span className="text-charcoal-deep">on lacquer, technique, and image</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">옻칠과 기법, 그리고 이미지에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 회화에서 벽화로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From painting to murals — Seoul and Beijing'
                    : '회화에서 벽화로 — 서울과 북경'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jeong Chaehui began in Western painting at the College of Fine Arts at Seoul
                        National University. The first widening of that frame came in Beijing, where
                        she completed a graduate degree in mural painting at the Central Academy of
                        Fine Arts. Mural work asks a different set of questions than easel painting:
                        about scale, about surface, about how an image lives on a wall rather than
                        within a frame.
                      </p>
                      <p>
                        It was through this study that she was drawn to the artistic values of East
                        Asia, and to the materials and techniques that carry them. Over years she
                        visited old temples and sites across China, Japan, India, and Southeast
                        Asia, treating tradition not as a subject to depict but as a body of
                        knowledge to absorb. The mural — a public, durable, material image — became
                        the bridge between the painter she had trained as and the lacquer artist she
                        would become.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정채희는 서울대학교 미술대학 회화과의 서양화에서 출발했다. 그 틀이 처음
                        넓어진 곳은 북경이었다. 그는 중앙미술학원 대학원에서 벽화를 전공해 졸업했다.
                        벽화는 이젤 회화와 다른 물음을 던진다 — 규모에 관하여, 표면에 관하여,
                        이미지가 액자 안이 아니라 벽 위에서 어떻게 사는가에 관하여.
                      </p>
                      <p>
                        이 공부를 통해 그는 동양의 예술적 가치에, 그리고 그 가치를 담아 온 재료와
                        기법에 매료됐다. 여러 해에 걸쳐 그는 중국·일본·인도·동남아의 고찰을 찾아
                        다녔다 — 전통을 그릴 대상이 아니라 몸에 익힐 지식으로 다루면서. 공공적이고
                        견고하며 물질적인 이미지인 벽화는, 그가 훈련받은 화가와 장차 될 옻칠화가
                        사이를 잇는 다리가 됐다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 옻칠로 돌아오다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The return to lacquer — 2003 and after'
                    : '옻칠로 돌아오다 — 2003년 이후'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The decisive turn came in 2003, on her return to Korea from China. Across
                        the entire third floor of Gallery Artside she presented what is regarded as
                        the country&apos;s first full-scale solo exhibition of lacquer painting and
                        lacquer murals. From that point lacquer — ottchil, the sap of the lacquer
                        tree — became her principal material rather than one technique among many.
                      </p>
                      <p>
                        Lacquer is slow and exacting. It demands controlled humidity to cure, layer
                        upon layer, each coat building toward a depth that paint cannot imitate. In
                        Jeong&apos;s hands this is not craft display but a way of thinking:{' '}
                        <em>the surface remembers every layer beneath it</em>. The deep, lustrous
                        tone is not applied at the end; it accumulates as the image is made.
                      </p>
                      <p>
                        Recognition followed across borders. She received an award at the Ishikawa
                        International Urushi (石川國際漆展) Exhibition in Japan, was an invited
                        artist at the Kottayam international mural festival in South India in 2013,
                        and from 2005 to 2006 held residency at the MMCA Goyang Art Studio —
                        confirmation that a tradition pursued this seriously speaks across the
                        region that shares it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        결정적 전환은 2003년, 중국에서 귀국하던 해에 왔다. 갤러리 아트사이드 3층
                        전관에서 그는 국내 처음으로 본격적인 칠화·칠벽화 개인전을 열었다. 그때부터
                        옻칠 — 옻나무의 수액 — 은 여러 기법 중 하나가 아니라 그의 주된 재료가 됐다.
                      </p>
                      <p>
                        옻칠은 느리고 엄정하다. 굳기 위해 일정한 습도가 필요하고, 층 위에 층을
                        쌓아야 하며, 한 겹 한 겹이 안료가 흉내 낼 수 없는 깊이로 자라난다. 정채희의
                        손에서 이것은 기교의 과시가 아니라 하나의 사유 방식이다:{' '}
                        <em>표면은 그 아래의 모든 층을 기억한다</em>. 깊고 윤기 있는 옻빛은 마지막에
                        칠해지는 것이 아니라, 이미지가 만들어지며 축적된다.
                      </p>
                      <p>
                        인정은 국경을 넘어 이어졌다. 그는 일본의 이시카와 국제 옻칠전(石川國際漆展)
                        에서 입상했고, 2013년 남인도 코타얌 국제 벽화축제의 초청작가였으며, 2005년
                        부터 2006년까지 국립현대미술관 고양 미술창작스튜디오에 입주했다 — 이만큼
                        진지하게 천착한 전통은, 그 전통을 함께 나눠 가진 지역 전체에 말을 건넨다는
                        확인이었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 심상의 풍경 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Landscapes of the mind — material as image'
                    : '심상의 풍경 — 물성이 곧 이미지가 될 때'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        What lacquer paints, in Jeong&apos;s work, is not a scene observed but a
                        scene remembered. Titles across her solo exhibitions trace this inward
                        weather — 〈Landscape Beyond〉 (2020), 〈Breath, Rest〉 (2021), 〈A
                        Bittersweet Leaf〉 (2023). These are landscapes of the mind: the experiences
                        of a life held still long enough to be looked at.
                      </p>
                      <p>
                        The medium is suited to it. Because lacquer accumulates depth slowly, it
                        holds time the way memory does — not as a single image but as sediment.
                        Jeong extends this beyond the flat surface, working the material into relief
                        and installation, so that the inner landscape is given not only a colour but
                        a body.
                      </p>
                      <p>
                        From Western painting at Seoul National University, through murals in
                        Beijing, to lacquer, the line of her work is a single sustained study of how
                        an Asian tradition can carry a contemporary inner life. She joins this
                        campaign not as a subject of its cause but as a fellow artist in solidarity
                        — so that others who work with patience and slow materials might do so
                        without the weight of financial exclusion.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정채희의 작업에서 옻칠이 그리는 것은 관찰된 풍경이 아니라 기억된 풍경이다.
                        개인전 제목들이 그 안쪽의 날씨를 따라간다 — 「너머의 풍경」(2020), 「숨,쉼」
                        (2021), 「쌉살한 잎새」(2023). 이것들은 심상의 풍경이다: 들여다볼 수 있을
                        만큼 오래 멈춰 둔 한 삶의 경험.
                      </p>
                      <p>
                        매체가 거기에 맞춤하다. 옻칠은 깊이를 천천히 축적하기에, 기억이 그렇듯
                        시간을 품는다 — 하나의 이미지가 아니라 퇴적으로. 정채희는 이것을 평면 너머로
                        확장하여, 재료를 부조와 설치로 다룬다. 그렇게 마음의 풍경은 색만이 아니라
                        몸을 얻는다.
                      </p>
                      <p>
                        서울대의 서양화에서 북경의 벽화를 거쳐 옻칠로, 그의 작업의 선은 동양의
                        전통이 어떻게 동시대의 내면을 담을 수 있는가에 대한 하나의 지속된 탐구다.
                        씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 —
                        인내와 느린 재료로 일하는 다른 이들이 금융 차별의 무게 없이 그렇게 할 수
                        있도록.
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
                      Twenty-one solo exhibitions and some 130 group shows trace a single line: a
                      painter who followed technique across borders until it returned, as lacquer,
                      to a way of rendering the landscapes of the mind. Jeong Chaehui joins this
                      campaign in solidarity with fellow artists — so that the slow, patient labour
                      her medium demands might have room to continue.
                    </>
                  ) : (
                    <>
                      21회의 개인전과 130여 회의 단체전이 하나의 선을 그린다: 기법을 따라 국경을
                      넘던 한 화가가, 끝내 옻칠이라는 형태로 심상의 풍경을 그리는 방식으로 돌아온
                      길. 정채희는 동료 예술인과의 연대로 씨앗페에 함께한다 — 그의 매체가 요구하는
                      느리고 인내로운 노동이 이어질 자리가 마련되도록.
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
                LACQUER
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jeong Chaehui</span>
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
                    Jeong Chaehui joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정채희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_CHAEHUI_PATH}
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
