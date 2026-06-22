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

// 민정See feature는 작가 페이지(/artworks/artist/민정See)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// 주의: 이름에 영문 'See'가 포함된 혼합 표기 — normalizer에서 toLowerCase() 처리로 통일.
const MIN_JEONGSEE_PATH = `/artworks/artist/${encodeURIComponent('민정See')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isMinJeongSeeArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '민정see' ||
    n === 'min jeongsee' ||
    n === 'min jeong-see' ||
    n === 'minjeongsee' ||
    n.replace(/[\s-]+/g, '') === 'minjeongsee'
  );
};

const PAGE_COPY = {
  ko: {
    title: '민정See — 플라스틱의 물성으로 현대사회를 비판하는 판화·드로잉 작가',
    description:
      '민정See는 플라스틱이라는 물성을 통해 현대 사회의 표면과 위장을 비판적으로 탐구해 온 판화·드로잉 작가다. 홍익대학교 판화과를 졸업하고 시카고 SAIC에서 판화 석사를 받았으며, 소마미술관·영은미술관·벨기에 Frans Masereel Centrum 등에 작품이 소장되어 있다. 씨앗페 온라인에서 민정See의 작품을 감상하고 소장하세요.',
    ogDescription:
      '민정See — 플라스틱이라는 물성으로 현대사회의 표면과 위장을 탐구하는 판화·드로잉 작가. 홍익대 판화·시카고 SAIC 석사. 소마미술관·영은미술관·Frans Masereel Centrum 소장작가. 2025 화랑미술제 Zoom-In 선정.',
    ogAlt: '민정See 대표 작품',
    twitterTitle: '민정See',
    twitterDescription: '플라스틱의 표면, 그 아래의 진실 — 판화·드로잉 작가 민정See',
    keywords:
      '민정See 판화, 민정See 드로잉, 플라스틱 미술, 현대사회 비판, 씨앗페 온라인, 판화 작가',
  },
  en: {
    title: 'Min JeongSee — Printmaker and Drawing Artist Who Critiques Society Through Plastic',
    description:
      'Min JeongSee is a printmaker and drawing artist who critically explores the surface and disguise of contemporary society through the materiality of plastic. She holds a B.F.A. from Hongik University (Printmaking) and an M.F.A. from SAIC (Printmedia, Chicago). Her works are held at SOMA Museum, Youngeun Museum, and Frans Masereel Centrum (Belgium). View and collect her works at SAF Online.',
    ogDescription:
      'Min JeongSee — printmaker and drawing artist exploring the surfaces and disguises of contemporary society through plastic. Hongik University / SAIC M.F.A. Collections: SOMA, Youngeun Museum, Frans Masereel Centrum. 2025 Galleries Art Fair Zoom-In selection.',
    ogAlt: 'Min JeongSee — featured work',
    twitterTitle: 'Min JeongSee',
    twitterDescription: 'The surface of plastic, the truth beneath it — printmaker Min JeongSee',
    keywords:
      'Min JeongSee artist, Korean printmaker, plastic art, contemporary society critique, drawing artist',
  },
} as const;

export async function buildMinJeongSeeMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl(MIN_JEONGSEE_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('민정See');
  const artwork = allArtworks.find((a) => isMinJeongSeeArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Min JeongSee`
      : `${artwork.title} — 민정See`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(MIN_JEONGSEE_PATH, locale, true),
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

