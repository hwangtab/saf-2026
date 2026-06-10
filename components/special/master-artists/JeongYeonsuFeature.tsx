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

// 작가 feature는 작가 페이지(/artworks/artist/정연수)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='정연수', name_en='Jeong Yeonsu', 매체='회화'. history 부재 → 작업론 중심 구성.
const JEONG_YEONSU_PATH = `/artworks/artist/${encodeURIComponent('정연수')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongYeonsuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정연수' ||
    n === 'jeong yeonsu' ||
    n === 'jeong yeon-su' ||
    n === 'jung yeonsu' ||
    n.replace(/[\s-]+/g, '') === 'jeongyeonsu' ||
    n.replace(/[\s-]+/g, '') === 'jungyeonsu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정연수 — 사물을 보는 시각을 그리는 화가',
    description:
      '일상의 사물에 깃든 시간과 시선을 회화로 옮겨 온 작가 정연수. 〈reflection(빛이 지나간 자리)〉 시리즈는 사물 그 자체가 아닌 ‘사물을 보는 시각’을 그리고자 하는 작업으로, 그림자와 이면을 통해 존재가 드러나는 회화의 가능성을 탐구한다. 디지털화·탈사물화된 시대에 잊혀가는 일상의 사물이 품은 고유한 시간과 역사를 사색하는 정연수의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '사물 자체가 아닌 사물을 보는 시각을 그리는 화가 정연수. 그림자와 이면을 통해 존재가 드러나는 〈reflection(빛이 지나간 자리)〉 시리즈.',
    ogAlt: '정연수 대표 작품',
    twitterTitle: '정연수',
    twitterDescription: '빛이 지나간 자리 — 사물을 보는 시각을 그리는 화가 정연수',
    keywords:
      '정연수 화가, reflection, 빛이 지나간 자리, 회화, 사물을 보는 시각, 그림자, 이면, 탈사물화, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Yeonsu — Painter of the Way We See Things',
    description:
      'Selected works by Jeong Yeonsu, a painter who translates into painting the time and the gaze that reside in everyday objects. The 〈reflection (where the light has passed)〉 series seeks to paint not the object itself but the way of seeing it, exploring a painting in which existence is revealed through shadow and the underside. It begins from the thought that, in a digitised and de-materialised age, each fading everyday object holds a time and a history of its own. View and collect Jeong Yeonsu&apos;s works at SAF Online.',
    ogDescription:
      'Jeong Yeonsu — painting not the object itself but the way of seeing it. The 〈reflection (where the light has passed)〉 series, where existence is revealed through shadow.',
    ogAlt: 'Jeong Yeonsu — featured work',
    twitterTitle: 'Jeong Yeonsu',
    twitterDescription: 'Where the light has passed — a painter of the way we see things',
    keywords:
      'Jeong Yeonsu artist, reflection, where the light has passed, contemporary painting, way of seeing, shadow, everyday objects',
  },
} as const;

export async function buildJeongYeonsuMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_YEONSU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정연수');
  const artwork = allArtworks.find((a) => isJeongYeonsuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Yeonsu`
      : `${artwork.title} — 정연수`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_YEONSU_PATH, locale, true),
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

