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

// 거장 작가 feature는 작가 페이지(/artworks/artist/서금앵)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SEO_GEUMJAENG_PATH = `/artworks/artist/${encodeURIComponent('서금앵')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSeoGeumjaengArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '서금앵' ||
    n === 'seo geumjaeng' ||
    n === 'seo geum-aeng' ||
    n === 'suh geumjaeng' ||
    n.replace(/[\s-]+/g, '') === 'seogeumjaeng' ||
    n.replace(/[\s-]+/g, '') === 'suhgeumjaeng'
  );
};

const PAGE_COPY = {
  ko: {
    title: '서금앵 — 공간의 기운, 일상에 머무는 기억',
    description:
      '회화 작가 서금앵. 〈공간의 기운〉·〈기억의 밀도〉 연작에서 방과 일상 공간에 깃든 기운과 기억의 결, 흔적의 밀도를 차분하고 명상적인 톤으로 그린다. 서금앵의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '서금앵 — 일상 공간에 깃든 기운과 기억의 결을 그리는 회화 작가. 방, 흔적, 기억의 밀도에 관한 차분한 시선.',
    ogAlt: '서금앵 대표 작품',
    twitterTitle: '서금앵',
    twitterDescription: '공간의 기운 — 일상에 머무는 기억을 그리는 회화 작가 서금앵',
    keywords: '서금앵 작가, 회화, 공간의 기운, 기억의 밀도, 일상 공간, 현대 미술, 씨앗페 온라인',
  },
  en: {
    title: 'Seo Geumjaeng — The Air of a Space, Memory That Lingers in the Everyday',
    description:
      'Selected works by Seo Geumjaeng, a painter. In her 〈The Air of a Space〉 and 〈The Density of Memory〉 series, she renders the air and grain of memory settled into rooms and everyday spaces — the density of traces — in a quiet, meditative register. View and collect her works at SAF Online.',
    ogDescription:
      'Seo Geumjaeng — a painter of the air and grain of memory that settles into everyday space. A quiet gaze on rooms, traces, and the density of memory.',
    ogAlt: 'Seo Geumjaeng — featured work',
    twitterTitle: 'Seo Geumjaeng',
    twitterDescription: 'The air of a space — painter Seo Geumjaeng, of memory that lingers',
    keywords:
      'Seo Geumjaeng artist, painting, the air of a space, density of memory, everyday space, contemporary Korean art',
  },
} as const;

