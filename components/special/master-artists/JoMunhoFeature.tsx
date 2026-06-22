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

// 거장 작가 feature는 작가 페이지(/artworks/artist/조문호)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JO_MUNHO_PATH = `/artworks/artist/${encodeURIComponent('조문호')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const isJoMunhoArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '조문호' ||
    n === 'jo munho' ||
    n === 'jo mun-ho' ||
    n.replace(/[\s-]+/g, '') === 'jomunho' ||
    n.replace(/[\s-]+/g, '') === 'chomun ho' ||
    n === 'cho munho'
  );
};

const PAGE_COPY = {
  ko: {
    title: '조문호 — 사람만 찍는 다큐멘터리 사진가',
    description:
      '사람만 찍는 다큐멘터리 사진가 조문호(1947–). 청량리 사창가 여성, 강원 산골 농민, 인사동 풍류객, 쪽방촌 빈민을 렌즈에 담아온 작가. 찾아가 찍는 것이 아니라 현지에서 그들과 함께 살며 작업해왔습니다. 씨앗페 온라인에서 조문호의 작품을 감상하고 소장하세요.',
    ogDescription:
      '사람만 찍는 다큐멘터리 사진가 조문호. 청량리 588에서 쪽방촌까지, 소외된 사람들 곁에서 함께 살며 담아온 기록.',
    ogAlt: '조문호 대표 작품',
    twitterTitle: '조문호',
    twitterDescription: '사람만 찍는다 — 다큐멘터리 사진가 조문호의 기록',
    keywords: '조문호 사진작가, 다큐멘터리 사진, 청량리 588, 인사동 사람들, 씨앗페 온라인',
  },
  en: {
    title: 'Jo Munho — Documentary Photographer of People',
    description:
      'Selected works by Jo Munho (b. 1947), documentary photographer who photographs only people. He has spent decades living among his subjects — the women of Cheongnyangni, mountain farmers, Insadong bohemians, and the urban poor. View and collect his works at SAF Online.',
    ogDescription:
      'Jo Munho — documentary photographer who photographs only people. From Cheongnyangni 588 to the jjokbang neighborhoods: decades of living among and documenting the overlooked.',
    ogAlt: 'Jo Munho — featured work',
    twitterTitle: 'Jo Munho',
    twitterDescription: 'I only photograph people — documentary photographer Jo Munho',
    keywords:
      'Jo Munho photographer, Korean documentary photography, Cheongnyangni 588, Insadong, Korean photography',
  },
} as const;

