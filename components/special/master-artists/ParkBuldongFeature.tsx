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

// 거장 작가 feature는 작가 페이지(/artworks/artist/박불똥)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_BULDONG_PATH = `/artworks/artist/${encodeURIComponent('박불똥')}`;

const PARK_BULDONG_ARTIST_KEYS = new Set([
  '박불똥',
  'park bul-ttong',
  'park bulttong',
  'park buldong',
  'parkbulttong',
]);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isParkBuldongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    PARK_BULDONG_ARTIST_KEYS.has(normalized) ||
    compact === '박불똥' ||
    compact === 'parkbulttong' ||
    compact === 'parkbuldong'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박불똥 — 콜라주·정치 미술의 거장',
    description:
      '콜라주·정치 미술의 거장 박불똥(1956–). 신문·잡지를 잘라 붙여 권력의 언어를 해체하고 재조립하는 작가. 한국 민중미술 운동의 날카로운 목소리, 박불똥의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '콜라주·정치 미술의 거장 박불똥. 대중매체 이미지를 해체·재조합하여 권력의 이면을 폭로하는 한국 민중미술의 날카로운 목소리.',
    ogAlt: '박불똥 대표 작품',
    twitterTitle: '박불똥',
    twitterDescription: '잘라내고 붙이며 세상을 읽는다 — 콜라주·정치 미술의 거장 박불똥',
  },
  en: {
    title: 'Park Bul-ttong — Master of Collage and Political Art',
    description:
      'Selected works by Park Bul-ttong (b. 1956), master of collage and political art. Cutting and reassembling images from newspapers and magazines, he exposes the hidden structures of power. A sharp voice of the Korean minjung art movement. View and collect selected works at SAF Online.',
    ogDescription:
      'Park Bul-ttong — master of collage and political art. Cutting and reassembling mass media images to expose the hidden structures of power.',
    ogAlt: 'Park Bul-ttong — featured work',
    twitterTitle: 'Park Bul-ttong',
    twitterDescription: 'Cut, paste, read the world — master of Korean political collage art',
  },
} as const;

