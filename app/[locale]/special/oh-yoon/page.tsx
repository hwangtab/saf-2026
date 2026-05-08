import type { Metadata } from 'next';
import SafeImage from '@/components/common/SafeImage';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import OhYoonMasonryGallery from '@/components/special/OhYoonMasonryGallery';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import PaperGrain from '@/components/common/PaperGrain';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import {
  createBreadcrumbSchema,
  generateArtworkListSchema,
  generateGalleryAggregateOffer,
} from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { resolveLocale } from '@/lib/server-locale';
import { resolveSeoArtworkImageUrl } from '@/lib/schemas/utils';
import type { Artwork, ArtworkListItem } from '@/types';

export const dynamic = 'force-static';
export const revalidate = 600;

const OH_YOON_ARTIST_KEYS = new Set(['오윤', 'oh yoon', 'ohyoon', 'o yoon', 'o-yoon']);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isOhYoonArtist = (artist: string): boolean => {
  if (!artist) return false;

  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);

  return OH_YOON_ARTIST_KEYS.has(normalized) || compact === '오윤' || compact === 'ohyoon';
};

const PAGE_COPY = {
  ko: {
    title: '오윤 40주기 특별전: Oh Yoon 40th Anniversary Special Exhibition',
    description:
      '민중미술의 거장 오윤(1946–1986) 40주기 특별전. 목판화에 시대의 아픔과 민중의 생명력을 새긴 오윤의 대표작을 씨앗페 온라인에서 감상하고 소장하세요. 현실, 한(恨), 함께하는 미술이라는 세 가지 테마로 오윤의 예술 세계와 민중미술의 역사를 조명하는 온라인 전시입니다.',
    ogDescription:
      '민중미술의 거장 오윤 40주기 특별전. 목판화로 시대를 기록한 오윤의 대표작을 씨앗페 온라인에서 만나보세요.',
    ogAlt: '오윤 40주기 특별전 대표 이미지',
    twitterTitle: '오윤 40주기 특별전',
    twitterDescription: '민중미술의 거장 오윤의 작품 세계를 만나는 온라인 특별전',
  },
  en: {
    title: 'Oh Yoon 40th Anniversary Special Exhibition',
    description:
      "A special online exhibition marking the 40th anniversary of Oh Yoon (1946–1986), a pivotal figure in Korean people's art (minjung misul). Explore his bold woodblock prints that carved the pain and resilience of ordinary people into art. View and collect selected works at SAF Online.",
    ogDescription:
      "Oh Yoon 40th Anniversary Special Exhibition. Explore the bold woodblock prints of a pivotal figure in Korean people's art at SAF Online.",
    ogAlt: 'Oh Yoon 40th Anniversary Special Exhibition key visual',
    twitterTitle: 'Oh Yoon 40th Anniversary Special Exhibition',
    twitterDescription:
      'Discover selected works by Oh Yoon in this SAF Online special online exhibition.',
  },
} as const;

export async function generateMetadata({
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
  const pageUrl = buildLocaleUrl('/special/oh-yoon', locale);

  // 오윤 실제 작품 이미지로 OG 이미지 설정 — 소셜 공유 CTR 향상
  const allArtworks = await getSupabaseArtworks();
  const ohYoonArtwork = allArtworks.find((a) => isOhYoonArtist(a.artist) && a.images[0]);
  const ogImageUrl = ohYoonArtwork?.images[0]
    ? resolveSeoArtworkImageUrl(ohYoonArtwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = ohYoonArtwork
    ? locale === 'en'
      ? `${ohYoonArtwork.title_en || ohYoonArtwork.title} — Oh Yoon 40th Anniversary Special Exhibition`
      : `${ohYoonArtwork.title} — 오윤 40주기 특별전`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? "Oh Yoon artist, Korean people's art, minjung misul, woodblock prints, Oh Yoon exhibition, 40th anniversary"
        : '오윤 화가, 민중미술, 오윤 판화, 오윤 40주기, 오윤 특별전, 한국 목판화, 온라인 전시회, 특별 전시회',
    alternates: createLocaleAlternates('/special/oh-yoon', locale),
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: copy.title,
      description: copy.ogDescription,
      locale: locale === 'en' ? 'en_US' : 'ko_KR',
      siteName,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.twitterTitle,
      description: copy.twitterDescription,
      images: [{ url: ogImageUrl, alt: ogImageAlt }],
    },
  };
}

