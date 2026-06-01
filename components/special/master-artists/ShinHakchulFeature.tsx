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

// 거장 작가 feature는 작가 페이지(/artworks/artist/신학철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SHIN_HAKCHUL_PATH = `/artworks/artist/${encodeURIComponent('신학철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isShinHakchulArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '신학철' ||
    n === 'shin hak-chul' ||
    n === 'shin hakchul' ||
    n.replace(/[\s-]+/g, '') === 'shinhakchul'
  );
};

const PAGE_COPY = {
  ko: {
    title: '신학철 — 한국현대사 연작의 거장',
    description:
      '한국현대사 연작의 거장 신학철(1943–). 인체와 사물이 기관차처럼 수직으로 응축되는 포토몽타주로 한 세기의 한국 근현대사를 그린 민중미술 1세대 거장. 「모내기」 사건으로 표현의 자유의 상징이 된 신학철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '한국현대사 연작의 거장 신학철. 인체와 사물이 수직으로 응축되는 포토몽타주로 한 세기의 역사를 한 화면에 담아낸 민중미술 1세대.',
    ogAlt: '신학철 대표 작품',
    twitterTitle: '신학철',
    twitterDescription: '역사는 수직으로 쌓인다 — 한국현대사 연작의 거장 신학철',
    keywords: '신학철 화가, 한국근대사, 한국현대사, 포토몽타주, 민중미술, 모내기, 씨앗페 온라인',
  },
  en: {
    title: 'Shin Hak-chul — Master of the Korean History Series',
    description:
      'Selected works by Shin Hak-chul (b. 1943), master of the Korean modern history series. Through photomontage in which bodies and objects compress vertically like a locomotive, he painted a century of Korean history. A first-generation minjung art master who became a symbol of free expression through the 〈Rice Planting〉 case. View and collect his works at SAF Online.',
    ogDescription:
      'Shin Hak-chul — master of the Korean history series. Photomontage that compresses a century of history into a single vertical frame.',
    ogAlt: 'Shin Hak-chul — featured work',
    twitterTitle: 'Shin Hak-chul',
    twitterDescription: 'History stacks vertically — master of the Korean modern history series',
    keywords:
      'Shin Hak-chul artist, Korean modern history, photomontage, minjung misul, Korean political art',
  },
} as const;

