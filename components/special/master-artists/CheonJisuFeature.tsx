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

// 거장 작가 feature는 작가 페이지(/artworks/artist/천지수)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHEON_JISU_PATH = `/artworks/artist/${encodeURIComponent('천지수')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isCheonJisuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '천지수' ||
    n === 'cheon jisu' ||
    n === 'cheon ji-su' ||
    n.replace(/[\s-]+/g, '') === 'cheonjisu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '천지수 — 책 읽는 아틀리에, 그림과 글 사이',
    description:
      '회화·삽화·그림책 서평을 가로지르는 작가 천지수. 〈Giggle〉(2001)부터 〈도서관 환타지〉(2025)까지 국내외 개인·기획전을 이어 왔고, 2003년 이태리 지오반니 뻬리꼬네 전국미술대전 대상을 수상했다. 그림서평집 《책 읽는 아틀리에》(2021)의 작가, 천지수의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '천지수 — 회화·삽화·그림책 서평을 가로지르는 작가. 이야기와 놀이, 생명과 도서관 환타지의 따뜻한 화면, 그림과 글이 만나는 자리.',
    ogAlt: '천지수 대표 작품',
    twitterTitle: '천지수',
    twitterDescription: '그림과 글 사이 — 책 읽는 아틀리에의 작가 천지수',
    keywords:
      '천지수 작가, 책 읽는 아틀리에, 그림서평, 삽화, 회화, 그림책, 도서관 환타지, 씨앗페 온라인',
  },
  en: {
    title: 'Cheon Jisu — The Reading Atelier, Between Picture and Word',
    description:
      'Selected works by Cheon Jisu, an artist moving across painting, illustration, and picture-book reviews. From 〈Giggle〉 (2001) to 〈Library Fantasy〉 (2025), she has held solo and invitational exhibitions at home and abroad, and won the Primo Premio at Italy’s Giovanni Pericone National Art Competition in 2003. Author of the illustrated review collection 《The Reading Atelier》 (2021). View and collect her works at SAF Online.',
    ogDescription:
      'Cheon Jisu — an artist across painting, illustration, and picture-book reviews. Warm canvases of story and play, life and library fantasy, where picture meets word.',
    ogAlt: 'Cheon Jisu — featured work',
    twitterTitle: 'Cheon Jisu',
    twitterDescription: 'Between picture and word — Cheon Jisu of the Reading Atelier',
    keywords:
      'Cheon Jisu artist, reading atelier, picture-book review, illustration, painting, Korean contemporary art',
  },
} as const;

