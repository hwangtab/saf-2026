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

// 거장 작가 feature는 작가 페이지(/artworks/artist/양운철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const YANG_UNCHEOL_PATH = `/artworks/artist/${encodeURIComponent('양운철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isYangUncheolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '양운철' ||
    n === 'yang un-cheol' ||
    n === 'yang uncheol' ||
    n.replace(/[\s-]+/g, '') === 'yanguncheol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '양운철 — 철학과 종교미술 사이의 회화',
    description:
      '철학과 종교미술을 가로지르는 사유의 화가 양운철. 인천가톨릭대 전통종교미술학과를 졸업하고 서강대 전문대학원에서 철학 석사를 마친 그는, 빈 간격(empty interval)과 자기 자신을 위해 일어서기를 화면에 옮긴다. 명상적이고 국제적인 양운철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '철학과 종교미술 사이를 가로지르는 사유의 화가 양운철. 빈 간격과 일어섬을 회화로 옮긴 중견 작가.',
    ogAlt: '양운철 대표 작품',
    twitterTitle: '양운철',
    twitterDescription: 'empty interval — 철학과 종교미술 사이의 사유, 양운철',
    keywords: '양운철 화가, 전통종교미술, 철학과 회화, empty interval, 명상적 회화, 씨앗페 온라인',
  },
  en: {
    title: 'Yang Un-cheol — Painting between philosophy and sacred art',
    description:
      "Selected works by Yang Un-cheol, a painter whose thought crosses between philosophy and sacred art. A graduate of the Department of Traditional Religious Art at Incheon Catholic University with a master's degree in philosophy from Sogang University Graduate School, he renders the empty interval and the act of standing up for oneself onto the canvas. View and collect his meditative, internationally exhibited works at SAF Online.",
    ogDescription:
      'Yang Un-cheol — a painter crossing between philosophy and sacred art, rendering the empty interval and the act of standing up into painting.',
    ogAlt: 'Yang Un-cheol — featured work',
    twitterTitle: 'Yang Un-cheol',
    twitterDescription: 'empty interval — thought between philosophy and sacred art',
    keywords:
      'Yang Un-cheol artist, traditional religious art, philosophy and painting, empty interval, meditative painting',
  },
} as const;

