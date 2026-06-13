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

// 작가 feature는 작가 페이지(/artworks/artist/이지은)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_JIEUN_PATH = `/artworks/artist/${encodeURIComponent('이지은')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeJieunArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이지은' ||
    n === 'lee jieun' ||
    n === 'lee ji-eun' ||
    n === 'ji eun lee' ||
    n === 'ji-eun lee' ||
    n.replace(/[\s-]+/g, '') === 'leejieun' ||
    n.replace(/[\s-]+/g, '') === 'jieunlee'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이지은 — Hollowed Colors, 입체와 회화의 경계',
    description:
      '입체와 회화의 경계를 탐구하는 추상 작가 이지은(1984–). 국민대 입체미술전공 학사·석사를 마치고 독일 브레멘 국립예술대학교를 거쳐 뒤셀도르프 쿤스트아카데미에서 프란카 훼렌쉐메이어 교수반의 마이스터슐러를 수료했다. 비워진 색(hollowed colors)과 구조, 안과 밖의 관계를 묻는 형식 실험. 씨앗페 온라인에서 이지은의 작품을 만나보세요.',
    ogDescription:
      '입체와 회화의 경계를 탐구하는 추상 작가 이지은. 비워진 색·구조·뒤집힘 — 한국과 독일을 오가며 쌓은 형식 실험.',
    ogAlt: '이지은 대표 작품',
    twitterTitle: '이지은',
    twitterDescription: 'Hollowed Colors — 입체와 회화의 경계를 탐구하는 추상 작가 이지은',
    keywords:
      '이지은 작가, 이지은 추상, 입체 회화, Hollowed Colors, 쿤스트아카데미 뒤셀도르프, 마이스터슐러, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Jieun — Hollowed Colors, Between Sculpture and Painting',
    description:
      'Selected works by Lee Jieun (b. 1984), an abstract artist exploring the boundary between sculpture and painting. After a BA and MA in Sculpture at Kookmin University, she studied at the University of the Arts Bremen and completed her Diplom and Meisterschüler studies in the class of Prof. Franka Hörnschemeyer (Klasse Franka Hörnschemeyer) at the Kunstakademie Düsseldorf. Her formal experiments question hollowed colors, structure, and the relationship between inside and outside. View her works at SAF Online.',
    ogDescription:
      'Lee Jieun — an abstract artist working between sculpture and painting. Hollowed colors, structure, and reversal, shaped between Korea and Germany.',
    ogAlt: 'Lee Jieun — featured work',
    twitterTitle: 'Lee Jieun',
    twitterDescription:
      'Hollowed Colors — an abstract artist working between sculpture and painting',
    keywords:
      'Lee Jieun artist, Ji Eun Lee, abstract art, sculpture and painting, Kunstakademie Düsseldorf, Meisterschüler, SAF Online',
  },
} as const;

