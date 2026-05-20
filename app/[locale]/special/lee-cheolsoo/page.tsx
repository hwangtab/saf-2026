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

export const dynamic = 'force-static';
export const revalidate = 600;

const LEE_CHEOLSOO_ARTIST_KEYS = new Set([
  '이철수',
  'lee chul-soo',
  'lee cheolsoo',
  'lee chulsoo',
  'lee cheol-soo',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isLeeCheolsooArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    LEE_CHEOLSOO_ARTIST_KEYS.has(normalized) ||
    compact === '이철수' ||
    compact === 'leecheolsoo' ||
    compact === 'leechulsoo'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이철수 — 판화·서화의 거장',
    description:
      '판화·서화의 거장 이철수(1954–). 짧은 글귀와 단순한 목판 이미지로 한국인의 일상에 가장 깊이 스며든 작가. 나무처럼 사람처럼, 이철수의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '판화·서화의 거장 이철수. 짧은 글귀와 단순한 목판 이미지로 한국인의 마음속에 가장 깊이 스며든 작가.',
    ogAlt: '이철수 대표 작품',
    twitterTitle: '이철수',
    twitterDescription: '나무처럼, 사람처럼 — 목판화·서화의 거장 이철수',
  },
  en: {
    title: 'Lee Chul-soo — Master of Prints and Brushwork',
    description:
      'Selected works by Lee Chul-soo (b. 1954), master of prints and brushwork. His simple woodblock prints paired with short, zen-like phrases have found their way into the everyday lives of Koreans. View and collect selected works at SAF Online.',
    ogDescription:
      'Lee Chul-soo — master of prints and brushwork. Simple woodblock images paired with short poetic phrases that speak to everyday Korean life.',
    ogAlt: 'Lee Chul-soo — featured work',
    twitterTitle: 'Lee Chul-soo',
    twitterDescription: 'Like trees, like people — master of Korean woodblock prints and brushwork',
  },
} as const;