export default async function OhYoonPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl('/special/oh-yoon', locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });
  const allArtworks = await getSupabaseArtworks();
  const ohYoonFullArtworks = allArtworks.filter((artwork: Artwork) =>
    isOhYoonArtist(artwork.artist)
  );
  const OH_YOON_ARTWORKS: ArtworkListItem[] = ohYoonFullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    OH_YOON_ARTWORKS.length
  );
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('ohYoon'), url: pageUrl },
  ]);

  const ohYoonPerson = {
    '@type': 'Person',
    name: '오윤',
    alternateName: 'Oh Yoon',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? "Oh Yoon (1946–1986) was a pivotal figure in Korean people's art (minjung misul), known for bold woodblock prints depicting the lives of workers and farmers."
      : '오윤(1946–1986)은 민중미술의 대표 작가로, 노동자·농민의 삶을 담은 역동적인 판화로 한국 현대미술에 큰 족적을 남겼습니다.',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    sameAs: ['https://www.wikidata.org/wiki/Q18399737'],
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Oh Yoon 40th Anniversary Special Exhibition' : '오윤 40주기 특별전',
    description: isEnglish
      ? "A special online exhibition honoring the 40th anniversary of Oh Yoon's passing, presenting his selected works from the SAF Online collection."
      : '민중미술의 거장 오윤 화백의 40주기를 기념하는 온라인 특별전. 씨앗페 온라인에 소장된 오윤 작품들을 선보입니다.',
    url: pageUrl,
    // EventCompleted/EventInProgress는 schema.org EventStatusType enum에 없는 값.
    // 본 전시(event.ts)와 동일하게 EventMovedOnline 적용 — 오프라인 종료 후 온라인 지속.
    eventStatus: 'https://schema.org/EventMovedOnline',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: pageUrl,
    },
    startDate: '2026-01-14',
    endDate: '2026-01-26',
    organizer: {
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: isEnglish ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
      url: SITE_URL,
    },
    about: ohYoonPerson,
    isAccessibleForFree: true,
  };

  const itemListSchema = generateArtworkListSchema(
    ohYoonFullArtworks,
    locale,
    ohYoonFullArtworks.length,
    pageUrl
  );
  const aggregateOfferSchema = generateGalleryAggregateOffer(ohYoonFullArtworks, locale, pageUrl);

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
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block relative mb-8 animate-stamp [animation-fill-mode:both]">
              <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
                {isEnglish ? 'Oh Yoon 40th Anniversary' : '오윤 40주기 특별전'}
              </span>
              <div className="absolute inset-0 border-4 border-primary transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black animate-fade-in-up opacity-0 [animation-fill-mode:both] [animation-delay:200ms]">
              {isEnglish ? (
                <>
                  The Blade of the People,
                  <br />
                  Returning After 40 Years
                </>
              ) : (
                <>
                  40년 만에 돌아온
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-primary">민중의 칼날</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                  , 다시
                  <br />
                  신명을 깨우다
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed border-t-2 border-b-2 border-white/20 py-5 md:py-6 animate-fade-in-up opacity-0 [animation-fill-mode:both] [animation-delay:400ms]">
              {isEnglish ? (
                <>
                  A short yet powerful life. The spirit of an era, carved in print.
                  <br />
                  Oh Yoon&apos;s work speaks to us once again, today.
                </>
              ) : (
                <>
                  짧지만 강렬했던 삶, 판화로 새긴 시대의 정신.
                  <br />
                  오윤의 예술혼이 오늘 우리에게 다시 말을 겁니다.
                </>
              )}
            </p>
          </div>

          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 border-l-[12px] border-t-[12px] border-white/15" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-r-[12px] border-b-[12px] border-white/15" />
          <div className="absolute top-1/2 left-4 w-4 h-4 rounded-full bg-primary opacity-40" />
          <div className="absolute top-1/3 right-8 w-6 h-6 rounded-full bg-white opacity-10" />
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Quote Section */}
          <div className="mb-24 flex justify-center">
            <blockquote className="relative p-8 sm:p-10 md:p-16 text-center max-w-4xl border-4 border-charcoal bg-white shadow-[8px_8px_0px_0px_rgba(49,57,60,0.1)]">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-primary flex items-center justify-center rounded-full text-white font-display font-black text-3xl">
                &ldquo;
              </div>
              <p className="text-2xl sm:text-3xl md:text-5xl text-charcoal leading-relaxed text-balance pt-4 font-display font-black">
                {isEnglish ? (
                  <>Art should be shared by many.</>
                ) : (
                  <>
                    미술은 많은 사람이
                    <br className="md:hidden" /> 나누어야 한다
                  </>
                )}
              </p>
              <footer className="mt-8 flex items-center justify-center gap-2">
                <span className="h-px w-8 bg-charcoal/40"></span>
                <span className="text-xl text-charcoal font-bold tracking-widest">
                  {isEnglish ? 'Oh Yoon' : '오윤'}
                </span>
                <span className="h-px w-8 bg-charcoal/40"></span>
              </footer>
            </blockquote>
          </div>

          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-[280px_1fr_1fr] gap-8 lg:gap-16 mb-32 items-start">
            {/* Portrait */}
            <div className="flex flex-col items-center lg:items-start lg:sticky lg:top-24">
              <figure className="relative w-full max-w-[260px] lg:max-w-none">
                <div className="border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(49,57,60,0.15)] overflow-hidden">
                  <SafeImage
                    src="/images/ohyoon.webp"
                    alt={isEnglish ? 'Oh Yoon (1946–1986)' : '오윤 작가 (1946–1986)'}
                    width={400}
                    height={533}
                    className="w-full object-cover grayscale"
                    priority
                  />
                </div>
                <figcaption className="mt-3 text-xs text-charcoal-soft font-medium tracking-widest uppercase text-center">
                  {isEnglish ? 'Oh Yoon, 1946–1986' : '오윤, 1946–1986'}
                </figcaption>
              </figure>
            </div>

            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    Carving the pain of an era
                    <br />
                    <span className="text-primary-strong">into hope</span>
                  </>
                ) : (
                  <>
                    시대의 아픔을
                    <br />
                    <span className="text-primary-strong">희망으로 새기다</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Oh Yoon (1946–1986) was born the eldest son of the novelist Oh Young-su, but
                      he chose to record his time not in literary language, but with the{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        edge of a blade
                      </strong>
                      . While elite abstraction held the academy, he turned toward the lowest
                      ground, believing that &ldquo;art must be a blade that cuts away the rot of
                      reality.&rdquo;
                    </p>
                    <p>
                      The <strong className="font-bold text-charcoal">woodcut print</strong> he
                      chose was more than a form. Each cut was a resolve that could not be undone,
                      and each impression was a vessel democratic enough to be shared by the
                      thousands — pasted on factory walls, on campuses, in the markets. Pressed not
                      by machine but by a spoon rubbed against paper, his hand bears witness, with
                      the most honest grain, to his belief that &ldquo;art should be shared by
                      many.&rdquo;
                    </p>
                    <p>
                      The hardy laughter of Busan&apos;s Gamagol, the sweat of Guro Industrial
                      Complex workers, and the life force of ordinary people who turned suppressed
                      grief (han) into the dance of shinmyeong — Oh Yoon&apos;s knife traced all of
                      this into wood, rough yet honest. In July 1986, not long after his very first
                      solo show, he passed away. He was forty. The roughly one hundred bold prints
                      he left behind still touch the most aching parts of our time, forty years
                      later, and still speak to us of a life lived together.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      오윤(1946-1986). 소설가 오영수의 아들로 태어났으나, 그는 문학적 언어 대신{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        칼끝
                      </strong>
                      으로 시대를 기록했습니다. 화려한 추상미술이 강단을 지배하던 시절, 그는
                      &quot;미술은 썩어가는 현실을 도려내는 칼이어야 한다&quot;고 믿으며 가장 낮은
                      곳으로 향했습니다.
                    </p>
                    <p>
                      그가 선택한 <strong className="font-bold text-charcoal">목판화</strong>는
                      단순한 예술 형식이 아니었습니다. 그것은 한 번 칼을 대면 되돌릴 수 없는
                      결기였으며, 수만 장을 찍어내어 공장 담벼락과 대학가, 시장통의 사람들과 나눌 수
                      있는 가장 민주적인 그릇이었습니다. 프레스기조차 없이 숟가락으로 종이를 문질러
                      전사한 그 손길은, &apos;미술은 많은 사람이 나누어야 한다&apos;는 그의 신념을
                      가장 정직하게 보여줍니다.
                    </p>
                    <p>
                      부산 가마골의 억센 웃음, 구로공단 노동자의 땀방울, 그리고 짓눌린 한(恨)을
                      신명(神明)나는 춤사위로 풀어내는 민중의 생명력. 오윤의 칼자국은 투박하지만
                      정직하게 이 모든 것을 나무에 새겼습니다. 1986년 7월, 그는 자신의 이름을 단 첫
                      개인전을 연 지 얼마 되지 않아 세상을 떠나셨습니다. 향년 마흔. 짧은 생애 동안
                      그가 남긴 100여 점의 선 굵은 판화들은, 40년이 지난 지금도 우리 시대의 가장
                      아픈 곳을 어루만지며 &apos;함께 사는 삶&apos;을 이야기하고 있습니다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]">
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
                        {isEnglish ? 'Reality' : '현실 (Reality)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'He recorded, without embellishment, concrete sites of life and the people who live within them.'
                          : '구체적인 삶의 현장과 그 속에서 살아가는 사람들의 모습을 가감 없이 기록했습니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Han' : '한 (Han)'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'He transformed the han knotted in the hearts of ordinary people into artistic vitality, expressing a life force that surpasses sorrow.'
                          : '민중의 가슴 속에 맺힌 한을 예술적 승화로 풀어내어, 슬픔을 넘어선 생명력을 표현했습니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Art shared together' : '함께하는 미술'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Beyond the museum, on streets and at sites, he met people directly and practiced art for its social worth.'
                          : '미술관을 넘어, 거리와 현장에서 사람들과 직접 소통하며 예술의 사회적 가치를 실천했습니다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가의 시간 — 연표 카드 (3열 비대칭 보강) */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1946
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Busan, eldest son of the novelist Oh Young-su.'
                        : '부산 출생. 소설가 오영수의 장남.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1969
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Co-founds the Hyeonsil Dong-in collective, calling for a Korean realist art movement.'
                        : '「현실 동인」 결성, 한국 리얼리즘 미술 운동 제창.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1974
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "At age 28, creates terracotta reliefs at Sangup Bank's Dongdaemun and Guui-dong branches."
                        : '28세에 상업은행 동대문·구의동지점 테라코타 부조 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1979
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Founding member of Hyeonsil-gwa Baleon (Reality and Utterance), the heart of the minjung art movement.'
                        : '「현실과 발언」 동인 창립 회원으로 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Passes away shortly after his very first solo exhibition. Aged forty.'
                        : '첫 개인전 직후 별세. 향년 마흔.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-12">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "MMCA retrospective: Oh Yoon — A Daytime Goblin's Festival."
                        : '국립현대미술관 회고전 「오윤: 낮도깨비 신명마당」.'}
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section - The 40th Archive Theme */}
        <div className="relative py-20 bg-charcoal text-white">
          {/* Section Header */}
          <div className="max-w-[1440px] mx-auto px-4 mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/20 pb-8">
            <div className="relative">
              <h2 className="text-4xl md:text-5xl mb-4 text-white font-black font-display text-balance">
                {isEnglish ? 'Exhibition Works' : '전시 작품'}
              </h2>
              <div className="absolute -left-4 -top-6 text-[80px] text-white/5 -z-10 font-display font-black select-none">
                ARCHIVE
              </div>
              <p className="text-base sm:text-lg text-white/70 font-medium">
                {isEnglish ? (
                  <>
                    <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>{' '}
                    prints are currently on view.
                  </>
                ) : (
                  <>
                    총 <span className="text-primary font-bold text-xl">{artworkCountLabel}</span>
                    점의 판화가 전시되어 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/40 uppercase tracking-widest">
                Oh Yoon 40th Anniversary
              </span>
              <span className="text-sm text-white/60">
                {isEnglish
                  ? 'Click a work to view its details'
                  : '작품을 클릭하여 상세 정보를 확인하세요'}
              </span>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="max-w-[1440px] mx-auto px-4">
            {OH_YOON_ARTWORKS.length > 0 ? (
              <OhYoonMasonryGallery artworks={OH_YOON_ARTWORKS} />
            ) : (
              <section className="py-24 text-center">
                <div className="inline-block rounded-xl border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
                  <h3 className="text-2xl font-bold text-white text-balance mb-4">
                    {isEnglish ? 'Artwork data is being prepared' : '작품 데이터 준비 중입니다'}
                  </h3>
                  <p className="text-white/60 text-balance mb-8">
                    {isEnglish ? (
                      <>
                        We are currently organizing the works for the Oh Yoon special exhibition.
                        <br />
                        In the meantime, you are warmly invited to browse the rest of the
                        collection.
                      </>
                    ) : (
                      <>
                        현재 오윤 특별전 작품 정보를 정리하고 있습니다.
                        <br />
                        전체 출품작 목록에서 다른 작품들을 먼저 감상하실 수 있습니다.
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
