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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/최연택)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHOE_YEONTAEK_PATH = `/artworks/artist/${encodeURIComponent('최연택')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isChoeYeontaekArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '최연택' ||
    n === 'choe yeon-taek' ||
    n === 'choe yeontaek' ||
    n === 'choi yeon-taek' ||
    n === 'choi yeontaek' ||
    n.replace(/[\s-]+/g, '') === 'choeyeontaek' ||
    n.replace(/[\s-]+/g, '') === 'choiyeontaek'
  );
};

const PAGE_COPY = {
  ko: {
    title: '최연택 — 그림과 글, 도자기를 넘나드는 다재다능한 예술가',
    description:
      '회화와 도예 디자인, 삽화와 에세이의 경계를 자유로이 넘나드는 예술가 최연택. 그림과 글을 결합한 작업, 동화책 삽화, 도자기 디자인까지 한 사람의 손에서 여러 매체가 교차한다. 『하루를 더 살기로 했다』·『무정』 삽화로 알려진 최연택의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '그림과 글, 도자기를 넘나드는 다재다능한 예술가 최연택. 회화·삽화·에세이·도예 디자인이 한 손에서 교차한다.',
    ogAlt: '최연택 대표 작품',
    twitterTitle: '최연택',
    twitterDescription: '경계를 넘나드는 손 — 회화·삽화·도예 디자인의 예술가 최연택',
    keywords:
      '최연택 작가, 화가, 도예 디자인, 삽화, 에세이, 동화책 삽화, 하루를 더 살기로 했다, 무정, 씨앗페 온라인',
  },
  en: {
    title: 'Choe Yeon-taek — A Versatile Artist Across Painting, Illustration, and Ceramics',
    description:
      'Selected works by Choe Yeon-taek (Choi Yeontaek), an artist who moves freely across the boundaries of painting, ceramic design, illustration, and the essay. Work that joins image and text, picture-book illustration, and pottery design all cross within a single hand. Known for the illustrations of One More Day (Haru-reul Deo Salgiro Haetda) and Mujeong, view and collect his works at SAF Online.',
    ogDescription:
      'Choe Yeon-taek — a versatile artist across painting, illustration, the essay, and ceramic design, all crossing within a single hand.',
    ogAlt: 'Choe Yeon-taek — featured work',
    twitterTitle: 'Choe Yeon-taek',
    twitterDescription:
      'A hand that crosses boundaries — painting, illustration, and ceramic design',
    keywords:
      'Choe Yeon-taek artist, Choi Yeontaek, Korean painter, ceramic design, illustration, essay, picture-book illustration',
  },
} as const;

export async function buildChoeYeontaekMetadata({
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
  const pageUrl = buildLocaleUrl(CHOE_YEONTAEK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('최연택');
  const artwork = allArtworks.find((a) => isChoeYeontaekArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Choe Yeon-taek`
      : `${artwork.title} — 최연택`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHOE_YEONTAEK_PATH, locale, true),
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

