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

// 김동석 feature는 작가 페이지(/artworks/artist/김동석)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_DONGSEOK_PATH = `/artworks/artist/${encodeURIComponent('김동석')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimDongseokArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김동석' ||
    n === 'kim dong-seok' ||
    n === 'kim dongseok' ||
    n === 'kim dong seok' ||
    n.replace(/[\s-]+/g, '') === 'kimdongseok'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김동석 — ‘길(THE PATH)’의 서양화가',
    description:
      '‘길(THE PATH)’을 일관된 화두로 삼은 중견 서양화가 김동석. 31회의 개인전과 41회의 국내외 아트페어, 610여 회의 단체전을 누비며 어디에도 있었던 길의 자취를 그려왔습니다. 국립현대미술관 미술은행·전남도립미술관·프랑스 대통령궁 등이 소장한 김동석의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '‘길(THE PATH)’을 일관된 화두로 삼은 중견 서양화가 김동석. 31회 개인전과 41회 아트페어를 누빈 여정의 화면.',
    ogAlt: '김동석 대표 작품',
    twitterTitle: '김동석',
    twitterDescription: 'THE PATH — 어디에도 있었던 길을 그리는 서양화가 김동석',
    keywords:
      '김동석 화가, THE PATH, 길, 서양화, 한국미술협회, 송파미술가협회, 국립현대미술관 미술은행, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Dong-seok — A Painter of THE PATH',
    description:
      'Selected works by Kim Dong-seok, a mid-career Korean painter who has made “THE PATH” his lifelong subject. Across 31 solo exhibitions, 41 domestic and international art fairs, and more than 610 group shows, he has traced the path that was always already there. His works are held by the MMCA Art Bank, the Jeonnam Museum of Art, and the French presidential residence, among others. View and collect them at SAF Online.',
    ogDescription:
      'Kim Dong-seok — a mid-career painter whose lifelong subject is “THE PATH.” Canvases of a journey across 31 solo shows and 41 art fairs.',
    ogAlt: 'Kim Dong-seok — featured work',
    twitterTitle: 'Kim Dong-seok',
    twitterDescription: 'THE PATH — a painter tracing the road that was always there',
    keywords:
      'Kim Dong-seok artist, THE PATH, Korean Western painting, Korean Fine Arts Association, MMCA Art Bank',
  },
} as const;

