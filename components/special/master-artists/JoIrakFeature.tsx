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

// 거장 작가 feature는 작가 페이지(/artworks/artist/조이락)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JO_IRAK_PATH = `/artworks/artist/${encodeURIComponent('조이락')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJoIrakArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '조이락' || n === 'jo irak' || n === 'jo i-rak' || n.replace(/[\s-]+/g, '') === 'joirak'
  );
};

const PAGE_COPY = {
  ko: {
    title: '조이락 — 700년의 아름다움을 되살리는 고려불화 재현 작가',
    description:
      '서양화에서 고려불화로 전향한 재현 작가 조이락. 수월관음도를 비롯한 고려 불교회화를 비단에 금니와 채색으로 되살린다. 20여 년간 고려불화 재현에 매진하며 뉴욕·LA 등 해외에 그 아름다움을 알려온 조이락의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '서양화에서 고려불화로 전향한 재현 작가 조이락. 비단 위 금니와 채색으로 700년 전 수월관음도의 미감을 되살린다.',
    ogAlt: '조이락 대표 작품',
    twitterTitle: '조이락',
    twitterDescription: '700년의 아름다움을 되살리다 — 고려불화 재현 작가 조이락',
    keywords: '조이락 작가, 고려불화, 수월관음도, 불화 재현, 비단 배채법, 금니, 씨앗페 온라인',
  },
  en: {
    title: 'Jo Irak — Reviving the 700-Year Beauty of Goryeo Buddhist Painting',
    description:
      'Selected works by Jo Irak, who turned from Western painting to the reproduction of Goryeo Buddhist painting. Through gold and color on silk, she revives the Water-Moon Avalokiteshvara and other Goryeo Buddhist works. For over two decades she has devoted herself to this reproduction, sharing its beauty in New York, Los Angeles, and beyond. View and collect her works at SAF Online.',
    ogDescription:
      'Jo Irak — a reproduction artist who turned from Western painting to Goryeo Buddhist painting, reviving the 700-year beauty of the Water-Moon Avalokiteshvara in gold and color on silk.',
    ogAlt: 'Jo Irak — featured work',
    twitterTitle: 'Jo Irak',
    twitterDescription:
      'Reviving a 700-year beauty — Goryeo Buddhist painting reproduction artist Jo Irak',
    keywords:
      'Jo Irak artist, Goryeo Buddhist painting, Water-Moon Avalokiteshvara, Buddhist painting reproduction, silk back-coloring, Korean Buddhist art',
  },
} as const;

