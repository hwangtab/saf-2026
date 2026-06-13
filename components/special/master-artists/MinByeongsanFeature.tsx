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

// 거장 작가 feature는 작가 페이지(/artworks/artist/민병산)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const MIN_BYEONGSAN_PATH = `/artworks/artist/${encodeURIComponent('민병산')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isMinByeongsanArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '민병산' ||
    n === 'min byeong-san' ||
    n === 'min byeongsan' ||
    n === 'min byung-san' ||
    n === 'min byungsan' ||
    n.replace(/[\s-]+/g, '') === 'minbyeongsan' ||
    n.replace(/[\s-]+/g, '') === 'minbyungsan'
  );
};

const PAGE_COPY = {
  ko: {
    title: '민병산 — 거리의 철학자, 글씨로 남은 삶',
    description:
      '‘거리의 철학자’, ‘한국의 디오게네스’로 불린 문필가·서예가 민병산(1928–1990). 충북 청주에서 태어나, 세속을 초월한 자유분방한 삶과 독특한 ‘민병산체’ 서체, 산문집 『철학의 즐거움』으로 한 시대를 기렸다. 글씨와 글로 남은 그의 삶을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '민병산(1928–1990) — ‘거리의 철학자’로 불린 문필가·서예가. 세속을 초월한 삶과 ‘민병산체’ 글씨가 후대에 남긴 울림.',
    ogAlt: '민병산 대표 작품',
    twitterTitle: '민병산',
    twitterDescription: '거리의 철학자 — 글씨와 삶으로 남은 문필가 민병산',
    keywords:
      '민병산, 거리의 철학자, 한국의 디오게네스, 민병산체, 서예, 문필가, 철학의 즐거움, 충북 청주, 씨앗페 온라인',
  },
  en: {
    title: 'Min Byungsan — The Philosopher of the Street, a Life Left in Writing',
    description:
      'Min Byungsan (1928–1990), a writer and calligrapher remembered as the ‘philosopher of the street’ and ‘Korea’s Diogenes’. Born in Cheongju, North Chungcheong, he lived a free, worldly-detached life and left behind his distinctive ‘Min Byungsan style’ calligraphy and the essay collection 『The Joy of Philosophy』. Meet the life he left in writing at SAF Online.',
    ogDescription:
      'Min Byungsan (1928–1990) — a writer and calligrapher called the ‘philosopher of the street’. A worldly-detached life and a hand that still resonates.',
    ogAlt: 'Min Byungsan — featured work',
    twitterTitle: 'Min Byungsan',
    twitterDescription:
      'The philosopher of the street — a writer remembered in his hand and his life',
    keywords:
      'Min Byungsan, philosopher of the street, Korean Diogenes, calligraphy, writer, essayist, Cheongju, SAF Online',
  },
} as const;