export default async function ChoeYeontaekFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHOE_YEONTAEK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('최연택');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isChoeYeontaekArtist(artwork.artist)
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
    { name: isEnglish ? 'Choe Yeon-taek' : '최연택', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHOE_YEONTAEK_PATH}#person-choe-yeontaek`,
    name: isEnglish ? 'Choe Yeon-taek' : '최연택',
    alternateName: isEnglish ? '최연택' : 'Choe Yeon-taek',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Choe Yeon-taek is a versatile artist active as a painter, ceramic designer, and writer, moving across painting, picture-book illustration, the illustrated essay, and pottery design within a single practice.'
      : '최연택은 화가이자 도예 디자이너, 작가로 활동하는 다재다능한 예술가로, 회화와 동화책 삽화, 그림을 결합한 에세이, 도자기 디자인을 한 작업 안에서 넘나듭니다.',
    knowsAbout: isEnglish
      ? ['Painting', 'Ceramic design', 'Illustration', 'Illustrated essay']
      : ['회화', '도예 디자인', '삽화', '그림 에세이'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Choe Yeon-taek — SAF Online' : '최연택 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Choe Yeon-taek from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 최연택 작품들을 소개합니다.',
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

          {/* Crossing lines — 매체를 넘나드는 교차 모티프 */}
          <div className="absolute left-1/4 top-0 h-full w-px bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute right-1/4 top-0 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Choe Yeon-taek · Painter & Ceramic Designer' : '최연택 · 회화·도예'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A single hand that
                  <br />
                  <span className="text-primary-soft">crosses every boundary</span>
                </>
              ) : (
                <>
                  하나의 손이
                  <br />
                  <span className="text-primary-soft">경계를 넘나든다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Painting and writing, illustration and clay — gathered into one practice.
                  </span>
                  <span className="mt-2 block">
                    A versatile artist for whom no medium stands alone.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">그림과 글, 삽화와 흙이 하나의 작업으로 모이다.</span>
                  <span className="mt-2 block">어느 매체도 홀로 서지 않는 다재다능한 예술가.</span>
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
                    Many media —<br />
                    <span className="text-primary-strong">one questioning hand</span>
                  </>
                ) : (
                  <>
                    여러 매체 —<br />
                    <span className="text-primary-strong">물음을 던지는 하나의 손</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Choe Yeon-taek is a versatile artist active as a painter, a ceramic designer,
                      and a writer. His practice does not settle into a single discipline; it moves,
                      instead, across the seams between them — painting and the written word,
                      picture-book illustration and pottery design, the image that explains a text
                      and the text that completes an image.
                    </p>
                    <p>
                      Among his best-known work is illustration. He has illustrated essays that join
                      drawing and prose, lending image to books such as <em>One More Day</em>{' '}
                      (『하루를 더 살기로 했다』) and <em>Mujeong</em> (『무정』). In these projects
                      the drawing is not decoration laid over finished text but a second voice
                      running alongside it — a way of reading the same feeling twice, once in words
                      and once in line.
                    </p>
                    <p>
                      The same impulse carries into clay. Working in{' '}
                      <strong className="font-bold text-charcoal-deep">ceramic design</strong>, he
                      treats the surface of a vessel as another page — a place where image, form,
                      and use meet. He is also recorded as having taken part in the design of
                      tableware for the Blue House (청와대) and as having worked alongside the
                      thinker and writer Shin Young-bok — a breadth of involvement that speaks to a
                      practice unwilling to stay inside any one field.
                    </p>
                    <p>
                      What holds this range together is not a single style but a single attitude:
                      that an image, a sentence, and an object can all be made by the same hand, and
                      that the boundaries between them are there to be{' '}
                      <strong className="font-bold text-charcoal">crossed rather than kept</strong>.
                      In an art world that often rewards specialisation, Choe Yeon-taek has built a
                      practice out of versatility itself.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      최연택은 화가이자 도예 디자이너, 그리고 작가로 활동하는 다재다능한 예술가다.
                      그의 작업은 하나의 분야에 머무르지 않는다. 오히려 분야와 분야 사이의 이음매를
                      넘나든다 — 그림과 글, 동화책 삽화와 도자기 디자인, 텍스트를 풀어내는 이미지와
                      이미지를 완성하는 텍스트 사이를.
                    </p>
                    <p>
                      그를 가장 널리 알린 작업 가운데 하나는 삽화다. 그는 그림과 글을 결합한 에세이
                      작업을 해왔고, 『하루를 더 살기로 했다』와 『무정』 같은 책에 그림을 입혔다.
                      이 작업들에서 그림은 완성된 글 위에 얹힌 장식이 아니라 글과 나란히 흐르는 또
                      하나의 목소리다 — 같은 감정을 두 번 읽는 방식, 한 번은 말로 한 번은 선으로.
                    </p>
                    <p>
                      같은 충동이 흙으로도 이어진다.{' '}
                      <strong className="font-bold text-charcoal-deep">도예 디자인</strong> 작업에서
                      그는 그릇의 표면을 또 하나의 지면으로 다룬다 — 이미지와 형태, 쓰임이 만나는
                      자리. 과거 청와대 식기 디자인에 참여한 이력이 있고, 사상가이자 작가인 신영복
                      선생님과 함께 작업하기도 했다 — 어느 한 분야 안에 머물지 않으려는 폭넓은
                      활동의 자취다.
                    </p>
                    <p>
                      이 넓은 활동 범위를 하나로 묶는 것은 단일한 양식이 아니라 단일한 태도다 —
                      이미지와 문장, 사물이 모두 같은 손에서 만들어질 수 있고, 그 사이의 경계는{' '}
                      <strong className="font-bold text-charcoal">
                        지키기 위해서가 아니라 넘기 위해서
                      </strong>{' '}
                      있다는 태도. 전문화가 곧잘 보상받는 미술계에서, 최연택은 다재다능함 그 자체로
                      하나의 작업 세계를 세워 왔다.
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
                        {isEnglish ? 'Image and text together' : '그림과 글의 결합'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The drawing runs alongside the writing as a second voice — the same feeling read once in words and once in line.'
                          : '그림이 글 옆에서 또 하나의 목소리로 흐른다. 같은 감정을 말로 한 번, 선으로 한 번 읽는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Illustration as reading' : '읽기로서의 삽화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From picture books to literary essays, his illustration gives a book a visual interior rather than a cover.'
                          : '동화책부터 문학 에세이까지, 그의 삽화는 책에 표지가 아니라 시각적 내면을 부여한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The vessel as a page' : '지면이 되는 그릇'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In ceramic design the surface of a vessel becomes another canvas — where image, form, and use meet.'
                          : '도예 디자인에서 그릇의 표면은 또 하나의 화면이 된다. 이미지와 형태, 쓰임이 만나는 자리.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'A practice across media' : '여러 매체를 가로지르는 작업'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Painting — works on canvas and paper that anchor the rest of the practice.'
                        : '회화 — 다른 작업의 바탕이 되는 캔버스·종이 위의 그림.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Illustration — book illustration for essays joining image and text, incl.{' '}
                          <em>One More Day</em> (『하루를 더 살기로 했다』) and <em>Mujeong</em>{' '}
                          (『무정』).
                        </>
                      ) : (
                        <>
                          삽화 — 그림과 글을 결합한 에세이 삽화 작업. 『하루를 더 살기로 했다』,
                          『무정』 등.
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Picture-book illustration — lending image to stories for younger readers.'
                        : '동화책 삽화 — 어린 독자를 위한 이야기에 그림을 입히는 작업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Ceramic design — treating the surface of a vessel as another page for image and form.'
                        : '도예 디자인 — 그릇의 표면을 이미지와 형태를 위한 또 하나의 지면으로 다루는 작업.'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected involvements' : '주요 이력'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Book illustration: <em>One More Day</em> (『하루를 더 살기로 했다』) and{' '}
                          <em>Mujeong</em> (『무정』).
                        </>
                      ) : (
                        <>책 삽화: 『하루를 더 살기로 했다』, 『무정』 등의 삽화 작업.</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Recorded as having taken part in the design of Blue House (청와대) tableware.'
                        : '청와대 식기 디자인에 참여한 이력이 있다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Recorded as having worked alongside the thinker and writer Shin Young-bok.'
                        : '사상가이자 작가인 신영복 선생님과 함께 작업한 이력이 있다.'}
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
                  <span className="text-charcoal-deep">on image, text, and the space between</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">그림과 글, 그 사이에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 그림과 글의 결합 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Image and text — the drawn essay' : '그림과 글 — 그려진 에세이'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Much of Choe Yeon-taek&apos;s reputation rests on a deceptively simple act:
                        putting a drawing next to a sentence. In the illustrated essay, the two are
                        not in a hierarchy. The text does not command the image to illustrate it,
                        and the image does not merely ornament the text. They are set side by side,
                        and the reader moves between them.
                      </p>
                      <p>
                        This is why his book work — in essays such as <em>One More Day</em> and{' '}
                        <em>Mujeong</em> — reads less like illustration in the conventional sense
                        and more like a second telling. A feeling stated in prose is restated in
                        line; a thing named in a sentence is given a face. The effect is to slow the
                        reader down, to make them read the same page twice in two different
                        languages.
                      </p>
                      <p>
                        It is a quietly literary way of drawing. The line is asked not only to
                        describe but to interpret — to decide what in a paragraph is worth holding
                        still long enough to be seen. In that decision, the illustrator becomes a
                        kind of reader, and the drawing becomes a record of how he read.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        최연택의 이름을 알린 작업의 많은 부분은 겉보기에 단순한 행위에 기대어 있다 —
                        문장 옆에 그림 한 점을 놓는 일. 그림 에세이에서 둘은 위계 안에 있지 않다.
                        글이 그림에게 자기를 설명하라 명령하지 않고, 그림이 글을 그저 꾸미지도
                        않는다. 둘은 나란히 놓이고, 독자는 그 사이를 오간다.
                      </p>
                      <p>
                        그의 책 작업 — 『하루를 더 살기로 했다』나 『무정』 같은 에세이 — 이 통상적
                        의미의 삽화보다 또 하나의 이야기처럼 읽히는 이유가 여기 있다. 산문으로
                        말해진 감정이 선으로 다시 말해지고, 문장이 부른 것에 얼굴이 주어진다. 그
                        효과는 독자를 느리게 만드는 것이다 — 같은 지면을 서로 다른 두 언어로 두 번
                        읽게 하는 것.
                      </p>
                      <p>
                        그것은 조용히 문학적인 그리기 방식이다. 선은 묘사할 뿐 아니라 해석하도록
                        요청받는다 — 한 문단에서 무엇이 멈춰 서서 보일 만큼 가치 있는지를 정하는 일.
                        그 결정 속에서 삽화가는 일종의 독자가 되고, 그림은 그가 어떻게 읽었는가의
                        기록이 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 도예 디자인 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Clay — the vessel as a third surface'
                    : '흙 — 세 번째 표면으로서의 그릇'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Beside canvas and page, Choe Yeon-taek works in clay. Ceramic design asks a
                        different kind of attention from painting: the image must live on a curved
                        surface, must survive the kiln, must coexist with use. A vessel is not only
                        looked at — it is held, filled, set down on a table.
                      </p>
                      <p>
                        He approaches that surface as a page all the same. The form of a vessel and
                        the image on it are treated as one decision rather than two, so that
                        function and picture arrive together. The discipline of the kiln — where
                        nothing can be undone once fired — gives the work a finality that paper does
                        not demand, and a different kind of patience answers it.
                      </p>
                      <p>
                        It is in this domain that his recorded involvement in the design of Blue
                        House tableware, and his collaboration with the thinker and writer Shin
                        Young-bok, belong. Whatever the precise extent of these projects, they point
                        to the same disposition that runs through all his work: a willingness to
                        carry a maker&apos;s eye from one medium into the next without treating the
                        move as a departure.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        캔버스와 지면 곁에서, 최연택은 흙으로도 작업한다. 도예 디자인은 회화와는
                        다른 종류의 주의를 요구한다 — 이미지는 곡면 위에서 살아야 하고, 가마를
                        견뎌야 하며, 쓰임과 공존해야 한다. 그릇은 바라보기만 하는 것이 아니다. 손에
                        들리고, 채워지고, 식탁 위에 놓인다.
                      </p>
                      <p>
                        그럼에도 그는 그 표면을 하나의 지면으로 대한다. 그릇의 형태와 그 위의
                        이미지는 둘이 아니라 하나의 결정으로 다뤄지고, 기능과 그림이 함께 도착한다.
                        한번 구우면 되돌릴 수 없는 가마의 규율은 종이가 요구하지 않는 종류의
                        종결성을 작업에 부여하고, 거기에는 또 다른 종류의 인내가 응답한다.
                      </p>
                      <p>
                        청와대 식기 디자인에 참여한 이력과 사상가이자 작가인 신영복 선생님과의
                        협업이 놓이는 자리도 바로 이 영역이다. 이 작업들의 정확한 범위가 어떠하든,
                        그것들은 그의 작업 전체를 관통하는 같은 기질을 가리킨다 — 만드는 사람의 눈을
                        한 매체에서 다음 매체로 옮기되, 그 이동을 떠남으로 여기지 않는 태도.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 다재다능함 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Versatility — a practice built on crossing'
                    : '다재다능함 — 넘나듦으로 지은 작업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        It would be easy to read Choe Yeon-taek&apos;s range as a list of separate
                        careers — painter, illustrator, ceramic designer, writer. But the more
                        accurate reading is that these are not four practices but one, seen from
                        four sides. The connecting thread is an unwillingness to let a medium decide
                        in advance what can be said.
                      </p>
                      <p>
                        An art world organised around specialisation tends to treat such breadth
                        with suspicion, as if doing many things must mean doing none of them deeply.
                        His work argues the opposite: that fluency across media is itself a depth —
                        that the painter sees more clearly for having designed a vessel, and the
                        illustrator reads more closely for having had to compose a page.
                      </p>
                      <p>
                        To stand before his work is to watch boundaries become permeable. A drawing
                        wants to be read; a sentence wants a face; a vessel wants an image; an image
                        wants a use. The same hand answers all of them, and in doing so makes the
                        case that versatility, far from a dilution, can be a way of seeing the
                        whole.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        최연택의 활동 범위를 별개의 이력들의 목록으로 읽기는 쉽다 — 화가, 삽화가,
                        도예 디자이너, 작가. 그러나 더 정확한 독해는 이것들이 네 개의 작업이 아니라
                        네 면에서 본 하나의 작업이라는 것이다. 그 면들을 잇는 실은, 무엇을 말할 수
                        있는지를 매체가 미리 정하도록 두지 않으려는 태도다.
                      </p>
                      <p>
                        전문화를 중심으로 짜인 미술계는 이런 폭넓음을 곧잘 의심의 눈으로 본다 — 여러
                        가지를 한다는 것은 어느 것도 깊이 하지 않는다는 뜻인 양. 그의 작업은 그
                        반대를 주장한다. 매체를 가로지르는 능숙함이 그 자체로 하나의 깊이라는 것 —
                        그릇을 디자인해 본 화가가 더 또렷이 보고, 한 지면을 구성해야 했던 삽화가가
                        더 가까이 읽는다는 것.
                      </p>
                      <p>
                        그의 작업 앞에 서는 일은 경계가 스미는 것을 지켜보는 일이다. 그림은 읽히기를
                        바라고, 문장은 얼굴을 바라며, 그릇은 이미지를 바라고, 이미지는 쓰임을
                        바란다. 같은 손이 그 모두에 응답하고, 그렇게 함으로써 다재다능함이 희석이
                        아니라 전체를 보는 한 방식일 수 있음을 입증한다.
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
                      From the drawn essay to the designed vessel, Choe Yeon-taek&apos;s work has
                      pursued a single question: how far can one hand travel between media before
                      the travelling becomes the work itself? He joins this campaign not as a
                      subject of its cause but as a fellow artist in solidarity — so that those who
                      come after might work with a little less of the weight that financial
                      exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      그려진 에세이에서 디자인된 그릇까지, 최연택의 작업은 하나의 물음을 추구해 왔다
                      — 하나의 손은 매체와 매체 사이를 얼마나 멀리 오갈 수 있는가, 그 오감이 곧 작업
                      자체가 되기 전까지. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                      예술인과의 연대자로서 함께한다 — 다음 세대의 예술인들이 한국 예술인에게 지워진
                      금융 차별의 무게를 조금이라도 덜 짊어진 채 일할 수 있도록.
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
                Choe Yeon-taek
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
                    Choe Yeon-taek joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    최연택 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHOE_YEONTAEK_PATH}
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
