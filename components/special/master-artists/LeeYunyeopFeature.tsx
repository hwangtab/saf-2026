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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이윤엽)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_YUNYEOP_PATH = `/artworks/artist/${encodeURIComponent('이윤엽')}`;

const LEE_YUNYEOP_ARTIST_KEYS = new Set([
  '이윤엽',
  'lee yunyeop',
  'lee yun-yeop',
  'lee yoonyeop',
  'lee yoon-yeop',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isLeeYunyeopArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    LEE_YUNYEOP_ARTIST_KEYS.has(normalized) ||
    compact === '이윤엽' ||
    compact === 'leeyunyeop' ||
    compact === 'leeyoonyeop'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이윤엽 — 노동의 목판을 새기는 목판화가',
    description:
      '목판화가 이윤엽. 농부와 노동자, 주변의 소박한 사물을 흰 여백 위 굵은 선으로 새기는 작가. 스스로를 ‘파견미술가’라 부르며 파업·시위 현장에서 노동자들과 함께 판화를 제작해 왔다. 2012년 구본주 예술상을 수상한 이윤엽의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '목판화가 이윤엽 — 흰 여백 위 굵은 선으로 농부와 노동자를 새기는 작가. 나무를 깎는 몸의 노동, 연대의 미술.',
    ogAlt: '이윤엽 대표 작품',
    twitterTitle: '이윤엽',
    twitterDescription: '파견미술가의 칼 — 노동의 목판을 새기는 이윤엽',
    keywords: '이윤엽 목판화, 이윤엽 판화, 파견미술가, 구본주 예술상, 민중미술, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Yunyeop — Woodblock Artist of Labour',
    description:
      'Selected works by woodblock artist Lee Yunyeop, who carves farmers, workers, and humble everyday objects with bold lines over white space. Calling himself a “dispatch artist,” he has made prints alongside workers at strikes and demonstrations. Winner of the 2012 Gu Bon-ju Art Award. View and collect his works at SAF Online.',
    ogDescription:
      'Lee Yunyeop — a woodblock artist who carves farmers and workers in bold lines over white space. The bodily labour of cutting wood, an art of solidarity.',
    ogAlt: 'Lee Yunyeop — featured work',
    twitterTitle: 'Lee Yunyeop',
    twitterDescription: 'The dispatch artist’s knife — woodblocks of labour by Lee Yunyeop',
    keywords:
      'Lee Yunyeop woodblock, Korean woodblock prints, dispatch artist, minjung art, labour art',
  },
} as const;

