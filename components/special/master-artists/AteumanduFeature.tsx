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

// 거장 작가 feature는 작가 페이지(/artworks/artist/아트만두)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const ATEUMANDU_PATH = `/artworks/artist/${encodeURIComponent('아트만두')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isAteumanduArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === '아트만두' || n.replace(/[\s-]+/g, '') === 'ateumandu';
};

const PAGE_COPY = {
  ko: {
    title: '아트만두 — 캐리커처의 칼끝, 풍자의 회화',
    description:
      '캐리커처와 시사만화의 칼끝을 회화의 영역으로 끌고 들어온 중견 작가 아트만두. 홍익대 미술대학 판화과를 졸업하고, 시대와 인물을 비틀어 보는 풍자가로 프랑스·일본의 국제 시사만화 살롱을 누벼 왔다. 날카롭고 위트 있는 풍자 〈비틀뉴스〉의 작가 아트만두의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '캐리커처와 시사만화를 회화로 끌어들인 풍자가 아트만두. 시대와 인물을 비틀어 보는 시선, 유머와 비판이 함께하는 〈비틀뉴스〉.',
    ogAlt: '아트만두 대표 작품',
    twitterTitle: '아트만두',
    twitterDescription: '캐리커처의 칼끝으로 시대를 비틀다 — 풍자가 아트만두',
    keywords:
      '아트만두 작가, 캐리커처, 시사만화, 풍자, 비틀뉴스, 홍익대 판화과, 시사만화 살롱, 씨앗페 온라인',
  },
  en: {
    title: 'Ateumandu — The Blade of Caricature, the Painting of Satire',
    description:
      'Selected works by Ateumandu, a mid-career artist who carried the blade of caricature and political cartoon into the realm of painting. A graduate of the Department of Printmaking at Hongik University, he is a satirist who twists eras and figures, traveling the international political-cartoon salons of France and Japan. View and collect the works of Ateumandu — the artist behind the sharp, witty satire of 〈Twisted News〉 — at SAF Online.',
    ogDescription:
      'Ateumandu — a satirist who drew caricature and political cartoon into painting. A gaze that twists eras and figures, joining humor and critique.',
    ogAlt: 'Ateumandu — featured work',
    twitterTitle: 'Ateumandu',
    twitterDescription: 'Twisting the era with the blade of caricature — the satirist Ateumandu',
    keywords:
      'Ateumandu artist, caricature, political cartoon, satire, Hongik University printmaking, international cartoon salon, SAF Online',
  },
} as const;

