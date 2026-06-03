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

// 거장 작가 feature는 작가 페이지(/artworks/artist/심현희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SIM_HYEONHUI_PATH = `/artworks/artist/${encodeURIComponent('심현희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSimHyeonhuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '심현희' ||
    n === 'sim hyeon-hui' ||
    n === 'sim hyeonhui' ||
    n.replace(/[\s-]+/g, '') === 'simhyeonhui'
  );
};

const PAGE_COPY = {
  ko: {
    title: '심현희 — 노인의 얼굴을 그리는 인물화가',
    description:
      '동양화·한국화에 뿌리를 둔 인물화가 심현희. 삶의 궤적이 응축된 노인의 얼굴을 200~300호 대작에 담고, 단일 선이 아니라 여러 겹의 선과 붓질을 중첩해 변화하는 인상의 흐름을 한 화면에 그린다. 이분법적 틀을 거부한 독자 노선과 재료의 경계를 넘은 실험. 심현희의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '심현희 — 노인의 얼굴을 200~300호 대작에 담는 인물화가. 겹쳐진 선과 붓질로 변화하는 인상을 한 화면에 응축한다.',
    ogAlt: '심현희 대표 작품',
    twitterTitle: '심현희',
    twitterDescription: '그려야 한다는 충동 — 노인의 얼굴을 그리는 인물화가 심현희',
    keywords: '심현희 화가, 인물화, 동양화, 한국화, 장지 농채, 노인 초상, 씨앗페 온라인',
  },
  en: {
    title: 'Sim Hyeonhui — A Portrait Painter of Old Faces',
    description:
      'Selected works by Sim Hyeonhui, a figure painter rooted in Korean ink and oriental painting. She renders the face of the elderly — a life condensed into a single visage — across 200–300-ho canvases, layering not a single line but many lines and brushstrokes to hold a shifting impression within one frame. An independent path that refused the binary frames of her time, and an experiment that crossed the boundaries of material. View and collect her works at SAF Online.',
    ogDescription:
      'Sim Hyeonhui — a figure painter who renders the faces of the elderly across 200–300-ho canvases, condensing shifting impressions through layered lines and brushstrokes.',
    ogAlt: 'Sim Hyeonhui — featured work',
    twitterTitle: 'Sim Hyeonhui',
    twitterDescription: 'The compulsion to paint — a portrait painter of old faces, Sim Hyeonhui',
    keywords:
      'Sim Hyeonhui artist, Korean figure painting, oriental painting, portrait, ink and color, SAF Online',
  },
} as const;