export async function buildLeeYunyeopMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_YUNYEOP_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이윤엽');
  const artwork = allArtworks.find((a) => isLeeYunyeopArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Yunyeop`
      : `${artwork.title} — 이윤엽`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_YUNYEOP_PATH, locale, true),
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

export default async function LeeYunyeopFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_YUNYEOP_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이윤엽');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeYunyeopArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Yunyeop' : '이윤엽', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_YUNYEOP_PATH}#person-lee-yunyeop`,
    name: isEnglish ? 'Lee Yunyeop' : '이윤엽',
    alternateName: isEnglish ? '이윤엽' : 'Lee Yunyeop',
    jobTitle: isEnglish ? 'Woodblock Artist' : '목판화가',
    description: isEnglish
      ? 'Lee Yunyeop is a Korean woodblock artist who carves farmers, workers, and humble everyday objects with bold lines over white space. Calling himself a “dispatch artist,” he has made prints alongside workers at strikes and demonstrations.'
      : '이윤엽은 농부와 노동자, 주변의 소박한 사물을 흰 여백 위 굵은 선으로 새기는 목판화가입니다. 스스로를 ‘파견미술가’라 부르며 파업·시위 현장에서 노동자들과 함께 판화를 제작해 왔습니다.',
    knowsAbout: ['Korean woodblock printmaking', 'Minjung art', 'Labour art'],
    award: isEnglish ? 'Gu Bon-ju Art Award (2012)' : '구본주 예술상 (2012)',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Yunyeop — SAF Online' : '이윤엽 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Yunyeop from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이윤엽 작품들을 소개합니다.',
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

          {/* 칼자국 모티프 — 흰 여백 위 굵은 선 */}
          <div className="absolute top-0 left-10 h-full w-[3px] bg-white/10 -rotate-2" />
          <div className="absolute top-0 left-20 h-full w-px bg-primary/30 rotate-1" />
          <div className="absolute top-0 right-14 h-full w-[3px] bg-white/10 rotate-2" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Yunyeop · Woodblock Artist' : '이윤엽 · 목판화가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A knife cuts wood,
                  <br />
                  <span className="text-primary-soft">a body carves labour</span>
                </>
              ) : (
                <>
                  칼이 나무를 깎고,
                  <br />
                  <span className="text-primary-soft">몸이 노동을 새긴다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Farmers, workers, the humble things close at hand.</span>
                  <span className="mt-2 block">
                    Bold lines over white space — rough, yet warm and familiar.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">농부와 노동자, 곁에 있는 소박한 사물들.</span>
                  <span className="mt-2 block">
                    흰 여백 위 굵은 선 — 투박하면서도 정겨운 목판화.
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
                    The knife of a dispatch artist —<br />
                    <span className="text-primary-strong">woodblocks of labour</span>
                  </>
                ) : (
                  <>
                    파견미술가의 칼 —<br />
                    <span className="text-primary-strong">노동의 목판</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Yunyeop is a Korean woodblock artist who depicts farmers, workers, and the
                      humble objects close at hand with wit and warmth. His prints are marked by
                      bold lines over white space — a roughness that reads, somehow, as affection.
                      It is the characteristic texture of the woodblock made visible.
                    </p>
                    <p>
                      For Lee, the woodblock is more than a picture-making technique. It is a medium
                      of carving wood and handling tools and moving the body — a way of{' '}
                      <strong className="font-bold text-charcoal-deep">understanding labour</strong>{' '}
                      from the inside. The act of cutting builds a shared recognition with people
                      who know what work is, and draws out an understanding of the value of labour
                      itself. He has even carved into the rubber matting used on factory floors,
                      working the surface with an engraving knife.
                    </p>
                    <p>
                      His first print, 〈Choi of Sandraemi〉 (1996), portrayed a neighbouring farmer
                      who lived near him at the time. From that first work onward, he took up the
                      woodblock in earnest as his primary medium.
                    </p>
                    <p>
                      Lee calls himself a{' '}
                      <strong className="font-bold text-charcoal">“dispatch artist”</strong>{' '}
                      (파견미술가) — making prints alongside workers at strikes and demonstrations.
                      It is the practice of an activist who carries the woodblock out of the studio
                      and into the places where labour is lived, cutting images together with the
                      people who are there.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이윤엽은 농부와 노동자, 곁에 있는 소박한 사물들을 재치 있게 표현하는
                      목판화가입니다. 흰 여백 위에 굵은 선으로 새긴 그의 작품은 투박하면서도 정겨운
                      목판화의 특징을 잘 보여줍니다. 거친 선이 도리어 애정으로 읽히는, 목판이라는
                      매체의 결이 그대로 드러나는 화면입니다.
                    </p>
                    <p>
                      이윤엽에게 목판화는 단순한 표현 기법을 넘어섭니다. 나무를 깎고 도구를 다루며
                      몸을 움직이는 매체로서, 목판화는{' '}
                      <strong className="font-bold text-charcoal-deep">노동을 이해하는</strong>{' '}
                      방법이기도 합니다. 깎는 행위는 노동을 아는 사람들과의 공감을 만들거나, 노동의
                      가치에 대한 이해를 이끌어냅니다. 그는 공장 바닥에 까는 고무판을 조각도로 깎아
                      작품을 새기기도 했습니다.
                    </p>
                    <p>
                      그의 첫 판화 작품인 〈산드래미 최씨〉(1996)는 당시 작가가 살던 곳 가까이에
                      살던 이웃 농민을 재현한 것입니다. 이 첫 작품 이후, 그는 본격적으로 판화를
                      매체로 삼기 시작했습니다.
                    </p>
                    <p>
                      이윤엽은 스스로를{' '}
                      <strong className="font-bold text-charcoal">‘파견미술가’</strong>라 부르며,
                      파업·시위 현장에서 노동자들과 함께 판화를 제작합니다. 작업실 밖, 노동이 살아
                      있는 자리로 목판을 들고 나가 그곳의 사람들과 함께 이미지를 새기는
                      액티비스트로서의 실천입니다.
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
                        {isEnglish ? 'Bold lines, white space' : '굵은 선, 흰 여백'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Farmers, workers, and humble objects rendered in bold lines over white space — rough yet warm, the texture of the woodblock made plain.'
                          : '농부·노동자·소박한 사물을 흰 여백 위 굵은 선으로. 투박하면서도 정겨운 목판화의 결을 그대로 보여줍니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Woodblock as labour' : '노동으로서의 목판'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Cutting wood, handling tools, moving the body — the woodblock as a way of understanding labour from the inside.'
                          : '나무를 깎고 도구를 다루며 몸을 움직이는 매체. 목판화는 노동을 안에서 이해하는 방법입니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The dispatch artist' : '파견미술가'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Carrying the woodblock out of the studio, he makes prints alongside workers at strikes and demonstrations.'
                          : '작업실 밖으로 목판을 들고 나가, 파업·시위 현장에서 노동자들과 함께 판화를 제작합니다.'}
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
                      1996
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First print 〈Choi of Sandraemi〉, depicting a neighbouring farmer; the woodblock becomes his primary medium.'
                        : '첫 판화 〈산드래미 최씨〉 — 이웃 농민을 재현. 이후 본격적으로 판화를 매체로 삼음.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Receives the Gu Bon-ju Art Award.' : '구본주 예술상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gwangju Biennale 20th Anniversary Special Exhibition, Gwangju Museum of Art.'
                        : '광주비엔날레 20주년 특별전, 광주시립미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Between Layer and Layer〉, MMCA Gwacheon.'
                        : '〈층과 층 사이〉, 과천 현대미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Square: Art and Society〉, National Museum of Modern and Contemporary Art (MMCA).'
                        : '〈광장: 미술과 사회〉, 국립현대미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Print, Print, Print〉, National Museum of Modern and Contemporary Art (MMCA).'
                        : '〈판화, 판화, 판화〉, 국립현대미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Even If It Takes a Little Time〉, Ecological Peace Art Museum Deokkum, Dongducheon.'
                        : '개인전 〈시간이 조금 걸리더라도〉, 동두천 생태평화 미술관 더꿈.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Cut Sentences, Open Square〉, Democratic Movement Memorial Hall.'
                        : '〈잘린문장 열린광장〉, 민주화운동기념관.'}
                    </span>
                  </li>
                </ol>
                <p className="mt-5 border-t border-charcoal/15 pt-4 text-sm text-charcoal-muted break-keep">
                  {isEnglish
                    ? 'Across sixteen solo exhibitions and numerous group shows.'
                    : '16회의 개인전과 다수의 그룹전을 이어 왔습니다.'}
                </p>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Awards, collections & books' : '수상·소장·저서'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award: Gu Bon-ju Art Award (2012)'
                        : '수상: 구본주 예술상 (2012)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: National Museum of Modern and Contemporary Art (MMCA); Gyeonggi Museum of Modern Art; Sakima Art Museum (Japan); Fukuoka Asian Art Museum (Japan), among others'
                        : '소장: 국립현대미술관, 경기도미술관, 일본 사키마 미술관, 후쿠오카 아시아미술관 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Books: 〈I Am a Farmer〉, 〈Even If It Takes a Little Time〉, among others'
                        : '저서: 『나는 농부란다』, 『시간이 조금 걸리더라도』 등'}
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
                  <span className="text-charcoal-deep">
                    on the knife, the field, and the street
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">칼과 들과 거리에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 첫 판화, 산드래미 최씨 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The first print — 〈Choi of Sandraemi〉'
                    : '첫 판화 — 〈산드래미 최씨〉'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Yunyeop&apos;s first print, 〈Choi of Sandraemi〉 (1996), did not begin
                        from a grand subject. It began from a neighbour — a farmer who lived close
                        by at the time. The face that emerged from the block was an ordinary one,
                        carved with the bold, unhurried lines that would become the artist&apos;s
                        signature.
                      </p>
                      <p>
                        That choice — to begin with a person within arm&apos;s reach rather than a
                        symbol — set the direction of everything that followed. From this first work
                        onward, Lee took up the woodblock in earnest as his primary medium. The
                        subjects would remain the same: farmers, workers, and the humble objects of
                        a working life, rendered with wit and an evident affection.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이윤엽의 첫 판화 〈산드래미 최씨〉(1996)는 거창한 주제에서 시작하지
                        않았습니다. 그것은 한 이웃에서 시작했습니다 — 당시 작가가 살던 곳 가까이에
                        살던 농민. 목판에서 떠오른 얼굴은 평범한 얼굴이었고, 훗날 작가의 서명이 될
                        굵고 느긋한 선으로 새겨졌습니다.
                      </p>
                      <p>
                        상징이 아니라 손이 닿는 거리의 사람에서 시작한다는 그 선택이, 이후의 모든
                        작업의 방향을 정했습니다. 이 첫 작품 이후 이윤엽은 본격적으로 판화를 매체로
                        삼았습니다. 주제는 한결같았습니다. 농부와 노동자, 그리고 일하는 삶의 소박한
                        사물들을, 재치와 분명한 애정으로 새기는 일.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 노동을 이해하는 매체로서의 목판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The woodblock as a way of understanding labour'
                    : '노동을 이해하는 매체로서의 목판'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For Lee Yunyeop, the woodblock is not only a way of making pictures. It is a
                        medium of cutting wood, handling tools, and moving the body — and in that
                        physicality lies its meaning. The labour of carving is, for him, a way of
                        understanding labour itself.
                      </p>
                      <p>
                        Because the making of the work is itself a kind of work, the act of cutting
                        builds a shared recognition with those who know what it is to work, and
                        draws out an understanding of the value of labour. The choice of materials
                        follows the same logic: he has carved into the rubber matting used on
                        factory floors, working an industrial surface with an engraving knife until
                        it yielded an image.
                      </p>
                      <p>
                        The result is a body of prints in which form and subject are made of the
                        same substance. The roughness of the bold line is not a style applied to the
                        labouring body from outside — it is the trace of a labouring hand, left in
                        the wood.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이윤엽에게 목판화는 그림을 만드는 방법만이 아닙니다. 나무를 깎고 도구를
                        다루며 몸을 움직이는 매체이며, 바로 그 물성에 의미가 있습니다. 새기는 노동은
                        그에게 노동 그 자체를 이해하는 방법입니다.
                      </p>
                      <p>
                        작품을 만드는 일 자체가 일종의 노동이기에, 깎는 행위는 노동을 아는
                        사람들과의 공감을 만들거나 노동의 가치에 대한 이해를 이끌어냅니다. 재료의
                        선택도 같은 논리를 따릅니다. 그는 공장 바닥에 까는 고무판을 조각도로 깎아,
                        산업 현장의 표면을 이미지가 될 때까지 새기기도 했습니다.
                      </p>
                      <p>
                        그 결과는 형식과 주제가 같은 물질로 이루어진 판화들입니다. 굵은 선의
                        투박함은 노동하는 몸에 바깥에서 입힌 양식이 아니라, 노동하는 손이 나무에
                        남긴 흔적입니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 파견미술가, 현장에서 새기는 판화 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The dispatch artist — prints made on site'
                    : '파견미술가 — 현장에서 새기는 판화'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Yunyeop calls himself a “dispatch artist” (파견미술가). The term
                        describes a practice rather than a position: carrying the woodblock out of
                        the studio and into strikes and demonstrations, and making prints there,
                        together with the workers who are present.
                      </p>
                      <p>
                        It is a way of working that places the artist alongside, rather than above,
                        the people the work is about. The image is not composed at a distance and
                        delivered afterward; it is cut on site, in the company of those whose labour
                        and circumstances it depicts. In this practice the woodblock returns to one
                        of its oldest functions — an art made to be shared, quickly and directly,
                        among many hands.
                      </p>
                      <p>
                        Across sixteen solo exhibitions and numerous group shows — and into the
                        collections of the MMCA, the Gyeonggi Museum of Modern Art, and Japan&apos;s
                        Sakima Art Museum and Fukuoka Asian Art Museum — Lee&apos;s work has carried
                        this same conviction: that an art of labour is best made in the places where
                        labour lives.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이윤엽은 스스로를 ‘파견미술가’라 부릅니다. 그 말은 지위가 아니라 실천을
                        가리킵니다. 작업실 밖, 파업과 시위의 현장으로 목판을 들고 나가, 그곳에 있는
                        노동자들과 함께 판화를 제작하는 일.
                      </p>
                      <p>
                        그것은 작품이 다루는 사람들 위가 아니라 곁에 작가를 놓는 작업 방식입니다.
                        이미지는 멀찍이서 구성되어 나중에 전달되지 않습니다. 그 노동과 처지를 담는
                        바로 그 사람들과 함께, 현장에서 새겨집니다. 이 실천 속에서 목판은 가장
                        오래된 기능 하나로 돌아갑니다 — 여러 손 사이에서 빠르고 직접적으로 나눠
                        가지도록 만들어진 미술.
                      </p>
                      <p>
                        16회의 개인전과 다수의 그룹전을 거치며, 또 국립현대미술관·경기도미술관과
                        일본 사키마 미술관·후쿠오카 아시아미술관의 소장으로 이어지며, 이윤엽의
                        작업은 같은 믿음을 품어 왔습니다. 노동의 미술은 노동이 살아 있는 자리에서
                        만들어질 때 가장 선명하다는 믿음입니다.
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
                      From the first neighbour&apos;s face cut into wood to the prints made on the
                      floors of strikes, Lee Yunyeop&apos;s practice has pursued a single idea: that
                      to carve is to understand labour, and to share. He joins this campaign not as
                      a subject of its cause but as a fellow artist in solidarity — so that those
                      who come after might work without the barriers others have borne.
                    </>
                  ) : (
                    <>
                      나무에 새긴 첫 이웃의 얼굴에서 파업 현장의 바닥에서 만든 판화까지, 이윤엽의
                      작업은 하나의 생각을 추구해 왔습니다. 새긴다는 것은 노동을 이해하는 일이자
                      나누는 일이라는 것. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                      예술인과의 연대자로서 함께합니다 — 다음 세대의 예술인들이 다른 이들이 짊어진
                      장벽 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Yunyeop</span>
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
                    Lee Yunyeop joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이윤엽 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_YUNYEOP_PATH}
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
