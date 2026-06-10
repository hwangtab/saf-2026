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

// 거장 작가 feature는 작가 페이지(/artworks/artist/신예리)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SIN_YERI_PATH = `/artworks/artist/${encodeURIComponent('신예리')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSinYeriArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '신예리' ||
    n === 'sin yeri' ||
    n === 'shin yeri' ||
    n.replace(/[\s-]+/g, '') === 'sinyeri' ||
    n.replace(/[\s-]+/g, '') === 'shinyeri'
  );
};

const PAGE_COPY = {
  ko: {
    title: '신예리 — 화각과 민화 사이, 쇠뿔에 새긴 빛',
    description:
      '한국 전통 화각(華角)공예와 민화의 결을 현대 시각언어로 잇는 작가 신예리(호 담몽淡夢). 쇠뿔을 종잇장처럼 펴 그 뒷면에 오색찬란한 단청안료로 채색하던 화각공예의 정밀함과, 민화의 자유로운 도상을 회화로 옮긴 작업. 경기무형문화재 화각장 공방에서 10년간 수석디자이너로 일한 신예리의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '화각과 민화 사이 — 쇠뿔에 새긴 빛. 전통 화각공예의 정밀함과 민화의 자유로운 도상을 잇는 작가 신예리(호 담몽).',
    ogAlt: '신예리 대표 작품',
    twitterTitle: '신예리',
    twitterDescription: '화각과 민화 사이 — 쇠뿔에 새긴 빛, 작가 신예리(호 담몽)',
    keywords: '신예리 작가, 화각공예, 화각, 민화, 담몽, 전통공예, 단청, 씨앗페 온라인',
  },
  en: {
    title: 'Sin Yeri — Between Hwagak and Minhwa, light carved into ox horn',
    description:
      "Selected works by Sin Yeri (pen name Dammong, 淡夢), an artist who carries the grain of Korea's traditional hwagak (華角, painted ox-horn) craft and minhwa folk painting into a contemporary visual language. After a decade as lead designer at a Gyeonggi Intangible Cultural Heritage hwagak workshop, she translates the precision of horn-craft and the free iconography of folk painting onto the painted surface. View and collect her works at SAF Online.",
    ogDescription:
      'Between hwagak and minhwa — light carved into ox horn. Sin Yeri (pen name Dammong) joins the precision of painted ox-horn craft to the free iconography of folk painting.',
    ogAlt: 'Sin Yeri — featured work',
    twitterTitle: 'Sin Yeri',
    twitterDescription: 'Between hwagak and minhwa — light carved into ox horn, artist Sin Yeri',
    keywords:
      'Sin Yeri artist, hwagak, ox horn craft, minhwa, Korean folk painting, dancheong, Korean traditional craft',
  },
} as const;

