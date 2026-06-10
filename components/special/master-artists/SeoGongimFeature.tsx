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

// 거장 작가 feature는 작가 페이지(/artworks/artist/서공임)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SEO_GONGIM_PATH = `/artworks/artist/${encodeURIComponent('서공임')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSeoGongimArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '서공임' ||
    n === 'seo gong-im' ||
    n === 'seo gongim' ||
    n === 'suh gong-im' ||
    n.replace(/[\s-]+/g, '') === 'seogongim' ||
    n.replace(/[\s-]+/g, '') === 'suhgongim'
  );
};

const PAGE_COPY = {
  ko: {
    title: '서공임 — 전통을 현대로 잇는 민화 대가',
    description:
      '40년 넘게 민화 외길을 걸어온 한국의 대표적 현대 민화가 서공임. 전통 민화의 맥을 잇되 맑고 투명한 색감과 현대적 감각을 더해 독자적 작품세계를 구축했다. 《민화 컬러링 위시북》 등 저술과 함께 민화의 대중화·국제화에 힘쓰는 민화 대가 서공임의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '전통을 현대로 잇는 민화 대가 서공임. 40년 외길, 맑고 투명한 색감과 현대적 감각으로 민화의 대중화·국제화에 힘써 온 대표적 현대 민화가.',
    ogAlt: '서공임 대표 작품',
    twitterTitle: '서공임',
    twitterDescription: '전통을 현대로 잇다 — 40년 민화 외길의 대가 서공임',
    keywords:
      '서공임 작가, 민화, 현대 민화, 화조도, 책가도, 문자도, 민화 컬러링 위시북, 길상, 씨앗페 온라인',
  },
  en: {
    title: 'Seo Gongim — A Folk-Painting Master Bridging Tradition and the Present',
    description:
      'Selected works by Seo Gongim, a leading contemporary Korean folk painter (minhwa) who has walked the single path of folk painting for more than forty years. She carries the lineage of traditional minhwa while adding clear, luminous color and a contemporary sensibility to build a world entirely her own. Through books such as the Minhwa Coloring Wish Book and tireless outreach, she has worked to popularize and internationalize folk painting. View and collect her works at SAF Online.',
    ogDescription:
      'Seo Gongim — a folk-painting master bridging tradition and the present. Forty years on a single path, luminous color and a contemporary eye devoted to popularizing minhwa.',
    ogAlt: 'Seo Gongim — featured work',
    twitterTitle: 'Seo Gongim',
    twitterDescription:
      'Bridging tradition and the present — a folk-painting master of forty years',
    keywords:
      'Seo Gongim artist, Korean folk painting, minhwa, contemporary minhwa, hwajodo, chaekgado, munjado, auspicious symbols',
  },
} as const;

