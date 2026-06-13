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

// 거장 작가 feature는 작가 페이지(/artworks/artist/박수지)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_SUJI_PATH = `/artworks/artist/${encodeURIComponent('박수지')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isParkSujiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '박수지' ||
    n === 'park suji' ||
    n === 'park su-ji' ||
    n.replace(/[\s-]+/g, '') === 'parksuji'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박수지 — 일상을 새롭게 호명하는 〈refresh〉의 작가',
    description:
      '일상의 호흡과 풍경을 회화로 새롭게 호명하는 〈refresh〉 시리즈의 중견 작가 박수지. 일본 무사시노 미술대학 유화학과에서 익힌 회화 언어로 광주·고흥·부산·서울을 잇는 순회를 이어왔다. 맑고 산뜻한 톤으로 일상을 다시 부르는 박수지의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '〈refresh〉의 작가 박수지. 일상의 호흡과 풍경을 회화로 새롭게 호명하는 순회 — 광주·고흥·부산·서울.',
    ogAlt: '박수지 대표 작품',
    twitterTitle: '박수지',
    twitterDescription: '일상을 새롭게 호명하다 — 〈refresh〉의 작가 박수지',
    keywords: '박수지 화가, refresh, 무사시노 미술대학, 유화, 회화, 일상 풍경, 씨앗페 온라인',
  },
  en: {
    title: 'Park Suji — Painter of the 〈refresh〉 Series',
    description:
      'Selected works by Park Suji, a mid-career painter whose 〈refresh〉 series calls the breath and landscape of everyday life anew. Trained in oil painting at Musashino Art University in Japan, she has carried the series on tour through Gwangju, Goheung, Busan, and Seoul. View and collect her clear, fresh-toned paintings at SAF Online.',
    ogDescription:
      'Park Suji — painter of the 〈refresh〉 series. Calling the breath and landscape of everyday life anew, on tour through Gwangju, Goheung, Busan, and Seoul.',
    ogAlt: 'Park Suji — featured work',
    twitterTitle: 'Park Suji',
    twitterDescription: 'Calling everyday life anew — painter of the 〈refresh〉 series',
    keywords:
      'Park Suji artist, refresh series, Musashino Art University, oil painting, everyday landscape, Korean painter',
  },
} as const;

