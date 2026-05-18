import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import MasterArtistGallery from '@/components/special/MasterArtistGallery';
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

const MIN_JOUNGKI_ARTIST_KEYS = new Set([
  '민정기',
  'min joung-ki',
  'min joungki',
  'min jung-ki',
  'minjungki',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isMinJoungkiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    MIN_JOUNGKI_ARTIST_KEYS.has(normalized) || compact === '민정기' || compact === 'minjoungki'
  );
};

const PAGE_COPY = {
  ko: {
    title: '민정기 특별전: Min Joung-ki Special Exhibition',
    description:
      '한국 현실주의 풍경화의 거장 민정기(1949–). 「현실과 발언」 창립 동인으로 민중미술 운동의 핵심에 섰던 작가가, 사라져가는 한국의 산하와 민중의 삶을 대형 화폭에 담아온 반세기의 여정을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '한국 현실주의 풍경화의 거장 민정기 특별전. 민중미술 운동의 핵심으로서 한국의 산하와 민중의 삶을 담아온 반세기의 여정.',
    ogAlt: '민정기 특별전 대표 이미지',
    twitterTitle: '민정기 특별전',
    twitterDescription: '한국 현실주의 풍경화의 거장 — 사라져가는 산하를 화폭에 새긴 민정기',
  },
  en: {
    title: 'Min Joung-ki Special Exhibition',
    description:
      'A special online exhibition featuring Min Joung-ki (b. 1949), a pivotal figure in Korean minjung art and master of realist landscape painting. Co-founder of the Reality and Utterance collective, Min has spent five decades recording a vanishing agrarian Korea on monumental canvases. View and collect selected works at SAF Online.',
    ogDescription:
      'Min Joung-ki Special Exhibition — master of Korean realist landscape painting and co-founder of Reality and Utterance. Five decades of monumental canvases at SAF Online.',
    ogAlt: 'Min Joung-ki Special Exhibition key visual',
    twitterTitle: 'Min Joung-ki Special Exhibition',
    twitterDescription:
      'Korean realist landscape master — five decades of recording a vanishing Korea',
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
  const pageUrl = buildLocaleUrl('/special/min-joungki', locale);

  const allArtworks = await getSupabaseArtworksByArtist('민정기');
  const artwork = allArtworks.find((a) => isMinJoungkiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Min Joung-ki Special Exhibition`
      : `${artwork.title} — 민정기 특별전`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Min Joung-ki artist, Korean landscape painting, minjung misul, Reality and Utterance, Korean realism'
        : '민정기 화가, 한국 풍경화, 민중미술, 현실과 발언, 한국 현실주의 회화, 온라인 특별전',
    alternates: createLocaleAlternates('/special/min-joungki', locale),
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

export default async function MinJoungkiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/special/min-joungki', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('민정기');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isMinJoungkiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('minJoungki'), url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    name: isEnglish ? 'Min Joung-ki' : '민정기',
    alternateName: isEnglish ? '민정기' : 'Min Joung-ki',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Min Joung-ki (b. 1949) is a leading Korean realist painter and co-founder of the Reality and Utterance collective (1979), known for monumental landscape paintings documenting a vanishing rural Korea.'
      : '민정기(1949-)는 한국 현실주의 회화의 대표 작가로, 1979년 「현실과 발언」을 창립하고 사라져가는 한국의 산하와 민중의 삶을 대형 화폭에 담아왔습니다.',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Min Joung-ki Special Exhibition' : '민정기 특별전',
    description: isEnglish
      ? 'A special online exhibition featuring selected works by Min Joung-ki from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 민정기 작품들을 선보이는 온라인 특별전입니다.',
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
                {isEnglish ? 'Min Joung-ki Special Exhibition' : '민정기 특별전'}
              </span>
              <div className="absolute inset-0 border-4 border-primary transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black">
              {isEnglish ? (
                <>
                  Painting the Korean Land
                  <br />
                  into Memory
                </>
              ) : (
                <>
                  한국의 산하를
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-primary">기억으로 새긴</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                  <br />
                  화가
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Five decades of monumental canvases.</span>
                  <span className="mt-2 block">
                    The Korean countryside, remembered before it vanishes.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">반세기의 대형 화폭.</span>
                  <span className="mt-2 block">사라지기 전에 기억하는 한국의 산하.</span>
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
          {/* 2018 판문점 하이라이트 */}
          <div className="mb-24 flex justify-center">
            <div className="relative p-8 sm:p-10 md:p-14 text-center max-w-4xl border-4 border-primary bg-white shadow-[8px_8px_0px_0px_rgba(33,118,255,0.12)]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-charcoal flex items-center justify-center rounded-full text-white font-bold text-xs leading-none tracking-tighter">
                2018
              </div>
              <p className="text-xl sm:text-2xl md:text-4xl text-charcoal leading-relaxed text-balance pt-4 font-display font-bold break-keep">
                {isEnglish ? (
                  <>
                    At the 2018 inter-Korean summit at Panmunjeom, Min Joung-ki&apos;s{' '}
                    <em className="not-italic text-primary-strong">
                      &ldquo;Panoramic View of Bugaksan&rdquo;
                    </em>{' '}
                    hung at the Peace House — seen by the entire world.
                  </>
                ) : (
                  <>
                    2018년 남북정상회담 판문점 평화의 집.
                    <br className="md:hidden" /> 민정기의{' '}
                    <em className="not-italic text-primary-strong">「북한산 전도」</em>가 배경에
                    걸렸고, 전 세계가 그 그림을 보았습니다.
                  </>
                )}
              </p>
              <footer className="mt-6 text-sm text-charcoal-muted">
                {isEnglish
                  ? 'Source: Nocutnews · Gyeongin Ilbo · National press, April 2018'
                  : '출처: 노컷뉴스·경인일보·국민일보 등 국내 언론, 2018년 4월'}
              </footer>
            </div>
          </div>

          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    From protest to panorama —<br />
                    <span className="text-primary-strong">the land as witness</span>
                  </>
                ) : (
                  <>
                    저항에서 파노라마로 —<br />
                    <span className="text-primary-strong">땅이 증언한다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Min Joung-ki (b. 1949) co-founded{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        Reality and Utterance
                      </strong>{' '}
                      (현실과 발언) alongside Oh Yoon and fellow artists in 1979 — a collective that
                      called for a Korean art rooted in social reality. Where Oh Yoon chose the
                      woodblock knife, Min chose the painter&apos;s brush trained on the land
                      itself.
                    </p>
                    <p>
                      His signature works are panoramic landscape paintings: monumental canvases
                      that stretch across entire walls and pull the viewer inside the hills,
                      paddies, and villages of a Korea in swift transformation. These are not
                      decorative views. They are{' '}
                      <strong className="font-bold text-charcoal">acts of memory</strong> — an
                      artist&apos;s refusal to let the agrarian life of ordinary Koreans be erased
                      without record.
                    </p>
                    <p>
                      For over four decades, Min has refined a realism that is at once sociological
                      and lyrical. The land in his paintings is alive with specific light, specific
                      season, specific labor — and it asks us to slow down, look, and remember who
                      built the country we stand in.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      민정기(1949-)는 1979년 오윤 등과 함께{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        「현실과 발언」
                      </strong>
                      을 창립하며 민중미술 운동의 핵심에 섰습니다. 오윤이 목판 칼을 들었다면,
                      민정기는 붓을 들어 이 땅 자체를 응시했습니다.
                    </p>
                    <p>
                      그의 대표작은 파노라마식 풍경화입니다. 벽 한 면을 채우는 대형 화폭 위에
                      펼쳐지는 한국의 산과 들, 농촌의 마을 — 이것은 단순한 경치가 아닙니다. 빠르게
                      사라져가는 농촌의 풍경을 붙잡아 두려는{' '}
                      <strong className="font-bold text-charcoal">기억의 행위</strong>이며, 그 땅
                      위에서 살아온 민중의 삶을 기록으로 남기겠다는 작가의 선언입니다.
                    </p>
                    <p>
                      반세기가 넘는 세월 동안 민정기는 사회학적이면서도 서정적인 리얼리즘을
                      다듬어왔습니다. 그의 그림 속 땅에는 특정한 빛, 특정한 계절, 특정한 노동이
                      살아있습니다. 그리고 그 땅은 우리에게 묻습니다: 이 나라를 만든 사람들을
                      기억하고 있느냐고.
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
                        {isEnglish ? 'Korean landscape' : '한국의 산하'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Panoramic canvases preserve the hills, paddies, and villages of a Korea in rapid transformation.'
                          : '사라져가는 한국의 농촌 풍경을 파노라마 화폭에 담아 시대의 증언으로 남겼습니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? "People's lives" : '민중의 삶'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The land is never empty — it carries the specific labor and memory of the people who worked it.'
                          : '땅 위에 뿌리내린 사람들의 이야기를 담담하고 진솔하게 기록했습니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Reality and memory' : '현실과 기억'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Rooted in direct observation, his work transforms seen places into collective memory that outlasts the places themselves.'
                          : '현실을 직시하면서도 집단적 기억의 풍경으로 재구성하는 작업을 반세기 넘게 지속했습니다.'}
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
                      1949
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Seoul (Seodaemun-gu).' : '서울 서대문구 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1972
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Seoul National University College of Fine Arts (Western Painting).'
                        : '서울대학교 미술대학 서양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1979
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Co-founds Reality and Utterance (현실과 발언) alongside Oh Yoon and others; inaugural group exhibition held October 1980.'
                        : '오윤 등과 「현실과 발언」 창립. 창립전은 1980년 10월 미술회관 개최.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1980s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins his landmark panoramic landscape series documenting rural Korea.'
                        : '한국 농촌 풍경을 주제로 한 파노라마 풍경화 연작 발표 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes graduate studies (Western Painting) at Seoul National University.'
                        : '서울대학교 대학원 회화과 수료.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Moves studio to Yangpyeong, Gyeonggi — deepens long-term engagement with natural landscape.'
                        : '경기도 양평으로 작업실 이전. 자연과의 장기적 밀착 작업 심화.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the 18th Lee Jung-seob Art Award.'
                        : '제18회 이중섭미술상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Continues working in Yangpyeong. Works held in the National Museum of Modern and Contemporary Art (MMCA) and major collections.'
                        : '양평에서 작업 지속. 국립현대미술관(MMCA) 등 주요 기관 소장.'}
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
                        ? 'Solo exhibition, Kumho Museum of Art (2016) — 27 paintings & 55 prints'
                        : '금호미술관 개인전 (2016) — 회화 27점·판화 55점'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Kukje Gallery (2019) — new and retrospective works'
                        : '국제갤러리 개인전 (2019) — 신작·구작 병합 전시'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Archive exhibition "Landscape I Cannot Let Go," Yangpyeong County Art Museum (2024)'
                        : '양평군립미술관 아카이브전 《놓치지 못하는 풍경》 (2024)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Permanent collection: National Museum of Modern and Contemporary Art, Korea (MMCA)'
                        : '국립현대미술관(MMCA) 소장'}
                    </span>
                  </li>
                </ul>
                <p className="mt-5 text-sm text-charcoal-muted border-t border-charcoal/15 pt-4 break-keep">
                  {isEnglish
                    ? 'Prints (woodblock, screenprint) offer a more accessible entry point alongside major paintings.'
                    : '판화(목판화·실크스크린) 작품은 대형 회화와 함께 비교적 접근 가능한 소장 경로입니다.'}
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
                {isEnglish ? 'Exhibition Works' : '전시 작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                ARCHIVE
              </div>
              <p className="text-base sm:text-lg text-white/70 font-medium">
                {isEnglish ? (
                  <>
                    <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>{' '}
                    works are currently on view.
                  </>
                ) : (
                  <>
                    총 <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>
                    점의 작품이 전시되어 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">Min Joung-ki</span>
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
                    Min Joung-ki joined this exhibition in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    민정기 작가는 동료 예술인을 위한 연대의 뜻으로 이 전시에 참여했습니다. 작품 판매
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
              <MasterArtistGallery artworks={ARTWORKS} returnTo="/special/min-joungki" />
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
