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

// 거장 작가 feature는 작가 페이지(/artworks/artist/민정기)에서 dispatch되어 렌더된다.
const MIN_JOUNGKI_PATH = `/artworks/artist/${encodeURIComponent('민정기')}`;

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
    title: '민정기 — 한국 현실주의 풍경화의 거장',
    description:
      '한국 현실주의 풍경화의 거장 민정기(1949–). 「현실과 발언」 결성 동인으로(1979) 민중미술 운동의 핵심에 섰던 작가가, 사라져가는 한국의 산하와 민중의 삶을 대형 화폭에 담아온 반세기의 여정을 씨앗페 온라인에서 만날 수 있습니다.',
    ogDescription:
      '한국 현실주의 풍경화의 거장 민정기. 민중미술 운동의 핵심으로서 한국의 산하와 민중의 삶을 담아온 반세기의 여정.',
    ogAlt: '민정기 대표 작품',
    twitterTitle: '민정기',
    twitterDescription: '한국 현실주의 풍경화의 거장 — 사라져가는 산하를 화폭에 새긴 민정기',
  },
  en: {
    title: 'Min Joung-ki — Korean Realist Landscape Painter',
    description:
      'Selected works by Min Joung-ki (b. 1949), a pivotal figure in Korean minjung art and master of realist landscape painting. Co-founder of the Reality and Utterance collective, Min has spent five decades recording a vanishing agrarian Korea on monumental canvases. View and collect selected works at SAF Online.',
    ogDescription:
      'Min Joung-ki — master of Korean realist landscape painting and co-founder of Reality and Utterance. Five decades of monumental canvases at SAF Online.',
    ogAlt: 'Min Joung-ki — featured work',
    twitterTitle: 'Min Joung-ki',
    twitterDescription:
      'Korean realist landscape master — five decades of recording a vanishing Korea',
  },
} as const;