export async function buildSimHyeonhuiMetadata({
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
  const pageUrl = buildLocaleUrl(SIM_HYEONHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('심현희');
  const artwork = allArtworks.find((a) => isSimHyeonhuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Sim Hyeonhui`
      : `${artwork.title} — 심현희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SIM_HYEONHUI_PATH, locale, true),
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

export default async function SimHyeonhuiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SIM_HYEONHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('심현희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isSimHyeonhuiArtist(artwork.artist)
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
    { name: isEnglish ? 'Sim Hyeonhui' : '심현희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SIM_HYEONHUI_PATH}#person-sim-hyeonhui`,
    name: isEnglish ? 'Sim Hyeonhui' : '심현희',
    alternateName: isEnglish ? '심현희' : 'Sim Hyeonhui',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Sim Hyeonhui is a Korean figure painter rooted in oriental and ink painting, known for rendering the faces of the elderly across 200–300-ho canvases through layered lines and brushstrokes.'
      : '심현희는 동양화·한국화에 뿌리를 둔 인물화가로, 겹쳐진 선과 붓질로 노인의 얼굴을 200~300호 대작에 담아 왔습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Seoul National University, College of Fine Arts (Oriental Painting)'
        : '서울대학교 미술대학 (동양화)',
    },
    knowsAbout: isEnglish
      ? ['Korean figure painting', 'Oriental painting', 'Ink and color painting', 'Portraiture']
      : ['인물화', '동양화', '한국화', '장지 농채'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Sim Hyeonhui — SAF Online' : '심현희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Sim Hyeonhui from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 심현희 작품들을 소개합니다.',
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

          {/* Layered brushstroke lines — 겹쳐진 선·붓질 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-14 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Sim Hyeonhui · Figure painter' : '심현희 · 인물화가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The compulsion to paint
                  <br />
                  <span className="text-primary-soft">a face that holds a life</span>
                </>
              ) : (
                <>
                  그려야 한다는 충동
                  <br />
                  <span className="text-primary-soft">삶을 담은 얼굴</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">She paints the face of the elderly at 200–300 ho.</span>
                  <span className="mt-2 block">
                    Many layered lines and brushstrokes, a shifting impression held in one frame.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">200~300호 대작에 담은 노인의 얼굴.</span>
                  <span className="mt-2 block">
                    겹쳐진 선과 붓질이 변화하는 인상을 한 화면에 붙든다.
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
                    A face, layered —<br />
                    <span className="text-primary-strong">a life condensed into one visage</span>
                  </>
                ) : (
                  <>
                    겹쳐 그린 얼굴 —<br />
                    <span className="text-primary-strong">한 사람의 생이 응축된 한 얼굴</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Sim Hyeonhui studied painting at the College of Fine Arts of Seoul National
                      University and went on to complete her graduate studies there, majoring in
                      oriental painting — a training grounded in the orthodox discipline of ink and
                      figure. Yet from early on she set herself apart from the categories that
                      governed her generation.
                    </p>
                    <p>
                      In the late 1980s and through the 1990s, the Korean art world was largely
                      split between two poles: the grand narratives of minjung art on one side, and
                      the ink-centred orthodoxy of the established oriental-painting circle on the
                      other. Sim refused this binary. Rather than aligning with a genre boundary or
                      a rhetorical position, she fixed her attention on something simpler and more
                      stubborn —{' '}
                      <strong className="font-bold text-charcoal-deep">
                        the compulsion to paint
                      </strong>{' '}
                      itself.
                    </p>
                    <p>
                      Her enduring subject is the human figure, and above all the face of the
                      elderly — a face in which the trajectory of a life is condensed. She renders
                      these faces on a monumental scale, in canvases of 200 to 300 ho. The mark she
                      makes is not a single decisive line but many lines layered upon one another,
                      brushstroke over brushstroke, so that a shifting, changing impression is held
                      within a single frame. Around these figures she sets flowers, folk-painting
                      motifs, and the ordinary objects of daily life.
                    </p>
                    <p>
                      Her practice has moved across materials rather than settling into one: from
                      ink, to dense colour on jangji (Korean mulberry paper), and on to canvas and
                      acrylic. Her titles stay direct and plain — 〈A Child with Tied-up Hair〉,
                      〈Looking at Flowers〉 — naming the immediate, the urgent, the honest things
                      one meets in everyday life.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      심현희는 서울대학교 미술대학 회화과와 동 대학원에서 동양화를 전공하며 수묵과
                      인물의 정통 교육을 받았다. 그러나 그는 일찍부터 자기 세대를 지배하던
                      범주들에서 한 발 비켜서 있었다.
                    </p>
                    <p>
                      1980년대 후반에서 1990년대에 이르는 한국 화단은 크게 두 축으로 갈려 있었다 —
                      한쪽엔 민중미술의 거대 서사가, 다른 한쪽엔 기성 동양화단의 수묵 중심주의가.
                      심현희는 이 이분법을 거부했다. 장르의 경계나 수사적 입장에 줄을 서는 대신,
                      그는 더 단순하고 더 끈질긴 것에 시선을 두었다 —{' '}
                      <strong className="font-bold text-charcoal-deep">그려야 한다는 충동</strong>{' '}
                      그 자체에.
                    </p>
                    <p>
                      그의 변함없는 소재는 인물, 그중에서도 노인의 얼굴이다 — 삶의 궤적이 응축된
                      얼굴. 그는 이 얼굴들을 200호에서 300호에 이르는 대작에 담는다. 화면에 남기는
                      자국은 단호한 단일 선이 아니라 여러 겹으로 포개진 선과 붓질이어서, 변화하는
                      인상의 흐름이 한 화면 안에 붙들린다. 인물 곁에는 꽃과 민화적 도상, 일상의
                      기물을 병치한다.
                    </p>
                    <p>
                      그의 작업은 한 매체에 머물지 않고 재료의 경계를 넘나들었다 — 수묵에서 장지
                      농채로, 다시 캔버스·아크릴로. 제목은 직관적이고 간결하게 남는다 — 〈머리 묶은
                      애〉, 〈꽃을 보다〉 — 일상에서 마주하는 절실하고 솔직한 대상을 그대로 부른다.
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
                        {isEnglish ? 'The face of the elderly' : '노인의 얼굴'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A life condensed into a single visage, painted at 200–300 ho — the trajectory of a life made monumental.'
                          : '삶의 궤적이 응축된 한 얼굴을 200~300호 대작으로. 한 사람의 생을 기념비적 규모로 그린다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Layered lines and brushstrokes' : '겹쳐진 선과 붓질'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not a single line but many layered marks — a shifting impression held within one frame.'
                          : '단일 선이 아니라 여러 겹의 선과 붓질. 변화하는 인상의 흐름을 한 화면에 담는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'An independent path' : '이분법을 거부한 독자 노선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Refusing the binary of grand narrative and ink orthodoxy, and crossing the boundaries of material — from ink to dense colour on jangji to canvas and acrylic.'
                          : '거대 서사와 수묵 중심주의의 이분법을 거부하고 재료의 경계를 넘는다 — 수묵에서 장지 농채로, 다시 캔버스·아크릴로.'}
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
                      1982
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Encouragement Prize, JoongAng Fine Arts Grand Exhibition.'
                        : '중앙미술대전 장려상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Kumho Museum of Art; group show 《Young Korean Artists 90》, MMCA.'
                        : '금호미술관 개인전; 단체전 〈젊은 모색 90〉, 국립현대미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1991
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Songwon Gallery; group show 《Korean Painting — Today and Tomorrow》, Walker Hill Art Center.'
                        : '송원화랑 개인전; 단체전 〈한국화-오늘과 내일〉, 워커힐 미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1992
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Toh Art Space; group show 《Contemporary Korean Painting》, Hoam Gallery.'
                        : '토 아트 스페이스 개인전; 단체전 〈현대 한국 회화전〉, 호암 갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1994
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Solo exhibition, Seokyung Gallery.' : '서경 갤러리 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1996
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Solo exhibition, Kumho Museum of Art.' : '금호미술관 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1997
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows 《Portrait of Our Time — Father》, Sungkok Art Museum; Gwangju Biennale 《Margins of the Earth》.'
                        : '단체전 〈우리시대의 초상-아버지〉, 성곡미술관; 광주비엔날레 〈지구의 여백〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1999
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition, Dongsanbang Gallery; invited to 《JoongAng Fine Arts — Past Award Winners》, Hoam Gallery.'
                        : '동산방 화랑 개인전; 〈중앙미술대전 역대 수상작가 초대전〉, 호암 갤러리 초대.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Education & selected exhibitions' : '학력 및 주요 전시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul National University, College of Fine Arts (Painting) and its Graduate School, majoring in oriental painting'
                        : '서울대학교 미술대학 회화과 및 동 대학원 졸업 (동양화 전공)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: Kumho Museum of Art (1990, 1996), Songwon Gallery (1991), Toh Art Space (1992), Seokyung Gallery (1994), Dongsanbang Gallery (1999)'
                        : '개인전: 금호미술관(1990·1996), 송원화랑(1991), 토 아트 스페이스(1992), 서경 갤러리(1994), 동산방 화랑(1999)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 《Young Korean Artists 90》 (MMCA, 1990), 《Korean Painting — Today and Tomorrow》 (Walker Hill, 1991), 《Contemporary Korean Painting》 (Hoam Gallery, 1992), 《Portrait of Our Time — Father》 (Sungkok, 1997), Gwangju Biennale 《Margins of the Earth》 (1997)'
                        : '단체전: 〈젊은 모색 90〉(국립현대미술관, 1990), 〈한국화-오늘과 내일〉(워커힐 미술관, 1991), 〈현대 한국 회화전〉(호암 갤러리, 1992), 〈우리시대의 초상-아버지〉(성곡미술관, 1997), 광주비엔날레 〈지구의 여백〉(1997)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award: Encouragement Prize, JoongAng Fine Arts Grand Exhibition (1982)'
                        : '수상: 중앙미술대전 장려상 (1982)'}
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
                    on the face and the compulsion to paint
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">얼굴과 그려야 한다는 충동에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 이분법을 거부한 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Refusing the binary — an independent path'
                    : '이분법을 거부한 자리 — 독자 노선'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Sim Hyeonhui came of age as a painter in the late 1980s and 1990s,
                        Korean art seemed to offer two ready-made positions. On one side stood the
                        grand narratives of minjung art, oriented toward collective history. On the
                        other stood the established oriental-painting circle and its ink-centred
                        orthodoxy. To work was, in a sense, to choose a side.
                      </p>
                      <p>
                        Sim declined the choice. Trained in oriental painting at Seoul National
                        University — ink, brush, the disciplined study of the figure — she had the
                        credentials of the orthodoxy but not its allegiances. Nor did she take up
                        the rhetoric of the grand narrative. Instead she stayed with the concrete:
                        the face in front of her, the impulse to render it, the material best suited
                        to the task.
                      </p>
                      <p>
                        That refusal was not a withdrawal from her time but a different way of being
                        in it. By declining to be sorted into either camp, she kept her attention
                        free to follow the subject rather than the slogan — and the subject, again
                        and again, was a human face.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        심현희가 화가로서 자리를 잡던 1980년대 후반과 1990년대, 한국 미술은 마치 두
                        개의 기성 입장을 내미는 듯했다. 한쪽에는 집단의 역사를 향한 민중미술의 거대
                        서사가, 다른 한쪽에는 기성 동양화단과 그 수묵 중심주의가 있었다. 작업을
                        한다는 것은 어떤 의미에서 한쪽 편을 드는 일이었다.
                      </p>
                      <p>
                        심현희는 그 선택을 거절했다. 서울대학교에서 동양화를 전공하며 수묵과 붓,
                        인물에 대한 정통 수련을 받은 그는 정통의 자격은 갖췄으되 그 진영의 충성은
                        갖지 않았다. 거대 서사의 수사 또한 취하지 않았다. 대신 그는 구체적인 것에
                        머물렀다 — 눈앞의 얼굴, 그것을 그리려는 충동, 그 일에 가장 맞는 재료에.
                      </p>
                      <p>
                        그 거절은 시대로부터의 퇴장이 아니라 시대 안에 있는 다른 방식이었다. 어느
                        진영으로도 분류되기를 거부함으로써, 그는 구호가 아니라 대상을 따를 수 있도록
                        시선을 비워 두었다 — 그리고 그 대상은 거듭, 한 사람의 얼굴이었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 노인의 얼굴, 200~300호 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The face of the elderly, at 200–300 ho' : '노인의 얼굴, 200~300호'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The recurring subject of Sim&apos;s work is the human figure, and most often
                        the face of an old person. It is a face in which the trajectory of a life
                        has been condensed — the years gathered into expression, into the set of the
                        mouth and the weight of the eyes.
                      </p>
                      <p>
                        She paints these faces large: canvases of 200 to 300 ho, a monumental scale
                        that turns an ordinary face into something to be reckoned with. The making
                        is not a matter of a single confident line. She layers — line over line,
                        brushstroke over brushstroke — so that the face does not settle into one
                        fixed look but holds a shifting, changing impression within the single
                        frame. The accumulation is the point: a face is not one expression but many,
                        gathered.
                      </p>
                      <p>
                        Around the figure she sets flowers, folk-painting motifs, and the ordinary
                        objects of daily life — a quiet company of things that keep the face inside
                        the texture of the everyday rather than lifting it into allegory.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        심현희 작업에 거듭 나타나는 소재는 인물, 그중에서도 노인의 얼굴이다. 삶의
                        궤적이 응축된 얼굴 — 세월이 표정으로, 다문 입과 눈의 무게로 모여든 얼굴이다.
                      </p>
                      <p>
                        그는 이 얼굴들을 크게 그린다. 200호에서 300호에 이르는 대작, 평범한 한
                        얼굴을 마주 서야 할 무엇으로 바꾸는 기념비적 규모다. 그 만듦은 단호한 단일
                        선의 문제가 아니다. 그는 겹쳐 그린다 — 선 위에 선, 붓질 위에 붓질을 포개어 —
                        그래서 얼굴은 하나의 고정된 표정으로 가라앉지 않고, 변화하는 인상을 한 화면
                        안에 붙든다. 축적이 곧 핵심이다. 한 얼굴은 하나의 표정이 아니라 여럿이 모인
                        것이다.
                      </p>
                      <p>
                        인물 곁에 그는 꽃과 민화적 도상, 일상의 기물을 둔다 — 얼굴을 우의(寓意)로
                        들어 올리는 대신 일상의 결 안에 머물게 하는 조용한 사물들의 동행이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 재료의 경계를 넘어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Across the boundaries of material' : '재료의 경계를 넘어'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Sim&apos;s training was in ink, but her practice did not stay there. She
                        moved from ink to dense colour on jangji — Korean mulberry paper — and from
                        jangji on to canvas and acrylic. Each shift followed the work rather than a
                        programme: the material chosen for what a given face seemed to ask of it.
                      </p>
                      <p>
                        Her titles keep the same plainness. 〈A Child with Tied-up Hair〉, 〈Looking
                        at Flowers〉 — names that point directly at what is seen, without rhetorical
                        framing. The directness is of a piece with the rest of her work: an
                        attention fixed on the urgent and honest things one actually meets in daily
                        life, rather than on the categories art is supposed to arrange them into.
                      </p>
                      <p>
                        Taken together — the refusal of the binary, the monumental layered face, the
                        crossing of materials — her work follows a single, stubborn line of
                        attention. Sim Hyeonhui joins this campaign not as a subject of its cause
                        but as a fellow artist in solidarity, so that those who paint after her
                        might work with a little less of the weight that financial exclusion lays on
                        an artist&apos;s life.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        심현희의 수련은 수묵에서 출발했지만 그의 작업은 거기에 머물지 않았다. 그는
                        수묵에서 장지 농채로, 다시 캔버스·아크릴로 옮겨 갔다. 매번의 이동은 강령이
                        아니라 작업을 따른 것이었다 — 어떤 얼굴이 요청하는 듯한 바에 맞춰 재료를
                        고르는 식으로.
                      </p>
                      <p>
                        제목은 같은 간결함을 지킨다. 〈머리 묶은 애〉, 〈꽃을 보다〉 — 수사적 틀
                        없이 보이는 것을 곧장 가리키는 이름들이다. 그 직접성은 작업 전체와 한
                        결이다. 미술이 으레 정리해 넣으려는 범주가 아니라, 일상에서 실제로 마주하는
                        절실하고 솔직한 대상에 시선을 둔다.
                      </p>
                      <p>
                        이분법의 거절, 겹쳐 그린 기념비적 얼굴, 재료의 경계 넘기 — 이 모두를 한데
                        모으면, 그의 작업은 하나의 끈질긴 시선의 선을 따른다. 심현희는 씨앗페에 이
                        캠페인의 대상으로서가 아니라 동료 예술인과의 연대자로서 함께한다. 그의
                        뒤에서 그림을 그릴 이들이, 금융 차별이 예술인의 삶에 지우는 무게를
                        조금이라도 덜고 일할 수 있도록.
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
                      From the orthodox training of oriental painting to canvases that refuse to be
                      sorted, Sim Hyeonhui&apos;s work has pursued one plain question: what does it
                      take to hold a single human face — a whole life — within a single frame? The
                      answer, built across materials and decades, is a face layered until it lives.
                    </>
                  ) : (
                    <>
                      동양화의 정통 수련에서 분류되기를 거부하는 캔버스까지, 심현희의 작업은 하나의
                      소박한 물음을 추구해 왔다: 한 사람의 얼굴 — 한 생애 전체를 — 한 화면 안에
                      붙들려면 무엇이 필요한가. 재료와 세월을 가로질러 구축된 그 대답이, 살아날
                      때까지 겹쳐 그린 한 얼굴이다.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Sim Hyeonhui</span>
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
                    Sim Hyeonhui joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    심현희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SIM_HYEONHUI_PATH}
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
