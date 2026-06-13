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

// 작가 feature는 작가 페이지(/artworks/artist/신연진)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SIN_YEONJIN_PATH = `/artworks/artist/${encodeURIComponent('신연진')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSinYeonjinArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '신연진' ||
    n === 'sin yeonjin' ||
    n === 'sin yeon-jin' ||
    n === 'shin yeonjin' ||
    n.replace(/[\s-]+/g, '') === 'sinyeonjin' ||
    n.replace(/[\s-]+/g, '') === 'shinyeonjin'
  );
};

const PAGE_COPY = {
  ko: {
    title: '신연진 — 일상적인 것들의 꼴라주',
    description:
      '일상의 풍경과 미세한 정서를 회화의 콜라주 언어로 옮겨 온 작가 신연진. 홍익대 회화과와 동 대학원을 마치고 〈킵티크〉 연작과 〈일상적인 것들의 꼴라주〉를 이어온 신진 작가의 섬세하고 따뜻한 화면을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '일상의 풍경과 미세한 정서를 회화의 콜라주 언어로 옮겨 온 작가 신연진. 조각조각 중첩되어 빛나는 일상, 〈킵티크〉 연작.',
    ogAlt: '신연진 대표 작품',
    twitterTitle: '신연진',
    twitterDescription: '일상적인 것들의 꼴라주 — 일상의 풍경을 회화의 콜라주로 옮기는 작가 신연진',
    keywords:
      '신연진 작가, 콜라주 회화, 꼴라주, 킵티크, 일상적인 것들의 꼴라주, 홍익대 회화과, 씨앗페 온라인',
  },
  en: {
    title: 'Sin Yeonjin — A Collage of Everyday Things',
    description:
      'Selected works by Sin Yeonjin, a painter who translates everyday scenes and subtle emotions into the language of painterly collage. A graduate of Hongik University&apos;s painting program at both undergraduate and graduate levels, she has continued the 〈Kiptique〉 series and 〈A Collage of Everyday Things〉. View her delicate, warm canvases at SAF Online.',
    ogDescription:
      'Sin Yeonjin — a painter who translates everyday scenes and subtle emotions into the language of painterly collage. The everyday, layered piece by piece, in the 〈Kiptique〉 series.',
    ogAlt: 'Sin Yeonjin — featured work',
    twitterTitle: 'Sin Yeonjin',
    twitterDescription:
      'A collage of everyday things — a painter who translates daily scenes into painterly collage',
    keywords:
      'Sin Yeonjin artist, collage painting, Kiptique, everyday collage, Hongik University painting, Korean emerging artist',
  },
} as const;

