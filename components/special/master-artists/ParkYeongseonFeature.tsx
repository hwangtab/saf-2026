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

// 거장 작가 feature는 작가 페이지(/artworks/artist/박영선)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_YEONGSEON_PATH = `/artworks/artist/${encodeURIComponent('박영선')}`;

const PARK_YEONGSEON_ARTIST_KEYS = new Set([
  '박영선',
  'park yeongseon',
  'park young-sun',
  'park youngsun',
  'park yeong-seon',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isParkYeongseonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    PARK_YEONGSEON_ARTIST_KEYS.has(normalized) ||
    compact === '박영선' ||
    compact === 'parkyeongseon' ||
    compact === 'parkyoungsun'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박영선 — 한국·중국·인도를 잇는 판화가',
    description:
      '판화가이자 화가 박영선. 동아대학교를 거쳐 중국 루쉰 미술대학에서 판화 기반의 회화·조형 언어를 익히고, 현재 인도 오로빌 국제 공동체에 정착해 작업한다. 선과 면, 반복과 축적의 판화 언어로 공동체·노동·자연·인간의 존엄을 탐구하는 박영선의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '한국·중국·인도를 잇는 이동의 경로 속에서 형성된 판화가 박영선. 선과 면, 반복과 축적의 판화 언어로 공동체와 인간의 존엄을 탐구한다.',
    ogAlt: '박영선 대표 작품',
    twitterTitle: '박영선',
    twitterDescription: '선과 면, 반복과 축적 — 오로빌에서 노동과 존엄을 새기는 판화가 박영선',
    keywords:
      '박영선 판화가, 루쉰 미술대학, 오로빌, 한국 판화, 동아대학교, 까이비간, 씨앗페 온라인',
  },
  en: {
    title: 'Park Yeongseon — A Printmaker Linking Korea, China, and India',
    description:
      'Selected works by Park Yeongseon, printmaker and painter. After Dong-A University, she studied printmaking-based painting and formative language at the Lu Xun Academy of Fine Arts in China, and now lives and works in the international community of Auroville, India. Through the lines, planes, repetition, and accumulation of printmaking, she explores community, labour, nature, and human dignity. View and collect her works at SAF Online.',
    ogDescription:
      'Park Yeongseon — a printmaker whose practice formed along paths linking Korea, China, and India. Through the line, plane, repetition, and accumulation of printmaking, she explores community and human dignity.',
    ogAlt: 'Park Yeongseon — featured work',
    twitterTitle: 'Park Yeongseon',
    twitterDescription:
      'Line and plane, repetition and accumulation — a printmaker carving labour and dignity in Auroville',
    keywords:
      'Park Yeongseon artist, Lu Xun Academy of Fine Arts, Auroville, Korean printmaking, Dong-A University, woodblock print',
  },
} as const;