export async function buildJoIrakMetadata({
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
  const pageUrl = buildLocaleUrl(JO_IRAK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('조이락');
  const artwork = allArtworks.find((a) => isJoIrakArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jo Irak`
      : `${artwork.title} — 조이락`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JO_IRAK_PATH, locale, true),
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

export default async function JoIrakFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JO_IRAK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('조이락');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isJoIrakArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Jo Irak' : '조이락', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JO_IRAK_PATH}#person-jo-irak`,
    name: isEnglish ? 'Jo Irak' : '조이락',
    alternateName: isEnglish ? '조이락' : 'Jo Irak',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Jo Irak is a mid-career Korean artist who turned from Western painting to the reproduction of Goryeo Buddhist painting, devoting over two decades to reviving works such as the Water-Moon Avalokiteshvara in gold and color on silk.'
      : '조이락은 서양화에서 고려불화로 전향하여, 수월관음도를 비롯한 고려 불교회화를 비단에 금니와 채색으로 되살리는 데 20여 년을 매진해 온 중견 작가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Yongin University, Graduate School (M.A., Goryeo Buddhist painting & relic reproduction)'
        : '용인대학교 대학원 (고려불화·유물재현 석사)',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish
        ? 'Jo Irak Goryeo Buddhist Painting Research Institute'
        : '조이락 고려불화연구소',
    },
    knowsAbout: [
      'Goryeo Buddhist painting',
      'Water-Moon Avalokiteshvara',
      'Buddhist painting reproduction',
      'Cultural heritage conservation',
    ],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jo Irak — SAF Online' : '조이락 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jo Irak from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 조이락 작품들을 소개합니다.',
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

          {/* Vertical strata lines — 비단 올·금선 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jo Irak · Goryeo Buddhist Painting' : '조이락 · 고려불화 재현'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Reviving a beauty
                  <br />
                  <span className="text-primary-soft">seven centuries old</span>
                </>
              ) : (
                <>
                  700년의 아름다움을
                  <br />
                  <span className="text-primary-soft">되살리다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From Western canvas to the silk of Goryeo Buddhist painting.
                  </span>
                  <span className="mt-2 block">
                    The Water-Moon Avalokiteshvara, restored in gold and color.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">서양화의 캔버스에서 고려불화의 비단으로.</span>
                  <span className="mt-2 block">금니와 채색으로 되살아나는 수월관음도.</span>
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
                    A 700-year beauty —<br />
                    <span className="text-primary-strong">restored thread by thread</span>
                  </>
                ) : (
                  <>
                    700년의 미감 —<br />
                    <span className="text-primary-strong">한 올 한 올 되살리다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jo Irak studied Western painting at Dong-A University and Pusan National
                      University, and began her career as a Western-style painter. The decisive turn
                      came with her encounter with the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Water-Moon Avalokiteshvara
                      </strong>{' '}
                      of Goryeo Buddhist painting — a beauty that drew her away from oil and canvas
                      toward silk, gold, and mineral pigment.
                    </p>
                    <p>
                      She earned a master&apos;s degree in Goryeo Buddhist painting and relic
                      reproduction at the Graduate School of Yongin University, and took part in
                      relic reproduction work at the Jeongjae Cultural Heritage Conservation
                      Institute. The reproduction of Goryeo Buddhist painting is not copying but
                      restoration: the painstaking reconstruction of a 700-year-old aesthetic,
                      drawing thread by thread, layer by layer, in techniques the Goryeo masters
                      themselves used.
                    </p>
                    <p>
                      For more than two decades she has devoted herself to this reproduction. Among
                      the roughly 160 Goryeo Buddhist paintings that survive in the world today —
                      most of them dispersed abroad — the Water-Moon Avalokiteshvara is one of the
                      most celebrated subjects, painted on semitransparent silk and accented with
                      gold (geumni). Jo Irak revives this tradition: studying the originals,
                      reconstructing the back-coloring method (baechae) by which Goryeo painters
                      applied pigment to both sides of the silk, and bringing the work back to its
                      first luminosity.
                    </p>
                    <p>
                      She has carried the beauty of Goryeo Buddhist painting abroad — to New York,
                      Los Angeles, and beyond. Her reproductions are held in the collections of the
                      National Museum of Korea, the Seoul Museum of History, and the city of Suwon,
                      among others. Through her hands, a tradition that might have remained sealed
                      in museum vaults speaks again to a living audience.
                    </p>
                    <p>
                      Today she leads the Jo Irak Goryeo Buddhist Painting Research Institute, holds
                      certification as a cultural-heritage repair technician (mosagong no. 7148 and
                      conservation-treatment technician no. 7547), and teaches at the Muusu Academy.
                      Her practice unites two vocations rarely joined in one hand: the artist who
                      paints and the conservator who preserves.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      조이락은 동아대학교와 부산대학교에서 서양화를 전공하고, 서양화가로 활동을
                      시작했다. 전환점은{' '}
                      <strong className="font-bold text-charcoal-deep">고려불화 수월관음도</strong>
                      와의 만남이었다 — 유화와 캔버스를 떠나 비단과 금니, 광물 안료로 그를 이끈
                      아름다움이었다.
                    </p>
                    <p>
                      그는 용인대학교 대학원에서 고려불화·유물재현으로 석사 학위를 받았고,
                      정재문화재 보존연구소에서 유물재현 작업에 참여했다. 고려불화의 재현은 단순한
                      모사가 아니라 복원이다. 700년 전의 미감을, 고려 화공이 썼던 그 기법 그대로, 한
                      올 한 올, 한 겹 한 겹 되살려 내는 지난한 작업이다.
                    </p>
                    <p>
                      그는 20여 년간 이 재현에 매진해 왔다. 오늘날 세계에 전하는 고려불화는 약 160여
                      점, 그마저 대부분이 해외에 흩어져 있다. 그중에서도 수월관음도는 가장 사랑받는
                      주제로, 반투명한 비단 위에 금니로 화사하게 수놓아진다. 조이락은 이 전통을
                      되살린다 — 원본을 연구하고, 고려 화공이 비단의 앞뒤 양면에 안료를 입히던{' '}
                      <strong className="font-bold text-charcoal">배채법(背彩法)</strong>을
                      복원하여, 작품을 본래의 광휘로 되돌린다.
                    </p>
                    <p>
                      그는 고려불화의 아름다움을 뉴욕·LA 등 해외에 알려 왔다. 그의 재현 작품은
                      국립중앙박물관·서울역사박물관·수원시청 등에 소장되어 있다. 그의 손을 거쳐,
                      박물관 수장고에 봉인되어 있을 법한 전통이 오늘의 관객에게 다시 말을 건넨다.
                    </p>
                    <p>
                      현재 그는 조이락 고려불화연구소를 이끌고 있으며, 문화재수리기능자(모사공
                      7148호·보존처리공 7547)이자 무우수아카데미 강사로 활동한다. 그의 작업은 한
                      손으로 좀처럼 겹치기 어려운 두 소명을 잇는다 — 그리는 화가와 지키는 보존가.
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
                        {isEnglish ? 'The Water-Moon Avalokiteshvara' : '수월관음도'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The bodhisattva of compassion gazing upon the moon mirrored in water — the most celebrated subject of Goryeo Buddhist painting, reborn in gold and color.'
                          : '물에 비친 달을 바라보는 자비의 보살 — 고려불화에서 가장 사랑받은 주제를 금니와 채색으로 되살린다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Gold and color on silk' : '비단 위 금니와 채색'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The back-coloring method (baechae) — pigment applied to both sides of semitransparent silk — gives Goryeo painting its deep, luminous color. Jo Irak reconstructs it faithfully.'
                          : '반투명한 비단의 앞뒤에 안료를 입히는 배채법이 고려불화 특유의 깊고 은은한 색을 낳는다. 조이락은 이를 충실히 복원한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Heritage and transmission' : '문화재 보존과 전승'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'As both artist and certified conservator, she preserves a tradition scattered abroad and carries it to a new generation.'
                          : '화가이자 보존 기능자로서, 해외로 흩어진 전통을 지켜 내고 다음 세대로 잇는다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's path" : '작가의 길'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      {isEnglish ? 'Western painting' : '서양화'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studies Western painting at Dong-A University and Pusan National University; begins as a Western-style painter.'
                        : '동아대학교·부산대학교에서 서양화 전공, 서양화가로 활동 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      {isEnglish ? 'The turn' : '전향'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Drawn by the beauty of the Goryeo Water-Moon Avalokiteshvara, turns from Western painting to Buddhist painting reproduction.'
                        : '고려불화 수월관음도의 아름다움에 매료되어 불화 재현으로 전향.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      M.A.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Master of Goryeo Buddhist painting & relic reproduction, Graduate School of Yongin University.'
                        : '용인대학교 대학원 고려불화·유물재현 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      {isEnglish ? 'Conservation' : '유물재현'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Takes part in relic reproduction at the Jeongjae Cultural Heritage Conservation Institute.'
                        : '정재문화재보존연구소에서 유물재현 작업 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition of Buddhist painting, Yongin University Museum.'
                        : '불교회화전 개인전, 용인대학교 박물관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Goryeo Buddhist painting reproduction exhibition, Proxy Place Gallery, Los Angeles.'
                        : '고려불화 재현전, 프록시플레이스 갤러리(LA).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Goryeo Buddhist painting reproduction exhibition, Flushing Town Hall, New York.'
                        : '고려불화 재현전, 프러싱 타운홀(뉴욕).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Two-person exhibition with Kim Kyung-ho, Tibet House, New York.'
                        : '김경호+조이락 2인전, 티벳하우스(뉴욕).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Hidden Flower: The Way to the Beloved〉, Seoul.'
                        : '개인전 〈숨은꽃 님에게 가는 길〉, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈Eohwa-dungdung, My Child!〉 (Hanok Gallery, Seoul) and 〈Paramita Bloomed as a Flower〉 (Mahabodhi Seonwon, Gyeongju).'
                        : '개인전 〈어화둥둥 아가야!〉(한옥갤러리, 서울)·〈꽃으로 핀 바라밀〉(마하보디선원, 경주).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20 break-keep">
                      {isEnglish ? 'Now' : '현재'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Leads the Jo Irak Goryeo Buddhist Painting Research Institute; certified heritage repair technician; instructor at Muusu Academy.'
                        : '조이락 고려불화연구소 운영, 문화재수리기능자(모사공 7148호·보존처리공 7547), 무우수아카데미 강사.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: around ten, including 〈Eohwa-dungdung, My Child!〉 (Hanok Gallery, 2021), 〈Paramita Bloomed as a Flower〉 (Mahabodhi Seonwon, Gyeongju, 2021), 〈The Hidden Flower〉 (Seoul, 2020), the Goryeo Buddhist painting reproduction exhibition (Proxy Place Gallery, LA, 2015), and a Buddhist painting exhibition (Yongin University Museum, 2005).'
                        : '개인전: 〈어화둥둥 아가야!〉(한옥갤러리, 2021)·〈꽃으로 핀 바라밀〉(마하보디선원, 경주, 2021)·〈숨은꽃 님에게 가는 길〉(서울, 2020)·고려불화 재현전(프록시플레이스 갤러리, LA, 2015)·불교회화전(용인대 박물관, 2005) 등 10여 회.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invitational & curated exhibitions: around thirty, including the two-person exhibition with Kim Kyung-ho (Tibet House, New York, 2019) and the Goryeo Buddhist painting reproduction exhibition (Flushing Town Hall, New York, 2017).'
                        : '초대 기획전: 김경호+조이락 2인전(티벳하우스, 뉴욕, 2019)·고려불화 재현전(프러싱 타운홀, 뉴욕, 2017) 등 30여 회.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: National Museum of Korea, Seoul Museum of History, the city of Suwon, and others.'
                        : '소장: 국립중앙박물관·서울역사박물관·수원시청 등.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Certified cultural-heritage repair technician (mosagong no. 7148; conservation-treatment technician no. 7547); instructor at Muusu Academy.'
                        : '문화재수리기능자(모사공 7148호·보존처리공 7547), 무우수아카데미 강사.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 고려불화 장르적 깊이 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on Goryeo painting and its revival</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">고려불화와 그 되살림에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 고려불화란 무엇인가 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'What Goryeo Buddhist painting is — a beauty of the 13th–14th centuries'
                    : '고려불화란 무엇인가 — 13~14세기의 아름다움'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most surviving Goryeo Buddhist paintings date to the late Goryeo dynasty,
                        the 13th and 14th centuries. They were commissioned by the ruling class and
                        enshrined in temples and homes as objects of devotion. Roughly 160 survive
                        in the world today — and the great majority, around 130, are now held in
                        Japan, with the rest scattered through museums in the United States and
                        Europe. Only a small number remain in Korea itself.
                      </p>
                      <p>
                        The most frequent subjects are the Amitabha Buddha, the Water-Moon
                        Avalokiteshvara, and the Bodhisattva Ksitigarbha — figures whose vocation is
                        to save and to shelter sentient beings. Goryeo painting is distinguished by
                        its luminous color and the refined, elegant line of its figures, with
                        delicate gold-painted patterns on the robes that are a hallmark of the
                        tradition. These are among the most exquisite religious paintings produced
                        anywhere in medieval East Asia.
                      </p>
                      <p>
                        That so few remain in Korea — and that the survivors are so dispersed —
                        gives the act of reproduction a particular weight. To reproduce a Goryeo
                        painting is, in part, to bring a lost national heritage back within reach.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        현재 전하는 고려불화는 대부분 고려 후기인 13~14세기에 그려졌다. 지배층이
                        발원하여 절이나 집에 두고 예배 대상으로 삼던 그림들이다. 오늘날 세계에 남은
                        것은 약 160여 점 — 그마저 대부분인 약 130점이 일본에, 나머지가 미국과 유럽의
                        박물관에 흩어져 있다. 정작 한국에 남은 것은 소수에 불과하다.
                      </p>
                      <p>
                        가장 많이 그려진 주제는 아미타여래도·수월관음도·지장보살도다 — 모두 중생을
                        구제하고 보살피는 부처와 보살이다. 고려불화는 화사한 색채와 세련되고 우아한
                        선의 인물 묘사가 돋보이며, 의습 위에 베풀어진 섬세한 금니 문양이 그 표지가
                        된다. 중세 동아시아가 낳은 가장 정교한 종교화의 하나로 꼽힌다.
                      </p>
                      <p>
                        정작 한국에 남은 것이 적고, 남은 것마저 흩어져 있다는 사실은 재현이라는
                        행위에 특별한 무게를 더한다. 고려불화를 재현한다는 것은, 어느 면에서
                        잃어버린 국가적 유산을 다시 손 닿는 곳으로 불러오는 일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 수월관음도의 도상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The Water-Moon Avalokiteshvara — the moon on the water'
                    : '수월관음도 — 물 위에 비친 달'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The iconography of the Water-Moon Avalokiteshvara comes from the Flower
                        Garland Sutra (Avatamsaka Sutra) and its chapter on the Entry into the
                        Dharma Realm. There, Avalokiteshvara — the bodhisattva of infinite
                        compassion — dwells on Mount Potalaka by the southern sea, amid treasures,
                        flowers, and fruit, while saving sentient beings. The pilgrim boy Sudhana
                        seeks out wise teachers, and Avalokiteshvara is among them; the painting
                        depicts their meeting.
                      </p>
                      <p>
                        The name &lsquo;Water-Moon&rsquo; evokes the moon reflected on water — a
                        Buddhist image of a presence at once luminous and impermanent, real and
                        reflected. In the Goryeo composition the bodhisattva is seated in ease upon
                        a rock, draped in a translucent white veil rendered in fine gold line, the
                        whole surface shimmering with the back-coloring method. It became the single
                        most celebrated subject of Goryeo Buddhist painting, though it grew uncommon
                        in the later Joseon period.
                      </p>
                      <p>
                        To reproduce such an image is to re-enter a vanished sensibility: the
                        proportion, the gesture, the precise warmth of the gold. It is here that Jo
                        Irak has concentrated her two decades of work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        수월관음도의 도상은 〈화엄경〉 입법계품(入法界品)에서 비롯한다. 무한한
                        자비의 보살 관음이 남쪽 바닷가 보타락가산(補陀落迦山)에 머물며 — 보배와 꽃과
                        과실이 가득한 그곳에서 — 중생을 구제한다. 구도의 길을 걷는
                        선재동자(善財童子)가 선한 스승을 찾아 나서고, 관음은 그 스승의 하나다.
                        그림은 이 만남의 장면을 담는다.
                      </p>
                      <p>
                        &lsquo;수월(水月)&rsquo;이라는 이름은 물 위에 비친 달을 떠올리게 한다 —
                        빛나면서도 덧없고, 실재이면서 그림자인 존재에 대한 불교적 이미지다. 고려의
                        화면에서 관음은 바위 위에 편안히 앉아, 가는 금선으로 그려진 투명한 흰 사라를
                        두르고, 그 전체가 배채법의 은은한 광휘로 빛난다. 고려불화에서 가장 사랑받은
                        주제가 되었으나, 후대 조선에서는 드물어졌다.
                      </p>
                      <p>
                        이런 이미지를 재현한다는 것은 사라진 감수성 안으로 다시 들어가는 일이다 —
                        비례와 몸짓과 금빛의 정확한 온도. 조이락이 20여 년을 집중해 온 자리가 바로
                        여기다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 재현이라는 작업 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The work of reproduction — back-coloring and gold'
                    : '재현이라는 작업 — 배채법과 금니'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The secret of Goryeo color is the back-coloring method, baechae. Painting on
                        semitransparent silk, the Goryeo masters applied pigment not only to the
                        front but to the reverse of the cloth. Color seen through the weave becomes
                        softer, deeper, more luminous; the technique also anchors the pigment
                        against flaking and fading. It is largely thanks to baechae that the
                        surviving paintings have kept their beauty across seven centuries.
                      </p>
                      <p>
                        Over this ground the painters laid gold — geumni, powdered gold suspended in
                        glue — drawing the fine patterns of the robes and accentuating jewelry and
                        ornament. The combined effect is the distinctive splendor of Goryeo
                        painting: deep mineral color glowing from within, traced over with a web of
                        gold line.
                      </p>
                      <p>
                        Reproduction means rebuilding all of this from the original outward: the
                        silk, the pigments, the order of the layers, the exact behavior of gold over
                        color. It is slow, exacting, devotional work — closer to conservation than
                        to making a new picture. Jo Irak joins this campaign not as a subject of its
                        cause but as a fellow artist in solidarity, offering her work so that the
                        proceeds may become a low-interest mutual-aid loan for another artist facing
                        financial exclusion today.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        고려 색채의 비밀은 배채법에 있다. 반투명한 비단에 그리던 고려 화공은 안료를
                        앞면뿐 아니라 비단의 뒷면에도 입혔다. 올을 투과해 비치는 색은 더 부드럽고
                        깊고 은은해진다. 이 기법은 안료가 떨어지거나 변색되는 것 또한 막아 준다.
                        현존하는 고려불화가 700년을 건너 그 아름다움을 지킨 것도 상당 부분 배채법
                        덕분이다.
                      </p>
                      <p>
                        그 바탕 위에 화공은 금을 올렸다 — 아교에 갠 금가루, 곧 금니로 의습의 가는
                        문양을 그리고 장신구와 장엄을 강조했다. 그 결과가 고려불화 특유의 광채다 —
                        안에서부터 빛나는 깊은 광물 색채 위에 금선의 그물이 얹힌다.
                      </p>
                      <p>
                        재현이란 이 모든 것을 원본으로부터 다시 쌓아 올리는 일이다 — 비단, 안료,
                        층의 순서, 색 위에 놓이는 금의 정확한 거동까지. 더디고 엄정하며 경건한
                        작업이다 — 새 그림을 그리는 일보다 보존에 가깝다. 조이락은 이 캠페인에 그
                        대상으로서가 아니라 동료 예술인과의 연대자로서 함께한다. 작품을 내놓아, 그
                        판매 수익이 오늘 금융 차별을 겪는 또 다른 예술인을 위한 저금리 상호부조
                        대출이 되도록.
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
                      From the Western canvas to the silk of the Goryeo masters, Jo Irak&apos;s work
                      has pursued a single devotion: to bring a 700-year-old beauty back into the
                      present, thread by thread and layer by layer. A tradition scattered abroad and
                      sealed in vaults speaks again through her hands. She joins this campaign in
                      solidarity — so that another artist might one day work without the weight of
                      financial exclusion.
                    </>
                  ) : (
                    <>
                      서양화의 캔버스에서 고려 화공의 비단으로, 조이락의 작업은 하나의 정성을 추구해
                      왔다 — 700년의 아름다움을 한 올 한 올, 한 겹 한 겹 오늘로 불러오는 일. 해외로
                      흩어지고 수장고에 봉인된 전통이 그의 손을 거쳐 다시 말을 건넨다. 그는 연대의
                      뜻으로 씨앗페에 함께한다 — 언젠가 또 다른 예술인이 금융 차별의 무게 없이 일할
                      수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jo Irak</span>
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
                    Jo Irak joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    조이락 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JO_IRAK_PATH}
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
