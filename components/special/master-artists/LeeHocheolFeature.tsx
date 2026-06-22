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

// 이호철 feature는 작가 페이지(/artworks/artist/이호철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_HOCHEOL_PATH = `/artworks/artist/${encodeURIComponent('이호철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeHocheolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이호철' ||
    n === 'lee hocheol' ||
    n === 'lee ho-cheol' ||
    n.replace(/[\s-]+/g, '') === 'leehocheol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이호철 — 일상의 틈을 들여다보는 회화·판화 작가',
    description:
      '이호철(1958–). 반쯤 열린 서랍 너머로 하늘과 들판이 펼쳐지는 회화·판화 작가. 홍익대학교를 졸업하고 형상회화의 가능성을 꾸준히 탐구해온 작가로, 일상의 물건들 사이로 현실 밖의 세계가 불쑥 끼어드는 독특한 화면을 만들어왔다. 씨앗페 온라인에서 이호철의 작품을 감상하고 소장하세요.',
    ogDescription:
      '이호철 — 일상의 틈을 들여다보는 회화·판화 작가. 반쯤 열린 서랍 속에 하늘과 들판이 펼쳐지는 형상회화. 25여 회 개인전, 150여 회 단체전의 성실한 작가.',
    ogAlt: '이호철 대표 작품',
    twitterTitle: '이호철',
    twitterDescription: '일상의 틈, 그 사이로 보이는 것 — 회화·판화 작가 이호철',
    keywords: '이호철 화가, 이호철 판화, 서랍 회화, 형상회화, 달항아리, 일상 미술, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Hocheol — Painter and Printmaker of the Gaps in Everyday Life',
    description:
      'Selected works by Lee Hocheol (b. 1958), a painter and printmaker who looks into the gaps of everyday life. A graduate of Hongik University, he has steadily explored the possibilities of figurative painting for decades — building a body of work in which ordinary objects open onto distant skies and endless fields. View and collect his works at SAF Online.',
    ogDescription:
      'Lee Hocheol — painter and printmaker who looks into the gaps of everyday life. Within half-open drawers, skies and fields unfold. Approximately twenty-five solo exhibitions, over 150 group exhibitions.',
    ogAlt: 'Lee Hocheol — featured work',
    twitterTitle: 'Lee Hocheol',
    twitterDescription:
      'The gaps of the everyday, and what shows through them — painter and printmaker Lee Hocheol',
    keywords:
      'Lee Hocheol artist, Korean painter printmaker, drawer paintings, figurative painting, moon jar, everyday life art',
  },
} as const;

export async function buildLeeHocheolMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_HOCHEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이호철');
  const artwork = allArtworks.find((a) => isLeeHocheolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Hocheol`
      : `${artwork.title} — 이호철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_HOCHEOL_PATH, locale, true),
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

