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

// 거장 작가 feature는 작가 페이지(/artworks/artist/장경호)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JANG_GYEONGHO_PATH = `/artworks/artist/${encodeURIComponent('장경호')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJangGyeonghoArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '장경호' ||
    n === 'jang gyeong-ho' ||
    n === 'jang gyeongho' ||
    n === 'jang kyungho' ||
    n.replace(/[\s-]+/g, '') === 'janggyeongho' ||
    n.replace(/[\s-]+/g, '') === 'jangkyungho'
  );
};

const PAGE_COPY = {
  ko: {
    title: '장경호 — 형상미술을 이끌어 온 설치미술가',
    description:
      '형상미술의 대가 장경호. 추상 이후의 한국 화단에 인간과 삶의 문제를 다시 불러들인 형상미술의 한 축을 주도해 온 설치미술가. 관훈미술관장 시절부터 한국현대 형상회화전을 지속적으로 열어 형상미술의 실체를 대중에게 보여 온 장경호의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '형상미술의 대가 장경호. 격동의 1980년대 한복판에서 인간과 삶의 문제를 그림으로 발언한 형상미술의 한 축을 주도해 온 설치미술가.',
    ogAlt: '장경호 대표 작품',
    twitterTitle: '장경호',
    twitterDescription: '인간과 삶을 다시 화면으로 — 형상미술을 이끌어 온 장경호',
    keywords:
      '장경호 작가, 형상미술, 설치미술, 한국현대 형상회화전, 관훈미술관, 1980년대 한국미술, 씨앗페 온라인',
  },
  en: {
    title: 'Jang Gyeongho — An Installation Artist Who Led Figurative Art',
    description:
      'Jang Kyungho, a master of figurative art. An installation artist who has been at the forefront of figurative art — the strand that brought issues of humanity and life back into Korean painting after abstraction. Since his tenure as director of the Gwanhun Gallery he has consistently organized exhibitions of Korean contemporary figurative painting. View and collect his works at SAF Online.',
    ogDescription:
      'Jang Kyungho — a master of figurative art. An installation artist who, amid the turbulent 1980s, led the strand of art that voiced issues of humanity and life through painting.',
    ogAlt: 'Jang Kyungho — featured work',
    twitterTitle: 'Jang Kyungho',
    twitterDescription:
      'Humanity and life, returned to the canvas — Jang Kyungho, who led figurative art',
    keywords:
      'Jang Kyungho artist, figurative art, hyeongsang misul, installation art, Korean contemporary art, 1980s Korean painting',
  },
} as const;

