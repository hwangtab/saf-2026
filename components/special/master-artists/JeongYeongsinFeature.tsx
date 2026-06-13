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

// 작가 feature는 작가 페이지(/artworks/artist/정영신)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JEONG_YEONGSIN_PATH = `/artworks/artist/${encodeURIComponent('정영신')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongYeongsinArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정영신' ||
    n === 'jeong yeongsin' ||
    n === 'jeong yeong-sin' ||
    n.replace(/[\s-]+/g, '') === 'jeongyeongsin'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정영신 — 바람의 여행자, 전국 6백 장터를 기록하다',
    description:
      '40년째 전국의 오일장을 탐구해 온 기록사진가이자 소설가 정영신(1958–). 전국 6백여 곳 오일장을 모두 기록한 〈바람의 여행자〉. 사라져가는 시골 장터의 사람과 표정, 삶을 문화유산으로 남기는 따뜻한 기록 사진을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '40년째 전국 오일장을 기록해 온 사진가 정영신. 전국 6백여 곳 장터를 모두 기록한 바람의 여행자, 사라져가는 시골 장터를 문화유산으로.',
    ogAlt: '정영신 대표 작품',
    twitterTitle: '정영신',
    twitterDescription: '바람의 여행자 — 40년간 전국 6백 장터를 기록한 사진가 정영신',
    keywords:
      '정영신 사진가, 오일장, 5일장, 장터 사진, 시골장, 기록사진, 바람의 여행자, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Yeongsin — Traveler of the Wind, Chronicler of 600 Markets',
    description:
      'Selected works by Jeong Yeongsin (b. 1958), a documentary photographer and novelist who has explored Korea&apos;s five-day markets for forty years. A &ldquo;traveler of the wind&rdquo; who has recorded all of the roughly 600 traditional markets across the country, she preserves the people, faces, and lives of vanishing rural markets as cultural heritage. View her warm, earthy chronicle at SAF Online.',
    ogDescription:
      'Jeong Yeongsin — a photographer who has chronicled Korea&apos;s five-day markets for forty years. A traveler of the wind, turning vanishing rural markets into cultural heritage.',
    ogAlt: 'Jeong Yeongsin — featured work',
    twitterTitle: 'Jeong Yeongsin',
    twitterDescription:
      'Traveler of the wind — a photographer who has chronicled 600 markets across Korea for forty years',
    keywords:
      'Jeong Yeongsin photographer, Korean five-day market, traditional market photography, rural market, documentary photography',
  },
} as const;

