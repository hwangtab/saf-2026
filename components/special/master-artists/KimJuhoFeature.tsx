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

// 거장 작가 feature는 작가 페이지(/artworks/artist/김주호)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_JUHO_PATH = `/artworks/artist/${encodeURIComponent('김주호')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimJuhoArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김주호' ||
    n === 'kim ju-ho' ||
    n === 'kim juho' ||
    n.replace(/[\s-]+/g, '') === 'kimjuho'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김주호 — 사람사이를 조각하는 사색의 조각가',
    description:
      '조각가 김주호. 사람과 일상의 풍경을 특유의 사색과 여유로 재해석한 입체·평면 작업으로, 돌고 도는 인간관계와 공감·소통의 이야기를 따뜻하고 해학적인 톤으로 빚어낸다. 〈조오타!〉의 호기심, 〈세상을 보는 창〉의 돋보기 — 김주호의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '조각가 김주호 — 사람과 일상을 사색과 여유로 재해석한 조각. 돌고 도는 사람들, 공감과 소통의 풍경.',
    ogAlt: '김주호 대표 작품',
    twitterTitle: '김주호',
    twitterDescription: '돌고 도는 사람들 — 사람사이를 조각하는 사색의 조각가 김주호',
    keywords: '김주호 조각가, 사람사이, 조오타, 세상을 보는 창, 한국 조각, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Ju-ho — A Sculptor of the Space Between People',
    description:
      'Selected works by the sculptor Kim Ju-ho. With his own quiet contemplation and ease, he reinterprets people and the scenes of everyday life in sculpture and relief — telling stories of revolving human relationships, empathy, and communication in a warm, humorous tone. View and collect his works at SAF Online.',
    ogDescription:
      'Kim Ju-ho — a sculptor who reinterprets people and everyday life with contemplation and ease. People who revolve and connect; scenes of empathy and communication.',
    ogAlt: 'Kim Ju-ho — featured work',
    twitterTitle: 'Kim Ju-ho',
    twitterDescription: 'People who revolve and connect — a sculptor of the space between people',
    keywords: 'Kim Ju-ho sculptor, Korean sculpture, Saramsai, contemplative sculpture, SAF Online',
  },
} as const;

