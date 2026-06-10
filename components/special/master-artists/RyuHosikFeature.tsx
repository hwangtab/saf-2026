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

// 작가 feature는 작가 페이지(/artworks/artist/류호식)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='류호식', name_en='Ryu Hosik'. history 비어 있음 — 작업론 중심 구성.
const RYU_HOSIK_PATH = `/artworks/artist/${encodeURIComponent('류호식')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isRyuHosikArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '류호식' ||
    n === 'ryu hosik' ||
    n === 'ryu ho-sik' ||
    n.replace(/[\s-]+/g, '') === 'ryuhosik'
  );
};

const PAGE_COPY = {
  ko: {
    title: '류호식 — 페이퍼클레이 페인팅으로 순간을 간직하는 작가',
    description:
      '종이와 점토를 섞은 페이퍼클레이 페인팅으로 부조리한 현실 속에서 의미를 찾는 작가 류호식. 자연에서 길어 올린 순간의 소중함을 기록하고, 과거의 어둠을 통해 새로운 희망을 발견한다. 1250도 가마에서 소성되어 특유의 질감을 얻는 류호식의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '페이퍼클레이 페인팅으로 순간의 소중함을 기록하는 작가 류호식. 종이와 점토가 만나 1250도 가마에서 특유의 질감으로 태어나는 화면.',
    ogAlt: '류호식 대표 작품',
    twitterTitle: '류호식',
    twitterDescription: '순간을 간직하다 — 페이퍼클레이 페인팅의 작가 류호식',
    keywords:
      '류호식 작가, 페이퍼클레이 페인팅, 회화, 도자, 종이 점토, 가마 소성, 순간의 소중함, 씨앗페 온라인',
  },
  en: {
    title: 'Ryu Hosik — Holding the Moment Through Paper-Clay Painting',
    description:
      'Selected works by Ryu Hosik, an artist who searches for meaning within an absurd reality through paper-clay painting — a hybrid of painting and ceramics. He records the preciousness of moments drawn from nature, and finds new hope through the darkness of the past. Fired in a 1250°C kiln, his works carry a texture all their own. View and collect them at SAF Online.',
    ogDescription:
      'Ryu Hosik — recording the preciousness of the moment through paper-clay painting. Paper meets clay, fired at 1250°C into a surface of singular texture.',
    ogAlt: 'Ryu Hosik — featured work',
    twitterTitle: 'Ryu Hosik',
    twitterDescription: 'Holding the moment — the paper-clay painting of Ryu Hosik',
    keywords:
      'Ryu Hosik artist, paper-clay painting, paperclay, painting and ceramics, kiln firing, preciousness of the moment',
  },
} as const;

export async function buildRyuHosikMetadata({
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
  const pageUrl = buildLocaleUrl(RYU_HOSIK_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('류호식');
  const artwork = allArtworks.find((a) => isRyuHosikArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ryu Hosik`
      : `${artwork.title} — 류호식`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(RYU_HOSIK_PATH, locale, true),
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