export async function buildCheonJisuMetadata({
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
  const pageUrl = buildLocaleUrl(CHEON_JISU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('천지수');
  const artwork = allArtworks.find((a) => isCheonJisuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Cheon Jisu`
      : `${artwork.title} — 천지수`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHEON_JISU_PATH, locale, true),
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

export default async function CheonJisuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHEON_JISU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('천지수');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isCheonJisuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Cheon Jisu' : '천지수', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHEON_JISU_PATH}#person-cheon-jisu`,
    name: isEnglish ? 'Cheon Jisu' : '천지수',
    alternateName: isEnglish ? '천지수' : 'Cheon Jisu',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Cheon Jisu is a mid-career artist working across painting, illustration, and picture-book reviews. From 〈Giggle〉 (2001) to 〈Library Fantasy〉 (2025) she has held solo and invitational exhibitions at home and abroad, and authored the illustrated review collection 《The Reading Atelier》 (2021).'
      : '천지수는 회화·삽화·그림책 서평을 가로지르는 중견 작가로, 〈Giggle〉(2001)부터 〈도서관 환타지〉(2025)까지 국내외 개인·기획전을 이어 왔으며 그림서평집 《책 읽는 아틀리에》(2021)를 펴냈습니다.',
    knowsAbout: ['Painting', 'Illustration', 'Picture-book review', 'Contemporary Korean art'],
    award: isEnglish
      ? 'Primo Premio, 4th Giovanni Pericone National Art Competition, Italy (2003)'
      : '제4회 지오반니 뻬리꼬네 전국미술대전 대상(Primo Premio), 이태리 (2003)',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Cheon Jisu — SAF Online' : '천지수 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Cheon Jisu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 천지수 작품들을 소개합니다.',
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

          {/* Open-book / page-edge 모티프 — 책장의 가장자리 같은 수직선 */}
          <div className="absolute top-0 left-1/2 h-full w-px bg-white/15" />
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 right-10 h-full w-px bg-primary/25" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Cheon Jisu · painting & illustration' : '천지수 · 회화·삽화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A reading atelier,
                  <br />
                  <span className="text-primary-soft">between picture and word</span>
                </>
              ) : (
                <>
                  책 읽는 아틀리에,
                  <br />
                  <span className="text-primary-soft">그림과 글 사이</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Story and play, life and library fantasy.</span>
                  <span className="mt-2 block">
                    Painting, illustration, and the review of picture books — held in one place.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">이야기와 놀이, 생명과 도서관 환타지.</span>
                  <span className="mt-2 block">
                    회화와 삽화, 그리고 그림책 서평이 한자리에서 만난다.
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
                    Across painting and the page —<br />
                    <span className="text-primary-strong">an artist who reads as she paints</span>
                  </>
                ) : (
                  <>
                    회화와 책 사이에서 —<br />
                    <span className="text-primary-strong">읽으며 그리는 작가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Cheon Jisu is a mid-career artist whose practice runs across painting,
                      illustration, and the writing of picture-book reviews. From her first solo
                      exhibition 〈Giggle〉 at Moro Gallery, Seoul in 2001 to 〈Library Fantasy〉 at
                      The Space Gallery, Osan in 2025, she has held{' '}
                      <strong className="font-bold text-charcoal-deep">
                        nine solo and invitational exhibitions
                      </strong>
                      .
                    </p>
                    <p>
                      Her work has travelled beyond Korea. She showed 〈A Midsummer Night&apos;s
                      Dream〉 at the Embassy of the Republic of Korea in Rome, Italy in 2005, and
                      held a two-person exhibition at Guga Museum in Fukuoka, Japan in 2018. In 2003
                      she received the{' '}
                      <strong className="font-bold text-charcoal">
                        Primo Premio (Grand Prize)
                      </strong>{' '}
                      at the Giovanni Pericone National Art Competition in Italy.
                    </p>
                    <p>
                      In 2008 she took part in the restoration of the rock paintings at Serengeti
                      National Park, Tanzania — a UNESCO-designated site. In 2021 she published the
                      illustrated review collection{' '}
                      <strong className="font-bold text-charcoal-deep">
                        《The Reading Atelier》
                      </strong>{' '}
                      (Imagine1000), drawing together the two threads of her work: the picture and
                      the word.
                    </p>
                    <p>
                      Her paintings are held in the collections of the Embassy of the Republic of
                      Korea in Italy, the Rotary Club of Fiuggi in Italy, and the Asia Publication
                      Culture &amp; Information Center, among others. The warm, narrative register
                      of story, play, life, and library fantasy is the place where her painting and
                      her reading meet.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      천지수는 회화와 삽화, 그리고 그림책 서평을 가로지르는 중견 작가다. 2001년 서울
                      모로갤러리의 첫 개인전 〈Giggle〉부터 2025년 오산 더스페이스갤러리의 〈도서관
                      환타지〉까지,{' '}
                      <strong className="font-bold text-charcoal-deep">
                        아홉 차례의 개인·기획초대전
                      </strong>
                      을 이어 왔다.
                    </p>
                    <p>
                      그의 작업은 국경을 넘나들었다. 2005년 이태리 로마의 주이태리 한국대사관에서
                      〈한 여름밤의 꿈〉을 선보였고, 2018년에는 일본 후쿠오카 구가 미술관에서
                      2인전을 열었다. 2003년에는 이태리{' '}
                      <strong className="font-bold text-charcoal">
                        지오반니 뻬리꼬네 전국미술대전에서 대상(Primo Premio)
                      </strong>
                      을 수상했다.
                    </p>
                    <p>
                      2008년에는 UNESCO 지정 탄자니아 세렝게티 국립공원의 암석벽화 복원에 참여했다.
                      2021년에는 그림서평집{' '}
                      <strong className="font-bold text-charcoal-deep">《책 읽는 아틀리에》</strong>
                      (천년의 상상)를 출간하며, 그림과 글이라는 자신의 두 갈래 작업을 한자리에
                      모았다.
                    </p>
                    <p>
                      그의 작품은 주이탈리아 한국대사관, 이탈리아 로터리클럽 Fiuggi,
                      아시아출판문화정보센터 등에 소장되어 있다. 이야기와 놀이, 생명과 도서관
                      환타지의 따뜻하고 서사적인 음역은, 그의 회화와 독서가 만나는 자리다.
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
                        {isEnglish ? 'Between picture and word' : '그림과 글 사이'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Painting, illustration, and picture-book reviews held together — a practice where reading and drawing are a single gesture.'
                          : '회화·삽화·그림책 서평이 한자리에 놓인다. 읽기와 그리기가 하나의 동작이 되는 작업.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Story, play, and life' : '이야기·놀이·생명'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From 〈Giggle〉 and 〈Children at Play〉 to 〈The Shape of Life〉 — a warm, narrative register of childhood, play, and living things.'
                          : '〈Giggle〉·〈아이들 놀이〉에서 〈생명의 모양〉까지, 유년과 놀이와 살아 있는 것들의 따뜻한 서사.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Library fantasy' : '도서관 환타지'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In 〈Library Fantasy〉 (2025) the book itself becomes a world — shelves and pages opening into imagined space.'
                          : '〈도서관 환타지〉(2025)에서 책 그 자체가 하나의 세계가 된다. 서가와 페이지가 상상의 공간으로 열린다.'}
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
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Reading Atelier》 (Gallery Yeongtong, Suwon); 《The Shape of Life》 (Gallery Jijihyang, Paju); 《Library Fantasy》 (The Space Gallery, Osan)'
                        : '《책 읽는 아틀리에》(수원 갤러리 영통); 《생명의 모양》(파주 갤러리지지향); 《도서관 환타지》(오산 더스페이스갤러리)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Key That Opens and Enters Me》 (Gallery The Way, Chuncheon)'
                        : '《나를 열고 들어가는 열쇠》(춘천 갤러리더웨이)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Reading Atelier》 publication-commemoration exhibition (Forest of Wisdom, Paju)'
                        : '《책읽는 아틀리에》 출간기념전 (파주 지혜의 숲)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Children at Play》 (Art Space H, Seoul)'
                        : '《아이들 놀이》(서울 아트스페이스 H)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "《A Midsummer Night's Dream》 (Embassy of the Republic of Korea, Rome)"
                        : '《한 여름밤의 꿈》(주이태리 한국대사관, 로마)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Giggle》 (Moro Gallery, Seoul); 《Time & Space》 (Artist Guild Space gallery, Paris)'
                        : '《Giggle》(서울 Moro갤러리); 《Time & Space》(파리 Artist Guild Space gallery)'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Awards, writing & collections' : '수상·서평·소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Two-person exhibition 《A Way to Make Energy for Living》 (Guga Museum, Fukuoka, Japan, 2018)'
                        : '2인전 《삶을 위한 에너지를 만드는 방법》 (일본 후쿠오카 구가 미술관, 2018)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Primo Premio, 4th Giovanni Pericone National Art Competition, Italy (2003); Special Selection, University Art Exhibition, Honam University (1997)'
                        : '수상: 제4회 지오반니 뻬리꼬네 전국미술대전 대상(Primo Premio), 이태리 (2003); 대학미전 특선, 호남대학교 (1997)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Mural restoration: rock paintings of Serengeti National Park, Tanzania — a UNESCO-designated site (2008)'
                        : '벽화복원: UNESCO 지정 탄자니아 세렝게티 국립공원 암석벽화 복원 (2008)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Picture-book reviews: 〈Cheon Jisu's Reading Atelier〉 in Sports Kyunghyang (2016–2020); 〈Picture Books Cheon Jisu Read〉 in Chaekirout, Culture News, and MHN Sports (2023– )"
                        : '그림서평: 스포츠경향 〈천지수의 책 읽는 아틀리에〉 (2016–2020); 책키라웃·문화뉴스·MHN스포츠 〈천지수가 읽은 그림책〉 (2023– )'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Embassy of the Republic of Korea in Italy, Korean Catholic Church in Rome, Rotary Club of Fiuggi (Italy), Asia Publication Culture & Information Center, Korea Culture Content Research Institute'
                        : '소장: 주이탈리아 한국대사관, 주이탈리아 로마 한인성당, 이탈리아 로터리클럽 Fiuggi, 아시아출판문화정보센터, 한문화콘텐츠연구소'}
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
                  <span className="text-charcoal-deep">on the picture, the page, and play</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">그림과 책장, 그리고 놀이에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 그림과 글 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Between picture and word — a practice that reads'
                    : '그림과 글 사이 — 읽는 작업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most painters keep the studio and the desk apart. Cheon Jisu does not.
                        Across her career, painting, illustration, and the reading of picture books
                        have run side by side, each feeding the other. To read a picture book is
                        already to look at images; to write about one is to translate looking into
                        language. Her work lives in the space between those two acts.
                      </p>
                      <p>
                        That doubled practice took public form in her picture-book reviews — first
                        in the 〈Cheon Jisu&apos;s Reading Atelier〉 column in Sports Kyunghyang
                        from 2016 to 2020, and later in 〈Picture Books Cheon Jisu Read〉 across
                        several outlets from 2023. The reviewer and the painter are the same person,
                        looking with the same eye.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대개의 화가는 작업실과 책상을 떼어 놓는다. 천지수는 그러지 않는다. 그의 이력
                        내내 회화와 삽화, 그리고 그림책 읽기는 나란히 흘러왔고, 서로를 먹여 왔다.
                        그림책을 읽는 것은 이미 이미지를 보는 일이고, 그것에 관해 쓰는 것은 보는
                        일을 언어로 옮기는 일이다. 그의 작업은 그 두 행위 사이에 산다.
                      </p>
                      <p>
                        그 이중의 작업은 그림서평으로 공적인 형태를 얻었다 — 2016년부터 2020년까지
                        스포츠경향에 연재한 〈천지수의 책 읽는 아틀리에〉, 그리고 2023년부터 여러
                        매체에 실린 〈천지수가 읽은 그림책〉. 서평을 쓰는 이와 그림을 그리는 이는
                        같은 사람, 같은 눈으로 본다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 이야기·놀이·생명 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Story, play, and life — the warmth of the surface'
                    : '이야기·놀이·생명 — 화면의 온기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The titles trace a single sensibility. 〈Giggle〉 (2001), her first solo
                        exhibition, names a sound before it names a subject — laughter, play, the
                        small joy of children. 〈Children at Play〉 (2010) and, much later,{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈The Shape of Life〉
                        </strong>{' '}
                        (2025) keep returning to the same warm ground: living things, in motion, at
                        ease.
                      </p>
                      <p>
                        It is a deliberately gentle register, and a difficult one to sustain. Warmth
                        without sentimentality asks for precision — in colour, in the weight of a
                        line, in what is left out. Across two decades her surfaces have held that
                        balance, narrative without being illustrative in the lesser sense, inviting
                        without being thin.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        제목들은 하나의 감수성을 따라간다. 첫 개인전 〈Giggle〉(2001)은 주제 이전에
                        소리를 먼저 부른다 — 웃음, 놀이, 아이들의 작은 기쁨. 〈아이들 놀이〉(2010),
                        그리고 한참 뒤의{' '}
                        <strong className="font-bold text-charcoal-deep">〈생명의 모양〉</strong>
                        (2025)은 같은 따뜻한 바탕으로 거듭 돌아온다 — 움직이는, 편안한, 살아 있는
                        것들.
                      </p>
                      <p>
                        그것은 의도적으로 다정한 음역이고, 지켜 내기 어려운 음역이다. 감상에 빠지지
                        않는 따뜻함은 정밀함을 요구한다 — 색에서, 선의 무게에서, 덜어 낸 것에서.
                        그는 두 해 십 년에 걸쳐 그 균형을 지켜 왔다. 얄팍한 의미의 삽화로 떨어지지
                        않는 서사, 묽지 않으면서도 다정한 화면.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 도서관 환타지 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Library fantasy — when the book becomes a world'
                    : '도서관 환타지 — 책이 세계가 될 때'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2021 Cheon Jisu published{' '}
                        <strong className="font-bold text-charcoal-deep">
                          《The Reading Atelier》
                        </strong>{' '}
                        (Imagine1000), gathering her picture-book reviews into a single volume. The
                        book is not a sideline to the painting; it is the painting&apos;s other
                        half, the place where looking becomes a record.
                      </p>
                      <p>
                        Her recent exhibitions follow that thread to its conclusion. 〈Library
                        Fantasy〉, shown at The Space Gallery in Osan in 2025, lets the book itself
                        become a world: shelves and pages opening into imagined space, the place
                        where one reads turned into a place one can enter. The atelier and the
                        library, by now, are the same room.
                      </p>
                      <p>
                        Beyond Korea, her work has crossed borders — to Rome, to Fukuoka, to a
                        UNESCO-designated park in Tanzania where she helped restore ancient rock
                        paintings. The thread that holds it together is steady: an attention to
                        images as things that carry stories, and to stories as things worth keeping.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2021년, 천지수는{' '}
                        <strong className="font-bold text-charcoal-deep">
                          《책 읽는 아틀리에》
                        </strong>
                        (천년의 상상)를 출간하며 그림서평을 한 권으로 모았다. 그 책은 회화의
                        곁가지가 아니다. 회화의 다른 절반, 보는 일이 기록이 되는 자리다.
                      </p>
                      <p>
                        근작들은 그 실을 끝까지 따라간다. 2025년 오산 더스페이스갤러리에서 선보인
                        〈도서관 환타지〉는 책 그 자체를 하나의 세계로 만든다 — 서가와 페이지가
                        상상의 공간으로 열리고, 읽는 자리가 들어설 수 있는 장소가 된다. 이제
                        아틀리에와 도서관은 같은 방이다.
                      </p>
                      <p>
                        국경 너머로, 그의 작업은 경계를 넘었다 — 로마로, 후쿠오카로, 그리고 그가 옛
                        암석벽화 복원을 도왔던 UNESCO 지정 탄자니아의 한 국립공원으로. 그 모두를
                        붙드는 실은 한결같다. 이야기를 나르는 것으로서의 이미지에 대한 주의, 그리고
                        간직할 만한 것으로서의 이야기에 대한 주의.
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
                      From 〈Giggle〉 to 〈Library Fantasy〉, Cheon Jisu&apos;s work pursues a
                      single question: how do a picture and a word hold a story between them? She
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — offering her work so that those navigating financial exclusion
                      today might find a way through.
                    </>
                  ) : (
                    <>
                      〈Giggle〉에서 〈도서관 환타지〉까지, 천지수의 작업은 하나의 물음을 추구한다:
                      그림과 글은 어떻게 그 사이에 이야기를 담는가. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 오늘 금융 차별을
                      헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의 작품을 내놓는다.
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
                ATELIER
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Cheon Jisu</span>
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
                    Cheon Jisu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    천지수 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHEON_JISU_PATH}
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
