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

// 거장 작가 feature는 작가 페이지(/artworks/artist/신학철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SHIN_HAKCHUL_PATH = `/artworks/artist/${encodeURIComponent('신학철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isShinHakchulArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '신학철' ||
    n === 'shin hak-chul' ||
    n === 'shin hakchul' ||
    n.replace(/[\s-]+/g, '') === 'shinhakchul'
  );
};

const PAGE_COPY = {
  ko: {
    title: '신학철 — 한국현대사 연작의 거장',
    description:
      '한국현대사 연작의 거장 신학철(1943–). 인체와 사물이 기관차처럼 수직으로 응축되는 포토몽타주로 한 세기의 한국 근현대사를 그린 민중미술 1세대 거장. 「모내기」 사건으로 표현의 자유의 상징이 된 신학철의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '한국현대사 연작의 거장 신학철. 인체와 사물이 수직으로 응축되는 포토몽타주로 한 세기의 역사를 한 화면에 담아낸 민중미술 1세대.',
    ogAlt: '신학철 대표 작품',
    twitterTitle: '신학철',
    twitterDescription: '역사는 수직으로 쌓인다 — 한국현대사 연작의 거장 신학철',
    keywords: '신학철 화가, 한국근대사, 한국현대사, 포토몽타주, 민중미술, 모내기, 씨앗페 온라인',
  },
  en: {
    title: 'Shin Hak-chul — Master of the Korean History Series',
    description:
      'Selected works by Shin Hak-chul (b. 1943), master of the Korean modern history series. Through photomontage in which bodies and objects compress vertically like a locomotive, he painted a century of Korean history. A first-generation minjung art master who became a symbol of free expression through the 〈Rice Planting〉 case. View and collect his works at SAF Online.',
    ogDescription:
      'Shin Hak-chul — master of the Korean history series. Photomontage that compresses a century of history into a single vertical frame.',
    ogAlt: 'Shin Hak-chul — featured work',
    twitterTitle: 'Shin Hak-chul',
    twitterDescription: 'History stacks vertically — master of the Korean modern history series',
    keywords:
      'Shin Hak-chul artist, Korean modern history, photomontage, minjung misul, Korean political art',
  },
} as const;

