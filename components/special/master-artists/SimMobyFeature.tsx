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

// 거장/큐레이션 작가 feature는 작가 페이지(/artworks/artist/심모비)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='심모비', name_en='SIM_Moby'. 작가가 영문 활동명 SIM_Moby를 쓰므로 영어 locale에서 'SIM_Moby' 노출.
const SIM_MOBY_PATH = `/artworks/artist/${encodeURIComponent('심모비')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSimMobyArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === '심모비' || n.replace(/[\s_-]+/g, '') === 'simmoby';
};

const PAGE_COPY = {
  ko: {
    title: '심모비(SIM_Moby) — 연옥, 회화의 윤회',
    description:
      '천국과 지옥의 중간, 생과 사 이전의 장소 "연옥(Purgatory)"을 그리는 신진 작가 심모비(SIM_Moby). 물리적 재료의 스케치를 디지털에서 침식·부식시키고 다시 인쇄해 콜라주로 재탄생시키는 \'회화의 윤회\'로 비물질적 대안 공간을 소환합니다. 심모비의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '연옥(Purgatory)을 그리는 신진 작가 심모비. 디지털 침식과 VHS 노이즈, 콜라주 불꽃으로 탄생과 죽음을 반복하는 회화의 윤회.',
    ogAlt: '심모비(SIM_Moby) 대표 작품',
    twitterTitle: '심모비 SIM_Moby',
    twitterDescription: '생과 사 이전의 대안 공간 — 연옥을 그리는 회화의 윤회, 심모비',
    keywords:
      '심모비, SIM_Moby, 연옥, Purgatory, 디지털 아트, 반출생주의, 콜라주, 회화의 윤회, 씨앗페 온라인',
  },
  en: {
    title: 'SIM_Moby — Purgatory, the Reincarnation of Painting',
    description:
      'Selected works by SIM_Moby, an emerging artist who paints "Purgatory" — the place between heaven and hell, before life and death. Through a "reincarnation of painting" that erodes physical sketches in the digital realm and reprints them as collage, SIM_Moby summons an immaterial alternative space. View and collect the works at SAF Online.',
    ogDescription:
      'SIM_Moby — an emerging artist painting Purgatory. Digital erosion, VHS noise, and collage flame repeat birth and death in a reincarnation of painting.',
    ogAlt: 'SIM_Moby — featured work',
    twitterTitle: 'SIM_Moby',
    twitterDescription:
      'An alternative space before life and death — the reincarnation of painting, by SIM_Moby',
    keywords:
      'SIM_Moby, 심모비, Purgatory, digital art, antinatalism, collage, reincarnation of painting, SAF Online',
  },
} as const;

export async function buildSimMobyMetadata({
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
  const pageUrl = buildLocaleUrl(SIM_MOBY_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('심모비');
  const artwork = allArtworks.find((a) => isSimMobyArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — SIM_Moby`
      : `${artwork.title} — 심모비`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SIM_MOBY_PATH, locale, true),
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

