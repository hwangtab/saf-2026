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

// 이열 feature는 작가 페이지(/artworks/artist/이열)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_YEOL_PATH = `/artworks/artist/${encodeURIComponent('이열')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const isLeeYeolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이열' ||
    n === 'yoll lee' ||
    n === 'lee yeol' ||
    n.replace(/[\s-]+/g, '') === 'yolllee' ||
    n.replace(/[\s-]+/g, '') === 'leeyeol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이열 — 밤의 나무, 빛으로 깨어나는 신목',
    description:
      "회화처럼 빛을 다루는 '나무 사진가' 이열(Yoll Lee). 낮에 나무를 찾고 밤에 조명을 주어 촬영하는 작업으로, 히말라야 랄리구라스부터 마다가스카르 바오밥, 제주·신안·통영·남해의 섬 신목(神木)까지 나무와 지역의 역사를 응시해왔다. 씨앗페 온라인에서 이열의 작품을 만날 수 있습니다.",
    ogDescription:
      "'나무 사진가' 이열. 밤에 조명을 주어 깨어나는 나무 — 기록 위에 주관적 빛의 흐름을 더한 신목(神木) 사진.",
    ogAlt: '이열 대표 작품',
    twitterTitle: '이열 (Yoll Lee)',
    twitterDescription: '밤에 조명으로 깨어나는 나무 — 나무 사진가 이열',
    keywords:
      '이열 사진가, Yoll Lee, 나무 사진가, 신목, 바오밥나무, 히말라야 랄리구라스, 라이트 페인팅, 느린 인간, 씨앗페 온라인',
  },
  en: {
    title: 'Yoll Lee — Trees at Night, Sacred Wood Awakened by Light',
    description:
      "Selected works by Yoll Lee, a 'tree photographer' who handles light like a painter. Finding trees by day and photographing them by night under his own lighting, he has gazed at trees and the histories of their places — from the rhododendrons of the Himalayas and the baobabs of Madagascar to the sacred island trees (sinmok) of Jeju, Sinan, Tongyeong, and Namhae. View his works at SAF Online.",
    ogDescription:
      "Yoll Lee — a 'tree photographer'. Trees awakened by light in the dark — photographs of sacred trees that lay subjective light over the documentary image.",
    ogAlt: 'Yoll Lee — featured work',
    twitterTitle: 'Yoll Lee',
    twitterDescription: 'Trees awakened by light in the dark — tree photographer Yoll Lee',
    keywords:
      'Yoll Lee photographer, tree photographer, sacred tree, sinmok, baobab, Himalayan rhododendron, light painting, Korean photography',
  },
} as const;

