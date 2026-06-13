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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/김주희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_JUHUI_PATH = `/artworks/artist/${encodeURIComponent('김주희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimJuhuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김주희' ||
    n === 'kim ju-hui' ||
    n === 'kim juhui' ||
    n === 'kim ju-hee' ||
    n === 'kim juhee' ||
    n.replace(/[\s-]+/g, '') === 'kimjuhui' ||
    n.replace(/[\s-]+/g, '') === 'kimjuhee'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김주희 — 기억을 겹쳐 그리는 이미지 오버랩 회화',
    description:
      '잊지 못할 추억과 기억의 순간을 화면 위에 겹쳐 올리는 이미지 오버랩 회화의 중견 작가 김주희. 반복적인 중첩으로 기억은 파괴되지 않고 더 선명하게 되살아난다. 국립현대미술관 소장·서울시립미술관 SeMA 선정작가 김주희의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '기억을 겹쳐 그리는 이미지 오버랩 회화 — 반복적인 중첩으로 그리운 것들을 더 선명하게 되살리는 중견 작가 김주희.',
    ogAlt: '김주희 대표 작품',
    twitterTitle: '김주희',
    twitterDescription: '기억은 겹칠수록 선명해진다 — 이미지 오버랩 회화의 김주희',
    keywords:
      '김주희 작가, 이미지 오버랩, 회화, 기억, 중첩, 국립현대미술관 소장, SeMA 선정작가, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Juhee — Painting Memory Through Image Overlap',
    description:
      'Selected works by Kim Juhee, a mid-career Korean painter who layers unforgettable memories and remembered moments on a single surface through image overlap. In her work, repeated superimposition does not erase memory but makes it surface more vividly. A SeMA-selected artist with work in the MMCA collection. View and collect her works at SAF Online.',
    ogDescription:
      'Painting memory through image overlap — Kim Juhee layers remembered moments until what is longed for surfaces more vividly.',
    ogAlt: 'Kim Juhee — featured work',
    twitterTitle: 'Kim Juhee',
    twitterDescription: 'Memory grows sharper as it is layered — image-overlap painter Kim Juhee',
    keywords:
      'Kim Juhee artist, image overlap, Korean painting, memory, superimposition, MMCA collection, SeMA selected artist',
  },
} as const;

export async function buildKimJuhuiMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_JUHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김주희');
  const artwork = allArtworks.find((a) => isKimJuhuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Juhee`
      : `${artwork.title} — 김주희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_JUHUI_PATH, locale, true),
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

export default async function KimJuhuiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_JUHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김주희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimJuhuiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Juhee' : '김주희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_JUHUI_PATH}#person-kim-juhui`,
    name: isEnglish ? 'Kim Juhee' : '김주희',
    alternateName: isEnglish ? '김주희' : 'Kim Juhee',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Juhee is a mid-career Korean painter who overlaps unforgettable memories and remembered moments on a single surface, so that repeated superimposition makes memory surface more vividly rather than erasing it.'
      : '김주희는 잊지 못할 추억과 기억의 순간을 한 화면에 겹쳐 올리는 이미지 오버랩 회화의 중견 작가로, 반복적인 중첩을 통해 기억이 파괴되는 것이 아니라 더 선명하게 되살아나게 합니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Sungshin Women’s University, Dept. of Western Painting'
          : '성신여자대학교 서양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Hongik University Graduate School of Fine Arts, Dept. of Painting'
          : '홍익대학교 미술대학원 회화과',
      },
    ],
    knowsAbout: isEnglish
      ? ['Image overlap', 'Korean contemporary painting', 'Memory and superimposition']
      : ['이미지 오버랩', '회화', '기억과 중첩'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Juhee — SAF Online' : '김주희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Juhee from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김주희 작품들을 소개합니다.',
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

          {/* Overlapping translucent layers — 이미지 오버랩 모티프 */}
          <div className="absolute -left-10 top-1/4 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-primary/15 blur-2xl" />
          <div className="absolute right-0 top-1/2 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Juhee · Image Overlap' : '김주희 · 이미지 오버랩'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Memory grows sharper
                  <br />
                  <span className="text-primary-soft">as it is layered</span>
                </>
              ) : (
                <>
                  기억은 겹칠수록
                  <br />
                  <span className="text-primary-soft">선명해진다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She overlaps remembered moments on a single surface.
                  </span>
                  <span className="mt-2 block">
                    What is longed for is not erased by repetition, but revived.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">기억의 순간들을 한 화면에 겹쳐 올리다.</span>
                  <span className="mt-2 block">
                    그리운 것은 반복 속에서 사라지지 않고 되살아난다.
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
                    Overlapping images —<br />
                    <span className="text-primary-strong">memory revived, not erased</span>
                  </>
                ) : (
                  <>
                    겹쳐 올린 이미지 —<br />
                    <span className="text-primary-strong">지워지지 않고 되살아나는 기억</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Juhee is a mid-career Korean painter who graduated from the Department of
                      Western Painting at Sungshin Women&apos;s University and completed her
                      master&apos;s degree in the Department of Painting at the Hongik University
                      Graduate School of Fine Arts. She describes herself simply, as{' '}
                      <em>an image-overlap painter</em> — and the phrase is less a label than a
                      method.
                    </p>
                    <p>
                      Her premise is that to draw is to long for. In Korean, the verb{' '}
                      <em>geurida</em> (to draw) shares a root with <em>geuriwohada</em> (to long
                      for); the act of painting and the ache of missing something are,
                      etymologically, the same gesture. So she loves what she longs for, looks again
                      and again at what she wants to see, photographs it, and lays those images one
                      over another.
                    </p>
                    <p>
                      The result is a{' '}
                      <strong className="font-bold text-charcoal-deep">
                        repeated superimposition
                      </strong>{' '}
                      that joins unforgettable memories to entirely different spaces. As she puts
                      it,
                      <span className="not-italic">
                        {' '}
                        〈the image in the painting is not destroyed by being layered again and
                        again, but revives more vividly〉
                      </span>
                      . Memory, in her hands, behaves the opposite of how we fear it will: the more
                      it is overlaid, the sharper it becomes.
                    </p>
                    <p>
                      What accumulates on the surface is therefore not only the longing but its
                      counterweight — the desire of modern people, the things we want to possess,
                      and the regret over what slips away. Each overlap is a small argument against
                      disappearance: a way of holding, in pigment, what time would otherwise carry
                      off.
                    </p>
                    <p>
                      Across more than three decades of practice — thirty-six solo exhibitions and
                      some 185 group shows — that method has carried her work into the{' '}
                      <strong className="font-bold text-charcoal">
                        collection of the National Museum of Modern and Contemporary Art (MMCA)
                      </strong>
                      , and earned her selection as a SeMA artist by the Seoul Museum of Art and as
                      a KIMI Art selected artist. The image-overlap she names so plainly is, by now,
                      a sustained body of work.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김주희는 성신여자대학교 서양화과를 졸업하고 홍익대학교 미술대학원 회화과에서
                      석사 과정을 마친 중견 작가다. 그는 자신을 단순하게 소개한다 —{' '}
                      <em>이미지 오버랩 작가</em>라고. 그러나 그 한마디는 이름표라기보다 하나의
                      방법론이다.
                    </p>
                    <p>
                      그의 전제는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        그린다는 것은 곧 그리워하는 것
                      </strong>
                      이라는 데 있다. 〈그리다〉라는 말이 〈그리워하다〉에서 파생되었듯, 그림을
                      그리는 행위와 무언가를 그리워하는 마음은 어원적으로 같은 몸짓이다. 그래서 그는
                      그리운 것들을 사랑하고, 보고 싶은 것들을 보고 또 보고, 사진으로 찍어, 그
                      이미지들을 한 겹씩 겹쳐 올린다.
                    </p>
                    <p>
                      그 결과는 잊지 못할 추억과 전혀 다른 공간을 잇는{' '}
                      <strong className="font-bold text-charcoal-deep">반복적인 중첩</strong>이다.
                      작가의 말 그대로,{' '}
                      <span className="not-italic">
                        〈그림 속 이미지는 계속 중첩하여 파괴되는 것이 아니라 더 선명하게
                        되살아난다〉
                      </span>
                      . 그의 손에서 기억은 우리가 두려워하는 것과 정반대로 움직인다 — 겹칠수록 더
                      또렷해진다.
                    </p>
                    <p>
                      그러므로 화면에 쌓이는 것은 그리움만이 아니라 그 반대편의 무게이기도 하다 —
                      현대인들의 욕망, 가지고 싶은 것들, 그리고 사라져 버리는 것에 대한 아쉬움. 한
                      번의 중첩은 소멸에 맞서는 작은 항변이다 — 시간이 데려가 버릴 것들을 안료 속에
                      붙들어 두는 방식.
                    </p>
                    <p>
                      30년이 넘는 작업 — 개인전 총 36회와 약 185회의 단체전 — 을 거치며, 그 방법론은
                      그의 작업을{' '}
                      <strong className="font-bold text-charcoal">국립현대미술관 소장</strong>으로
                      이끌었고, 서울시립미술관 SeMA 선정작가와 키미아트 선정작가로 그를
                      자리매김했다. 그가 그토록 담담히 부르는 이미지 오버랩은, 이제 오래 축적된 한
                      세계다.
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
                        {isEnglish ? 'Image overlap' : '이미지 오버랩'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Photographs of remembered moments laid over one another and over entirely different spaces — repetition as the structure of the work.'
                          : '기억의 순간을 찍은 사진을 서로, 그리고 전혀 다른 공간 위에 겹쳐 올린다. 반복이 곧 작업의 구조다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'To draw is to long for' : '그리다 = 그리워하다'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The verb for drawing shares a root with longing — painting becomes the act of loving and returning to what one misses.'
                          : '〈그리다〉는 〈그리워하다〉에서 파생되었다. 그림은 그리운 것을 사랑하고 다시 찾는 행위가 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Desire and what slips away' : '욕망과 사라지는 것'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The layers hold modern desire, the things we want to possess, and the regret over what disappears — memory revived rather than lost.'
                          : '중첩된 화면은 현대인의 욕망, 가지고 싶은 것들, 사라져 버리는 것에 대한 아쉬움을 품는다. 기억은 잃히지 않고 되살아난다.'}
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
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Study' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'B.F.A., Dept. of Western Painting, Sungshin Women’s University; M.F.A., Dept. of Painting, Hongik University Graduate School of Fine Arts.'
                        : '성신여자대학교 서양화과 졸업, 홍익대학교 미술대학원 회화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Solo' : '개인전'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '36 solo exhibitions in total (12 at galleries) — Art Space H, Gallery Doo, Space Um, Gallery Tam, Alternative Space Noon, Gallerysohn, and others.'
                        : '개인전 총 36회(갤러리 12회) — 아트스페이스H, 갤러리두, 스페이스엄, 갤러리탐, 대안공간눈, 그림손갤러리 등.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Group' : '단체전'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '185 group exhibitions — Seoul Auction, Galleries Art Fair, the National Assembly, 63 Sky Art Museum, Sejong Center, and others.'
                        : '단체전 185회 — 서울옥션, 화랑미술제, 국회의사당, 63빌딩 스카이아트뮤지엄, 세종문화회관 등.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Fairs' : '아트페어'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Galleries Art Fair, Seoul Art Show, Busan International Art Fair, Art Asia, BANK Art Fair, Urban Break, Daegu Art Fair, ASYAAF, International Craft Art Fair, Lotte Hotel Art Fair, and more.'
                        : '화랑미술제, 서울아트쇼, 부산국제아트페어, 아트아시아, 뱅크아트페어, 얼반브레이크, 대구아트페어, 아시아프, 국제공예아트페어, 롯데호텔아트페어 등.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Honors' : '소장·선정'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Work in the MMCA collection; SeMA-selected artist (Seoul Museum of Art); KIMI Art selected artist; Maeul Misul (Village Art) Project selected artist; Naver Project Flower createrday4 selected artist.'
                        : '국립현대미술관 작품 소장, 서울시립미술관 SeMA 선정작가, 키미아트 선정작가, 마을미술 프로젝트 선정작가, 네이버 프로젝트꽃 createrday4 선정작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Collab' : '협업'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Carnival Pizza art-product collaboration.'
                        : '카니발피자 아트상품 콜라보레이션.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Collections & selections' : '소장 및 선정'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'National Museum of Modern and Contemporary Art (MMCA) — work held in the collection'
                        : '국립현대미술관 — 작품 소장'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul Museum of Art (SeMA) — selected artist'
                        : '서울시립미술관 SeMA — 선정작가'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'KIMI Art — selected artist' : '키미아트 — 선정작가'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Maeul Misul (Village Art) Project — selected artist'
                        : '마을미술 프로젝트 — 선정작가'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Naver Project Flower — createrday4 selected artist'
                        : '네이버 프로젝트꽃 — createrday4 선정작가'}
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
                  <span className="text-charcoal-deep">on overlap, longing, and what remains</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">중첩과 그리움, 그리고 남는 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 이미지 오버랩 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Image overlap — repetition as structure'
                    : '이미지 오버랩 — 구조로서의 반복'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The technical and conceptual core of Kim Juhee&apos;s work is a single
                        operation: overlap. She photographs the moments and places she cannot
                        forget, then lays those images one over another — and over entirely
                        different spaces. The painting is not a window onto one scene but a sediment
                        of several, pressed into the same surface.
                      </p>
                      <p>
                        What is striking is the direction the repetition takes. We tend to assume
                        that layering an image again and again would muddy it, wear it down, finally
                        erase it. In her work the opposite happens. As she states it plainly,{' '}
                        <span>
                          〈the image in the painting is not destroyed by being layered again and
                          again, but revives more vividly〉
                        </span>
                        . Superimposition becomes a means of intensification rather than loss.
                      </p>
                      <p>
                        That reversal is the quiet argument of the practice. Memory, treated as
                        something fragile that fades with handling, is here shown to behave like a
                        photograph developed slowly: the more passes it is given, the more clearly
                        it comes into view. Repetition is not erosion. It is how the image is kept.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김주희 작업의 기술적·개념적 핵심은 하나의 동작이다 — 겹침. 그는 잊지 못할
                        순간과 장소를 사진으로 찍고, 그 이미지들을 한 겹씩 서로, 그리고 전혀 다른
                        공간 위에 겹쳐 올린다. 그림은 하나의 장면을 향한 창이 아니라 여러 장면이
                        같은 화면에 눌려 쌓인 퇴적이다.
                      </p>
                      <p>
                        놀라운 것은 그 반복이 향하는 방향이다. 우리는 흔히 이미지를 거듭 겹치면
                        흐려지고, 닳고, 끝내 지워질 것이라 짐작한다. 그의 작업에서는 정반대의 일이
                        일어난다. 작가의 담담한 진술 그대로,{' '}
                        <span>
                          〈그림 속 이미지는 계속 중첩하여 파괴되는 것이 아니라 더 선명하게
                          되살아난다〉
                        </span>
                        . 중첩은 소멸이 아니라 강화의 수단이 된다.
                      </p>
                      <p>
                        그 역전이 이 작업의 조용한 주장이다. 다루면 다룰수록 바래는 연약한 것으로
                        여겨지던 기억이, 여기서는 천천히 인화되는 사진처럼 움직인다 — 손길이
                        거듭될수록 더 또렷하게 떠오른다. 반복은 마모가 아니다. 그것은 이미지를
                        간직하는 방식이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 그리다 = 그리워하다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'To draw, to long for — an etymology made into a method'
                    : '그리다, 그리워하다 — 방법이 된 어원'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Juhee builds her practice on a small linguistic fact. In Korean, the
                        verb <em>geurida</em> — to draw, to paint — and the verb{' '}
                        <em>geuriwohada</em> — to long for, to miss — share the same root. To draw
                        something, in this reading, is already to long for it. The drawing hand and
                        the missing heart are not two acts but one.
                      </p>
                      <p>
                        She takes the etymology literally and makes it a procedure. She loves the
                        things she longs for; she looks again and again at the things she wants to
                        see; she photographs them; and she overlaps those photographs into the work.
                        Longing, in her hands, is not a mood that hovers over the painting but the
                        engine that produces it — the reason a particular image is chosen, returned
                        to, and laid down once more.
                      </p>
                      <p>
                        This is why the overlap never feels mechanical. Each layer is a thing missed
                        enough to be looked at twice. The accumulation on the surface is, finally, a
                        record of attachment: a measure of how much, and how often, the painter
                        returned to what she could not let go.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김주희는 작은 언어적 사실 위에 작업을 세운다. 한국어에서 〈그리다〉 — 그리고
                        칠하다 — 와 〈그리워하다〉 — 보고 싶어 하다 — 는 같은 뿌리를 나눈다.
                        무언가를 그린다는 것은, 이 독법에서는 이미 그것을 그리워한다는 것이다.
                        그리는 손과 그리워하는 마음은 두 행위가 아니라 하나다.
                      </p>
                      <p>
                        그는 그 어원을 문자 그대로 받아들여 절차로 삼는다. 그리운 것들을 사랑하고,
                        보고 싶은 것들을 보고 또 보고, 그것을 사진으로 찍어, 그 사진들을 작업 속에
                        겹쳐 올린다. 그의 손에서 그리움은 그림 위를 맴도는 정서가 아니라 그림을
                        만들어 내는 동력이다 — 어떤 한 이미지가 선택되고, 다시 찾아지고, 한 번 더
                        놓이는 이유.
                      </p>
                      <p>
                        그래서 그 중첩은 결코 기계적으로 느껴지지 않는다. 한 겹 한 겹은 두 번
                        들여다볼 만큼 그리워한 것이다. 화면 위의 축적은 끝내 애착의 기록이다 —
                        작가가 차마 놓지 못한 것에게로 얼마나, 그리고 얼마나 자주 되돌아갔는지의
                        척도.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 욕망과 아쉬움 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Desire and regret — what the layers carry'
                    : '욕망과 아쉬움 — 중첩이 품는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        If the method is overlap and the motive is longing, the content is something
                        more ambivalent. What gathers on the surface, the artist says, includes the
                        desire of modern people, the things we want to possess, and the regret over
                        what slips away. The work is not only tender. It holds appetite and loss in
                        the same frame.
                      </p>
                      <p>
                        This is what keeps the paintings from nostalgia in the simple sense. To
                        overlap a remembered image is also to confront how much we wanted it, and
                        how little of it we could keep. The layers register both the reaching and
                        the letting go — desire pressed against the fact of disappearance, neither
                        one allowed to cancel the other.
                      </p>
                      <p>
                        And yet the final note is not defeat. Because the image revives rather than
                        dies under repetition, the work proposes a modest consolation: what we long
                        for is not lost simply because it has passed. It settles into us, changes,
                        and can be brought back to the surface — layer by layer, looked at long
                        enough to be seen again.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        방법이 겹침이고 동기가 그리움이라면, 내용은 좀 더 양가적이다. 화면에 모이는
                        것에는, 작가의 말대로, 현대인들의 욕망과 가지고 싶은 것들, 그리고 사라져
                        버리는 것에 대한 아쉬움이 함께 담긴다. 작업은 다정하기만 한 것이 아니다.
                        그것은 갈망과 상실을 같은 화면 안에 품는다.
                      </p>
                      <p>
                        바로 이 점이 그림을 단순한 향수로부터 지켜 낸다. 기억된 이미지를 겹친다는
                        것은, 우리가 그것을 얼마나 원했고 또 얼마나 적게 간직할 수 있었는지를
                        마주하는 일이기도 하다. 중첩은 뻗어 나감과 놓아 보냄을 함께 새긴다 — 욕망이
                        소멸의 사실에 맞대어진 채, 어느 한쪽도 다른 쪽을 지우지 못한다.
                      </p>
                      <p>
                        그럼에도 마지막 음은 패배가 아니다. 이미지가 반복 속에서 죽는 대신
                        되살아나기에, 작업은 소박한 위안을 건넨다 — 그리운 것은 지나갔다는
                        이유만으로 잃히지 않는다. 그것은 우리 안에 가라앉고, 변하고, 다시 표면으로
                        끌어올려질 수 있다 — 한 겹 한 겹, 다시 보일 만큼 충분히 오래 응시될 때.
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
                      Across thirty-six solo exhibitions and a body of work that has entered the
                      MMCA collection, Kim Juhee has pursued a single, patient question: how does
                      one keep what is longed for without letting it fade? Her answer, built layer
                      by layer, is an image-overlap practice in which memory grows sharper the more
                      it is laid down. She joins this campaign not as a subject of its cause but as
                      a fellow artist in solidarity — so that those who come after might work with a
                      little less of the weight that financial exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      36회의 개인전과 국립현대미술관 소장에 이른 작업을 통해, 김주희는 하나의 차분한
                      물음을 추구해 왔다 — 그리운 것을 바래지 않게 하면서 어떻게 간직할 것인가. 한
                      겹 한 겹 쌓아 올린 그 대답이, 겹칠수록 기억이 선명해지는 이미지 오버랩의
                      작업이다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                      연대자로서 함께한다 — 다음 세대의 예술인들이 한국 예술인에게 지워진 금융
                      차별의 무게를 조금이라도 덜 짊어진 채 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Juhee</span>
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
                    Kim Juhee joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김주희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_JUHUI_PATH}
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
