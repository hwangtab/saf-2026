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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이홍원)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_HONGWON_PATH = `/artworks/artist/${encodeURIComponent('이홍원')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeHongwonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이홍원' ||
    n === 'lee hong-won' ||
    n === 'lee hongwon' ||
    n.replace(/[\s-]+/g, '') === 'leehongwon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이홍원 — 한국적 정서를 그린 회화의 40년',
    description:
      '1984년 데뷔 이래 〈삶+인간〉·〈숲속의 노래〉·〈달항아리〉로 이어진 한국적 정서의 회화. 호랑이·꽃·자연의 해학과 서정을 따뜻하고 토속적인 톤으로 풀어온 중견 작가 이홍원의 작품을 씨앗페 온라인에서 감상하고 소장하세요. 개인전 29회, 국내외 그룹전 300여 회.',
    ogDescription:
      '이홍원 — 〈삶+인간〉·〈숲속의 노래〉·〈달항아리〉로 이어진 한국적 정서의 회화 40년. 호랑이·꽃·자연의 해학과 서정.',
    ogAlt: '이홍원 대표 작품',
    twitterTitle: '이홍원',
    twitterDescription: '삶과 인간, 숲속의 노래 — 한국적 정서의 40년, 이홍원',
    keywords:
      '이홍원 화가, 숲속의 노래, 삶과 인간, 달항아리, 호랑이 그림, 한국화, 동국대, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Hongwon — Forty Years of Painting Korean Sensibility',
    description:
      'Selected works by Lee Hongwon. Since his 1984 debut, he has unfolded Korean sensibilities through painting — from 〈Life + Human〉 to 〈Song of the Forest〉 and 〈Moon Jar〉 — rendering the humor and lyricism of tigers, flowers, and nature in warm, vernacular tones. 29 solo exhibitions and over 300 group exhibitions. View and collect his works at SAF Online.',
    ogDescription:
      'Lee Hongwon — four decades of Korean sensibility in painting, from 〈Life + Human〉 to 〈Song of the Forest〉 and 〈Moon Jar〉. The humor and lyricism of tigers, flowers, and nature.',
    ogAlt: 'Lee Hongwon — featured work',
    twitterTitle: 'Lee Hongwon',
    twitterDescription: 'Life and human, song of the forest — forty years of Korean sensibility',
    keywords:
      'Lee Hongwon artist, Song of the Forest, Korean painting, moon jar, tiger painting, Korean sensibility',
  },
} as const;

export async function buildLeeHongwonMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_HONGWON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이홍원');
  const artwork = allArtworks.find((a) => isLeeHongwonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Hongwon`
      : `${artwork.title} — 이홍원`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_HONGWON_PATH, locale, true),
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