export async function buildJoMunhoMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const copy = PAGE_COPY[locale];
  const tSeo = await getTranslations({ locale, namespace: 'seo' });
  const siteName = tSeo('siteTitle');
  const pageUrl = buildLocaleUrl(JO_MUNHO_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('조문호');
  const artwork = allArtworks.find((a) => isJoMunhoArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jo Munho`
      : `${artwork.title} — 조문호`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JO_MUNHO_PATH, locale, true),
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

export default async function JoMunhoFeature({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JO_MUNHO_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('조문호');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isJoMunhoArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Jo Munho' : '조문호', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JO_MUNHO_PATH}#person-jo-munho`,
    name: isEnglish ? 'Jo Munho' : '조문호',
    alternateName: isEnglish ? '조문호' : 'Jo Munho',
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? 'Jo Munho (b. 1947) is a Korean documentary photographer known for his decades-long practice of living among marginalized communities — including the women of Cheongnyangni, mountain farmers, and the urban poor — before and while photographing them.'
      : '조문호(1947–)는 소외된 공동체 — 청량리 사창가 여성, 강원 산골 농민, 쪽방촌 빈민 등 — 과 함께 살면서 그들을 렌즈에 담아온 한국 다큐멘터리 사진가입니다.',
    birthDate: '1947',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Changnyeong, South Gyeongsang, South Korea' : '경남 창녕',
    },
    knowsAbout: ['Documentary photography', 'Korean photography', 'Social documentary'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jo Munho — SAF Online' : '조문호 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jo Munho from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 조문호 작품을 소개합니다.',
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

          {/* B&W documentary motif — grain lines */}
          <div className="absolute inset-0 opacity-5 pointer-events-none select-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full w-px bg-white"
                style={{ left: `${(i + 1) * 12}%` }}
              />
            ))}
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jo Munho · b. 1947' : '조문호 · 1947–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  I only
                  <br />
                  <span className="text-primary-soft">photograph people</span>
                </>
              ) : (
                <>
                  사람만
                  <br />
                  <span className="text-primary-soft">찍는다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">He did not visit to photograph — he went to live.</span>
                  <span className="mt-2 block">
                    Decades spent inside the lives of those the camera otherwise never enters.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">찾아가서 찍은 것이 아니다. 가서 함께 살았다.</span>
                  <span className="mt-2 block">
                    카메라가 닿지 않는 곳에서, 그 사람들 곁에서 보낸 수십 년.
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
                    To photograph a person —<br />
                    <span className="text-primary-strong">
                      you must first become their neighbor
                    </span>
                  </>
                ) : (
                  <>
                    사람을 찍는다는 것 —<br />
                    <span className="text-primary-strong">먼저 그 이웃이 된다는 것</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jo Munho was born in 1947 in Changnyeong, South Gyeongsang province. He
                      emerged in documentary photography through the 1980s, earning the Grand Prize
                      at the Dong-A Art Festival in 1985 with his serial work on the red-light
                      district — the series that would eventually become the{' '}
                      <strong className="font-bold text-charcoal-deep">Cheongnyangni 588</strong>{' '}
                      body of work. The following year he won the Grand Prize at the Asian Games
                      Documentary Photography Competition.
                    </p>
                    <p>
                      What distinguishes Jo Munho from most documentary photographers is a principle
                      he has practiced across his entire career: he does not arrive to photograph
                      and then leave. From 1983 to 1988 he lived inside the Cheongnyangni red-light
                      district, sharing daily life with the women there. Later he moved to live
                      among Gangwon Province mountain farmers, then among the artists and bohemians
                      of Insadong. He has worked in the same way wherever he has turned his lens —
                      market vendors, the residents of jjokbang neighborhoods — because for him, the
                      photograph cannot precede the relationship.
                    </p>
                    <p>
                      Beyond his photographic practice, Jo served as editor-in-chief of{' '}
                      <em>Monthly Photography</em>, the Korean Photo Association journal, and{' '}
                      <em>Samsung Photo Family</em>. From 1995 he served for ten years as president
                      of the Korea Environmental Photographers Association, contributing to the
                      documentation of Korea&apos;s natural environment alongside his
                      people-centered practice.
                    </p>
                    <p>
                      His photo books — including <em>Cheongnyangni 588</em> (Nunbit Publishers),{' '}
                      <em>Insadong Story Photo Collection</em>, <em>Mountain Village People</em>,
                      and <em>People of Donggang</em> — document communities that were being changed
                      or erased by modernization, and preserve the faces of people who might
                      otherwise disappear without record.
                    </p>
                    <p>
                      Today Jo Munho lives in the Dongjadong jjokbang neighborhood, continuing to
                      document the lives of the urban poor. The method has not changed: he is{' '}
                      <strong className="font-bold text-charcoal">a neighbor first</strong>, a
                      photographer second.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      조문호는 1947년 경남 창녕에서 태어났다. 1980년대를 거치며 다큐멘터리 사진가로
                      자리를 잡았고, 1985년 동아미술제에서 홍등가 연작으로 대상을 수상했다. 그
                      작업은 훗날{' '}
                      <strong className="font-bold text-charcoal-deep">청량리 588</strong> 연작으로
                      이어진다. 이듬해인 1986년에는 아시안게임 기록사진 공모전에서도 대상을 받았다.
                    </p>
                    <p>
                      조문호를 여타 다큐멘터리 사진가들과 구별짓는 것은 그의 작업 방식이다. 그는
                      찾아가서 찍고 돌아오지 않는다. 1983년부터 1988년까지 5년간 청량리 사창가에
                      살며 그곳 여성들과 일상을 나눴다. 이후 강원도 산골 농민들 사이에서 살았고,
                      인사동 풍류객들과 어울렸다. 장터꾼과 쪽방촌 빈민을 찍을 때도 마찬가지였다.
                      그에게 사진은 관계보다 앞설 수 없기 때문이다.
                    </p>
                    <p>
                      사진 작업 외에도 그는 『월간사진』, 『한국사협』, 『삼성포토패밀리』 편집장을
                      역임했다. 1995년부터 10년간 한국환경사진가회 회장을 맡아 사람뿐 아니라
                      우리나라 자연환경 기록에도 힘을 쏟았다.
                    </p>
                    <p>
                      그의 사진집들 — 눈빛출판사의 『청량리 588』, 『인사동 이야기 사진집』,
                      『두메산골 사람들 사진집』, 『동강 백성들 포토 에세이』 — 은 근대화에 의해
                      변하거나 지워져가던 공동체들을 담은 기록이다. 기억되지 않을 수도 있었을
                      사람들의 얼굴을 남겼다.
                    </p>
                    <p>
                      현재 조문호는 동자동 쪽방촌에 살며 빈민의 삶을 기록한다. 방법은 변하지 않았다:{' '}
                      <strong className="font-bold text-charcoal">먼저 이웃</strong>이 되고, 그다음
                      사진을 찍는다.
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
                        {isEnglish ? 'Living among the subject' : '피사체 속에 살기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not visiting to photograph, but relocating to live — for months or years — inside the communities he documents.'
                          : '찍으러 찾아가는 것이 아니라, 그 공동체 안에 수개월 또는 수년간 살면서 기록한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The overlooked and the marginalized' : '소외된 사람들'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Women in red-light districts, mountain farmers, market vendors, the urban poor — subjects the mainstream documentary gaze consistently bypasses.'
                          : '사창가 여성, 산골 농민, 장터꾼, 쪽방촌 빈민 — 주류 다큐멘터리가 지나치는 사람들.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Photography as record' : '기록으로서의 사진'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His work preserves what is being erased — communities, livelihoods, and faces that disappear as Korea modernizes.'
                          : '근대화로 사라져가는 공동체, 생계, 얼굴을 보존하는 기록으로서의 사진 실천.'}
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
                      1947
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Changnyeong, South Gyeongsang province.'
                        : '경남 창녕 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1983–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins the Cheongnyangni 588 project; lives inside the red-light district for five years (through 1988).'
                        : '청량리 588 작업 시작. 사창가에서 5년간 거주하며 촬영(~1988).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Wins the Grand Prize at the Dong-A Art Festival with the serial work 〈Red Light District〉.'
                        : '동아미술제 연작 「홍등가」 대상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Grand Prize, Asian Games Documentary Photography Competition.'
                        : '아시안게임 기록사진 공모전 대상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition documenting the pro-democracy movement.'
                        : '민주항쟁 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Jeonnong-dong 588〉.'
                        : '개인전 〈전농동 588번지〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1995–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Serves as president of the Korea Environmental Photographers Association for ten years (through 2005).'
                        : '한국환경사진가회 회장 역임(~2005, 10년간).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈People of Donggang〉.'
                        : '개인전 〈동강 백성들〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Mountain Village People〉.'
                        : '개인전 〈두메산골 사람들〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Insadong: Landscapes of Memory〉.'
                        : '개인전 〈인사동 그 기억의 풍경〉.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Cheongnyangni 588〉 (25 years after initial work); photo book published by Nunbit Publishers.'
                        : '개인전 〈청량리 588〉(작업 25년 만의 재전시); 눈빛출판사 사진집 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈It Is People〉, Ara Art Center, Insadong.'
                        : '개인전 〈사람이다〉(인사동 아라아트센터).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Mountain Village People〉. Seoul Culture Today Culture Grand Prize.'
                        : '개인전 〈산골사람들〉. 서울문화투데이 문화대상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lives in the Dongjadong jjokbang neighborhood, Seoul, documenting the lives of the urban poor.'
                        : '동자동 쪽방촌에 살며 빈민의 삶을 기록 중.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & publications' : '주요 전시 및 출판'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Dong-A Art Festival Grand Prize 〈Red Light District〉 series (1985) · Asian Games Documentary Photography Grand Prize (1986)'
                        : '동아미술제 연작 「홍등가」 대상 (1985) · 아시안게임 기록사진 공모전 대상 (1986)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Photo books (Nunbit Publishers):{' '}
                          <a
                            href="https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=53718051"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            <em>Cheongnyangni 588</em>
                          </a>
                          , <em>Insadong Story</em>, <em>Mountain Village People</em>,{' '}
                          <em>People of Donggang</em>
                        </>
                      ) : (
                        <>
                          사진집(눈빛출판사):{' '}
                          <a
                            href="https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=53718051"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            『청량리 588』
                          </a>
                          , 『인사동 이야기』, 『두메산골 사람들』, 『동강 백성들』
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Cheongnyangni 588〉 (2015) · 〈It Is People〉 (2016, Ara Art Center) · 〈Mountain Village People〉 (2018)'
                        : '〈청량리 588〉 (2015) · 〈사람이다〉 (2016, 아라아트센터) · 〈산골사람들〉 (2018)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul Culture Today Culture Grand Prize (2018)'
                        : '서울문화투데이 문화대상 (2018)'}
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
                  <span className="text-charcoal-deep">on a camera, a life, and the people</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">카메라와 삶과 사람에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 사람만 찍는다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'I only photograph people' : '사람만 찍는다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In a documentary tradition that trains its lens on landscapes, disasters,
                        and social conditions, Jo Munho made a single decision that has governed his
                        practice across five decades:{' '}
                        <strong className="font-bold text-charcoal-deep">only people</strong>. Not
                        the red-light district as a place — but the women who lived there. Not the
                        mountain as geography — but the farmers who worked it. Not the jjokbang
                        neighborhood as social problem — but the faces of those who make it home.
                      </p>
                      <p>
                        This is a harder constraint than it sounds. To photograph a person honestly
                        — to make an image that holds their dignity rather than reducing them to
                        their circumstances — requires something the visiting photographer cannot
                        provide. It requires time, presence, and the willingness to become,
                        temporarily, part of the world you are entering. Jo&apos;s response to this
                        requirement has always been the same: he moves in.
                      </p>
                      <p>
                        From 1983 to 1988 he did not visit Cheongnyangni to photograph. He lived
                        there. The women of the red-light district became his neighbors. By the time
                        he raised his camera, the distance that separates subject from photographer
                        — the distance that makes so many documentary photographs feel extractive —
                        had been dissolved by five years of shared life. What remains in the images
                        is not exposure but intimacy.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        풍경과 재난과 사회적 조건에 렌즈를 향하는 다큐멘터리의 전통 속에서, 조문호는
                        50년의 작업을 지배한 하나의 결정을 내렸다:{' '}
                        <strong className="font-bold text-charcoal-deep">사람만</strong> 찍는다.
                        장소로서의 홍등가가 아니라 그 안에서 살던 여성들. 지리로서의 산이 아니라 그
                        산을 일구는 농민들. 사회 문제로서의 쪽방촌이 아니라 그 쪽방을 집 삼아 사는
                        사람들의 얼굴.
                      </p>
                      <p>
                        이 제약은 들리는 것보다 어렵다. 사람을 정직하게 찍는 것 — 그 처지로 환원하지
                        않고 존엄을 담은 사진을 만드는 것 — 은 찾아온 사진가가 줄 수 없는 무언가를
                        요구한다. 시간, 존재, 그리고 진입하는 세계의 일부가 되려는 의지. 조문호의
                        대답은 언제나 같았다: 들어가서 산다.
                      </p>
                      <p>
                        1983년부터 1988년까지 그는 청량리를 찍으러 다닌 것이 아니다. 거기서 살았다.
                        사창가의 여성들이 이웃이 됐다. 카메라를 들어올렸을 때쯤에는, 피사체와
                        사진가를 가르는 거리 — 많은 다큐멘터리 사진이 착취적으로 느껴지게 만드는
                        바로 그 거리 — 가 5년의 공유된 삶으로 이미 지워져 있었다. 남은 것은 폭로가
                        아닌 친밀함이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 청량리 588 — 그들과 함께 살다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Cheongnyangni 588 — living inside the record'
                    : '청량리 588 — 기록 안에서 살다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The Cheongnyangni red-light district in eastern Seoul — known by the address
                        of the block, 전농동 588 — was one of the largest and most visible sites of
                        commercial sex work in Korea through the late twentieth century. In 1983,
                        when Jo Munho moved in to begin his work, it was also one of the most
                        photographed addresses in Korean documentary — and yet one of the least
                        understood, because the photographers came and went.
                      </p>
                      <p>
                        Jo spent five years there. He documented the women who lived and worked in
                        the district not as symbols of social problem but as people: their daily
                        routines, their relationships, their moments of humor and exhaustion and
                        care for one another. In 1985 the series was recognized with the Grand Prize
                        at the Dong-A Art Festival. In 1990 he held a solo exhibition. In 2015 —
                        twenty-five years after the neighborhood&apos;s forced demolition — he
                        exhibited the work again, and Nunbit Publishers released the full photo
                        collection{' '}
                        <em>
                          <a
                            href="https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=53718051"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-primary-strong"
                          >
                            Cheongnyangni 588
                          </a>
                        </em>
                        .
                      </p>
                      <p>
                        The Cheongnyangni work is now considered a landmark of Korean social
                        documentary: a record of people and a place that no longer exist in the form
                        he photographed, made possible only because he chose to inhabit rather than
                        observe. It stands as evidence that the most durable documentary photographs
                        are not those taken from outside a world, but from within it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        서울 동쪽의 청량리 사창가 — 전농동 588번지라는 주소로 불렸던 그곳 — 은
                        20세기 후반 한국에서 가장 크고 잘 알려진 성매매 집결지 중 하나였다. 1983년
                        조문호가 들어가 작업을 시작할 때, 그곳은 한국 다큐멘터리에서 가장 많이
                        촬영된 주소이기도 했다. 그러나 가장 이해받지 못한 곳이기도 했다. 사진가들이
                        왔다가 떠났기 때문이다.
                      </p>
                      <p>
                        조문호는 5년을 그곳에서 살았다. 그는 이 지역에서 살고 일하는 여성들을 사회
                        문제의 상징이 아니라 사람으로 기록했다: 일상의 루틴, 인간관계, 웃음과 지침과
                        서로를 향한 배려의 순간들. 1985년 동아미술제에서 이 연작이 대상을 받았고,
                        1990년 개인전이 열렸다. 2015년 — 철거 25년 만에 — 다시 전시했고,
                        눈빛출판사에서 사진집{' '}
                        <a
                          href="https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=53718051"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary-strong"
                        >
                          『청량리 588』
                        </a>
                        이 출간됐다.
                      </p>
                      <p>
                        청량리 작업은 이제 한국 사회 다큐멘터리의 기념비적 기록으로 평가된다. 그가
                        사진 찍은 모습으로는 더 이상 존재하지 않는 사람들과 장소의 기록, 오직 관찰이
                        아닌 거주를 선택했기에 가능했던 기록. 가장 오래 남는 다큐멘터리 사진은
                        세계의 바깥에서 찍힌 것이 아니라 그 안에서 찍힌 것임을 보여주는 증거다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 기록으로서의 사진 — 동자동까지 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Photography as record — from the mountains to Dongjadong'
                    : '기록으로서의 사진 — 산골에서 동자동까지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The trajectory of Jo Munho&apos;s career is not a sequence of subjects but a
                        single continuous practice: he follows the people who are being left behind.
                        After the Cheongnyangni work he turned to mountain farmers in Gangwon
                        Province — communities whose ways of living were being dissolved by
                        migration to the cities — documenting them in a series of exhibitions and
                        the photo book <em>Mountain Village People</em>. He photographed the artists
                        and figures of Insadong as that neighborhood transformed, publishing{' '}
                        <em>Insadong Story</em>. He documented market vendors across Korea in an era
                        when five-day markets were disappearing.
                      </p>
                      <p>
                        Each of these projects is a record of something passing. The photographs
                        exist because Jo was there — not as observer but as resident — before the
                        passing was complete. In that sense his entire body of work functions as an
                        archive of Korean life in the second half of the twentieth century,
                        assembled not through institutional commission or journalistic assignment
                        but through the sustained choice to live where most photographers would not.
                      </p>
                      <p>
                        Today he lives in the Dongjadong jjokbang neighborhood in Seoul, still
                        photographing, still living among the people he documents. The method that
                        began in a red-light district in the early 1980s has not changed. The camera
                        remains secondary. The neighborhood comes first.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        조문호의 경력은 피사체의 연속이 아니라 하나의 지속적인 실천이다: 뒤처진
                        사람들을 따라간다. 청량리 작업 이후 그는 강원도 산골 농민들로 향했다 — 도시
                        이주로 삶의 방식이 해체되어가던 공동체들을 전시와 사진집 『두메산골
                        사람들』로 기록했다. 인사동이 변해가는 과정에서 그곳의 인물들을 담아
                        『인사동 이야기』를 출간했다. 오일장이 사라져가는 시대에 전국의 장터꾼들을
                        기록했다.
                      </p>
                      <p>
                        이 작업들은 각각 지나가는 무언가의 기록이다. 그 사진들이 존재하는 것은
                        조문호가 — 관찰자가 아닌 거주자로서 — 지나가기 전에 그곳에 있었기 때문이다.
                        그 의미에서 그의 전 작업은 기관의 의뢰나 저널리즘의 과제가 아닌, 대부분의
                        사진가라면 살지 않을 곳에서 살겠다는 지속적 선택으로 구축된 20세기 후반 한국
                        삶의 아카이브다.
                      </p>
                      <p>
                        오늘 그는 서울 동자동 쪽방촌에 살며 여전히 찍고 있다. 1980년대 초 홍등가에서
                        시작된 방법은 변하지 않았다. 카메라는 여전히 두 번째다. 동네가 먼저다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium break-keep">
                  {isEnglish ? (
                    <>
                      From Cheongnyangni to Dongjadong, Jo Munho&apos;s practice has asked a single
                      question across five decades: what does it mean to photograph a person — not a
                      condition, not a place, not a social problem, but a person? His answer, built
                      through decades of living inside the lives of those he documents, is one of
                      the most sustained acts of human attention in Korean photography. He joins
                      this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that those who come after might work without the precarity he
                      has long understood from the inside.
                    </>
                  ) : (
                    <>
                      청량리에서 동자동까지, 조문호의 작업은 50년에 걸쳐 하나의 물음을 던져왔다:
                      사람을 찍는다는 것은 무엇인가 — 조건도, 장소도, 사회 문제도 아닌, 한 사람을.
                      기록하는 삶들 안에서 수십 년을 살아온 그 대답은 한국 사진에서 가장 지속적인
                      인간 주목의 실천 중 하나다. 씨앗페에는 이 캠페인의 대상이 아니라, 동료
                      예술인과의 연대자로 함께한다 — 다음 세대의 예술인들이 그가 안에서 오래
                      이해해온 불안정함 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Jo Munho</span>
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
                    Jo Munho joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    조문호 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JO_MUNHO_PATH}
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
