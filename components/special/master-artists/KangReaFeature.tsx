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

// 거장 작가 feature는 작가 페이지(/artworks/artist/강레아)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KANG_REA_PATH = `/artworks/artist/${encodeURIComponent('강레아')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKangReaArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '강레아' ||
    n === 'kang rea' ||
    n === 'kang lea' ||
    n.replace(/[\s-]+/g, '') === 'kangrea' ||
    n.replace(/[\s-]+/g, '') === 'kanglea'
  );
};

const PAGE_COPY = {
  ko: {
    title: '강레아 — 암벽에 핀 소나무, 클라이머의 카메라',
    description:
      '한국 최초의 여성 클라이밍·산악 사진작가 강레아. 직접 암벽에 올라 바위 틈에 뿌리내린 소나무와 산의 강인한 생명력을 흑백으로 담아낸다. 설악산과 북한산을 향한 헌사 같은 강레아의 사진을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '한국 최초의 여성 클라이밍·산악 사진작가 강레아. 암벽에 직접 올라 바위에 뿌리내린 소나무와 산의 생명력을 흑백으로 담는다.',
    ogAlt: '강레아 대표 작품',
    twitterTitle: '강레아',
    twitterDescription: '암벽에 올라 담은 소나무 — 한국 최초 여성 클라이밍 산악 사진작가 강레아',
    keywords:
      '강레아 사진작가, 산악사진, 암벽등반 사진, 클라이밍 사진, 소나무, 설악산, 씨앗페 온라인',
  },
  en: {
    title: 'Kang Rea — Pines on the Rock Face, a Climber’s Camera',
    description:
      'Selected works by Kang Rea, Korea’s first female climbing and mountain photographer. Climbing the rock faces herself, she captures in black and white the pines rooted in cracks of stone and the tenacious life of the mountains. View and collect her works — an homage to Seoraksan and Bukhansan — at SAF Online.',
    ogDescription:
      'Kang Rea — Korea’s first female climbing and mountain photographer. Climbing the walls herself, she captures the pines rooted in rock and the life of the mountains in black and white.',
    ogAlt: 'Kang Rea — featured work',
    twitterTitle: 'Kang Rea',
    twitterDescription:
      'Pines captured from the rock face — Korea’s first female climbing and mountain photographer',
    keywords:
      'Kang Rea photographer, mountain photography, climbing photography, rock climbing, pine tree, Seoraksan, Korean photography',
  },
} as const;

