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

// 거장 작가 feature는 작가 페이지(/artworks/artist/장천 김성태)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB의 name_ko는 정확히 '장천 김성태'(공백 포함).
const KIM_SEONGTAE_PATH = `/artworks/artist/${encodeURIComponent('장천 김성태')}`;

const normalizeArtistKey = (value: string): string =>
  value.normalize('NFC').trim().toLowerCase().replace(/\s+/g, '');
const isKimSeongtaeArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  // 공백 제거 후 비교 — '장천 김성태' / '김성태' / 호(장천) 유무 모두 매칭.
  return (
    n === '장천김성태' || n === '김성태' || n === 'jangcheonkimseongtae' || n === 'kimseongtae'
  );
};

const PAGE_COPY = {
  ko: {
    title: '장천 김성태 — 붓끝으로 한국을 쓴 캘리그라피의 거장',
    description:
      '한국 캘리그라피의 대표 작가 장천(長川) 김성태. 한국 전통 서예와 디자인을 잇는 조형 언어를 구축하며 영화 「서울의 봄」·「귀향」, 대하드라마 「태종 이방원」·「불멸의 이순신」의 타이틀과 화성특례시 승격 현판을 휘호한 (사)한국캘리그라피디자인협회 명예회장. 장천 김성태의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '한국 캘리그라피의 대표 작가 장천 김성태. 영화·드라마 타이틀과 현판으로 대중과 만난 먹과 붓의 조형, 전통 서예와 디자인을 잇는 글씨.',
    ogAlt: '장천 김성태 대표 작품',
    twitterTitle: '장천 김성태',
    twitterDescription: '붓끝의 글씨로 한국을 쓰다 — 한국 캘리그라피의 거장 장천 김성태',
    keywords:
      '장천 김성태, 김성태 캘리그라피, 한국 서예, 캘리그라피 작가, 서울의 봄 글씨, 한국캘리그라피디자인협회, 씨앗페 온라인',
  },
  en: {
    title: 'Jangcheon Kim Seongtae — A Master of Korean Calligraphy',
    description:
      'Selected works by Jangcheon Kim Seongtae, a leading figure of Korean calligraphy. Building a formal language that bridges Korean traditional seoye and modern design, he brushed the titles of films such as 〈12.12: The Day〉 and 〈Spirits’ Homecoming〉 and historical dramas, as well as the inscribed plaque for the city of Hwaseong. Honorary president of the Korean Calligraphy Design Association. View and collect his works at SAF Online.',
    ogDescription:
      'Jangcheon Kim Seongtae — a leading master of Korean calligraphy. Ink and brush form that reached the public through film and drama titles and inscribed plaques, bridging traditional calligraphy and design.',
    ogAlt: 'Jangcheon Kim Seongtae — featured work',
    twitterTitle: 'Jangcheon Kim Seongtae',
    twitterDescription: 'Writing Korea with the tip of a brush — a master of Korean calligraphy',
    keywords:
      'Jangcheon Kim Seongtae, Korean calligraphy, Korean seoye, calligraphy artist, brush lettering, SAF Online',
  },
} as const;

