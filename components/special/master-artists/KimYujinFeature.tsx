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

// 작가 feature는 작가 페이지(/artworks/artist/김유진)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='김유진', name_en='Kim Yujin'.
const KIM_YUJIN_PATH = `/artworks/artist/${encodeURIComponent('김유진')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimYujinArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김유진' ||
    n === 'kim yujin' ||
    n === 'kim yu-jin' ||
    n.replace(/[\s-]+/g, '') === 'kimyujin'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김유진 — 감정이 담긴 풍경을 그리는 화가',
    description:
      '감정이 담긴 풍경과 관계 속의 외로움을 주제로 작업하는 화가 김유진. 〈폭발의 다음〉 시리즈를 통해 사건이 지나간 자리에 남는 정적과 잔여의 감정을 회화로 옮긴다. 오픈갤러리 등 다양한 플랫폼에서 활동하는 김유진의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '감정이 담긴 풍경과 관계 속의 외로움 — 〈폭발의 다음〉 시리즈로 사건 이후의 정적을 그리는 화가 김유진.',
    ogAlt: '김유진 대표 작품',
    twitterTitle: '김유진',
    twitterDescription: '폭발의 다음 — 감정이 담긴 풍경을 그리는 화가 김유진',
    keywords:
      '김유진 작가, 폭발의 다음, 감정이 담긴 풍경, 관계 속의 외로움, 회화, 오픈갤러리, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Yujin — Painter of Landscapes Filled with Emotion',
    description:
      'Selected works by Kim Yujin, a painter who works on the themes of emotion-laden landscapes and the loneliness within relationships. Through the 〈After the Explosion〉 series, Kim Yujin translates into painting the stillness and residual feeling that remain once an event has passed. Active across platforms such as Opengallery. View and collect these works at SAF Online.',
    ogDescription:
      'Emotion-laden landscapes and the loneliness within relationships — Kim Yujin paints the stillness after the event in the 〈After the Explosion〉 series.',
    ogAlt: 'Kim Yujin — featured work',
    twitterTitle: 'Kim Yujin',
    twitterDescription: 'After the explosion — a painter of landscapes filled with emotion',
    keywords:
      'Kim Yujin artist, After the Explosion, emotional landscape, loneliness in relationships, Korean contemporary painting, Opengallery',
  },
} as const;

export async function buildKimYujinMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_YUJIN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김유진');
  const artwork = allArtworks.find((a) => isKimYujinArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Yujin`
      : `${artwork.title} — 김유진`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_YUJIN_PATH, locale, true),
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

