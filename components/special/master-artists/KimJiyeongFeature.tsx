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

// 작가 feature는 작가 페이지(/artworks/artist/김지영)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='김지영', name_en='Kim Jiyeong' (영문 표기 Kim Jiyoung), 매체: 도예.
const KIM_JIYEONG_PATH = `/artworks/artist/${encodeURIComponent('김지영')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimJiyeongArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김지영' ||
    n === 'kim jiyeong' ||
    n === 'kim ji-yeong' ||
    n === 'kim jiyoung' ||
    n === 'kim ji-young' ||
    n.replace(/[\s-]+/g, '') === 'kimjiyeong' ||
    n.replace(/[\s-]+/g, '') === 'kimjiyoung'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김지영 — 자연의 생명력을 흙으로 빚는 도예가',
    description:
      '자연에서 영감을 받은 작품을 빚는 도예가 김지영. 〈순 돋는 나무〉·〈나무 한 그루〉 연작을 통해 심플하고 자연주의적인 작품세계를 펼친다. 흙으로 옮긴 나무와 새순, 자연의 생명력을 도자의 물성으로 빚어내는 김지영의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '자연에서 영감을 받은 도예가 김지영. 〈순 돋는 나무〉·〈나무 한 그루〉 — 자연의 생명력을 흙으로 빚는 심플하고 자연주의적인 작품세계.',
    ogAlt: '김지영 대표 작품',
    twitterTitle: '김지영',
    twitterDescription: '흙으로 빚는 새순 — 자연의 생명력을 옮기는 도예가 김지영',
    keywords:
      '김지영 도예가, 도예, 도자, 순 돋는 나무, 나무 한 그루, 자연주의, 자연 영감, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Jiyeong — Ceramicist Shaping the Life Force of Nature in Clay',
    description:
      'Selected works by Kim Jiyeong, a ceramicist who shapes works inspired by nature. Through the 〈Sprouting Tree〉 and 〈A Single Tree〉 series, she unfolds a simple, naturalistic artistic world. Trees and new shoots translated into clay — the life force of nature shaped into the materiality of ceramic. View and collect her works at SAF Online.',
    ogDescription:
      'Kim Jiyeong — a ceramicist inspired by nature. 〈Sprouting Tree〉 and 〈A Single Tree〉: the life force of nature shaped into clay in a simple, naturalistic world.',
    ogAlt: 'Kim Jiyeong — featured work',
    twitterTitle: 'Kim Jiyeong',
    twitterDescription:
      'New shoots shaped in clay — a ceramicist translating the life force of nature',
    keywords:
      'Kim Jiyeong ceramicist, ceramics, pottery, Sprouting Tree, A Single Tree, naturalism, nature-inspired art',
  },
} as const;

export async function buildKimJiyeongMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_JIYEONG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김지영');
  const artwork = allArtworks.find((a) => isKimJiyeongArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Jiyeong`
      : `${artwork.title} — 김지영`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_JIYEONG_PATH, locale, true),
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

