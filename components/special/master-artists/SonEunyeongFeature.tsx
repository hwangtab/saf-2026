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

// 작가 feature는 작가 페이지(/artworks/artist/손은영)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SON_EUNYEONG_PATH = `/artworks/artist/${encodeURIComponent('손은영')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSonEunyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '손은영' ||
    n === 'son eunyeong' ||
    n === 'son eun-yeong' ||
    n.replace(/[\s-]+/g, '') === 'soneunyeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '손은영 — 회화와 사진 사이, 도시의 밤',
    description:
      '회화와 사진의 경계에서 작업하는 작가 손은영. 이화여자대학교 서양화과를 졸업하고 홍익대학교 산업미술대학원에서 사진을 전공한 그는, 「밤의 집」 연작을 통해 불 켜진 도시의 밤과 그 안의 삶을 응시해왔다. 씨앗페 온라인에서 손은영의 작품을 만날 수 있습니다.',
    ogDescription:
      '회화와 사진 사이의 작가 손은영. 「밤의 집」 연작으로 잠들지 않는 도시의 밤과 불 켜진 집들을 응시한다.',
    ogAlt: '손은영 대표 작품',
    twitterTitle: '손은영',
    twitterDescription: '회화의 눈으로 찍은 도시의 밤 — 「밤의 집」의 작가 손은영',
    keywords: '손은영 사진가, 손은영 화가, 밤의 집, 도시 야경 사진, 회화와 사진, 씨앗페 온라인',
  },
  en: {
    title: 'Son Eunyeong — Between Painting and Photography',
    description:
      'Selected works by Son Eunyeong, an artist working between painting and photography. A graduate of the Department of Western Painting at Ewha Womans University who went on to study photography at Hongik University, she gazes — through her 〈The Houses at Night〉 series — at the lit-up nocturnal city and the lives inside it. View her works at SAF Online.',
    ogDescription:
      'Son Eunyeong — an artist between painting and photography. Her 〈The Houses at Night〉 series gazes at the sleepless city and its lit windows.',
    ogAlt: 'Son Eunyeong — featured work',
    twitterTitle: 'Son Eunyeong',
    twitterDescription:
      "The city at night, seen with a painter's eye — Son Eunyeong, artist of 〈The Houses at Night〉",
    keywords:
      'Son Eunyeong photographer, Son Eunyeong painter, The Houses at Night, urban night photography, painting and photography',
  },
} as const;