export async function buildKimDongseokMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_DONGSEOK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김동석');
  const artwork = allArtworks.find((a) => isKimDongseokArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Dong-seok`
      : `${artwork.title} — 김동석`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_DONGSEOK_PATH, locale, true),
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

export default async function KimDongseokFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_DONGSEOK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김동석');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKimDongseokArtist(artwork.artist)
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
    { name: isEnglish ? 'Kim Dong-seok' : '김동석', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_DONGSEOK_PATH}#person-kim-dongseok`,
    name: isEnglish ? 'Kim Dong-seok' : '김동석',
    alternateName: isEnglish ? '김동석' : 'Kim Dong-seok',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Dong-seok is a mid-career Korean painter who has made "THE PATH" his lifelong subject, working across 31 solo exhibitions, 41 art fairs, and more than 610 group exhibitions.'
      : '김동석은 ‘길(THE PATH)’을 일관된 화두로 삼아 31회의 개인전, 41회의 국내외 아트페어, 610여 회의 단체전을 이어온 중견 서양화가입니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chugye University for the Arts, Dept. of Western Painting'
          : '추계예술대학교 서양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Dongguk University, Graduate School of Education (Art Education)'
          : '동국대학교 교육대학원 미술교육',
      },
    ],
    memberOf: {
      '@type': 'Organization',
      name: isEnglish ? 'Korean Fine Arts Association' : '한국미술협회',
    },
    knowsAbout: ['THE PATH', 'Western painting', 'Korean contemporary art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Dong-seok — SAF Online' : '김동석 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Dong-seok from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김동석 작품들을 소개합니다.',
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

          {/* Path lines — 길의 자취 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Dong-seok · THE PATH' : '김동석 · THE PATH'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The path was
                  <br />
                  <span className="text-primary-soft">always already there</span>
                </>
              ) : (
                <>
                  길은 어디에도
                  <br />
                  <span className="text-primary-soft">있었다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A single word held across a lifetime of painting — THE PATH.
                  </span>
                  <span className="mt-2 block">
                    The trace of where we have walked, and the direction we still face.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한 단어를 평생의 화두로 붙든 화면 — THE PATH.</span>
                  <span className="mt-2 block">걸어온 자취, 그리고 아직 향하는 방향.</span>
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
                    One subject, held —<br />
                    <span className="text-primary-strong">the road named THE PATH</span>
                  </>
                ) : (
                  <>
                    붙든 하나의 화두 —<br />
                    <span className="text-primary-strong">‘길(THE PATH)’이라는 이름</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Dong-seok is a mid-career Korean painter who graduated from the Department
                      of Western Painting at Chugye University for the Arts, and went on to complete
                      a master&apos;s degree in art education at Dongguk University&apos;s Graduate
                      School of Education — his thesis a study of the work of the master ink painter
                      Goam Lee Ungno.
                    </p>
                    <p>
                      Across his career he has held{' '}
                      <strong className="font-bold text-charcoal-deep">31 solo exhibitions</strong>{' '}
                      — in Seoul, Suncheon, Busan, Wonju, Gumi, Beijing, and Los Angeles — and
                      participated in{' '}
                      <strong className="font-bold text-charcoal">
                        41 domestic and international art fairs
                      </strong>{' '}
                      from Seoul, Busan, Daegu, Cheongju, and Gwangju to Shanghai, Beijing, Hong
                      Kong, Los Angeles, New York, Denmark, and Singapore, alongside more than 610
                      group exhibitions.
                    </p>
                    <p>
                      His lifelong subject is a single word:{' '}
                      <strong className="font-bold text-charcoal">THE PATH</strong> — the road. He
                      has published three painting collections around it:{' '}
                      <em>A Collection of Kim Dong Seok Paintings</em> (Solgwahak, 2019),{' '}
                      <em>The Path… It Was Everywhere</em> (ChaiDEU, 2017), and <em>THE PATH</em>{' '}
                      (ChaiDEU, 2017). The path he paints is not a single destination but a trace —
                      where one has walked, and the direction one still faces.
                    </p>
                    <p>
                      He has served as an adjunct professor at Sahmyook University, Chugye
                      University for the Arts, Baekseok Arts University, Chonnam National
                      University, and Dongguk University, and has held office as secretary-general
                      and Songpa branch head of the Korean Fine Arts Association and as president of
                      the Songpa Artists&apos; Association. He has also served as standing steering
                      chair of the Hanseong Baekje Art Grand Prize and on the judging and steering
                      committees of numerous open art competitions.
                    </p>
                    <p>
                      His work is held by the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        MMCA Art Bank, the Whanki Museum, the Jeonnam Museum of Art, the Yangpyeong
                        Art Museum
                      </strong>
                      , the Korean Buddhist Art Museum, the Muksan Art Museum, Seoul Asan Medical
                      Center, SK Telecom headquarters, the French presidential residence, Sunchon
                      National University, Chugye University for the Arts, and the Songpa-gu Office,
                      among others. His paintings have also been included in a high-school art
                      textbook (Kyohak Books). He works today as a full-time artist and is a member
                      of ADAGP (the international authors&apos; rights society), the Korean Fine
                      Arts Association, and the Songpa Artists&apos; Association.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김동석은 추계예술대학교 서양화과를 졸업하고, 동국대학교 교육대학원에서
                      미술교육을 전공해 석사학위를 받은 중견 서양화가다. 석사학위 논문은 고암
                      이응노의 작품을 연구한 것이었다.
                    </p>
                    <p>
                      그는 지금까지{' '}
                      <strong className="font-bold text-charcoal-deep">31회의 개인전</strong>(서울·
                      순천·부산·원주·구미·북경·LA)을 열었고,{' '}
                      <strong className="font-bold text-charcoal">41회의 국내외 아트페어</strong>
                      (서울·부산·대구·청주·광주·상하이·북경·홍콩·LA·뉴욕·덴마크·싱가포르)와 610여
                      회의 단체전에 참여해 왔다.
                    </p>
                    <p>
                      그의 일관된 화두는 한 단어,{' '}
                      <strong className="font-bold text-charcoal">‘길(THE PATH)’</strong>이다. 그는
                      이 화두를 중심으로 세 권의 작품집을 펴냈다 — 《A Collection of Kim Dong Seok
                      Paintings》(솔과학, 2019), 《길…어디에도 있었다》(차이DEU, 2017), 《THE
                      PATH》(차이DEU, 2017). 그가 그리는 길은 하나의 목적지가 아니라 자취다 — 걸어온
                      자리, 그리고 아직 향하는 방향.
                    </p>
                    <p>
                      그는 삼육대·추계예술대·백석예술대·전남대·동국대 외래교수를 역임했으며,
                      (사)한국미술협회 사무국장·송파지부장과 송파미술가협회 회장을 지냈다. 또한
                      한성백제미술대상전 상임추진위원장을 맡았고, 다수 미술대전의 심사·운영위원으로
                      활동했다.
                    </p>
                    <p>
                      그의 작품은{' '}
                      <strong className="font-bold text-charcoal-deep">
                        국립현대미술관 미술은행, 김환기미술관, 전남도립미술관, 양평군립미술관
                      </strong>
                      , 한국불교미술박물관, 묵산미술박물관, 서울아산병원, SK텔레콤 본사, 프랑스
                      대통령궁, 국립순천대학교, 추계예술대학교, 송파구청 등이 소장하고 있다.
                      고등학교 미술교과서(교학도서)에도 작품이 수록됐다. 그는 현재 전업작가로
                      활동하며, 국제저작권자협회(ADAGP)·(사)한국미술협회·송파미술가협회 회원이다.
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
                        {isEnglish ? 'THE PATH as subject' : '화두로서의 ‘길’'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A single word — the road — held as a lifelong subject. Not a destination, but the trace of where one has walked.'
                          : '‘길’이라는 한 단어를 평생의 화두로 붙든 화면. 목적지가 아니라, 걸어온 자취 그 자체다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A journey across borders' : '국경을 넘는 여정'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? '31 solo exhibitions and 41 art fairs across Korea, China, the United States, Europe, and Southeast Asia — a practice that travels.'
                          : '한국·중국·미국·유럽·동남아를 누빈 31회 개인전과 41회 아트페어 — 여정 자체가 작업이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Educator and organizer' : '교육자이자 운영자'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Adjunct professor at five universities and an officer of the Korean Fine Arts Association — a practice rooted in teaching and community.'
                          : '다섯 대학의 외래교수이자 한국미술협회 임원 — 가르침과 공동체에 뿌리내린 작업.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's record" : '작가의 자취'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      31
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions — Seoul, Suncheon, Busan, Wonju, Gumi, Beijing, Los Angeles.'
                        : '개인전 — 서울·순천·부산·원주·구미·북경·LA.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      41
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art fairs at home and abroad — Seoul, Busan, Daegu, Shanghai, Beijing, Hong Kong, LA, New York, Denmark, Singapore.'
                        : '국내외 아트페어 — 서울·부산·대구·상하이·북경·홍콩·LA·뉴욕·덴마크·싱가포르.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      610+
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Group exhibitions.' : '단체전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Painting collections 〈The Path… It Was Everywhere〉 and 〈THE PATH〉 published (ChaiDEU).'
                        : '작품집 《길…어디에도 있었다》·《THE PATH》 출간(차이DEU).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Painting collection 〈A Collection of Kim Dong Seok Paintings〉 published (Solgwahak).'
                        : '작품집 《A Collection of Kim Dong Seok Paintings》 출간(솔과학).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      M.Ed.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Master's in art education, Dongguk University — thesis on the work of Goam Lee Ungno."
                        : '동국대학교 교육대학원 미술교육 석사 — 고암 이응노 작품 연구 논문.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected collections & roles' : '주요 소장 및 활동'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Public collections: MMCA Art Bank, Whanki Museum, Jeonnam Museum of Art, Yangpyeong Art Museum, Muksan Art Museum.'
                        : '공공 소장: 국립현대미술관 미술은행, 김환기미술관, 전남도립미술관, 양평군립미술관, 묵산미술박물관.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Other collections: Korean Buddhist Art Museum, Seoul Asan Medical Center, SK Telecom HQ, the French presidential residence, Sunchon National University, Songpa-gu Office.'
                        : '기타 소장: 한국불교미술박물관, 서울아산병원, SK텔레콤 본사, 프랑스 대통령궁, 국립순천대학교, 송파구청.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Work included in a high-school art textbook (Kyohak Books).'
                        : '고등학교 미술교과서(교학도서)에 작품 수록.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Former adjunct professor at Sahmyook, Chugye, Baekseok Arts, Chonnam National, and Dongguk universities.'
                        : '삼육대·추계예술대·백석예술대·전남대·동국대 외래교수 역임.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Former secretary-general and Songpa branch head of the Korean Fine Arts Association; former president of the Songpa Artists’ Association.'
                        : '(사)한국미술협회 사무국장·송파지부장, 송파미술가협회 회장 역임.'}
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
                  <span className="text-charcoal-deep">on the road and its keeping</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">길과 그 지킴에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 화두로서의 길 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'One word, held for a lifetime — THE PATH as subject'
                    : '평생 붙든 한 단어 — 화두로서의 ‘길’'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Many painters move from subject to subject across a career. Kim Dong-seok
                        has kept one. The road — <em>THE PATH</em> — has been his consistent
                        subject, the single word around which his practice has organized itself. The
                        titles of his three painting collections say as much: <em>THE PATH</em>,{' '}
                        <em>The Path… It Was Everywhere</em>, and the survey volume{' '}
                        <em>A Collection of Kim Dong Seok Paintings</em>.
                      </p>
                      <p>
                        The phrase &ldquo;it was everywhere&rdquo; matters. The path he paints is
                        not a destination set ahead, nor a single named place. It is the road that
                        was always already there — under the feet of whoever walked, in whatever
                        direction. To keep this as a subject for a lifetime is itself a kind of
                        discipline: to look again and again at the most ordinary thing, the ground
                        we cross, until it yields its weight.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        많은 화가가 한 생애 동안 주제를 옮겨 다닌다. 김동석은 하나를 지켜 왔다. 길 —{' '}
                        <em>THE PATH</em> — 은 그의 일관된 화두이자, 작업이 그 둘레로 모이는 한
                        단어다. 세 권의 작품집 제목이 그것을 말한다: 《THE PATH》, 《길…어디에도
                        있었다》, 그리고 전반을 아우른 《A Collection of Kim Dong Seok Paintings》.
                      </p>
                      <p>
                        ‘어디에도 있었다’는 말이 중요하다. 그가 그리는 길은 앞에 놓인 목적지도, 이름
                        붙은 한 장소도 아니다. 누가 어느 방향으로 걷든, 그 발밑에 이미 있던 길이다.
                        이것을 평생의 화두로 붙드는 일은 그 자체로 하나의 수련이다 — 우리가 건너는
                        가장 평범한 것, 그 바닥을 거듭 들여다보며 그 무게를 길어 올리는 일.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 여정의 화면 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'A practice that travels — 31 solos, 41 fairs'
                    : '여정이 된 작업 — 31회 개인전, 41회 아트페어'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        If the subject is the road, the career has matched it. Across{' '}
                        <strong className="font-bold text-charcoal-deep">
                          31 solo exhibitions
                        </strong>{' '}
                        — from Seoul and Suncheon to Beijing and Los Angeles — and{' '}
                        <strong className="font-bold text-charcoal-deep">41 art fairs</strong>{' '}
                        reaching Shanghai, Hong Kong, New York, Denmark, and Singapore, Kim&apos;s
                        work has itself traveled the routes it depicts.
                      </p>
                      <p>
                        More than 610 group exhibitions sit alongside that record. The sheer count
                        is not the point; the point is what it describes — a practice sustained not
                        in a single studio but in motion, carrying one subject across borders and
                        back. The road, painted, is also the road walked.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        화두가 길이라면, 경력이 그에 답해 왔다.{' '}
                        <strong className="font-bold text-charcoal-deep">31회의 개인전</strong>
                        (서울· 순천에서 북경·LA까지)과 상하이·홍콩·뉴욕·덴마크·싱가포르에 이른{' '}
                        <strong className="font-bold text-charcoal-deep">41회의 아트페어</strong>를
                        거치며, 김동석의 작업은 그것이 그린 길을 스스로 따라 걸었다.
                      </p>
                      <p>
                        610여 회의 단체전이 그 자취 곁에 놓인다. 숫자 자체가 핵심은 아니다. 핵심은
                        그 숫자가 그리는 모습이다 — 하나의 작업실이 아니라 이동 속에서 지속된 작업,
                        한 화두를 안고 국경을 넘나든 작업. 그려진 길은, 걸어온 길이기도 하다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 소장과 교육 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Where the work rests — collections, teaching, community'
                    : '작업이 머무는 자리 — 소장, 가르침, 공동체'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim&apos;s paintings are held across a wide range of institutions: the MMCA
                        Art Bank, the Whanki Museum, the Jeonnam Museum of Art, the Yangpyeong Art
                        Museum, the Muksan Art Museum, alongside the Korean Buddhist Art Museum,
                        Seoul Asan Medical Center, SK Telecom headquarters, the French presidential
                        residence, Sunchon National University, and the Songpa-gu Office. His work
                        has also entered a high-school art textbook.
                      </p>
                      <p>
                        That breadth is matched by a life in teaching and organizing — adjunct
                        professorships at five universities, offices held within the Korean Fine
                        Arts Association and the Songpa Artists&apos; Association, and service on
                        the committees of open art competitions. The painter of the road has also
                        kept the paths others walk: students, peers, the institutions that hold a
                        community together. It is this same instinct — care for those who come
                        alongside — that brings him to this campaign as a fellow artist in
                        solidarity.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김동석의 작품은 폭넓은 기관에 소장돼 있다 — 국립현대미술관 미술은행,
                        김환기미술관, 전남도립미술관, 양평군립미술관, 묵산미술박물관, 그리고
                        한국불교미술박물관, 서울아산병원, SK텔레콤 본사, 프랑스 대통령궁,
                        국립순천대학교, 송파구청 등. 그의 작품은 고등학교 미술교과서에도 실렸다.
                      </p>
                      <p>
                        그 폭은 가르침과 운영의 삶과 맞닿아 있다 — 다섯 대학의 외래교수,
                        (사)한국미술협회와 송파미술가협회에서 맡은 직무, 그리고 여러 미술대전의
                        심사·운영. 길을 그린 화가는 다른 이들이 걷는 길도 지켜 왔다 — 학생들,
                        동료들, 공동체를 지탱하는 제도들. 곁에 선 이들을 돌보는 이 같은 마음이, 그를
                        동료 예술인과의 연대자로서 이 캠페인에 함께하게 한다.
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
                      One word, held for a lifetime; one road, walked across borders and brought
                      back to the canvas. Kim Dong-seok joins this campaign not as a subject of its
                      cause but as a fellow artist in solidarity — so that the path might stay open
                      for the artists who come after.
                    </>
                  ) : (
                    <>
                      평생 붙든 한 단어, 국경을 넘어 걸었다가 다시 캔버스로 가져온 하나의 길.
                      김동석은 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다 — 뒤에 올 예술인들에게도 그 길이 열려 있도록.
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
                THE PATH
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Dong-seok</span>
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
                    Kim Dong-seok joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김동석 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_DONGSEOK_PATH}
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
