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

// 작가 feature는 작가 페이지(/artworks/artist/김정원)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='김정원', name_en='Kim Jeongwon'. (주의: KimJungwon=김준권과 별개 — 이건 김정원)
const KIM_JEONGWON_PATH = `/artworks/artist/${encodeURIComponent('김정원')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimJeongwonArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김정원' ||
    n === 'kim jeongwon' ||
    n === 'kim jeong-won' ||
    n.replace(/[\s-]+/g, '') === 'kimjeongwon'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김정원 — 평범한 몸짓에 깃든 마음의 결을 그리는 회화 작가',
    description:
      '일상 속 인물의 자세와 정서를 회화로 옮겨 가는 작가 김정원. 〈손 모은 사람〉을 비롯한 작업을 통해 평범한 몸짓에 깃든 마음의 결을 화면에 담아 왔다. 자세와 몸짓이라는 모티프로 일상의 정서를 응시하는 김정원의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '일상 속 인물의 자세와 정서를 회화로 옮기는 작가 김정원. 〈손 모은 사람〉 — 평범한 몸짓에 깃든 마음의 결.',
    ogAlt: '김정원 대표 작품',
    twitterTitle: '김정원',
    twitterDescription: '평범한 몸짓에 깃든 마음의 결 — 일상의 정서를 그리는 회화 작가 김정원',
    keywords: '김정원 작가, 회화, 인물화, 손 모은 사람, 몸짓, 자세, 일상의 정서, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Jeongwon — Painter of the Heart Within Ordinary Gestures',
    description:
      'Selected works by Kim Jeongwon, a painter who translates the postures and quiet emotions of everyday figures onto the canvas. Through works such as 〈A Person with Folded Hands〉, she captures the grain of feeling held within an ordinary gesture. View and collect her works at SAF Online.',
    ogDescription:
      'Kim Jeongwon translates the postures and quiet emotions of everyday figures into painting. 〈A Person with Folded Hands〉 — the heart within an ordinary gesture.',
    ogAlt: 'Kim Jeongwon — featured work',
    twitterTitle: 'Kim Jeongwon',
    twitterDescription:
      'The heart within an ordinary gesture — a painter of everyday emotion, Kim Jeongwon',
    keywords:
      'Kim Jeongwon artist, painting, figurative painting, folded hands, gesture, posture, everyday emotion',
  },
} as const;

export async function buildKimJeongwonMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_JEONGWON_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김정원');
  const artwork = allArtworks.find((a) => isKimJeongwonArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Jeongwon`
      : `${artwork.title} — 김정원`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_JEONGWON_PATH, locale, true),
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