export async function buildParkYeongseonMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_YEONGSEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박영선');
  const artwork = allArtworks.find((a) => isParkYeongseonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Yeongseon`
      : `${artwork.title} — 박영선`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_YEONGSEON_PATH, locale, true),
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

export default async function ParkYeongseonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_YEONGSEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박영선');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkYeongseonArtist(artwork.artist)
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
    { name: isEnglish ? 'Park Yeongseon' : '박영선', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_YEONGSEON_PATH}#person-park-yeongseon`,
    name: isEnglish ? 'Park Yeongseon' : '박영선',
    alternateName: isEnglish ? '박영선' : 'Park Yeongseon',
    jobTitle: isEnglish ? 'Printmaker, Painter' : '판화가, 화가',
    description: isEnglish
      ? 'Park Yeongseon is a printmaker and painter who studied at the Lu Xun Academy of Fine Arts in China and now lives and works in the international community of Auroville, India, exploring community, labour, nature, and human dignity through the language of printmaking.'
      : '박영선은 중국 루쉰 미술대학에서 수학한 판화가이자 화가로, 현재 인도 오로빌 국제 공동체에 거주하며 판화의 언어로 공동체·노동·자연·인간의 존엄을 탐구한다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Dong-A University, College of Fine Arts' : '동아대학교 미술대학',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Lu Xun Academy of Fine Arts' : '루쉰 미술대학',
      },
    ],
    knowsAbout: ['Printmaking', 'Painting', 'Auroville', 'Community and labour'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Yeongseon — SAF Online' : '박영선 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Yeongseon from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박영선 작품들을 소개합니다.',
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

          {/* Vertical engraved lines — 판화의 선·반복·축적 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-14 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-20 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />
          <div className="absolute top-0 right-16 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Park Yeongseon · Printmaker' : '박영선 · 판화가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Line and plane,
                  <br />
                  <span className="text-primary-soft">repetition and accumulation</span>
                </>
              ) : (
                <>
                  선과 면,
                  <br />
                  <span className="text-primary-soft">반복과 축적의 판화</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A practice carved along the paths linking Korea, China, and India.
                  </span>
                  <span className="mt-2 block">
                    Community, labour, and human dignity, pressed into the surface of the print.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한국·중국·인도를 잇는 이동의 경로 위에 새긴 작업.</span>
                  <span className="mt-2 block">
                    공동체와 노동, 인간의 존엄을 판면에 눌러 담는다.
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
                    Korea, China, India —<br />
                    <span className="text-primary-strong">a printmaker formed in transit</span>
                  </>
                ) : (
                  <>
                    한국·중국·인도 —<br />
                    <span className="text-primary-strong">이동 속에서 형성된 판화가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Yeongseon is a printmaker and painter. After majoring in art at Dong-A
                      University&apos;s College of Fine Arts, she went on to study at the Lu Xun
                      Academy of Fine Arts in China — a center of contemporary Chinese print
                      education — where she systematically learned a printmaking-based language of
                      painting and form.
                    </p>
                    <p>
                      From her years of study in China onward, her work has centred on the line and
                      plane of printmaking, and on its methods of{' '}
                      <strong className="font-bold text-charcoal-deep">
                        repetition and accumulation
                      </strong>
                      . The print is not, for her, a means of reproduction so much as a discipline:
                      a surface built up mark by mark, pressure by pressure, until the image carries
                      the weight of the labour that made it.
                    </p>
                    <p>
                      She later settled in Auroville, India, expanding both the environment and the
                      scope of her practice. Auroville is an international community that seeks to
                      transcend nationality, religion, and ideology. Through her life and artistic
                      practice there, Park has continuously explored the themes of{' '}
                      <strong className="font-bold text-charcoal">
                        community, labour, nature, and human dignity
                      </strong>
                      , holding local exhibitions in Auroville and presenting her work within an
                      international context.
                    </p>
                    <p>
                      Her published work includes <em>Kkaibigan</em> (Sanji-ni, 2007). In India she
                      has also worked to give visual form to spirituality and thought associated
                      with Maharishi Mahesh Yogi — translating contemplative content into the
                      language of the image.
                    </p>
                    <p>
                      Park&apos;s career was formed along paths of movement linking Korea, China,
                      and India. Centred on printmaking and painting, her practice is not bound to
                      any single region or institution; it has accumulated across study, settlement,
                      and communal life — the same logic of accumulation that governs the print
                      itself.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박영선은 판화가이자 화가다. 동아대학교 미술대학에서 미술을 전공한 이후, 중국
                      현대 판화 교육의 중심지인{' '}
                      <strong className="font-bold text-charcoal-deep">루쉰 미술대학</strong>에서
                      판화 기반의 회화와 조형 언어를 체계적으로 익혔다.
                    </p>
                    <p>
                      중국 유학 시기부터 그는 판화의 선과 면, 그리고{' '}
                      <strong className="font-bold text-charcoal">반복과 축적</strong>의 방식을
                      중심으로 작업을 이어왔다. 그에게 판화는 복제의 수단이라기보다 하나의 규율에
                      가깝다 — 자국 하나, 압력 하나가 쌓여 화면을 이루고, 이미지가 그것을 만든
                      노동의 무게를 품을 때까지 눌러 가는 작업.
                    </p>
                    <p>
                      이후 그는 인도 오로빌에 정착하며 작업의 환경과 범위를 확장해왔다. 오로빌은
                      국적과 종교, 이념을 넘어선 국제 공동체로, 박영선은 이곳에서의 삶과 예술 실천을
                      통해{' '}
                      <strong className="font-bold text-charcoal-deep">
                        공동체·노동·자연·인간의 존엄
                      </strong>
                      이라는 주제를 지속적으로 탐구해왔다. 오로빌 현지에서는 전시를 열며 국제적 맥락
                      속에서 작품을 발표했다.
                    </p>
                    <p>
                      출판 작업으로는 〈까이비간〉(산지니, 2007)이 있다. 인도에서는 마하리쉬 마헤시
                      요기와 관련된 영성·사유를 시각 언어로 구현하는 작업을 수행하며, 사색적인
                      내용을 이미지의 언어로 옮겨왔다.
                    </p>
                    <p>
                      박영선의 이력은 한국·중국·인도를 잇는 이동의 경로 속에서 형성되었다. 판화와
                      회화를 중심으로 한 그의 작업은 특정 지역이나 제도에 한정되지 않고, 학습과
                      정착, 공동체적 삶을 오가며 축적되어 왔다 — 판화 그 자체를 지배하는 축적의 논리
                      그대로.
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
                        {isEnglish ? 'The language of the print' : '판화의 언어 — 선·면·반복·축적'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A practice built on line and plane, repetition and accumulation — the print as a discipline of layered marks rather than mere reproduction.'
                          : '선과 면, 반복과 축적 위에 세운 작업. 판화를 단순한 복제가 아니라 자국을 겹겹이 쌓아 올리는 규율로 다룬다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Community and labour in Auroville' : '오로빌의 공동체와 노동'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Settled in the international community of Auroville, India, she explores community, labour, nature, and the dignity of the human being.'
                          : '국적·종교·이념을 넘어선 국제 공동체 인도 오로빌에 정착해, 공동체와 노동, 자연, 그리고 인간의 존엄을 탐구한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A practice formed in transit' : '이동 속에서 형성된 작업'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Korea, China, India — her work is not bound to one region or institution, but accumulates across study, settlement, and communal life.'
                          : '한국·중국·인도. 그의 작업은 특정 지역이나 제도에 매이지 않고, 학습과 정착, 공동체적 삶을 오가며 축적된다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's path" : '작가의 경로'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Korea' : '한국'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Majors in art at Dong-A University, College of Fine Arts.'
                        : '동아대학교 미술대학에서 미술 전공.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'China' : '중국'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studies at the Lu Xun Academy of Fine Arts, a center of contemporary Chinese print education; builds a printmaking-based language of painting and form.'
                        : '중국 현대 판화 교육의 중심지 루쉰 미술대학에서 수학 — 판화 기반의 회화·조형 언어를 체계적으로 익힘.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publishes 〈Kkaibigan〉 (Sanji-ni).'
                        : '〈까이비간〉(산지니) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'India' : '인도'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Settles in the international community of Auroville; expands her practice and explores community, labour, nature, and human dignity. Works to give visual form to spirituality and thought associated with Maharishi Mahesh Yogi.'
                        : '국제 공동체 오로빌에 정착 — 작업의 환경과 범위를 확장하고 공동체·노동·자연·인간의 존엄을 탐구. 마하리쉬 마헤시 요기 관련 영성·사유를 시각 언어로 구현.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Now' : '현재'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lives and works in Auroville, presenting her work in an international context.'
                        : '인도 오로빌에 거주하며 작업, 국제적 맥락 속에서 작품을 발표.'}
                    </span>
                  </li>
                </ol>
                <p className="mt-6 pt-4 border-t border-charcoal/15 text-sm text-charcoal-soft leading-relaxed break-keep">
                  {isEnglish
                    ? 'The sequence above follows the path of study, settlement, and communal life described by the artist; specific exhibition years and venues are not listed here unless confirmed.'
                    : '위 순서는 작가가 밝힌 학습·정착·공동체적 삶의 경로를 따른 것으로, 확인되지 않은 개별 전시의 연도·장소는 임의로 적지 않았습니다.'}
                </p>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Study, publication & community' : '수학·출판·공동체'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Dong-A University, College of Fine Arts (Korea); Lu Xun Academy of Fine Arts (China) — printmaking-based painting and form.'
                        : '동아대학교 미술대학(한국); 루쉰 미술대학(중국) — 판화 기반 회화·조형.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Publication: <em>Kkaibigan</em> (Sanji-ni, 2007)
                        </>
                      ) : (
                        <>출판: 〈까이비간〉(산지니, 2007)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Local exhibitions held in Auroville, India, presenting work in an international context.'
                        : '인도 오로빌 현지 전시 — 국제적 맥락 속 작품 발표.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Visualizing spirituality and thought associated with Maharishi Mahesh Yogi in India.'
                        : '인도에서 마하리쉬 마헤시 요기 관련 영성·사유의 시각화 작업.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광/신학철 패턴 차용, 박영선 판화 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the print, the path, and the place</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">판화와 경로, 그리고 장소에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 루쉰 미술대학과 판화의 규율 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The Lu Xun Academy and the discipline of the print'
                    : '루쉰 미술대학과 판화의 규율'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Yeongseon began with painting at Dong-A University, then carried that
                        training to the Lu Xun Academy of Fine Arts in China — an institution long
                        associated with the modern Chinese print and its tradition of the woodcut as
                        a public, working medium. There she learned a printmaking-based language of
                        painting and form: not the print as a sideline of drawing, but the print as
                        a primary way of thinking about the image.
                      </p>
                      <p>
                        What that schooling gave her was a vocabulary of the{' '}
                        <strong className="font-bold text-charcoal-deep">line and the plane</strong>
                        , and a method of repetition and accumulation. A print is made by pressure
                        and by return: a mark laid down, then another, then the pull of the press.
                        The image that results is never a single gesture but a record of repeated
                        labour. From her years in China onward, this has been the centre of her
                        work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박영선은 동아대학교에서 회화로 출발해, 그 훈련을 중국 루쉰 미술대학으로
                        가져갔다. 루쉰 미술대학은 오랫동안 중국 현대 판화, 그리고 목판화를 공적이고
                        일하는 매체로 다뤄 온 전통과 결부된 곳이다. 그곳에서 그는 판화 기반의 회화와
                        조형 언어를 익혔다 — 판화를 소묘의 곁가지가 아니라, 이미지를 사유하는 일차적
                        방식으로 다루는 법을.
                      </p>
                      <p>
                        그 수학이 그에게 남긴 것은{' '}
                        <strong className="font-bold text-charcoal-deep">선과 면</strong>의
                        어휘이자, 반복과 축적의 방법이다. 판화는 압력과 되돌아옴으로 만들어진다 —
                        자국 하나를 놓고, 또 하나를 놓고, 다시 압판을 당긴다. 그렇게 나온 이미지는
                        결코 단 한 번의 몸짓이 아니라, 반복된 노동의 기록이다. 중국 유학 시기
                        이후로, 이것이 그의 작업의 중심이 되어 왔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 오로빌 — 공동체·노동·존엄 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Auroville — community, labour, dignity'
                    : '오로빌 — 공동체·노동·존엄'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Settling in Auroville, India, Park expanded both the environment and the
                        scope of her practice. Auroville is an international community founded to
                        transcend nationality, religion, and ideology — a place where collective
                        life and shared labour are not background conditions but the very material
                        of daily existence.
                      </p>
                      <p>
                        It is no accident that her subjects there became{' '}
                        <strong className="font-bold text-charcoal-deep">
                          community, labour, nature, and human dignity
                        </strong>
                        . The print&apos;s logic of accumulated, repeated marks meets a life built
                        from accumulated, repeated work. Holding exhibitions locally in Auroville,
                        she has presented this work within an international context — a Korean
                        printmaker speaking, from India, to a community that belongs to no single
                        nation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        인도 오로빌에 정착하면서 박영선은 작업의 환경과 범위를 함께 넓혔다. 오로빌은
                        국적·종교·이념을 넘어서기 위해 세워진 국제 공동체로, 집단적 삶과 공동의
                        노동이 배경 조건이 아니라 일상의 재료 그 자체인 장소다.
                      </p>
                      <p>
                        그곳에서 그의 주제가{' '}
                        <strong className="font-bold text-charcoal-deep">
                          공동체·노동·자연·인간의 존엄
                        </strong>
                        이 된 것은 우연이 아니다. 자국을 쌓아 반복하는 판화의 논리는, 쌓이고
                        반복되는 노동으로 이루어진 삶과 만난다. 오로빌 현지에서 전시를 열며 그는 이
                        작업을 국제적 맥락 속에서 발표해왔다 — 인도에서, 어느 한 나라에도 속하지
                        않는 공동체를 향해 말하는 한국 판화가로서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 이동의 경로, 축적의 이력 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'A career formed in transit' : '이동의 경로, 축적의 이력'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park&apos;s career was formed along paths of movement linking Korea, China,
                        and India. Her practice is not bound to a single region or institution; it
                        has accumulated across study, settlement, and communal life — the same logic
                        of accumulation that governs the print itself.
                      </p>
                      <p>
                        Alongside the print and the painting, she has worked in publication —{' '}
                        <em>Kkaibigan</em> (Sanji-ni, 2007) — and has given visual form to
                        spirituality and thought associated with Maharishi Mahesh Yogi during her
                        time in India. Across all of it runs a single contemplative, international
                        register: an image built slowly, in layers, that asks what it means to work,
                        to belong, and to keep one&apos;s dignity within a shared life.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박영선의 이력은 한국·중국·인도를 잇는 이동의 경로 속에서 형성되었다. 그의
                        작업은 특정 지역이나 제도에 한정되지 않고, 학습과 정착, 공동체적 삶을 오가며
                        축적되어 왔다 — 판화 그 자체를 지배하는 축적의 논리 그대로.
                      </p>
                      <p>
                        판화와 회화와 더불어 그는 출판 작업도 이어왔으며 — 〈까이비간〉(산지니,
                        2007) — 인도 체류 시기에는 마하리쉬 마헤시 요기와 관련된 영성·사유를 시각
                        언어로 구현했다. 그 전부를 가로지르는 것은 하나의 사색적이고 국제적인
                        결이다: 천천히, 겹겹이 쌓아 올린 이미지가, 일한다는 것과 속한다는 것, 그리고
                        공동의 삶 안에서 존엄을 지킨다는 것의 의미를 묻는다.
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
                      From Dong-A University to the Lu Xun Academy to Auroville, Park
                      Yeongseon&apos;s work has pursued a single question through the language of
                      the print: how does repeated labour become an image, and how does that image
                      hold the dignity of a shared life? She joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity — so that others, too, might
                      work without the weight of financial exclusion.
                    </>
                  ) : (
                    <>
                      동아대학교에서 루쉰 미술대학으로, 그리고 오로빌로 — 박영선의 작업은 판화의
                      언어로 하나의 물음을 추구해 왔다: 반복된 노동은 어떻게 이미지가 되며, 그
                      이미지는 어떻게 공동의 삶이 지닌 존엄을 품는가. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다른 이들 또한 금융
                      차별의 무게 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Park Yeongseon
              </span>
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
                    Park Yeongseon joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박영선 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_YEONGSEON_PATH}
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