export async function buildShinHakchulMetadata({
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
  const pageUrl = buildLocaleUrl(SHIN_HAKCHUL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('신학철');
  const artwork = allArtworks.find((a) => isShinHakchulArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Shin Hak-chul`
      : `${artwork.title} — 신학철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SHIN_HAKCHUL_PATH, locale, true),
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

export default async function ShinHakchulFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SHIN_HAKCHUL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('신학철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isShinHakchulArtist(artwork.artist)
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
    { name: isEnglish ? 'Shin Hak-chul' : '신학철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SHIN_HAKCHUL_PATH}#person-shin-hakchul`,
    name: isEnglish ? 'Shin Hak-chul' : '신학철',
    alternateName: isEnglish ? '신학철' : 'Shin Hak-chul',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Shin Hak-chul (b. 1943) is a first-generation Korean minjung art master who painted a century of Korean modern history through photomontage in which bodies and objects compress vertically.'
      : '신학철(1943–)은 인체와 사물이 수직으로 응축되는 포토몽타주로 한 세기의 한국 근현대사를 그려온 민중미술 1세대 거장입니다.',
    birthDate: '1943-12-12',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Gimcheon, North Gyeongsang, South Korea' : '경북 김천',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Western Painting' : '홍익대학교 서양화과',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish
        ? "Minjung Misul Hyeopuihoe (National Artists' Association)"
        : '민족미술협의회',
    },
    knowsAbout: ['Photomontage', 'Korean minjung art', 'Korean modern history'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Shin Hak-chul — SAF Online' : '신학철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Shin Hak-chul from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 신학철 작품을 소개합니다.',
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

          {/* Vertical strata lines — 역사의 지층 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Shin Hak-chul · b. 1943' : '신학철 · 1943–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  History stacks vertically
                  <br />
                  <span className="text-primary-soft">through a single body</span>
                </>
              ) : (
                <>
                  역사는 한 사람의 몸에
                  <br />
                  <span className="text-primary-soft">수직으로 쌓인다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    He compressed the weight of a century into a single frame.
                  </span>
                  <span className="mt-2 block">
                    Bodies and objects stacked like a locomotive of Korean modern history.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한 세기의 무게를 한 화면에 응축하다.</span>
                  <span className="mt-2 block">
                    인체와 사물이 기관차처럼 쌓여 올라가는 한국 근현대사.
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
                    History, stacked —<br />
                    <span className="text-primary-strong">a century compressed into one frame</span>
                  </>
                ) : (
                  <>
                    쌓아 올린 역사 —<br />
                    <span className="text-primary-strong">한 화면에 응축된 한 세기</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Shin Hak-chul (b. 1943) was born in Gimcheon, North Gyeongsang province, and
                      graduated from Hongik University&apos;s Department of Western Painting in
                      1968. He entered the art world as a modernist, and from 1970 to 1975
                      participated in the AG (Korean Avant-garde Association) exhibitions — a
                      crucible for the generation questioning the dominant abstract formalism of the
                      era.
                    </p>
                    <p>
                      Through the 1970s he moved through objet and collage experiment, contributing
                      to the <em>Seoul Method</em> exhibitions (1977–1981) and building a practice
                      rooted in photographic and mass-media imagery. Where most of his
                      contemporaries were working in monochrome, Shin was already cutting
                      photographs from newspapers and magazines, using the camera&apos;s document as
                      raw material rather than paint.
                    </p>
                    <p>
                      The decisive turn came in 1978. After the shock of encountering the photo
                      anthology &ldquo;A Century of Korea in Photographs,&rdquo; he moved beyond
                      individual formal experiment toward the{' '}
                      <strong className="font-bold text-charcoal">
                        collective memory of an era
                      </strong>
                      . Photographs, he understood, were not decoration — they were evidence.
                      Cutting and pasting images from newspapers, magazines, and textbooks, he
                      arrived at the 〈Korean Modern History〉 and 〈Korean Contemporary History〉
                      series: photomontages in which bodies and objects compress vertically like a
                      locomotive of history.
                    </p>
                    <p>
                      This series — spanning{' '}
                      <strong className="font-bold text-charcoal-deep">
                        forty years from 1980 to 2021
                      </strong>
                      , comprising around forty major works — traces Korean history from the Donghak
                      Peasant Revolt through the 1980s democratization movement, placing unnamed
                      figures rather than great men at its center. In his work, history is not laid
                      out flat but stacked vertically. A single body becomes the cross-section of an
                      era; those cross-sections accumulate layer upon layer into the geological
                      strata of Korean modern history.
                    </p>
                    <p>
                      When the 1987 painting 〈Rice Planting〉 was seized under the National
                      Security Act in September 1989 and Shin was detained, the work became
                      something larger than itself — a test case for the relationship between art
                      and state power. He was acquitted in the first and second trials, yet
                      convicted by the Supreme Court in 1999. In 2004 the UN Human Rights Committee
                      ruled the conviction a violation of freedom of expression under Article 19 of
                      the ICCPR and recommended redress. The painting now rests in MMCA custody
                      (since 2018), its legal status still unrectified — a master who became, by
                      force of circumstance, a symbol of free expression itself.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      신학철(1943–)은 경북 김천에서 태어나 1968년 홍익대학교 서양화과를 졸업했다.
                      그는 모더니스트로 미술계에 발을 들였으며, 1970년부터 1975년까지{' '}
                      <strong className="font-bold text-charcoal-deep">
                        AG(한국아방가르드협회)전
                      </strong>
                      에 참여하며 당대의 지배적 추상 형식주의에 물음을 던지는 세대의 현장에 섰다.
                    </p>
                    <p>
                      1970년대 내내 그는 오브제와 사진 콜라주 실험을 이어갔다. 1977년부터 1981년까지
                      이어진 서울방법전에 참여하면서, 신문·잡지에서 오려낸 사진 이미지를 원재료로
                      삼는 작업을 발전시켰다. 단색화가 화단을 지배하던 시대에, 그는 카메라의 기록을
                      안료 대신 사용했다.
                    </p>
                    <p>
                      전환점은 1978년이었다. 사진집 「사진으로 보는 한국 백년」을 접한 충격 이후,
                      그는 개인의 조형 실험을 넘어{' '}
                      <strong className="font-bold text-charcoal">한 세기의 집단적 기억</strong>
                      으로 향했다. 사진은 장식이 아니라 증거였다. 신문·잡지·교과서의 이미지를 오려
                      붙인 포토몽타주로, 인체와 사물이 기관차처럼 수직으로 응축되는 「한국근대사」·
                      「한국현대사」 연작이 태어났다.
                    </p>
                    <p>
                      이 연작은{' '}
                      <strong className="font-bold text-charcoal-deep">
                        1980년부터 2021년까지 40년
                      </strong>
                      에 걸쳐 40여 점의 대작으로 이어지며, 동학 농민혁명부터 1980년대 민주화
                      운동까지 한국 근현대사를 영웅이 아닌 무명의 인물들을 주인공으로 형상화한다.
                      그의 화면에서 역사는 평면에 나열되지 않고 수직으로 쌓인다. 한 사람의 몸이 한
                      시대의 단면이 되고, 그 단면들이 겹겹이 축적되어 한국 근현대사의 지층을 이룬다.
                    </p>
                    <p>
                      1987년 작 「모내기」가 1989년 9월 국가보안법 이적표현물로 압수되고 작가가
                      구속되었을 때, 그 그림은 작품 이상의 것이 되었다 — 예술과 국가권력의 관계를
                      묻는 시험대. 1·2심에서 무죄가 선고됐지만 1999년 대법원에서 유죄가 확정됐다.
                      2004년 UN 자유권규약위원회는 이 유죄 판결이 국제인권규약 제19조(표현의 자유)를
                      침해한다고 인정하고 시정을 권고했다. 작품은 2018년 국립현대미술관 위탁보관으로
                      옮겨졌지만 법적 복권은 아직 이루어지지 않았다 — 시대의 힘으로 표현의 자유의
                      상징이 된 거장이다.
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
                        {isEnglish ? 'Vertical montage' : '수직 몽타주'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Bodies and objects compress like a locomotive — history rendered not as a flat sequence but as vertical strata.'
                          : '인체·사물이 기관차처럼 응축되는 형식미. 역사를 평면이 아닌 수직의 지층으로 그린다.'}
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
                          ? '〈Rice Planting〉 and free expression'
                          : '「모내기」와 표현의 자유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His 1987 〈Rice Planting〉 was seized under the National Security Act in 1989. Acquitted twice, convicted in 1999 — yet in 2004 the UN Human Rights Committee ruled it a violation of freedom of expression.'
                          : '1987년 작 「모내기」는 1989년 국가보안법으로 압수되고 작가는 구속됐다. 1·2심 무죄에도 1999년 유죄가 확정됐으나, 2004년 UN 자유권규약위원회는 표현의 자유 침해를 인정했다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Historical consciousness' : '민중미술 1세대의 역사의식'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A gaze fixed on the collective and on history rather than the individual — his work stands as testimony to an era.'
                          : '개인이 아닌 집단과 역사를 향하는 시선. 그의 작업은 한 시대의 증언이자 기록이다.'}
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
                      1943
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Gimcheon, North Gyeongsang province.'
                        : '경북 김천 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1968
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Graduates from Hongik University, Dept. of Western Painting.'
                        : '홍익대학교 서양화과 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Joins the AG (Korean Avant-garde Association) exhibitions (through 1975); later the Seoul Method exhibitions (1977–1981).'
                        : 'AG(한국아방가르드협회)전 참여(~1975); 이후 서울방법전(1977–1981) 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Experiments with objet and photographic collage using mass-media imagery.'
                        : '사진 콜라주·오브제 실험 — 대중매체 이미지를 원재료로 삼는 작업 개시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1978
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Encounters "A Century of Korea in Photographs"; turns toward history.'
                        : '사진집 「사진으로 보는 한국 백년」을 접하고 작업 전환.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1980s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins the 〈Korean Modern History〉 & 〈Korean Contemporary History〉 series.'
                        : '「한국근대사」·「한국현대사」 연작 발표, 포토몽타주 양식 확립.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Paints 〈Rice Planting〉.' : '「모내기」 제작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1989
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Rice Planting〉 seized under the National Security Act; the artist is detained.'
                        : '「모내기」 국가보안법상 이적표현물로 압수, 작가 구속.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1999
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'After Supreme Court remand, convicted (10-month suspended sentence); the work is confiscated.'
                        : '대법원 파기환송 후 유죄 확정(징역 10개월 선고유예), 작품 몰수.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1991
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition at Hakgojae Gallery, Seoul — held to commemorate the inaugural Minjung Art Award.'
                        : '학고재갤러리 개인전 — 제1회 민족미술상 수상 기념전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The UN Human Rights Committee rules the conviction a violation of free expression under ICCPR Art. 19; recommends redress.'
                        : 'UN 자유권규약위원회, 국제인권규약 제19조 표현의 자유 침해 인정·시정 권고.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Rice Planting〉 placed in the custody of MMCA; legal status remains unrectified.'
                        : '「모내기」 국립현대미술관 위탁보관. 법적 복권은 아직 이루어지지 않음.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '60-year retrospective 《Shin Hak-chul: Montage of an Era》, Gwangju Museum of Art (Dec 2024 – Mar 2025).'
                        : '《신학철–시대의 몽타주》 60년 회고전, 광주시립미술관(2024.12–2025.3).'}
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
                          Group exhibition:{' '}
                          <a
                            href="https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《15 Years of Minjung Art: 1980–1994》, MMCA (1994)
                          </a>
                        </>
                      ) : (
                        <>
                          단체전:{' '}
                          <a
                            href="https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=200904050002593"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            《민중미술 15년: 1980–1994》, 국립현대미술관 (1994)
                          </a>
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Solo exhibition, Hakgojae Gallery, Seoul (1991) — inaugural Minjung Art
                          Award commemoration; 2인전 <em>Monumental Landscape of the Body</em> with
                          Fang Lijun, Hakgojae (2016)
                        </>
                      ) : (
                        <>
                          학고재갤러리 개인전 (1991) — 제1회 민족미술상 수상 기념; 신학철·팡리쥔
                          2인전 《기념비적 몸의 풍경》, 학고재갤러리 (2016)
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          60-year retrospective <em>Montage of an Era</em>, Gwangju Museum of Art
                          (Dec 2024 – Mar 2025)
                        </>
                      ) : (
                        <>60년 회고전 《신학철–시대의 몽타주》, 광주시립미술관 (2024.12–2025.3)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          MMCA collection:{' '}
                          <a
                            href="https://www.mmca.go.kr/collections/collectionsDetailPage.do?wrkinfoSeqno=6112"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            〈Korean Modern History — Who Said They Saw the Sky?〉 (1989)
                          </a>
                          , 〈Korean Modern History — Synthesis〉 (1982–83), and others
                        </>
                      ) : (
                        <>
                          국립현대미술관 소장:{' '}
                          <a
                            href="https://www.mmca.go.kr/collections/collectionsDetailPage.do?wrkinfoSeqno=6112"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            「한국근대사-누가 하늘을 보았다 하는가」(1989)
                          </a>
                          , 「한국근대사-종합」(1982–83) 등
                        </>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Seoul Museum of Art collection: 〈Metamorphosis 5〉 (1981), 〈Resurrection 1〉 (1979), and others'
                        : '서울시립미술관 소장: 「변신 5」(1981), 「부활 1」(1979) 등'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — 박생광 패턴 차용, 신학철 charcoal 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its weight</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 무게에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 모더니스트에서 증언자로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From modernist to witness — the 1978 turn'
                    : '모더니스트에서 증언자로 — 1978년의 전환'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Shin Hak-chul graduated from Hongik University in 1968, Korean
                        modernism was dominated by monochrome abstraction. He was part of the
                        generation that contested it: joining the AG (Korean Avant-garde
                        Association) exhibitions from 1970, he worked through objet, installation,
                        and photographic collage across the 1970s — a period when using a photograph
                        as raw material was itself a formal provocation.
                      </p>
                      <p>
                        The turn came not from theory but from a book. Encountering the photo
                        anthology <em>A Century of Korea in Photographs</em> in 1978, he was struck
                        by the accumulated weight of documentary image: this was not aesthetic
                        material but evidence — of colonization, war, and the daily violence of
                        modern Korean history. From that encounter forward, photographic images from
                        newspapers, magazines, and textbooks became the primary medium. The goal was
                        no longer formal innovation but testimony:{' '}
                        <em>to show that what happened, happened</em>.
                      </p>
                      <p>
                        The 〈Korean Modern History〉 series, begun around 1980, is the direct
                        result. Where his peers were refining their monochrome surfaces, Shin was
                        cutting and stacking — bodies, machinery, crowd photographs, maps — into
                        vertical columns that compressed a century of history into a single image.
                        The modernist became a witness, and the witness built archives.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1968년 홍익대학교를 졸업할 무렵의 한국 화단은 단색화의 추상이 주도하고
                        있었다. 신학철은 그에 물음을 던진 세대의 일원이었다. 1970년부터 한국
                        아방가르드협회(AG)전에 참여하며, 그는 오브제·설치·사진 콜라주를 경유하는
                        1970년대를 보냈다 — 사진을 원재료로 쓴다는 것 자체가 형식적 도발이던 시대에.
                      </p>
                      <p>
                        전환은 이론에서 오지 않았다. 1978년, 사진집 「사진으로 보는 한국 백년」을
                        접하고 그는 충격을 받았다. 축적된 기록 이미지의 무게가 미학적 소재가 아니라
                        증거라는 것 — 식민, 전쟁, 한국 근현대사의 일상적 폭력에 대한 증거. 그 이후
                        신문·잡지·교과서에서 오려낸 사진 이미지가 1차 매체가 됐다. 목표는 더 이상
                        형식 혁신이 아니었다. 목표는 증언이었다:{' '}
                        <em>일어난 일이 일어났음을 보여주는 것</em>.
                      </p>
                      <p>
                        1980년 전후 시작된 「한국근대사」 연작은 그 직접적 결과다. 동료들이 단색
                        화면을 다듬는 동안, 신학철은 오리고 쌓았다 — 인체, 기계, 군중 사진, 지도를
                        수직으로 응축하여 한 세기의 역사를 한 화면에 눌러 담았다. 모더니스트는
                        증언자가 됐고, 증언자는 아카이브를 구축했다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 수직으로 쌓는 역사 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'History stacked vertically — the form of the 〈Korean History〉 series'
                    : '수직으로 쌓는 역사 — 「한국근대사·한국현대사」 연작의 형식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The key formal choice in the 〈Korean Modern History〉 and 〈Korean
                        Contemporary History〉 series is vertical compression. Western history
                        painting arranges events horizontally — a frieze of time. Shin&apos;s
                        photomontages stack them. Bodies occupy the full height of the canvas: a
                        foot planted in the peasant uprisings of the late nineteenth century; a
                        torso bearing the colonial period; a head breaking through the surface of
                        the 1980s. A single body contains multiple eras. Time is not narrated; it is
                        geological.
                      </p>
                      <p>
                        The series spans{' '}
                        <strong className="font-bold text-charcoal-deep">
                          forty years from 1980 to 2021
                        </strong>{' '}
                        — around forty major works. Among the most significant:{' '}
                        <a
                          href="https://www.mmca.go.kr/collections/collectionsDetailPage.do?wrkinfoSeqno=6112"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary-strong"
                        >
                          〈Korean Modern History — Who Said They Saw the Sky?〉
                        </a>{' '}
                        (1989, MMCA collection) and 〈Korean Modern History — Synthesis〉 (1982–83,
                        MMCA). In these canvases, unnamed figures — not leaders or heroes — are the
                        protagonists of Korean history, a formal argument about who carries the
                        weight of a nation&apos;s past.
                      </p>
                      <p>
                        Critics have described the series as establishing a new form of critical
                        figuration within Korean art — the photomontage not as experiment but as
                        political archive. For four decades, from the first wave of minjung art
                        through to the 2021 works, the series has remained the most sustained
                        single-artist reckoning with Korean modern history in the medium of
                        painting.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        「한국근대사」·「한국현대사」 연작의 핵심 형식 선택은 수직 압축이다. 서양의
                        역사화는 시간을 수평으로 배열한다 — 시간의 프리즈. 신학철의 포토몽타주는
                        그것을 쌓는다. 인체가 캔버스의 전체 높이를 차지한다: 발은 19세기 말 농민
                        봉기에 디딘 채, 몸통은 식민 시기를 감당하고, 머리는 1980년대 민주화 운동을
                        뚫고 나온다. 하나의 몸이 여러 시대를 담는다. 시간은 서술되지 않는다 — 지층이
                        된다.
                      </p>
                      <p>
                        이 연작은{' '}
                        <strong className="font-bold text-charcoal-deep">
                          1980년부터 2021년까지 40년
                        </strong>
                        에 걸쳐 40여 점의 대작으로 이어진다. 그 중에서도 대표작은{' '}
                        <a
                          href="https://www.mmca.go.kr/collections/collectionsDetailPage.do?wrkinfoSeqno=6112"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-primary-strong"
                        >
                          「한국근대사-누가 하늘을 보았다 하는가」
                        </a>
                        (1989, 국립현대미술관 소장)와 「한국근대사-종합」(1982–83, 국립현대미술관).
                        이 화면들에서 역사의 주인공은 지도자나 영웅이 아니라 이름 없는 존재들 — 누가
                        역사의 무게를 짊어지는가에 대한 형식적 주장이다.
                      </p>
                      <p>
                        비평계는 이 연작이 한국 미술 안에서 새로운 비판적 형상성을 확립했다고
                        평가한다 — 포토몽타주를 실험이 아닌 정치적 아카이브로. 민중미술의 첫
                        파고로부터 2021년 작까지, 이 연작은 회화 매체 안에서 단독 작가가 한국
                        근현대사를 가장 지속적으로 대면해 온 기록으로 남는다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 모내기, 한 점의 그림이 받은 재판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈Rice Planting〉 — the trial a single painting received'
                    : '「모내기」 — 한 점의 그림이 받은 재판'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 1987, Shin Hak-chul completed 〈Rice Planting〉 — a photomontage
                        depicting farmers bent in the act of planting rice, a scene of collective
                        labour and the desire for reunification embedded in its imagery. It was
                        exhibited at the 1987 National Art Association Reunification Exhibition.
                      </p>
                      <p>
                        In September 1989, prosecutors determined that the work constituted
                        subversive material in praise of North Korea under the National Security
                        Act. The painting was seized. Shin was detained and charged. He was
                        acquitted in the first trial, and acquitted again on appeal. In 1998 the
                        Supreme Court sent the case back for retrial; in August 1999 he was
                        convicted — ten months, suspended, with the work confiscated.
                      </p>
                      <p>
                        The case did not end there. In 2004, the United Nations Human Rights
                        Committee — the treaty body monitoring compliance with the International
                        Covenant on Civil and Political Rights — ruled that the Republic of Korea
                        had violated Article 19 of the Covenant (freedom of expression) and
                        recommended redress. It was the first time a UN human rights body had ruled
                        on a South Korean artwork.
                      </p>
                      <p>
                        The painting has been held in MMCA custody since 2018. Its legal
                        rehabilitation has not been enacted. The work remains a singular case in the
                        global history of art and law: a painting prosecuted, acquitted, convicted,
                        condemned by an international body — and still waiting.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1987년, 신학철은 「모내기」를 완성했다. 농부들이 몸을 굽혀 모를 심는 장면을
                        포토몽타주로 담은 그림으로, 집단 노동과 통일에 대한 열망이 이미지 안에
                        새겨진 작품이었다. 같은 해 민족미술협의회 통일전에 출품됐다.
                      </p>
                      <p>
                        1989년 9월, 검찰은 이 작품이 국가보안법상 북한을 찬양하는 이적표현물에
                        해당한다고 판단했다. 작품은 압수됐다. 신학철은 구속됐다. 1심에서 무죄,
                        항소심에서도 무죄. 그러나 1998년 대법원이 사건을 파기환송했고, 1999년 8월
                        유죄 판결이 확정됐다 — 징역 10개월 선고유예, 작품 몰수.
                      </p>
                      <p>
                        사건은 거기서 끝나지 않았다. 2004년, 국제인권규약(ICCPR) 이행을 감시하는
                        조약 기구 UN 자유권규약위원회는 대한민국이 규약 제19조(표현의 자유)를
                        침해했다고 인정하고 시정을 권고했다. UN 인권 기구가 한국 미술 작품에 대해
                        판정을 내린 최초의 사례였다.
                      </p>
                      <p>
                        작품은 2018년부터 국립현대미술관에 위탁보관 중이다. 법적 복권은 이루어지지
                        않았다. 「모내기」는 세계 미술·법률의 역사에서 유례가 드문 사례로 남는다 —
                        기소되고, 무죄가 났다가, 유죄가 됐고, 국제기구에 의해 잘못임이 확인된,
                        아직도 기다리는 그림.
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
                      From the AG galleries of the 1970s to the canvases of the 2020s, Shin
                      Hak-chul&apos;s work has pursued a single question: how does a body carry the
                      weight of history, and how does a painting carry that body? The answer, built
                      over five decades, is a photomontage archive unlike anything else in Korean
                      art. He joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that those who come after might work without the
                      weight he has borne.
                    </>
                  ) : (
                    <>
                      1970년대 AG 화랑에서 2020년대 캔버스까지, 신학철의 작업은 하나의 물음을 추구해
                      왔다: 몸은 어떻게 역사의 무게를 감당하는가, 그리고 그림은 어떻게 그 몸을
                      감당하는가. 50년에 걸쳐 구축된 대답이 한국 미술에 유례없는 포토몽타주
                      아카이브다. 씨앗페에는 이 캠페인의 대상이 아니라, 동료 예술인과의 연대자로
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
                    점의 작품을 볼 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Shin Hak-chul</span>
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
                    Shin Hak-chul joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    신학철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={SHIN_HAKCHUL_PATH}
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