export default async function KimJeongwonFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_JEONGWON_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김정원');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKimJeongwonArtist(artwork.artist)
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
    { name: isEnglish ? 'Kim Jeongwon' : '김정원', url: pageUrl },
  ]);

  // history 공백 — birthDate/award/alumniOf 등 미검증 항목은 JSON-LD에서 일절 제외.
  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_JEONGWON_PATH}#person-kim-jeongwon`,
    name: isEnglish ? 'Kim Jeongwon' : '김정원',
    alternateName: isEnglish ? '김정원' : 'Kim Jeongwon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Kim Jeongwon is a painter who translates the postures and quiet emotions of everyday figures onto the canvas, capturing the grain of feeling held within an ordinary gesture.'
      : '김정원은 일상 속 인물의 자세와 정서를 회화로 옮겨 가는 작가로, 평범한 몸짓에 깃든 마음의 결을 화면에 담습니다.',
    knowsAbout: isEnglish
      ? ['Painting', 'Figurative painting', 'Everyday emotion']
      : ['회화', '인물화', '일상의 정서'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Jeongwon — SAF Online' : '김정원 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Jeongwon from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 김정원 작품을 소개합니다.',
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
        {/* Hero Section — 손 모은 사람: 고요하고 정적인 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 모은 손 모티프 — 가운데로 모이는 두 개의 선 */}
          <div className="absolute top-0 left-[42%] h-full w-px bg-white/10" />
          <div className="absolute top-0 left-[58%] h-full w-px bg-primary/25" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Jeongwon · Painter' : '김정원 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The heart within
                  <br />
                  <span className="text-primary-soft">an ordinary gesture</span>
                </>
              ) : (
                <>
                  평범한 몸짓에 깃든
                  <br />
                  <span className="text-primary-soft">마음의 결</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She translates the postures of everyday figures into painting.
                  </span>
                  <span className="mt-2 block">
                    A folded pair of hands, holding the quiet grain of feeling.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">일상 속 인물의 자세를 회화로 옮기다.</span>
                  <span className="mt-2 block">고요히 모은 두 손에 담긴 마음의 결.</span>
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
                    A posture held —<br />
                    <span className="text-primary-strong">the emotion of the everyday</span>
                  </>
                ) : (
                  <>
                    붙든 자세 하나 —<br />
                    <span className="text-primary-strong">일상에 깃든 정서</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Jeongwon is a painter who translates the postures and quiet emotions of
                      everyday figures onto the canvas. Her subject is not the dramatic event but
                      the small, habitual movement — the way a body holds itself when no one is
                      watching, the gestures so ordinary that we have stopped seeing them.
                    </p>
                    <p>
                      Among these gestures, one recurs as a kind of anchor:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈A Person with Folded Hands〉
                      </strong>
                      . Folded hands are among the most common of human postures — a sign of
                      waiting, of prayer, of patience, of quietly gathering oneself. In Kim
                      Jeongwon&apos;s hands the gesture becomes a vessel: an ordinary movement made
                      to hold the grain of a feeling that has no other words.
                    </p>
                    <p>
                      Her interest, in other words, is less in the face than in the body — in how
                      posture itself carries emotion. A turned shoulder, a lowered head, a pair of
                      hands brought together: these are the places where the inner life surfaces
                      without being announced. She watches them long enough to paint them, and in
                      that watching the everyday becomes something worth looking at.
                    </p>
                    <p>
                      What results is a painting that asks for slowness. It does not raise its voice
                      or stage a scene. It sets down a single posture and trusts that a viewer,
                      meeting it, will recognise the{' '}
                      <strong className="font-bold text-charcoal">grain of feeling</strong> it holds
                      — the way a familiar gesture can return us, suddenly, to our own quiet hours.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김정원은 일상 속 인물의 자세와 정서를 회화로 옮겨 가는 작가다. 그의 주제는
                      극적인 사건이 아니라, 작고 습관적인 움직임이다 — 아무도 보지 않을 때 몸이
                      자신을 가누는 방식, 너무 평범해서 우리가 더는 들여다보지 않게 된 몸짓.
                    </p>
                    <p>
                      그 몸짓들 가운데 하나가 닻처럼 거듭 돌아온다 —{' '}
                      <strong className="font-bold text-charcoal-deep">〈손 모은 사람〉</strong>.
                      모은 손은 인간의 가장 흔한 자세 중 하나다 — 기다림의, 기도의, 인내의, 조용히
                      자신을 추스르는 몸짓의 표지. 김정원의 손에서 그 몸짓은 그릇이 된다. 다른
                      말로는 옮길 수 없는 감정의 결을 담아내는, 평범한 움직임.
                    </p>
                    <p>
                      바꿔 말하면 그의 관심은 얼굴보다 몸에 가깝다 — 자세 그 자체가 어떻게 정서를
                      나르는가에. 돌린 어깨, 숙인 고개, 마주 모은 두 손. 이것들은 내면이 선언되지
                      않은 채 떠오르는 자리다. 그는 그것을 그릴 수 있을 만큼 오래 바라보고, 그 응시
                      속에서 일상은 들여다볼 만한 무언가가 된다.
                    </p>
                    <p>
                      그렇게 도착하는 그림은 느림을 청한다. 목소리를 높이지도, 장면을 연출하지도
                      않는다. 단 하나의 자세를 내려놓고, 그것과 마주한 이가 거기 담긴{' '}
                      <strong className="font-bold text-charcoal">마음의 결</strong>을 알아보리라
                      믿는다 — 익숙한 몸짓 하나가 문득 우리를 자신의 고요한 시간으로 되돌려 놓는
                      방식으로.
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
                        {isEnglish ? 'Posture as emotion' : '정서가 된 자세'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Less the face than the body — how a turned shoulder or a lowered head carries an inner life that is never announced.'
                          : '얼굴보다 몸. 돌린 어깨나 숙인 고개가 선언되지 않은 내면을 어떻게 나르는가.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? '〈A Person with Folded Hands〉' : '〈손 모은 사람〉'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Folded hands — a gesture of waiting, of patience, of quietly gathering oneself — made into a vessel for feeling that has no other words.'
                          : '기다림과 인내, 조용히 자신을 추스르는 모은 손. 다른 말로는 옮길 수 없는 감정의 그릇이 된 몸짓.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The grain of the everyday' : '일상의 결'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Painting that asks for slowness — a single ordinary movement, watched long enough to become worth looking at.'
                          : '느림을 청하는 그림. 충분히 오래 바라보아 들여다볼 만해진, 단 하나의 평범한 움직임.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가 노트 — history 공백이므로 연보·전시 카드 대신 작업 태도를 담은 큐레이터 노트 */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? "The painter's gaze" : '작가의 시선'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Medium: painting. The figure and its posture are her constant subject.'
                        : '매체: 회화. 인물과 그 자세가 변함없는 주제다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'She watches the small, habitual movements of everyday figures — the gestures we have stopped seeing.'
                        : '일상 속 인물의 작고 습관적인 움직임을 응시한다 — 우리가 더는 들여다보지 않게 된 몸짓을.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈A Person with Folded Hands〉 anchors her practice: an ordinary posture made to hold the grain of feeling.'
                        : '〈손 모은 사람〉이 작업의 닻이 된다 — 감정의 결을 담아내는 평범한 자세.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The work asks for slowness, trusting the viewer to recognise the quiet emotion it holds.'
                        : '그림은 느림을 청하며, 거기 담긴 고요한 정서를 보는 이가 알아보리라 믿는다.'}
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
                  <span className="text-charcoal-deep">on gesture, posture, and the everyday</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">몸짓과 자세, 그리고 일상에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 몸짓이라는 언어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Gesture as a language — the body before the word'
                    : '몸짓이라는 언어 — 말보다 먼저 오는 몸'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Long before we speak, we hold ourselves in postures. A body waiting, a body
                        bracing, a body at rest — each carries a meaning the face has not yet
                        composed. Kim Jeongwon&apos;s painting begins from this premise: that the
                        body is its own language, and that a gesture can say what words would only
                        flatten.
                      </p>
                      <p>
                        Her figures are drawn from the everyday, and their movements are the kind we
                        perform without noticing — the small adjustments of posture by which a
                        person endures an ordinary hour. By painting them, she returns our attention
                        to what habit has erased. The gesture, lifted out of the rush of the day and
                        held still on the canvas, becomes legible again.
                      </p>
                      <p>
                        This is a quiet ambition, and a precise one. It asks the painter to read the
                        body closely — to know which tilt of a shoulder reads as fatigue and which
                        as patience, where a posture tips from rest into waiting. The emotion is
                        never captioned; it is built into the pose, and trusted to the viewer&apos;s
                        own recognition.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        말하기 훨씬 전부터, 우리는 자세로 자신을 가눈다. 기다리는 몸, 버티는 몸,
                        쉬고 있는 몸 — 저마다 얼굴이 아직 짓지 못한 의미를 나른다. 김정원의 회화는
                        이 전제에서 출발한다. 몸은 그 자체로 하나의 언어이며, 몸짓은 말이라면
                        납작하게 만들 무언가를 말할 수 있다는 것.
                      </p>
                      <p>
                        그의 인물은 일상에서 길어 올린 것이고, 그 움직임은 우리가 알아채지 못한 채
                        행하는 종류의 것이다 — 평범한 한 시간을 견디며 사람이 자세를 미세하게 고쳐
                        가는 방식. 그것을 그림으로써 그는 습관이 지워 버린 것으로 우리의 시선을
                        되돌린다. 하루의 분주함에서 들어 올려져 화면 위에 멈춰 선 몸짓은 다시 읽을
                        수 있게 된다.
                      </p>
                      <p>
                        이것은 조용한 야심이고, 정확한 야심이다. 그것은 작가에게 몸을 가까이 읽기를
                        요구한다 — 어깨의 어떤 기울기가 피로로 읽히고 어떤 기울기가 인내로 읽히는지,
                        자세가 어디에서 쉼에서 기다림으로 기우는지를. 감정은 결코 설명되지 않는다.
                        그것은 자세 안에 지어지고, 보는 이의 알아봄에 맡겨진다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 손 모은 사람 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈A Person with Folded Hands〉 — a vessel for feeling'
                    : '〈손 모은 사람〉 — 감정의 그릇'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Of all the postures she returns to, the folded hands recur most insistently.
                        It is among the most common of human gestures, and that commonness is the
                        point: folded hands belong to no single occasion. They are the shape of
                        waiting, of prayer, of patience, of a person quietly gathering themselves
                        before whatever comes next.
                      </p>
                      <p>
                        Because the gesture is so open, it can hold almost any feeling poured into
                        it. In Kim Jeongwon&apos;s 〈A Person with Folded Hands〉, the hands become
                        a vessel — an ordinary movement made to carry the grain of an emotion that
                        has no other words. The painting does not tell us what the figure feels; it
                        gives us the posture and lets the feeling settle wherever the viewer&apos;s
                        own life directs it.
                      </p>
                      <p>
                        There is a generosity in this. By choosing a gesture everyone has made, the
                        painter leaves room for everyone to recognise themselves in it. The folded
                        hands on the canvas are hers, and the figure&apos;s, and — for a moment —
                        the viewer&apos;s own.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그가 거듭 돌아가는 모든 자세 중에서, 모은 손이 가장 집요하게 되돌아온다.
                        그것은 인간의 가장 흔한 몸짓 중 하나이고, 그 흔함이 곧 요점이다 — 모은 손은
                        어느 한 장면에만 속하지 않는다. 그것은 기다림의 형상이고, 기도의, 인내의,
                        다음에 올 무엇 앞에서 조용히 자신을 추스르는 사람의 형상이다.
                      </p>
                      <p>
                        그 몸짓이 그토록 열려 있기에, 거기 부어진 거의 모든 감정을 담아낼 수 있다.
                        김정원의 〈손 모은 사람〉에서 두 손은 그릇이 된다 — 다른 말로는 옮길 수 없는
                        감정의 결을 나르는, 평범한 움직임. 그림은 인물이 무엇을 느끼는지 말해 주지
                        않는다. 자세를 건네고, 그 감정이 보는 이의 삶이 이끄는 자리에 가라앉도록
                        둔다.
                      </p>
                      <p>
                        여기에는 너그러움이 있다. 누구나 해 본 몸짓을 택함으로써, 작가는 누구나 그
                        안에서 자신을 알아볼 여지를 남긴다. 화면 위에 모은 손은 그의 것이고, 인물의
                        것이며, 잠시 동안은 보는 이 자신의 것이 된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 일상을 응시한다는 것 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'To gaze at the everyday — slowness as a form of care'
                    : '일상을 응시한다는 것 — 돌봄의 한 형식으로서의 느림'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The everyday is, by definition, what we overlook. We move through our
                        ordinary hours too quickly to see them, and the gestures that fill those
                        hours pass unregarded. To paint the everyday, then, is first to slow down
                        enough to look — and that slowness is itself a kind of care.
                      </p>
                      <p>
                        Kim Jeongwon&apos;s practice is built on this attention. She does not
                        dramatise her figures or lend them borrowed significance; she watches a
                        posture long enough to find what it already holds. The result is painting
                        that asks the same slowness of its viewer — that resists the quick glance
                        and rewards the lingering one.
                      </p>
                      <p>
                        In a culture that prizes the loud and the immediate, this is a quietly
                        radical proposition: that the grain of feeling within an ordinary gesture is
                        worth a painting, and worth our time. To look closely at the everyday is to
                        insist that it matters — that the small movements of a single body are a
                        subject equal to any.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        일상이란 정의상 우리가 지나쳐 버리는 것이다. 우리는 평범한 시간을 너무 빨리
                        지나가 그것을 보지 못하고, 그 시간을 채우는 몸짓들은 주목받지 못한 채 스쳐
                        간다. 그러니 일상을 그린다는 것은, 우선 바라볼 만큼 충분히 느려지는 일이다 —
                        그리고 그 느림 자체가 일종의 돌봄이다.
                      </p>
                      <p>
                        김정원의 작업은 이 응시 위에 세워진다. 그는 인물을 극화하거나 빌려 온 의미를
                        입히지 않는다. 자세 하나를, 그것이 이미 품고 있는 것을 찾아낼 만큼 오래
                        바라본다. 그렇게 도착하는 그림은 보는 이에게도 같은 느림을 청한다 — 빠른
                        눈길을 거절하고, 머무는 눈길에 답하는 그림.
                      </p>
                      <p>
                        요란하고 즉각적인 것을 떠받드는 문화 속에서, 이것은 조용히 급진적인
                        제안이다. 평범한 몸짓에 깃든 마음의 결이 한 점의 그림에 값하고, 우리의
                        시간에 값한다는 것. 일상을 가까이 들여다보는 일은 그것이 중요하다고 주장하는
                        일이다 — 한 몸의 작은 움직임이 그 무엇과도 대등한 주제라고.
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
                      From a pair of folded hands to the quiet postures of everyday figures, Kim
                      Jeongwon&apos;s painting has pursued a single question: how does an ordinary
                      gesture hold the grain of a feeling? Her answer is offered in paint — watch
                      closely, slow down, and let the everyday become worth looking at. She joins
                      this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that the proceeds of her work might become a low-interest
                      lifeline for artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      모은 두 손에서 일상 속 인물의 고요한 자세에 이르기까지, 김정원의 회화는 하나의
                      물음을 추구해 왔다 — 평범한 몸짓이 어떻게 감정의 결을 담아내는가. 그의 대답은
                      그림으로 건네진다. 가까이 보고, 느려지고, 일상이 들여다볼 만한 무언가가
                      되도록. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Jeongwon</span>
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
                    Kim Jeongwon joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김정원 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_JEONGWON_PATH}
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
