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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/이은화)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_EUNHWA_PATH = `/artworks/artist/${encodeURIComponent('이은화')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeEunhwaArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이은화' ||
    n === 'lee eun-hwa' ||
    n === 'lee eunhwa' ||
    n.replace(/[\s-]+/g, '') === 'leeeunhwa'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이은화 — 감정의 에스페란토, 문자·기호·욕망의 도시',
    description:
      '회화·설치·뉴미디어·출판을 넘나드는 중견 아티스트이자 미술 저술가 이은화. 문자와 기호, 도시민의 욕망과 정체성을 탐구하며 「감정의 에스페란토」 연작과 「Moneyscape」·「욕망의 방」을 펼쳐온 전방위 작가. 영국 소더비 인스티튜트 석사 출신 작가의 작업을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '이은화 — 감정의 에스페란토. 문자·기호와 도시민의 욕망을 가로지르며 회화·설치·뉴미디어·출판을 넘나드는 전방위 중견 아티스트.',
    ogAlt: '이은화 대표 작품',
    twitterTitle: '이은화',
    twitterDescription: '문자와 기호로 번역하는 도시의 욕망 — 감정의 에스페란토, 이은화',
    keywords:
      '이은화 작가, 감정의 에스페란토, Moneyscape, 욕망의 방, 뉴미디어, 미술 저술가, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Eun-hwa — Emotional Esperanto: A City of Letters, Signs, and Desire',
    description:
      'Selected works by Lee Eun-hwa, a mid-career artist and art writer who moves freely across painting, installation, new media, and publishing. Exploring letters and signs, the desires and identities of the urban dweller, she has unfolded the Emotional Esperanto series alongside Moneyscape and The Room of Desire. A graduate of the Sotheby&apos;s Institute of Art in London. View and collect her works at SAF Online.',
    ogDescription:
      'Lee Eun-hwa — Emotional Esperanto. A boundary-crossing mid-career artist working across painting, installation, new media, and publishing, mapping the desires of the urban dweller through letters and signs.',
    ogAlt: 'Lee Eun-hwa — featured work',
    twitterTitle: 'Lee Eun-hwa',
    twitterDescription:
      'Translating the desires of the city through letters and signs — Emotional Esperanto, Lee Eun-hwa',
    keywords:
      'Lee Eun-hwa artist, Emotional Esperanto, Moneyscape, The Room of Desire, new media, art writer, SAF Online',
  },
} as const;

export async function buildLeeEunhwaMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_EUNHWA_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이은화');
  const artwork = allArtworks.find((a) => isLeeEunhwaArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Eun-hwa`
      : `${artwork.title} — 이은화`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_EUNHWA_PATH, locale, true),
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

