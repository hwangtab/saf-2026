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

// 작가 feature는 작가 페이지(/artworks/artist/정재철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='정재철', name_en='Jeong Jaecheol' (홍익대 회화과·〈Middle Ground〉 추상회화 작가).
const JEONG_JAECHEOL_PATH = `/artworks/artist/${encodeURIComponent('정재철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isJeongJaecheolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '정재철' ||
    n === 'jeong jaecheol' ||
    n === 'jeong jae-cheol' ||
    n.replace(/[\s-]+/g, '') === 'jeongjaecheol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '정재철 — 관계의 갈등과 타협을 그리는 추상 회화가',
    description:
      '관계와 갈등, 그리고 타협의 과정을 추상 회화로 옮겨 온 작가 정재철. 대표 연작 〈Middle Ground〉는 두터운 질감을 쌓고 다시 긁어내는 기법으로, 함께 살아가는 일에 깃든 마찰과 화해의 결을 화면 위에 새긴다. 홍익대학교 회화과를 졸업한 정재철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '관계의 갈등과 타협을 그리는 추상 회화가 정재철. 두텁게 쌓고 긁어내는 〈Middle Ground〉 연작.',
    ogAlt: '정재철 대표 작품',
    twitterTitle: '정재철',
    twitterDescription: '쌓고 긁어내며 — 관계의 갈등과 타협을 그리는 추상 회화가 정재철',
    keywords:
      '정재철 작가, 추상 회화, Middle Ground, 임파스토, 질감, 관계와 갈등, 타협, 홍익대 회화과, 씨앗페 온라인',
  },
  en: {
    title: 'Jeong Jaecheol — Abstract Painter of Conflict and Compromise',
    description:
      'Selected works by Jeong Jaecheol, a painter who translates relationship, conflict, and the process of compromise into abstraction. The signature series 〈Middle Ground〉 builds up thick texture and scrapes it back, inscribing the friction and reconciliation of living together onto the surface. A graduate of the Department of Painting at Hongik University. View and collect these works at SAF Online.',
    ogDescription:
      'Jeong Jaecheol — abstract painter of conflict and compromise. The 〈Middle Ground〉 series, built up and scraped back.',
    ogAlt: 'Jeong Jaecheol — featured work',
    twitterTitle: 'Jeong Jaecheol',
    twitterDescription:
      'Building up and scraping back — an abstract painter of conflict and compromise',
    keywords:
      'Jeong Jaecheol artist, abstract painting, Middle Ground, impasto, texture, conflict and compromise, Korean contemporary painting',
  },
} as const;

export async function buildJeongJaecheolMetadata({
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
  const pageUrl = buildLocaleUrl(JEONG_JAECHEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('정재철');
  const artwork = allArtworks.find((a) => isJeongJaecheolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jeong Jaecheol`
      : `${artwork.title} — 정재철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(JEONG_JAECHEOL_PATH, locale, true),
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

export default async function JeongJaecheolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(JEONG_JAECHEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('정재철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isJeongJaecheolArtist(artwork.artist)
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
    { name: isEnglish ? 'Jeong Jaecheol' : '정재철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${JEONG_JAECHEOL_PATH}#person-jeong-jaecheol`,
    name: isEnglish ? 'Jeong Jaecheol' : '정재철',
    alternateName: isEnglish ? '정재철' : 'Jeong Jaecheol',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Jeong Jaecheol is a painter who translates relationship, conflict, and the process of compromise into abstraction; the signature series 〈Middle Ground〉 builds up thick texture and scrapes it back.'
      : '정재철은 관계와 갈등, 그리고 타협의 과정을 추상 회화로 옮겨 온 작가로, 대표 연작 〈Middle Ground〉에서 두터운 질감을 쌓고 다시 긁어내는 기법을 펼칩니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Painting' : '홍익대학교 회화과',
    },
    knowsAbout: isEnglish
      ? ['Abstract painting', 'Impasto and sgraffito', 'Conflict and compromise']
      : ['추상 회화', '임파스토와 스그라피토', '관계와 갈등, 타협'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jeong Jaecheol — SAF Online' : '정재철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jeong Jaecheol from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 정재철 작품들을 소개합니다.',
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
        {/* Hero Section — Middle Ground: 쌓고 긁어내는 질감의 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 긁어낸 자국의 모티프 — 화면을 가로지르는 평행한 선들 */}
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/10" />
          {/* 두 면이 만나는 중간 지대 — 좌우에서 다가오는 두 결 */}
          <div className="absolute top-0 left-12 h-full w-px bg-white/10" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jeong Jaecheol · Abstract Painter' : '정재철 · 추상 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The middle ground
                  <br />
                  <span className="text-primary-soft">where two surfaces meet</span>
                </>
              ) : (
                <>
                  두 면이 만나는
                  <br />
                  <span className="text-primary-soft">중간 지대</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">Thick layers built up, then scraped back.</span>
                  <span className="mt-2 block">
                    Relationship, conflict, and the slow work of compromise.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">두텁게 쌓아 올리고, 다시 긁어내며.</span>
                  <span className="mt-2 block">관계와 갈등, 그리고 더딘 타협의 일.</span>
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
                    Build up, scrape back —<br />
                    <span className="text-primary-strong">an abstraction of relationship</span>
                  </>
                ) : (
                  <>
                    쌓고, 긁어내고 —<br />
                    <span className="text-primary-strong">관계의 추상</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jeong Jaecheol is a painter who graduated from the Department of Painting at
                      Hongik University. The work belongs to abstraction, but it is an abstraction
                      with a subject: relationship, conflict, and the long process of compromise
                      that living alongside others demands.
                    </p>
                    <p>
                      The signature series,{' '}
                      <strong className="font-bold text-charcoal-deep">〈Middle Ground〉</strong>,
                      makes that subject visible through process rather than depiction. Jeong builds
                      the surface up in thick layers of paint, then scrapes back into them — so that
                      what was added and what was taken away remain legible side by side on the same
                      plane. The painting is not a picture of a relationship; it is the residue of
                      one.
                    </p>
                    <p>
                      The two physical gestures at the heart of the method —{' '}
                      <strong className="font-bold text-charcoal">accumulation and erasure</strong>{' '}
                      — carry the meaning of the work directly. To pile texture on is to assert; to
                      scrape it away is to yield. Between the two, neither winning outright, a third
                      register emerges: the worn, negotiated surface of the middle ground itself.
                    </p>
                    <p>
                      This is why the materiality of the paint matters so much in this practice. The
                      ridges of impasto and the furrows left by scraping are not decoration; they
                      are the trace of a process of friction and reconciliation, recorded at the
                      speed the hand could manage. The viewer reads conflict and compromise not as a
                      story but as a texture — something felt across the surface before it is
                      understood.
                    </p>
                    <p>
                      In Jeong Jaecheol&apos;s abstraction, then, the act of painting and its
                      subject are one and the same. To live with others is to add and to give up by
                      turns, and the surface that results is never smooth. The middle ground is the
                      honest record of that unevenness.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      정재철은 홍익대학교 회화과를 졸업한 화가다. 그의 작업은 추상에 속하지만,
                      주제를 가진 추상이다 — 관계와 갈등, 그리고 더불어 사는 일이 요구하는 긴 타협의
                      과정.
                    </p>
                    <p>
                      그의 대표 연작{' '}
                      <strong className="font-bold text-charcoal-deep">〈Middle Ground〉</strong>는
                      그 주제를 묘사가 아니라 과정으로 가시화한다. 그는 화면을 두터운 물감의 겹으로
                      쌓아 올린 뒤, 그 안을 다시 긁어낸다 — 더해진 것과 덜어낸 것이 같은 평면 위에
                      나란히 읽히도록. 그림은 관계의 그림이 아니다. 관계가 남긴 자국이다.
                    </p>
                    <p>
                      그의 방법론의 핵심에 놓인 두 물리적 행위 —{' '}
                      <strong className="font-bold text-charcoal">쌓음과 긁어냄</strong> — 은 작업의
                      의미를 곧장 실어 나른다. 질감을 쌓는 일은 주장하는 일이고, 그것을 긁어내는
                      일은 양보하는 일이다. 어느 쪽도 완전히 이기지 않는 둘 사이에서 제3의 음역이
                      떠오른다 — 닳고 협상된, 중간 지대 그 자체의 표면.
                    </p>
                    <p>
                      그의 작업에서 물감의 물성이 그토록 중요한 이유가 여기 있다. 임파스토의 융기와
                      긁어낸 자리에 남은 고랑은 장식이 아니다. 그것은 손이 감당할 수 있는 속도로
                      기록된, 마찰과 화해라는 과정의 흔적이다. 보는 이는 갈등과 타협을 이야기가
                      아니라 질감으로 읽는다 — 이해되기 전에 표면을 가로질러 먼저 느껴지는 무엇으로.
                    </p>
                    <p>
                      그러니 정재철의 추상에서 그리는 행위와 그 주제는 하나다. 타인과 함께 산다는
                      것은 번갈아 더하고 포기하는 일이며, 그 결과로 남는 표면은 결코 매끄럽지 않다.
                      중간 지대란 그 울퉁불퉁함에 대한 정직한 기록이다.
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
                        {isEnglish ? '〈Middle Ground〉' : '〈Middle Ground〉 — 중간 지대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His signature abstract series — the worn, negotiated plane that emerges where two surfaces meet without either prevailing.'
                          : '대표 추상 연작. 어느 한쪽도 이기지 않은 채 두 면이 만나는 자리에 떠오르는, 닳고 협상된 평면.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Building up & scraping back' : '쌓음과 긁어냄'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Thick impasto is laid down and then scraped into — accumulation and erasure held together as the physical grammar of the work.'
                          : '두터운 임파스토를 쌓고 다시 긁어낸다. 쌓음과 덜어냄을 함께 붙드는, 작업의 물리적 문법.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Conflict & compromise' : '갈등과 타협'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Relationship rendered as texture — the friction and reconciliation of living together, read across the surface before it is understood.'
                          : '질감으로 옮겨진 관계. 더불어 사는 일의 마찰과 화해를, 이해되기 전에 표면에서 먼저 읽는다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? 'Medium & method' : '매체와 방법'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Abstract painting — a non-figurative practice with relationship and compromise as its subject.'
                        : '추상 회화 — 관계와 타협을 주제로 삼는 비구상 작업.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Thick texture (impasto): paint accumulated in heavy, ridged layers.'
                        : '두터운 질감(임파스토): 무겁고 융기한 겹으로 쌓아 올린 물감.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Scraping (sgraffito): cutting back into the built surface so addition and removal stay visible together.'
                        : '긁어내기(스그라피토): 쌓인 표면을 다시 깎아, 더함과 덜어냄이 함께 보이게 한다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Subject: relationship, conflict, and the process of compromise.'
                        : '주제: 관계와 갈등, 그리고 타협의 과정.'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Education' : '학력'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduated from the Department of Painting, Hongik University.'
                        : '홍익대학교 회화과 졸업.'}
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
                  <span className="text-charcoal-deep">on texture, gesture, and the middle</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">질감과 행위, 그리고 중간에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 쌓고 긁어내는 일 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Accumulation and erasure — two gestures, one surface'
                    : '쌓음과 긁어냄 — 두 행위, 하나의 표면'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The method at the centre of Jeong Jaecheol&apos;s work is deceptively
                        simple: Jeong builds the surface up, and then takes it away. Thick paint is
                        laid down in heavy layers; into those layers the artist scrapes, cutting
                        back to what lies beneath. The two gestures are opposites, and both are kept
                        visible on the same plane.
                      </p>
                      <p>
                        This is what gives the work its particular density. A smooth abstraction
                        hides its making; Jeong&apos;s surfaces insist on theirs. The ridge of an
                        impasto stroke and the furrow of a scrape sit next to each other as evidence
                        of two contrary impulses — to add, to remove — that never fully cancel out.
                        Each cancels a little of the other and leaves the rest standing.
                      </p>
                      <p>
                        Because nothing is sanded flat, the painting holds the time of its own
                        argument. You can read, in the texture, where the hand pressed forward and
                        where it pulled back. The surface is not a conclusion but a record of the
                        back-and-forth that produced it — which is exactly why texture, rather than
                        image, carries the meaning.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        정재철 작업의 중심에 놓인 방법은 짐짓 단순하다. 그는 표면을 쌓아 올리고,
                        그러고 나서 덜어낸다. 두터운 물감이 무거운 겹으로 내려앉고, 그 겹 안으로
                        그는 긁어 들어가 아래에 놓인 것을 다시 드러낸다. 두 행위는 정반대이며, 그는
                        둘을 같은 평면 위에 함께 보이게 둔다.
                      </p>
                      <p>
                        작업 특유의 밀도가 여기서 온다. 매끄러운 추상은 제 만듦새를 감추지만,
                        정재철의 표면은 그것을 고집한다. 임파스토 붓질의 융기와 긁어낸 고랑은,
                        더하려는 충동과 덜어내려는 충동이라는 두 상반된 힘의 증거로 나란히 앉는다 —
                        결코 완전히 상쇄되지 않는 채로. 각각은 상대를 조금씩 지우고, 나머지를 세워
                        둔다.
                      </p>
                      <p>
                        아무것도 평평하게 갈아내지 않기에, 그림은 제 논쟁의 시간을 간직한다. 질감
                        안에서 손이 어디서 밀고 나갔고 어디서 물러섰는지 읽을 수 있다. 표면은 결론이
                        아니라, 그것을 만들어 낸 밀고 당김의 기록이다 — 이미지가 아니라 질감이
                        의미를 실어 나르는 이유가 바로 이것이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 중간 지대 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Middle Ground〉 — the place neither side wins'
                    : '〈Middle Ground〉 — 어느 쪽도 이기지 않는 자리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The title of the signature series names a position rather than an image. A
                        middle ground is what is left when two opposing parties stop short of total
                        victory — the worn, common patch they end up sharing. It is not a compromise
                        reached cleanly but one ground down into existence.
                      </p>
                      <p>
                        Jeong&apos;s paintings translate that idea into paint with unusual
                        directness. The built-up layers stand in for assertion, the scraped-back
                        passages for concession, and the surface that survives both is the middle
                        ground itself — bearing the marks of everything added and everything given
                        up. The plane is shared territory, and like all shared territory, it is
                        uneven.
                      </p>
                      <p>
                        What keeps the series from being merely an illustration of an idea is that
                        the meaning is enacted, not depicted. The conflict and the compromise are
                        not pictured; they are performed, layer by layer, scrape by scrape, until
                        the canvas itself becomes the middle ground that two surfaces have
                        negotiated into being.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 대표 연작 제목은 이미지가 아니라 하나의 위치를 가리킨다. 중간 지대란
                        대립하는 두 편이 완전한 승리에 못 미친 채 멈췄을 때 남는 것이다 — 결국 함께
                        나누게 되는, 닳은 공유지. 그것은 말끔히 도달한 타협이 아니라 갈려 나가며
                        생겨난 타협이다.
                      </p>
                      <p>
                        정재철의 그림은 그 발상을 보기 드문 직접성으로 물감에 옮긴다. 쌓인 겹은
                        주장을, 긁어낸 자리는 양보를 대신하고, 둘 다를 견디고 살아남은 표면이 곧
                        중간 지대다 — 더해진 모든 것과 포기된 모든 것의 자국을 짊어진 채로. 그
                        평면은 공유된 영역이며, 모든 공유지가 그렇듯 울퉁불퉁하다.
                      </p>
                      <p>
                        이 연작이 한낱 발상의 삽화에 머물지 않는 까닭은, 의미가 묘사되는 것이 아니라
                        수행되기 때문이다. 갈등과 타협은 그려지지 않는다. 그것은 한 겹 한 겹, 한 번
                        또 한 번 긁으며 행해진다. 캔버스 자체가, 두 면이 협상하여 만들어 낸 중간
                        지대가 될 때까지.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 추상이라는 정직함 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The honesty of abstraction — texture as relationship'
                    : '추상이라는 정직함 — 관계가 된 질감'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        It would be easy to paint a relationship as a scene — two figures, a room, a
                        gesture. Jeong Jaecheol declines that ease. By staying with abstraction, the
                        artist refuses to settle the meaning into a single illustrated story and
                        instead lets it remain in the open register of texture, where each viewer
                        feels the friction before naming it.
                      </p>
                      <p>
                        This is a kind of honesty. Relationships are not, in truth, smooth
                        narratives; they are accumulations and erasures, advances and concessions,
                        and the surface they leave is rarely even. An abstraction made of built and
                        scraped paint keeps faith with that unevenness in a way a tidy figurative
                        scene could not.
                      </p>
                      <p>
                        Across the 〈Middle Ground〉 series, then, the painting and its subject
                        become the same thing. To make the work is to add and to give up by turns;
                        to look at it is to feel that process in the hand-built grain of the
                        surface. What remains on the canvas is not a depiction of compromise but its
                        actual, textured residue.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        관계를 하나의 장면으로 그리는 일은 쉬울 것이다 — 두 인물, 한 방, 하나의
                        몸짓. 정재철은 그 쉬움을 사양한다. 추상에 머묾으로써, 그는 의미를 그려진
                        하나의 이야기로 정착시키기를 거부하고, 대신 그것을 질감이라는 열린 음역에
                        남겨 둔다. 보는 이마다 이름 붙이기 전에 마찰을 먼저 느끼는 자리에.
                      </p>
                      <p>
                        이것은 일종의 정직함이다. 관계란 사실 매끄러운 서사가 아니다. 그것은 쌓임과
                        긁힘이고, 전진과 양보이며, 그 결과로 남는 표면은 좀처럼 고르지 않다. 쌓고
                        긁어낸 물감으로 이루어진 추상은, 단정한 구상 장면이 할 수 없는 방식으로 그
                        울퉁불퉁함에 충실하다.
                      </p>
                      <p>
                        그리하여 〈Middle Ground〉 연작에서 그림과 그 주제는 같은 것이 된다. 작업을
                        한다는 것은 번갈아 더하고 포기하는 일이고, 그것을 본다는 것은 손으로 쌓은
                        표면의 결에서 그 과정을 느끼는 일이다. 캔버스에 남는 것은 타협의 묘사가
                        아니라, 타협의 실제이자 질감을 입은 잔여다.
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
                      From the first built-up layer to the final scrape, Jeong Jaecheol&apos;s
                      abstraction has pursued a single question: how does a surface hold the
                      friction and reconciliation of living alongside others? The answer, worked in
                      impasto and sgraffito across the 〈Middle Ground〉 series, is a texture in
                      which conflict and compromise are not described but recorded. Jeong Jaecheol
                      joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that the proceeds of the work might become a low-interest
                      lifeline for artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      처음 쌓아 올린 한 겹에서 마지막 긁어냄까지, 정재철의 추상은 하나의 물음을
                      추구해 왔다 — 표면은 어떻게 더불어 사는 일의 마찰과 화해를 간직하는가.
                      임파스토와 스그라피토로 〈Middle Ground〉 연작을 가로질러 이뤄 낸 대답이,
                      갈등과 타협이 묘사되지 않고 기록되는 질감이다. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 작품 판매 수익이
                      오늘 금융 차별을 겪는 예술인에게 저금리의 버팀목이 될 수 있도록.
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
                Jeong Jaecheol
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
                <span className="w-2 h-2 bg-primary rotate-45" />
                <span className="text-xs text-white/60 uppercase tracking-widest font-medium">
                  {isEnglish ? 'Artist mutual-aid' : '예술인 상호부조'}
                </span>
              </div>
              <p className="text-base md:text-lg text-white/90 leading-relaxed break-keep font-medium">
                {isEnglish ? (
                  <>
                    Jeong Jaecheol joined this campaign in solidarity with fellow artists. Every
                    work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    정재철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={JEONG_JAECHEOL_PATH}
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
