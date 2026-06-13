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

// 거장 작가 feature는 작가 페이지(/artworks/artist/리호)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const RIHO_PATH = `/artworks/artist/${encodeURIComponent('리호')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isRihoArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === '리호' || n === 'riho';
};

const PAGE_COPY = {
  ko: {
    title: '리호 — 보이지 않는 것을 그리는 동양화',
    description:
      '동양화의 매체적 가능성을 신진의 시선으로 확장하는 중견 작가 리호. 성신여대 동양화과를 졸업하고 홍익대 대학원에서 석사·박사과정을 밟으며, 개인전 〈보이지 않는 프로젝트〉를 비롯해 루브르 카루젤(파리)부터 부산까지 누벼 온 젊은 동양화. 리호의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '리호 — 동양화의 매체를 확장하다. 보이지 않는 것을 그리는 프로젝트로 전통 매체의 경계를 사색적으로 밀어붙이는 중견 동양화 작가.',
    ogAlt: '리호 대표 작품',
    twitterTitle: '리호',
    twitterDescription: '보이지 않는 것을 그린다 — 동양화의 매체를 확장하는 작가 리호',
    keywords: '리호 작가, 동양화, 보이지 않는 프로젝트, 한국화, 매체 실험, 씨앗페 온라인',
  },
  en: {
    title: 'Riho — Painting the Invisible in Korean Ink',
    description:
      'Selected works by Riho, a mid-career artist expanding the medial possibilities of Korean ink painting (dongyanghwa) through the eyes of a younger generation. A graduate of the Sungshin University Department of Oriental Painting, now pursuing doctoral studies at Hongik University, she has shown from the Carrousel du Louvre in Paris to Busan — from the solo exhibition “The Invisible Project” onward. View and collect her works at SAF Online.',
    ogDescription:
      'Riho — expanding the medium of Korean ink painting. A mid-career painter who pushes the boundaries of a traditional medium through a meditative project of painting the invisible.',
    ogAlt: 'Riho — featured work',
    twitterTitle: 'Riho',
    twitterDescription: 'Painting the invisible — Riho, expanding the medium of Korean ink',
    keywords:
      'Riho artist, Korean ink painting, dongyanghwa, The Invisible Project, medium experiment, contemporary Korean painting',
  },
} as const;

