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

// 신진 작가 feature는 작가 페이지(/artworks/artist/한미영)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const HAN_MIYEONG_PATH = `/artworks/artist/${encodeURIComponent('한미영')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isHanMiyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '한미영' ||
    n === 'han mi-yeong' ||
    n === 'han miyeong' ||
    n === 'han mi-young' ||
    n.replace(/[\s-]+/g, '') === 'hanmiyeong' ||
    n.replace(/[\s-]+/g, '') === 'hanmiyoung'
  );
};

const PAGE_COPY = {
  ko: {
    title: '한미영 — 일상의 정서를 옮겨 가는 회화의 신진 작가',
    description:
      '회화의 신선한 에너지로 일상의 정서를 옮겨 가는 신진 작가 한미영. 단국대학교 서양화과를 졸업하고 개인전 「Love All」, 다수의 단체전과 ASYAAF·제50회 구상전 공모대전 입상으로 작업을 이어 가고 있다. 동료 예술인과의 연대로 씨앗페에 함께한 한미영의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '회화의 신선한 에너지로 일상의 정서를 옮겨 가는 신진 작가 한미영. 단국대 서양화과 졸업, 개인전 「Love All」.',
    ogAlt: '한미영 대표 작품',
    twitterTitle: '한미영',
    twitterDescription: '일상의 정서를 옮겨 가는 회화의 신선한 에너지 — 신진 작가 한미영',
    keywords:
      '한미영 작가, 회화, 서양화, 신진 작가, Love All, ASYAAF, 구상전, 단국대학교 서양화과, 씨앗페 온라인',
  },
  en: {
    title: 'Han Miyeong — An Emerging Painter Carrying the Emotion of the Everyday',
    description:
      'Selected works by Han Miyeong, an emerging Korean painter who carries the emotion of the everyday with the fresh energy of painting. A graduate of the Department of Western Painting at Dankook University, she has continued her practice through the solo exhibition 〈Love All〉, numerous group shows, and selections at ASYAAF and the 50th Gusangjeon Open Competition. View and collect her works at SAF Online.',
    ogDescription:
      'An emerging painter who carries the emotion of the everyday with the fresh energy of painting — Han Miyeong. Dankook University, solo show 〈Love All〉.',
    ogAlt: 'Han Miyeong — featured work',
    twitterTitle: 'Han Miyeong',
    twitterDescription:
      'The fresh energy of painting, carrying the emotion of the everyday — emerging artist Han Miyeong',
    keywords:
      'Han Miyeong artist, Korean painting, Western painting, emerging artist, Love All, ASYAAF, Dankook University',
  },
} as const;

