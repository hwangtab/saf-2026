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

// 작가 feature는 작가 페이지(/artworks/artist/정금희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JEONG_GEUMHUI_PATH = `/artworks/artist/${encodeURIComponent('정금희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongGeumhuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정금희' ||
    n === 'jeong geumhui' ||
    n === 'jeong geum-hui' ||
    n === 'jung geumhee' ||
    n.replace(/[\s-]+/g, '') === 'jeonggeumhui'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정금희 — 화락이토와 동해선, 사라지는 것의 시간',
    description:
      '부산을 중심으로 활동하는 사진가 정금희. 홍익대학교 대학원에서 사진학 박사를 받은 그는, 꽃이 떨어져 흙이 되는 순환을 담은 「화락이토(花落以土)」 연작과 동해선 폐역사(驛舍)의 역사(歷史)를 기록한 작업으로 풍경과 시간의 결을 응시해왔다. 사진과 사진집으로 사라지는 것을 기록하는 정금희의 작품을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '부산의 사진가 정금희. 「화락이토(花落以土)」와 동해선 폐역사 연작으로 사라지는 것의 시간을 기록한다.',
    ogAlt: '정금희 대표 작품',
    twitterTitle: '정금희',
    twitterDescription: '꽃이 떨어져 흙이 되는 순환 — 「화락이토」와 동해선의 사진가 정금희',
    keywords:
      '정금희 사진가, 화락이토, 花落以土, 동해선 사진, 폐역사, 부산 사진가, 사진집, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Geumhui — Hwarak-ito and the Donghae Line',
    description:
      'Selected works by Jeong Geumhui, a Busan-based photographer. Holding a doctorate in photography from the graduate school of Hongik University, she gazes at landscape and the grain of time — through her 〈Hwarak-ito (花落以土)〉 series on the cycle by which a fallen flower returns to earth, and her record of the disused stations (驛舍) and history (歷史) of the Donghae Line. View her works at SAF Online.',
    ogDescription:
      'Jeong Geumhui — a Busan photographer. Through 〈Hwarak-ito〉 and her Donghae Line series, she records the time of vanishing things.',
    ogAlt: 'Jeong Geumhui — featured work',
    twitterTitle: 'Jeong Geumhui',
    twitterDescription:
      'A fallen flower returns to earth — Jeong Geumhui, photographer of 〈Hwarak-ito〉 and the Donghae Line',
    keywords:
      'Jeong Geumhui photographer, Hwarak-ito, Donghae Line, disused stations, Busan photographer, photobook',
  },
} as const;

export async function buildJeongGeumhuiMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_GEUMHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정금희');
  const artwork = allArtworks.find((a) => isJeongGeumhuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Geumhui`
      : `${artwork.title} — 정금희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_GEUMHUI_PATH, locale, true),
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

