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

// 주재환 feature는 작가 페이지(/artworks/artist/주재환)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const JU_JAEHWAN_PATH = `/artworks/artist/${encodeURIComponent('주재환')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const isJuJaehwanArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '주재환' ||
    n === 'ju jaehwan' ||
    n === 'ju jae-hwan' ||
    n.replace(/[\s-]+/g, '') === 'jujaehwan'
  );
};

const PAGE_COPY = {
  ko: {
    title: '주재환 — 현실과 발언의 창립 멤버, 풍자와 콜라주의 작가',
    description:
      '현실과 발언의 창립 멤버 주재환(1940–). 1000원짜리 재료로 권력과 허위를 찌르는 풍자·개념미술가. 40세에 늦깎이로 작가 생활을 시작해, 유머와 날 선 비평을 한 화면에 녹여내는 한국 민중미술 1세대. 주재환의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '현실과 발언의 창립 멤버 주재환. 일상의 재료로 권력의 허위를 찌르는 풍자·개념미술가. 스스로를 "광대형 작가"라 부르며 한국 민중미술 1세대의 이름을 새긴 작가.',
    ogAlt: '주재환 대표 작품',
    twitterTitle: '주재환',
    twitterDescription: '농담처럼, 칼처럼 — 현실과 발언의 창립 멤버 주재환',
    keywords:
      '주재환 화가, 현실과발언, 민중미술, 풍자 콜라주, 개념미술, 1000원 예술, 씨앗페 온라인',
  },
  en: {
    title: 'Ju Jae-hwan — Founding Member of Reality and Utterance, Artist of Satire and Collage',
    description:
      'Selected works by Ju Jae-hwan (b. 1940), founding member of Reality and Utterance (현실과 발언). A satirical and conceptual artist who punctures power and pretension with everyday materials. A late-starter who began making art at 40 and became a first-generation voice of Korean minjung art. View and collect his works at SAF Online.',
    ogDescription:
      'Ju Jae-hwan — founding member of Reality and Utterance. Satirical and conceptual artist who skewers authority with everyday materials. Self-described "clown-type artist" and first-generation minjung art voice.',
    ogAlt: 'Ju Jae-hwan — featured work',
    twitterTitle: 'Ju Jae-hwan',
    twitterDescription: 'Like a joke, like a blade — founding member of Reality and Utterance',
    keywords:
      'Ju Jae-hwan artist, Reality and Utterance, Korean minjung art, satirical collage, conceptual art',
  },
} as const;

