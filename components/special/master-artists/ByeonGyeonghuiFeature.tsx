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

// 큐레이션 작가 feature는 작가 페이지(/artworks/artist/변경희)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB history 부재 — bio가 유일 출처. 전시 연도·장소 날조 금지(2025 《●에서 점으로》 외 구체 연도 없음).
const BYEON_GYEONGHUI_PATH = `/artworks/artist/${encodeURIComponent('변경희')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isByeonGyeonghuiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '변경희' ||
    n === 'byeon gyeonghui' ||
    n === 'byeon gyeong-hui' ||
    n.replace(/[\s-]+/g, '') === 'byeongyeonghui'
  );
};

const PAGE_COPY = {
  ko: {
    title: '변경희 — 점(點)에서 점으로, 관계의 입체',
    description:
      '점(點)이라는 최소 단위를 입체적으로 쌓아 존재와 관계, 생명성과 시간을 탐구하는 중견 작가 변경희. 2025년 개인전 《●에서 점으로》를 포함해 열두 차례 개인전을 열었고, 무수한 점의 반복과 축적으로 명상적이고 구조적인 시각 언어를 구축해 왔습니다. 변경희의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '점이라는 최소 단위로 존재와 관계를 탐구하는 중견 작가 변경희. 무수한 점의 반복과 축적이 명상적이고 구조적인 입체로 쌓인다.',
    ogAlt: '변경희 대표 작품',
    twitterTitle: '변경희',
    twitterDescription: '점에서 점으로 — 최소 단위가 그리는 관계, 변경희',
    keywords: '변경희 작가, 점, 입체, 관계, 생명성, ●에서 점으로, 대한민국미술대전, 씨앗페 온라인',
  },
  en: {
    title: 'Byeon Gyeonghui — From Dot to Dot, the Volume of Relation',
    description:
      'Selected works by Byeon Gyeonghui, a mid-career artist who stacks the dot — the smallest unit — into volume to explore being and relation, vitality and time. Across twelve solo exhibitions, including the 2025 show 《From ● to Dot》, she has built a meditative, structural visual language through the repetition and accumulation of countless points. View and collect her works at SAF Online.',
    ogDescription:
      'Byeon Gyeonghui — a mid-career artist exploring being and relation through the dot as a minimal unit. Countless points repeat and accumulate into a meditative, structural volume.',
    ogAlt: 'Byeon Gyeonghui — featured work',
    twitterTitle: 'Byeon Gyeonghui',
    twitterDescription: 'From dot to dot — the relation a minimal unit draws, by Byeon Gyeonghui',
    keywords:
      'Byeon Gyeonghui artist, dot, point, volume, relation, vitality, From dot to dot, SAF Online',
  },
} as const;

export async function buildByeonGyeonghuiMetadata({
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
  const pageUrl = buildLocaleUrl(BYEON_GYEONGHUI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('변경희');
  const artwork = allArtworks.find((a) => isByeonGyeonghuiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Byeon Gyeonghui`
      : `${artwork.title} — 변경희`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(BYEON_GYEONGHUI_PATH, locale, true),
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