export async function generateMetadata({
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
  const pageUrl = buildLocaleUrl('/special/lee-cheolsoo', locale);

  const allArtworks = await getSupabaseArtworksByArtist('이철수');
  const artwork = allArtworks.find((a) => isLeeCheolsooArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Chul-soo`
      : `${artwork.title} — 이철수`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Lee Chul-soo artist, Korean woodblock prints, Korean calligraphy art, prints and brushwork, minjung art'
        : '이철수 화가, 한국 목판화, 이철수 판화, 서화, 민중미술, 씨앗페 온라인',
    alternates: createLocaleAlternates('/special/lee-cheolsoo', locale, true),
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

export default async function LeeCheolsooPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/special/lee-cheolsoo', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이철수');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isLeeCheolsooArtist(artwork.artist)
  );
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('leeCheolsoo'), url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    name: isEnglish ? 'Lee Chul-soo' : '이철수',
    alternateName: isEnglish ? '이철수' : 'Lee Chul-soo',
    jobTitle: isEnglish ? 'Artist' : '판화가·서화가',
    description: isEnglish
      ? 'Lee Chul-soo (b. 1954) is a Korean master printmaker and brushwork artist, known for woodblock prints that pair simple nature imagery with short, zen-like calligraphic phrases.'
      : '이철수(1954-)는 목판화와 서화를 하나로 녹여낸 작가로, 단순한 자연 이미지와 짧은 글귀를 결합한 작품으로 한국인의 일상 속에 가장 깊이 스며든 거장입니다.',
    birthDate: '1954',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Seoul, South Korea' : '서울',
    },
    workLocation: {
      '@type': 'Place',
      name: isEnglish ? 'Jecheon, Chungbuk, South Korea' : '충북 제천',
    },
    knowsAbout: ['Korean woodblock printmaking', 'Brushwork (서화)'],
    sameAs: ['https://ko.wikipedia.org/wiki/이철수'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Chul-soo — SAF Online' : '이철수 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Chul-soo from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이철수 작품들을 소개합니다.',
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
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block relative mb-8">
              <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
                {isEnglish ? 'Lee Chul-soo · b. 1954' : '이철수 · 1954–'}
              </span>
              <div className="absolute inset-0 border-4 border-primary transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black">
              {isEnglish ? (
                <>
                  Like Trees,
                  <br />
                  Like People
                </>
              ) : (
                <>
                  나무처럼,
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-primary">사람처럼</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">A single cut. A short phrase. A whole life.</span>
                  <span className="mt-2 block">
                    Lee Chul-soo&apos;s woodblock prints find you where you least expect them.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한 번의 칼질. 짧은 글귀. 삶 하나.</span>
                  <span className="mt-2 block">
                    이철수의 판화는 가장 뜻밖의 순간에 당신을 찾아옵니다.
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="absolute top-0 left-0 w-32 h-32 border-l-[12px] border-t-[12px] border-white/15" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-r-[12px] border-b-[12px] border-white/15" />
          <div className="absolute top-1/2 left-4 w-4 h-4 rounded-full bg-primary opacity-40" />
          <div className="absolute top-1/3 right-8 w-6 h-6 rounded-full bg-white opacity-10" />
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Quote Section */}
          <div className="mb-24 flex justify-center">
            <blockquote className="relative p-8 sm:p-10 md:p-16 text-center max-w-4xl border-4 border-charcoal bg-white shadow-[8px_8px_0px_0px_rgba(49,57,60,0.1)]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary flex items-center justify-center rounded-full text-white font-display font-black text-3xl">
                &ldquo;
              </div>
              <p className="text-xl sm:text-2xl md:text-4xl text-charcoal leading-relaxed text-balance pt-4 font-display font-black">
                {isEnglish ? (
                  <>
                    I want to awaken inner stillness and reflection in a way anyone can feel in
                    everyday life. This is returning art to those who are weary of living — and I
                    think it is the affection I had long neglected for people.
                  </>
                ) : (
                  <>
                    일상 속에서 누구나 느낄 수 있는 방식으로 내적인 고요와 성찰을 일깨우려 합니다.
                    이것이 삶에 지친 사람들에게 미술을 되돌려주는 것이고, 그동안 제 스스로가
                    간과했던 사람들에 대한 애정이라 생각됩니다.
                  </>
                )}
              </p>
              <footer className="mt-8 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-px w-8 bg-charcoal/40"></span>
                  <span className="text-xl text-charcoal font-bold tracking-widest">
                    {isEnglish ? 'Lee Chul-soo' : '이철수'}
                  </span>
                  <span className="h-px w-8 bg-charcoal/40"></span>
                </div>
                <p className="text-xs text-charcoal-muted">
                  {isEnglish ? (
                    <>
                      Source:{' '}
                      <a
                        href="https://www.cbinews.co.kr/news/articleView.html?idxno=75494"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        충북인뉴스 (CBN News), &ldquo;Lee Chul-soo · 30 Years · Printmaking ·
                        Life&rdquo;
                      </a>
                    </>
                  ) : (
                    <>
                      출처:{' '}
                      <a
                        href="https://www.cbinews.co.kr/news/articleView.html?idxno=75494"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        충북인뉴스, 「이철수·30년·판화·인생」
                      </a>
                    </>
                  )}
                </p>
              </footer>
            </blockquote>
          </div>

          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    One cut, one phrase —<br />
                    <span className="text-primary-strong">art that lives outside museums</span>
                  </>
                ) : (
                  <>
                    한 번의 칼질, 한 줄의 글 —<br />
                    <span className="text-primary-strong">미술관 밖에 사는 예술</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Chul-soo (b. 1954) occupies a singular place in Korean art: he is the
                      artist whose work most Koreans have lived with, without necessarily knowing
                      his name. His woodblock prints — a bird on a bare branch, two hands cupped
                      together, a single leaf in wind — have appeared on calendars, postcards, book
                      covers, and the walls of ordinary homes across the country for four decades.
                    </p>
                    <p>
                      What makes his work{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        travel so far
                      </strong>{' '}
                      is precisely its restraint. Each print begins with stripping away: the image
                      reduced to its simplest form, the accompanying phrase pared to its fewest
                      syllables. The result is something that feels both complete and open — a frame
                      that the viewer can step into.
                    </p>
                    <p>
                      Rooted in the minjung art movement of the 1980s, Lee&apos;s work took a turn
                      toward the personal and philosophical rather than the overtly political. He
                      found that the most{' '}
                      <strong className="font-bold text-charcoal">democratic art</strong> was not
                      one that argued, but one that a market vendor, a factory worker, and a student
                      could each quietly take home.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이철수(1954-)는 한국인 대부분이 알게 모르게 함께 살아온 작가입니다. 앙상한
                      가지 위의 새, 두 손을 모아 담은 것, 바람에 흔들리는 나뭇잎 하나. 그의 판화는
                      40년 넘게 달력과 엽서, 책 표지와 평범한 가정의 벽 위에 자리해 왔습니다.
                    </p>
                    <p>
                      그의 작품이{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        이토록 멀리 가는 이유
                      </strong>
                      는 정확히 그 절제 때문입니다. 모든 그림은 덜어내기에서 시작합니다. 이미지는
                      가장 단순한 형태로, 함께 쓰인 글귀는 가장 적은 음절로. 결과는 완결되어
                      있으면서도 열려있는 것 — 보는 이가 스스로 걸어 들어올 수 있는 공간입니다.
                    </p>
                    <p>
                      1980년대 민중미술 운동에 뿌리를 두면서도, 이철수는 직접적인 정치 대신
                      개인적이고 철학적인 방향으로 걸음을 옮겼습니다. 가장{' '}
                      <strong className="font-bold text-charcoal">민주적인 예술</strong>은 주장하는
                      예술이 아니라, 시장 상인도 공장 노동자도 학생도 각자의 마음에 조용히 가져갈 수
                      있는 예술이라고 믿었기 때문입니다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]">
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
                        {isEnglish ? 'Trees and people' : '나무와 사람'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Nature and humanity mirror each other — a single branch holds as much life as a human life does.'
                          : '자연의 이치를 인간의 삶에 포개어, 두 존재가 다르지 않음을 보여줍니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Text and image' : '글과 그림'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Short calligraphic phrases and woodblock images fuse into one — each work a small, self-contained poem.'
                          : '짧은 글귀와 목판 이미지가 하나가 되어, 한 장면이 작은 시가 됩니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Folk lyricism' : '민중의 서정'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Simple lines carry the feelings most widely shared — his prints hang in homes precisely because they need no explanation.'
                          : '화려한 기교 대신 단순한 선으로, 가장 많은 사람이 공감하는 감정을 담아냅니다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1954
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Seoul.' : '서울 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1981
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo woodblock print exhibition at Gwanhun Gallery, Seoul — launching a career defined by accessible, lyrical prints.'
                        : '첫 목판화 개인전 개최 (관훈미술관, 서울). 서정적·접근 가능한 판화 작업 본격 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1980s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Work rooted in minjung art sensibilities while charting an independent path in text-image fusion (서화).'
                        : '민중미술적 감성을 바탕으로, 독자적인 서화(書畵) 세계를 열어감.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Relocates to Jecheon, North Chungcheong — farming and printmaking become inseparable.'
                        : '충북 제천 귀농. 농사와 판화 작업을 하나의 삶으로 통합.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1990s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works appear on calendars, books, posters — his prints become part of the texture of everyday Korean life.'
                        : '달력·책·포스터 등 생활 매체에 작품 확산. 한국인의 일상 속으로.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Continues working in Jecheon. Works exhibited internationally (Germany,
                          France, Ireland and more). Official shop:{' '}
                          <a
                            href="https://mokpan.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-strong underline"
                          >
                            mokpan.com
                          </a>
                        </>
                      ) : (
                        <>
                          제천에서 작업 지속. 독일·프랑스·아일랜드 등 국제 전시 다수. 공식 판매처:{' '}
                          <a
                            href="https://mokpan.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-strong underline"
                          >
                            mokpan.com
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                </ol>
              </div>
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition, Gwanhun Gallery, Seoul (1981); second solo, same venue (1985)'
                        : '첫 개인전 관훈미술관 (1981); 2회전 동일 장소 (1985)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Not a Trivial Life" solo exhibition (2020); "Was It a Door?" solo exhibition (2021)'
                        : '〈비루하지 않은 삶을 위하여〉 (2020); 〈문인가 하였더니, 다시 길〉 (2021)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'International exhibitions in Germany, Switzerland, Ireland, Hungary, Spain, France, Belgium, Italy, Kazakhstan, United States and South Africa (first retrospective)'
                        : '독일·스위스·아일랜드·헝가리·스페인·프랑스·벨기에·이탈리아·카자흐스탄·미국·남아공(첫 회고전) 등 국제 전시'}
                    </span>
                  </li>
                </ul>
                <div className="mt-5 border-t border-charcoal/15 pt-4 space-y-2">
                  <p className="text-sm font-bold text-charcoal break-keep">
                    {isEnglish
                      ? '✦ Accessible entry points to the collection'
                      : '✦ 진입 가능한 소장 경로'}
                  </p>
                  <p className="text-sm text-charcoal-muted break-keep">
                    {isEnglish ? (
                      <>
                        Print postcards and annual print calendars are widely available — making Lee
                        Chul-soo one of the most accessible artists in the collection. Original
                        works also available via{' '}
                        <a
                          href="https://mokpan.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-strong underline"
                        >
                          mokpan.com
                        </a>
                        .
                      </>
                    ) : (
                      <>
                        판화 엽서 및 연간 판화 달력 등 생활 매체로 광범위하게 보급. 씨앗페 컬렉션 중
                        가장 접근하기 쉬운 작가 중 한 명. 원화 작품은{' '}
                        <a
                          href="https://mokpan.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-strong underline"
                        >
                          mokpan.com
                        </a>
                        에서도 구매 가능.
                      </>
                    )}
                  </p>
                </div>
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
                    <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>{' '}
                    works are featured here.
                  </>
                ) : (
                  <>
                    총 <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Chul-soo</span>
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
                    Lee Chul-soo joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이철수 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo="/special/lee-cheolsoo"
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