export async function buildShinHakchulMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl(SHIN_HAKCHUL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('신학철');
  const artwork = allArtworks.find((a) => isShinHakchulArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Shin Hak-chul`
      : `${artwork.title} — 신학철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SHIN_HAKCHUL_PATH, locale, true),
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

export default async function ShinHakchulFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SHIN_HAKCHUL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('신학철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isShinHakchulArtist(artwork.artist)
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
    { name: isEnglish ? 'Shin Hak-chul' : '신학철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SHIN_HAKCHUL_PATH}#person-shin-hakchul`,
    name: isEnglish ? 'Shin Hak-chul' : '신학철',
    alternateName: isEnglish ? '신학철' : 'Shin Hak-chul',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Shin Hak-chul (b. 1943) is a first-generation Korean minjung art master who painted a century of Korean modern history through photomontage in which bodies and objects compress vertically.'
      : '신학철(1943–)은 인체와 사물이 수직으로 응축되는 포토몽타주로 한 세기의 한국 근현대사를 그려온 민중미술 1세대 거장입니다.',
    birthDate: '1943-12-12',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Gimcheon, North Gyeongsang, South Korea' : '경북 김천',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Western Painting' : '홍익대학교 서양화과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish
        ? "Minjung Misul Hyeopuihoe (National Artists' Association)"
        : '민족미술협의회',
    },
    knowsAbout: ['Photomontage', 'Korean minjung art', 'Korean modern history'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Shin Hak-chul — SAF Online' : '신학철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Shin Hak-chul from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 신학철 작품들을 소개합니다.',
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

          {/* Vertical strata lines — 역사의 지층 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Shin Hak-chul · b. 1943' : '신학철 · 1943–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  History stacks vertically
                  <br />
                  <span className="text-primary-soft">through a single body</span>
                </>
              ) : (
                <>
                  역사는 한 사람의 몸에
                  <br />
                  <span className="text-primary-soft">수직으로 쌓인다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He compressed the weight of a century into a single frame.
                  </span>
                  <span className="mt-2 block">
                    Bodies and objects stacked like a locomotive of Korean modern history.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한 세기의 무게를 한 화면에 응축하다.</span>
                  <span className="mt-2 block">
                    인체와 사물이 기관차처럼 쌓여 올라가는 한국 근현대사.
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
                    History, stacked —<br />
                    <span className="text-primary-strong">a century compressed into one frame</span>
                  </>
                ) : (
                  <>
                    쌓아 올린 역사 —<br />
                    <span className="text-primary-strong">한 화면에 응축된 한 세기</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Shin Hak-chul (b. 1943) was born in Gimcheon and graduated from Hongik
                      University&apos;s Department of Western Painting in 1968, starting out as a
                      modernist. Through the 1970s he experimented with objet and collage — the{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        〈Emergency Escape〉
                      </strong>{' '}
                      series belongs to this period.
                    </p>
                    <p>
                      The turning point came in 1978. After the shock of encountering the photo
                      anthology &ldquo;A Century of Korea in Photographs,&rdquo; he moved beyond
                      personal formal experiment toward the{' '}
                      <strong className="font-bold text-charcoal">
                        collective memory of an era
                      </strong>
                      . Cutting and pasting images from newspapers, magazines, and textbooks, he
                      created the 〈Korean Modern History〉 and 〈Korean Contemporary History〉
                      series — photomontages in which bodies and objects compress vertically like a
                      locomotive.
                    </p>
                    <p>
                      In his work, history is not laid out flat but stacked vertically. A single
                      body becomes the cross-section of an era, and those cross-sections accumulate
                      layer upon layer into the strata of Korean modern history. He is a master who
                      embodied the historical consciousness of first-generation minjung art in form
                      itself.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      신학철(1943–)은 경북 김천에서 태어나 1968년 홍익대학교 서양화과를 졸업하며
                      모더니스트로 출발했다. 1970년대에는 오브제와 콜라주로 실험을 거듭했다 —{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        「비상탈출」
                      </strong>{' '}
                      연작이 이 시기의 산물이다.
                    </p>
                    <p>
                      전환점은 1978년이었다. 사진집 「사진으로 보는 한국 백년」을 접한 충격 이후,
                      그는 개인의 조형 실험을 넘어{' '}
                      <strong className="font-bold text-charcoal">한 세기의 집단적 기억</strong>
                      으로 향했다. 신문·잡지·교과서의 이미지를 오려 붙인 포토몽타주로, 인체와 사물이
                      기관차처럼 수직으로 응축되는 「한국근대사」·「한국현대사」 연작이 태어났다.
                    </p>
                    <p>
                      그의 화면에서 역사는 평면에 나열되지 않고 수직으로 쌓인다. 한 사람의 몸이 곧
                      한 시대의 단면이 되고, 그 단면들이 겹겹이 축적되어 한국 근현대사의 지층을
                      이룬다. 그는 민중미술 1세대의 역사의식을 형식 그 자체로 구현한 거장이다.
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
                        {isEnglish ? 'Vertical montage' : '수직 몽타주'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Bodies and objects compress like a locomotive — history rendered not as a flat sequence but as vertical strata.'
                          : '인체·사물이 기관차처럼 응축되는 형식미. 역사를 평면이 아닌 수직의 지층으로 그린다.'}
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
                          ? '〈Rice Planting〉 and free expression'
                          : '「모내기」와 표현의 자유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His 1987 〈Rice Planting〉 was seized under the National Security Act in 1989. Acquitted twice, convicted in 1999 — yet in 2004 the UN Human Rights Committee ruled it a violation of freedom of expression.'
                          : '1987년 작 「모내기」는 1989년 국가보안법으로 압수되고 작가는 구속됐다. 1·2심 무죄에도 1999년 유죄가 확정됐으나, 2004년 UN 자유권규약위원회는 표현의 자유 침해를 인정했다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Historical consciousness' : '민중미술 1세대의 역사의식'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A gaze fixed on the collective and on history rather than the individual — his work stands as testimony to an era.'
                          : '개인이 아닌 집단과 역사를 향하는 시선. 그의 작업은 한 시대의 증언이자 기록이다.'}
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
                      1943
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Gimcheon, North Gyeongsang province.'
                        : '경북 김천 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1968
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Dept. of Western Painting.'
                        : '홍익대학교 서양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Experiments with objet and collage; the 〈Emergency Escape〉 series.'
                        : '오브제·콜라주 실험, 「비상탈출」 연작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1978
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Encounters "A Century of Korea in Photographs"; turns toward history.'
                        : '사진집 「사진으로 보는 한국 백년」을 접하고 작업 전환.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1980s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins the 〈Korean Modern History〉 & 〈Korean Contemporary History〉 series.'
                        : '「한국근대사」·「한국현대사」 연작 발표, 포토몽타주 양식 확립.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Paints 〈Rice Planting〉.' : '「모내기」 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Rice Planting〉 seized under the National Security Act; the artist is detained.'
                        : '「모내기」 국가보안법상 이적표현물로 압수, 작가 구속.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1999
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'After Supreme Court remand, convicted (10-month suspended sentence); the work is confiscated.'
                        : '대법원 파기환송 후 유죄 확정(징역 10개월 선고유예), 작품 몰수.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The UN Human Rights Committee rules the conviction a violation of free expression.'
                        : 'UN 자유권규약위원회, 표현의 자유 침해 인정·시정 권고.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Rice Planting〉 placed in the custody of MMCA.'
                        : '「모내기」 국립현대미술관 위탁보관.'}
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
                      {isEnglish ? (
                        <>
                          Group exhibition:{' '}
                          <a
                            href="https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《15 Years of Minjung Art: 1980–1994》, MMCA (1994)
                          </a>
                        </>
                      ) : (
                        <>
                          단체전:{' '}
                          <a
                            href="https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《민중미술 15년: 1980–1994》, 국립현대미술관 (1994)
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Numerous solo exhibitions — Hakgojae Gallery and others'
                        : '개인전 다수 — 학고재갤러리 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA, Seoul Museum of Art'
                        : '소장: 국립현대미술관, 서울시립미술관'}
                    </span>
                  </li>
                </ul>
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Shin Hak-chul</span>
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
                    Shin Hak-chul joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    신학철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SHIN_HAKCHUL_PATH}
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