export default async function RyuHosikFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(RYU_HOSIK_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('류호식');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isRyuHosikArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Ryu Hosik' : '류호식', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${RYU_HOSIK_PATH}#person-ryu-hosik`,
    name: isEnglish ? 'Ryu Hosik' : '류호식',
    alternateName: isEnglish ? '류호식' : 'Ryu Hosik',
    jobTitle: isEnglish ? 'Artist' : '작가',
    description: isEnglish
      ? 'Ryu Hosik is an artist who searches for meaning within an absurd reality through paper-clay painting, a hybrid of painting and ceramics, recording the preciousness of moments drawn from nature.'
      : '류호식은 종이와 점토를 섞은 페이퍼클레이 페인팅(회화·도자 혼합)으로 부조리한 현실 속에서 의미를 찾으며, 자연에서 길어 올린 순간의 소중함을 기록하는 작가입니다.',
    knowsAbout: isEnglish
      ? ['Paper-clay painting', 'Painting and ceramics', 'Kiln firing']
      : ['페이퍼클레이 페인팅', '회화·도자 혼합', '가마 소성'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ryu Hosik — SAF Online' : '류호식 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Ryu Hosik from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 류호식 작품들을 소개합니다.',
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
        {/* Hero Section — 종이·점토·불의 질감 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 켜켜이 쌓인 물성의 결 — 종이와 점토의 층위 모티프 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/10" />
          {/* 가마의 미열 — 우상단 은은한 빛무리 */}
          <div className="absolute -top-24 right-[-6rem] w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Ryu Hosik · Paper-Clay Painting' : '류호식 · 페이퍼클레이 페인팅'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Holding the
                  <br />
                  <span className="text-primary-soft">preciousness of a moment</span>
                </>
              ) : (
                <>
                  순간의 소중함을
                  <br />
                  <span className="text-primary-soft">간직하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Paper and clay, joined and fired at 1250°C.</span>
                  <span className="mt-2 block">
                    A surface of singular texture, where hope is found through the dark.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">종이와 점토가 만나 1250도 불 속에서.</span>
                  <span className="mt-2 block">
                    어둠을 지나 희망에 이르는, 특유의 질감을 지닌 화면.
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
                    Paper, clay, fire —<br />
                    <span className="text-primary-strong">a moment made to last</span>
                  </>
                ) : (
                  <>
                    종이, 점토, 불 —<br />
                    <span className="text-primary-strong">머무르게 한 순간</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Ryu Hosik works in{' '}
                      <strong className="font-bold text-charcoal-deep">paper-clay painting</strong>,
                      a practice that joins the languages of painting and ceramics. His works give
                      voice to an emotion held within an absurd reality — and to the wish to find
                      meaning inside it, rather than turn away.
                    </p>
                    <p>
                      He draws his inspiration chiefly from nature, recording the preciousness of
                      its fleeting moments. Through the darkness of the past he discovers new hope
                      and happiness, and from a longing to keep the ideal instants of everyday life
                      his work is made.
                    </p>
                    <p>
                      The technique itself carries this intention. In paper-clay, processed
                      cellulose fibre is mixed into the clay body; when the work is fired, the fibre
                      burns away and leaves a microporous, breathing surface behind. Ryu&apos;s
                      pieces are{' '}
                      <strong className="font-bold text-charcoal">fired in a 1250°C kiln</strong>,
                      and it is in that heat that they acquire their distinctive texture — a grain
                      no brush alone could set down.
                    </p>
                    <p>
                      To paint with clay and then commit it to the kiln is to accept that the final
                      image is decided as much by fire as by hand. The everyday moment he wishes to
                      keep is not merely depicted; it is passed through heat until it hardens into
                      something that will hold. The surface that emerges is the record of that
                      passage.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      류호식은 회화와 도자의 언어를 잇는{' '}
                      <strong className="font-bold text-charcoal-deep">페이퍼클레이 페인팅</strong>
                      으로 작업한다. 그의 작품들은 부조리한 현실과, 그 안에서 의미를 찾고자 하는
                      정서를 표명한다 — 외면하기보다 안으로 들어가려는 마음.
                    </p>
                    <p>
                      그는 주로 자연에서 영감을 받아, 스쳐 가는 그 순간들의 소중함을 기록한다.
                      과거의 어둠을 통해 새로운 희망과 행복을 발견하며, 일상의 이상적 순간을
                      간직하려는 소망에서 작품을 만든다.
                    </p>
                    <p>
                      기법 자체가 이 의도를 품는다. 페이퍼클레이는 점토에 종이 섬유를 섞은 것으로,
                      작품을 구울 때 섬유가 타 사라지며 미세한 숨구멍이 난 표면을 남긴다. 류호식의
                      작품들은{' '}
                      <strong className="font-bold text-charcoal">1250도 가마에서 소성</strong>
                      되며, 바로 그 불 속에서 특유의 질감을 얻는다 — 붓만으로는 내려놓을 수 없는 결.
                    </p>
                    <p>
                      점토로 그리고 그것을 가마에 맡긴다는 것은, 최종 화면이 손만큼이나 불에 의해
                      결정됨을 받아들이는 일이다. 그가 간직하려는 일상의 한 순간은 단지 그려지는 데
                      그치지 않는다. 머무를 만한 무엇으로 굳어질 때까지 열을 통과한다. 떠오른 표면은
                      그 통과의 기록이다.
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
                        {isEnglish ? 'Paper-clay painting' : '페이퍼클레이 페인팅 — 종이와 점토'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A hybrid of painting and ceramics: clay mixed with paper fibre, fired in a 1250°C kiln until it carries a texture all its own.'
                          : '회화와 도자의 혼합. 종이 섬유를 섞은 점토를 1250도 가마에서 구워, 특유의 질감을 지닌 화면으로.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Meaning within absurdity' : '부조리 속에서 찾는 의미'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His works voice an emotion held within an absurd reality, and the wish to find meaning inside it rather than turn away.'
                          : '부조리한 현실과, 그 안에서 의미를 찾고자 하는 정서를 표명한다. 외면하기보다 안으로 들어가려는 마음.'}
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
                          ? 'The moment, and hope through the dark'
                          : '순간, 그리고 어둠을 지난 희망'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Drawing from nature, he records the preciousness of fleeting moments — finding new hope and happiness through the darkness of the past.'
                          : '자연에서 영감을 받아 스쳐 가는 순간의 소중함을 기록한다. 과거의 어둠을 통해 새로운 희망과 행복을 발견하며.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'On the material' : '물성에 관하여'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: paper-clay painting — a practice joining painting and ceramics.'
                        : '매체: 페이퍼클레이 페인팅 — 회화와 도자를 잇는 작업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Body: clay mixed with paper (cellulose) fibre; the fibre burns away in firing, leaving a microporous surface.'
                        : '점토에 종이(셀룰로스) 섬유를 섞은 소지. 소성 중 섬유가 타 사라지며 미세한 숨구멍이 남는다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Firing: completed in a 1250°C kiln, where the works acquire their distinctive texture.'
                        : '소성: 1250도 가마에서 마무리되며, 바로 거기서 특유의 질감을 얻는다.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 작업론 중심 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on material, the moment, and the kiln</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">물성과 순간, 그리고 가마에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 페이퍼클레이라는 물성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Paper-clay — where painting meets ceramics'
                    : '페이퍼클레이 — 회화와 도자가 만나는 자리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Paper-clay is, in the simplest terms, a clay body into which processed paper
                        — cellulose fibre — has been blended. The addition changes how the material
                        behaves: it holds together while still wet and soft, takes drawing and
                        layering, and tolerates the joining of dry and fresh parts in ways pure clay
                        resists. For Ryu Hosik this is not a technical curiosity but a premise. It
                        is the ground on which painting and ceramics can be made to meet.
                      </p>
                      <p>
                        To call the work <em>paper-clay painting</em> rather than ceramics is to
                        keep the act of painting at the centre. The clay is not only modelled; it is
                        worked as a surface, drawn upon and built up. Yet because the body is clay,
                        it must finally go to the fire — and so the picture is always also an
                        object, a thing with weight and grain, made to be looked at and to last.
                      </p>
                      <p>
                        This hybrid is the whole proposition. The work belongs neither fully to the
                        wall nor to the kiln shelf, and that in-between is exactly where its meaning
                        sits: an image that has been through clay, and a clay that has been painted.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        페이퍼클레이는 가장 단순하게 말하면, 가공된 종이 — 셀룰로스 섬유 — 를 섞은
                        점토 소지다. 이 첨가가 재료의 거동을 바꾼다. 축축하고 무를 때에도 형태를
                        붙들고, 그림과 적층을 받아들이며, 마른 부분과 새 부분을 잇는 일을 순수
                        점토보다 너그럽게 허락한다. 류호식에게 이것은 기술적 호기심이 아니라 전제다.
                        회화와 도자를 만나게 할 수 있는 바탕.
                      </p>
                      <p>
                        이 작업을 도자가 아니라 <em>페이퍼클레이 페인팅</em>이라 부르는 것은, 그리는
                        행위를 중심에 두기 위해서다. 점토는 빚어질 뿐 아니라 표면으로 다뤄지고, 그
                        위에 그려지고 쌓인다. 그러나 소지가 점토이기에 끝내 불로 가야 한다 —
                        그리하여 그림은 언제나 동시에 하나의 사물이다. 무게와 결을 지닌, 바라보기
                        위해 그리고 머무르기 위해 만들어진 것.
                      </p>
                      <p>
                        이 혼합이 곧 명제 전체다. 작품은 벽에도 가마 선반에도 온전히 속하지 않으며,
                        그 사이야말로 의미가 앉는 자리다. 점토를 통과한 이미지이자, 그려진 점토.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 순간을 기록하는 태도 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The moment — nature, absurdity, and hope through the dark'
                    : '순간 — 자연과 부조리, 그리고 어둠을 지난 희망'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Ryu Hosik takes his inspiration chiefly from nature, and the subject of his
                        work is the preciousness of its moments. Not the grand or permanent, but the
                        fleeting — the instant whose value lies precisely in the fact that it will
                        pass. To make a painting of such a moment is to refuse to let it pass
                        without remainder.
                      </p>
                      <p>
                        This wish does not arrive innocent of difficulty. His works also voice an
                        emotion held within an absurd reality — the sense that the world does not
                        readily yield meaning, and that meaning must be searched for rather than
                        received. The search is the work. Through the darkness of the past, his work
                        discovers new hope and happiness; the ideal instants of everyday life are
                        kept not by denying the dark but by passing through it.
                      </p>
                      <p>
                        So the paintings are quietly hopeful without being naive. They hold an
                        ordinary moment long enough for its worth to show, and they carry, in the
                        same gesture, the knowledge of how easily such moments are lost. To keep one
                        is a small act of faith.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        류호식은 주로 자연에서 영감을 받으며, 그의 작업의 주제는 그 순간들의
                        소중함이다. 거대하거나 영원한 것이 아니라 스쳐 가는 것 — 지나가리라는 사실에
                        바로 그 가치가 깃든 한순간. 그런 순간을 그림으로 만든다는 것은, 그것이 흔적
                        없이 지나가도록 두기를 거부하는 일이다.
                      </p>
                      <p>
                        이 소망은 어려움을 모른 채 도착하지 않는다. 그의 작품들은 부조리한 현실 속에
                        품은 정서 또한 표명한다 — 세계가 쉬이 의미를 내어주지 않으며, 의미란
                        주어지기 보다 찾아야 하는 것이라는 감각. 그 찾음이 곧 작업이다. 과거의
                        어둠을 통해 그는 새로운 희망과 행복을 발견하며, 일상의 이상적 순간은 어둠을
                        부정함이 아니라 그것을 통과함으로써 간직된다.
                      </p>
                      <p>
                        그래서 그림은 순진하지 않으면서도 조용히 희망적이다. 평범한 한순간을 그
                        가치가 드러날 만큼 붙들면서, 같은 몸짓 안에 그런 순간이 얼마나 쉽게
                        사라지는지에 대한 앎을 함께 품는다. 하나를 간직하는 일은 작은 믿음의 행위다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 1250도, 불이 결정하는 것 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? '1250°C — what the fire decides' : '1250도 — 불이 결정하는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Every work in paper-clay must finally go to the kiln, and Ryu Hosik&apos;s
                        are fired at 1250°C. In that heat the paper fibre laced through the body
                        burns away, leaving a fine, breathing porosity behind. The texture that
                        results is not applied; it is produced — the trace of a transformation the
                        hand alone could not perform.
                      </p>
                      <p>
                        Firing is, for any maker who commits to it, a relinquishing of control. What
                        goes into the kiln is not exactly what comes out. The heat shrinks, hardens,
                        and re-colours; it can crack, and it can grace. To accept the fire is to
                        accept that the final surface is decided in part by something other than
                        intention — and that this is not a loss but the very thing that gives the
                        work its grain.
                      </p>
                      <p>
                        There is a quiet rhyme between the method and the meaning. A moment one
                        wants to keep is committed to heat and comes back changed but lasting; the
                        preciousness Ryu sets out to record is, in the end, fixed by fire into
                        something that will hold. The texture of the finished piece is the proof
                        that the moment passed through, and remained.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        페이퍼클레이의 모든 작품은 끝내 가마로 가야 하며, 류호식의 작품들은
                        1250도에서 소성된다. 그 열 속에서 소지에 엮인 종이 섬유가 타 사라지고, 곱고
                        숨 쉬는 다공질이 남는다. 그렇게 생긴 질감은 칠해진 것이 아니라 만들어진
                        것이다 — 손만으로는 수행할 수 없는 변형의 흔적.
                      </p>
                      <p>
                        소성은, 그것에 자신을 맡기는 모든 만드는 이에게, 통제의 내려놓음이다. 가마에
                        들어간 것이 그대로 나오지 않는다. 열은 줄이고, 굳히고, 다시 색을 입힌다.
                        갈라지게 할 수도, 빛나게 할 수도 있다. 불을 받아들인다는 것은 최종 표면이
                        의도와는 다른 무엇에 의해서도 결정됨을 받아들이는 일이다 — 그리고 그것이
                        상실이 아니라, 작품에 결을 부여하는 바로 그것이다.
                      </p>
                      <p>
                        방법과 의미 사이에 조용한 운(韻)이 있다. 간직하고 싶은 한순간이 열에 맡겨져
                        변한 채로, 그러나 머무르는 것으로 돌아온다. 류호식이 기록하려는 소중함은
                        끝내 불에 의해 머무를 무엇으로 고정된다. 완성된 작품의 질감은 그 순간이
                        통과했고, 남았다는 증거다.
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
                      Across his work, Ryu Hosik pursues a single, patient question: how does one
                      hold the preciousness of a passing moment so that it lasts? His answer is
                      given in paper and clay and fire — an everyday instant committed to the kiln
                      until it hardens into something that will keep. He joins this campaign not as
                      a subject of its cause but as a fellow artist in solidarity — so that the
                      proceeds of his work might become a low-interest lifeline for artists facing
                      financial exclusion today.
                    </>
                  ) : (
                    <>
                      그의 작업 전체에서 류호식은 하나의 차분한 물음을 추구한다 — 스쳐 가는 순간의
                      소중함을 어떻게 머무르도록 간직할 것인가. 그의 대답은 종이와 점토와 불로
                      건네진다. 일상의 한순간을 가마에 맡겨, 간직될 무엇으로 굳을 때까지. 그는
                      씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 작품 판매 수익이 오늘 금융 차별을 겪는 예술인에게 저금리의 버팀목이 될 수
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
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Ryu Hosik</span>
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
                    Ryu Hosik joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    류호식 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={RYU_HOSIK_PATH}
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