export async function buildKimSeongtaeMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_SEONGTAE_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('장천 김성태');
  const artwork = allArtworks.find((a) => isKimSeongtaeArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Jangcheon Kim Seongtae`
      : `${artwork.title} — 장천 김성태`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_SEONGTAE_PATH, locale, true),
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

export default async function KimSeongtaeFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_SEONGTAE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('장천 김성태');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKimSeongtaeArtist(artwork.artist)
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
    {
      name: isEnglish ? 'Jangcheon Kim Seongtae' : '장천 김성태',
      url: pageUrl,
    },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_SEONGTAE_PATH}#person-kim-seongtae`,
    name: isEnglish ? 'Jangcheon Kim Seongtae' : '장천 김성태',
    alternateName: isEnglish ? '장천 김성태' : 'Jangcheon Kim Seongtae',
    jobTitle: isEnglish ? 'Calligrapher' : '캘리그라피 작가',
    description: isEnglish
      ? 'Jangcheon Kim Seongtae is a leading figure of Korean calligraphy who builds a formal language bridging Korean traditional seoye and modern design. Honorary president of the Korean Calligraphy Design Association.'
      : '장천 김성태는 한국 전통 서예와 디자인을 잇는 조형 언어를 구축해 온 한국 캘리그라피의 대표 작가이며, (사)한국캘리그라피디자인협회 명예회장입니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Wonkwang University, College of Fine Arts, Dept. of Calligraphy'
          : '원광대학교 미술대학 서예과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Dongguk University, Graduate School of Humanities, Art History (M.A.)'
          : '동국대학교 인문대학원 미술사학과 (석사)',
      },
    ],
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Korean Calligraphy Design Association' : '(사)한국캘리그라피디자인협회',
    },
    award: isEnglish
      ? '9th Dasan (Jeong Yak-yong) Award, Grand Prize in Culture & Arts (2015)'
      : '제9회 다산(정약용)대상 문화예술 부문 대상 (2015)',
    knowsAbout: ['Korean calligraphy', 'Calligraphy design', 'Korean seoye', 'Brush lettering'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Jangcheon Kim Seongtae — SAF Online' : '장천 김성태 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Jangcheon Kim Seongtae from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 장천 김성태 작품들을 소개합니다.',
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

          {/* Vertical brush-stroke lines — 붓의 획·먹의 흐름 모티프 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-[4.5rem] h-full w-[2px] bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Jangcheon Kim Seongtae · Calligraphy' : '장천 김성태 · 長川'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Writing Korea
                  <br />
                  <span className="text-primary-soft">with the tip of a brush</span>
                </>
              ) : (
                <>
                  붓끝의 글씨로
                  <br />
                  <span className="text-primary-soft">한국을 쓰다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Where traditional calligraphy meets contemporary design.
                  </span>
                  <span className="mt-2 block">
                    Ink and brush that reached the public through film, drama, and inscribed
                    plaques.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">전통 서예와 현대 디자인이 만나는 자리.</span>
                  <span className="mt-2 block">
                    영화·드라마·현판으로 대중과 만난 먹과 붓의 조형.
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
                    The brush, the ink —<br />
                    <span className="text-primary-strong">
                      a language between tradition and design
                    </span>
                  </>
                ) : (
                  <>
                    붓과 먹 —<br />
                    <span className="text-primary-strong">전통과 디자인 사이의 글씨</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Jangcheon Kim Seongtae is a leading figure of Korean calligraphy.{' '}
                      <em>Jangcheon</em> (長川, &ldquo;long river&rdquo;) is his art name; Kim
                      Seongtae is his given name. He graduated as a member of the first cohort of
                      the Department of Calligraphy at Wonkwang University&apos;s College of Fine
                      Arts, and earned a master&apos;s degree in art history from the Graduate
                      School of Humanities at Dongguk University.
                    </p>
                    <p>
                      For decades he has built a formal language that bridges Korean traditional{' '}
                      <em>seoye</em> (calligraphy) and modern design. He serves as honorary
                      president of the Korean Calligraphy Design Association, as a
                      steering-committee member and director of the calligraphy division of the
                      Korean Fine Arts Association, and as head of the video-graphics team at KBS
                      Art Vision. In 2022 he chaired the calligraphy jury of the Grand Art
                      Exhibition of Korea.
                    </p>
                    <p>
                      His practice has reached the wider public through{' '}
                      <strong className="font-bold text-charcoal">
                        film, television, and the built environment
                      </strong>
                      . He brushed the titles for the films 〈12.12: The Day〉 (2023) and 〈Spirits’
                      Homecoming〉 (2015), and for historical dramas including 〈Taejong Yi
                      Bang-won〉, 〈Jang Yeong-sil〉, and 〈The Immortal Yi Sun-sin〉. His hand also
                      shaped the inscribed plaque marking the elevation of Hwaseong to a special
                      city (2025) and the title calligraphy for long-running programs such as 〈TV
                      Show: Antiques Appraisal〉 and 〈Korean Table〉.
                    </p>
                    <p>
                      Across{' '}
                      <strong className="font-bold text-charcoal-deep">
                        eighteen solo and invitational exhibitions and some 250 group shows
                      </strong>
                      , his invitational exhibitions have ranged from 〈Narastmalgssi〉 at Moowoosoo
                      Gallery (Seoul, 2025) and 〈The Spring of Gwangju〉 at Gwanseonjae Gallery
                      (Gwangju, 2024) to the 〈Sayings of Independence Activists〉 invitational at
                      the Independence Hall of Korea (Cheonan, 2018) and the 250th-anniversary
                      tribute to Dasan Jeong Yak-yong, 〈Ah! Yeoyudang〉 (Ara Art, Seoul, 2013).
                    </p>
                    <p>
                      In 2015 he received the Grand Prize in Culture &amp; Arts at the 9th Dasan
                      (Jeong Yak-yong) Award. His work 〈A Snowy Path〉 was included in a
                      middle-school art textbook (Kyohaksa, 2013), and he was selected as a purchase
                      artist for the National Museum of Modern and Contemporary Art&apos;s Art Bank
                      (2005) and as an Arts Council Korea creative-grant artist (2007, 2008). His
                      book <em>Learning Calligraphy with the Brush, Together with Jangcheon</em> was
                      published by Deokju in 2022.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      장천(長川) 김성태는 한국 캘리그라피의 대표 작가다. &lsquo;장천&rsquo;은 호이고
                      본명은 김성태다. 원광대학교 미술대학 서예과 1기로 졸업하고, 동국대학교
                      인문대학원 미술사학과에서 미술사학 석사를 받았다.
                    </p>
                    <p>
                      그는 오랜 시간{' '}
                      <strong className="font-bold text-charcoal-deep">
                        한국 전통 서예와 디자인을 잇는 조형 언어
                      </strong>
                      를 구축해 왔다. (사)한국캘리그라피디자인협회 명예회장이자, (사)한국미술협회
                      캘리그라피분과 운영위원·이사, KBS아트비전 영상그래픽팀 팀장으로 활동한다.
                      2022년 대한민국미술대전 캘리그라피 부문 심사위원장을 맡았다.
                    </p>
                    <p>
                      그의 글씨는{' '}
                      <strong className="font-bold text-charcoal">영화·방송·현판</strong>을 통해
                      대중과 만났다. 영화 「서울의 봄」(2023)과 「귀향(鬼鄕)」(2015)의 타이틀,
                      대하드라마 「태종 이방원」·「장영실」·「불멸의 이순신」, 그리고 「임진왜란
                      1592」의 제호를 휘호했다. 화성특례시 승격 현판(2025)을 썼고,
                      「진품명품」·「한국인의 밥상」· 「우리말겨루기」 같은 장수 프로그램의 타이틀
                      글씨도 그의 손에서 나왔다.
                    </p>
                    <p>
                      그는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        18회의 개인·초대전과 250여 회의 단체전
                      </strong>
                      을 이어왔다. 무우수갤러리 초대전 「나랏말글씨」(서울, 2025), 관선재 갤러리
                      「광주의 봄」(광주, 2024), 독립기념관 「독립운동가 어록 초대전」(천안, 2018),
                      다산 정약용 탄신 250주년 기념전 「아! 여유당」(아라아트, 서울, 2013), 법정스님
                      1주기 추모 기획초대전(토포하우스, 2011)이 그 초대전의 흐름을 이룬다.
                    </p>
                    <p>
                      2015년 제9회 다산(정약용)대상 문화예술 부문 대상을 수상했다. 작품 「눈길」은
                      2013년 중학교 미술교과서(교학사)에 수록됐고, 2005년 국립현대미술관 미술은행
                      작품 매입작가, 2007·2008년 한국문화예술위원회 예술창작지원작가로 선정됐다.
                      저서로는 『장천과 함께하는 붓으로 배우는 캘리그라피』(덕주출판사, 2022)가
                      있다.
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
                        {isEnglish ? 'Tradition meets design' : '전통과 디자인의 결합'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A formal language built where Korean traditional seoye and contemporary design meet — the discipline of the brush carried into the present.'
                          : '한국 전통 서예와 현대 디자인이 만나는 자리에서 구축한 조형 언어. 붓의 규율을 오늘의 글씨로 잇는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Lettering for the public' : '대중과 만난 휘호'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Film and drama titles, broadcast lettering, and inscribed plaques — calligraphy that meets audiences far beyond the gallery wall.'
                          : '영화·드라마 타이틀, 방송 글씨, 현판 휘호 — 전시장 너머에서 대중과 만나는 글씨.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The form of ink and brush' : '먹과 붓의 조형'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Restrained yet alive — the weight and breath of a single stroke, the force of the brush held in balance with white space.'
                          : '절제되었으되 살아 있는 — 한 획의 무게와 호흡, 여백과 균형을 이루는 휘호의 힘.'}
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
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as a purchase artist for the MMCA Art Bank.'
                        : '국립현대미술관 미술은행 작품 매입작가 선정.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invitational exhibition in memory of the Venerable Beopjeong, Topohaus, Seoul.'
                        : '법정스님 1주기 추모 기획초대전, 토포하우스, 서울.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Ah! Yeoyudang〉, 250th-anniversary tribute to Dasan Jeong Yak-yong, Ara Art, Seoul; 〈A Snowy Path〉 included in a middle-school art textbook (Kyohaksa).'
                        : '다산 정약용 탄신 250주년 기념전 「아! 여유당」, 아라아트, 서울; 「눈길」 중학교 미술교과서(교학사) 수록.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives the Grand Prize in Culture & Arts at the 9th Dasan (Jeong Yak-yong) Award; brushes the title for the film 〈Spirits’ Homecoming〉.'
                        : '제9회 다산(정약용)대상 문화예술 부문 대상 수상; 영화 「귀향(鬼鄕)」 타이틀 휘호.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo invitational 〈Ah! Chungmugong〉, Asan Foundation Gallery.'
                        : '명사시리즈 초청전 「아! 충무공」, 아산문화재단 갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Sayings of Independence Activists〉 invitational, Independence Hall of Korea, Cheonan.'
                        : '「독립운동가 어록 초대전」, 독립기념관, 천안.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Chairs the calligraphy jury of the Grand Art Exhibition of Korea; publishes a calligraphy guidebook (Deokju); title calligraphy for the National Palace Museum’s 〈Court Plaques〉 exhibition.'
                        : '대한민국미술대전 캘리그라피 부문 심사위원장; 저서 『장천과 함께하는 붓으로 배우는 캘리그라피』(덕주출판사) 출간; 국립고궁박물관 「궁중 현판전」 휘호.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Brushes the title for the film 〈12.12: The Day〉.'
                        : '영화 「서울의 봄」 타이틀 휘호.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo invitational 〈The Spring of Gwangju〉, Gwanseonjae Gallery, Gwangju; group show 《Cheongnyong·Baekhak》, Seoul Calligraphy Art Museum.'
                        : '신춘기획 초대전 「광주의 봄」, 관선재 갤러리, 광주; 「한국서예의 오늘과 내일 靑龍·白鶴전」, 예술의전당 서예박물관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Invitational 〈Narastmalgssi〉, Moowoosoo Gallery, Seoul; brushes the inscribed plaque for the elevation of Hwaseong to a special city.'
                        : '초대전 「나랏말글씨」, 무우수갤러리, 서울; 화성특례시 승격 현판 휘호.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected titles, plaques & group shows' : '주요 휘호·현판·단체전'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Film titles: 〈12.12: The Day〉 (2023), 〈Spirits’ Homecoming〉 (2015)'
                        : '영화 타이틀: 「서울의 봄」(2023), 「귀향(鬼鄕)」(2015)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Drama / broadcast titles: 〈Taejong Yi Bang-won〉, 〈Jang Yeong-sil〉, 〈The Immortal Yi Sun-sin〉, 〈Imjin War 1592〉, 〈TV Show: Antiques Appraisal〉, 〈Korean Table〉, 〈Urimal Gyeoroogi〉'
                        : '드라마·방송 타이틀: 「태종 이방원」, 「장영실」, 「불멸의 이순신」, 「임진왜란 1592」, 「진품명품」, 「한국인의 밥상」, 「우리말겨루기」'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Plaques & corporate calligraphy: Hwaseong special-city elevation plaque (2025), Shinhan Financial new-year slogan (2024), National Palace Museum 〈Court Plaques〉 (2022), Shinsegae management philosophy & core values (2014), Mt. Geumgang Singyesa ridge-beam inscription & plaque (2006)'
                        : '현판·기업 휘호: 화성특례시 승격 현판(2025), 신한금융 신년슬로건(2024), 국립고궁박물관 「궁중 현판전」(2022), (주)신세계 경영이념·핵심가치(2014), 금강산 신계사 상량문·편액(2006)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group shows: 《Cheongnyong·Baekhak — Today and Tomorrow of Korean Calligraphy》, Seoul Calligraphy Art Museum (2024); World Calligraphy Biennale of Jeonbuk invitational (2017, 2023)'
                        : '단체전: 「한국서예의 오늘과 내일 靑龍·白鶴전」, 예술의전당 서예박물관(2024); 세계서예전북비엔날레 초대전(2017, 2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selection: MMCA Art Bank purchase artist (2005); Arts Council Korea creative-grant artist (2007, 2008); 〈A Snowy Path〉 in a middle-school art textbook (Kyohaksa, 2013)'
                        : '선정: 국립현대미술관 미술은행 매입작가(2005); 한국문화예술위원회 예술창작지원작가(2007·2008); 「눈길」 중학교 미술교과서(교학사, 2013) 수록'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 장천 김성태 먹빛 모티프 */}
          <div className="mb-24 max-w-4xl mx-auto">
            <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance mb-10">
              {isEnglish ? (
                <>
                  Three essays —
                  <br />
                  <span className="text-charcoal-deep">on the brush and its reach</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">붓과 그 닿음에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 서예에서 캘리그라피로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'From seoye to calligraphy — a language built between two worlds'
                    : '서예에서 캘리그라피로 — 두 세계 사이에 세운 언어'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Seongtae was trained in the discipline of the brush. He graduated as a
                        member of the first cohort of the Department of Calligraphy at Wonkwang
                        University and went on to study art history at Dongguk University — a
                        grounding in both the practice and the history of the written form.
                      </p>
                      <p>
                        What distinguishes his path is the bridge he built. Where classical{' '}
                        <em>seoye</em> keeps to the canon of the brush and contemporary design often
                        sets the brush aside, Jangcheon held the two together: the rigor of
                        traditional calligraphy carried into the formal vocabulary of design. As
                        honorary president of the Korean Calligraphy Design Association and a
                        director of the calligraphy division of the Korean Fine Arts Association, he
                        has helped shape the field in which that bridge is now taught.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김성태는 붓의 규율 속에서 훈련받았다. 원광대학교 서예과 1기로 졸업하고
                        동국대학교에서 미술사학을 공부하며, 그는 글씨의 실기와 역사를 함께 익혔다.
                      </p>
                      <p>
                        그의 길을 가르는 것은 그가 세운 다리다. 고전 서예가 붓의 정전을 지키고 현대
                        디자인이 종종 붓을 내려놓을 때, 장천은 둘을 함께 붙들었다 — 전통 서예의
                        엄격함을 디자인의 조형 어휘로 잇는 일. (사)한국캘리그라피디자인협회
                        명예회장이자 한국미술협회 캘리그라피분과 이사로서, 그는 그 다리가 오늘
                        가르쳐지는 장(場)을 함께 만들어 왔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 화면을 떠나 대중에게 — 영화·방송·현판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Beyond the gallery — film, broadcast, and the inscribed plaque'
                    : '전시장을 떠나 — 영화·방송·현판으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Much of Jangcheon&apos;s writing meets its audience outside the exhibition
                        wall. The titles of the films 〈12.12: The Day〉 (2023) and 〈Spirits’
                        Homecoming〉 (2015), and of historical dramas including 〈Taejong Yi
                        Bang-won〉, 〈Jang Yeong-sil〉, and 〈The Immortal Yi Sun-sin〉, were
                        brushed by his hand. So too were the title letters of long-running programs
                        such as 〈TV Show: Antiques Appraisal〉, 〈Korean Table〉, and 〈Urimal
                        Gyeoroogi〉.
                      </p>
                      <p>
                        His brush has also entered the built environment. He wrote the inscribed
                        plaque marking the elevation of Hwaseong to a special city (2025), provided
                        the title calligraphy for the National Palace Museum&apos;s 〈Court
                        Plaques〉 exhibition (2022), and inscribed the ridge-beam text and plaque
                        for Singyesa temple on Mt. Geumgang (2006). In each case the work asks the
                        same question: how does a single brushstroke hold the weight of a name many
                        people will read.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        장천의 글씨는 상당 부분 전시장 밖에서 관객과 만난다. 영화 「서울의
                        봄」(2023)과 「귀향(鬼鄕)」(2015), 대하드라마 「태종
                        이방원」·「장영실」·「불멸의 이순신」의 타이틀이 그의 손에서 나왔다.
                        「진품명품」·「한국인의 밥상」·「우리말겨루기」 같은 장수 프로그램의 제호
                        글씨도 마찬가지다.
                      </p>
                      <p>
                        그의 붓은 건축의 공간에도 들어갔다. 화성특례시 승격 현판(2025)을 썼고,
                        국립고궁박물관 「궁중 현판전」(2022)의 휘호를 맡았으며, 금강산 신계사의
                        상량문과 편액(2006)을 썼다. 매번 그 작업은 같은 물음을 던진다 — 한 획의
                        글씨가 어떻게 수많은 사람이 읽을 이름의 무게를 감당하는가.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 한 획의 무게 — 먹과 여백 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The weight of a single stroke — ink, breath, and white space'
                    : '한 획의 무게 — 먹, 호흡, 그리고 여백'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In Jangcheon&apos;s own teaching, the foundation of calligraphy comes from
                        the brush itself — the discipline of holding, pressing, and releasing. The
                        form is restrained, but never inert. A stroke carries weight and breath; the
                        white space around it is not absence but balance.
                      </p>
                      <p>
                        That conviction has been recognized across his career: the Grand Prize in
                        Culture &amp; Arts at the 9th Dasan Award (2015), the inclusion of his work
                        〈A Snowy Path〉 in a middle-school art textbook (2013), and his selection
                        as a purchase artist for the MMCA Art Bank (2005). Through eighteen solo and
                        invitational exhibitions and some 250 group shows, his work returns again
                        and again to a single proposition: that the ink line, held with care, can
                        carry both a tradition and a contemporary eye at once.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        장천이 가르쳐 온 바에 따르면, 캘리그라피의 기본은 붓 그 자체에서 나온다 —
                        잡고, 누르고, 풀어내는 규율. 그 형식은 절제되었으되 결코 죽어 있지 않다. 한
                        획은 무게와 호흡을 지니고, 그 둘레의 여백은 비어 있음이 아니라 균형이다.
                      </p>
                      <p>
                        그 믿음은 그의 이력 전반에서 인정받았다 — 제9회 다산대상 문화예술 부문
                        대상(2015), 작품 「눈길」의 중학교 미술교과서 수록(2013), 국립현대미술관
                        미술은행 매입작가 선정(2005). 18회의 개인·초대전과 250여 회의 단체전을
                        지나며, 그의 작업은 하나의 명제로 거듭 돌아온다 — 정성으로 붙든 먹의 선은
                        전통과 오늘의 시선을 한꺼번에 감당할 수 있다.
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
                      From the calligraphy classroom to the cinema screen, from the gallery wall to
                      the inscribed plaque, Jangcheon Kim Seongtae has pursued a single question:
                      how does the brush carry both tradition and the present age? He joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that the artists who come after him might work without the weight of
                      financial exclusion.
                    </>
                  ) : (
                    <>
                      서예 교실에서 영화 스크린까지, 전시장 벽에서 현판까지, 장천 김성태의 작업은
                      하나의 물음을 추구해 왔다: 붓은 어떻게 전통과 오늘을 함께 감당하는가. 그는
                      씨앗페에 이 캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다
                      — 그의 뒤를 잇는 예술인들이 금융 차별의 무게 없이 일할 수 있도록.
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
                Jangcheon Kim Seongtae
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
                    Jangcheon Kim Seongtae joined this campaign in solidarity with fellow artists.
                    Every work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    장천 김성태 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품
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
                returnTo={KIM_SEONGTAE_PATH}
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