export async function buildYangUncheolMetadata({
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
  const pageUrl = buildLocaleUrl(YANG_UNCHEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('양운철');
  const artwork = allArtworks.find((a) => isYangUncheolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Yang Un-cheol`
      : `${artwork.title} — 양운철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(YANG_UNCHEOL_PATH, locale, true),
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

export default async function YangUncheolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(YANG_UNCHEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('양운철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isYangUncheolArtist(artwork.artist)
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
    { name: isEnglish ? 'Yang Un-cheol' : '양운철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${YANG_UNCHEOL_PATH}#person-yang-uncheol`,
    name: isEnglish ? 'Yang Un-cheol' : '양운철',
    alternateName: isEnglish ? '양운철' : 'Yang Un-cheol',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Yang Un-cheol is a mid-career Korean painter whose work crosses between philosophy and sacred art, rendering the empty interval and the act of standing up for oneself onto the canvas.'
      : '양운철은 철학과 종교미술을 가로지르는 사유를 회화로 옮기는 한국의 중견 화가로, 빈 간격(empty interval)과 자기 자신을 위해 일어서기를 화면에 담아냅니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Incheon Catholic University, Dept. of Traditional Religious Art'
          : '인천가톨릭대학교 전통종교미술학과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Sogang University Graduate School (M.A. in Philosophy)'
          : '서강대학교 전문대학원 철학과 (석사)',
      },
    ],
    knowsAbout: ['Painting', 'Traditional religious art', 'Philosophy'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Yang Un-cheol — SAF Online' : '양운철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Yang Un-cheol from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 양운철 작품들을 소개합니다.',
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

          {/* Vertical interval lines — 빈 간격(empty interval) 모티프 */}
          <div className="absolute top-0 left-1/4 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-1/4 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Yang Un-cheol · Painter' : '양운철 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  In the empty interval,
                  <br />
                  <span className="text-primary-soft">stand up for yourself</span>
                </>
              ) : (
                <>
                  빈 간격 안에서,
                  <br />
                  <span className="text-primary-soft">스스로를 위해 일어서다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A thought that crosses between philosophy and sacred art.
                  </span>
                  <span className="mt-2 block">
                    The interval between things becomes the surface of meditation.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">철학과 종교미술 사이를 가로지르는 사유.</span>
                  <span className="mt-2 block">사물과 사물 사이의 간격이 명상의 화면이 된다.</span>
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
                    Between two disciplines —<br />
                    <span className="text-primary-strong">philosophy and sacred art</span>
                  </>
                ) : (
                  <>
                    두 학문 사이에서 —<br />
                    <span className="text-primary-strong">철학과 종교미술</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Yang Un-cheol is a mid-career Korean painter whose practice sits at the
                      crossing of two disciplines. He studied at the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Department of Traditional Religious Art at Incheon Catholic University
                      </strong>
                      , and went on to complete a master&apos;s degree in philosophy at Sogang
                      University Graduate School. That double formation — the iconographic grammar
                      of sacred art on one hand, the questioning rigor of philosophy on the other —
                      shapes the temperament of his canvases.
                    </p>
                    <p>
                      His work returns repeatedly to the idea of the <em>empty interval</em>: the
                      space between things, the pause that is not absence but a held breath. Across
                      solo exhibitions he has titled his series with a recurring lowercase
                      &ldquo;c&rdquo; — &ldquo;c ; stand up for yourself&rdquo; (2024), &ldquo;c ;
                      summer&rdquo; (2020) — and earlier, the direct naming of &ldquo;empty
                      interval&rdquo; (2013). The titles read less as descriptions than as quiet
                      instructions to the viewer.
                    </p>
                    <p>
                      The result is a painting that is meditative and contemplative in tone, yet
                      sustained by an international exhibition history. From Tokyo to Antwerp,
                      Beijing, Montreal, and Metro in Indonesia, his canvases have been shown across
                      a range of contexts — carrying the same patient attention to the gap, the
                      threshold, the interval where meaning gathers before it is named.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      양운철은 두 학문이 교차하는 자리에서 작업하는 한국의 중견 화가다. 그는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        인천가톨릭대학교 전통종교미술학과
                      </strong>
                      에서 수학하고, 서강대학교 전문대학원에서 철학 석사를 마쳤다. 종교미술의 도상적
                      문법과 철학의 물음이라는 이중의 형성이 그의 화면의 기질을 빚는다.
                    </p>
                    <p>
                      그의 작업은 <em>빈 간격(empty interval)</em>이라는 생각으로 거듭 돌아온다 —
                      사물과 사물 사이의 공간, 부재가 아니라 머금은 숨인 멈춤. 그는 개인전에서
                      소문자 &lsquo;c&rsquo;를 반복해 연작의 제목을 붙여 왔다. &lsquo;c ; stand up
                      for yourself&rsquo;(2024), &lsquo;c ; summer&rsquo;(2020), 그리고 더 이른
                      시기의 &lsquo;empty interval&rsquo;(2013). 제목들은 묘사라기보다 보는 이를
                      향한 조용한 청유처럼 읽힌다.
                    </p>
                    <p>
                      그 결과는 명상적이고 사색적인 톤의 회화이지만, 국제적인 전시 이력이 그것을
                      떠받친다. 일본 동경에서 벨기에 엔트워프, 중국 북경, 캐나다 몬트리올,
                      인도네시아 메트로에 이르기까지, 그의 화면은 여러 맥락에서 소개되어 왔다 —
                      간격과 문턱, 의미가 명명되기 전에 모이는 간극을 향한 같은 인내의 시선을
                      품고서.
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
                        {isEnglish ? 'The empty interval' : '빈 간격'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The space between things — a pause that is not absence but a held breath, the threshold where meaning gathers.'
                          : '사물과 사물 사이의 공간 — 부재가 아니라 머금은 숨인 멈춤, 의미가 모이는 문턱.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Philosophy and sacred art' : '철학과 종교미술'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A double formation — the iconographic grammar of traditional religious art crossed with the questioning rigor of philosophy.'
                          : '이중의 형성 — 전통종교미술의 도상적 문법과 철학의 물음이 교차한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Stand up for yourself' : '스스로를 위해 일어서기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A meditative, contemplative address to the viewer — the act of standing up for oneself, carried across an international exhibition history.'
                          : '명상적이고 사색적인, 보는 이를 향한 청유 — 자기 자신을 위해 일어서기, 국제적 전시 이력을 가로지르며.'}
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
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition "clean, Cloud", Gallery Hoshi, Tokyo, Japan.'
                        : '개인전 〈clean, Cloud〉, 갤러리호시, 일본 동경.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in Hadae-ri Summer Forest Art Festival, Gangwon Province (residency).'
                        : '하대리 여름숲속미술제 참여(강원도).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Resident at the Gwangju Museum of Art Creative Studio.'
                        : '광주시립미술관 창작스튜디오 입주.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition "THE FORGOTTEN TIME", Love2arts gallery, Antwerp, Belgium.'
                        : '단체전 〈THE FORGOTTEN TIME〉, Love2arts gallery, 벨기에 엔트워프.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition "empty interval", Gallery The K.'
                        : '개인전 〈empty interval〉, 갤러리더케이.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition "The World They See — Three Sensitive Gazes", Chosun University Museum of Art.'
                        : '단체전 〈그들이 보는 세상-세 개의 예민한 시선〉, 조선대학교미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition "c ; summer", Yangchul Seoul.'
                        : '개인전 〈c ; summer〉, 양출서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gallery opening exhibition (Edition, Montreal, Canada); Selasart International Visual Art Exhibition (Metro, Indonesia).'
                        : '갤러리 개관전(Edition, 캐나다 몬트리올); Selasart International Visual Art Exhibition(인도네시아 메트로).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition "Eternal Moments", Gallery Graf.'
                        : '단체전 〈Eternal Moments〉, 갤러리그라프.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition "c ; stand up for yourself", Gallery O-U-Do, Seoul.'
                        : '개인전 〈c ; stand up for yourself〉, 갤러리오우도, 서울.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & residencies' : '주요 전시 및 레지던시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: "c ; stand up for yourself" (Gallery O-U-Do, Seoul, 2024), "c ; summer" (Yangchul Seoul, 2020), "empty interval" (Gallery The K, 2013), "clean, Cloud" (Gallery Hoshi, Tokyo, 2008)'
                        : '개인전: 〈c ; stand up for yourself〉(갤러리오우도, 서울, 2024), 〈c ; summer〉(양출서울, 2020), 〈empty interval〉(갤러리더케이, 2013), 〈clean, Cloud〉(갤러리호시, 일본 동경, 2008)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: "Eternal Moments" (Gallery Graf, 2023), gallery opening exhibition (Edition, Montreal, 2022), Selasart International Visual Art Exhibition (Metro, Indonesia, 2022), "The World They See — Three Sensitive Gazes" (Chosun University Museum of Art, 2014), "THE FORGOTTEN TIME" (Love2arts gallery, Antwerp, 2009), "99Tents, 99 Dreams, One World" (Zuoyou Art Museum, Beijing, 2008)'
                        : '단체전: 〈Eternal Moments〉(갤러리그라프, 2023), 갤러리 개관전(Edition, 캐나다 몬트리올, 2022), Selasart International Visual Art Exhibition(인도네시아 메트로, 2022), 〈그들이 보는 세상-세 개의 예민한 시선〉(조선대학교미술관, 2014), 〈THE FORGOTTEN TIME〉(Love2arts gallery, 벨기에 엔트워프, 2009), 〈99Tents, 99 Dreams, One World〉(좌우미술관, 중국 북경, 2008)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Residencies: Gwangju Museum of Art Creative Studio (2009); Hadae-ri Summer Forest Art Festival, Gangwon Province (2008)'
                        : '레지던시: 광주시립미술관 창작스튜디오(2009); 하대리 여름숲속미술제(강원도, 2008)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 양운철 charcoal 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the interval and the gaze</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">간격과 시선에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 두 학문 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Between two disciplines — sacred art and philosophy'
                    : '두 학문 사이에서 — 종교미술과 철학'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Yang Un-cheol&apos;s formation is unusual. He studied at the Department of
                        Traditional Religious Art at Incheon Catholic University — a curriculum
                        grounded in iconography, in the long grammar of how the sacred has been made
                        visible. He then crossed into a different register entirely, completing a
                        master&apos;s degree in philosophy at Sogang University Graduate School.
                      </p>
                      <p>
                        These are not adjacent fields. One teaches the inherited image; the other
                        teaches the suspicion of every inherited certainty. To hold both is to paint
                        with one hand reaching for the iconographic and the other withholding it,
                        asking what an image is allowed to claim. The tension is productive: it
                        keeps his surfaces from settling into either devotion or mere concept.
                      </p>
                      <p>
                        What emerges is a painting that treats the gap itself as subject — not the
                        thing depicted, but the interval around it, the space philosophy would call
                        the condition for meaning and sacred art would call the threshold of the
                        unseen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        양운철의 형성은 흔치 않다. 그는 인천가톨릭대학교 전통종교미술학과에서
                        수학했다 — 도상학에, 신성한 것이 어떻게 가시화되어 왔는가의 오랜 문법에 뿌리
                        내린 교육이다. 그런 뒤 그는 전혀 다른 영역으로 건너가 서강대학교
                        전문대학원에서 철학 석사를 마쳤다.
                      </p>
                      <p>
                        둘은 인접한 분야가 아니다. 하나는 물려받은 이미지를 가르치고, 다른 하나는
                        물려받은 모든 확실성에 대한 의심을 가르친다. 둘을 함께 쥔다는 것은, 한
                        손으로는 도상을 향해 뻗고 다른 손으로는 그것을 거두며 이미지가 무엇을
                        주장해도 되는지를 묻는 일이다. 그 긴장은 생산적이다 — 그의 화면이 경배로도,
                        단순한 개념으로도 가라앉지 않게 붙든다.
                      </p>
                      <p>
                        그렇게 떠오르는 것은 간극 자체를 주제로 삼는 회화다 — 묘사된 사물이 아니라
                        그 둘레의 간격, 철학이 의미의 조건이라 부르고 종교미술이 보이지 않는 것의
                        문턱이라 부를 그 공간.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. empty interval */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'empty interval — the space between things'
                    : 'empty interval — 사물과 사물 사이'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2013, Yang titled a solo exhibition <em>empty interval</em>. The phrase
                        has stayed with the work since, less a single show than a continuing
                        proposition: that the interval between things is not empty in the sense of
                        lacking, but empty in the sense of cleared, available, ready to hold.
                      </p>
                      <p>
                        It is a contemplative position. The paintings ask the viewer to slow to the
                        pace of the pause — to attend to what sits between figures, between the
                        marked and the unmarked, where a held breath becomes visible. This is the
                        register of meditation, and it is consistent across more than a decade of
                        work.
                      </p>
                      <p>
                        The recurring lowercase <em>c</em> in his later series titles — &ldquo;c ;
                        summer&rdquo;, &ldquo;c ; stand up for yourself&rdquo; — reads as a
                        continued notation of this interval: a small mark, deliberately kept minor,
                        holding open a space the eye must enter on its own.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2013년, 양운철은 개인전에 <em>empty interval</em>이라는 제목을 붙였다. 그
                        말은 이후 작업과 함께 머물러 왔다 — 하나의 전시라기보다 이어지는 명제로서.
                        사물과 사물 사이의 간격은 결핍의 의미에서 비어 있는 것이 아니라, 치워지고
                        내어주어 머금을 준비가 된 의미에서 비어 있다는 명제.
                      </p>
                      <p>
                        그것은 사색의 자리다. 그림들은 보는 이에게 멈춤의 속도로 느려질 것을 청한다
                        — 형상과 형상 사이, 표시된 것과 표시되지 않은 것 사이에 놓인 것에, 머금은
                        숨이 가시화되는 자리에 머물 것을. 이것은 명상의 음역이고, 10년이 넘는 작업에
                        걸쳐 일관된다.
                      </p>
                      <p>
                        후기 연작 제목에 반복되는 소문자 <em>c</em> — &lsquo;c ; summer&rsquo;,
                        &lsquo;c ; stand up for yourself&rsquo; — 는 이 간격의 이어진 표기처럼
                        읽힌다. 일부러 작게 둔 작은 표식이, 눈이 스스로 들어서야 할 공간을 열어
                        둔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 일어서기 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'stand up for yourself — an international gaze'
                    : 'stand up for yourself — 국제적 시선'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 2024 solo exhibition <em>c ; stand up for yourself</em>, held at Gallery
                        O-U-Do in Seoul, gives the meditative practice a quiet imperative. The
                        instruction is gentle but it is an instruction: to rise, on one&apos;s own
                        behalf, within the cleared interval the work has been preparing.
                      </p>
                      <p>
                        That address has travelled. Yang&apos;s exhibition history is markedly
                        international — Tokyo (2008), Beijing (2008), Antwerp (2009), and in 2022
                        both Montreal and Metro in Indonesia. His paintings have been shown across
                        contexts that share little but the patience his surfaces ask for. The
                        contemplative does not stay local; the interval translates.
                      </p>
                      <p>
                        Yang joins this campaign in the same spirit — not as a subject of its cause
                        but as a fellow artist in solidarity, so that the conditions for slow,
                        considered work might be extended to those who need them.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2024년 서울 갤러리오우도에서 열린 개인전 <em>c ; stand up for yourself</em>
                        는 명상적 작업에 조용한 청유를 더한다. 그 청은 부드럽지만 청유다 — 작업이
                        준비해 온 치워진 간격 안에서, 자기 자신을 위하여 일어서라는.
                      </p>
                      <p>
                        그 청은 멀리 갔다. 양운철의 전시 이력은 뚜렷이 국제적이다 — 일본 동경(2008),
                        중국 북경(2008), 벨기에 엔트워프(2009), 그리고 2022년의 캐나다 몬트리올과
                        인도네시아 메트로. 그의 그림은 그의 화면이 청하는 인내 외에는 공유하는 것이
                        적은 여러 맥락에서 소개되어 왔다. 사색은 지역에 머물지 않는다 — 간격은
                        번역된다.
                      </p>
                      <p>
                        양운철은 같은 마음으로 이 캠페인에 함께한다 — 이 캠페인의 대상으로서가
                        아니라, 동료 예술인과의 연대자로서. 느리고 사려 깊은 작업의 조건이 그것을
                        필요로 하는 이들에게 닿을 수 있도록.
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
                      From the iconographic grammar of sacred art to the questioning of philosophy,
                      Yang Un-cheol&apos;s work has pursued a single space: the empty interval, the
                      cleared gap where meaning gathers before it is named. He joins this campaign
                      not as a subject of its cause but as a fellow artist in solidarity — so that
                      others might have the room to stand up for themselves.
                    </>
                  ) : (
                    <>
                      종교미술의 도상적 문법에서 철학의 물음까지, 양운철의 작업은 하나의 공간을
                      추구해 왔다 — 빈 간격, 의미가 명명되기 전에 모이는 치워진 간극. 그는 이
                      캠페인에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 다른 이들이 스스로를 위해 일어설 자리를 가질 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Yang Un-cheol</span>
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
                    Yang Un-cheol joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    양운철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={YANG_UNCHEOL_PATH}
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