export default async function KimJiyeongFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_JIYEONG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김지영');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimJiyeongArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Jiyeong' : '김지영', url: pageUrl },
  ]);

  // 검증된 DB 범위만 JSON-LD에 담는다. 생몰·학력·전시·수상·소장처는 DB에 없으므로
  // birthDate/award/alumniOf 등 미검증 필드는 절대 추가하지 않는다.
  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_JIYEONG_PATH}#person-kim-jiyeong`,
    name: isEnglish ? 'Kim Jiyeong' : '김지영',
    alternateName: isEnglish ? '김지영' : 'Kim Jiyeong',
    jobTitle: isEnglish ? 'Ceramicist' : '도예가',
    description: isEnglish
      ? 'Kim Jiyeong is a ceramicist who shapes works inspired by nature, unfolding a simple, naturalistic artistic world through the 〈Sprouting Tree〉 and 〈A Single Tree〉 series.'
      : '김지영은 자연에서 영감을 받은 작품을 주로 빚는 도예가로, 〈순 돋는 나무〉·〈나무 한 그루〉 연작을 통해 심플하고 자연주의적인 작품세계를 보여 줍니다.',
    knowsAbout: isEnglish
      ? ['Ceramics', 'Naturalism', 'Nature-inspired art']
      : ['도예', '자연주의', '자연에서 영감을 받은 작업'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Jiyeong — SAF Online' : '김지영 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Jiyeong from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김지영 작품을 소개합니다.',
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
        {/* Hero Section — 흙·새순: 자연주의의 차분한 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 새순이 돋는 모티프 — 아래에서 위로 뻗는 가는 선 */}
          <div className="absolute bottom-0 left-12 h-2/3 w-px bg-white/10" />
          <div className="absolute bottom-0 left-1/2 h-3/4 w-px bg-primary/25" />
          <div className="absolute bottom-0 right-16 h-1/2 w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Jiyeong · Ceramicist' : '김지영 · 도예'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  New shoots,
                  <br />
                  <span className="text-primary-soft">shaped in clay</span>
                </>
              ) : (
                <>
                  흙으로 빚는
                  <br />
                  <span className="text-primary-soft">새순</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The life force of nature, carried into the materiality of ceramic.
                  </span>
                  <span className="mt-2 block">
                    A simple, naturalistic world of trees and sprouting shoots.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">자연의 생명력을 도자의 물성으로 옮기다.</span>
                  <span className="mt-2 block">
                    나무와 새순으로 이룬 심플하고 자연주의적인 작품세계.
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
                    Clay and growth —<br />
                    <span className="text-primary-strong">nature given form by hand</span>
                  </>
                ) : (
                  <>
                    흙과 자람 —<br />
                    <span className="text-primary-strong">손으로 형상을 얻는 자연</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Jiyeong is a ceramicist whose work begins, again and again, from a single
                      source: nature. Rather than reaching for ornament, she draws her forms from
                      what grows — and the task she sets herself is to carry the life force of a
                      living thing into the slow, fixed materiality of clay.
                    </p>
                    <p>
                      Her practice gathers around the image of the tree. In the{' '}
                      <strong className="font-bold text-charcoal-deep">〈Sprouting Tree〉</strong>{' '}
                      series, the subject is not a tree in full leaf but the moment just before —
                      the new shoot pressing up out of the branch, growth caught at the instant it
                      becomes visible. To shape a sprouting shoot in clay is to hold a moving thing
                      still without killing the movement, and that paradox is the quiet centre of
                      her work.
                    </p>
                    <p>
                      The companion{' '}
                      <strong className="font-bold text-charcoal">〈A Single Tree〉</strong> series
                      narrows the gaze further. One tree, standing alone, becomes enough — a whole
                      world held in a single form. Here the naturalism is not a matter of faithful
                      copying but of attention: the tree is simplified until only what matters
                      remains, and what remains is its life.
                    </p>
                    <p>
                      Her language is deliberately spare. She withholds excess, paring each piece
                      down to a clean, simple silhouette so that the material itself — the weight of
                      the fired clay, the quiet of its surface — can do the speaking. In that
                      restraint a naturalistic world opens: not nature reproduced, but nature
                      distilled, slowed, and made to last.
                    </p>
                    <p>
                      What ties the two series together is a single conviction — that growth is
                      worth shaping, that the smallest beginning of a living thing deserves the
                      permanence of fired earth. Kim Jiyeong&apos;s ceramics are, in this sense, a
                      patient act of keeping: the new shoot remembered in clay, the single tree held
                      so it can be looked at long enough to be seen.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김지영은 자연에서 영감을 받은 작품을 주로 빚는 도예가다. 그의 작업은 언제나
                      하나의 원천에서 다시 출발한다 — 자연. 그는 장식을 향해 손을 뻗는 대신,{' '}
                      <strong className="font-bold text-charcoal-deep">자라나는 것</strong>에서
                      형상을 길어 올린다. 그리고 스스로에게 맡긴 과제는, 살아 있는 것의 생명력을
                      흙이라는 느리고 고정된 물성 속으로 옮기는 일이다.
                    </p>
                    <p>
                      그의 작업은 나무라는 이미지를 중심으로 모인다.{' '}
                      <strong className="font-bold text-charcoal-deep">〈순 돋는 나무〉</strong>{' '}
                      연작에서 대상은 잎이 무성한 나무가 아니라, 그 직전의 순간이다 — 가지에서 밀고
                      올라오는 새순, 보이게 되는 바로 그 찰나에 붙들린 자람. 돋는 새순을 흙으로
                      빚는다는 것은, 움직이는 것을 그 움직임을 죽이지 않은 채 멈춰 세우는 일이다. 그
                      역설이 그의 작업의 고요한 중심이다.
                    </p>
                    <p>
                      짝을 이루는{' '}
                      <strong className="font-bold text-charcoal">〈나무 한 그루〉</strong> 연작은
                      시선을 한층 더 좁힌다. 홀로 선 나무 한 그루로 충분해진다 — 하나의 형상 안에
                      담긴 온전한 세계. 여기서 자연주의는 충실한 모사의 문제가 아니라 응시의 문제다.
                      나무는 정말 중요한 것만 남을 때까지 단순해지고, 남는 것은 그것의 생명이다.
                    </p>
                    <p>
                      그의 조형 언어는 의도적으로 절제되어 있다. 과잉을 덜어내고, 한 점 한 점을
                      깨끗하고 단순한 실루엣으로 깎아 내어, 물성 그 자체가 — 구워진 흙의 무게,
                      표면의 고요함이 — 말하게 한다. 그 절제 속에서 자연주의적 세계가 열린다. 재현된
                      자연이 아니라, 정련되고 느려지고 오래 남도록 빚어진 자연이.
                    </p>
                    <p>
                      두 연작을 하나로 묶는 것은 하나의 믿음이다 — 자람은 빚을 만한 가치가 있고,
                      살아 있는 것의 가장 작은 시작은 구운 흙의 영속을 누릴 자격이 있다는 믿음. 그런
                      의미에서 김지영의 도자는 인내로 간직하는 행위다. 흙 속에 기억된 새순, 충분히
                      오래 바라보아 비로소 보이도록 붙들어 둔 나무 한 그루.
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
                        {isEnglish ? 'Inspired by nature' : '자연에서 받은 영감'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Forms drawn from what grows — the life force of a living thing carried into the fixed materiality of clay.'
                          : '자라나는 것에서 길어 올린 형상. 살아 있는 것의 생명력을 흙이라는 고정된 물성으로 옮긴다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The tree and the new shoot' : '나무와 새순'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In 〈Sprouting Tree〉 and 〈A Single Tree〉, growth is caught at the instant it becomes visible — a moving thing held still without killing its movement.'
                          : '〈순 돋는 나무〉·〈나무 한 그루〉에서 자람은 보이게 되는 찰나에 붙들린다. 움직임을 죽이지 않은 채 멈춰 세운 살아 있는 것.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Simple, naturalistic form' : '심플하고 자연주의적인 형상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Excess withheld, each piece pared to a clean silhouette — naturalism as attention rather than faithful copying.'
                          : '과잉을 덜어내고 깨끗한 실루엣으로 깎아 낸 한 점. 충실한 모사가 아니라 응시로서의 자연주의.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'At a glance' : '한눈에 보기'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: ceramics — works inspired by nature'
                        : '매체: 도예 — 자연에서 영감을 받은 작업'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Series: 〈Sprouting Tree〉 — growth caught at the moment a new shoot rises'
                        : '연작: 〈순 돋는 나무〉 — 새순이 돋는 순간에 붙든 자람'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Series: 〈A Single Tree〉 — a whole world held in one standing tree'
                        : '연작: 〈나무 한 그루〉 — 홀로 선 한 그루에 담은 온전한 세계'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Sensibility: simple, naturalistic — restraint that lets the material speak'
                        : '감각: 심플하고 자연주의적 — 물성이 말하게 하는 절제'}
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
                  <span className="text-charcoal-deep">on clay, growth, and what remains</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">흙과 자람, 그리고 남는 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 흙이라는 물성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Clay as material — fixing the life of a living thing'
                    : '흙이라는 물성 — 살아 있는 것을 고정한다는 일'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Clay is a paradoxical material for a naturalist. It begins soft, responsive,
                        almost alive under the hand — and then, in the kiln, it is made permanent,
                        fixed beyond any further change. To work in ceramic is to convert movement
                        into stillness, the living into the lasting. For an artist whose subject is
                        the life force of nature, that conversion is not a limitation but the whole
                        point.
                      </p>
                      <p>
                        Kim Jiyeong takes a thing that grows — a tree, a shoot — and gives it the
                        density of fired earth. The result is not a model of nature but a holding of
                        it: the moment of growth is no longer fleeting; it can be returned to,
                        weighed in the hand, looked at again tomorrow. The material does what memory
                        wishes it could do — it keeps.
                      </p>
                      <p>
                        This is why the surface matters as much as the shape. A quiet, simple
                        surface lets the clay register as clay, the weight register as weight;
                        nothing distracts from the fact that something alive has been carried over
                        into something that will remain. The naturalism lives in that act of
                        carrying, not in mere resemblance.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        흙은 자연주의자에게 역설적인 재료다. 처음에는 부드럽고, 손에 응답하며, 거의
                        살아 있는 듯하다 — 그러다 가마 속에서 영구히 굳어, 더는 변하지 않는 것이
                        된다. 도예를 한다는 것은 움직임을 고요로, 살아 있는 것을 지속하는 것으로
                        바꾸는 일이다. 자연의 생명력을 주제로 삼는 작가에게 그 전환은 한계가 아니라
                        바로 그 핵심이다.
                      </p>
                      <p>
                        김지영은 자라는 것을 — 나무를, 새순을 — 취해 그것에 구운 흙의 밀도를
                        부여한다. 그 결과는 자연의 모형이 아니라 자연을 붙들어 두는 일이다. 자람의
                        순간은 더 이상 덧없지 않다. 다시 찾아올 수 있고, 손 위에서 무게를 가늠할 수
                        있으며, 내일 또 바라볼 수 있다. 물성은 기억이 바라기만 하는 일을 해낸다 —
                        간직하는 일을.
                      </p>
                      <p>
                        표면이 형상만큼이나 중요한 이유가 여기 있다. 고요하고 단순한 표면은 흙을
                        흙으로, 무게를 무게로 드러낸다. 살아 있던 무언가가 남을 무언가로 옮겨졌다는
                        사실로부터 그 무엇도 시선을 빼앗지 않는다. 자연주의는 단순한 닮음이 아니라
                        그 옮김의 행위 속에 산다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 순 돋는 나무 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Sprouting Tree〉 — growth at the instant it shows'
                    : '〈순 돋는 나무〉 — 보이게 되는 찰나의 자람'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A sprouting shoot is one of nature&apos;s quietest events and one of its
                        most complete. Nothing has happened yet, and everything is about to. The
                        〈Sprouting Tree〉 series takes precisely this threshold as its subject —
                        not the tree arrived at its full size, but the tree in the act of beginning.
                      </p>
                      <p>
                        To choose the new shoot is a statement about value. It says that the
                        smallest beginning is already worth shaping; that potential, before it has
                        proven anything, deserves attention and form. In clay, a shoot is rendered
                        with care rather than grandeur — a small upward motion given the dignity of
                        being made to last.
                      </p>
                      <p>
                        There is tenderness in this, but no sentimentality. The forms stay simple,
                        the gesture restrained. The work trusts the shoot to mean what it means
                        without being explained: that life insists on continuing, and that the
                        moment it shows itself is worth keeping.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        돋는 새순은 자연의 가장 조용한 사건이자 가장 완전한 사건 가운데 하나다. 아직
                        아무 일도 일어나지 않았는데, 모든 일이 막 일어나려 한다. 〈순 돋는 나무〉
                        연작은 바로 이 문턱을 주제로 삼는다 — 제 크기에 다다른 나무가 아니라,
                        시작하는 행위 속의 나무를.
                      </p>
                      <p>
                        새순을 택한다는 것은 가치에 관한 하나의 선언이다. 가장 작은 시작이 이미 빚을
                        만한 것이라고, 아직 아무것도 증명하지 못한 가능성이 응시와 형상을 누릴
                        자격이 있다고 말하는 것. 흙 속에서 새순은 거창함이 아니라 정성으로 빚어진다
                        — 위로 향하는 작은 몸짓에, 오래 남도록 만들어지는 품위가 주어진다.
                      </p>
                      <p>
                        여기에는 다정함이 있되 감상은 없다. 형상은 단순하게 머물고, 몸짓은 절제되어
                        있다. 작업은 새순이 굳이 설명되지 않아도 제 뜻을 지닌다고 믿는다 — 생명은
                        계속되기를 고집하고, 그것이 제 모습을 드러내는 순간은 간직할 만하다는 뜻을.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 나무 한 그루 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈A Single Tree〉 — a whole world in one form'
                    : '〈나무 한 그루〉 — 하나의 형상에 담긴 온전한 세계'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Where 〈Sprouting Tree〉 watches a beginning, 〈A Single Tree〉 watches a
                        whole. One tree, standing on its own, is offered as sufficient — not a
                        forest, not a scene, but a single living form held up to be considered in
                        full.
                      </p>
                      <p>
                        The simplicity here is hard-won. To reduce a tree to one clean form is to
                        decide what a tree essentially is, and to let go of everything else. What
                        survives the reduction is not a generic shape but a particular presence:
                        this tree, standing, alive. The naturalism is a matter of keeping the
                        essential and trusting it to carry the rest.
                      </p>
                      <p>
                        Set beside the sprouting series, the single tree completes a small arc —
                        from the shoot that has just begun to the tree that simply, fully is.
                        Together they describe one continuous attention to growth: a ceramicist
                        quietly insisting that a single living thing, shaped with care, is world
                        enough.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈순 돋는 나무〉가 시작을 지켜본다면, 〈나무 한 그루〉는 온전함을 지켜본다.
                        홀로 선 나무 한 그루가 충분한 것으로 건네진다 — 숲도 아니고 풍경도 아닌,
                        온전히 헤아려지도록 들어 올려진 살아 있는 형상 하나.
                      </p>
                      <p>
                        여기서의 단순함은 어렵게 얻어진 것이다. 나무를 깨끗한 형상 하나로 줄인다는
                        것은 나무가 무엇인지를 정하고, 나머지 전부를 놓아 버리는 일이다. 그
                        덜어냄에서 살아남는 것은 일반적인 형태가 아니라 하나의 고유한 현존이다 — 이
                        나무, 선 채로, 살아 있는. 자연주의는 본질을 지키고 그것이 나머지를
                        감당하리라 믿는 일이다.
                      </p>
                      <p>
                        돋는 연작 곁에 놓이면, 나무 한 그루는 작은 호(弧)를 완성한다 — 막 시작된
                        새순에서, 그저 온전히 존재하는 나무로. 둘은 함께 자람을 향한 하나의 연속된
                        응시를 그린다. 정성껏 빚은 살아 있는 것 하나면 한 세계로 족하다고, 도예가가
                        조용히 고집하는.
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
                      From the rising shoot to the single standing tree, Kim Jiyeong&apos;s ceramics
                      pursue one patient question: how does one carry the life force of a living
                      thing into the lasting materiality of clay? Her answer is shaped by hand, in
                      simple and naturalistic forms attentive to growth. She joins this campaign not
                      as a subject of its cause but as a fellow artist in solidarity — so that the
                      proceeds of her work might become a low-interest lifeline for artists facing
                      financial exclusion today.
                    </>
                  ) : (
                    <>
                      돋는 새순에서 홀로 선 나무 한 그루까지, 김지영의 도자는 하나의 차분한 물음을
                      추구한다 — 살아 있는 것의 생명력을 어떻게 흙이라는 지속하는 물성 속으로 옮길
                      것인가. 그 대답은 손으로, 자람에 귀 기울이는 심플하고 자연주의적인 형상으로
                      빚어진다. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
                      함께한다 — 작품 판매 수익이 오늘 금융 차별을 겪는 예술인에게 저금리의 버팀목이
                      될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Jiyeong</span>
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
                    Kim Jiyeong joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김지영 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_JIYEONG_PATH}
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
