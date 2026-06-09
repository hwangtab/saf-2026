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

// 작가 feature는 작가 페이지(/artworks/artist/라인석)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const RA_INSEOK_PATH = `/artworks/artist/${encodeURIComponent('라인석')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isRaInseokArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '라인석' ||
    n === 'ra inseok' ||
    n === 'ra in-seok' ||
    n.replace(/[\s-]+/g, '') === 'rainseok'
  );
};

const PAGE_COPY = {
  ko: {
    title: '라인석 — 반듯한 곡선, 휘어진 세계로부터',
    description:
      '순수 사진부터 사진을 매체로 한 시각예술까지 넘나드는 중견 작가 라인석. 인화지를 긁어 그 사이로 잉크가 스며들게 하는 촉각적 사진으로, 카메라에 포착된 직선을 곡선으로 보는 ‘반듯한 곡선’의 시선을 펼친다. 「TOUCH」·「사진은 세계를 만지고」·「휘어진 세계로부터」 연작을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '순수 사진과 시각예술을 넘나드는 작가 라인석. 인화지를 긁어 잉크가 스며드는 촉각적 사진으로, 휘어진 세계와 ‘반듯한 곡선’을 응시한다.',
    ogAlt: '라인석 대표 작품',
    twitterTitle: '라인석',
    twitterDescription: '직선을 곡선으로 보는 시선 — 「휘어진 세계로부터」의 작가 라인석',
    keywords:
      '라인석 사진가, 휘어진 세계로부터, TOUCH, 사진은 세계를 만지고, IMAGE2IMAGE, 촉각적 사진, 사진과 회화, 씨앗페 온라인',
  },
  en: {
    title: 'Ra Inseok — The Straight Curve, From a Bent World',
    description:
      'Selected works by Ra Inseok, a mid-career artist moving between pure photography and visual art that uses the photographic medium. By scratching the print so ink seeps through, he makes a tactile photography that lets us touch the texture of its subject — and sees the straight lines captured by the camera as curves, a vision he calls the “straight curve.” View his 〈TOUCH〉, 〈Photography Touches the World〉, and 〈From a Bent World〉 series at SAF Online.',
    ogDescription:
      'Ra Inseok — an artist between pure photography and visual art. A tactile photography in which ink seeps through a scratched print, gazing at a bent world and the “straight curve.”',
    ogAlt: 'Ra Inseok — featured work',
    twitterTitle: 'Ra Inseok',
    twitterDescription:
      'Seeing the straight line as a curve — Ra Inseok, artist of 〈From a Bent World〉',
    keywords:
      'Ra Inseok photographer, From a Bent World, TOUCH, Photography Touches the World, IMAGE2IMAGE, tactile photography, photography and painting',
  },
} as const;