export async function buildLeeJieunMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_JIEUN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이지은');
  const artwork = allArtworks.find((a) => isLeeJieunArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Jieun`
      : `${artwork.title} — 이지은`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_JIEUN_PATH, locale, true),
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

export default async function LeeJieunFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_JIEUN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이지은');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeJieunArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Jieun' : '이지은', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_JIEUN_PATH}#person-lee-jieun`,
    name: isEnglish ? 'Lee Jieun' : '이지은',
    alternateName: isEnglish ? '이지은' : 'Lee Jieun',
    jobTitle: isEnglish ? 'Artist' : '작가',
    description: isEnglish
      ? 'Lee Jieun (b. 1984) is an abstract artist exploring the boundary between sculpture and painting. After a BA and MA in Sculpture at Kookmin University, she studied at the University of the Arts Bremen and completed her Diplom and Meisterschüler studies in the class of Prof. Franka Hörnschemeyer at the Kunstakademie Düsseldorf in 2017.'
      : '이지은(1984–)은 입체와 회화의 경계를 탐구하는 추상 작가다. 국민대 입체미술전공 학사·석사를 마치고 독일 브레멘 국립예술대학교를 거쳐 2017년 뒤셀도르프 쿤스트아카데미에서 프란카 훼렌쉐메이어 교수반의 디플롬·마이스터슐러를 수료했다.',
    birthDate: '1984',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Kookmin University, Dept. of Sculpture' : '국민대학교 입체미술전공',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Kunstakademie Düsseldorf' : '뒤셀도르프 쿤스트아카데미',
      },
    ],
    knowsAbout: ['Abstract art', 'Sculpture', 'Painting', 'Spatial structure'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Jieun — SAF Online' : '이지은 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Jieun from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이지은 작품들을 소개합니다.',
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
        {/* Hero Section — 비워진 색·구조 모티프, 미니멀한 화이트 큐브 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden bg-charcoal-deep">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Structural grid — 입체·구조의 격자 암시 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/25" />
          <div className="absolute top-0 right-10 h-full w-px bg-white/10" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-white/6" />
          <div className="absolute bottom-1/4 left-0 w-full h-px bg-white/6" />

          {/* Hollowed frame — 비워진 색의 빈 사각 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-56 md:h-56 border border-white/10 pointer-events-none" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Jieun · b. 1984' : '이지은 · 1984–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Hollowed colors,
                  <br />
                  <span className="text-primary-soft">between sculpture and painting</span>
                </>
              ) : (
                <>
                  비워진 색,
                  <br />
                  <span className="text-primary-soft">입체와 회화의 경계에서</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Abstract form and color, suspended between the surface and the space.
                  </span>
                  <span className="mt-2 block">
                    Formal experiments shaped between Korea and Germany.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">표면과 공간 사이에 멈춰 선 추상의 형태와 색.</span>
                  <span className="mt-2 block">한국과 독일을 오가며 쌓아 올린 형식 실험.</span>
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
                    Between surface and space —<br />
                    <span className="text-primary-strong">an abstraction of hollowed color</span>
                  </>
                ) : (
                  <>
                    표면과 공간 사이 —<br />
                    <span className="text-primary-strong">비워진 색의 추상</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Jieun (b. 1984) is an abstract artist who works along the boundary between
                      sculpture and painting. She completed a BA (2007) and MA (2009) in Sculpture
                      at Kookmin University in Seoul, building her foundation in the language of
                      three-dimensional form before extending that language toward the surface of
                      the picture plane.
                    </p>
                    <p>
                      She then continued her studies in Germany. After completing nine semesters of
                      Fine Art at the University of the Arts Bremen (2015), she moved to the
                      Kunstakademie Düsseldorf, where she completed her Diplom and Meisterschüler
                      studies in 2017 in the class of Prof. Franka Hörnschemeyer (Klasse Franka
                      Hörnschemeyer) — a class whose practice cross-media questions of spatial
                      relation directly shaped her own concern with structure and the interval
                      between inside and outside.
                    </p>
                    <p>
                      Across this Korean and German training, her work has held to a single
                      question: where does sculpture end and painting begin? She works through
                      structured, woven, and carved forms, making the spatial logic of
                      three-dimensional construction visible on a surface — and the picture-plane
                      effects of relief visible within form. Her vocabulary gathers around{' '}
                      <strong className="font-bold text-charcoal-deep">
                        hollowed colors, structure, and reversal
                      </strong>
                      : color that is emptied rather than filled, structure exposed rather than
                      concealed, the inside turned out.
                    </p>
                    <p>
                      Her recent solo exhibition 〈Hollowed Colors〉 (Art Space &apos;at&apos;,
                      Seoul, 2025) gathers this line of inquiry under a single title. The works do
                      not illustrate a subject; they investigate the conditions of the abstract
                      object itself — its color, its hollowness, its threshold between the flat and
                      the volumetric. The tone is minimal and structural: a quiet, exacting
                      attention to what an abstract form can hold.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이지은(1984–)은 입체와 회화의 경계에서 작업하는 추상 작가다. 국민대학교
                      입체미술전공 학사(2007)와 석사(2009)를 마치며 3차원 형태의 언어로 토대를
                      다졌고, 그 언어를 화면의 표면으로 확장해 갔다.
                    </p>
                    <p>
                      이후 그는 독일에서 수학을 이어갔다. 브레멘 국립예술대학교에서 순수미술 9학기를
                      수료(2015)한 뒤 뒤셀도르프 쿤스트아카데미로 옮겨, 2017년 프란카 훼렌쉐메이어
                      교수반(Klasse Franka Hörnschemeyer)에서 디플롬·마이스터슐러를 수료했다. 공간의
                      관계를 매체를 가로질러 묻는 이 교수반의 작업이, 구조와 안팎의 간격을 향하는
                      그의 관심을 직접 빚어냈다.
                    </p>
                    <p>
                      한국과 독일을 오간 이 수련 내내, 그의 작업은 하나의 물음을 붙들어 왔다: 입체는
                      어디서 끝나고 회화는 어디서 시작되는가. 그는 구조적이고 엮이고 새겨진 형태를
                      경유하며, 3차원 구성의 공간 논리를 표면 위에 드러내고 — 부조의 회화적 효과를
                      형태 안에서 보이게 한다. 그의 어휘는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        비워진 색·구조·뒤집힘
                      </strong>{' '}
                      주위로 모인다: 채우기보다 비워진 색, 감추기보다 드러난 구조, 밖으로 뒤집힌
                      안쪽.
                    </p>
                    <p>
                      최근 개인전 〈Hollowed Colors〉(아트스페이스 엣, 서울, 2025)는 이 탐구의
                      흐름을 하나의 제목 아래 모은다. 작품들은 어떤 대상을 묘사하지 않는다. 추상적
                      사물 그 자체의 조건 — 색, 비워짐, 평면과 입체 사이의 문턱 — 을 탐문한다. 톤은
                      미니멀하고 구조적이다: 추상의 형태가 무엇을 담을 수 있는가에 대한, 조용하고
                      엄밀한 주의.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Artistic themes card */}
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
                        {isEnglish ? 'Between sculpture and painting' : '입체와 회화의 경계'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Trained first in sculpture, Lee works the threshold where three-dimensional form meets the picture plane — making spatial structure visible on a surface, and surface effects visible within form.'
                          : '입체에서 출발한 작가는 3차원 형태가 화면을 만나는 문턱에서 작업한다 — 공간의 구조를 표면 위에 드러내고, 표면의 효과를 형태 안에서 보이게 한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Hollowed colors and structure' : '비워진 색과 구조'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Her vocabulary gathers around color that is emptied rather than filled and structure exposed rather than concealed — abstract form and color examined as conditions in themselves.'
                          : '그의 어휘는 채우기보다 비워진 색, 감추기보다 드러난 구조 주위로 모인다 — 추상의 형태와 색을 그 자체의 조건으로 탐문한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Korea and Germany' : '한국과 독일을 오간 실험'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Her practice was shaped across Seoul, Bremen, and Düsseldorf — the spatial-relational concerns of the Hörnschemeyer class meeting a sculptural foundation built at Kookmin University.'
                          : '그의 작업은 서울·브레멘·뒤셀도르프를 가로질러 빚어졌다 — 훼렌쉐메이어 교수반의 공간·관계에 대한 관심이 국민대에서 다진 입체의 토대와 만난다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Timeline card */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born.' : '출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BA in Sculpture, Kookmin University, Seoul.'
                        : '국민대학교 입체미술전공 학사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MA in Sculpture, Kookmin University; solo exhibition 〈Boundary of skin〉 (Art Space Hyun, Seoul).'
                        : '국민대학교 입체미술전공 석사 졸업; 개인전 〈Boundary of skin〉(아트스페이스 현, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈One night stand〉 (Bremen); Pathfinder Award grand prize, poster concept (Kookmin University).'
                        : '개인전 〈One night stand〉(브레멘); 포스터컨셉 패스파인더 어워드 대상(국민대).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes nine semesters of Fine Art, University of the Arts Bremen; solo exhibition 〈Studies for between spaces〉 (Alternative Space Noon, Suwon); DAAD Matching Fund scholarship.'
                        : '브레멘 국립예술대학교 순수미술 9학기 수료; 개인전 〈Studies for between spaces〉(대안공간 눈, 수원); DAAD Matching Fund 장학금.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes Diplom and Meisterschüler studies in the class of Prof. Franka Hörnschemeyer, Kunstakademie Düsseldorf; group exhibition at Kunsthalle Düsseldorf.'
                        : '뒤셀도르프 쿤스트아카데미 프란카 훼렌쉐메이어 교수반 디플롬·마이스터슐러 수료; 쿤스트할레 뒤셀도르프 그룹전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈reversed〉 (Biesenbach Gallery, Cologne).'
                        : '개인전 〈reversed〉(비젠박흐 갤러리, 쾰른).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in Luxembourg Art Week.'
                        : 'Luxembourg Art Week 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈structure〉 (Quittenbaum Gallery, Munich) and 〈art-hoc〉 (Düsseldorf Art, Germany).'
                        : '개인전 〈structure〉(크비텐바움 갤러리, 뮌헨)·〈art-hoc〉(뒤셀도르프 아트, 독일).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Solo exhibition 〈Hollowed Colors〉 (Art Space 'at', Seoul)."
                        : '개인전 〈Hollowed Colors〉(아트스페이스 엣, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Exhibition at CICA Museum, Gimpo (forthcoming); participates in SAF Online in solidarity with fellow artists.'
                        : 'CICA Museum(김포) 전시 예정; 동료 예술인과의 연대로 씨앗페 온라인 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* Exhibitions / awards card */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & awards' : '주요 전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo exhibitions: <em>Hollowed Colors</em> (Art Space &apos;at&apos;,
                          Seoul, 2025), <em>structure</em> (Quittenbaum Gallery, Munich, 2023),{' '}
                          <em>reversed</em> (Biesenbach Gallery, Cologne, 2019)
                        </>
                      ) : (
                        <>
                          개인전: 〈Hollowed Colors〉(아트스페이스 엣, 서울, 2025), 〈structure〉
                          (크비텐바움 갤러리, 뮌헨, 2023), 〈reversed〉(비젠박흐 갤러리, 쾰른, 2019)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibitions centered in Germany: Quittenbaum, Biesenbach, and
                          Lachenmann Art galleries (Munich · Cologne · Frankfurt); Luxembourg Art
                          Week (2021); Kunsthalle Düsseldorf (2017)
                        </>
                      ) : (
                        <>
                          독일 중심 그룹전: 크비텐바움·비젠박흐·락헨만 아트 갤러리(뮌헨·쾰른·
                          프랑크푸르트); Luxembourg Art Week(2021); 쿤스트할레 뒤셀도르프(2017)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Awards & scholarships: Hochschulpreis grand prize, University of the Arts
                          Bremen (2011); DAAD Matching Fund scholarship (2015); Pathfinder Award
                          grand prize, poster concept, Kookmin University (2014)
                        </>
                      ) : (
                        <>
                          수상·장학: Hochschulpreis 대상, 브레멘 국립예술대학교(2011); DAAD Matching
                          Fund 장학금(2015); 포스터컨셉 패스파인더 어워드 대상, 국민대(2014)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Education: BA & MA in Sculpture, Kookmin University (2007, 2009); Fine
                          Art, University of the Arts Bremen (2015); Diplom & Meisterschüler,
                          Kunstakademie Düsseldorf, class of Prof. Franka Hörnschemeyer (2017)
                        </>
                      ) : (
                        <>
                          학력: 국민대학교 입체미술전공 학사·석사(2007, 2009); 브레멘 국립예술대학교
                          순수미술 9학기 수료(2015); 뒤셀도르프 쿤스트아카데미 프란카 훼렌쉐메이어
                          교수반 디플롬·마이스터슐러 수료(2017)
                        </>
                      )}
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
                  <span className="text-charcoal-deep">on form, color, and the threshold</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">형태와 색과 문턱에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 입체에서 회화로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From sculpture to the surface — a foundation in form'
                    : '입체에서 표면으로 — 형태의 토대'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Jieun&apos;s training began in sculpture. Her BA and MA at Kookmin
                        University were in the department of three-dimensional art, and that
                        grounding is legible throughout her later work: a sensitivity to how a form
                        occupies space, to weight and hollowness, to the difference between a
                        surface and a volume. Where many painters arrive at abstraction by reducing
                        an image, Lee arrives at it by building an object and then asking what
                        happens at its surface.
                      </p>
                      <p>
                        This is why her practice resists the usual division between the sculptural
                        and the pictorial. A structured, woven, or carved form is not a sculpture
                        that has been photographed flat; it is a proposition about how the logic of
                        construction can register as color and image on a plane. The picture plane,
                        in turn, is treated not as a window but as a thin solid — something with an
                        inside.
                      </p>
                      <p>
                        The earliest exhibitions already name this concern. 〈Boundary of skin〉
                        (2009) and 〈Studies for between spaces〉 (2015) both locate the work at a
                        threshold — skin, interval, the space between spaces. The question was set
                        early, and the decades since have been a sustained refinement of it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이지은의 수련은 입체에서 시작됐다. 국민대학교 학사·석사가 모두
                        입체미술전공이 었고, 그 토대는 이후의 작업 전반에서 읽힌다: 형태가 공간을
                        어떻게 점유하는가, 무게와 비워짐, 표면과 부피의 차이에 대한 감각. 많은
                        화가가 이미지를 덜어내며 추상에 이른다면, 이지은은 사물을 세운 뒤 그
                        표면에서 무슨 일이 일어나는지를 물으며 추상에 이른다.
                      </p>
                      <p>
                        그래서 그의 작업은 입체와 회화 사이의 익숙한 구분에 저항한다. 구조적이고
                        엮이고 새겨진 형태는, 납작하게 사진으로 찍힌 조각이 아니다. 구성의 논리가
                        평면 위에서 어떻게 색과 이미지로 등록되는가에 대한 제안이다. 화면은 거꾸로,
                        창문이 아니라 얇은 고체로 — 안쪽을 가진 무언가로 — 다뤄진다.
                      </p>
                      <p>
                        초기 전시들이 이미 이 관심을 이름 붙인다. 〈Boundary of skin〉(2009)과
                        〈Studies for between spaces〉(2015)는 모두 작업을 하나의 문턱에 둔다 —
                        피부, 간격, 공간들 사이의 공간. 물음은 일찍 놓였고, 그 이후의 시간은 그것을
                        지속적으로 다듬는 일이었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 비워진 색, 구조, 뒤집힘 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'Hollowed colors, structure, reversal' : '비워진 색, 구조, 뒤집힘'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Three words recur as titles across her exhibitions, and together they read
                        almost as a method. 〈structure〉 (Munich, 2023) names the armature: the
                        visible logic of how a thing is built, exposed rather than hidden.
                        〈reversed〉 (Cologne, 2019) names the operation: turning the inside out,
                        making the back of a form its face. And 〈Hollowed Colors〉 (Seoul, 2025)
                        names the result: color that is emptied rather than applied — a hue that
                        belongs to a cavity, an absence, a space that has been carved away.
                      </p>
                      <p>
                        Read together, these are not three separate bodies of work but one
                        continuous inquiry into the abstract object. Structure is exposed so that it
                        can be reversed; reversal hollows the form; the hollow is where color lives.
                        Abstraction here is not decorative arrangement but an investigation of
                        conditions — what color is when it is not filling an image, what a form is
                        when its inside has become its outside.
                      </p>
                      <p>
                        The tone throughout is minimal and exacting. There is no narrative to decode
                        and no figure to recognise. What the work asks of a viewer is attention to
                        the object itself: its edges, its intervals, its emptied color — the quiet
                        precision of an abstraction that holds its questions in the open.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        세 단어가 그의 전시 제목으로 반복되며, 함께 읽으면 거의 하나의 방법처럼
                        들린다. 〈structure〉(뮌헨, 2023)는 골격을 이름 붙인다: 사물이 어떻게
                        세워졌는가의 논리를, 감추지 않고 드러내는 것. 〈reversed〉(쾰른, 2019)는
                        조작을 이름 붙인다: 안쪽을 밖으로 뒤집어, 형태의 뒷면을 그 얼굴로 만드는 것.
                        그리고 〈Hollowed Colors〉(서울, 2025)는 결과를 이름 붙인다: 칠해지기보다
                        비워진 색 — 빈 공간, 부재, 깎여 나간 자리에 속한 색조.
                      </p>
                      <p>
                        함께 읽으면, 이것은 세 개의 별개 작업이 아니라 추상적 사물에 대한 하나의
                        연속된 탐문이다. 구조는 뒤집을 수 있도록 드러나고, 뒤집기는 형태를 비우며,
                        비워진 곳에 색이 산다. 여기서 추상은 장식적 배열이 아니라 조건의 탐구다 —
                        이미지를 채우지 않을 때 색은 무엇인가, 안쪽이 바깥이 됐을 때 형태는
                        무엇인가.
                      </p>
                      <p>
                        전반의 톤은 미니멀하고 엄밀하다. 해독할 서사도, 알아볼 형상도 없다. 작업이
                        관객에게 요청하는 것은 사물 그 자체에 대한 주의다: 그 가장자리, 그 간격, 그
                        비워진 색 — 물음을 열린 채로 붙드는 추상의 조용한 정밀함.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 한국과 독일을 오간 형식 실험 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Korea and Germany — two grounds for one question'
                    : '한국과 독일 — 하나의 물음을 위한 두 토대'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Jieun&apos;s formation crosses two art-educational cultures. The
                        sculptural foundation came from Kookmin University in Seoul; the conceptual
                        sharpening came from Germany — first the University of the Arts Bremen, then
                        the Kunstakademie Düsseldorf. The Düsseldorf academy is among the most
                        influential art schools in Europe, and the class of Prof. Franka
                        Hörnschemeyer, which works across media on questions of spatial relation,
                        gave her concerns a rigorous home.
                      </p>
                      <p>
                        Completing the Meisterschüler — the academy&apos;s designation for a master
                        student recognised by a professor — is a marker of that engagement. But the
                        more important inheritance is methodological: a way of treating the
                        relationship between a form and the space around it as the primary subject
                        of the work, rather than a support for some other content.
                      </p>
                      <p>
                        Her exhibition record reflects this dual ground. The solo and group shows
                        cluster in Germany — Munich, Cologne, Frankfurt, Düsseldorf, with a stop at
                        Luxembourg Art Week — while the 〈Hollowed Colors〉 exhibition (Seoul, 2025)
                        and a forthcoming 2026 exhibition at the CICA Museum in Gimpo return the
                        work to Korea. The question travels; it does not change.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이지은의 형성은 두 미술 교육의 문화를 가로지른다. 입체의 토대는 서울의
                        국민대학교에서 왔고, 개념적 벼림은 독일에서 왔다 — 먼저 브레멘
                        국립예술대학교, 이어 뒤셀도르프 쿤스트아카데미. 뒤셀도르프 아카데미는
                        유럽에서 가장 영향력 있는 미술학교 중 하나이며, 공간의 관계를 매체를
                        가로질러 다루는 프란카 훼렌쉐메이어 교수반은 그의 관심에 엄밀한 거처를
                        마련해 줬다.
                      </p>
                      <p>
                        교수가 인정한 마이스터슐러 — 아카데미가 부여하는 마스터 학생 자격 — 의
                        수료는 그 관여의 표지다. 그러나 더 중요한 상속은 방법론적이다: 형태와 그것을
                        둘러싼 공간의 관계를, 다른 내용을 떠받치는 지지대가 아니라 작업의 일차적
                        주제로 다루는 방식.
                      </p>
                      <p>
                        그의 전시 이력이 이 이중의 토대를 비춘다. 개인전과 그룹전은 독일에 모인다 —
                        뮌헨, 쾰른, 프랑크푸르트, 뒤셀도르프, 그리고 Luxembourg Art Week을 거쳐 —
                        한편 〈Hollowed Colors〉 전(서울, 2025)과 2026년 김포 CICA Museum 예정
                        전시는 작업을 한국으로 되돌린다. 물음은 이동하되, 바뀌지 않는다.
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
                      From a sculptural foundation in Seoul to the academy classes of Düsseldorf,
                      Lee Jieun has pursued a single question: where does form end and color begin,
                      and what lives in the hollow between them? She joins this campaign not as a
                      subject of its cause but as a fellow artist in solidarity — so that those who
                      come after might work with the freedom her experiments have been in search of.
                    </>
                  ) : (
                    <>
                      서울에서 다진 입체의 토대에서 뒤셀도르프 아카데미의 교수반까지, 이지은은
                      하나의 물음을 추구해 왔다: 형태는 어디서 끝나고 색은 어디서 시작되는가, 그리고
                      둘 사이의 비워진 자리에는 무엇이 사는가. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음 세대의
                      예술인들이 그의 실험이 찾아온 자유 안에서 일할 수 있도록.
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
                {isEnglish ? 'Works' : '작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                HOLLOWED
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Jieun</span>
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
                    Lee Jieun joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이지은 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_JIEUN_PATH}
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
