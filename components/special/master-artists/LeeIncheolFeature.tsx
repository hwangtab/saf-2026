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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이인철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_INCHEOL_PATH = `/artworks/artist/${encodeURIComponent('이인철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeIncheolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이인철' ||
    n === 'lee in-cheol' ||
    n === 'lee incheol' ||
    n.replace(/[\s-]+/g, '') === 'leeincheol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이인철 — 일상을 기록하는 붓',
    description:
      '한국 민중미술의 흐름 속에서 일상과 사회 현실을 회화로 기록해 온 이인철(1955–). 「우리들의 일상」 연작에서 「Good days!」, 「지구 표류기」까지, 평범한 하루의 단면을 묵직하게 그려 온 중견 화가. 평화·민주 의제와 함께해 온 이인철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '일상과 사회 현실을 회화로 기록하는 화가 이인철. 「우리들의 일상」에서 「지구 표류기」까지, 평범한 하루의 단면을 담아낸 민중미술의 한 흐름.',
    ogAlt: '이인철 대표 작품',
    twitterTitle: '이인철',
    twitterDescription: '일상을 기록하는 붓 — 사회 현실을 그려 온 화가 이인철',
    keywords:
      '이인철 화가, 우리들의 일상, 민중미술, 일상 회화, Good days, 지구 표류기, 씨앗페 온라인',
  },
  en: {
    title: 'Lee In-cheol — A Brush That Records the Everyday',
    description:
      'Selected works by Lee In-cheol (b. 1955), a painter who has recorded daily life and social reality within the current of Korean minjung art. From the 〈Our Everyday〉 series through 〈Good days!〉 to 〈Drifting the Earth〉, he renders cross-sections of ordinary days with quiet weight. View and collect his works at SAF Online.',
    ogDescription:
      'Lee In-cheol — a painter who records daily life and social reality. From 〈Our Everyday〉 to 〈Drifting the Earth〉, cross-sections of an ordinary day.',
    ogAlt: 'Lee In-cheol — featured work',
    twitterTitle: 'Lee In-cheol',
    twitterDescription:
      'A brush that records the everyday — painter of daily life and social reality',
    keywords:
      'Lee In-cheol artist, Our Everyday, minjung misul, everyday painting, Korean realist painting',
  },
} as const;

export async function buildLeeIncheolMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_INCHEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이인철');
  const artwork = allArtworks.find((a) => isLeeIncheolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee In-cheol`
      : `${artwork.title} — 이인철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_INCHEOL_PATH, locale, true),
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

export default async function LeeIncheolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_INCHEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이인철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeIncheolArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee In-cheol' : '이인철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_INCHEOL_PATH}#person-lee-incheol`,
    name: isEnglish ? 'Lee In-cheol' : '이인철',
    alternateName: isEnglish ? '이인철' : 'Lee In-cheol',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Lee In-cheol (b. 1955) is a Korean painter who has recorded daily life and social reality in painting within the current of Korean minjung art.'
      : '이인철(1955–)은 한국 민중미술의 흐름 속에서 일상과 사회 현실을 회화로 기록해 온 화가입니다.',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Busan, South Korea' : '부산',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'National Fisheries University of Busan, Dept. of Food Engineering'
        : '부산수산대학 식품공학과',
    },
    knowsAbout: ['Painting', 'Korean minjung art', 'Everyday life'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee In-cheol — SAF Online' : '이인철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee In-cheol from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이인철 작품들을 소개합니다.',
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

          {/* Vertical strata lines — 일상의 결 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee In-cheol · b. 1955' : '이인철 · 1955–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Our everyday,
                  <br />
                  <span className="text-primary-soft">recorded in paint</span>
                </>
              ) : (
                <>
                  우리들의 일상 —
                  <br />
                  <span className="text-primary-soft">사회 현실을 기록하는 붓</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">He paints the cross-sections of an ordinary day.</span>
                  <span className="mt-2 block">
                    From 〈Our Everyday〉 to 〈Drifting the Earth〉, daily life and social reality.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">평범한 하루의 단면을 화폭에 담다.</span>
                  <span className="mt-2 block">
                    「우리들의 일상」에서 「지구 표류기」까지, 일상과 사회 현실.
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
                    The everyday, recorded —<br />
                    <span className="text-primary-strong">a painter of daily life</span>
                  </>
                ) : (
                  <>
                    기록된 일상 —<br />
                    <span className="text-primary-strong">하루의 단면을 그리는 화가</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee In-cheol (b. 1955) was born in Busan and graduated from the National
                      Fisheries University of Busan, Department of Food Engineering, in 1983. He
                      works within the current of Korean minjung art, recording daily life and
                      social reality in painting rather than retreating into pure form.
                    </p>
                    <p>
                      His practice took shape through the &ldquo;Our Everyday&rdquo; exhibitions of
                      the late 1980s and early 1990s. In 1989 he held{' '}
                      <strong className="font-bold text-charcoal-deep">〈Our Everyday — I〉</strong>{' '}
                      at Geurim Madang Min in Seoul and Ondara Museum of Art in Jeonju; in 1992,
                      〈Our Everyday — II〉 travelled across Geurim Madang Min, Ondara, and Gallery
                      Nouveau in Busan. The work fixed its gaze on the ordinary hours that make up a
                      life and the social conditions woven through them.
                    </p>
                    <p>
                      In the mid-2000s the register shifted toward a steadier light. The{' '}
                      <strong className="font-bold text-charcoal">〈Good days!〉</strong>{' '}
                      exhibitions — Deokwon Gallery in Seoul (2005) and Busan Democracy Park (2006)
                      — held the everyday up not as a backdrop to argument but as something worth
                      looking at on its own terms. 〈Old story〉 (Bak Jin-hwa Art Museum, Incheon,
                      2010) and 〈In the paradise〉 (Namu Art Gallery, Seoul, 2018) continued that
                      patient attention.
                    </p>
                    <p>
                      The recent solo exhibitions widen the frame outward. 〈Drifting the Earth〉
                      (Busan Democracy Park, 2021) and 〈On the street〉 (Namu Art Gallery, 2023)
                      carry the everyday into shared, public space, and in 2025 〈Holoism (From the
                      Invisible to the Visible)〉 was shown at Artverse in Paris — the ordinary
                      moment placed before an international audience.
                    </p>
                    <p>
                      Across roughly 150 group exhibitions, his work has appeared alongside themes
                      of peace and democracy: 〈Flipping the Plate〉 at the Gyeonggi Museum of Art
                      (2025), the media-art special exhibition REGENERATION marking the 45th
                      anniversary of the May 18 Democratization Movement (Alternative Art Space
                      Ipo), the Peace Culture Festival (Dongducheon Flag of Peace exhibition), and
                      the Chronicle of Light exhibition at the Democracy Movement Memorial Hall. He
                      keeps painting the everyday, and lets it stand as a record of its time.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이인철(1955–)은 부산에서 태어나 1983년 부산수산대학 식품공학과를 졸업했다.
                      그는 한국 민중미술의 흐름 속에서, 순수한 형식으로 물러나는 대신 일상과 사회
                      현실을 회화로 기록하는 자리에 섰다.
                    </p>
                    <p>
                      그의 작업은 1980년대 말과 1990년대 초의 「우리들의 일상」 연작을 통해 윤곽을
                      잡았다. 1989년 그는{' '}
                      <strong className="font-bold text-charcoal-deep">「우리들의 일상-I」</strong>
                      을 서울 그림마당 민과 전주 온다라미술관에서 열었고, 1992년 「우리들의
                      일상-II」 는 그림마당 민·온다라미술관·부산 갤러리 누보로 이어졌다. 작업은 한
                      사람의 삶을 이루는 평범한 시간과 그 안에 얽힌 사회적 조건에 시선을 두었다.
                    </p>
                    <p>
                      2000년대 중반, 화면의 결은 한층 차분한 빛으로 옮겨갔다.{' '}
                      <strong className="font-bold text-charcoal">「Good days!」</strong> 연작 —
                      서울 덕원갤러리(2005)와 부산민주공원(2006) — 은 일상을 어떤 주장의 배경이
                      아니라 그 자체로 바라볼 만한 것으로 떠올렸다. 「Old story」(인천 박진화
                      미술관, 2010)와 「In the paradise」(서울 나무아트 갤러리, 2018)가 그 차분한
                      응시를 이어갔다.
                    </p>
                    <p>
                      최근의 개인전은 화면의 테두리를 바깥으로 넓힌다. 「지구 표류기」(부산
                      민주공원, 2021)와 「거리에서」(나무아트 갤러리, 2023)는 일상을 공유된 공공의
                      공간으로 데리고 나오며, 2025년에는 「홀로이즘(From the Invisible to the
                      Visible)」이 파리 Artverse에서 소개됐다 — 평범한 한 순간을 국제 관객 앞에 놓은
                      셈이다.
                    </p>
                    <p>
                      약 150회에 이르는 단체전에서 그의 작업은 평화·민주의 의제와 나란히 놓여 왔다:
                      경기도미술관 「판을 뒤집다」(2025), 5.18 민중항쟁 45주년 미디어 아트 특별전
                      REGENERATION(대안예술공간 이포), 평화 문화제(동두천 평화의 깃발전), 민주화운동
                      기념관 빛의 연대기전. 그는 여전히 일상을 그리고, 그것이 한 시대의 기록으로
                      남도록 둔다.
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
                        {isEnglish ? 'The everyday as subject' : '주제가 된 일상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From 〈Our Everyday〉 onward, the cross-sections of an ordinary day are held up as something worth recording in paint.'
                          : '「우리들의 일상」 이래, 평범한 하루의 단면을 회화로 기록할 만한 것으로 떠올린다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Daily life and social reality' : '일상과 사회 현실'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Within the current of Korean minjung art, his painting reads ordinary hours together with the social conditions woven through them.'
                          : '한국 민중미술의 흐름 속에서, 그의 회화는 평범한 시간을 그 안에 얽힌 사회적 조건과 함께 읽는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Alongside peace and democracy' : '평화·민주 의제와 함께'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His work has often appeared in exhibitions connected to themes of peace and democracy, standing as a record of its time.'
                          : '그의 작업은 평화·민주의 의제와 연계된 전시에 자주 놓이며, 한 시대의 기록으로 선다.'}
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
                      1955
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Busan.' : '부산 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1983
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the National Fisheries University of Busan, Dept. of Food Engineering.'
                        : '부산수산대학 식품공학과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Our Everyday — I〉 (Geurim Madang Min, Seoul; Ondara Museum of Art, Jeonju).'
                        : '개인전 「우리들의 일상-I」 (그림마당 민, 서울 · 온다라미술관, 전주).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1992
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Our Everyday — II〉 (Geurim Madang Min; Ondara; Gallery Nouveau, Busan).'
                        : '개인전 「우리들의 일상-II」 (그림마당 민 · 온다라미술관 · 갤러리 누보, 부산).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Good days! — Everyday at peace〉 (Deokwon Gallery, Seoul).'
                        : '개인전 「Good days! 안녕한 일상들」 (덕원갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Good days!!〉 (Busan Democracy Park).'
                        : '개인전 「Good days!!」 (부산민주공원).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Old story〉 (Bak Jin-hwa Art Museum, Incheon).'
                        : '개인전 「Old story」 (박진화 미술관, 인천).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈In the paradise〉 (Namu Art Gallery, Seoul).'
                        : '개인전 「In the paradise」 (나무아트 갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Drifting the Earth〉 (Busan Democracy Park).'
                        : '개인전 「지구 표류기」 (부산 민주공원).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈On the street〉 (Namu Art Gallery).'
                        : '개인전 「거리에서」 (나무아트 갤러리).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Holoism (From the Invisible to the Visible)〉 (Artverse in Paris); group exhibition 〈Flipping the Plate〉 (Gyeonggi Museum of Art).'
                        : '개인전 「홀로이즘(From the Invisible to the Visible)」 (Artverse in Paris); 단체전 「판을 뒤집다」 (경기도미술관).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions' : '주요 전시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈Our Everyday — I·II〉 (1989, 1992), 〈Good days!〉 (2005–06), 〈Drifting the Earth〉 (2021), 〈On the street〉 (2023), 〈Holoism〉 (Artverse in Paris, 2025)'
                        : '개인전: 「우리들의 일상-I·II」(1989·1992), 「Good days!」(2005–06), 「지구 표류기」(2021), 「거리에서」(2023), 「홀로이즘」(Artverse in Paris, 2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition: 〈Flipping the Plate〉, Gyeonggi Museum of Art (2025); roughly 150 group exhibitions in total'
                        : '단체전: 「판을 뒤집다」, 경기도미술관 (2025); 단체전 약 150회'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Peace and democracy themed exhibitions: REGENERATION media-art special exhibition for the 45th anniversary of the May 18 Democratization Movement (Alternative Art Space Ipo); Peace Culture Festival (Dongducheon Flag of Peace exhibition); Chronicle of Light exhibition (Democracy Movement Memorial Hall)'
                        : '평화·민주 의제 전시: 5.18 민중항쟁 45주년 미디어 아트 특별전 REGENERATION(대안예술공간 이포); 평화 문화제(동두천 평화의 깃발전); 빛의 연대기전(민주화운동 기념관)'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 이인철 일상 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and the everyday</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 일상에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 우리들의 일상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈Our Everyday〉 — the ordinary as subject'
                    : '「우리들의 일상」 — 주제가 된 평범함'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee In-cheol came to painting along an unusual route — a degree in food
                        engineering from the National Fisheries University of Busan, completed in
                        1983. What he carried into the work was not an academy&apos;s formal
                        vocabulary but an attention to the ordinary hours of ordinary people.
                      </p>
                      <p>
                        The 〈Our Everyday〉 exhibitions gave that attention a name. 〈Our Everyday
                        — I〉 (1989) opened at Geurim Madang Min in Seoul and Ondara Museum of Art
                        in Jeonju; 〈Our Everyday — II〉 (1992) extended across Geurim Madang Min,
                        Ondara, and Gallery Nouveau in Busan. Within the current of Korean minjung
                        art, the everyday was treated not as a backdrop but as the subject itself —
                        the hours a life is actually made of.
                      </p>
                      <p>
                        The choice was quietly insistent. Rather than depict great events, the work
                        looked at the social conditions woven through ordinary days, letting the
                        plain cross-section of a single day stand as its own kind of record.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이인철은 흔치 않은 경로로 회화에 닿았다 — 1983년에 마친 부산수산대학
                        식품공학과의 학위. 그가 작업으로 가지고 들어온 것은 아카데미의 형식 어휘가
                        아니라, 평범한 사람들의 평범한 시간에 대한 주의 깊은 시선이었다.
                      </p>
                      <p>
                        「우리들의 일상」 연작은 그 시선에 이름을 붙였다. 「우리들의
                        일상-I」(1989)은 서울 그림마당 민과 전주 온다라미술관에서 열렸고, 「우리들의
                        일상-II」(1992)는 그림마당 민·온다라미술관·부산 갤러리 누보로 이어졌다. 한국
                        민중미술의 흐름 속에서, 일상은 배경이 아니라 주제 그 자체로 다루어졌다 — 한
                        사람의 삶이 실제로 이루어지는 시간으로서.
                      </p>
                      <p>
                        그 선택은 조용히 집요했다. 거대한 사건을 그리는 대신, 작업은 평범한 하루에
                        얽힌 사회적 조건을 바라보며, 한 날의 단순한 단면이 그 자체로 하나의 기록이
                        되도록 두었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. Good days에서 지구 표류기로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'From 〈Good days!〉 to 〈Drifting the Earth〉'
                    : '「Good days!」에서 「지구 표류기」로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        From the mid-2000s the register softened. The 〈Good days!〉 exhibitions —
                        Deokwon Gallery in Seoul (2005), Busan Democracy Park (2006) — held the
                        everyday up under a steadier light, looking at ordinary days as something
                        worth seeing on their own terms rather than as material for argument.
                      </p>
                      <p>
                        〈Old story〉 (Bak Jin-hwa Art Museum, Incheon, 2010) and 〈In the
                        paradise〉 (Namu Art Gallery, Seoul, 2018) carried that patient attention
                        forward. Then the frame widened: 〈Drifting the Earth〉 (Busan Democracy
                        Park, 2021) and 〈On the street〉 (Namu Art Gallery, 2023) moved the
                        everyday out into shared, public space.
                      </p>
                      <p>
                        In 2025, 〈Holoism (From the Invisible to the Visible)〉 was shown at
                        Artverse in Paris — the ordinary moment, long his subject, placed before an
                        international audience. Across four decades the through-line holds: the
                        everyday, looked at closely, kept as a record.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2000년대 중반부터 화면의 결이 부드러워졌다. 「Good days!」 연작 — 서울
                        덕원갤러리(2005), 부산민주공원(2006) — 은 일상을 한층 차분한 빛 아래
                        떠올리며, 평범한 하루를 주장의 재료가 아니라 그 자체로 바라볼 만한 것으로
                        보았다.
                      </p>
                      <p>
                        「Old story」(인천 박진화 미술관, 2010)와 「In the paradise」(서울 나무아트
                        갤러리, 2018)가 그 차분한 응시를 이어갔다. 이어 테두리가 넓어졌다 — 「지구
                        표류기」(부산 민주공원, 2021)와 「거리에서」(나무아트 갤러리, 2023)는 일상을
                        공유된 공공의 공간으로 데리고 나왔다.
                      </p>
                      <p>
                        2025년, 「홀로이즘(From the Invisible to the Visible)」이 파리 Artverse에서
                        소개됐다 — 오랜 주제였던 평범한 한 순간을 국제 관객 앞에 놓은 셈이다. 40년에
                        걸쳐 하나의 선이 이어진다: 가까이서 바라본 일상을, 기록으로 남기는 일.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 평화·민주 의제와 함께 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Alongside peace and democracy — roughly 150 group exhibitions'
                    : '평화·민주 의제와 함께 — 단체전 약 150회'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Beyond his solo exhibitions, Lee In-cheol has shown in roughly 150 group
                        exhibitions, many of them connected to themes of peace and democracy. His
                        everyday scenes have appeared in such settings without changing their nature
                        — they remain, first of all, records of ordinary days.
                      </p>
                      <p>
                        Recent examples include 〈Flipping the Plate〉 at the Gyeonggi Museum of Art
                        (2025); the media-art special exhibition REGENERATION marking the 45th
                        anniversary of the May 18 Democratization Movement, at Alternative Art Space
                        Ipo; the Peace Culture Festival (Dongducheon Flag of Peace exhibition); and
                        the Chronicle of Light exhibition at the Democracy Movement Memorial Hall.
                      </p>
                      <p>
                        Placed within these contexts, his painting keeps doing what it has always
                        done — reading the social conditions woven through daily life, and letting a
                        plain cross-section of the everyday stand as testimony to its time.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        개인전 외에도 이인철은 약 150회의 단체전에 참여해 왔으며, 그 가운데 다수는
                        평화·민주의 의제와 연계된 전시였다. 그의 일상 풍경은 그러한 자리에
                        놓이면서도 본래의 성격을 바꾸지 않는다 — 무엇보다 먼저, 평범한 하루의
                        기록으로 남는다.
                      </p>
                      <p>
                        최근의 예로는 경기도미술관 「판을 뒤집다」(2025); 5.18 민중항쟁 45주년
                        미디어 아트 특별전 REGENERATION, 대안예술공간 이포; 평화 문화제(동두천
                        평화의 깃발전); 민주화운동 기념관 빛의 연대기전이 있다.
                      </p>
                      <p>
                        이러한 맥락 속에 놓여도, 그의 회화는 늘 해 오던 일을 이어간다 — 일상에 얽힌
                        사회적 조건을 읽고, 평범한 하루의 단면이 그 시대의 증언으로 서도록 두는 일.
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
                      From 〈Our Everyday〉 in the late 1980s to 〈Holoism〉 in Paris in 2025, Lee
                      In-cheol&apos;s work has followed a single thread: the cross-section of an
                      ordinary day, looked at closely and kept as a record. He joins this campaign
                      not as a subject of its cause but as a fellow artist in solidarity — so that
                      others, too, might keep painting their everyday without the weight of
                      financial exclusion.
                    </>
                  ) : (
                    <>
                      1980년대 말의 「우리들의 일상」에서 2025년 파리의 「홀로이즘」까지, 이인철의
                      작업은 하나의 실을 따라왔다: 가까이서 바라보고 기록으로 남기는, 평범한 하루의
                      단면. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의
                      연대자로서 함께한다 — 다른 이들 또한 금융 차별의 무게 없이 저마다의 일상을
                      계속 그릴 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee In-cheol</span>
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
                    Lee In-cheol joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이인철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_INCHEOL_PATH}
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