export async function buildRaInseokMetadata({
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
  const pageUrl = buildLocaleUrl(RA_INSEOK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('라인석');
  const artwork = allArtworks.find((a) => isRaInseokArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ra Inseok`
      : `${artwork.title} — 라인석`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(RA_INSEOK_PATH, locale, true),
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

export default async function RaInseokFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(RA_INSEOK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('라인석');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isRaInseokArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Ra Inseok' : '라인석', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${RA_INSEOK_PATH}#person-ra-inseok`,
    name: isEnglish ? 'Ra Inseok' : '라인석',
    alternateName: isEnglish ? '라인석' : 'Ra Inseok',
    jobTitle: isEnglish ? 'Artist' : '사진가·시각예술가',
    description: isEnglish
      ? 'Ra Inseok is a Korean mid-career artist who moves between pure photography and visual art using the photographic medium. He scratches the print so that ink seeps through, making a tactile photography, and sees the straight lines captured by the camera as curves — a bent world.'
      : '라인석은 순수 사진부터 사진을 매체로 한 시각예술까지 넘나드는 중견 작가입니다. 인화지를 긁어 그 사이로 잉크가 스며들게 하는 촉각적 사진을 만들며, 카메라에 포착된 직선을 곡선으로 — 휘어진 세계로 — 바라봅니다.',
    knowsAbout: ['Photography', 'Visual art', 'Tactile photography'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ra Inseok — SAF Online' : '라인석 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Ra Inseok from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 라인석 작품들을 소개합니다.',
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
        {/* Hero Section — 휘어진 세계, 직선이 곡선이 되는 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 휘어진 곡선 — 직선이 휘어 보이는 모티프 */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.18]"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <path d="M0 22 Q 50 10 100 26" stroke="white" strokeWidth="0.3" fill="none" />
            <path d="M0 50 Q 50 40 100 54" stroke="#2176FF" strokeWidth="0.3" fill="none" />
            <path d="M0 78 Q 50 66 100 82" stroke="white" strokeWidth="0.3" fill="none" />
          </svg>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Ra Inseok' : '라인석'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The straight line is
                  <br />
                  <span className="text-primary-soft">a curve, bent by the world</span>
                </>
              ) : (
                <>
                  직선은 사실,
                  <br />
                  <span className="text-primary-soft">휘어진 세계의 곡선이다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">He scratches the print so ink seeps through.</span>
                  <span className="mt-2 block">
                    A photography you can almost touch — from a bent world.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">인화지를 긁어, 그 사이로 잉크가 스며든다.</span>
                  <span className="mt-2 block">손끝에 닿을 듯한 사진 — 휘어진 세계로부터.</span>
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
                    Photography that touches —<br />
                    <span className="text-primary-strong">
                      ink seeping through a scratched print
                    </span>
                  </>
                ) : (
                  <>
                    만지는 사진 —<br />
                    <span className="text-primary-strong">긁어낸 인화지 사이로 스미는 잉크</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Ra Inseok is a mid-career artist who moves between two registers: pure
                      photography, and a visual art that takes photography as its medium. He does
                      not treat the print as a finished, untouchable surface. Instead he works the
                      print itself — scratching the photographic paper so that ink seeps through the
                      openings he opens.
                    </p>
                    <p>
                      The aim is <strong className="font-bold text-charcoal-deep">touch</strong>: to
                      deliver the tactile sensation of the subject, not only its image. Where most
                      photography asks to be seen, his asks — through the worked, broken surface —
                      to be felt. The titles say as much: <em>TOUCH</em>,{' '}
                      <em>Photography Touches the World</em>, <em>CONTACT</em>.
                    </p>
                    <p>
                      Underneath the method lies a single idea about seeing. A straight line, he
                      proposes, is something the camera reports as straight — but the world it
                      belongs to is bent. What looks reliably straight is, on a longer view, a
                      curve. He calls it the{' '}
                      <strong className="font-bold text-charcoal">
                        &ldquo;straight curve.&rdquo;
                      </strong>{' '}
                      The line captured by the lens is a curve of a bent world.
                    </p>
                    <p>
                      This is also why his practice keeps crossing the border between photography
                      and painting. From the early <em>IMAGE2IMAGE</em> exhibitions through{' '}
                      <em>From a Bent World</em>, his work dismantles the line that is supposed to
                      separate the photographic from the painterly — and treats the photograph as a
                      surface to be worked, scratched, and made to hold ink.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      라인석은 두 영역을 넘나드는 중견 작가다. 순수 사진, 그리고 사진을 매체로 삼는
                      시각예술. 그는 인화지를 완결된, 손댈 수 없는 표면으로 다루지 않는다. 오히려
                      인화지 자체를 작업한다 — 사진 인화지를 긁어, 그가 연 틈 사이로 잉크가 스며들게
                      한다.
                    </p>
                    <p>
                      목표는 <strong className="font-bold text-charcoal-deep">촉감</strong>이다.
                      이미지뿐 아니라 피사체의 만져지는 감각을 전달하는 것. 대부분의 사진이 보이기를
                      청한다면, 그의 사진은 — 손댄, 깨진 표면을 통해 — 만져지기를 청한다. 제목들이
                      그것을 말한다: 「TOUCH」, 「사진은 세계를 만지고」, 「CONTACT」.
                    </p>
                    <p>
                      방법 아래에는 보는 일에 관한 하나의 생각이 놓여 있다. 직선이란 카메라가 곧다고
                      보고하는 무엇이지만, 그 직선이 속한 세계는 휘어 있다는 것. 반듯해 보이는 것은
                      더 긴 시야에서 보면 곡선이다. 그는 그것을{' '}
                      <strong className="font-bold text-charcoal">‘반듯한 곡선’</strong>이라 부른다.
                      렌즈에 포착된 직선은 휘어진 세계의 곡선이다.
                    </p>
                    <p>
                      그렇기에 그의 작업은 사진과 회화의 경계를 거듭 넘는다. 초기
                      「IMAGE2IMAGE」전부터 「휘어진 세계로부터」까지, 그의 작업은 사진적인 것과
                      회화적인 것을 가른다고 여겨지는 선을 해체한다 — 그리고 사진을, 작업하고
                      긁어내고 잉크를 머금게 하는 표면으로 다룬다.
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
                        {isEnglish ? 'Tactile photography' : '촉각적 사진'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'He scratches the print so ink seeps through — delivering the touch of the subject, not only its image.'
                          : '인화지를 긁어 잉크가 스며들게 한다. 이미지가 아니라 피사체의 촉감을 전달한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The straight curve' : '반듯한 곡선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A straight line captured by the camera is, on a longer view, a curve — the line of a bent world.'
                          : '카메라에 포착된 직선은 더 긴 시야에서 곡선이다 — 휘어진 세계의 선.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Dismantling the photo–painting border'
                          : '사진과 회화의 경계 해체'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From IMAGE2IMAGE onward, his work treats the photograph as a surface to be worked — between the photographic and the painterly.'
                          : 'IMAGE2IMAGE 이후, 그의 작업은 사진을 작업되는 표면으로 다루며 사진과 회화 사이를 넘나든다.'}
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
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈An Unfamiliar Day〉, Space Roo.'
                        : '개인전 「낯선 하루」, 공간 루.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈IMAGE2IMAGE〉, Gallery Yuki, Seoul.'
                        : '개인전 「IMAGE2IMAGE」, 갤러리 유키, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈IMAGE2IMAGE2〉, Gallery Yuki, Tokyo.'
                        : '개인전 「IMAGE2IMAGE2」, 갤러리 유키, 도쿄.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈CONTACT〉, Photographers Gallery Korea.'
                        : '개인전 「CONTACT」, 포토그래퍼스 갤러리 코리아.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈The Return of the Image — third story IMAGE2IMAGE〉, Space The In.'
                        : '개인전 「이미지의 귀환 third story IMAGE2IMAGE」, 공간더인.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈From the Event〉 (Gallery Guppy), 〈Photography Touches the World〉 (Photographers Gallery Korea), 〈TOUCH〉 (Gallery Bresson); publishes TOUCH and On Photography.'
                        : '개인전 「사건으로부터」(갤러리구피)·「사진은 세계를 만지고」(포토그래퍼스 갤러리 코리아)·「TOUCH」(갤러리 브레송); 《TOUCH》·《On Photography》 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈From a Bent World〉, Gallery Bresson, Seoul.'
                        : '개인전 「휘어진 세계로부터」, 갤러리 브레송, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions 〈GRAPHOS〉 (Bium Gallery), Incheon Open Port International Photo & Video Festival (15 Korean artists), 〈Contemporary Korea Photography〉 (Kim Young-sub Photo Gallery).'
                        : '단체전 「GRAPHOS」(비움 갤러리)·인천개항장 국제사진영상페스티벌 한국작가 15인전·「Contemporary Korea Photography」(김영섭사진화랑).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & publications' : '주요 전시 및 출판'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈From a Bent World〉 (Gallery Bresson, 2021) · 〈From the Event〉, 〈Photography Touches the World〉, 〈TOUCH〉 (2019) · 〈The Return of the Image — third story IMAGE2IMAGE〉 (Space The In, 2018) · 〈CONTACT〉 (Photographers Gallery Korea, 2015) · 〈IMAGE2IMAGE2〉 (Gallery Yuki, Tokyo, 2013) · 〈IMAGE2IMAGE〉 (Gallery Yuki, Seoul, 2012) · 〈An Unfamiliar Day〉 (Space Roo, 2009)'
                        : '개인전: 「휘어진 세계로부터」(갤러리 브레송, 2021) · 「사건으로부터」·「사진은 세계를 만지고」·「TOUCH」(2019) · 「이미지의 귀환 third story IMAGE2IMAGE」(공간더인, 2018) · 「CONTACT」(포토그래퍼스 갤러리 코리아, 2015) · 「IMAGE2IMAGE2」(갤러리 유키, 도쿄, 2013) · 「IMAGE2IMAGE」(갤러리 유키, 서울, 2012) · 「낯선 하루」(공간 루, 2009)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈GRAPHOS〉 (Bium Gallery, 2022), Incheon Open Port International Photo & Video Festival — 15 Korean Artists (2022), 〈Contemporary Korea Photography〉 (Kim Young-sub Photo Gallery, 2022), 〈Dismantling Boundaries: Between Photography and Painting〉 (Echolac Gallery, 2018), and others.'
                        : '단체전: 「GRAPHOS」(비움 갤러리, 2022), 인천개항장 국제사진영상페스티벌 한국작가 15인전(2022), 「Contemporary Korea Photography」(김영섭사진화랑, 2022), 「경계해체, 사진과 회화의 경계」(에코락 갤러리, 2018) 등 다수.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Publications: <em>TOUCH</em> (Namib Press, 2019), <em>On Photography</em>{' '}
                          (Noonbit Press, 2019)
                        </>
                      ) : (
                        <>
                          출판: 《TOUCH》(나미브 출판사, 2019), 《On Photography》(눈빛 출판사,
                          2019)
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
                  Two essays —
                  <br />
                  <span className="text-charcoal-deep">on touch and the bent line</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">촉감과 휘어진 선에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 만지는 사진 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Photography that touches — scratching the print'
                    : '만지는 사진 — 인화지를 긁다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A photograph is usually an image of a surface we cannot reach. Ra Inseok
                        wants the reverse: a surface we can almost touch. To get there he refuses to
                        leave the print intact. He scratches the photographic paper, opening it, and
                        lets ink seep through the openings — so that the picture carries not only
                        the look of its subject but something of its texture, its grain, its
                        resistance to the finger.
                      </p>
                      <p>
                        The series titles name the ambition directly — <em>TOUCH</em>,{' '}
                        <em>CONTACT</em>, <em>Photography Touches the World</em>. Each insists that
                        the photograph is not a window but a body: a worked, broken, ink-bearing
                        surface that meets the world by touching it. The image is no longer
                        something merely seen at a distance; it is something handled.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        사진은 대개 우리가 닿을 수 없는 표면의 이미지다. 라인석은 그 반대를 원한다.
                        손끝에 닿을 듯한 표면. 그곳에 이르기 위해 그는 인화지를 그대로 두기를
                        거부한다. 사진 인화지를 긁어 열고, 그 틈 사이로 잉크가 스미게 한다 — 그래서
                        사진이 피사체의 생김새뿐 아니라 그 질감을, 결을, 손가락에 걸리는 저항을
                        품도록.
                      </p>
                      <p>
                        연작의 제목들이 그 야심을 곧바로 말한다 — 「TOUCH」, 「CONTACT」, 「사진은
                        세계를 만지고」. 각각의 제목이 주장한다. 사진은 창이 아니라 몸이라고.
                        작업되고, 깨지고, 잉크를 머금은 표면이 세계를 만짐으로써 세계와 만난다고.
                        이미지는 더 이상 멀리서 보이기만 하는 무엇이 아니다. 그것은 만져지는
                        무엇이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 반듯한 곡선 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The straight curve — from a bent world'
                    : '반듯한 곡선 — 휘어진 세계로부터'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Beneath the tactile method runs a quiet argument about vision. The camera
                        reports a straight line as straight. But the world that line belongs to is
                        bent — by distance, by the curve of the earth, by the limits of the eye and
                        the lens. What we trust as straight is, taken far enough, a curve. Ra Inseok
                        calls this the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          &ldquo;straight curve&rdquo;
                        </strong>
                        : the line the camera captures is, in truth, a curve of a bent world.
                      </p>
                      <p>
                        The 〈From a Bent World〉 exhibition (Gallery Bresson, 2021) gathers this
                        thinking into a single proposition. To see clearly, for Ra, is not to
                        straighten the world into a grid but to admit its curvature — and to let the
                        photograph, that supposedly most reliable witness, register the bend. The
                        scratched surface and the bent line are two halves of the same idea: that
                        the truth of an image lies not in its flat fidelity but in what it lets us
                        feel and what it admits it cannot keep straight.
                      </p>
                      <p>
                        It is also why his work has kept dismantling the border between photography
                        and painting — most explicitly in the 〈Dismantling Boundaries: Between
                        Photography and Painting〉 exhibition. A medium that works its own surface,
                        that bends its own lines, no longer sits comfortably on one side of that
                        border.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        촉각적 방법 아래에는 보는 일에 관한 조용한 주장이 흐른다. 카메라는 직선을
                        곧다고 보고한다. 그러나 그 직선이 속한 세계는 휘어 있다 — 거리에 의해,
                        지구의 곡률에 의해, 눈과 렌즈의 한계에 의해. 우리가 곧다고 믿는 것은 충분히
                        멀리 가면 곡선이다. 라인석은 이를{' '}
                        <strong className="font-bold text-charcoal-deep">‘반듯한 곡선’</strong>이라
                        부른다. 카메라가 포착한 선은 사실 휘어진 세계의 곡선이다.
                      </p>
                      <p>
                        「휘어진 세계로부터」전(갤러리 브레송, 2021)은 이 생각을 하나의 명제로
                        모은다. 라인석에게 분명히 본다는 것은 세계를 격자로 펴는 일이 아니라 그
                        휘어짐을 인정하는 일이다 — 그리고 가장 믿을 만한 증인이라 여겨지는 사진으로
                        하여금 그 휘어짐을 기록하게 하는 일이다. 긁힌 표면과 휘어진 선은 같은 생각의
                        두 반쪽이다. 이미지의 진실은 평평한 충실함이 아니라, 그것이 무엇을 느끼게
                        하는가와 무엇을 곧게 지킬 수 없는지를 인정하는 데 있다는 생각.
                      </p>
                      <p>
                        그렇기에 그의 작업은 사진과 회화의 경계를 거듭 해체해 왔다 — 「경계해체,
                        사진과 회화의 경계」전에서 가장 분명하게. 제 표면을 작업하고 제 선을 휘게
                        하는 매체는, 더 이상 그 경계의 한쪽에 편안히 앉아 있지 않는다.
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
                      Between the scratched print and the bent line, Ra Inseok has built a body of
                      work that asks photography to be touched as much as seen — and to admit that
                      the straight world it records is, in truth, a curved one. He joins this
                      campaign in solidarity with fellow artists — so that the next generation might
                      keep working at the edges of their medium.
                    </>
                  ) : (
                    <>
                      긁힌 인화지와 휘어진 선 사이에서, 라인석은 사진이 보이는 만큼 만져지기를
                      청하는 작업을 — 그리고 사진이 기록하는 반듯한 세계가 사실은 휘어진 세계임을
                      인정하는 작업을 — 쌓아왔다. 그는 동료 예술인과의 연대의 뜻으로 씨앗페에
                      함께한다 — 다음 세대의 예술인들이 자신의 매체의 가장자리에서 계속 일할 수
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
                TOUCH
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Ra Inseok</span>
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
                    Ra Inseok joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    라인석 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={RA_INSEOK_PATH}
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