export async function buildHanMiyeongMetadata({
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
  const pageUrl = buildLocaleUrl(HAN_MIYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('한미영');
  const artwork = allArtworks.find((a) => isHanMiyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Han Miyeong`
      : `${artwork.title} — 한미영`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(HAN_MIYEONG_PATH, locale, true),
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

export default async function HanMiyeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(HAN_MIYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('한미영');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isHanMiyeongArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Han Miyeong' : '한미영', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${HAN_MIYEONG_PATH}#person-han-miyeong`,
    name: isEnglish ? 'Han Miyeong' : '한미영',
    alternateName: isEnglish ? '한미영' : 'Han Miyeong',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Han Miyeong is an emerging Korean painter who carries the emotion of the everyday with the fresh energy of painting. A graduate of the Department of Western Painting at Dankook University, she continues her practice through solo and group exhibitions.'
      : '한미영은 회화의 신선한 에너지로 일상의 정서를 옮겨 가는 신진 작가로, 단국대학교 서양화과를 졸업하고 개인전과 다수의 단체전으로 작업을 이어 가고 있습니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Dankook University, Dept. of Western Painting' : '단국대학교 서양화과',
    },
    knowsAbout: isEnglish
      ? ['Korean painting', 'Western painting', 'The emotion of the everyday']
      : ['회화', '서양화', '일상의 정서'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Han Miyeong — SAF Online' : '한미영 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Han Miyeong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 한미영 작품들을 소개합니다.',
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

          {/* Fresh diagonal strokes — 회화의 신선한 에너지 모티프 */}
          <div className="absolute -left-10 top-1/4 h-px w-2/3 rotate-6 bg-white/10" />
          <div className="absolute right-0 top-1/2 h-px w-1/2 -rotate-6 bg-primary/25" />
          <div className="absolute -right-10 bottom-1/4 h-px w-2/3 rotate-3 bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Han Miyeong · Painter' : '한미영 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The fresh energy
                  <br />
                  <span className="text-primary-soft">of the everyday</span>
                </>
              ) : (
                <>
                  일상의 정서를 옮기는
                  <br />
                  <span className="text-primary-soft">회화의 신선한 에너지</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She moves the emotion of daily life onto the canvas.
                  </span>
                  <span className="mt-2 block">
                    An emerging painter, carrying the everyday with a fresh hand.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">일상의 정서를 화면 위로 옮겨 오다.</span>
                  <span className="mt-2 block">
                    신선한 손길로 매일의 마음을 그려 가는 신진 작가.
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
                    The everyday, painted —<br />
                    <span className="text-primary-strong">an emotion carried onto canvas</span>
                  </>
                ) : (
                  <>
                    그려진 일상 —<br />
                    <span className="text-primary-strong">화면으로 옮겨 온 정서</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Han Miyeong is an emerging painter who carries the emotion of daily life onto
                      the canvas with the fresh energy of painting. She studied in the Department of
                      Western Painting at Dankook University, and around her graduation she
                      presented the graduation exhibition 〈ON AIR〉 — an early marker of a practice
                      grounded in the textures of the everyday.
                    </p>
                    <p>
                      In 2024 she held her first solo exhibition, 〈Love All〉, supported by the
                      Guro-gu Cheongnyeon-iroom program for young artists. The title carries the
                      generous register of her work: a gaze that holds the ordinary without
                      judgment, finding in it something worth keeping.
                    </p>
                    <p>
                      Her practice has continued to widen through group exhibitions. In 2025 she
                      showed at MEDEL GALLERY, SHU X GALLERY, and VINCI, took part in the Mullae art
                      fair, and joined{' '}
                      <em>〈A Circulating Gap — When Everything Vanished, Only ○○ Remained〉</em> —
                      a series of group settings in which her paintings sit alongside the work of
                      her peers.
                    </p>
                    <p>
                      She has also continued to test her work in open competitions. In 2023 she was
                      selected for <strong className="font-bold text-charcoal-deep">ASYAAF</strong>,
                      the platform for young and emerging artists, and she received an award at the{' '}
                      <strong className="font-bold text-charcoal">
                        50th Gusangjeon Open Competition (Seoul)
                      </strong>
                      . For an artist this early in her career, the record reads less as a résumé
                      than as momentum — the steady accumulation of a hand still finding its full
                      range.
                    </p>
                    <p>
                      Han Miyeong joins SAF not as a subject of its cause but as a fellow artist in
                      solidarity. Her presence here is a wager on possibility: that the fresh energy
                      of a beginning carries its own kind of value, and that putting a work forward
                      can become support for another artist navigating financial exclusion today.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      한미영은 회화의 신선한 에너지로 일상의 정서를 화면 위로 옮겨 가는 신진 작가다.
                      단국대학교 서양화과에서 수학했으며, 졸업 무렵 졸업전시 「ON AIR」를 선보였다 —
                      일상의 질감에 뿌리를 둔 작업의 이른 표식.
                    </p>
                    <p>
                      2024년에는 구로구 청년이룸 지원으로 첫 개인전 「Love All」을 열었다. 그 제목은
                      그의 작업이 지닌 너그러운 음역을 품고 있다 — 평범한 것을 판단 없이 바라보고,
                      그 안에서 간직할 만한 무언가를 발견하는 시선.
                    </p>
                    <p>
                      그의 작업은 단체전을 통해 꾸준히 폭을 넓혀 왔다. 2025년에는 MEDEL GALLERY·SHU
                      X GALLERY·VINCI에서 작품을 선보이고, 문래 아트페어에 참여했으며,{' '}
                      <em>「순환 틈 — 모든 게 사라지고 ○○만 남았다」</em>에도 함께했다 — 동료들의
                      작업 곁에 그의 회화가 나란히 놓이는 자리들.
                    </p>
                    <p>
                      공모전을 통해서도 작업을 시험해 왔다. 2023년 신진·청년 작가의 무대인{' '}
                      <strong className="font-bold text-charcoal-deep">ASYAAF</strong>에 선정되었고,{' '}
                      <strong className="font-bold text-charcoal">
                        제50회 구상전 공모대전 서울
                      </strong>
                      에서 입상했다. 경력의 이른 시점에 선 작가에게 이 기록은 이력이라기보다
                      추진력으로 읽힌다 — 아직 자기 폭을 찾아가는 손의 꾸준한 축적.
                    </p>
                    <p>
                      한미영은 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다. 이곳에 선 그의 자리는 가능성에 거는 한 표다 — 시작의 신선한 에너지가
                      그 나름의 가치를 지니며, 작품 한 점을 내놓는 일이 오늘 금융 차별을 겪는 또
                      다른 예술인에게 보탬이 될 수 있다는 믿음.
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
                        {isEnglish ? 'The emotion of the everyday' : '일상의 정서'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Ordinary feeling, held without judgment and carried onto the canvas — the daily as a worthy subject.'
                          : '평범한 마음을 판단 없이 바라보고 화면 위로 옮긴다. 일상을 그릴 만한 주제로 삼는 시선.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The fresh energy of painting' : '회화의 신선한 에너지'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A hand still finding its full range — the openness and momentum particular to a beginning.'
                          : '아직 자기 폭을 찾아가는 손. 시작에 특유한 열림과 추진력이 화면에 실린다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'A generous gaze' : '너그러운 시선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In the spirit of 〈Love All〉 — finding in the ordinary something worth keeping.'
                          : '「Love All」의 정신 — 평범한 것 안에서 간직할 만한 무언가를 발견한다.'}
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
                      B.F.A.
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Western Painting, Dankook University; presents the graduation exhibition 〈ON AIR〉.'
                        : '단국대학교 서양화과 졸업, 졸업전시 「ON AIR」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected for ASYAAF; award at the 50th Gusangjeon Open Competition, Seoul.'
                        : 'ASYAAF 선정, 제50회 구상전 공모대전 서울 입상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Love All〉, supported by the Guro-gu Cheongnyeon-iroom program for young artists.'
                        : '구로구 청년이룸 지원 개인전 「Love All」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows at MEDEL GALLERY, SHU X GALLERY, and VINCI; the Mullae art fair; 〈A Circulating Gap — When Everything Vanished, Only ○○ Remained〉.'
                        : '단체전: MEDEL GALLERY·SHU X GALLERY·VINCI, 문래 아트페어, 「순환 틈 — 모든 게 사라지고 ○○만 남았다」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in the SAF (Seed Art Festival) exhibition.'
                        : '씨앗페 전시 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & awards' : '주요 전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo exhibition: <em>Love All</em>, Guro-gu Cheongnyeon-iroom support
                          (2024)
                        </>
                      ) : (
                        <>개인전: 「Love All」, 구로구 청년이룸 지원 (2024)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Graduation exhibition: <em>ON AIR</em>, Dankook University, Dept. of
                          Western Painting
                        </>
                      ) : (
                        <>졸업전시: 「ON AIR」, 단국대학교 서양화과</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibitions: MEDEL GALLERY, SHU X GALLERY, VINCI; Mullae art fair;{' '}
                          <em>A Circulating Gap — When Everything Vanished, Only ○○ Remained</em>{' '}
                          (2025)
                        </>
                      ) : (
                        <>
                          단체전: MEDEL GALLERY·SHU X GALLERY·VINCI, 문래 아트페어, 「순환 틈 — 모든
                          게 사라지고 ○○만 남았다」 (2025)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'ASYAAF selected artist (2023)' : 'ASYAAF 선정작가 (2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award, 50th Gusangjeon Open Competition, Seoul (2023)'
                        : '제50회 구상전 공모대전 서울 입상 (2023)'}
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
                    on the everyday, energy, and beginnings
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">일상과 에너지, 그리고 시작에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 일상의 정서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The emotion of the everyday — a subject worth painting'
                    : '일상의 정서 — 그릴 만한 주제'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        At the centre of Han Miyeong&apos;s practice is a simple, quietly radical
                        premise: that the emotion of daily life is worth painting. Not the grand
                        event or the singular scene, but the ordinary feeling that passes through a
                        day — this is what she carries onto the canvas with the fresh energy of
                        painting.
                      </p>
                      <p>
                        To take the everyday seriously is its own kind of stance. It asks the
                        painter to look at what is usually overlooked and to hold it long enough for
                        its emotion to surface. In Han Miyeong&apos;s work, the ordinary is not a
                        backdrop but the subject itself — kept, attended to, and given the dignity
                        of being seen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        한미영 작업의 중심에는 단순하지만 조용히 급진적인 전제가 있다 — 일상의
                        정서는 그릴 만한 것이라는 믿음. 거창한 사건이나 단 하나의 장면이 아니라,
                        하루를 스쳐 가는 평범한 마음 — 그것을 그는 회화의 신선한 에너지로 화면 위에
                        옮긴다.
                      </p>
                      <p>
                        일상을 진지하게 다루는 일은 그 자체로 하나의 태도다. 그것은 작가에게 흔히
                        지나치는 것을 바라보고, 그 정서가 떠오를 만큼 충분히 머물기를 요구한다.
                        한미영의 작업에서 일상은 배경이 아니라 주제 그 자체다 — 간직되고, 응시되며,
                        보일 자격을 부여받는 대상.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 신선한 에너지 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'The fresh energy of a beginning' : '시작의 신선한 에너지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        There is a particular charge to the work of an artist still near the
                        beginning — a hand still finding the full extent of its range, a vocabulary
                        still opening. Rather than a settled signature, the early work carries
                        momentum: the sense of a practice in motion, reaching.
                      </p>
                      <p>
                        Han Miyeong&apos;s record reads in exactly this register. The graduation
                        show 〈ON AIR〉, the first solo 〈Love All〉, the run of group exhibitions
                        across 2025, the selections at ASYAAF and the Gusangjeon competition — taken
                        together, these are less a résumé than a trajectory. They mark the steady
                        accumulation of a painter testing her work, widening her field, and
                        gathering the freshness that belongs to a beginning into something durable.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        시작에 가까운 작가의 작업에는 특유의 전류가 흐른다 — 아직 자기 폭을 온전히
                        찾아가는 손, 아직 열리고 있는 어휘. 정착된 서명이 아니라, 초기의 작업은
                        추진력을 품는다. 움직이며 뻗어 가는 작업의 감각.
                      </p>
                      <p>
                        한미영의 기록은 바로 이 음역에서 읽힌다. 졸업전시 「ON AIR」, 첫 개인전
                        「Love All」, 2025년의 연이은 단체전, ASYAAF와 구상전 공모대전의 선정과 입상
                        — 이것들을 함께 두면 이력이라기보다 궤적이다. 작품을 시험하고, 자기 영역을
                        넓히며, 시작에 속한 신선함을 지속 가능한 무언가로 모아 가는 화가의 꾸준한
                        축적을 표시한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Love All — 연대의 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈Love All〉 — a generous gaze, a place of solidarity'
                    : '「Love All」 — 너그러운 시선, 연대의 자리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of her first solo exhibition, 〈Love All〉, carries the generous
                        register that runs through her work: a gaze that holds the ordinary without
                        judgment, finding in it something worth keeping. To love all is, in a sense,
                        to refuse to rank the everyday — to grant the small and the overlooked the
                        same regard as the singular.
                      </p>
                      <p>
                        That ethic of regard finds a natural extension in her decision to join SAF.
                        She takes part not as a subject of the campaign&apos;s cause but as a fellow
                        artist standing in solidarity. Every work sold here flows into the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          artists&apos; mutual-aid loan fund
                        </strong>
                        , so that putting a painting forward becomes direct support for another
                        artist navigating financial exclusion today. In a beginning offered to
                        others, the generosity of 〈Love All〉 becomes a structure as well as a
                        feeling.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        첫 개인전의 제목 「Love All」은 그의 작업을 관통하는 너그러운 음역을 품고
                        있다 — 평범한 것을 판단 없이 바라보고, 그 안에서 간직할 만한 무언가를
                        발견하는 시선. 모두를 사랑한다는 것은 어떤 의미에서 일상에 등급을 매기기를
                        거부하는 일이다 — 작고 지나치기 쉬운 것에 단 하나의 것과 똑같은 응시를
                        건네는 일.
                      </p>
                      <p>
                        이 응시의 윤리는 씨앗페에 함께하기로 한 그의 선택에서 자연스러운 연장을
                        찾는다. 그는 캠페인의 대상으로서가 아니라, 연대하는 동료 예술인으로서
                        참여한다. 이곳에서 판매되는 작품은 전액{' '}
                        <strong className="font-bold text-charcoal-deep">
                          예술인 상호부조 대출 기금
                        </strong>
                        으로 이어진다. 그래서 그림 한 점을 내놓는 일이 오늘 금융 차별을 겪는 또 다른
                        예술인에게 직접적인 보탬이 된다. 타인에게 건네진 시작 안에서, 「Love All」의
                        너그러움은 감정인 동시에 하나의 구조가 된다.
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
                      From her graduation exhibition to her recent group shows, Han Miyeong&apos;s
                      work has pursued a single, fresh question: how does one carry the emotion of
                      the everyday onto the canvas? The answer, built work by work, is a painting
                      practice attentive to the texture of daily life and open to where it might
                      lead. She joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that those who come after might work with a little
                      less of the weight that financial exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      졸업전시부터 최근의 단체전까지, 한미영의 작업은 하나의 신선한 물음을 추구해
                      왔다 — 일상의 정서를 어떻게 화면 위로 옮길 것인가. 한 점 한 점 쌓아 올린
                      대답이 일상의 질감에 주의를 기울이고 그 향방에 열려 있는 회화의 작업이다. 그는
                      씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 다음 세대의 예술인들이 한국 예술인에게 지워진 금융 차별의 무게를 조금이라도
                      덜 짊어진 채 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Han Miyeong</span>
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
                    Han Miyeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    한미영 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={HAN_MIYEONG_PATH}
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