export async function buildJeongYeongsinMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_YEONGSIN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정영신');
  const artwork = allArtworks.find((a) => isJeongYeongsinArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Yeongsin`
      : `${artwork.title} — 정영신`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_YEONGSIN_PATH, locale, true),
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

export default async function JeongYeongsinFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_YEONGSIN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정영신');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJeongYeongsinArtist(artwork.artist)
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
    { name: isEnglish ? 'Jeong Yeongsin' : '정영신', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_YEONGSIN_PATH}#person-jeong-yeongsin`,
    name: isEnglish ? 'Jeong Yeongsin' : '정영신',
    alternateName: isEnglish ? '정영신' : 'Jeong Yeongsin',
    jobTitle: isEnglish ? 'Documentary photographer, novelist' : '기록사진가, 소설가',
    description: isEnglish
      ? 'Jeong Yeongsin (b. 1958) is a documentary photographer and novelist who has explored Korea&apos;s five-day markets for forty years, recording all of the roughly 600 traditional markets across the country.'
      : '정영신(1958–)은 40년째 전국의 오일장(5일장)을 탐구해 온 기록사진가이자 소설가로, 전국 6백여 곳 오일장을 모두 기록한 바람의 여행자입니다.',
    birthDate: '1958',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Hampyeong, South Jeolla, South Korea' : '전남 함평',
    },
    knowsAbout: isEnglish
      ? ['Documentary photography', 'Korean traditional markets', 'Five-day markets']
      : ['기록사진', '한국 오일장', '시골 장터'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Yeongsin — SAF Online' : '정영신 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Yeongsin from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 정영신 작품들을 소개합니다.',
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

          {/* Horizontal road lines — 장터를 향한 길·바람의 여행 모티프 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-sun/20" />
          <div className="absolute left-0 bottom-1/4 h-px w-full bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Yeongsin · b. 1958' : '정영신 · 1958–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A traveler of the wind,
                  <br />
                  <span className="text-primary-soft">chronicling 600 markets</span>
                </>
              ) : (
                <>
                  바람의 여행자,
                  <br />
                  <span className="text-primary-soft">전국 6백 장터를 기록하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    For forty years, she has walked toward the five-day markets.
                  </span>
                  <span className="mt-2 block">
                    The people, the faces, the lives of a vanishing rural Korea.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">40년째 오일장을 향해 걸어온 사람.</span>
                  <span className="mt-2 block">
                    사라져가는 시골 장터의 사람과 표정, 그 안의 삶을 기록하다.
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
                    Forty years on the road —<br />
                    <span className="text-primary-strong">a country mapped by its markets</span>
                  </>
                ) : (
                  <>
                    길 위의 40년 —<br />
                    <span className="text-primary-strong">장터로 그린 나라의 지도</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Yeongsin (b. 1958) was born in Hampyeong, South Jeolla province. A
                      documentary photographer and novelist, she has spent forty years exploring
                      Korea&apos;s five-day markets — the rotating rural fairs that gather, sell,
                      and scatter every fifth day. She is a &ldquo;traveler of the wind&rdquo; who
                      has recorded all of the roughly six hundred such markets across the country.
                    </p>
                    <p>
                      For her, the market is not a subject to be observed from outside but a place
                      longed for like the kitchen garden of a hometown. She has written that markets
                      are where our mothers and grandmothers stand — and her camera follows that
                      gaze, turning toward the people, their faces, and the warmth of a life lived
                      in common.
                    </p>
                    <p>
                      Across decades she has carried this work into books and exhibitions alike:{' '}
                      <em>The Beloved Land, the Longed-for Market — South Jeolla</em> (2025),{' '}
                      <em>The Mongrel Pups I Met at Country Markets</em> (2023),{' '}
                      <em>A Solitary Walk Along the Janghang Line Market Road</em> (2023),{' '}
                      <em>My Mother&apos;s Land</em> (2021), <em>Let&apos;s Go to the Market</em>{' '}
                      (2020), <em>Market Day</em> (2016),{' '}
                      <em>A Pilgrimage to Korea&apos;s Five-Day Markets</em> (2015),{' '}
                      <em>Markets of Korea</em> (2012), and <em>Tales of the Country Market</em>{' '}
                      (2002). The records of Jinan, Jeongseon, and countless other market towns
                      accumulate into a single, tender archive.
                    </p>
                    <p>
                      Her work has also lived in print and on the air: a series, &ldquo;Jeong
                      Yeongsin&apos;s Market Pilgrimage,&rdquo; ran in the{' '}
                      <em>Farmers&apos; Newspaper</em> (2013–2014), and &ldquo;Stories from Within
                      the Market&rdquo; aired on TBN traffic broadcasting (2014). Today she serves
                      as an editorial member and contributing reporter for{' '}
                      <em>Seoul Culture Today</em>, where her column &ldquo;Jeong Yeongsin&apos;s
                      Market Tales&rdquo; continues.
                    </p>
                    <p>
                      As the country markets quietly disappear, her photographs do the slow work of
                      remembrance — gathering what is fading into something that can be passed on as
                      cultural heritage. The market, in her hands, becomes a place we can return to.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정영신(1958–)은 전남 함평에서 태어났다. 기록사진가이자 소설가인 그는 40년째
                      전국의 오일장(5일장)을 탐구해 왔다 — 닷새마다 모이고 사고팔고 흩어지는 시골
                      장을. 전국 6백여 곳 오일장을 모두 기록한{' '}
                      <strong className="font-bold text-charcoal-deep">바람의 여행자</strong>다.
                    </p>
                    <p>
                      그에게 장터는 밖에서 관찰하는 대상이 아니라 고향의 텃밭처럼 그리워하는 곳이다.
                      장터에는 우리의 엄마와 할매가 있다고 그는 말해 왔고, 그의 카메라는 그 시선을
                      따라 사람과 표정, 함께 살아온 삶의 온기를 향한다.
                    </p>
                    <p>
                      수십 년에 걸쳐 그는 이 작업을 책과 전시로 함께 이어왔다 — 《정든땅 그리운장터–
                      전라남도편》(2025), 《시골장터에서 만난 똥강아지들》(2023), 《혼자 가본 장항선
                      장터길》(2023), 《어머니의 땅》(2021), 《장에 가자》(2020), 《장날》(2016),
                      《정영신의 전국 5일장 순례기》(2015), 《한국의 장터》(2012), 《시골장터
                      이야기》(2002). 진안·정선을 비롯한 숱한 장터 마을의 기록이 한 권의 다정한
                      아카이브로 쌓인다.
                    </p>
                    <p>
                      그의 작업은 지면과 방송으로도 이어졌다. 농민신문에 〈정영신의 장터순례〉를
                      연재했고(2013–2014), 교통방송 TBN에서 〈정영신의 장터 속 이야기〉를 진행했다
                      (2014). 현재는 서울문화투데이 편집위원이자 객원기자로, 〈정영신의
                      장터이야기〉를 연재하고 있다.
                    </p>
                    <p>
                      시골 장터가 조용히 사라져가는 동안, 그의 사진은 더디게 기억하는 일을 한다 —
                      흩어지는 것을 모아, 다음 세대에 건넬 수 있는 문화유산으로. 그의 손에서 장터는
                      다시 돌아갈 수 있는 곳이 된다.
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
                        {isEnglish ? 'The five-day market' : '오일장의 기록'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Forty years recording the roughly 600 rotating rural markets across Korea — a country mapped by where it gathers to trade.'
                          : '40년간 전국 6백여 곳 오일장을 모두 기록한 작업. 닷새마다 모이는 시골 장으로 그린 나라의 지도.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'People and faces' : '사람과 표정'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The mothers and grandmothers of the market — a warm, earthy chronicle of lives lived in common rather than scenery observed from outside.'
                          : '장터의 엄마와 할매들 — 밖에서 본 풍경이 아니라, 함께 살아온 삶을 향한 따뜻하고 토속적인 기록.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Market as heritage' : '문화유산으로서의 장터'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Gathering the vanishing country market into something to be passed on — photography as the slow work of remembrance.'
                          : '사라져가는 시골 장터를 모아 다음 세대에 건네는 일 — 더디게 기억하는 일로서의 사진.'}
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
                      1958
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Hampyeong, South Jeolla province.' : '전남 함평 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publishes 《Tales of the Country Market》 (Jinsun).'
                        : '《시골장터이야기》(진선출판사) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Jeong Yeongsin&apos;s Markets〉 (Dukwon Gallery); publishes 《Markets of Korea》 (Noonbit).'
                        : '개인전 〈정영신의 장터〉(덕원갤러리); 《한국의 장터》(눈빛아카이브) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Serializes &ldquo;Jeong Yeongsin&apos;s Market Pilgrimage&rdquo; in the Farmers&apos; Newspaper (2013–2014); hosts &ldquo;Stories from Within the Market&rdquo; on TBN (2014).'
                        : '농민신문 〈정영신의 장터순례〉 연재(2013–2014); 교통방송 TBN 〈정영신의 장터 속 이야기〉 진행(2014).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Market Day〉 (Ara Art); publishes 《Market Day》 (Noonbit Photographers&apos; Selection).'
                        : '개인전 〈장날〉(아라아트); 《장날》(눈빛사진가선) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Let&apos;s Go to the Market〉 (Gallery Bresson); publishes 《Let&apos;s Go to the Market》 (Esoope).'
                        : '개인전 〈장에 가자〉(갤러리브레송); 《장에 가자》(이숲) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Market Day〉 (Donuimun Museum Village artist gallery, 2021–2022); publishes 《My Mother&apos;s Land》 (Noonbit, 2021).'
                        : '개인전 〈장날〉(돈의문박물관마을 작가갤러리, 2021–2022); 《어머니의 땅》(눈빛, 2021) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《A Solitary Walk Along the Janghang Line Market Road》 publication exhibition (Gallery Index, Insadong); publishes 《The Mongrel Pups I Met at Country Markets》 (Esoope).'
                        : '《혼자 가본 장항선 장터길》 출판기념전(갤러리 인덱스, 인사동); 《시골장터에서 만난 똥강아지들》(이숲) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈My Mother&apos;s Land〉 (Jeonju Seohakdong Photography Museum).'
                        : '개인전 〈어머니의 땅〉(전주서학동사진미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions 〈From the Market to Cultural Heritage〉 (Gallery Bresson) and 〈Naehanti Is This Market, and People Are the Best Medicine〉 (Gallery Index); publishes 《The Beloved Land, the Longed-for Market — South Jeolla》 (Noonbit).'
                        : '개인전 〈장터를 지나 문화유산으로〉(갤러리 브레송)·〈내한티는 요 장터허고 사람이 보약이랑께〉(갤러리인덱스); 《정든땅 그리운장터–전라남도편》(눈빛) 출간.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & books' : '주요 전시 및 저서'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈From the Market to Cultural Heritage〉 (Gallery Bresson, 2025), 〈My Mother&apos;s Land〉 (Jeonju Seohakdong Photography Museum, 2024), 〈장에 가자〉 (Gallery Bresson, 2020), 〈Jeong Yeongsin&apos;s Markets〉 (Dukwon Gallery, 2012), and the market photographs of Jinan, Jeongseon, and beyond.'
                        : '개인전: 〈장터를 지나 문화유산으로〉(갤러리 브레송, 2025), 〈어머니의 땅〉(전주서학동사진미술관, 2024), 〈장에 가자〉(갤러리브레송, 2020), 〈정영신의 장터〉(덕원갤러리, 2012), 진안·정선 등지의 장터 사진 다수.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈Sunsil-jeon〉 (Namu Gallery, 2017), 〈Candlelight History Exhibition〉 (Gwanghwamun Square, 2017), and others.'
                        : '단체전: 〈순실뎐〉(나무화랑, 2017), 〈촛불역사전〉(광화문광장, 2017) 등 다수.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Books: 《The Beloved Land, the Longed-for Market — South Jeolla》 (2025), 《A Pilgrimage to Korea&apos;s Five-Day Markets》 (2015), 《Markets of Korea》 (2012), 《Tales of the Country Market》 (2002), and more — published by Noonbit, Esoope, and others.'
                        : '저서: 《정든땅 그리운장터–전라남도편》(2025), 《정영신의 전국 5일장 순례기》(2015), 《한국의 장터》(2012), 《시골장터이야기》(2002) 등 — 눈빛·이숲·진선 등에서 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Currently an editorial member and contributing reporter for Seoul Culture Today, where the column &ldquo;Jeong Yeongsin&apos;s Market Tales&rdquo; continues.'
                        : '현재 서울문화투데이 편집위원·객원기자로 〈정영신의 장터이야기〉 연재 중.'}
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
                  <span className="text-charcoal-deep">on the market and its keeper</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">장터와 그 지킴이에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 바람의 여행자 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'A traveler of the wind — forty years toward the market'
                    : '바람의 여행자 — 장터를 향한 40년'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The five-day market is, by its nature, a thing that appears and disappears.
                        Every fifth day a town square fills with sellers and buyers, with produce
                        and livestock and talk; by evening it has scattered again. To photograph it
                        is to chase something that will not stay still — which is perhaps why Jeong
                        Yeongsin has been called a traveler of the wind.
                      </p>
                      <p>
                        Over forty years she has recorded all of the roughly six hundred such
                        markets across Korea. The number is not a boast but a method: only by going
                        everywhere, again and again, across decades, could the full shape of a
                        vanishing institution be held. Her archive is less a collection of pictures
                        than a long act of attendance.
                      </p>
                      <p>
                        And she has not only photographed. A novelist as well as a photographer, she
                        has written the market into books and newspaper columns and radio, building
                        a body of work in which image and text lean on each other — each market
                        remembered twice, once by the camera and once by the sentence.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        오일장은 본래 나타났다 사라지는 것이다. 닷새마다 마을의 빈터가 파는 이와
                        사는 이로, 푸성귀와 가축과 말소리로 가득 찼다가 저녁이면 다시 흩어진다.
                        그것을 찍는다는 건 가만히 머물지 않는 것을 좇는 일이다 — 어쩌면 그래서
                        정영신은 바람의 여행자라 불려 왔다.
                      </p>
                      <p>
                        40년에 걸쳐 그는 전국 6백여 곳 오일장을 모두 기록했다. 그 숫자는 자랑이
                        아니라 방법이다. 수십 년 동안 거듭 모든 곳을 찾아가야만, 사라져가는 한
                        제도의 전모를 붙들 수 있었다. 그의 아카이브는 사진의 모음이라기보다, 오래
                        곁을 지킨 일의 기록에 가깝다.
                      </p>
                      <p>
                        그는 찍기만 한 것이 아니다. 사진가이자 소설가인 그는 장터를 책과 신문 연재와
                        방송으로 써 왔고, 이미지와 글이 서로 기대는 작업을 쌓았다 — 저마다의 장터가
                        두 번 기억된다, 한 번은 카메라로, 한 번은 문장으로.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 엄마와 할매가 있는 곳 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Where the mothers and grandmothers are — the gaze of the work'
                    : '엄마와 할매가 있는 곳 — 작업의 시선'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Much market photography keeps its distance: the picturesque stall, the
                        colorful crowd, the scene observed from the outside. Jeong Yeongsin&apos;s
                        does the opposite. For her the market is a place longed for like the kitchen
                        garden of a hometown — somewhere one belongs, not somewhere one visits.
                      </p>
                      <p>
                        That belonging shows in who fills the frame. Hers is a market of mothers and
                        grandmothers — the women who carry the produce, mind the stalls, and hold
                        the place together. The faces are not types but people; the warmth is not
                        staged but earned by return. Her books bear titles in the local dialect of
                        South Jeolla, and the language itself keeps the work close to the ground it
                        comes from.
                      </p>
                      <p>
                        The result is a chronicle that is tender without being sentimental — an
                        insistence that the ordinary life of a country market is worth the full
                        attention of a camera, and worth being remembered as it is.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        많은 장터 사진은 거리를 둔다 — 그림 같은 좌판, 알록달록한 인파, 밖에서 본
                        풍경. 정영신의 사진은 그 반대다. 그에게 장터는 고향의 텃밭처럼 그리워하는
                        곳, 들르는 곳이 아니라 속한 곳이다.
                      </p>
                      <p>
                        그 속함은 화면을 채우는 사람에게서 드러난다. 그의 장터는 엄마와 할매의
                        장터다 — 물건을 이고 지고, 좌판을 지키고, 그 자리를 지탱하는 사람들. 표정은
                        유형이 아니라 사람이고, 온기는 연출이 아니라 거듭 찾아가 얻은 것이다. 그의
                        책들은 전라도 사투리 그대로의 제목 — 〈내한티는 요 장터허고 사람이
                        보약이랑께〉 — 을 달고, 그 말 자체가 작업을 발 디딘 땅 가까이 붙들어 둔다.
                      </p>
                      <p>
                        그렇게 다정하되 감상에 빠지지 않는 기록이 남는다 — 시골 장터의 평범한 삶이
                        카메라의 온전한 주목을 받을 만하고, 있는 그대로 기억될 만하다는 고집.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 장터를 지나 문화유산으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From the market to cultural heritage — what the record is for'
                    : '장터를 지나 문화유산으로 — 기록의 쓸모'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her 2025 exhibition took its title directly: 〈From the Market to Cultural
                        Heritage〉. It names the arc of the whole project. The country market is
                        quietly disappearing — to roads and supermarkets, to depopulation, to time.
                        What a forty-year record offers is not nostalgia but inheritance: a way for
                        what is fading to be passed on.
                      </p>
                      <p>
                        Across her books — from 《Tales of the Country Market》 (2002) through 《The
                        Beloved Land, the Longed-for Market — South Jeolla》 (2025) — the markets of
                        a whole country accumulate into a single archive. Read together, they are a
                        map of a Korea that lived by its five-day fairs, region by region, decade by
                        decade.
                      </p>
                      <p>
                        This is the quiet ambition of the work: to move the market out of memory and
                        into heritage — so that a place once taken for granted might be kept, and so
                        that those who come after can still find their way back to it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2025년 전시는 제목으로 곧장 말한다 — 〈장터를 지나 문화유산으로〉. 그것이 이
                        작업 전체의 궤적을 이름 붙인다. 시골 장터는 조용히 사라져간다 — 도로와
                        대형마트로, 인구 감소로, 시간으로. 40년의 기록이 건네는 것은 향수가 아니라
                        상속이다 — 흩어지는 것이 다음으로 이어지는 길.
                      </p>
                      <p>
                        《시골장터이야기》(2002)부터 《정든땅 그리운장터–전라남도편》(2025)까지,
                        그의 책들 안에서 한 나라의 장터가 한 권의 아카이브로 쌓인다. 함께 읽으면,
                        그것은 오일장으로 살아온 한국의 지도다 — 지역별로, 시대별로.
                      </p>
                      <p>
                        그것이 이 작업의 조용한 야심이다 — 장터를 기억에서 문화유산으로 옮기는 일.
                        당연하게 여겨지던 한 곳이 지켜지도록, 그리고 다음 세대가 그곳으로 돌아가는
                        길을 여전히 찾을 수 있도록.
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
                      From a country fair in South Jeolla to six hundred markets across Korea, Jeong
                      Yeongsin&apos;s work has pursued a single thing: to stay beside what is
                      vanishing long enough to pass it on. She joins this campaign not as a subject
                      of its cause but as a fellow artist in solidarity — so that those who keep
                      such records might do their work without the weight of financial exclusion.
                    </>
                  ) : (
                    <>
                      전라도의 한 시골 장에서 전국 6백 장터까지, 정영신의 작업은 한 가지를 추구해
                      왔다 — 사라지는 것 곁에 충분히 오래 머물러 다음으로 건네는 일. 그는 씨앗페에
                      이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 이런
                      기록을 이어가는 이들이 금융 차별의 무게 없이 일할 수 있도록.
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
                MARKET
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
                Jeong Yeongsin
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
                    Jeong Yeongsin joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정영신 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_YEONGSIN_PATH}
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
