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

// 거장 작가 feature는 작가 페이지(/artworks/artist/양순열)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const YANG_SUNYEOL_PATH = `/artworks/artist/${encodeURIComponent('양순열')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isYangSunyeolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '양순열' ||
    n === 'yang soon-yeol' ||
    n === 'yang sun-yeol' ||
    n === 'yang sunyeol' ||
    n.replace(/[\s-]+/g, '') === 'yangsoonyeol' ||
    n.replace(/[\s-]+/g, '') === 'yangsunyeol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '양순열 — 확장된 모성의 컨템포러리 아티스트',
    description:
      '회화와 조각을 넘나드는 컨템포러리 아티스트 양순열(1959–). 「오똑이」 연작으로 넘어져도 다시 일어서는 회복의 리듬을 형상화하며, ‘확장된 모성의 회복’을 통해 인간·사물·자연 사이의 영적 교감을 탐구해 온 작가. 따뜻하고 명상적인 양순열의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '확장된 모성의 컨템포러리 아티스트 양순열. 회화와 조각을 넘나들며 존재와 사물에 대한 깊은 시적 공감을 「오똑이」로 형상화한다.',
    ogAlt: '양순열 대표 작품',
    twitterTitle: '양순열',
    twitterDescription: '넘어져도 다시 일어서는 모성 — 확장된 모성의 컨템포러리 아티스트 양순열',
    keywords:
      '양순열 작가, 오똑이, 확장된 모성, 회화, 조각, 컨템포러리 아트, 영적 교감, 씨앗페 온라인',
  },
  en: {
    title: 'Yang Soon-yeol — Contemporary Artist of Extended Motherhood',
    description:
      'Selected works by Yang Soon-yeol (b. 1959), a contemporary artist moving freely between painting and sculpture. Through the 〈Ottogi〉 series she gives form to the rhythm of recovery — rising again after every fall — and, through the recovery of an extended motherhood, explores spiritual communion among humans, objects, and nature. View and collect her warm, meditative works at SAF Online.',
    ogDescription:
      'Yang Soon-yeol — contemporary artist of extended motherhood. Moving between painting and sculpture, she gives form to a poetic empathy for all existence through 〈Ottogi〉.',
    ogAlt: 'Yang Soon-yeol — featured work',
    twitterTitle: 'Yang Soon-yeol',
    twitterDescription:
      'Rising again after every fall — contemporary artist of extended motherhood',
    keywords:
      'Yang Soon-yeol artist, Ottogi, extended motherhood, contemporary art, Korean painting, sculpture, spiritual communion',
  },
} as const;

