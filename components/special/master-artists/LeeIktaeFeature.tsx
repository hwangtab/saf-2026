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

// 이익태 feature는 작가 페이지(/artworks/artist/이익태)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_IKTAE_PATH = `/artworks/artist/${encodeURIComponent('이익태')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const isLeeIktaeArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이익태' ||
    n === 'lee iktae' ||
    n === 'lee ik-tae' ||
    n.replace(/[\s-]+/g, '') === 'leeiktae'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이익태 — 장르의 경계를 지운 토탈 아티스트 (1947–2025)',
    description:
      '이익태(1947–2025) — 영화·연극·퍼포먼스·회화·설치를 넘나든 한국 실험·전위미술의 선구자. 한국 최초 독립영화 「아침과 저녁 사이」(1970), 제4집단, Theater 1981, 빙벽(Ice Wall) 시리즈. 그의 작품을 씨앗페 온라인에서 만날 수 있습니다.',
    ogDescription:
      '이익태(1947–2025) — 영화·연극·퍼포먼스·회화·설치를 가로지른 토탈 아티스트. 한국 최초 독립영화, LA 퍼포먼스, 빙벽 시리즈까지 50년의 실험.',
    ogAlt: '이익태 대표 작품',
    twitterTitle: '이익태 (1947–2025)',
    twitterDescription: '장르의 경계를 지운 한 사람의 실험 — 토탈 아티스트 이익태',
    keywords:
      '이익태 화가, 한국 실험영화, 전위미술, 토탈아티스트, 제4집단, 아침과 저녁 사이, 퍼포먼스 아트, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Iktae — A Total Artist Who Erased Genre Borders (1947–2025)',
    description:
      "Selected works by Lee Iktae (1947–2025), a pioneer of Korean experimental and avant-garde art who worked across film, theatre, performance, painting, and installation for over five decades. Director of Korea's first independent film (1970), founder of Theater 1981, creator of the Ice Wall series. View and collect his works at SAF Online.",
    ogDescription:
      "Lee Iktae (1947–2025) — a total artist who moved freely across film, theatre, performance, painting, and installation. Korea's first independent film, LA performances, Ice Wall. Fifty years of experiment.",
    ogAlt: 'Lee Iktae — featured work',
    twitterTitle: 'Lee Iktae (1947–2025)',
    twitterDescription:
      'One artist who erased the borders between genres — Lee Iktae, total artist',
    keywords:
      'Lee Iktae artist, Korean experimental film, avant-garde art, total artist, The Fourth Group, performance art',
  },
} as const;

