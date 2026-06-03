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

// 거장 작가 feature는 작가 페이지(/artworks/artist/송광연)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SONG_GWANGYEON_PATH = `/artworks/artist/${encodeURIComponent('송광연')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSongGwangyeonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '송광연' ||
    n === 'song gwangyeon' ||
    n === 'song kwangyeon' ||
    n.replace(/[\s-]+/g, '') === 'songgwangyeon' ||
    n.replace(/[\s-]+/g, '') === 'songkwangyeon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '송광연 — 나비의 꿈, 한국적 도상과 팝의 만남',
    description:
      '회화(팝아트) 작가 송광연. 한국적 도상과 팝아트 어법을 결합한 〈나비의 꿈〉 시리즈로 알려진 중견 작가. 2017년 런던 사치 갤러리 START Art Fair 솔로 부스 작가로 선정됐고, 워싱턴DC·상하이 한국문화원 초대전 등 국외 전시에 참여했다. 송광연의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '송광연 — 〈나비의 꿈〉 연작의 팝아트 작가. 한국적 도상과 팝의 경쾌한 색채가 만나는 호접지몽의 환상, K-POP ART.',
    ogAlt: '송광연 대표 작품',
    twitterTitle: '송광연',
    twitterDescription: '나비의 꿈 — 한국적 도상과 팝이 만나는 회화 작가 송광연',
    keywords:
      '송광연 작가, 팝아트, 나비의 꿈, K-POP ART, 한국적 도상, 호접지몽, 사치 갤러리, 씨앗페 온라인',
  },
  en: {
    title: 'Song Gwangyeon — The Butterfly’s Dream, Korean Iconography Meets Pop',
    description:
      "Selected works by Song Gwangyeon, a painter working in pop art. A mid-career artist known for the 〈The Butterfly's Dream〉 series, which fuses Korean iconography with the visual language of pop art. Selected as a solo booth artist for START Art Fair at the Saatchi Gallery, London in 2017, with overseas exhibitions including the Korean Cultural Centers in Washington DC and Shanghai. View and collect her works at SAF Online.",
    ogDescription:
      "Song Gwangyeon — pop artist of the 〈The Butterfly's Dream〉 series. Korean iconography meets pop's bright palette in a vision of Zhuangzi's butterfly dream, a K-POP ART.",
    ogAlt: 'Song Gwangyeon — featured work',
    twitterTitle: 'Song Gwangyeon',
    twitterDescription:
      "The Butterfly's Dream — painter Song Gwangyeon, where Korean iconography meets pop",
    keywords:
      'Song Gwangyeon artist, pop art, the butterfly dream, K-POP ART, Korean iconography, Saatchi Gallery, Korean pop art',
  },
} as const;

