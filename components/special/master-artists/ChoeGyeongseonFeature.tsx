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

// 중견 작가 feature는 작가 페이지(/artworks/artist/최경선)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHOE_GYEONGSEON_PATH = `/artworks/artist/${encodeURIComponent('최경선')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isChoeGyeongseonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '최경선' ||
    n === 'choe gyeong-seon' ||
    n === 'choe gyeongseon' ||
    n === 'choi kyung-sun' ||
    n === 'choi kyungsun' ||
    n.replace(/[\s-]+/g, '') === 'choegyeongseon' ||
    n.replace(/[\s-]+/g, '') === 'choikyungsun'
  );
};

const PAGE_COPY = {
  ko: {
    title: '최경선 — 마음의 유영을 그리는 자연 회화 작가',
    description:
      '자연을 소재로 삶의 생동·슬픔·치유를 화폭에 담아온 중견 작가 최경선. 공중제비와 같은 마음의 동선을 사유하며, 고요한 수면과 흔들리는 풀숲에서 마음이 물고기처럼 유연해지는 ‘마음의 유영(遊泳)’을 그린다. 자하미술관·나무화랑·오산시립미술관을 거친 최경선의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '마음의 유영 — 자연을 소재로 삶의 생동·슬픔·치유를 그려온 중견 회화 작가 최경선. 대치된 것들이 차이를 넘나드는 순간의 생명의 언어.',
    ogAlt: '최경선 대표 작품',
    twitterTitle: '최경선',
    twitterDescription: '마음의 유영 — 자연에서 태초의 명랑함을 길어 올리는 작가 최경선',
    keywords:
      '최경선 작가, 회화, 자연, 마음의 유영, 미동, 자하미술관, 나무화랑, 오산시립미술관, 씨앗페 온라인',
  },
  en: {
    title: 'Choe Gyeong-seon — Painter of the Mind in Free Float',
    description:
      'Selected works by Choe Gyeong-seon, a mid-career Korean painter who has long drawn the vitality, sorrow, and healing of life from the materials of nature. Contemplating the trajectory of a mind that turns somersaults, she paints the free float of the mind — the way the heart grows as supple as a fish at a still water surface or in a swaying thicket of grass. View and collect her works at SAF Online.',
    ogDescription:
      'The mind in free float — Choe Gyeong-seon paints the vitality, sorrow, and healing of life from nature, and the language of life born when opposites cross their own difference.',
    ogAlt: 'Choe Gyeong-seon — featured work',
    twitterTitle: 'Choe Gyeong-seon',
    twitterDescription:
      'The mind in free float — a painter drawing a primal cheerfulness from nature',
    keywords:
      'Choe Gyeong-seon artist, Choi Kyung-sun, Korean painting, nature, free float of the mind, Zaha Museum, Namu Gallery',
  },
} as const;

