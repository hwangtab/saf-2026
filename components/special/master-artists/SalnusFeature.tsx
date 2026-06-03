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

// 거장/큐레이션 작가 feature는 작가 페이지(/artworks/artist/Salnus)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='Salnus', name_en='Salnus'. 한글 통칭 '살누스'도 정규화 매칭에 포함.
const SALNUS_PATH = `/artworks/artist/${encodeURIComponent('Salnus')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSalnusArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === 'salnus' || n === '살누스' || n.replace(/[\s_-]+/g, '') === 'salnus';
};

const PAGE_COPY = {
  ko: {
    title: 'Salnus(살누스) — 보여짐과 가려짐, 투명한 구의 긴장',
    description:
      "유리·수정구슬·반투명 구조물 같은 투명한 재료와 기하학적 형식으로 관음과 그로테스크, 장식성과 폭력성을 병치하는 서울 기반 신진 작가 Salnus(살누스). 구(球)와 원형 구조, 변형된 신체 이미지를 반복하며 '구슬을 따라간 뱀의 이야기' 연작으로 전시 공간 전체를 하나의 서사적 구조로 엮습니다. Salnus의 작품을 씨앗페 온라인에서 감상하고 소장하세요.",
    ogDescription:
      '보여짐과 가려짐을 묻는 신진 작가 Salnus(살누스). 투명한 구와 변형된 신체로 장식성과 폭력성, 질서와 불안정성을 병치하는 회화·드로잉.',
    ogAlt: 'Salnus(살누스) 대표 작품',
    twitterTitle: 'Salnus 살누스',
    twitterDescription: '보여짐과 가려짐 사이 — 투명한 구의 긴장을 그리는 Salnus',
    keywords:
      'Salnus, 살누스, 회화, 드로잉, 기하학, 구슬을 따라간 뱀의 이야기, 관음, 그로테스크, 씨앗페 온라인',
  },
  en: {
    title: 'Salnus — The Seen and the Hidden, the Tension of a Transparent Sphere',
    description:
      'Selected works by Salnus, a Seoul-based emerging painter and draftsperson who juxtaposes voyeurism and the grotesque, ornament and violence, through transparent materials such as glass, crystal spheres, and translucent structures set in geometric form. Repeating spheres, circular structures, and transformed images of the body, Salnus weaves an entire exhibition space into a single narrative structure in the series The Story of a Snake That Followed the Bead. View and collect the works at SAF Online.',
    ogDescription:
      'Salnus — an emerging artist questioning the seen and the hidden. Transparent spheres and transformed bodies juxtapose ornament with violence, order with instability.',
    ogAlt: 'Salnus — featured work',
    twitterTitle: 'Salnus',
    twitterDescription:
      'Between the seen and the hidden — the tension of a transparent sphere, by Salnus',
    keywords:
      'Salnus, painting, drawing, geometry, voyeurism, grotesque, transparent sphere, Korean emerging artist, SAF Online',
  },
} as const;

export async function buildSalnusMetadata({
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
  const pageUrl = buildLocaleUrl(SALNUS_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('Salnus');
  const artwork = allArtworks.find((a) => isSalnusArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Salnus`
      : `${artwork.title} — Salnus`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SALNUS_PATH, locale, true),
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