export async function buildRihoMetadata({
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
  const pageUrl = buildLocaleUrl(RIHO_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('리호');
  const artwork = allArtworks.find((a) => isRihoArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Riho`
      : `${artwork.title} — 리호`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(RIHO_PATH, locale, true),
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

export default async function RihoFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(RIHO_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('리호');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isRihoArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Riho' : '리호', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${RIHO_PATH}#person-riho`,
    name: isEnglish ? 'Riho' : '리호',
    alternateName: isEnglish ? '리호' : 'Riho',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Riho is a mid-career Korean artist who expands the medial possibilities of Korean ink painting (dongyanghwa) through the eyes of a younger generation, painting what is not seen.'
      : '리호는 동양화의 매체적 가능성을 신진의 시선으로 확장하며 보이지 않는 것을 그리는 중견 작가입니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Sungshin Women’s University, Dept. of Oriental Painting'
          : '성신여자대학교 동양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Hongik University Graduate School, Dept. of Oriental Painting'
          : '홍익대학교 일반대학원 동양화과',
      },
    ],
    knowsAbout: ['Korean ink painting', 'Dongyanghwa', 'Medium experimentation'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Riho — SAF Online' : '리호 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Riho from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 리호 작품들을 소개합니다.',
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

          {/* Faint ink-field strata — 보이지 않는 것을 그리는 동양화 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Riho · Korean ink painting' : '리호 · 동양화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Painting what is not seen
                  <br />
                  <span className="text-primary-soft">expands the medium itself</span>
                </>
              ) : (
                <>
                  보이지 않는 것을 그리는 일이
                  <br />
                  <span className="text-primary-soft">매체의 경계를 넓힌다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A younger gaze pressing against the limits of a traditional medium.
                  </span>
                  <span className="mt-2 block">
                    From the Carrousel du Louvre in Paris to Busan — a young Korean ink.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">신진의 시선으로 전통 매체의 한계를 밀어붙이다.</span>
                  <span className="mt-2 block">
                    루브르 카루젤(파리)부터 부산까지 누벼 온 젊은 동양화.
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
                    The invisible, made visible —<br />
                    <span className="text-primary-strong">a younger gaze on an old medium</span>
                  </>
                ) : (
                  <>
                    보이지 않는 것을 보이게 —<br />
                    <span className="text-primary-strong">오래된 매체를 향한 신진의 시선</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Riho is a mid-career artist who works in Korean ink painting (dongyanghwa) —
                      and who treats that long tradition not as a fixed inheritance but as an open
                      question. Where the medium is often framed by its history, she approaches it
                      through the eyes of a younger generation, asking what ink, paper, and pigment
                      can still be made to do.
                    </p>
                    <p>
                      She graduated from the Department of Oriental Painting at Sungshin
                      Women&apos;s University in 2020, completed a master&apos;s degree at the
                      Hongik University Graduate School Department of Oriental Painting in 2022, and
                      is currently enrolled in its doctoral program. That sustained path through the
                      formal study of the medium grounds her experiments: she is not abandoning the
                      tradition but extending it from the inside.
                    </p>
                    <p>
                      Her solo exhibition{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈The Invisible Project〉
                      </strong>{' '}
                      (Sai Art Document, Seoul, 2022) gives her practice its name and its core
                      proposition: to paint what cannot be directly seen. The invisible here is not
                      a void but a condition — the part of a scene, a relationship, or a memory that
                      escapes the frame. The painting becomes a way of registering what remains just
                      outside vision.
                    </p>
                    <p>
                      Across her group exhibitions, that same inquiry recurs under different titles:{' '}
                      <em>NO MATTER</em>, <em>Relationship Turning Point</em>,{' '}
                      <em>Landscape Liberation</em>, &ldquo;Within contemplation, each has its own
                      sound.&rdquo; The phrasing is meditative and experimental at once — a practice
                      that treats the traditional medium of dongyanghwa as a site for thinking about
                      perception, relation, and change.
                    </p>
                    <p>
                      From the Carrousel du Louvre in Paris (FOCUS ART FAIR PARIS, 2022) to BAMA in
                      Busan (2023), her work has travelled widely for a painter of her generation.
                      Riho joins this campaign not as a subject of its cause but as a fellow artist
                      in solidarity — a younger painter widening the ground others will work on.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      리호는 동양화를 다루는 중견 작가다. 그리고 그 오랜 전통을 고정된 유산이 아니라
                      열린 물음으로 대한다. 매체가 흔히 그 역사로 규정되는 자리에서, 그는{' '}
                      <strong className="font-bold text-charcoal-deep">신진의 시선</strong>으로 먹과
                      종이와 안료가 여전히 무엇을 할 수 있는지를 묻는다.
                    </p>
                    <p>
                      그는 2020년 성신여자대학교 동양화과를 졸업하고, 2022년 홍익대학교 일반대학원
                      동양화과에서 석사 학위를 받았으며, 현재 같은 대학원 박사과정에 재학 중이다.
                      매체를 정공법으로 오래 파고든 이 과정이 그의 실험을 떠받친다. 전통을 버리는
                      것이 아니라, 안에서부터 확장하는 작업이다.
                    </p>
                    <p>
                      개인전{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈보이지 않는 프로젝트〉
                      </strong>
                      (사이아트도큐먼트, 서울, 2022)는 그의 작업에 이름과 핵심 명제를 함께 준다 —
                      직접 보이지 않는 것을 그리는 일. 여기서 보이지 않는 것은 텅 빔이 아니라 하나의
                      조건이다. 한 장면, 한 관계, 한 기억에서 화면 밖으로 빠져나가는 부분. 그림은
                      시야의 바로 바깥에 남는 것을 기록하는 방법이 된다.
                    </p>
                    <p>
                      여러 단체전에서 같은 물음이 다른 제목으로 되풀이된다 — 〈NO MATTER〉,
                      〈관계전환지점〉, 〈Landscape Liberation〉, 〈사색 속에는 각자의 소리가
                      존재하고〉. 사색적이면서 동시에 실험적인 언어다. 동양화라는 전통 매체를 지각과
                      관계와 변화를 사유하는 자리로 다루는 작업이다.
                    </p>
                    <p>
                      루브르 카루젤(FOCUS ART FAIR PARIS, 파리, 2022)에서 부산 BAMA(2023)까지, 그의
                      작품은 같은 세대 화가로서는 드물게 멀리 움직여 왔다. 리호는 씨앗페에 이
                      캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다른
                      이들이 일할 바탕을 넓히는 한 사람의 젊은 화가로.
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
                        {isEnglish ? 'Painting the invisible' : '보이지 않는 것을 그리기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The 〈Invisible Project〉 proposition — to register what escapes the frame, the part of a scene that vision cannot hold directly.'
                          : '〈보이지 않는 프로젝트〉의 명제 — 화면 밖으로 빠져나가는 것, 시야가 직접 붙들지 못하는 장면의 부분을 기록한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Expanding the medium' : '매체의 확장'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Treating dongyanghwa not as a fixed inheritance but as an open question — extending ink, paper, and pigment from the inside.'
                          : '동양화를 고정된 유산이 아닌 열린 물음으로 다룬다 — 먹·종이·안료를 안에서부터 확장한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A contemplative tone' : '사색적인 톤'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Meditative and experimental at once — a younger gaze that thinks through perception, relation, and change.'
                          : '사색적이면서 실험적인 언어 — 지각과 관계와 변화를 사유하는 신진의 시선.'}
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
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Oriental Painting, Sungshin Women’s University.'
                        : '성신여자대학교 동양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes a master’s degree at the Hongik University Graduate School, Dept. of Oriental Painting.'
                        : '홍익대학교 일반대학원 동양화과 석사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Invisible Project〉, Sai Art Document, Seoul.'
                        : '개인전 〈보이지 않는 프로젝트〉, 사이아트도큐먼트(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'FOCUS ART FAIR PARIS, Carrousel du Louvre, France.'
                        : 'FOCUS ART FAIR PARIS, 카루젤 뒤 루브르(프랑스).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BAMA (Busan International Art Fair), BEXCO; group shows including 〈Greekyland〉 (K Museum of Contemporary Art).'
                        : 'BAMA 부산국제화랑아트페어(벡스코); 〈Greekyland〉(K현대미술관) 등 단체전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Insa-dong YOUNG & FUTURE Art Fair (Insa Central Museum); group shows 〈Relationship Turning Point〉, 〈Landscape Liberation〉, and others.'
                        : '인사동 YOUNG & FUTURE Art Fair(인사센트럴뮤지엄); 〈관계전환지점〉·〈Landscape Liberation〉 등 단체전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions 〈All Returns to the Source〉 (Flow & Beat) and 〈NO MATTER〉 (N2 Art Space).'
                        : '단체전 〈만류귀종〉(플로우앤비트)·〈NO MATTER〉(N2 아트스페이스).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & art fairs' : '주요 전시 및 아트페어'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Invisible Project〉, Sai Art Document, Seoul (2022)'
                        : '개인전 〈보이지 않는 프로젝트〉, 사이아트도큐먼트, 서울 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈All Returns to the Source〉 (Flow & Beat, 2025), 〈NO MATTER〉 (N2 Art Space, 2025)'
                        : '단체전: 〈만류귀종〉(플로우앤비트, 2025), 〈NO MATTER〉(N2 아트스페이스, 2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈Relationship Turning Point〉 (Gallery Hoho), 〈Encountering Dreams〉 (Gallery Ilho), 〈Landscape Liberation〉 (Gallery Jayu), all 2024'
                        : '단체전: 〈관계전환지점〉(갤러리호호), 〈꿈과 마주치다展〉(갤러리일호), 〈Landscape Liberation〉(갤러리자유), 2024'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: “Within contemplation, each has its own sound” (A Lounge Gallery), 〈Greekyland〉 (K Museum of Contemporary Art), 〈Contemporary Art Meets Sejong〉 (Gwanghwamun Square), all 2023'
                        : '단체전: 〈사색 속에는 각자의 소리가 존재하고〉(에이라운지갤러리), 〈Greekyland〉(K현대미술관), 〈현대미술과 세종의 만남〉(광화문광장), 2023'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art fairs: Insa-dong YOUNG & FUTURE Art Fair, Insa Central Museum (2024); BAMA, BEXCO (2023); FOCUS ART FAIR PARIS, Carrousel du Louvre, France (2022)'
                        : '아트페어: 인사동 YOUNG & FUTURE Art Fair, 인사센트럴뮤지엄 (2024); BAMA, 벡스코 (2023); FOCUS ART FAIR PARIS, 카루젤 뒤 루브르, 프랑스 (2022)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 리호 동양화 확장 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the medium and what it can hold</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">
                    매체와, 그것이 담을 수 있는 것에 관하여
                  </span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 안에서부터 확장하는 전통 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Extending a tradition from the inside' : '안에서부터 확장하는 전통'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Korean ink painting carries a weight of history that can settle over a
                        younger artist like a fixed inheritance. Riho took the opposite route:
                        rather than receiving the medium as a closed canon, she studied it long
                        enough to ask what it might still become.
                      </p>
                      <p>
                        That study was deliberate. A graduate of the Department of Oriental Painting
                        at Sungshin Women&apos;s University, she went on to a master&apos;s degree
                        at the Hongik University Graduate School and is now in its doctoral program
                        — a sustained, formal engagement with the very medium she experiments on.
                        The result is not a break with dongyanghwa but an extension of it from
                        within: the materials remain ink, paper, pigment; the question of what they
                        can do is held open.
                      </p>
                      <p>
                        This is what it means to expand the medial possibilities of a tradition
                        through the eyes of a younger generation. The history is not discarded. It
                        is carried forward, and pressed against its own edges.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        동양화는 젊은 작가에게 고정된 유산처럼 내려앉을 수 있는 역사의 무게를
                        지닌다. 리호는 반대 길을 택했다. 매체를 닫힌 정전으로 물려받는 대신, 그것이
                        아직 무엇이 될 수 있는지를 물을 수 있을 만큼 오래 파고들었다.
                      </p>
                      <p>
                        그 공부는 의도적이었다. 성신여자대학교 동양화과를 졸업한 그는 홍익대학교
                        일반대학원에서 석사 학위를 받고 지금은 박사과정에 있다 — 자신이 실험하는
                        바로 그 매체에 대한 지속적이고 정공법적인 천착이다. 그 결과는 동양화와의
                        단절이 아니라 안에서부터의 확장이다. 재료는 여전히 먹·종이·안료이고, 그것이
                        무엇을 할 수 있는가 하는 물음은 열린 채로 남는다.
                      </p>
                      <p>
                        신진의 시선으로 전통의 매체적 가능성을 확장한다는 것은 이런 의미다. 역사는
                        버려지지 않는다. 앞으로 옮겨지고, 그 자신의 가장자리에 부딪혀 본다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 보이지 않는 프로젝트 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈The Invisible Project〉 — painting what escapes the frame'
                    : '〈보이지 않는 프로젝트〉 — 화면 밖으로 빠져나가는 것을 그리다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her 2022 solo exhibition at Sai Art Document, Seoul, names the practice:{' '}
                        〈The Invisible Project〉. The title is a proposition as much as a subject.
                        To paint the invisible is not to paint nothing; it is to attend to the part
                        of a scene, a relationship, or a memory that escapes direct vision — the
                        residue that a frame cannot contain.
                      </p>
                      <p>
                        Ink painting is unusually suited to this. Its washes, its reserved whites,
                        its capacity to suggest rather than describe make it a medium already
                        practiced in the not-quite-seen. Riho leans into that capacity, using the
                        traditional language of dongyanghwa to register conditions rather than
                        objects — what is felt at the edge of perception rather than fixed at its
                        centre.
                      </p>
                      <p>
                        The tone is contemplative and the method experimental, and the two are not
                        in tension. The work asks the viewer to slow down, to look for what is not
                        immediately given, and in doing so to notice how much of any image lives
                        outside its visible boundary.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2022년 사이아트도큐먼트(서울)에서 열린 그의 개인전이 이 작업에 이름을 준다 —
                        〈보이지 않는 프로젝트〉. 제목은 주제인 동시에 명제다. 보이지 않는 것을
                        그린다는 것은 아무것도 그리지 않는 것이 아니다. 한 장면, 한 관계, 한
                        기억에서 직접적 시야를 빠져나가는 부분 — 화면이 담아낼 수 없는 잔여에 주의를
                        기울이는 일이다.
                      </p>
                      <p>
                        동양화는 이 일에 유독 잘 맞는다. 번짐, 비워 둔 여백, 묘사하기보다 암시하는
                        힘은 이 매체가 이미 &lsquo;거의 보이지 않는 것&rsquo;에 능숙하다는 뜻이다.
                        리호는 그 힘에 기댄다. 동양화의 전통적 언어로 사물이 아니라 조건을 기록한다
                        — 중심에 고정된 것이 아니라 지각의 가장자리에서 느껴지는 것을.
                      </p>
                      <p>
                        톤은 사색적이고 방법은 실험적이지만, 둘은 충돌하지 않는다. 작업은 보는
                        이에게 속도를 늦추고, 즉각 주어지지 않는 것을 찾아보라 청한다. 그렇게 어떤
                        이미지든 그 보이는 경계 바깥에 얼마나 많은 것이 살고 있는지를 알아차리게
                        한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 파리에서 부산까지 — 젊은 동양화의 이동 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From Paris to Busan — a young ink in motion'
                    : '파리에서 부산까지 — 움직이는 젊은 동양화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For a painter of her generation, Riho&apos;s work has travelled remarkably
                        far. In 2022 it hung at FOCUS ART FAIR PARIS in the Carrousel du Louvre; in
                        2023 it appeared at BAMA, the Busan International Art Fair, at BEXCO; in
                        2024 at the Insa-dong YOUNG & FUTURE Art Fair. A traditional Korean medium,
                        carried by a younger hand, moving across very different rooms.
                      </p>
                      <p>
                        The same restless inquiry shows up across her group exhibitions, under
                        titles that read almost like a single ongoing thought: 〈Relationship
                        Turning Point〉, 〈Landscape Liberation〉, &ldquo;Within contemplation, each
                        has its own sound,&rdquo; 〈NO MATTER〉, 〈All Returns to the Source〉. Each
                        frames a slightly different angle on perception, relation, and change — the
                        recurring concerns of a practice built on the invisible.
                      </p>
                      <p>
                        Movement, here, is not only geographical. It is the movement of an old
                        medium being asked new questions. Riho lends that momentum to this campaign
                        in solidarity with fellow artists — so that the ground a younger painter
                        works on might be a little wider for those who come after.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        같은 세대 화가로서 리호의 작품은 놀랍도록 멀리 움직여 왔다. 2022년에는 파리
                        카루젤 뒤 루브르에서 열린 FOCUS ART FAIR PARIS에 걸렸고, 2023년에는
                        벡스코에서 열린 부산국제화랑아트페어 BAMA에, 2024년에는 인사동 YOUNG &
                        FUTURE Art Fair에 나왔다. 한국의 전통 매체가 젊은 손에 실려 매우 다른
                        공간들을 가로지른 것이다.
                      </p>
                      <p>
                        쉬지 않는 같은 물음이 그의 단체전들에서 거듭 나타난다. 마치 하나의 이어지는
                        생각처럼 읽히는 제목들 아래에서 — 〈관계전환지점〉, 〈Landscape
                        Liberation〉, 〈사색 속에는 각자의 소리가 존재하고〉, 〈NO MATTER〉,
                        〈만류귀종〉. 저마다 지각과 관계와 변화에 대해 조금씩 다른 각도를 비춘다.
                        보이지 않는 것 위에 세운 작업의 되풀이되는 관심사다.
                      </p>
                      <p>
                        여기서 이동은 지리적인 것만이 아니다. 오래된 매체가 새로운 물음을 받는
                        움직임 이다. 리호는 그 운동의 힘을 동료 예술인과의 연대 속에서 이 캠페인에
                        보탠다 — 젊은 화가가 딛고 일하는 바탕이, 뒤따라올 이들에게 조금 더
                        넓어지도록.
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
                      From the lecture rooms of Sungshin and Hongik to the Carrousel du Louvre, Riho
                      has pursued a single question: what can the old medium of Korean ink still be
                      made to hold? Her answer, still being built, is a contemplative, experimental
                      practice of painting the invisible — a tradition extended from the inside by a
                      younger gaze. She joins this campaign not as a subject of its cause but as a
                      fellow artist in solidarity, widening the ground that those who come after
                      will work on.
                    </>
                  ) : (
                    <>
                      성신여대와 홍익대의 강의실에서 카루젤 뒤 루브르까지, 리호는 하나의 물음을
                      추구해 왔다: 동양화라는 오래된 매체는 여전히 무엇을 담을 수 있는가. 아직 쌓여
                      가는 그의 대답은 보이지 않는 것을 그리는 사색적이고 실험적인 작업이다 — 신진의
                      시선이 안에서부터 확장한 전통. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라,
                      동료 예술인과의 연대자로서 함께한다 — 뒤따라올 이들이 딛고 일할 바탕을 넓히며.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Riho</span>
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
                    Riho joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    리호 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={RIHO_PATH}
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