export async function buildParkBuldongMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_BULDONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박불똥');
  const artwork = allArtworks.find((a) => isParkBuldongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Bul-ttong`
      : `${artwork.title} — 박불똥`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Park Bul-ttong artist, Korean political art, Korean collage art, minjung misul, political collage'
        : '박불똥 화가, 한국 정치 미술, 콜라주 아트, 민중미술, 정치 콜라주, 씨앗페 온라인',
    alternates: createLocaleAlternates(PARK_BULDONG_PATH, locale, true),
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

export default async function ParkBuldongFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_BULDONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박불똥');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkBuldongArtist(artwork.artist)
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
    { name: isEnglish ? 'Park Bul-ttong' : '박불똥', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_BULDONG_PATH}#person-park-buldong`,
    name: isEnglish ? 'Park Bul-ttong' : '박불똥',
    alternateName: isEnglish ? '박불똥' : 'Park Bul-ttong',
    jobTitle: isEnglish ? 'Artist' : '화가·콜라주 작가',
    description: isEnglish
      ? 'Park Bul-ttong (b. 1956) is a Korean master of collage and political art, known for works that cut and reassemble mass media images to expose hidden power structures.'
      : '박불똥(1956-)은 대중매체 이미지를 해체·재조합하는 콜라주와 정치 미술로 권력의 이면을 폭로해온 한국 민중미술의 거장입니다.',
    birthDate: '1956',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Hadong, South Gyeongsang, South Korea' : '경남 하동',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Western Painting' : '홍익대학교 서양화과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish
        ? "Minjung Misul Hyeopuihoe (National Artists' Association)"
        : '민족미술협의회',
    },
    knowsAbout: ['Political collage', 'Korean minjung art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Bul-ttong — SAF Online' : '박불똥 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Bul-ttong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박불똥 작품들을 소개합니다.',
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
                {isEnglish ? 'Park Bul-ttong · b. 1956' : '박불똥 · 1956–'}
              </span>
              <div className="absolute inset-0 border-4 border-primary transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black">
              {isEnglish ? (
                <>
                  Cut, Paste,
                  <br />
                  and Read the World
                </>
              ) : (
                <>
                  잘라내고 붙이며
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-primary-soft">세상을 읽는다</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">The image was theirs. The meaning is ours.</span>
                  <span className="mt-2 block">
                    Park Bul-ttong tears the picture apart to show you what was always hidden
                    inside.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">이미지는 그들의 것이었다. 의미는 우리가 만든다.</span>
                  <span className="mt-2 block">
                    박불똥은 그림을 해체하여 그 안에 숨겨진 것을 꺼내 보입니다.
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
          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    Scissors as critique —<br />
                    <span className="text-primary-strong">the collage that cuts through power</span>
                  </>
                ) : (
                  <>
                    가위가 곧 비평 —<br />
                    <span className="text-primary-strong">권력을 오려내는 콜라주</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Bul-ttong (b. 1956, Hadong, South Gyeongsang province) studied Western
                      painting at Hongik University before entering the minjung art scene in the
                      early 1980s. He chose his medium deliberately:{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        collage and photomontage
                      </strong>
                      . Not painting, not printmaking — but the act of cutting images produced by
                      power and rearranging them into new, unauthorized meanings. Newspapers,
                      magazines, advertisements: the raw material of his work is the very media
                      through which authority speaks.
                    </p>
                    <p>
                      In 1985, Park helped organize and exhibit in{' '}
                      <em>Korean Art, The Power of the 20s</em> at the Arab Cultural Center in
                      Seoul. Police raided the exhibition, confiscated works on display, and
                      arrested protesting artists — the first exhibition in Korean art history to be
                      forcibly closed by the state. That suppression had the opposite of its
                      intended effect: it became a direct catalyst for the founding of the Minjung
                      Misul Hyeopuihoe (민족미술협의회), and Park became a member. He has remained a
                      member of the Minjung Art Association (민족미술협회) and the Federation of
                      Korean Artists (민족예술인총연합회) since.
                    </p>
                    <p>
                      Through the late 1980s, he developed his signature method: clipping specific
                      images with scissors, pasting them with glue, re-editing them into new
                      compositions, then photographing and reprinting the result. The process
                      collapses the distinction between original and reproduction — the hand-made
                      collage is merely a step in production, not the finished object. The finished
                      work is simultaneously original and copy. In this, Park&apos;s method is a
                      political claim embedded in artistic form itself.
                    </p>
                    <p>
                      His collages are direct without being blunt, political without being didactic.
                      The targets are consistent across four decades: military power, capital, and
                      the visual language of mass media through which both exercise influence over
                      daily life. By taking images from within that system — from the glossy pages
                      that shape public perception — and cutting them into new configurations, Park
                      shows not only what the images contain but what they were designed to conceal.
                    </p>
                    <p>
                      The scissors do the arguing. And the result — a world reassembled honestly —
                      is both a critique and a kind of liberation. Now working from his studio in
                      Masok, Namyangju, Park continues to produce works that the Seoul Museum of Art
                      and other institutions have recognized as essential documents of Korean
                      contemporary history and visual culture.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박불똥(1956-, 경남 하동)은 홍익대학교 서양화과를 졸업한 뒤 1980년대 초반
                      민중미술 현장에 들어섰다. 그는 자신의 매체를 의도적으로 선택했습니다:{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        콜라주와 포토몽타주
                      </strong>
                      . 회화도 판화도 아닌, 권력이 생산한 이미지를 오려내어 승인받지 않은 새로운
                      의미로 재배열하는 행위. 신문, 잡지, 광고 — 그의 작업 재료는 권력이 말하는 바로
                      그 매체입니다.
                    </p>
                    <p>
                      1985년, 박불똥은 서울 아랍미술관에서 열린 《한국미술, 20대의 힘》 전시를
                      기획하고 출품했습니다. 경찰이 들이닥쳐 출품작을 압수하고 항의하는 작가들을
                      구속했습니다 — 한국 미술사에서 공권력에 의해 강제로 막을 내린 최초의 전시.
                      그러나 탄압은 의도와 반대의 결과를 낳았습니다. 이 충돌은 민족미술협의회 창립의
                      직접적 계기가 됐고, 박불똥도 그 일원이 됐습니다. 이후 민족미술협회,
                      민족예술인총연합회 회원으로 활동을 이어왔습니다.
                    </p>
                    <p>
                      1980년대 후반을 거치며 그는 자신만의 작업 방식을 확립했습니다. 잡지·신문에서
                      이미지를 가위로 오려 풀로 붙이고, 새로운 구성으로 편집한 뒤, 다시 사진으로
                      촬영하고 인화합니다. 이 과정은 원본과 복제품의 경계를 무너뜨립니다 — 손으로
                      만든 콜라주는 완성작이 아니라 생산 과정의 한 단계일 뿐이고, 완성된 작품은
                      원본이자 동시에 복제품입니다. 박불똥의 방법론은 예술 형식 자체에 박힌 정치적
                      선언입니다.
                    </p>
                    <p>
                      그의 콜라주는 직접적이지만 무디지 않고, 정치적이지만 설교하지 않습니다. 40년에
                      걸친 작업의 대상은 일관됩니다: 군사 권력, 자본, 그리고 그 둘이 일상에 영향력을
                      행사하는 수단으로서의 대중매체의 시각 언어. 그 시스템 내부에서 — 대중의 인식을
                      형성하는 잡지의 페이지에서 — 이미지를 가져다 새로운 배열로 잘라내어, 그
                      이미지가 무엇을 담고 있는지뿐 아니라 무엇을 감추도록 설계됐는지를 드러냅니다.
                    </p>
                    <p>
                      가위가 논증합니다. 그리고 그 결과 — 정직하게 재조합된 세계 — 는 비평이자
                      하나의 해방입니다. 현재 남양주 마석의 작업실에서 작업을 이어가고 있으며,
                      서울시립미술관 등 주요 기관이 그의 작품을 한국 현대사와 시각 문화의 중요한
                      기록으로 소장하고 있습니다.
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
                        {isEnglish ? 'Deconstruction of image' : '이미지의 해체'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Mass media images are cut apart and reassembled to expose the power structures hidden within them.'
                          : '대중매체 이미지를 해체·재조합하여 그 이면의 권력 구조를 드러냅니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Satire and directness' : '풍자와 직접성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Without detour, his works deliver social and political messages with immediate visual impact.'
                          : '우회 없이 사회·정치적 메시지를 직접적이고 강렬한 시각 언어로 전달합니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Democracy of collage' : '콜라주의 민주성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Using everyday printed materials rather than costly supplies, he lowers the threshold of art while raising the stakes of critique.'
                          : '값비싼 재료 대신 누구나 접할 수 있는 인쇄물로, 예술의 문턱은 낮추고 비평의 날은 높입니다.'}
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
                      1956
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Hadong, South Gyeongsang province.' : '경남 하동 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Department of Western Painting.'
                        : '홍익대학교 서양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition 〈Nunbit〉 at Gwanhun Gallery. Co-organizes 《Korean Art, The Power of the 20s》 at the Arab Cultural Center; police raid and confiscate works — the first forced closure of an exhibition in Korean art history, which catalyzed the founding of the Minjung Misul Hyeopuihoe.'
                        : '첫 개인전 〈눈빛展〉(관훈미술관). 《한국미술, 20대의 힘》展(아랍미술관) 기획·출품; 경찰 압수 및 강제 폐쇄 — 한국 미술사 최초의 공권력에 의한 전시 폐쇄. 이를 계기로 민족미술협의회 창립.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Joljak〉 exhibition at Geurimadang Min, Seoul.'
                        : '〈졸작展〉 (그림마당 민, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Gyeolsa Bandae〉 (Resolute Opposition) at Geurimadang Min, Seoul.'
                        : '〈결사반대展〉 (그림마당 민, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1992
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Confession on the Disability of Desire〉 at Kumho Museum of Art, Seoul.'
                        : '〈관능의 불구에 대한 자백展〉 (금호미술관, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1994
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in the landmark group exhibition 《15 Years of Minjung Art: 1980–1994》 at MMCA.'
                        : '단체전 《민중미술 15년: 1980–1994》 참여 (국립현대미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1999
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Private Property〉 at Savina Gallery, Seoul.'
                        : '〈사유재산展〉 (사비나갤러리, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Alchemy of Daily Life〉 at the National Museum of Modern and Contemporary Art.'
                        : '〈일상의 연금술展〉 (국립현대미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'SeMA Collection exhibition 《A Montage of Modern History: Shin Hak-chul & Park Bul-ttong》, Gumnae Art Hall (Seoul Museum of Art collection works).'
                        : '《SeMA Collection: 신학철, 박불똥의 현대사 몽타주》, 금나래아트홀 (서울시립미술관 소장작 전시).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo retrospective 〈Park Bul-ttong 1985–2016〉, Gallery 175, Seoul (Mar 15–31).'
                        : '개인 회고전 〈박불똥, 1985–2016〉, 갤러리175, 서울 (3.15–3.31).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Continues working from his studio in Masok, Namyangju; his collages remain one of the sharpest visual critiques in contemporary Korean art.'
                        : '남양주 마석 작업실에서 작업 지속. 한국 현대미술에서 가장 날카로운 시각 비평의 목소리 중 하나.'}
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
                        ? '〈Nunbit〉 (1985, 관훈미술관) · 〈Joljak〉 (1987) · 〈Gyeolsa Bandae〉 (1989) — Geurimadang Min, Seoul'
                        : '〈눈빛展〉 (1985, 관훈미술관) · 〈졸작展〉 (1987) · 〈결사반대展〉 (1989) — 그림마당 민, 서울'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Confession on the Disability of Desire〉, Kumho Museum of Art (1992) · 〈Alchemy of Daily Life〉, MMCA (2004) · 〈Park Bul-ttong 1985–2016〉, Gallery 175 (2016)'
                        : '〈관능의 불구에 대한 자백展〉 금호미술관 (1992) · 〈일상의 연금술展〉 국립현대미술관 (2004) · 〈박불똥, 1985–2016〉 갤러리175 (2016)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibition:{' '}
                          <a
                            href="https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《15 Years of Minjung Art: 1980–1994》, MMCA (1994)
                          </a>
                          ; SeMA collection works exhibited at{' '}
                          <a
                            href="https://news.seoul.go.kr/culture/archives/43535"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《A Montage of Modern History》 (2014)
                          </a>
                        </>
                      ) : (
                        <>
                          단체전:{' '}
                          <a
                            href="https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《민중미술 15년: 1980–1994》, 국립현대미술관 (1994)
                          </a>
                          ; 서울시립미술관 소장작{' '}
                          <a
                            href="https://news.seoul.go.kr/culture/archives/43535"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《현대사 몽타주》 전시 (2014)
                          </a>
                        </>
                      )}
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
                  <span className="text-charcoal-deep">on scissors, solidarity, and power</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">가위와 연대와 권력에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 가위와 풀 — 포토몽타주라는 무기 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Scissors and glue — photomontage as weapon'
                    : '가위와 풀 — 포토몽타주라는 무기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Bul-ttong&apos;s tools are elementary: scissors, glue, a printed page.
                        The method — photomontage — has a lineage reaching back to the Berlin
                        Dadaists and Russian Constructivists of the early twentieth century, who
                        discovered that cutting images out of their original contexts and placing
                        them in new ones could produce meanings their sources never intended. That
                        discovery was itself political: it revealed that no image is neutral, that
                        every photograph is already an argument.
                      </p>
                      <p>
                        In the Korea of the 1980s, this technique acquired particular urgency.
                        Newspapers and magazines operated under strict state censorship; the visual
                        landscape of public life was shaped by a media apparatus that served
                        military power. Park&apos;s move was to take those same images — the glossy
                        surfaces through which power projected itself — and cut them apart. To take
                        the president&apos;s portrait and reassemble it into a new image; to take
                        the advertisement and splice it with the factory; to take the hero and show
                        the body behind the propaganda.
                      </p>
                      <p>
                        The resulting photomontages are then photographed and reprinted, producing
                        works in which the distinction between &ldquo;original&rdquo; and
                        &ldquo;reproduction&rdquo; is deliberately dissolved. The hand-made collage
                        is only a step; the final printed work is simultaneously original and copy.
                        In a society where the state controlled images and declared some of them
                        subversive, Park&apos;s insistence that there is no single original — that
                        images circulate, multiply, and can be seized by anyone — is itself an act
                        of defiance.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박불똥의 도구는 단순합니다: 가위, 풀, 인쇄된 페이지. 그 방법 — 포토몽타주 —
                        은 20세기 초 베를린 다다이스트와 러시아 구성주의자들로 거슬러 올라가는
                        계보를 갖습니다. 그들은 이미지를 원래의 맥락에서 잘라내어 새로운 맥락에
                        놓으면 원본이 결코 의도하지 않은 의미를 만들어낼 수 있음을 발견했습니다. 그
                        발견 자체가 정치적이었습니다: 어떤 이미지도 중립이 아니며, 모든 사진은 이미
                        하나의 주장이라는 것.
                      </p>
                      <p>
                        1980년대 한국에서 이 기법은 특별한 긴박함을 얻었습니다. 신문과 잡지는 엄격한
                        국가 검열 하에 운영됐고, 공적 삶의 시각적 풍경은 군사 권력에 복무하는 미디어
                        장치에 의해 형성됐습니다. 박불똥의 개입은 바로 그 이미지들을 — 권력이
                        스스로를 투사하는 광택 나는 표면들을 — 잘라내는 것이었습니다. 대통령의
                        초상을 가져다 새로운 이미지로 재조합하고, 광고를 공장과 이어 붙이고, 영웅을
                        가져다 그 프로파간다 뒤의 몸을 드러냅니다.
                      </p>
                      <p>
                        이렇게 만들어진 포토몽타주는 다시 사진으로 찍고 인화됩니다. 그 결과물에서
                        &lsquo;원본&rsquo;과 &lsquo;복제품&rsquo;의 구분은 의도적으로 해소됩니다.
                        손으로 만든 콜라주는 하나의 단계일 뿐이고, 최종 인화된 작품은 원본이자
                        동시에 복제품입니다. 국가가 이미지를 통제하고 그 중 일부를 이적으로 선언한
                        사회에서, 단일한 원본은 없다는 — 이미지는 유통되고 증식되며 누구나 장악할 수
                        있다는 — 박불똥의 고집은 그 자체로 저항 행위입니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 1985년, 그림마당 민에서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '1985 — the exhibition that could not be closed'
                    : '1985년 — 막을 수 없었던 전시'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the summer of 1985, a group of young Korean artists organized an
                        exhibition at the Arab Cultural Center in Seoul under the title{' '}
                        <em>Korean Art, The Power of the 20s</em>. Park Bul-ttong was among those
                        who planned and contributed works. The police entered the venue, confiscated
                        works on display, and arrested artists who protested the crackdown. It was
                        the first exhibition in the history of Korean art to be forcibly closed by
                        the state.
                      </p>
                      <p>
                        The suppression failed in its purpose. Soon afterward, the confrontation
                        catalyzed the founding of the Minjung Misul Hyeopuihoe (민족미술협의회) —
                        the National Artists&apos; Association — which became the organizational
                        backbone of the minjung art movement through the late 1980s. Park took part
                        in the movement and continued as a member of its successor associations: the
                        Korean Minjung Art Association (민족미술협회) and the Federation of Korean
                        Artists (민족예술인총연합회).
                      </p>
                      <p>
                        Through Geurimadang Min (그림마당 민) — the primary exhibition space of the
                        minjung art movement in Seoul — Park mounted three major solo shows in the
                        late 1980s and early 1990s: 〈Nunbit〉 (눈빛, 1985, Gwanhun Gallery),
                        〈Joljak〉 (졸작, 1987), and 〈Gyeolsa Bandae〉 (결사반대, 1989). Each title
                        carries a characteristic Park Bul-ttong ambiguity — &ldquo;mediocre
                        work,&rdquo; &ldquo;resolute opposition&rdquo; — that pairs self-deprecation
                        with political sharpness, collapsing the distance between the artist&apos;s
                        posture and the work&apos;s edge.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1985년 여름, 젊은 한국 작가들이 서울 아랍미술관에서 《한국미술, 20대의
                        힘》展을 기획했습니다. 박불똥은 그 기획에 참여하고 작품을 출품했습니다.
                        경찰이 전시장에 들이닥쳐 출품작을 압수하고 항의 작가들을 구속했습니다. 한국
                        미술사에서 공권력에 의해 강제로 막을 내린 최초의 전시였습니다.
                      </p>
                      <p>
                        탄압은 목적을 이루지 못했습니다. 곧이어 그 충돌은 민족미술협의회 창립의
                        계기가 됐습니다 — 1980년대 후반 민중미술 운동의 조직적 중추가 된 단체.
                        박불똥도 이 흐름에 함께했으며, 이후 민족미술협회, 민족예술인총연합회의
                        일원으로 활동을 이어왔습니다.
                      </p>
                      <p>
                        민중미술 운동의 핵심 전시 공간이었던 그림마당 민을 통해, 박불똥은 1980년대
                        후반과 1990년대 초 세 차례의 주요 개인전을 열었습니다: 〈눈빛展〉(1985,
                        관훈미술관), 〈졸작展〉(1987, 그림마당 민), 〈결사반대展〉(1989, 그림마당
                        민). 각 제목에는 박불똥 특유의 이중성이 담겨 있습니다 — &lsquo;졸작&rsquo;,
                        &lsquo;결사반대&rsquo; — 자조와 정치적 날카로움을 한데 담아, 작가의 자세와
                        작품의 날 사이의 거리를 무너뜨립니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 권력을 오려내다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Cutting out power — forty years of visual critique'
                    : '권력을 오려내다 — 40년의 시각 비평'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The targets of Park Bul-ttong&apos;s collages have remained consistent
                        across four decades: military dictatorship, the machinery of capital, and
                        the visual culture of mass media through which both project their power.
                        What distinguishes his approach from agitprop is the form itself — the
                        collage does not illustrate a political position; it enacts one. By
                        demonstrating that any image can be cut apart and made to mean something
                        different, it performs the act of critique rather than simply announcing it.
                      </p>
                      <p>
                        The 1992 solo exhibition 〈Confession on the Disability of Desire〉 (관능의
                        불구에 대한 자백) at Kumho Museum of Art marked a mature statement of this
                        method, bringing together the political and the psychic — desire,
                        censorship, and the body — within the collage frame. Subsequent major shows,
                        including 〈Alchemy of Daily Life〉 at the National Museum of Modern and
                        Contemporary Art in 2004, extended the practice into new registers:
                        consumerism, everyday routine, and the slow violence embedded in ordinary
                        visual life.
                      </p>
                      <p>
                        The retrospective 〈Park Bul-ttong 1985–2016〉 at Gallery 175 in 2016
                        gathered three decades of work and confirmed what critics and institutions
                        had already recognized: that the collage practice Park began in the years of
                        military rule had not been a response to a historical moment but a method
                        capable of addressing any moment in which images are used to manage
                        perception. The Seoul Museum of Art holds works from across his career as
                        part of its permanent collection — evidence that a practice born from
                        scissors and newspapers has earned its place in the documentary record of
                        Korean contemporary art.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        40년에 걸친 박불똥의 콜라주가 겨냥하는 대상은 일관됩니다: 군사독재, 자본의
                        기계장치, 그리고 그 둘이 권력을 투사하는 수단으로서의 대중매체 시각 문화.
                        그의 접근을 선전물(agitprop)과 구별 짓는 것은 형식 자체입니다 — 콜라주는
                        정치적 입장을 삽화로 설명하는 것이 아니라, 그 입장을 실행합니다. 어떤
                        이미지도 잘라내어 다른 의미를 갖게 만들 수 있음을 보여줌으로써, 단지 비평을
                        선언하는 것이 아니라 비평 행위 자체를 수행합니다.
                      </p>
                      <p>
                        1992년 금호미술관 개인전 〈관능의 불구에 대한 자백〉은 이 방법의 성숙한
                        선언이었습니다. 정치적인 것과 심리적인 것 — 욕망, 검열, 몸 — 을 콜라주의 틀
                        안으로 함께 끌어들였습니다. 이후 2004년 국립현대미술관의 〈일상의 연금술〉을
                        비롯한 주요 전시들은 이 실천을 새로운 영역으로 확장했습니다: 소비주의,
                        일상의 반복, 평범한 시각적 삶 속에 박힌 느린 폭력.
                      </p>
                      <p>
                        2016년 갤러리175에서 열린 회고전 〈박불똥, 1985–2016〉은 30년의 작업을
                        한자리에 모으며, 비평계와 기관들이 이미 인정한 것을 확인했습니다: 군사
                        통치의 시대에 시작된 박불똥의 콜라주 실천이 그 역사적 순간에 대한 반응이
                        아니라, 이미지로 인식을 관리하는 어떤 순간에도 적용 가능한 방법론이었다는
                        것. 서울시립미술관은 그의 경력 전반에 걸친 작품을 상설 소장하고 있습니다 —
                        가위와 신문에서 탄생한 실천이 한국 현대미술의 기록 안에 자리를 얻었음을
                        보여주는 증거입니다.
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
                      From the Arab Cultural Center in 1985 to the gallery walls of the present,
                      Park Bul-ttong&apos;s work has pursued a single question: what happens when
                      you take the image that power uses to speak, and cut it apart? The answer,
                      built across four decades of scissors and newsprint, is one of the most
                      sustained acts of visual criticism in Korean contemporary art. He joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those who come after might work without the pressures he has faced.
                    </>
                  ) : (
                    <>
                      1985년 아랍미술관에서 오늘의 갤러리 벽까지, 박불똥의 작업은 하나의 물음을
                      추구해 왔습니다: 권력이 말하는 데 쓰는 이미지를 잘라내면 어떤 일이 일어나는가.
                      가위와 신문지로 40년에 걸쳐 구축된 그 대답은 한국 현대미술에서 가장 지속적인
                      시각 비평의 실천 중 하나입니다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라,
                      동료 예술인과의 연대자로서 함께합니다 — 다음 세대의 예술인들이 그가 마주한
                      압력 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Park Bul-ttong
              </span>
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
                    Park Bul-ttong joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박불똥 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_BULDONG_PATH}
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
