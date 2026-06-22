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

// 작가 feature는 작가 페이지(/artworks/artist/백금아)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const BAEK_GEUMA_PATH = `/artworks/artist/${encodeURIComponent('백금아')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isBaekGeumaArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '백금아' ||
    n === 'baek geuma' ||
    n === 'baek geum-a' ||
    n === 'baek geum a' ||
    n.replace(/[\s-]+/g, '') === 'baekgeuma'
  );
};

const PAGE_COPY = {
  ko: {
    title: '백금아 — 물과 빛으로 한국을 기록하는 수채화가',
    description:
      '투명한 물의 번짐과 빛으로 한국의 자연·신화·일상을 기록하는 수채화가 백금아. 한국수채화협회에서 오래 활동하며 제주신화전, 예술인협동조합전 등 다수의 단체전·기획전에 참여해 왔다. 수채라는 매체의 즉흥성과 투명함으로 그려낸 백금아의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '물과 빛의 화가 백금아 — 투명한 수채로 한국의 자연·신화·일상을 기록하는 한국수채화협회 작가.',
    ogAlt: '백금아 대표 작품',
    twitterTitle: '백금아',
    twitterDescription: '물과 빛으로 한국을 기록하다 — 수채화가 백금아',
    keywords:
      '백금아 작가, 수채화, 한국수채화협회, 제주신화전, 예술인협동조합, 물의 번짐, 씨앗페 온라인',
  },
  en: {
    title: 'Baek Geuma — A Watercolorist Recording Korea in Water and Light',
    description:
      'Selected works by Baek Geuma, a watercolorist who records the nature, myth, and daily life of Korea through the transparent bleed of water and light. A longtime member of the Korean Watercolor Association, she has taken part in many group and curated exhibitions, including the Jeju Myth Exhibition and the Artists’ Cooperative Exhibition. View and collect her works at SAF Online.',
    ogDescription:
      'Baek Geuma, painter of water and light — recording the nature, myth, and daily life of Korea in transparent watercolor.',
    ogAlt: 'Baek Geuma — featured work',
    twitterTitle: 'Baek Geuma',
    twitterDescription: 'Recording Korea in water and light — the watercolorist Baek Geuma',
    keywords:
      'Baek Geuma artist, watercolor, Korean Watercolor Association, Jeju myth, transparency, Korean painting',
  },
} as const;