export async function buildAteumanduMetadata({
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
  const pageUrl = buildLocaleUrl(ATEUMANDU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('아트만두');
  const artwork = allArtworks.find((a) => isAteumanduArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ateumandu`
      : `${artwork.title} — 아트만두`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(ATEUMANDU_PATH, locale, true),
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

export default async function AteumanduFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(ATEUMANDU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('아트만두');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isAteumanduArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Ateumandu' : '아트만두', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${ATEUMANDU_PATH}#person-ateumandu`,
    name: isEnglish ? 'Ateumandu' : '아트만두',
    alternateName: isEnglish ? '아트만두' : 'Ateumandu',
    jobTitle: isEnglish ? 'Artist' : '작가',
    description: isEnglish
      ? 'Ateumandu is a mid-career Korean artist who carried the blade of caricature and political cartoon into the realm of painting, twisting eras and figures with sharp, witty satire.'
      : '아트만두는 캐리커처와 시사만화의 칼끝을 회화의 영역으로 끌고 들어온 중견 작가로, 시대와 인물을 날카롭고 위트 있게 비틀어 보는 풍자가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University, College of Fine Arts, Dept. of Printmaking'
        : '홍익대학교 미술대학 판화과',
    },
    knowsAbout: ['Caricature', 'Political cartoon', 'Satire'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    award: [
      isEnglish
        ? 'The BrandLaureate World Best Brands Awards, Personal Artist category (Singapore, 2019)'
        : '싱가포르 The Brandlaureate World Bestbrands Awards 퍼스널 아티스트 부문 (2019)',
      isEnglish
        ? 'SICAF (Seoul International Cartoon & Animation Festival) Comic Division Achievement Award (2021)'
        : 'SICAF 서울국제만화애니메이션페스티벌 코믹부문 공로상 (2021)',
    ],
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ateumandu — SAF Online' : '아트만두 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Ateumandu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 아트만두 작품들을 소개합니다.',
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

          {/* Diagonal ink-stroke lines — 캐리커처의 칼끝 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10 rotate-6 origin-top" />
          <div className="absolute top-0 left-20 h-full w-px bg-primary/30 rotate-6 origin-top" />
          <div className="absolute top-0 right-14 h-full w-px bg-white/10 -rotate-6 origin-top" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Ateumandu · Caricaturist' : '아트만두 · 캐리커처 작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The blade of caricature,
                  <br />
                  <span className="text-primary-soft">drawn into painting</span>
                </>
              ) : (
                <>
                  캐리커처의 칼끝을
                  <br />
                  <span className="text-primary-soft">회화로 끌어들이다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He twists the era and its figures with a sharp, witty gaze.
                  </span>
                  <span className="mt-2 block">
                    Caricature and political cartoon, carried into the realm of painting.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">시대와 인물을 날카롭고 위트 있게 비틀어 보다.</span>
                  <span className="mt-2 block">
                    캐리커처와 시사만화를, 회화의 영역으로 끌어들이다.
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
                    Caricature as critique —<br />
                    <span className="text-primary-strong">satire that became painting</span>
                  </>
                ) : (
                  <>
                    비판으로서의 캐리커처 —<br />
                    <span className="text-primary-strong">회화가 된 풍자</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Ateumandu is a mid-career artist who carried the blade of caricature and
                      political cartoon into the realm of painting. A graduate of the Department of
                      Printmaking at Hongik University&apos;s College of Fine Arts and of the same
                      university&apos;s graduate school, he built a practice in which the line of
                      the cartoon and the surface of painting meet.
                    </p>
                    <p>
                      His subject is the era itself — and the figures who shape it. Where the
                      caricaturist&apos;s instinct is to exaggerate a likeness, Ateumandu turns that
                      instinct toward a sharper end: a gaze that twists eras and figures to reveal
                      what lies beneath the surface. Humor and critique travel together in his work,
                      the wit never softening the edge.
                    </p>
                    <p>
                      He gathered this work into two anthologies of satirical caricature:
                      《Ateumandu: The Goal Is to Shut the Mouth (防口)》 (Hangilsa, 2022) and
                      《Ateumandu&apos;s Twisted News》 (Butgwapen, 2025). The second title lends
                      its name to a body of work — 〈Twisted News〉 — in which the daily flow of
                      headlines is bent, twisted, and held up to the light.
                    </p>
                    <p>
                      His reach is international. He received the BrandLaureate World Best Brands
                      Awards in the Personal Artist category in Singapore in 2019, and in 2021 was
                      honored with the Achievement Award in the Comic Division of SICAF, the Seoul
                      International Cartoon &amp; Animation Festival. His caricature has traveled
                      the international political-cartoon salons of France and Japan — a satirist
                      whose blade is recognized well beyond a single country.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      아트만두는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        캐리커처와 시사만화의 칼끝을 회화의 영역으로 끌고 들어온
                      </strong>{' '}
                      중견 작가다. 홍익대학교 미술대학 판화과와 동 대학원을 졸업한 그는, 만화의 선과
                      회화의 화면이 만나는 자리에서 자신의 작업을 세웠다.
                    </p>
                    <p>
                      그의 대상은 시대 그 자체 — 그리고 시대를 만드는 인물들이다. 캐리커처의 본능이
                      닮음을 과장하는 데 있다면, 아트만두는 그 본능을 더 날카로운 곳으로 향한다:
                      시대와 인물을 비틀어 보는 시선으로 표면 아래 놓인 것을 드러낸다. 그의 작업에서
                      유머와 비판은 함께 간다. 위트는 칼끝을 무디게 만들지 않는다.
                    </p>
                    <p>
                      그는 이 작업을 두 권의 시사 캐리커처 작품집으로 묶었다. 《아트만두의 ‘목표는
                      방구防口’다》(한길사, 2022)와 《아트만두의 ‘비틀뉴스’》(붓과펜, 2025)다. 두
                      번째 책의 제목은 한 갈래의 작업에 그대로 이름을 빌려준다 — 매일의 머리기사가
                      휘어지고 비틀려 빛 아래 들리는 〈비틀뉴스〉다.
                    </p>
                    <p>
                      그의 활동 반경은 국제적이다. 2019년 싱가포르{' '}
                      <strong className="font-bold text-charcoal">
                        The Brandlaureate World Bestbrands Awards 퍼스널 아티스트 부문
                      </strong>
                      을 수상했고, 2021년에는 SICAF 서울국제만화애니메이션페스티벌 코믹부문 공로상을
                      받았다. 그의 캐리커처는 프랑스·일본의 국제 시사만화 살롱을 누벼 왔다 — 칼끝이
                      한 나라를 넘어 알려진 풍자가다.
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
                        {isEnglish ? 'The blade of caricature' : '캐리커처의 칼끝'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The instinct to exaggerate a likeness, turned toward critique — caricature and political cartoon carried into the surface of painting.'
                          : '닮음을 과장하는 본능을 비판으로 향한다. 캐리커처와 시사만화를 회화의 화면으로 끌어들이는 형식.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? '〈Twisted News〉' : '〈비틀뉴스〉'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The daily flow of headlines, bent and twisted and held up to the light — gathered into two anthologies (Hangilsa, 2022; Butgwapen, 2025).'
                          : '매일의 머리기사를 휘고 비틀어 빛 아래 든다. 두 권의 작품집(한길사 2022, 붓과펜 2025)으로 묶인 작업.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'An international satirist' : '국제 무대의 풍자가'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A practice that travels the international political-cartoon salons of France and Japan, recognized with awards in Singapore and at SICAF.'
                          : '프랑스·일본의 국제 시사만화 살롱을 누비는 작업. 싱가포르·SICAF 수상으로 인정받은 행보.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's record" : '작가의 기록'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BrandLaureate World Best Brands Awards, Personal Artist category (Singapore).'
                        : '싱가포르 The Brandlaureate World Bestbrands Awards 퍼스널 아티스트 부문 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Achievement Award, Comic Division, SICAF (Seoul International Cartoon & Animation Festival).'
                        : 'SICAF 서울국제만화애니메이션페스티벌 코믹부문 공로상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Publishes the satirical caricature anthology 《Ateumandu: The Goal Is to
                          Shut the Mouth (防口)》 (Hangilsa).
                        </>
                      ) : (
                        <>작품집 《아트만두의 ‘목표는 방구防口’다》 출간(한길사).</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Caricature solo exhibitions 〈耳塞奇異〉, 〈Lower Your Gaze〉, and 〈Ateumandu’s Encyclopedia of Humankind〉 (Korea Manhwa Contents Agency, Bucheon).'
                        : '캐리커처戰 ‘이색기이 耳塞奇異’·‘눈 깔아’·‘아트만두의 인간대백과사전’ 개최(한국만화영상진흥원, 부천).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited caricature exhibition 〈The People We Loved〉 (Albany Park Branch, Chicago Public Library, USA).'
                        : '캐리커쳐 초대전 ‘우리가 사랑한 사람들’ 개최(시카고 알바니팍 공립도서관, 미국).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Publishes the satirical caricature anthology 《Ateumandu’s Twisted News》
                          (Butgwapen).
                        </>
                      ) : (
                        <>작품집 《아트만두의 ‘비틀뉴스’》 출간(붓과펜).</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Twisted News〉 (Born Star Rocks Gallery, New York).'
                        : '개인전 ‘비틀뉴스’ 개최(Born Star Rocks Gallery, 뉴욕).'}
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
                        ? 'Solo exhibition 〈Twisted News〉, Born Star Rocks Gallery, New York (2026).'
                        : '개인전 ‘비틀뉴스’, Born Star Rocks Gallery, 뉴욕 (2026).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Caricature exhibitions 〈耳塞奇異〉, 〈Lower Your Gaze〉, 〈Ateumandu’s Encyclopedia of Humankind〉, Korea Manhwa Contents Agency, Bucheon (2022); among 9 solo exhibitions in all.'
                        : '캐리커처戰 ‘이색기이 耳塞奇異’·‘눈 깔아’·‘아트만두의 인간대백과사전’, 한국만화영상진흥원, 부천 (2022); 개인전 외 9회.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invited caricature exhibition 〈The People We Loved〉, Albany Park Branch, Chicago Public Library, USA (2022).'
                        : '캐리커쳐 초대전 ‘우리가 사랑한 사람들’, 시카고 알바니팍 공립도서관, 미국 (2022).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: International Satirical Cartoon Exhibition 〈Eyes of East Asia〉 (Tokyo / Saitama), 〈Beyond the People〉 (Maru Art), Korean Salatist Association exhibition (2025).'
                        : '단체전: 국제풍자만화전 ‘동아시아의 눈’(도쿄·사이타마), ‘Beyond the People전’(마루아트), 한국샐라티스트협회전 (2025).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: Korea–Belgium 120th Anniversary Korean Cartoon Special Exhibition (Korean Cultural Center, Belgium); Saint-Just-le-Martel International Cartoon Salon (France).'
                        : '단체전: 한-벨 수교 120주년 한국만화특별전(벨기에한국문화원); 생쥐스트르마르텔 국제시사만화살롱(프랑스).'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광 패턴 차용, 아트만두 캐리커처 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the line, the twist, and the wit</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">선과 비틂, 그리고 위트에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 판화과에서 캐리커처로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From printmaking to caricature — the line that cuts'
                    : '판화과에서 캐리커처로 — 베는 선'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Ateumandu trained as a printmaker, graduating from the Department of
                        Printmaking at Hongik University&apos;s College of Fine Arts and from its
                        graduate school. Printmaking is an art of the incised line — the mark cut
                        into a surface, pressed and released. That discipline leaves its trace in
                        his caricature: a line that does not merely describe a face but cuts into
                        it.
                      </p>
                      <p>
                        Caricature has always lived between affection and attack. To exaggerate a
                        likeness is to claim a kind of intimacy with the subject, even as the
                        exaggeration sharpens into critique. Ateumandu inherits this double edge and
                        carries it into the realm of painting — the cartoon&apos;s economy of line
                        meeting the painting&apos;s patience of surface.
                      </p>
                      <p>
                        The result is work that refuses an easy category. It is neither cartoon
                        cleanly separated from gallery, nor painting purified of the cartoon&apos;s
                        bite. It is both at once: the blade of caricature, drawn onto the wall of
                        the gallery.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        아트만두는 판화가로 출발했다. 홍익대학교 미술대학 판화과와 동 대학원을
                        졸업했다. 판화는 새겨진 선의 예술이다 — 표면에 베어 들어가고, 눌리고,
                        떼어지는 자국. 그 수련은 그의 캐리커처에 흔적을 남긴다: 얼굴을 단지 묘사하는
                        데 그치지 않고 그 안으로 베어 들어가는 선이다.
                      </p>
                      <p>
                        캐리커처는 언제나 애정과 공격 사이에 살아 왔다. 닮음을 과장한다는 것은 그
                        대상에 대한 일종의 친밀함을 주장하는 일이면서, 동시에 그 과장이 비판으로
                        날카로워지는 일이다. 아트만두는 이 양날을 물려받아 회화의 영역으로 가져간다
                        — 만화의 절제된 선이 회화의 인내하는 화면과 만나는 자리로.
                      </p>
                      <p>
                        그 결과는 손쉬운 분류를 거부하는 작업이다. 화랑과 깨끗이 분리된 만화도
                        아니고, 만화의 물어뜯음을 정화한 회화도 아니다. 그것은 둘 다이다: 캐리커처의
                        칼끝이, 화랑의 벽에 그려진다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 비틀뉴스 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Twisting the news — the form of 〈Twisted News〉'
                    : '뉴스를 비틀다 — 〈비틀뉴스〉의 형식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Satire begins with what everyone already sees. The news is common property —
                        the day&apos;s headlines pass through every screen and every street. The
                        satirist&apos;s task is not to invent but to twist: to take the familiar and
                        bend it just enough that its hidden shape becomes visible.
                      </p>
                      <p>
                        〈Twisted News〉 — the body of work that lends its name to the 2025
                        anthology 《Ateumandu&apos;s Twisted News》 — works precisely this way. The
                        flow of headlines is bent, twisted, held up to the light until the gap
                        between what is said and what is meant opens into view. Humor is the method;
                        critique is the aim. The two are inseparable in his hand.
                      </p>
                      <p>
                        Gathered across two anthologies — 《The Goal Is to Shut the Mouth (防口)》
                        (Hangilsa, 2022) and 《Twisted News》 (Butgwapen, 2025) — this is a
                        sustained practice rather than a single image. It is the slow accumulation
                        of a satirist&apos;s daily attention to the era he lives in.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        풍자는 모두가 이미 보고 있는 것에서 시작한다. 뉴스는 공동의 재산이다 —
                        그날의 머리기사가 모든 화면과 모든 거리를 통과한다. 풍자가의 일은 발명이
                        아니라 비틂이다: 익숙한 것을 가져다 그 숨은 형태가 보일 만큼 딱 비트는 것.
                      </p>
                      <p>
                        2025년 작품집 《아트만두의 ‘비틀뉴스’》에 이름을 빌려준 작업 〈비틀뉴스〉가
                        바로 이렇게 작동한다. 머리기사의 흐름이 휘어지고, 비틀리고, 말해진 것과
                        뜻해진 것 사이의 틈이 보일 때까지 빛 아래 들린다. 유머가 방법이고, 비판이
                        목적이다. 그의 손 안에서 둘은 떼어질 수 없다.
                      </p>
                      <p>
                        두 권의 작품집에 걸쳐 묶인 — 《목표는 방구防口다》(한길사, 2022)와
                        《비틀뉴스》 (붓과펜, 2025) — 이 작업은 한 장의 이미지가 아니라 지속된
                        실천이다. 자신이 사는 시대를 향한 풍자가의 매일의 주의가 느리게 축적된
                        것이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 국제 시사만화 살롱 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'A satirist on the international stage' : '국제 무대 위의 풍자가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Political cartooning is one of the few art forms that travels almost without
                        translation. A drawn face, a bent headline, a visual joke — these cross
                        borders where text would stall. Ateumandu&apos;s work has moved through the
                        international circuit accordingly: the Saint-Just-le-Martel International
                        Cartoon Salon in France, the 〈Eyes of East Asia〉 satirical cartoon
                        exhibition in Tokyo and Saitama, and the Korea–Belgium 120th Anniversary
                        Korean Cartoon Special Exhibition at the Korean Cultural Center in Belgium.
                      </p>
                      <p>
                        The recognition has followed. He received the BrandLaureate World Best
                        Brands Awards in the Personal Artist category in Singapore in 2019, and the
                        Achievement Award in the Comic Division of SICAF in 2021. His caricature has
                        reached audiences from a public library in Chicago to a gallery in New York,
                        where his 2026 solo exhibition 〈Twisted News〉 opened.
                      </p>
                      <p>
                        For an artist whose subject is the era and its figures, this international
                        reach is itself part of the work: a reminder that the impulse to twist the
                        familiar, to laugh and to indict in the same line, is shared across the
                        languages of the world.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        시사만화는 거의 번역 없이 건너가는 드문 예술 형식 가운데 하나다. 그려진
                        얼굴, 비틀린 머리기사, 시각적 농담 — 이런 것들은 글이 멈출 자리에서 국경을
                        넘는다. 아트만두의 작업은 그에 걸맞게 국제 무대를 누벼 왔다: 프랑스의
                        생쥐스트르마르텔 국제시사만화살롱, 도쿄·사이타마의 국제풍자만화전
                        ‘동아시아의 눈’, 그리고 벨기에한국문화원의 한-벨 수교 120주년
                        한국만화특별전.
                      </p>
                      <p>
                        인정도 뒤따랐다. 2019년 싱가포르 The Brandlaureate World Bestbrands Awards
                        퍼스널 아티스트 부문을, 2021년에는 SICAF 코믹부문 공로상을 수상했다. 그의
                        캐리커처는 시카고의 공립도서관에서 뉴욕의 화랑까지 닿았고, 2026년에는
                        그곳에서 개인전 ‘비틀뉴스’가 열렸다.
                      </p>
                      <p>
                        시대와 그 인물들을 대상으로 삼는 작가에게, 이 국제적 반경은 그 자체로 작업의
                        일부다: 익숙한 것을 비틀려는 충동, 같은 선 안에서 웃기고 고발하려는 충동이
                        세계 여러 언어를 가로질러 공유된다는 사실의 환기다.
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
                      From the printmaking studio to the cartoon salons of France and Japan,
                      Ateumandu&apos;s work has pursued a single instinct: to twist the familiar
                      until its hidden shape shows, and to do it in a line that both laughs and
                      cuts. He joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that the colleagues who twist the era alongside him
                      might work without the weight of financial exclusion.
                    </>
                  ) : (
                    <>
                      판화 작업실에서 프랑스·일본의 시사만화 살롱까지, 아트만두의 작업은 하나의
                      본능을 추구해 왔다: 익숙한 것을 그 숨은 형태가 드러날 때까지 비트는 것, 그리고
                      그것을 웃기면서 동시에 베는 선으로 해내는 것. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 그와 나란히 시대를
                      비트는 동료들이 금융 차별의 무게 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Ateumandu</span>
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
                    Ateumandu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    아트만두 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품
                    판매 수익은 전액{' '}
                    <strong className="text-white">예술인 상호부조 대출 기금</strong>
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
                returnTo={ATEUMANDU_PATH}
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