export default async function LeeHongwonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_HONGWON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이홍원');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeHongwonArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Hongwon' : '이홍원', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_HONGWON_PATH}#person-lee-hongwon`,
    name: isEnglish ? 'Lee Hongwon' : '이홍원',
    alternateName: isEnglish ? '이홍원' : 'Lee Hongwon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Lee Hongwon is a painter who, since his 1984 debut, has unfolded Korean sensibilities through painting across four decades — from 〈Life + Human〉 to 〈Song of the Forest〉 and 〈Moon Jar〉.'
      : '이홍원은 1984년 데뷔 이후 40여 년 동안 〈삶+인간〉·〈숲속의 노래〉·〈달항아리〉로 한국적 정서를 회화로 풀어온 중견 작가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'College of Arts, Dongguk University' : '동국대학교 예술대학',
    },
    knowsAbout: ['Korean painting', 'Korean sensibility', 'Folk lyricism'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Hongwon — SAF Online' : '이홍원 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Hongwon from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이홍원 작품들을 소개합니다.',
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

          {/* Soft vertical lines — 숲의 정서 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-sun/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Hongwon · since 1984' : '이홍원 · 1984년 데뷔'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Life, human,
                  <br />
                  <span className="text-primary-soft">and the song of the forest</span>
                </>
              ) : (
                <>
                  삶과 인간,
                  <br />
                  <span className="text-primary-soft">그리고 숲속의 노래</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Forty years of painting Korean sensibility.</span>
                  <span className="mt-2 block">
                    The humor and lyricism of tigers, flowers, and nature — in warm, vernacular
                    tones.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한국적 정서를 그려온 회화의 40년.</span>
                  <span className="mt-2 block">
                    호랑이와 꽃과 자연의 해학과 서정을, 따뜻하고 토속적인 톤으로.
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
                    A warm, vernacular gaze —<br />
                    <span className="text-primary-strong">forty years of Korean sensibility</span>
                  </>
                ) : (
                  <>
                    따뜻하고 토속적인 시선 —<br />
                    <span className="text-primary-strong">한국적 정서의 40년</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Hongwon studied at the College of Arts, Dongguk University, completing
                      both his undergraduate and graduate degrees there. He made his debut in 1984
                      with the solo exhibition 〈Life + Human〉 at Gwanhun Gallery in Seoul, and in
                      the same year was selected as a Korean Critics&apos; Recommended Notable
                      Artist.
                    </p>
                    <p>
                      Across more than four decades since, his work has unfolded a distinctly Korean
                      sensibility through painting. From the early 〈Life + Human〉 to the
                      long-running{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Song of the Forest〉
                      </strong>{' '}
                      series and the recent 〈Moon Jar〉 works, he has rendered the humor and
                      lyricism of tigers, flowers, and the natural world in warm, vernacular tones.
                    </p>
                    <p>
                      He has held{' '}
                      <strong className="font-bold text-charcoal">29 solo exhibitions</strong> and
                      participated in over{' '}
                      <strong className="font-bold text-charcoal">300 group exhibitions</strong> at
                      home and abroad — including at Insa Art Center (2012, 2013), Insa Art Plaza
                      (2023), Morris Gallery in Daejeon, and 419 Verones Gallery in Los Angeles,
                      with international showings in LA, New York, Sarajevo, Peru, China, and Japan.
                    </p>
                    <p>
                      Beyond his exhibition practice, he produced the official portrait of the
                      independence activist Danjae Shin Chae-ho and a presidential record painting
                      at Cheongnamdae — both commissioned works of public record. His paintings are
                      held in the MMCA Art Bank, the Cheongju Museum of Art, the Chungbuk Provincial
                      Office, the Chungbuk Office of Education, and the SK Guest House.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이홍원은 동국대학교 예술대학에서 학사와 석사를 마쳤다. 1984년 관훈미술관(서울)
                      개인전 〈삶+인간〉으로 데뷔했으며, 같은 해{' '}
                      <strong className="font-bold text-charcoal-deep">
                        한국 평론가 추천 문제 작가
                      </strong>
                      로 선정되었다.
                    </p>
                    <p>
                      이후 40여 년에 걸쳐 그의 작업은 한국적 정서를 회화로 풀어내 왔다. 초기의
                      〈삶+인간〉에서 오랜 연작{' '}
                      <strong className="font-bold text-charcoal">〈숲속의 노래〉</strong>, 그리고
                      근작 〈달항아리〉에 이르기까지, 호랑이와 꽃과 자연의 해학과 서정을 따뜻하고
                      토속적인 톤으로 화폭에 담아 왔다.
                    </p>
                    <p>
                      그는 <strong className="font-bold text-charcoal">개인전 29회</strong>와 국내외{' '}
                      <strong className="font-bold text-charcoal">그룹전 300여 회</strong>에
                      참가했다 — 인사아트센터(2012·2013), 인사아트프라자(2023), 모리스 갤러리(대전),
                      LA의 419 Verones 갤러리 등이 그 무대였으며, 해외전은
                      LA·뉴욕·사라예보·페루·중국· 일본 등으로 이어졌다.
                    </p>
                    <p>
                      전시 작업 외에도 그는 독립운동가 단재 신채호 영정과 청남대 대통령기록화를
                      제작했다 — 모두 공공 기록을 위한 의뢰 작업이다. 그의 작품은 국립현대미술관
                      미술은행, 청주시립미술관, 충북도청, 충북교육청, SK 영빈관 등에 소장되어 있다.
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
                        {isEnglish ? 'Song of the forest' : '숲속의 노래'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A long-running series that gathers tigers, flowers, and trees into a warm, vernacular vision of the natural world.'
                          : '호랑이·꽃·나무를 따뜻하고 토속적인 자연의 풍경으로 모아낸 오랜 연작.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Humor & lyricism' : '해학과 서정'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Tigers and flowers carry the wit and warmth of Korean folk feeling — playful, tender, and rooted in everyday life.'
                          : '호랑이와 꽃에 깃든 한국적 해학과 따뜻함. 정겹고 토속적인 삶의 정서가 화면에 흐른다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'From 〈Life + Human〉 to 〈Moon Jar〉'
                          : '〈삶+인간〉에서 〈달항아리〉로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A four-decade arc of Korean sensibility — from the 1984 debut through to the recent moon-jar paintings.'
                          : '1984년 데뷔작에서 근작 달항아리까지, 한국적 정서를 이어 온 40년의 궤적.'}
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
                      1974–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studies at the College of Arts, Dongguk University (B.F.A. through 1980, M.F.A. through 1983).'
                        : '동국대학교 예술대학 수학(학사 ~1980, 석사 ~1983).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Debut solo exhibition 〈Life + Human〉 (Gwanhun Gallery, Seoul); selected as a Korean Critics’ Recommended Notable Artist.'
                        : '데뷔 개인전 〈삶+인간〉(관훈미술관, 서울); 한국 평론가 추천 문제 작가 선정.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Song of Life I〉 (Arab Gallery, Seoul).'
                        : '개인전 〈삶의 노래 I〉(아랍미술관, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Song of the Forest〉 (Cheongju Arts Center, Cheongju).'
                        : '〈숲속의 노래〉(청주예술의전당, 청주).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invitational 〈Song of the Forest〉 (419 Verones Gallery, LA).'
                        : '초대전 〈숲속의 노래〉(419 Verones 갤러리, LA).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012–13
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Song of the Forest〉 exhibitions (Insa Art Center, Seoul).'
                        : '〈숲속의 노래〉 전시(인사아트센터, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lee Hongwon Invitational (Morris Gallery, Daejeon).'
                        : '이홍원 초대전(모리스 갤러리, 대전).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Moon Jar〉 exhibition (Insa Art Plaza, Seoul).'
                        : '〈달항아리전〉(인사아트프라자, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      40여 년
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '29 solo exhibitions and over 300 group exhibitions at home and abroad.'
                        : '개인전 29회, 국내외 그룹전 300여 회.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected collections & public works' : '주요 소장 및 공공 작업'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA Art Bank, Cheongju Museum of Art, Chungbuk Provincial Office, Chungbuk Office of Education, SK Guest House.'
                        : '소장: 국립현대미술관 미술은행, 청주시립미술관, 충북도청, 충북교육청, SK 영빈관.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Public-record commission: official portrait of the independence activist Danjae Shin Chae-ho.'
                        : '공공 기록 의뢰: 독립운동가 단재 신채호 영정 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Public-record commission: presidential record painting at Cheongnamdae (Roh Tae-woo).'
                        : '공공 기록 의뢰: 청남대 대통령기록화(노태우) 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'International exhibitions: LA, New York, Sarajevo, Peru, China, Japan.'
                        : '해외전: LA·뉴욕·사라예보·페루·중국·일본.'}
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
                  <span className="text-charcoal-deep">on the work and its warmth</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 온기에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 데뷔와 한국적 정서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? '〈Life + Human〉 — a 1984 debut' : '〈삶+인간〉 — 1984년의 데뷔'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Hongwon trained at the College of Arts, Dongguk University, completing
                        both his undergraduate and graduate studies there through the 1970s and
                        early 1980s. In 1984 he opened his first solo exhibition, 〈Life + Human〉,
                        at Gwanhun Gallery in Seoul — and in the same year was named a Korean
                        Critics&apos; Recommended Notable Artist, a recognition that marked him as a
                        figure to watch at the very outset of his career.
                      </p>
                      <p>
                        From that beginning, the through-line of his work was clear: a painting
                        rooted in Korean sensibility. Rather than abstraction or theory, he reached
                        for the textures of everyday feeling — the warmth, the humor, the lyricism
                        that runs through Korean folk life. The early 〈Life + Human〉 and 〈Song of
                        Life〉 works set the tone for everything that followed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이홍원은 1970년대부터 1980년대 초에 걸쳐 동국대학교 예술대학에서 학사와
                        석사를 마쳤다. 1984년 관훈미술관(서울)에서 첫 개인전 〈삶+인간〉을 열었고,
                        같은 해 한국 평론가 추천 문제 작가로 선정되어 출발선에서부터 주목할 작가로
                        지목되었다.
                      </p>
                      <p>
                        그 출발에서부터 작업의 일관된 줄기는 분명했다 — 한국적 정서에 뿌리를 둔
                        회화. 추상이나 이론 대신, 그는 일상의 감정이 지닌 질감으로 향했다. 한국
                        토속의 삶에 흐르는 온기와 해학, 서정. 초기의 〈삶+인간〉과 〈삶의 노래〉
                        연작은 이후 모든 작업의 정조를 정해 주었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 숲속의 노래 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Song of the Forest〉 — tigers, flowers, and warmth'
                    : '〈숲속의 노래〉 — 호랑이, 꽃, 그리고 온기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈Song of the Forest〉 series is the heart of Lee Hongwon&apos;s mature
                        practice. Shown over more than a decade — at the Cheongju Arts Center
                        (2002), the 419 Verones Gallery in Los Angeles (2011), and the Insa Art
                        Center in Seoul (2012, 2013) — it gathers tigers, flowers, and trees into a
                        single warm vision of the natural world.
                      </p>
                      <p>
                        The tiger, a recurring presence, carries the wit and tenderness of Korean
                        folk imagery: playful rather than fearsome, at home among blossoms. In these
                        canvases nature is not sublime distance but intimate company — a song one
                        hums while walking through it. The vernacular tone, warm and unhurried, is
                        the signature of the series.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈숲속의 노래〉 연작은 이홍원 성숙기 작업의 심장이다. 청주예술의전당(2002),
                        LA의 419 Verones 갤러리(2011), 서울 인사아트센터(2012·2013)로 십수 년에 걸쳐
                        이어지며, 이 연작은 호랑이와 꽃과 나무를 하나의 따뜻한 자연 풍경으로
                        모아낸다.
                      </p>
                      <p>
                        되풀이해 등장하는 호랑이는 한국 토속 이미지의 재치와 다정함을 품는다 —
                        무섭기보다 정겹고, 꽃 사이에서 편안하다. 이 화면들에서 자연은 숭고한 거리가
                        아니라 친밀한 동행이다. 그 사이를 걸으며 흥얼거리는 노래. 따뜻하고 서두르지
                        않는 토속의 톤이 이 연작의 서명이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 공공 기록과 소장 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Public records and collections' : '공공 기록과 소장'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Alongside his exhibition practice, Lee Hongwon undertook two commissioned
                        works of public record. He produced the official portrait (yeongjeong) of
                        the independence activist Danjae Shin Chae-ho, and a presidential record
                        painting at Cheongnamdae depicting Roh Tae-woo. Both are documentary
                        commissions — works made for the public archive rather than the gallery
                        wall.
                      </p>
                      <p>
                        His paintings have entered significant public collections: the MMCA Art
                        Bank, the Cheongju Museum of Art, the Chungbuk Provincial Office, the
                        Chungbuk Office of Education, and the SK Guest House. Across 29 solo
                        exhibitions and more than 300 group exhibitions — with international
                        showings in LA, New York, Sarajevo, Peru, China, and Japan — his four-decade
                        body of work has steadily carried Korean sensibility into both private homes
                        and public institutions.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        전시 작업과 나란히, 이홍원은 두 건의 공공 기록 의뢰 작업을 수행했다.
                        독립운동가 단재 신채호의 영정을 제작했고, 청남대에서 노태우 대통령을 그린
                        대통령기록화를 제작했다. 두 작업 모두 갤러리 벽이 아니라 공공 아카이브를
                        위한 기록 의뢰 작업이다.
                      </p>
                      <p>
                        그의 작품은 국립현대미술관 미술은행, 청주시립미술관, 충북도청, 충북교육청,
                        SK 영빈관 등 주요 공공 소장처에 들어갔다. 개인전 29회와 그룹전 300여 회에
                        걸쳐 — LA·뉴욕·사라예보·페루·중국·일본의 해외전과 함께 — 40년에 이르는 그의
                        작업은 한국적 정서를 가정과 공공 기관 양쪽으로 꾸준히 실어 날랐다.
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
                      From the 1984 debut to the recent moon-jar paintings, Lee Hongwon&apos;s work
                      has pursued a single warmth: the humor and lyricism of a Korean sensibility,
                      gathered into the song of a forest. He joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity — so that those who come after
                      might keep painting.
                    </>
                  ) : (
                    <>
                      1984년 데뷔작에서 근작 달항아리까지, 이홍원의 작업은 하나의 온기를 추구해 왔다
                      — 한국적 정서의 해학과 서정을, 숲속의 노래로 모아내는 일. 그는 씨앗페에 이
                      캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음
                      세대의 예술인들이 계속 그릴 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Hongwon</span>
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
                    Lee Hongwon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이홍원 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_HONGWON_PATH}
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