export async function buildSinYeriMetadata({
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
  const pageUrl = buildLocaleUrl(SIN_YERI_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('신예리');
  const artwork = allArtworks.find((a) => isSinYeriArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Sin Yeri`
      : `${artwork.title} — 신예리`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SIN_YERI_PATH, locale, true),
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

export default async function SinYeriFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SIN_YERI_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('신예리');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isSinYeriArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Sin Yeri' : '신예리', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SIN_YERI_PATH}#person-sin-yeri`,
    name: isEnglish ? 'Sin Yeri' : '신예리',
    alternateName: isEnglish ? '신예리 (淡夢)' : 'Sin Yeri (Dammong, 淡夢)',
    jobTitle: isEnglish ? 'Artist · Hwagak & Minhwa craft' : '작가 · 화각·민화공예',
    description: isEnglish
      ? 'Sin Yeri (pen name Dammong, 淡夢) is a mid-career Korean artist who carries the tradition of hwagak (painted ox-horn) craft and minhwa folk painting into a contemporary painterly language.'
      : '신예리(호 담몽淡夢)는 한국 전통 화각(華角)공예와 민화의 결을 현대적 회화 언어로 잇는 중견 작가입니다.',
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish
        ? 'Gyeongwon University (now Gachon University), Dept. of Textile Art'
        : '경원대학교(현 가천대학교) 섬유미술과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Dammong, Minhwa Craft Studio (Director)' : '민화공예공방 담몽 (대표)',
    },
    knowsAbout: ['Hwagak (ox-horn craft)', 'Minhwa (Korean folk painting)', 'Dancheong pigment'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Sin Yeri — SAF Online' : '신예리 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Sin Yeri from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 신예리 작품들을 소개합니다.',
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

          {/* Vertical light lines — 쇠뿔에 스민 빛의 결 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-sun/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Sin Yeri · pen name Dammong 淡夢' : '신예리 · 호 담몽淡夢'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Light carved into ox horn
                  <br />
                  <span className="text-sun">between hwagak and minhwa</span>
                </>
              ) : (
                <>
                  쇠뿔에 새긴 빛
                  <br />
                  <span className="text-sun">화각과 민화 사이</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The brilliant colour of a vanishing royal craft, carried into painting.
                  </span>
                  <span className="mt-2 block">
                    The precision of painted ox horn meets the free hand of folk imagery.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">사라져 가는 왕실 공예의 찬란한 빛을 회화로 잇다.</span>
                  <span className="mt-2 block">
                    화각의 정밀함과 민화의 자유로운 손길이 한 화면에서 만난다.
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
                    From horn to canvas —<br />
                    <span className="text-primary-strong">the grain of a royal craft</span>
                  </>
                ) : (
                  <>
                    쇠뿔에서 화폭으로 —<br />
                    <span className="text-primary-strong">왕실 공예의 결</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Sin Yeri (pen name Dammong, 淡夢 — &lsquo;a faint dream&rsquo;) is a
                      mid-career Korean artist who carries the grain of two traditions — hwagak
                      (華角) painted ox-horn craft and minhwa folk painting — into a contemporary
                      painterly language. She graduated from the Department of Textile Art at
                      Gyeongwon University (now Gachon University) in 2003.
                    </p>
                    <p>
                      For ten years she served as lead designer at the Han Chun-seop hwagak studio
                      run by a Gyeonggi Intangible Cultural Heritage hwagak master — a rare,
                      sustained immersion in one of Korea&apos;s most exacting royal crafts. Hwagak
                      is a uniquely Korean technique: the horn of an ox is ground until it is thin
                      and translucent as paper, its reverse painted in brilliant{' '}
                      <strong className="font-bold text-charcoal-deep">dancheong</strong> mineral
                      pigment, then glued onto a wooden body so the colour glows through the horn
                      from beneath.
                    </p>
                    <p>
                      That decade taught her the discipline of the craft from the inside — the
                      patience of the horn-grinder, the precise registration of motif and ground,
                      the five cardinal colours of dancheong. From this foundation she now directs
                      her own practice as head of{' '}
                      <strong className="font-bold text-charcoal">
                        Dammong, a minhwa craft studio
                      </strong>
                      , translating the iconography of folk painting — auspicious birds and flowers,
                      the ten symbols of longevity — onto the painted surface.
                    </p>
                    <p>
                      Her work sits deliberately{' '}
                      <strong className="font-bold text-charcoal-deep">
                        between craft and painting
                      </strong>
                      : the jewel-like saturation and meticulous outline of horn-craft, loosened by
                      the free, generous hand of folk imagery. She has been invited as a featured
                      artist to the Korea National Fine Art Special Invitational Exhibition, shown
                      at the SNAF Seongnam Art Fair artist exhibition, and participated in Mokwonhoe
                      group shows.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      신예리(호 담몽淡夢 — &lsquo;옅은 꿈&rsquo;)는 한국 전통 화각(華角)공예와 민화,
                      두 갈래의 결을 현대적 회화 언어로 잇는 중견 작가다. 2003년 경원대학교(현
                      가천대학교) 섬유미술과를 졸업했다.
                    </p>
                    <p>
                      그는 경기무형문화재 화각장 한춘섭화각공예 공방에서{' '}
                      <strong className="font-bold text-charcoal-deep">10년간 수석디자이너</strong>
                      로 일했다 — 한국에서 가장 까다로운 왕실 공예 가운데 하나에 깊고 오래 잠긴 흔치
                      않은 이력이다. 화각은 한국 고유의 기법이다. 쇠뿔을 종잇장처럼 얇고 투명하게
                      펴고, 그 뒷면에 오색찬란한{' '}
                      <strong className="font-bold text-charcoal">단청안료</strong>로 채색한 다음,
                      목기 백골 위에 붙여 뿔 아래에서 색이 비쳐 오르게 하는 공예다.
                    </p>
                    <p>
                      그 10년은 공예를 안에서부터 가르쳤다 — 뿔을 가는 인내, 문양과 바탕을 정확히
                      맞추는 손, 단청의 다섯 기본색. 이 토대 위에서 그는 이제 민화공예공방{' '}
                      <strong className="font-bold text-charcoal">담몽</strong>의 대표로 자신의
                      작업을 이끌며, 화조·십장생 같은 민화의 도상을 회화의 표면으로 옮긴다.
                    </p>
                    <p>
                      그의 작업은 의도적으로{' '}
                      <strong className="font-bold text-charcoal-deep">공예와 회화 사이</strong>에
                      선다. 화각공예의 보석 같은 채도와 정밀한 윤곽선이, 민화의 자유롭고 너그러운
                      손길로 풀려 나온다. 그는 대한민국 국가미술특별초대전 초대작가로 참여했고, SNAF
                      성남아트페어 작가전에 출품했으며, 목원회 단체전 등에 함께해 왔다.
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
                        {isEnglish ? 'The craft of painted ox horn' : '화각공예의 정밀함'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Ten years inside a royal craft — horn ground translucent, dancheong painted on its reverse, colour glowing through from beneath.'
                          : '왕실 공예 안에서 보낸 10년 — 투명하게 편 쇠뿔, 그 뒷면의 단청 채색, 아래에서 비쳐 오르는 빛.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The free hand of minhwa' : '민화의 자유로운 도상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Auspicious birds and flowers, the ten symbols of longevity — folk iconography loosened from the rigour of the craft into painting.'
                          : '화조와 십장생 같은 길상의 도상. 공예의 엄격함에서 풀려나 회화로 옮겨진 민화의 손길.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Dammong — a faint dream' : '담몽淡夢 — 옅은 꿈'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Her pen name names a sensibility: brilliant tradition rendered tender, the saturated colour of the craft drawn toward a quieter, dreamlike register.'
                          : '호 담몽은 하나의 정서를 가리킨다 — 찬란한 전통을 부드럽게, 공예의 짙은 색을 옅고 꿈결 같은 결로 끌어오는 감각.'}
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
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2003
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from the Dept. of Textile Art, Gyeongwon University (now Gachon University).'
                        : '경원대학교(현 가천대학교) 섬유미술과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      10년
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Lead designer for a decade at the Han Chun-seop hwagak studio under a Gyeonggi Intangible Cultural Heritage hwagak master.'
                        : '경기무형문화재 화각장 한춘섭화각공예 공방 수석디자이너 10년 재직.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      현재
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Directs Dammong, her own minhwa craft studio.'
                        : '민화공예공방 담몽 대표.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      초대
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Featured artist, Korea National Fine Art Special Invitational Exhibition.'
                        : '대한민국 국가미술특별초대전 초대작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      전시
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'SNAF Seongnam Art Fair artist exhibition; Mokwonhoe group exhibitions, among others.'
                        : 'SNAF 성남아트페어 작가전; 목원회 단체전 등 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'On the craft of hwagak' : '화각공예에 관하여'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Hwagak (華角) is a uniquely Korean lacquer craft — ox horn ground
                          translucent, painted on its reverse, and inlaid onto wood. It was
                          designated{' '}
                          <a
                            href="https://english.cha.go.kr/chaen/search/selectGeneralSearchDetail.do?ccebKdcd=17&ccebAsno=0001090000000&ccebCtcd=23"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            National Intangible Cultural Heritage (Hwagakjang)
                          </a>{' '}
                          in 1996.
                        </>
                      ) : (
                        <>
                          화각(華角)은 쇠뿔을 투명하게 펴 뒷면을 채색하고 목기에 붙이는 한국 고유의
                          칠공예다.{' '}
                          <a
                            href="https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1272301090000"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            국가무형문화재 화각장(華角匠)
                          </a>
                          으로 지정되어 있다.
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Nacre and hwagak stand as twin peaks of Korean royal craft. Where neighbouring cultures inlaid tortoiseshell, only Korea developed the painted ox-horn technique.'
                        : '나전칠기와 더불어 화각은 한국 왕실 공예의 쌍벽을 이룬다. 이웃 문화권이 대모(玳瑁)를 상감하던 자리에서, 화각은 한국에서만 발달한 고유 기법이다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Its dancheong palette rests on five cardinal colours — red, blue, yellow, white, black — high in value and brilliance. Its motifs draw on folk iconography: the ten symbols of longevity, birds and flowers, dragons and fish.'
                        : '화각의 단청 색채는 적·청·황·백·흑 오방색을 기본으로 명도 높고 화사하다. 도상은 십장생·화조·용·물고기 등 민화의 길상에서 길어 올린다.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Because horn was scarce and the process exacting, hwagak pieces were rare luxuries of the royal court and yangban elite — a precision Sin Yeri carries from object into painting.'
                        : '재료가 귀하고 공정이 까다로워 화각공예품은 왕실과 양반층의 드문 애장품이었다 — 신예리가 기물에서 회화로 옮겨 오는 그 정밀함이다.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광 패턴 차용, 신예리 화각·민화 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on horn, colour, and the dream</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">뿔과 색, 그리고 꿈에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 화각이라는 빛의 공예 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Hwagak — the craft of light through horn'
                    : '화각 — 뿔을 통과하는 빛의 공예'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Hwagak — literally &lsquo;brilliant horn&rsquo; — is among the most exacting
                        of Korea&apos;s royal crafts. The horn of an ox, ideally a grain-fed
                        three-year-old chosen for its clarity, is heated, pressed, and ground until
                        it becomes a sheet thin and translucent as paper. On its reverse the artisan
                        paints in dancheong mineral pigment; the painted sheet is then glued onto a
                        wooden body, and the surrounding ground is finished in lacquer. The colour
                        is thus seen <em>through</em> the horn — protected by it, lit from beneath
                        it.
                      </p>
                      <p>
                        It is a craft of inversion and patience. The image must be painted in
                        reverse, in mirror, so that it reads correctly through the translucent
                        sheet. The five cardinal colours of dancheong — red, blue, yellow, white,
                        black — sit high in value, giving hwagak its characteristic brilliance, a
                        saturated radiance no other Korean craft quite matches.
                      </p>
                      <p>
                        Nacre lacquerware and hwagak are often named the twin peaks of Korean court
                        craft. Yet hwagak is the rarer and more uniquely Korean of the two: where
                        neighbouring cultures inlaid tortoiseshell, only the Korean tradition
                        developed the painted ox-horn technique to this degree. Scarce material and
                        difficult process kept hwagak pieces to the royal court and yangban elite —
                        a craft that, by the twentieth century, came close to disappearing.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        화각 — 글자 그대로 &lsquo;빛나는 뿔&rsquo; — 은 한국 왕실 공예 가운데 가장
                        까다로운 축에 든다. 투명도가 좋은 쇠뿔, 곡식을 먹여 기른 세 살배기 소의 뿔이
                        가장 좋다고 하는데, 이를 열로 펴고 눌러 종잇장처럼 얇고 투명하게 간다. 그
                        뒷면에 단청안료로 그림을 그리고, 채색한 각지를 목기 백골 위에 붙인 뒤,
                        둘레의 여백은 옻칠로 마감한다. 그리하여 색은 뿔을 <em>통과해</em> 보인다 —
                        뿔에 보호되고, 그 아래에서 빛난다.
                      </p>
                      <p>
                        뒤집고 기다리는 공예다. 그림은 투명한 각지를 통과해 바르게 읽히도록,
                        거울처럼 뒤집어 그려야 한다. 단청의 오방색 — 적·청·황·백·흑 — 은 명도가
                        높아, 다른 어떤 한국 공예도 쉽게 견주기 어려운 화각 특유의 찬란한 광채를
                        낸다.
                      </p>
                      <p>
                        나전칠기와 화각은 흔히 한국 궁중 공예의 쌍벽으로 불린다. 그러나 둘 중에서도
                        화각이 더 드물고 더 한국적이다. 이웃 문화권이 대모(玳瑁)를 상감하던
                        자리에서, 쇠뿔을 채색해 붙이는 이 기법은 한국 전통에서만 이만큼 발달했다.
                        귀한 재료와 어려운 공정 탓에 화각공예품은 왕실과 양반층에 머물렀고, 20세기에
                        이르러서는 거의 사라질 뻔했다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 민화의 도상, 길상의 손길 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'Minhwa — the iconography of good fortune' : '민화 — 길상의 도상'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The motifs that travel across hwagak surfaces are the same that fill Korean
                        minhwa, folk painting: the ten symbols of longevity (sun, mountain, water,
                        rock, pine, crane, deer, tortoise, cloud, and the herb of eternal life);
                        birds and flowers; dragons and fish. These are not merely decorative. They
                        are an iconography of good fortune — wishes for long life, fertility, and
                        protection, painted into the daily objects of a household.
                      </p>
                      <p>
                        Minhwa was the painting of the people: practical, generous, often anonymous,
                        made to decorate a living space rather than to be hung in a scholar&apos;s
                        study. Its hand is freer than that of court painting — its proportions
                        loosened, its colour exuberant, its rules bent toward warmth. Where hwagak
                        demands exactitude, minhwa offers release.
                      </p>
                      <p>
                        Sin Yeri works in the seam between the two. She knows the discipline of the
                        craft from a decade inside the workshop; she carries its precise outline and
                        jewel-like colour. But onto the painted surface she lets the free hand of
                        folk imagery breathe — the auspicious bird, the blossoming branch, the
                        tortoise of long years — so that rigour and generosity meet in a single
                        frame.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        화각의 표면을 건너다니는 도상은 한국 민화를 채우는 것과 같다. 십장생(해·산·
                        물·바위·소나무·학·사슴·거북·구름·불로초), 화조(花鳥), 용과 물고기. 이는 단지
                        장식이 아니다. 길상의 도상 — 장수와 다산과 보호를 비는 마음이, 한 살림의
                        일상 기물 속에 그려져 있다.
                      </p>
                      <p>
                        민화는 백성의 그림이었다. 실용적이고 너그럽고, 흔히 이름 없이, 사랑방에 걸기
                        위함이 아니라 생활공간을 꾸미기 위해 그려졌다. 그 손은 정통 회화보다
                        자유롭다 — 비례는 풀려 있고, 색은 흥겹고, 규칙은 따뜻함 쪽으로 휜다. 화각이
                        정확함을 요구하는 자리에서, 민화는 풀려남을 내어준다.
                      </p>
                      <p>
                        신예리는 그 둘의 이음매에서 작업한다. 공방 안에서 보낸 10년으로 공예의
                        규율을 알고, 그 정밀한 윤곽과 보석 같은 색을 지닌다. 그러나 화면 위에서는
                        민화의 자유로운 손길이 숨 쉬게 한다 — 길상의 새, 피어나는 가지, 오랜 세월의
                        거북 — 그리하여 엄격함과 너그러움이 한 화면에서 만난다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 담몽, 옅은 꿈 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Dammong — the dream that softens the brilliance'
                    : '담몽 — 찬란함을 누그러뜨리는 꿈'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Her pen name, Dammong (淡夢), reads as &lsquo;a faint dream&rsquo; — 淡 for
                        the pale, the diluted, the quiet; 夢 for dream. It names a sensibility
                        rather than a subject. The brilliance of the craft is real, but it is drawn
                        here toward a softer register, as if remembered rather than displayed.
                      </p>
                      <p>
                        This is the distinctive turn of her practice: a tradition known for its
                        saturated, almost dazzling colour, carried into a tenderer key. The
                        five-colour radiance of dancheong remains, but it is held at the temperature
                        of a dream — present, luminous, and gentle at once. The precision survives;
                        the hardness softens.
                      </p>
                      <p>
                        From the textile studio to the hwagak workshop to her own studio Dammong,
                        Sin Yeri has followed a single thread: how to keep a vanishing royal craft
                        alive by giving it a contemporary voice — neither museum reproduction nor
                        pure invention, but a living continuation. She joins this campaign not as a
                        subject of its cause but as a fellow artist in solidarity, so that the craft
                        she carries, and the artists who carry crafts like it, might have a future.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그의 호 담몽(淡夢)은 &lsquo;옅은 꿈&rsquo;으로 읽힌다 — 담(淡)은 옅고 묽고
                        고요한 것을, 몽(夢)은 꿈을 가리킨다. 주제라기보다 하나의 정서를 이르는
                        이름이다. 공예의 찬란함은 분명히 있되, 여기서는 더 부드러운 결로 끌어와진다
                        — 내보이기보다 기억되는 듯이.
                      </p>
                      <p>
                        이것이 그의 작업의 고유한 전환이다. 짙고 거의 눈부신 색으로 알려진 전통을,
                        더 옅은 음조로 옮겨 오는 것. 단청의 오색 광채는 남아 있되, 꿈의 온도에서
                        붙들린다 — 또렷하고 환하면서도 동시에 부드럽다. 정밀함은 살아남고, 단단함은
                        누그러진다.
                      </p>
                      <p>
                        섬유미술 작업실에서 화각 공방으로, 다시 자신의 공방 담몽으로 — 신예리는
                        하나의 실을 따라왔다. 사라져 가는 왕실 공예를 어떻게 현대의 목소리로 살려 둘
                        것인가 — 박물관의 복제도, 순전한 창작도 아닌, 살아 있는 이음으로. 그는
                        씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서
                        함께한다 — 그가 잇는 공예와, 그와 같은 공예를 잇는 예술인들에게 내일이
                        있도록.
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
                      Between the exacting horn of a royal craft and the free hand of folk painting,
                      Sin Yeri has built a practice that is neither preservation nor pastiche, but a
                      living continuation — the brilliant colour of an old tradition carried,
                      softly, into the present.
                    </>
                  ) : (
                    <>
                      왕실 공예의 까다로운 뿔과 민화의 자유로운 손길 사이에서, 신예리는 보존도
                      모방도 아닌 살아 있는 이음을 지어 왔다 — 오랜 전통의 찬란한 색을, 부드럽게,
                      오늘로 옮겨 오면서.
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
                HWAGAK
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Sin Yeri</span>
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
                    Sin Yeri joined this campaign in solidarity with fellow artists. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    신예리 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SIN_YERI_PATH}
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
