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

// 거장 작가 feature는 작가 페이지(/artworks/artist/이광수)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_GWANGSU_PATH = `/artworks/artist/${encodeURIComponent('이광수')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeGwangsuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이광수' ||
    n === 'lee gwangsu' ||
    n === 'lee gwang-su' ||
    n === 'lee kwang-soo' ||
    n.replace(/[\s-]+/g, '') === 'leegwangsu' ||
    n.replace(/[\s-]+/g, '') === 'leekwangsoo'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이광수 — 비평가의 카메라, 한·중을 잇는 사진 교류',
    description:
      '사진비평가이자 부산외국어대학교 명예교수 이광수. 인도 근대사 연구에서 출발해 사진을 사료이자 언어로 삼아온 그는 글과 이미지를 오가며 한국 현대사진을 비평해왔다. 무석·소주의 한·중 사진 교류전에 참여한 이광수의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '사진비평가이자 사진작가 이광수. 인도사 연구에서 비롯된 비평의 눈으로 한국 현대사진을 읽고, 한·중을 잇는 국제 사진 교류에 함께한다.',
    ogAlt: '이광수 대표 작품',
    twitterTitle: '이광수',
    twitterDescription: '비평가의 카메라 — 한·중을 잇는 사진 교류의 작가 이광수',
    keywords:
      '이광수 사진작가, 이광수 사진비평가, 부산외국어대 명예교수, 사진 인문학, 카메라는 칼이다, 한중 사진 교류, 씨앗페 온라인',
  },
  en: {
    title: "Lee Gwangsu — A Critic's Camera, Bridging Korea and China",
    description:
      'Selected works by Lee Gwangsu, a photography critic and professor emeritus at Busan University of Foreign Studies. Beginning from research into modern Indian history, he took up photography as both source and language, moving between writing and image to critique Korean contemporary photography. View and collect the works of Lee Gwangsu — a participant in the Korea–China photography exchanges in Wuxi and Suzhou — at SAF Online.',
    ogDescription:
      'Lee Gwangsu — a photography critic and photographer. With an eye shaped by the study of Indian history, he reads Korean contemporary photography and joins international photo exchanges bridging Korea and China.',
    ogAlt: 'Lee Gwangsu — featured work',
    twitterTitle: 'Lee Gwangsu',
    twitterDescription:
      "A critic's camera — Lee Gwangsu, bridging Korea and China through photography",
    keywords:
      'Lee Gwangsu photographer, Lee Gwangsu photography critic, Busan University of Foreign Studies, photography humanities, Korea China photo exchange',
  },
} as const;