export default async function SalnusFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SALNUS_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('Salnus');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isSalnusArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: 'Salnus', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SALNUS_PATH}#person-salnus`,
    name: 'Salnus',
    alternateName: '살누스',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Salnus is a Seoul-based emerging painter and draftsperson who, through transparent materials and geometric form, juxtaposes voyeurism and the grotesque, ornament and violence — repeating spheres, circular structures, and transformed images of the body to question the relationship between the seen and the hidden.'
      : "Salnus(살누스)는 투명한 재료와 기하학적 형식으로 관음과 그로테스크, 장식성과 폭력성을 병치하는 서울 기반 신진 작가입니다. 구(球)와 원형 구조, 변형된 신체 이미지를 반복하며 '보여짐과 가려짐'의 관계를 묻습니다.",
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University, College of Fine Arts, Dept. of Textile Art & Fashion Design'
        : '홍익대학교 미술대학 섬유미술·패션디자인과',
    },
    knowsAbout: ['Painting', 'Drawing', 'Geometric structure', 'Voyeurism', 'The grotesque'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Salnus — SAF Online' : 'Salnus — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Salnus from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 Salnus 작품들을 소개합니다.',
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
        {/* Hero Section — 투명한 구/원형 구조 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 원형 구조 — 구(球)/관음의 렌즈 모티프 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-primary/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full border border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Salnus · Seoul' : 'Salnus · 서울'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The seen and the hidden,
                  <br />
                  <span className="text-primary-soft">held in a transparent sphere</span>
                </>
              ) : (
                <>
                  보여짐과 가려짐,
                  <br />
                  <span className="text-primary-soft">투명한 구 안의 긴장</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Glass, crystal spheres, translucent structures — ornament beside violence.
                  </span>
                  <span className="mt-2 block">
                    A geometry where order and instability are placed side by side.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">유리, 수정구슬, 반투명 구조물 — 장식성 곁의 폭력성.</span>
                  <span className="mt-2 block">질서와 불안정성을 나란히 놓는 기하학.</span>
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
                    A transparent geometry —<br />
                    <span className="text-primary-strong">ornament beside violence</span>
                  </>
                ) : (
                  <>
                    투명한 기하학 —<br />
                    <span className="text-primary-strong">장식성 곁에 놓인 폭력성</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Salnus is a Seoul-based emerging artist working across painting, drawing,
                      installation, and animation, with a recent practice centered on painting and
                      drawing. Having graduated from Hongik University&apos;s Department of Textile
                      Art and Fashion Design in 2013, the artist has experimented widely with
                      medium, moving between the two-dimensional and the three-dimensional, between
                      narrative and structure.
                    </p>
                    <p>
                      The work repeatedly takes up{' '}
                      <strong className="font-bold text-charcoal-deep">
                        geometric structures, transparent objects, spheres and circular forms, and
                        transformed images of the body
                      </strong>
                      . Voyeurism, the grotesque, and the relationship between{' '}
                      <em>the seen and the hidden</em> are its principal themes. Through transparent
                      materials — glass, crystal spheres, translucent structures — and a geometric
                      vocabulary, Salnus juxtaposes ornament with violence, order with instability.
                    </p>
                    <p>
                      Painting and installation, the flat and the volumetric, narrative and
                      structure: the work crosses freely between them. In the recent series{' '}
                      <em>The Story of a Snake That Followed the Bead</em>, Salnus weaves an entire
                      exhibition space into a single narrative structure — not a sequence of
                      discrete works, but a sensory yet structural whole carrying a slight
                      instability.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Salnus(살누스)는 회화·드로잉·설치·애니메이션 등 다양한 매체를 실험하며 최근
                      페인팅과 드로잉을 중심으로 작업하는 서울 기반 신진 작가다. 2013년 홍익대학교
                      미술대학 섬유미술·패션디자인과를 졸업한 뒤, 평면과 입체, 서사와 구조 사이를
                      넘나들며 매체의 폭을 넓혀 왔다.
                    </p>
                    <p>
                      작업은{' '}
                      <strong className="font-bold text-charcoal-deep">
                        기하학적 구조, 투명한 오브제, 구(球)와 원형 구조, 변형된 신체 이미지
                      </strong>
                      를 반복적으로 다룬다. 관음과 그로테스크, 그리고 <em>보여짐과 가려짐</em>의
                      관계가 주요 주제다. 유리·수정구슬·반투명 구조물 같은 투명한 재료와 기하학적
                      형식으로, Salnus는 장식성과 폭력성, 질서와 불안정성 사이의 긴장을 병치한다.
                    </p>
                    <p>
                      회화와 설치, 평면과 입체, 서사와 구조 사이를 자유롭게 넘나든다. 최근{' '}
                      <em>구슬을 따라간 뱀의 이야기</em> 연작에서는 전시 공간 전체를 하나의 서사적
                      구조로 엮는다 — 개별 작품의 나열이 아니라, 약간의 불안정성을 품은 감각적이면서
                      구조적인 하나의 전체로.
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
                        {isEnglish ? 'The seen and the hidden' : '보여짐과 가려짐'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Voyeurism and the grotesque — the relationship between showing and concealing runs through the work as its central question.'
                          : '관음과 그로테스크 — 무엇을 드러내고 무엇을 가릴 것인가의 관계가 작업을 관통하는 핵심 물음이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Transparent spheres & geometry' : '투명한 구와 기하학'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Glass, crystal spheres, and translucent structures in geometric form — ornament and violence, order and instability, held in a single transparent tension.'
                          : '유리·수정구슬·반투명 구조물을 기하학적 형식으로 — 장식성과 폭력성, 질서와 불안정성을 하나의 투명한 긴장 안에 담는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Space as narrative structure' : '서사적 구조로서의 공간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Crossing between painting and installation, flat and volumetric — the recent series weaves an entire exhibition space into one narrative structure.'
                          : '회화와 설치, 평면과 입체를 넘나들며 — 최근 연작은 전시 공간 전체를 하나의 서사적 구조로 엮는다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Solo exhibitions' : '개인전'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Digging Out》, Rounded Flat, Seoul'
                        : '《Digging Out》, 라운디드 플랫, 서울'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Bad Taste》, Gallery Moss, Seoul'
                        : '《악취미》, 갤러리 모스, 서울'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          《The Tale of the Ring Worm》, Peace &amp; Culture Bunker; 《Painted-Over
                          Zone》, Goyang Aram Nuri; 《Entrance》, Gallery Cafe Gaje
                        </>
                      ) : (
                        <>
                          《고리벌레 이야기》, 평화문화진지; 《덧칠된 구역》, 고양 아람누리;
                          《입구》, 갤러리 카페 가제
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          《Fragments of the Screen》, Horanggasy Creative Studio, Gwangju;
                          《Generative Garden — A Gaze Beyond the Focus》, Wumin Art Center,
                          Cheongju
                        </>
                      ) : (
                        <>
                          《화면의 조각》, 호랑가시나무창작소, 광주; 《발생정원-초점 너머의 응시》,
                          우민아트센터, 청주
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          《Generative Garden》, Goyang Aram Nuri Museum of Art / Yeongcheon Art
                          Studio
                        </>
                      ) : (
                        <>《발생정원》, 고양 아람누리 미술관 / 영천 예술 창작 스튜디오</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《It Does Not Feel Bad》, Gallery Bincan'
                        : '《기분 나쁘지 않다》, 갤러리 빈칸'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Counter-Pursuit》, Gallery Gaia, Seoul'
                        : '《역추격》, 갤러리 가이아, 서울'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Education & residencies' : '학력 및 레지던시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BFA, Dept. of Textile Art & Fashion Design, College of Fine Arts, Hongik University (2013)'
                        : '홍익대학교 미술대학 섬유미술·패션디자인과 졸업 (2013)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident artist, Peace & Culture Bunker, 5th cohort (2022)'
                        : '평화문화진지 5기 입주작가 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident artist, Horanggasy Creative Studio, 7th cohort (2021)'
                        : '호랑가시나무 창작소 7기 입주작가 (2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident artist, Yeongcheon Art Studio, 12th cohort (2020)'
                        : '영천 예술 창작 스튜디오 12기 입주작가 (2020)'}
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
                  <span className="text-charcoal-deep">on transparency and its tension</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">투명함과 그 긴장에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 보여짐과 가려짐 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The seen and the hidden — voyeurism and the grotesque'
                    : '보여짐과 가려짐 — 관음과 그로테스크'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Salnus&apos;s work returns again and again to a single relationship: that
                        between the seen and the hidden. Voyeurism and the grotesque are not subject
                        matter so much as a way of looking — an attention to what a surface reveals
                        and what it withholds. A transparent object promises full disclosure and
                        then refuses it; a translucent structure shows the body within while
                        distorting it.
                      </p>
                      <p>
                        That refusal is where the work lives. Transformed images of the body recur,
                        neither fully exposed nor fully concealed, held in a state of tension
                        between the two. The result is a charged ambiguity in which looking itself
                        becomes a question — what right do we have to see, and what does the seen
                        withhold from us in return?
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        Salnus의 작업은 하나의 관계로 거듭 되돌아온다 — 보여짐과 가려짐 사이. 관음과
                        그로테스크는 소재라기보다 하나의 바라보는 방식이다. 표면이 무엇을 드러내고
                        무엇을 감추는가에 대한 주의. 투명한 오브제는 완전한 공개를 약속했다가
                        거절하고, 반투명한 구조물은 그 안의 신체를 보여주면서 동시에 일그러뜨린다.
                      </p>
                      <p>
                        그 거절이 작업이 머무는 자리다. 변형된 신체 이미지가 반복되며, 완전히
                        드러나지도 완전히 가려지지도 않은 채 둘 사이의 긴장 상태에 놓인다. 그 결과는
                        바라봄 자체가 물음이 되는, 팽팽한 모호함이다 — 우리는 무엇을 볼 권리가
                        있는가, 그리고 보여진 것은 그 대가로 무엇을 감추는가.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 투명한 구와 기하학 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Transparent spheres — ornament beside violence'
                    : '투명한 구 — 장식성 곁의 폭력성'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Glass, crystal spheres, and translucent structures supply the material
                        vocabulary. The sphere and the circular form recur as a structuring motif —
                        a lens, an eye, an enclosure. Set within a geometric order, these
                        transparent materials carry a doubleness: they are decorative, even
                        seductive, and at the same time hard, edged, capable of harm.
                      </p>
                      <p>
                        Salnus places ornament and violence side by side, refusing to resolve them
                        into one another. Order and instability are held in the same frame. The
                        geometry that promises stability is undercut by a slight, deliberate
                        unsteadiness, so that the work never settles into mere pattern — it stays
                        alert, sensory, on edge.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        유리, 수정구슬, 반투명 구조물이 재료의 언어를 이룬다. 구(球)와 원형 구조는
                        구조화하는 모티프로 반복된다 — 렌즈이자 눈이며, 가두는 울타리. 기하학적 질서
                        안에 놓인 이 투명한 재료들은 이중성을 띤다. 그것은 장식적이고 때로
                        유혹적이며, 동시에 단단하고 날카로워 해를 입힐 수 있다.
                      </p>
                      <p>
                        Salnus는 장식성과 폭력성을 나란히 놓고, 둘을 서로에게 녹여 해소하기를
                        거부한다. 질서와 불안정성이 같은 화면 안에 담긴다. 안정을 약속하는 기하학은
                        의도된 작은 흔들림으로 무너지고, 그래서 작업은 단순한 패턴으로 가라앉지
                        않는다 — 깨어 있고, 감각적이며, 위태롭게 머문다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 구슬을 따라간 뱀의 이야기 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The Story of a Snake That Followed the Bead — space as narrative'
                    : '구슬을 따라간 뱀의 이야기 — 서사가 된 공간'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Across painting, drawing, installation, and animation, Salnus moves between
                        the flat and the volumetric, between narrative and structure. The two-
                        dimensional surface is never only a surface; the installation is never only
                        an object. Each crosses into the territory of the other.
                      </p>
                      <p>
                        The recent series <em>The Story of a Snake That Followed the Bead</em>{' '}
                        carries this crossing to its conclusion. Rather than hanging discrete works
                        on a wall, Salnus weaves an entire exhibition space into a single narrative
                        structure — a path to be followed, like a snake after a bead. The viewer
                        does not simply look at the work; the viewer moves through it, and the
                        movement is part of the meaning.
                      </p>
                      <p>
                        Salnus joins this campaign not as a subject of its cause but as a fellow
                        artist in solidarity — so that those navigating financial exclusion today
                        might find a way through.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        회화·드로잉·설치·애니메이션을 가로지르며, Salnus는 평면과 입체, 서사와 구조
                        사이를 오간다. 2차원의 표면은 결코 표면이기만 한 적이 없고, 설치는 결코
                        오브제이기만 한 적이 없다. 각각은 서로의 영역으로 넘어 들어간다.
                      </p>
                      <p>
                        최근 연작 <em>구슬을 따라간 뱀의 이야기</em>는 이 넘나듦을 그 끝까지 밀고
                        간다. 벽에 개별 작품을 거는 대신, Salnus는 전시 공간 전체를 하나의 서사적
                        구조로 엮는다 — 구슬을 따라가는 뱀처럼, 따라가야 할 하나의 길로. 관객은
                        작품을 그저 바라보지 않는다. 관객은 그 안을 통과하며, 그 움직임이 의미의
                        일부가 된다.
                      </p>
                      <p>
                        Salnus는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                        연대자로서 함께한다 — 오늘 금융 차별을 겪는 예술인들이 그 길을 통과할 수
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
                      From textile and fashion design to a transparent geometry of spheres and
                      bodies, Salnus&apos;s work pursues a single question: what is it to see, and
                      to be seen? The answer is a practice that keeps ornament and violence, order
                      and instability, in unresolved tension — and turns an entire room into the
                      body of a story.
                    </>
                  ) : (
                    <>
                      섬유·패션디자인에서 구와 신체의 투명한 기하학까지, Salnus의 작업은 하나의
                      물음을 추구한다: 본다는 것은, 그리고 보여진다는 것은 무엇인가. 그 대답이,
                      장식성과 폭력성, 질서와 불안정성을 끝내 해소하지 않은 긴장 속에 두는 작업이며
                      — 하나의 공간 전체를 이야기의 몸으로 바꾸는 작업이다.
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
                SPHERE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Salnus</span>
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
                    Salnus joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    Salnus 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SALNUS_PATH}
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