export async function buildSeoGongimMetadata({
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
  const pageUrl = buildLocaleUrl(SEO_GONGIM_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('서공임');
  const artwork = allArtworks.find((a) => isSeoGongimArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Seo Gongim`
      : `${artwork.title} — 서공임`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SEO_GONGIM_PATH, locale, true),
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

export default async function SeoGongimFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SEO_GONGIM_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('서공임');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isSeoGongimArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Seo Gongim' : '서공임', url: pageUrl },
  ]);

  // 생몰년·학력·수상이 DB에 없으므로 JSON-LD에 birthDate/award/alumniOf 미포함.
  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SEO_GONGIM_PATH}#person-seo-gongim`,
    name: isEnglish ? 'Seo Gongim' : '서공임',
    alternateName: isEnglish ? '서공임' : 'Seo Gongim',
    jobTitle: isEnglish ? 'Folk Painter' : '민화가',
    description: isEnglish
      ? 'Seo Gongim is a leading contemporary Korean folk painter (minhwa) who has walked the single path of folk painting for more than forty years, carrying the lineage of traditional minhwa while adding luminous color and a contemporary sensibility.'
      : '서공임은 40년 넘게 민화 외길을 걸어온 한국의 대표적 현대 민화가로, 전통 민화의 맥을 잇되 맑고 투명한 색감과 현대적 감각을 더해 독자적 작품세계를 구축했습니다.',
    knowsAbout: isEnglish
      ? ['Korean folk painting (minhwa)', 'Contemporary minhwa', 'Auspicious symbolism']
      : ['민화', '현대 민화', '길상과 벽사의 상징'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Seo Gongim — SAF Online' : '서공임 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Seo Gongim from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 서공임 작품들을 소개합니다.',
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

          {/* Bright color accents — 민화의 맑은 색감 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-20 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-14 h-full w-px bg-sun/30" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Seo Gongim · Folk Painter' : '서공임 · 민화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Tradition, carried forward
                  <br />
                  <span className="text-primary-soft">into the present</span>
                </>
              ) : (
                <>
                  전통을 오늘로
                  <br />
                  <span className="text-primary-soft">잇는 민화</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Forty years on a single path of folk painting.</span>
                  <span className="mt-2 block">
                    The old symbols of blessing, rendered in luminous color.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">40년 외길로 걸어온 민화.</span>
                  <span className="mt-2 block">길상의 옛 상징을, 맑은 색으로 다시 그리다.</span>
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
                    Folk painting, renewed —<br />
                    <span className="text-primary-strong">tradition in a contemporary hand</span>
                  </>
                ) : (
                  <>
                    다시 그린 민화 —<br />
                    <span className="text-primary-strong">현대의 손길로 잇는 전통</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Minhwa — Korean folk painting — was never the art of the court or the
                      literati. It was the picture of ordinary people: tigers to ward off
                      misfortune, peonies for wealth, lotus and pomegranate for abundant children,
                      books and brushes for learning. Pinned to a wall at New Year or a wedding, it
                      carried wishes more than it carried signatures, and for that reason most of it
                      came down to us anonymous.
                    </p>
                    <p>
                      Seo Gongim has spent{' '}
                      <strong className="font-bold text-charcoal-deep">
                        more than forty years
                      </strong>{' '}
                      on this single path. She learned traditional folk painting in the old way, by
                      copying the established types — the flower-and-bird picture (hwajodo), the
                      scholar&apos;s bookshelf (chaekgado), the character paintings (munjado), the
                      ten symbols of longevity (sipjangsaeng). Out of that long apprenticeship she
                      built something her own.
                    </p>
                    <p>
                      What sets her work apart is a{' '}
                      <strong className="font-bold text-charcoal">
                        contemporary reinterpretation of tradition
                      </strong>
                      . She keeps the symbolic grammar of minhwa intact, yet renders it in clear,
                      luminous color rarely seen in the genre, with a simplified and confident
                      composition that speaks to a modern eye. The tiger she has returned to again
                      and again — the guardian beast of the folk imagination — becomes, in her hand,
                      both an old talisman and a new picture.
                    </p>
                    <p>
                      She has also worked, persistently, to bring minhwa out of the
                      specialist&apos;s circle and into everyday life — through teaching,
                      exhibitions such as <em>Spellbound by Minhwa</em>, and books including the{' '}
                      <em>Minhwa Coloring Wish Book</em>, in which she selected and drew the source
                      images so that anyone might pick up a brush. Hers is the work of a master who
                      treats popularization not as a dilution of tradition but as its survival: a
                      living art only stays alive in many hands.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      민화는 궁중의 그림도, 문인의 그림도 아니었다. 그것은 보통 사람들의 그림이었다
                      — 재앙을 물리치는 호랑이, 부귀를 비는 모란, 다산을 바라는 연꽃과 석류, 학문을
                      염원하는 책과 붓. 설날과 혼례의 벽에 붙어, 서명보다 소망을 담았기에, 대부분은
                      이름 없이 전해졌다.
                    </p>
                    <p>
                      서공임은 이 외길을{' '}
                      <strong className="font-bold text-charcoal-deep">40년 넘게</strong> 걸어왔다.
                      그는 전통 민화를 옛 방식 그대로 — 화조도, 책가도, 문자도, 십장생도 같은 정형을
                      거듭 모사하며 — 익혔고, 그 오랜 수련 위에 자신만의 세계를 세웠다.
                    </p>
                    <p>
                      그의 작업을 남다르게 하는 것은{' '}
                      <strong className="font-bold text-charcoal">전통의 현대적 재해석</strong>이다.
                      민화의 상징 문법은 고스란히 지키되, 이 장르에서 보기 드문 맑고 투명한 색으로
                      풀어내고, 단순하고 단단한 구도로 현대인의 눈에 말을 건다. 그가 거듭 돌아온
                      호랑이 — 민간 상상력의 수호 짐승 — 는 그의 손에서 오래된 부적이자 새로운
                      그림이 된다.
                    </p>
                    <p>
                      그는 또한 민화를 전문가의 울타리 밖, 일상으로 끌어내는 일에 꾸준히 힘써 왔다 —
                      가르침과 〈민화에 홀리다〉 같은 전시, 그리고 누구나 붓을 들 수 있도록 직접
                      밑그림을 고르고 그린 《민화 컬러링 위시북》 같은 저술을 통해. 대중화를 전통의
                      희석이 아니라 전통의 생존으로 여기는 대가의 작업이다. 살아 있는 예술은 여러
                      손에서만 살아 있다.
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
                        {isEnglish ? 'Tradition reinterpreted' : '전통의 현대적 재해석'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The symbolic grammar of minhwa kept intact, yet rendered in clear, luminous color and a confident contemporary composition.'
                          : '민화의 상징 문법은 지키되, 맑고 투명한 색과 단단한 현대적 구도로 다시 풀어낸다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Symbols of blessing & protection' : '길상과 벽사의 상징'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Tigers that ward off misfortune, peonies for fortune, lotus and pomegranate for abundance — the folk wishes carried by hwajodo, chaekgado and munjado.'
                          : '재앙을 물리치는 호랑이, 부귀의 모란, 다산의 연꽃과 석류 — 화조도·책가도·문자도가 담아 온 서민의 소망.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Bringing minhwa to everyone' : '민화의 대중화·국제화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Teaching, exhibitions and books such as the 〈Minhwa Coloring Wish Book〉 carry folk painting out of the specialist circle and into many hands.'
                          : '가르침과 전시, 《민화 컬러링 위시북》 같은 저술로 민화를 전문가의 울타리 밖, 여러 손으로 이어 간다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Genres of folk painting' : '민화의 갈래'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Hwajodo (화조도) — flowers and birds, for love and prosperity'
                        : '화조도(花鳥圖) — 꽃과 새, 사랑과 번영을 비는 그림'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Chaekgado (책가도) — the scholar’s bookshelf, for learning and aspiration'
                        : '책가도(冊架圖) — 책과 문방, 학문과 입신의 염원'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Munjado (문자도) — character pictures of the Confucian virtues'
                        : '문자도(文字圖) — 효제충신 등 유교 덕목을 그린 문자 그림'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Tiger & magpie, sipjangsaeng (십장생) — guardian beasts and the symbols of long life'
                        : '호작도·십장생(十長生) — 수호의 호랑이와 장수를 비는 상징'}
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
                  <span className="text-charcoal-deep">on folk painting and its keeper</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">민화와, 그것을 지킨 손에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 서민의 그림 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The people’s picture — what minhwa was'
                    : '서민의 그림 — 민화란 무엇이었나'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        For most of the Joseon period, painting that hung in palaces and
                        scholars&apos; studies was the work of trained court painters and literati.
                        Minhwa was the other tradition: pictures made by and for ordinary people,
                        often by unnamed itinerant painters, to be hung at New Year, at a wedding,
                        at a sixtieth birthday. They were not collected as masterpieces; they were
                        used.
                      </p>
                      <p>
                        Their grammar was a grammar of wishes. A tiger drove away the misfortunes of
                        the coming year; a pair of magpies brought good news; peonies promised
                        wealth and honor; lotus and pomegranate, many children; the ten symbols of
                        longevity, a long life. Munjado spelled out the Confucian virtues in the
                        very strokes of their characters. To read a minhwa is to read what a
                        household hoped for.
                      </p>
                      <p>
                        Precisely because it served life rather than the art market, minhwa was long
                        dismissed by official art history. Its rediscovery in the twentieth century
                        — as one of the most distinctive and inventive bodies of Korean visual
                        culture — owes much to the painters who kept practicing it when it was
                        unfashionable to do so.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        조선의 오랜 시간 동안, 궁궐과 사대부의 사랑방에 걸린 그림은 도화서 화원과
                        문인의 것이었다. 민화는 그 바깥의 전통이었다 — 보통 사람들이, 흔히 이름 없는
                        떠돌이 화공의 손으로 그려, 설날과 혼례와 회갑에 거는 그림. 그것은 명작으로
                        수집되지 않고, 쓰였다.
                      </p>
                      <p>
                        그 문법은 소망의 문법이었다. 호랑이는 한 해의 재앙을 물리치고, 까치 한 쌍은
                        좋은 소식을 부르며, 모란은 부귀를, 연꽃과 석류는 다산을, 십장생은 장수를
                        약속했다. 문자도는 효제충신의 덕목을 글자의 획 자체에 새겼다. 민화를
                        읽는다는 것은 한 집안이 무엇을 바랐는지를 읽는 일이다.
                      </p>
                      <p>
                        예술 시장이 아니라 삶을 섬겼기에, 민화는 오래도록 공식 미술사에서 밀려나
                        있었다. 한국 시각문화에서 가장 개성 있고 창의적인 갈래의 하나로 20세기에
                        재발견된 데에는, 그것이 유행이 아니던 시절에도 붓을 놓지 않은 화가들의 몫이
                        크다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 40년의 외길 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Forty years on one path — copy, then make new'
                    : '40년의 외길 — 모사에서 창작으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Folk painting is learned by copying. The apprentice repeats the established
                        types — the same tiger, the same peony, the same bookshelf — until the form
                        is in the hand and not only in the eye. It is slow, unglamorous training,
                        and it is the foundation on which any personal voice in this genre has to be
                        built.
                      </p>
                      <p>
                        Seo Gongim has kept to this path for{' '}
                        <strong className="font-bold text-charcoal-deep">
                          more than forty years
                        </strong>
                        . What grew out of that discipline is a body of work that is unmistakably
                        hers: the traditional motifs are all present, but the color is clearer and
                        more transparent than the genre usually allows, and the composition is pared
                        down to a modern clarity. She has returned to the tiger again and again, a
                        motif that has become almost a signature.
                      </p>
                      <p>
                        Her contemporary minhwa keeps the symbolism of the old pictures while
                        letting the feeling and the life of the present enter them. It is
                        reinterpretation, not replacement — the tradition carried forward rather
                        than left behind, in the hands of a master who has made the genre her
                        life&apos;s work.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민화는 모사로 익힌다. 도제는 정형을 거듭한다 — 같은 호랑이, 같은 모란, 같은
                        책가도를, 형(形)이 눈만이 아니라 손에 들어올 때까지. 더디고 화려하지 않은
                        수련이지만, 이 장르에서 개인의 목소리는 모두 그 위에 세워질 수밖에 없다.
                      </p>
                      <p>
                        서공임은 이 길을{' '}
                        <strong className="font-bold text-charcoal-deep">40년 넘게</strong> 지켜
                        왔다. 그 수련에서 자라난 것은 누구도 그와 혼동할 수 없는 작품이다: 전통의
                        소재는 모두 있되, 색은 이 장르가 흔히 허용하는 것보다 맑고 투명하며, 구도는
                        현대적 명료함으로 덜어졌다. 그는 호랑이로 거듭 돌아왔고, 그 소재는 이제 거의
                        그의 서명이 됐다.
                      </p>
                      <p>
                        그의 현대 민화는 옛 그림의 상징을 지키면서도, 그 안으로 오늘의 감정과 삶이
                        들어오도록 둔다. 대체가 아니라 재해석이다 — 전통을 뒤에 두지 않고 앞으로
                        잇는, 이 장르를 평생의 업으로 삼은 대가의 손에서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 대중화라는 보존 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Popularization as preservation — the brush in many hands'
                    : '대중화라는 보존 — 여러 손에 쥐어 준 붓'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A folk art lives differently from a museum art. It does not survive by being
                        guarded behind glass; it survives by being made — copied, hung, given, made
                        again. Seo Gongim has understood this and built a second strand of her
                        practice around it: bringing minhwa back into ordinary hands.
                      </p>
                      <p>
                        Through teaching, through exhibitions such as <em>Spellbound by Minhwa</em>,
                        and through books including the <em>Minhwa Coloring Wish Book</em> — for
                        which she selected and drew the source images so that beginners could follow
                        them — she has turned the genre into something anyone can pick up. To put a
                        brush in a stranger&apos;s hand is, for a folk painter, the surest form of
                        conservation.
                      </p>
                      <p>
                        That outreach has carried minhwa outward as well — toward audiences beyond
                        Korea, as a living face of Korean visual culture rather than a museum relic.
                        Popularization and internationalization, in her work, are not a softening of
                        tradition but its continuation by other means.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        민속의 예술은 박물관의 예술과 다르게 산다. 그것은 유리 뒤에 지켜져 살아남는
                        것이 아니라, 그려지고 — 모사되고, 걸리고, 건네지고, 다시 그려져 —
                        살아남는다. 서공임은 이를 알았고, 그 위에 작업의 또 한 축을 세웠다: 민화를
                        다시 보통 사람의 손으로 돌려보내는 일이다.
                      </p>
                      <p>
                        가르침으로, 〈민화에 홀리다〉 같은 전시로, 그리고 초심자가 따라 그릴 수
                        있도록 직접 밑그림을 고르고 그린 《민화 컬러링 위시북》 같은 저술로 — 그는
                        이 장르를 누구나 손에 쥘 수 있는 것으로 만들었다. 낯선 이의 손에 붓을 쥐어
                        주는 일은, 민화가에게 가장 확실한 보존의 형식이다.
                      </p>
                      <p>
                        그 확산은 민화를 바깥으로도 데려갔다 — 박물관의 유물이 아니라 한국
                        시각문화의 살아 있는 얼굴로, 한국 밖의 관객에게로. 그의 작업에서 대중화와
                        국제화는 전통의 약화가 아니라, 다른 방식으로 이어 가는 전통의 연장이다.
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
                      Over four decades, Seo Gongim has done two things at once: kept a quiet,
                      exacting faith with the oldest of Korean folk traditions, and opened it wide
                      enough that anyone might enter. She joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity — so that the painters who come
                      after might keep their brushes moving without the weight of financial
                      exclusion.
                    </>
                  ) : (
                    <>
                      40년이 넘는 시간 동안, 서공임은 두 가지를 동시에 해냈다 — 한국 민화라는 가장
                      오래된 전통에 조용하고 엄정한 신의를 지키면서, 동시에 누구나 들어설 수 있을
                      만큼 그 문을 활짝 열었다. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                      예술인과의 연대자로서 함께한다 — 뒤에 올 화가들이 금융 차별의 무게 없이 붓을
                      이어갈 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Seo Gongim</span>
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
                    Seo Gongim joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    서공임 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SEO_GONGIM_PATH}
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
