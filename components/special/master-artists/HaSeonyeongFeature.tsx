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

// 작가 feature는 작가 페이지(/artworks/artist/하선영)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='하선영', name_en='Ha Seonyeong' (영문 표기 Ha Sunyoung), 매체: 사진·회화.
const HA_SEONYEONG_PATH = `/artworks/artist/${encodeURIComponent('하선영')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isHaSeonyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '하선영' ||
    n === 'ha seon-yeong' ||
    n === 'ha seonyeong' ||
    n === 'ha sun-young' ||
    n === 'ha sunyoung' ||
    n.replace(/[\s-]+/g, '') === 'haseonyeong' ||
    n.replace(/[\s-]+/g, '') === 'hasunyoung'
  );
};

const PAGE_COPY = {
  ko: {
    title: '하선영 — 나무의 초상을 담는 사진·회화 작가',
    description:
      '회화에서 사진으로 건너온 작가 하선영. 홍익대학교에서 회화를 전공한 뒤 프랑스 아를국립사진학교에서 사진을 공부했다. 나무를 하나의 초상으로 바라보는 작업, 그리고 팬데믹 시대의 힘겨운 사람들에게 아름다운 세계의 자연으로 위안을 건네는 작업을 이어 간다. 나무의 초상, 위로의 풍경 — 하선영의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '나무를 하나의 초상으로 바라보는 사진·회화 작가 하선영. 자연으로 위안을 건네는 어슴푸레한 화면.',
    ogAlt: '하선영 대표 작품',
    twitterTitle: '하선영',
    twitterDescription: '나무의 초상, 위로의 풍경 — 사진·회화 작가 하선영',
    keywords: '하선영 작가, 나무의 초상화, 사진, 회화, 아를국립사진학교, 자연, 위로, 씨앗페 온라인',
  },
  en: {
    title: 'Ha Seonyeong — Photographer and Painter of the Portrait of Trees',
    description:
      'Selected works by Ha Seonyeong, an artist who crossed from painting into photography. After majoring in painting at Hongik University, she studied photography at the Ecole Nationale Superieure de la Photographie d’Arles in France. She makes portraits of trees, and offers consolation to those struggling through the pandemic era with the natural beauty of the world. The portrait of a tree, a landscape of comfort. View and collect her works at SAF Online.',
    ogDescription:
      'Ha Seonyeong — a photographer and painter who regards a tree as a portrait, offering consolation through nature.',
    ogAlt: 'Ha Seonyeong — featured work',
    twitterTitle: 'Ha Seonyeong',
    twitterDescription:
      'The portrait of a tree, a landscape of comfort — photographer and painter Ha Seonyeong',
    keywords:
      'Ha Seonyeong artist, portrait of trees, photography, painting, Arles photography school, nature, consolation',
  },
} as const;

export async function buildHaSeonyeongMetadata({
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
  const pageUrl = buildLocaleUrl(HA_SEONYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('하선영');
  const artwork = allArtworks.find((a) => isHaSeonyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ha Seonyeong`
      : `${artwork.title} — 하선영`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(HA_SEONYEONG_PATH, locale, true),
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