export default async function ByeonGyeonghuiFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(BYEON_GYEONGHUI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('변경희');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isByeonGyeonghuiArtist(artwork.artist)
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
    { name: isEnglish ? 'Byeon Gyeonghui' : '변경희', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${BYEON_GYEONGHUI_PATH}#person-byeon-gyeonghui`,
    name: isEnglish ? 'Byeon Gyeonghui' : '변경희',
    alternateName: isEnglish ? '변경희' : 'Byeon Gyeonghui',
    jobTitle: isEnglish ? 'Artist' : '작가',
    description: isEnglish
      ? 'Byeon Gyeonghui is a mid-career Korean artist who stacks the dot — the smallest unit — into volume to explore being and relation, vitality and time, across twelve solo exhibitions.'
      : '변경희는 점(點)이라는 최소 단위를 입체적으로 쌓아 존재와 관계, 생명성과 시간을 탐구해 온 중견 작가로, 열두 차례 개인전을 열었습니다.',
    knowsAbout: isEnglish
      ? ['Dot', 'Three-dimensional expression', 'Being and relation', 'Vitality']
      : ['점(點)', '입체 표현', '존재와 관계', '생명성'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Byeon Gyeonghui — SAF Online' : '변경희 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Byeon Gyeonghui from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 변경희 작품들을 소개합니다.',
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

          {/* Dot field — 점의 반복·축적 모티프 */}
          <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-white/15" />
          <div className="absolute top-24 left-24 w-1.5 h-1.5 rounded-full bg-primary/40" />
          <div className="absolute bottom-16 right-16 w-2 h-2 rounded-full bg-white/15" />
          <div className="absolute bottom-28 right-32 w-1 h-1 rounded-full bg-white/10" />
          <div className="absolute top-1/2 right-12 w-1.5 h-1.5 rounded-full bg-primary/30" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Byeon Gyeonghui · Mid-career' : '변경희 · 중견 작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A single dot,
                  <br />
                  <span className="text-primary-soft">stacked into relation</span>
                </>
              ) : (
                <>
                  하나의 점이
                  <br />
                  <span className="text-primary-soft">관계로 쌓인다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The dot — the smallest unit — repeats and accumulates.
                  </span>
                  <span className="mt-2 block">
                    Being and relation, vitality and time, built in volume.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">최소 단위인 점이 반복되고 축적된다.</span>
                  <span className="mt-2 block">
                    존재와 관계, 생명성과 시간이 입체로 쌓여 올라간다.
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
                    The smallest unit —<br />
                    <span className="text-primary-strong">a dot that becomes a world</span>
                  </>
                ) : (
                  <>
                    가장 작은 단위 —<br />
                    <span className="text-primary-strong">하나의 점이 세계가 되기까지</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Byeon Gyeonghui is a mid-career artist who has made the dot — the smallest
                      unit of mark-making — the foundation of her practice. Through a
                      three-dimensional treatment of the point, she explores the essence of being
                      and relation: how a single, almost negligible mark, once repeated and
                      accumulated, becomes structure, surface, and finally volume.
                    </p>
                    <p>
                      Across{' '}
                      <strong className="font-bold text-charcoal-deep">
                        twelve solo exhibitions
                      </strong>
                      , including the 2025 show{' '}
                      <strong className="font-bold text-charcoal">《From ● to Dot》</strong>, she
                      has pursued a single, patient question — what does a dot mean when there are
                      countless of them, and what relations form between one point and the next? Her
                      surfaces are built not by gesture but by accumulation, the way a living thing
                      grows cell by cell.
                    </p>
                    <p>
                      Her work has been recognized in numerous open competitions, including the
                      Grand Art Exhibition of Korea, and she has taken part in more than{' '}
                      <strong className="font-bold text-charcoal-deep">
                        forty group exhibitions and art projects
                      </strong>
                      . Her pieces are held by corporate and private collectors in Hong Kong and
                      Korea.
                    </p>
                    <p>
                      She is currently on leave from the Graduate School of Fine Arts at Hongik
                      University to devote herself fully to her practice — a choice that places the
                      work itself, rather than the institution around it, at the centre. Through the
                      dot as a minimal unit, she continues to construct a visual language of
                      vitality, time, and relation: meditative in its repetition, structural in its
                      logic.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      변경희는 점(點)이라는 가장 작은 표현 단위를 작업의 근간으로 삼아 온 중견
                      작가다. 점을 입체적으로 다루는 방식을 통해 그는 존재와 관계의 본질을 탐구한다
                      — 거의 무시해도 좋을 만큼 작은 하나의 흔적이, 반복되고 축적되었을 때 어떻게
                      구조가 되고, 면이 되고, 마침내 입체가 되는가.
                    </p>
                    <p>
                      2025년 개인전{' '}
                      <strong className="font-bold text-charcoal">《●에서 점으로》</strong>를 포함해{' '}
                      <strong className="font-bold text-charcoal-deep">열두 차례의 개인전</strong>을
                      거치며, 그는 하나의 끈질긴 물음을 추구해 왔다 — 점이 무수히 많을 때 점은
                      무엇을 의미하는가, 그리고 한 점과 다음 점 사이에는 어떤 관계가 맺어지는가.
                      그의 화면은 제스처가 아니라 축적으로 지어진다. 마치 살아 있는 것이 세포 하나씩
                      자라나듯이.
                    </p>
                    <p>
                      그의 작업은 대한민국미술대전을 비롯한 다수의 공모전에서 수상하며 인정받았고,{' '}
                      <strong className="font-bold text-charcoal-deep">
                        40회 이상의 단체전·예술 프로젝트
                      </strong>
                      에 참여해 왔다. 작품은 홍콩과 국내의 기업 및 개인 컬렉터가 소장하고 있다.
                    </p>
                    <p>
                      현재 그는 홍익대학교 미술대학원을 휴학하고 작업에 전념하고 있다 — 제도가
                      아니라 작업 그 자체를 중심에 두는 선택이다. 점이라는 최소 단위를 통해, 그는
                      생명성과 시간, 관계에 대한 시각적 언어를 계속해서 구축한다. 반복에서는
                      명상적이고, 논리에서는 구조적인 언어다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rounded-full" />
                  {isEnglish ? 'Major themes' : '주요 테마'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The dot as minimal unit' : '최소 단위로서의 점'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The smallest mark becomes the building block. Repetition and accumulation turn the negligible into structure, surface, and volume.'
                          : '가장 작은 흔적이 구성 단위가 된다. 반복과 축적이 사소한 것을 구조와 면, 입체로 전환한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Being and relation' : '존재와 관계'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'No dot stands alone. The work asks what bonds form between one point and the next — relation rendered as a visual essence.'
                          : '어떤 점도 홀로 서지 않는다. 한 점과 다음 점 사이에 맺어지는 관계를 묻는다 — 관계를 시각적 본질로 형상화한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Vitality and time' : '생명성과 시간'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Built point by point, like a living thing growing cell by cell — a meditative, structural language of vitality and accumulated time.'
                          : '살아 있는 것이 세포 하나씩 자라듯 점 하나씩 지어진다 — 명상적이고 구조적인, 생명성과 축적된 시간의 언어.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rounded-full" />
                  {isEnglish ? 'Practice & recognition' : '활동과 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[7px] w-2 h-2 bg-charcoal rounded-full" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Twelve solo exhibitions, including the 2025 show 《From ● to Dot》'
                        : '개인전 12회 — 2025년 《●에서 점으로》 포함'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[7px] w-2 h-2 bg-primary rounded-full" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awarded in numerous open competitions, including the Grand Art Exhibition of Korea'
                        : '대한민국미술대전을 비롯한 다수 공모전 수상'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[7px] w-2 h-2 bg-charcoal rounded-full" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participated in more than forty group exhibitions and art projects'
                        : '단체전·예술 프로젝트 40회 이상 참여'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[7px] w-2 h-2 bg-primary rounded-full" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works held by corporate and private collectors in Hong Kong and Korea'
                        : '홍콩 및 국내 기업·개인 컬렉터 소장'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[7px] w-2 h-2 bg-charcoal rounded-full" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Currently on leave from the Graduate School of Fine Arts, Hongik University, to focus on her practice'
                        : '현재 홍익대학교 미술대학원 휴학, 작업에 전념'}
                    </span>
                  </li>
                </ul>
                <p className="mt-6 pt-4 border-t border-charcoal/15 text-charcoal-soft text-sm leading-relaxed break-keep">
                  {isEnglish
                    ? 'Specific years and venues beyond the 2025 exhibition are not listed here to avoid unverified detail.'
                    : '2025년 전시 외의 구체적인 연도·장소는 확인되지 않아 임의로 기재하지 않았습니다.'}
                </p>
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
                  <span className="text-charcoal-deep">on the dot and what it builds</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">점과 그것이 쌓아 올리는 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 최소 단위라는 선택 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Why the smallest unit — the choice of the dot'
                    : '왜 최소 단위인가 — 점이라는 선택'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Every visual language has to begin somewhere. Byeon Gyeonghui begins at the
                        very floor of mark-making: the dot, the single point that precedes the line,
                        the plane, the form. It is the most modest decision a painter can make and,
                        for that reason, the most demanding. A line carries direction; a plane
                        carries mass. A dot, on its own, carries almost nothing.
                      </p>
                      <p>
                        That near-nothingness is precisely the ground she works from. By refusing
                        the shortcuts of gesture and composition, she forces every meaning in the
                        work to arise from one source — the accumulation of points. The dot is not a
                        motif laid on top of a picture; it is the unit from which the picture is
                        assembled, the way a wall is assembled from bricks or a body from cells.
                      </p>
                      <p>
                        Choosing the minimal unit is also a choice about time. A single point is
                        instantaneous; a field of countless points is the record of countless
                        instants. To work this way is to make patience visible — to let duration
                        itself become the material of the image.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        모든 시각 언어는 어딘가에서 시작해야 한다. 변경희는 표현의 가장 밑바닥에서
                        시작한다 — 선과 면과 형태에 앞서는 단 하나의 점. 그것은 화가가 내릴 수 있는
                        가장 소박한 결정이고, 바로 그 때문에 가장 까다로운 결정이다. 선은 방향을
                        품고, 면은 질량을 품는다. 점은, 홀로 있을 때, 거의 아무것도 품지 않는다.
                      </p>
                      <p>
                        그 거의-무(無)에 가까운 상태가 바로 그의 작업이 딛고 선 바탕이다. 제스처와
                        구성의 지름길을 거부함으로써, 그는 작업 안의 모든 의미가 단 하나의 출처 —
                        점의 축적 — 에서 솟아나도록 만든다. 점은 그림 위에 얹힌 모티프가 아니라,
                        그림이 조립되는 단위다. 벽이 벽돌로, 몸이 세포로 지어지듯이.
                      </p>
                      <p>
                        최소 단위를 택한다는 것은 시간에 대한 선택이기도 하다. 하나의 점은 순간이고,
                        무수한 점의 장(場)은 무수한 순간의 기록이다. 이렇게 작업한다는 것은 인내를
                        눈에 보이게 만드는 일이다 — 지속 그 자체가 이미지의 재료가 되게 하는 일.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 점에서 입체로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'From dot to volume — accumulation as form'
                    : '점에서 입체로 — 형식이 된 축적'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        What distinguishes her practice is that the dot does not stay flat. Through
                        a three-dimensional treatment, points are not merely placed on a surface but
                        built up off it, so that accumulation reads as relief, weight, and volume.
                        The picture stops being a window and becomes a body — something that
                        occupies space rather than merely depicting it.
                      </p>
                      <p>
                        This is where her central concern, relation, becomes formally visible. A
                        single raised point next to another is no longer an isolated mark; the two
                        enter into a relationship of distance, density, and rhythm. Multiply that by
                        the thousands, and a structure of relations emerges — neither random nor
                        rigidly geometric, but organic, the way the cells of a living thing are
                        organized without a blueprint.
                      </p>
                      <p>
                        The 2025 exhibition title, 《From ● to Dot》, names this movement exactly.
                        The filled circle ● — a dot made dense, made present, made volume — gives
                        way to the dot as such: the journey from a single concentrated point outward
                        into a field of relations. The title is less a slogan than a description of
                        the method itself.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 작업을 구별 짓는 지점은, 점이 평면에 머물지 않는다는 데 있다. 입체적인
                        다룸을 통해 점은 단지 표면 위에 놓이는 것이 아니라 표면으로부터 쌓여
                        올라간다. 그래서 축적이 부조(浮彫)로, 무게로, 입체로 읽힌다. 그림은 더 이상
                        창(窓)이 아니라 하나의 몸이 된다 — 무언가를 묘사하는 데 그치지 않고 공간을
                        차지하는 몸이.
                      </p>
                      <p>
                        바로 여기서 그의 핵심 관심사인 관계가 형식적으로 가시화된다. 솟아오른 하나의
                        점은 다른 점 곁에서 더 이상 고립된 흔적이 아니다. 두 점은 거리와 밀도와
                        리듬의 관계로 들어선다. 그것을 수천 배로 곱하면, 관계의 구조가 떠오른다 —
                        무작위도 아니고 경직된 기하학도 아닌, 유기적인 구조. 살아 있는 것의 세포들이
                        설계도 없이 조직되는 방식처럼.
                      </p>
                      <p>
                        2025년 전시 제목 《●에서 점으로》는 이 운동을 정확히 명명한다. 채워진 원 ● —
                        조밀해지고, 현존하게 되고, 입체가 된 점 — 이 다시 점 그 자체로 풀려난다.
                        하나의 응축된 점에서 바깥의 관계의 장으로 나아가는 여정. 이 제목은
                        구호라기보다 방법론 자체에 대한 서술이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 명상과 구조 사이 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Between meditation and structure' : '명상과 구조 사이에서'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        To place point after point, by the thousand, is a discipline as much as a
                        technique. There is a meditative dimension to the labour — the steadiness it
                        demands, the way the hand and the attention have to settle into a single
                        repeated act over long stretches of time. The work carries the trace of that
                        quiet duration.
                      </p>
                      <p>
                        Yet the result is not formless reverie. The accumulation resolves into
                        structure: fields that hold together, rhythms that organize the surface,
                        volumes that have logic. This is the productive tension at the heart of her
                        practice — between the meditative patience of the making and the structural
                        clarity of the made. Vitality and order are not opposites here but two faces
                        of the same accumulation.
                      </p>
                      <p>
                        That she is currently on leave from graduate study to give herself fully to
                        the work is consistent with everything the work itself argues: that what
                        matters is the patient accumulation, point by point, of a practice. She
                        joins this campaign not as a recipient of its cause but as a fellow artist
                        in solidarity — so that other artists, navigating financial exclusion today,
                        might keep the time and space their own accumulation requires.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        점을 하나하나, 수천 개씩 놓는다는 것은 기법인 동시에 수련이다. 그 노동에는
                        명상적 차원이 있다 — 그것이 요구하는 한결같음, 손과 주의가 긴 시간에 걸쳐 단
                        하나의 반복된 행위에 가라앉아야 하는 방식. 작업은 그 고요한 지속의 흔적을
                        품는다.
                      </p>
                      <p>
                        그러나 그 결과는 형태 없는 몽상이 아니다. 축적은 구조로 수렴한다 — 단단히
                        붙들리는 면, 표면을 조직하는 리듬, 논리를 갖춘 입체. 이것이 그의 작업
                        한가운데 놓인 생산적 긴장이다. 만드는 과정의 명상적 인내와, 만들어진 것의
                        구조적 명료함 사이의 긴장. 여기서 생명성과 질서는 대립항이 아니라 같은
                        축적의 두 얼굴이다.
                      </p>
                      <p>
                        지금 그가 대학원을 휴학하고 작업에 온전히 자신을 내어 주고 있다는 사실은,
                        작업 자체가 주장하는 모든 것과 일치한다 — 중요한 것은 점 하나하나의,
                        인내하는 축적이라는 것. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                        예술인과의 연대자로서 함께한다 — 오늘 금융 차별을 헤쳐 가는 다른 예술인들이
                        자신의 축적에 필요한 시간과 공간을 지킬 수 있도록.
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
                      From a single point to a field of relations, Byeon Gyeonghui&apos;s work
                      pursues one quiet question: how does the smallest unit, repeated and stacked,
                      become a world? The answer she builds — point by point, into volume — is a
                      meditation that has the rigour of a structure. She stands here in solidarity,
                      so that the next artist might be given the time their own accumulation needs.
                    </>
                  ) : (
                    <>
                      하나의 점에서 관계의 장으로, 변경희의 작업은 하나의 고요한 물음을 추구한다:
                      가장 작은 단위가 반복되고 쌓여 어떻게 하나의 세계가 되는가. 점 하나씩 입체로
                      지어 올린 그의 대답은, 구조의 엄밀함을 갖춘 명상이다. 그는 다음 예술인이
                      자신의 축적에 필요한 시간을 누릴 수 있도록, 이 자리에 연대자로 선다.
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
                Byeon Gyeonghui
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
                <span className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-xs text-white/60 uppercase tracking-widest font-medium">
                  {isEnglish ? 'Artist mutual-aid' : '예술인 상호부조'}
                </span>
              </div>
              <p className="text-base md:text-lg text-white/90 leading-relaxed break-keep font-medium">
                {isEnglish ? (
                  <>
                    Byeon Gyeonghui joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    변경희 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={BYEON_GYEONGHUI_PATH}
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
