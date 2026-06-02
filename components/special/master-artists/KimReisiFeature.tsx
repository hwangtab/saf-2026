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

// 작가 feature는 작가 페이지(/artworks/artist/김레이시)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_REISI_PATH = `/artworks/artist/${encodeURIComponent('김레이시')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimReisiArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김레이시' ||
    n === 'kim reisi' ||
    n === 'kimreisi' ||
    n === 'kim lacy' ||
    n === 'lacey kim' ||
    n.replace(/[\s-]+/g, '') === 'kimreisi'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김레이시 — 형상을 비우고, 균형에 이르다',
    description:
      '추상 회화 작가 김레이시. 서울여자대학교 서양화과를 졸업하고 영국 노팅엄 트렌트 대학교와 미국 프랫 인스티튜트에서 석사학위를 받은 그는, 구상에서 추상으로 전환하며 선과 색으로 내면의 균형과 존재의 본질을 탐구해 왔다. 씨앗페 온라인에서 김레이시의 작품을 만나보세요.',
    ogDescription:
      '추상 회화 작가 김레이시. 구상에서 추상으로 — 직관적인 선과 켜켜이 쌓인 층들로 내면의 균형과 존재의 연결을 빚어낸다.',
    ogAlt: '김레이시 대표 작품',
    twitterTitle: '김레이시',
    twitterDescription: '형상을 비우고 균형에 이르다 — 추상 회화 작가 김레이시',
    keywords:
      '김레이시 화가, 김레이시 추상회화, Lacey Kim 작가, 서울여자대학교 서양화, 프랫 인스티튜트, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Reisi — Emptying the Figure, Arriving at Balance',
    description:
      "Selected works by Kim Reisi (Lacey Kim), an abstract painter who graduated from Seoul Women's University and completed master's programs at Nottingham Trent University and Pratt Institute. Transitioning from figurative to abstract painting, she explores inner balance and the essence of existence through intuitive line and layered colour. View her works at SAF Online.",
    ogDescription:
      'Kim Reisi — abstract painter. From figuration to abstraction: intuitive lines and accumulated layers, reaching toward inner balance and connection.',
    ogAlt: 'Kim Reisi — featured work',
    twitterTitle: 'Kim Reisi',
    twitterDescription: 'Emptying the figure, arriving at balance — Kim Reisi, abstract painter',
    keywords:
      'Kim Reisi painter, Lacey Kim abstract art, Korean abstract painting, Pratt Institute MFA, Nottingham Trent University art',
  },
} as const;

