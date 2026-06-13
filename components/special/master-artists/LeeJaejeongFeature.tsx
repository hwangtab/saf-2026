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

// 작가 feature는 작가 페이지(/artworks/artist/이재정)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_JAEJEONG_PATH = `/artworks/artist/${encodeURIComponent('이재정')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeJaejeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이재정' ||
    n === 'lee jaejeong' ||
    n === 'lee jae-jeong' ||
    n.replace(/[\s-]+/g, '') === 'leejaejeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이재정 — 신화와 일상 사이, 한국 사회를 횡단하는 카메라',
    description:
      '사회와 풍경, 신화와 일상 사이를 사진으로 횡단해 온 사진가 이재정. 제주신화부터 DMZ, 화산도, 그리고 조선의 카메라 옵스큐라 칠실파려안까지, 한국 사회의 결을 묵직한 다큐멘터리의 시선으로 기록해왔다. 씨앗페 온라인에서 이재정의 작품을 만나보세요.',
    ogDescription:
      '신화와 일상 사이를 횡단하는 사진가 이재정. 제주신화·DMZ·화산도·칠실파려안까지, 한국 사회의 결을 기록하는 다큐멘터리 사진.',
    ogAlt: '이재정 대표 작품',
    twitterTitle: '이재정',
    twitterDescription: '신화와 일상 사이를 횡단하는 카메라 — 사진가 이재정',
    keywords:
      '이재정 사진가, 제주신화, 화산도, 칠실파려안, 다큐멘터리 사진, 한국 사회, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Jaejeong — A Camera Crossing Korean Society',
    description:
      'Selected works by Lee Jaejeong, a photographer who has crossed the terrain between society and landscape, myth and the everyday. From the myths of Jeju to the DMZ, to Hwasando, and to Chilsil-paryeoan — the Joseon-era camera obscura — he records the texture of Korean society with the weight of documentary photography. View his works at SAF Online.',
    ogDescription:
      'Lee Jaejeong — a photographer crossing the space between myth and the everyday. From Jeju myth and the DMZ to Hwasando and Chilsil-paryeoan, documenting the texture of Korean society.',
    ogAlt: 'Lee Jaejeong — featured work',
    twitterTitle: 'Lee Jaejeong',
    twitterDescription: 'A camera crossing the space between myth and the everyday — Lee Jaejeong',
    keywords:
      'Lee Jaejeong photographer, Jeju myth, Hwasando, camera obscura, documentary photography, Korean society',
  },
} as const;