export async function buildSeoGeumjaengMetadata({
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
  const pageUrl = buildLocaleUrl(SEO_GEUMJAENG_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('서금앵');
  const artwork = allArtworks.find((a) => isSeoGeumjaengArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Seo Geumjaeng`
      : `${artwork.title} — 서금앵`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SEO_GEUMJAENG_PATH, locale, true),
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

export default async function SeoGeumjaengFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SEO_GEUMJAENG_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('서금앵');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isSeoGeumjaengArtist(artwork.artist)
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
    { name: isEnglish ? 'Seo Geumjaeng' : '서금앵', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SEO_GEUMJAENG_PATH}#person-seo-geumjaeng`,
    name: isEnglish ? 'Seo Geumjaeng' : '서금앵',
    alternateName: isEnglish ? '서금앵' : 'Seo Geumjaeng',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Seo Geumjaeng is a mid-career painter who renders the air and the grain of memory settled into rooms and everyday spaces — the density of traces — in a quiet, meditative register.'
      : '서금앵은 방과 일상 공간에 깃든 기운과 기억의 결, 흔적의 밀도를 차분하고 명상적인 톤으로 그리는 중견 회화 작가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Sookmyung Women’s University, Dept. of Painting' : '숙명여자대학교 회화과',
    },
    knowsAbout: ['Painting', 'Everyday space', 'Memory and trace', 'Contemporary Korean art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Seo Geumjaeng — SAF Online' : '서금앵 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Seo Geumjaeng from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 서금앵 작품들을 소개합니다.',
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

          {/* Quiet room — 방·공간의 결 모티프 (차분·명상적 톤) */}
          <div className="absolute top-0 left-12 h-full w-px bg-white/10" />
          <div className="absolute top-1/4 left-0 w-full h-px bg-white/5" />
          <div className="absolute bottom-12 right-16 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Seo Geumjaeng · painting' : '서금앵 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Memory settles
                  <br />
                  <span className="text-primary-soft">into the air of a space</span>
                </>
              ) : (
                <>
                  기억은 공간의 기운으로
                  <br />
                  <span className="text-primary-soft">우리 곁에 머문다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">A quiet attention to the ordinary room.</span>
                  <span className="mt-2 block">
                    The grain of memory and the density of traces, settled into everyday space.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">평범한 방을 향한 조용한 시선.</span>
                  <span className="mt-2 block">일상 공간에 내려앉은 기억의 결과 흔적의 밀도.</span>
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
                    The air of a space —<br />
                    <span className="text-primary-strong">memory that lingers in the everyday</span>
                  </>
                ) : (
                  <>
                    공간의 기운 —<br />
                    <span className="text-primary-strong">일상에 머무는 기억</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Seo Geumjaeng is a mid-career painter who works in a quiet, meditative
                      register. She graduated from the Department of Painting at Sookmyung Women’s
                      University and went on to complete a master’s degree in formative arts at the
                      same university’s graduate school — a foundation in painting that her practice
                      has continued to refine over the years.
                    </p>
                    <p>
                      Her subject is the{' '}
                      <strong className="font-bold text-charcoal-deep">everyday space</strong> — the
                      room, and the air that gathers within it. Across series such as 〈The Air of a
                      Space〉 and 〈The Density of Memory〉, she attends to the grain of memory and
                      the density of traces that settle, almost imperceptibly, into the places we
                      inhabit.
                    </p>
                    <p>
                      Where much contemporary painting reaches for the dramatic, Seo turns toward
                      the <strong className="font-bold text-charcoal">ordinary day</strong> and
                      finds, in its quietness, a paradox worth painting. Her early exhibition
                      〈Rooms〉 already named the concern that has stayed with her: a room is not
                      merely a container but a vessel for time, holding the residue of those who
                      have passed through it.
                    </p>
                    <p>
                      The result is a body of work that asks the viewer to slow down. Nothing is
                      raised to a shout; instead, the air of a space and the memory it carries are
                      rendered with patience, so that the trace itself — faint, layered, lingering —
                      becomes the subject of the canvas.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      서금앵은 차분하고 명상적인 톤으로 작업하는 중견 회화 작가다. 숙명여자대학교
                      회화과를 졸업하고, 같은 대학원 조형예술학과에서 석사 학위를 마쳤다 — 회화에
                      뿌리를 둔 토대 위에서 그는 오랜 시간 자신의 작업을 다듬어 왔다.
                    </p>
                    <p>
                      그의 주제는{' '}
                      <strong className="font-bold text-charcoal-deep">일상의 공간</strong>이다 —
                      방, 그리고 그 안에 고이는 기운. 〈공간의 기운〉·〈기억의 밀도〉 같은 연작에서
                      그는 우리가 머무는 자리에 거의 알아채기 어렵게 내려앉는 기억의 결과 흔적의
                      밀도에 주의를 기울인다.
                    </p>
                    <p>
                      많은 동시대 회화가 극적인 것을 향해 손을 뻗을 때, 서금앵은{' '}
                      <strong className="font-bold text-charcoal">평범한 하루</strong>로 돌아서고,
                      그 고요함 속에서 그릴 만한 역설을 발견한다. 초기 전시 〈Rooms〉는 이미 그가
                      품어 온 관심을 이름 붙였다: 방은 단지 그릇이 아니라 시간을 담는 용기이며, 그
                      곳을 지나간 이들의 잔여를 간직한다는 것.
                    </p>
                    <p>
                      그 결과는 보는 이에게 속도를 늦추기를 청하는 작업이다. 무엇도 외침으로
                      높여지지 않는다. 대신 공간의 기운과 그것이 나르는 기억이 인내로 그려지고, 그
                      흔적 자체가 — 희미하고, 겹겹이 쌓이고, 오래 머무는 — 화면의 주인공이 된다.
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
                        {isEnglish ? 'The air of a space' : '공간의 기운'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The room and the air that gathers within it — an attention to the quiet atmosphere that settles into everyday space.'
                          : '방과 그 안에 고이는 기운 — 일상 공간에 내려앉는 고요한 분위기를 향한 주의.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The density of memory' : '기억의 밀도'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The grain of memory and the residue of traces, layered into the places we inhabit until the trace itself becomes the subject.'
                          : '우리가 머무는 자리에 겹겹이 쌓이는 기억의 결과 흔적의 잔여 — 흔적 자체가 주제가 될 때까지.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The paradox of an ordinary day' : '평범한 하루의 역설'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Turning from the dramatic toward the ordinary day, finding in its quietness a paradox worth painting.'
                          : '극적인 것에서 평범한 하루로 돌아서, 그 고요함 속에서 그릴 만한 역설을 발견한다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Selected solo exhibitions' : '주요 개인전'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Density of Memory》 (Art Space J invitational, Bundang); 《Seo Geumjaeng》 (Gallery Ilho, Seoul)'
                        : '《기억의 밀도》(아트스페이스J 초대전, 분당); 《서금앵전》(갤러리일호, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Air of a Space》 (Hanpyeong Gallery, Jungnang Art Center)'
                        : '《공간의 기운》(중랑아트센터 한평갤러리)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Paradox of an Ordinary Day》 (Gwanghwamun Salon); 《The Air of a Space》 (E-Land invitational, Jeju)'
                        : '《평범한 하루의 역설》(광화문쌀롱); 《공간의 기운》(이랜드 기획전, 제주)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Looking at the Everyday》 (Sempio Space, Icheon)'
                        : '《일상을 바라보다》(샘표 스페이스, 이천)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition (GS Tower The Street Gallery, Seoul)'
                        : '개인전 (GS타워 더스트릿 갤러리, 서울)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Trace, Lingering》 (Humax Village, Bundang)'
                        : '《흔적, 머물다》(휴맥스 빌리지, 분당)'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《Rooms》 (Lee Hyung Art Center, Seoul)'
                        : '《Rooms》(이형아트센터, 서울)'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Art fairs, awards & collections' : '아트페어 · 수상 · 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art fairs: ASYAAF; Breeze Art Fair; Gwanghwamun International Art Festival; K-Auction premium auction preview, and others'
                        : '아트페어: ASYAAF; 브리즈 아트페어; 광화문 국제 아트 페스티벌; K-Auction 프리미엄 경매 프리뷰전 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award: Best New Artist, Art Connection Korea (2009)'
                        : '수상: ART CONNECTION KOREA 신진작가 최우수 (2009)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: Selected, Korea Contemporary Art Grand Exhibition (2008); Special Selection, Korea Painting Grand Exhibition, and Sookmyung Women’s University Best Graduation Work Award (2007)'
                        : '수상: 대한민국현대미술대전 입선 (2008); 대한민국회화대전 특선·숙명여자대학교 최우수 졸업작품상 (2007)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: MMCA Art Bank; E-Land Cultural Foundation; A Company, and others'
                        : '소장: 국립현대미술관 미술은행; ㈜이랜드 문화재단; ㈜에이컴퍼니 등'}
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
                  <span className="text-charcoal-deep">on the room, the trace, and the day</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">방과 흔적, 그리고 하루에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 방이라는 주제 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The room as subject — from 〈Rooms〉 onward'
                    : '방이라는 주제 — 〈Rooms〉에서 시작하여'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        A room is the most ordinary thing in the world, and the easiest to overlook.
                        We move through it without seeing it; it holds us without being noticed. Seo
                        Geumjaeng’s work begins exactly there — in the decision to look at the room
                        rather than past it.
                      </p>
                      <p>
                        Her early exhibition 〈Rooms〉 (2008) already named the concern that would
                        stay with her. A room, in her painting, is not merely a container of objects
                        but a vessel of time: it gathers the air of the lives lived within it, the
                        light that has crossed its walls, the residue of those who have passed
                        through. To paint the room is to paint what it has quietly absorbed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        방은 세상에서 가장 평범한 것이고, 가장 쉽게 지나치는 것이다. 우리는 그것을
                        보지 않은 채 통과하고, 그것은 알아채이지 않은 채 우리를 품는다. 서금앵의
                        작업은 바로 그 자리에서 시작한다 — 방을 지나치는 대신 들여다보겠다는 결심.
                      </p>
                      <p>
                        초기 전시 〈Rooms〉(2008)는 이미 그가 오래 품게 될 관심을 이름 붙였다. 그의
                        그림에서 방은 단지 사물의 그릇이 아니라 시간의 용기다: 그 안에서 살아간 삶의
                        기운, 벽을 가로지른 빛, 지나간 이들의 잔여를 끌어모은다. 방을 그린다는 것은,
                        방이 조용히 흡수해 온 것을 그리는 일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 기운과 밀도 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The air and the density — how a trace is painted'
                    : '기운과 밀도 — 흔적은 어떻게 그려지는가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Two words recur across the titles of her exhibitions:{' '}
                        <strong className="font-bold text-charcoal-deep">air</strong> and{' '}
                        <strong className="font-bold text-charcoal-deep">density</strong>. 〈The Air
                        of a Space〉 and 〈The Density of Memory〉 are not separate concerns but two
                        names for the same act of attention — the attempt to make visible something
                        that is, by nature, almost invisible.
                      </p>
                      <p>
                        A trace is faint. It does not announce itself. To render it on canvas
                        requires patience rather than emphasis: layer over layer, a slow build of
                        surface until the residue gains enough weight to be seen. In Seo’s work the
                        density is literal as well as figurative — memory accrues on the painted
                        surface the way it accrues in a lived-in room.
                      </p>
                      <p>
                        The mood is quiet and meditative by design. Nothing is raised to a shout
                        because the subject would not survive being shouted. The viewer is asked to
                        slow down, to let the eye adjust, until the faint grain of memory comes
                        forward and the ordinary space reveals how much it has been holding.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 전시 제목에는 두 단어가 거듭 돌아온다:{' '}
                        <strong className="font-bold text-charcoal-deep">기운</strong>과{' '}
                        <strong className="font-bold text-charcoal-deep">밀도</strong>. 〈공간의
                        기운〉과 〈기억의 밀도〉는 서로 다른 관심이 아니라, 같은 주의의 행위에 붙은
                        두 이름이다 — 본디 거의 보이지 않는 것을 보이게 만들려는 시도.
                      </p>
                      <p>
                        흔적은 희미하다. 스스로를 내세우지 않는다. 그것을 화면에 그려내는 일은
                        강조가 아니라 인내를 요구한다: 겹 위에 겹, 잔여가 보일 만큼의 무게를 얻을
                        때까지 표면을 천천히 쌓아 올린다. 서금앵의 작업에서 밀도는 비유이자 실제다 —
                        기억은, 오래 머문 방에 쌓이듯 그려진 표면 위에 쌓인다.
                      </p>
                      <p>
                        분위기가 차분하고 명상적인 것은 의도된 선택이다. 무엇도 외침으로 높여지지
                        않는 것은, 그 주제가 외침을 견디지 못하기 때문이다. 보는 이는 속도를 늦추고
                        눈이 적응하기를 청 받는다 — 희미한 기억의 결이 앞으로 나오고, 평범한 공간이
                        제가 얼마나 많은 것을 품어 왔는지 드러낼 때까지.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 평범한 하루의 역설 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'The paradox of an ordinary day' : '평범한 하루의 역설'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her 2023 exhibition was titled 〈The Paradox of an Ordinary Day〉, and the
                        phrase reads like a summary of the whole practice. The paradox is simple and
                        durable: the days we are most likely to forget are the days that make up
                        most of a life. What is ordinary is, by sheer accumulation, what matters
                        most.
                      </p>
                      <p>
                        To paint the ordinary day, then, is not a modest ambition but a difficult
                        one. It means resisting the pull toward the spectacular and trusting that
                        the quiet thing — a room in afternoon light, the air after someone has left
                        — is worth the same patient looking we usually reserve for the
                        extraordinary.
                      </p>
                      <p>
                        That trust is what gives Seo Geumjaeng’s work its steadiness. Across two
                        decades of exhibitions, from 〈Rooms〉 to 〈The Density of Memory〉, the
                        commitment has not wavered: to stay with the everyday space until it gives
                        up its quiet, accumulated truth.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2023년 전시의 제목은 〈평범한 하루의 역설〉이었고, 그 구절은 작업 전체의
                        요약처럼 읽힌다. 역설은 단순하고 끈질기다: 우리가 가장 쉽게 잊는 날들이, 한
                        생의 대부분을 이루는 날들이라는 것. 평범한 것은, 순전한 축적으로 인해 가장
                        중요한 것이 된다.
                      </p>
                      <p>
                        그러므로 평범한 하루를 그린다는 것은 소박한 야심이 아니라 어려운 야심이다.
                        그것은 화려한 것을 향한 끌림에 저항하고, 조용한 것 — 오후의 빛 속에 놓인 방,
                        누군가 떠난 뒤의 기운 — 이 우리가 보통 비범한 것에만 내어 주는 인내의 시선을
                        받을 만하다고 믿는 일이다.
                      </p>
                      <p>
                        그 믿음이 서금앵의 작업에 흔들리지 않는 단단함을 준다. 〈Rooms〉에서
                        〈기억의 밀도〉까지 20여 년에 걸친 전시들 동안, 그 약속은 흔들리지 않았다:
                        일상의 공간이 제 조용하고 축적된 진실을 내어 줄 때까지 그 곁에 머무는 일.
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
                      From the room to the trace to the ordinary day, Seo Geumjaeng’s work pursues a
                      single, patient question: how does a space hold what has passed through it?
                      She joins this campaign not as a subject of its cause but as a fellow artist
                      in solidarity — offering her work so that those navigating financial exclusion
                      today might find a way through.
                    </>
                  ) : (
                    <>
                      방에서 흔적으로, 흔적에서 평범한 하루로, 서금앵의 작업은 하나의 인내로운
                      물음을 추구한다: 공간은 그것을 지나간 것을 어떻게 간직하는가. 그는 씨앗페에 이
                      캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 오늘 금융
                      차별을 헤쳐 가는 예술인들이 길을 찾을 수 있도록 자신의 작품을 내놓는다.
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
                ROOMS
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Seo Geumjaeng</span>
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
                    Seo Geumjaeng joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    서금앵 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SEO_GEUMJAENG_PATH}
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