export async function buildSinYeonjinMetadata({
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
  const pageUrl = buildLocaleUrl(SIN_YEONJIN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('신연진');
  const artwork = allArtworks.find((a) => isSinYeonjinArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Sin Yeonjin`
      : `${artwork.title} — 신연진`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SIN_YEONJIN_PATH, locale, true),
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

export default async function SinYeonjinFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SIN_YEONJIN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('신연진');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isSinYeonjinArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Sin Yeonjin' : '신연진', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SIN_YEONJIN_PATH}#person-sin-yeonjin`,
    name: isEnglish ? 'Sin Yeonjin' : '신연진',
    alternateName: isEnglish ? '신연진' : 'Sin Yeonjin',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Sin Yeonjin is a painter who translates everyday scenes and subtle emotions into the language of painterly collage. She graduated from the painting program at Hongik University at both undergraduate and graduate levels.'
      : '신연진은 일상의 풍경과 미세한 정서를 회화의 콜라주 언어로 옮겨 온 작가로, 홍익대학교 회화과를 졸업하고 같은 대학원 회화과를 마쳤습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Painting' : '홍익대학교 회화과',
    },
    knowsAbout: isEnglish
      ? ['Collage painting', 'Everyday life', 'Contemporary Korean painting']
      : ['콜라주 회화', '일상', '한국 현대 회화'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Sin Yeonjin — SAF Online' : '신연진 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Sin Yeonjin from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 신연진 작품들을 소개합니다.',
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

          {/* Overlapping collage fragments — 조각조각 중첩되는 일상 모티프 */}
          <div className="absolute top-12 left-10 h-20 w-20 border border-white/10 rotate-6" />
          <div className="absolute top-20 left-16 h-16 w-24 border border-primary/30 -rotate-3" />
          <div className="absolute bottom-16 right-12 h-24 w-20 border border-white/10 rotate-12" />
          <div className="absolute bottom-24 right-20 h-16 w-16 border border-sun/20 -rotate-6" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Sin Yeonjin · Painter' : '신연진 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A collage of
                  <br />
                  <span className="text-primary-soft">everyday things</span>
                </>
              ) : (
                <>
                  일상적인 것들의
                  <br />
                  <span className="text-primary-soft">꼴라주</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Everyday scenes and the faintest of feelings.</span>
                  <span className="mt-2 block">
                    Gathered piece by piece into the language of painterly collage.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">일상의 풍경과 미세한 정서.</span>
                  <span className="mt-2 block">조각조각 모아 회화의 콜라주 언어로 옮기다.</span>
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
                    The everyday, layered —<br />
                    <span className="text-primary-strong">a painting built from fragments</span>
                  </>
                ) : (
                  <>
                    겹쳐 쌓은 일상 —<br />
                    <span className="text-primary-strong">조각으로 지은 회화</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Sin Yeonjin is a painter who translates everyday scenes and subtle emotions
                      into the language of painterly collage. She graduated from the Department of
                      Painting at Hongik University and completed her graduate studies in painting
                      at the same university.
                    </p>
                    <p>
                      Her practice gathers the ordinary — the textures, scenes, and quiet feelings
                      of daily life — and layers them piece by piece across the surface of the
                      canvas. In her hands collage is not a cut-and-paste of found material but a
                      way of seeing: the day broken into fragments and reassembled into something
                      that glimmers.
                    </p>
                    <p>
                      In 2025 she held the solo exhibitions 〈Kiptique〉 at Notting Hill Lounge
                      (Gamil) and 〈A Collage of Everyday Things〉 in the Nanum Zone of Kangbuk
                      Samsung Hospital. Earlier, she won the 2020 Young Artist Space Support open
                      call and held a booth solo exhibition at United Gallery, and held her first
                      solo exhibition at Kwanhoon Gallery in 2002.
                    </p>
                    <p>
                      She has taken part in numerous curated and group exhibitions — among them the
                      Gangdong Young Artist Support open call 〈An Exhibition Where Everything
                      Shines〉 (Gangdong Arts Center Art Rang, 2025), the special summer
                      invitational 〈Put It in the Coffin〉 (Space Second View, 2025), the 18th
                      Gwanghwamun International Art Festival Asian Contemporary Art Young Artists
                      exhibition (Sejong Museum of Art, 2023), the 〈Kiptique〉 series, Form 2022
                      (CICA Museum), and ASYAAF (Hongik University Museum of Contemporary Art,
                      2022).
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      신연진은 일상의 풍경과 미세한 정서를 회화의 콜라주 언어로 옮겨 온 작가다.
                      홍익대학교 회화과를 졸업하고 같은 대학원 회화과를 마쳤다.
                    </p>
                    <p>
                      그의 작업은 평범한 것들 — 일상의 질감과 풍경, 그 안의 조용한 감정 — 을 모아
                      화면 위에 조각조각 겹쳐 쌓는다. 그에게 콜라주는 찾아낸 재료를 오려 붙이는
                      기법이 아니라 하나의 보는 방식이다 — 하루를 조각으로 나누어, 빛나는 무언가로
                      다시 잇는 일.
                    </p>
                    <p>
                      2025년에는 노팅힐라운지(감일)에서 〈킵티크 기획 개인전〉을, 강북삼성병원
                      나눔존에서 〈일상적인 것들의 꼴라주〉를 열었다. 앞서 2020년에는 젊은 작가 공간
                      지원전 공모에 당선되어 유나이티드 갤러리에서 부스 개인전을 열었고, 2002년
                      관훈갤러리에서 첫 개인전을 가졌다.
                    </p>
                    <p>
                      그는 다수의 기획전과 단체전에 참여해 왔다 — 강동 청년미술인 지원 공모 〈모든
                      것이 빛나는 작품전〉(강동아트센터 아트랑, 2025), 여름특별초대전 〈내관에
                      넣어줘〉(스페이스 세컨뷰, 2025), 제18회 광화문 국제아트페스티벌 아시아현대미술
                      청년작가전(세종미술관, 2023), 〈킵티크〉 연작, Form 2022(CICA 미술관),
                      ASYAAF(홍익대학교 현대미술관, 2022) 등.
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
                        {isEnglish ? 'Painterly collage' : '회화의 콜라주'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The everyday broken into fragments and layered piece by piece into a single glimmering surface — collage as a way of seeing rather than a technique.'
                          : '일상을 조각으로 나누어 조각조각 겹쳐 쌓은 화면 — 기법이 아니라 하나의 보는 방식으로서의 콜라주.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Everyday scenes, subtle feeling'
                          : '일상의 풍경과 미세한 정서'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A delicate, warm attention to the ordinary — the quiet emotions of daily life held with care rather than dramatized.'
                          : '평범한 것을 향한 섬세하고 따뜻한 주목 — 극화하지 않고 조심스레 품는 일상의 조용한 정서.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The 〈Kiptique〉 series' : '〈킵티크〉 연작'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'An ongoing body of work — the everyday gathered, layered, and made to shine across exhibitions and editions.'
                          : '꾸준히 이어 온 작업 — 일상을 모아 겹치고, 여러 전시와 회차에 걸쳐 빛나게 하는 연작.'}
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
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition at Kwanhoon Gallery, Seoul.'
                        : '관훈갤러리(서울)에서 1회 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Wins the Young Artist Space Support open call; holds a booth solo exhibition at United Gallery, Seoul.'
                        : '젊은 작가 공간지원전 공모 당선 — 유나이티드 갤러리(서울) 부스 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions Form 2022 (CICA Museum, Gimpo) and ASYAAF (Hongik University Museum of Contemporary Art, Seoul).'
                        : '단체전 Form 2022(CICA 미술관, 김포)·ASYAAF(홍익대학교 현대미술관, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '18th Gwanghwamun International Art Festival — Asian Contemporary Art Young Artists exhibition (Sejong Museum of Art); 〈Kiptique #0001·#0002〉 (Dada Project · Amidi Gallery, Seoul).'
                        : '제18회 광화문 국제아트페스티벌 아시아현대미술 청년작가전(세종미술관); 〈킵티크 #0001·#0002〉(다다프로젝트·아미디갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 〈Our Moment — 35 Landscapes〉, part of the Gangdong Young Artist program (Gangdong Arts Center Art Rang, Seoul).'
                        : '강동 청년미술인 〈#우리의 순간 35개의 풍경展〉(강동아트센터 아트랑, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Kiptique〉 (Notting Hill Lounge, Gamil) and 〈A Collage of Everyday Things〉 (Nanum Zone, Kangbuk Samsung Hospital); group exhibitions 〈An Exhibition Where Everything Shines〉 (Gangdong Arts Center Art Rang) and 〈Put It in the Coffin〉 (Space Second View, Seoul).'
                        : '개인전 〈킵티크 기획 개인전〉(노팅힐라운지, 감일)·〈일상적인 것들의 꼴라주〉(강북삼성병원 나눔존); 단체전 〈모든 것이 빛나는 작품전〉(강동아트센터 아트랑)·〈내관에 넣어줘〉(스페이스 세컨뷰, 서울).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & education' : '주요 전시 및 학력'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Education: graduated from the Dept. of Painting, Hongik University, and completed graduate studies in painting at the same university.'
                        : '학력: 홍익대학교 회화과 졸업 및 동 대학원 회화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈Kiptique〉 (Notting Hill Lounge, Gamil, 2025), 〈A Collage of Everyday Things〉 (Nanum Zone, Kangbuk Samsung Hospital, 2025), 〈Young Artist Space Support〉 booth solo (United Gallery, 2020), 1st solo exhibition (Kwanhoon Gallery, 2002).'
                        : '개인전: 〈킵티크 기획 개인전〉(노팅힐라운지, 감일, 2025), 〈일상적인 것들의 꼴라주〉(강북삼성병원 나눔존, 2025), 〈젊은 작가 공간지원전〉 부스 개인전(유나이티드 갤러리, 2020), 1회 개인전(관훈갤러리, 2002).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈An Exhibition Where Everything Shines〉 (Gangdong Arts Center Art Rang, 2025), 〈Put It in the Coffin〉 (Space Second View, 2025), the 18th Gwanghwamun International Art Festival Young Artists exhibition (Sejong Museum of Art, 2023), Form 2022 (CICA Museum), ASYAAF (Hongik University Museum of Contemporary Art, 2022), and many others.'
                        : '단체전: 〈모든 것이 빛나는 작품전〉(강동아트센터 아트랑, 2025), 〈내관에 넣어줘〉(스페이스 세컨뷰, 2025), 제18회 광화문 국제아트페스티벌 청년작가전(세종미술관, 2023), Form 2022(CICA 미술관), ASYAAF(홍익대학교 현대미술관, 2022) 외 다수.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ongoing 〈Kiptique〉 series, presented across exhibitions and editions.'
                        : '여러 전시와 회차에 걸쳐 이어지는 〈킵티크〉 연작.'}
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
                  <span className="text-charcoal-deep">on the everyday and its collage</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">일상과 그 꼴라주에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 일상을 보는 방식 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'A way of seeing the everyday' : '일상을 보는 방식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The everyday is the easiest thing to overlook. A room, a window, a passing
                        hour — most of life is made of scenes too ordinary to notice. Sin
                        Yeonjin&apos;s work begins by refusing that habit of inattention. She treats
                        the daily and the small as worthy of a painter&apos;s full regard.
                      </p>
                      <p>
                        What she gathers is not only what is seen but what is felt: the subtle
                        emotion that attaches to an ordinary moment, faint enough to slip past
                        words. Her canvases hold that feeling without enlarging it — a delicate,
                        warm attention that keeps the everyday at its own quiet scale.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        일상은 가장 쉽게 지나치는 것이다. 방 하나, 창문 하나, 흘러가는 한 시간 —
                        삶의 대부분은 알아채기엔 너무 평범한 장면들로 이루어져 있다. 신연진의 작업은
                        그 무심함의 습관을 거부하는 데서 시작한다. 그는 일상적이고 작은 것을 화가의
                        온전한 주목을 받을 만한 것으로 대한다.
                      </p>
                      <p>
                        그가 모으는 것은 보이는 것만이 아니라 느껴지는 것이다 — 평범한 순간에 깃든
                        미세한 정서, 말로 붙들기엔 너무 옅은 감정. 그의 화면은 그 감정을 부풀리지
                        않고 품는다 — 일상을 그 자체의 조용한 크기로 두는, 섬세하고 따뜻한 주목.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 콜라주라는 언어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'Collage as a language' : '콜라주라는 언어'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In her hands, collage is not a matter of cut paper and glue but a grammar of
                        painting. The day arrives in fragments — glances, surfaces, half-remembered
                        textures — and the canvas is where those fragments are layered until they
                        cohere. To paint, here, is to assemble.
                      </p>
                      <p>
                        The fragments do not simply add up. Laid piece over piece, they begin to
                        glimmer — the ordinary, reassembled, turning into something that holds
                        light. It is in this layering that the work finds its form: a surface built
                        from the small parts of a life, made to shine without losing the modesty of
                        where it came from.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 손에서 콜라주는 오린 종이와 풀의 문제가 아니라 회화의 문법이다. 하루는
                        조각으로 도착한다 — 스치는 시선, 표면, 절반쯤 기억나는 질감 — 그리고 화면은
                        그 조각들이 하나로 엮일 때까지 겹쳐지는 자리다. 여기서 그린다는 것은 잇는
                        일이다.
                      </p>
                      <p>
                        조각들은 단순히 더해지지 않는다. 조각 위에 조각이 놓이며, 그것들은 빛나기
                        시작한다 — 다시 모인 일상이 빛을 머금은 무언가가 된다. 작업이 그 꼴을 찾는
                        것은 바로 이 겹침 속에서다 — 한 삶의 작은 부분들로 지어진 화면이, 그 출처의
                        수수함을 잃지 않은 채 빛나도록.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 킵티크, 빛나는 일상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The 〈Kiptique〉 series — the everyday that shines'
                    : '〈킵티크〉 연작 — 빛나는 일상'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈Kiptique〉 series has run as a steady thread through her recent years
                        — first as group presentations in 2023, then as a solo exhibition in 2025.
                        It is less a single project than an ongoing practice, returned to again and
                        again, each iteration adding to the same patient inquiry.
                      </p>
                      <p>
                        Alongside it, 〈A Collage of Everyday Things〉 names her method plainly.
                        Shown in the Nanum Zone of Kangbuk Samsung Hospital, the work carried its
                        quiet attention into a place where people pass through care and waiting — a
                        fitting home for paintings made from the small parts of ordinary days.
                      </p>
                      <p>
                        Across these exhibitions, the same conviction holds: that the everyday,
                        gathered with care and layered with patience, is worth keeping — and that a
                        painting can make it shine.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈킵티크〉 연작은 최근 몇 해 동안 꾸준한 흐름으로 이어져 왔다 — 2023년에는
                        단체전의 출품으로, 2025년에는 개인전으로. 그것은 하나의 단발
                        프로젝트라기보다 거듭 돌아가는 작업이다. 회차마다 같은 인내의 탐구에 한 겹씩
                        더해진다.
                      </p>
                      <p>
                        그와 나란히, 〈일상적인 것들의 꼴라주〉는 그의 방법을 곧장 이름 붙인다. 강북
                        삼성병원 나눔존에서 선보인 이 작업은 그 조용한 주목을, 사람들이 돌봄과
                        기다림 사이를 지나가는 자리로 가져갔다 — 평범한 하루의 작은 부분들로 지은
                        그림이 놓이기에 어울리는 자리.
                      </p>
                      <p>
                        이 전시들을 가로질러 같은 믿음이 이어진다 — 정성껏 모으고 인내로 겹친 일상은
                        지킬 만한 것이며, 한 점의 그림이 그것을 빛나게 할 수 있다는 믿음.
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
                      From a first solo exhibition to the ongoing 〈Kiptique〉 series, Sin
                      Yeonjin&apos;s work has pursued a single thing: to gather the fragments of an
                      ordinary day and layer them into something that shines. She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those who keep such quiet attention might do their work without the
                      weight of financial exclusion.
                    </>
                  ) : (
                    <>
                      첫 개인전에서 이어지는 〈킵티크〉 연작까지, 신연진의 작업은 한 가지를 추구해
                      왔다 — 평범한 하루의 조각을 모아, 빛나는 무언가로 겹쳐 쌓는 일. 그는 씨앗페에
                      이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 이런
                      조용한 주목을 이어가는 이들이 금융 차별의 무게 없이 일할 수 있도록.
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
                COLLAGE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Sin Yeonjin</span>
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
                    Sin Yeonjin joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    신연진 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SIN_YEONJIN_PATH}
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