export async function buildJangGyeonghoMetadata({
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
  const pageUrl = buildLocaleUrl(JANG_GYEONGHO_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('장경호');
  const artwork = allArtworks.find((a) => isJangGyeonghoArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jang Kyungho`
      : `${artwork.title} — 장경호`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JANG_GYEONGHO_PATH, locale, true),
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

export default async function JangGyeonghoFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JANG_GYEONGHO_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('장경호');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJangGyeonghoArtist(artwork.artist)
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
    { name: isEnglish ? 'Jang Kyungho' : '장경호', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JANG_GYEONGHO_PATH}#person-jang-gyeongho`,
    name: isEnglish ? 'Jang Kyungho' : '장경호',
    alternateName: isEnglish ? '장경호' : 'Jang Kyungho',
    jobTitle: isEnglish ? 'Installation Artist' : '설치미술가',
    description: isEnglish
      ? 'Jang Kyungho is an installation artist who has been at the forefront of figurative art — the strand of Korean art that addressed the crisis of the era by tackling issues of humanity and life during the democratization movement of the early 1980s.'
      : '장경호는 80년대 초반 민주화가 진행되던 시대에 인간과 삶의 문제를 풀어가던 형상미술의 한 축을 주도해 온 설치미술가입니다.',
    knowsAbout: [
      isEnglish ? 'Figurative art' : '형상미술',
      isEnglish ? 'Installation art' : '설치미술',
      isEnglish ? 'Korean contemporary art' : '한국 현대미술',
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
    name: isEnglish ? 'Jang Kyungho — SAF Online' : '장경호 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jang Kyungho from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 장경호 작품을 소개합니다.',
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

          {/* Vertical lines — 형상이 다시 들어서는 화면의 구획 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jang Kyungho · Figurative Art' : '장경호 · 형상미술'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Humanity and life,
                  <br />
                  <span className="text-primary-soft">returned to the canvas</span>
                </>
              ) : (
                <>
                  인간과 삶을
                  <br />
                  <span className="text-primary-soft">다시 화면으로</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Amid the turbulence of the 1980s, he led one strand of figurative art.
                  </span>
                  <span className="mt-2 block">
                    Art that spoke of the era, of reality, of people — through painting.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">격동의 1980년대 한복판, 형상미술의 한 축을 이끌다.</span>
                  <span className="mt-2 block">
                    시대와 현실, 그리고 사람을 그림으로 발언한 미술.
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
                    Figurative art —<br />
                    <span className="text-primary-strong">
                      bringing the human back into the frame
                    </span>
                  </>
                ) : (
                  <>
                    형상미술 —<br />
                    <span className="text-primary-strong">화면으로 돌아온 인간</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jang Kyungho is an installation artist who has been at the forefront of
                      figurative art — one pillar of Korean art that addressed the crisis of the era
                      by tackling issues of humanity and life during the democratization movement of
                      the early 1980s.
                    </p>
                    <p>
                      Figurative art (<em>hyeongsang misul</em>) grew out of the &ldquo;new
                      figuration&rdquo; that emerged in the mid-1970s, and through the 1980s it
                      settled into one of the major currents of the Korean art world. It was the
                      tendency that, after the formalism of pure abstraction, called inner emotion
                      and the problems of human life back onto the canvas.
                    </p>
                    <p>
                      Keeping its distance from both the formalism of pure abstraction and from
                      traditional representational painting, figurative art spoke — in the midst of
                      the turbulent, democratizing 1980s — of people, reality, and the era through
                      the language of painting itself.
                    </p>
                    <p>
                      Since his tenure as director of the{' '}
                      <strong className="font-bold text-charcoal-deep">Gwanhun Gallery</strong>,
                      Jang Kyungho has consistently organized exhibitions of Korean contemporary
                      figurative painting, working to present the substance of figurative art to the
                      public. Through these efforts he sought to discover genuine figurative artists
                      who use painting to challenge a flawed world and to reflect upon themselves.
                    </p>
                    <p>
                      Less a single style than a stance, his practice has carried the conviction
                      that a painting can refuse a wrong world. As both maker and organizer, he has
                      been a figure who held open a place for the human within Korean contemporary
                      art.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      장경호 작가는 설치미술가로, 80년대 초반 민주화가 진행 중인 시대에 시대적
                      위기에 맞서 인간과 삶의 문제를 풀어가던 우리 미술의 한 축인{' '}
                      <strong className="font-bold text-charcoal-deep">형상미술</strong>을 주도해
                      왔다.
                    </p>
                    <p>
                      형상미술은 1970년대 중반의 〈새로운 형상성〉에서 출발해, 1980년대 한국 화단의
                      주요 흐름으로 자리 잡은 경향이다. 순수 추상(모더니즘)의 형식주의 이후, 내적
                      정서와 감정, 인간과 삶의 문제를 다시 화면으로 불러들인 흐름이었다.
                    </p>
                    <p>
                      순수 추상의 형식주의에도, 전통적 재현회화에도 거리를 둔 채, 형상미술은 격동의
                      1980년대 한복판에서 인간과 현실, 그리고 시대를 그림으로 발언했다.
                    </p>
                    <p>
                      그는 <strong className="font-bold text-charcoal-deep">관훈미술관장</strong>{' '}
                      시절부터 지속적으로 한국현대 형상회화전을 열면서, 형상미술의 실체를 대중에게
                      보여주기 위해 노력해 왔다. 이를 통해, 그림으로 잘못된 세상을 부정하고 스스로를
                      반성하는 진정한 형상미술 작가를 발굴하고자 했다.
                    </p>
                    <p>
                      그의 작업은 하나의 양식이라기보다 하나의 태도에 가깝다 — 그림이 잘못된 세상을
                      부정할 수 있다는 믿음. 만드는 사람이자 기획하는 사람으로서, 그는 한국 현대미술
                      안에 인간의 자리를 열어 둔 인물이다.
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
                        {isEnglish ? 'The return of the figure' : '형상의 회복'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'After the formalism of pure abstraction, inner emotion and the human are called back onto the canvas — neither pure abstraction nor traditional representation.'
                          : '순수 추상의 형식주의 이후, 내적 정서와 인간을 다시 화면으로 불러들인다 — 추상도 전통적 재현도 아닌 자리.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Speaking of the era' : '시대를 발언하다'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Amid the democratization of the early 1980s, painting becomes a way to confront the crisis of the era and the problems of human life.'
                          : '80년대 초반 민주화의 한복판에서, 그림은 시대적 위기와 인간·삶의 문제에 맞서는 방식이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Maker and organizer' : '작가이자 기획자'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Through the Korean contemporary figurative painting exhibitions, he sought to discover genuine figurative artists and to present the substance of the movement to the public.'
                          : '한국현대 형상회화전을 통해, 진정한 형상미술 작가를 발굴하고 그 실체를 대중에게 보여주고자 했다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'On figurative art' : '형상미술에 관하여'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Origin: grew out of the “new figuration” of the mid-1970s, settling into a major current of the Korean art world through the 1980s.'
                        : '출발: 1970년대 중반의 〈새로운 형상성〉에서 시작해, 1980년대 한국 화단의 주요 흐름으로 자리 잡음.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Position: distinct from both the formalism of pure abstraction and from traditional representational painting.'
                        : '위치: 순수 추상의 형식주의와도, 전통적 재현회화와도 구별되는 자리.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Content: inner emotion, the human, and the problems of life, called back onto the canvas after abstraction.'
                        : '내용: 추상 이후 다시 화면으로 불러들인 내적 정서·인간·삶의 문제.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Jang Kyungho's role: a leader of this current, and an organizer who, from his time as Gwanhun Gallery director, has continued to present figurative painting to the public."
                        : '장경호의 역할: 이 흐름을 주도하고, 관훈미술관장 시절부터 형상회화를 대중에게 지속 소개해 온 기획자.'}
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
                  Two essays —
                  <br />
                  <span className="text-charcoal-deep">on figurative art and its time</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">형상미술과 그 시대에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 추상 이후, 형상의 귀환 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'After abstraction — the return of the figure'
                    : '추상 이후 — 형상의 귀환'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        By the mid-1970s, Korean painting was largely governed by abstraction and
                        its formal concerns. Against this backdrop a counter-tendency began to
                        gather: the &ldquo;new figuration&rdquo; that, rather than dissolving the
                        image, insisted on bringing the human figure and lived feeling back to the
                        surface of the canvas.
                      </p>
                      <p>
                        Through the 1980s this tendency settled into one of the major currents of
                        the Korean art world under the name of figurative art. It was neither a
                        return to academic, traditional representation nor a continuation of pure
                        abstraction — it occupied a third place, where inner emotion, the human, and
                        the problems of life could be spoken again in paint.
                      </p>
                      <p>
                        Jang Kyungho stands within this current as one of its leaders. His work
                        carries the period&apos;s central conviction: that after abstraction had
                        emptied the canvas of the human, the figure had to be brought back — not as
                        decoration, but as a way of facing the era.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1970년대 중반, 한국 회화는 대체로 추상과 그 형식적 관심사가 지배하고 있었다.
                        그 배경 위에서 하나의 대항적 경향이 모이기 시작했다 — 이미지를 해체하는
                        대신, 인간의 형상과 살아 있는 감정을 다시 화면 위로 불러올리려 한 〈새로운
                        형상성〉이다.
                      </p>
                      <p>
                        1980년대를 지나며 이 경향은 형상미술이라는 이름으로 한국 화단의 주요 흐름
                        가운데 하나로 자리 잡았다. 그것은 아카데믹한 전통적 재현으로의 회귀도, 순수
                        추상의 연장도 아니었다 — 내적 정서와 인간, 삶의 문제를 다시 그림으로 말할 수
                        있는 제3의 자리였다.
                      </p>
                      <p>
                        장경호는 이 흐름을 이끈 한 사람으로 그 안에 선다. 그의 작업은 그 시대의
                        핵심적인 믿음을 품는다 — 추상이 화면에서 인간을 비워 낸 이후, 형상은 다시
                        불려와야 한다는 것. 장식으로서가 아니라, 시대를 마주하는 방식으로서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 만드는 사람, 그리고 모으는 사람 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The maker and the gatherer — figurative art made public'
                    : '만드는 사람, 모으는 사람 — 대중 앞의 형상미술'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A movement does not survive on individual canvases alone; it needs places
                        where the work can be seen together, named, and argued over. Jang Kyungho
                        understood this. From his time as director of the Gwanhun Gallery, he
                        consistently organized exhibitions of Korean contemporary figurative
                        painting, gathering the scattered practice of figurative art into a visible
                        whole.
                      </p>
                      <p>
                        The aim was not merely to display works but to present the{' '}
                        <em>substance</em> of figurative art to the public — to show that this was a
                        coherent stance, not an accident of style. Through these exhibitions he
                        sought out genuine figurative artists: those who used painting to refuse a
                        wrong world and to reflect upon themselves.
                      </p>
                      <p>
                        In this double role — maker and organizer — Jang Kyungho held open a place
                        for the human inside Korean contemporary art. To lead figurative art was,
                        for him, both to paint and to make room for others to paint.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        하나의 흐름은 개별 화폭만으로 살아남지 않는다. 작품이 함께 보이고, 이름이
                        붙고, 논의되는 자리가 필요하다. 장경호는 이를 알았다. 그는 관훈미술관장
                        시절부터 한국현대 형상회화전을 지속적으로 열며, 흩어져 있던 형상미술의
                        작업을 하나의 보이는 전체로 모아 냈다.
                      </p>
                      <p>
                        목표는 단지 작품을 거는 것이 아니라, 형상미술의 <em>실체</em>를 대중에게
                        보여주는 것이었다 — 이것이 우연한 양식이 아니라 하나의 일관된 태도임을
                        보이는 일. 그는 이 전시들을 통해 진정한 형상미술 작가를 찾았다. 그림으로
                        잘못된 세상을 부정하고 스스로를 반성하는 작가들을.
                      </p>
                      <p>
                        만드는 사람이자 기획하는 사람이라는 이중의 자리에서, 장경호는 한국 현대미술
                        안에 인간의 자리를 열어 두었다. 그에게 형상미술을 이끈다는 것은 그리는
                        일이자, 다른 이들이 그릴 자리를 마련하는 일이었다.
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
                      From the &ldquo;new figuration&rdquo; of the 1970s to the figurative painting
                      exhibitions he has continued to organize, Jang Kyungho&apos;s practice has
                      pursued a single question: how can a painting hold the human, and the era, at
                      once? He joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that those who come after might paint with a place
                      held open for them.
                    </>
                  ) : (
                    <>
                      1970년대의 〈새로운 형상성〉에서 지금까지 이어 온 형상회화전까지, 장경호의
                      작업은 하나의 물음을 추구해 왔다 — 그림은 어떻게 인간과 시대를 한 화면에 담을
                      수 있는가. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                      연대자로서 함께한다 — 다음 세대의 예술인들이 자리를 마련받아 그릴 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jang Kyungho</span>
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
                    Jang Kyungho joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    장경호 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JANG_GYEONGHO_PATH}
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