export async function buildKimReisiMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_REISI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김레이시');
  const artwork = allArtworks.find((a) => isKimReisiArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Reisi`
      : `${artwork.title} — 김레이시`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_REISI_PATH, locale, true),
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

export default async function KimReisiFeature({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_REISI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김레이시');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimReisiArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Reisi' : '김레이시', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_REISI_PATH}#person-kim-reisi`,
    name: isEnglish ? 'Kim Reisi' : '김레이시',
    alternateName: isEnglish ? ['김레이시', 'Lacey Kim'] : ['Kim Reisi', 'Lacey Kim'],
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? "Kim Reisi (Lacey Kim) is a Korean abstract painter who graduated from Seoul Women's University with a BFA in Western Painting, and completed an MA at Nottingham Trent University (UK) and an MFA at Pratt Institute (USA). She transitioned from figurative to abstract painting, exploring inner balance and the essence of existence through intuitive line and layered colour. Her work has been exhibited in New York, Chicago, Vienna, Miami, Seoul, and elsewhere."
      : '김레이시는 서울여자대학교 서양화과를 졸업하고 영국 노팅엄 트렌트 대학교(MA)와 미국 프랫 인스티튜트(MFA)에서 석사학위를 받은 추상 회화 작가입니다. 구상 작업을 통해 회화의 구조적 기반을 다진 뒤 추상 회화로 전환하여, 직관적인 선과 켜켜이 쌓인 층으로 내면의 균형과 존재의 본질을 탐구해 왔습니다. 뉴욕, 시카고, 빈, 마이애미, 서울 등에서 전시를 이어왔습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? "Seoul Women's University, Dept. of Western Painting (BFA, 2003)"
          : '서울여자대학교 서양화과 (학사, 2003)',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Nottingham Trent University (MA, 2007)'
          : '영국 노팅엄 트렌트 대학교 (MA, 2007)',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Pratt Institute, New York (MFA, 2009)' : '프랫 인스티튜트 (MFA, 2009)',
      },
    ],
    knowsAbout: ['Abstract painting', 'Painting', 'Intuitive line work', 'Oil on canvas'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Reisi — SAF Online' : '김레이시 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Reisi from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김레이시 작품들을 소개합니다.',
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
        {/* Hero Section — 추상 회화의 균형과 내면 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 추상 선 모티프 — 직관적 제스처의 흔적 */}
          <div
            className="absolute top-16 left-8 w-24 h-px bg-white/10 rotate-12"
            aria-hidden="true"
          />
          <div
            className="absolute top-32 left-16 w-16 h-px bg-primary/20 -rotate-6"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 right-12 w-32 h-px bg-white/10 rotate-6"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-36 right-24 w-20 h-px bg-primary/15 -rotate-12"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-4 w-1 h-16 bg-white/10 -translate-y-1/2"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 right-6 w-1 h-12 bg-primary/20 -translate-y-1/2"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Reisi' : '김레이시'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Emptying the figure,
                  <br />
                  <span className="text-primary-soft">arriving at balance</span>
                </>
              ) : (
                <>
                  형상을 비우고
                  <br />
                  <span className="text-primary-soft">균형에 이르다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From figuration to abstraction — intuitive lines that prove existence.
                  </span>
                  <span className="mt-2 block">
                    Inner balance reaching outward toward every other being.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">구상에서 추상으로 — 존재를 증명하는 직관적인 선.</span>
                  <span className="mt-2 block">내면의 균형이 모든 타자를 향한 존중에 닿는다.</span>
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
                    From figuration to abstraction —<br />
                    <span className="text-primary-strong">line as inner truth</span>
                  </>
                ) : (
                  <>
                    구상에서 추상으로 —<br />
                    <span className="text-primary-strong">내면의 진심을 담은 선</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Reisi built the structural foundation of her practice in figurative
                      painting, graduating from the Department of Western Painting at Seoul
                      Women&apos;s University (BFA, 2003). Carrying that grounding in the discipline
                      of representational form, she pursued advanced study internationally — an MA
                      at Nottingham Trent University in the UK (2007) and an MFA at Pratt Institute
                      in New York (2009) — living and working across three continents.
                    </p>
                    <p>
                      That journey shaped a decisive transition. Having mastered figuration as a
                      structural tool, she moved into abstract painting — not as an abandonment of
                      form but as its dissolution into{' '}
                      <strong className="font-bold text-charcoal-deep">
                        inner balance and the essence of existence
                      </strong>
                      . Line, freed from the task of representing things, became a direct record of
                      inner state: each stroke a gesture, each gesture a proof of being here.
                    </p>
                    <p>
                      Her practice centres on intuitive line work. In her paintings, lines are swept
                      across the canvas with the whole body — a flick, a long pull — then layered
                      over and over as the surface fills, is partially covered, and fills again.
                      This accumulation is not sequential but simultaneous: each layer carries the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        imprint of a particular moment
                      </strong>
                      , and all the moments are present at once in the finished work.
                    </p>
                    <p>
                      The result is painting that turns inward and outward at the same time. To draw
                      a line and find oneself in it is, her work suggests, inseparable from thinking
                      of others — of everyone who breathes alongside. Her work in colour and line
                      ultimately reaches toward respect for the other: the recognition that they are
                      no different from oneself.
                    </p>
                    <p>
                      Since her early &ldquo;Dialogue of Silence&rdquo; exhibitions in New York
                      (2010–2012), through the &ldquo;In Between&rdquo; and &ldquo;Before
                      Mind&rdquo; series, to the recent solo shows &ldquo;Anonymous Moments&rdquo;
                      (2025) and &ldquo;This Moment&rdquo; (2024), her practice has deepened
                      steadily across more than 20 solo exhibitions and over 80 group shows in
                      Seoul, New York, Chicago, Vienna, Miami, and beyond.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김레이시는 서울여자대학교 서양화과(학사, 2003)를 졸업하며 구상 회화를 통해
                      회화의 구조적 기반을 다졌다. 그 토대를 안고서 그는 영국 노팅엄 트렌트
                      대학교(MA, 2007)와 미국 프랫 인스티튜트(MFA, 2009)에서 심화 공부를 이어가며,
                      세 대륙에 걸쳐 삶과 작업을 쌓아왔다.
                    </p>
                    <p>
                      그 여정은 하나의 결정적인 전환을 빚었다. 구상을 구조적 도구로 익힌 뒤, 그는
                      추상 회화로 이행했다 — 형식의 포기가 아니라 형식이{' '}
                      <strong className="font-bold text-charcoal-deep">
                        내면의 균형과 존재의 본질
                      </strong>
                      로 용해되는 과정으로서. 사물을 재현하는 임무에서 풀려난 선은, 내면 상태의
                      직접적인 기록이 되었다. 각각의 획은 하나의 제스처이고, 각각의 제스처는
                      지금-여기 존재함의 증명이다.
                    </p>
                    <p>
                      그의 작업은 직관적인 선 긋기를 중심으로 한다. 온몸의 제스처로 — 휙 혹은 주욱 —
                      캔버스를 가로질러 선을 긋고, 화면이 채워지고 부분적으로 덮이고 다시 채워지는
                      과정이 거듭 반복된다. 이 축적은 순차적이 아니라 동시적이다. 각각의 층은 하나의{' '}
                      <strong className="font-bold text-charcoal-deep">순간의 각인</strong>을 담고
                      있으며, 완성된 작업 안에서 모든 순간들은 한꺼번에 현존한다.
                    </p>
                    <p>
                      그 결과는 안으로도 바깥으로도 동시에 열려 있는 회화다. 선을 긋고 그 안에서
                      자신을 발견하는 것은, 그의 작업이 보여주듯, 함께 숨쉬는 타인들을 생각하는 것과
                      분리될 수 없다. 색과 선으로 이루어진 그의 작업은 결국 타자를 향한 존중에
                      닿아있다 — 그들 역시 나와 다르지 않다는 인식 속에서.
                    </p>
                    <p>
                      뉴욕에서의 초기 「Dialogue of Silence」 연작(2010–2012)부터 「In Between」,
                      「Before Mind」 시리즈를 거쳐, 최근의 「Anonymous Moments」(2025)와 「This
                      Moment」(2024)에 이르기까지, 20회가 넘는 개인전과 국내외 80여 회의 단체전을
                      통해 그의 작업은 서울, 뉴욕, 시카고, 빈, 마이애미 등지에서 꾸준히 이어져 왔다.
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
                        {isEnglish ? 'From figuration to abstraction' : '구상에서 추상으로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A structural grounding in representational painting that dissolved, over time, into the freedom of non-representational line.'
                          : '구상 회화로 다진 구조적 기반이, 시간을 거치며 비재현적 선의 자유로 용해되었다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Inner balance and layered presence'
                          : '내면의 균형과 켜켜이 쌓인 현존'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Each layer of paint holds a moment; together they form a surface where past and present exist simultaneously.'
                          : '각각의 층은 하나의 순간을 담는다. 켜켜이 쌓여, 과거와 현재가 동시에 존재하는 화면이 된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish
                          ? 'Connection and respect for the other'
                          : '연결과 타자를 향한 존중'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Looking inward through the act of painting inevitably leads to thinking of all others who breathe alongside — the weight of coexistence in every mark.'
                          : '그림 그리기를 통해 안을 바라보는 것은, 함께 숨쉬는 모든 이를 떠올리지 않을 수 없게 한다 — 모든 자국 안의 공존의 무게.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2003
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "BFA, Department of Western Painting, Seoul Women's University."
                        : '서울여자대학교 서양화과 학사 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MA, Nottingham Trent University, UK.'
                        : '영국 노팅엄 트렌트 대학교 석사(MA).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MFA, Pratt Institute, New York.'
                        : '미국 프랫 인스티튜트 순수미술 석사(MFA).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2010–12
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Dialogue of Silence〉 — Chelsea West Gallery (NYC), Amos Eno Gallery (Brooklyn), Yashar Gallery (Brooklyn), Pop Art Factory (Seoul).'
                        : '「Dialogue of Silence」 개인전 — Chelsea West Gallery (뉴욕), Amos Eno Gallery (브루클린), Yashar Gallery (브루클린), 팝아트팩토리 (서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2014–15
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈In Between〉 — Gallery Imaju (Seoul), Space Sun Plus (Seoul), Gallery Pirang (Heyri).'
                        : '「In Between」 개인전 — 갤러리이마주 (서울), 스페이스 선 플러스 (서울), 갤러리 피랑 (헤이리).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Vantage Point〉, 1133 Avenue of the Americas (ChaShaMa & Durst Org., NYC); 〈Before Mind〉, ChaShaMa 55 Broadway (NYC).'
                        : '「Vantage Point」, 1133 Avenue of the Americas (ChaShaMa·Durst Org., 뉴욕); 「Before Mind」, ChaShaMa 55 Broadway (뉴욕).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021–22
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Before Mind〉 (Gallery Nut, CICA Gimpo); 〈Before Thinking〉 (Gallery Hanok; Sai Art Space, Seoul).'
                        : '「Before Mind」 (갤러리 너트, CICA 김포); 「Before Thinking」 (갤러리한옥; 사이아트스페이스, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023–25
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Before Any Words〉 (Gallery Coral, Gallery Still, Gallery Dos); 〈This Moment〉 (Gallery Ilho, 2024); 〈Anonymous Moments〉 (Gallery LP; Chungju Cultural Foundation, 2025).'
                        : '「Before Any Words」 (갤러리코랄, 갤러리스틸, 갤러리도스); 「This Moment」 (갤러리일호, 2024); 「Anonymous Moments」 (갤러리LP; 충주문화재단 목계나래, 2025).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected awards & collections' : '주요 수상 및 소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2022 Gallery Hanok New Artist Open Call — selected (〈Before Thinking〉)'
                        : '2022 갤러리한옥 신진작가공모전 선정 (「Before Thinking」)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Featured in Studio Visit Magazine (2016, 2025), Hyperallergic (2020)'
                        : 'Studio Visit Magazine (2016, 2025), Hyperallergic (2020) 등 게재'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Public collections: One Medical Group (Brooklyn, NY); Seoul Eastern District Court'
                        : '공공 소장: One Medical Group (브루클린); 서울동부지방법원'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '20+ solo exhibitions; over 80 group exhibitions in Seoul, New York, Chicago, Vienna, Miami, Busan, Daegu, and beyond'
                        : '개인전 20회 이상; 국내외 단체전 80여 회 — 서울, 뉴욕, 시카고, 빈, 마이애미, 부산, 대구 등'}
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
                  <span className="text-charcoal-deep">on the work and its inner logic</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 내면의 논리에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 구상에서 추상으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'From figuration to abstraction' : '구상에서 추상으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Reisi did not begin in abstraction. She began in figuration — learning,
                        through Western painting at Seoul Women&apos;s University, how to construct
                        a form, how to hold a composition together, how to make a surface resolve
                        into something legible. That structural discipline was the foundation on
                        which everything else was built.
                      </p>
                      <p>
                        Advanced study abroad — at Nottingham Trent University in the UK, then at
                        Pratt Institute in New York — deepened the practice while shifting its
                        centre. The move toward abstraction was not a break with figuration but a
                        continuation: having learned what form can do, she began to explore what
                        form, released from representation, reveals. Line freed from the object
                        becomes a line that records the inner state — its speed, its weight, its
                        wavering. The painting became a surface for the act of being present.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김레이시는 추상에서 시작하지 않았다. 구상에서 시작했다 — 서울여자대학교에서
                        서양화를 공부하며, 형태를 구성하는 법, 구도를 하나로 유지하는 법, 화면이
                        무언가 읽히는 것으로 정리되게 하는 법을 익혔다. 그 구조적 훈련이 이후 모든
                        것이 세워진 토대였다.
                      </p>
                      <p>
                        영국 노팅엄 트렌트 대학교, 그리고 미국 프랫 인스티튜트에서의 심화 공부는
                        작업을 깊게 하면서 그 중심을 이동시켰다. 추상으로의 이행은 구상과의 단절이
                        아니라 연속이었다. 형태가 무엇을 할 수 있는지 배운 뒤, 그는 재현에서 풀려난
                        형태가 무엇을 드러내는지를 탐구하기 시작했다. 대상에서 풀려난 선은 내면의
                        상태를 기록하는 선이 된다 — 그 속도, 무게, 흔들림. 회화는 지금-여기 존재하는
                        행위의 화면이 되었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 내면의 균형 — 선과 층의 시학 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Inner balance — the poetics of line and layer'
                    : '내면의 균형 — 선과 층의 시학'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The central gesture of Kim Reisi&apos;s practice is simple and bodily: a
                        hand raised, a sweep through the air, a line drawn. In that act, she has
                        written, the self is found — not in the meaning of the mark but in the proof
                        of it. The line says: I was here; this moment happened. Its fading does not
                        erase the act.
                      </p>
                      <p>
                        On the canvas this becomes a process of accumulation. Lines fill the
                        surface; the surface is partially or wholly covered; new lines are laid
                        down. Over time, layers build up — each layer holding a different moment,
                        all the moments held at once in the finished painting. This simultaneity is
                        deliberate. Where sequential accumulation might suggest a narrative — this
                        came before that — her method insists that{' '}
                        <strong className="font-bold text-charcoal-deep">
                          every moment is already complete in itself
                        </strong>
                        . No layer is more or less present than any other.
                      </p>
                      <p>
                        The result is painting that embodies balance not as symmetry but as the
                        equal weight of all the instants it contains. Each stroke is both a record
                        and a release — the inner state expressed, then covered, then re-expressed
                        in a new form. The surface accumulates toward an equilibrium that is never
                        fixed, always in process.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김레이시 작업의 중심 제스처는 단순하고 신체적이다: 손을 들어 허공을 가르고,
                        선을 긋는다. 그 행위 안에서, 그의 작업이 보여주듯, 자아가 발견된다 — 자국의
                        의미 속에서가 아니라 자국의 증명 속에서. 선은 말한다: 나는 여기 있었다; 이
                        순간은 일어났다. 궤적이 옅어진다 해도 행위는 지워지지 않는다.
                      </p>
                      <p>
                        캔버스 위에서 이것은 축적의 과정이 된다. 선들이 화면을 채우고, 화면은
                        부분적으로 혹은 전체가 덮이고, 새로운 선들이 내려앉는다. 시간을 거쳐 층들이
                        쌓인다 — 각각의 층은 서로 다른 순간을 담고, 완성된 회화 안에서 모든 순간들은
                        한꺼번에 품어진다. 이 동시성은 의도적이다. 순차적 축적이 서사를 암시할 수
                        있다면 — 이것이 먼저이고 저것이 뒤에 왔다 — 그의 방법은 단호하게 주장한다:{' '}
                        <strong className="font-bold text-charcoal-deep">
                          모든 순간은 그 자체로 이미 완전하다
                        </strong>
                        . 어떤 층도 다른 층보다 더 많이 혹은 덜 현존하지 않는다.
                      </p>
                      <p>
                        그 결과는 균형을 대칭으로서가 아니라, 자신이 담고 있는 모든 순간들의 동등한
                        무게로서 구현하는 회화다. 각각의 획은 기록인 동시에 해방이다 — 내면의 상태가
                        표현되고, 덮이고, 새로운 형태로 다시 표현된다. 화면은 결코 고정되지 않고
                        항상 과정 속에 있는 균형을 향해 쌓여간다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 연결 — 선 긋기와 타자를 향한 존중 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Connection — drawing lines, reaching toward the other'
                    : '연결 — 선 긋기와 타자를 향한 닿음'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Reisi&apos;s practice does not end with the self. To look inward through
                        painting — to find the &ldquo;I&rdquo; inscribed in each mark — is,
                        paradoxically, to open outward. The experience of facing oneself in the act
                        of drawing, her practice suggests, inevitably leads to attending to the
                        moments of others: to everyone who breathes alongside, close but separated,
                        each existing in their own moment.
                      </p>
                      <p>
                        This is the ethical dimension of her abstract practice. The painting in
                        colour and line does not illustrate a philosophy of connection; it is the
                        act of connection, repeated with each gesture. The coexistence of all the
                        layers — all the moments, all the selves — on a single canvas surface is a
                        model for how beings exist together: distinct, simultaneous, mutually
                        present. Her work reaches toward the recognition that others are no
                        different from oneself.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김레이시의 작업은 자아에서 끝나지 않는다. 회화를 통해 안을 바라보는 것은 —
                        각각의 자국에 새겨진 &lsquo;나&rsquo;를 발견하는 것은 — 역설적으로 바깥으로
                        열리는 일이다. 선 긋기의 행위 안에서 자신을 마주하는 경험은, 그의 작업이
                        보여주듯, 필연적으로 타인들의 순간들에 마음을 두게 한다: 함께 숨쉬는 모든
                        이들, 가까이 붙어 있으면서도 분리되어 있는, 각자 자신의 순간 안에 존재하는
                        이들에게로.
                      </p>
                      <p>
                        이것이 그의 추상 작업이 지닌 윤리적 차원이다. 색과 선으로 이루어진 회화는
                        연결의 철학을 도해하지 않는다; 그것은 연결의 행위 자체이며, 각각의 제스처와
                        함께 반복된다. 단일한 화면 위에서 모든 층들 — 모든 순간들, 모든 자아들 — 이
                        공존하는 것은, 존재들이 함께 있는 방식의 하나의 모형이다: 구별되면서,
                        동시적으로, 서로를 현존하게 하면서. 그의 작업은 타자 역시 자신과 다르지
                        않다는 인식을 향해 닿아 있다.
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
                      From Seoul to New York to the international art world and back, Kim Reisi has
                      built a quiet, sustained practice of abstract painting grounded in the act of
                      presence. She joins this campaign in solidarity with fellow artists — so that
                      the next generation might keep drawing their lines.
                    </>
                  ) : (
                    <>
                      서울에서 뉴욕으로, 그리고 국제 미술 현장을 가로질러, 김레이시는 현존의 행위에
                      뿌리를 둔 조용하고 꾸준한 추상 회화 작업을 쌓아왔다. 그는 동료 예술인과의
                      연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들이 계속 자신의 선을
                      그어나갈 수 있도록.
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
                LINE
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Reisi</span>
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
                    Kim Reisi joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김레이시 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품
                    판매 수익은 전액{' '}
                    <strong className="text-white">예술인 상호부조 대출 기금</strong>으로
                    이어집니다. 작품 한 점의 구매가, 오늘 금융 차별을 겪는 예술인 한 사람의 다음 한
                    달이 됩니다.
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
                returnTo={KIM_REISI_PATH}
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