export async function buildKimJuhoMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_JUHO_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김주호');
  const artwork = allArtworks.find((a) => isKimJuhoArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Ju-ho`
      : `${artwork.title} — 김주호`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_JUHO_PATH, locale, true),
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

export default async function KimJuhoFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_JUHO_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김주호');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimJuhoArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Ju-ho' : '김주호', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_JUHO_PATH}#person-kim-juho`,
    name: isEnglish ? 'Kim Ju-ho' : '김주호',
    alternateName: isEnglish ? '김주호' : 'Kim Ju-ho',
    jobTitle: isEnglish ? 'Sculptor' : '조각가',
    description: isEnglish
      ? 'Kim Ju-ho is a Korean sculptor who reinterprets people and the scenes of everyday life in sculpture and relief with his own contemplation and ease, telling stories of revolving human relationships, empathy, and communication.'
      : '김주호는 사람과 일상의 풍경을 특유의 사색과 여유로 재해석한 입체·평면 작업으로, 돌고 도는 인간관계와 공감·소통을 형상화해 온 조각가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Seoul National University, College of Fine Arts (Sculpture)'
        : '서울대학교 미술대학 조소과',
    },
    knowsAbout: ['Sculpture', 'Steel drawing', 'Korean contemporary sculpture'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Ju-ho — SAF Online' : '김주호 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Ju-ho from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김주호 작품을 소개합니다.',
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

          {/* 돌고 도는 사람들 — 순환 모티프 */}
          <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute -bottom-20 right-8 h-72 w-72 rounded-full border border-primary/30" />
          <div className="absolute top-1/2 right-1/4 h-40 w-40 rounded-full border border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Ju-ho · Sculptor' : '김주호 · 조각가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  People revolve,
                  <br />
                  <span className="text-primary-soft">and so we are connected</span>
                </>
              ) : (
                <>
                  돌고 도는 사람들,
                  <br />
                  <span className="text-primary-soft">그렇게 이어지는 사이</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    People and everyday life, reinterpreted with contemplation and ease.
                  </span>
                  <span className="mt-2 block">
                    The space between people, shaped into empathy and communication.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사람과 일상을 사색과 여유로 재해석하다.</span>
                  <span className="mt-2 block">사람사이를 공감과 소통의 풍경으로 빚어내다.</span>
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
                    Contemplation, made tangible —<br />
                    <span className="text-primary-strong">the space between people</span>
                  </>
                ) : (
                  <>
                    사색을 만지는 일 —<br />
                    <span className="text-primary-strong">사람과 사람 사이</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Ju-ho graduated from the Department of Sculpture, College of Fine Arts at
                      Seoul National University in 1976, and completed his graduate study in the
                      same department in 1986. From there he built a sustained practice in which
                      both three-dimensional and flat work begin from a single source: the people
                      and the ordinary scenes of everyday life around him.
                    </p>
                    <p>
                      What distinguishes his work is the tone. He reinterprets the familiar with his
                      own contemplation and ease — a gaze that is unhurried, warm, and quietly
                      humorous. The contemplation that begins in the everyday does not stay private;
                      it draws others in, opening into empathy and communication.
                    </p>
                    <p>
                      That spirit surfaces directly in his motifs. 〈Joota!〉 (&ldquo;How
                      good!&rdquo;) carries the curiosity of looking out at the world; 〈A Window
                      onto the World〉 takes the form of a magnifying glass — a gaze that seeks to
                      look through its subject and to see relationships clearly. In his work, people
                      revolve and turn, and through that turning they are connected: the
                      relationships between human beings become the very subject of the sculpture.
                    </p>
                    <p>
                      His writing extends the same concern. The volume{' '}
                      <em>Between People (Saramsai)</em> was published as the third title in the
                      Hexagon Korean Contemporary Art series — a sustained reflection on the same
                      territory his sculptures inhabit.
                    </p>
                    <p>
                      Across more than a dozen solo exhibitions from 1986 onward — including{' '}
                      <em>Steel Drawing</em> at Gahoe-dong 60 (Seoul, 2013), <em>Saramsai</em> at
                      Kwanhoon Gallery and Namu Artist&apos;s Space (2012), and{' '}
                      <em>Vivid Landscape</em> at Gahoe-dong 60 (2010) — and through participation
                      in major group exhibitions, Kim Ju-ho has held to one question: how do people,
                      in their daily turning, come to see and to hold one another.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김주호는 1976년 서울대학교 미술대학 조소과를 졸업하고, 1986년 동 대학원
                      조소과를 졸업했다. 그 이후 그는 입체와 평면을 아우르는 작업을 이어 왔으며, 그
                      작업은 언제나 하나의 출발점에서 시작된다 — 자신을 둘러싼 사람들과 일상의
                      평범한 풍경.
                    </p>
                    <p>
                      그의 작업을 특별하게 만드는 것은 그 톤이다. 그는 익숙한 것을 특유의{' '}
                      <strong className="font-bold text-charcoal-deep">사색과 여유</strong>로
                      재해석한다 — 서두르지 않는, 따뜻하고 은근히 해학적인 시선이다. 일상에서 시작된
                      사색은 개인 안에 머무르지 않는다. 그것은 타인을 끌어들이며 공감과 소통으로
                      열린다.
                    </p>
                    <p>
                      그 정신은 그의 모티프에 그대로 드러난다. 〈조오타!〉는 세상을 내다보는
                      호기심을 담고, 〈세상을 보는 창〉은 돋보기의 형상을 취한다 — 대상을 투시하고
                      관계를 명확히 보려는 시선이다. 그의 작업에서 사람들은 돌고 돈다. 그리고 그렇게
                      돌고 도는 가운데 서로 이어진다. 인간과 인간 사이의 관계가 곧 조각의 주제가
                      된다.
                    </p>
                    <p>
                      그의 글쓰기도 같은 관심을 잇는다. 저서 《사람사이》는 헥사곤 한국현대미술선
                      003 으로 출간되었다 — 그의 조각이 머무는 바로 그 영역에 대한 지속적인
                      성찰이다.
                    </p>
                    <p>
                      1986년 이후 열두 차례가 넘는 개인전 — 2013년 가회동 60의{' '}
                      <em>Steel Drawing</em>, 2012년 관훈갤러리·나무화랑의 《사람사이》, 2010년
                      가회동 60의 《생생풍경》 등 — 과 주요 기획전 참여를 통해, 김주호는 하나의
                      물음을 놓지 않았다: 사람은 매일의 돌고 돎 속에서 어떻게 서로를 바라보고,
                      서로를 품게 되는가.
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
                        {isEnglish ? 'The space between people' : '사람사이'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'People who revolve and turn, and through that turning are connected — the relationships between human beings become the subject itself.'
                          : '돌고 도는 사람들, 그렇게 돌며 이어지는 사이. 인간과 인간 사이의 관계가 곧 작업의 주제가 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Curiosity and the gaze' : '호기심과 시선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? '〈Joota!〉 holds the curiosity of looking out at the world; 〈A Window onto the World〉 takes a magnifying glass to see through its subject and read relationships clearly.'
                          : '〈조오타!〉는 세상을 내다보는 호기심을, 〈세상을 보는 창〉은 돋보기로 대상을 투시하고 관계를 명확히 보려는 시선을 담는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Contemplation and ease' : '사색과 여유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The everyday reinterpreted in a warm, humorous tone — contemplation that begins in daily life and opens into empathy and communication.'
                          : '일상을 따뜻하고 해학적인 톤으로 재해석하는 시선. 일상에서 시작된 사색이 공감과 소통으로 열린다.'}
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
                      1976
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Sculpture, College of Fine Arts, Seoul National University.'
                        : '서울대학교 미술대학 조소과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes graduate study in the Dept. of Sculpture, Seoul National University.'
                        : '서울대학교 대학원 조소과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1986–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Holds twelve solo exhibitions through 2012.'
                        : '이후 2012년까지 개인전 12회 개최.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Vivid Landscape》, Gahoe-dong 60, Seoul.'
                        : '개인전 《생생풍경》, 가회동 60(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in 《Korean Art Today》, Korean Cultural Centre, Sydney, Australia.'
                        : 'Korean Art Today 참여, 주시드니 한국문화원(호주).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Saramsai》, Kwanhoon Gallery & Namu Artist’s Space; participates in the 2nd Incheon Peace Art Project, Incheon Art Platform.'
                        : '개인전 《사람사이》, 관훈갤러리·나무화랑; 제2회 인천 평화미술 프로젝트 참여, 인천아트플랫폼.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Steel Drawing》, Gahoe-dong 60, Seoul; participates in 《Trajectory of Korean Contemporary Art》 (SNU Museum of Art) and 《Humanity and Existence》 (Kim Chong Yung Museum); resident artist, 4th cohort, Incheon Art Platform.'
                        : '개인전 《Steel Drawing》, 가회동 60(서울); 《한국 현대미술의 궤적》(서울대학교 미술관)·《인간 그리고 실존》(김종영미술관) 참여; 인천아트플랫폼 4기 입주작가.'}
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
                        ? 'Solo exhibitions: 《Steel Drawing》, Gahoe-dong 60 (2013); 《Saramsai》, Kwanhoon Gallery & Namu Artist’s Space (2012); 《Vivid Landscape》, Gahoe-dong 60 (2010)'
                        : '개인전: 《Steel Drawing》, 가회동 60 (2013); 《사람사이》, 관훈갤러리·나무화랑 (2012); 《생생풍경》, 가회동 60 (2010)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 《Trajectory of Korean Contemporary Art》, SNU Museum of Art & 《Humanity and Existence》, Kim Chong Yung Museum (2013); 2nd Incheon Peace Art Project, Incheon Art Platform (2012); 《Korean Art Today》, Korean Cultural Centre, Sydney (2011)'
                        : '기획전: 《한국 현대미술의 궤적》, 서울대학교 미술관·《인간 그리고 실존》, 김종영미술관 (2013); 제2회 인천 평화미술 프로젝트, 인천아트플랫폼 (2012); Korean Art Today, 주시드니 한국문화원 (2011)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA; Daejeon Museum of Art; SOMA Museum of Art; Moran Museum of Art; National Folk Museum of Korea; Incheon Art Platform; Gimpo International Sculpture Park; Jikji Culture Park; Incheon Foundation for Arts & Culture Art Bank'
                        : '소장: 국립현대미술관, 대전시립미술관, 소마미술관, 모란미술관, 국립민속박물관, 인천아트플랫폼, 김포국제조각공원, 직지문화공원, 인천문화재단 미술은행'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publication: 《Between People (Saramsai)》, Hexagon Korean Contemporary Art series 003'
                        : '저서: 《사람사이》, 헥사곤 한국현대미술선 003'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residency: 4th cohort, Incheon Art Platform (2013)'
                        : '레지던시: 인천아트플랫폼 4기 (2013)'}
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
                  <span className="text-charcoal-deep">on people, the gaze, and ease</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">사람, 시선, 그리고 여유에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 사람에서 시작하는 조각 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Sculpture that begins with people' : '사람에서 시작하는 조각'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Ju-ho studied sculpture at Seoul National University, graduating in 1976
                        and completing his graduate work in the same department in 1986. But the
                        formal training is not where his work begins. It begins, again and again,
                        with people — the ones around him, in the unremarkable scenes of daily life.
                      </p>
                      <p>
                        His practice moves freely between the three-dimensional and the flat,
                        between sculpture and relief. What holds it together is not a single
                        material or method but a subject: the human figure, and the relations that
                        gather around it. He does not monumentalize. He observes, and reinterprets
                        what he observes with a contemplative, unhurried ease.
                      </p>
                      <p>
                        That ease is itself a position. In an art world that often prizes intensity
                        and rupture, Kim Ju-ho works in a warm, lightly humorous register — trusting
                        that the ordinary, looked at long enough and kindly enough, has more than
                        enough to say.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김주호는 서울대학교에서 조각을 공부해 1976년에 졸업하고, 1986년 동 대학원
                        조소과를 졸업했다. 그러나 그의 작업이 시작되는 곳은 그 정규 교육이 아니다.
                        그것은 언제나, 거듭, 사람에서 시작된다 — 자신을 둘러싼 사람들, 그 평범한
                        일상의 풍경에서.
                      </p>
                      <p>
                        그의 작업은 입체와 평면 사이를, 조각과 부조 사이를 자유롭게 오간다. 그것을
                        하나로 묶는 것은 단일한 재료나 방법이 아니라 하나의 주제다: 사람의 형상,
                        그리고 그 주위로 모여드는 관계들. 그는 기념비를 세우지 않는다. 관찰하고,
                        관찰한 것을 사색적이고 서두르지 않는 여유로 재해석한다.
                      </p>
                      <p>
                        그 여유는 그 자체로 하나의 입장이다. 강렬함과 단절을 종종 높이 사는 미술계
                        가운데, 김주호는 따뜻하고 가볍게 해학적인 어조로 작업한다 — 충분히 오래,
                        충분히 다정하게 바라본 평범함은 들려줄 이야기가 차고 넘친다는 믿음으로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 호기심과 돋보기 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Curiosity and the magnifying glass — 〈Joota!〉 and 〈A Window onto the World〉'
                    : '호기심과 돋보기 — 〈조오타!〉와 〈세상을 보는 창〉'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Two motifs make his disposition concrete. 〈Joota!〉 — an exclamation of
                        delight, &ldquo;how good!&rdquo; — carries the curiosity of looking out at
                        the world, the small wonder of someone leaning toward what is in front of
                        them. It is a figure of attention given freely.
                      </p>
                      <p>
                        〈A Window onto the World〉 takes the form of a magnifying glass. The
                        gesture is precise: to look through a subject rather than merely at it, and
                        to see the relationships running between people clearly. The lens is not for
                        scrutiny but for understanding — a tool for reading the connective tissue
                        that the casual glance misses.
                      </p>
                      <p>
                        Together the two works describe a single ethic of seeing: curiosity that
                        leans in, and a gaze that wants to understand. Looking, in Kim Ju-ho&apos;s
                        work, is never neutral. It is the first act of care.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        두 개의 모티프가 그의 기질을 구체화한다. 〈조오타!〉 — &lsquo;조오타!&rsquo;
                        라는 기쁨의 감탄 — 은 세상을 내다보는 호기심을, 눈앞의 것을 향해 몸을
                        기울이는 작은 경이를 담는다. 기꺼이 건네는 주의(注意)의 형상이다.
                      </p>
                      <p>
                        〈세상을 보는 창〉은 돋보기의 형상을 취한다. 그 몸짓은 정확하다: 대상을 단지
                        바라보는 것이 아니라 투시하는 것, 그리고 사람과 사람 사이를 흐르는 관계를
                        명확히 보는 것. 그 렌즈는 추궁이 아니라 이해를 위한 것이다 — 무심한 시선이
                        놓치는 연결의 조직을 읽어 내는 도구다.
                      </p>
                      <p>
                        두 작업은 함께 하나의 보는 윤리를 그려 낸다: 몸을 기울이는 호기심, 그리고
                        이해하려는 시선. 김주호의 작업에서 본다는 것은 결코 중립적이지 않다. 그것은
                        돌봄의 첫 번째 행위다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 돌고 도는 사람들 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'People who revolve — the form of Saramsai'
                    : '돌고 도는 사람들 — 《사람사이》의 형식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The recurring title in Kim Ju-ho&apos;s work — and of his book — is{' '}
                        <em>Saramsai</em>, literally the space, or relationship, between people. It
                        names not a single figure but a between: the interval where one person meets
                        another.
                      </p>
                      <p>
                        In his hands that between is not static. People revolve and turn, and
                        through the turning they are connected — relationships described as motion
                        rather than fixed arrangement. Contemplation that begins privately, in the
                        everyday, does not stay private; it opens outward into empathy and
                        communication. The sculpture becomes a small model of how a community holds
                        together.
                      </p>
                      <p>
                        The book <em>Between People</em>, published as the third title in the
                        Hexagon Korean Contemporary Art series, extends this thinking into words.
                        Across sculpture, relief, and writing, Kim Ju-ho keeps returning to the same
                        warm proposition: that we are made by the people we revolve among, and that
                        to sculpt them with care is itself a form of communication.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김주호의 작업에서 — 그리고 그의 책에서 — 거듭 등장하는 제목은
                        《사람사이》다. 말 그대로 사람과 사람 사이의 공간, 혹은 관계. 그것은 하나의
                        형상이 아니라 하나의 &lsquo;사이&rsquo;를 가리킨다: 한 사람이 다른 한 사람을
                        만나는 그 간격을.
                      </p>
                      <p>
                        그의 손에서 그 사이는 정지해 있지 않다. 사람들은 돌고 돈다. 그리고 그 돎을
                        통해 이어진다 — 관계가 고정된 배치가 아니라 운동으로 그려진다. 일상에서
                        사적으로 시작된 사색은 사적으로 머무르지 않고 공감과 소통으로 바깥을 향해
                        열린다. 조각은 하나의 공동체가 어떻게 서로를 붙드는지에 대한 작은 모형이
                        된다.
                      </p>
                      <p>
                        헥사곤 한국현대미술선 003으로 출간된 저서 《사람사이》는 이 사유를 언어로
                        잇는다. 조각과 부조와 글쓰기를 가로질러, 김주호는 같은 따뜻한 명제로 거듭
                        돌아온다: 우리는 함께 돌고 도는 사람들로 빚어지며, 그들을 정성껏 조각하는
                        일이 그 자체로 하나의 소통이라는 것.
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
                      From the lecture halls of Seoul National University to a practice held across
                      four decades, Kim Ju-ho has pursued a single, generous question: how do
                      people, in their daily turning, come to see and to hold one another? He joins
                      this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that those who come after might keep making, and keep
                      revolving among one another, without being pushed out.
                    </>
                  ) : (
                    <>
                      서울대학교의 강의실에서 사십 년에 걸친 작업까지, 김주호는 하나의 너그러운
                      물음을 추구해 왔다: 사람은 매일의 돌고 돎 속에서 어떻게 서로를 바라보고,
                      서로를 품게 되는가. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의
                      연대자로 함께한다 — 뒤이어 올 예술인들이 밀려나지 않고 계속 만들 수 있도록,
                      서로 사이에서 계속 돌고 돌 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Ju-ho</span>
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
                    Kim Ju-ho joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김주호 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_JUHO_PATH}
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