export async function buildLeeIktaeMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_IKTAE_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이익태');
  const artwork = allArtworks.find((a) => isLeeIktaeArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Iktae`
      : `${artwork.title} — 이익태`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_IKTAE_PATH, locale, true),
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

export default async function LeeIktaeFeature({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_IKTAE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이익태');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeIktaeArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Iktae' : '이익태', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_IKTAE_PATH}#person-lee-iktae`,
    name: isEnglish ? 'Lee Iktae' : '이익태',
    alternateName: isEnglish ? ['이익태', 'Lee Ik-tae'] : ['Lee Iktae', 'Lee Ik-tae'],
    jobTitle: isEnglish ? 'Artist' : '미술가',
    description: isEnglish
      ? 'Lee Iktae (1947–2025) was a Korean total artist who worked across experimental film, theatre, performance, painting, and installation for over five decades — a pioneer of Korean experimental and avant-garde art.'
      : '이익태(1947–2025)는 영화·연극·퍼포먼스·회화·설치를 넘나들며 50년 이상 활동한 한국 실험·전위미술의 선구자입니다.',
    birthDate: '1947',
    deathDate: '2025',
    knowsAbout: [
      'Experimental film',
      'Performance art',
      'Painting',
      'Installation art',
      'Theatre',
      'Korean avant-garde art',
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
    name: isEnglish ? 'Lee Iktae — SAF Online' : '이익태 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Iktae from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 이익태 작품을 소개합니다.',
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
        {/* Hero Section — 실험·전위 모티프: 불규칙한 선, 열린 프레임 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 실험·해체 모티프 — 비정형 선들 */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute top-0 left-12 h-full w-px bg-white/8" />
            <div className="absolute top-0 right-20 h-full w-px bg-white/8" />
            <div className="absolute top-1/4 left-0 w-full h-px bg-white/5" />
            <div className="absolute bottom-1/4 left-0 w-full h-px bg-white/5" />
            <div className="absolute top-16 left-8 w-6 h-6 border border-white/20 rotate-45" />
            <div className="absolute bottom-20 right-12 w-4 h-4 bg-primary/30 rotate-12" />
            <div className="absolute top-1/2 left-4 w-2 h-24 bg-white/5 -rotate-6" />
            <div className="absolute top-1/3 right-8 w-24 h-px bg-white/10 rotate-12" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Iktae · 1947–2025' : '이익태 · 1947–2025'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  One artist who erased
                  <br />
                  <span className="text-primary-soft">the borders between genres</span>
                </>
              ) : (
                <>
                  장르의 경계를 지운
                  <br />
                  <span className="text-primary-soft">한 사람의 실험</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Film, theatre, performance, painting, installation —
                  </span>
                  <span className="mt-2 block">
                    fifty years of experiment that refused to stay inside any single frame.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">영화, 연극, 퍼포먼스, 회화, 설치 —</span>
                  <span className="mt-2 block">
                    어떤 하나의 틀에도 머물기를 거부한 50년의 실험.
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
                    A total artist —<br />
                    <span className="text-primary-strong">translator of the invisible world</span>
                  </>
                ) : (
                  <>
                    토탈 아티스트 —<br />
                    <span className="text-primary-strong">보이지 않는 세계의 번역자</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Iktae (1947–2025) was a Korean total artist who spent more than fifty
                      years working across experimental film, theatre, performance, painting, and
                      installation. In 1970, while a student at Seoul Institute of the Arts, he
                      directed and starred in <em>Between Morning and Evening</em> — widely
                      recognized as{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Korea&apos;s first independent film
                      </strong>
                      . The work deliberately dismantled conventional film grammar; it was later
                      screened at Tate Modern in London, earning international recognition.
                    </p>
                    <p>
                      In the same period he co-founded the experimental film collective Film 70, and
                      in the mid-1970s joined The Fourth Group alongside Bang Taesu, Kim Kulim, and
                      others — one of Korea&apos;s earliest avant-garde art collectives, which
                      challenged the conventions of the established art world through happenings and
                      experimental action. In 1972 he also helped form the Moving Image Research
                      Forum, a group of university students and filmmakers influenced by French New
                      Wave and New American Cinema.
                    </p>
                    <p>
                      In 1977 Lee moved to the United States, where he would remain for roughly
                      twenty-two years. Turning fully to painting, he won first place at the Clarion
                      Minor Gallery International Exhibition in New York. He also lived in Los
                      Angeles&apos;s Koreatown, working as a freelance journalist covering the daily
                      lives and social issues of Korean immigrants — an experience that shaped his
                      critical view of the &ldquo;fake American Dream&rdquo; and the Korean diaspora
                      condition.
                    </p>
                    <p>
                      It was in Los Angeles that he founded{' '}
                      <strong className="font-bold text-charcoal-deep">Theater 1981</strong>, a
                      performance group that used sound and visuals to confront historical tragedy
                      and social conflict. His &ldquo;Wailing&rdquo; series — experimental
                      performances commemorating the victims of the Gwangju Democracy Movement — was
                      covered in major art publications and mainstream press. His performance
                      <em>Spirit 265</em>, mourning those killed in the KAL 007 shootdown, was
                      reported as a top news item by ABC and other major broadcasters.
                    </p>
                    <p>
                      The 1992 Los Angeles riots became a new turning point. Lee physically
                      transported debris from the burned Koreatown — shattered bottles, melted
                      household objects — into the gallery, and staged the large-scale performance
                      and installation <em>Volcano Island</em>, funded by the Los Angeles Cultural
                      Affairs Department. Broadcast on NBC, the work showed the grief of a minority
                      community caught in racial conflict while simultaneously planting seeds in
                      earth laid over the ruins — a material enactment of recovery and healing.
                      <em>Hugging Angels</em> and <em>The Day of Collage</em> followed, each
                      supported by further L.A. Cultural Affairs grants. He also collaborated with
                      California Expressionist artist GRONK during this period.
                    </p>
                    <p>
                      After returning to Korea in 1999, Lee&apos;s gaze turned to the division of
                      the Korean peninsula. His{' '}
                      <strong className="font-bold text-charcoal-deep">Ice Wall</strong> series
                      placed some 380 yellow ice blocks on Seogang Bridge and Unification Bridge —
                      praying, as the ice melted into the river and out to sea, that the frozen
                      tension between North and South might dissolve. In his later years the{' '}
                      <em>Haiku</em> and <em>Pierrot</em> series turned toward nature and inner
                      life: spreading hanji paper in the yard, pouring pigment, washing it away with
                      water, drying it in the sun — an art made by wind, water, and light as much as
                      by any human hand. He defined the artist as &ldquo;a translator of the
                      invisible world.&rdquo; Lee Iktae passed away on December 7, 2025.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이익태(1947–2025)는 영화·연극·퍼포먼스·회화·설치를 넘나들며 50년 이상을 활동한
                      한국의 토탈 아티스트입니다. 1970년, 서울예술대학 재학 중이던 그는{' '}
                      <strong className="font-bold text-charcoal-deep">한국 최초의 독립영화</strong>
                      로 알려진 「아침과 저녁 사이」를 연기·연출·감독합니다. 기승전결이라는 기존
                      영화 문법을 철저히 파괴한 이 작품은 훗날 영국 테이트 모던에서도 상영되며
                      국제적 인정을 받았습니다.
                    </p>
                    <p>
                      같은 시기 실험영화 그룹 &apos;필름 70&apos;을 창립하고, 1970년대 중반
                      방태수·김구림 등과 함께 한국의 초기 전위예술 그룹인 제4집단에 참여하며 기성
                      예술계의 관습에 도전했습니다. 1972년에는 프랑스 누벨바그와 뉴 아메리칸
                      시네마에 영향 받은 대학생·영화인들로 구성된 영상연구소 창립에도 함께했습니다.
                    </p>
                    <p>
                      1977년 미국으로 건너가 약 22년간 체류합니다. 본격적으로 그림에 전념하여 뉴욕
                      클라리마이너 화랑 국제전에서 1등상을 수상하며 국제 무대에 진출했습니다. 동시에
                      LA 한인타운에 거주하며 프리랜서 기자로 한국 이민자들의 일상과 사회적 문제를
                      취재했고, 이 경험은 &apos;페이크 아메리칸 드림&apos;과 코리안 디아스포라라는
                      비판적 시각을 작업에 담게 합니다.
                    </p>
                    <p>
                      LA에서 그는 퍼포먼스 그룹{' '}
                      <strong className="font-bold text-charcoal-deep">Theater 1981</strong>을
                      창단합니다. 소리와 비주얼에 역점을 둔 실험적 퍼포먼스로, 광주민주화운동
                      희생자들을 추도하는 &apos;곡(Wailing)&apos; 시리즈는 미술전문지와 주요 언론에
                      보도됐습니다. KAL기 격추 사건 희생자들을 추모하는 퍼포먼스 &apos;Spirit
                      265&apos;는 ABC 등 주요 방송국의 뉴스로 다루어졌습니다.
                    </p>
                    <p>
                      1992년 LA 폭동은 새로운 전환점이 됩니다. 불타버린 한인타운의 잔해를 직접
                      전시장으로 옮기고, LA시 문화국의 그랜트로 대형 퍼포먼스·설치 &apos;볼케이노
                      아일랜드&apos;를 연출합니다. NBC TV에 소개된 이 작업은 인종 갈등 속 소수민족의
                      고통을 담으면서도 폐허 위에 씨앗을 심어 싹이 돋는 과정으로 회복과 치유를
                      물질적으로 시연했습니다. 이후 &apos;허깅 엔젤스&apos;, &apos;The Day of
                      Collage&apos;로 연속 그랜트를 받고, 캘리포니아 표현주의 작가 GRONK와도
                      협업했습니다.
                    </p>
                    <p>
                      1999년 귀국 후 그는 한반도 분단을 응시합니다.{' '}
                      <strong className="font-bold text-charcoal-deep">빙벽(Ice Wall)</strong>{' '}
                      시리즈는 서강대교와 통일대교에 380여 개의 노란 얼음 블록을 세우는 작업으로,
                      얼음이 강물에 녹아 바다로 흘러가듯 남북의 경직된 긴장이 해소되기를
                      기원했습니다. 말년에는 마당에 한지를 펴고 물감을 뿌린 후 물로 씻고 햇빛에
                      말리는 행위를 반복하며 &apos;하이쿠(Aiku)&apos; 연작으로 자연의 물성에
                      천착했고, &apos;피에로(Pierrot)&apos; 시리즈에서 인간 내면의 희비극을
                      담아냈습니다. 그는 &ldquo;예술가는 보이지 않는 세계의 번역자&rdquo;라
                      정의했습니다. 2025년 12월 7일 별세했습니다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Major themes card */}
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
                        {isEnglish
                          ? 'Total art / Cross-genre experiment'
                          : '토탈 아트 / 장르 횡단 실험'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Film, theatre, performance, painting, installation — refusing to be contained in any single medium was itself the method.'
                          : '영화·연극·퍼포먼스·회화·설치 — 어느 하나의 매체에 머무르지 않는 것 자체가 방법론이었다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Historical trauma and healing' : '역사적 비극과 치유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Gwangju, KAL 007, the LA riots, the division of Korea — he translated collective wounds into physical acts of mourning and recovery.'
                          : '광주, KAL기 격추, LA 폭동, 분단 — 집단의 상처를 애도와 회복의 물리적 행위로 번역했다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Nature, non-intention, and wu-wei' : '자연·무위·비의도'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In his later years: hanji spread in the yard, water washing pigment, wind and insects completing the work. Moving from painting to being painted.'
                          : '말년의 화업: 마당에 편 한지, 물에 씻기는 물감, 바람과 벌레가 완성하는 그림. "그리는 그림에서 스스로 그려지는 그림으로."'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Timeline */}
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
                      {isEnglish ? 'Born in Korea.' : '출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1967
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Takes part in the Youth Artists Joint Exhibition (Cheongnyeon Jakga Yeollipjeon).'
                        : '청년작가연립전 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Directs and stars in 〈Between Morning and Evening〉 — Korea's first independent film (16mm, b&w, 20 min). Joins The Fourth Group. Co-founds Film 70."
                        : '「아침과 저녁 사이」 연출·주연 — 한국 최초 독립영화 (16mm, 흑백, 20분). 제4집단 합류. 실험영화 그룹 필름 70 공동 창립.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1972
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Co-founds Moving Image Research Forum (university filmmakers influenced by French New Wave and New American Cinema).'
                        : '영상연구소 공동 창립 — 누벨바그·뉴 아메리칸 시네마 영향 받은 대학생 영화인 모임.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1973
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Directs the play 〈Le Voyage de Monsieur Perrichon〉; screens short films 〈The Whereabouts of Light〉 and 〈A Trivial Afternoon〉; holds watercolor exhibition.'
                        : '연극 〈페리숑씨의 여행〉 연출; 단편영화 〈빛의 행방〉·〈시시한 오후〉 상영; 수채화 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1974–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Honorable mentions for screenplays in Dong-A Ilbo New Spring Literary Contest (1974: 〈The Vacation When No One Was There〉; 1975: 〈Requiem〉).'
                        : '동아일보 신춘문예 시나리오 부문 가작 입선 (1974: 〈아무도 없던 휴가〉; 1975: 〈레퀴엠〉).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1977
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Moves to the United States; begins career as a painter. Wins first place at Clarion Minor Gallery International Exhibition, New York.'
                        : '미국으로 이주, 본격적인 화가 생활 시작. 뉴욕 클라리마이너 화랑 국제전 1등상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1981–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Founds performance group Theater 1981 in Los Angeles. "Wailing" series (commemorating Gwangju victims) and "Spirit 265" (KAL 007 victims) receive coverage in major US press and broadcast.'
                        : "LA에서 퍼포먼스 그룹 Theater 1981 창단. '곡(Wailing)' 시리즈(광주 추모)·'Spirit 265'(KAL기 격추 희생자 추모) 미국 주요 언론·방송 보도."}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1992
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'LA riots: creates 〈Volcano Island〉 (LA Cultural Affairs grant; NBC broadcast); followed by 〈Hugging Angels〉 and 〈The Day of Collage〉 (further grants). Collaborates with GRONK.'
                        : 'LA 폭동: 〈볼케이노 아일랜드〉 연출 (LA시 문화국 그랜트; NBC 방영); 이후 〈허깅 엔젤스〉·〈The Day of Collage〉 연속 그랜트. GRONK과 협업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1999
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Returns to Korea. Ice Wall series: ~380 yellow ice blocks placed on Seogang Bridge and Unification Bridge, praying for resolution of national division.'
                        : '귀국. 빙벽(Ice Wall) 시리즈: 서강대교·통일대교에 노란 얼음 블록 약 380개 설치, 남북 분단 해소 기원.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Haiku (Aiku) series and ink paintings: art made by water, wind, and light. Pierrot series: the dual nature of all human beings through the figure of the clown.'
                        : '하이쿠(아이쿠) 연작·먹그림: 물·바람·빛이 함께 완성하는 예술. 피에로 연작: 광대를 통한 인간 이중성 탐구.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2001
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Between Morning and Evening〉 screened at the 27th Korean Independent Short Film Festival.'
                        : '「아침과 저녁 사이」 제27회 한국독립단편영화제 상영.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Between Morning and Evening〉 screened at the 30th Seoul Independent Film Festival.'
                        : '「아침과 저녁 사이」 제30회 서울독립영화제 상영.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Between Morning and Evening〉 screened at Tate Modern, London, as part of the Embeddedness: Artist Films and Videos from Korea 1960s to Now programme.'
                        : '「아침과 저녁 사이」 영국 테이트 모던 상영 (《Embeddedness: Artist Films and Videos from Korea 1960s to Now》).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Passes away on December 7, 2025, in Seoul, aged 78.'
                        : '2025년 12월 7일, 서울에서 별세. 향년 78세.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* Artist's late-period practice — descriptive prose (not attributed as a direct quote) */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Wind, water, and the vanishing hand' : '바람과 물, 사라지는 손'}
                </h3>
                <div className="space-y-4 text-charcoal text-base leading-relaxed break-keep">
                  <p>
                    {isEnglish
                      ? 'In his later years Lee spread hanji across the yard, poured paint, washed it with water, dried it in the sun, and repeated the cycle. Ginkgo leaves and pine needles scattered in the wind; insects flew in. The work was completed less by the artist than by wind, water, light, and leaves — the hand of the maker quietly disappearing into the process.'
                      : '말년의 이익태는 마당에 한지를 펴고 물감을 뿌린 뒤 물로 씻어내고, 햇빛에 말려 다시 그려 씻어내는 행위를 반복했다. 바람에 은행잎과 솔잎이 흩어지고 벌레가 날아들었다. 작업은 작가의 손보다 바람과 물, 빛과 나뭇잎이 완성했다 — 만드는 이의 손은 과정 속으로 조용히 사라졌다.'}
                  </p>
                  <p>
                    {isEnglish
                      ? 'His final 〈Pierrot〉 series turned to the human interior: the clown, a symbol of wit and pathos, standing in for the duality of every life. In bright primary colours carrying a heavy emotional weight, the work held laughter and the sorrow behind it at once.'
                      : '마지막 「피에로(Pierrot)」 연작은 인간의 내면으로 돌아섰다. 위트와 페이소스의 상징인 광대를 통해 모든 삶의 이중성을 담았다. 원색의 밝은 색채가 묵직한 정서의 무게를 견디며, 웃음과 그 뒤의 슬픔을 동시에 품었다.'}
                  </p>
                </div>
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
                  <span className="text-charcoal-deep">on a practice without fixed form</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —<br />
                  <span className="text-charcoal-deep">고정된 형식 없는 실천에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 장르를 가로지른 실험 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Experiment across genres — from 〈Between Morning and Evening〉 to Tate Modern'
                    : '장르를 가로지른 실험 — 「아침과 저녁 사이」에서 테이트 모던까지'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 1970, while studying at Seoul Institute of the Arts, Lee Iktae directed,
                        wrote, and starred in <em>Between Morning and Evening</em> — now recognized
                        as Korea&apos;s first independent film. Shot on 16mm in black and white, the
                        twenty-minute work deliberately dismantled the conventional grammar of film
                        narrative: no rising action, no resolution, no coherent cause and effect.
                        The film follows a young man across a day and its encounters, but its logic
                        is associative, not dramatic. It was a formal provocation at a moment when
                        Korean cinema was largely governed by genre conventions and studio control.
                      </p>
                      <p>
                        In the same year Lee joined The Fourth Group — one of Korea&apos;s earliest
                        avant-garde collectives, which united visual artists and filmmakers in
                        challenging the established art world through happenings and experimental
                        action. He also co-founded Film 70, and in 1972 helped form the Moving Image
                        Research Forum, a group of university students and filmmakers engaged in
                        systematic study of French New Wave and New American Cinema. The
                        accumulation of these affiliations in a single year describes a particular
                        moment: Korean art in 1970 was opening outward, and Lee was among those
                        doing the opening.
                      </p>
                      <p>
                        The long reach of <em>Between Morning and Evening</em> is itself evidence of
                        his place in Korean experimental art history. The film was screened at the
                        27th Korean Independent Short Film Festival (2001), at the 30th Seoul
                        Independent Film Festival (2004), and — most significantly — at Tate Modern
                        in London in 2015, as part of the exhibition{' '}
                        <em>Embeddedness: Artist Films and Videos from Korea 1960s to Now</em>. A
                        work made by a student in 1970 reaching a London museum in 2015: the delay,
                        and the arrival, are both part of what it means to be a pioneer.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1970년, 서울예술대학 재학 중이던 이익태는 「아침과 저녁 사이」를
                        연출·각본·주연으로 제작했다. 16mm 흑백으로 찍은 20분짜리 이 작품은 영화
                        내러티브의 관습적 문법 — 기승전결, 인과관계, 극적 해소 — 을 의도적으로
                        파괴했다. 한 청년이 하루를 보내는 만남들을 따라가지만, 그 논리는 극적이
                        아니라 연상적이다. 한국 영화가 장르 관습과 스튜디오 통제로 운영되던 시대에
                        가해진 형식적 도발이었다.
                      </p>
                      <p>
                        같은 해 이익태는 제4집단에 합류했다. 미술가와 영화인을 하나로 묶어 해프닝과
                        실험적 행위로 기성 예술계에 도전했던, 한국 최초의 전위 예술 집단 중
                        하나였다. 그는 동시에 필름 70도 공동 창립하고, 1972년에는 프랑스 누벨바그와
                        뉴 아메리칸 시네마를 체계적으로 연구하는 대학생·영화인 모임인 영상연구소
                        창립에도 함께했다. 한 해 안에 이 집단들이 축적되는 방식은 하나의 특정한
                        순간을 기술한다: 1970년 한국 예술은 외부를 향해 열리고 있었고, 이익태는 그
                        문을 여는 사람 중 하나였다.
                      </p>
                      <p>
                        「아침과 저녁 사이」의 긴 잔향은 한국 실험영화사에서 그가 차지하는 위치를
                        증언한다. 제27회 한국독립단편영화제(2001), 제30회 서울독립영화제(2004)에
                        상영됐고, 2015년에는 영국 테이트 모던에서 《Embeddedness: Artist Films and
                        Videos from Korea 1960s to Now》의 일환으로 상영됐다. 1970년 한 학생이 만든
                        작품이 2015년 런던 미술관에 닿는 것 — 지연과 도착, 둘 다 선구자라는 것의
                        의미의 일부다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 역사·퍼포먼스·연대 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Performance as witness — Theater 1981 and Volcano Island'
                    : '퍼포먼스는 증언이다 — Theater 1981과 볼케이노 아일랜드'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Lee Iktae moved to the United States in 1977, he came to paint. But the
                        Korean diaspora community he found himself in — and the history that
                        followed it there — could not be addressed in paint alone. In Los Angeles he
                        founded Theater 1981, a performance group built around sound and visual
                        language, to confront historical trauma through collective physical action.
                      </p>
                      <p>
                        The Wailing series commemorated the victims of the Gwangju Democracy
                        Movement — the 1980 pro-democracy uprising suppressed by military force,
                        whose casualties were a wound carried by the Korean diaspora in Los Angeles
                        as much as by those who remained at home. The performances were experimental
                        in method but direct in intent: to enact mourning in public, to refuse the
                        privatization of grief. They were reported in specialized art publications
                        and mainstream press alike. The performance <em>Spirit 265</em>,
                        commemorating the 269 people killed when a Soviet fighter jet shot down
                        Korean Air Lines Flight 007 in September 1983, was treated as a top news
                        story by ABC and other major broadcasters — a measure of the depth of
                        community response it touched.
                      </p>
                      <p>
                        After the 1992 Los Angeles riots, which devastated Koreatown, Lee&apos;s
                        response was again to bring the destroyed world physically into art space:
                        charred debris, shattered bottles, melted household objects transported
                        directly into the gallery. <em>Volcano Island</em>, created with funding
                        from the Los Angeles Cultural Affairs Department and broadcast on NBC, did
                        not only display wreckage — it also laid earth on top of the ruins and
                        planted seeds. The work held both grief and the possibility of recovery in
                        the same space. Lee continued to receive L.A. Cultural Affairs grants for
                        <em>Hugging Angels</em> and <em>The Day of Collage</em>. He also
                        collaborated during this period with the California Expressionist artist
                        GRONK. In all of this, performance was not a form chosen for its own sake
                        but because some moments demand witness in the body, not just the eye.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1977년 미국으로 건너간 이익태는 그림을 그리기 위해 왔다. 그러나 그가 마주한
                        한국 디아스포라 공동체 — 그리고 거기까지 따라온 역사 — 는 그림 만으로 감당할
                        수 없었다. LA에서 그는 Theater 1981을 창단했다. 소리와 시각 언어를 통해
                        역사적 트라우마를 집단적 신체 행위로 직면하는 퍼포먼스 그룹이었다.
                      </p>
                      <p>
                        &apos;곡(Wailing)&apos; 시리즈는 광주민주화운동 희생자들을 추도했다.
                        군사력에 의해 진압된 1980년 민주화 항쟁의 상처는, 귀국한 사람들만큼이나 LA의
                        코리안 디아스포라가 함께 짊어진 것이었다. 퍼포먼스는 방법에서 실험적이었지만
                        의도에서 직접적이었다: 공개적으로 애도를 수행하고, 슬픔의 사유화를 거부하는
                        것. 미술 전문지와 주류 언론 모두에 보도됐다. 1983년 9월 소련 전투기에 격추된
                        KAL 007편 희생자 269명을 추모하는 퍼포먼스 &apos;Spirit 265&apos;는 ABC 등
                        주요 방송국의 주요 뉴스로 다루어졌다.
                      </p>
                      <p>
                        1992년 LA 폭동으로 한인타운이 초토화된 이후, 이익태의 응답은 다시금 파괴된
                        세계를 물리적으로 예술 공간 안으로 가져오는 것이었다: 불탄 잔해, 깨진 술병,
                        녹아내린 가재도구들이 직접 전시장으로 옮겨졌다. LA시 문화국의 그랜트로
                        제작되고 NBC에 방영된 &apos;볼케이노 아일랜드&apos;는 폐허만 보여주지 않았다
                        — 그 위에 흙을 깔고 씨앗을 심었다. 한 공간 안에 비탄과 회복의 가능성을 함께
                        담았다. 이후 &apos;허깅 엔젤스&apos;, &apos;The Day of Collage&apos;로 LA시
                        문화국의 그랜트를 연속 받고, 캘리포니아 표현주의 작가 GRONK과 협업했다. 이
                        모든 과정에서 퍼포먼스는 형식 자체를 위해 선택된 것이 아니었다 — 어떤 순간은
                        눈이 아닌 몸으로 증언하기를 요구하기 때문이었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 말년의 전환 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'From painting to being painted — the late work'
                    : '그리는 그림에서 스스로 그려지는 그림으로 — 말년의 전환'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        After returning to Korea in 1999 and completing the Ice Wall series — its
                        380 yellow ice blocks on two Seoul bridges, its silent prayer for the
                        dissolution of division — Lee Iktae turned toward a quieter territory. In
                        the mid-2000s, living outside the city, he developed what he called the
                        Haiku (Aiku) series: works made by spreading hanji in the yard, pouring
                        pigment, washing it away with water, drying it in the sun, then beginning
                        again. Wind scattered leaves across the surface. Bees and butterflies and
                        dragonflies landed and moved on. The work was completed not by the artist
                        alone but by everything present — a feast made by wind, water, air, insects,
                        and leaves.
                      </p>
                      <p>
                        In his own account of the shift: &ldquo;For a long time I struggled to
                        express the heavy burden of meaning, symbol, and message. When I abandoned
                        form, meaning, and symbol, my heart became lighter.&rdquo; The Haiku series
                        developed alongside ink paintings that reached for a similar condition — the
                        work that paints itself, the work that does not carry the artist&apos;s
                        intention as a load. He described his artist&apos;s identity as that of
                        &ldquo;a translator of the invisible world&rdquo;: someone who does not
                        impose vision but opens a channel.
                      </p>
                      <p>
                        The Pierrot series, which occupied his final years, turned this inward. The
                        clown — a figure of wit and pathos simultaneously — became the vehicle for
                        exploring the double nature of every person: grief behind laughter,
                        sincerity inside performance. Painted on hanji with acrylic and oil pastel,
                        the works hold together bright primary color and emotional weight, smeared
                        and pressed texture, the comedy and the sorrow that cannot be separated.
                        &ldquo;We are all clowns who have appeared on the stage of the world,&rdquo;
                        he said. The advice he gave to younger artists — &ldquo;tell your own story
                        rather than seeking fame&rdquo; — belonged to the same understanding: that
                        art is not a destination but a relationship, a form of being present to what
                        is actually there.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1999년 귀국하고 빙벽(Ice Wall) 시리즈 — 서울 두 다리 위의 노란 얼음 블록
                        380여 개, 분단 해소를 향한 조용한 기원 — 를 완성한 뒤, 이익태는 더 조용한
                        영역으로 향했다. 2000년대 중반, 도시 바깥에서 생활하며 그는
                        &apos;하이쿠(아이쿠)&apos; 연작을 발전시켰다: 마당에 한지를 펴고 물감을 뿌린
                        후 물로 씻고, 햇빛에 말리고, 다시 시작하는 작업. 바람이 나뭇잎을 화면 위로
                        흩었다. 벌과 나비, 잠자리가 내려앉았다 날아갔다. 작업은 작가 혼자만이
                        아니라, 그 자리에 있는 모든 것으로 완성됐다 — 바람과 물과 공기, 벌레와
                        나뭇잎이 벌이는 잔치로.
                      </p>
                      <p>
                        이 전환에 대한 그 자신의 설명: &ldquo;나는 오랜 동안 의미와 상징, 메시지라는
                        무거운 짐을 표현하려고 낑낑 거렸다. 형태나 의미, 상징을 포기하자 마음이
                        가벼워졌다.&rdquo; 하이쿠 연작은 같은 상태를 향하는 먹그림과 함께 전개됐다 —
                        스스로 그려지는 그림, 작가의 의도를 짐처럼 지지 않는 작업. 그는 자신의
                        예술가적 정체성을 &ldquo;보이지 않는 세계의 번역자&rdquo;로 정의했다: 시각을
                        강제하는 것이 아니라 통로를 여는 사람.
                      </p>
                      <p>
                        말년을 채운 피에로 연작은 이것을 내면으로 향했다. 위트와 페이소스를 동시에
                        지닌 존재인 광대는 모든 사람의 이중성 — 웃음 뒤의 슬픔, 퍼포먼스 안의 진심 —
                        을 탐구하는 매개가 됐다. 한지에 아크릴과 오일파스텔로 그려진 작품들은 원색의
                        밝은 색채와 정서의 무게, 문질리고 눌린 질감, 분리할 수 없는 희극과 비극을
                        함께 담았다. &ldquo;세상이라는 무대에 등장한 우리는 모두 광대다&rdquo;라고
                        그는 말했다. 후배 작가들에게 전한 조언 — &ldquo;유명해지기보다 너 자신의
                        이야기를 하라&rdquo; — 도 같은 이해에 속했다: 예술은 목적이 아니라 관계이며,
                        실제로 거기 있는 것에 현존하는 방식이라는.
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
                      From the 16mm frame of <em>Between Morning and Evening</em> in 1970 to the
                      hanji yard in the 2010s, Lee Iktae&apos;s practice pursued a single question
                      in many forms: how does one stay present to what cannot be contained — to
                      history, to community, to the invisible movements of light and water and wind?
                      He joins this campaign not as a subject of its cause but as a fellow artist in
                      solidarity — so that those who come after might work without the weight he
                      carried, and with the freedom he spent his life practicing.
                    </>
                  ) : (
                    <>
                      1970년 「아침과 저녁 사이」의 16mm 프레임에서 2010년대 마당의 한지까지,
                      이익태의 실천은 하나의 물음을 여러 형식으로 추구해왔다: 담을 수 없는 것들 —
                      역사, 공동체, 빛과 물과 바람의 보이지 않는 움직임 — 에 어떻게 현존하는가. 그는
                      씨앗페에 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로 함께한다 — 다음
                      세대의 예술인들이 그가 짊어진 무게 없이, 그가 평생 연습한 자유로 일할 수
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
                    점의 작품을 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Iktae</span>
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
                    Lee Iktae joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이익태 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_IKTAE_PATH}
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
