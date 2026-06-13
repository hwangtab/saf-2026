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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이철수)에서 dispatch되어 렌더된다.
const LEE_CHEOLSOO_PATH = `/artworks/artist/${encodeURIComponent('이철수')}`;

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

export async function buildLeeCheolsooMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_CHEOLSOO_PATH, locale);

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
    alternates: createLocaleAlternates(LEE_CHEOLSOO_PATH, locale, true),
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

export default async function LeeCheolsooFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_CHEOLSOO_PATH, locale);
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
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Chul-soo' : '이철수', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_CHEOLSOO_PATH}#person-lee-cheolsoo`,
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
    sameAs: ['https://ko.wikipedia.org/wiki/이철수', 'https://www.wikidata.org/wiki/Q16183948'],
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
                    <span className="relative z-10 text-primary-soft">사람처럼</span>
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
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16 items-start">
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
                      Lee Chul-soo (b. 1954, Seoul) occupies a singular place in Korean art: he is
                      the artist whose work most Koreans have lived with, without necessarily
                      knowing his name. His woodblock prints — a bird on a bare branch, two hands
                      cupped together, a single leaf in wind — have appeared on calendars,
                      postcards, book covers, and the walls of ordinary homes across the country for
                      four decades.
                    </p>
                    <p>
                      He held his first solo exhibition at Gwanhun Gallery, Seoul, in 1981 — and the
                      career that followed was built not through institutions but through
                      persistence and reach. By the 1980s he was counted, alongside Oh Yun, as one
                      of the generation&apos;s defining minjung printmakers: artists who understood
                      the woodblock as a medium for speaking directly to people who had no reason to
                      enter a gallery.
                    </p>
                    <p>
                      In 1987 he left Seoul and relocated to Baekun-myeon, Jecheon — a rural area in
                      North Chungcheong province — to farm alongside his wife. It was a decisive
                      move. From around 1988, the work began to shift: away from overt social
                      critique and toward{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        self-reflection, daily life, and the rhythms of the natural world
                      </strong>
                      . The blade still cut; the message became quieter and, for that reason, more
                      widely heard.
                    </p>
                    <p>
                      What makes his work{' '}
                      <strong className="font-bold text-charcoal">travel so far</strong> is
                      precisely its restraint. Each print begins with stripping away: the image
                      reduced to its simplest form, the accompanying phrase pared to its fewest
                      syllables. The result is something that feels both complete and open — a frame
                      the viewer can step into.
                    </p>
                    <p>
                      Over four decades of sustained practice, Lee has produced a vast body of
                      woodblock prints — thousands of works — alongside murals and postcard
                      illustrations. He describes his prints as &ldquo;daily confession and
                      self-examination.&rdquo; The most{' '}
                      <strong className="font-bold text-charcoal-deep">democratic art</strong>, he
                      has shown, is not one that argues — but one a market vendor, a factory worker,
                      and a student can each quietly take home.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이철수(1954-, 서울 출생)는 한국인 대부분이 알게 모르게 함께 살아온 작가입니다.
                      앙상한 가지 위의 새, 두 손을 모아 담은 것, 바람에 흔들리는 나뭇잎 하나. 그의
                      판화는 40년 넘게 달력과 엽서, 책 표지와 평범한 가정의 벽 위에 자리해 왔습니다.
                    </p>
                    <p>
                      1981년 관훈갤러리에서 첫 개인전을 열며 작가로 나선 그는, 이후 기관이나
                      제도보다 끈기와 대중적 도달로 경력을 쌓았습니다. 1980년대에 이르러 이철수는
                      오윤과 더불어 그 세대를 대표하는 민중판화가로 꼽히게 됩니다. 미술관에 올
                      이유가 없는 사람들에게 직접 말을 거는 매체로서 목판을 이해했던
                      작가들이었습니다.
                    </p>
                    <p>
                      1987년, 그는 서울을 떠나 충북 제천 백운면으로 내려가 아내와 함께 농사를
                      시작했습니다. 결정적인 이동이었습니다. 1988년 무렵부터 작업이 달라지기
                      시작했습니다. 직접적인 사회 비판에서 벗어나{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        자기 성찰과 일상, 자연의 리듬으로
                      </strong>{' '}
                      향했습니다. 칼은 여전히 새겼지만 메시지는 조용해졌고, 바로 그 이유로 더 멀리
                      가닿았습니다.
                    </p>
                    <p>
                      그의 작품이{' '}
                      <strong className="font-bold text-charcoal">이토록 멀리 가는 이유</strong>는
                      정확히 그 절제 때문입니다. 모든 그림은 덜어내기에서 시작합니다. 이미지는 가장
                      단순한 형태로, 함께 쓰인 글귀는 가장 적은 음절로. 결과는 완결되어 있으면서도
                      열려 있는 것 — 보는 이가 스스로 걸어 들어올 수 있는 공간입니다.
                    </p>
                    <p>
                      40년이 넘는 지속적 작업 끝에 이철수는 수천 점에 이르는 목판화와, 벽화와 엽서
                      그림을 아우른 방대한 작품을 남겼습니다. 그는 자신의 판화를 &ldquo;내 일상의
                      고백이자 반성문&rdquo;이라 표현합니다. 가장{' '}
                      <strong className="font-bold text-charcoal-deep">민주적인 예술</strong>은
                      주장하는 예술이 아니라, 시장 상인도 공장 노동자도 학생도 각자의 마음에 조용히
                      가져갈 수 있는 예술임을 그는 보여주었습니다.
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
                        ? 'Relocates to Baekun-myeon, Jecheon, North Chungcheong — farming alongside his wife; printmaking and daily life become inseparable.'
                        : '충북 제천 백운면 귀농. 아내와 함께 농사를 지으며 판화 작업과 일상을 하나로 통합.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1988–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Work shifts from social critique toward self-reflection and nature. Annual print calendars and leaf-letter postcards reach a mass audience.'
                        : '사회 비판에서 자기 성찰·자연으로 전환. 연간 판화 달력·엽서가 대중에게 넓게 보급되기 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'International solo exhibitions in Germany and Switzerland; group exhibition at Original Print Gallery, Dublin (Ireland).'
                        : '독일·스위스 개인전; 아일랜드 더블린 Original Print Gallery 그룹 초대전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          &ldquo;Leaf Letters&rdquo; (나뭇잎편지) online community launched;
                          membership grows to over 60,000 &mdash; bringing his prints directly into
                          subscribers&rsquo; daily lives.
                        </>
                      ) : (
                        '온라인 「나뭇잎편지」 시작. 회원 6만 명 이상으로 성장하며 판화가 직접 일상으로 찾아가는 통로가 됨.'
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Was It a Door? — Back to the Road〉 (문인가 하였더니, 다시 길), Insa Art Center, Seoul — 98 works including the 〈Mugwangwan〉 series.'
                        : '개인전 〈문인가 하였더니, 다시 길〉, 인사아트센터 서울 — 〈무문관 연작〉 등 98점 출품.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo exhibition for the Jeon Tae-il Medical Center building fund, Insa Art
                          Center, Seoul (Nov 2024) — 58 works; continues working in Jecheon.
                          Official shop:{' '}
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
                          전태일의료센터 건립기금 마련 개인전, 인사아트센터 서울 (2024.11) — 58점
                          출품. 제천에서 작업 계속. 공식 판매처:{' '}
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
                        ? 'Solo exhibitions in Germany and Switzerland (1989); group exhibition at Original Print Gallery, Dublin, Ireland (1989); further international group exhibitions in Hungary, Spain, France, Belgium, Italy, Kazakhstan, United States and South Africa (first retrospective) and others'
                        : '독일·스위스 개인전 (1989); 아일랜드 더블린 Original Print Gallery 그룹전 (1989); 이후 헝가리·스페인·프랑스·벨기에·이탈리아·카자흐스탄·미국·남아공(첫 회고전) 등 국제 그룹전 다수'}
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

          {/* Sub-essay Section */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the blade, the farm, and the letter</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">칼과 농사와 편지에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 1980년대, 칼로 새긴 저항 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '1980s — resistance carved with a blade'
                    : '1980년대 — 칼로 새긴 저항'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Lee Chul-soo held his first solo exhibition at Gwanhun Gallery in 1981,
                        Korean society was living under military authoritarian rule and the
                        aftershock of the May 18 Gwangju Uprising of 1980. The woodblock print had
                        emerged, for a generation of young artists, as the medium closest to the
                        street: cheap to reproduce, durable, capable of being pressed onto cheap
                        paper and handed directly to people. Lee was counted — alongside Oh Yun — as
                        one of that generation&apos;s defining minjung printmakers.
                      </p>
                      <p>
                        What distinguished Lee&apos;s 1980s work was not spectacle but intimacy.
                        Even in his most politically engaged period, the imagery tended toward the
                        human figure in its ordinary postures: bent at labour, resting, reaching.
                        The woodblock, for Lee, was never merely a political instrument — it was
                        already a practice of paying attention, of looking carefully enough at a
                        person or a tree or a gesture that it became worth cutting into wood.
                      </p>
                      <p>
                        By 1989 his work was traveling internationally. Solo exhibitions in Germany
                        and Switzerland, and an invitation from the Original Print Gallery in
                        Dublin, Ireland, signaled that the formal economy of the Korean minjung
                        woodblock had a legibility beyond the peninsula — that a single cut, a
                        single phrase, could cross language.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1981년 이철수가 관훈갤러리에서 첫 개인전을 열었을 때, 한국 사회는 군부
                        독재와 1980년 5·18 광주민주화운동의 충격 속에 있었습니다. 목판화는 그 세대
                        젊은 작가들에게 거리에 가장 가까운 매체였습니다. 복제가 싸고, 내구성이
                        있으며, 거친 종이에 찍어 사람들 손에 직접 건넬 수 있었습니다. 이철수는
                        오윤과 더불어 그 세대의 대표적인 민중판화가로 꼽혔습니다.
                      </p>
                      <p>
                        이철수의 1980년대 작업을 특징짓는 것은 스펙터클이 아니라 친밀함이었습니다.
                        가장 정치적으로 참여한 시기에도 이미지는 일상적 자세의 인간 형상을
                        향했습니다. 노동으로 구부러진 몸, 쉬는 몸, 손을 뻗는 몸. 이철수에게 목판화는
                        정치적 도구만이 아니었습니다 — 사람이든 나무든 몸짓이든, 그것을 나무에 새길
                        만큼 주의 깊게 바라보는 행위였습니다.
                      </p>
                      <p>
                        1989년에는 작업이 국제적으로 이동했습니다. 독일과 스위스에서 개인전을
                        열었고, 아일랜드 더블린의 Original Print Gallery 초대전에 참여했습니다. 한국
                        민중판화의 형식적 절약이 반도 밖에서도 가독성을 가진다는 증거였습니다 — 한
                        번의 칼질, 한 줄의 글귀가 언어를 넘을 수 있었습니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 제천으로 — 농사짓는 판화가 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'Jecheon — the printmaker who farms' : '제천으로 — 농사짓는 판화가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 1987 Lee Chul-soo left Seoul and moved to Baekun-myeon, Jecheon — a small
                        township in the mountains of North Chungcheong province — to farm alongside
                        his wife. It was not a retreat from art but a redefinition of the conditions
                        under which art could be made honestly.
                      </p>
                      <p>
                        From around 1988, the work shifted. Overt social critique gave way to
                        self-reflection, to the daily rhythms of rural life, to what he has called
                        the practice of <em>ordinary days as contemplation</em>. The images grew
                        quieter: a mushroom after rain, the angle of a branch in winter, the weight
                        of a bowl. The accompanying phrases grew shorter. He has described his
                        prints of this period as &ldquo;daily confession and self-examination&rdquo;
                        — the blade as a tool for honesty rather than argument.
                      </p>
                      <p>
                        The farm did not separate Lee from society; it relocated the terms of the
                        encounter. Living outside the art-world economy of Seoul, growing food,
                        cutting blocks in the same hours, he arrived at a practice that was both
                        deeply rooted and surprisingly portable. Over four decades the Jecheon
                        studio has produced thousands of woodblock prints — and a body of work that
                        has found its way into more Korean homes than almost any other living
                        artist.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1987년, 이철수는 서울을 떠나 충북 제천 백운면 — 산 속의 작은 마을 — 으로
                        내려가 아내와 함께 농사를 시작했습니다. 미술로부터의 후퇴가 아니라, 정직하게
                        작업할 수 있는 조건의 재정의였습니다.
                      </p>
                      <p>
                        1988년 무렵부터 작업이 달라졌습니다. 직접적인 사회 비판이 물러나고, 자기
                        성찰과 농촌 생활의 일상적 리듬이, 그가 말하는 &lsquo;일상의 수행&rsquo;이
                        전면에 나섰습니다. 이미지는 조용해졌습니다. 비 뒤에 돋아나는 버섯, 겨울
                        가지의 각도, 밥그릇의 무게. 함께 새기는 글귀는 더 짧아졌습니다. 그는 이
                        시기의 판화를 &ldquo;내 일상의 고백이자 반성문&rdquo;이라 부릅니다 — 칼은
                        주장이 아니라 정직의 도구였습니다.
                      </p>
                      <p>
                        농사가 이철수를 사회로부터 분리하지는 않았습니다. 만남의 조건을 다시 정했을
                        뿐입니다. 서울 미술계의 경제 밖에서, 먹을 것을 기르고, 같은 시간에 목판을
                        새기며, 그는 깊이 뿌리내리면서도 놀랍도록 이동 가능한 작업 방식에
                        도달했습니다. 40년이 넘는 제천 작업실에서 수천 점에 이르는 목판화가
                        태어났습니다 — 그리고 살아있는 작가 중 가장 많은 한국 가정의 벽에 자리한
                        작품들이 되었습니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 달력과 편지 — 미술관 밖에서 만나는 그림 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Calendars and letters — art that finds you outside the gallery'
                    : '달력과 편지 — 미술관 밖에서 찾아오는 그림'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For most Koreans, the first encounter with Lee Chul-soo&apos;s work did not
                        happen in a gallery. It happened on a kitchen wall — in the square of a
                        print calendar — or in the palm of a hand holding a postcard. This is not
                        accident. It reflects a conscious strategy, developed across decades, of
                        placing the work where people already are.
                      </p>
                      <p>
                        The annual Lee Chul-soo print calendar, published continuously since at
                        least the early 2000s, has become one of the longest-running artist-calendar
                        traditions in Korean publishing. Each year a new set of woodblock prints
                        structures the months, bringing seasonal imagery and a short phrase into
                        hundreds of thousands of homes. In 2002 he launched the online &ldquo;Leaf
                        Letters&rdquo; (
                        <a
                          href="https://www.facebook.com/mokpan.letter"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-strong underline"
                        >
                          나뭇잎편지
                        </a>
                        ) community — a digital extension of the postcard tradition — which grew to
                        over 60,000 members, each receiving a print image and text directly into
                        their daily life.
                      </p>
                      <p>
                        The effect has been to make Lee Chul-soo the most distributed artist in
                        Korean everyday life — not through institutional acquisition but through the
                        postal system, the bookshop, and the screen. His official shop{' '}
                        <a
                          href="https://mokpan.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-strong underline"
                        >
                          mokpan.com
                        </a>{' '}
                        continues this logic: original works available directly, without gallery
                        mediation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대부분의 한국인에게 이철수의 작품과의 첫 만남은 갤러리에서 일어나지
                        않았습니다. 주방 벽에서, 판화 달력의 한 칸 안에서, 또는 엽서를 쥔 손바닥
                        위에서 일어났습니다. 이것은 우연이 아닙니다. 수십 년에 걸쳐 발전시킨,
                        사람들이 이미 있는 곳에 작품을 놓겠다는 의식적인 전략입니다.
                      </p>
                      <p>
                        적어도 2000년대 초부터 매년 출판되어 온 이철수 판화 달력은 한국 출판에서
                        가장 오래된 작가 달력 전통 중 하나가 됐습니다. 해마다 새로운 목판화 작품들이
                        달을 구성하며, 계절적 이미지와 짧은 글귀를 수십만 가정에 가져다줍니다.
                        2002년에는 온라인 「나뭇잎편지」(
                        <a
                          href="https://www.facebook.com/mokpan.letter"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-strong underline"
                        >
                          mokpan.letter
                        </a>
                        ) 커뮤니티를 시작했습니다 — 엽서 전통의 디지털 연장 — 회원이 6만 명 이상으로
                        성장하며, 각자의 일상으로 판화 이미지와 글이 직접 찾아갔습니다.
                      </p>
                      <p>
                        그 결과 이철수는 한국인의 일상에서 가장 넓게 보급된 작가가 됐습니다 — 기관
                        소장이 아니라, 우편 시스템과 서점과 화면을 통해. 공식 판매처{' '}
                        <a
                          href="https://mokpan.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-strong underline"
                        >
                          mokpan.com
                        </a>
                        은 이 논리를 이어갑니다. 갤러리 중개 없이, 원화 작품을 직접.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium break-keep">
                  {isEnglish ? (
                    <>
                      From the minjung galleries of 1981 to the Jecheon farm studio of today, Lee
                      Chul-soo has pursued a single question: what is the simplest form in which a
                      human truth can be cut into wood and handed to a stranger? Over forty years,
                      that question has produced a body of work unlike any other in Korean art. He
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that those who come after might work without barriers he never
                      chose.
                    </>
                  ) : (
                    <>
                      1981년 민중판화의 갤러리에서 오늘날 제천 작업실까지, 이철수는 하나의 물음을
                      추구해 왔습니다. 인간의 진실을 나무에 새겨 낯선 사람에게 건넬 수 있는 가장
                      단순한 형태는 무엇인가. 40년 넘게 이어진 그 물음이 한국 미술에 유례없는 작업을
                      만들었습니다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                      연대자로서 함께합니다 — 다음 세대의 예술인들이 그가 선택하지 않았던 장벽 없이
                      일할 수 있도록.
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
                returnTo={LEE_CHEOLSOO_PATH}
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