export async function buildMinJoungkiMetadata({
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
  const pageUrl = buildLocaleUrl(MIN_JOUNGKI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('민정기');
  const artwork = allArtworks.find((a) => isMinJoungkiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Min Joung-ki`
      : `${artwork.title} — 민정기`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Min Joung-ki artist, Korean landscape painting, minjung misul, Reality and Utterance, Korean realism'
        : '민정기 화가, 한국 풍경화, 민중미술, 현실과 발언, 한국 현실주의 회화, 씨앗페 온라인',
    alternates: createLocaleAlternates(MIN_JOUNGKI_PATH, locale, true),
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

export default async function MinJoungkiFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(MIN_JOUNGKI_PATH, locale);
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
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Min Joung-ki' : '민정기', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${MIN_JOUNGKI_PATH}#person-min-joungki`,
    name: isEnglish ? 'Min Joung-ki' : '민정기',
    alternateName: isEnglish ? '민정기' : 'Min Joung-ki',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Min Joung-ki (b. 1949) is a leading Korean realist painter who co-founded the Reality and Utterance collective (formed 1979; inaugural exhibition 1980), known for monumental landscape paintings documenting a vanishing rural Korea.'
      : '민정기(1949-)는 한국 현실주의 회화의 대표 작가로, 1979년 「현실과 발언」 결성에 참여하고 1980년 창립전을 열며 사라져가는 한국의 산하와 민중의 삶을 대형 화폭에 담아왔습니다.',
    birthDate: '1949',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Seoul (Seodaemun-gu), South Korea' : '서울 서대문구',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Seoul National University College of Fine Arts' : '서울대학교 미술대학',
    },
    award: isEnglish ? '18th Lee Jung-seob Art Award (2006)' : '제18회 이중섭미술상 (2006)',
    workLocation: {
      '@type': 'Place',
      name: isEnglish ? 'Yangpyeong, Gyeonggi, South Korea' : '경기 양평',
    },
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Min Joung-ki — SAF Online' : '민정기 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Min Joung-ki from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 민정기 작품을 소개합니다.',
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
                {isEnglish ? 'Min Joung-ki · b. 1949' : '민정기 · 1949–'}
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
                    <span className="relative z-10 text-primary-soft">기억으로 새긴</span>
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
                      &ldquo;Panoramic View of Bukhansan&rdquo;
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
                {isEnglish ? (
                  <>
                    Sources:{' '}
                    <a
                      href="https://www.nocutnews.co.kr/news/5101349"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Nocutnews
                    </a>
                    {' · '}
                    <a
                      href="http://www.kyeongin.com/main/view.php?key=20180605010001536"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Gyeongin Ilbo
                    </a>
                    {' · '}
                    <a
                      href="https://www.kmib.co.kr/article/view.asp?arcid=0012320714"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Kookmin Ilbo
                    </a>
                    {', April 2018'}
                  </>
                ) : (
                  <>
                    출처:{' '}
                    <a
                      href="https://www.nocutnews.co.kr/news/5101349"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      노컷뉴스
                    </a>
                    {' · '}
                    <a
                      href="http://www.kyeongin.com/main/view.php?key=20180605010001536"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      경인일보
                    </a>
                    {' · '}
                    <a
                      href="https://www.kmib.co.kr/article/view.asp?arcid=0012320714"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      국민일보
                    </a>
                    {', 2018년 4월'}
                  </>
                )}
              </footer>
            </div>
          </div>

          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16 items-start">
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
                      (현실과 발언) alongside Oh Yoon and ten other artists and critics in late
                      1979. The collective&apos;s inaugural exhibition opened on 17 October 1980 at
                      the Munye Jinheungwon Art Hall (now Arko Art Center) in Seoul — and when venue
                      authorities cut the electricity on opening night, the artists lit candles and
                      exhibited anyway. That act of refusal became the founding symbol of a
                      generation.
                    </p>
                    <p>
                      Min&apos;s entry into the art world carried a deliberate provocation. In the
                      early 1980s he began producing what he called{' '}
                      <strong className="font-bold text-charcoal">
                        &ldquo;barber-shop paintings&rdquo;
                      </strong>{' '}
                      — oil paintings that meticulously reproduced the unsophisticated, kitschy
                      images typically found on the walls of ordinary Korean barbershops. Where the
                      official art world prized abstract formalism and pure aesthetics, Min turned
                      to mass-culture imagery as an act of anti-aesthetic critique, arguing that art
                      must speak the language of the street.
                    </p>
                    <p>
                      In the winter of 1987, Min moved his studio to{' '}
                      <strong className="font-bold text-charcoal">Yangpyeong</strong>, Gyeonggi
                      province, converting a cowshed into a working space and setting up home beside
                      it. That move proved decisive: direct encounter with the specific topography
                      of the Han River basin and the mountains beyond it pulled his work away from
                      urban social satire and toward the landscape itself — a turn that would define
                      the second half of his career.
                    </p>
                    <p>
                      From the 1990s, Min developed a practice rooted in{' '}
                      <strong className="font-bold text-charcoal">
                        actual-scene landscape painting
                      </strong>{' '}
                      (실경 산수). His approach fused the traditional Korean concept of{' '}
                      <em>jinggyeong</em> — painting from real, observed places — with a humanistic
                      reading of the land&apos;s history and geography. The result is not
                      topographic document but what he calls a space in which specific time and
                      place accumulate into painterly form.
                    </p>
                    <p>
                      His signature works are panoramic landscape paintings: monumental canvases
                      that stretch across entire walls and pull the viewer inside the hills,
                      paddies, and villages of a Korea in swift transformation. These are not
                      decorative views. They are{' '}
                      <strong className="font-bold text-charcoal">acts of memory</strong> — an
                      artist&apos;s refusal to let the agrarian life of ordinary Koreans be erased
                      without record. The land in his paintings is alive with specific light,
                      specific season, specific labor — and it asks us to slow down, look, and
                      remember who built the country we stand in.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      민정기(1949-)는 1979년 말 오윤 등 작가·평론가 동인들과 함께{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        「현실과 발언」
                      </strong>
                      을 결성했습니다. 창립전은 1980년 10월 17일 문예진흥원 미술회관(현
                      아르코미술관)에서 열렸습니다. 전시 개막일 밤, 전시관 측이 전기 스위치를
                      내려버리자 동인들은 촛불을 들고 전시를 이어갔습니다. 그 &apos;촛불전시&apos;는
                      한 세대의 저항을 상징하는 장면이 됐습니다.
                    </p>
                    <p>
                      민정기의 출발에는 의도적 도발이 있었습니다. 1980년대 초, 그는 스스로
                      &apos;이발소 그림&apos;이라 지칭하는 작업으로 화단의 주목을 받기 시작했습니다.
                      당시 이발소 벽에 걸려있던 세련되지 못한 키치적 그림들을 유화 물감으로
                      정성스럽게 재현한 이 작품들은, 국전이 주도하던{' '}
                      <strong className="font-bold text-charcoal">
                        순수미술·추상미술에 대한 반미학적 공격
                      </strong>
                      이었습니다. 미술이 심미적 엄숙주의에서 벗어나 대중의 일상 언어로 소통해야
                      한다는 철학적 선언이기도 했습니다.
                    </p>
                    <p>
                      1987년 겨울, 민정기는{' '}
                      <strong className="font-bold text-charcoal">경기도 양평</strong>의 한 우사를
                      개조해 작업실을 만들고 살림집을 차렸습니다. 이 이전은 결정적이었습니다. 한강
                      유역과 주변 산들과의 직접적 대면이 그의 작업을 도시적 사회 풍자에서 풍경 그
                      자체로 끌어당겼고, 이후 경력의 후반부를 정의하게 됩니다.
                    </p>
                    <p>
                      1990년대부터 민정기는{' '}
                      <strong className="font-bold text-charcoal">실경 산수</strong>에 뿌리를 둔
                      작업을 발전시켰습니다. 실제로 답사한 장소를 그리는 진경(眞景)의 전통을
                      이어받되, 땅의 역사와 지리를 인문학적으로 해석하는 방식을 더했습니다. 결과물은
                      지형 기록이 아닙니다 — 특정한 시간과 공간이 회화적으로 응축된 장소의
                      기억입니다.
                    </p>
                    <p>
                      그의 대표작은 파노라마식 풍경화입니다. 벽 한 면을 채우는 대형 화폭 위에
                      펼쳐지는 한국의 산과 들, 농촌의 마을 — 이것은 단순한 경치가 아닙니다. 빠르게
                      사라져가는 농촌의 풍경을 붙잡아 두려는{' '}
                      <strong className="font-bold text-charcoal">기억의 행위</strong>이며, 그 땅
                      위에서 살아온 민중의 삶을 기록으로 남기겠다는 작가의 선언입니다. 그의 그림 속
                      땅에는 특정한 빛, 특정한 계절, 특정한 노동이 살아있습니다.
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
                        ? 'Co-founds Reality and Utterance (현실과 발언) alongside Oh Yoon and others; inaugural group exhibition opens 17 October 1980 at Munye Jinheungwon Art Hall — with candles, after venue authorities cut the electricity.'
                        : "오윤 등과 「현실과 발언」 창립. 창립전은 1980년 10월 17일 문예진흥원 미술회관 개최 — 전기 차단에 맞서 촛불로 전시 강행('촛불전시')."}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1980s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '"Barber-shop paintings" draw attention: anti-aesthetic oil paintings reproducing kitschy mass-culture imagery as critique of official abstract formalism.'
                        : "'이발소 그림'으로 화단 주목 — 국전식 추상미술에 대한 반미학적 공격, 대중문화 이미지를 유화로 재현."}
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
                        ? 'Moves studio to Yangpyeong, Gyeonggi (winter 1987) — converts a cowshed into workspace; long-term immersion in actual landscape begins. Many artists subsequently established studios in the area.'
                        : '경기도 양평으로 작업실 이전(1987년 겨울). 우사를 개조해 작업장 마련. 이후 많은 미술인이 양평에 작업장을 차리는 토대가 됨.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1990s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Shifts to actual-scene landscape painting (실경 산수) — merging the jinggyeong tradition with humanistic reading of land history and geography.'
                        : '실경(實景) 산수 전환. 진경 전통을 이어받아 땅의 역사·지리를 인문학적으로 해석하는 풍경화 작업 심화.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Receives the{' '}
                          <a
                            href="https://www.ilyosisa.co.kr/news/articleView.html?idxno=113689"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            18th Lee Jung-seob Art Award
                          </a>
                          ; commemorative exhibition held at Chosun Ilbo Art Museum in 2007.
                        </>
                      ) : (
                        <>
                          <a
                            href="https://www.ilyosisa.co.kr/news/articleView.html?idxno=113689"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            제18회 이중섭미술상
                          </a>
                          {' 수상. 2007년 조선일보미술관에서 수상 기념전 개최.'}
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '「Panoramic View of Bukhansan」 (2007, MMCA collection) displayed at Peace House, Panmunjeom, during the inter-Korean summit — seen worldwide behind the two heads of state.'
                        : '「북한산 전도」(2007년 작, 국립현대미술관 소장)가 남북정상회담 판문점 평화의 집에 전시 — 두 정상 뒤 배경으로 전 세계에 방영.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Continues working in Yangpyeong. Works held in the{' '}
                          <a
                            href="https://www.mmca.go.kr/collections/collectionsList.do"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            National Museum of Modern and Contemporary Art (MMCA)
                          </a>
                          , Seoul Museum of Art, and other major institutions.
                        </>
                      ) : (
                        <>
                          양평에서 작업 지속.{' '}
                          <a
                            href="https://www.mmca.go.kr/collections/collectionsList.do"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            국립현대미술관(MMCA)
                          </a>
                          , 서울시립미술관 등 주요 기관에 소장.
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
                        ? 'Solo exhibition, Kumho Museum of Art (2016) — new and selected works including panoramic landscapes of Seoul waterways'
                        : '금호미술관 초대전 (2016) — 임진나루·홍지문 일대를 담은 파노라마 풍경화 신작 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Kukje Gallery (Jan–Mar 2019) — retrospective and new works spanning 40 years of landscape practice'
                        : '국제갤러리 개인전 《Min Joung-Ki》 (2019.1–3) — 구작과 신작을 아우른 40년 풍경 화업의 집약'}
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
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '18th Lee Jung-seob Art Award (2006); commemorative exhibition, Chosun Ilbo Art Museum (2007)'
                        : '제18회 이중섭미술상 수상 (2006); 조선일보미술관 수상 기념전 (2007)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Permanent collection:{' '}
                          <a
                            href="https://www.mmca.go.kr/collections/collectionsList.do"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            National Museum of Modern and Contemporary Art, Korea (MMCA)
                          </a>{' '}
                          — including 「Panoramic View of Bukhansan」 (2007); also Seoul Museum of
                          Art and other major institutions
                        </>
                      ) : (
                        <>
                          <a
                            href="https://www.mmca.go.kr/collections/collectionsList.do"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            국립현대미술관(MMCA)
                          </a>
                          {' 소장 — 「북한산 전도」(2007) 포함; 서울시립미술관 등 주요 기관 소장'}
                        </>
                      )}
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

          {/* Sub-essay Section — 박생광·신학철 패턴 차용 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its witness</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 증언에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 현실과 발언 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Reality and Utterance — the 1980s, when art had to speak'
                    : '현실과 발언 — 1980년대, 미술이 현실을 말해야 했을 때'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In late 1979, as Korea&apos;s political climate lurched from the
                        assassination of President Park Chung-hee into the military coup of December
                        12th, a group of young artists and critics gathered with a shared
                        conviction: Korean art had grown blind to the world outside its studios. The
                        collective they formed — twelve artists including Min Joung-ki, Oh Yoon, Im
                        Ok-sang, and Ju Jae-hwan, together with four critics — called themselves{' '}
                        <strong className="font-bold text-charcoal-deep">
                          Reality and Utterance
                        </strong>{' '}
                        (현실과 발언).
                      </p>
                      <p>
                        Their inaugural exhibition opened on 17 October 1980 at the Munye
                        Jinheungwon Art Hall in Seoul. On the opening night, the venue authorities —
                        deeming the works politically suspect — turned off all the electricity. The
                        artists lit candles and exhibited anyway. That{' '}
                        <em>candlelight exhibition</em> became one of the defining images of Korean
                        minjung art: a refusal, in near darkness, to let art be silenced.
                      </p>
                      <p>
                        Min&apos;s contribution to those early years was his so-called
                        &ldquo;barber-shop paintings&rdquo; — oil paintings that deliberately
                        reproduced the unsophisticated, kitschy images typically found on the walls
                        of ordinary Korean barbershops. The gesture was anti-aesthetic in the most
                        precise sense: an argument that the official art world&apos;s devotion to
                        abstract formalism was itself a form of cultural exclusion. If the art world
                        prized refinement, Min would bring the street inside. Art, he argued, should
                        communicate in the language ordinary people already knew.
                      </p>
                      <p>
                        Reality and Utterance remained active through the decade, producing a
                        succession of thematic exhibitions, and dissolved officially in 1990. But
                        its impact lasted far longer: it became the institutional seed of the
                        minjung art movement that reshaped Korean contemporary art through the
                        1980s, and its archives are now held by the Seoul Museum of Art.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1979년 말, 박정희 대통령 피살 이후 12·12 군사 쿠데타로 이어지는 격변의 정세
                        속에서, 젊은 작가·평론가들이 하나의 확신을 공유하며 모였습니다: 한국 미술이
                        작업실 밖 세상에 눈을 감고 있다는 것. 이들이 결성한 단체가{' '}
                        <strong className="font-bold text-charcoal-deep">「현실과 발언」</strong>
                        이었습니다. 민정기, 오윤, 임옥상, 주재환 등 작가 12명과 평론가 4명이 동인을
                        이뤘습니다.
                      </p>
                      <p>
                        창립전은 1980년 10월 17일 서울 문예진흥원 미술회관에서 개막했습니다. 개막일
                        밤, 전시관 측은 작품들이 불온하다는 이유로 전기 스위치를 모두
                        내려버렸습니다. 동인들은 촛불을 들고 전시를 이어갔습니다. 그
                        &apos;촛불전시&apos;는 한국 민중미술의 상징적 장면으로 남았습니다 — 어둠
                        속에서도 미술을 침묵시키지 않겠다는 거부.
                      </p>
                      <p>
                        민정기가 초기에 내놓은 것이 이른바 &apos;이발소 그림&apos;이었습니다. 당시
                        이발소 벽에 걸려있던 세련되지 못한 키치적 그림들을 유화 물감으로 정성스럽게
                        재현한 이 작업은 반미학적 선언이었습니다. 국전이 주도하던 추상·순수미술의
                        권위에 대한 공격이자, 미술이 대중의 일상 언어로 소통해야 한다는 철학적
                        주장이었습니다. 고급 미술이 세련됨을 숭배한다면, 민정기는 거리의 언어를
                        캔버스 안으로 끌어들이겠다고 했습니다.
                      </p>
                      <p>
                        「현실과 발언」은 이후로도 다양한 주제전을 이어가다 1990년 공식
                        해체됐습니다. 그러나 그 영향은 훨씬 오래 지속됐습니다 — 1980년대 한국
                        현대미술을 재형성한 민중미술 운동의 제도적 씨앗이 됐고, 아카이브는 현재
                        서울시립미술관이 소장합니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 2018 판문점 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '2018 Panmunjeom — 「Panoramic View of Bukhansan」 behind the heads of state'
                    : '2018년 판문점 — 정상의 등 뒤에 걸린 「북한산 전도」'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In April 2018, the historic inter-Korean summit between President Moon
                        Jae-in and Chairman Kim Jong-un was held at the Peace House in Panmunjeom.
                        The cameras of the world were fixed on the two men — and on the enormous
                        painting behind them. Min Joung-ki&apos;s{' '}
                        <strong className="font-bold text-charcoal-deep">
                          「Panoramic View of Bukhansan」
                        </strong>{' '}
                        (북한산 전도, 2007), held in the collection of the National Museum of Modern
                        and Contemporary Art (MMCA), had been selected to hang in the ceremonial
                        room.
                      </p>
                      <p>
                        The painting is a monumental work: over 500-ho in scale (264.5 × 452.5 cm),
                        completed over more than six months. Its approach departs from Western
                        single-point perspective — multiple viewpoints from different times are
                        fused into a single image, so that the mountain is seen simultaneously as it
                        appears from several vantage points and at several seasons. Kim Jong-un, it
                        was reported, asked how the technique was achieved. The mountain in the
                        painting is called Bukhansan — the great mountain that rises on Seoul&apos;s
                        northern edge — but it is also, seen from the north, the ridge that signals
                        the capital of the South. In that room, the painting became something it was
                        not painted to be: a landscape of division and the possibility of its
                        ending.
                      </p>
                      <p>
                        The episode crystallised what Min&apos;s landscape practice had long been
                        about: painting the land not as scenery but as territory — as political and
                        historical ground. A work made in Yangpyeong in 2007, from direct
                        observation of a mountain north of Seoul, traveled to Panmunjeom in 2018 and
                        became the backdrop for one of the most-watched diplomatic moments of the
                        decade. The land, in Min&apos;s hands, carries more weight than paint.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2018년 4월, 문재인 대통령과 김정은 위원장의 남북정상회담이 판문점 평화의
                        집에서 열렸습니다. 세계의 카메라가 두 정상을 향했고 — 그 뒤편의 거대한
                        그림도 함께 포착됐습니다. 국립현대미술관이 소장한 민정기의{' '}
                        <strong className="font-bold text-charcoal-deep">「북한산 전도」</strong>
                        (2007년 작)가 그 자리에 걸려있었습니다.
                      </p>
                      <p>
                        이 작품은 500호 이상의 대작(264.5×452.5cm)으로, 완성하는 데 6개월 이상이
                        걸렸습니다. 서구 풍경화가 시점을 하나로 고정하는 것과 달리, 민정기의 그림은
                        여러 시점과 시간에서 본 풍경을 한 화면에 겹쳐 놓습니다 — 하나의 산이 여러
                        방향과 계절에서 동시에 보입니다. 김정은 위원장이 &ldquo;무슨 기법으로
                        그렸냐&rdquo;며 호기심을 나타냈다고 전해집니다. 화면에 담긴 산은 북한산 —
                        서울의 북쪽 경계를 이루는 능선입니다. 북쪽에서 보면 남쪽 수도를 알리는
                        산이기도 합니다. 그 방에서 이 그림은 그리지 않았던 의미를 얻었습니다: 분단의
                        풍경이자 그 끝의 가능성.
                      </p>
                      <p>
                        이 에피소드는 민정기의 풍경화가 오랫동안 추구해온 바를 명확히 드러냅니다.
                        경치가 아니라 영토로서의 땅을 그리는 것 — 정치적이고 역사적인 지반으로서의
                        풍경. 양평에서 2007년에 완성된, 서울 북쪽 산을 직접 답사해 그린 작품이
                        2018년 판문점으로 가서 그 10년의 가장 주목받은 외교의 배경이 됐습니다.
                        민정기의 손에서 땅은 물감보다 무거운 것을 담습니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 양평 이후 — 진경산수로의 전환 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'After Yangpyeong — painting the land again from scratch'
                    : '양평 이후 — 땅을 다시 그리다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the winter of 1987, Min Joung-ki left Seoul. He had spent the early part
                        of his career in the urban social satire of the Reality and Utterance years:
                        barber-shop paintings, grotesque cityscapes, the language of mass-culture
                        kitsch deployed as critique. He moved to Yangpyeong and converted a cowshed
                        into a studio. He stayed.
                      </p>
                      <p>
                        What followed was a decade-long renegotiation with the landscape itself.
                        Yangpyeong sits in the upper Han River basin, ringed by mountains. Direct
                        encounter with that specific topography — walking the ridgelines, sketching
                        in the fields, observing the light change across seasons — pulled his
                        practice away from social allegory and toward actual-scene painting
                        (실경화). From the 1990s, his work drew on the Korean tradition of{' '}
                        <em>jinggyeong sansuhwa</em> — &ldquo;true-view landscape painting&rdquo; —
                        the practice of painting places as they actually exist rather than as
                        idealized or imaginary scenery.
                      </p>
                      <p>
                        But Min&apos;s approach departed from simple realism. His panoramic
                        compositions fuse multiple viewpoints and time-layers into a single image:
                        what appears on the canvas is not any single walk through a landscape but a
                        humanistic synthesis — the history of the place, the labor embedded in its
                        terrain, the slow accumulation of time that makes a mountain more than rock
                        and light. The land in his paintings is read, not merely seen.
                      </p>
                      <p>
                        The effect of his move extended beyond his own practice. Over the years,
                        more than three hundred artists established studios in the Yangpyeong area,
                        drawn in part by the precedent he had set. He had opened the cowshed and
                        stayed; they followed. In this respect too, Min Joung-ki embodies the spirit
                        of this campaign — not as a subject of hardship but as someone who made
                        conditions possible for those who came after.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1987년 겨울, 민정기는 서울을 떠났습니다. 「현실과 발언」 시절의 도시적 사회
                        풍자 — 이발소 그림, 괴물 같은 도시 풍경, 대중문화 키치를 비판의 언어로 쓰는
                        작업 — 를 뒤로하고 양평의 우사를 작업장으로 삼았습니다. 그리고 머물렀습니다.
                      </p>
                      <p>
                        그 이후 10년은 풍경 자체와의 긴 재협상이었습니다. 양평은 한강 상류 유역에
                        자리하고 산으로 둘러싸인 곳입니다. 그 구체적인 지형과의 직접적 대면 — 능선을
                        걷고, 들판에서 스케치하고, 계절마다 달라지는 빛을 관찰하는 것 — 이 그의
                        작업을 사회적 알레고리에서 실경화(實景畵)로 끌어당겼습니다. 1990년대부터
                        그는 한국의 진경산수화(眞景山水畵) 전통을 이어받았습니다 — 이상화된 가상의
                        경치가 아니라 실제로 존재하는 장소를 그리는 전통.
                      </p>
                      <p>
                        그러나 민정기의 접근은 단순한 사실주의가 아닙니다. 그의 파노라마 구성은 여러
                        시점과 시간 층위를 한 화면으로 융합합니다. 캔버스에 담긴 것은 한 번의 현장
                        답사가 아니라 인문학적 종합입니다 — 그 장소의 역사, 지형에 새겨진 노동, 산이
                        바위와 빛 이상의 것이 되게 하는 시간의 느린 축적. 그의 그림 속 땅은 보이는
                        것이 아니라 읽히는 것입니다.
                      </p>
                      <p>
                        그의 이전은 자신의 작업을 넘어서는 영향을 남겼습니다. 시간이 지나면서 많은
                        미술인이 양평에 작업장을 차렸습니다 — 그가 닦아놓은 토대 위에서. 우사를 열고
                        머물렀던 그가 그 길을 열었습니다. 이 점에서도 민정기는 이 캠페인의 정신을
                        체현합니다 — 어려움의 대상이 아니라, 다음 세대가 일할 조건을 만든
                        사람으로서.
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
                      From the candlelight exhibition of 1980 to the Peace House at Panmunjeom in
                      2018, Min Joung-ki&apos;s work has moved between the street and the mountain,
                      between protest and panorama — always asking the same question: what does this
                      land carry, and who has carried it? He joins this campaign not as a subject of
                      financial hardship but as a fellow artist in solidarity, so that those who
                      come after can do the work without the obstacles he had to clear.
                    </>
                  ) : (
                    <>
                      1980년 촛불전시에서 2018년 판문점 평화의 집까지, 민정기의 작업은 거리와 산
                      사이를, 저항과 파노라마 사이를 오가며 항상 같은 질문을 던져왔습니다: 이 땅은
                      무엇을 담고 있는가, 누가 그것을 감당해왔는가. 씨앗페에는 금융 어려움의
                      당사자가 아닌, 동료 예술인과의 연대자로 함께합니다 — 다음 세대의 예술인들이
                      그가 치워야 했던 장애물 없이 일할 수 있도록.
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
                    점의 작품을 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Min Joung-ki</span>
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
                    Min Joung-ki joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    민정기 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={MIN_JOUNGKI_PATH}
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
                        <span className="block">작품 정보를 정리 중입니다.</span>
                        <span className="mt-1 block">
                          전체 출품작 목록에서 다른 작품을 먼저 감상할 수 있습니다.
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