export async function buildKangReaMetadata({
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
  const pageUrl = buildLocaleUrl(KANG_REA_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('강레아');
  const artwork = allArtworks.find((a) => isKangReaArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kang Rea`
      : `${artwork.title} — 강레아`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KANG_REA_PATH, locale, true),
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

export default async function KangReaFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KANG_REA_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('강레아');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKangReaArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kang Rea' : '강레아', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KANG_REA_PATH}#person-kang-rea`,
    name: isEnglish ? 'Kang Rea' : '강레아',
    alternateName: isEnglish ? '강레아' : 'Kang Rea',
    jobTitle: isEnglish ? 'Photographer' : '사진작가',
    description: isEnglish
      ? "Kang Rea is Korea's first female climbing and mountain photographer. Climbing the rock faces herself, she captures in black and white the pines rooted in cracks of stone and the tenacious life of the mountains."
      : '강레아는 한국 최초의 여성 클라이밍·산악 사진작가입니다. 직접 암벽에 올라 바위 틈에 뿌리내린 소나무와 산의 강인한 생명력을 흑백 사진으로 담아냅니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Shingu College, Dept. of Photography' : '신구대학 사진과',
    },
    knowsAbout: [
      'Mountain photography',
      'Rock climbing photography',
      'Black-and-white photography',
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
    name: isEnglish ? 'Kang Rea — SAF Online' : '강레아 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kang Rea from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 강레아 작품을 소개합니다.',
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

          {/* Vertical strata lines — 암벽의 결, 수직의 벽 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish
                  ? "Kang Rea · Korea's first female climbing photographer"
                  : '강레아 · 한국 최초 여성 클라이밍 사진작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A pine takes root
                  <br />
                  <span className="text-primary-soft">on the bare rock face</span>
                </>
              ) : (
                <>
                  맨 바위에 뿌리내린
                  <br />
                  <span className="text-primary-soft">한 그루 소나무</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">She climbed the wall to take the photograph.</span>
                  <span className="mt-2 block">
                    Pines, cliffs, snow and mist — the tenacious life of the mountains, in black and
                    white.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사진을 찍기 위해 직접 벽에 올랐다.</span>
                  <span className="mt-2 block">
                    소나무와 암벽, 눈과 운무 — 산의 강인한 생명력을 흑백으로.
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
                    The climber and the camera —<br />
                    <span className="text-primary-strong">a gaze that scaled the wall</span>
                  </>
                ) : (
                  <>
                    클라이머와 카메라 —<br />
                    <span className="text-primary-strong">벽을 오른 시선</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kang Rea is Korea&apos;s first female climbing and mountain photographer. She
                      came to photography late, from a background in design, graduating from the
                      Department of Photography at Shingu College before turning to the medium as a
                      profession. What set her apart from the start was simple and severe: to make
                      the pictures she wanted, she had to climb.
                    </p>
                    <p>
                      Her subjects could not be reached from the ground. Climbers pressed against
                      vertical stone; pines rooted in cracks of bare rock, holding on without soil;
                      mist passing across a wall. To photograph them she hung from the cliff face
                      herself, camera in hand, organizing the frame from a position most
                      photographers never occupy. The{' '}
                      <strong className="font-bold text-charcoal-deep">camera of a climber</strong>{' '}
                      is the through-line of her work.
                    </p>
                    <p>
                      For roughly fifteen years she worked closely with Korea&apos;s mountaineering
                      press — as a contributing reporter for{' '}
                      <em>Saram-gwa-San (People and Mountains)</em> and through a long-running
                      series in <em>Monthly San</em> — recording countless moments of climbers on
                      the wall. Fog, snow, and stone are the constants of her pictures; most were
                      made in poor weather. On a wall where you cannot move freely left or right,
                      she found that the only way to compose a scene was through rain, snow, and
                      cloud. She returned to the same places dozens of times until the weather
                      itself became the backdrop she needed.
                    </p>
                    <p>
                      A pine standing on the bare rock of Insubong, in Bukhansan, marked a turning
                      point. In that single tree — rooted where there should be no soil, sustained
                      by what little the rock and the air would give — she found the themes of{' '}
                      <strong className="font-bold text-charcoal">environment and support</strong>,
                      and her focus shifted from people to nature. She works almost entirely in
                      black and white, paring the mountain down to light, stone, and the forms that
                      endure upon it.
                    </p>
                    <p>
                      Today her photographs hang in a small café at the entrance to Seoraksan, where
                      pines on rock, sheer walls, vast slabs of stone, and mist rising over deep
                      valleys greet anyone who climbs to her door. Her images carry both strength
                      and lyricism — the hardness of the wall, and the quiet tenderness of a tree
                      that refuses to let go.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      강레아는 한국 최초의 여성 클라이밍·산악 사진작가다. 디자이너 출신으로 사진에
                      늦게 입문한 그는 신구대학 사진과를 졸업한 뒤 전문 사진작가의 길로 들어섰다.
                      처음부터 그를 다른 사진가와 구별 지은 것은 단순하고 가혹했다 — 원하는 사진을
                      찍으려면 직접 올라야 했다.
                    </p>
                    <p>
                      그가 담으려는 피사체는 땅에서 닿지 않았다. 수직의 바위에 매달린 클라이머, 흙도
                      없는 맨 암벽 틈에 뿌리내린 소나무, 벽을 스쳐 가는 운무. 그것들을 담기 위해
                      그는 카메라를 든 채 직접 암벽에 매달렸고, 대부분의 사진가가 서지 못하는
                      자리에서 화면을 구성했다.{' '}
                      <strong className="font-bold text-charcoal-deep">클라이머의 카메라</strong>가
                      그의 작업을 관통하는 한 줄기다.
                    </p>
                    <p>
                      그는 약 15년에 걸쳐 한국 산악 전문지와 가까이 일했다 — <em>월간 사람과 산</em>{' '}
                      객원기자로, 그리고 <em>월간 산</em>의 장기 연재를 통해 벽 위 클라이머들의
                      무수한 순간을 기록했다. 안개와 눈, 그리고 바위는 그의 사진을 이루는 상수이며,
                      대부분의 작품은 궂은 날씨 속에서 태어났다. 좌우로 자유롭게 움직일 수 없는
                      벽에서 장면을 정돈하는 유일한 방법은 비와 눈과 구름이었다. 그는 날씨 자체가
                      필요한 배경이 될 때까지 같은 자리를 수십 번 다시 찾았다.
                    </p>
                    <p>
                      전환점은 북한산 인수봉의 맨 바위 위에 선 한 그루 소나무였다. 흙이 없어야 할
                      곳에 뿌리내린 채 바위와 공기가 내어주는 것만으로 버티는 그 나무에서, 그는{' '}
                      <strong className="font-bold text-charcoal">환경과 지지(支持)</strong>라는
                      주제를 발견했고 시선을 사람에서 자연으로 옮겼다. 그는 거의 전적으로 흑백으로
                      작업하며, 산을 빛과 바위, 그리고 그 위에 견디는 형상으로 덜어낸다.
                    </p>
                    <p>
                      오늘 그의 사진은 설악산 입구의 작은 카페에 걸려 있다. 바위에 뿌리내린 소나무,
                      깎아지른 암벽과 거대한 암반, 깊은 계곡 위로 피어오르는 운무가 그곳까지 오른
                      이를 맞이한다. 그의 이미지는 강인함과 서정을 함께 품는다 — 벽의 단단함과, 끝내
                      놓지 않는 한 그루 나무의 고요한 다정함을.
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
                        {isEnglish ? "A climber's camera" : '클라이머의 카메라'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'She climbs the wall to make the picture — photographing from a vertical position most photographers never reach.'
                          : '사진을 위해 직접 벽에 오른다. 대부분의 사진가가 닿지 못하는 수직의 자리에서 화면을 만든다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Pines rooted in rock' : '바위에 뿌리내린 소나무'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A pine holding to bare stone without soil — her emblem of environment, support, and tenacious life.'
                          : '흙 없는 맨 바위를 붙들고 선 소나무. 환경과 지지, 강인한 생명력의 상징.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Weather as composition' : '날씨로 짓는 화면'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Fog, snow, and stone in black and white — most works made in bad weather, returning to a place dozens of times.'
                          : '안개·눈·바위의 흑백. 대부분 궂은 날씨에서, 같은 자리를 수십 번 다시 찾아 완성한다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's path" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'From a design background, comes late to photography.'
                        : '디자이너 출신으로 사진에 늦게 입문.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Photography, Shingu College.'
                        : '신구대학 사진과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins photographing climbers while suspended on the rock face — Korea’s first female climbing photographer.'
                        : '암벽에 매달려 클라이머를 촬영하기 시작 — 한국 최초의 여성 클라이밍 사진작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      ~15yr
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works with the mountaineering press — contributing reporter for People and Mountains and a long-running series in Monthly San.'
                        : '산악 전문지와 약 15년 협업 — 「사람과 산」 객원기자, 「월간 산」 장기 연재.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'A pine on the bare rock of Insubong, Bukhansan, shifts her focus from people to nature.'
                        : '북한산 인수봉의 맨 바위 위 소나무를 계기로 시선을 사람에서 자연으로 전환.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Holds solo exhibitions devoted to the mountains; her works also shown abroad, including in France.'
                        : '산을 헌사한 개인전 개최; 프랑스 등 해외에서도 작품 전시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      now
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Shows her photographs at a small café at the entrance to Seoraksan.'
                        : '설악산 입구의 작은 카페에서 사진을 전시하며 활동.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Practice & subjects' : '작업과 소재'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Mountaineering press: contributing reporter for People and Mountains; a long-running climbing-photography series in Monthly San.'
                        : '산악 전문지: 「사람과 산」 객원기자, 「월간 산」 클라이밍 사진 장기 연재.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Principal subjects: Seoraksan and Bukhansan — pines on rock, sheer walls, vast slabs, mist over deep valleys.'
                        : '주요 무대: 설악산·북한산 — 바위 위 소나무, 깎아지른 암벽, 거대한 암반, 계곡 위 운무.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works almost entirely in black and white; her photographs have also been exhibited abroad, including in France.'
                        : '거의 전적으로 흑백 작업; 프랑스 등 해외에서도 작품이 전시되었다.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 강레아 산·흑백 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the wall, the pine, and the weather</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">벽과 소나무, 그리고 날씨에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 클라이머가 든 카메라 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'The camera that had to climb' : '올라야만 했던 카메라'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most mountain photography is made from the ground looking up, or from a
                        summit looking out. Kang Rea&apos;s is made from the wall itself. To
                        photograph a climber pressed against vertical stone — or a pine clinging to
                        a crack that no path reaches — she had to be there too, suspended on the
                        same face, the rope holding her as it held them.
                      </p>
                      <p>
                        Coming to photography late, from design, she did not inherit the conventions
                        of the genre so much as invent the conditions of her own. As Korea&apos;s
                        first female climbing photographer, she occupied a position almost no one
                        else did: hanging on the rock, hands needed both for the wall and for the
                        camera, composing under physical strain that the finished print never
                        reveals.
                      </p>
                      <p>
                        That constraint is also the work&apos;s signature. The viewpoint is one you
                        cannot fake from below — the intimacy of being level with the climber, eye
                        to eye with the tree on the rock. The picture is the record of a place the
                        photographer had to earn by climbing to it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대부분의 산악 사진은 땅에서 올려다보거나 정상에서 내려다보며 만들어진다.
                        강레아의 사진은 벽 그 자체에서 만들어진다. 수직의 바위에 매달린 클라이머를,
                        혹은 어떤 길도 닿지 않는 틈을 붙든 소나무를 담으려면 그 역시 그곳에 있어야
                        했다 — 같은 벽에 매달린 채, 그들을 지탱하던 로프가 그를 지탱하는 자리에서.
                      </p>
                      <p>
                        디자이너 출신으로 사진에 늦게 든 그는 장르의 관습을 물려받기보다 자신만의
                        조건을 만들어 냈다. 한국 최초의 여성 클라이밍 사진작가로서, 그는 거의 누구도
                        서지 않던 자리를 차지했다 — 바위에 매달린 채, 벽과 카메라에 동시에 손이
                        필요한 채, 완성된 인화에는 드러나지 않는 육체적 긴장 속에서 화면을 구성하는
                        자리를.
                      </p>
                      <p>
                        그 제약이 곧 작업의 서명이기도 하다. 아래에서는 흉내 낼 수 없는 시점 —
                        클라이머와 같은 높이에 선 친밀함, 바위 위 나무와 눈을 마주하는 거리. 그
                        사진은 사진가가 직접 올라 얻어 낸 자리의 기록이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 바위 위의 소나무 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The pine on Insubong — from people to nature'
                    : '인수봉의 소나무 — 사람에서 자연으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For years her camera followed climbers. The turn came from a tree. On the
                        bare rock of Insubong, in Bukhansan, a single pine stood where there should
                        have been no soil to hold it — rooted in a crack, sustained by whatever the
                        stone and the weather would give. In that image she recognized something
                        larger than a motif: the questions of{' '}
                        <strong className="font-bold text-charcoal-deep">
                          environment and support
                        </strong>
                        , of what it takes for life to hold on.
                      </p>
                      <p>
                        From that point her focus shifted from people to nature. The pine became a
                        recurring emblem — not a picturesque subject but a figure of endurance, of a
                        living thing that refuses to fall from a place that offers it almost
                        nothing. It is a quietly political image to set beside this campaign:
                        tenacious life, held up by what little support can be found.
                      </p>
                      <p>
                        Her mountains are rendered almost entirely in black and white. Stripped of
                        colour, the work is pared to light, stone, snow, and silhouette — the
                        essential contrast between the hardness of the rock and the soft persistence
                        of what grows upon it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        오랫동안 그의 카메라는 클라이머를 따랐다. 전환은 한 그루 나무에서 왔다.
                        북한산 인수봉의 맨 바위 위, 그것을 붙들 흙이 없어야 할 자리에 소나무 한
                        그루가 서 있었다 — 틈에 뿌리내린 채, 바위와 날씨가 내어주는 것만으로 버티며.
                        그 이미지 에서 그는 소재 이상의 것을 알아보았다.{' '}
                        <strong className="font-bold text-charcoal-deep">환경과 지지</strong>의
                        물음, 생명이 버텨 내기 위해 필요한 것에 대한 물음을.
                      </p>
                      <p>
                        그때부터 그의 시선은 사람에서 자연으로 옮겨졌다. 소나무는 거듭 등장하는
                        상징이 됐다 — 그림 같은 소재가 아니라, 거의 아무것도 내어주지 않는 자리에서
                        끝내 떨어지지 않는 생명의 형상. 이 캠페인과 나란히 두면 조용히 정치적인
                        이미지이기도 하다: 작은 지지에 기대어 버티는 강인한 생명.
                      </p>
                      <p>
                        그의 산은 거의 전적으로 흑백으로 그려진다. 색을 덜어 낸 화면은 빛과 바위,
                        눈과 실루엣으로 정제된다 — 바위의 단단함과, 그 위에 자라는 것의 부드러운
                        끈질김 사이의 본질적 대비로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 날씨로 짓는 화면 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Fog, snow, and the patience of a place'
                    : '안개와 눈, 한 자리를 기다리는 인내'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        On a wall, the photographer cannot step left or right to recompose. The
                        frame is fixed by where the body can hang. So Kang Rea learned to compose
                        with the one variable still in motion: the weather. Rain, snow, and cloud
                        became her means of ordering a scene — drawing a wall forward, dissolving a
                        background, isolating a climber or a tree against drifting mist.
                      </p>
                      <p>
                        This is why most of her work was made in bad weather, and why she returned
                        to the same locations dozens of times. She waited for the fog to fall a
                        certain way, for the snow to settle on the right ledge, for the cloud to
                        pass at the right height — until the weather itself became the backdrop the
                        picture required. The patience is part of the photograph.
                      </p>
                      <p>
                        Strong and lyrical at once, her images hold the two registers of the
                        mountain together: the severity of stone and the tenderness of mist; the
                        climber&apos;s exposure and the stillness of a tree that has decided to
                        stay. She joins this campaign not as a subject of its cause but as a fellow
                        artist in solidarity — offering her mountains so that another artist might
                        hold on a little longer.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        벽에서는 사진가가 좌우로 옮겨 다시 구도를 잡을 수 없다. 화면은 몸이 매달릴
                        수 있는 자리로 고정된다. 그래서 강레아는 여전히 움직이는 단 하나의 변수 —
                        날씨로 화면을 짓는 법을 익혔다. 비와 눈과 구름이 장면을 정돈하는 수단이
                        됐다. 벽을 앞으로 끌어내고, 배경을 지우고, 흘러가는 운무 앞에 클라이머나
                        나무 한 그루를 떼어 세우는.
                      </p>
                      <p>
                        그래서 그의 작업은 대부분 궂은 날씨에서 태어났고, 그래서 그는 같은 자리를
                        수십 번 다시 찾았다. 안개가 특정한 방향으로 내려앉기를, 눈이 알맞은 바위턱에
                        쌓이기를, 구름이 알맞은 높이로 지나가기를 — 날씨 자체가 사진이 요구하는
                        배경이 될 때까지 기다렸다. 그 인내가 사진의 일부다.
                      </p>
                      <p>
                        강인하면서 서정적인 그의 이미지는 산의 두 결을 함께 품는다 — 바위의 준엄함과
                        운무의 다정함, 클라이머의 노출과 머무르기로 한 나무의 고요. 씨앗페에는 이
                        캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 또 다른 예술인이
                        조금 더 오래 버틸 수 있도록 자신의 산을 내놓으며.
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
                      From the design studio to the rock face, Kang Rea&apos;s work has pursued a
                      single image: a living thing that holds on where it should not be able to. The
                      pine on the bare wall is her self-portrait and her argument at once — that
                      with the smallest support, life endures. She offers her mountains to this
                      campaign in that spirit: so that the support an artist needs might reach them
                      in time.
                    </>
                  ) : (
                    <>
                      디자인 스튜디오에서 암벽까지, 강레아의 작업은 하나의 이미지를 추구해 왔다 —
                      버틸 수 없어야 할 자리에서 끝내 버티는 생명. 맨 벽 위의 소나무는 그의
                      자화상이자 주장이다. 가장 작은 지지만으로도 생명은 견딘다는. 그는 그 뜻으로
                      자신의 산을 이 캠페인에 내놓는다 — 한 예술인에게 필요한 지지가 제때 닿을 수
                      있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kang Rea</span>
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
                    Kang Rea joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    강레아 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KANG_REA_PATH}
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