export async function buildSonEunyeongMetadata({
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
  const pageUrl = buildLocaleUrl(SON_EUNYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('손은영');
  const artwork = allArtworks.find((a) => isSonEunyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Son Eunyeong`
      : `${artwork.title} — 손은영`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SON_EUNYEONG_PATH, locale, true),
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

export default async function SonEunyeongFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SON_EUNYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('손은영');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isSonEunyeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Son Eunyeong' : '손은영', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SON_EUNYEONG_PATH}#person-son-eunyeong`,
    name: isEnglish ? 'Son Eunyeong' : '손은영',
    alternateName: isEnglish ? '손은영' : 'Son Eunyeong',
    jobTitle: isEnglish ? 'Artist' : '사진가·화가',
    description: isEnglish
      ? 'Son Eunyeong is a Korean artist working between painting and photography. She studied Western painting at Ewha Womans University and photography at Hongik University, and is known for her 〈The Houses at Night〉 series depicting the lit-up nocturnal city.'
      : '손은영은 회화와 사진의 경계에서 작업하는 작가입니다. 이화여자대학교에서 서양화를, 홍익대학교 대학원에서 사진을 공부했으며, 불 켜진 도시의 밤을 담은 「밤의 집」 연작으로 알려져 있습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Ewha Womans University, Dept. of Western Painting'
          : '이화여자대학교 서양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Hongik University, Graduate School of Industrial Arts (Photography)'
          : '홍익대학교 산업미술대학원 사진디자인',
      },
    ],
    knowsAbout: ['Photography', 'Painting', 'Urban night photography'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Son Eunyeong — SAF Online' : '손은영 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Son Eunyeong from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 손은영 작품을 소개합니다.',
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
        {/* Hero Section — 도시의 밤, 불 켜진 창 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 불 켜진 창 — 야경 점광 모티프 */}
          <div className="absolute top-12 left-10 w-2 h-2 bg-primary/40" aria-hidden="true" />
          <div className="absolute top-24 left-20 w-2 h-3 bg-white/15" aria-hidden="true" />
          <div className="absolute bottom-16 right-14 w-2 h-2 bg-primary/30" aria-hidden="true" />
          <div className="absolute bottom-28 right-28 w-3 h-2 bg-white/15" aria-hidden="true" />
          <div className="absolute top-1/2 right-10 w-2 h-2 bg-white/10" aria-hidden="true" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Son Eunyeong' : '손은영'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The city at night,
                  <br />
                  <span className="text-primary-soft">seen with a painter&apos;s eye</span>
                </>
              ) : (
                <>
                  회화의 눈으로 바라본
                  <br />
                  <span className="text-primary-soft">도시의 밤</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    An artist who began in painting and took up the camera.
                  </span>
                  <span className="mt-2 block">
                    She gazes at the sleepless city — the houses whose windows stay lit.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">서양화에서 출발해 카메라를 든 작가.</span>
                  <span className="mt-2 block">잠들지 않는 도시, 불 켜진 집들을 응시한다.</span>
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
                    Two media, one gaze —<br />
                    <span className="text-primary-strong">painting that learned to photograph</span>
                  </>
                ) : (
                  <>
                    두 매체, 하나의 시선 —<br />
                    <span className="text-primary-strong">사진이 된 회화</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Son Eunyeong built the foundation of her practice in painting, graduating from
                      the Department of Western Painting at Ewha Womans University. Carrying the
                      sensibility of a painter — an eye trained on colour, composition, and the
                      weight of a surface — she went on to study photography at the Graduate School
                      of Industrial Arts at Hongik University.
                    </p>
                    <p>
                      That crossing left a mark on everything she makes. Her photographs are built,
                      not just taken: the framing, the balance of light and dark, the patience for a
                      single tone all belong to the discipline of painting. She works at the border
                      of the two media, where the document of the camera meets the constructed image
                      of the canvas.
                    </p>
                    <p>
                      Her central subject is the{' '}
                      <strong className="font-bold text-charcoal-deep">city at night</strong>. In
                      the 〈The Houses at Night〉 series, she photographs lit windows and darkened
                      facades — ordinary buildings transformed, after dark, into something between a
                      portrait and a still life. Each lit window is a sign of a life inside; each
                      dark one, a question.
                    </p>
                    <p>
                      Across exhibitions from 2018 onward — 〈The Underground〉, 〈The Black
                      House〉, 〈People I Met on the Road〉, and the ongoing 〈The Houses at Night〉
                      — her work returns to the same nocturnal terrain: the city not as a skyline
                      but as a collection of inhabited rooms, seen from outside, in the dark.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      손은영은 회화에서 작업의 기초를 다졌다. 이화여자대학교 미술대학 서양화과를
                      졸업한 그는, 색과 구성과 화면의 무게를 다루는 화가의 감각을 지닌 채 홍익대학교
                      산업미술대학원에서 사진을 공부했다.
                    </p>
                    <p>
                      그 건너감은 그가 만드는 모든 것에 흔적을 남겼다. 그의 사진은 단지 찍히는 것이
                      아니라 <strong className="font-bold text-charcoal-deep">지어진다</strong> —
                      화면의 구도, 명암의 균형, 하나의 톤을 기다리는 인내는 모두 회화의 규율에
                      속한다. 그는 두 매체의 경계에서 작업한다. 카메라의 기록과 캔버스의 구성된
                      이미지가 만나는 자리에서.
                    </p>
                    <p>
                      그의 중심 소재는{' '}
                      <strong className="font-bold text-charcoal-deep">도시의 밤</strong>이다.
                      「밤의 집」 연작에서 그는 불 켜진 창과 어두운 외벽을 담는다 — 평범한 건물이
                      밤이 되면 초상화와 정물화 사이의 무언가로 변모한다. 불 켜진 창 하나하나는 그
                      안의 삶을 알리는 신호이고, 어두운 창 하나하나는 하나의 물음이다.
                    </p>
                    <p>
                      2018년 이후의 전시들 — 「The Underground」, 「검은 집」, 「길 위에서 만난
                      사람들」, 그리고 지금도 이어지는 「밤의 집」 — 에서 그의 작업은 같은 밤의
                      지형으로 돌아온다. 스카이라인이 아니라 사람이 사는 방들의 집합으로서의 도시,
                      어둠 속에서 바깥으로부터 바라본 도시로.
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
                        {isEnglish ? 'Between painting and photography' : '회화와 사진 사이'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Trained as a painter, working as a photographer — her images are constructed with the eye of the canvas.'
                          : '화가로 훈련받고 사진으로 작업한다. 그의 이미지는 캔버스의 눈으로 지어진다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The houses at night' : '밤의 집'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Lit windows and darkened facades — the nocturnal city as a collection of inhabited rooms.'
                          : '불 켜진 창과 어두운 외벽 — 사람이 사는 방들의 집합으로서의 밤의 도시.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The city and its people' : '도시와 사람들'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the underground to the road, her camera follows the spaces where city life is actually lived.'
                          : '지하에서 길 위까지, 그의 카메라는 도시의 삶이 실제로 영위되는 공간을 따라간다.'}
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
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ewha Womans University, Dept. of Western Painting; Hongik University Graduate School of Industrial Arts (Photography Design).'
                        : '이화여자대학교 미술대학 서양화과 졸업; 홍익대학교 산업미술대학원 사진디자인전공.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Underground〉, Seoul City Hall Sky Plaza Gallery (selected through open call).'
                        : '「The Underground」, 서울시청 하늘광장 갤러리 (작가 공모 당선).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? '〈The Black House〉 solo exhibition.' : '「검은 집」 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈People I Met on the Road〉, Gallery Bresson, Seoul.'
                        : '「길 위에서 만난 사람들」, 갤러리 브레송, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Houses at Night〉 at Gallery Bresson (Seoul) and Gallery The Beam (Daejeon); recipient exhibition of the 2nd FNK Photography Award, 〈The Houses at Night — Second Story〉, Kim Bo-sung Art Center; invited exhibition at Art Gallery Jeonju.'
                        : '「밤의 집 The Houses at Night」, 갤러리 브레송(서울)·갤러리 더 빔(대전); 제2회 FNK Photography Award 수상자전 「밤의 집-두번째 이야기」, 금보성아트센터; 아트갤러리전주 초대전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Houses at Night〉, Gubak Gallery, Busan.'
                        : '「밤의 집」, 구박갤러리, 부산.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & awards' : '주요 전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The 2nd FNK Photography Award — recipient (〈The Houses at Night — Second Story〉, Kim Bo-sung Art Center, 2021)'
                        : '제2회 FNK Photography Award 수상 (「밤의 집-두번째 이야기」, 금보성아트센터, 2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈The Underground〉 (2018) · 〈The Black House〉 (2019) · 〈People I Met on the Road〉 (2020) · 〈The Houses at Night〉 (2021–2022)'
                        : '개인전: 「The Underground」(2018) · 「검은 집」(2019) · 「길 위에서 만난 사람들」(2020) · 「밤의 집」(2021–2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Venues include Gallery Bresson (Seoul), Gallery The Beam (Daejeon), Art Gallery Jeonju, and Gubak Gallery (Busan).'
                        : '전시 공간: 갤러리 브레송(서울), 갤러리 더 빔(대전), 아트갤러리전주, 구박갤러리(부산) 등.'}
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
                  Two essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its gaze</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 시선에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 회화와 사진 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Between painting and photography' : '회화와 사진 사이'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Son Eunyeong did not begin with the camera. She began with paint — studying
                        Western painting at Ewha Womans University, learning to weigh a colour
                        against its neighbour, to balance a composition, to wait for a surface to
                        resolve. When she later took up photography at Hongik University&apos;s
                        graduate school, she did not leave that training behind. She brought it to
                        the lens.
                      </p>
                      <p>
                        This is why her photographs feel built rather than captured. A painter
                        chooses every element of the frame; the photographer of this kind chooses
                        too — waiting for the precise hour, the precise quality of dark, the exact
                        relation of one lit window to another. The result sits at the border of the
                        two media: the verifiable document of the photograph carrying the deliberate
                        construction of the painting.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        손은영은 카메라로 시작하지 않았다. 그는 물감으로 시작했다 —
                        이화여자대학교에서 서양화를 공부하며, 한 색을 옆의 색에 견주어 다는 법,
                        구도의 균형을 잡는 법, 화면이 정리될 때까지 기다리는 법을 익혔다. 훗날
                        홍익대학교 대학원에서 사진을 시작했을 때, 그는 그 훈련을 버리지 않았다.
                        그것을 렌즈로 가져왔다.
                      </p>
                      <p>
                        그래서 그의 사진은 포착되었다기보다 지어진 것처럼 느껴진다. 화가는 화면의
                        모든 요소를 선택한다. 이런 종류의 사진가도 선택한다 — 정확한 시각, 정확한
                        어둠의 질, 불 켜진 한 창과 다른 창의 정확한 관계를 기다리며. 그 결과는 두
                        매체의 경계에 놓인다. 사진이 지닌 검증 가능한 기록이, 회화가 지닌 의도된
                        구성을 품은 채로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 밤의 집 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The houses at night — gazing at the nocturnal city'
                    : '밤의 집 — 도시의 밤을 응시하다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈The Houses at Night〉 series — the work most closely associated with
                        her name — photographs ordinary buildings after dark. A facade that would be
                        unremarkable by day becomes, at night, a grid of decisions: this window lit,
                        that one dark, a curtain half-drawn, a blue television glow. Each building
                        is a city in miniature, a stack of separate lives that happen to share a
                        wall.
                      </p>
                      <p>
                        Photographed from outside, in the dark, these houses are at once intimate
                        and unreachable. We can see the light but not the life; we read the signs of
                        presence — a lit kitchen, a darkened bedroom — without entering. The series
                        turns the anonymous apartment block, the most ordinary form of the Korean
                        city, into a portrait of how people actually live: close together, separated
                        by walls, lit one window at a time.
                      </p>
                      <p>
                        Shown across exhibitions from 2018 through 2022 — and recognized with the
                        FNK Photography Award — the series is less a record of architecture than a
                        meditation on proximity and solitude in the contemporary city.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        「밤의 집」 연작 — 그의 이름과 가장 가깝게 연결된 작업 — 은 평범한 건물을
                        어둠이 내린 뒤에 담는다. 낮에는 눈에 띄지 않을 외벽이 밤이 되면 선택들의
                        격자가 된다: 이 창은 켜지고 저 창은 어둡고, 커튼은 반쯤 드리워지고, 푸른
                        텔레비전 빛이 새어 나온다. 건물 하나하나가 축소된 도시이고, 벽 하나를 함께
                        쓰게 된 별개의 삶들의 더미다.
                      </p>
                      <p>
                        어둠 속에서 바깥으로부터 찍힌 이 집들은 친밀하면서 동시에 닿을 수 없다.
                        우리는 빛은 볼 수 있어도 삶은 볼 수 없다. 들어가지 않은 채로 존재의 신호를
                        읽는다 — 불 켜진 부엌, 어두운 침실. 연작은 한국 도시의 가장 평범한 형태인
                        익명의 아파트 블록을, 사람들이 실제로 어떻게 사는지에 대한 초상으로 바꾼다:
                        가까이 붙어, 벽으로 나뉘어, 한 번에 한 창씩 불을 밝히며.
                      </p>
                      <p>
                        2018년부터 2022년까지 여러 전시에서 선보이고 FNK Photography Award로
                        인정받은 이 연작은, 건축의 기록이라기보다 동시대 도시에서의 가까움과 고독에
                        대한 사유다.
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
                      Between the canvas and the camera, between the lit window and the dark one,
                      Son Eunyeong has built a quiet, sustained body of work about how we live near
                      one another in the modern city. She joins this campaign in solidarity with
                      fellow artists — so that the next generation might keep their windows lit.
                    </>
                  ) : (
                    <>
                      캔버스와 카메라 사이, 불 켜진 창과 어두운 창 사이에서, 손은영은 우리가 현대
                      도시에서 어떻게 서로 가까이 사는가에 관한 조용하고 꾸준한 작업을 쌓아왔다.
                      동료 예술인과의 연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들이
                      자신의 창에 계속 불을 밝힐 수 있도록.
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
                NIGHT
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Son Eunyeong</span>
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
                    Son Eunyeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    손은영 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SON_EUNYEONG_PATH}
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