export default async function JeongYeonsuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_YEONSU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정연수');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJeongYeonsuArtist(artwork.artist)
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
    { name: isEnglish ? 'Jeong Yeonsu' : '정연수', url: pageUrl },
  ]);

  // DB에 생몰년·학력·전시 이력·수상·소장처 정보가 없으므로 Person 스키마에는
  // 검증된 필드(이름·직업·매체·작업론·국적)만 채운다. birthDate/award/alumniOf 금지.
  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_YEONSU_PATH}#person-jeong-yeonsu`,
    name: isEnglish ? 'Jeong Yeonsu' : '정연수',
    alternateName: isEnglish ? '정연수' : 'Jeong Yeonsu',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Jeong Yeonsu is a painter who translates into painting the time and the gaze that reside in everyday objects, seeking to paint not the object itself but the way of seeing it.'
      : '정연수는 일상의 사물에 깃든 시간과 시선을 회화로 옮겨 온 작가로, 사물 그 자체가 아닌 ‘사물을 보는 시각’을 그리고자 합니다.',
    knowsAbout: isEnglish
      ? ['Painting', 'The way of seeing', 'Everyday objects', 'Shadow and reflection']
      : ['회화', '사물을 보는 시각', '일상의 사물', '그림자와 이면'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Yeonsu — SAF Online' : '정연수 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Yeonsu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 정연수 작품들을 소개합니다.',
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
        {/* Hero Section — 빛이 지나간 자리: 빛과 그림자, 이면의 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal-deep">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 빛이 지나간 자리 모티프 — 비스듬히 떨어지는 빛의 선 + 사물의 그림자 */}
          <div className="absolute top-0 left-12 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/25" />
          <div className="absolute top-0 right-16 h-full w-px bg-white/10" />
          {/* 사물의 이면에 스며든 빛무리 */}
          <div className="absolute -top-20 left-[-5rem] w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Yeonsu · Painter' : '정연수 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Where the light
                  <br />
                  <span className="text-primary-soft">has passed</span>
                </>
              ) : (
                <>
                  빛이
                  <br />
                  <span className="text-primary-soft">지나간 자리</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Not the object itself, but the way of seeing it.</span>
                  <span className="mt-2 block">
                    Existence, surfacing through shadow and the underside.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사물 그 자체가 아니라, 사물을 보는 시각을.</span>
                  <span className="mt-2 block">그림자와 이면을 통해 떠오르는 존재.</span>
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
                    The way of seeing —<br />
                    <span className="text-primary-strong">painting the gaze, not the thing</span>
                  </>
                ) : (
                  <>
                    사물을 보는 시각 —<br />
                    <span className="text-primary-strong">사물이 아니라 시선을 그리다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Yeonsu is a painter who translates into painting the time and the gaze
                      that reside in everyday objects. Her concern is not the object as a thing to
                      be depicted, but the act of looking that falls upon it — what she names the{' '}
                      <strong className="font-bold text-charcoal-deep">way of seeing</strong>. A
                      cup, a chair, a small implement on a table: in her work these are not subjects
                      to be reproduced but occasions through which a gaze can be made visible.
                    </p>
                    <p>
                      This intention gives her central body of work its title. The 〈reflection
                      (where the light has passed)〉 series sets out to paint not the object itself
                      but the way one sees it, and turns toward{' '}
                      <strong className="font-bold text-charcoal">shadow and the underside</strong>{' '}
                      — the parts of a thing that are usually overlooked — as the place where its
                      presence is most fully disclosed. What the front of an object withholds, its
                      shadow returns.
                    </p>
                    <p>
                      To paint the reverse and the shadow rather than the lit face is a quiet
                      argument about how existence becomes known. A thing is not only the surface
                      that meets the eye; it is also the trace it casts, the dark it displaces, the
                      light that has already moved across it and gone. By attending to the
                      underside, her paintings explore a possibility within painting itself — that
                      existence is revealed less by illumination than by the marks the light leaves
                      as it passes.
                    </p>
                    <p>
                      Her practice begins from a thought about the present. In a digitised,
                      de-materialised age, the everyday objects around us grow steadily thinner —
                      replaced by screens, dissolved into data, forgotten. Against that fading,
                      Jeong Yeonsu holds to a single conviction: that each small everyday object
                      carries{' '}
                      <strong className="font-bold text-charcoal-deep">
                        a time and a history of its own
                      </strong>
                      . To look closely at such an object, and to paint not the thing but the
                      looking itself, is to insist that what is overlooked is not therefore without
                      weight.
                    </p>
                    <p>
                      Across her canvases the work stays close to this narrow seam — the gap between
                      the object and the gaze, between the lit face and the shadow it leaves. To
                      stand before her paintings is to be returned, gently, to the things one passes
                      without seeing, and to the time those things have quietly kept.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정연수는 일상의 사물에 깃든 시간과 시선을 회화로 옮겨 온 작가다. 그의 관심은
                      묘사해야 할 대상으로서의 사물이 아니라, 그 사물 위에 내려앉는 봄(視) 그 자체에
                      있다 — 그가 이름 붙인{' '}
                      <strong className="font-bold text-charcoal-deep">‘사물을 보는 시각’</strong>.
                      컵 하나, 의자 하나, 탁자 위의 작은 도구 하나는 그의 작업에서 재현해야 할
                      소재가 아니라, 하나의 시선이 눈에 보이게 되는 계기가 된다.
                    </p>
                    <p>
                      이 의도가 그의 중심 연작에 제목을 부여한다. 〈reflection(빛이 지나간 자리)〉
                      시리즈는 사물 그 자체가 아니라 그것을 보는 시각을 그리고자 하며,{' '}
                      <strong className="font-bold text-charcoal">그림자와 이면</strong>으로 — 대개
                      지나쳐 버리는 사물의 부분으로 — 돌아선다. 그곳을 존재가 가장 온전히 드러나는
                      자리로 삼는다. 사물의 앞면이 감추는 것을, 그 그림자가 되돌려 준다.
                    </p>
                    <p>
                      밝은 앞면이 아니라 이면과 그림자를 그린다는 것은, 존재가 어떻게 알려지는가에
                      관한 조용한 주장이다. 사물은 눈과 마주치는 표면만이 아니다. 그것은 또한 자신이
                      드리우는 흔적이고, 밀어낸 어둠이며, 이미 그 위를 지나가 버린 빛이다. 이면에 귀
                      기울임으로써 그의 회화는 회화 자체 안의 가능성을 탐구한다 — 존재는 빛으로
                      밝혀지기보다, 빛이 지나가며 남긴 자국으로 드러난다는 가능성을.
                    </p>
                    <p>
                      그의 작업은 현재에 대한 사유에서 출발한다. 디지털화되고 탈사물화된 시대에,
                      우리 곁의 일상 사물은 점점 얇아진다 — 화면으로 대체되고, 데이터로 풀어지고,
                      잊혀 간다. 그 잊힘에 맞서 정연수는 하나의 믿음을 지킨다. 작고 일상적인 사물
                      하나하나가{' '}
                      <strong className="font-bold text-charcoal-deep">고유한 시간과 역사</strong>를
                      품고 있다는 믿음. 그런 사물을 가까이 들여다보고, 사물이 아니라 들여다봄 자체를
                      그린다는 것은, 지나쳐지는 것이 그래서 무게가 없는 것은 아니라는 주장이다.
                    </p>
                    <p>
                      그의 화면은 줄곧 이 좁은 이음매에 머문다 — 사물과 시선 사이, 밝은 앞면과
                      그것이 남긴 그림자 사이의 틈. 그의 그림 앞에 서는 일은, 보지 않고 지나치는
                      것들에게로, 그리고 그 사물들이 조용히 간직해 온 시간에게로 가만히 되돌려지는
                      일이다.
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
                        {isEnglish ? 'The way of seeing' : '사물을 보는 시각'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'She paints not the object as a thing but the act of looking that falls upon it — making a gaze, rather than a surface, visible.'
                          : '사물을 대상으로 그리는 것이 아니라, 그 위에 내려앉는 봄 자체를 그린다. 표면이 아니라 시선을 눈에 보이게 한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Shadow and the underside' : '그림자와 이면'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In the 〈reflection (where the light has passed)〉 series, existence is disclosed through the overlooked reverse of a thing — what the front withholds, the shadow returns.'
                          : '〈reflection(빛이 지나간 자리)〉 시리즈에서 존재는 지나쳐지는 사물의 이면을 통해 드러난다. 앞면이 감추는 것을 그림자가 되돌려 준다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The time of everyday objects' : '일상 사물의 시간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In a digitised, de-materialised age, she holds that each fading everyday object carries a time and a history of its own.'
                          : '디지털화·탈사물화된 시대에, 잊혀가는 일상의 사물 하나하나가 고유한 시간과 역사를 품고 있다고 믿는다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'The artistic premise' : '작업의 전제'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: painting. The subject is not the object but the gaze that meets it.'
                        : '매체: 회화. 주제는 사물이 아니라 그것과 마주하는 시선이다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Central body of work: the 〈reflection (where the light has passed)〉 series.'
                        : '중심 연작: 〈reflection(빛이 지나간 자리)〉 시리즈.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Method of disclosure: existence revealed through shadow and the underside, rather than the lit face.'
                        : '드러냄의 방식: 밝은 앞면이 아니라 그림자와 이면을 통해 존재를 드러낸다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Point of departure: the conviction that, in a de-materialised age, each everyday object holds a time and history of its own.'
                        : '출발점: 탈사물화된 시대에도 일상의 사물이 저마다 고유한 시간과 역사를 품는다는 믿음.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 작업론 중심 (history 부재). 세 편의 에세이로 작품 세계를 전개. */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the gaze, the shadow, and the thing</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">시선과 그림자, 그리고 사물에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 사물이 아니라 시각을 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Not the object, but the way of seeing it'
                    : '사물이 아니라, 사물을 보는 시각을'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most still life begins with a question of resemblance: how faithfully can
                        the thing on the table be returned to the surface of the canvas? Jeong
                        Yeonsu&apos;s work begins one step earlier — with the looking that precedes
                        the likeness. Her stated aim is to paint not the object itself but the way
                        of seeing it. The object is the occasion; the gaze is the subject.
                      </p>
                      <p>
                        This is a difficult thing to paint, because a gaze has no surface of its
                        own. It can only be shown indirectly — in what a viewer is led to notice, in
                        where the attention is made to rest, in the parts of a thing the painting
                        chooses to weigh. By organising her canvases around the act of looking
                        rather than the thing looked at, she asks the viewer to become aware of
                        their own seeing: to notice not just the cup, but the noticing of the cup.
                      </p>
                      <p>
                        In this sense her painting is quietly reflexive. It returns the eye to
                        itself. The everyday object is the mirror in which a way of seeing is caught
                        and held — which is why, in her hands, even the most ordinary thing becomes
                        worth the long attention of a painting.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대부분의 정물은 닮음의 물음에서 시작한다 — 탁자 위의 사물을 얼마나 충실히
                        화면으로 되돌릴 수 있는가. 정연수의 작업은 그보다 한 걸음 앞에서 시작한다 —
                        닮음에 앞서는 봄에서. 그가 밝힌 목표는 사물 그 자체가 아니라 그것을 보는
                        시각을 그리는 것이다. 사물은 계기이고, 시선이 주제다.
                      </p>
                      <p>
                        이것은 그리기 어려운 것이다. 시선에는 그 자신의 표면이 없기 때문이다. 그것은
                        오직 간접적으로만 보일 수 있다 — 보는 이가 무엇을 알아차리도록 이끌리는지,
                        주의가 어디에 머물게 되는지, 그림이 사물의 어느 부분에 무게를 두기로
                        하는지를 통해서. 바라본 사물이 아니라 바라봄을 중심으로 화면을 조직함으로써,
                        그는 보는 이가 자신의 봄을 자각하게 한다 — 컵만이 아니라, 컵을 알아차림을
                        알아차리도록.
                      </p>
                      <p>
                        그런 의미에서 그의 회화는 조용히 반사적이다. 눈을 그 자신에게로 되돌린다.
                        일상의 사물은 하나의 시각이 붙들려 머무는 거울이다 — 그렇기에 그의 손에서는
                        가장 평범한 사물조차 그림의 긴 응시를 받을 만한 것이 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 빛이 지나간 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈reflection〉 — where the light has passed'
                    : '〈reflection〉 — 빛이 지나간 자리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The 〈reflection (where the light has passed)〉 series carries the
                        artist&apos;s thinking in its very title. <em>Reflection</em> is both the
                        optical thing — a cast image, a glint, a shadow — and the inward act of
                        pondering. The Korean subtitle, <em>where the light has passed</em>, names a
                        place rather than a source: not the lamp, but the trace it leaves behind
                        once it has moved on.
                      </p>
                      <p>
                        This is why the work turns toward shadow and the underside. A lit face
                        declares itself; it gives the eye an easy answer. The reverse of a thing,
                        the dark it casts, asks to be read more slowly. By choosing the overlooked
                        side, Jeong Yeonsu lets existence be disclosed in the register of the
                        indirect — an object known not by the light upon it but by the mark the
                        light has left in passing.
                      </p>
                      <p>
                        There is a tenderness in this. To paint where the light has passed is to
                        attend to absence as carefully as to presence, to grant the shadow the same
                        seriousness usually reserved for the illuminated. In her canvases the thing
                        and its shadow are not figure and background but two halves of a single
                        disclosure — the front showing, the underside telling.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈reflection(빛이 지나간 자리)〉 시리즈는 그 제목 자체에 작가의 사유를
                        담는다. <em>reflection</em>은 광학적인 것이면서 — 비친 상, 반짝임, 그림자 —
                        동시에 안으로 헤아리는 사색의 행위다. 한국어 부제 <em>빛이 지나간 자리</em>
                        는 근원이 아니라 자리를 이름 짓는다. 등불이 아니라, 그것이 옮겨 간 뒤에 남긴
                        흔적을.
                      </p>
                      <p>
                        그래서 작업은 그림자와 이면으로 돌아선다. 밝은 앞면은 스스로를 선언한다 —
                        눈에게 손쉬운 답을 준다. 사물의 뒷면, 그것이 드리운 어둠은 더 천천히
                        읽히기를 청한다. 지나쳐지는 쪽을 택함으로써, 정연수는 존재가 간접의 음역에서
                        드러나게 한다 — 그 위에 내린 빛이 아니라, 빛이 지나가며 남긴 자국으로
                        알려지는 사물.
                      </p>
                      <p>
                        여기에는 다정함이 있다. 빛이 지나간 자리를 그린다는 것은, 존재만큼이나
                        부재에 정성껏 귀 기울이는 일이고, 대개 밝혀진 것에만 허락되는 진지함을
                        그림자에게도 나누어 주는 일이다. 그의 화면에서 사물과 그림자는 주체와 배경이
                        아니라, 하나의 드러남의 두 절반이다 — 앞면이 보여 주고, 이면이 들려준다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 탈사물화 시대의 사물 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Objects in a de-materialised age — time, kept'
                    : '탈사물화 시대의 사물 — 간직된 시간'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jeong Yeonsu&apos;s attention to the everyday object is not nostalgia for
                        its own sake. It is a response to the present. In a digitised,
                        de-materialised age, the physical things around us are quietly being emptied
                        of weight — functions migrate to screens, possessions dissolve into accounts
                        and data, and the small implements that once held the texture of a life grow
                        thin and forgettable.
                      </p>
                      <p>
                        Against that thinning, her work holds to a conviction: that each such object
                        carries a time and a history of its own. The chair has held bodies; the cup
                        has met lips; the worn handle remembers a hand. These histories do not
                        announce themselves. They have to be looked for — and looking for them is
                        precisely what her painting practises.
                      </p>
                      <p>
                        So the two halves of her work meet here. To paint the way of seeing, and to
                        paint where the light has passed, is finally to keep the time that objects
                        hold — to refuse, with the slow means of painting, the forgetting that the
                        age makes easy. Her canvases are a quiet argument that the overlooked thing
                        is not weightless, and that attention is itself a form of keeping.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정연수가 일상의 사물에 기울이는 주의는 그 자체를 위한 향수가 아니다. 그것은
                        현재에 대한 응답이다. 디지털화되고 탈사물화된 시대에, 우리 곁의 물리적
                        사물들은 조용히 무게를 비워 간다 — 기능은 화면으로 옮겨 가고, 소유는 계좌와
                        데이터로 풀어지며, 한때 삶의 질감을 담았던 작은 도구들은 얇아지고 잊히기
                        쉬운 것이 된다.
                      </p>
                      <p>
                        그 얇아짐에 맞서 그의 작업은 하나의 믿음을 지킨다. 그런 사물 하나하나가
                        고유한 시간과 역사를 품는다는 믿음. 의자는 몸을 받아 왔고, 컵은 입술과
                        만났으며, 닳은 손잡이는 한 손을 기억한다. 이 역사들은 스스로를 알리지
                        않는다. 그것들은 찾아져야 한다 — 그리고 그것을 찾는 일이 바로 그의 회화가
                        하는 일이다.
                      </p>
                      <p>
                        그리하여 그의 작업의 두 절반이 여기에서 만난다. 사물을 보는 시각을 그리는
                        일과 빛이 지나간 자리를 그리는 일은, 끝내 사물이 간직한 시간을 간직하는
                        일이다 — 회화라는 느린 수단으로, 시대가 손쉽게 만드는 잊힘을 거절하는 일.
                        그의 화면은 지나쳐지는 사물이 무게 없는 것이 아니며, 응시가 그 자체로 간직의
                        한 형식이라는 조용한 주장이다.
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
                      In painting not the object but the way of seeing it, and in turning toward
                      shadow and the underside to find where existence is disclosed, Jeong Yeonsu
                      pursues a single, patient question: how does a thing make its time known? She
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that the proceeds of her work might become a low-interest
                      lifeline for artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      사물이 아니라 사물을 보는 시각을 그리는 일에서, 그리고 존재가 드러나는 자리를
                      찾아 그림자와 이면으로 돌아서는 일에서, 정연수는 하나의 차분한 물음을 추구한다
                      — 사물은 어떻게 자신의 시간을 알리는가. 그는 씨앗페에 이 캠페인의 대상으로서가
                      아니라, 동료 예술인과의 연대자로서 함께한다 — 작품 판매 수익이 오늘 금융
                      차별을 겪는 예술인에게 저금리의 버팀목이 될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jeong Yeonsu</span>
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
                    Jeong Yeonsu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정연수 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_YEONSU_PATH}
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