export async function buildJuJaehwanMetadata({
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
  const pageUrl = buildLocaleUrl(JU_JAEHWAN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('주재환');
  const artwork = allArtworks.find((a) => isJuJaehwanArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Ju Jae-hwan`
      : `${artwork.title} — 주재환`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JU_JAEHWAN_PATH, locale, true),
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

export default async function JuJaehwanFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JU_JAEHWAN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('주재환');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isJuJaehwanArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Ju Jae-hwan' : '주재환', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JU_JAEHWAN_PATH}#person-ju-jaehwan`,
    name: isEnglish ? 'Ju Jae-hwan' : '주재환',
    alternateName: isEnglish ? '주재환' : 'Ju Jae-hwan',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Ju Jae-hwan (b. 1940) is a founding member of Reality and Utterance (현실과 발언) and a first-generation Korean minjung artist known for satirical collage and conceptual works that puncture power and social pretension with everyday materials.'
      : '주재환(1940–)은 현실과 발언의 창립 멤버이자 한국 민중미술 1세대 작가로, 일상의 재료를 통해 권력과 사회의 허위를 풍자하는 개념미술·콜라주 작업으로 알려져 있습니다.',
    birthDate: '1940',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Seoul (Gyeongseong), South Korea' : '경성부(서울)',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Reality and Utterance (현실과 발언)' : '현실과 발언',
    },
    knowsAbout: ['Korean conceptual art', 'Satirical collage', 'Minjung art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Ju Jae-hwan — SAF Online' : '주재환 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Ju Jae-hwan from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 주재환 작품들을 소개합니다.',
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
        {/* Hero Section — 콜라주·일상 재료 모티프: 비뚤어진 테두리, 찢긴 질감 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 콜라주 모티프 — 대각선과 비정형 패턴 */}
          <div className="absolute top-0 left-0 w-48 h-48 border-l-[8px] border-t-[8px] border-white/10 transform -rotate-3" />
          <div className="absolute bottom-0 right-0 w-48 h-48 border-r-[8px] border-b-[8px] border-white/10 transform rotate-2" />
          <div className="absolute top-1/3 left-6 w-3 h-3 rotate-45 bg-primary opacity-50" />
          <div className="absolute top-1/2 right-10 w-5 h-5 rotate-12 border-2 border-white/20" />
          <div className="absolute bottom-1/3 left-1/4 w-2 h-16 bg-white/5 -rotate-12" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block relative mb-8">
              <span className="relative z-10 inline-block px-6 py-3 border-4 border-white bg-charcoal-deep text-white font-bold text-lg tracking-widest transform rotate-1 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]">
                {isEnglish ? 'Ju Jae-hwan · 1940–' : '주재환 · 1940–'}
              </span>
              <div className="absolute inset-0 border-2 border-primary/60 transform -rotate-1 translate-x-1 translate-y-1 -z-0" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Like a joke,
                  <br />
                  <span className="text-primary-soft">like a blade</span>
                </>
              ) : (
                <>
                  농담처럼,
                  <br />
                  <span className="text-primary-soft">칼처럼</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He arrived at art at forty — and spent the next four decades
                  </span>
                  <span className="mt-2 block">
                    making the world laugh, then flinch, with a thousand-won worth of materials.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">마흔에 시작해서 평생을 웃기며 찔렀다.</span>
                  <span className="mt-2 block">1000원짜리 재료로, 권력의 허위를 향해.</span>
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
                    A late start, a lasting practice —<br />
                    <span className="text-primary-strong">
                      forty years of wit that cuts to the bone
                    </span>
                  </>
                ) : (
                  <>
                    늦은 출발, 긴 실천 —<br />
                    <span className="text-primary-strong">40년의 뼈를 찌르는 유머</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Ju Jae-hwan was born in 1940 in Seoul. He entered Hongik University&apos;s
                      Department of Fine Arts in 1960 but left after a single semester — spending
                      the registration money on art supplies instead. The next two decades were not
                      spent in studios or galleries but in the texture of ordinary Korean life:
                      salesman, street vendor, civil patrol officer, art teacher at a citizens&apos;
                      school, publishing worker. He was, by his own telling, a man who had not yet
                      found his form.
                    </p>
                    <p>
                      The form arrived in 1979. In December of that year, Ju became a{' '}
                      <strong className="font-bold text-charcoal-deep">
                        founding member of 현실과 발언 (Reality and Utterance)
                      </strong>{' '}
                      — a collective of artists and critics who sought to reconnect Korean art with
                      social reality at a moment when the dominant culture of abstraction had
                      largely severed that connection. He participated in the group&apos;s landmark
                      1980 founding exhibition. In a scene defined by gravity, Ju brought something
                      different: wit, parody, and the knowingly absurd. He described himself as the
                      group&apos;s &ldquo;lubricant&rdquo; — the one who kept the atmosphere alive.
                    </p>
                    <p>
                      Through the 1980s he contributed to 현실과 발언 and served the minjung art
                      movement in wider organizational roles — becoming a founding member of
                      민족미술협의회 (the National Artists&apos; Association) in 1985 and co-chair
                      in 1987–88. But his artistic practice developed slowly, on his own terms. It
                      was not until the early 1990s that he committed fully to making art, and not
                      until 2000 — at age sixty — that he held his first solo exhibition, at{' '}
                      <a
                        href="https://artsonje.org/en/exhibition/joo-jae-hwan-look-at-this-mr-funny/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary-strong"
                      >
                        Art Sonje Center
                      </a>
                      : <em>이 유쾌한 씨를 보라</em> (Look at This Mr. Funny).
                    </p>
                    <p>
                      The materials he uses are resolutely everyday — discarded objects, cheap
                      printed matter, the detritus of consumer culture. He calls his practice
                      &ldquo;1,000-won art&rdquo; and himself a &ldquo;clown-type artist.&rdquo; But
                      the clown has always had targets. Whether parodying the Western art canon
                      (「몬드리안 호텔」, 1980), skewering social hierarchy through bodily humor
                      (「계단을 내려오는 봄비」), or turning mass-consumer imagery back on itself
                      (「쇼핑맨」, 「짜장면 배달」), his works are at once instantly accessible and
                      genuinely unsettling.
                    </p>
                    <p>
                      In 2016, the retrospective <em>주재환: 어둠 속의 변신</em> (Ju Jae-hwan:
                      Transformation in Darkness) at Hakgojae Gallery gathered some fifty works
                      spanning his career. In 2021, Seoul Museum of Art presented{' '}
                      <em>호민과 재환</em> (Homin and Jaehwan) — a joint exhibition with his son,
                      the webtoon artist Ju Ho-min — tracing how the instinct for storytelling had
                      passed across a generation, and taken entirely different form. He remains one
                      of the most singular figures in Korean contemporary art: the artist who made
                      seriousness palatable by refusing, for forty years, to be serious about
                      anything at all.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      주재환은 1940년 서울(경성부)에서 태어났다. 1960년 홍익대학교 미술대학에
                      입학했지만 한 학기 만에 그만두었다 — 등록금으로 화구를 샀다고 전해진다. 이후
                      20년은 스튜디오나 갤러리가 아닌 한국 일상의 결 속에서 보냈다: 영업사원, 노점
                      행상, 민방위대원, 시민학교 미술 선생, 출판사 직원. 스스로의 표현을 빌리자면,
                      아직 자기 형식을 찾지 못한 사람이었다.
                    </p>
                    <p>
                      그 형식은 1979년에 찾아왔다. 그해 12월, 주재환은{' '}
                      <strong className="font-bold text-charcoal-deep">
                        현실과 발언의 창립 멤버
                      </strong>
                      가 됐다. 현실과 발언은 추상의 지배 문화가 사회적 현실로부터 한국 미술을
                      단절시키던 시대에, 그 연결을 되찾으려는 작가·비평가 집단이었다. 1980년
                      창립전에 출품하며 그는 무게 잡힌 분위기 속에 전혀 다른 것을 가져왔다: 유머,
                      패러디, 의도된 부조리. 그는 스스로를 모임의 &ldquo;윤활유&rdquo;라 불렀다 —
                      분위기를 살리는 사람.
                    </p>
                    <p>
                      1980년대 내내 현실과 발언 활동을 이어가는 한편, 민중미술 운동의 조직적 역할도
                      맡았다. 1985년 민족미술협의회 창립회원이 됐고 1987–88년에는 공동대표를
                      역임했다. 그러나 작업 자체는 천천히, 자신의 방식대로 전개됐다. 전업 작가의
                      길은 1990년대 초에야 시작됐고, 첫 개인전은 환갑이 된 2000년에야 열렸다 —{' '}
                      <a
                        href="https://artsonje.org/en/exhibition/joo-jae-hwan-look-at-this-mr-funny/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-primary-strong"
                      >
                        아트선재센터
                      </a>
                      에서 열린 《이 유쾌한 씨를 보라》.
                    </p>
                    <p>
                      그가 사용하는 재료는 단호하게 일상적이다 — 버려진 오브제, 싸구려 인쇄물, 소비
                      문화의 잔해. 그는 자신의 작업을 &ldquo;1000원 예술&rdquo;이라 부르고 스스로를
                      &ldquo;광대형 작가&rdquo;라 칭한다. 그러나 광대는 늘 표적이 있었다. 서양 미술
                      정전을 패러디하든(「몬드리안 호텔」, 1980), 신체적 유머로 사회 위계질서를
                      찌르든(「계단을 내려오는 봄비」), 소비사회 이미지를 뒤집어 놓든(「쇼핑맨」,
                      「짜장면 배달」) — 그의 작품은 즉각 접근 가능하면서도 진짜로 불편하다.
                    </p>
                    <p>
                      2016년 학고재갤러리 회고전 《주재환: 어둠 속의 변신》은 50여 점을 한데 모아
                      경력 전반을 조망했다. 2021년 서울시립미술관은 아들인 웹툰 작가 주호민과의
                      2인전 《호민과 재환》을 선보였다 — 이야기꾼의 본능이 세대를 건너 어떻게 전혀
                      다른 형식으로 재탄생했는지를 추적한 전시. 주재환은 한국 현대미술에서 가장
                      독보적인 인물 중 하나로 남는다: 40년 동안 아무것도 진지하게 취급하기를
                      거부함으로써 진지한 것들을 견딜 수 있게 만든 작가.
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
                        {isEnglish ? '1,000-won art' : '1000원 예술'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Everyday found objects and discarded materials become art. The low cost is the point: critique can be made from anything, by anyone.'
                          : '버려진 오브제와 일상의 재료가 예술이 된다. 싸구려라는 것 자체가 요점 — 비평은 어떤 재료로도, 누구든 만들 수 있다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Satire and parody' : '풍자와 패러디'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From the Western art canon to military power to consumer culture — his targets are taken apart through humor, not polemic.'
                          : '서양 정전부터 군사 권력, 소비문화까지 — 그의 표적들은 논쟁이 아닌 유머로 해체된다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The clown who cuts' : '찌르는 광대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Self-described as a "clown-type artist": the joke is the vehicle, not the destination. The laughter lands, then something sharper follows.'
                          : '스스로를 "광대형 작가"라 부른다: 농담은 수단이지 목적이 아니다. 웃음이 착지하고, 그 다음 더 날카로운 것이 온다.'}
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
                      1940
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Seoul (Gyeongseong). Family registry records 1941-01-01.'
                        : '경성부(서울) 출생. 호적 등재는 1941년 1월 1일.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1960
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Enters Hongik University, Dept. of Fine Arts; leaves after one semester.'
                        : '홍익대학교 미술대학 입학; 한 학기 만에 중퇴.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1961–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works as salesman, street vendor, civil patrol officer, art teacher, publishing worker — two decades outside art.'
                        : '영업사원, 노점 행상, 민방위대원, 시민학교 미술 교사, 출판사 직원 등 다양한 직업을 전전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1979
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Becomes a founding member of 현실과 발언 (Reality and Utterance), December.'
                        : '현실과 발언 창립 멤버 참여 (12월).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1980
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in 현실과 발언 founding exhibition; 「몬드리안 호텔」 produced.'
                        : '현실과 발언 창립전 출품; 「몬드리안 호텔」 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Founding member of 민족미술협의회 (National Artists&apos; Association); co-chair 1987–88.'
                        : '민족미술협의회 창립회원; 1987–88년 공동대표 역임.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          First solo exhibition{' '}
                          <a
                            href="https://artsonje.org/en/exhibition/joo-jae-hwan-look-at-this-mr-funny/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《이 유쾌한 씨를 보라》
                          </a>{' '}
                          at Art Sonje Center, age 60.
                        </>
                      ) : (
                        <>
                          <a
                            href="https://artsonje.org/en/exhibition/joo-jae-hwan-look-at-this-mr-funny/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《이 유쾌한 씨를 보라》
                          </a>
                          , 아트선재센터 첫 개인전 (환갑).
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Reportedly receives the 10th 민족예술인상 (National Artists Award).'
                        : '제10회 민족예술인상 수상으로 알려짐.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Retrospective 《주재환: 어둠 속의 변신》 (Transformation in Darkness), Hakgojae Gallery — ~50 works.'
                        : '회고전 《주재환: 어둠 속의 변신》, 학고재갤러리 — 약 50점.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《호민과 재환》 (Homin and Jaehwan), Seoul Museum of Art — joint exhibition with son, webtoon artist Ju Ho-min (May–Aug).'
                        : '《호민과 재환》, 서울시립미술관 — 아들 웹툰 작가 주호민과의 2인전 (5–8월).'}
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
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          <a
                            href="https://artsonje.org/en/exhibition/joo-jae-hwan-look-at-this-mr-funny/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《이 유쾌한 씨를 보라》
                          </a>
                          , Art Sonje Center (2000) — first solo exhibition; Art Sonje Center
                          collection: 「몬드리안 호텔」, 「계단을 내려오는 봄비」, 「복사실패」,
                          「칼 맑스」
                        </>
                      ) : (
                        <>
                          <a
                            href="https://artsonje.org/en/exhibition/joo-jae-hwan-look-at-this-mr-funny/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《이 유쾌한 씨를 보라》
                          </a>
                          , 아트선재센터 (2000) — 첫 개인전; 아트선재센터 소장: 「몬드리안 호텔」,
                          「계단을 내려오는 봄비」, 「복사실패」, 「칼 맑스」
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《주재환: 어둠 속의 변신》 (Transformation in Darkness), Hakgojae Gallery (2016) — ~50-work retrospective'
                        : '《주재환: 어둠 속의 변신》, 학고재갤러리 (2016) — 약 50점의 회고전'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Joint exhibition{' '}
                          <a
                            href="https://sema.seoul.go.kr/ex/exDetail?searchDateType=SOON&exNo=572825&glolangType=KOR"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《호민과 재환》
                          </a>
                          , Seoul Museum of Art (2021, May–Aug)
                        </>
                      ) : (
                        <>
                          2인전{' '}
                          <a
                            href="https://sema.seoul.go.kr/ex/exDetail?searchDateType=SOON&exNo=572825&glolangType=KOR"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《호민과 재환》
                          </a>
                          , 서울시립미술관 (2021년 5–8월)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '10th 민족예술인상 (National Artists Award), 2001 (per artist CV)'
                        : '제10회 민족예술인상 (2001, 작가 약력 기준)'}
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
                  <span className="text-charcoal-deep">on the joke that stays sharp</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —<br />
                  <span className="text-charcoal-deep">날이 무뎌지지 않는 농담에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 현실과 발언 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '현실과 발언 — the collective that reconnected Korean art with the world'
                    : '현실과 발언 — 한국 미술을 세계와 다시 잇다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When 현실과 발언 (Reality and Utterance) was founded in December 1979,
                        Korean art was dominated by a culture of abstraction that had largely
                        insulated itself from the social upheavals of the era. The group — bringing
                        together artists and critics who believed art had a responsibility to engage
                        with political and everyday reality — held its landmark founding exhibition
                        in 1980. It became one of the defining moments in the history of Korean
                        minjung art.
                      </p>
                      <p>
                        Ju Jae-hwan was among the founding members. He came to the collective not as
                        a trained painter with an established practice, but as a man who had spent
                        two decades in ordinary Korean life — who had worked as a salesman, a street
                        vendor, a civil patrol officer. He brought, accordingly, a sensibility
                        grounded in the texture of daily existence rather than the conventions of
                        studio art. Within the collective, he served as what he called the
                        &ldquo;lubricant&rdquo; — the figure who kept the atmosphere of the group
                        alive, who made it possible for serious people to continue working together.
                        The role suited his temperament and his method: comedy as a form of
                        solidarity.
                      </p>
                      <p>
                        현실과 발언 remained active through the 1980s, and Ju continued alongside
                        it. When 민족미술협의회 was founded in 1985 as the broader organizational
                        expression of the minjung art movement, he was a founding member there too —
                        and served as co-chair in 1987–88. The institutional commitments were real,
                        but they did not define his practice. What defined his practice was the
                        specific quality of attention he brought to everyday life: an eye that
                        found, in the cheapest materials and the most familiar objects, the precise
                        image needed to make a point.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1979년 12월 현실과 발언이 창립될 때, 한국 미술계는 사회적 격변과 스스로를
                        격리시킨 추상의 문화가 지배하고 있었다. 미술이 정치적·일상적 현실과 관계
                        맺어야 한다고 믿는 작가·비평가들이 모인 이 집단은, 1980년 창립전을 열었다.
                        그것은 한국 민중미술사의 결정적 순간 중 하나가 됐다.
                      </p>
                      <p>
                        주재환은 창립 멤버였다. 그는 확립된 작업을 가진 훈련된 화가로서가 아니라,
                        20년을 한국 일상 속에서 보낸 사람으로 이 집단에 들어왔다 — 영업사원, 노점
                        행상, 민방위대원이었던 사람. 그는 그에 걸맞은 감수성을 가져왔다: 스튜디오
                        미술의 관행이 아닌, 일상의 결에 뿌리를 둔 감각. 집단 안에서 그가 맡은 역할은
                        스스로 &ldquo;윤활유&rdquo;라 부른 것이었다 — 분위기를 살려 진지한 사람들이
                        계속 함께 일할 수 있게 하는 인물. 그 역할은 그의 기질과 방법론에 잘 맞았다:
                        연대의 한 형식으로서의 유머.
                      </p>
                      <p>
                        현실과 발언은 1980년대 내내 활동했고 주재환도 함께했다. 1985년 민중미술
                        운동의 보다 넓은 조직적 표현으로 민족미술협의회가 창립됐을 때, 그는 거기서도
                        창립회원이 됐고 1987–88년에는 공동대표를 역임했다. 제도적 헌신은
                        실질적이었지만, 그것이 그의 실천을 정의하지는 않았다. 그의 실천을 정의한
                        것은, 일상에 대한 그 특유의 주의력이었다: 가장 싸구려 재료와 가장 익숙한
                        오브제 안에서 정확히 필요한 이미지를 찾아내는 눈.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 농담의 정치학 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The politics of the joke — satire, parody, and the art canon'
                    : '농담의 정치학 — 풍자, 패러디, 그리고 미술 정전'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        「몬드리안 호텔」 (Mondrian Hotel), produced in 1980, is one of Ju
                        Jae-hwan&apos;s earliest and most cited works. It takes the grid system of
                        Piet Mondrian — the canonical language of Western geometric abstraction —
                        and turns it into a hotel room: a space not of pure vision but of commercial
                        transaction, leisure, and the mundane. The move is characteristically
                        economical. Rather than delivering a polemic about the dominance of Western
                        formalism in Korean art, it offers an image — and lets the image do the work
                        of argument.
                      </p>
                      <p>
                        「계단을 내려오는 봄비」 (Spring Rain Descending the Stairs) performs a
                        similar operation on Marcel Duchamp&apos;s canonical{' '}
                        <em>Nude Descending a Staircase</em>. Duchamp represented the motion of a
                        body through the staircase by multiplying its geometric traces; Ju replaces
                        the body with the stream of urine moving downstairs. The substitution is
                        deliberately scatological and deliberately funny — and it makes a point
                        about social hierarchy and the power relations embedded in the very
                        architecture of staircases that the formal language of Duchamp&apos;s
                        original does not touch. The bodily replaces the canonical; the low replaces
                        the elevated. The joke is the argument.
                      </p>
                      <p>
                        Across his career, Ju has applied the same method to the imagery of consumer
                        culture — 「쇼핑맨」 (Shopping Man), 「짜장면 배달」 (Jajangmyeon Delivery),
                        「미제점 송가」 (Ode to the American Goods Store). The materials are the
                        materials of the world he actually inhabits; the humor is not decorative but
                        structural. He calls it &ldquo;1,000-won art&rdquo; — a name that is itself
                        a critique of the mythology of artistic preciousness. Anyone can afford a
                        thousand won. That is the point.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        「몬드리안 호텔」(1980)은 주재환의 가장 초기이자 가장 많이 언급되는 작품 중
                        하나다. 피에트 몬드리안의 격자 시스템 — 서양 기하학적 추상의 정전적 언어 —
                        을 호텔 방으로 전환한다: 순수한 시각의 공간이 아닌 상업적 거래, 여가, 일상의
                        공간으로. 이 제스처는 특유의 경제성을 갖는다. 한국 미술에서 서양 형식주의의
                        지배에 대한 논쟁을 전달하는 대신, 이미지를 제시하고 — 그 이미지가 논증의
                        일을 하도록 한다.
                      </p>
                      <p>
                        「계단을 내려오는 봄비」는 마르셀 뒤샹의 정전적인 《계단을 내려오는 누드》에
                        같은 조작을 수행한다. 뒤샹은 기하학적 흔적을 증식함으로써 계단을 내려오는
                        신체의 운동을 표현했다; 주재환은 그 신체를 계단을 흘러내려가는 오줌 줄기로
                        대체한다. 대체는 의도적으로 배설물적이고 의도적으로 웃기다 — 그리고
                        계단이라는 건축의 사회적 위계질서와 권력 관계에 대해, 뒤샹 원본의 형식
                        언어가 닿지 않는 지점을 찌른다. 신체적인 것이 정전적인 것을 대체하고, 낮은
                        것이 고상한 것을 대체한다. 농담이 논증이다.
                      </p>
                      <p>
                        경력 전반에 걸쳐 주재환은 같은 방법을 소비문화의 이미지에 적용해왔다 —
                        「쇼핑맨」, 「짜장면 배달」, 「미제점 송가」. 재료는 그가 실제로 살고 있는
                        세계의 재료다; 유머는 장식적이 아니라 구조적이다. 그는 이를 &ldquo;1000원
                        예술&rdquo;이라 부른다 — 그 자체가 예술적 희소성의 신화를 비판하는 이름.
                        누구나 1000원을 낼 수 있다. 그것이 요점이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 일상의 재료로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From everyday materials — the late start as a resource'
                    : '일상의 재료로 — 늦은 출발이 자원이 되다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        There is something worth examining in the shape of Ju Jae-hwan&apos;s
                        career. He did not come to art from within the institution of art. He left
                        Hongik University after a single semester; he spent two decades in jobs that
                        had nothing to do with galleries or exhibitions; he held his first solo show
                        at sixty. That trajectory is not incidental to his practice — it is the
                        practice.
                      </p>
                      <p>
                        An artist who has worked as a salesman, a street vendor, a civil patrol
                        officer, a publishing worker knows the texture of Korean commercial and
                        social life from the inside. The consumer culture he parodies — the
                        &ldquo;American goods store,&rdquo; the jajangmyeon delivery, the shopping
                        man — is not observed from a distance but remembered from within. The
                        cheapness of his materials is not a provocation directed at the art world;
                        it is fidelity to the world he actually inhabited before the art world had
                        any claim on him.
                      </p>
                      <p>
                        The late solo debut — sixty years old, a first exhibition — has its own
                        quality. It suggests an artist uninterested in career management, in the
                        accumulation of institutional prestige. The 2000 exhibition at Art Sonje
                        Center, titled <em>이 유쾌한 씨를 보라</em> (Look at This Mr. Funny),
                        announced a sensibility rather than a retrospective: here is this amusing
                        fellow, take a look. The following two decades sustained that sensibility —
                        culminating in the 2021 joint exhibition with his son at Seoul Museum of
                        Art, where the instinct for storytelling proved to be the most lasting
                        inheritance of all. He calls himself a clown-type artist, and clowns,
                        historically, have always been the ones who tell the king what no one else
                        dares to say.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        주재환의 경력 형태에는 살펴볼 만한 것이 있다. 그는 미술의 제도 안에서 미술로
                        온 것이 아니었다. 홍익대학교를 한 학기 만에 떠났고; 갤러리나 전시와 무관한
                        직업들로 20년을 보냈고; 60세에 첫 개인전을 열었다. 그 궤적은 그의 실천에
                        부수적인 것이 아니다 — 그것이 실천이다.
                      </p>
                      <p>
                        영업사원, 노점 행상, 민방위대원, 출판사 직원으로 일한 작가는 한국
                        상업·사회적 삶의 결을 내부에서 안다. 그가 패러디하는 소비문화 —
                        &ldquo;미제점&rdquo;, 짜장면 배달, 쇼핑맨 — 는 거리를 두고 관찰된 것이
                        아니라 내부에서 기억된 것이다. 재료의 싸구려함은 미술계를 향한 도발이
                        아니다; 미술계가 그에게 어떤 권리도 갖기 전에 그가 실제로 살았던 세계에 대한
                        충실함이다.
                      </p>
                      <p>
                        60세에 열린 늦은 첫 개인전은 그 자체의 품격이 있다. 경력 관리나 제도적
                        명성의 축적에 관심 없는 작가를 보여준다. 2000년 아트선재센터에서 열린 《이
                        유쾌한 씨를 보라》는 회고전이 아닌 감수성의 선언이었다: 이 유쾌한 씨를 보라.
                        이후 20년은 그 감수성을 유지했고 — 2021년 서울시립미술관에서 아들과 함께한
                        전시로 정점을 맺었다. 거기서 이야기꾼의 본능이 가장 지속적인 유산임이
                        증명됐다. 그는 스스로를 광대형 작가라 부른다. 광대는, 역사적으로, 언제나
                        왕에게 아무도 감히 하지 못하는 말을 하는 사람이었다.
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
                      From the founding exhibition of 현실과 발언 in 1980 to the Seoul Museum of Art
                      in 2021, Ju Jae-hwan&apos;s practice has pursued a single question: what
                      happens when you take the cheapest materials, the most familiar objects, and
                      the most accessible humor — and use them to say the thing that costs
                      everything? The answer, built across forty years, is one of the most singular
                      acts in Korean contemporary art. He joins this campaign not as a subject of
                      its cause but as a fellow artist in solidarity — so that those who come after
                      might work without the weight he has carried.
                    </>
                  ) : (
                    <>
                      1980년 현실과 발언 창립전에서 2021년 서울시립미술관까지, 주재환의 실천은
                      하나의 물음을 추구해왔다: 가장 싸구려 재료와 가장 익숙한 오브제, 가장 접근하기
                      쉬운 유머를 가져다 — 모든 것이 걸린 말을 하는 데 쓰면 어떤 일이 일어나는가.
                      40년에 걸쳐 구축된 그 대답은 한국 현대미술에서 가장 독보적인 실천 중 하나다.
                      그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                      함께한다 — 다음 세대의 예술인들이 그가 짊어진 무게 없이 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Ju Jae-hwan</span>
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
                    Ju Jae-hwan joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    주재환 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JU_JAEHWAN_PATH}
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