export default async function KimYujinFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_YUJIN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김유진');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimYujinArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Yujin' : '김유진', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_YUJIN_PATH}#person-kim-yujin`,
    name: isEnglish ? 'Kim Yujin' : '김유진',
    alternateName: isEnglish ? '김유진' : 'Kim Yujin',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Yujin is a painter who works on the themes of emotion-laden landscapes and the loneliness within relationships, translating the stillness after an event into painting through the 〈After the Explosion〉 series.'
      : '김유진은 감정이 담긴 풍경과 관계 속의 외로움을 주제로 작업하는 화가로, 〈폭발의 다음〉 시리즈를 통해 사건이 지나간 자리의 정적을 회화로 옮깁니다.',
    knowsAbout: isEnglish
      ? ['Contemporary painting', 'Emotional landscape', 'Loneliness in relationships']
      : ['회화', '감정이 담긴 풍경', '관계 속의 외로움'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Yujin — SAF Online' : '김유진 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Yujin from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김유진 작품들을 소개합니다.',
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
        {/* Hero Section — 폭발의 다음: 사건 이후의 정적 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal-deep">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 사건 이후의 잔여 — 화면에 번지는 흐릿한 잔광 */}
          <div className="absolute top-0 left-12 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/20" />
          <div className="absolute top-0 right-16 h-full w-px bg-white/10" />
          {/* 폭발의 잔광 — 중앙 상단 은은한 빛무리 */}
          <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Yujin · Painter' : '김유진 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The quiet
                  <br />
                  <span className="text-primary-soft">after the explosion</span>
                </>
              ) : (
                <>
                  폭발의
                  <br />
                  <span className="text-primary-soft">다음에 오는 정적</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Landscapes that hold the feeling left once an event has passed.
                  </span>
                  <span className="mt-2 block">
                    The loneliness that lingers in the space between people.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사건이 지나간 자리에 남는 감정을 품은 풍경.</span>
                  <span className="mt-2 block">사람과 사람 사이에 머무는 관계 속의 외로움.</span>
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
                    A landscape of feeling —<br />
                    <span className="text-primary-strong">what remains after the event</span>
                  </>
                ) : (
                  <>
                    감정의 풍경 —<br />
                    <span className="text-primary-strong">사건이 지나간 뒤에 남는 것</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Yujin is a painter who works on the themes of emotion-laden landscapes and
                      the loneliness within relationships. This practice begins not from the
                      spectacle of an event but from its aftermath — the moment a thing has happened
                      and the air has not yet settled.
                    </p>
                    <p>
                      The central body of work, the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈After the Explosion〉
                      </strong>{' '}
                      series, takes its premise from its own title. An explosion is the loudest of
                      events; what interests Kim Yujin is the silence that follows it. The series
                      asks what is left once the noise has gone — the residual feeling, the dust
                      still hanging in the light, the strange stillness of a place that has just
                      been changed.
                    </p>
                    <p>
                      In Kim Yujin&apos;s hands the landscape is never a neutral backdrop. Feeling
                      is projected onto it: a sky, a field, a room becomes the carrier of an emotion
                      that has no other place to go. To paint a landscape, here, is to paint the
                      trace of what was felt there — the way a space keeps the weather of an
                      experience long after the experience itself has ended.
                    </p>
                    <p>
                      Alongside this runs a second, quieter theme:{' '}
                      <strong className="font-bold text-charcoal">
                        the loneliness within relationships
                      </strong>
                      . It is not the solitude of being alone but the more particular ache of being
                      near another and still apart — the distance that can open up inside closeness.
                      Read together with the explosion, the two concerns describe a single
                      attention: to the quiet that gathers after intensity, between people and
                      within a place.
                    </p>
                    <p>
                      Kim Yujin is active across platforms such as Opengallery, an art rental and
                      sales service through which these paintings circulate beyond the gallery wall
                      and into the spaces where people live. It is a fitting channel for work so
                      concerned with the emotional life of rooms and the quiet that fills them.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김유진은 감정이 담긴 풍경과 관계 속의 외로움을 주제로 작업하는 화가다. 그의
                      작업은 사건의 장면이 아니라 그 이후에서 시작한다 — 무언가가 일어나고, 아직
                      공기가 가라앉지 않은 그 순간에서.
                    </p>
                    <p>
                      그의 중심 작업인{' '}
                      <strong className="font-bold text-charcoal-deep">〈폭발의 다음〉</strong>{' '}
                      시리즈는 제목 자체에서 전제를 길어 올린다. 폭발은 가장 요란한 사건이다.
                      김유진이 관심을 두는 것은 그 뒤에 따라오는 침묵이다. 시리즈는 소음이 사라진
                      자리에 무엇이 남는가를 묻는다 — 잔여의 감정, 빛 속에 아직 떠 있는 먼지, 막
                      변해 버린 자리의 낯선 정적.
                    </p>
                    <p>
                      그의 화면에서 풍경은 결코 중립적인 배경이 아니다. 감정이 거기에 투사된다. 하늘
                      하나, 들판 하나, 방 하나가 달리 갈 곳 없는 감정의 운반체가 된다. 그에게 풍경을
                      그린다는 것은 거기서 느껴진 것의 흔적을 그리는 일이다 — 경험이 끝난 뒤에도
                      공간이 오래도록 그 경험의 날씨를 간직하는 방식.
                    </p>
                    <p>
                      이와 나란히 또 하나의, 더 나직한 주제가 흐른다 —{' '}
                      <strong className="font-bold text-charcoal">관계 속의 외로움</strong>. 그것은
                      홀로 있음의 고독이 아니라, 누군가의 곁에 있으면서도 떨어져 있는 더 특정한
                      쓸쓸함이다 — 가까움 안에서 벌어질 수 있는 거리. 폭발과 함께 읽으면, 두 관심은
                      하나의 응시를 그린다. 강렬함 이후에 고이는 고요를 향한, 사람들 사이에서 그리고
                      한 자리 안에서.
                    </p>
                    <p>
                      김유진은 오픈갤러리 등 다양한 플랫폼에서 활동한다. 오픈갤러리는 미술품
                      대여·판매 서비스로, 그의 그림은 갤러리 벽을 넘어 사람들이 생활하는 공간 안으로
                      순환한다. 방의 감정적 삶과 거기 차오르는 고요에 그토록 마음을 쓰는 작업에
                      어울리는 통로다.
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
                        {isEnglish ? '〈After the Explosion〉' : '〈폭발의 다음〉'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A series built on the silence after the loudest of events — the residual feeling and stillness of a place just changed.'
                          : '가장 요란한 사건 이후의 침묵 위에 지은 연작. 잔여의 감정과, 막 변해 버린 자리의 정적.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Landscapes filled with emotion' : '감정이 담긴 풍경'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The landscape is never neutral — sky, field, and room become carriers of a feeling that has nowhere else to go.'
                          : '풍경은 결코 중립적이지 않다. 하늘과 들판, 방이 달리 갈 곳 없는 감정의 운반체가 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Loneliness in relationships' : '관계 속의 외로움'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not the solitude of being alone but the ache of being near another and still apart — the distance inside closeness.'
                          : '홀로 있음의 고독이 아니라, 곁에 있으면서도 떨어져 있는 쓸쓸함 — 가까움 안에서 벌어지는 거리.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Practice & activity' : '작업과 활동'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: painting. A practice centred on emotion-laden landscapes and the loneliness within relationships.'
                        : '매체: 회화. 감정이 담긴 풍경과 관계 속의 외로움을 중심으로 한 작업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Key series: <em>After the Explosion</em> — the stillness and residual
                          feeling that remain once an event has passed.
                        </>
                      ) : (
                        <>
                          대표 시리즈: 〈폭발의 다음〉 — 사건이 지나간 뒤에 남는 정적과 잔여의 감정.
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Active across platforms such as Opengallery, an art rental and sales service.'
                        : '오픈갤러리 등 다양한 플랫폼에서 활동 — 미술품 대여·판매 서비스를 통해 작업을 선보임.'}
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
                    on the explosion, the landscape, and the distance between
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">
                    폭발과 풍경, 그리고 사이의 거리에 관하여
                  </span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 폭발의 다음 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈After the Explosion〉 — painting the aftermath, not the event'
                    : '〈폭발의 다음〉 — 사건이 아니라 그 다음을 그리다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of Kim Yujin&apos;s central series tells you where the artist
                        stands in relation to drama. Not <em>the explosion</em> but{' '}
                        <em>after the explosion</em>: Kim Yujin arrives a beat late, when the flash
                        is gone and only the consequence remains. The loudest moment is precisely
                        the one the artist declines to paint.
                      </p>
                      <p>
                        What is an aftermath made of? Dust still suspended in the light, a ringing
                        that has not yet faded from the ears, a place rearranged by force and not
                        yet understood. These are quiet things, and difficult to depict — they have
                        no clear shape, only an atmosphere. The series works at the level of that
                        atmosphere, holding the residue of an event rather than the event itself.
                      </p>
                      <p>
                        There is a tenderness in this choice. To paint the explosion would be to
                        sensationalise it; to paint its aftermath is to stay with what is left to be
                        felt. The series treats feeling as something that outlasts its cause — a
                        weather that settles over a place and lingers long after the thing that
                        brought it has gone.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김유진의 중심 연작이 단 제목은 그가 드라마와 맺는 거리를 일러 준다.{' '}
                        <em>폭발</em>이 아니라 <em>폭발의 다음</em>. 그는 한 박자 늦게 도착한다.
                        섬광이 사라지고 결과만 남았을 때. 가장 요란한 순간이야말로 그가 그리기를
                        사양하는 순간이다.
                      </p>
                      <p>
                        다음이란 무엇으로 이루어지는가. 빛 속에 아직 떠 있는 먼지, 귓속에서 미처
                        가시지 않은 울림, 힘에 의해 재배치되었으나 아직 이해되지 않은 자리. 이것들은
                        조용한 것이고, 그리기 어려운 것이다 — 분명한 형태가 없고 분위기만 있기
                        때문이다. 연작은 바로 그 분위기의 층위에서 작동한다. 사건 자체가 아니라
                        사건의 잔여를 붙들면서.
                      </p>
                      <p>
                        이 선택에는 다정함이 있다. 폭발을 그리는 일은 그것을 자극적으로 만드는 일이
                        될 것이다. 그 다음을 그리는 일은 남겨진 채 느껴져야 할 것의 곁에 머무는
                        일이다. 연작은 감정을 그 원인보다 오래 남는 무엇으로 다룬다 — 한 자리에
                        내려앉아, 그것을 불러온 것이 사라진 뒤에도 오래 머무는 날씨.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 감정이 담긴 풍경 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'A landscape that feels — emotion projected onto place'
                    : '느끼는 풍경 — 자리에 투사된 감정'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Landscape painting has often pretended to be objective — a faithful record
                        of a place as it is. Kim Yujin&apos;s landscapes make no such claim. In this
                        work the place is openly a vessel: it carries a feeling that belongs to no
                        object and so must be lent to the scenery.
                      </p>
                      <p>
                        This is an old human reflex — to read our weather into the sky, our grief
                        into an empty room. Kim Yujin formalises it. The emotion is not illustrated
                        by a figure within the landscape; it is dissolved into the landscape itself,
                        so that the whole field of the painting hums with a single feeling. There is
                        no one to point to. The mood is the subject.
                      </p>
                      <p>
                        And because the aftermath is most often the subject, the feeling these
                        landscapes carry is a quiet one — the low, persistent tone of something
                        already passed. To stand before such a painting is to be handed an
                        atmosphere and asked, gently, to recognise it: the way a place can hold what
                        we felt there, and give it back to us when we look.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        풍경화는 오래도록 객관적인 척해 왔다 — 어떤 자리를 있는 그대로 충실히 옮긴
                        기록인 척. 김유진의 풍경은 그런 주장을 하지 않는다. 그의 작업에서 자리는
                        드러내 놓고 그릇이다. 어떤 대상에도 속하지 않아 풍경에 빌려질 수밖에 없는
                        감정을 싣는.
                      </p>
                      <p>
                        이것은 오래된 인간의 반사다 — 우리의 날씨를 하늘에서 읽고, 우리의 슬픔을 빈
                        방에서 읽는. 김유진은 그것을 형식으로 만든다. 감정은 풍경 안의 인물로
                        설명되지 않는다. 그것은 풍경 자체로 녹아들어, 그림의 화면 전체가 하나의
                        감정으로 울리게 한다. 가리킬 사람이 없다. 분위기가 곧 주제다.
                      </p>
                      <p>
                        그리고 그가 대체로 그 다음을 그리기에, 그의 풍경이 싣는 감정은 나직한 것이다
                        — 이미 지나간 무엇의 낮고 끈질긴 음역. 그런 그림 앞에 선다는 것은 하나의
                        분위기를 건네받고, 그것을 알아보라고 조용히 청해지는 일이다. 한 자리가
                        우리가 거기서 느낀 것을 간직했다가, 우리가 바라볼 때 되돌려주는 방식.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 관계 속의 외로움 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The distance within closeness — loneliness in relationships'
                    : '가까움 안의 거리 — 관계 속의 외로움'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Running beneath the landscapes is a second concern that gives them their
                        particular ache: the loneliness within relationships. This is not the
                        loneliness of the hermit but of the person in company — the distance that
                        can open between two people even as they sit in the same room.
                      </p>
                      <p>
                        It is a harder loneliness to name, because it wears the appearance of
                        togetherness. Kim Yujin&apos;s landscapes are well suited to holding it. A
                        scene emptied of figures, charged with feeling, becomes a portrait of that
                        in-between space — the gap that intimacy does not always close, the quiet
                        that can fall between people who are near.
                      </p>
                      <p>
                        Placed beside the explosion series, this theme completes a single picture of
                        this attention. After the loud event comes the quiet; between two people
                        there is a quiet too. In both, what Kim Yujin paints is the space that opens
                        when the intensity recedes — and the feeling that gathers, patiently, to
                        fill it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        풍경 아래로는 그것에 특유의 쓸쓸함을 주는 또 하나의 관심이 흐른다 — 관계
                        속의 외로움. 이것은 은둔자의 외로움이 아니라 곁에 누군가 있는 사람의
                        외로움이다 — 같은 방에 앉아 있으면서도 두 사람 사이에 벌어질 수 있는 거리.
                      </p>
                      <p>
                        함께함의 외양을 입고 있기에 더 이름 붙이기 어려운 외로움이다. 김유진의
                        풍경은 그것을 담기에 알맞다. 인물이 비워지고 감정으로 채워진 장면은 바로 그
                        사이 공간의 초상이 된다 — 친밀함이 늘 메우지는 못하는 틈, 가까운 사람들
                        사이에 내려앉을 수 있는 고요.
                      </p>
                      <p>
                        폭발 연작과 나란히 놓으면, 이 주제는 그의 응시의 한 그림을 완성한다. 요란한
                        사건 다음에 고요가 오고, 두 사람 사이에도 고요가 있다. 둘 다에서 그가 그리는
                        것은 강렬함이 물러날 때 열리는 공간이다 — 그리고 그것을 채우려 인내심 있게
                        고이는 감정이다.
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
                      From the silence of 〈After the Explosion〉 to the distance that opens within
                      closeness, Kim Yujin has pursued a single attention: to the quiet that gathers
                      once intensity recedes, in a place and between people. Kim Yujin joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that the proceeds of the work might become a low-interest lifeline for
                      artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      〈폭발의 다음〉의 침묵에서 가까움 안에 열리는 거리에 이르기까지, 김유진은
                      하나의 응시를 추구해 왔다 — 강렬함이 물러난 뒤에 고이는 고요, 한 자리에서
                      그리고 사람들 사이에서. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                      예술인과의 연대자로서 함께한다 — 작품 판매 수익이 오늘 금융 차별을 겪는
                      예술인에게 저금리의 버팀목이 될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Yujin</span>
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
                    Kim Yujin joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김유진 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_YUJIN_PATH}
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