export default async function JeongGeumhuiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_GEUMHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정금희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJeongGeumhuiArtist(artwork.artist)
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
    { name: isEnglish ? 'Jeong Geumhui' : '정금희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_GEUMHUI_PATH}#person-jeong-geumhui`,
    name: isEnglish ? 'Jeong Geumhui' : '정금희',
    alternateName: isEnglish ? '정금희' : 'Jeong Geumhui',
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? 'Jeong Geumhui is a Busan-based Korean photographer who records landscape and the grain of time through photography and the photobook. She holds a doctorate in photography from the graduate school of Hongik University, and is known for her 〈Hwarak-ito (花落以土)〉 series and her record of the disused stations of the Donghae Line.'
      : '정금희는 부산을 중심으로 활동하며 사진과 사진집으로 풍경과 시간의 결을 기록하는 사진가입니다. 홍익대학교 대학원에서 사진학 박사를 받았으며, 「화락이토(花落以土)」 연작과 동해선 폐역사를 기록한 작업으로 알려져 있습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Hongik University, Graduate School (Ph.D. in Photography)'
        : '홍익대학교 대학원 디자인공예학과 사진학 박사',
    },
    knowsAbout: ['Photography', 'Photobook', 'Landscape photography'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Geumhui — SAF Online' : '정금희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Geumhui from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 정금희 작품들을 소개합니다.',
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
        {/* Hero Section — 사라지는 것의 시간, 떨어진 꽃잎·폐역의 선 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 폐역으로 사라지는 선로 — 수평 레일 모티프 */}
          <div className="absolute top-1/3 left-0 h-px w-full bg-white/8" aria-hidden="true" />
          <div
            className="absolute top-1/3 left-0 mt-3 h-px w-full bg-primary/20"
            aria-hidden="true"
          />
          {/* 흙으로 떨어지는 꽃잎 — 점들이 아래로 흩어지는 모티프 */}
          <div
            className="absolute top-16 left-14 w-2 h-2 bg-white/15 rotate-45"
            aria-hidden="true"
          />
          <div
            className="absolute top-28 left-24 w-2 h-2 bg-primary/30 rotate-45"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 right-16 w-2 h-2 bg-white/12 rotate-45"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-32 right-28 w-2 h-2 bg-primary/25 rotate-45"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Geumhui' : '정금희'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A fallen flower
                  <br />
                  <span className="text-primary-soft">returns to earth</span>
                </>
              ) : (
                <>
                  꽃이 떨어져
                  <br />
                  <span className="text-primary-soft">흙이 되는 시간</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From Busan, she photographs landscape and the grain of time.
                  </span>
                  <span className="mt-2 block">
                    A tender gaze fixed on the things that vanish — flowers, stations, history.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">부산에서, 풍경과 시간의 결을 사진으로 담는다.</span>
                  <span className="mt-2 block">
                    사라지는 것 — 꽃과 폐역과 역사를 향한 애틋한 시선.
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
                    Recording the vanishing —<br />
                    <span className="text-primary-strong">photography and the photobook</span>
                  </>
                ) : (
                  <>
                    사라지는 것을 기록하다 —<br />
                    <span className="text-primary-strong">사진과 사진집의 작업</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Geumhui works from Busan, recording landscape and the grain of time
                      through photography and the photobook. She earned a doctorate in photography
                      from the graduate school of Hongik University, and her practice carries both
                      the discipline of the long-form study and the patience of the book — images
                      gathered, sequenced, and bound rather than simply shown.
                    </p>
                    <p>
                      Her most sustained subject is the cycle named in the title of her central
                      series:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Hwarak-ito (花落以土)〉
                      </strong>{' '}
                      — &lsquo;a flower falls and becomes earth.&rsquo; The phrase frames a body of
                      work that looks steadily at impermanence: the moment when a blossom completes
                      its season, drops, and is reabsorbed into the ground from which the next will
                      rise. It is a photography of return rather than arrival.
                    </p>
                    <p>
                      Alongside it runs her record of the{' '}
                      <strong className="font-bold text-charcoal-deep">Donghae Line</strong>. In
                      &lsquo;Donghae Line — Stations (驛舍), History (歷史),&rsquo; she photographs
                      the disused stations of the line as it was rerouted and modernized, holding
                      together the double meaning the title carries in Korean: the station building
                      (驛舍) and the history (歷史) that passed through it. The empty platforms and
                      shuttered ticket windows become a quiet archive of a vanishing infrastructure
                      of memory.
                    </p>
                    <p>
                      Across solo exhibitions from 2011 onward — &lsquo;BEYOND,&rsquo; the
                      &lsquo;Hwarak-ito&rsquo; series, the Donghae Line work — and two photobooks,{' '}
                      <em>BEYOND</em> (2011) and <em>Hwarak-ito</em> (2024), both from the
                      photography publisher Ryugaheon, her work returns again and again to the same
                      register: a tender, contemplative attention to what time takes away.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정금희는 부산을 중심으로 활동하며, 사진과 사진집으로 풍경과 시간의 결을
                      기록한다. 홍익대학교 대학원에서 사진학으로 박사 학위를 받은 그는, 한 주제를
                      길게 들여다보는 연구자의 규율과, 이미지를 모으고 엮어 한 권으로 묶는 사진집
                      작업의 인내를 함께 지니고 있다.
                    </p>
                    <p>
                      그가 가장 오래 응시해 온 주제는 대표 연작의 제목에 담긴 순환이다 —{' '}
                      <strong className="font-bold text-charcoal-deep">
                        「화락이토(花落以土)」
                      </strong>
                      , 꽃이 떨어져 흙이 된다. 이 말은 무상함을 묵묵히 바라보는 작업 전체를 감싼다:
                      꽃이 한 철을 마치고 떨어져, 다음 꽃이 피어날 바로 그 땅으로 되돌아가 흡수되는
                      순간. 도착이 아니라 되돌아감의 사진이다.
                    </p>
                    <p>
                      그 곁에는 <strong className="font-bold text-charcoal-deep">동해선</strong>의
                      기록이 나란히 흐른다. 「동해선 — 역사(驛舍), 역사(歷史)」에서 그는 노선이
                      이설·현대화되며 버려진 폐역들을 담으며, 한국어 제목이 품은 이중의 뜻을 한
                      화면에 끌어안는다 — 기차가 서던 건물로서의 역사(驛舍)와, 그곳을 지나간
                      역사(歷史). 빈 플랫폼과 닫힌 매표창은 사라져가는 기억의 기반시설에 대한 조용한
                      아카이브가 된다.
                    </p>
                    <p>
                      2011년 이후 이어진 개인전들 — 「BEYOND」, 「화락이토」 연작, 동해선 작업 — 과
                      두 권의 사진집, 사진 전문 출판사 류가헌에서 펴낸 <em>《BEYOND》</em>(2011)와{' '}
                      <em>《화락이토》</em>(2024)에서, 그의 작업은 같은 음역으로 거듭 되돌아온다:
                      시간이 데려가는 것을 향한 애틋하고 사색적인 시선.
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
                        {isEnglish ? 'Hwarak-ito (花落以土)' : '화락이토(花落以土)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A flower falls and becomes earth — a photography of the cycle of impermanence and return.'
                          : '꽃이 떨어져 흙이 된다 — 무상과 순환, 되돌아감을 응시하는 사진.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The Donghae Line — 驛舍 and 歷史' : '동해선 — 驛舍와 歷史'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The disused stations of the Donghae Line, where the building (驛舍) and the history (歷史) it carried share a single word.'
                          : '동해선의 폐역들 — 건물로서의 역사(驛舍)와 그곳을 지나간 역사(歷史)가 한 단어를 나눠 갖는 자리.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Photography and the photobook' : '사진과 사진집'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Images gathered, sequenced, and bound — the long-form discipline of the photobook as the natural home of her work.'
                          : '이미지를 모으고 엮어 한 권으로 묶는 일 — 사진집이라는 긴 호흡의 형식이 그의 작업이 머무는 자리다.'}
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
                        ? 'Ph.D. in Photography, Dept. of Design & Craft, Graduate School of Hongik University.'
                        : '홍익대학교 대학원 디자인공예학과 사진학 박사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈BEYOND〉, K.O.N.G Gallery, Seoul; photobook BEYOND (Ryugaheon).'
                        : '「BEYOND」 개인전, 공근혜 갤러리, 서울; 사진집 《BEYOND》(류가헌).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈BEYOND〉, Toyota Photo Space, Busan.'
                        : '「BEYOND」, 토요타포토스페이스, 부산.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "〈Today's Weather〉, Gallery Sujeong, Busan."
                        : '「오늘의 날씨」, 갤러리 수정, 부산.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Hwarak-ito〉, Busan Alliance Française ART SPACE.'
                        : '「화락이토」, 부산 프랑스문화원 ART SPACE.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Dong〉, Busan Alliance Française ART SPACE.'
                        : '「동」, 부산 프랑스문화원 ART SPACE.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Donghae Line — Stations (驛舍), History (歷史)〉, Gallery Lucida, Jinju.'
                        : '「동해선 — 역사(驛舍), 역사(歷史)」, 갤러리 루시다, 진주.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Photobook Hwarak-ito published (Ryugaheon).'
                        : '사진집 《화락이토》 출간(류가헌).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Hwarak-ito (花落以土)〉, Busan Gallery, Busan.'
                        : '「화락이토(花落以土)」, 부산갤러리, 부산.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & publications' : '주요 전시 및 출판'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions (7 in total): 〈BEYOND〉 (K.O.N.G Gallery 2011 · Toyota Photo Space 2012) · 〈Today’s Weather〉 (Gallery Sujeong 2017) · 〈Hwarak-ito〉 (Busan Alliance Française ART SPACE 2018) · 〈Dong〉 (2022) · 〈Donghae Line — 驛舍, 歷史〉 (Gallery Lucida, Jinju 2023) · 〈Hwarak-ito 花落以土〉 (Busan Gallery 2025)'
                        : '개인전(총 7회): 「BEYOND」(공근혜 갤러리 2011 · 토요타포토스페이스 2012) · 「오늘의 날씨」(갤러리 수정 2017) · 「화락이토」(부산 프랑스문화원 ART SPACE 2018) · 「동」(2022) · 「동해선 — 驛舍, 歷史」(갤러리 루시다, 진주 2023) · 「화락이토 花落以土」(부산갤러리 2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions (over 60 in total), including 〈Memory Is an Old Story〉 (Geumsaem Museum, 2025), 〈Our Heterotopia〉 (Gallery Tan, Daejeon, 2025), and the Busan·Ulsan·Gyeongnam photography exchange 〈Afterimage of Memory〉 (Busan City Hall Gallery, 2025).'
                        : '단체전(총 60여 회), 「기억은 오래된 이야기」(금샘미술관, 2025), 「우리들의 헤테로토피아」(갤러리 탄, 대전, 2025), 부산·울산·경남 사진교류전 「기억의 잔상」(부산시청갤러리, 2025) 등.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Photobooks: Hwarak-ito (Ryugaheon, 2024) · BEYOND (Ryugaheon, 2011).'
                        : '사진집: 《화락이토》(류가헌, 2024) · 《BEYOND》(류가헌, 2011).'}
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
              {/* 1. 화락이토 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Hwarak-ito — a flower falls and becomes earth'
                    : '화락이토 — 꽃이 떨어져 흙이 되다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The phrase that gives the series its name — 花落以土, &lsquo;a flower falls
                        and becomes earth&rsquo; — sets the terms for everything in it. A blossom is
                        not photographed at the height of its bloom but at the edge of its passing:
                        as it loosens, drops, and begins to return to the ground. The work does not
                        mourn this so much as attend to it, with a steadiness that treats decay as
                        part of a longer cycle rather than an ending.
                      </p>
                      <p>
                        What the series proposes is a way of seeing in which falling and rising are
                        the same motion. The earth that receives a fallen flower is also the earth
                        from which the next will grow; impermanence and renewal are folded into one
                        another. Jeong&apos;s photographs hold this quietly — close attention to
                        texture, to the worn surface of a petal or a patch of ground, rather than
                        any large dramatic gesture.
                      </p>
                      <p>
                        Carried across exhibitions from 2018 onward and gathered into the 2024
                        photobook <em>Hwarak-ito</em>, published by Ryugaheon, the series reads less
                        as a record of particular flowers than as a sustained meditation on time
                        itself — on the tenderness, and the consolation, of the things that vanish.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        연작에 이름을 준 말 — 花落以土, 꽃이 떨어져 흙이 된다 — 은 그 안의 모든 것의
                        조건을 정한다. 꽃은 만개의 절정이 아니라 스러짐의 가장자리에서 찍힌다:
                        느슨해지고, 떨어지고, 땅으로 되돌아가기 시작하는 자리에서. 작업은 이를
                        슬퍼한다기보다 응시한다. 쇠락을 끝이 아니라 더 긴 순환의 일부로 다루는
                        고요한 한결같음으로.
                      </p>
                      <p>
                        연작이 제안하는 것은, 떨어짐과 피어남이 같은 운동이라는 봄의 방식이다.
                        떨어진 꽃을 받는 땅은, 다음 꽃이 자라날 바로 그 땅이기도 하다. 무상과 갱신은
                        서로의 안으로 접혀 든다. 정금희의 사진은 이를 조용히 품는다 — 큰 극적
                        제스처가 아니라, 꽃잎의 닳은 표면이나 한 뼘의 땅에 대한 가까운 응시로.
                      </p>
                      <p>
                        2018년 이후의 전시들을 거쳐 류가헌에서 펴낸 2024년 사진집{' '}
                        <em>《화락이토》</em>로 묶인 이 연작은, 특정한 꽃들의 기록이라기보다 시간
                        자체에 대한 지속적 사유로 읽힌다 — 사라지는 것들이 지닌 애틋함, 그리고 그
                        위로에 대한.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 동해선 — 驛舍와 歷史 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The Donghae Line — where 驛舍 and 歷史 share a word'
                    : '동해선 — 驛舍와 歷史가 한 단어를 나누는 곳'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of the Donghae Line series turns on a pun that only Korean can
                        hold. <em>Yeoksa</em> is at once 驛舍 — the station building, the physical
                        house where a train once stopped — and 歷史 — history, the time that passed
                        through it. As the line was rerouted and modernized, its older stations fell
                        out of use; Jeong photographs them in that condition, empty and shuttered,
                        when the building has outlived its function but not yet its meaning.
                      </p>
                      <p>
                        These are not nostalgic images so much as careful ones. A disused platform,
                        a closed ticket window, a name-board for a stop no train serves: each is a
                        small monument to an infrastructure of memory that is quietly disappearing.
                        The series asks what a place holds once its use is gone — and answers,
                        gently, that it holds history, in both senses of the word at once.
                      </p>
                      <p>
                        Shown as &lsquo;Donghae Line — Stations (驛舍), History (歷史)&rsquo; at
                        Gallery Lucida in Jinju in 2023, the work sits naturally beside Hwarak-ito.
                        Where one series watches a flower return to earth, the other watches a
                        building return to silence — two studies in the same subject, the time of
                        vanishing things.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        동해선 연작의 제목은 한국어만이 품을 수 있는 중의(重義)에 기댄다.{' '}
                        <em>역사</em>는 곧 驛舍 — 기차가 서던 건물, 그 물리적인 집 — 이면서 동시에
                        歷史 — 그곳을 지나간 시간이다. 노선이 이설·현대화되며 옛 역들은 쓰임을
                        잃었고, 정금희는 바로 그 상태의 역들을 담는다. 비고 닫힌 채, 건물이 제
                        기능을 다하고도 아직 그 의미를 다하지 않은 자리에서.
                      </p>
                      <p>
                        이 사진들은 향수에 젖었다기보다 조심스럽다. 버려진 플랫폼, 닫힌 매표창,
                        이제는 어떤 기차도 서지 않는 역의 이름판 — 그 하나하나가 조용히 사라져가는
                        기억의 기반시설에 바치는 작은 기념비다. 연작은 쓰임이 사라진 뒤에도 한
                        장소가 무엇을 간직하는가를 묻고, 나직이 답한다: 그곳은 역사를 간직한다, 두
                        가지 뜻을 한꺼번에.
                      </p>
                      <p>
                        2023년 진주 갤러리 루시다에서 「동해선 — 역사(驛舍), 역사(歷史)」로 선보인
                        이 작업은 화락이토와 자연스럽게 나란히 선다. 한 연작이 꽃이 흙으로 돌아가는
                        것을 지켜본다면, 다른 하나는 건물이 침묵으로 돌아가는 것을 지켜본다 — 같은
                        주제에 대한 두 편의 연구, 사라지는 것의 시간에 대한.
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
                      Between a fallen flower and a shuttered station, Jeong Geumhui has built a
                      quiet, sustained body of work about the time of vanishing things — and about
                      the tenderness it asks of us. She joins this campaign in solidarity with
                      fellow artists, so that those who come after might keep gathering, sequencing,
                      and binding their own images of the world before it changes.
                    </>
                  ) : (
                    <>
                      떨어진 꽃과 닫힌 역 사이에서, 정금희는 사라지는 것의 시간에 관한 — 그리고
                      그것이 우리에게 요구하는 애틋함에 관한 — 조용하고 꾸준한 작업을 쌓아왔다. 그는
                      동료 예술인과의 연대의 뜻으로 씨앗페에 함께한다. 다음 세대의 예술인들이
                      변해가는 세계를 향한 자신의 이미지를 계속 모으고, 엮고, 한 권으로 묶어낼 수
                      있도록.
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
                TIME
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jeong Geumhui</span>
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
                    Jeong Geumhui joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정금희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_GEUMHUI_PATH}
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
