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

// 거장 작가 feature는 작가 페이지(/artworks/artist/김태균)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_TAEGYUN_PATH = `/artworks/artist/${encodeURIComponent('김태균')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimTaegyunArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김태균' ||
    n === 'kim tae-gyun' ||
    n === 'kim taegyun' ||
    n.replace(/[\s-]+/g, '') === 'kimtaegyun'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김태균 — 각색된 영토의 시선',
    description:
      '풍경과 영토의 시선을 다층적으로 재구성하는 시각예술가 김태균. 독일 슈투트가르트와 한국을 오가며 본 경계와 완충지대를, 영토가 각색되고 재배치되는 다층의 화면으로 옮긴다. 2019년 김종영미술관 창작지원전 「각색된 영토」의 작가 김태균의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '풍경과 영토의 시선을 다층적으로 재구성하는 시각예술가 김태균. 독일과 한국을 오가며 본 경계와 완충지대의 화면.',
    ogAlt: '김태균 대표 작품',
    twitterTitle: '김태균',
    twitterDescription: '각색된 영토 — 다층적으로 재구성된 풍경, 시각예술가 김태균',
    keywords: '김태균 작가, 각색된 영토, 풍경, 영토, 슈투트가르트, 김종영미술관, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Tae-gyun — The Gaze of Adapted Territory',
    description:
      'Selected works by Kim Tae-gyun, a visual artist who reconstructs the gaze on landscape and territory in multiple layers. Moving between Stuttgart, Germany and Korea, he transposes the borders and buffer zones he has seen into multilayered images in which territory is adapted and rearranged. The artist of 〈Adapted Territory〉 (2019, Kim Chong Yung Museum). View and collect his works at SAF Online.',
    ogDescription:
      'Kim Tae-gyun — a visual artist who reconstructs the gaze on landscape and territory in multiple layers, across Stuttgart and Korea.',
    ogAlt: 'Kim Tae-gyun — featured work',
    twitterTitle: 'Kim Tae-gyun',
    twitterDescription:
      'Adapted territory — landscape reconstructed in layers, visual artist Kim Tae-gyun',
    keywords:
      'Kim Tae-gyun artist, adapted territory, landscape, territory, Stuttgart, Korean visual art',
  },
} as const;

