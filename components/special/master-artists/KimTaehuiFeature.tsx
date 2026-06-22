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

// 작가 feature는 작가 페이지(/artworks/artist/김태희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='김태희', name_en='Kim Taehui' (영문 표기 Kim Taehee). 매체: 도예.
// 동명이인 주의: 배우 김태희가 아닌 도예가 김태희 — 서울과기대 도예과·조각보·전통 도자 재해석.
const KIM_TAEHUI_PATH = `/artworks/artist/${encodeURIComponent('김태희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimTaehuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김태희' ||
    n === 'kim tae-hui' ||
    n === 'kim taehui' ||
    n === 'kim tae-hee' ||
    n === 'kim taehee' ||
    n.replace(/[\s-]+/g, '') === 'kimtaehui' ||
    n.replace(/[\s-]+/g, '') === 'kimtaehee'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김태희 — 전통 도자에 조각보를 잇는 도예가',
    description:
      '전통 도자기를 현대적으로 재해석하는 도예가 김태희. 서울과학기술대학교 도예과를 졸업하고, 둥근 그릇의 관성을 깨는 각진 형태와 조각보(jogakbo)의 이미지를 흙 위에 결합한다. 잇기의 미감과 쓰임의 도자 — 김태희의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '전통 도자를 재해석하는 도예가 김태희. 각진 형태와 조각보의 이미지를 흙 위에 잇는 현대 도예.',
    ogAlt: '김태희 대표 작품',
    twitterTitle: '김태희',
    twitterDescription: '흙 위에 잇는 조각보 — 전통 도자를 재해석하는 도예가 김태희',
    keywords:
      '김태희 도예가, 도예, 도자기, 조각보, 전통 도자 재해석, 각진 형태, 서울과학기술대학교 도예과, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Taehui — Ceramic Artist Joining Jogakbo to Tradition',
    description:
      'Selected works by Kim Taehui, a ceramic artist who reinterprets traditional Korean pottery. A graduate of the Department of Ceramics at Seoul National University of Science and Technology, Kim Taehui breaks the inertia of the round vessel with angular form and joins the image of jogakbo — the Korean patchwork wrapping cloth — onto clay. The aesthetic of joining, the ceramics of use. View and collect these works at SAF Online.',
    ogDescription:
      'Kim Taehui — a ceramic artist reinterpreting tradition. Angular form and the image of jogakbo joined onto clay.',
    ogAlt: 'Kim Taehui — featured work',
    twitterTitle: 'Kim Taehui',
    twitterDescription:
      'Jogakbo joined onto clay — a ceramic artist reinterpreting traditional pottery',
    keywords:
      'Kim Taehui ceramic artist, ceramics, pottery, jogakbo, Korean patchwork, traditional pottery reinterpretation, angular form',
  },
} as const;

export async function buildKimTaehuiMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_TAEHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김태희');
  const artwork = allArtworks.find((a) => isKimTaehuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Taehui`
      : `${artwork.title} — 김태희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_TAEHUI_PATH, locale, true),
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

export default async function KimTaehuiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_TAEHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김태희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimTaehuiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Taehui' : '김태희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_TAEHUI_PATH}#person-kim-taehui`,
    name: isEnglish ? 'Kim Taehui' : '김태희',
    alternateName: isEnglish ? '김태희' : 'Kim Taehui',
    jobTitle: isEnglish ? 'Ceramic Artist' : '도예가',
    description: isEnglish
      ? 'Kim Taehui is a Korean ceramic artist who reinterprets traditional pottery, joining angular form and the image of jogakbo (Korean patchwork wrapping cloth) onto clay.'
      : '김태희는 전통 도자기를 재해석하여 각진 형태나 조각보 이미지를 결합한 현대적인 도예 작업을 선보이는 도예가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Seoul National University of Science and Technology, Dept. of Ceramics'
        : '서울과학기술대학교 도예과',
    },
    knowsAbout: isEnglish
      ? ['Korean ceramics', 'Jogakbo (patchwork)', 'Traditional pottery reinterpretation']
      : ['도예', '조각보', '전통 도자 재해석'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Taehui — SAF Online' : '김태희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Taehui from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김태희 작품을 소개합니다.',
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
        {/* Hero Section — 조각보의 잇기 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 조각보의 솔기 모티프 — 화면을 가르고 잇는 선들 */}
          <div className="absolute top-0 left-1/4 h-full w-px bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute top-0 right-1/4 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Taehui · Ceramics' : '김태희 · 도예'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Jogakbo,
                  <br />
                  <span className="text-primary-soft">joined onto clay</span>
                </>
              ) : (
                <>
                  흙 위에 잇는
                  <br />
                  <span className="text-primary-soft">조각보</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Angular form breaks the inertia of the round vessel.
                  </span>
                  <span className="mt-2 block">
                    The aesthetic of joining, carried from cloth into clay.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">둥근 그릇의 관성을 각진 형태로 깨다.</span>
                  <span className="mt-2 block">천에서 흙으로 옮겨 온 잇기의 미감.</span>
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
                    Tradition, re-joined —<br />
                    <span className="text-primary-strong">the patchwork made of clay</span>
                  </>
                ) : (
                  <>
                    다시 이은 전통 —<br />
                    <span className="text-primary-strong">흙으로 지은 조각보</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Taehui is a ceramic artist who graduated from the Department of Ceramics
                      at the Seoul National University of Science and Technology. This practice
                      begins from a single premise: that tradition is not something to be preserved
                      under glass, but a living language to be re-read, taken apart, and joined back
                      together in a contemporary form.
                    </p>
                    <p>
                      Where most pottery accepts the round vessel as its native shape — the wheel
                      turning clay toward the circle almost by gravity — Kim breaks that inertia,
                      introducing{' '}
                      <strong className="font-bold text-charcoal-deep">angular form</strong> into
                      the vessel, letting facets and edges interrupt the expected curve. The result
                      is a ceramics that feels at once familiar and unsettled, traditional in
                      material yet modern in its silhouette.
                    </p>
                    <p>
                      Onto these forms Kim joins the image of{' '}
                      <strong className="font-bold text-charcoal-deep">jogakbo (조각보)</strong> —
                      the Korean patchwork wrapping cloth, traditionally pieced together from
                      leftover scraps of fabric. Jogakbo is an art of thrift and of seams: small
                      remnants, individually too modest to matter, are stitched edge to edge until
                      they become a single cloth of unexpected beauty. Kim Taehui carries that
                      grammar of joining onto the surface and structure of clay.
                    </p>
                    <p>
                      In doing so Kim draws a quiet line between two crafts that share a hidden
                      logic. Both ceramics and jogakbo are arts of{' '}
                      <strong className="font-bold text-charcoal">use and care</strong> — things
                      made to be held, wrapped, set on a table, lived with. By translating the seam
                      of the patchwork into the facet of the pot, Kim lets the two traditions speak
                      to each other across the boundary of their materials.
                    </p>
                    <p>
                      The work, then, is less a departure from tradition than a re-reading of it.
                      Each angular vessel asks the same patient question the patchwork cloth once
                      asked: how do separate pieces, joined with care, become a whole worth keeping?
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김태희는 서울과학기술대학교 도예과를 졸업한 도예가다. 그의 작업은 하나의
                      전제에서 출발한다 — 전통은 유리 진열장 안에 보존되는 것이 아니라, 다시 읽히고,
                      해체되고, 현대적인 형태로 다시 이어 붙여지는 살아 있는 언어라는 믿음.
                    </p>
                    <p>
                      대부분의 도자가 둥근 그릇을 본래의 형태로 받아들이는 자리에서 — 물레가 거의
                      중력처럼 흙을 원으로 돌려세우는 자리에서 — 김태희는 그 관성을 깬다. 그는
                      그릇에 <strong className="font-bold text-charcoal-deep">각진 형태</strong>를
                      들여, 면과 모서리가 으레 기대되는 곡선을 가로지르게 한다. 그렇게 빚어진 도자는
                      친숙하면서도 낯설다. 재료에서는 전통적이되, 실루엣에서는 현대적이다.
                    </p>
                    <p>
                      이 형태 위에 그는{' '}
                      <strong className="font-bold text-charcoal-deep">조각보</strong>의 이미지를
                      잇는다. 조각보는 자투리 천을 이어 붙여 짓는 한국 전통의 보자기다. 조각보는
                      절약의 예술이자 솔기의 예술이다 — 하나하나로는 보잘것없는 작은 천 조각들이,
                      가장자리와 가장자리를 맞대 꿰매어지며, 끝내 뜻밖의 아름다움을 지닌 한 장의
                      천이 된다. 김태희는 그 잇기의 문법을 흙의 표면과 구조 위로 옮겨 온다.
                    </p>
                    <p>
                      그렇게 그는 숨은 논리를 공유하는 두 공예 사이에 조용한 선을 긋는다. 도자와
                      조각보는 모두{' '}
                      <strong className="font-bold text-charcoal">쓰임과 보살핌</strong>의 예술이다
                      — 손에 들리고, 감싸고, 식탁 위에 놓이고, 더불어 살아가도록 만들어진 것들.
                      조각보의 솔기를 그릇의 면으로 옮겨 옴으로써, 그는 두 전통이 재료의 경계를
                      가로질러 서로에게 말을 건네게 한다.
                    </p>
                    <p>
                      그래서 그의 작업은 전통으로부터의 결별이라기보다, 전통에 대한 다시 읽기다.
                      각진 그릇 하나하나는 일찍이 조각보가 던졌던 것과 같은 차분한 물음을 던진다 —
                      따로 떨어진 조각들이 정성껏 이어질 때, 어떻게 간직할 만한 하나의 전체가
                      되는가.
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
                        {isEnglish ? 'Reinterpreting tradition' : '전통 도자의 재해석'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Tradition read not as something to preserve but as a living language to take apart and rejoin in contemporary form.'
                          : '보존이 아니라, 해체하고 현대적으로 다시 잇는 살아 있는 언어로서의 전통.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Angular form' : '각진 형태'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Facets and edges that break the inertia of the round vessel — familiar in material, modern in silhouette.'
                          : '둥근 그릇의 관성을 깨는 면과 모서리. 재료는 전통적이되 실루엣은 현대적이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The image of jogakbo' : '조각보의 이미지'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The grammar of the patchwork wrapping cloth — small scraps joined edge to edge — carried onto the surface and structure of clay.'
                          : '자투리를 가장자리끼리 잇는 보자기의 문법을, 흙의 표면과 구조 위로 옮겨 온다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'About the artist' : '작가 소개'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base w-14">
                      {isEnglish ? 'Medium' : '매체'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Ceramics' : '도예'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base w-14">
                      {isEnglish ? 'Study' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduated from the Dept. of Ceramics, Seoul National University of Science and Technology.'
                        : '서울과학기술대학교 도예과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base w-14">
                      {isEnglish ? 'Work' : '작업'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Reinterpreting traditional pottery — joining angular form and the image of jogakbo onto clay.'
                        : '전통 도자기의 재해석 — 각진 형태와 조각보의 이미지를 흙 위에 잇는다.'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'On jogakbo' : '조각보에 관하여'}
                </h3>
                <p className="text-charcoal text-base leading-relaxed break-keep">
                  {isEnglish
                    ? 'Jogakbo (조각보) is the Korean patchwork wrapping cloth, pieced together from leftover scraps of fabric. An art of thrift and of seams, it turns small remnants — each too modest to matter alone — into a single cloth of unexpected beauty. It is at once a thing of use and a quiet aesthetic of joining.'
                    : '조각보는 자투리 천을 이어 붙여 짓는 한국 전통의 보자기다. 절약과 솔기의 예술로서, 홀로는 보잘것없는 작은 조각들을 뜻밖의 아름다움을 지닌 한 장의 천으로 만든다. 그것은 쓰임의 물건이자, 잇기의 고요한 미감이다.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 작업론 중심 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on clay, the seam, and use</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">흙과 솔기, 그리고 쓰임에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 각진 형태 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Breaking the circle — why angular form'
                    : '원을 깨다 — 각진 형태의 이유'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The wheel wants the circle. Spun clay finds its most natural rest in the
                        round — the bowl, the jar, the cup, shapes so deeply woven into ceramic
                        tradition that they can feel less like choices than like inevitabilities.
                        Kim Taehui&apos;s first move is to refuse that inevitability.
                      </p>
                      <p>
                        By introducing angular form — facets, planes, edges where the curve was
                        expected — Kim makes the vessel hesitate. The eye, accustomed to gliding
                        around a pot, is stopped at a corner; the hand, reaching for a familiar
                        round, meets a plane instead. This is not a rejection of tradition but a way
                        of making it visible again. To break the circle, even slightly, is to remind
                        the viewer that the round vessel was always a decision, never a law.
                      </p>
                      <p>
                        The angular form also prepares the surface for what comes next. A faceted
                        body offers distinct planes — fields with edges, ready to be joined. Where a
                        smooth round surface dissolves any seam, the angular vessel keeps the seam
                        legible. The geometry of the pot and the geometry of the patchwork begin,
                        here, to rhyme.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        물레는 원을 원한다. 돌려진 흙은 둥근 형태에서 가장 자연스러운 안식을 찾는다
                        — 사발, 항아리, 잔. 도자 전통에 너무 깊이 짜여 들어가 있어, 선택이라기보다
                        필연처럼 느껴지는 형태들이다. 김태희의 첫 동작은 그 필연을 거절하는 것이다.
                      </p>
                      <p>
                        곡선이 기대되던 자리에 면과 모서리, 곧 각진 형태를 들임으로써, 그는 그릇을
                        머뭇거리게 한다. 그릇 둘레를 매끄럽게 미끄러지는 데 익숙한 눈은 모서리에서
                        멈춰 서고, 익숙한 둥긂을 향해 뻗은 손은 대신 평면을 만난다. 이것은 전통에
                        대한 거부가 아니라, 전통을 다시 보이게 하는 방식이다. 원을 조금이라도 깨는
                        일은, 둥근 그릇이 언제나 하나의 결정이었지 결코 법칙이 아니었음을 보는
                        이에게 일깨운다.
                      </p>
                      <p>
                        각진 형태는 또한 그다음에 올 것을 위해 표면을 준비한다. 면으로 깎인 몸체는
                        뚜렷한 평면들을 내어 준다 — 가장자리를 지닌, 이어질 채비가 된 화면들.
                        매끄럽고 둥근 표면이 어떤 솔기든 녹여 버리는 자리에서, 각진 그릇은 솔기를
                        읽히게 간직한다. 그릇의 기하와 조각보의 기하가, 바로 여기서 운을 맞추기
                        시작한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 조각보의 문법 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The grammar of jogakbo — joining as an aesthetic'
                    : '조각보의 문법 — 미학으로서의 잇기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jogakbo, the Korean patchwork wrapping cloth, was born of thrift. In a
                        household where fabric was precious, the scraps left over from cutting
                        clothing were too small to use and too valuable to discard. So they were
                        kept, and joined — edge sewn to edge — until enough of them together made a
                        cloth large enough to wrap a gift, a book, a bundle of belongings.
                      </p>
                      <p>
                        What began as economy became, over generations, an aesthetic. The seams that
                        held the scraps together were not hidden but composed; the irregular fields
                        of colour, each remnant a different size and tone, were arranged into a
                        balance that no single bolt of cloth could have offered. Beauty here is the
                        beauty of the join — of disparate pieces made to belong to one another
                        without losing their difference.
                      </p>
                      <p>
                        It is this grammar that Kim Taehui carries onto clay — not painting a
                        picture of a patchwork but borrowing its logic — the field, the edge, the
                        deliberate seam. On the planes of these angular vessels, the image of
                        jogakbo becomes a way of thinking about wholeness: not as a single, seamless
                        mass, but as many things, joined with care, that have agreed to be one.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        한국 전통의 보자기 조각보는 절약에서 태어났다. 천이 귀하던 살림에서, 옷감을
                        마름질하고 남은 자투리는 쓰기엔 너무 작고 버리기엔 너무 아까웠다. 그래서 그
                        조각들은 간직되었고, 이어졌다 — 가장자리에 가장자리를 꿰매며 — 끝내 충분히
                        모이면, 선물을, 책을, 살림 보따리를 감쌀 만큼 넉넉한 한 장의 천이 되었다.
                      </p>
                      <p>
                        절약으로 시작된 일이, 여러 세대를 지나며 하나의 미학이 되었다. 조각들을
                        붙들어 둔 솔기는 감춰지지 않고 구성되었다. 저마다 크기와 빛깔이 다른
                        자투리들이 이루는 불규칙한 색면들은, 한 필의 천으로는 결코 낼 수 없는
                        균형으로 짜였다. 여기서 아름다움은 잇기의 아름다움이다 — 제각기 다른
                        조각들이 그 차이를 잃지 않은 채 서로에게 속하게 된 아름다움.
                      </p>
                      <p>
                        김태희가 흙 위로 옮겨 오는 것이 바로 이 문법이다. 그는 조각보의 그림을
                        그리는 것이 아니라, 그 논리를 빌려 온다 — 색면, 가장자리, 의도된 솔기. 각진
                        그릇의 면들 위에서, 조각보의 이미지는 전체란 무엇인가를 사유하는 한 방식이
                        된다. 이음매 없는 단일한 덩어리가 아니라, 정성껏 이어져 하나이기로 합의한
                        여럿으로서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 쓰임의 도자 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The ceramics of use — two crafts of care'
                    : '쓰임의 도자 — 보살핌의 두 공예'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Beneath the formal conversation between vessel and cloth lies a shared
                        ground: both ceramics and jogakbo are crafts of use. A pot is made to be
                        held, filled, set on a table; a wrapping cloth is made to enclose, protect,
                        carry. Neither is a thing to be looked at only. Each finds its meaning in
                        the hand, in the daily life it serves.
                      </p>
                      <p>
                        This is why the pairing feels so natural rather than merely clever. Kim
                        Taehui is not joining two ornaments but two practices of care — the care of
                        the table and the care of the bundle, the keeping of food and the keeping of
                        belongings. These angular, patchwork-imaged vessels remember that a made
                        object is, first of all, a thing offered to another person&apos;s use.
                      </p>
                      <p>
                        In that sense the work quietly resists the idea that to reinterpret
                        tradition is to abandon its functions. Kim modernises the silhouette and
                        borrows the seam, but the work stays loyal to the oldest purpose of both
                        crafts: to make something durable and beautiful that a person can actually
                        live with. Tradition, re-read, returns not to the museum case but to the
                        table.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그릇과 천 사이의 형식적 대화 밑에는 공유된 바탕이 있다 — 도자와 조각보는
                        모두 쓰임의 공예다. 그릇은 들리고, 채워지고, 식탁에 놓이도록 만들어진다.
                        보자기는 감싸고, 지키고, 나르도록 만들어진다. 어느 쪽도 보기만을 위한 물건이
                        아니다. 각각은 손 안에서, 자신이 섬기는 일상 속에서 의미를 찾는다.
                      </p>
                      <p>
                        그래서 이 짝지음은 단지 영리하다기보다 그토록 자연스럽게 느껴진다. 김태희가
                        잇는 것은 두 개의 장식이 아니라 두 개의 보살핌의 실천이다 — 식탁의 보살핌과
                        보따리의 보살핌, 음식을 간직하는 일과 살림을 간직하는 일. 각지고 조각보가
                        새겨진 그의 그릇들은, 만들어진 물건이 무엇보다 먼저 다른 사람의 쓰임에
                        건네지는 것임을 기억한다.
                      </p>
                      <p>
                        그런 의미에서 그의 도자는, 전통을 재해석하는 일이 그 쓰임을 버리는 일이라는
                        생각에 조용히 맞선다. 그는 실루엣을 현대화하고 솔기를 빌려 오지만, 작업은 두
                        공예의 가장 오래된 목적에 충실히 남는다 — 사람이 실제로 더불어 살 수 있는,
                        견고하고 아름다운 무언가를 만드는 것. 다시 읽힌 전통은 박물관 진열장이
                        아니라 식탁으로 돌아온다.
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
                      From the angular vessel to the joined seam, Kim Taehui&apos;s work pursues a
                      single, patient question: how do separate pieces, joined with care, become a
                      whole worth keeping? That answer, shaped in clay, carries the grammar of
                      jogakbo into a contemporary ceramics of use. Kim Taehui joins this campaign
                      not as a subject of its cause but as a fellow artist in solidarity — so that
                      the proceeds of the work might become a low-interest lifeline for artists
                      facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      각진 그릇에서 이어진 솔기까지, 김태희의 작업은 하나의 차분한 물음을 추구한다 —
                      따로 떨어진 조각들이 정성껏 이어질 때, 어떻게 간직할 만한 하나의 전체가
                      되는가. 흙으로 빚어진 그 대답이, 조각보의 문법을 쓰임의 현대 도자로 옮겨 온다.
                      씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 작품
                      판매 수익이 오늘 금융 차별을 겪는 예술인에게 저금리의 버팀목이 될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Taehui</span>
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
                    Kim Taehui joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김태희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_TAEHUI_PATH}
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