export default async function HaSeonyeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(HA_SEONYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('하선영');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isHaSeonyeongArtist(artwork.artist)
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
    { name: isEnglish ? 'Ha Seonyeong' : '하선영', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${HA_SEONYEONG_PATH}#person-ha-seonyeong`,
    name: isEnglish ? 'Ha Seonyeong' : '하선영',
    alternateName: isEnglish ? '하선영' : 'Ha Seonyeong',
    jobTitle: isEnglish ? 'Photographer and Painter' : '사진·회화 작가',
    description: isEnglish
      ? 'Ha Seonyeong is an artist who crossed from painting into photography. After majoring in painting at Hongik University, she studied photography at the Ecole Nationale Superieure de la Photographie d’Arles, and makes portraits of trees while offering consolation through the natural beauty of the world.'
      : '하선영은 홍익대학교에서 회화를 전공한 뒤 프랑스 아를국립사진학교에서 사진을 전공한 작가로, 나무를 하나의 초상으로 바라보는 작업과 팬데믹 시대의 힘겨운 이들에게 자연으로 위안을 건네는 작업을 이어 갑니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Hongik University (Painting)' : '홍익대학교 (회화)',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Ecole Nationale Superieure de la Photographie d’Arles'
          : '아를국립사진학교',
      },
    ],
    knowsAbout: isEnglish
      ? ['Photography', 'Painting', 'Portrait of trees', 'Nature']
      : ['사진', '회화', '나무의 초상화', '자연'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ha Seonyeong — SAF Online' : '하선영 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Ha Seonyeong from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 하선영 작품들을 소개합니다.',
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
        {/* Hero Section — 나무의 초상·위로의 자연: 어슴푸레한 숲의 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 나무의 결 모티프 — 화면을 가로지르는 수직의 결 */}
          <div className="absolute top-0 left-12 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/25" />
          <div className="absolute top-0 right-16 h-full w-px bg-white/10" />
          {/* 숲 사이로 스미는 빛 — 우상단 은은한 빛무리 */}
          <div className="absolute -top-24 right-[-6rem] w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Ha Seonyeong · Photography & Painting' : '하선영 · 사진·회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The portrait
                  <br />
                  <span className="text-primary-soft">of a tree</span>
                </>
              ) : (
                <>
                  나무의
                  <br />
                  <span className="text-primary-soft">초상</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">She regards a tree as a face to be looked at.</span>
                  <span className="mt-2 block">
                    And offers the natural beauty of the world as consolation.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">나무를 하나의 얼굴로, 초상으로 바라보다.</span>
                  <span className="mt-2 block">그리고 아름다운 세계의 자연을 위안으로 건네다.</span>
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
                    From the brush to the lens —<br />
                    <span className="text-primary-strong">looking at nature as a portrait</span>
                  </>
                ) : (
                  <>
                    붓에서 렌즈로 —<br />
                    <span className="text-primary-strong">자연을 초상으로 바라보다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Ha Seonyeong came to photography by way of painting. She first majored in
                      painting at Hongik University, then crossed to France to study photography at
                      the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Ecole Nationale Superieure de la Photographie d&apos;Arles
                      </strong>
                      , one of the most rigorous schools devoted entirely to the medium. That
                      passage from brush to lens is not a break in her practice but its foundation:
                      she brings a painter&apos;s patience to the photographic image, and a
                      photographer&apos;s discipline of looking to what she once would have painted.
                    </p>
                    <p>
                      At the centre of her work stands a recurring subject — the{' '}
                      <strong className="font-bold text-charcoal">portrait of a tree</strong>. To
                      call a study of a tree a portrait is already an argument: it grants the tree
                      the standing of a face, a presence with its own bearing and history. She does
                      not photograph a tree as scenery passed on the way to somewhere else. She
                      stops before it as one stops before a sitter, and lets its individual
                      character — the lean of a trunk, the particular weight of a canopy — come
                      forward as if it were a likeness.
                    </p>
                    <p>
                      Her work took on a second, gentler purpose in the pandemic years. For people
                      worn down by that difficult time, she turned to the natural beauty of the
                      world as a source of consolation — making images that offer not spectacle but
                      rest. The point is not to dazzle but to soothe: to remind the viewer that the
                      world, beyond the closed rooms of a hard season, still holds light, leaf, and
                      a quiet that can be returned to.
                    </p>
                    <p>
                      Read together, the two strands of her practice describe a single sensibility.
                      To make a portrait of a tree is to attend closely to a living thing; to offer
                      nature as consolation is to pass that attention on. In both, the work asks the
                      viewer to slow down, to look, and to be, however briefly, comforted.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      하선영은 회화를 거쳐 사진에 이르렀다. 그는 먼저 홍익대학교에서 회화를
                      전공했고, 이후 프랑스로 건너가{' '}
                      <strong className="font-bold text-charcoal-deep">아를국립사진학교</strong>
                      에서 사진을 공부했다. 사진이라는 매체에 온전히 헌신하는, 손꼽히게 엄정한 학교
                      가운데 하나다. 붓에서 렌즈로 건너온 이 이행은 그의 작업에 단절이 아니라 토대가
                      된다. 그는 사진 이미지에 화가의 인내를 들이고, 한때 그렸을 대상에 사진가의
                      응시를 들인다.
                    </p>
                    <p>
                      그의 작업 한가운데에는 거듭 돌아오는 주제가 있다 —{' '}
                      <strong className="font-bold text-charcoal">나무의 초상</strong>. 나무를
                      들여다본 작업을 초상이라 부르는 일은 이미 하나의 주장이다. 그것은 나무에게
                      얼굴의 자리를, 제 나름의 태도와 내력을 지닌 존재의 자리를 내어 준다. 그는
                      나무를 어딘가로 향하는 길에 스쳐 가는 풍경으로 찍지 않는다. 모델 앞에 멈춰
                      서듯 나무 앞에 멈춰 서서, 줄기의 기울기와 우듬지의 고유한 무게 같은 그 개별의
                      성격이 마치 닮은꼴처럼 떠오르게 한다.
                    </p>
                    <p>
                      팬데믹의 시간 동안 그의 작업은 또 하나의, 더 부드러운 목적을 품게 됐다. 그
                      힘겨운 시절에 지쳐 가던 이들을 위해, 그는 아름다운 세계의 자연을 위안의
                      원천으로 삼았다 — 볼거리가 아니라 쉼을 건네는 이미지를 만들면서. 핵심은
                      현혹하는 데 있지 않고 어루만지는 데 있다. 닫힌 방의 고된 계절 너머에도, 세계는
                      여전히 빛과 잎과, 돌아가 머물 수 있는 고요를 품고 있음을 일깨우는 것.
                    </p>
                    <p>
                      함께 놓고 보면, 그의 작업의 두 갈래는 하나의 감각을 그린다. 나무의 초상을
                      만드는 일은 살아 있는 것을 가까이 들여다보는 일이고, 자연을 위안으로 건네는
                      일은 그 응시를 다른 이에게 건네는 일이다. 둘 모두에서, 작업은 보는 이에게
                      속도를 늦추고, 바라보고, 잠시나마 위로받기를 청한다.
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
                        {isEnglish ? 'The portrait of a tree' : '나무의 초상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A tree photographed not as scenery but as a face — granted the standing, bearing, and history of a sitter.'
                          : '풍경이 아니라 하나의 얼굴로 찍힌 나무. 모델처럼 제 태도와 내력을 지닌 존재의 자리를 얻는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Nature as consolation' : '위안으로서의 자연'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'For those worn down by the pandemic era, the natural beauty of the world is offered not as spectacle but as rest.'
                          : '팬데믹 시대에 지친 이들에게, 아름다운 세계의 자연을 볼거리가 아닌 쉼으로 건넨다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'From painting to photography' : '회화에서 사진으로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "A painter's patience brought to the lens — the discipline of looking carried from the brush into the photographic image."
                          : '렌즈에 들인 화가의 인내. 붓에서 사진 이미지로 옮겨 온 응시의 태도.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Formation & practice' : '수련과 작업'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Majored in painting at Hongik University.'
                        : '홍익대학교에서 회화 전공.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Studied photography at the Ecole Nationale Superieure de la Photographie
                          d&apos;Arles, France.
                        </>
                      ) : (
                        '프랑스 아를국립사진학교에서 사진 전공.'
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Continues the portrait-of-trees work.'
                        : '나무의 초상화 작업을 이어 감.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Makes work that offers consolation through the natural beauty of the world to those struggling through the pandemic era.'
                        : '팬데믹 시대의 힘겨운 이들에게 아름다운 세계의 자연으로 위안을 건네는 작업 지속.'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'In the artist&apos;s words' : '작가의 말'}
                </h3>
                <p className="text-charcoal text-base leading-relaxed break-keep">
                  {isEnglish
                    ? 'A tree, looked at long enough, returns a gaze. To photograph it as a portrait is to grant it that standing — and to offer its quiet, in turn, to anyone in need of rest.'
                    : '오래 바라본 나무는 시선을 되돌려준다. 그것을 초상으로 찍는 일은 나무에게 그 자리를 내어 주는 일이며, 그 고요를 다시 쉼이 필요한 이에게 건네는 일이다.'}
                </p>
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
                    on the brush, the tree, and consolation
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">붓과 나무, 그리고 위로에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 회화에서 사진으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From the brush to the lens — a painter at Arles'
                    : '붓에서 렌즈로 — 아를에 간 화가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Ha Seonyeong&apos;s path runs through two disciplines. She trained first as
                        a painter, majoring in painting at Hongik University, before crossing to
                        France to study photography at the Ecole Nationale Superieure de la
                        Photographie d&apos;Arles — a school given over entirely to the photographic
                        image, set in the southern French city long associated with light and with
                        the history of looking.
                      </p>
                      <p>
                        That move from brush to lens is easy to read as a change of medium, but it
                        is better read as a continuity of attention. Painting teaches a slow way of
                        seeing: the eye lingers, the hand returns, the subject is built up over
                        time. Ha carried this patience into photography. Where the camera can take a
                        scene in an instant, she uses it the way a painter uses a long sitting — to
                        wait on the subject until its character declares itself.
                      </p>
                      <p>
                        The result is a photographic practice that does not feel hurried. The frame
                        is composed rather than caught; the tonality is considered; the subject is
                        given the time a painter would give it. In Ha&apos;s hands the two media are
                        not rivals but a single, extended education in how to look.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        하선영의 길은 두 개의 분야를 가로지른다. 그는 먼저 화가로 수련했다.
                        홍익대학교에서 회화를 전공한 뒤 프랑스로 건너가 아를국립사진학교에서 사진을
                        공부했다. 사진이라는 이미지에 온전히 바쳐진 학교, 오래도록 빛과 바라봄의
                        역사에 결부되어 온 남프랑스의 도시에 자리한 학교다.
                      </p>
                      <p>
                        붓에서 렌즈로의 이 이행은 매체의 교체로 읽기 쉽지만, 응시의 연속으로 읽는
                        편이 옳다. 회화는 느린 봄의 방식을 가르친다. 눈은 머무르고, 손은 돌아오며,
                        대상은 시간을 두고 쌓여 간다. 하선영은 이 인내를 사진으로 가져왔다. 카메라가
                        한 순간에 장면을 거둘 수 있는 자리에서, 그는 화가가 긴 한 차례의 앉음을 쓰듯
                        카메라를 쓴다 — 대상의 성격이 스스로 드러날 때까지 그 앞에 머물면서.
                      </p>
                      <p>
                        그 결과는 서두르지 않는 사진의 작업이다. 화면은 낚아채진 것이 아니라
                        구성되고, 톤은 헤아려지며, 대상은 화가가 들였을 시간을 받는다. 하선영의
                        손에서 두 매체는 경쟁자가 아니라, 바라보는 법에 관한 하나의 길고 이어진
                        수련이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 나무의 초상 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The portrait of a tree — granting a face to what grows'
                    : '나무의 초상 — 자라는 것에 얼굴을 내어 주기'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        To photograph a tree is common; to call the result a portrait is not.
                        Portraiture implies a subject that looks back — a presence with interiority,
                        with a face to be read. By placing the tree in that genre, Ha Seonyeong
                        makes a quiet claim: that a tree is not background but being, deserving of
                        the same attention one would give a person.
                      </p>
                      <p>
                        This changes how the picture is made. A landscape photographer might frame a
                        tree as part of a wider scene; Ha isolates it, attends to its particularity
                        — the lean of the trunk, the spread and weight of the canopy, the way its
                        form carries the years it has stood. Each tree becomes a likeness of itself,
                        distinct from every other, the way no two faces are the same.
                      </p>
                      <p>
                        There is a tenderness in this gesture. To grant a face to a tree is to
                        refuse the habit of treating the natural world as mere setting for human
                        life. The portrait of a tree asks the viewer to meet it as one meets another
                        presence — slowly, attentively, with the recognition that it, too, has a
                        bearing of its own.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        나무를 사진으로 찍는 일은 흔하지만, 그 결과를 초상이라 부르는 일은 흔치
                        않다. 초상은 마주 바라보는 대상을, 내면을 지니고 읽힐 얼굴을 가진 존재를
                        전제한다. 나무를 그 장르 안에 들임으로써 하선영은 조용한 주장을 한다 —
                        나무는 배경이 아니라 존재이며, 사람에게 들이는 만큼의 응시를 받을 자격이
                        있다는 것.
                      </p>
                      <p>
                        이는 사진이 만들어지는 방식을 바꾼다. 풍경 사진가라면 나무를 더 넓은 장면의
                        일부로 잡을 수 있겠지만, 하선영은 나무를 떼어 내어 그 개별성에 머문다 —
                        줄기의 기울기, 우듬지의 펼침과 무게, 그 형상이 서 있어 온 세월을 품는 방식.
                        저마다의 나무가 자기 자신의 닮은꼴이 된다. 같은 얼굴이 둘 없듯, 같은 나무도
                        둘 없다.
                      </p>
                      <p>
                        이 몸짓에는 다정함이 깃들어 있다. 나무에게 얼굴을 내어 주는 일은 자연을 한갓
                        인간 삶의 무대로 다루는 습관을 거절하는 일이다. 나무의 초상은 보는 이에게
                        그것을 또 하나의 존재로 맞이하기를 청한다 — 천천히, 주의 깊게, 그것 또한 제
                        나름의 태도를 지녔음을 알아보면서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 위로의 풍경 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'A landscape of comfort — nature in a hard season'
                    : '위로의 풍경 — 고된 계절의 자연'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the pandemic years, Ha Seonyeong&apos;s work found a second purpose
                        alongside its first. For people worn down by that difficult time — the
                        closed rooms, the long uncertainty — she turned to the natural beauty of the
                        world as a source of consolation, making images meant less to impress than
                        to soothe.
                      </p>
                      <p>
                        This is a particular use of beauty. It does not aim at spectacle. It aims at
                        rest — the small relief of being reminded that, beyond the walls of a hard
                        season, the world still holds light through leaves, the steadiness of a
                        tree, a quiet one can return to. The work offers itself as a place to set
                        down, for a moment, the weight of a difficult time.
                      </p>
                      <p>
                        It is here that her practice meets the spirit of this campaign. An artist
                        who spent the hardest season making consolation for others joins SAF not as
                        a subject of its cause but as a fellow artist in solidarity — so that the
                        proceeds of her work might become a low-interest lifeline for Korean artists
                        facing financial exclusion today. The gesture is continuous with the work:
                        attention turned outward, comfort passed on.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        팬데믹의 시간 동안, 하선영의 작업은 첫 번째 목적과 나란히 두 번째 목적을
                        찾았다. 그 힘겨운 시절에 지쳐 가던 이들 — 닫힌 방, 길어진 불확실함 — 을
                        위해, 그는 아름다운 세계의 자연을 위안의 원천으로 삼았다. 감탄시키기보다
                        어루만지기 위한 이미지를 만들면서.
                      </p>
                      <p>
                        이것은 아름다움의 한 특별한 쓰임이다. 그것은 볼거리를 겨냥하지 않는다. 쉼을
                        겨냥한다 — 고된 계절의 벽 너머에도 세계는 여전히 잎 사이로 드는 빛과, 나무의
                        의연함과, 돌아가 머물 고요를 품고 있음을 일깨우는 작은 안도. 작업은 고된
                        시간의 무게를 잠시 내려놓을 자리로 스스로를 내어 준다.
                      </p>
                      <p>
                        그의 작업이 이 캠페인의 정신과 만나는 곳이 여기다. 가장 고된 계절을 다른
                        이들을 위한 위로를 만들며 보낸 작가가, 씨앗페에 이 캠페인의 대상으로서가
                        아니라 동료 예술인과의 연대자로서 함께한다 — 작품 판매 수익이 오늘 금융
                        차별을 겪는 한국 예술인에게 저금리의 버팀목이 될 수 있도록. 그 몸짓은 작업과
                        이어진다. 바깥으로 향한 응시, 다른 이에게 건네진 위로.
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
                      From a painting studio at Hongik to a photography school in Arles, Ha
                      Seonyeong has pursued a single, patient way of looking — one that grants a
                      tree the standing of a portrait and offers nature as consolation. She joins
                      this campaign not as a subject of its cause but as a fellow artist in
                      solidarity, so that the comfort her work has long offered might, in another
                      form, reach artists who need it now.
                    </>
                  ) : (
                    <>
                      홍익의 회화 작업실에서 아를의 사진학교까지, 하선영은 하나의 차분한 봄의 방식을
                      추구해 왔다 — 나무에게 초상의 자리를 내어 주고, 자연을 위안으로 건네는 봄.
                      그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다 — 그의 작업이 오래 건네 온 위로가, 또 다른 형태로, 지금 그것을 필요로
                      하는 예술인에게 가닿을 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Ha Seonyeong</span>
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
                    Ha Seonyeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    하선영 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={HA_SEONYEONG_PATH}
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