export default async function LeeEunhwaFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_EUNHWA_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이은화');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeEunhwaArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Eun-hwa' : '이은화', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_EUNHWA_PATH}#person-lee-eunhwa`,
    name: isEnglish ? 'Lee Eun-hwa' : '이은화',
    alternateName: isEnglish ? '이은화' : 'Lee Eun-hwa',
    jobTitle: isEnglish ? 'Artist · Art Writer' : '아티스트 · 미술 저술가',
    description: isEnglish
      ? 'Lee Eun-hwa is a mid-career Korean artist and art writer who moves across painting, installation, new media, and publishing, exploring letters and signs and the desires and identities of the urban dweller.'
      : '이은화는 회화·설치·뉴미디어·출판을 넘나들며 문자와 기호, 도시민의 욕망과 정체성을 탐구해 온 중견 아티스트이자 미술 저술가입니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'Sotheby’s Institute of Art, London' : '런던 소더비 인스티튜트 오브 아트',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'University of the Arts London' : '런던 예술대학교',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish ? 'University of Manchester' : '맨체스터 대학교',
      },
    ],
    knowsAbout: [
      'Contemporary art',
      'New media art',
      'Art writing',
      'Painting',
      'Installation art',
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
    name: isEnglish ? 'Lee Eun-hwa — SAF Online' : '이은화 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Eun-hwa from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이은화 작품들을 소개합니다.',
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

          {/* Sign/letter strata — 문자·기호의 도시 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish
                  ? 'Lee Eun-hwa · Artist & Art Writer'
                  : '이은화 · 아티스트 · 미술 저술가'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Letters and signs,
                  <br />
                  <span className="text-primary-soft">an Esperanto of emotion</span>
                </>
              ) : (
                <>
                  문자와 기호,
                  <br />
                  <span className="text-primary-soft">감정의 에스페란토</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Painting, installation, new media, publishing — all at once.
                  </span>
                  <span className="mt-2 block">
                    She maps the desires and identities of the urban dweller.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">회화·설치·뉴미디어·출판을 한 몸으로 넘나든다.</span>
                  <span className="mt-2 block">도시민의 욕망과 정체성을 지도로 그려낸다.</span>
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
                    A common language —<br />
                    <span className="text-primary-strong">letters, signs, and desire</span>
                  </>
                ) : (
                  <>
                    하나의 공통어 —<br />
                    <span className="text-primary-strong">문자, 기호, 그리고 욕망</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Eun-hwa is a mid-career artist who moves freely across painting,
                      installation, new media, and publishing — a boundary-crossing practitioner
                      and, at the same time, an art writer. Since the early 2000s she has explored
                      letters and signs, the desires and identities of the urban dweller, and the
                      workings of human emotion and psychology.
                    </p>
                    <p>
                      Her education was built across the United Kingdom. After a diploma in graphic
                      design from Cavendish College in 2000, she earned a master&apos;s in Fine Art
                      (Painting) from the University of the Arts London in 2001, a master&apos;s in
                      contemporary art from the Sotheby&apos;s Institute of Art in London in 2002,
                      and completed doctoral coursework in art history at the University of
                      Manchester in 2009. That trajectory — from making to writing, from studio to
                      scholarship — runs through her work like a watermark.
                    </p>
                    <p>
                      The 〈Emotional Esperanto〉 project, which she has carried since the
                      mid-2000s, names her central question. If Esperanto was a language designed to
                      be shared across borders, Lee imagines a common visual language for emotion —
                      built from{' '}
                      <strong className="font-bold text-charcoal">letters and signs</strong> rather
                      than words. From <em>Emotional Esperanto</em> (Artspace Mieum, 2004) through{' '}
                      <em>Digilog</em> (2016) and <em>Monoticon</em> (2017), the series develops a
                      grammar in which feeling becomes legible as form.
                    </p>
                    <p>
                      In the 2020s her gaze turned more sharply toward the city and its appetites.{' '}
                      <em>Moneyscape</em> (Coffee Esperanto, Seoul, 2022) and 〈The Room of Desire〉
                      (Young Eun Museum&apos;s Y.Park annex / Haslla branch, Yeongwol, 2023) read
                      the contemporary metropolis as a landscape of desire — where money, longing,
                      and identity overlap. Her 2024 project <em>Tell Me The Story</em> (Art Space
                      J_Cube1, Seongnam) bound painting, record, and moving image into a single
                      work, and in 2025 〈A Room of Hospitality: Welcome VIP〉 (a special
                      invitational at the 12th Gyeongnam International Art Fair, CECO, Changwon) was
                      completed only through the participation of its audience.
                    </p>
                    <p>
                      Across nine solo exhibitions and group shows at the Seoul Museum of Art, the
                      National Museum of Modern and Contemporary Art, the Busan Museum of Art, and
                      Sungkok Art Museum, Lee has consistently developed{' '}
                      <strong className="font-bold text-charcoal-deep">
                        new formats that fuse art with other fields
                      </strong>
                      . Alongside her practice she writes widely on art — books such as{' '}
                      <em>Paintings with a Story</em>, <em>The Room of Paintings</em>,{' '}
                      <em>A Journey to Nordic Art Museums</em>, and{' '}
                      <em>The Minimum 100 Artworks for Today&apos;s Grown-ups</em> — giving her work
                      a second axis as a chronicler of art itself.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이은화는 회화·설치·뉴미디어·출판을 자유롭게 넘나드는 중견 아티스트이자, 동시에
                      미술 저술가다. 2000년대 초반부터 그는 문자와 기호, 도시민의 욕망과 정체성,
                      그리고 인간의 감정·심리의 작동 방식을 탐구해 왔다.
                    </p>
                    <p>
                      그의 학력은 영국에서 쌓였다. 2000년 캐빈디시 칼리지에서 그래픽디자인
                      디플로마를 받은 뒤, 2001년 런던 예술대학교에서 순수미술(회화 전공) 석사를,
                      2002년 런던 소더비 인스티튜트 오브 아트에서 현대미술학 석사를 취득했고, 2009년
                      영국 맨체스터 대학원 미술사학과 박사를 수료했다. 만드는 일에서 쓰는 일로,
                      스튜디오에서 학문으로 이어지는 그 궤적은 그의 작업에 워터마크처럼 새겨져 있다.
                    </p>
                    <p>
                      2000년대 중반부터 이어 온 「감정의 에스페란토」 프로젝트는 그의 핵심 질문을
                      가리킨다. 에스페란토가 국경을 넘어 공유되도록 설계된 언어였다면, 이은화는
                      감정을 위한 공통의 시각 언어를 상상한다 — 낱말이 아니라{' '}
                      <strong className="font-bold text-charcoal">문자와 기호</strong>로 짜인
                      언어를. 「Emotional Esperanto」(아트스페이스 미음, 2004)에서{' '}
                      「Digilog」(2016), 「Monoticon」(2017)으로 이어지며, 이 연작은 감정이 형식으로
                      읽히는 문법을 쌓아 간다.
                    </p>
                    <p>
                      2020년대에 들어 그의 시선은 도시와 그 욕망으로 더 날카롭게 향했다.{' '}
                      「Moneyscape」(커피에스페란토, 서울, 2022)와 「욕망의 방」(젊은달
                      와이파크/하슬라 미술관 분관, 영월, 2023)은 동시대 메트로폴리스를 욕망의
                      풍경으로 읽어낸다 — 돈과 갈망과 정체성이 겹쳐지는 곳으로. 2024년 프로젝트{' '}
                      「Tell Me The Story」(아트스페이스 J_Cube1, 성남)는 회화·기록·영상을 하나의
                      작업으로 묶었고, 2025년 「환대의 방: 웰컴 VIP」(제12회 경남국제아트페어 특별
                      초대전, 창원컨벤션센터 CECO)는 관객의 참여로 비로소 완성되었다.
                    </p>
                    <p>
                      9회의 개인전과 서울시립미술관·국립현대미술관·부산시립미술관·성곡미술관 등의
                      기획전을 거치며, 이은화는 꾸준히{' '}
                      <strong className="font-bold text-charcoal-deep">
                        미술과 타 분야를 융합한 새로운 형식
                      </strong>
                      을 개발해 왔다. 작업과 나란히 그는 미술에 관해 폭넓게 쓴다 — 《사연 있는
                      그림》, 《그림의 방》, 《북유럽 미술관 여행》, 《요즘 어른을 위한 최소한의
                      미술100》 같은 저서들이 미술의 기록자로서의 또 다른 축을 이룬다.
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
                        {isEnglish ? 'Emotional Esperanto' : '감정의 에스페란토'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A common visual language for feeling, built from letters and signs rather than words — emotion made legible as form.'
                          : '낱말이 아니라 문자와 기호로 짜인, 감정을 위한 공통의 시각 언어. 감정이 형식으로 읽힌다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The city of desire' : '욕망의 도시'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Moneyscape and 〈The Room of Desire〉 read the contemporary metropolis as a landscape where money, longing, and identity overlap.'
                          : '「Moneyscape」와 「욕망의 방」은 동시대 메트로폴리스를 돈·갈망·정체성이 겹쳐지는 풍경으로 읽는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Across media, and into writing' : '매체를 넘어, 글로'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Painting, installation, new media, and publishing fuse into new formats — and her art writing forms a second axis to the practice.'
                          : '회화·설치·뉴미디어·출판이 새로운 형식으로 융합된다. 미술 저술은 작업의 또 다른 축이다.'}
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
                      2000
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Diploma in graphic design, Cavendish College, UK.'
                        : '영국 캐빈디시 칼리지 그래픽디자인 디플로마.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MA in Fine Art (Painting), University of the Arts London.'
                        : '런던 예술대학교 순수미술(회화 전공) 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MA in Contemporary Art, Sotheby’s Institute of Art, London.'
                        : '런던 소더비 인스티튜트 오브 아트 현대미술학 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Emotional Esperanto〉, Artspace Mieum.'
                        : '개인전 「Emotional Esperanto」, 아트스페이스 미음.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2009
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Completes doctoral coursework in art history, University of Manchester, UK.'
                        : '영국 맨체스터 대학원 미술사학과 박사 수료.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Digilog — Emotional Esperanto〉.'
                        : '개인전 「Digilog-감정의 에스페란토」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Monoticon — Emotional Esperanto〉.'
                        : '개인전 「Monoticon-감정의 에스페란토」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Moneyscape〉, Coffee Esperanto, Seoul.'
                        : '개인전 「Moneyscape」, 커피에스페란토, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Room of Desire〉, Young Eun Museum Y.Park / Haslla annex, Yeongwol.'
                        : '「욕망의 방」, 젊은달 와이파크/하슬라 미술관 분관, 영월.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Tell Me The Story〉, Art Space J_Cube1, Seongnam — supported by the Seongnam Cultural Foundation.'
                        : '「Tell Me The Story」, 아트스페이스 J_Cube1, 성남 — 성남문화재단 지원.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈A Room of Hospitality: Welcome VIP〉, special invitational at the 12th Gyeongnam International Art Fair, CECO, Changwon.'
                        : '「환대의 방: 웰컴 VIP」, 제12회 경남국제아트페어 특별 초대전, 창원컨벤션센터 CECO.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish
                    ? 'Selected exhibitions, writing & collections'
                    : '주요 전시·저서·소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions at the Seoul Museum of Art, the National Museum of Modern and Contemporary Art, the Busan Museum of Art, and Sungkok Art Museum.'
                        : '서울시립미술관·국립현대미술관·부산시립미술관·성곡미술관 등 기획전 참가.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Metropolis of Desire〉, Busan Museum of Art (2016–17); the 3rd Sector of the Gwangju Biennale (2006); 〈Portfolio 2005〉, Seoul Museum of Art (2005); 〈Party〉, Sungkok Art Museum (2005).'
                        : '「욕망의 메트로폴리스」, 부산시립미술관(2016~17); 광주비엔날레 제3섹터(2006); 「포트폴리오 2005」, 서울시립미술관(2005); 「파티」전, 성곡미술관(2005).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition Nihon Shingen-ten, Tokyo Metropolitan Art Museum (2025).'
                        : '일본신원전, 도쿄도미술관(2025).'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Books: <em>Paintings with a Story</em>, <em>The Room of Paintings</em>,{' '}
                          <em>A Journey to Nordic Art Museums</em>,{' '}
                          <em>The Minimum 100 Artworks for Today&apos;s Grown-ups</em>, and more.
                        </>
                      ) : (
                        <>
                          저서: 《사연 있는 그림》, 《그림의 방》, 《북유럽 미술관 여행》, 《요즘
                          어른을 위한 최소한의 미술100》 등 다수.
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Haslla Art World, Artbooks Co., Ltd., and others.'
                        : '소장: 하슬라미술관, ㈜아트북스 등.'}
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
                  <span className="text-charcoal-deep">on a language for feeling</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">감정을 위한 언어에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 감정의 에스페란토 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Emotional Esperanto — a grammar for feeling'
                    : '감정의 에스페란토 — 감정을 위한 문법'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Esperanto was invented as a neutral, shared language — a tongue belonging to
                        no nation, designed so that strangers might understand one another. Lee
                        Eun-hwa borrows that ambition and turns it toward emotion. Her recurring
                        project 〈Emotional Esperanto〉 asks whether feeling, too, could have a
                        common language: not words, but{' '}
                        <strong className="font-bold text-charcoal-deep">letters and signs</strong>{' '}
                        arranged into a visual grammar.
                      </p>
                      <p>
                        The series unfolds across a decade. <em>Emotional Esperanto</em> at Artspace
                        Mieum (2004) sets the premise; <em>Digilog</em> (2016) folds the digital and
                        the analog into one another; <em>Monoticon</em> (2017) compresses emotion
                        into an icon-like sign. In each, the work treats feeling not as something
                        ineffable but as something that can be encoded — and therefore shared.
                      </p>
                      <p>
                        What holds the series together is a writer&apos;s instinct toward
                        legibility. Lee does not paint emotion as expression; she sets it down as a
                        system, a set of marks a viewer can learn to read. The result is a body of
                        work that sits between picture and text — fitting, for an artist who is also
                        a writer about art.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        에스페란토는 중립적이고 공유 가능한 언어로 고안되었다 — 어느 나라에도 속하지
                        않는, 낯선 이들이 서로를 이해할 수 있도록 설계된 말. 이은화는 그 야심을 빌려
                        감정으로 향한다. 거듭 이어지는 「감정의 에스페란토」 프로젝트는 감정에도
                        공통의 언어가 있을 수 있는지 묻는다 — 낱말이 아니라,{' '}
                        <strong className="font-bold text-charcoal-deep">문자와 기호</strong>가
                        시각적 문법으로 배열된 언어를.
                      </p>
                      <p>
                        연작은 십여 년에 걸쳐 펼쳐진다. 아트스페이스 미음의 「Emotional
                        Esperanto」(2004)가 전제를 세우고, 「Digilog」(2016)는 디지털과 아날로그를
                        서로 접어 넣으며, 「Monoticon」(2017)은 감정을 아이콘 같은 기호로 압축한다.
                        각각의 작업에서 감정은 형언할 수 없는 무엇이 아니라, 부호화될 수 있는 것 —
                        그래서 공유될 수 있는 것으로 다루어진다.
                      </p>
                      <p>
                        이 연작을 하나로 묶는 것은 가독성을 향한 저술가의 본능이다. 이은화는 감정을
                        표현으로 그리지 않는다. 그는 감정을 하나의 체계로, 관객이 읽는 법을 배울 수
                        있는 부호의 집합으로 내려놓는다. 그 결과는 그림과 텍스트 사이에 놓인
                        작업이다 — 미술에 관해 글을 쓰는 작가에게 어울리는 자리에서.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 욕망의 도시 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Moneyscape and the room of desire — reading the city'
                    : '「Moneyscape」와 욕망의 방 — 도시를 읽다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the 2020s Lee&apos;s subject sharpens into the city and its appetites.{' '}
                        <em>Moneyscape</em> (Coffee Esperanto, Seoul, 2022) takes money itself as
                        landscape — the contemporary metropolis seen as terrain shaped by capital,
                        where value and longing are inseparable.
                      </p>
                      <p>
                        〈The Room of Desire〉 (Young Eun Museum&apos;s Y.Park / Haslla branch,
                        Yeongwol, 2023) builds an interior for that longing. Desire, here, is not a
                        moral failing but a structuring force of urban life — the engine of the
                        identities city dwellers assemble for themselves. The exhibition reads the
                        metropolis as a place where money, want, and selfhood overlap and blur.
                      </p>
                      <p>
                        These projects extend the logic of the Esperanto series outward, from the
                        private grammar of feeling to the public grammar of the city. If emotion can
                        be encoded, so can desire — and the encoded city becomes a text the artist
                        invites us to read alongside her.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2020년대에 들어 이은화의 주제는 도시와 그 욕망으로 날카로워진다.{' '}
                        「Moneyscape」(커피에스페란토, 서울, 2022)는 돈 그 자체를 풍경으로 삼는다 —
                        자본이 빚어낸 지형으로서의 동시대 메트로폴리스, 가치와 갈망이 분리될 수 없는
                        곳으로.
                      </p>
                      <p>
                        「욕망의 방」(젊은달 와이파크/하슬라 미술관 분관, 영월, 2023)은 그 갈망을
                        위한 실내를 짓는다. 여기서 욕망은 도덕적 결함이 아니라 도시적 삶을 구조 짓는
                        힘 — 도시민이 스스로 조립하는 정체성의 엔진이다. 이 전시는 메트로폴리스를
                        돈과 욕구와 자아가 겹쳐지고 흐려지는 장소로 읽어낸다.
                      </p>
                      <p>
                        이 프로젝트들은 에스페란토 연작의 논리를 바깥으로 확장한다 — 감정의 사적인
                        문법에서 도시의 공적인 문법으로. 감정이 부호화될 수 있다면 욕망도 그렇다 —
                        그리고 부호화된 도시는 작가가 우리에게 함께 읽기를 청하는 하나의 텍스트가
                        된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 작가이자 저술가 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Maker and chronicler — the second axis'
                    : '만드는 이이자 기록하는 이 — 또 하나의 축'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Eun-hwa works on two axes at once. On one, she makes — painting,
                        installation, new media, the participatory room of 〈A Room of Hospitality:
                        Welcome VIP〉 (2025), the bound media of <em>Tell Me The Story</em> (2024).
                        On the other, she writes — books such as <em>Paintings with a Story</em>,{' '}
                        <em>The Room of Paintings</em>, <em>A Journey to Nordic Art Museums</em>,
                        and <em>The Minimum 100 Artworks for Today&apos;s Grown-ups</em>.
                      </p>
                      <p>
                        The two axes feed one another. Her writing carries the scholar&apos;s
                        training of her doctoral years; her practice carries the writer&apos;s drive
                        toward legibility. Across nine solo exhibitions and shows at major Korean
                        museums, she has consistently built{' '}
                        <strong className="font-bold text-charcoal-deep">
                          new formats that fuse art with other fields
                        </strong>{' '}
                        — and her books extend that fusion to the reading public.
                      </p>
                      <p>
                        It is a rare position: to be at once a contemporary artist developing new
                        forms and a writer translating art for a wide audience. In both roles, the
                        same impulse holds — to make the difficult feeling, the dense image, the
                        distant museum, legible and shared.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이은화는 두 축에서 동시에 일한다. 한 축에서 그는 만든다 — 회화, 설치,
                        뉴미디어, 관객이 참여해 완성하는 「환대의 방: 웰컴 VIP」(2025),
                        회화·기록·영상을 하나로 묶은 「Tell Me The Story」(2024). 다른 축에서 그는
                        쓴다 — 《사연 있는 그림》, 《그림의 방》, 《북유럽 미술관 여행》, 《요즘
                        어른을 위한 최소한의 미술100》 같은 저서들을.
                      </p>
                      <p>
                        두 축은 서로를 먹여 살린다. 그의 글에는 박사 과정에서 쌓은 학자의 훈련이
                        실려 있고, 그의 작업에는 가독성을 향한 저술가의 추동이 실려 있다. 9회의
                        개인전과 한국 주요 미술관의 전시를 거치며, 그는 꾸준히{' '}
                        <strong className="font-bold text-charcoal-deep">
                          미술과 타 분야를 융합한 새로운 형식
                        </strong>
                        을 쌓아 왔다 — 그리고 그의 책들은 그 융합을 독자 대중에게로 넓힌다.
                      </p>
                      <p>
                        흔치 않은 자리다 — 새로운 형식을 개발하는 동시대 작가이면서, 미술을 넓은
                        독자를 위해 번역하는 저술가라는 것은. 두 역할에서 같은 충동이 작동한다 —
                        어려운 감정을, 빽빽한 이미지를, 먼 미술관을 읽히게 하고 나누는 것.
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
                      From the early Esperanto works to the participatory rooms of the 2020s, Lee
                      Eun-hwa&apos;s practice has pursued one question: how do you make a feeling, a
                      desire, a city legible — and shared? She joins this campaign not as a subject
                      of its cause but as a fellow artist in solidarity, so that the works offered
                      here become part of a mutual-aid fund for artists facing financial exclusion
                      today.
                    </>
                  ) : (
                    <>
                      초기 에스페란토 작업에서 2020년대의 참여형 방에 이르기까지, 이은화의 작업은
                      하나의 물음을 추구해 왔다 — 어떻게 하나의 감정을, 욕망을, 도시를 읽히게 하고
                      나눌 것인가. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라 동료 예술인과의
                      연대자로서 함께한다 — 여기 내놓은 작품들이 오늘 금융 차별을 겪는 예술인을 위한
                      상호부조 기금의 일부가 되도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Eun-hwa</span>
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
                    Lee Eun-hwa joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이은화 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_EUNHWA_PATH}
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