export async function buildParkSujiMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_SUJI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박수지');
  const artwork = allArtworks.find((a) => isParkSujiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Suji`
      : `${artwork.title} — 박수지`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_SUJI_PATH, locale, true),
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

export default async function ParkSujiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_SUJI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박수지');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isParkSujiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Park Suji' : '박수지', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_SUJI_PATH}#person-park-suji`,
    name: isEnglish ? 'Park Suji' : '박수지',
    alternateName: isEnglish ? '박수지' : 'Park Suji',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Park Suji is a mid-career Korean painter whose 〈refresh〉 series calls the breath and landscape of everyday life anew, trained in oil painting at Musashino Art University in Japan.'
      : '박수지는 일상의 호흡과 풍경을 회화로 새롭게 호명하는 〈refresh〉 시리즈의 중견 작가로, 일본 무사시노 미술대학 유화학과에서 회화를 익혔습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Musashino Art University, Dept. of Oil Painting'
        : '무사시노 미술대학 유화학과',
    },
    knowsAbout: ['Oil painting', 'Everyday landscape', 'Korean contemporary painting'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Suji — SAF Online' : '박수지 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Suji from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박수지 작품들을 소개합니다.',
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

          {/* Vertical strata lines — 맑은 톤 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Park Suji · 〈refresh〉' : '박수지 · 〈refresh〉'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Calling everyday life
                  <br />
                  <span className="text-primary-soft">anew, in paint</span>
                </>
              ) : (
                <>
                  일상을 회화로
                  <br />
                  <span className="text-primary-soft">새롭게 호명하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The breath and landscape of the everyday, named again.
                  </span>
                  <span className="mt-2 block">
                    The 〈refresh〉 series, on tour through Gwangju, Goheung, Busan, and Seoul.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">일상의 호흡과 풍경을, 다시 부르다.</span>
                  <span className="mt-2 block">광주·고흥·부산·서울로 이어진 〈refresh〉 순회.</span>
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
                    refresh —<br />
                    <span className="text-primary-strong">calling the everyday anew</span>
                  </>
                ) : (
                  <>
                    refresh —<br />
                    <span className="text-primary-strong">일상을 다시 부르는 일</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Suji is a mid-career painter who calls the breath and landscape of
                      everyday life anew through her 〈refresh〉 series. She graduated from the
                      Department of Oil Painting at Musashino Art University in Japan in 2016, where
                      she built the painterly language that carries her work today.
                    </p>
                    <p>
                      The 〈refresh〉 series has unfolded as a tour: 〈refresh Seoul〉 at Noeul
                      Artisan Center and 〈refresh Busan〉 at Gallery 177 in 2024, then 〈refresh
                      Gwangju〉 at Gallery Chungjang 22 and 〈refresh Goheung〉 at Dohwaheon Museum
                      of Art in 2025. Across these venues, ordinary scenes — the rhythms and views
                      of daily life — are summoned back into attention through painting.
                    </p>
                    <p>
                      Her practice is not confined to one register. The 2020 solo exhibition
                      〈Eoheung〉 at Art Space At drew on the humour of the tiger, while her earlier
                      work was shown in the 2017 solo exhibition 〈The Painting Is Fresh〉 at THE
                      PLOT GALLERY and in invitational exhibitions in Japan. The tone that runs
                      through her painting is clear and fresh.
                    </p>
                    <p>
                      Beyond the studio, she has taught — delivering the special lecture
                      &ldquo;Interpreting the Unconscious&rdquo; at Sejong Academy of Science and
                      Arts in 2018 and 2024. Her painting 〈Black Hole〉 (2025) entered the
                      collection of Dohwaheon Museum of Art.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박수지는 일상의 호흡과 풍경을 회화로 새롭게 호명하는 〈refresh〉 시리즈의 중견
                      작가다. 2016년 일본{' '}
                      <strong className="font-bold text-charcoal-deep">
                        무사시노 미술대학 유화학과
                      </strong>
                      를 졸업하며, 오늘의 작업을 지탱하는 회화 언어를 익혔다.
                    </p>
                    <p>
                      〈refresh〉 시리즈는 순회로 펼쳐졌다. 2024년 노을 아티잔 센터의 〈refresh
                      Seoul〉과 갤러리 177의 〈refresh Busan〉을 거쳐, 2025년 갤러리 충장 22의
                      〈refresh Gwangju〉와 도화헌 미술관의 〈refresh Goheung〉으로 이어졌다. 이
                      전시들에서 일상의 평범한 장면 — 매일의 리듬과 풍경 — 은 회화를 통해 다시
                      주목의 자리로 불려 나온다.
                    </p>
                    <p>
                      그의 작업은 하나의 결에만 머물지 않는다. 2020년 아트 스페이스 앳의 개인전
                      〈어흥전〉은 호랑이의 해학에 기댔고, 이전 작업은 2017년 THE PLOT GALLERY의
                      개인전 〈그림이 싱싱해〉와 일본의 초대전에서 선보였다. 그의 화면을 관통하는
                      톤은 맑고 산뜻하다.
                    </p>
                    <p>
                      작업실 바깥에서 그는 가르치기도 했다 — 2018년과 2024년 세종과학예술영재학교
                      특별강연 〈무의식 해석하기〉를 맡았다. 회화 〈블랙홀〉(2025)은 도화헌 미술관에
                      소장되었다.
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
                        {isEnglish ? 'The 〈refresh〉 series' : '〈refresh〉 시리즈'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The breath and landscape of everyday life, called anew through painting — a tour that moved through Gwangju, Goheung, Busan, and Seoul.'
                          : '일상의 호흡과 풍경을 회화로 새롭게 호명하는 작업. 광주·고흥·부산·서울로 이어진 순회.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Oil painting from Musashino' : '무사시노에서 익힌 유화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A painterly language built in the Department of Oil Painting at Musashino Art University, Japan — clear and fresh in tone.'
                          : '일본 무사시노 미술대학 유화학과에서 익힌 회화 언어. 맑고 산뜻한 톤.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The humour of the tiger' : '호랑이의 해학'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The 2020 solo exhibition 〈Eoheung〉 leaned into the playful, good-humoured figure of the tiger.'
                          : '2020년 개인전 〈어흥전〉은 호랑이의 해학에 기댄 작업이다.'}
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
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BANKAN invitational exhibition, Japan.'
                        : 'BANKAN 초대전(일본).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Oil Painting, Musashino Art University; graduation exhibition; the Five Art Exhibition at the National Art Center, Roppongi, Japan.'
                        : '무사시노 미술대학 유화학과 졸업; 졸업전; 롯폰기 국립 신 미술관 5대 미술전(일본).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Painting Is Fresh〉, THE PLOT GALLERY; BANKAN encore invitational exhibition, Japan.'
                        : '개인전 〈그림이 싱싱해〉(THE PLOT GALLERY); BANKAN encore 초대전(일본).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Special lecture "Interpreting the Unconscious," Sejong Academy of Science and Arts.'
                        : '세종과학예술영재학교 특별강연 〈무의식 해석하기〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Eoheung〉, Art Space At.'
                        : '개인전 〈어흥전〉(아트 스페이스 앳).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈refresh Busan〉 (Gallery 177), 〈refresh Seoul〉 (Noeul Artisan Center), 〈refresh〉 (Seolmijae Museum of Art); group exhibition 〈Simultaneous〉 (N2 Art Space); special lecture at Sejong Academy of Science and Arts.'
                        : '개인전 〈refresh Busan〉(갤러리 177)·〈refresh Seoul〉(노을 아티잔 센터)·〈refresh〉(설미재 미술관); 단체전 〈동시다발전〉(N2 아트스페이스); 세종과학예술영재학교 특별강연.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈refresh Gwangju〉 (Gallery Chungjang 22), 〈refresh Goheung〉 (Dohwaheon Museum of Art); 〈Black Hole〉 enters the Dohwaheon Museum of Art collection.'
                        : '개인전 〈refresh Gwangju〉(갤러리 충장 22)·〈refresh Goheung〉(도화헌 미술관); 〈블랙홀〉 도화헌 미술관 소장.'}
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
                        ? 'Solo exhibitions: 〈refresh Gwangju〉 (Gallery Chungjang 22, 2025), 〈refresh Goheung〉 (Dohwaheon Museum of Art, 2025), 〈refresh Busan〉 (Gallery 177, 2024), 〈refresh Seoul〉 (Noeul Artisan Center, 2024), 〈refresh〉 (Seolmijae Museum of Art, 2024)'
                        : '개인전: 〈refresh Gwangju〉(갤러리 충장 22, 2025), 〈refresh Goheung〉(도화헌 미술관, 2025), 〈refresh Busan〉(갤러리 177, 2024), 〈refresh Seoul〉(노을 아티잔 센터, 2024), 〈refresh〉(설미재 미술관, 2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈Eoheung〉 (Art Space At, 2020), 〈The Painting Is Fresh〉 (THE PLOT GALLERY, 2017); BANKAN encore invitational exhibition, Japan (2017); BANKAN invitational exhibition, Japan (2015)'
                        : '개인전: 〈어흥전〉(아트 스페이스 앳, 2020), 〈그림이 싱싱해〉(THE PLOT GALLERY, 2017); BANKAN encore 초대전(일본, 2017); BANKAN 초대전(일본, 2015)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈Simultaneous〉 (N2 Art Space, 2024); the Five Art Exhibition at the National Art Center, Roppongi, Japan (2016); Musashino Art University graduation exhibition, Japan (2016)'
                        : '단체전: 〈동시다발전〉(N2 아트스페이스, 2024); 롯폰기 국립 신 미술관 5대 미술전(일본, 2016); 무사시노 미술대학 졸업전(일본, 2016)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collection: Dohwaheon Museum of Art — 〈Black Hole〉 (2025)'
                        : '소장: 도화헌 미술관 — 〈블랙홀〉(2025)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 박수지 refresh 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the everyday, named again</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">다시 불린 일상에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 무사시노에서 익힌 회화 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Oil painting, learned in Musashino' : '무사시노에서 익힌 유화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Suji studied in the Department of Oil Painting at Musashino Art
                        University in Japan, graduating in 2016. It is there that the foundation of
                        her painting was laid — the handling of oil, the building of a surface, the
                        clear and fresh tone that would later run through the 〈refresh〉 series.
                      </p>
                      <p>
                        Her early work was shown across Japan: the graduation exhibition and the
                        Five Art Exhibition at the National Art Center in Roppongi in 2016, and
                        invitational exhibitions under the BANKAN name in 2015 and 2017. These years
                        in Japan are the ground from which her practice grew.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박수지는 일본 무사시노 미술대학 유화학과에서 수학하고 2016년 졸업했다.
                        그곳에서 그의 회화의 토대가 놓였다 — 유화를 다루는 법, 화면을 쌓는 법, 훗날
                        〈refresh〉 시리즈를 관통할 맑고 산뜻한 톤.
                      </p>
                      <p>
                        그의 초기 작업은 일본 곳곳에서 선보였다. 2016년 졸업전과 롯폰기 국립 신
                        미술관의 5대 미술전, 그리고 2015년과 2017년의 BANKAN 초대전. 일본에서의 이
                        시간은 그의 작업이 자라난 토양이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. refresh, 일상을 호명하다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈refresh〉 — calling the everyday'
                    : '〈refresh〉 — 일상을 호명하다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈refresh〉 series takes the breath and landscape of everyday life and
                        names it again in paint. It is not a record of the extraordinary but a
                        renewed attention to the ordinary — the scenes one passes without seeing,
                        returned to the surface of a canvas and held there.
                      </p>
                      <p>
                        The series travelled. 〈refresh Seoul〉 at Noeul Artisan Center and
                        〈refresh Busan〉 at Gallery 177 in 2024; 〈refresh Gwangju〉 at Gallery
                        Chungjang 22 and 〈refresh Goheung〉 at Dohwaheon Museum of Art in 2025.
                        City after city, the same gesture: the everyday, called by name.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈refresh〉 시리즈는 일상의 호흡과 풍경을 회화로 다시 호명한다. 비범한 것의
                        기록이 아니라 평범한 것에 대한 새로운 주목이다 — 보지 않고 지나치는 장면을
                        캔버스의 표면으로 되불러 그 자리에 붙드는 일.
                      </p>
                      <p>
                        시리즈는 순회했다. 2024년 노을 아티잔 센터의 〈refresh Seoul〉과 갤러리
                        177의 〈refresh Busan〉, 2025년 갤러리 충장 22의 〈refresh Gwangju〉와
                        도화헌 미술관의 〈refresh Goheung〉. 도시에서 도시로 이어지는 같은 몸짓 —
                        일상을, 이름으로 부르는 일.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 맑은 톤과 해학 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'A clear tone, and the humour of the tiger'
                    : '맑은 톤, 그리고 호랑이의 해학'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        What holds Park Suji&apos;s work together is tone — clear and fresh, light
                        without being slight. Even when the subject is the ordinary, the surface
                        carries a brightness that asks the viewer to look again.
                      </p>
                      <p>
                        Her register is not single. The 2020 solo exhibition 〈Eoheung〉 at Art
                        Space At drew on the humour of the tiger, a figure of play and good wishes
                        in Korean tradition. Earlier, the 2017 solo exhibition 〈The Painting Is
                        Fresh〉 at THE PLOT GALLERY announced, in its very title, the freshness she
                        has kept pursuing since.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박수지의 작업을 하나로 묶는 것은 톤이다 — 맑고 산뜻하며, 가볍지 않게 밝다.
                        소재가 평범한 일상일 때조차, 화면은 다시 보게 만드는 밝음을 품는다.
                      </p>
                      <p>
                        그의 결은 하나가 아니다. 2020년 아트 스페이스 앳의 개인전 〈어흥전〉은 한국
                        전통에서 놀이와 길상의 존재인 호랑이의 해학에 기댔다. 앞서 2017년 THE PLOT
                        GALLERY의 개인전 〈그림이 싱싱해〉는 그 제목 자체로, 그가 이후로도 좇아 온
                        싱싱함을 알렸다.
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
                      From the studios of Musashino to the touring rooms of 〈refresh〉, Park Suji
                      has pursued a single, quiet task: to call the everyday by name, and to make a
                      viewer look again at what they had stopped seeing. She joins this campaign not
                      as a subject of its cause but as a fellow artist in solidarity — so that those
                      who come after might keep painting.
                    </>
                  ) : (
                    <>
                      무사시노의 작업실에서 〈refresh〉의 순회 전시실까지, 박수지는 하나의 조용한
                      일을 좇아 왔다: 일상을 이름으로 부르고, 보지 않게 된 것을 다시 보게 하는 일.
                      그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다 — 다음 세대의 예술인들이 계속 그림을 그릴 수 있도록.
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
                refresh
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Park Suji</span>
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
                    Park Suji joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박수지 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_SUJI_PATH}
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