export async function buildLeeJaejeongMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_JAEJEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이재정');
  const artwork = allArtworks.find((a) => isLeeJaejeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Jaejeong`
      : `${artwork.title} — 이재정`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_JAEJEONG_PATH, locale, true),
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

export default async function LeeJaejeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_JAEJEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이재정');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isLeeJaejeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Lee Jaejeong' : '이재정', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_JAEJEONG_PATH}#person-lee-jaejeong`,
    name: isEnglish ? 'Lee Jaejeong' : '이재정',
    alternateName: isEnglish ? '이재정' : 'Lee Jaejeong',
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? 'Lee Jaejeong is a Korean photographer who has crossed the terrain between society and landscape, myth and the everyday, recording the texture of Korean society through documentary photography — from the myths of Jeju to the DMZ, Hwasando, and Chilsil-paryeoan, the Joseon-era camera obscura.'
      : '이재정은 사회와 풍경, 신화와 일상 사이를 사진으로 횡단하며 한국 사회의 결을 다큐멘터리 사진으로 기록해 온 사진가입니다. 제주신화부터 DMZ, 화산도, 조선의 카메라 옵스큐라 칠실파려안까지를 아우릅니다.',
    knowsAbout: ['Documentary photography', 'Jeju myth', 'Korean society', 'Camera obscura'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Jaejeong — SAF Online' : '이재정 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Jaejeong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이재정 작품들을 소개합니다.',
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
        {/* Hero Section — 횡단하는 시선, 지평선 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 수평 횡단선 — 사회·풍경을 가로지르는 시선 모티프 */}
          <div className="absolute top-1/3 left-0 w-full h-px bg-white/10" aria-hidden="true" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary/30" aria-hidden="true" />
          <div className="absolute bottom-1/4 left-0 w-full h-px bg-white/10" aria-hidden="true" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Jaejeong' : '이재정'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Between myth
                  <br />
                  <span className="text-primary-soft">and the everyday</span>
                </>
              ) : (
                <>
                  신화와 일상 사이를
                  <br />
                  <span className="text-primary-soft">횡단하는 카메라</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Society and landscape, myth and the daily life of a nation.
                  </span>
                  <span className="mt-2 block">
                    A documentary camera crossing the texture of Korean society.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사회와 풍경, 신화와 한 나라의 일상.</span>
                  <span className="mt-2 block">한국 사회의 결을 가로지르는 다큐멘터리 사진.</span>
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
                    One gaze, many terrains —<br />
                    <span className="text-primary-strong">a camera that records a society</span>
                  </>
                ) : (
                  <>
                    하나의 시선, 여러 지형 —<br />
                    <span className="text-primary-strong">한 사회를 기록하는 카메라</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Jaejeong is a mid-career photographer who has crossed, with his camera,
                      the terrain between society and landscape, myth and the everyday. Rather than
                      settling into a single subject, his practice moves across the surfaces of
                      Korean society, returning again and again to the texture of how a place and
                      its people actually are.
                    </p>
                    <p>
                      His subjects range widely. From the{' '}
                      <strong className="font-bold text-charcoal-deep">myths of Jeju</strong> to the
                      landscape of the DMZ, from the volcanic terrain he gathers under the title{' '}
                      <em>Hwasando</em> to the everyday lives of a village, his photographs treat
                      Korean society not as a single image but as a field to be traversed —
                      patiently, from many positions.
                    </p>
                    <p>
                      Across solo exhibitions and festivals — from <em>The Myths of Jeju</em> (2016)
                      onward — his work has consistently held two registers at once: the documentary
                      weight of what is recorded, and the mythic, narrative undertone of how it is
                      seen. The result is photography that is at once evidence and story.
                    </p>
                    <p>
                      In recent years his inquiry has reached toward the very origins of the
                      photographic image. In <em>Chilsil-paryeoan</em> (2024) — named for the
                      Joseon-era term for the camera obscura — and in <em>A Thousand Cameras</em>{' '}
                      (2025), he turns the camera back on its own history, asking what it means to
                      see, to record, and to remember through the lens.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이재정은 사회와 풍경, 신화와 일상 사이를 카메라로 횡단해 온 중견 사진가다.
                      하나의 소재에 머물기보다, 그의 작업은 한국 사회의 표면을 가로지르며 한 장소와
                      그곳 사람들이 실제로 어떠한가의 결로 거듭 돌아온다.
                    </p>
                    <p>
                      그의 소재는 넓게 펼쳐진다.{' '}
                      <strong className="font-bold text-charcoal-deep">제주의 신화</strong>에서
                      DMZ의 풍경으로, 〈화산도〉라는 이름 아래 모은 화산섬의 지형에서 한 마을의
                      일상으로 — 그의 사진은 한국 사회를 하나의 이미지가 아니라 횡단해야 할 들판으로
                      다룬다. 여러 자리에서, 인내를 가지고.
                    </p>
                    <p>
                      〈제주신화전〉(2016) 이후의 개인전과 사진제들을 거치며, 그의 작업은 두 결을
                      동시에 품어 왔다 — 기록된 것의 다큐멘터리적 무게, 그리고 그것이 보여지는
                      방식의 신화적· 서사적 저음. 그 결과는 증거이자 이야기인 사진이다.
                    </p>
                    <p>
                      근래 그의 탐구는 사진 이미지의 기원 그 자체로 향했다. 조선시대 카메라
                      옵스큐라를 이르는 말에서 이름을 가져온 〈칠실파려안〉(2024)과 〈천 개의
                      카메라〉(2025)에서, 그는 카메라를 그 자신의 역사로 되돌린다 — 렌즈를 통해
                      본다는 것, 기록한다는 것, 기억한다는 것이 무엇인지를 묻는다.
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
                        {isEnglish ? 'Myth and the everyday' : '신화와 일상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the myths of Jeju to the daily life of a village — photography that holds the mythic and the ordinary in a single frame.'
                          : '제주의 신화에서 마을의 일상까지 — 신화적인 것과 평범한 것을 한 화면에 품는 사진.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Crossing Korean society' : '한국 사회를 횡단하다'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the DMZ to the volcanic island, his documentary camera traverses the texture of a society across many positions.'
                          : 'DMZ에서 화산섬까지, 그의 다큐멘터리 카메라는 여러 자리에서 한 사회의 결을 가로지른다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The origins of the image' : '이미지의 기원'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In recent series he turns toward the history of the camera itself — including Chilsil-paryeoan, the Joseon-era name for the camera obscura.'
                          : '근작에서 그는 카메라 그 자체의 역사로 향한다 — 조선시대 카메라 옵스큐라를 이르는 칠실파려안을 포함하여.'}
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
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Myths of Jeju〉.'
                        : '〈제주신화전〉 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Park Geun-hye Resignation〉 exhibition; 〈Jeju Myth Korea–Japan〉 exhibition.'
                        : '〈박근혜 하야전〉; 〈제주신화 한일전〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Double Portrait〉 series exhibition.'
                        : '〈이중초상화 연작전〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Vanished Garden〉; 〈Village Theatre — DMZ Residency〉 exhibition.'
                        : '〈사라진 정원전〉; 〈마을극장 DMZ레지던시전〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈A Wise Way of Living〉 exhibition.'
                        : '〈슬기로운 살림살이전〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Birds Are Not Afraid of the Pandemic〉.'
                        : '〈새들은 펜데믹을 두려워 하지 않는다〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? '〈Hwasando〉 (Volcanic Island).' : '〈화산도〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Chilsil-paryeoan〉 — after the Joseon-era term for the camera obscura.'
                        : '〈칠실파려안〉 — 조선시대 카메라 옵스큐라를 이르는 말에서.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? '〈A Thousand Cameras〉.' : '〈천 개의 카메라〉.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & festivals' : '주요 전시 및 사진제'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo & themed exhibitions: 〈The Myths of Jeju〉 (2016) · 〈Jeju Myth Korea–Japan〉 (2017) · 〈Double Portrait〉 series (2019) · 〈The Vanished Garden〉 · 〈Village Theatre — DMZ Residency〉 (2020) · 〈A Wise Way of Living〉 (2021)'
                        : '개인·주제전: 〈제주신화전〉(2016) · 〈제주신화 한일전〉(2017) · 〈이중초상화 연작전〉(2019) · 〈사라진 정원전〉 · 〈마을극장 DMZ레지던시전〉(2020) · 〈슬기로운 살림살이전〉(2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Recent series: 〈Birds Are Not Afraid of the Pandemic〉 (2022) · 〈Hwasando〉 (2023) · 〈Chilsil-paryeoan〉 (2024) · 〈A Thousand Cameras〉 (2025)'
                        : '근작: 〈새들은 펜데믹을 두려워 하지 않는다〉(2022) · 〈화산도〉(2023) · 〈칠실파려안〉(2024) · 〈천 개의 카메라〉(2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Photography festivals: Daegu Photo Biennale (Fringe), Suwon International Photo Festival, Volcanic Island International Photo Festival, Korea International Photo Festival, and others.'
                        : '사진제: 대구사진비엔날레(프린지), 수원국제사진축제, 화산섬국제사진제, 대한민국국제포토페스티벌 등.'}
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
                  <span className="text-charcoal-deep">on the work and its crossings</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 횡단에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 제주신화에서 시작하다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Beginning with myth — the photography of Jeju'
                    : '신화에서 시작하다 — 제주의 사진'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Jaejeong&apos;s practice carries a mythic register from early on. The{' '}
                        〈The Myths of Jeju〉 exhibition (2016), continued in 〈Jeju Myth
                        Korea–Japan〉 (2017), takes one of the densest mythic landscapes in Korea —
                        Jeju, an island whose stories of gods and origins are woven into its very
                        geography — and photographs it not as scenery but as a living myth.
                      </p>
                      <p>
                        What distinguishes this work is its refusal to separate the mythic from the
                        documentary. The same photographs that record an actual island, an actual
                        terrain, also hold the weight of the stories that place carries. Myth, in
                        his hands, is not illustration; it is a way of seeing what is already there
                        — the narrative undertone beneath the surface of an ordinary landscape.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이재정의 작업은 초기부터 신화적 결을 품는다. 〈제주신화전〉(2016)과 그것을
                        이어간 〈제주신화 한일전〉(2017)은 한국에서 가장 밀도 높은 신화의 풍경
                        가운데 하나를 다룬다 — 신과 기원의 이야기가 지형 자체에 짜여 든 섬, 제주를.
                        그는 그것을 경치가 아니라 살아 있는 신화로 사진한다.
                      </p>
                      <p>
                        이 작업을 구별 짓는 것은 신화적인 것과 다큐멘터리적인 것을 가르기를
                        거부한다는 점이다. 실재하는 섬, 실재하는 지형을 기록한 바로 그 사진이, 그
                        장소가 품은 이야기의 무게도 함께 담는다. 그의 손에서 신화는 삽화가 아니다.
                        그것은 이미 거기 있는 것을 보는 한 방식이다 — 평범한 풍경의 표면 아래 흐르는
                        서사적 저음.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 사회를 횡단하는 시선 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'A gaze that crosses society — from the DMZ to the village'
                    : '사회를 횡단하는 시선 — DMZ에서 마을까지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Through the 2010s and into the 2020s, Lee Jaejeong&apos;s camera moved
                        across the contemporary surfaces of Korean society. The 〈Village Theatre —
                        DMZ Residency〉 exhibition (2020) brought him to the borderland; 〈A Wise
                        Way of Living〉 (2021) turned toward the ordinary economy of daily life;
                        〈Birds Are Not Afraid of the Pandemic〉 (2022) registered the strange
                        suspended time of a society under the pandemic.
                      </p>
                      <p>
                        His exhibitions also engaged directly with the public events of their
                        moment. The 〈Park Geun-hye Resignation〉 exhibition (2017) sits within this
                        documentary impulse — a photographer recording a society in the midst of a
                        contested public reckoning. Across all of these, his approach holds steady:
                        not to argue, but to record; not to judge, but to look closely at how a
                        society moves through its own time.
                      </p>
                      <p>
                        This is the through-line of his practice — a documentary gaze that refuses
                        to settle in one place. Society is not a single subject to be captured but a
                        terrain to be crossed, position by position, exhibition by exhibition.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2010년대를 지나 2020년대로 들어서며, 이재정의 카메라는 한국 사회의 동시대적
                        표면을 가로질렀다. 〈마을극장 DMZ레지던시전〉(2020)은 그를 접경지로
                        데려갔고, 〈슬기로운 살림살이전〉(2021)은 일상의 평범한 살림으로 향했으며,
                        〈새들은 펜데믹을 두려워 하지 않는다〉(2022)는 펜데믹 아래 한 사회의
                        기묘하게 멈춘 시간을 기록했다.
                      </p>
                      <p>
                        그의 전시는 그 순간의 공적 사건과도 직접 마주했다. 〈박근혜 하야전〉(2017)은
                        이 다큐멘터리적 충동 안에 놓인다 — 격렬한 공적 청산의 한가운데를 지나는
                        사회를 기록한 사진가의 작업으로서. 이 모든 것을 가로질러 그의 태도는
                        한결같다: 주장하기 위해서가 아니라 기록하기 위해, 판단하기 위해서가 아니라
                        한 사회가 제 시간을 어떻게 통과하는지를 가까이 들여다보기 위해.
                      </p>
                      <p>
                        이것이 그의 작업을 관통하는 선이다 — 한자리에 머물기를 거부하는 다큐멘터리의
                        시선. 사회는 포착할 하나의 소재가 아니라, 자리에서 자리로, 전시에서 전시로
                        횡단해야 할 지형이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 화산도에서 칠실파려안으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From Hwasando to Chilsil-paryeoan — turning toward the image itself'
                    : '화산도에서 칠실파려안으로 — 이미지 자체를 향하여'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In his recent work, Lee Jaejeong&apos;s inquiry deepens toward the nature of
                        the photographic image. 〈Hwasando〉 (2023) gathers the volcanic terrain of
                        the island into a body of landscape work; from there, the questioning turns
                        inward, toward the apparatus and history of seeing itself.
                      </p>
                      <p>
                        The title 〈Chilsil-paryeoan〉 (2024) is drawn from a real historical term.{' '}
                        <em>Chilsil-paryeoan</em> (漆室玻瓈眼) is the name the Joseon-era scholar
                        Jeong Yak-yong gave to the camera obscura — literally, &lsquo;a glass eye in
                        a pitch-dark room.&rsquo; In late-Joseon practical learning, it was known
                        and even used to aid portrait drawing. By naming a series after it, Lee
                        places his own photography within a long lineage of seeing through a lens —
                        a history older than the camera, reaching back to the dark room and its
                        inverted image.
                      </p>
                      <p>
                        〈A Thousand Cameras〉 (2025) extends this reflection outward. If the camera
                        obscura was a single eye in a dark room, the contemporary world is filled
                        with a thousand cameras, a thousand ways of recording and remembering. From
                        the myths of Jeju to the optics of the Joseon scholar, his crossing of
                        Korean society arrives, in the end, at a question about the act of the image
                        itself.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        근작에서 이재정의 탐구는 사진 이미지의 본성으로 깊어진다. 〈화산도〉(2023)는
                        섬의 화산 지형을 하나의 풍경 작업으로 모은다. 거기서 물음은 안쪽으로, 보는
                        일 자체의 장치와 역사를 향해 돌아선다.
                      </p>
                      <p>
                        〈칠실파려안〉(2024)이라는 제목은 실재하는 역사적 용어에서 왔다.{' '}
                        <em>칠실파려안</em>(漆室玻瓈眼)은 조선의 실학자 정약용이 카메라 옵스큐라를
                        이른 말로 — 글자 그대로 &lsquo;칠흑 같은 방 안의 유리 눈&rsquo;을 뜻한다.
                        조선 후기 실학에서 이 장치는 알려져 있었고, 초상화를 그리는 데 쓰이기도
                        했다. 이 말을 연작의 이름으로 삼음으로써, 이재정은 자신의 사진을 렌즈를 통해
                        본다는 오랜 계보 안에 놓는다 — 카메라보다 오래된, 어두운 방과 그 안에 맺힌
                        거꾸로 된 상으로까지 거슬러 올라가는 역사.
                      </p>
                      <p>
                        〈천 개의 카메라〉(2025)는 이 사유를 바깥으로 확장한다. 카메라 옵스큐라가
                        어두운 방의 단 하나의 눈이었다면, 동시대 세계는 천 개의 카메라로, 기록하고
                        기억하는 천 개의 방식으로 가득하다. 제주의 신화에서 조선 실학자의 광학까지,
                        그의 한국 사회 횡단은 끝내 이미지라는 행위 그 자체에 관한 물음에 다다른다.
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
                      From the myths of Jeju to the dark room of the Joseon scholar, Lee Jaejeong
                      has built a body of documentary work that crosses Korean society — its
                      landscapes, its public events, its everyday lives — without ever settling into
                      a single view. He joins this campaign in solidarity with fellow artists — so
                      that the next generation might keep crossing, and keep recording.
                    </>
                  ) : (
                    <>
                      제주의 신화에서 조선 실학자의 어두운 방까지, 이재정은 한국 사회를 — 그 풍경과
                      공적 사건과 일상을 — 하나의 시선에 머물지 않고 횡단하는 다큐멘터리 작업을
                      쌓아왔다. 그는 동료 예술인과의 연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의
                      예술인들이 계속 횡단하고, 계속 기록할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Jaejeong</span>
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
                    Lee Jaejeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이재정 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_JAEJEONG_PATH}
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