export default async function MinJeongSeeFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(MIN_JEONGSEE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('민정See');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isMinJeongSeeArtist(artwork.artist)
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
    { name: isEnglish ? 'Min JeongSee' : '민정See', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${MIN_JEONGSEE_PATH}#person-min-jeongsee`,
    name: isEnglish ? 'Min JeongSee' : '민정See',
    alternateName: isEnglish ? '민정See' : 'Min JeongSee',
    jobTitle: isEnglish ? 'Printmaker' : '판화가',
    description: isEnglish
      ? 'Min JeongSee is a Korean printmaker and drawing artist who critically explores the surface and disguise of contemporary society through the materiality of plastic. She holds a B.F.A. from Hongik University (Printmaking) and an M.F.A. in Printmedia from the School of the Art Institute of Chicago (SAIC).'
      : '민정See는 플라스틱이라는 물성을 통해 현대 사회의 표면과 위장을 비판적으로 탐구해 온 판화·드로잉 작가입니다. 홍익대학교 판화과를 졸업하고 시카고 SAIC에서 Printmedia 석사를 받았습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Hongik University, Department of Printmaking' : '홍익대학교 판화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'School of the Art Institute of Chicago (SAIC), Printmedia M.F.A.'
          : 'School of the Art Institute of Chicago (SAIC), Printmedia 석사',
      },
    ],
    knowsAbout: ['Printmaking', 'Drawing', 'Contemporary art', 'Artist books'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Min JeongSee — SAF Online' : '민정See — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Min JeongSee from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 민정See 작품을 소개합니다.',
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
        {/* Hero Section — 표면과 위장, 물성의 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 표면층 모티프 — 반투명 수평 레이어들 */}
          <div className="absolute top-0 left-0 w-full h-px bg-white/12" />
          <div className="absolute top-1/4 left-0 w-full h-px bg-white/8" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/6" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-white/4" />
          <div
            className="absolute top-0 left-0 w-full h-full opacity-5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.15) 40px)',
            }}
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Min JeongSee' : '민정See'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The surface of plastic,
                  <br />
                  <span className="text-primary-soft">the truth beneath it</span>
                </>
              ) : (
                <>
                  플라스틱의 표면,
                  <br />
                  <span className="text-primary-soft">그 아래의 진실</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Plastic is not just a material — it is a metaphor for disguise.
                  </span>
                  <span className="mt-2 block">
                    A printmaker and drawing artist who peels back the surface of contemporary
                    society.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">플라스틱은 소재가 아니라 위장의 은유다.</span>
                  <span className="mt-2 block">현대사회의 표면을 벗겨내는 판화·드로잉 작가.</span>
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
                    Peeling back —<br />
                    <span className="text-primary-strong">
                      the surface, the disguise, the material
                    </span>
                  </>
                ) : (
                  <>
                    벗겨내다 —<br />
                    <span className="text-primary-strong">표면, 위장, 그리고 물성</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Min JeongSee is a printmaker and drawing artist who critically explores the
                      surface and disguise of contemporary society through the materiality of
                      plastic. She graduated from the Department of Printmaking at Hongik
                      University, then pursued her M.F.A. in Printmedia at the School of the Art
                      Institute of Chicago (SAIC) — an institution at the forefront of expanded
                      printmaking practice — graduating in 2010. Her formation spans both the
                      rigorous technical tradition of Korean printmaking and the conceptual breadth
                      of American art school practice.
                    </p>
                    <p>
                      Plastic is central to her work not as spectacle but as analysis. The material
                      is omnipresent in contemporary life precisely because it conceals: it wraps,
                      coats, smooths, and presents surfaces that promise one thing and deliver
                      another. In Min JeongSee&apos;s hands, plastic becomes a medium for
                      interrogating the modes of disguise embedded in modern society — the packaging
                      of consumer culture, the polished faces of institutions, the layered
                      performances of everyday life.
                    </p>
                    <p>
                      Her practice has grown through a sustained body of titled series. Beginning
                      with <em>Plastic Beauty</em> (2009, Chicago) and{' '}
                      <em>My One False Image — Plasticated Falsity</em> (2010, Chicago), she
                      developed the{' '}
                      <strong className="font-bold text-charcoal-deep">Plastic Society</strong>{' '}
                      series (I and II, 2014–2015) — solo exhibitions that positioned the plastic
                      surface as a societal condition — and <em>Plastic Promise</em> (Youngeun
                      Museum, 2016), a milestone exhibition supported by Yongin Cultural Foundation.
                      Works held at the Frans Masereel Centrum (Belgium), Purdue University (USA),
                      the SOMA Museum Drawing Center, and the Joan Flasch Artist Book Collection
                      (Chicago) attest to an international reach built steadily across residencies
                      and exhibitions on multiple continents.
                    </p>
                    <p>
                      In recent years, her work has moved toward the relationship between light,
                      surface, and representation: <em>Representation After Light</em> (Seoripul Hyu
                      Gallery, 2024) and <em>Light Traces_Repetition</em> (2025) extend the
                      plastic-surface inquiry into questions of how images form, repeat, and leave
                      traces. Her selection as a Zoom-In artist at the 2025 Korea Galleries Art Fair
                      (화랑미술제) marked a recognition of this sustained and evolving practice.
                    </p>
                    <p>
                      Min JeongSee joins SAF not as a subject of its cause but as a fellow artist in
                      solidarity — contributing her work so that the proceeds may support the
                      mutual-aid loan fund for artists navigating financial exclusion.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      민정See는 플라스틱이라는 물성을 통해 현대 사회의 표면과 위장을 비판적으로
                      탐구해 온 판화·드로잉 작가다. 홍익대학교 판화과를 졸업한 뒤, 확장된 판화
                      실천의 최전선에 있는 시카고 SAIC(School of the Art Institute of Chicago)에서
                      Printmedia 석사를 2010년에 받았다. 한국 판화의 기술적 전통과 미국 미술학교의
                      개념적 폭을 두루 거친 형성기가 작업의 기반을 이룬다.
                    </p>
                    <p>
                      플라스틱은 그의 작업에서 볼거리가 아니라 분석의 대상이다. 이 소재가 현대
                      생활에 편재하는 것은 정확히 그것이 감추기 때문이다 — 싸고, 덮고, 매끄럽게
                      만들며, 약속과는 다른 무언가를 내놓는 표면을 제시한다. 민정See의 손에서
                      플라스틱은 현대사회에 내장된 위장의 방식들을 심문하는 매체가 된다 — 소비문화의
                      포장, 제도의 매끄러운 얼굴, 일상생활의 겹겹이 쌓인 연기들.
                    </p>
                    <p>
                      그의 작업은 지속적인 시리즈 연작으로 성장해 왔다. <em>Plastic Beauty</em>
                      (2009, 시카고)와 <em>My One False Image — Plasticated Falsity</em>(2010,
                      시카고)를 시작으로, 플라스틱의 표면을 사회적 조건으로 위치시킨{' '}
                      <strong className="font-bold text-charcoal-deep">Plastic Society</strong>{' '}
                      I·II(2014–2015), 용인문화재단 후원으로 열린 이정표적 개인전{' '}
                      <em>Plastic Promise</em>(영은미술관, 2016)로 이어졌다. 벨기에 Frans Masereel
                      Centrum, 미국 Purdue University, 소마미술관 드로잉센터, 시카고 Joan Flasch
                      Artist Book Collection 등의 소장은 여러 대륙에 걸친 레지던시와 전시로 꾸준히
                      쌓아온 국제적 현장을 증명한다.
                    </p>
                    <p>
                      최근 몇 년간 작업은 빛, 표면, 표상의 관계로 향하고 있다. <em>빛 이후 표상</em>
                      (서리풀휴갤러리, 2024)과 <em>빛자국_반복</em>(2025)은 플라스틱 표면 탐구를
                      이미지가 어떻게 형성되고, 반복되고, 흔적을 남기는가의 물음으로 확장한다. 2025
                      화랑미술제 Zoom-In 작가로 선정된 것은 이 지속적이고 진화하는 작업에 대한
                      인정이었다.
                    </p>
                    <p>
                      민정See는 씨앗페에 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 작품 판매 수익이 금융 차별을 겪는 예술인을 위한 상호부조 대출
                      기금으로 이어지도록.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* 작업을 관통하는 세 가지 언어 */}
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Three keys to the work' : '작업을 관통하는 세 가지 언어'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Plastic as metaphor' : '은유로서의 플라스틱'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Plastic is not simply a medium — it is a critical lens. Its capacity to imitate, coat, and disguise makes it the perfect material for interrogating how contemporary society constructs and presents its surfaces.'
                          : '플라스틱은 단순한 소재가 아니다 — 비판적 렌즈다. 모방하고, 덮고, 위장하는 능력이 이 물질을 현대사회가 어떻게 표면을 구성하고 제시하는지 심문하는 완벽한 매체로 만든다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Printmaking expanded' : '확장된 판화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Trained in both Korean printmaking tradition (Hongik) and expanded Printmedia practice (SAIC), her work moves freely between prints, drawings, artist books, and installation — the medium chosen for what it can reveal, not what it can display.'
                          : '한국 판화 전통(홍익대)과 확장된 Printmedia 실천(SAIC) 양쪽에서 훈련받은 작업은 판화·드로잉·아티스트 북·설치 사이를 자유롭게 오간다 — 보여줄 수 있는 것이 아니라 드러낼 수 있는 것을 위해 매체를 선택한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Surface, light, and trace' : '표면, 빛, 흔적'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "In recent work, the inquiry into plastic's disguising surface has opened toward questions of light and representation — how images form, how they repeat, and what traces they leave behind."
                          : '최근 작업에서 플라스틱의 위장 표면에 대한 탐구는 빛과 표상의 물음으로 열려 있다 — 이미지가 어떻게 형성되고, 어떻게 반복되며, 어떤 흔적을 남기는가.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가의 시간 — timeline */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'B.F.A., Department of Printmaking, Hongik University.'
                        : '홍익대학교 판화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo debut: Plastic Beauty, Base Space, Chicago. Multiple scholarships at SAIC (Korean Honor Scholarship, Thomas Baron Scholarship, Steve S. Kang Young Artist Award).'
                        : '개인전 데뷔: Plastic Beauty, 시카고. SAIC 재학 중 다수 장학금 수상(주미한국대사관 한국우수장학금, Thomas Baron 장학금, Steve S. Kang 신진작가상).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'M.F.A. in Printmedia, SAIC (Chicago). Solo: My One False Image — Plasticated Falsity, Gallery X, Chicago. Works acquired by Joan Flasch Artist Book Collection.'
                        : 'SAIC Printmedia 석사 졸업. 개인전: My One False Image — Plasticated Falsity, Gallery X, 시카고. Joan Flasch Artist Book Collection 작품 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residency at Frans Masereel Centrum (Belgium); works acquired by the Centre.'
                        : 'Frans Masereel Centrum 레지던시(벨기에); 작품 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residency at MMCA Goyang Studio. Group show at Viridian Artists (New York).'
                        : '국립현대미술관 고양창작스튜디오 레지던시. 단체전 참가, Viridian Artists (뉴욕).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: Plastic Society I, Gallery AG, Seoul (supported by Seoul Foundation for Arts and Culture, Korea Mecenat).'
                        : '개인전: Plastic Society I, 갤러리AG, 서울 (서울문화예술재단·한국메세나 후원).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: Plastic Promise, Youngeun Museum of Contemporary Art (Yongin Cultural Foundation support). Works acquired by Youngeun Museum. Residency at Youngeun Museum.'
                        : '개인전: Plastic Promise, 영은미술관 (용인문화재단 후원). 영은미술관 작품 소장. 영은미술관 레지던시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as SOMA Museum Drawing Center artist. Drawing portfolio acquired by SOMA.'
                        : '소마미술관 드로잉센터 작가 선정. 드로잉 포트폴리오 소마미술관 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Young Korean Artists group show, Purdue University (USA, Embassy of Korea support). Work acquired by Purdue University.'
                        : 'Young Korean Artists 단체전, Purdue University (주미한국대사관 후원). Purdue University 작품 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: Representation After Light, Seoripul Hyu Gallery (Seocho Cultural Foundation), Seoul.'
                        : '개인전: 빛 이후 표상, 서리풀휴갤러리(서초문화재단), 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as Zoom-In artist at Korea Galleries Art Fair (화랑미술제), COEX, Seoul. Kiaf 2025 participation.'
                        : '화랑미술제 Zoom-In 작가 선정, 코엑스, 서울. Kiaf 2025 참가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: Representation of Memory, Gallery Nut, Seoul.'
                        : '개인전: 기억의 표상, 갤러리너트, 서울.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* 소장처 */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Collections' : '소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'SOMA Museum Drawing Center, Seoul'
                        : '소마미술관 드로잉센터, 서울'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Youngeun Museum of Contemporary Art, Gyeonggi-do'
                        : '영은미술관, 경기도'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Frans Masereel Centrum, Belgium'
                        : 'Frans Masereel Centrum, 벨기에'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Purdue University, Indiana, USA'
                        : 'Purdue University, 인디애나, 미국'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Joan Flasch Artist Book Collection, Chicago, USA'
                        : 'Joan Flasch Artist Book Collection, 시카고, 미국'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Hyundai Children's Book Art Museum, Gyeonggi-do"
                        : '현대어린이책미술관, 경기도'}
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
                  <span className="text-charcoal-deep">on plastic, surface, and critique</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">플라스틱, 표면, 그리고 비판에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 플라스틱이라는 물성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Plastic as materiality — why this substance'
                    : '플라스틱이라는 물성 — 왜 이 소재인가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Plastic is the material of contemporary life not because it is beautiful or
                        durable but because it is infinitely adaptable — it can imitate almost any
                        other substance, wrap any shape, be coloured to match any desire. It is the
                        material of substitution, of the copy, of the surface that presents itself
                        as something it is not. In this sense, plastic is already a kind of argument
                        about the contemporary: a world in which surface is sovereign, and in which
                        the gap between appearance and reality is not a problem to be solved but a
                        condition to be managed.
                      </p>
                      <p>
                        Min JeongSee&apos;s engagement with plastic as both material and metaphor
                        begins from this recognition. Her practice does not simply use plastic; it
                        thinks through it. From the early <em>Plastic Beauty</em> and{' '}
                        <em>Plastic Society</em> series, through to the later work on transparency,
                        light, and representation, the recurring question is: what does a surface
                        hide, and what does it reveal about what it hides? The answer is never
                        simple — plastic can be transparent as well as opaque, fragile as well as
                        persistent, honest as well as deceptive.
                      </p>
                      <p>
                        This complexity is what makes plastic a rich critical medium rather than a
                        polemical one. The work does not condemn the surface; it attends to it —
                        pressing on the material until it yields what it has been holding.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        플라스틱이 현대 생활의 소재가 된 것은 아름답거나 내구성이 좋아서가 아니라
                        무한히 적응 가능하기 때문이다 — 거의 모든 다른 물질을 흉내 낼 수 있고, 어떤
                        형태도 감쌀 수 있으며, 어떤 욕망에도 맞게 색을 입힐 수 있다. 대체, 복제,
                        자신이 아닌 무언가인 척하는 표면의 소재다. 이 의미에서 플라스틱은 이미
                        현대에 관한 일종의 논변이다 — 표면이 군림하고, 외양과 현실 사이의 간극이
                        해결해야 할 문제가 아니라 관리해야 할 조건인 세계.
                      </p>
                      <p>
                        민정See의 플라스틱 — 소재이자 은유로서 — 에 대한 관여는 이 인식에서
                        시작한다. 그의 작업은 단순히 플라스틱을 사용하는 것이 아니라 그것을 통해
                        생각한다. 초기의 <em>Plastic Beauty</em>와 <em>Plastic Society</em>{' '}
                        시리즈에서 투명성, 빛, 표상에 관한 후기 작업까지, 되풀이되는 물음은 하나다:
                        표면은 무엇을 숨기고, 그것이 숨기는 것에 대해 무엇을 드러내는가? 답은 결코
                        단순하지 않다 — 플라스틱은 불투명한 동시에 투명할 수 있고, 지속적인 동시에
                        부서지기 쉬우며, 기만적인 동시에 솔직할 수 있다.
                      </p>
                      <p>
                        이 복잡성이 플라스틱을 논쟁적 매체가 아니라 풍부한 비판적 매체로 만드는
                        것이다. 작업은 표면을 단죄하지 않는다 — 그것에 주의를 기울인다. 소재가
                        품어온 것을 내놓을 때까지 눌러가면서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 표면과 위장 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Surface and disguise — the social critique'
                    : '표면과 위장 — 사회적 비판'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The word &quot;disguise&quot; (위장) that runs through discussions of Min
                        JeongSee&apos;s work is not accidental. Contemporary society is
                        characterized, above all, by the sophistication of its surfaces: the
                        packaging of consumer goods, the graphic design of institutions, the curated
                        faces presented on social media, the smooth exteriors of buildings and
                        bureaucracies that conceal what happens within. Plastic — translucent,
                        moldable, ubiquitous — is the material correlate of this condition.
                      </p>
                      <p>
                        Min JeongSee&apos;s practice works by holding the surface still long enough
                        to see through it. Printmaking is a medium built on the idea of the
                        transferred image — the press that moves an image from one surface to
                        another, the matrix that underlies the print. In her hands, this structural
                        feature of the medium becomes a critical tool: the print reveals the
                        underside, the plate beneath the page, the pressure required to produce what
                        appears effortless on the surface.
                      </p>
                      <p>
                        The <em>Plastic Society</em> series staged this most directly: placing
                        plastic surfaces as social fact, asking what it would mean to live within a
                        world of such surfaces. <em>Plastic Promise</em> pressed further — what is
                        promised by a surface, and what is delivered? More recent work on light and
                        representation extends the question into the realm of image-making itself:
                        how does an image form on a surface, and what does it leave when it is gone?
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민정See의 작업 논의에서 반복되는 단어 &apos;위장&apos;은 우연이 아니다.
                        현대사회는 무엇보다도 표면의 정교함으로 특징지어진다 — 소비재의 포장, 제도의
                        그래픽 디자인, 소셜 미디어에 제시되는 큐레이팅된 얼굴들, 내부에서 일어나는
                        것을 감추는 건물과 관료제의 매끄러운 외관. 플라스틱 — 반투명하고, 성형
                        가능하며, 편재하는 — 은 이 조건의 물질적 상관물이다.
                      </p>
                      <p>
                        민정See의 작업은 표면이 뚫어 볼 수 있을 만큼 오래 멈춰 있도록 잡아두는
                        방식으로 작동한다. 판화는 전사된 이미지라는 개념 위에 구축된 매체다 —
                        이미지를 한 표면에서 다른 표면으로 옮기는 압인, 판화 아래에 있는 판. 그의
                        손에서 이 매체의 구조적 특성은 비판적 도구가 된다: 판화는 아랫면을 드러내고,
                        페이지 아래의 판을, 표면에서 힘없어 보이는 것을 만들어내는 데 필요한 압력을.
                      </p>
                      <p>
                        <em>Plastic Society</em> 시리즈는 이것을 가장 직접적으로 연출했다 — 플라스틱
                        표면을 사회적 사실로 위치시키며, 그런 표면들로 이루어진 세계에서 산다는 것이
                        무엇을 의미하는지 묻는다. <em>Plastic Promise</em>는 더 밀어붙였다 — 표면이
                        약속하는 것은 무엇이고, 전달되는 것은 무엇인가? 빛과 표상에 관한 최근 작업은
                        이 물음을 이미지 제작 자체의 영역으로 확장한다 — 이미지가 표면에서 어떻게
                        형성되고, 사라질 때 무엇을 남기는가?
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 판화·드로잉·아티스트 북 — 확장된 실천 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Printmaking, drawing, artist books — an expanded practice'
                    : '판화·드로잉·아티스트 북 — 확장된 실천'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Min JeongSee&apos;s formation at Hongik University and SAIC gave her access
                        to two distinct traditions. At Hongik, one of Korea&apos;s leading
                        printmaking programs, she absorbed the technical rigour and material
                        discipline of Korean printmaking practice. At SAIC&apos;s Printmedia
                        department — a program defined by its expansion of printmaking beyond
                        conventional boundaries into installation, video, books, and performance —
                        she encountered the conceptual breadth that would define her subsequent
                        practice.
                      </p>
                      <p>
                        The artist book, a form she has pursued throughout her career and which has
                        entered institutional collections including the Joan Flasch Artist Book
                        Collection and Hyundai Children&apos;s Book Art Museum, is a particularly
                        apt vehicle for her inquiry. A book is itself a surface technology — a
                        device for sequencing images and texts, for presenting content through
                        layers. In Min JeongSee&apos;s artist books, this structure becomes a way of
                        building up and peeling back, of constructing a surface only to reveal what
                        is beneath.
                      </p>
                      <p>
                        Residencies at Frans Masereel Centrum in Belgium — one of the world&apos;s
                        foremost centres for printmaking and the graphic arts — and at MMCA Goyang
                        Studio, 대구예술발전소, and 청주미술창작스튜디오 have embedded her practice
                        in both the international printmaking community and the Korean contemporary
                        art field. The range of these placements — from Belgium to Chicago to Seoul
                        — reflects a practice that has always understood printmaking as a mobile,
                        transferable discipline: one whose logic of impression and transfer applies
                        wherever a surface exists.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        홍익대학교와 SAIC에서의 형성기는 민정See에게 두 가지 뚜렷한 전통에 대한
                        접근을 제공했다. 한국의 주요 판화 프로그램 중 하나인 홍익대에서 한국 판화
                        실천의 기술적 엄정함과 재료적 훈련을 흡수했다. SAIC의 Printmedia과에서 —
                        판화를 설치·영상·북·퍼포먼스로 확장하는 것으로 정의된 프로그램 — 이후 작업을
                        규정할 개념적 폭을 만났다.
                      </p>
                      <p>
                        경력 전반에 걸쳐 추구해 온 아티스트 북 — Joan Flasch Artist Book
                        Collection과 현대어린이책미술관 등 기관 소장에 들어간 형태 — 은 그의 탐구에
                        특히 적합한 매체다. 책 자체가 표면 기술이다 — 이미지와 텍스트를 순서 짓고,
                        층위를 통해 내용을 제시하는 장치. 민정See의 아티스트 북에서 이 구조는 쌓아
                        올리고 벗겨내는 방식, 표면을 구성해 아래에 있는 것을 드러내는 방식이 된다.
                      </p>
                      <p>
                        세계 최고 수준의 판화·그래픽 아트 센터 중 하나인 벨기에 Frans Masereel
                        Centrum과 국립현대미술관 고양창작스튜디오, 대구예술발전소,
                        청주미술창작스튜디오 레지던시는 그의 작업을 국제 판화 공동체와 한국 현대미술
                        현장 양쪽에 뿌리내리게 했다. 벨기에에서 시카고, 서울에 이르는 이 배치의
                        범위는 판화를 항상 이동 가능하고 전달 가능한 분야로 이해해 온 작업을
                        반영한다 — 표면이 존재하는 곳마다 인상과 전사의 논리가 적용되는 분야로.
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
                      Plastic is the surface of the contemporary world, and Min JeongSee has spent
                      her career pressing on it — asking what it conceals, what it promises, and
                      what trace it leaves behind. From Chicago to Seoul to Belgium, her practice
                      has built an international body of work that holds the surface still long
                      enough to see through it. She joins SAF not as a subject of its cause but as a
                      fellow artist in solidarity — so that the field she has worked to expand might
                      remain open to the generation that follows.
                    </>
                  ) : (
                    <>
                      플라스틱은 현대 세계의 표면이고, 민정See는 경력 내내 그것을 눌러왔다 — 그것이
                      무엇을 감추는지, 무엇을 약속하는지, 어떤 흔적을 남기는지 물으면서. 시카고에서
                      서울, 벨기에까지, 그의 작업은 표면이 뚫어 볼 수 있을 만큼 오래 멈추게 하는
                      국제적 작업 체계를 구축했다. 씨앗페에는 이 캠페인의 대상이 아니라, 동료
                      예술인과의 연대자로 함께한다 — 그가 확장하고자 해온 현장이 다음 세대에게도
                      열려 있을 수 있도록.
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
                SURFACE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Min JeongSee</span>
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
                    Min JeongSee joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    민정See 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={MIN_JEONGSEE_PATH}
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
