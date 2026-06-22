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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/박은선)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_EUNSEON_PATH = `/artworks/artist/${encodeURIComponent('박은선')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isParkEunseonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '박은선' ||
    n === 'park eunseon' ||
    n === 'park eun-seon' ||
    n === 'park eun sun' ||
    n.replace(/[\s-]+/g, '') === 'parkeunseon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박은선 — 한국·로마·인도를 잇는 화가',
    description:
      '동국대학교 서양화과와 이탈리아 로마국립아카데미를 졸업하고, 인도 캘커타·샨티니케탄의 Birla Academy와 프랑스 트로아·파리의 국제 레지던시를 거친 화가 박은선. 18회의 개인전과 200회 이상의 국내외 기획전을 통해 이동과 체류 속에서 형성된 회화 세계를 씨앗페 온라인에서 만날 수 있습니다.',
    ogDescription:
      '한국에서 로마로, 인도 샨티니케탄과 프랑스 파리의 국제 레지던시를 잇는 화가 박은선. 이동과 체류 속에서 빚어진 회화.',
    ogAlt: '박은선 대표 작품',
    twitterTitle: '박은선',
    twitterDescription: '한국·로마·인도를 잇는 화가 — 국제 레지던시의 궤적, 박은선',
    keywords:
      '박은선 화가, 박은선 작가, 회화, 로마국립아카데미, 샨티니케탄, Cité Internationale des Arts, 국제 레지던시, 씨앗페 온라인',
  },
  en: {
    title: 'Park Eunseon — A Painter Across Korea, Rome, and India',
    description:
      'Park Eunseon graduated from Dongguk University’s Department of Western Painting and the Accademia di Belle Arti di Roma in Italy, and worked through international residencies including the Birla Academy in Kolkata and Santiniketan, India, and the Cité Internationale des Arts in Paris. With 18 solo exhibitions and over 200 group shows, her painting is shaped by movement and dwelling. View her works at SAF Online.',
    ogDescription:
      'Park Eunseon — a painter whose practice connects Korea, Rome, the residencies of Santiniketan in India, and Paris. Painting shaped by movement and dwelling.',
    ogAlt: 'Park Eunseon — featured work',
    twitterTitle: 'Park Eunseon',
    twitterDescription: 'A painter across Korea, Rome, and India — the trajectory of residencies',
    keywords:
      'Park Eunseon artist, painter, Accademia di Belle Arti di Roma, Santiniketan, Cité Internationale des Arts, artist residency',
  },
} as const;

export async function buildParkEunseonMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_EUNSEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박은선');
  const artwork = allArtworks.find((a) => isParkEunseonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Eunseon`
      : `${artwork.title} — 박은선`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_EUNSEON_PATH, locale, true),
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