export async function buildBaekGeumaMetadata({
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
  const pageUrl = buildLocaleUrl(BAEK_GEUMA_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('백금아');
  const artwork = allArtworks.find((a) => isBaekGeumaArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Baek Geuma`
      : `${artwork.title} — 백금아`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(BAEK_GEUMA_PATH, locale, true),
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

export default async function BaekGeumaFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(BAEK_GEUMA_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('백금아');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isBaekGeumaArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Baek Geuma' : '백금아', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${BAEK_GEUMA_PATH}#person-baek-geuma`,
    name: isEnglish ? 'Baek Geuma' : '백금아',
    alternateName: isEnglish ? '백금아' : 'Baek Geuma',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Baek Geuma is a Korean watercolorist who records the nature, myth, and daily life of Korea through the transparent bleed of water and light, and a longtime member of the Korean Watercolor Association.'
      : '백금아는 투명한 물의 번짐과 빛으로 한국의 자연·신화·일상을 기록하는 수채화가이자 한국수채화협회에서 오래 활동해 온 작가입니다.',
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Korean Watercolor Association' : '한국수채화협회',
    },
    knowsAbout: isEnglish
      ? ['Watercolor painting', 'Korean nature and myth', 'Transparency and light']
      : ['수채화', '한국의 자연과 신화', '투명함과 빛'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Baek Geuma — SAF Online' : '백금아 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Baek Geuma from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 백금아 작품을 소개합니다.',
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

          {/* Soft watercolor washes — 물의 번짐 모티프 */}
          <div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/20" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Baek Geuma · Watercolor' : '백금아 · 수채화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Water remembers
                  <br />
                  <span className="text-primary-soft">what light touches</span>
                </>
              ) : (
                <>
                  물은 빛이 닿은 것을
                  <br />
                  <span className="text-primary-soft">기억한다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">She lets water carry the pigment where it will.</span>
                  <span className="mt-2 block">
                    The nature, myth, and daily life of Korea, recorded in transparent watercolor.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">물이 안료를 데려가는 자리에 그림을 맡기다.</span>
                  <span className="mt-2 block">
                    한국의 자연·신화·일상을 투명한 수채로 기록하다.
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
                    Transparent water —<br />
                    <span className="text-primary-strong">a record of light and time</span>
                  </>
                ) : (
                  <>
                    투명한 물 —<br />
                    <span className="text-primary-strong">빛과 시간의 기록</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Baek Geuma is a watercolorist who has long worked within the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Korean Watercolor Association
                      </strong>
                      , taking part in its annual exhibitions across many years. Her medium is water
                      itself — the transparent, mobile material that few painters trust so fully,
                      because it cannot be fully controlled.
                    </p>
                    <p>
                      Where opaque paint can be corrected and built up, watercolor must be allowed
                      to do part of the work on its own. Pigment travels into wet paper and pools
                      where it will; light passes through the thin washes and reflects back off the
                      white of the page. Baek Geuma works with this rather than against it, treating
                      the bleed and the accident as collaborators rather than mistakes.
                    </p>
                    <p>
                      Her subjects are drawn from{' '}
                      <strong className="font-bold text-charcoal">
                        the nature, myth, and daily life of Korea
                      </strong>
                      . Across the years she has shown her work in a steady run of group and curated
                      exhibitions — a three-person show at Nori Gallery (2014), the Korean
                      Watercolor Association exhibitions (2010–2018), and, more recently, the Jeju
                      Myth Exhibition (2023–25) and the Artists’ Cooperative Exhibition (2024–25).
                      She has also held a solo exhibition of her own.
                    </p>
                    <p>
                      What links these subjects is a single attitude: to record rather than to
                      seize. A myth, a landscape, an ordinary afternoon — each is something that
                      moves and fades, and watercolor is the medium of exactly that. It holds a
                      moment lightly, in tones of water that will never harden into permanence, and
                      that lightness is the point.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      백금아는 오랫동안{' '}
                      <strong className="font-bold text-charcoal-deep">한국수채화협회</strong>에서
                      활동하며 여러 해에 걸쳐 협회전에 참여해 온 수채화가다. 그의 매체는 물 그 자체
                      — 투명하고 흘러가는, 온전히 통제할 수 없기에 많은 화가가 그만큼 깊이
                      신뢰하지는 못하는 재료다.
                    </p>
                    <p>
                      불투명한 물감이 덧칠하고 고쳐 쌓을 수 있는 것과 달리, 수채는 그림의 일부를
                      재료 스스로에게 맡겨야 한다. 안료는 젖은 종이 속을 따라 번지며 제 가고 싶은
                      자리에 고이고, 빛은 옅은 물감 층을 통과해 종이의 흰 바탕에서 되비친다.
                      백금아는 이 성질을 거스르지 않고 함께 간다 — 번짐과 우연을 실수가 아니라
                      협력자로 받아들이면서.
                    </p>
                    <p>
                      그의 소재는{' '}
                      <strong className="font-bold text-charcoal">한국의 자연·신화·일상</strong>
                      에서 길어 올린 것이다. 여러 해에 걸쳐 그는 꾸준한 단체전·기획전으로 작품을
                      선보여 왔다 — 노리갤러리 3인전(2014), 한국수채화협회전(2010–2018), 그리고
                      비교적 근래의 제주신화전(2023–25)과 예술인협동조합전(2024–25). 개인전도 한
                      차례 열었다.
                    </p>
                    <p>
                      이 소재들을 잇는 것은 하나의 태도다 — 붙드는 것이 아니라 기록하는 것. 신화 한
                      자락, 풍경 하나, 평범한 어느 오후 — 모두 움직이고 흐려지는 것들이며, 수채는
                      바로 그런 것을 위한 매체다. 결코 단단한 영속으로 굳지 않을 물의 톤으로 한
                      순간을 가볍게 쥐는 것, 그 가벼움이 곧 핵심이다.
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
                        {isEnglish ? 'The transparency of water' : '물의 투명함'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Thin washes that let the white of the paper shine through — light is not added but allowed to pass.'
                          : '종이의 흰 바탕이 비쳐 나오는 옅은 물감 층. 빛은 칠해지는 것이 아니라 통과하도록 둔다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The bleed and the unplanned' : '번짐과 즉흥'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Pigment travels into wet paper of its own accord — the accident is treated as a collaborator, not a flaw.'
                          : '안료가 젖은 종이를 따라 스스로 번져 가는 자리. 우연은 결함이 아니라 협력자로 받아들여진다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Korea — nature, myth, daily life' : '한국 — 자연·신화·일상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From Jeju myth to ordinary afternoons — recording what moves and fades rather than seizing it.'
                          : '제주의 신화부터 평범한 오후까지. 움직이고 흐려지는 것을 붙들기보다 기록한다.'}
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
                      2010–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Takes part in the Korean Watercolor Association exhibitions (through 2018).'
                        : '한국수채화협회전 참여(~2018).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Three-person exhibition at Nori Gallery.' : '노리갤러리 3인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Holds a solo exhibition of her own work.'
                        : '백금아 개인전 개최.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Takes part in the Jeju Myth Exhibition (through 2025).'
                        : '제주신화전 참여(~2025).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Takes part in the Artists’ Cooperative Exhibition (through 2025).'
                        : '예술인협동조합전 참여(~2025).'}
                    </span>
                  </li>
                </ol>
                <p className="mt-5 text-sm text-charcoal-soft leading-relaxed break-keep">
                  {isEnglish
                    ? 'And numerous other group and curated exhibitions.'
                    : '그 외 다수의 단체전·기획전 참여.'}
                </p>
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
                        ? 'Three-person exhibition, Nori Gallery (2014)'
                        : '노리갤러리 3인전 (2014)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Korean Watercolor Association exhibitions (2010–2018)'
                        : '한국수채화협회전 (2010–2018)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Solo exhibition by the artist' : '백금아 개인전'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Jeju Myth Exhibition (2023–25)' : '제주신화전 (2023–25)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Artists’ Cooperative Exhibition (2024–25), and numerous other group and curated shows'
                        : '예술인협동조합전 (2024–25) 외 다수의 단체전·기획전'}
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
                  <span className="text-charcoal-deep">on water, myth, and solidarity</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">물과 신화, 그리고 연대에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 수채라는 매체 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Watercolor — trusting the material'
                    : '수채라는 매체 — 재료를 신뢰한다는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Watercolor is the least forgiving of painting media, and that is its
                        discipline. Oil and acrylic can be reworked, scraped back, painted over.
                        Watercolor cannot. A wash, once laid on the paper, is there for good; the
                        painter must decide in advance how much water, how much pigment, and then
                        let the material finish the sentence.
                      </p>
                      <p>
                        Baek Geuma&apos;s practice rests on this acceptance. She does not fight the
                        bleed of pigment into wet paper but reads it, anticipating where the water
                        will pool and where the white of the page should be left to breathe. The
                        result is an image built as much from restraint as from mark — the empty
                        paper doing as much work as the painted area.
                      </p>
                      <p>
                        Working over years within the Korean Watercolor Association, she has refined
                        this trust into a settled language. Transparency is not a limitation she
                        tolerates but the very thing she is after: a way of painting in which light
                        is never opaque, and the surface always remembers the water that made it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        수채는 회화 매체 가운데 가장 너그럽지 않은 재료이고, 바로 그것이 수채의
                        규율이다. 유화와 아크릴은 다시 손보고, 긁어내고, 덧칠할 수 있다. 수채는 그럴
                        수 없다. 종이에 한번 올린 물감은 그대로 남는다. 화가는 물의 양과 안료의 양을
                        미리 정한 뒤, 나머지 문장은 재료가 끝맺도록 맡겨야 한다.
                      </p>
                      <p>
                        백금아의 작업은 이 받아들임 위에 선다. 그는 젖은 종이로 번지는 안료와 싸우지
                        않고 그것을 읽는다 — 물이 어디에 고일지, 종이의 흰 바탕을 어디에 숨 쉬도록
                        남길지를 미리 헤아리면서. 그렇게 한 화면은 칠한 자리만큼이나 절제로
                        지어진다. 비워 둔 종이가 그려진 부분만큼 일을 한다.
                      </p>
                      <p>
                        한국수채화협회 안에서 여러 해를 거치며, 그는 이 신뢰를 하나의 정착된 언어로
                        다듬어 왔다. 투명함은 그가 감내하는 한계가 아니라 그가 바로 추구하는 것이다
                        — 빛이 결코 불투명해지지 않는 그리기의 방식, 표면이 언제나 자신을 만든 물을
                        기억하는 방식.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 자연·신화·일상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Nature, myth, daily life — what Korea looks like in water'
                    : '자연·신화·일상 — 물로 그린 한국'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Baek Geuma&apos;s subjects gather around a single country and its layers of
                        meaning: the nature of Korea, its myths, and the texture of its ordinary
                        days. These are not separate categories but a continuum — the land that
                        holds the myth, the myth that shapes the day, the day that returns to the
                        land.
                      </p>
                      <p>
                        Her participation in the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          Jeju Myth Exhibition (2023–25)
                        </strong>{' '}
                        sits naturally within this. Jeju&apos;s mythology — its founding goddesses
                        and the spirits of wind and sea — is among the richest in Korea, and
                        watercolor is well suited to it: a body of belief that is fluid, handed down
                        and reshaped, never fixed. To paint a myth in transparent washes is to
                        render it as it actually exists in memory, half-seen and shifting.
                      </p>
                      <p>
                        Alongside the mythic, the everyday recurs. An ordinary afternoon carries the
                        same fragility as a fading legend — both are moments that pass. By treating
                        nature, myth, and daily life with the same light hand, she proposes that the
                        ordinary is no less worth recording than the sacred, and that water is the
                        honest medium for both.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        백금아의 소재는 하나의 나라와 그 의미의 층위들 주위로 모인다 — 한국의 자연,
                        그 신화, 그리고 평범한 나날의 질감. 이것들은 분리된 범주가 아니라 하나의
                        연속이다. 신화를 품은 땅, 하루를 빚는 신화, 다시 땅으로 돌아가는 하루.
                      </p>
                      <p>
                        그가 참여한{' '}
                        <strong className="font-bold text-charcoal-deep">
                          제주신화전(2023–25)
                        </strong>
                        은 이 안에 자연스럽게 놓인다. 제주의 신화 — 창조의 여신들과 바람과 바다의
                        신령들 — 은 한국에서 가장 풍성한 신화 가운데 하나이며, 수채는 거기에 잘
                        어울린다. 유동하고, 전해지며 다시 빚어지고, 결코 고정되지 않는 믿음의
                        체계이기에. 신화를 투명한 물감으로 그린다는 것은, 반쯤 보이고 계속 흔들리는
                        기억 속 실제 모습 그대로 신화를 옮기는 일이다.
                      </p>
                      <p>
                        신화 곁에는 일상이 되돌아온다. 평범한 어느 오후는 흐려져 가는 전설과 같은
                        연약함을 지닌다 — 둘 다 지나가는 순간이다. 자연과 신화와 일상을 같은 가벼운
                        손길로 다룸으로써, 그는 평범한 것이 신성한 것 못지않게 기록할 가치가 있으며,
                        물이 그 둘 모두를 위한 정직한 매체라고 말한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 협동조합과 연대 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Cooperative and solidarity — painting among others'
                    : '협동조합과 연대 — 함께 그린다는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Baek Geuma&apos;s recent record includes the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          Artists’ Cooperative Exhibition (2024–25)
                        </strong>
                        . It is a small detail, but a telling one: a watercolorist whose exhibition
                        life has run through associations and cooperatives rather than the solitary
                        studio alone. To take part in a cooperative show is already to practice a
                        kind of solidarity — to put one&apos;s work beside others&apos; and share
                        the room.
                      </p>
                      <p>
                        That disposition is what brings her to this campaign. She joins SAF not as a
                        subject of its cause — not as an artist in need of rescue — but as a fellow
                        artist in solidarity with others who face the financial exclusion that
                        Korean artists so often meet. The same instinct that fills a cooperative
                        exhibition fills this one: the conviction that artists are stronger standing
                        together.
                      </p>
                      <p>
                        In this light, the lightness of her watercolor takes on a second meaning. A
                        wash of water is given freely to the paper; a painting is given freely to
                        the campaign. What the water does on the page — travel where it is needed,
                        settle where it can do good — is what she asks her work to do in the world.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        백금아의 근래 이력에는{' '}
                        <strong className="font-bold text-charcoal-deep">
                          예술인협동조합전(2024–25)
                        </strong>
                        이 들어 있다. 작지만 분명한 의미가 있다 — 고독한 작업실만이 아니라 협회와
                        협동조합을 통해 전시의 삶을 이어 온 수채화가라는 것. 협동조합 전시에
                        참여한다는 것은 이미 일종의 연대를 실천하는 일이다. 자신의 작품을 다른
                        이들의 작품 곁에 놓고, 한 공간을 나누는 것.
                      </p>
                      <p>
                        그 성향이 그를 이 캠페인으로 이끈다. 씨앗페에는 이 캠페인의 대상으로서가
                        아니라 — 구제가 필요한 작가로서가 아니라 — 한국 예술인이 자주 마주하는 금융
                        차별에 함께 맞서는 동료 예술인과의 연대자로 함께한다. 협동조합 전시를 채우는
                        바로 그 마음이 이 전시를 채운다. 예술인은 함께 설 때 더 강하다는 믿음.
                      </p>
                      <p>
                        이렇게 보면 그의 수채가 지닌 가벼움은 두 번째 의미를 얻는다. 한 줄기 물은
                        종이에 아낌없이 주어지고, 한 점의 그림은 캠페인에 아낌없이 내어진다. 물이
                        화면 위에서 하는 일 — 필요한 자리로 흘러가고, 이로운 자리에 고이는 것 — 이
                        바로 그가 자신의 작품이 세상에서 하기를 바라는 일이다.
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
                      From the Korean Watercolor Association to the Jeju Myth and the Artists’
                      Cooperative exhibitions, Baek Geuma&apos;s work has pursued a single, patient
                      question: how does one record what is moving and fading without forcing it to
                      hold still? Her answer, given in transparent water, is a painting that keeps
                      the nature, myth, and daily life of Korea lightly, in light. She joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those who come after might work with a little less of the weight that
                      financial exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      한국수채화협회에서 제주신화전과 예술인협동조합전까지, 백금아의 작업은 하나의
                      차분한 물음을 추구해 왔다 — 움직이고 흐려지는 것을, 멈춰 세우지 않으면서
                      어떻게 기록할 것인가. 투명한 물로 건넨 그의 대답은, 한국의 자연·신화·일상을 빛
                      속에서 가볍게 간직하는 그림이다. 씨앗페에는 이 캠페인의 대상으로서가 아니라,
                      동료 예술인과의 연대자로 함께한다 — 다음 세대의 예술인들이 한국 예술인에게
                      지워진 금융 차별의 무게를 조금이라도 덜 짊어진 채 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Baek Geuma</span>
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
                    Baek Geuma joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    백금아 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={BAEK_GEUMA_PATH}
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