export async function buildLeeYeolMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_YEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이열');
  const artwork = allArtworks.find((a) => isLeeYeolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Yoll Lee`
      : `${artwork.title} — 이열`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_YEOL_PATH, locale, true),
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

export default async function LeeYeolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_YEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이열');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeYeolArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Yoll Lee' : '이열', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_YEOL_PATH}#person-lee-yeol`,
    name: isEnglish ? 'Yoll Lee' : '이열',
    alternateName: isEnglish ? ['이열', 'Lee Yeol'] : ['Yoll Lee', 'Lee Yeol'],
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? "Yoll Lee is a Korean 'tree photographer' who, since 2012, has photographed trees as an expression of the beauty of nature and life — finding trees by day and photographing them at night under his own lighting, across the Himalayas, Madagascar, and the sacred island trees of Korea."
      : '이열(Yoll Lee)은 2012년부터 나무를 소재로 자연과 생명의 아름다움을 표현해 온 한국의 나무 사진가입니다. 낮에 나무를 찾고 밤에 조명을 주어 촬영하는 작업으로, 히말라야부터 마다가스카르, 한국의 섬 신목(神木)까지 나무를 응시해왔습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chung-Ang University, Dept. of Photography'
          : '중앙대학교 예술대학 사진학과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Istituto Europeo di Design (IED), Milan, Photography'
          : '이탈리아 밀라노 유럽디자인대학(IED) 사진학과',
      },
    ],
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Forest of Art Social Cooperative' : '예술의숲 사회적협동조합',
    },
    knowsAbout: ['Photography', 'Tree photography', 'Light painting', 'Sacred trees'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Yoll Lee — SAF Online' : '이열 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Yoll Lee from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 이열 작품을 소개합니다.',
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
        {/* Hero Section — 밤의 나무, 빛으로 깨어나는 신목 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 어둠 속 조명 — 나무에 비치는 빛의 점 모티프 */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute top-10 left-16 w-px h-24 bg-white/10" />
            <div className="absolute bottom-12 right-24 w-px h-20 bg-primary/20" />
            <div className="absolute top-1/2 left-8 w-2 h-2 rounded-full bg-white/15" />
            <div className="absolute top-20 right-16 w-2 h-2 rounded-full bg-primary/30" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Yoll Lee' : '이열 · Yoll Lee'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Trees at night,
                  <br />
                  <span className="text-primary-soft">awakened by light</span>
                </>
              ) : (
                <>
                  밤의 나무,
                  <br />
                  <span className="text-primary-soft">빛으로 깨어나다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">He finds trees by day and lights them by night.</span>
                  <span className="mt-2 block">
                    A &lsquo;tree photographer&rsquo; who lays subjective light over the document.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">낮에 나무를 찾고, 밤에 조명을 주어 담는다.</span>
                  <span className="mt-2 block">
                    기록 위에 주관적 빛을 더하는 &lsquo;나무 사진가&rsquo;.
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
                    A tree photographer —<br />
                    <span className="text-primary-strong">light laid over the record</span>
                  </>
                ) : (
                  <>
                    나무 사진가 —<br />
                    <span className="text-primary-strong">기록 위에 더한 빛</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Yoll Lee studied photography at Chung-Ang University&apos;s College of Arts
                      and at the Istituto Europeo di Design (IED) in Milan, Italy. Since{' '}
                      <strong className="font-bold text-charcoal-deep">2012</strong> he has taken
                      the tree as his subject, photographing it as an expression of the beauty of
                      nature and life — and has become known as a &ldquo;tree photographer.&rdquo;
                    </p>
                    <p>
                      His method is distinctive: he finds a tree by day and photographs it at night,
                      giving it his own light. The aim is not documentary record alone. Through a
                      tree, a place, and its history, he tries to put into the photograph the
                      personal emotion and inspiration he has felt there — laying the flow of
                      subjective feeling over a foundation of record. It is this added layer of
                      light and feeling that separates his work from documentary photography.
                    </p>
                    <p>
                      Beginning with the &ldquo;Blue Tree&rdquo; series in{' '}
                      <strong className="font-bold text-charcoal-deep">2013</strong>, his trees
                      moved through &ldquo;Forest&rdquo; (2016), &ldquo;Dreaming Tree&rdquo; (2017),
                      and &ldquo;Human Tree&rdquo; (2018). His gaze then reached trees abroad — the
                      Himalayan rhododendron (lali gurans) of Nepal (2017), the olive trees of Italy
                      (2018), the baobabs of Madagascar (2020), and the mangroves of Fiji (2023).
                    </p>
                    <p>
                      In Korea, he turned to the sacred trees (sinmok) of the islands: &ldquo;Jeju
                      Sinmok&rdquo; (2021), &ldquo;Sinan Sinmok&rdquo; (2022), &ldquo;Tongyeong
                      Sinmok&rdquo; (2023), and &ldquo;Namhae Sinmok&rdquo; (2024) — the village
                      guardian trees in which a place&apos;s memory and faith are gathered. From
                      2013 he also led and won the &ldquo;Yangjaecheon Embankment Tree-Saving
                      Movement,&rdquo; and he dreams of a &ldquo;Forest of Art&rdquo; where nature
                      and art live together.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이열(Yoll Lee)은 중앙대학교 예술대학 사진학과와 이탈리아 밀라노 유럽디자인대학
                      (IED) 사진학과에서 사진을 공부했다.{' '}
                      <strong className="font-bold text-charcoal-deep">2012년</strong>부터 나무를
                      소재로 자연과 생명의 아름다움을 표현해 왔으며, &ldquo;나무 사진가&rdquo;로
                      불린다.
                    </p>
                    <p>
                      그의 작업 방식은 특별하다. 낮에 나무를 찾고, 밤에 조명을 주어 촬영한다. 목표는
                      단순한 기록이 아니다. 나무와 지역, 그리고 그 역사를 통해 느낀 개인적 감정과
                      영감을 사진에 담으려 한다 — 기록을 바탕으로 하되 그 위에 주관적 감정의 흐름을
                      더한다. 바로 이 빛과 감정의 층위가 그의 작업을 다큐멘터리 사진과 구별 짓는
                      특징이다.
                    </p>
                    <p>
                      <strong className="font-bold text-charcoal-deep">2013년</strong> 첫 나무 사진
                      전시 &lsquo;푸른 나무&rsquo; 시리즈를 시작으로, 그의 나무는
                      &lsquo;숲&rsquo;(2016), &lsquo;꿈꾸는 나무&rsquo;(2017), &lsquo;인간
                      나무&rsquo;(2018)로 이어졌다. 이후 그의 시선은 해외의 나무들에 닿았다 — 네팔
                      히말라야의 랄리구라스(2017), 이탈리아의 올리브나무(2018), 마다가스카르의
                      바오밥나무(2020), 그리고 피지의 맹그로브나무(2023).
                    </p>
                    <p>
                      국내에서는 섬의 신목(神木)으로 향했다. &lsquo;제주신목&rsquo;(2021),
                      &lsquo;신안신목&rsquo;(2022), &lsquo;통영신목&rsquo;(2023),
                      &lsquo;남해신목&rsquo;(2024) — 한 지역의 기억과 믿음이 모인 마을의 당산나무들.
                      또한 2013년 &lsquo;양재천 둑방길 나무 지키기 운동&rsquo;을 주도해 성공시켰고,
                      자연과 예술이 함께하는 &lsquo;예술의숲&rsquo;을 꿈꾼다.
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
                        {isEnglish ? 'Light upon the record' : '기록 위의 빛'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Finding trees by day, lighting them by night — subjective feeling laid over a documentary foundation. This is what separates his work from documentary photography.'
                          : '낮에 찾고 밤에 조명을 주어 — 기록을 바탕으로 주관적 감정을 더한다. 다큐멘터리 사진과 구별되는 지점이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The sacred island trees' : '섬의 신목(神木)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Jeju, Sinan, Tongyeong, Namhae — the guardian trees in which a place gathers its memory and faith.'
                          : '제주·신안·통영·남해 — 한 지역이 기억과 믿음을 모아 둔 당산나무들.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Trees of the world' : '세계의 나무'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Himalayan rhododendron, Italian olive, Madagascar baobab, Fiji mangrove — the same gaze, carried across continents.'
                          : '히말라야 랄리구라스, 이탈리아 올리브, 마다가스카르 바오밥, 피지 맹그로브 — 같은 시선이 대륙을 건넌다.'}
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
                        ? 'Chung-Ang University, Dept. of Photography; Istituto Europeo di Design (IED), Milan, Italy, Photography.'
                        : '중앙대학교 예술대학 사진학과 졸업; 이탈리아 밀라노 유럽디자인대학(IED) 사진학과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins photographing trees as his central subject.'
                        : '나무를 중심 소재로 한 작업 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First tree photography exhibition, the "Blue Tree" series. Leads the "Yangjaecheon Embankment Tree-Saving Movement" to success.'
                        : '첫 나무 사진 전시 &lsquo;푸른 나무(Blue tree)&rsquo; 시리즈. &lsquo;양재천 둑방길 나무 지키기 운동&rsquo; 주도·성공.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016–18
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Forest" (2016), "Dreaming Tree" (2017), "Himalaya" (2017), "Human Tree" / "Trees Generations" (2018, Bari, Italy & Seoul).'
                        : '&lsquo;숲(Forest)&rsquo;(2016), &lsquo;꿈꾸는 나무&rsquo;·&lsquo;히말라야&rsquo;(2017), &lsquo;인간 나무&rsquo;·&lsquo;Trees Generations&rsquo;(2018, 이탈리아 바리·서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"The Tree the Gods Loved, Baobab" (Madagascar), ARTFIELD GALLERY.'
                        : '&lsquo;신들이 사랑한 나무, 바오밥&rsquo;(마다가스카르), ARTFIELD GALLERY.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Jeju Sinmok — Pongnang", LeeSeoul Gallery.'
                        : '&lsquo;제주신목_폭낭&rsquo;, LeeSeoul gallery.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Sinan Sinmok — Usil", Sojeon Museum of Art. Begins as chairperson of the Forest of Art Social Cooperative (June, to present).'
                        : '&lsquo;신안신목_우실&rsquo;, 소전미술관. 예술의숲 사회적협동조합 이사장 취임(6월~현재).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Green Paradise — Fiji", Bium Gallery; "Tongyeong Sinmok", Gallery Mijak. Fiji mangrove series.'
                        : '&lsquo;녹색낙원_피지&rsquo;, 비움갤러리; &lsquo;통영신목&rsquo;, 갤러리 미작. 피지 맹그로브나무 시리즈.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Namhae Sinmok — Memory of Time", Namhae Exile Literature Museum.'
                        : '&lsquo;남해신목_시간의 기억&rsquo;, 남해유배문학관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition "The Slow Human" (Lapland, Seoul). Publishes the photo essay "The Slow Human" (Geulhangari) — selected for the 14th Green Literature Award.'
                        : '개인전 &lsquo;느린 인간&rsquo;(라플란드, 서울). 글·사진집 「느린 인간」(글항아리) 출간 — 제14회 녹색문학상 선정.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Career, books & awards' : '경력 · 저서 · 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Chairperson, Forest of Art Social Cooperative (June 2022 – present); Art Director, ARTFIELD Gallery (2018–2020); Director, A-Tree Gallery (2014–2017).'
                        : '예술의숲 사회적협동조합 이사장(2022.6~현재); 아트필드(ARTFIELD) 갤러리 아트 디렉터(2018~2020); 에이트리(A-Tree) 갤러리 대표(2014~2017).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lecturer, Konkuk University Dept. of Design (2004–2014); Adjunct Professor, Namseoul University Dept. of Multimedia (2000–2009).'
                        : '건국대학교 디자인학부 강사(2004~2014); 남서울대학교 멀티미디어과 겸임교수(2000~2009).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Books: "The Slow Human" (text & photographs, Geulhangari, 2025); "Heroes of MERS" (photographs, Duldabooks, 2016); "Poets of the Secular City" (photographs, Logopolis, 2015); translation "Beautiful Summer" (Green Ray, 2025).'
                        : '저서: 「느린 인간」(글·사진, 글항아리, 2025); 「메르스의 영웅들」(사진, 둘다북스, 2016); 「세속도시의 시인들」(사진, 로고폴리스, 2015); 번역서 「아름다운 여름」(녹색광선, 2025).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected for the 14th Green Literature Award (2025) for the photo essay "The Slow Human".'
                        : '제14회 녹색문학상 선정(2025) — 포토에세이 「느린 인간」.'}
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
                  <span className="text-charcoal-deep">on trees, light, and the sacred</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —<br />
                  <span className="text-charcoal-deep">나무와 빛, 그리고 신성에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 밤에 조명을 주는 사진 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Photographing by night — light over the record'
                    : '밤에 조명을 주는 사진 — 기록 위의 빛'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most photography of nature works with the light that is already there — the
                        slant of morning, the gold of evening. Yoll Lee works differently. He finds
                        a tree by day, studies it, and returns at night to give it his own light. In
                        the dark, the tree is lifted out of its surroundings and made to stand
                        alone, lit as if on a stage.
                      </p>
                      <p>
                        This is more than a technique. The photograph still begins in record: a
                        specific tree, in a specific place, with its own history. But over that
                        documentary foundation he lays the flow of his own feeling — the emotion and
                        inspiration the tree and its place have stirred in him. The light is the
                        carrier of that feeling. It is precisely this added subjective layer that he
                        names as the line between his work and documentary photography: the record
                        is kept, but it is no longer neutral.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대부분의 자연 사진은 이미 거기 있는 빛으로 작업한다 — 아침의 빗금, 저녁의
                        금빛. 이열은 다르게 일한다. 낮에 나무를 찾아 살피고, 밤에 다시 돌아와 자신의
                        빛을 준다. 어둠 속에서 나무는 주변으로부터 들어 올려져 홀로 서고, 무대 위인
                        듯 조명을 받는다.
                      </p>
                      <p>
                        이것은 기법 이상의 무언가다. 사진은 여전히 기록에서 출발한다: 특정한 나무,
                        특정한 장소, 그 자신의 역사. 그러나 그 기록의 바탕 위에 그는 자신의 감정의
                        흐름을 더한다 — 나무와 그 지역이 그에게 불러일으킨 감정과 영감을. 빛은 그
                        감정을 실어 나르는 매개다. 바로 이 더해진 주관의 층위를, 그는 자신의 작업과
                        다큐멘터리 사진 사이의 경계로 지목한다: 기록은 지켜지되, 더 이상 중립적이지
                        않다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 세계의 나무, 섬의 신목 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'From the baobab to the village guardian — the trees of the world and the islands'
                    : '바오밥에서 당산나무까지 — 세계의 나무와 섬의 신목'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        From the &ldquo;Blue Tree&rdquo; series of 2013, his subject widened into
                        the trees of the world. The Himalayan rhododendron of Nepal (2017); the
                        olive trees of Italy (2018); the baobabs of Madagascar (2020), which he
                        titled <em>The Tree the Gods Loved</em>; the mangroves of Fiji (2023). Each
                        is a tree carrying the weather, the soil, and the long time of its own
                        region.
                      </p>
                      <p>
                        In Korea his attention settled on the sacred trees of the islands — the{' '}
                        <strong className="font-bold text-charcoal-deep">sinmok</strong>, the
                        village guardian trees in which a community has, over generations, gathered
                        its memory and its faith: &ldquo;Jeju Sinmok&rdquo; (2021), &ldquo;Sinan
                        Sinmok&rdquo; (2022), &ldquo;Tongyeong Sinmok&rdquo; (2023), &ldquo;Namhae
                        Sinmok&rdquo; (2024). Photographed at night under his light, an ordinary old
                        tree becomes again what the village always held it to be — a presence, not
                        only a plant. The history of a place is read through the tree that has stood
                        at its center.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2013년 &lsquo;푸른 나무&rsquo; 시리즈로부터, 그의 소재는 세계의 나무로
                        넓어졌다. 네팔의 히말라야 랄리구라스(2017); 이탈리아의 올리브나무(2018);{' '}
                        <em>신들이 사랑한 나무</em>로 이름 붙인 마다가스카르의 바오밥나무(2020);
                        피지의 맹그로브나무(2023). 저마다 자기 지역의 날씨와 흙과 긴 시간을 짊어진
                        나무들이다.
                      </p>
                      <p>
                        국내에서 그의 시선은 섬의 신목에 머물렀다 —{' '}
                        <strong className="font-bold text-charcoal-deep">신목(神木)</strong>, 한
                        공동체가 여러 세대에 걸쳐 기억과 믿음을 모아 둔 마을의 당산나무들:
                        &lsquo;제주신목&rsquo;(2021), &lsquo;신안신목&rsquo;(2022),
                        &lsquo;통영신목&rsquo;(2023), &lsquo;남해신목&rsquo;(2024). 밤에 그의 빛
                        아래에서 촬영된 평범한 노거수는, 마을이 늘 그렇게 여겨 온 그것으로 다시
                        돌아온다 — 식물만이 아닌 하나의 존재로. 한 지역의 역사가 그 중심에 서 온
                        나무를 통해 읽힌다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 나무를 지키는 일, 예술의숲 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Saving trees, dreaming a forest — from the embankment to "The Slow Human"'
                    : '나무를 지키는 일, 숲을 꿈꾸는 일 — 둑방길에서 「느린 인간」까지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For Yoll Lee, photographing trees and protecting them belong to the same
                        work. In 2013 he led the &ldquo;Yangjaecheon Embankment Tree-Saving
                        Movement&rdquo; and carried it to success — keeping standing the very kind
                        of tree he photographs. From this practice grew a larger dream: a{' '}
                        <strong className="font-bold text-charcoal-deep">Forest of Art</strong>, a
                        place where nature and art live together, which he now pursues as
                        chairperson of the Forest of Art Social Cooperative.
                      </p>
                      <p>
                        That same patience appears in his books. In 2025 he published the photo
                        essay <em>The Slow Human</em> (Geulhangari), of which he is both writer and
                        photographer; the work was selected for the 14th Green Literature Award. The
                        title names a stance as much as a subject — a way of moving at the speed of
                        trees and weather rather than of cities. Across two decades of teaching, of
                        gallery direction, of photographing the heroes of MERS and the poets of the
                        secular city, the trees have remained his steady center: a record kept, and
                        a light added.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이열에게 나무를 찍는 일과 지키는 일은 같은 작업에 속한다. 2013년 그는
                        &lsquo;양재천 둑방길 나무 지키기 운동&rsquo;을 주도해 성공시켰다 — 그가 찍는
                        바로 그 나무를 서 있게 한 것이다. 이 실천에서 더 큰 꿈이 자랐다: 자연과
                        예술이 함께하는{' '}
                        <strong className="font-bold text-charcoal-deep">예술의숲</strong>. 그는
                        지금 예술의숲 사회적협동조합 이사장으로서 그 꿈을 이어 간다.
                      </p>
                      <p>
                        같은 인내가 그의 저서에도 나타난다. 2025년 그는 글·사진집 <em>느린 인간</em>
                        (글항아리)을 펴냈고, 이 작업은 제14회 녹색문학상에 선정됐다. 제목은 소재인
                        동시에 하나의 태도를 이름한다 — 도시가 아니라 나무와 날씨의 속도로 움직이는
                        방식. 20년의 강의와 갤러리 운영, 「메르스의 영웅들」과 「세속도시의
                        시인들」을 거치는 동안에도, 나무는 그의 변함없는 중심으로 남았다: 지켜진
                        기록, 그리고 더해진 빛.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium break-keep">
                  {isEnglish ? (
                    <>
                      From the blue trees of 2013 to the sacred island trees and the slow human of
                      today, Yoll Lee has built a body of work that finds trees by day and awakens
                      them by night — a record kept, and a feeling laid over it in light. He joins
                      this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that those who come after might keep working, the way a tree
                      keeps standing.
                    </>
                  ) : (
                    <>
                      2013년의 푸른 나무에서 오늘의 섬 신목과 느린 인간까지, 이열은 낮에 나무를 찾고
                      밤에 빛으로 깨우는 작업을 쌓아 왔다 — 지켜진 기록, 그리고 그 위에 빛으로 더한
                      감정. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다
                      — 다음 세대의 예술인들이, 한 그루 나무가 계속 서 있듯 계속 일할 수 있도록.
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
                TREES
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Yoll Lee</span>
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
                    Yoll Lee joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이열 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_YEOL_PATH}
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