export default async function ParkEunseonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_EUNSEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박은선');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkEunseonArtist(artwork.artist)
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
    { name: isEnglish ? 'Park Eunseon' : '박은선', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_EUNSEON_PATH}#person-park-eunseon`,
    name: isEnglish ? 'Park Eunseon' : '박은선',
    alternateName: isEnglish ? '박은선' : 'Park Eunseon',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Park Eunseon is a painter who graduated from Dongguk University and the Accademia di Belle Arti di Roma, and whose practice has been shaped across international residencies in Korea, India, and France.'
      : '박은선은 동국대학교 서양화과와 이탈리아 로마국립아카데미를 졸업하고, 한국·인도·프랑스의 국제 레지던시를 거치며 회화 세계를 빚어 온 화가입니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Dongguk University, Dept. of Western Painting'
          : '동국대학교 예술대학 서양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Accademia di Belle Arti di Roma' : '이탈리아 로마국립아카데미',
      },
    ],
    knowsAbout: isEnglish
      ? ['Painting', 'Printmaking', 'Artist residencies']
      : ['회화', '판화', '국제 레지던시'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Eunseon — SAF Online' : '박은선 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Eunseon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 박은선 작품을 소개합니다.',
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
        {/* Hero Section — 이동과 체류, 국제적·유랑적 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 도시들을 잇는 좌표선 모티프 — 한국·로마·인도·프랑스 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-primary/25" />
          <div className="absolute top-0 right-14 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-sm md:text-base tracking-widest shadow-xl break-keep">
                {isEnglish
                  ? 'Park Eunseon · Painter · Seoul — Rome — Kolkata — Paris'
                  : '박은선 · 화가 · 서울 — 로마 — 캘커타 — 파리'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A painter shaped
                  <br />
                  <span className="text-primary-soft">by movement and dwelling</span>
                </>
              ) : (
                <>
                  이동과 체류가
                  <br />
                  <span className="text-primary-soft">한 화가를 빚는다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">From Seoul to Rome, from Santiniketan to Paris.</span>
                  <span className="mt-2 block">
                    A practice carried across cities and residencies.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">서울에서 로마로, 샨티니케탄에서 파리로.</span>
                  <span className="mt-2 block">도시와 레지던시를 건너온 작업.</span>
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
                    Korea, Rome, India —<br />
                    <span className="text-primary-strong">a trajectory of residencies</span>
                  </>
                ) : (
                  <>
                    한국·로마·인도 —<br />
                    <span className="text-primary-strong">국제 레지던시의 궤적</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Eunseon graduated from the Department of Western Painting at Dongguk
                      University&apos;s College of Arts, and then from the Accademia di Belle Arti
                      di Roma in Italy. Her formation begins where two distinct painting cultures
                      meet — a Korean art-school grounding carried into the long lineage of the
                      Roman academy.
                    </p>
                    <p>
                      She has held{' '}
                      <strong className="font-bold text-charcoal-deep">18 solo exhibitions</strong>{' '}
                      at venues including Art Park, Artside, Gana Insa Art Center, Gana Art Space,
                      Gallery Hyundai Window, Gallery Lux, THE GALLERY D, and Chosun Ilbo Gallery
                      One, as well as the Cité Internationale des Arts Gallery and the Passages
                      Contemporary Art Center in France. Her work has also appeared in more than{' '}
                      <strong className="font-bold text-charcoal">
                        200 curated and group shows
                      </strong>{' '}
                      at home and abroad.
                    </p>
                    <p>
                      What distinguishes her path is the breadth of its residencies. Selected for
                      artist-in-residence programs in Korea and overseas, she worked through the
                      &lsquo;D&rsquo; International Residency Program (Daemyung Studio), the Gana
                      Atelier Residency (2nd cohort), and the Changdong Art Studio (1st cohort) at
                      home —
                    </p>
                    <p>
                      and abroad, through the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Birla Academy of Art and Culture
                      </strong>{' '}
                      residence in Kolkata and Santiniketan, India, Passages in Troyes, France, and
                      the Cité Internationale des Arts in Paris. Each city left its own deposit. Her
                      painting is not the record of a single place but the sediment of many — a
                      practice formed in transit, in the act of arriving, staying, and moving on.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박은선은 동국대학교 예술대학 서양화과를 졸업하고, 이어 이탈리아
                      로마국립아카데미를 졸업했다. 그의 형성은 서로 다른 두 회화 문화가 만나는
                      자리에서 시작된다 — 한국 미술학교의 토대를, 로마 아카데미의 오랜 계보 속으로
                      가져간 것이다.
                    </p>
                    <p>
                      그는 아트파크, 아트사이드, 가나인사아트센터, 가나아트스페이스,
                      갤러리현대윈도우, 갤러리 룩스, THE GALLERY D, 조선일보사 갤러리 One을 비롯해
                      프랑스의 Cité Internationale des Arts 갤러리, Passages 현대예술센터 등에서{' '}
                      <strong className="font-bold text-charcoal-deep">18회의 개인전</strong>을
                      열었다. 작업은{' '}
                      <strong className="font-bold text-charcoal">
                        200회 이상의 국내외 기획전·단체전
                      </strong>
                      에도 함께했다.
                    </p>
                    <p>
                      그의 행로를 특별하게 만드는 것은 레지던시의 폭이다. 국내외 입주작가 프로그램에
                      선정되어, 국내에서는 &lsquo;D&rsquo; 국제 레지던시 프로그램(대명 스튜디오),
                      가나아뜰리에 입주 2기, 창동미술스튜디오 입주 1기를 거쳤고 —
                    </p>
                    <p>
                      국외에서는 인도 캘커타·샨티니케탄의{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Birla Academy of Art and Culture
                      </strong>{' '}
                      레지던스, 프랑스 트로아의 Passages, 파리의 국제예술공동체 Cité Internationale
                      des Arts에 입주해 활동했다. 도시마다 저마다의 퇴적을 남겼다. 그의 회화는 한
                      장소의 기록이 아니라 여러 장소의 침전이다 — 도착하고, 머물고, 다시 떠나는 그
                      이동 속에서 형성된 작업.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Where the work was formed' : '작업이 형성된 자리'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Seoul and Rome' : '서울과 로마'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg break-keep">
                        {isEnglish
                          ? 'A grounding in Korean Western painting at Dongguk University, extended into the lineage of the Accademia di Belle Arti di Roma.'
                          : '동국대학교 서양화과의 토대를, 로마국립아카데미의 계보 속으로 잇는 형성.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'India — Santiniketan' : '인도 — 샨티니케탄'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg break-keep">
                        {isEnglish
                          ? 'A residence at the Birla Academy of Art and Culture in Kolkata and Santiniketan — dwelling within another tradition of art and place.'
                          : '캘커타·샨티니케탄의 Birla Academy of Art and Culture 레지던스 — 또 다른 예술과 장소의 전통 속에서의 체류.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'France — Troyes and Paris' : '프랑스 — 트로아와 파리'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg break-keep">
                        {isEnglish
                          ? 'Passages in Troyes and the Cité Internationale des Arts in Paris — the international community of artists as a place of work.'
                          : '트로아의 Passages와 파리의 Cité Internationale des Arts — 국제 예술 공동체를 작업의 자리로 삼다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Education' : '학력'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Dongguk University, College of Arts — Dept. of Western Painting (graduated)'
                        : '동국대학교 예술대학 서양화과 졸업'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Accademia di Belle Arti di Roma, Italy (graduated)'
                        : '이탈리아 로마국립아카데미 졸업'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected residencies' : '주요 입주(레지던시)'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '‘D’ International Residency Program (Daemyung Studio), Korea'
                        : '‘D’ 국제 레지던시 프로그램(대명 스튜디오)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gana Atelier Residency (2nd cohort), Korea'
                        : '가나아뜰리에 입주 2기'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Changdong Art Studio (1st cohort), Korea'
                        : '창동미술스튜디오 입주 1기'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Birla Academy of Art and Culture Residence (Kolkata & Santiniketan, India)'
                        : 'Birla Academy of Art and Culture 레지던스(인도 캘커타·샨티니케탄)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Passages (Troyes, France)' : 'Passages(프랑스 트로아)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Cité Internationale des Arts (Paris, France)'
                        : '국제예술공동체 Cité Internationale des Arts(프랑스 파리)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광/신학철 패턴 차용, 박은선 국제 궤적 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on a painting made in transit</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">이동 속에서 만들어진 회화에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 두 아카데미 사이에서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Between two academies — Seoul and Rome'
                    : '두 아카데미 사이에서 — 서울과 로마'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A painter&apos;s first language is the school that trained her. Park Eunseon
                        was formed first in the Department of Western Painting at Dongguk University
                        — a Korean grounding in the European tradition of oil and canvas — and then
                        carried that grounding into the Accademia di Belle Arti di Roma, one of the
                        oldest art academies in Europe.
                      </p>
                      <p>
                        To study Western painting in Korea and then to study it again in Rome is not
                        a repetition but a doubling. The same medium is encountered twice, in two
                        different relations to its own history: once as something received from
                        abroad, once at its source. That doubling — the distance between a tradition
                        learned and a tradition inhabited — is the first condition of her work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        화가의 첫 언어는 그를 길러 낸 학교다. 박은선은 먼저 동국대학교 서양화과에서
                        형성됐다 — 유럽의 유화·캔버스 전통에 대한 한국적 토대를. 그리고 그 토대를
                        유럽에서 가장 오래된 미술 아카데미 가운데 하나인 로마국립아카데미 속으로
                        가져갔다.
                      </p>
                      <p>
                        한국에서 서양화를 배우고 다시 로마에서 서양화를 배운다는 것은 반복이 아니라
                        이중화다. 같은 매체를, 그 매체의 역사와 맺는 서로 다른 두 관계 속에서 두 번
                        만나는 일 — 한 번은 바깥에서 건너온 것으로서, 한 번은 그 발원지에서. 배운
                        전통과 거주한 전통 사이의 그 거리가, 그의 작업의 첫 번째 조건이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 레지던시라는 작업 방식 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The residency as a way of working' : '레지던시라는 작업 방식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For some artists a residency is an episode. For Park Eunseon it reads as a
                        method. Across her career she has been selected for residency programs in
                        Korea — the &lsquo;D&rsquo; International Residency Program, the Gana
                        Atelier Residency, the Changdong Art Studio — and abroad: the Birla Academy
                        in Kolkata and Santiniketan, Passages in Troyes, the Cité Internationale des
                        Arts in Paris.
                      </p>
                      <p>
                        A residency is a particular kind of working condition: a fixed term, an
                        unfamiliar city, a studio that is not yet anyone&apos;s. The artist arrives
                        without their usual surroundings and makes work precisely out of that
                        unfamiliarity. To string so many residencies together is to make
                        displacement itself the studio — to treat the state of being a guest as the
                        place where painting happens.
                      </p>
                      <p>
                        Santiniketan, the town Tagore made into a place of art and learning, and
                        Paris, where the Cité Internationale des Arts has gathered artists from
                        across the world since the 1960s, are not interchangeable backdrops. Each
                        carries its own light, its own materials, its own company of artists. A
                        practice built across them is a practice that keeps beginning again.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        어떤 작가에게 레지던시는 하나의 에피소드다. 박은선에게 그것은 하나의
                        방법으로 읽힌다. 그는 경력 전반에 걸쳐 국내의 레지던시 프로그램 —
                        &lsquo;D&rsquo; 국제 레지던시 프로그램, 가나아뜰리에, 창동미술스튜디오 — 과
                        국외의 레지던시 — 캘커타·샨티니케탄의 Birla Academy, 트로아의 Passages,
                        파리의 Cité Internationale des Arts — 에 선정되어 활동했다.
                      </p>
                      <p>
                        레지던시는 특정한 작업 조건이다: 정해진 기간, 낯선 도시, 아직 누구의 것도
                        아닌 작업실. 작가는 익숙한 환경을 떠나 도착하고, 바로 그 낯섦으로부터 작업을
                        만든다. 이렇게 많은 레지던시를 잇는다는 것은 이동 그 자체를 작업실로 삼는
                        일이다 — 손님으로 머무는 상태를, 회화가 일어나는 자리로 삼는 것.
                      </p>
                      <p>
                        타고르가 예술과 배움의 장소로 일군 샨티니케탄, 그리고 1960년대부터 세계
                        곳곳의 작가들을 불러 모아 온 파리의 Cité Internationale des Arts는 서로 바꿔
                        놓을 수 있는 배경이 아니다. 저마다 고유한 빛과 재료와 동료들을 품는다. 그
                        장소들을 가로질러 쌓아 올린 작업은, 매번 다시 시작하는 작업이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 침전으로서의 회화 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Painting as sediment' : '침전으로서의 회화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Eighteen solo exhibitions and more than two hundred group shows are not, in
                        themselves, the meaning of a body of work — but they are its measure. They
                        describe an artist who has kept showing, kept moving, kept returning to the
                        wall with new work. From Art Park and Artside to the galleries of Gana, from
                        Gallery Hyundai Window to the Cité Internationale des Arts in Paris, the
                        venues themselves trace a line between Korea and Europe.
                      </p>
                      <p>
                        What such a path leaves behind is not a single signature image but an
                        accumulation. A painter who has worked in this many places carries each of
                        them, however faintly, into the next canvas. The work becomes sediment — the
                        slow settling of light, material, and encounter from one city onto the next.
                      </p>
                      <p>
                        That is the invitation of her work at SAF Online: to look at painting not as
                        the fixed product of one place, but as the trace of a life lived across
                        many. To collect one is to hold a fragment of that long, crossing
                        trajectory.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        18회의 개인전과 200회 이상의 단체전이 그 자체로 한 작업 세계의 의미는 아니다
                        — 그러나 그 척도는 된다. 그것은 계속 보여 주고, 계속 이동하고, 새 작업으로
                        다시 벽 앞에 서 온 작가를 묘사한다. 아트파크와 아트사이드에서 가나의
                        화랑들로, 갤러리현대윈도우에서 파리의 Cité Internationale des Arts로 —
                        전시의 장소들 자체가 한국과 유럽 사이에 하나의 선을 긋는다.
                      </p>
                      <p>
                        그런 행로가 남기는 것은 하나의 서명 같은 이미지가 아니라 축적이다. 이토록
                        여러 장소에서 작업해 온 화가는, 그 장소들 각각을 — 아무리 희미하게라도 —
                        다음 캔버스로 가져간다. 작업은 침전이 된다 — 한 도시에서 다음 도시로, 빛과
                        재료와 만남이 천천히 가라앉는 일.
                      </p>
                      <p>
                        그것이 씨앗페 온라인에서 그의 작업이 건네는 초대다: 회화를 한 장소의 고정된
                        산물이 아니라, 여러 곳을 가로질러 살아 낸 삶의 자취로 바라보는 일. 한 점을
                        소장하는 것은, 그 길고 가로지르는 궤적의 한 조각을 품는 일이다.
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
                      From Seoul and Rome to Santiniketan, Troyes, and Paris, Park Eunseon&apos;s
                      practice has been carried across cities and residencies — a painting made in
                      transit. She joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity, so that those who come after might keep working, and
                      keep moving, with a little more ground beneath them.
                    </>
                  ) : (
                    <>
                      서울과 로마에서 샨티니케탄과 트로아, 파리까지, 박은선의 작업은 도시와
                      레지던시를 건너오며 빚어졌다 — 이동 속에서 만들어진 회화. 씨앗페에는 이
                      캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다. 다음 세대의
                      예술인들이 조금 더 단단한 땅 위에서 계속 작업하고, 계속 나아갈 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Park Eunseon</span>
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
                    Park Eunseon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박은선 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_EUNSEON_PATH}
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
