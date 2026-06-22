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

// 거장 작가 feature는 작가 페이지(/artworks/artist/최윤정)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHOE_YUNJEONG_PATH = `/artworks/artist/${encodeURIComponent('최윤정')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isChoeYunjeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '최윤정' ||
    n === 'choe yunjeong' ||
    n === 'choi yunjeong' ||
    n.replace(/[\s-]+/g, '') === 'choeyunjeong' ||
    n.replace(/[\s-]+/g, '') === 'choiyunjeong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '최윤정 — 미디어가 씌운 안경, pop kids',
    description:
      '팝아트 작가 최윤정. 〈pop kids〉 연작에서 ‘안경’은 미디어가 우리 사고에 씌운 프레임을 상징한다. 경쾌한 팝의 색채와 도상으로 미디어·욕망·존재방식을 묻는 동시대적 시선. 최윤정의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '최윤정 — pop kids 연작의 팝아트 작가. ‘안경’으로 상징되는 미디어의 프레임, 욕망과 존재에 대한 동시대적 질문.',
    ogAlt: '최윤정 대표 작품',
    twitterTitle: '최윤정',
    twitterDescription: '미디어가 씌운 안경 — pop kids 연작의 팝아트 작가 최윤정',
    keywords: '최윤정 작가, 팝아트, pop kids, 미디어 비평, 안경, 동시대 미술, 씨앗페 온라인',
  },
  en: {
    title: 'Choe Yunjeong — pop kids, the Glasses Media Made Us Wear',
    description:
      "Selected works by Choe Yunjeong, a pop artist. In her 〈pop kids〉 series, the ‘glasses’ symbolize the frame that media places over our thinking. With pop's bright palette and iconography, she questions media, desire, and modes of being. View and collect her works at SAF Online.",
    ogDescription:
      "Choe Yunjeong — pop artist of the 〈pop kids〉 series. The 'glasses' as a symbol of the media's frame, a contemporary question on desire and being.",
    ogAlt: 'Choe Yunjeong — featured work',
    twitterTitle: 'Choe Yunjeong',
    twitterDescription: 'The glasses media made us wear — pop artist Choe Yunjeong of pop kids',
    keywords:
      'Choe Yunjeong artist, pop art, pop kids, media critique, contemporary art, Korean pop art',
  },
} as const;