export async function buildChoeGyeongseonMetadata({
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
  const pageUrl = buildLocaleUrl(CHOE_GYEONGSEON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('최경선');
  const artwork = allArtworks.find((a) => isChoeGyeongseonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Choe Gyeong-seon`
      : `${artwork.title} — 최경선`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHOE_GYEONGSEON_PATH, locale, true),
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

export default async function ChoeGyeongseonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHOE_GYEONGSEON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('최경선');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isChoeGyeongseonArtist(artwork.artist)
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
    { name: isEnglish ? 'Choe Gyeong-seon' : '최경선', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHOE_GYEONGSEON_PATH}#person-choe-gyeongseon`,
    name: isEnglish ? 'Choe Gyeong-seon' : '최경선',
    alternateName: isEnglish ? '최경선' : 'Choe Gyeong-seon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Choe Gyeong-seon is a mid-career Korean painter who draws the vitality, sorrow, and healing of life from the materials of nature, painting the free float of the mind.'
      : '최경선은 자연을 소재로 삶의 생동·슬픔·치유를 화폭에 담아온 중견 작가로, 마음의 유영(遊泳)을 그립니다.',
    knowsAbout: isEnglish
      ? ['Korean painting', 'Nature as subject', 'The free float of the mind']
      : ['회화', '자연 소재', '마음의 유영'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Choe Gyeong-seon — SAF Online' : '최경선 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Choe Gyeong-seon from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 최경선 작품들을 소개합니다.',
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

          {/* Faint water-surface lines — 고요한 수면·마음의 동선 모티프 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Choe Gyeong-seon · Painter' : '최경선 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The mind,
                  <br />
                  <span className="text-primary-soft">in free float</span>
                </>
              ) : (
                <>
                  마음이
                  <br />
                  <span className="text-primary-soft">유영하는 자리</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    At a still water surface, the heart grows as supple as a fish.
                  </span>
                  <span className="mt-2 block">
                    The vitality, sorrow, and healing of life — drawn from nature.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">고요한 수면에서 마음이 물고기처럼 유연해진다.</span>
                  <span className="mt-2 block">
                    자연에서 길어 올린 삶의 생동, 슬픔, 그리고 치유.
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
                    A mind that crosses over —<br />
                    <span className="text-primary-strong">from the seen to the unseen</span>
                  </>
                ) : (
                  <>
                    건너가는 마음 —<br />
                    <span className="text-primary-strong">보이는 것에서 보이지 않는 것으로</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Choe Gyeong-seon is a mid-career Korean painter who has, over many years,
                      drawn the vitality, sorrow, and healing of life onto the canvas from the
                      materials of nature. The works gathered here — including new paintings made
                      for this exhibition — give form to what she calls the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        free float of the mind (遊泳)
                      </strong>
                      .
                    </p>
                    <p>
                      She often contemplates the trajectory of a mind that turns somersaults. At a
                      still water surface, beneath a low-blooming flower, in a swaying thicket of
                      grass, in a child&apos;s gesture, on the bridge of the water&apos;s nose — she
                      believes the heart grows as supple as a fish. This wandering of the mind
                      through space, she makes clear, is far from a daydream of escape: it is the
                      central rhythm that carries her across — from herself to others, from the seen
                      to the unseen.
                    </p>
                    <p>
                      It is the same shape as a willingness to give one&apos;s body, gladly, to joy,
                      to discouragement, to mourning. Just as the turn of a season is felt all at
                      once, she is especially attuned to the slight moment of transition in which
                      pain is ventilated into sorrow — because perhaps it is exactly then, when all
                      that had stood opposed crosses over its own difference, that the{' '}
                      <strong className="font-bold text-charcoal">language of life</strong> is born.
                    </p>
                    <p>
                      Her hope is that those who look might come to carry a rhythm of life through
                      which — even amid the jostle and friction of living — they can see the primal
                      cheerfulness that resides within nature and within people.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      최경선은 자연을 소재로 꾸준히 삶의 생동, 슬픔, 치유 등을 화폭에 담아온 중견
                      작가다. 이번 전시 신작을 포함한 작품들은{' '}
                      <strong className="font-bold text-charcoal-deep">‘마음의 유영(遊泳)’</strong>
                      을 표현한 작품들이다.
                    </p>
                    <p>
                      작가는 공중제비와 같은 마음의 동선에 대해 자주 사유한다. 고요한 수면,
                      야트막하게 핀 꽃, 흔들리는 풀숲, 아이의 몸짓, 물의 콧잔등에서 마음이
                      물고기처럼 유연해진다고 믿는다. 작가는 공간을 누비는 마음이 이탈을 꿈꾸는
                      심상과는 거리가 있으며, 자신에게서 타인으로, 보이는 것에서 보이지 않는 것으로
                      건너가게 해주는{' '}
                      <strong className="font-bold text-charcoal-deep">중심 리듬</strong>임을
                      밝힌다.
                    </p>
                    <p>
                      이는 기쁨, 낙심, 애도에 기꺼이 몸을 싣는 모양과도 같다. 계절의 변화가 갑자기
                      느껴지듯 고통이 슬픔으로 환기되는 미미한 전환의 순간에 작가는 특별히 감응한다.
                      대치되었던 모든 것들이 그 차이를 넘나드는 바로 그때{' '}
                      <strong className="font-bold text-charcoal">생명의 언어</strong>가 태어나는
                      순간일지 모르기 때문이다.
                    </p>
                    <p>
                      작가는 보는 이들이 부대낌이 있더라도 자연과 사람 안에 있는 태초의 명랑함을 볼
                      수 있는 삶의 리듬을 지니게 되기를 희망한다.
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
                        {isEnglish ? 'The free float of the mind' : '마음의 유영'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'At a still surface or in a swaying thicket, the heart grows supple as a fish — the central rhythm that carries one across, not a daydream of escape.'
                          : '고요한 수면, 흔들리는 풀숲에서 마음이 물고기처럼 유연해진다. 이탈이 아니라 건너가게 하는 중심 리듬.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Vitality, sorrow, healing' : '생동·슬픔·치유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Nature as the source of life drawn onto canvas — a willingness to give the body, gladly, to joy, discouragement, and mourning alike.'
                          : '자연에서 길어 올린 삶의 결. 기쁨, 낙심, 애도에 기꺼이 몸을 싣는 마음.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The language of life' : '생명의 언어'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The slight moment when pain is ventilated into sorrow and opposites cross their difference — a primal cheerfulness within nature and people.'
                          : '고통이 슬픔으로 환기되고 대치된 것들이 차이를 넘나드는 순간. 자연과 사람 안의 태초의 명랑함.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Solo exhibitions' : '개인전'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Midong〉, Zaha Museum, Seoul.'
                        : '「미동」, 자하미술관(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Life · Water〉, Namu Gallery, Seoul.'
                        : '「生·물(水)」, 나무화랑(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Coming Home〉, Changnyong Village Creation Center, Gyeonggi; 〈Evening of the Biotope〉, Namu Gallery, Seoul.'
                        : '「귀가」, 창룡마을창작센터(경기); 「비오톱의 저녁」, 나무화랑(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Flowing Light〉, Osan Museum of Art, Gyeonggi.'
                        : '「흐르는 빛」, 오산시립미술관(경기).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Poesie of Existence〉, Kwanhoon Gallery, Seoul.'
                        : '「실존의 포에지(poesie)」, 관훈갤러리(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Feast of Childhood〉, Gallery Artside, Beijing, China.'
                        : '「유년의 잔치」, 갤러리아트사이드(베이징·중국).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Seat of Vain Desire〉, T Art Center, Beijing, China.'
                        : '「허욕의 자리」, T Art Center(베이징·중국).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Return〉, Dukwon Gallery, Seoul.'
                        : '「RETURN」, 덕원갤러리(서울).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'A practice across two decades' : '두 시기를 가로지른 작업'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'From 〈Return〉 (Dukwon Gallery, 2001) onward, an enduring solo practice — nature carried steadily as the central subject of the work.'
                        : '「RETURN」(덕원갤러리, 2001)을 기점으로 이어진 개인전 — 자연을 일관된 중심 소재로 삼아 온 작업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Beijing chapters: 〈The Seat of Vain Desire〉, T Art Center (2009) and 〈Feast of Childhood〉, Gallery Artside (2010).'
                        : '베이징 시기: 「허욕의 자리」, T Art Center (2009)와 「유년의 잔치」, 갤러리아트사이드 (2010).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Museum and gallery solo shows: Osan Museum of Art 〈Flowing Light〉 (2015) and Zaha Museum 〈Midong〉 (2020).'
                        : '미술관·화랑 개인전: 오산시립미술관 「흐르는 빛」 (2015), 자하미술관 「미동」 (2020).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'A sustained dialogue with water and life: 〈Life · Water〉 and 〈Evening of the Biotope〉, both at Namu Gallery.'
                        : '물과 생명에 관한 지속적 사유: 나무화랑의 「生·물(水)」과 「비오톱의 저녁」.'}
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
                  <span className="text-charcoal-deep">on nature, the mind, and crossing over</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">자연과 마음, 그리고 건너감에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 자연을 소재로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Nature as material — vitality, sorrow, healing'
                    : '자연을 소재로 — 생동, 슬픔, 치유'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Across two decades of solo exhibitions — from <em>Return</em> at Dukwon
                        Gallery in 2001 to <em>Midong</em> at the Zaha Museum in 2020 — Choe
                        Gyeong-seon has held to a single material: nature. Not nature as backdrop or
                        decoration, but nature as the source from which the vitality, sorrow, and
                        healing of life can be drawn.
                      </p>
                      <p>
                        A still water surface, a low-blooming flower, a swaying thicket of grass, a
                        child&apos;s gesture, the bridge of the water&apos;s nose — these are her
                        recurring subjects, and they are never merely seen. They are places where
                        something in the looker softens. In her work nature is less a view than a
                        condition: the place where the heart is allowed to grow supple.
                      </p>
                      <p>
                        That softening is the precondition for everything else in her painting.
                        Before the mind can float, before it can cross from one thing to another, it
                        has to loosen — and nature, in her hands, is what loosens it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2001년 덕원갤러리의 「RETURN」부터 2020년 자하미술관의 「미동」까지, 두
                        시기에 걸친 개인전 동안 최경선은 하나의 소재를 붙들어 왔다 — 자연. 배경이나
                        장식으로서의 자연이 아니라, 삶의 생동과 슬픔과 치유를 길어 올릴 수 있는
                        원천으로서의 자연이다.
                      </p>
                      <p>
                        고요한 수면, 야트막하게 핀 꽃, 흔들리는 풀숲, 아이의 몸짓, 물의 콧잔등 —
                        이것들은 그의 되풀이되는 소재이며, 결코 단지 보이는 것에 그치지 않는다.
                        그것들은 보는 이 안의 무언가가 부드러워지는 자리다. 그의 작업에서 자연은
                        풍경이라기보다 하나의 조건이다. 마음이 유연해지도록 허락되는 자리.
                      </p>
                      <p>
                        그 부드러워짐이 그의 회화에서 일어나는 다른 모든 일의 전제다. 마음이
                        유영하기 전에, 하나에서 다른 하나로 건너가기 전에, 마음은 먼저 풀려야 한다 —
                        그리고 그의 손에서 마음을 푸는 것이 곧 자연이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 마음의 유영 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The free float of the mind — a central rhythm, not an escape'
                    : '마음의 유영 — 이탈이 아닌 중심 리듬'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The works in this exhibition give form to what the artist calls the{' '}
                        <em>free float of the mind</em>. She thinks often about the trajectory of a
                        mind that turns somersaults — its loops, its reversals, the way it moves
                        through space rather than along a line.
                      </p>
                      <p>
                        It would be easy to mistake this for a wish to escape. The artist is careful
                        to refuse that reading. The wandering of the mind through space, she makes
                        clear, is far from a daydream of departure. It is the very opposite: the
                        central rhythm that carries her across — from herself to others, from the
                        seen to the unseen. To float, here, is not to leave but to connect.
                      </p>
                      <p>
                        And so the same motion that looks like drifting is, in fact, a willingness:
                        the readiness to give the body, gladly, to joy, to discouragement, to
                        mourning. The floating mind does not avoid feeling; it lends itself to
                        feeling fully, moving through each state the way a fish moves through water.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이번 전시의 작품들은 작가가 ‘마음의 유영’이라 부르는 것에 형상을 부여한다.
                        작가는 공중제비와 같은 마음의 동선에 대해 자주 사유한다 — 그 회전, 그
                        뒤집힘, 선을 따라 가지 않고 공간을 누비는 방식.
                      </p>
                      <p>
                        이것을 이탈의 소망으로 오해하기는 쉽다. 작가는 그런 독해를 조심스레
                        거절한다. 공간을 누비는 마음은 이탈을 꿈꾸는 심상과는 거리가 있다고 그는
                        밝힌다. 오히려 그 반대다 — 자신에게서 타인으로, 보이는 것에서 보이지 않는
                        것으로 건너가게 해주는 중심 리듬. 여기서 유영한다는 것은 떠나는 것이 아니라
                        잇는 것이다.
                      </p>
                      <p>
                        그래서 표류처럼 보이는 바로 그 움직임은 사실 하나의 기꺼움이다 — 기쁨, 낙심,
                        애도에 기꺼이 몸을 싣는 마음의 준비. 유영하는 마음은 감정을 피하지 않는다.
                        오히려 그 감정에 온전히 자신을 내주며, 물고기가 물을 지나듯 각각의 상태를
                        지난다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 생명의 언어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The language of life — the moment opposites cross'
                    : '생명의 언어 — 대치된 것들이 넘나드는 순간'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The artist is especially attuned to a particular, slight moment: the
                        transition in which pain is ventilated into sorrow. Just as the turn of a
                        season can be felt all at once, this shift is small and easy to miss — and
                        it is precisely there that she pays the closest attention.
                      </p>
                      <p>
                        Why this moment? Because perhaps it is exactly when all that had stood
                        opposed crosses over its own difference that the language of life is born.
                        Pain and sorrow, the seen and the unseen, self and other — these are not
                        reconciled by force but allowed to pass through one another, and in that
                        passage something living begins to speak.
                      </p>
                      <p>
                        Her hope for those who look is modest and exact: that even amid the jostle
                        and friction of living, they might come to carry a rhythm of life through
                        which they can see the primal cheerfulness residing within nature and within
                        people. Not a cheerfulness that denies pain, but one that has crossed
                        through it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        작가는 특정한, 미미한 순간에 특별히 감응한다 — 고통이 슬픔으로 환기되는
                        전환의 순간. 계절의 변화가 갑자기 느껴지듯, 이 전환은 작고 놓치기 쉽다.
                        그리고 바로 그 자리에서 작가는 가장 면밀히 주의를 기울인다.
                      </p>
                      <p>
                        왜 이 순간인가. 대치되었던 모든 것들이 그 차이를 넘나드는 바로 그때 생명의
                        언어가 태어나는 순간일지 모르기 때문이다. 고통과 슬픔, 보이는 것과 보이지
                        않는 것, 나와 타인 — 이것들은 힘으로 화해되는 것이 아니라 서로를 통과하도록
                        허락되고, 그 통과 속에서 살아 있는 무언가가 말하기 시작한다.
                      </p>
                      <p>
                        보는 이를 향한 작가의 바람은 소박하고 정확하다 — 부대낌이 있더라도 자연과
                        사람 안에 있는 태초의 명랑함을 볼 수 있는 삶의 리듬을 지니게 되기를. 고통을
                        부정하는 명랑함이 아니라, 그것을 통과해 온 명랑함을.
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
                      From her 2001 solo debut to the new works made for this exhibition, Choe
                      Gyeong-seon&apos;s painting has pursued a single, patient question: how does a
                      mind cross — from itself to others, from the seen to the unseen — and how does
                      nature teach it to? She joins this campaign not as a subject of its cause but
                      as a fellow artist in solidarity, so that those who come after might work with
                      a little less of the weight that financial exclusion places on Korean artists.
                    </>
                  ) : (
                    <>
                      2001년 첫 개인전부터 이번 전시의 신작까지, 최경선의 회화는 하나의 차분한
                      물음을 추구해 왔다 — 마음은 어떻게 건너가는가, 자신에게서 타인으로, 보이는
                      것에서 보이지 않는 것으로, 그리고 자연은 그것을 어떻게 가르치는가. 그는
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Choe Gyeong-seon
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
                    Choe Gyeong-seon joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    최경선 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHOE_GYEONGSEON_PATH}
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