export async function buildLeeGwangsuMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_GWANGSU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이광수');
  const artwork = allArtworks.find((a) => isLeeGwangsuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Gwangsu`
      : `${artwork.title} — 이광수`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_GWANGSU_PATH, locale, true),
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

export default async function LeeGwangsuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_GWANGSU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이광수');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeGwangsuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Gwangsu' : '이광수', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_GWANGSU_PATH}#person-lee-gwangsu`,
    name: isEnglish ? 'Lee Gwangsu' : '이광수',
    alternateName: isEnglish ? '이광수' : 'Lee Gwangsu',
    jobTitle: isEnglish ? 'Photography critic, Photographer' : '사진비평가, 사진작가',
    description: isEnglish
      ? 'Lee Gwangsu is a photography critic and professor emeritus at Busan University of Foreign Studies. Beginning from the study of modern Indian history, he took up photography as both historical source and critical language.'
      : '이광수는 사진비평가이자 부산외국어대학교 명예교수입니다. 인도 근대사 연구에서 출발해 사진을 사료이자 비평의 언어로 삼아 글과 이미지를 오가며 작업해 왔습니다.',
    affiliation: {
      '@type': 'CollegeOrUniversity',
      name: isEnglish ? 'Busan University of Foreign Studies' : '부산외국어대학교',
    },
    knowsAbout: [
      'Photography criticism',
      'Photography humanities',
      'Modern Indian history',
      'Asian photography',
    ],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Gwangsu — SAF Online' : '이광수 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Gwangsu from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이광수 작품들을 소개합니다.',
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

          {/* Vertical lines — 비평의 행간·필름의 프레임 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish
                  ? 'Lee Gwangsu · Critic & Photographer'
                  : '이광수 · 사진비평가이자 사진작가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A critic who answers
                  <br />
                  <span className="text-primary-soft">with a camera</span>
                </>
              ) : (
                <>
                  글로 읽고,
                  <br />
                  <span className="text-primary-soft">카메라로 답하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From the study of Indian history to the language of the lens.
                  </span>
                  <span className="mt-2 block">
                    A double gaze, moving between writing and image — bridging Korea and China.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">인도사 연구에서 렌즈의 언어로.</span>
                  <span className="mt-2 block">
                    글과 이미지를 오가는 이중의 시선, 한국과 중국을 잇다.
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
                    The critic&apos;s eye —<br />
                    <span className="text-primary-strong">photography as source and language</span>
                  </>
                ) : (
                  <>
                    비평가의 눈 —<br />
                    <span className="text-primary-strong">사료이자 언어로서의 사진</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Gwangsu is a photography critic and a professor emeritus at Busan
                      University of Foreign Studies, and an artist of the International Cultural and
                      Arts Exchange Institute. His path to the camera was unusual: he came to
                      photography not through a fine-arts studio but through the archive. Trained as
                      a historian of modern India, he spent years reading the subcontinent&apos;s
                      past — and in the course of that research understood that a photograph could
                      be a primary historical source in its own right.
                    </p>
                    <p>
                      That recognition turned him toward photographic theory. He began to study the
                      medium formally, and from there entered the field of photography criticism —
                      writing essays that read photographs through the lens of the humanities. For a
                      critic, the question was never simply <em>what</em> a photograph shows, but{' '}
                      <strong className="font-bold text-charcoal-deep">how</strong> it shows it, and
                      what a society chooses to remember or forget through the image.
                    </p>
                    <p>
                      His writing carried that conviction into book after book. In{' '}
                      <em>Photography Humanities</em> he set photographs beside philosophy and the
                      photographers of our time; in <em>The Camera Is a Knife</em> he traveled
                      between Busan and Seoul to interview Korean contemporary photographers and
                      build monographs on a generation of artists. The camera, for him, is not a
                      passive recording device but an instrument that cuts — that selects, frames,
                      and takes a position.
                    </p>
                    <p>
                      And he did not remain a writer alone. Carrying the same critical eye, he
                      picked up the camera himself, and his images now travel beyond Korea. In 2025
                      his work joined two Korea–China photography exchanges: the{' '}
                      <strong className="font-bold text-charcoal">
                        Korea–China International Artists&apos; Plein-air Exhibition
                      </strong>{' '}
                      at the Taihu Art Museum in Wuxi, and the{' '}
                      <strong className="font-bold text-charcoal">
                        Korea–China International Artists&apos; Exchange Exhibition
                      </strong>{' '}
                      at the Dongshan State Guesthouse Museum in Suzhou — with works entering both
                      institutions&apos; collections.
                    </p>
                    <p>
                      Between the page and the print, between Korea and China, Lee Gwangsu works in
                      the space where reading and seeing meet. The historian who learned to read
                      photographs became a photographer who writes — and the exchange he joins is
                      not only one of images across a border, but of two practices, criticism and
                      image, held in one pair of hands.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이광수는 사진비평가이자 부산외국어대학교 명예교수이며, 국제문화예술교류원 전속
                      작가다. 그가 카메라에 이른 길은 통상의 경로와 달랐다. 그는 미술 아틀리에가
                      아니라 아카이브를 거쳐 사진에 도달했다. 인도 근대사를 연구하는 역사학자로서
                      오랜 시간 인도의 과거를 읽어 온 그는, 그 연구 과정에서{' '}
                      <strong className="font-bold text-charcoal-deep">
                        사진이 그 자체로 1차 사료가 될 수 있다
                      </strong>
                      는 사실을 깨달았다.
                    </p>
                    <p>
                      그 깨달음은 그를 사진 이론으로 이끌었다. 그는 사진이라는 매체를 본격적으로
                      공부하기 시작했고, 거기서 사진비평의 길로 들어섰다 — 사진을 인문학의 시선으로
                      읽는 글을 써 왔다. 비평가에게 물음은 결코 사진이 <em>무엇을</em> 보여 주는가에
                      머물지 않았다. 물음은 언제나{' '}
                      <strong className="font-bold text-charcoal">어떻게</strong> 보여 주는가였고,
                      한 사회가 이미지를 통해 무엇을 기억하고 무엇을 잊기로 하는가였다.
                    </p>
                    <p>
                      그의 글은 그 신념을 여러 권의 책으로 이어 갔다. 「사진 인문학」에서 그는
                      사진을 철학과 우리 시대의 사진가들 곁에 놓았고, 「카메라는 칼이다」에서는
                      부산과 서울을 오가며 한국 현대사진가들을 인터뷰하고 한 세대의 작가론을 엮었다.
                      그에게 카메라는 수동적인 기록 장치가 아니라 베어 내는 도구다 — 선택하고,
                      프레임하고, 입장을 취하는 칼.
                    </p>
                    <p>
                      그리고 그는 쓰는 사람으로만 남지 않았다. 같은 비평의 눈을 지닌 채 직접
                      카메라를 들었고, 그의 이미지는 이제 한국 너머로 건너간다. 2025년 그의 작품은
                      두 차례의 한·중 사진 교류에 함께했다. 중국 무석시 태호미술관의{' '}
                      <strong className="font-bold text-charcoal">〈중한예술가국제사생전〉</strong>,
                      그리고 중국 소주시 동산국빈관 미술관의{' '}
                      <strong className="font-bold text-charcoal">〈중한예술가국제교류전〉</strong>{' '}
                      — 두 작품 모두 각 미술관에 소장되었다.
                    </p>
                    <p>
                      페이지와 인화지 사이에서, 한국과 중국 사이에서, 이광수는 읽기와 보기가 만나는
                      자리에서 작업한다. 사진을 읽는 법을 배운 역사학자는 글을 쓰는 사진가가 됐고,
                      그가 함께하는 교류는 국경을 넘는 이미지의 교류일 뿐 아니라, 비평과 이미지라는
                      두 실천이 한 사람의 손에 함께 쥐어진 교류다.
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
                        {isEnglish ? 'The double gaze' : '이중의 시선'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Critic and photographer in one — moving between writing and image, reading the photograph he also makes.'
                          : '비평가이자 사진작가, 글과 이미지를 오가는 한 사람. 스스로 찍은 사진을 비평의 눈으로 다시 읽는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Photography as source' : '사료로서의 사진'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A historian of modern India who learned that a photograph can be a primary source — and turned that into a critical practice.'
                          : '인도 근대사 연구자로서 사진이 1차 사료가 될 수 있음을 배우고, 그것을 비평의 실천으로 발전시켰다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Bridging Korea and China' : '한·중을 잇는 교류'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In 2025 his work joined the Wuxi and Suzhou Korea–China photography exchanges, entering both museums’ collections.'
                          : '2025년 무석·소주의 한·중 사진 교류전에 참여하고, 두 미술관에 작품이 소장됐다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's path" : '작가의 길'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'History' : '역사학'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Trained as a historian of modern India; spends years reading the subcontinent’s past.'
                        : '인도 근대사를 연구하는 역사학자로 출발, 오랜 시간 인도의 과거를 읽다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Turn' : '전환'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Realizes a photograph can be a primary source; studies photographic theory formally.'
                        : '사진이 1차 사료가 될 수 있음을 깨닫고 사진 이론을 본격적으로 공부하다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Criticism' : '비평'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Enters photography criticism; publishes essays reading photographs through the humanities.'
                        : '사진비평의 길로 들어서, 사진을 인문학의 시선으로 읽는 글을 발표하다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Books' : '저술'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Author of 〈Photography Humanities〉, 〈The Camera Is a Knife〉, and other works.'
                        : '「사진 인문학」, 「카메라는 칼이다」 등을 저술하다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Joins the Wuxi Taihu Art Museum Korea–China plein-air exhibition (collected by the museum).'
                        : '중국 무석시 태호미술관 〈중한예술가국제사생전〉 참여, 태호미술관 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Joins the Suzhou Dongshan State Guesthouse Museum Korea–China exchange (collected by the museum).'
                        : '중국 소주시 동산국빈관 미술관 〈중한예술가국제교류전〉 참여, 동산국빈관 미술관 소장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-20">
                      {isEnglish ? 'Present' : '현재'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Professor emeritus, Busan University of Foreign Studies; artist of the International Cultural and Arts Exchange Institute.'
                        : '부산외국어대학교 명예교수, 국제문화예술교류원 전속 작가.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibition: Korea–China International Artists&apos; Plein-air
                          Exhibition, Taihu Art Museum, Wuxi, China (2025) — collected by the museum
                        </>
                      ) : (
                        <>
                          단체전: 〈중한예술가국제사생전〉, 중국 무석시 태호미술관 (2025) —
                          태호미술관 소장
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Group exhibition: Korea–China International Artists&apos; Exchange
                          Exhibition, Dongshan State Guesthouse Museum, Suzhou, China (2025) —
                          collected by the museum
                        </>
                      ) : (
                        <>
                          단체전: 〈중한예술가국제교류전〉, 중국 소주시 동산국빈관 미술관 (2025) —
                          동산국빈관 미술관 소장
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Author of 〈Photography Humanities〉 and 〈The Camera Is a Knife〉, among other works of photography criticism.'
                        : '저서 「사진 인문학」, 「카메라는 칼이다」 외 다수의 사진비평서.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 이광수 비평·교류 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on writing, the lens, and exchange</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">글과 렌즈, 그리고 교류에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 역사학자에서 사진비평가로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'From historian to photography critic' : '역사학자에서 사진비평가로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most photographers arrive at the medium through the eye. Lee Gwangsu arrived
                        through the document. As a historian of modern India, he spent years among
                        archives, and in the course of that work confronted a question that would
                        change his practice: what is a photograph, when it sits inside the record of
                        a nation&apos;s past? Not an illustration of history, he concluded, but a
                        piece of it — a primary source with its own claims and its own silences.
                      </p>
                      <p>
                        That conclusion sent him to study photographic theory in earnest. He did not
                        treat criticism as commentary added after the fact, but as a way of reading
                        the image with the same rigor a historian brings to a text. From there he
                        entered photography criticism proper, publishing essays that placed
                        photographs beside philosophy and beside the working photographers of his
                        own time.
                      </p>
                      <p>
                        The unusual route left a mark on the work. Where a studio-trained eye might
                        ask first about composition or light, Lee asks first about evidence and
                        intention — what the frame includes, what it leaves out, and what that
                        choice means. Criticism, for him, is not separate from history; it is
                        history carried on into the present, image by image.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대부분의 사진가는 눈을 통해 매체에 이른다. 이광수는 기록을 통해 이르렀다.
                        인도 근대사를 연구하는 역사학자로서 그는 오랜 시간 아카이브 속에 머물렀고,
                        그 과정에서 자신의 작업을 바꿔 놓을 물음과 마주했다. 사진이란, 한 나라의
                        과거를 담은 기록 안에 놓일 때 무엇인가? 그는 결론지었다 — 사진은 역사의
                        삽화가 아니라 역사의 한 조각, 그 자체의 주장과 그 자체의 침묵을 지닌 1차
                        사료라고.
                      </p>
                      <p>
                        그 결론은 그를 사진 이론의 본격적인 공부로 이끌었다. 그는 비평을 사후에
                        덧붙이는 해설로 다루지 않았다. 역사학자가 텍스트를 대하는 엄밀함으로
                        이미지를 읽는 방식으로 비평을 다뤘다. 거기서 그는 본격적인 사진비평으로
                        들어섰고, 사진을 철학 곁에, 그리고 동시대 현역 사진가들 곁에 놓는 글을
                        발표했다.
                      </p>
                      <p>
                        이 남다른 경로는 작업에 흔적을 남겼다. 아틀리에에서 훈련된 눈이 구도나 빛을
                        먼저 묻는다면, 이광수는 증거와 의도를 먼저 묻는다 — 프레임이 무엇을 담고,
                        무엇을 잘라 내며, 그 선택이 무엇을 뜻하는가를. 그에게 비평은 역사와 분리되지
                        않는다. 비평은 한 장 한 장의 이미지로 현재까지 이어진 역사다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 카메라는 칼이다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The camera is a knife — how, not what'
                    : '카메라는 칼이다 — 무엇이 아니라 어떻게'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of his book of monographs — <em>The Camera Is a Knife</em> — names
                        a conviction. A knife selects: it separates this from that, includes and
                        excludes, takes a position with every cut. So does the camera. The frame is
                        not a neutral window but an act of choice, and for Lee the critic&apos;s
                        task is to make that choice visible — to ask not only what a photograph
                        shows but how, and why, and at whose cost.
                      </p>
                      <p>
                        He built that argument the long way. Traveling between Busan and Seoul to
                        meet Korean contemporary photographers, he assembled close readings of a
                        generation of artists — monographs grounded in the work and in conversation,
                        rather than in fashion. Across his books, from{' '}
                        <em>Photography Humanities</em> onward, the photograph is treated as a text
                        worth the same care as any document: read slowly, set in context, held
                        accountable.
                      </p>
                      <p>
                        This is why his own turn to making photographs is continuous with his
                        criticism rather than a break from it. The hand that frames is the same hand
                        that writes; the eye that judges an image is the eye that composes one. To
                        pick up the camera, for a critic who believes it cuts, is to accept
                        responsibility for the cut.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 작가론집 제목 「카메라는 칼이다」는 하나의 신념을 이름 붙인 것이다.
                        칼은 선택한다. 이것과 저것을 가르고, 포함하고 배제하며, 벨 때마다 입장을
                        취한다. 카메라도 그렇다. 프레임은 중립적인 창이 아니라 선택의 행위이고,
                        이광수에게 비평가의 일은 그 선택을 보이게 하는 것이다 — 사진이 무엇을 보여
                        주는가뿐 아니라, 어떻게, 왜, 누구의 대가로 보여 주는가를 묻는 것.
                      </p>
                      <p>
                        그는 그 논증을 먼 길을 돌아 쌓았다. 부산과 서울을 오가며 한국 현대사진가들을
                        만나, 한 세대의 작가론을 — 유행이 아니라 작품과 대화에 뿌리내린 정독으로 —
                        엮어 냈다. 「사진 인문학」 이래의 그의 책들에서 사진은 어떤 문서에도
                        못지않은 주의를 받을 텍스트로 다뤄진다. 천천히 읽히고, 맥락 안에 놓이고,
                        책임을 묻는 대상으로.
                      </p>
                      <p>
                        그렇기에 그가 직접 사진을 찍는 일은 비평으로부터의 단절이 아니라 그
                        연속이다. 프레임을 잡는 손은 글을 쓰는 손과 같고, 이미지를 판단하는 눈은
                        이미지를 구성하는 눈과 같다. 카메라가 벤다고 믿는 비평가에게, 카메라를
                        든다는 것은 그 벰에 대한 책임을 받아들이는 일이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 한·중을 잇는 사진 교류 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Wuxi and Suzhou — a photographer across borders'
                    : '무석과 소주 — 국경을 건너는 사진'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 2025 Lee Gwangsu&apos;s work traveled to China twice. At the Taihu Art
                        Museum in Wuxi, his photographs joined the Korea–China International
                        Artists&apos; Plein-air Exhibition; at the Dongshan State Guesthouse Museum
                        in Suzhou, they entered the Korea–China International Artists&apos; Exchange
                        Exhibition. In both cases the works were taken into the museums&apos;
                        collections — a quiet but real measure of how the image had carried across a
                        border.
                      </p>
                      <p>
                        These exchanges are easy to summarize and hard to overvalue. They are not
                        only a line on a résumé; they are the practical form of a belief that runs
                        through all his writing — that a photograph is a language, and that
                        languages are meant to be exchanged. The critic who spent a career arguing
                        that images carry meaning across time was, in Wuxi and Suzhou, watching them
                        carry it across place.
                      </p>
                      <p>
                        It is fitting that a critic of photography should be the one to bridge two
                        traditions of it. Where many exchanges trade in spectacle, Lee brings the
                        habits of close reading: attention to what each image means in its own
                        context before it is asked to mean something between cultures. The bridge he
                        builds is not only between Korea and China, but between the act of seeing
                        and the act of understanding what is seen.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2025년, 이광수의 작품은 두 차례 중국으로 건너갔다. 무석시 태호미술관에서
                        그의 사진은 〈중한예술가국제사생전〉에 함께했고, 소주시 동산국빈관
                        미술관에서는 〈중한예술가국제교류전〉에 들었다. 두 경우 모두 작품은 각
                        미술관의 소장품으로 들어갔다 — 이미지가 국경을 어떻게 건넜는지를 보여 주는,
                        조용하지만 실재하는 척도였다.
                      </p>
                      <p>
                        이 교류는 요약하기 쉽고 과소평가하기 어렵다. 그것은 이력서의 한 줄에 그치지
                        않는다. 그의 모든 글을 관통하는 하나의 믿음의 실천적 형식이다 — 사진은
                        언어이며, 언어는 교환되기 위한 것이라는 믿음. 이미지가 시간을 가로질러
                        의미를 나른다고 평생 주장해 온 비평가는, 무석과 소주에서 그 이미지가 장소를
                        가로질러 의미를 나르는 것을 지켜보았다.
                      </p>
                      <p>
                        사진을 비평하는 사람이 사진의 두 전통을 잇는 다리가 되는 것은 마땅한 일이다.
                        많은 교류가 볼거리를 주고받는 자리에서, 이광수는 정독의 습관을 가져온다 — 한
                        이미지가 문화 사이에서 무엇을 뜻하라고 요청받기 전에, 먼저 그 자신의
                        맥락에서 무엇을 뜻하는가에 대한 주의를. 그가 놓는 다리는 한국과 중국
                        사이만이 아니라, 보는 행위와 본 것을 이해하는 행위 사이에 놓인다.
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
                      From the archives of Indian history to the museum walls of Wuxi and Suzhou,
                      Lee Gwangsu&apos;s work has pursued a single question: what does an image
                      mean, and who decides? The answer, built across criticism and image alike, is
                      a practice in which reading and seeing are one. He joins this campaign not as
                      a subject of its cause but as a fellow artist in solidarity — so that those
                      who come after might keep both the camera and the freedom to question it.
                    </>
                  ) : (
                    <>
                      인도사의 아카이브에서 무석과 소주의 미술관 벽까지, 이광수의 작업은 하나의
                      물음을 추구해 왔다: 이미지는 무엇을 뜻하며, 누가 그것을 결정하는가. 비평과
                      이미지에 두루 걸쳐 구축된 대답은, 읽기와 보기가 하나인 실천이다. 그는 씨앗페에
                      이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음
                      세대의 예술인들이 카메라와, 그 카메라를 향한 물음의 자유를 함께 지킬 수
                      있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Gwangsu</span>
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
                    Lee Gwangsu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이광수 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_GWANGSU_PATH}
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
