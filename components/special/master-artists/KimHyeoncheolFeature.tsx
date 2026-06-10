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

// 큐레이션 작가 feature는 작가 페이지(/artworks/artist/김현철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB history 부재 — bio가 유일 출처. 검증된 공개 사실(서울대 대학원·간송 수학·최완수 사사·
// 춘향영정·2025 겸재정선미술관 《전신》·《진경》 초대전)만 사용. 그 외 전시 연도·소장·수상 날조 금지.
const KIM_HYEONCHEOL_PATH = `/artworks/artist/${encodeURIComponent('김현철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimHyeoncheolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김현철' ||
    n === '금릉 김현철' ||
    n === 'kim hyeoncheol' ||
    n === 'kim hyeon-cheol' ||
    n === 'kim hyuncheol' ||
    n.replace(/[\s-]+/g, '') === 'kimhyeoncheol' ||
    n.replace(/[\s-]+/g, '') === 'kimhyuncheol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김현철 — 진경과 전신, 쪽빛에 담은 전통의 현재성',
    description:
      '우리 산천을 직접 보고 그린 진경산수(眞景)와 인물의 정신을 담는 전신(傳神) 초상으로 독자적 세계를 구축한 동양화가 김현철(호 시중재·금릉). 서울대 대학원을 졸업하고 간송미술관에서 전통을 익힌 그는 쪽빛 색채와 깊은 정신성으로 전통을 현대로 잇습니다. 《춘향영정》 제작, 2025년 겸재정선미술관 초대전 《전신》·《진경》. 김현철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '진경산수와 전신 초상의 동양화가 김현철(시중재·금릉). 간송에서 익힌 전통을 쪽빛 색채와 깊은 정신성으로 현대에 잇는다.',
    ogAlt: '김현철 대표 작품',
    twitterTitle: '김현철',
    twitterDescription: '진경과 전신 — 쪽빛에 담은 전통의 현재성, 김현철',
    keywords:
      '김현철 화가, 금릉 김현철, 시중재, 진경산수, 전신, 동양화, 간송미술관, 춘향영정, 겸재정선미술관, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Hyeoncheol — True-View and Transmitted Spirit, Tradition in Indigo',
    description:
      'Selected works by Kim Hyeoncheol (pen names Sijungjae and Geumneung), an East Asian painter who built an independent world through true-view landscape (jingyeong) drawn from Korea’s own mountains and rivers, and portraiture that transmits the spirit (jeonsin). A graduate of Seoul National University’s graduate school who studied tradition at the Kansong Art Museum, he carries tradition into the present through indigo color and deep spirituality. View and collect his works at SAF Online.',
    ogDescription:
      'Kim Hyeoncheol — an East Asian painter of true-view landscape and spirit-transmitting portraiture. Tradition learned at Kansong, carried into the present in indigo.',
    ogAlt: 'Kim Hyeoncheol — featured work',
    twitterTitle: 'Kim Hyeoncheol',
    twitterDescription: 'True-view and transmitted spirit — tradition in indigo, by Kim Hyeoncheol',
    keywords:
      'Kim Hyeoncheol artist, Geumneung Kim Hyeoncheol, Sijungjae, true-view landscape, jingyeong, jeonsin portrait, East Asian painting, Kansong Art Museum, SAF Online',
  },
} as const;

export async function buildKimHyeoncheolMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_HYEONCHEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김현철');
  const artwork = allArtworks.find((a) => isKimHyeoncheolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Hyeoncheol`
      : `${artwork.title} — 김현철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_HYEONCHEOL_PATH, locale, true),
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

export default async function KimHyeoncheolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_HYEONCHEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김현철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKimHyeoncheolArtist(artwork.artist)
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
    { name: isEnglish ? 'Kim Hyeoncheol' : '김현철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_HYEONCHEOL_PATH}#person-kim-hyeoncheol`,
    name: isEnglish ? 'Kim Hyeoncheol' : '김현철',
    alternateName: isEnglish ? ['김현철', '금릉 김현철', 'Sijungjae'] : ['금릉 김현철', '시중재'],
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Hyeoncheol (pen names Sijungjae and Geumneung) is a mid-career East Asian painter who reinterprets traditional Korean painting in a contemporary context, building an independent world in true-view landscape (jingyeong) and spirit-transmitting portraiture (jeonsin). After graduating from Seoul National University’s graduate school, he studied tradition at the Kansong Art Museum.'
      : '김현철(호 시중재·금릉)은 한국 전통 회화를 현대적으로 재해석하며 진경산수(眞景)와 전신(傳神) 초상에서 독자적 세계를 구축한 중견 동양화가입니다. 서울대 대학원을 졸업하고 간송미술관에서 전통을 익혔습니다.',
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: isEnglish ? 'Seoul National University, Graduate School' : '서울대학교 대학원',
    },
    knowsAbout: isEnglish
      ? ['True-view landscape painting', 'Korean portraiture', 'East Asian painting', 'Jeonsin']
      : ['진경산수', '전신 초상', '동양화', '계화'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Hyeoncheol — SAF Online' : '김현철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Hyeoncheol from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김현철 작품들을 소개합니다.',
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
        {/* Hero Section — 쪽빛(primary) 강조, 진경·전신 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Vertical ink lines — 진경의 준법·산세 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Hyeoncheol · Sijungjae' : '김현철 · 시중재(時中齋)'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  True-view and transmitted spirit
                  <br />
                  <span className="text-primary-soft">tradition, carried in indigo</span>
                </>
              ) : (
                <>
                  진경과 전신,
                  <br />
                  <span className="text-primary-soft">쪽빛에 담은 전통의 현재성</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Our own mountains and rivers, seen and drawn — jingyeong.
                  </span>
                  <span className="mt-2 block">
                    A portrait that holds a person&apos;s spirit — jeonsin.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">우리 산천을 직접 보고 그린 진경(眞景).</span>
                  <span className="mt-2 block">인물의 정신까지 담아내는 전신(傳神)의 초상.</span>
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
                    Learning the old,
                    <br />
                    <span className="text-primary-strong">creating the new</span>
                  </>
                ) : (
                  <>
                    옛것을 익혀 —<br />
                    <span className="text-primary-strong">새것을 그리다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Hyeoncheol — who uses the pen names{' '}
                      <strong className="font-bold text-charcoal-deep">Sijungjae (時中齋)</strong>{' '}
                      and Geumneung (金陵) — is a mid-career East Asian painter who reinterprets
                      traditional Korean painting in a contemporary context. He has built an
                      independent world in two domains long held to be the heart of the tradition:
                      true-view landscape (jingyeong, 眞景) and spirit-transmitting portraiture
                      (jeonsin, 傳神).
                    </p>
                    <p>
                      After graduating from the graduate school of Seoul National University, he
                      studied tradition at the{' '}
                      <strong className="font-bold text-charcoal">Kansong Art Museum</strong> —
                      Korea&apos;s first private art museum, founded by Kansong Jeon Hyung-pil and
                      home to the deepest collection of Joseon painting. There, under the art
                      historian Choi Wan-soo, he steeped himself in the world of Jingyeong-era
                      masters such as Gyeomjae Jeong Seon, copying and studying their works until
                      the grammar of the tradition became his own.
                    </p>
                    <p>
                      His landscapes do not imitate the manner of an idealized China; they look at
                      Korea&apos;s own mountains and rivers and draw what is seen — the same
                      conviction that drove Jeong Seon&apos;s true-view revolution three centuries
                      ago. His portraits pursue jeonsin: beyond the sitter&apos;s outward likeness,
                      they aim to carry across the person&apos;s character, feeling, and inner
                      bearing. He has also worked in the precise architectural mode of{' '}
                      <em>gyehwa</em> (界畵), the ruled-line painting of buildings.
                    </p>
                    <p>
                      A distinctive note runs through the work:{' '}
                      <strong className="font-bold text-charcoal-deep">indigo</strong> — the deep
                      blue of jjokbit — and a quiet, spiritual gravity. The pen name Sijungjae —
                      drawing on the classical idea of <em>sijung</em>, acting rightly in the
                      present moment — points to his central question: not how to preserve tradition
                      as a relic, but how to make it live now. His is a path of{' '}
                      <strong className="font-bold text-charcoal">
                        learning from the past to create anew
                      </strong>
                      .
                    </p>
                    <p>
                      Among his notable undertakings is the production of a portrait of{' '}
                      <strong className="font-bold text-charcoal">Chunhyang</strong> (《Chunhyang
                      Yeongjeong》), an enshrined likeness of the heroine of Korea&apos;s most
                      beloved classical tale — a project that draws directly on his command of the
                      jeonsin portrait tradition. In 2025, the Gyeomjae Jeong Seon Art Museum in
                      Seoul presented his work across two consecutive invitational solo exhibitions,{' '}
                      <em>Jeonsin (傳神)</em> and <em>Jingyeong (眞景)</em> — the two pillars of his
                      practice named in turn.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김현철은 호{' '}
                      <strong className="font-bold text-charcoal-deep">시중재(時中齋)</strong>·
                      금릉(金陵)을 쓰며 한국 전통 회화를 현대적으로 재해석해 온 중견 동양화가다.
                      그는 오랫동안 전통의 핵심으로 여겨져 온 두 영역 — 우리 산천을 직접 보고 그리는
                      진경산수(眞景)와, 인물의 정신을 담는 전신(傳神) 초상 — 에서 독자적 세계를
                      구축했다.
                    </p>
                    <p>
                      서울대학교 대학원을 졸업한 그는{' '}
                      <strong className="font-bold text-charcoal">간송미술관</strong>에서 전통을
                      익혔다. 간송미술관은 간송 전형필이 세운 우리나라 최초의 사립미술관으로, 조선
                      회화의 가장 깊은 소장으로 알려진 곳이다. 그는 그곳에서 미술사학자 최완수의
                      가르침 아래 겸재 정선을 비롯한 진경 시대 거장들의 세계에 잠겨, 그 작품을
                      모사하고 연구하며 전통의 문법을 자신의 것으로 삼았다.
                    </p>
                    <p>
                      그의 산수는 이상화된 중국의 화법을 흉내 내지 않는다. 우리 산천을 직접 바라보고
                      본 것을 그린다 — 세 세기 전 겸재의 진경 혁명을 추동했던 바로 그 신념이다. 그의
                      초상은 전신을 지향한다. 주인공의 외모를 넘어, 그 사람의 개성과 감정, 내면의
                      태도까지 화면에 전한다. 건축물을 자로 재어 정밀하게 그리는 <em>계화(界畵)</em>
                      의 영역에서도 작업을 이어 왔다.
                    </p>
                    <p>
                      작업 전반에는 한 가지 독특한 음색이 흐른다 —{' '}
                      <strong className="font-bold text-charcoal-deep">쪽빛</strong>의 깊고 푸른
                      색채, 그리고 고요하고 정신적인 무게다. ‘시중재’라는 호는 지금 이 순간에
                      마땅함을 행한다는 <em>시중(時中)</em>의 뜻을 품어, 그의 중심 물음을 가리킨다.
                      전통을 유물로 보존하는 법이 아니라, 그것을 지금 살아 있게 하는 법.{' '}
                      <strong className="font-bold text-charcoal">옛것을 배워 새것을 만든다</strong>
                      는 길이다.
                    </p>
                    <p>
                      그의 주목할 만한 작업 중 하나가 한국에서 가장 사랑받는 고전의 주인공을 봉안한
                      영정, <strong className="font-bold text-charcoal">《춘향영정》</strong>의
                      제작이다 — 전신 초상의 전통을 직접 끌어다 쓴 작업이다. 2025년 서울 겸재정선
                      미술관은 그의 작업을 두 차례 연이은 초대 개인전 《전신(傳神)》과
                      《진경(眞景)》 으로 선보였다 — 그의 작업을 떠받치는 두 기둥을 차례로 호명한
                      셈이다.
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
                        {isEnglish ? 'True-view landscape (眞景)' : '진경산수(眞景)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Korea’s own mountains and rivers, seen and drawn rather than idealized — carrying forward the conviction of Jeong Seon’s true-view tradition.'
                          : '이상화된 화법이 아니라 우리 산천을 직접 보고 그린다. 겸재 정선 이래 진경 전통의 신념을 잇는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Transmitting the spirit (傳神)' : '전신(傳神)의 초상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Beyond outward likeness, the portrait carries the sitter’s character, feeling, and inner bearing. His 《Chunhyang Yeongjeong》 draws on this tradition.'
                          : '외모를 넘어 인물의 개성·감정·내면까지 화면에 전한다. 《춘향영정》 제작이 이 전통을 끌어 쓴 작업이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Tradition in the present' : '전통의 현재성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Indigo color and a quiet, spiritual gravity. The pen name Sijungjae — rightness in the present moment — names his pursuit of making tradition live now.'
                          : '쪽빛 색채와 고요한 정신성. ‘시중재’의 호는 지금 이 순간의 마땅함을 뜻하며, 전통을 현재에 살리려는 지향을 가리킨다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Path & practice' : '이력과 작업'}
                </h3>
                {/* DB history 부재 — 검증된 공개 사실만, 미확인 연도 표기 회피. */}
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduated from the graduate school of Seoul National University.'
                        : '서울대학교 대학원 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Studied tradition at the Kansong Art Museum under art historian Choi Wan-soo; copied and researched Jingyeong-era masters including Gyeomjae Jeong Seon.'
                        : '간송미술관에서 미술사학자 최완수의 가르침 아래 전통 수학 — 겸재 정선 등 진경 시대 거장 작품 모사·연구.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works across true-view landscape (jingyeong), spirit-transmitting portraiture (jeonsin), and ruled-line architectural painting (gyehwa).'
                        : '진경산수·전신 초상·계화(界畵)를 아우르는 작업 전개.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Produced 《Chunhyang Yeongjeong》, an enshrined portrait of the classical heroine Chunhyang.'
                        : '고전의 주인공 춘향을 봉안한 영정 《춘향영정》 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Invitational solo exhibitions at the{' '}
                          <a
                            href="https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=152077&menuNo=200009"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Gyeomjae Jeong Seon Art Museum, Seoul (2025)
                          </a>
                          : 《Jeonsin (傳神)》 followed by 《Jingyeong (眞景)》.
                        </>
                      ) : (
                        <>
                          <a
                            href="https://culture.seoul.go.kr/culture/culture/cultureEvent/view.do?cultcode=152077&menuNo=200009"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            겸재정선미술관 초대 개인전 (서울, 2025)
                          </a>
                          : 《전신(傳神)》에 이어 《진경(眞景)》.
                        </>
                      )}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'On the tradition he carries' : '그가 잇는 전통'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Jingyeong (眞景, true-view): a tradition begun by Gyeomjae Jeong Seon in the eighteenth century, drawing Korea’s real landscapes from direct observation rather than idealized models.'
                        : '진경(眞景): 18세기 겸재 정선이 연 전통으로, 이상화된 모범이 아니라 우리 실경(實景)을 직접 보고 그리는 화법.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Jeonsin (傳神, transmitting the spirit): the East Asian portrait ideal of conveying not only a sitter’s appearance but their very spirit.'
                        : '전신(傳神): 인물의 외형뿐 아니라 그 정신까지 전한다는 동아시아 초상의 이상.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          The{' '}
                          <a
                            href="https://kansong.org/seoul/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Kansong Art Museum
                          </a>
                          : Korea&apos;s first private art museum, founded by Kansong Jeon Hyung-pil
                          — where he studied the tradition firsthand.
                        </>
                      ) : (
                        <>
                          <a
                            href="https://kansong.org/seoul/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            간송미술관
                          </a>
                          : 간송 전형필이 세운 우리나라 최초의 사립미술관 — 그가 전통을 직접 익힌
                          곳.
                        </>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 진경·전신·쪽빛 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on seeing, on spirit, on the present</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">봄, 정신, 그리고 현재에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 진경 — 직접 보고 그린다는 것 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Jingyeong — what it means to draw what is seen'
                    : '진경(眞景) — 직접 보고 그린다는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For centuries, much of East Asian landscape painting worked from idealized,
                        inherited models — mountains and rivers as they ought to be, not as they
                        are. In the eighteenth century, Gyeomjae Jeong Seon turned that on its head:
                        he walked Korea&apos;s own peaks and valleys and painted what he saw. This
                        is jingyeong — true-view — and it remains one of the most consequential
                        turns in the history of Korean painting.
                      </p>
                      <p>
                        Kim Hyeoncheol stands inside that lineage, not as imitator but as inheritor.
                        At the Kansong Art Museum, under the historian Choi Wan-soo, he copied and
                        studied the Jingyeong masters until their grammar — the brush, the
                        structure, the way a real ridge resolves into ink — became second nature.
                        The point of such copying is not nostalgia. It is to earn the right to see
                        for oneself.
                      </p>
                      <p>
                        What results is landscape rooted in observation and conviction: that our own
                        land is worth looking at directly, and that a painting can be both faithful
                        to a tradition and fully present in its own time.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        오랜 세월, 동아시아 산수화의 상당 부분은 이상화된 본보기에서 출발했다. 있는
                        그대로의 산천이 아니라, 마땅히 그래야 할 산천이었다. 18세기, 겸재 정선은 그
                        전제를 뒤집었다. 그는 우리 산봉우리와 골짜기를 직접 걸으며 본 것을 그렸다.
                        이것이 진경(眞景)이며, 한국 회화사에서 가장 묵직한 전환의 하나로 남아 있다.
                      </p>
                      <p>
                        김현철은 그 계보 안에 선다 — 흉내 내는 자가 아니라 잇는 자로서. 간송미술관
                        에서 미술사학자 최완수의 가르침 아래 그는 진경 시대 거장들을 모사하고
                        연구했다. 붓, 구조, 실제 능선이 먹으로 풀려나가는 방식 — 그 문법이 몸에 밸
                        때까지. 이런 모사의 목적은 향수가 아니다. 스스로 볼 수 있는 자격을 얻기
                        위함이다.
                      </p>
                      <p>
                        그 결과는 관찰과 신념에 뿌리내린 산수다. 우리 땅이 직접 바라볼 가치가 있다는
                        것, 그리고 한 점의 그림이 전통에 충실하면서도 자기 시대에 온전히 현재할 수
                        있다는 것.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 전신 — 정신을 옮기는 초상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Jeonsin — the portrait that carries a spirit'
                    : '전신(傳神) — 정신을 옮기는 초상'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the East Asian portrait tradition, the highest aim was never mere
                        likeness. It was <em>jeonsin</em> — to transmit the spirit: to carry across,
                        through the depiction of a face, a person&apos;s character, feeling, and
                        inner bearing. A great portrait was held to reveal not just how a sitter
                        looked but who they were.
                      </p>
                      <p>
                        Kim Hyeoncheol has devoted himself to recreating and reimagining this
                        tradition of the Joseon portrait. His likenesses reach past the surface
                        toward the interior — the temperament, the composure, the weight a person
                        carries. The 2025 exhibition naming itself simply <em>Jeonsin</em> made the
                        ambition explicit.
                      </p>
                      <p>
                        Among his projects is the production of{' '}
                        <strong className="font-bold text-charcoal-deep">
                          《Chunhyang Yeongjeong》
                        </strong>
                        , an enshrined portrait of Chunhyang — the heroine of Korea&apos;s most
                        beloved classical tale. To give an imagined figure a face worthy of
                        enshrinement is to test the full reach of the jeonsin tradition: not to
                        record a person who sat, but to summon a spirit the culture already holds.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        동아시아 초상 전통에서 가장 높은 목표는 결코 닮음 자체가 아니었다. 그것은{' '}
                        <em>전신(傳神)</em> — 정신을 전하는 일이었다. 얼굴을 그리는 일을 통해 한
                        사람의 개성과 감정, 내면의 태도를 화면 너머로 옮기는 것. 뛰어난 초상은
                        주인공이 어떻게 보였는가뿐 아니라 그가 누구였는가를 드러낸다고 여겨졌다.
                      </p>
                      <p>
                        김현철은 이 조선 초상의 전통을 다시 그리고 다시 상상하는 데 몰두해 왔다.
                        그의 초상은 표면을 지나 내면으로 — 기질과 평정, 한 사람이 짊어진 무게로 —
                        나아간다. 스스로를 단지 《전신(傳神)》이라 이름한 2025년 전시는 그 지향을
                        분명히 했다.
                      </p>
                      <p>
                        그의 작업 가운데 하나가{' '}
                        <strong className="font-bold text-charcoal-deep">《춘향영정》</strong>의
                        제작이다 — 한국에서 가장 사랑받는 고전의 주인공 춘향을 봉안한 영정이다. 상상
                        속 인물에게 봉안에 합당한 얼굴을 부여하는 일은 전신 전통의 도달 범위를
                        끝까지 시험한다. 앉아 있던 한 사람을 기록하는 것이 아니라, 문화가 이미 품고
                        있는 정신을 불러내는 일이기 때문이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 시중 — 쪽빛에 담은 전통의 현재성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Sijung — tradition made present, in indigo'
                    : '시중(時中) — 쪽빛에 담은 전통의 현재성'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        His pen name,{' '}
                        <strong className="font-bold text-charcoal-deep">Sijungjae</strong>{' '}
                        (時中齋), draws on the classical idea of <em>sijung</em> — acting with
                        rightness in the present moment, neither too early nor too late. It is a
                        name that frames a question rather than a style: how does one keep a
                        six-hundred- year tradition from becoming a museum piece, and make it live
                        now?
                      </p>
                      <p>
                        His answer is partly chromatic. A deep{' '}
                        <strong className="font-bold text-charcoal">indigo</strong> — the blue of
                        jjokbit — runs through the work, lending it a tone at once classical and
                        unmistakably his own, grave and quietly contemporary. Tradition, in his
                        hands, is not a costume worn over modern habits; it is a way of seeing
                        carried forward and renewed.
                      </p>
                      <p>
                        The result is a body of work that argues, without slogan, for the present
                        tense of the old. From the true-view landscape to the spirit-transmitting
                        portrait, from gyehwa&apos;s ruled lines to the depth of indigo, Kim
                        Hyeoncheol holds that what was learned at Kansong belongs not only to the
                        past but to the work being made today.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 호{' '}
                        <strong className="font-bold text-charcoal-deep">시중재(時中齋)</strong>는{' '}
                        <em>시중(時中)</em>의 뜻을 끌어온다 — 지금 이 순간에 마땅함을 행하는 것,
                        이르지도 늦지도 않게. 그것은 양식이 아니라 물음을 새기는 이름이다. 수백 년의
                        전통을 박물관의 유물로 굳히지 않고, 어떻게 지금 살아 있게 할 것인가.
                      </p>
                      <p>
                        그의 대답은 한편으로 색채에 있다. 작업 전반에 깊은{' '}
                        <strong className="font-bold text-charcoal">쪽빛</strong>이 흐르며, 고전적
                        이면서도 분명히 그만의 음색을 — 묵직하고 고요하게 현대적인 톤을 — 부여한다.
                        그의 손에서 전통은 현대의 습관 위에 걸쳐 입는 의상이 아니다. 그것은 이어받아
                        새롭게 갱신되는 보는 방식이다.
                      </p>
                      <p>
                        그렇게 그의 작업은 구호 없이도 옛것의 현재형을 주장한다. 진경의 산수에서
                        전신의 초상으로, 계화의 자질러진 선에서 쪽빛의 깊이로 — 김현철은 간송에서
                        익힌 것이 과거에만이 아니라 오늘 만들어지는 작업에도 속한다고 믿는다.
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
                      From the study rooms of Kansong to his own studio, Kim Hyeoncheol&apos;s work
                      has pursued a single question: how does one inherit a tradition without
                      embalming it — how does the old stay present? The answer, built over a career,
                      is a painting that sees Korea&apos;s own land directly, carries a
                      person&apos;s spirit, and glows in indigo. He joins this campaign not as a
                      subject of its cause but as a fellow artist in solidarity — so that those who
                      come after might work with the security he believes every artist deserves.
                    </>
                  ) : (
                    <>
                      간송의 공부방에서 자신의 화실까지, 김현철의 작업은 하나의 물음을 추구해 왔다.
                      전통을 박제하지 않고 어떻게 물려받을 것인가 — 옛것은 어떻게 현재에 머무는가.
                      한 생애에 걸쳐 구축된 대답이, 우리 땅을 직접 보고 한 사람의 정신을 담으며
                      쪽빛으로 빛나는 그림이다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                      예술인과의 연대자로서 함께한다 — 다음 세대의 예술인들이 그가 마땅하다고 믿는
                      안정 속에서 일할 수 있도록.
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
                眞景
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
                Kim Hyeoncheol
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
                    Kim Hyeoncheol joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김현철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_HYEONCHEOL_PATH}
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