export default async function LeeHocheolFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_HOCHEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이호철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeHocheolArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Hocheol' : '이호철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_HOCHEOL_PATH}#person-lee-hocheol`,
    name: isEnglish ? 'Lee Hocheol' : '이호철',
    alternateName: isEnglish ? '이호철' : 'Lee Hocheol',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Lee Hocheol (b. 1958) is a Korean painter and printmaker who explores the gaps of everyday life. A graduate of Hongik University, he has built a distinctive practice in figurative painting in which ordinary objects open onto distant skies and unexpected worlds.'
      : '이호철(1958–)은 일상의 틈을 들여다보는 한국의 회화·판화 작가입니다. 홍익대학교를 졸업하고 형상회화의 가능성을 꾸준히 탐구해온 작가로, 일상의 물건들 속에서 현실 밖의 세계를 열어 보이는 독자적인 화면을 구축해왔습니다.',
    birthDate: '1958',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Seoul, South Korea' : '서울',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University' : '홍익대학교',
    },
    knowsAbout: ['Painting', 'Printmaking', 'Korean contemporary art', 'Figurative painting'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Hocheol — SAF Online' : '이호철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Hocheol from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 이호철 작품을 소개합니다.',
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
        {/* Hero Section — 고요한 일상, 그 틈새 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Horizontal shelf lines — 서랍의 층위 모티프 */}
          <div className="absolute top-0 left-0 w-full h-px bg-white/10" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-white/8" />
          <div className="absolute top-2/3 left-0 w-full h-px bg-white/6" />
          <div className="absolute top-0 left-8 h-full w-px bg-white/8" />
          <div className="absolute top-0 right-8 h-full w-px bg-white/8" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Hocheol · 1958–' : '이호철 · 1958–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The gaps of the everyday,
                  <br />
                  <span className="text-primary-soft">and what shows through them</span>
                </>
              ) : (
                <>
                  일상의 틈,
                  <br />
                  <span className="text-primary-soft">그 사이로 보이는 것</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A drawer opens halfway — and beyond it, a sky stretches endlessly.
                  </span>
                  <span className="mt-2 block">
                    Painter and printmaker who finds another world inside the ordinary.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">서랍이 반쯤 열린다 — 그 너머로 하늘이 펼쳐진다.</span>
                  <span className="mt-2 block">
                    일상의 물건 속에서 다른 세계를 찾아내는 회화·판화 작가.
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
                    Looking in —<br />
                    <span className="text-primary-strong">
                      a world that opens from inside the ordinary
                    </span>
                  </>
                ) : (
                  <>
                    들여다보다 —<br />
                    <span className="text-primary-strong">일상 속에서 열리는 세계</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Hocheol was born in Seoul in 1958 and graduated from Hongik
                      University&apos;s Department of Western Painting. Without grand
                      pronouncements, he has steadily refined his own visual language across decades
                      — devoting himself to exploring the possibilities of figurative painting while
                      remaining faithfully present in both solo and group exhibitions.
                    </p>
                    <p>
                      He first came to wider attention in 1978, when he received an Encouragement
                      Award at the inaugural JoongAng Fine Arts Prize Exhibition — an early signal
                      of what would become a long and consistent career. He went on to receive
                      recognition at the Monte Carlo Art Grand Prize Exhibition in 1990.
                    </p>
                    <p>
                      His first solo exhibition was held at Kumho Museum of Art in 1990. In the
                      decades since, he has presented approximately{' '}
                      <strong className="font-bold text-charcoal-deep">
                        twenty-five solo exhibitions
                      </strong>{' '}
                      at major Korean galleries including Noh Gallery, Pyo Gallery, Arario, and Sun
                      Gallery, and participated in{' '}
                      <strong className="font-bold text-charcoal">
                        over 150 group exhibitions
                      </strong>{' '}
                      domestically and internationally — including the International Impact Art
                      Festival in Kyoto and the 8th JAALA Exhibition in Tokyo.
                    </p>
                    <p>
                      At the centre of his work are the objects of daily life: dining tables,
                      glasses, chairs, drawers, neckties, clocks, bags, coffee cups, gloves, hats,
                      ballpoint pens. Art critic Seo Seong-rok has written that looking at his
                      paintings feels like reading a diary. The objects rest quietly in their proper
                      places, like a room whose owner has briefly stepped away, a stillness as
                      though time had stopped like a broken clock.
                    </p>
                    <p>
                      Yet this quietude is not simply that of conventional still life. As one looks
                      more closely, strange details begin to emerge: within a half-open drawer, a
                      distant sky unfolds, endless railroad tracks appear, a hazy field comes into
                      view. Hats and gloves drift freely in midair. Objects far larger than the
                      drawers themselves are somehow contained within them. A world beyond reality
                      suddenly intrudes into the everyday — and the viewer gains the freedom to
                      dream.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이호철은 1958년 서울에서 태어났다. 홍익대학교 서양화과를 졸업하고, 요란한 선언
                      없이 자신만의 회화적 언어를 일관되게 갈고 닦아온 작가다. 외부의 유행이나
                      사조에 휩쓸리기보다 형상회화의 가능성을 끈질기게 탐구하면서, 개인전과 단체전
                      모두에서 성실하게 현장을 지켜왔다.
                    </p>
                    <p>
                      1978년 제1회 중앙미술대전에서 장려상을 수상하며 화단에 처음 이름을 알렸다 —
                      길고 일관된 작업 이력의 첫 신호였다. 이후 1990년 몬테카를로 미술대상전에서
                      수상하며 작가로서의 입지를 다졌다.
                    </p>
                    <p>
                      첫 개인전은 1990년 금호미술관에서 열렸다. 그 이후 노화랑, 표갤러리, 아라리오,
                      선화랑 등 국내 주요 갤러리에서 총{' '}
                      <strong className="font-bold text-charcoal-deep">25여 회의 개인전</strong>을
                      가졌으며, 교토 국제 Impact Art Festival, 도쿄 제8회 JAALA 등 국내외{' '}
                      <strong className="font-bold text-charcoal">150여 회의 단체전</strong>에
                      참여했다.
                    </p>
                    <p>
                      그의 작업 중심에는 일상의 물건들이 있다: 식탁, 안경, 의자, 서랍, 넥타이, 시계,
                      가방, 커피잔, 장갑, 모자, 볼펜. 미술평론가 서성록은 이호철의 그림을 들여다보면
                      한 편의 일기를 읽는 느낌이 든다고 말한다. 물건들은 주인이 잠시 자리를 비운
                      방처럼 고요하게 제자리에 놓여 있고, 고장 난 시계처럼 시간이 멈춘 듯한 정적이
                      화면 전체를 감싼다.
                    </p>
                    <p>
                      그러나 이 고요함은 단순한 정물화의 것이 아니다. 반쯤 열린 서랍 안으로 아득한
                      하늘이 펼쳐지고, 끝없이 이어지는 철로가 보이며, 아스라한 들판이 나타난다.
                      장갑과 모자가 허공을 떠다니고, 서랍보다 훨씬 큰 물건이 그 안에 담겨 있다.
                      일상의 물건들 사이로 현실 밖의 세계가 불쑥 끼어드는 것이다 — 그리고 보는 이는
                      꿈꿀 수 있는 자유를 얻는다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* 들쳐보기 — 핵심 언어 카드 */}
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Three signatures of the work' : '작업을 관통하는 세 가지 언어'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Peeking in (들쳐보기)' : '들쳐보기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The greatest charm: a closed drawer opens, and an entirely different world unfolds beyond the gap. The drawers are never fully open — and this refusal to reveal everything stimulates the imagination all the more powerfully.'
                          : '닫힌 서랍이 열리고, 열린 틈 너머로 전혀 다른 세계가 펼쳐지는 순간. 서랍은 항상 완전히 열려 있지 않다 — 다 보여주지 않는 것이 오히려 보는 이의 상상력을 더 강하게 자극한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Breaking the frame' : '틀 깨기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In his paintings, the frame is already painted within the picture — making an external frame unnecessary. He has also experimented with shaped canvases, breaking down the boundary between inside and outside the painting itself.'
                          : '그의 그림에는 이미 틀이 그려져 있어 별도의 액자가 필요 없다. 변형 캔버스를 도입해 그림 안과 밖의 경계를 허물기도 했다. 가상의 화면 속 자유를 실제 공간으로 끌어내겠다는 의지의 표현이다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Moon jar and white porcelain' : '달항아리와 백자'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "In his white porcelain works — including moon jars (달항아리) — he delicately depicts the marks left by the potter's wheel and the traces of white clay, creating a painterly texture in which brushstrokes feel almost abstract."
                          : '달항아리를 비롯한 백자 소재 작품에서는 물레 자국과 백토의 흔적을 섬세하게 묘사해, 붓질이 추상화처럼 느껴지는 독특한 회화적 질감을 만들어낸다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가의 시간 — timeline */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1958
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Seoul.' : '서울 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Department of Western Painting.'
                        : '홍익대학교 서양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1978
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Encouragement Award, inaugural JoongAng Fine Arts Prize Exhibition (제1회 중앙미술대전).'
                        : '제1회 중앙미술대전 장려상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition, Kumho Museum of Art (금호미술관), Seoul. Monte Carlo Art Grand Prize Exhibition.'
                        : '첫 개인전, 금호미술관. 몬테카를로 미술대상전 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'International exhibitions: International Impact Art Festival (Kyoto), 8th JAALA (Tokyo), 50 Years of Korean Contemporary Painting (Seoul Gallery).'
                        : '국제전 참여: 교토 국제 Impact Art Festival, 도쿄 제8회 JAALA, 서울갤러리 한국현대회화 50년 조망전 등.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      ongoing
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Approximately 25 solo exhibitions at Noh Gallery, Pyo Gallery, Arario, Sun Gallery and others; over 150 group exhibitions in Korea and abroad.'
                        : '노화랑, 표갤러리, 아라리오, 선화랑 등에서 총 25여 회 개인전; 국내외 150여 회 이상의 단체전 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* 주요 소장처 */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected collections' : '주요 소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul Museum of Art, Busan Museum of Art, Daejeon Museum of Art, Gwangju Museum of Art, Jeonnam Museum of Art, Yangju City Museum of Art'
                        : '서울시립미술관, 부산시립미술관, 대전시립미술관, 광주시립미술관, 전남도립미술관, 양주시립미술관'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Samsung Group, Asiana Airlines, Arario Group, Hanjin Group, Kumho Group, Daewoo Group and numerous other domestic corporate collections'
                        : '삼성그룹, 아시아나항공, 아라리오그룹, 한진그룹, 금호그룹, 대우그룹 외 다수 국내 기업 소장'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Judicial Research and Training Institute, Severance Hospital, Asan Medical Center, Samsung Medical Center'
                        : '사법연수원, 세브란스병원, 아산병원, 삼성병원'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'International collections: Embassy of Mexico, Poland, Hong Kong, Dubai, Nigeria, Spain, Belgium, Monaco, Türkiye, Greece, South Africa and others'
                        : '해외 소장: 멕시코 대사관, 폴란드, 홍콩, 두바이, 나이지리아, 스페인, 벨기에, 모나코, 튀르키예, 그리스, 남아프리카공화국 외 다수'}
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
                  <span className="text-charcoal-deep">on the work and its world</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 세계에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 일상의 틈 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The gaps of everyday life — looking into the ordinary'
                    : '일상의 틈 — 평범한 것 속을 들여다보다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The objects in Lee Hocheol&apos;s paintings are unremarkable: a dining
                        table, an armchair, a clock, a pair of glasses, a drawer, a coffee cup. They
                        are the furniture of a life lived quietly — a room between moments, a pause
                        in the day. Art critic Seo Seong-rok has described the experience of looking
                        at his work as reading a diary: the feeling of encountering private time
                        made visible.
                      </p>
                      <p>
                        Yet the paintings are not diaries of the merely ordinary. The closer one
                        looks, the more the image shifts. A half-open drawer reveals not the
                        interior of a chest of drawers but a distant sky. Railroad tracks run into
                        the distance where the back of a drawer should be. A field appears, hazy and
                        endless. The ordinary contains the inexhaustible — and the viewer finds
                        themselves standing at a threshold between the familiar and the unknown.
                      </p>
                      <p>
                        The tension between these two registers — the rational and the irrational,
                        the conscious and the unconscious, the whole and the unexpected — is the
                        generating condition of his paintings. This is not surrealism in a
                        historical sense, but something quieter: a systematic attention to the
                        cracks that exist in any life, and to what might be glimpsed through them.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이호철의 그림에 등장하는 물건들은 특별하지 않다: 식탁, 안락의자, 시계, 안경,
                        서랍, 커피잔. 조용히 살아온 삶의 가구들 — 어느 순간과 순간 사이의 방, 하루
                        중의 잠깐. 미술평론가 서성록은 그의 그림을 들여다보는 경험을 일기를 읽는
                        것에 비유했다: 사적인 시간이 눈앞에 펼쳐지는 느낌이라고.
                      </p>
                      <p>
                        그러나 이 그림들은 단지 평범한 것의 일기가 아니다. 가만히 들여다볼수록
                        이미지가 흔들린다. 반쯤 열린 서랍 안으로 서랍장의 내부가 아닌 아득한 하늘이
                        보인다. 철로가 서랍 안쪽 벽이 있어야 할 자리로 뻗어 나간다. 아스라한 들판이
                        나타난다. 평범한 것이 무진장한 것을 담고 있고 — 보는 이는 어느새 익숙한 것과
                        알 수 없는 것의 경계에 서 있다.
                      </p>
                      <p>
                        이 두 세계 사이의 긴장 — 합리적인 것과 비합리적인 것, 의식과 무의식, 온전한
                        것과 돌발적인 것 — 이 그의 그림을 만들어내는 조건이다. 역사적 의미의
                        초현실주의가 아니라, 더 조용한 어떤 것: 어떤 삶에도 존재하는 틈에 대한
                        체계적인 주의, 그리고 그 틈 사이로 언뜻 보이는 것에 대한 주의.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 회화와 판화 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Between painting and printmaking — a sustained practice'
                    : '회화와 판화 사이 — 지속의 방식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Hocheol&apos;s practice spans both painting and printmaking — two
                        mediums that share certain structural concerns: the question of the
                        image&apos;s boundary, the relation between surface and what lies beneath,
                        the repeatability of a form. The drawer, the frame, and the shaped canvas
                        are all preoccupations that resonate differently across medium.
                      </p>
                      <p>
                        In his paintings, the frame is already incorporated into the image itself:
                        the work contains its own boundary, making an external frame unnecessary.
                        This self-framing is an act of pictorial self-sufficiency, but also a form
                        of questioning — at what point does a picture become a world? He has
                        extended this question further by moving beyond the conventional rectangular
                        canvas, working with shaped formats that break the boundary between picture
                        plane and actual space.
                      </p>
                      <p>
                        In the white porcelain works — including his paintings of moon jars — he
                        describes the marks of the potter&apos;s wheel and the traces of white clay
                        with such delicacy that the brushstrokes begin to feel abstract. The
                        representational subject becomes a site of painterly sensation: this is
                        figurative painting that does not stay still within its own conventions.
                        Across four decades of sustained output, the practice has remained committed
                        to this single inquiry — the possible worlds available inside the ordinary.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이호철의 작업은 회화와 판화 두 매체에 걸쳐 있다 — 이미지의 경계, 표면과 그
                        아래에 있는 것의 관계, 형태의 반복 가능성이라는 구조적 관심을 공유하는 두
                        매체. 서랍, 틀, 변형 캔버스는 매체에 따라 다르게 울리는 집착들이다.
                      </p>
                      <p>
                        그의 회화에서 액자는 이미 그림 속에 그려져 있다 — 작품이 자신의 경계를 담고
                        있어 외부 액자가 필요 없다. 이 자기 프레이밍은 그림적 자족의 행위이기도
                        하지만, 동시에 하나의 물음이기도 하다 — 그림은 어느 지점에서 하나의 세계가
                        되는가. 그는 이 물음을 더 밀어붙여 네모꼴의 관습적 캔버스를 넘어 변형
                        캔버스를 도입했다. 그림 면과 실제 공간의 경계를 허무는 형태들이다.
                      </p>
                      <p>
                        달항아리를 비롯한 백자 소재 작품에서는 물레 자국과 백토의 흔적을 섬세하게
                        묘사해, 붓질이 추상화처럼 느껴지는 독특한 회화적 질감을 만들어낸다. 형상적
                        주제가 회화적 감각의 장소가 된다 — 자신의 관습 안에 머물지 않는 형상회화다.
                        40여 년의 지속적인 작업 이력을 관통하는 탐구는 하나다 — 평범한 것 속에 있는
                        가능한 세계들.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 성실한 현장 — 작가적 태도 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Faithfully present — an artist who stayed in the field'
                    : '성실한 현장 — 자리를 지킨 작가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        What is perhaps most striking about Lee Hocheol&apos;s career is not any
                        single prize or exhibition, but the weight of his continued presence. In a
                        field that rewards novelty and visibility, he has been distinguished by
                        consistency: approximately twenty-five solo exhibitions across major Korean
                        galleries, participation in over three hundred group and curated exhibitions
                        in Korea and internationally, and a collecting history that spans public
                        museums, hospitals, hotels, embassies, and corporate collections across five
                        continents.
                      </p>
                      <p>
                        He first made his name known in 1978, with an encouragement award at the
                        inaugural JoongAng Fine Arts Prize Exhibition — a moment of early
                        recognition that he followed with decades of quiet, steady building. The
                        prizes came, including recognition at Monte Carlo in 1990. But the more
                        telling measure is the unbroken record of showing work, the refusal to step
                        away from the field.
                      </p>
                      <p>
                        He joins SAF not as a subject of its cause but as a fellow artist in
                        solidarity — so that those who come after might work without the financial
                        barriers he has navigated, and so that the field he has faithfully occupied
                        for nearly five decades might remain open to the next generation.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이호철의 작업 이력에서 가장 눈에 띄는 것은 어느 하나의 수상이나 전시가
                        아니라, 지속적 현장의 무게다. 새로움과 가시성이 보상받는 세계에서, 그는
                        일관성으로 두드러진다: 국내 주요 갤러리에서 25여 회의 개인전, 국내외 150여
                        회의 단체전·기획전 참여, 공공미술관·병원·호텔·대사관·기업 컬렉션을 아우르는
                        5대륙의 소장 이력.
                      </p>
                      <p>
                        1978년 제1회 중앙미술대전 장려상으로 처음 이름을 알린 이후, 수십 년의
                        조용하고 꾸준한 축적이 이어졌다. 1990년 몬테카를로 미술대상전 수상 등 평가가
                        이어졌지만, 더 중요한 척도는 작품을 선보이는 일이 끊이지 않았다는 것,
                        현장에서 물러나지 않았다는 것이다.
                      </p>
                      <p>
                        씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 —
                        다음 세대의 예술인들이 그가 헤쳐온 금융 장벽 없이 일할 수 있도록, 그리고
                        그가 거의 50년에 걸쳐 성실하게 지킨 현장이 다음 세대에게도 열려 있을 수
                        있도록.
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
                      The half-open drawer is Lee Hocheol&apos;s signature, but it is also a
                      proposition: that the ordinary always contains more than it shows, that a
                      crack in the everyday is an opening toward something else. Across painting and
                      printmaking, across four decades and hundreds of exhibitions, this is the
                      single question he has continued to ask — and the asking has not grown old.
                    </>
                  ) : (
                    <>
                      반쯤 열린 서랍은 이호철의 서명이자, 하나의 명제다: 평범한 것은 언제나 보여주는
                      것보다 더 많은 것을 담고 있고, 일상의 틈은 다른 어딘가로 향하는 열림이라는 것.
                      회화와 판화를 넘나들며, 40여 년과 수백 회의 전시를 거쳐, 그가 계속 던져온 것은
                      이 하나의 물음이다 — 그리고 물음은 낡지 않았다.
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
                GALLERY
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Hocheol</span>
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
                    Lee Hocheol joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이호철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_HOCHEOL_PATH}
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