export async function buildSongGwangyeonMetadata({
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
  const pageUrl = buildLocaleUrl(SONG_GWANGYEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('송광연');
  const artwork = allArtworks.find((a) => isSongGwangyeonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Song Gwangyeon`
      : `${artwork.title} — 송광연`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SONG_GWANGYEON_PATH, locale, true),
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

export default async function SongGwangyeonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SONG_GWANGYEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('송광연');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isSongGwangyeonArtist(artwork.artist)
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
    { name: isEnglish ? 'Song Gwangyeon' : '송광연', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SONG_GWANGYEON_PATH}#person-song-gwangyeon`,
    name: isEnglish ? 'Song Gwangyeon' : '송광연',
    alternateName: isEnglish ? '송광연' : 'Song Gwangyeon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? "Song Gwangyeon is a mid-career painter known for the 〈The Butterfly's Dream〉 series, which fuses Korean iconography with the visual language of pop art. She was selected as a solo booth artist for START Art Fair at the Saatchi Gallery, London in 2017."
      : '송광연은 한국적 도상과 팝아트 어법을 결합한 〈나비의 꿈〉 시리즈로 알려진 중견 회화 작가입니다. 2017년 런던 사치 갤러리 START Art Fair 솔로 부스 작가로 선정됐습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Yeungnam University, M.F.A. in Western Painting'
        : '영남대학교 서양화전공 석사',
    },
    knowsAbout: ['Pop art', 'Korean iconography', 'Contemporary Korean painting'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Song Gwangyeon — SAF Online' : '송광연 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Song Gwangyeon from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 송광연 작품들을 소개합니다.',
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

          {/* Pop dots & butterfly-wing motif — 나비의 꿈 */}
          <div className="absolute top-10 left-8 w-24 h-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-sun/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 rounded-full border-2 border-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Song Gwangyeon · pop art' : '송광연 · 팝아트'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The butterfly’s dream,
                  <br />
                  <span className="text-primary-soft">where iconography meets pop</span>
                </>
              ) : (
                <>
                  나비의 꿈,
                  <br />
                  <span className="text-primary-soft">도상이 팝을 만나는 자리</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Korean iconography, in pop’s bright register.</span>
                  <span className="mt-2 block">
                    The 〈The Butterfly’s Dream〉 series — a Korean take on K-POP ART.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한국적 도상을, 팝의 경쾌한 음역으로.</span>
                  <span className="mt-2 block">〈나비의 꿈〉 연작 — 한국적 어법의 K-POP ART.</span>
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
                    The Butterfly’s Dream —<br />
                    <span className="text-primary-strong">iconography in a pop register</span>
                  </>
                ) : (
                  <>
                    나비의 꿈 —<br />
                    <span className="text-primary-strong">팝의 음역으로 옮긴 도상</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Song Gwangyeon is a mid-career painter known for the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈The Butterfly’s Dream〉
                      </strong>{' '}
                      series, which fuses Korean iconography with the visual language of pop art.
                      She holds a master’s degree in Western painting from Yeungnam University.
                    </p>
                    <p>
                      She has held twenty-four solo exhibitions at venues including Gallery Sun
                      (Seoul), the BNK Kyongnam Bank head-office Art Gallery (Changwon), and the
                      Ulju Culture &amp; Art Center. In 2017 she was selected as a solo booth artist
                      for START Art Fair at the Saatchi Gallery in London.
                    </p>
                    <p>
                      Her work has also travelled abroad: an invitational exhibition at the Korean
                      Cultural Center, Embassy of the Republic of Korea in Washington DC (2016), and
                      an invitational exhibition at the Korean Cultural Center in Shanghai (2017).
                      Her paintings are held in collections including the Ulsan Museum of Art and
                      the Korean Folk Village Museum.
                    </p>
                    <p>
                      Across these works, the bright palette and familiar grammar of pop carry a
                      distinctly Korean iconography. The butterfly of Zhuangzi’s dream — the
                      uncertainty of where dream ends and waking begins — meets the cheerful surface
                      of K-POP ART, a register in which the traditional and the contemporary share a
                      single frame.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      송광연은 한국적 도상과 팝아트 어법을 결합한{' '}
                      <strong className="font-bold text-charcoal-deep">〈나비의 꿈〉</strong>{' '}
                      시리즈로 알려진 중견 회화 작가다. 영남대학교 서양화전공 석사를 졸업했다.
                    </p>
                    <p>
                      갤러리 썬(서울), BNK경남은행 본점 아트갤러리(창원), 울주문화예술회관 등에서
                      24회 개인전을 열었다. 2017년에는 런던 사치 갤러리 START Art Fair 솔로 부스
                      작가로 선정됐다.
                    </p>
                    <p>
                      작업은 국외로도 이어졌다. 2016년 주미 한국대사관 한국문화원(워싱턴DC) 초대전,
                      2017년 주상하이 한국문화원 초대전 등에 참여했다. 작품은 울산시립미술관,
                      한국민속촌 미술관 등에 소장돼 있다.
                    </p>
                    <p>
                      이 작업들에서 팝의 경쾌한 색채와 익숙한 문법은 한국적 도상을 나른다. 장자의
                      나비 꿈 — 꿈과 깨어남의 경계가 흐려지는 호접지몽 — 이 K-POP ART의 명랑한
                      표면과 만나, 전통과 동시대가 한 화면을 공유하는 음역을 이룬다.
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
                        {isEnglish ? 'The Butterfly’s Dream' : '나비의 꿈'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The signature series, fusing Korean iconography with pop’s bright palette — a vision drawn from the butterfly of Zhuangzi’s dream.'
                          : '한국적 도상과 팝의 경쾌한 색채를 결합한 대표 연작. 장자의 나비 꿈, 호접지몽의 환상에서 길어 올린 시선이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Korean iconography meets pop' : '한국적 도상과 팝의 만남'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A K-POP ART register in which traditional Korean imagery and the visual language of pop share a single frame.'
                          : '전통적 한국 이미지와 팝의 시각 문법이 한 화면을 공유하는 K-POP ART의 음역.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'From Korea to the world' : '한국에서 세계로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A solo booth at START Art Fair (Saatchi Gallery, London, 2017) and invitational shows in Washington DC and Shanghai — a Korean pop carried abroad.'
                          : 'START Art Fair 솔로 부스(사치 갤러리, 런던, 2017)와 워싱턴DC·상하이 초대전 — 국외로 이어진 한국적 팝.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Selected solo & booth exhibitions' : '주요 개인전·솔로 부스'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《K-POP ART Song Gwangyeon》 (PAC Gallery, Jinju); 《The Butterfly’s Dream》 (Gallery Sun, Seoul)'
                        : '《K-POP ART 송광연전》(PAC 갤러리, 진주); 《나비의 꿈》(갤러리 썬, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Butterfly’s Dream》 (BNK Kyongnam Bank head-office Art Gallery, Changwon)'
                        : '《나비의 꿈》(BNK경남은행 본점 아트갤러리, 창원)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Song Gwangyeon invitational exhibition (Ulju Culture & Art Center, Ulsan)'
                        : '송광연 초대전 (울주문화예술회관, 울산)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Butterfly’s Dream》 (DGB Gallery, Daegu)'
                        : '《나비의 꿈》(DGB 갤러리, 대구)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as a solo booth artist, START 2017 (Saatchi Gallery, London)'
                        : 'START 2017 솔로 부스 작가 선정 (사치 갤러리, 런던)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Butterfly’s Dream》 (Dongwon Gallery, Daegu)'
                        : '《나비의 꿈》(동원화랑, 대구)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Maekhyang Gallery 32nd-anniversary invitational exhibition (Daegu)'
                        : '맥향화랑 개관32주년 초대전 (대구)'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish
                    ? 'Overseas, group shows, fairs & collections'
                    : '국외·기획전·아트페어 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Overseas: 《POP of KOLOR》 (Korean Cultural Center, Embassy of Korea, Washington DC, 2016, two-person show with Park Kyungju); 《Onngojisin》 Korea–China three-person show (Korean Cultural Center, Shanghai, 2017)'
                        : '국외: 《POP of KOLOR》(주미 한국대사관 한국문화원, 워싱턴DC, 2016, 박경주와 2인전); 《온고지신》 한중3인전 (주상하이 한국문화원, 2017)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: 《無窮 畵, A Flower Has Bloomed》 (Cheonan Museum of Art); 《Wow~! Funny Pop》 (Gyeongnam Art Museum); 《A Certain Degree of Art Community: Boogie Woogie Museum》 (Ulsan Museum of Art); 《Marilyn Monroe and Korean Pop Art》 (Shinsegae Centum City)'
                        : '기획전: 《無窮 畵, 꽃이 피었습니다》(천안시립미술관); 《Wow~! Funny Pop》(경남도립미술관); 《어느 정도 예술공동체: 부기우기 미술관》(울산시립미술관); 《마릴린 먼로와 코리안 팝아트》(신세계센텀시티)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art fairs: START Art Fair (Saatchi Gallery, London), Art Singapore, Art Beijing, Art Taipei, KIAF, Art Busan, Galleries Art Fair, and others'
                        : '아트페어: 스타트 아트페어(런던 사치갤러리), 아트 싱가포르, 아트 베이징, 아트 타이베이, KIAF, 아트 부산, 화랑미술제 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Ulsan Museum of Art, Korean Folk Village Museum, Gallery We (Pyeongtaek), Leeahn Gallery, Insa Gallery, and others'
                        : '소장: 울산시립미술관, 한국민속촌 미술관, 갤러리 위(평택), 리안 갤러리, 인사 갤러리 등'}
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
                  <span className="text-charcoal-deep">on the dream, the iconography, and pop</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">꿈과 도상, 그리고 팝에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 나비의 꿈 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The Butterfly’s Dream — a series and its name'
                    : '나비의 꿈 — 연작과 그 이름'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Song Gwangyeon is best known for the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          〈The Butterfly’s Dream〉
                        </strong>{' '}
                        series. The title reaches back to a very old image: Zhuangzi, who dreamed he
                        was a butterfly, and on waking could not be certain whether he was a man who
                        had dreamed of being a butterfly, or a butterfly now dreaming of being a
                        man.
                      </p>
                      <p>
                        That uncertainty — the soft boundary between dream and waking — is a fitting
                        frame for a body of pop painting. Pop, after all, lives among images that
                        feel at once intimate and borrowed, familiar and unreal. To place the
                        butterfly’s dream over that surface is to ask, lightly, which of the bright
                        things we see we have truly chosen, and which we have only dreamed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        송광연은{' '}
                        <strong className="font-bold text-charcoal-deep">〈나비의 꿈〉</strong>{' '}
                        시리즈로 가장 널리 알려져 있다. 그 제목은 아주 오래된 이미지로 거슬러 오른다
                        — 나비가 된 꿈을 꾸고, 깨어나서는 자신이 나비 꿈을 꾼 사람인지, 지금 사람
                        꿈을 꾸는 나비인지 확신할 수 없었던 장자.
                      </p>
                      <p>
                        그 불확실함 — 꿈과 깨어남 사이의 무른 경계 — 은 팝 회화의 한 몸을 감싸기에
                        어울리는 틀이다. 팝은 결국 친밀하면서도 빌려 온, 익숙하면서도 비현실적인
                        이미지들 사이에서 산다. 그 표면 위에 나비의 꿈을 얹는다는 것은, 우리가 보는
                        밝은 것들 가운데 무엇을 정말 택했고 무엇을 다만 꿈꾸었는가를 가볍게 묻는
                        일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 한국적 도상과 팝 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Korean iconography in a pop grammar'
                    : '팝의 문법으로 옮긴 한국적 도상'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The defining move in Song Gwangyeon’s work is the fusion of Korean
                        iconography with the visual language of pop art. Pop arrived as an
                        international grammar — bright, flat, legible, built from the commodity and
                        the printed image. Her paintings take that grammar and fill it with imagery
                        drawn from a Korean visual tradition.
                      </p>
                      <p>
                        The result is what she calls K-POP ART: a register in which the traditional
                        and the contemporary are not opposed but layered. The cheerful surface of
                        pop becomes a vessel for something older, and the older imagery is renewed
                        by the immediacy of pop’s colour. Neither cancels the other; they share the
                        frame.
                      </p>
                      <p>
                        It is a quietly ambitious proposition. Rather than treating Korean motifs as
                        heritage to be preserved behind glass, the work lets them live in the most
                        contemporary of idioms — bright, accessible, and unembarrassed about being
                        looked at.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        송광연 작업을 규정하는 움직임은 한국적 도상과 팝아트 어법의 결합이다. 팝은
                        국제적인 문법으로 도착했다 — 밝고, 평면적이고, 읽히는, 상품과 인쇄
                        이미지에서 지어진 문법. 그의 회화는 그 문법을 가져와, 한국적 시각 전통에서
                        길어 올린 이미지로 채운다.
                      </p>
                      <p>
                        그 결과가 그가 말하는 K-POP ART다 — 전통과 동시대가 대립하지 않고 겹쳐지는
                        음역. 팝의 명랑한 표면은 더 오래된 무언가를 담는 그릇이 되고, 오래된
                        이미지는 팝의 색채가 지닌 즉각성으로 새로워진다. 어느 쪽도 다른 쪽을 지우지
                        않는다. 둘은 한 화면을 나눠 쓴다.
                      </p>
                      <p>
                        그것은 조용히 야심 찬 제안이다. 한국적 모티프를 유리 너머에 보존할 유산으로
                        다루는 대신, 작업은 그것을 가장 동시대적인 어법 속에서 살게 한다 — 밝고,
                        다가서기 쉽고, 보여지는 일에 거리낌이 없는.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 한국에서 세계로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From Daegu and Ulsan to London and Shanghai'
                    : '대구·울산에서 런던·상하이까지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Across twenty-four solo exhibitions — at Gallery Sun in Seoul, the BNK
                        Kyongnam Bank Art Gallery in Changwon, the Ulju Culture &amp; Art Center,
                        and galleries in Daegu — Song Gwangyeon has built a sustained body of work
                        around the same series, returning to 〈The Butterfly’s Dream〉 again and
                        again.
                      </p>
                      <p>
                        That practice has carried abroad. In 2017 she was selected as a solo booth
                        artist for START Art Fair at the Saatchi Gallery in London. The year before,
                        her work was shown in an invitational exhibition at the Korean Cultural
                        Center in Washington DC; in 2017, at the Korean Cultural Center in Shanghai.
                        She has also taken part in art fairs from Singapore and Beijing to Taipei,
                        Busan, and KIAF.
                      </p>
                      <p>
                        Her paintings now rest in collections including the Ulsan Museum of Art and
                        the Korean Folk Village Museum — a Korean pop that began in regional
                        galleries and found its way into public collections and international fairs
                        alike.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        서울 갤러리 썬, 창원 BNK경남은행 아트갤러리, 울주문화예술회관, 그리고 대구의
                        화랑들 — 24회의 개인전에 걸쳐, 송광연은 같은 연작을 중심으로 지속적인 작업의
                        몸을 쌓아 왔다. 〈나비의 꿈〉으로 거듭 돌아오면서.
                      </p>
                      <p>
                        그 작업은 국외로도 이어졌다. 2017년 그는 런던 사치 갤러리 START Art Fair
                        솔로 부스 작가로 선정됐다. 그 전해에는 워싱턴DC 한국문화원 초대전에서,
                        2017년에는 상하이 한국문화원에서 작품을 선보였다. 싱가포르·베이징에서
                        타이베이·부산, KIAF에 이르는 아트페어에도 참여해 왔다.
                      </p>
                      <p>
                        그의 회화는 이제 울산시립미술관, 한국민속촌 미술관 등의 소장품으로 남아 있다
                        — 지역 화랑에서 시작해 공공 소장과 국제 아트페어로 함께 나아간 한국적 팝.
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
                      From the butterfly’s dream to the bright grammar of pop, Song Gwangyeon’s work
                      pursues a single question: how can a Korean iconography live, fully alive, in
                      the most contemporary of idioms? She joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity — offering her work so that
                      those navigating financial exclusion today might find a way through.
                    </>
                  ) : (
                    <>
                      나비의 꿈에서 팝의 밝은 문법까지, 송광연의 작업은 하나의 물음을 추구한다:
                      한국적 도상은 어떻게 가장 동시대적인 어법 속에서 온전히 살아 있을 수 있는가.
                      그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다 — 오늘 금융 차별을 헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의
                      작품을 내놓는다.
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
                BUTTERFLY
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
                Song Gwangyeon
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
                    Song Gwangyeon joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    송광연 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SONG_GWANGYEON_PATH}
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