export default async function SimMobyFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SIM_MOBY_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('심모비');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isSimMobyArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'SIM_Moby' : '심모비', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SIM_MOBY_PATH}#person-sim-moby`,
    name: isEnglish ? 'SIM_Moby' : '심모비',
    alternateName: isEnglish ? '심모비' : 'SIM_Moby',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'SIM_Moby is an emerging artist who paints "Purgatory" — the place between heaven and hell, before life and death — building an immaterial alternative space through a reincarnation of painting that cycles between physical sketch, digital erosion, print, and collage.'
      : '심모비(SIM_Moby)는 천국과 지옥의 중간, 생과 사 이전의 장소인 "연옥(Purgatory)"을 그리는 신진 작가입니다. 물리적 스케치·디지털 침식·인쇄·콜라주를 순환하는 \'회화의 윤회\'로 비물질적 대안 공간을 구축합니다.',
    knowsAbout: ['Purgatory', 'Digital painting', 'Collage', 'Antinatalism'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'SIM_Moby — SAF Online' : '심모비 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by SIM_Moby from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 심모비 작품들을 소개합니다.',
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
        {/* Hero Section — 연옥/디지털 침식 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 스캔라인 — VHS 노이즈/디지털 침식 모티프 */}
          <div className="absolute top-1/4 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary/30" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'SIM_Moby · Purgatory' : '심모비 · 연옥'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Between heaven and hell,
                  <br />
                  <span className="text-primary-soft">a space before life and death</span>
                </>
              ) : (
                <>
                  천국과 지옥 사이,
                  <br />
                  <span className="text-primary-soft">생과 사 이전의 공간</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Sketch becomes erosion, erosion becomes print, print becomes collage.
                  </span>
                  <span className="mt-2 block">
                    A reincarnation of painting that summons Purgatory.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">스케치가 침식이 되고, 침식이 인쇄가 되고,</span>
                  <span className="mt-2 block">
                    인쇄가 콜라주가 되는 — 연옥을 부르는 회화의 윤회.
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
                    A free alternative space —<br />
                    <span className="text-primary-strong">SIM_Purgatory : 煉獄</span>
                  </>
                ) : (
                  <>
                    자유로운 대안 공간 —<br />
                    <span className="text-primary-strong">SIM_Purgatory : 연옥</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      SIM_Moby is an emerging artist who paints &ldquo;Purgatory&rdquo; — the place
                      between heaven and hell, the place before life and death. The work begins from
                      a realization the artist reached in childhood: an antinatalist intuition that{' '}
                      <strong className="font-bold text-charcoal-deep">
                        &ldquo;to give birth to one life is to give birth to one death.&rdquo;
                      </strong>{' '}
                      From there, the artist sought a free alternative space where the providence of
                      life and death no longer applies, and gave it a name:{' '}
                      <em>SIM_Purgatory : 연옥</em>.
                    </p>
                    <p>
                      This is a &ldquo;reality-linked afterlife.&rdquo; Borrowing motifs from the
                      concepts of this world, SIM_Moby renders Purgatory as a 2D landscape — an
                      immaterial space that fuses the artist&apos;s lived experience, an Eastern
                      identity, monstrous forms, and images imagined from past lives. It is a utopia
                      without extinction, an eternity that does not perish.
                    </p>
                    <p>
                      The making is itself a cycle. A first pass is drawn with physical materials —
                      a sketch — then recorded and transformed in the digital realm as a second
                      pass. The completed 2D image is delivered to a display, or printed onto
                      physical material to be summoned into this world. The result deliberately
                      blurs the line between oil or acrylic paint and digital print, offering an
                      illusion. The artist calls the repeated digital conversion of that initial
                      material texture the{' '}
                      <strong className="font-bold text-charcoal">
                        &ldquo;megabyte erosion of reincarnation&rdquo;
                      </strong>{' '}
                      — a texture born of digital erosion and corrosion, a peculiar density resting
                      on the pixel, carrying the grain of 1990s VHS noise.
                    </p>
                    <p>
                      Then the printed image is dismantled again — a death — and recombined into
                      collage, reborn. The fragments express the flame of Catholic Purgatory: the
                      purifying fire that burns away the sins committed in life, composed as chaos.
                      A finish of acrylic stick completes the surface. Birth (sketch), death
                      (digitization), birth (print), death (collage) — the cycle repeats. This is
                      what SIM_Moby calls the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        reincarnation of painting
                      </strong>
                      .
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      심모비(SIM_Moby)는 천국과 지옥의 중간, 생과 사 이전의 장소인 &ldquo;연옥
                      (Purgatory)&rdquo;을 그리는 신진 작가다. 작업은 작가가 어릴 적 도달한 깨달음
                      에서 출발한다 —{' '}
                      <strong className="font-bold text-charcoal-deep">
                        &ldquo;하나의 생명을 낳는 것은 하나의 죽음을 낳는 것과 같다&rdquo;
                      </strong>
                      는 반출생주의(antinatalism)의 직관. 거기서 작가는 생과 사의 섭리가 더 이상
                      작용하지 않는 자유로운 대안 공간을 탐색했고, 그것에 이름을 붙였다 —{' '}
                      <em>SIM_Purgatory : 연옥</em>.
                    </p>
                    <p>
                      이곳은 &lsquo;현실 연계형 내세&rsquo;다. 현세의 개념을 모티프로 차용해,
                      심모비는 연옥을 2D 풍경으로 그린다. 작가의 삶의 경험, 동양적 정체성, 괴수적
                      형태, 전생으로부터의 상상 이미지가 융합된 비물질적 공간 — 소멸이 없는 영원한
                      유토피아를 지향한다.
                    </p>
                    <p>
                      제작 과정 자체가 하나의 순환이다. 물리적 재료로 1차 작업(스케치)을 한 뒤,
                      디지털에서 2차 작업으로 기록·변환한다. 디지털로 완성된 2D 이미지는
                      디스플레이로 전달되거나, 물리적 재료에 인쇄되어 현세로 소환된다. 결과물은
                      유화·아크릴 채색 인지 디지털 인쇄인지 헷갈리게 하는 환영을 제공한다. 1차
                      물성의 질감을 디지털에서 여러 차례 변환하는 이 방식을 작가는{' '}
                      <strong className="font-bold text-charcoal">
                        &lsquo;메가바이트의 침식 윤회&rsquo;
                      </strong>
                      라 부른다 — 디지털 침식·부식으로 생기는 질감, 픽셀 위에 얹힌 독특한 밀도감,
                      1990년대 VHS 노이즈의 질감을 전달하는.
                    </p>
                    <p>
                      그리고 인쇄된 이미지는 다시 해체된다 — 죽음 — 그리고 콜라주로 재결합되어
                      재탄생한다. 그 조각들은 가톨릭 연옥의 불꽃, 생전의 죄악을 불태우는 정화의
                      불꽃을 표현하며 카오스적으로 구성된다. 아크릴 스틱으로 마감한다.
                      탄생(스케치)·죽음 (디지털화)·탄생(인쇄)·죽음(콜라주) — 순환은 반복된다. 이것이
                      심모비가 말하는{' '}
                      <strong className="font-bold text-charcoal-deep">회화의 윤회</strong>다.
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
                        {isEnglish ? 'Purgatory, the alternative space' : '연옥, 대안의 공간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A free space between life and death, where their providence no longer applies — a reality-linked afterlife rendered as a 2D landscape.'
                          : '생과 사의 섭리가 작용하지 않는, 그 사이의 자유로운 공간. 현세를 모티프로 차용한 ‘현실 연계형 내세’를 2D 풍경으로 그린다.'}
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
                          ? 'The megabyte erosion of reincarnation'
                          : '메가바이트의 침식 윤회'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Physical texture, converted again and again in the digital realm — a peculiar density on the pixel, carrying the grain of 1990s VHS noise. Paint or print? The work refuses to say.'
                          : '물성의 질감을 디지털에서 여러 차례 변환한다. 픽셀 위의 독특한 밀도감과 1990년대 VHS 노이즈의 질감. 채색인지 인쇄인지 — 작품은 답하지 않는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The reincarnation of painting' : '회화의 윤회'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Birth (sketch), death (digitization), birth (print), death (collage). Printed images are dismantled and recombined into collage — fragments that become the purifying flame of Purgatory.'
                          : '탄생(스케치)·죽음(디지털화)·탄생(인쇄)·죽음(콜라주). 인쇄된 이미지를 해체·재결합한 콜라주의 조각들이 연옥의 정화하는 불꽃이 된다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected activities & exhibitions' : '주요 활동 및 전시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition by a digital artist at the Toyota Municipal Museum of Art Gallery, Toyota, Japan (Aug 2022)'
                        : '도요타시립미술관 갤러리 개인전 — 디지털 아티스트 최초 개인전(일본 도요타, 2022.8)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Selected as one of '50 Artists To Watch' by Florence Contemporary Gallery, Italy (2023)"
                        : "이탈리아 플로렌스 컨템퍼러리 갤러리 선정 '50 Artists To Watch' (2023)"}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participating artist, Kameyama Triennale, Japan (2024)'
                        : '일본 카메야마 트리엔날레 출전작가 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'PR ambassador, Daejong (Grand Bell) Film Awards & Chunsa International Film Festival (2022)'
                        : '대종상영화제·춘사국제영화제 홍보대사 (2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Numerous solo exhibitions across Korea and Japan (Nagoya, Toyota, Seoul, Santiago, Kuwana, 2021–2025): Gallery Blanka, RAFU Gallery, Bincan, Polestar Art Gallery, Inyoung Gallery, Gallery Sou, Tapiial Virtual Gallery, Gallery DOS, JH Gallery, and others'
                        : '한국·일본 다수 개인전(나고야·도요타·서울·산티아고·쿠와나 등, 2021–2025): Gallery Blanka, RAFU Gallery, Bincan, Polestar Art Gallery, Inyoung Gallery, Gallery Sou, Tapiial Virtual Gallery, Gallery DOS, JH Gallery 등'}
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
                  <span className="text-charcoal-deep">on Purgatory and its cycle</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">연옥과 그 순환에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 반출생주의에서 연옥으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From antinatalism to Purgatory — the search for an alternative space'
                    : '반출생주의에서 연옥으로 — 대안 공간의 탐색'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        SIM_Moby&apos;s practice does not begin with a style but with a question
                        about existence itself. In childhood, the artist arrived at an antinatalist
                        intuition — that &ldquo;to give birth to one life is to give birth to one
                        death.&rdquo; If birth and death are bound together by the same providence,
                        then is there a place where that providence does not reach?
                      </p>
                      <p>
                        That question became a space. SIM_Moby names it{' '}
                        <em>SIM_Purgatory : 연옥</em>— drawing on the Catholic notion of Purgatory,
                        the realm between heaven and hell, the place before life and death. It is
                        not an escape from reality but a &ldquo;reality-linked afterlife&rdquo;:
                        built from motifs borrowed from this world, fused with the artist&apos;s
                        lived experience, an Eastern identity, monstrous forms, and images imagined
                        from past lives. The aim is a utopia without extinction — an eternity that
                        does not perish.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        심모비의 작업은 양식이 아니라 존재 자체에 대한 물음에서 시작된다. 작가는
                        어릴 적 반출생주의의 직관에 도달했다 — &ldquo;하나의 생명을 낳는 것은 하나의
                        죽음을 낳는 것과 같다.&rdquo; 탄생과 죽음이 같은 섭리로 묶여 있다면, 그
                        섭리가 닿지 않는 장소는 어디일까?
                      </p>
                      <p>
                        그 물음이 하나의 공간이 됐다. 심모비는 그곳을 <em>SIM_Purgatory : 연옥</em>
                        이라 부른다 — 천국과 지옥의 중간, 생과 사 이전의 장소라는 가톨릭 연옥의
                        개념을 빌려. 그것은 현실로부터의 도피가 아니라 &lsquo;현실 연계형
                        내세&rsquo;다. 현세에서 차용한 모티프 위에 작가의 삶의 경험, 동양적 정체성,
                        괴수적 형태, 전생으로부터의 상상 이미지를 융합해 짓는다. 지향점은 소멸 없는
                        유토피아 — 사라지지 않는 영원 이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 메가바이트의 침식 윤회 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The megabyte erosion of reincarnation — paint or print?'
                    : '메가바이트의 침식 윤회 — 채색인가 인쇄인가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The texture of a SIM_Moby work is a deliberate illusion. A first pass is
                        made with physical materials — a sketch — then recorded and transformed in
                        the digital realm. The finished 2D image is delivered to a display, or
                        printed onto a physical surface and summoned back into this world. Standing
                        before it, you cannot tell whether you are looking at oil and acrylic paint
                        or a digital print. That uncertainty is the point.
                      </p>
                      <p>
                        SIM_Moby calls the repeated digital conversion of that initial material
                        texture the &ldquo;megabyte erosion of reincarnation.&rdquo; Each pass
                        through the digital adds erosion and corrosion — a peculiar density that
                        settles on the pixel, carrying the grain of 1990s VHS noise. The image is
                        not cleaned; it is weathered. Matter passes through the machine and comes
                        back changed, the way a memory is changed each time it is recalled.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        심모비 작품의 질감은 의도된 환영이다. 물리적 재료로 1차 작업(스케치)을 한 뒤
                        디지털에서 기록·변환하고, 완성된 2D 이미지를 디스플레이로 전달하거나 물리적
                        표면에 인쇄해 현세로 소환한다. 작품 앞에 서면 유화·아크릴 채색인지 디지털
                        인쇄인지 분간할 수 없다. 그 불확실성이 핵심이다.
                      </p>
                      <p>
                        심모비는 1차 물성의 질감을 디지털에서 여러 차례 변환하는 이 과정을
                        &lsquo;메가바이트의 침식 윤회&rsquo;라 부른다. 디지털을 한 번 통과할 때마다
                        침식과 부식이 더해진다 — 픽셀 위에 얹히는 독특한 밀도감, 1990년대 VHS
                        노이즈의 질감. 이미지는 정제되지 않고 풍화된다. 물질은 기계를 통과해
                        변형되어 돌아온다, 기억이 떠올릴 때마다 달라지듯이.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 콜라주의 불꽃 — 회화의 윤회 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The flame of collage — the reincarnation of painting'
                    : '콜라주의 불꽃 — 회화의 윤회'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The cycle does not end with the print. The printed image is dismantled again
                        — a death — and recombined into collage, reborn. The fragments are not
                        arranged neatly; they are composed as chaos, and in that chaos they become
                        the flame of Catholic Purgatory: the purifying fire that burns away the sins
                        committed in life. A finish of acrylic stick closes the surface.
                      </p>
                      <p>
                        Birth, then death, then birth, then death. Sketch (birth), digitization
                        (death), print (birth), collage (death) — the sequence loops. SIM_Moby calls
                        it the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          reincarnation of painting
                        </strong>
                        . The work is never finished in a single state; it is always passing through
                        one more cycle of making and unmaking, just as a soul in Purgatory passes
                        through fire on the way to somewhere else.
                      </p>
                      <p>
                        SIM_Moby joins this campaign not as a subject of its cause but as a fellow
                        artist in solidarity — so that those navigating financial exclusion today
                        might find a way through.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        순환은 인쇄에서 끝나지 않는다. 인쇄된 이미지는 다시 해체되고 — 죽음 —
                        콜라주로 재결합되어 재탄생한다. 조각들은 가지런히 배열되지 않는다.
                        카오스적으로 구성되며, 그 카오스 속에서 가톨릭 연옥의 불꽃 — 생전의 죄악을
                        불태우는 정화의 불꽃이 된다. 아크릴 스틱으로 표면을 마감한다.
                      </p>
                      <p>
                        탄생, 그리고 죽음, 다시 탄생, 다시 죽음.
                        스케치(탄생)·디지털화(죽음)·인쇄(탄생)· 콜라주(죽음) — 그 순서가 반복된다.
                        심모비는 이것을{' '}
                        <strong className="font-bold text-charcoal-deep">회화의 윤회</strong>라
                        부른다. 작품은 단일한 상태로 완성되지 않는다. 언제나 만들고 허무는 또 한
                        번의 순환을 통과하는 중이다, 연옥의 영혼이 다른 곳으로 가기 위해 불을
                        통과하듯이.
                      </p>
                      <p>
                        심모비는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                        연대자로서 함께한다 — 오늘 금융 차별을 겪는 예술인들이 그 길을 통과할 수
                        있도록.
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
                      From a childhood intuition about birth and death to a 2D landscape of
                      Purgatory, SIM_Moby&apos;s work pursues a single question: can there be a
                      space where life and death no longer rule? The answer is a painting that never
                      stops being reborn — sketched, eroded, printed, torn apart, and made again.
                    </>
                  ) : (
                    <>
                      탄생과 죽음에 대한 어릴 적 직관에서 연옥의 2D 풍경까지, 심모비의 작업은 하나의
                      물음을 추구한다: 생과 사가 더는 지배하지 않는 공간이 있을 수 있는가. 그
                      대답이, 끝내 재탄생을 멈추지 않는 그림이다 — 스케치되고, 침식되고, 인쇄되고,
                      찢기고, 다시 만들어지는.
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
                PURGATORY
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
              <span className="text-xs text-white/70 uppercase tracking-widest">SIM_Moby</span>
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
                    SIM_Moby joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    심모비 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SIM_MOBY_PATH}
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