export async function buildMinByeongsanMetadata({
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
  const pageUrl = buildLocaleUrl(MIN_BYEONGSAN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('민병산');
  const artwork = allArtworks.find((a) => isMinByeongsanArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Min Byungsan`
      : `${artwork.title} — 민병산`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(MIN_BYEONGSAN_PATH, locale, true),
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

export default async function MinByeongsanFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(MIN_BYEONGSAN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('민병산');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isMinByeongsanArtist(artwork.artist)
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
    { name: isEnglish ? 'Min Byungsan' : '민병산', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${MIN_BYEONGSAN_PATH}#person-min-byeongsan`,
    name: isEnglish ? 'Min Byungsan' : '민병산',
    alternateName: isEnglish ? '민병산' : 'Min Byungsan',
    jobTitle: isEnglish ? 'Calligrapher and writer' : '서예가·문필가',
    description: isEnglish
      ? 'Min Byungsan (1928–1990) was a writer and calligrapher remembered as the philosopher of the street and Korea’s Diogenes, known for his worldly-detached life, his distinctive Min Byungsan style of calligraphy, and the essay collection The Joy of Philosophy.'
      : '민병산(1928–1990)은 ‘거리의 철학자’, ‘한국의 디오게네스’로 불린 문필가·서예가로, 세속을 초월한 자유분방한 삶과 독특한 ‘민병산체’ 서체, 산문집 『철학의 즐거움』으로 알려졌습니다.',
    birthDate: '1928',
    deathDate: '1990',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Cheongju, North Chungcheong, South Korea' : '충북 청주',
    },
    knowsAbout: isEnglish
      ? ['Korean calligraphy', 'Essay writing', 'Philosophy']
      : ['서예', '문필', '철학'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Min Byungsan — SAF Online' : '민병산 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Min Byungsan from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 민병산 작품들을 소개합니다.',
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

          {/* Vertical strokes — 붓이 위에서 아래로 내려긋는 서예의 획 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-20 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-14 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Min Byungsan · 1928–1990' : '민병산 · 1928–1990'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The philosopher of the street,
                  <br />
                  <span className="text-primary-soft">a life left in writing</span>
                </>
              ) : (
                <>
                  거리의 철학자,
                  <br />
                  <span className="text-primary-soft">글씨로 남은 삶</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He owned little, sought no rank, and walked his own road.
                  </span>
                  <span className="mt-2 block">
                    What he left behind is a hand, an essay, and a way of being.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">가진 것 없이, 지위를 구하지 않고, 제 길을 걸었다.</span>
                  <span className="mt-2 block">
                    그가 남긴 것은 한 자루의 글씨, 한 권의 산문, 그리고 한 사람의 자세였다.
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
                    A worldly-detached life —<br />
                    <span className="text-primary-strong">written into the shape of letters</span>
                  </>
                ) : (
                  <>
                    세속을 초월한 삶 —<br />
                    <span className="text-primary-strong">글씨의 형상으로 새겨지다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Min Byungsan (1928–1990) was born in Cheongju, North Chungcheong province. A
                      writer and calligrapher by vocation, he became known in his own lifetime by a
                      pair of epithets that fit no ordinary biography:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        the philosopher of the street
                      </strong>{' '}
                      and Korea&apos;s Diogenes.
                    </p>
                    <p>
                      The names were not flattery but description. Like the Greek Cynic to whom he
                      was compared, he lived plainly and freely, holding himself apart from worldly
                      ambition, possession, and rank. He sought neither title nor wealth, and he
                      carried his learning lightly — as a way of living rather than a credential to
                      display.
                    </p>
                    <p>
                      From that life came a body of writing and a hand all his own. His prose was
                      gathered in the essay collection{' '}
                      <strong className="font-bold text-charcoal">『The Joy of Philosophy』</strong>
                      , where thought was offered not as doctrine but as pleasure, close to the
                      grain of everyday life. And his brush produced a script so distinctive that it
                      took his name:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        the Min Byungsan style (민병산체)
                      </strong>{' '}
                      — letters that carried the same unhurried, unadorned temper as the man who
                      drew them.
                    </p>
                    <p>
                      He belonged to the literary and artistic world that gathered in the streets
                      and teahouses of his time, a fixture among the writers around him. There his
                      calligraphy was sought after and passed from hand to hand, less as commodity
                      than as a token of friendship and regard.
                    </p>
                    <p>
                      Min Byungsan passed away in 1990. He left behind no monument other than the
                      thing he most cared for — the shape of his letters and the steadiness of his
                      sentences. In them remains the resonance of a life that proved one could live
                      simply, freely, and on one&apos;s own terms.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      민병산(閔炳山, 1928–1990)은 충북 청주에서 태어났다. 문필가이자 서예가였던 그는
                      평범한 약력에 담기지 않는 두 개의 별칭으로 당대에 불렸다 —{' '}
                      <strong className="font-bold text-charcoal-deep">‘거리의 철학자’</strong>,
                      그리고 ‘한국의 디오게네스’.
                    </p>
                    <p>
                      그 이름들은 치레가 아니라 묘사였다. 그가 견주어진 그리스의 견유(犬儒)처럼,
                      그는 소박하고 자유롭게 살았으며 세속의 야망과 소유와 지위로부터 자신을 떼어
                      놓았다. 벼슬도 재물도 구하지 않았고, 학식을 과시할 자격이 아니라 살아가는
                      방식으로 가볍게 지녔다.
                    </p>
                    <p>
                      그런 삶에서 한 묶음의 글과, 그만의 글씨가 나왔다. 그의 산문은 산문집{' '}
                      <strong className="font-bold text-charcoal">『철학의 즐거움』</strong>에
                      모였다. 거기서 사유는 교리가 아니라 즐거움으로, 일상의 결에 가까이 건네졌다.
                      그리고 그의 붓은 이름을 그대로 가져갈 만큼 독특한 글씨를 낳았으니 —{' '}
                      <strong className="font-bold text-charcoal-deep">‘민병산체’</strong>, 그것을
                      쓴 사람과 똑같이 서두르지 않고 꾸미지 않는 기질을 품은 글자였다.
                    </p>
                    <p>
                      그는 당대의 거리와 찻집에 모이던 문인·예술가의 세계에 속해 있었고, 그 곁의
                      문인들 사이의 한 풍경이었다. 그곳에서 그의 글씨는 상품이라기보다 우정과 존경의
                      표시로 청해지고 손에서 손으로 건네졌다.
                    </p>
                    <p>
                      민병산은 1990년에 작고했다. 그는 자신이 가장 아낀 것 — 글자의 형상과 문장의
                      단정함 — 외에 다른 기념비를 남기지 않았다. 그 안에는 소박하게, 자유롭게, 제
                      뜻대로 살 수 있음을 증명한 한 삶의 울림이 남아 있다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'What he is remembered for' : '그가 기려지는 것들'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The philosopher of the street' : '거리의 철학자'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Called Korea’s Diogenes — a free, worldly-detached life that sought neither rank nor possession, lived as a kind of thought in itself.'
                          : '‘한국의 디오게네스’로 불린 삶. 지위도 소유도 구하지 않은 자유로운 초월의 자세가, 그 자체로 하나의 사유였다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The Min Byungsan style' : '민병산체 — 그만의 글씨'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A calligraphic hand so distinctive it took his own name — unhurried, unadorned letters that carried the temper of the man who drew them.'
                          : '제 이름을 그대로 가져갈 만큼 독특한 서체. 서두르지 않고 꾸미지 않는 글자가 곧 그 사람의 기질이었다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? '『The Joy of Philosophy』' : '산문 — 『철학의 즐거움』'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Prose that offered thought not as doctrine but as pleasure, close to the grain of everyday life — gathered in his essay collection.'
                          : '사유를 교리가 아니라 즐거움으로, 일상의 결에 가까이 건넨 글. 그 산문이 산문집에 모였다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The writer's timeline" : '한 사람의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1928
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Cheongju, North Chungcheong province.'
                        : '충북 청주 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lives as a writer and calligrapher, becoming known as the philosopher of the street and Korea’s Diogenes.'
                        : '문필가·서예가로 살며 ‘거리의 철학자’, ‘한국의 디오게네스’로 불리다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Develops the distinctive Min Byungsan style of calligraphy; a fixture among the writers of his time.'
                        : '독특한 ‘민병산체’ 서체를 이루고, 당대 문인들 사이의 한 풍경이 되다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Gathers his prose in the essay collection 『The Joy of Philosophy』.'
                        : '산문을 산문집 『철학의 즐거움』에 모으다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Passes away, leaving his hand and his writing behind.'
                        : '글씨와 글을 남기고 작고하다.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Medium & milieu' : '매체와 무대'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: calligraphy and the written word — a hand and a body of prose, rather than canvas.'
                        : '매체: 서예와 문필 — 캔버스가 아니라 한 자루의 글씨와 한 묶음의 산문.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Milieu: the literary and artistic circles of his time, where his calligraphy passed from hand to hand among fellow writers.'
                        : '무대: 그의 글씨가 동료 문인들 사이에서 손에서 손으로 건네지던 당대 문인·예술의 세계.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Legacy: the Min Byungsan style and 『The Joy of Philosophy』 — the resonance of a freely lived life, carried forward by those who remember him.'
                        : '유산: ‘민병산체’와 『철학의 즐거움』 — 자유롭게 살아간 한 삶의 울림, 그를 기억하는 이들이 이어 가는 것.'}
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
                  <span className="text-charcoal-deep">on a life, a hand, and what remains</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">
                    한 삶과 한 글씨, 그리고 남는 것에 관하여
                  </span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 거리의 철학자 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The philosopher of the street — a life as thought'
                    : '거리의 철학자 — 삶으로서의 사유'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The epithets attached to Min Byungsan — the philosopher of the street,
                        Korea&apos;s Diogenes — describe a posture more than a profession. Diogenes,
                        the ancient Cynic, was remembered for owning almost nothing and answering to
                        no one, for treating worldly status as something beneath notice. To call a
                        modern Korean writer by his name was to say that he, too, had stepped
                        deliberately outside the ordinary calculus of ambition.
                      </p>
                      <p>
                        He sought no rank and accumulated no wealth. He lived plainly, freely, and
                        on his own terms, and he carried his considerable learning lightly. In him,
                        philosophy was not a subject professed from a podium but a way of being —
                        thought worn close to the skin, practiced in how a person walks through a
                        city and keeps company with others.
                      </p>
                      <p>
                        That is why the title fit. He did not lecture from a chair; he was simply
                        there, on the street, a thinking presence among the people of his time. The
                        philosophy was the life, and the life was lived in the open.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민병산에게 붙은 별칭 — ‘거리의 철학자’, ‘한국의 디오게네스’ — 는
                        직업이라기보다 하나의 자세를 가리킨다. 고대의 견유 디오게네스는 가진 것이
                        거의 없고 누구에게도 매이지 않았으며, 세속의 지위를 대수롭지 않게 여긴
                        사람으로 기억된다. 한 현대 한국 문인을 그 이름으로 부른다는 것은, 그 역시
                        야망의 통상적 셈법 바깥으로 의도적으로 걸어 나갔다는 뜻이었다.
                      </p>
                      <p>
                        그는 벼슬을 구하지 않았고 재물을 쌓지 않았다. 소박하게, 자유롭게, 제 뜻대로
                        살았으며, 적지 않은 학식을 가볍게 지녔다. 그에게 철학은 강단에서 표방되는
                        주제가 아니라 하나의 존재 방식이었다 — 살갗에 가까이 입은 사유, 한 사람이
                        도시를 걷고 사람들과 어울리는 방식 속에서 실천되는 것.
                      </p>
                      <p>
                        그래서 그 별칭이 들어맞았다. 그는 의자에 앉아 강의하지 않았다. 그저 거기,
                        거리에 있었다 — 당대 사람들 사이에 있던 사유하는 존재로. 철학이 곧 삶이었고,
                        삶은 열린 데서 살아졌다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 민병산체 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The Min Byungsan style — a hand that bears a name'
                    : '민병산체 — 이름을 가진 글씨'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        It is rare for a hand to become so recognisable that it is given the
                        writer&apos;s own name. Min Byungsan&apos;s calligraphy did exactly that:
                        the Min Byungsan style (민병산체). A script bears a name only when it has a
                        temper of its own, a character that cannot be mistaken for anyone
                        else&apos;s.
                      </p>
                      <p>
                        His letters carried the same quality as his life — unhurried, unadorned,
                        free of the wish to impress. Calligraphy is among the most honest of arts:
                        the brush records the breath and bearing of the one who holds it, and
                        nothing can be hidden in a single drawn line. In his characters one reads
                        the steadiness of a man who had no need to perform.
                      </p>
                      <p>
                        Among the writers and artists who gathered around him, his hand was sought
                        after and exchanged — passed along less as a purchased object than as a
                        token of regard between friends. To receive his calligraphy was to receive a
                        trace of the person himself.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        한 사람의 글씨가 그 사람의 이름을 그대로 가져갈 만큼 또렷해지는 일은 드물다.
                        민병산의 서예가 바로 그러했으니 — ‘민병산체’가 그것이다. 글씨가 이름을 갖는
                        것은, 그것이 누구의 것으로도 오인될 수 없는 제 기질과 성격을 지닐 때뿐이다.
                      </p>
                      <p>
                        그의 글자는 그의 삶과 같은 성질을 품었다 — 서두르지 않고, 꾸미지 않으며,
                        인상을 남기려는 욕심이 없는. 서예는 가장 정직한 예술에 든다. 붓은 그것을 쥔
                        이의 호흡과 자세를 기록하고, 단 하나의 그어진 획에는 아무것도 숨길 수 없다.
                        그의 글자에서는 굳이 연기할 필요가 없었던 한 사람의 단정함이 읽힌다.
                      </p>
                      <p>
                        그의 곁에 모이던 문인·예술가들 사이에서 그의 글씨는 청해지고 오갔다 — 사들인
                        물건이라기보다 벗들 사이의 존경의 표시로 건네졌다. 그의 글씨를 받는다는 것은
                        곧 그 사람 자신의 흔적을 받는 일이었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 남는 것 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'What remains — the resonance of a freely lived life'
                    : '남는 것 — 자유롭게 산 삶의 울림'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Min Byungsan passed away in 1990. He built no institution and amassed no
                        estate. What he left was the thing he had cared for most: the shape of his
                        letters and the steadiness of his sentences, gathered in 『The Joy of
                        Philosophy』 and held in the calligraphy that passed through many hands.
                      </p>
                      <p>
                        It is a quiet kind of legacy, and a durable one. A life lived simply and
                        freely makes an argument that outlasts its author — that one need not chase
                        rank or possession to live well, that thought can be a daily practice rather
                        than a profession, that a person can be remembered for how they were rather
                        than for what they accumulated.
                      </p>
                      <p>
                        Those who knew him kept his memory; those who came after met him through his
                        hand. In an age that measures worth by what is owned, the philosopher of the
                        street remains a counter-example written in ink — proof that a freely chosen
                        life leaves a resonance all its own.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민병산은 1990년에 작고했다. 그는 어떤 기관도 세우지 않았고 재산도 모으지
                        않았다. 그가 남긴 것은 그가 가장 아낀 것이었다 — 글자의 형상과 문장의
                        단정함. 그것은 『철학의 즐거움』에 모였고, 여러 손을 거쳐 간 글씨에 담겼다.
                      </p>
                      <p>
                        그것은 조용한, 그러나 오래가는 유산이다. 소박하고 자유롭게 살아간 한 삶은
                        그것을 산 사람보다 오래 남는 하나의 주장을 한다 — 잘 살기 위해 지위나 소유를
                        좇을 필요가 없다는 것, 사유가 직업이 아니라 일상의 실천일 수 있다는 것,
                        사람은 무엇을 쌓았는가가 아니라 어떻게 있었는가로 기억될 수 있다는 것.
                      </p>
                      <p>
                        그를 알던 이들은 그를 기억했고, 그 뒤에 온 이들은 그의 글씨를 통해 그를
                        만났다. 가진 것으로 값을 매기는 시대에, 거리의 철학자는 먹으로 쓰인 하나의
                        반례로 남는다 — 자유롭게 택한 삶이 그 나름의 울림을 남긴다는 증거로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda — 추모·계승 톤 (작고 작가) */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium">
                  {isEnglish ? (
                    <>
                      From the street to the page of 『The Joy of Philosophy』, Min Byungsan&apos;s
                      life pursued a single conviction: that one can live simply, freely, and on
                      one&apos;s own terms, and that such a life is itself a form of thought. Min
                      Byungsan passed away in 1990. His writing joins this campaign as the legacy he
                      left behind, and the free, unworldly spirit he kept all his life is carried
                      forward here as mutual aid among fellow and younger artists.
                    </>
                  ) : (
                    <>
                      거리에서 『철학의 즐거움』의 한 페이지까지, 민병산의 삶은 하나의 확신을
                      추구했다 — 소박하게, 자유롭게, 제 뜻대로 살 수 있으며, 그런 삶이 그 자체로
                      하나의 사유라는 확신. 민병산은 1990년 작고했다. 그의 글은 그가 남긴 유산으로서
                      씨앗페에 함께하며, 그가 평생 지켜 낸 자유롭고 초연한 정신은 이곳에서 동료·후배
                      예술인을 위한 상호부조의 뜻으로 이어진다.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Min Byungsan</span>
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
                    Min Byungsan passed away in 1990. His writing joins this campaign as the legacy
                    he left behind, and every work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — so
                    that the free, unworldly spirit he kept all his life continues as a lifeline for
                    an artist navigating financial exclusion today.
                  </>
                ) : (
                  <>
                    민병산 작가는 1990년 작고했습니다. 그의 글은 그가 남긴 유산으로서 씨앗페에
                    함께하며, 작품 판매 수익은 전액{' '}
                    <strong className="text-white">예술인 상호부조 대출 기금</strong>으로
                    이어집니다. 그가 평생 지켜 낸 자유롭고 초연한 정신이, 오늘 금융 차별을 겪는
                    예술인 한 사람의 다음 한 달로 이어집니다.
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
                returnTo={MIN_BYEONGSAN_PATH}
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