export async function buildKimTaegyunMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_TAEGYUN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김태균');
  const artwork = allArtworks.find((a) => isKimTaegyunArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Tae-gyun`
      : `${artwork.title} — 김태균`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_TAEGYUN_PATH, locale, true),
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

export default async function KimTaegyunFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_TAEGYUN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김태균');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimTaegyunArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Tae-gyun' : '김태균', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_TAEGYUN_PATH}#person-kim-taegyun`,
    name: isEnglish ? 'Kim Tae-gyun' : '김태균',
    alternateName: isEnglish ? '김태균' : 'Kim Tae-gyun',
    jobTitle: isEnglish ? 'Visual artist' : '시각예술가',
    description: isEnglish
      ? 'Kim Tae-gyun is a Korean visual artist who reconstructs the gaze on landscape and territory in multiple layers, working between Stuttgart, Germany and Korea.'
      : '김태균은 풍경과 영토의 시선을 다층적으로 재구성하는 시각예술가로, 독일 슈투트가르트와 한국을 오가며 활동합니다.',
    knowsAbout: ['Landscape', 'Territory', 'Korean contemporary art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Tae-gyun — SAF Online' : '김태균 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Tae-gyun from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김태균 작품들을 소개합니다.',
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

          {/* Vertical strata lines — 영토의 경계·완충지대 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Tae-gyun · Visual artist' : '김태균 · 시각예술가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Territory, adapted —
                  <br />
                  <span className="text-primary-soft">landscape seen in layers</span>
                </>
              ) : (
                <>
                  각색된 영토 —
                  <br />
                  <span className="text-primary-soft">다층으로 본 풍경</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He reconstructs the gaze on landscape and territory in multiple layers.
                  </span>
                  <span className="mt-2 block">
                    Borders and buffer zones, seen between Stuttgart and Korea.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">풍경과 영토의 시선을 다층으로 재구성한다.</span>
                  <span className="mt-2 block">
                    독일과 한국을 오가며 본 경계, 그리고 완충지대의 풍경.
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
                    Landscape, rearranged —<br />
                    <span className="text-primary-strong">territory reconstructed in layers</span>
                  </>
                ) : (
                  <>
                    재배치된 풍경 —<br />
                    <span className="text-primary-strong">다층으로 재구성된 영토</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Tae-gyun is a visual artist who reconstructs the gaze on landscape and
                      territory in multiple layers. Working between Stuttgart, Germany and Korea, he
                      treats the landscape not as a single, fixed view but as a surface that can be
                      adapted, cut apart, and rearranged.
                    </p>
                    <p>
                      Moving across two countries has placed{' '}
                      <strong className="font-bold text-charcoal-deep">
                        borders and buffer zones
                      </strong>{' '}
                      at the centre of his attention. In exhibitions such as 〈Boundary 155〉 (2017,
                      Seoul Museum of Art) and 〈Time of the Buffer Zone〉 (2022, Gyeonggi
                      Millennium Road Gallery, Uijeongbu), the line that divides a territory becomes
                      a subject in its own right — a place to be looked at, rather than simply
                      crossed.
                    </p>
                    <p>
                      His solo exhibition 〈Adapted Territory〉 (2019, Kim Chong Yung Museum
                      Creative Support exhibition, Seoul) names the gesture that runs through his
                      practice: the way a territory is scripted, edited, and re-staged in the image.
                      Earlier solo shows — 〈Eternal Vacation〉 (2013, Seoul Museum of Art New
                      Artist selection, Space Can) and 〈Shadow of the Landscape〉 (2011, Ehingen
                      Municipal Museum, Germany) — trace the same line of inquiry back across a
                      decade.
                    </p>
                    <p>
                      His work has been shown widely in group exhibitions in Korea and Germany,
                      including the Busan Museum of Contemporary Art and the Seoul Museum of Art new
                      acquisitions exhibitions, MMCA Goyang Studio, APMAP by Amorepacific Museum of
                      Art, and 〈60 Works for Baden-Württemberg〉 (2012, Singen Municipal Museum,
                      Germany). Across these contexts the question stays constant: how is a piece of
                      land seen, and who arranges the seeing?
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김태균은 풍경과 영토의 시선을 다층적으로 재구성하는 시각예술가다. 독일
                      슈투트가르트와 한국을 오가며 활동하며, 풍경을 하나의 고정된 시점이 아니라
                      각색되고 잘려 재배치될 수 있는 화면으로 다룬다.
                    </p>
                    <p>
                      두 나라를 오가는 활동은{' '}
                      <strong className="font-bold text-charcoal-deep">경계와 완충지대</strong>를 그
                      관심의 한가운데에 두게 했다. 「경계 155」(2017, 서울시립미술관 본관), 「완충의
                      시간」(2022, 경기천년길갤러리, 의정부) 같은 전시에서 영토를 가르는 선은 그
                      자체로 하나의 주제가 된다 — 단지 넘어가는 자리가 아니라, 바라보아야 할
                      대상으로서.
                    </p>
                    <p>
                      2019년 김종영미술관 창작지원전 「각색된 영토」는 그의 작업을 관통하는 동작에
                      이름을 붙인다: 영토가 이미지 안에서 각색되고, 편집되고, 다시 배치되는
                      방식이다. 앞선 개인전 — 「영원한 휴가」(2013, 서울시립미술관 신진작가 선정전,
                      스페이스 캔), 「풍경의 그늘」(2011, 독일 에힝엔 시립미술관 기획 초대전) — 은
                      같은 물음의 줄기를 10여 년 전으로 거슬러 보여준다.
                    </p>
                    <p>
                      그의 작업은 한국과 독일의 여러 단체전에서 폭넓게 소개되어 왔다 —
                      부산현대미술관과 서울시립미술관 신소장 작품전, 국립현대미술관
                      고양창작스튜디오, 아모레퍼시픽 미술관 APMAP, 「바덴-뷔템베르크를 위한 60인의
                      작업」(2012, 독일 징엔 시립미술관) 등. 이 맥락들을 가로질러 물음은 한결같다:
                      한 조각의 땅은 어떻게 보여지는가, 그리고 그 봄을 누가 배치하는가.
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
                        {isEnglish ? 'Adapted territory' : '각색된 영토'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Landscape treated as a surface to be scripted and rearranged — territory reconstructed image by image, layer by layer.'
                          : '각색되고 재배치될 수 있는 화면으로서의 풍경. 영토를 한 겹씩, 한 화면씩 다시 구성한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Borders & buffer zones' : '경계와 완충지대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The dividing line of a territory as a subject in itself — explored in 〈Boundary 155〉 and 〈Time of the Buffer Zone〉.'
                          : '영토를 가르는 선 자체를 주제로 삼는 시선 — 「경계 155」와 「완충의 시간」에서 탐구된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Between Germany and Korea' : '독일과 한국 사이'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A practice formed across Stuttgart and Korea — the doubled vantage of someone who looks at one place from the position of another.'
                          : '슈투트가르트와 한국을 가로지르며 형성된 작업 — 한 장소를 다른 장소의 자리에서 바라보는 이중의 시점.'}
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
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Zart〉, curated by Jan Hoet, Galerie ABT ART, Stuttgart.'
                        : '단체전 「챠트(Zart)」 — 얀 후트 기획, 갤러리 ABT ART, 슈투트가르트.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Shadow of the Landscape〉, Ehingen Municipal Museum, Germany.'
                        : '개인전 「풍경의 그늘」 — 독일 에힝엔 시립미술관 기획 초대전, 에힝엔.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈60 Works for Baden-Württemberg〉, Singen Municipal Museum, Germany.'
                        : '단체전 「바덴-뷔템베르크를 위한 60인의 작업」 — 징엔 시립미술관, 독일.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Eternal Vacation〉, SeMA New Artist selection, Space Can; group show 〈Events〉, MMCA Goyang Studio.'
                        : '개인전 「영원한 휴가」 — 서울시립미술관 신진작가 선정전, 스페이스 캔; 단체전 「사건들」, 국립현대미술관 고양창작스튜디오.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈BETWEEN WAVES〉, Amorepacific Museum of Art APMAP, Osulloc Museum, Jeju.'
                        : '단체전 「BETWEEN WAVES」 — 아모레퍼시픽 미술관 APMAP, 오설록 뮤지움, 제주.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Salon de SeMA〉, Seoul Museum of Art new acquisitions exhibition.'
                        : '단체전 「살롱 드 세마」 — 서울시립미술관 신소장 작품전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈14 Gazes〉, Gyeonggi Emerging Artists Saengsaeng Hwahwa, Goyang Aram Museum.'
                        : '단체전 「14개의 시선」 — 경기유망작가 생생화화, 고양 아람미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Boundary 155〉, Seoul Museum of Art main building.'
                        : '단체전 「경계 155」 — 서울시립미술관 본관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Adapted Territory〉, Kim Chong Yung Museum Creative Support exhibition, Seoul; group show 〈Formula of Imagination〉, Busan Museum of Contemporary Art new acquisitions.'
                        : '개인전 「각색된 영토」 — 김종영미술관 창작지원전, 서울; 단체전 「상상의 공식」, 부산현대미술관 신소장 작품전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Time of the Buffer Zone〉, Gyeonggi Millennium Road Gallery, Uijeongbu.'
                        : '단체전 「완충의 시간」 — 경기천년길갤러리, 의정부.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Keep the Peace〉, Jeon Tae-il Memorial Hall Gallery.'
                        : '단체전 「평화를 준수하라」 — 전태일 기념관 갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Yesterday Is the Future of the Past〉, Songwon Art Center.'
                        : '단체전 「어제는 과거의 미래다」 — 송원아트센터.'}
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
                        ? 'Solo: 〈Adapted Territory〉, Kim Chong Yung Museum (2019); 〈Eternal Vacation〉, Space Can (2013); 〈Shadow of the Landscape〉, Ehingen Municipal Museum, Germany (2011)'
                        : '개인전: 「각색된 영토」, 김종영미술관 (2019); 「영원한 휴가」, 스페이스 캔 (2013); 「풍경의 그늘」, 독일 에힝엔 시립미술관 (2011)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈Boundary 155〉, Seoul Museum of Art (2017); 〈Time of the Buffer Zone〉, Gyeonggi Millennium Road Gallery, Uijeongbu (2022)'
                        : '단체전: 「경계 155」, 서울시립미술관 본관 (2017); 「완충의 시간」, 경기천년길갤러리, 의정부 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈Formula of Imagination〉, Busan Museum of Contemporary Art new acquisitions (2019); 〈Salon de SeMA〉, Seoul Museum of Art new acquisitions (2015)'
                        : '단체전: 「상상의 공식」, 부산현대미술관 신소장 작품전 (2019); 「살롱 드 세마」, 서울시립미술관 신소장 작품전 (2015)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈BETWEEN WAVES〉, Amorepacific Museum of Art APMAP, Osulloc Museum, Jeju (2014); 〈Events〉, MMCA Goyang Studio (2013)'
                        : '단체전: 「BETWEEN WAVES」, 아모레퍼시픽 미술관 APMAP, 오설록 뮤지움, 제주 (2014); 「사건들」, 국립현대미술관 고양창작스튜디오 (2013)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈60 Works for Baden-Württemberg〉, Singen Municipal Museum, Germany (2012); 〈Zart〉, curated by Jan Hoet, Galerie ABT ART, Stuttgart (2009)'
                        : '단체전: 「바덴-뷔템베르크를 위한 60인의 작업」, 징엔 시립미술관, 독일 (2012); 「챠트(Zart)」, 얀 후트 기획, 갤러리 ABT ART, 슈투트가르트 (2009)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광/신학철 패턴 차용, 김태균 영토·경계 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its terrain</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 지형에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 두 나라 사이의 시점 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Between two countries — the doubled vantage'
                    : '두 나라 사이 — 이중의 시점'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Tae-gyun works between Stuttgart, Germany and Korea. That movement is
                        not a biographical footnote but a working method: to live between two places
                        is to look at each one from the position of the other. A landscape stops
                        being simply &lsquo;here&rsquo; and becomes a thing seen from a distance,
                        framed by another vantage.
                      </p>
                      <p>
                        This doubled gaze runs through his practice from the early German years —
                        his first solo show, 〈Shadow of the Landscape〉, was held at the Ehingen
                        Municipal Museum in 2011 — onward into the Korean work. The territory in his
                        images is never neutral ground. It is a place already shaped by who is
                        looking at it, and from where.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김태균은 독일 슈투트가르트와 한국을 오가며 작업한다. 그 이동은 약력의 한
                        줄이 아니라 하나의 작업 방법이다 — 두 장소 사이에 산다는 것은 각각을 다른
                        장소의 자리에서 바라본다는 것이다. 풍경은 더 이상 단순한
                        &lsquo;여기&rsquo;가 아니라, 다른 시점에 의해 틀 지어진 채 멀리서 보이는
                        무엇이 된다.
                      </p>
                      <p>
                        이 이중의 시선은 독일 시기 초기 — 첫 개인전 「풍경의 그늘」이 2011년 에힝엔
                        시립미술관에서 열렸다 — 부터 이후 한국 작업까지 그의 작업을 관통한다. 그의
                        이미지 속 영토는 결코 중립적인 땅이 아니다. 그것은 누가, 어디에서
                        바라보는가에 의해 이미 빚어진 장소다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 각색된 영토라는 동작 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Adapting the territory — landscape as a surface to rearrange'
                    : '영토를 각색하다 — 재배치할 수 있는 화면으로서의 풍경'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 2019 solo exhibition{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈Adapted Territory〉
                        </strong>
                        , held as a Kim Chong Yung Museum Creative Support exhibition, gives a name
                        to the central operation of his work. A territory, in his hands, is not
                        recorded but adapted — scripted, edited, re-staged. The landscape becomes a
                        surface whose layers can be lifted, shifted, and reassembled.
                      </p>
                      <p>
                        This is why the work reads as multilayered rather than panoramic. Where a
                        conventional landscape offers a single coherent view, Kim&apos;s images hold
                        several at once: a place reconstructed image by image, so that the seam
                        between layers stays visible. The territory is shown to be a construction —
                        something arranged, and therefore something that could have been arranged
                        otherwise.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2019년 개인전{' '}
                        <strong className="font-bold text-charcoal-deep">「각색된 영토」</strong>는
                        김종영미술관 창작지원전으로 열렸으며, 그의 작업의 중심 동작에 이름을 붙인다.
                        그의 손에서 영토는 기록되는 것이 아니라 각색된다 — 대본이 쓰이고, 편집되고,
                        다시 무대에 오른다. 풍경은 여러 겹이 들리고, 옮겨지고, 다시 조립될 수 있는
                        화면이 된다.
                      </p>
                      <p>
                        그래서 그의 작업은 파노라마가 아니라 다층으로 읽힌다. 통상의 풍경 재현이
                        하나의 일관된 시점을 제공한다면, 김태균의 이미지는 여러 시점을 한꺼번에
                        품는다 — 한 화면씩 재구성되어, 겹과 겹 사이의 이음매가 그대로 드러나도록.
                        영토는 구성물임이 드러난다. 배치된 것이고, 따라서 달리 배치될 수도 있었던
                        것이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 경계와 완충지대 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Borders and buffer zones — the line as subject'
                    : '경계와 완충지대 — 주제가 된 선'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Several of Kim&apos;s exhibitions turn directly to the dividing line of a
                        territory. He took part in 〈Boundary 155〉 at the Seoul Museum of Art
                        (2017) and 〈Time of the Buffer Zone〉 at the Gyeonggi Millennium Road
                        Gallery in Uijeongbu (2022) — group exhibitions whose very titles name a
                        border and the zone of pause around it.
                      </p>
                      <p>
                        In these contexts the line that splits a territory is not a backdrop but the
                        subject itself. The work approaches it as something to be looked at
                        carefully — a place where landscape, history, and the act of dividing meet.
                        Kim&apos;s contribution stays on the visual register: how a border appears,
                        how a buffer zone is composed in the frame, how a divided terrain is seen.
                        The questions he raises are questions of looking, left open for the viewer.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김태균의 몇몇 전시는 영토를 가르는 선으로 곧장 향한다. 그는 서울시립미술관
                        「경계 155」(2017)와 의정부 경기천년길갤러리 「완충의 시간」(2022)에
                        참여했다 — 제목 자체가 경계와 그 주위의 멈춤의 지대를 가리키는 단체전들이다.
                      </p>
                      <p>
                        이 맥락에서 영토를 가르는 선은 배경이 아니라 주제 그 자체다. 작업은 그것을
                        주의 깊게 바라보아야 할 무엇으로 다룬다 — 풍경과 역사, 그리고 가르는 행위가
                        만나는 자리로서. 김태균의 몫은 시각의 층위에 머문다: 경계가 어떻게
                        나타나는가, 완충지대가 화면 안에서 어떻게 구성되는가, 갈라진 지형이 어떻게
                        보여지는가. 그가 던지는 물음은 봄에 관한 물음이며, 보는 이에게 열린 채로
                        남겨진다.
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
                      From the galleries of Stuttgart to the museums of Seoul and Gyeonggi, Kim
                      Tae-gyun&apos;s work has pursued a single question: how is a territory seen,
                      and who arranges the seeing? The answer, built across a decade of solo and
                      group exhibitions, is a body of multilayered landscapes in which territory is
                      adapted and rearranged. He joins this campaign not as a subject of its cause
                      but as a fellow artist in solidarity — so that those who come after might work
                      with a little more ground beneath them.
                    </>
                  ) : (
                    <>
                      슈투트가르트의 화랑에서 서울과 경기의 미술관까지, 김태균의 작업은 하나의
                      물음을 추구해 왔다: 영토는 어떻게 보여지는가, 그리고 그 봄을 누가 배치하는가.
                      10여 년에 걸친 개인전과 단체전을 통해 구축된 대답은, 영토가 각색되고
                      재배치되는 다층의 풍경이다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라,
                      동료 예술인과의 연대자로서 함께한다 — 다음 세대의 예술인들이 조금 더 단단한 땅
                      위에서 일할 수 있도록.
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
                TERRAIN
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Tae-gyun</span>
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
                    Kim Tae-gyun joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김태균 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_TAEGYUN_PATH}
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