export async function buildChoeYunjeongMetadata({
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
  const pageUrl = buildLocaleUrl(CHOE_YUNJEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('최윤정');
  const artwork = allArtworks.find((a) => isChoeYunjeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Choe Yunjeong`
      : `${artwork.title} — 최윤정`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHOE_YUNJEONG_PATH, locale, true),
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

export default async function ChoeYunjeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHOE_YUNJEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('최윤정');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isChoeYunjeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Choe Yunjeong' : '최윤정', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHOE_YUNJEONG_PATH}#person-choe-yunjeong`,
    name: isEnglish ? 'Choe Yunjeong' : '최윤정',
    alternateName: isEnglish ? '최윤정' : 'Choe Yunjeong',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? "Choe Yunjeong is a pop artist whose 〈pop kids〉 series uses the motif of 'glasses' to symbolize the frame media places over contemporary thinking, questioning media, desire, and modes of being."
      : '최윤정은 〈pop kids〉 연작에서 ‘안경’을 미디어가 동시대인의 사고에 씌운 프레임으로 형상화하며 미디어·욕망·존재방식을 묻는 팝아트 작가입니다.',
    knowsAbout: ['Pop art', 'Media critique', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Choe Yunjeong — SAF Online' : '최윤정 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Choe Yunjeong from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 최윤정 작품을 소개합니다.',
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

          {/* Pop dots — 망점/스크린톤 모티프 */}
          <div className="absolute top-10 left-8 w-24 h-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-sun/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full border-2 border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Choe Yunjeong · pop art' : '최윤정 · 팝아트'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  We wear glasses
                  <br />
                  <span className="text-primary-soft">media made for us</span>
                </>
              ) : (
                <>
                  우리는 미디어가 만든
                  <br />
                  <span className="text-primary-soft">안경을 쓰고 있다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Pop&apos;s bright palette, turned into a question.</span>
                  <span className="mt-2 block">
                    The 〈pop kids〉 series looks at how media frames desire and being.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">경쾌한 팝의 색채를, 질문으로 바꾼다.</span>
                  <span className="mt-2 block">
                    〈pop kids〉 연작이 들여다보는 미디어와 욕망, 그리고 존재.
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
                    pop kids —<br />
                    <span className="text-primary-strong">a frame placed over our seeing</span>
                  </>
                ) : (
                  <>
                    pop kids —<br />
                    <span className="text-primary-strong">우리의 시선에 씌워진 프레임</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Choe Yunjeong is a mid-career pop artist who looks closely at the era she
                      lives in. Working in the lineage of pop art, she takes the bright palette and
                      familiar iconography of the genre and turns them, quietly, into a critical
                      instrument.
                    </p>
                    <p>
                      Her 〈pop kids〉 series was conceived to give form to the{' '}
                      <strong className="font-bold text-charcoal-deep">present</strong>. According
                      to the artist, contemporary society is one in which media wields a greater
                      influence than ever before. Before we desire anything for ourselves, we are
                      already prompted toward certain actions by media — and we are drawn to them.
                    </p>
                    <p>
                      In the series, the recurring motif of the{' '}
                      <strong className="font-bold text-charcoal">glasses</strong> functions as a
                      device: a symbol of the frame that media has placed over our thinking. We do
                      not see the world directly; we see it through a lens shaped elsewhere.
                    </p>
                    <p>
                      From that motif comes the question her work keeps returning to: what is the
                      relationship between media — which exerts an enormous influence over the frame
                      of contemporary thought — and human desire and modes of being? The cheerful
                      surface of pop is, here, a way of asking something serious about how we live
                      now.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      최윤정은 자신이 살아가는 시대를 섬세하게 들여다보는 중견 팝아트 작가다.
                      팝아트의 계보 위에서, 그는 장르 특유의 경쾌한 색채와 익숙한 도상을 조용히
                      비판의 도구로 바꾸어 낸다.
                    </p>
                    <p>
                      〈pop kids〉 연작은{' '}
                      <strong className="font-bold text-charcoal-deep">현재</strong>를 표현하고자
                      기획된 시리즈다. 작가에 따르면, 현대사회는 과거 어느 때보다 미디어가 큰
                      영향력을 발휘하는 사회다. 현대를 사는 우리는 스스로 욕망하기 전에 미디어로부터
                      행동을 권유받고, 그것에 끌린다.
                    </p>
                    <p>
                      이 연작에서 반복되는 <strong className="font-bold text-charcoal">안경</strong>
                      이라는 모티프는 하나의 장치로 기능한다 — 미디어의 영향을 받은 우리 사고의
                      프레임을 상징하는 장치. 우리는 세계를 직접 보지 않는다. 다른 곳에서 만들어진
                      렌즈를 통해 본다.
                    </p>
                    <p>
                      그 모티프에서 그의 작업이 거듭 되돌아오는 물음이 나온다: 현대인의 사고의
                      프레임에 막대한 영향을 미치는 미디어와, 인간의 욕망과 존재방식은 무엇일까?
                      팝의 명랑한 표면은 여기서, 우리가 지금 어떻게 살아가는가를 진지하게 묻는
                      방식이 된다.
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
                        {isEnglish ? 'The glasses as frame' : '프레임으로서의 안경'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "The recurring 'glasses' motif symbolizes the frame media places over our thinking — we see the world through a lens shaped elsewhere."
                          : '반복되는 ‘안경’ 모티프는 미디어가 우리 사고에 씌운 프레임을 상징한다. 우리는 다른 곳에서 만들어진 렌즈로 세계를 본다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Media and desire' : '미디어와 욕망'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Before we desire for ourselves, media prompts our actions and we are drawn to them — the series asks what this means for how we exist.'
                          : '스스로 욕망하기 전에 미디어가 행동을 권유하고 우리는 그것에 끌린다. 연작은 이것이 우리의 존재방식에 어떤 의미인지 묻는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A critical pop' : '비판적 팝'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "Pop's bright palette and iconography, turned into an instrument for a contemporary, critical gaze on the present."
                          : '팝의 경쾌한 색채와 도상을, 현재를 향한 동시대적·비판적 시선의 도구로 전환한다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Selected solo exhibitions' : '주요 개인전'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《POP KIDS》 (Gallery H, Seoul); 《Believing Is Seeing》 (Arttertain Gallery, Seoul); 《Face》 (Hoseo University Central Library Gallery, Cheonan)'
                        : '《POP KIDS》(갤러리H, 서울); 《Believing Is Seeing》(아터테인 갤러리, 서울); 《Face》(호서대학교 중앙도서관 전시관, 천안)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Choe Yunjeong invitational exhibition (Gallery H, Cheongju)'
                        : '최윤정 초대전 (갤러리H, 청주)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《There Being》 (Gallery Bandi Trazos, Seoul)'
                        : '《There Being》(갤러리 반디트라소, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Follow ME》 (Bandi Trazos Gallery, Seoul); 《Pop Kids》 (YTN Art Square, Seoul)'
                        : '《Follow ME》(반디트라소 갤러리, 서울); 《Pop Kids》(YTN Art Square, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Into The Pinhole》 (A.Style, Hong Kong); 《Show Me the Money》 (Gallery Grida, Seoul)'
                        : '《Into The Pinhole》(A.Style, 홍콩); 《Show Me the Money》(갤러리 그리다, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Desire》 (Gail Art Museum, Gapyeong)'
                        : '《Desire》(가일미술관, 가평)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Fantasyland》 (CYART Gallery, Seoul); Choe Yunjeong solo exhibition (With Space Gallery, Beijing)'
                        : '《Fantasyland》(사이아트 갤러리, 서울); 최윤정 개인전 (위드스페이스 갤러리, 베이징)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Moderno》 (Busan Art Center, Busan)'
                        : '《Moderno》(부산아트센터, 부산)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Nostalgia》 (KEPCO Plaza Gallery, Seoul)'
                        : '《Nostalgia》(한전프라자 갤러리, 서울)'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected group shows & collections' : '주요 단체전 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: KIAF (COEX, Seoul, 2023); Galleries Art Fair (COEX, Seoul, 2023)'
                        : '단체전: 키아프 (코엑스, 서울, 2023); 화랑미술제 (코엑스, 서울, 2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '19th Asian Art Biennale Bangladesh (National Art Gallery, Dhaka, 2022)'
                        : '19th Asian Art Biennale Bangladesh (National Art Gallery, Dhaka, 2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: SCOPE MIAMI and Shanghai Art Fair (2018); Hello! Pop (Jeju Museum of Art, 2015)'
                        : '단체전: SCOPE MIAMI·상하이 아트페어 (2018); 헬로우! 팝 (제주도립미술관, 2015)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA Art Bank (Gwacheon), Yangpyeong Art Museum, Osan Museum of Art, HiteJinro, META Korea, Hoseo University, AnaPass, YK BNC, and others'
                        : '소장: 국립현대미술관 미술은행 (과천), 양평군립미술관, 오산미술관, 하이트진로, META Korea, 호서대학교, AnaPass, YK BNC 등'}
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
                  <span className="text-charcoal-deep">on pop, the glasses, and the gaze</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">팝과 안경, 그리고 시선에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 팝이라는 언어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Pop as a language — the bright surface and what it carries'
                    : '팝이라는 언어 — 경쾌한 표면과 그것이 나르는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Pop art has always been double. Its bright colours and borrowed iconography
                        read, at first, as celebration — of the commodity, the advertisement, the
                        glossy image. But the same surface can be turned around: the very legibility
                        that makes pop feel cheerful is what lets it speak directly about the world
                        of images we live inside.
                      </p>
                      <p>
                        Choe Yunjeong works in that doubled register. Her canvases keep the
                        immediacy and the colour of pop, but they are pointed at the present she
                        lives in rather than away from it. The familiar visual grammar becomes a way
                        in — an invitation that, once accepted, asks the viewer to look again at
                        what they were enjoying.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        팝아트는 언제나 이중적이었다. 경쾌한 색채와 빌려 온 도상은 처음에는 찬미처럼
                        읽힌다 — 상품에 대한, 광고에 대한, 매끈한 이미지에 대한 찬미. 그러나 같은
                        표면은 뒤집힐 수 있다. 팝을 명랑하게 만드는 바로 그 가독성이, 우리가 그
                        안에서 살아가는 이미지의 세계를 직접 말하게 한다.
                      </p>
                      <p>
                        최윤정은 그 이중의 음역에서 작업한다. 그의 화면은 팝의 즉각성과 색채를
                        간직하되, 자신이 살아가는 현재로부터 달아나지 않고 그것을 겨눈다. 익숙한
                        시각 문법은 하나의 입구가 된다 — 일단 받아들이고 나면, 방금 즐기고 있던 것을
                        다시 보게 만드는 초대.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 안경, 미디어가 씌운 프레임 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The glasses — a device for the media frame'
                    : '안경 — 미디어 프레임을 위한 장치'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Across the 〈pop kids〉 series, one motif keeps returning: the{' '}
                        <strong className="font-bold text-charcoal-deep">glasses</strong>. They are
                        not a fashion accessory here but a device — a symbol of the frame that media
                        has placed over our thinking. To wear them is to see the world through a
                        lens that was shaped before we arrived.
                      </p>
                      <p>
                        The premise the artist sets out is direct. Contemporary society, she
                        observes, is one in which media wields a greater influence than at any time
                        before. Before we desire anything for ourselves, we are already prompted
                        toward certain actions by media — and we are drawn to them. The glasses make
                        this visible: desire that arrives pre-shaped, a gaze that is already someone
                        else&apos;s.
                      </p>
                      <p>
                        What the series withholds is the easy resolution. It does not tell us to
                        take the glasses off; it shows that we are already wearing them, and asks
                        whether we can tell the difference between what we want and what we have
                        been given to want.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈pop kids〉 연작 전체에서 하나의 모티프가 거듭 돌아온다 —{' '}
                        <strong className="font-bold text-charcoal-deep">안경</strong>. 여기서
                        그것은 패션 소품이 아니라 장치다. 미디어가 우리 사고에 씌운 프레임을
                        상징하는 장치. 안경을 쓴다는 것은, 우리가 도착하기 전에 이미 만들어진 렌즈로
                        세계를 본다는 것이다.
                      </p>
                      <p>
                        작가가 내세우는 전제는 직접적이다. 현대사회는 과거 어느 때보다 미디어가 큰
                        영향력을 발휘하는 사회라고 그는 관찰한다. 우리는 스스로 무언가를 욕망하기
                        전에, 이미 미디어로부터 행동을 권유받고 그것에 끌린다. 안경은 이것을
                        가시화한다 — 미리 빚어진 채 도착하는 욕망, 이미 누군가의 것인 시선.
                      </p>
                      <p>
                        이 연작이 보류하는 것은 손쉬운 해결이다. 그것은 안경을 벗으라고 말하지
                        않는다. 우리가 이미 그것을 쓰고 있음을 보여줄 뿐, 그리고 우리가 원하는 것과
                        원하도록 주어진 것을 구별할 수 있는지를 묻는다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 시대를 들여다보는 일 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Looking closely at one’s own time' : '자신의 시대를 들여다보는 일'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Choe Yunjeong describes her work as an attempt to look closely at the era
                        she lives in. That is a quieter ambition than it sounds. To examine your own
                        moment is harder than to examine the past, because you are inside it —
                        wearing the same glasses you want to describe.
                      </p>
                      <p>
                        The 〈pop kids〉 series accepts that difficulty as its subject. From it
                        comes the question her practice keeps circling: what is the relationship
                        between media — which exerts an enormous influence over the frame of
                        contemporary thought — and human desire and modes of being? It is a question
                        without a tidy answer, and the work is honest about that.
                      </p>
                      <p>
                        What remains is a body of pop painting that refuses to be merely decorative.
                        Bright, legible, immediate — and underneath, a sustained attention to how a
                        generation has been taught to see.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        최윤정은 자신의 작업을 자신이 살아가는 시대를 섬세하게 들여다보려는 시도로
                        설명한다. 그것은 들리는 것보다 조용한 야심이다. 자신의 현재를 살피는 일은
                        과거를 살피는 일보다 어렵다. 당신이 그 안에 있기 때문이다 — 묘사하고 싶은
                        바로 그 안경을 쓴 채로.
                      </p>
                      <p>
                        〈pop kids〉 연작은 그 어려움을 주제로 받아들인다. 거기서 그의 작업이 거듭
                        맴도는 물음이 나온다: 현대인의 사고의 프레임에 막대한 영향을 미치는
                        미디어와, 인간의 욕망과 존재방식은 무엇일까? 그것은 깔끔한 답이 없는
                        물음이고, 작업은 그 점에 정직하다.
                      </p>
                      <p>
                        남는 것은 한낱 장식이기를 거부하는 팝 회화의 몸이다. 밝고, 읽히고,
                        즉각적이되 — 그 아래에는, 한 세대가 어떻게 보도록 길들여졌는가를 향한
                        지속적인 주의가 있다.
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
                      From the bright surface of pop to the device of the glasses, Choe
                      Yunjeong&apos;s work pursues a single question: can we see our own time
                      clearly while living inside its frame? She joins this campaign not as a
                      subject of its cause but as a fellow artist in solidarity — offering her work
                      so that those navigating financial exclusion today might find a way through.
                    </>
                  ) : (
                    <>
                      팝의 밝은 표면에서 안경이라는 장치까지, 최윤정의 작업은 하나의 물음을
                      추구한다: 우리는 자신의 시대를 그 프레임 안에서 살아가면서도 또렷이 볼 수
                      있는가. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 오늘 금융 차별을 헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의
                      작품을 내놓는다.
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
                POP KIDS
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Choe Yunjeong</span>
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
                    Choe Yunjeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    최윤정 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHOE_YUNJEONG_PATH}
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