export async function buildYangSunyeolMetadata({
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
  const pageUrl = buildLocaleUrl(YANG_SUNYEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('양순열');
  const artwork = allArtworks.find((a) => isYangSunyeolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Yang Soon-yeol`
      : `${artwork.title} — 양순열`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(YANG_SUNYEOL_PATH, locale, true),
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

export default async function YangSunyeolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(YANG_SUNYEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('양순열');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isYangSunyeolArtist(artwork.artist)
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
    { name: isEnglish ? 'Yang Soon-yeol' : '양순열', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${YANG_SUNYEOL_PATH}#person-yang-soonyeol`,
    name: isEnglish ? 'Yang Soon-yeol' : '양순열',
    alternateName: isEnglish ? '양순열' : 'Yang Soon-yeol',
    jobTitle: isEnglish ? 'Artist' : '미술가',
    description: isEnglish
      ? 'Yang Soon-yeol (b. 1959) is a Korean contemporary artist who moves between painting and sculpture, exploring the recovery of an extended motherhood and spiritual communion among humans, objects, and nature.'
      : '양순열(1959–)은 회화와 조각을 넘나들며 ‘확장된 모성의 회복’과 인간·사물·자연 사이의 영적 교감을 탐구해 온 한국의 컨템포러리 아티스트입니다.',
    birthDate: '1959-11-26',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Uiseong, North Gyeongsang, South Korea' : '경북 의성',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Daegu Catholic University (formerly Hyosung Women’s University), Dept. of Eastern Painting'
        : '대구가톨릭대학교(구 효성여자대학교) 동양화과',
    },
    knowsAbout: ['Contemporary art', 'Extended motherhood', 'Painting', 'Sculpture'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Yang Soon-yeol — SAF Online' : '양순열 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Yang Soon-yeol from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 양순열 작품들을 소개합니다.',
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

          {/* Soft concentric arcs — 확장된 모성의 동심원 모티프 */}
          <div className="pointer-events-none absolute -right-32 -top-24 h-[420px] w-[420px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 -top-12 h-[300px] w-[300px] rounded-full border border-primary/20" />
          <div className="pointer-events-none absolute -left-24 bottom-[-120px] h-[360px] w-[360px] rounded-full border border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Yang Soon-yeol · b. 1959' : '양순열 · 1959–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Knocked over, it rises —
                  <br />
                  <span className="text-primary-soft">the warmth that lifts us again</span>
                </>
              ) : (
                <>
                  넘어져도 다시 일어선다 —
                  <br />
                  <span className="text-primary-soft">우리를 일으켜 세우는 모성</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A poetic empathy for all existence, given form across painting and sculpture.
                  </span>
                  <span className="mt-2 block">
                    An extended motherhood that seeks spiritual communion among beings.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    존재와 사물을 향한 시적 공감을 회화와 조각으로 빚다.
                  </span>
                  <span className="mt-2 block">
                    인간·사물·자연 사이의 영적 교감을 향한 확장된 모성.
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
                    A poetic empathy —<br />
                    <span className="text-primary-strong">for all existence and every thing</span>
                  </>
                ) : (
                  <>
                    시적 공감 —<br />
                    <span className="text-primary-strong">존재와 사물 일반을 향하여</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Yang Soon-yeol (b. 1959) is a contemporary artist who moves freely between
                      painting and sculpture. Across a lifetime of work her enduring subject has
                      been a deep, poetic empathy toward existence and toward things in general — a
                      sensibility that refuses the line we habitually draw between the human and the
                      non-human, the living and the made.
                    </p>
                    <p>
                      At the centre of her practice is what she calls the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        recovery of an extended motherhood
                      </strong>
                      . Motherhood here is not a private or biological role but a widened capacity
                      to hold and tend — a force she offers as a way through the crises of our age,
                      and as the ground for a possible spiritual communion among humans, objects,
                      and nature.
                    </p>
                    <p>
                      That vision finds its most recognizable form in the 〈Ottogi〉 series — the
                      ottogi, the Korean roly-poly doll that, however hard it is pushed, always
                      rights itself. In Yang&apos;s hands the figure becomes an image of resilience
                      itself: the rhythm of falling and rising again, of a warmth that lifts the
                      fallen back to their feet. Alongside it she has worked through series such as
                      〈Dream〉 and 〈Homo Sapiens〉, each turning the same attention toward the
                      inner landscape from which recovery begins.
                    </p>
                    <p>
                      Her medium is deliberately plural — painting, sculpture, three-dimensional and
                      time-based work — because the empathy she pursues does not belong to a single
                      surface. Whether rendered in pigment or in form, the work asks the same
                      question: how might all the life and all the things of this earth come to
                      dwell together?
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      양순열(1959–)은 회화와 조각 등 다양한 장르를 자유로이 넘나드는 컨템포러리
                      아티스트다. 평생에 걸쳐 그가 작업해 온 주제는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        존재와 사물 일반에 대한 깊은 시적 공감
                      </strong>
                      이다 — 인간과 비인간, 살아 있는 것과 만들어진 것 사이에 우리가 습관처럼 긋는
                      경계를 거부하는 감수성이다.
                    </p>
                    <p>
                      그 작업의 중심에는 그가 말하는{' '}
                      <strong className="font-bold text-charcoal">‘확장된 모성의 회복’</strong>이
                      있다. 여기서 모성은 사적이거나 생물학적인 역할이 아니라, 품고 보살피는 능력을
                      넓혀 가는 힘이다. 그는 이 힘을 이 시대가 처한 위기를 넘어서는 길로, 그리고
                      인간·사물·자연 사이의 영적 교감이 가능해지는 바탕으로 제시한다.
                    </p>
                    <p>
                      이 비전이 가장 또렷한 형상을 얻는 것이 「오똑이」 연작이다. 아무리 밀어
                      넘어뜨려도 끝내 다시 일어서는 오똑이는, 그의 손에서 회복 그 자체의 이미지가
                      된다 — 넘어지고 다시 일어서는 리듬, 쓰러진 이를 일으켜 세우는 따뜻함. 그
                      곁에서 그는 「드림」·「호모 사피엔스」 같은 연작을 통해 회복이 시작되는 내면의
                      풍경으로 같은 시선을 거듭 돌린다.
                    </p>
                    <p>
                      그의 매체는 의도적으로 여럿이다 — 회화, 조각, 입체, 시간 기반 작업까지. 그가
                      좇는 공감은 하나의 표면에만 속하지 않기 때문이다. 안료로 그려지든 형태로
                      빚어지든, 작업은 같은 물음을 던진다: 이 땅의 모든 생명과 모든 사물이 어떻게
                      함께 깃들 수 있는가.
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
                        {isEnglish ? 'Extended motherhood' : '확장된 모성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A widened capacity to hold and tend — offered as a way through the crises of our age and as the ground for communion among beings.'
                          : '품고 보살피는 능력을 넓혀 가는 힘. 시대의 위기를 넘어 존재들 사이의 교감을 여는 바탕으로 제시된다.'}
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
                          ? '〈Ottogi〉 — the rhythm of recovery'
                          : '「오똑이」 — 회복의 리듬'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The roly-poly doll that always rights itself becomes an image of resilience — of falling and rising again.'
                          : '아무리 밀어도 다시 일어서는 오똑이는 회복 그 자체의 이미지 — 넘어지고 다시 일어서는 리듬이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Spiritual communion' : '영적 교감'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Painting and sculpture together ask how the life and things of this earth might come to dwell with one another.'
                          : '회화와 조각이 함께, 이 땅의 생명과 사물이 어떻게 서로 깃들 수 있는가를 묻는다.'}
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
                      1959
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Uiseong, North Gyeongsang province.'
                        : '경북 의성 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1992
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BFA in Eastern Painting, Hyosung Women’s University (now Daegu Catholic University).'
                        : '효성여자대학교(현 대구가톨릭대학교) 동양화과 학사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1995
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MFA in Eastern Painting, Hyosung Women’s University (now Daegu Catholic University).'
                        : '효성여자대학교(현 대구가톨릭대학교) 동양화과 석사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1996–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lecturer and adjunct professor, Dept. of Eastern Painting, Daegu Catholic University (through 2006).'
                        : '대구가톨릭대학교 동양화과 강사·겸임교수(~2006).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1997
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the 3rd Baeksan Young Artist Award (Korea Daily).'
                        : '제3회 백산 젊은작가상(한국일보) 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Homo Sapiens》, Hakgojae Gallery, Seoul.'
                        : '개인전 《호모 사피엔스》, 학고재갤러리(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the 40th Korean Art Critics Association Outstanding Artist Award.'
                        : '제40회 한국미술평론가협회 작가상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《Mother, the Force That Raises the Ottogi》, Hakgojae Gallery, Seoul.'
                        : '개인전 《어머니, 오똑이를 세우다》, 학고재갤러리(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Motherhood (母性)》, Moonshin Art Museum, Sookmyung Women’s University, Seoul.'
                        : '《모성(母性)》, 숙명여자대학교 문신미술관(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Warmth in Bloom: Love》, Grand Josun Jeju (with Gallery LIMAA).'
                        : '《웜스 인 블룸: 사랑》, 그랜드 조선 제주(갤러리 리마 협력).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 《Homo Sapiens》 (2007) and 《Mother, the Force That Raises the Ottogi》 (2022), Hakgojae Gallery, Seoul'
                        : '개인전: 《호모 사피엔스》(2007), 《어머니, 오똑이를 세우다》(2022), 학고재갤러리(서울)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Motherhood (母性)》, Moonshin Art Museum, Sookmyung Women’s University, Seoul (2023)'
                        : '《모성(母性)》, 숙명여자대학교 문신미술관(서울) (2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Warmth in Bloom: Love》, Grand Josun Jeju, with Gallery LIMAA — centred on the 〈Ottogi〉 and 〈Dream〉 series (2026)'
                        : '《웜스 인 블룸: 사랑》, 그랜드 조선 제주(갤러리 리마 협력) — 「오똑이」·「드림」 연작 중심 (2026)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Public collections: Ho-Am Art Museum, POSCO Art Museum, Gyeongsangbuk-do Provincial Government, and others'
                        : '소장: 호암미술관, 포스코미술관, 경상북도청 등'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 신학철 패턴 차용, 양순열 모성·회복 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on warmth, recovery, and communion</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">따뜻함과 회복, 그리고 교감에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 확장된 모성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Extended motherhood — a widened capacity to hold'
                    : '확장된 모성 — 품는 힘을 넓히다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The word that gathers Yang Soon-yeol&apos;s work is <em>motherhood</em> —
                        but extended, lifted out of the private and the biological. In her
                        vocabulary, motherhood names a capacity rather than a role: the capacity to
                        hold, to tend, to keep watch over what is fragile. To extend it is to widen
                        the circle of what counts as worth holding, until it reaches past one&apos;s
                        own kin toward strangers, toward objects, toward the earth itself.
                      </p>
                      <p>
                        She frames this widened motherhood not as sentiment but as response — a way
                        through the crises of our age. Where the present moment tends toward
                        separation, her work proposes recovery: the patient re-stitching of the bond
                        between the human and the non-human, the living and the made. It is a quiet,
                        almost devotional proposition, carried not by argument but by form.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        양순열의 작업을 한데 모으는 말은 <em>모성</em>이다 — 단, 확장된 모성. 사적인
                        것, 생물학적인 것에서 들어 올려진 모성이다. 그의 어휘에서 모성은 역할이
                        아니라 능력의 이름이다. 품는 능력, 보살피는 능력, 연약한 것을 지켜보는 능력.
                        그것을 확장한다는 것은 품을 가치가 있다고 여겨지는 것의 둘레를 넓혀 가는
                        일이다 — 제 혈육을 넘어 낯선 이에게로, 사물에게로, 마침내 이 땅 자체에게로.
                      </p>
                      <p>
                        그는 이 넓어진 모성을 감상이 아니라 응답으로 본다 — 이 시대가 처한 위기를
                        넘어서는 길로. 지금 이 순간이 자꾸만 분리로 기울 때, 그의 작업은 회복을
                        제안한다: 인간과 비인간, 살아 있는 것과 만들어진 것 사이의 끈을 끈기 있게
                        다시 꿰매는 일. 그것은 논증이 아니라 형태로 옮겨지는, 조용하고 거의 헌신에
                        가까운 제안이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 오똑이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Ottogi〉 — the doll that always rises'
                    : '「오똑이」 — 끝내 다시 서는 인형'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The ottogi is the Korean roly-poly doll, weighted at its base so that
                        however hard you push it, it rocks and rights itself. Yang takes this
                        familiar object and makes it the protagonist of her work across painting and
                        sculpture. In her hands it is no longer a toy but a figure for resilience:
                        the simple, stubborn fact of standing up again.
                      </p>
                      <p>
                        What the 〈Ottogi〉 series adds to that fact is a question of agency — who,
                        or what, does the lifting? Her answer folds back into the extended
                        motherhood at the heart of her practice: the force that rights the fallen
                        doll is the same warmth that tends and holds. The doll does not rise alone;
                        it rises because it is held. Recovery, in this reading, is never solitary —
                        it is relational, a matter of being kept and being raised by another.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        오똑이는 밑이 무겁게 만들어져, 아무리 밀어도 흔들리다 끝내 다시 일어서는
                        한국의 인형이다. 양순열은 이 익숙한 사물을 회화와 조각을 가로지르는 작업의
                        주인공으로 삼는다. 그의 손에서 오똑이는 더 이상 장난감이 아니라 회복을 위한
                        형상이 된다 — 다시 일어선다는, 단순하고도 고집스러운 사실.
                      </p>
                      <p>
                        「오똑이」 연작이 그 사실에 더하는 것은 행위의 주체에 대한 물음이다 — 누가,
                        혹은 무엇이 일으켜 세우는가. 그 답은 작업의 중심에 있는 확장된 모성으로
                        되접힌다. 넘어진 인형을 바로 세우는 힘은, 보살피고 품는 그 따뜻함과 같다.
                        오똑이는 홀로 일어서지 않는다 — 품어지기에 일어선다. 이 읽기에서 회복은 결코
                        혼자만의 것이 아니다. 그것은 관계의 일이며, 누군가에게 지켜지고 일으켜
                        세워지는 일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 회화와 조각 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Between painting and sculpture — one empathy, many forms'
                    : '회화와 조각 사이 — 하나의 공감, 여러 형태'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Yang trained in Eastern painting, yet her practice refuses to settle on a
                        single medium. Painting, sculpture, three-dimensional and time-based work
                        all appear in her body of work — not as restlessness but as necessity. The
                        poetic empathy she pursues is for existence and for things in general, and
                        things are not flat. To attend to an object fully is, eventually, to give it
                        volume, weight, a place to stand.
                      </p>
                      <p>
                        So the same motif crosses surfaces and forms: the 〈Ottogi〉 painted, then
                        carved; 〈Dream〉 unfolding the inner landscape from which recovery begins;
                        the figures of 〈Homo Sapiens〉 turning the question of what we are toward
                        what we might tend. Whether in pigment or in mass, the work keeps asking how
                        the life and the things of this earth might come to dwell together — a warm,
                        meditative inquiry that treats sculpture and painting as two voices in one
                        conversation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        양순열은 동양화를 전공했지만, 그의 작업은 하나의 매체에 안주하기를 거부한다.
                        회화, 조각, 입체, 시간 기반 작업이 그의 작품 세계에 모두 나타난다 — 변덕이
                        아니라 필연으로. 그가 좇는 시적 공감은 존재와 사물 일반을 향하는데, 사물은
                        평평하지 않다. 한 사물을 온전히 살핀다는 것은 결국 그것에 부피와 무게를, 설
                        자리를 주는 일이다.
                      </p>
                      <p>
                        그래서 같은 모티프가 표면과 형태를 가로지른다: 그려진 「오똑이」가 다시
                        빚어지고, 「드림」은 회복이 시작되는 내면의 풍경을 펼치며, 「호모
                        사피엔스」의 형상들은 우리가 무엇인가라는 물음을 우리가 무엇을 보살필 수
                        있는가로 돌린다. 안료로든 덩어리로든, 작업은 이 땅의 생명과 사물이 어떻게
                        함께 깃들 수 있는가를 거듭 묻는다 — 조각과 회화를 한 대화의 두 목소리로
                        다루는, 따뜻하고 명상적인 탐구다.
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
                      Across painting and sculpture, Yang Soon-yeol&apos;s work pursues a single
                      warmth: the conviction that what has fallen can be raised, and that the
                      raising is the work of an extended motherhood reaching toward every being. She
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that the bond between artists, too, might be held and lifted.
                    </>
                  ) : (
                    <>
                      회화와 조각을 가로질러, 양순열의 작업은 하나의 따뜻함을 추구한다: 넘어진 것은
                      다시 일으켜 세워질 수 있으며, 그 일으켜 세움이 모든 존재를 향해 뻗어 가는
                      확장된 모성의 일이라는 믿음. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라,
                      동료 예술인과의 연대자로서 함께한다 — 예술인 사이의 끈 또한 품어지고 일으켜
                      세워질 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Yang Soon-yeol
              </span>
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
                    Yang Soon-yeol joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    양순열 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={YANG_SUNYEOL_PATH}
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
