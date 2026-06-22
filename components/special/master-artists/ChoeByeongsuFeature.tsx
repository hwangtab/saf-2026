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

// 거장 작가 feature는 작가 페이지(/artworks/artist/최병수)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const CHOE_BYEONGSU_PATH = `/artworks/artist/${encodeURIComponent('최병수')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const isChoeByeongsuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '최병수' ||
    n === 'choe byeongsu' ||
    n === 'choe byeong-su' ||
    n.replace(/[\s-]+/g, '') === 'choebyeongsu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '최병수 — 걸개그림·환경미술의 거장',
    description:
      '걸개그림·환경미술의 거장 최병수(1960–). 목수 출신 독학 미술가로, 1987년 「한열이를 살려내라」로 6월 민주항쟁의 상징이 되었고, 이후 기후와 생명을 주제로 한 환경미술 작업을 국내외에서 이어온 민중미술 1세대 작가. 씨앗페 온라인에서 최병수의 작품을 감상하고 소장하세요.',
    ogDescription:
      '걸개그림·환경미술의 거장 최병수. 목수에서 미술가로, 「한열이를 살려내라」에서 환경미술까지 — 거리와 광장과 자연을 캔버스로 삼은 민중미술 1세대.',
    ogAlt: '최병수 대표 작품',
    twitterTitle: '최병수',
    twitterDescription: '거리에 내건 그림, 세상을 향한 외침 — 걸개그림·환경미술의 거장 최병수',
    keywords:
      '최병수 화가, 걸개그림, 한열이를 살려내라, 이한열, 6월항쟁, 민중미술, 환경미술, 씨앗페 온라인',
  },
  en: {
    title: 'Choe Byeongsu — Master of Protest Banner Painting and Environmental Art',
    description:
      'Selected works by Choe Byeongsu (b. 1960), master of protest banner painting (걸개그림) and environmental art. A self-taught artist from a laboring background, he became a symbol of the June 1987 democracy struggle through 〈Save Hanryeol〉 and has since pursued environmental and ecological art internationally. View and collect his works at SAF Online.',
    ogDescription:
      'Choe Byeongsu — master of protest banner painting and environmental art. From carpenter to artist, from 〈Save Hanryeol〉 to environmental installations — streets, squares, and nature as canvas.',
    ogAlt: 'Choe Byeongsu — featured work',
    twitterTitle: 'Choe Byeongsu',
    twitterDescription:
      'A painting hung in the street, a cry to the world — protest banner and environmental art master Choe Byeongsu',
    keywords:
      'Choe Byeongsu artist, Korean minjung art, protest banner painting, environmental art, June 1987 democracy movement',
  },
} as const;

export async function buildChoeByeongsuMetadata({
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
  const pageUrl = buildLocaleUrl(CHOE_BYEONGSU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('최병수');
  const artwork = allArtworks.find((a) => isChoeByeongsuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Choe Byeongsu`
      : `${artwork.title} — 최병수`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHOE_BYEONGSU_PATH, locale, true),
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

export default async function ChoeByeongsuFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHOE_BYEONGSU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('최병수');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isChoeByeongsuArtist(artwork.artist)
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
    { name: isEnglish ? 'Choe Byeongsu' : '최병수', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHOE_BYEONGSU_PATH}#person-choe-byeongsu`,
    name: isEnglish ? 'Choe Byeongsu' : '최병수',
    alternateName: isEnglish ? '최병수' : 'Choe Byeongsu',
    jobTitle: isEnglish ? 'Artist' : '미술가',
    description: isEnglish
      ? 'Choe Byeongsu (b. 1960) is a Korean minjung artist and environmental art practitioner. A self-taught artist from a laboring background, he is best known for the 1987 protest banner 〈Save Hanryeol〉, an iconic image of the June democracy struggle, and for subsequent environmental and ecological installations presented internationally.'
      : '최병수(1960–)는 한국 민중미술 작가이자 환경미술 실천가입니다. 목수 출신 독학 미술가로, 1987년 6월 민주항쟁의 아이콘이 된 걸개그림 「한열이를 살려내라」로 널리 알려졌으며, 이후 국내외에서 환경·생태 설치 작업을 이어오고 있습니다.',
    birthDate: '1960',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Pyeongtaek, Gyeonggi, South Korea' : '경기 평택',
    },
    knowsAbout: ['Minjung art', 'Protest banner painting (걸개그림)', 'Environmental art'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Choe Byeongsu — SAF Online' : '최병수 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Choe Byeongsu from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 최병수 작품을 소개합니다.',
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
        {/* Hero Section — 걸개그림의 광장 모티프: 어두운 배경에 굵은 외침 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 걸개그림 모티프: 수평 띠 — 광장과 현수막의 수평선 */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/10" />
          <div className="absolute top-3 left-0 w-full h-px bg-white/5" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10" />

          {/* 수직 측면 테두리 — 걸개그림 테두리 모티프 */}
          <div className="absolute top-0 left-0 h-full w-px bg-white/15" />
          <div className="absolute top-0 right-0 h-full w-px bg-white/15" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Choe Byeongsu · 1960–' : '최병수 · 1960–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A painting hung in the street,
                  <br />
                  <span className="text-primary-soft">a cry to the world</span>
                </>
              ) : (
                <>
                  거리에 내건 그림,
                  <br />
                  <span className="text-primary-soft">세상을 향한 외침</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">A carpenter who became a painter by accident.</span>
                  <span className="mt-2 block">
                    A painter who made a banner that became the face of an uprising.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">우연히 화가가 된 목수.</span>
                  <span className="mt-2 block">항쟁의 얼굴이 된 걸개그림을 그린 화가.</span>
                </>
              )}
            </p>
          </div>

          {/* 장식 요소 */}
          <div className="absolute top-0 left-0 w-24 h-24 border-l-8 border-t-8 border-white/10" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-r-8 border-b-8 border-white/10" />
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-32 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    Carpenter, painter, activist —<br />
                    <span className="text-primary-strong">a life lived at the scene</span>
                  </>
                ) : (
                  <>
                    목수, 화가, 활동가 —<br />
                    <span className="text-primary-strong">현장을 살아온 삶</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Choe Byeongsu was born in 1960 in Pyeongtaek, Gyeonggi province. He left
                      school early and spent his twenties in manual labor — working as a lathe
                      assistant, welder, boiler repairman, and carpenter. He had no formal art
                      training. His entry into the world of art came not through a studio or academy
                      but through a ladder.
                    </p>
                    <p>
                      In 1986, he was brought to a mural site to build scaffolding for artists who
                      were painting. Police arrived and detained him along with the others. When he
                      told the officer he was a carpenter, the officer wrote <em>painter</em> on the
                      interrogation report. The label stuck — and so did the vocation.
                    </p>
                    <p>
                      In 1987, he joined the mural division of the Minjung Misul Hyeopuihoe
                      (민족미술협의회, the National Artists&apos; Association) and became a
                      practitioner of{' '}
                      <strong className="font-bold text-charcoal-deep">
                        걸개그림 (geolgaegeurim)
                      </strong>{' '}
                      — the Korean tradition of large-scale painted banners hung from buildings and
                      displayed in public spaces. These were not gallery works. They were painted
                      for streets, squares, and assembly halls; they were made to be seen by crowds,
                      not collectors.
                    </p>
                    <p>
                      That same year, the June democracy struggle swept Korea. On June 9, 1987, Lee
                      Han-yeol — a sophomore at Yonsei University — was struck by a tear gas
                      canister and collapsed. Reuters photographer Jeong Taewon captured the moment.
                      Choe Byeongsu, working with members of Yonsei University&apos;s
                      &ldquo;Manhwasarang&rdquo; art club, transformed that photograph into a
                      monumental banner:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈한열이를 살려내라〉 (Save Hanryeol)
                      </strong>
                      , measuring approximately 7 metres wide by 10 metres tall. Hung from the walls
                      of Yonsei University and carried through the streets during the funeral
                      procession, it became one of the defining visual documents of Korean
                      democracy.
                    </p>
                    <p>
                      From 1988, Choe turned toward environmental and ecological concerns, becoming
                      an environmental activist as well as an artist. Over the following decades, he
                      produced installations and environmental artworks that were shown at venues
                      abroad and across Korea — works engaging with climate, nature, and the living
                      world, in a practice that moved from the political urgency of the 1980s to the
                      ecological urgency of the present. He was also listed on the Park Geun-hye
                      government&apos;s cultural blacklist, which led to contracts being cancelled
                      and projects cut — further evidence, if any were needed, that his work
                      continued to be felt as a challenge to power.
                    </p>
                    <p>
                      His first solo exhibition, <em>Walking the Path (길을 걷다)</em>, was held in
                      Gwangju in 2020. His life and practice were recounted in the 2006 book{' '}
                      <em>A Carpenter Speaks to a Painter</em> (목수, 화가에게 말 걸다), written
                      with Kim Jinsong and published by Hyeonsil Munhwa.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      최병수는 1960년 경기 평택에서 태어났다. 학교를 일찍 그만두고 이십대를 노동으로
                      보냈다 — 선반 보조공, 용접공, 보일러 수리공, 목수. 미술 정규 교육은 받은 적
                      없었다. 미술계에 발을 들인 것은 화실이나 학교가 아니라 사다리를 통해서였다.
                    </p>
                    <p>
                      1986년, 그림을 그리는 작가들에게 비계를 만들어 주러 벽화 현장에 갔다가 경찰에
                      연행됐다. 경찰에게 목수라고 했더니, 경찰은 심문조서에 <em>화가</em>라고 적어
                      넣었다. 그 딱지가 붙었고 — 그 직업도 붙었다.
                    </p>
                    <p>
                      1987년, 그는 민족미술협의회 벽화 분과에 가입하고{' '}
                      <strong className="font-bold text-charcoal-deep">걸개그림</strong> — 건물에
                      걸거나 공공장소에 전시하는 대형 그림 — 의 현장 작가가 됐다. 걸개그림은 갤러리
                      작품이 아니었다. 거리, 광장, 집회 마당을 위해 그렸고, 수집가가 아니라 군중을
                      위해 만들어졌다.
                    </p>
                    <p>
                      그해, 6월 민주항쟁이 한국을 휩쓸었다. 1987년 6월 9일, 연세대학교 2학년
                      이한열이 최루탄을 맞고 쓰러졌다. 로이터 사진기자 정태원이 그 순간을 촬영했다.
                      최병수는 연세대 만화사랑 동아리 회원들과 함께 그 사진을 거대한 걸개그림으로
                      탄생시켰다:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        「한열이를 살려내라」
                      </strong>
                      , 가로 약 7m, 세로 10m. 연세대 건물 벽에 내걸리고 장례 행진 때 거리를 가득
                      채우며, 한국 민주주의의 역사에서 가장 강렬한 시각적 기록 중 하나가 됐다.
                    </p>
                    <p>
                      1988년부터 최병수는 환경과 생태 문제로 시선을 돌렸다. 환경운동가이자
                      미술가로서, 이후 수십 년간 국내외 여러 지역에서 기후·자연· 생명을 주제로 한
                      설치미술 작업을 선보였다. 그의 작업은 1980년대 정치적 긴박함에서 오늘의 생태적
                      긴박함으로 이어지며 지속됐다. 박근혜 정부 시절 문화예술계 블랙리스트에 올라
                      계약이 취소되고 프로젝트가 잘리는 일도 겪었다 — 그의 작업이 여전히 권력에
                      도전으로 느껴졌다는 증거였다.
                    </p>
                    <p>
                      첫 개인전 <em>「길을 걷다」</em>를 2020년 광주에서 개최했다. 그의 삶과 작업은
                      2006년 김진송과 함께 펴낸 책 『목수, 화가에게 말 걸다』(현실문화)에 담겨 있다.
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
                        {isEnglish
                          ? 'Geolgaegeurim — art for the street'
                          : '걸개그림 — 거리를 위한 미술'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Large-scale protest banner paintings made to be hung in public spaces and seen by crowds, not galleries. A distinctly Korean tradition of politically engaged public art.'
                          : '갤러리가 아닌 공공장소에 걸려 군중에게 보이기 위해 제작된 대형 현장 미술. 한국의 독특한 정치 참여 공공미술 전통.'}
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
                          ? '「Save Hanryeol」 — a banner for a generation'
                          : '「한열이를 살려내라」 — 한 세대의 걸개그림'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The 1987 banner — 7m × 10m — became an icon of the June democracy struggle and one of the most powerful images in modern Korean history.'
                          : '1987년 제작한 가로 7m × 세로 10m의 걸개그림은 6월 민주항쟁의 아이콘이 되었으며, 한국 현대사의 가장 강렬한 이미지 중 하나다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Environmental & ecological art' : '환경·생태 미술'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'From 1988, he turned to climate and ecology, producing installations and works presented internationally — from political urgency in the streets to ecological urgency on the earth.'
                          : '1988년부터 기후와 생태 문제로 전환하여 국내외에서 설치 작업을 선보였다. 거리의 정치적 긴박함에서 지구의 생태적 긴박함으로.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1960
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Pyeongtaek, Gyeonggi province.' : '경기 평택 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1970s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Works as a lathe assistant, welder, boiler repairman, and carpenter; no formal art training.'
                        : '선반 보조공, 용접공, 보일러 수리공, 목수로 노동. 미술 정규 교육 없음.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Goes to a mural site to build scaffolding; detained by police, who write "painter" on the report — the label sticks.'
                        : '벽화 현장에 비계 제작하러 갔다가 경찰에 연행. 조서에 "화가"로 기재되며 화가의 길로 접어들다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Joins the mural division of the Minjung Misul Hyeopuihoe (민족미술협의회). Creates 〈Save Hanryeol (한열이를 살려내라)〉, 7m × 10m, with Yonsei University "Manhwasarang" club members — the defining image of the June 1987 democracy struggle.'
                        : '민족미술협의회 벽화 분과 가입. 연세대 만화사랑 동아리 회원들과 함께 걸개그림 「한열이를 살려내라」(7m×10m) 제작 — 1987년 6월 민주항쟁의 상징적 이미지.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1988–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Turns to environmental activism and ecological art. Produces installations and works on climate and nature presented abroad and across Korea.'
                        : '환경운동가·환경미술 작가로 전환. 기후·자연을 주제로 한 설치 작업을 국내외 여러 지역에서 발표.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Book 《A Carpenter Speaks to a Painter》 (목수, 화가에게 말 걸다), co-authored with Kim Jinsong, published by Hyeonsil Munhwa.'
                        : '김진송과 공저 『목수, 화가에게 말 걸다』(현실문화) 출판.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition 《Walking the Path (길을 걷다)》, Gallery Saenggak-sangja, Gwangju.'
                        : '첫 개인전 《길을 걷다》, 갤러리 생각상자, 광주.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected works & activities' : '주요 작품 및 활동'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Save Hanryeol (한열이를 살려내라)〉 (1987) — 7m × 10m protest banner; defining image of the June 1987 democracy struggle'
                        : '「한열이를 살려내라」(1987) — 7m×10m 걸개그림; 1987년 6월 민주항쟁의 상징'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Anti-War Anti-Nuclear (반전반핵도)〉 (1988), 〈Liberation of Labor (노동해방도)〉 (1989), 〈Baekdusan (백두산)〉 (1989) — banner works from the minjung art movement'
                        : '「반전반핵도」(1988), 「노동해방도」(1989), 「백두산」(1989) — 민중미술 운동 시기 걸개그림 작품들'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Environmental installations presented abroad and across Korea (from 1988 onward)'
                        : '환경 설치 작품: 국내외 여러 지역 발표 (1988년 이후)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition 《Walking the Path》, Gallery Saenggak-sangja, Gwangju (2020)'
                        : '첫 개인전 《길을 걷다》, 갤러리 생각상자, 광주 (2020)'}
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
                  <span className="text-charcoal-deep">
                    on banners, streets, and the living world
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">
                    걸개그림, 거리, 그리고 살아있는 세계에 관하여
                  </span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 「한열이를 살려내라」 — 1987년의 걸개그림 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈Save Hanryeol〉 — the banner of 1987'
                    : '「한열이를 살려내라」 — 1987년의 걸개그림'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        On the afternoon of June 9, 1987, Lee Han-yeol — a second-year student at
                        Yonsei University — was struck in the head by a tear gas canister fired by
                        police during a pro-democracy demonstration. A Reuters photographer, Jeong
                        Taewon, captured the moment: Lee collapsing, held up by a fellow student,
                        blood on his face. The image went out over the wire and circled the globe.
                      </p>
                      <p>
                        Choe Byeongsu, working with members of Yonsei University&apos;s
                        &ldquo;Manhwasarang&rdquo; (comic art) club, took that photograph and
                        expanded it into a{' '}
                        <strong className="font-bold text-charcoal-deep">
                          걸개그림 approximately 7 metres wide by 10 metres tall
                        </strong>
                        . The banner was hung from the walls of Yonsei University and carried
                        through the streets during the funeral procession when Lee Han-yeol died
                        from his injuries on July 5, 1987 — twenty-five days after he was struck.
                      </p>
                      <p>
                        The image worked the way great protest art works: it made the individual
                        into the collective. One young man&apos;s face, rendered ten metres high,
                        became the face of everyone who had been beaten, suppressed, or silenced. In
                        the weeks and months that followed — as millions took to the streets and the
                        Roh Tae-woo government conceded direct presidential elections in the June
                        29th Declaration — 〈Save Hanryeol〉 was everywhere. It is now considered
                        one of the emblematic images of the June 1987 democracy movement and of
                        Korean minjung art.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1987년 6월 9일 오후, 연세대학교 2학년 이한열이 민주화 시위 도중 경찰이 쏜
                        최루탄을 머리에 맞고 쓰러졌다. 로이터 사진기자 정태원이 그 순간을 포착했다 —
                        동료 학생에게 안겨 쓰러지는 이한열, 얼굴의 피. 그 이미지는 전 세계로
                        타전됐다.
                      </p>
                      <p>
                        최병수는 연세대 만화사랑 동아리 회원들과 함께 그 사진을{' '}
                        <strong className="font-bold text-charcoal-deep">
                          가로 약 7m, 세로 10m의 걸개그림
                        </strong>
                        으로 확장했다. 걸개그림은 연세대 건물 벽에 내걸렸고, 1987년 7월 5일 이한열이
                        부상으로 사망하자 — 최루탄을 맞은 지 25일 만에 — 장례 행진에서 거리를 가득
                        채웠다.
                      </p>
                      <p>
                        이 이미지는 위대한 저항 미술이 작동하는 방식으로 작동했다: 개인을 집단으로
                        만들었다. 10m 높이로 그려진 한 청년의 얼굴이, 구타당하고 억압받고 침묵 강요
                        받은 모든 이의 얼굴이 됐다. 이후 수백만 명이 거리로 나서고 노태우 정부가
                        6·29 선언으로 대통령 직선제를 수용하는 과정에서, 「한열이를 살려내라」는
                        도처에 있었다. 이 작품은 지금 1987년 6월 민주항쟁과 한국 민중미술을 대표하는
                        이미지 중 하나로 기억된다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 노동자에서 미술가로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'From laborer to artist — a vocation written by a police officer'
                    : '노동자에서 미술가로 — 경찰이 써준 직업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        There is something fitting about the way Choe Byeongsu became an artist. He
                        went to a mural site to help — to build the scaffolding, to make the
                        physical structure through which others could paint. A police officer
                        detained him, asked his occupation, and when he said
                        &ldquo;carpenter,&rdquo; wrote &ldquo;painter&rdquo; on the report. The
                        state, attempting suppression, authored an identity instead.
                      </p>
                      <p>
                        This biographical detail matters not as anecdote but as structure. Choe had
                        no formal training, no art school pedigree, no gallery connections. What he
                        had was the ability to make things with his hands — to build what needed
                        building — and a political consciousness sharpened by years of laboring
                        alongside people who were excluded from power. The tradition of{' '}
                        <strong className="font-bold text-charcoal-deep">걸개그림</strong> suited
                        him precisely because it required craft over theory: you needed to know how
                        to stretch a surface across a large frame, how to scale a small image to a
                        monumental one, how to ensure the work would survive being carried through
                        the streets in the rain.
                      </p>
                      <p>
                        By joining the mural division of the Minjung Misul Hyeopuihoe in 1987, Choe
                        found a context — artists working collectively, for political purposes, in
                        public space — that matched both his skills and his convictions. His
                        biography is not the exception in the minjung art movement; it is the rule.
                        Many of the artists who made the most enduring work of that era came from
                        outside the formal art world, and brought with them the knowledge of how
                        ordinary Koreans actually lived.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        최병수가 화가가 된 경위에는 어딘가 어울리는 구석이 있다. 그는 현장을 돕기
                        위해 갔다 — 비계를 짜고, 다른 이들이 그림을 그릴 수 있는 물리적 구조를
                        만들기 위해. 경찰이 그를 연행하고 직업을 물었을 때, &lsquo;목수&rsquo;라고
                        했더니 조서에 &lsquo;화가&rsquo;라고 적어 넣었다. 탄압을 시도한 국가가 대신
                        정체성을 써줬다.
                      </p>
                      <p>
                        이 일화는 일화가 아니라 구조로서 중요하다. 최병수는 정규 교육도, 미술학교
                        이력도, 갤러리 연줄도 없었다. 그가 가진 것은 손으로 만드는 능력 — 필요한
                        것을 지어내는 힘 — 과, 권력에서 배제된 사람들과 함께 노동하며 예리해진
                        정치의식이었다. 걸개그림이라는 전통이 그에게 꼭 맞았던 것은 이론보다 기술을
                        요구했기 때문이다: 큰 틀에 천을 펼치는 법, 작은 이미지를 거대하게 확대하는
                        법, 비 맞으며 거리를 행진해도 버티는 작품을 만드는 법을 알아야 했다.
                      </p>
                      <p>
                        1987년 민족미술협의회 벽화 분과에 합류하면서, 최병수는 자신의 기술과 신념
                        모두에 맞는 맥락 — 공공장소에서 정치적 목적으로 함께 작업하는 작가들 — 을
                        찾았다. 그의 이력은 민중미술 운동 안에서 예외가 아니라 규범이었다. 그 시대에
                        가장 오래 남는 작업을 한 작가들 중 많은 이가 공식 미술계 바깥에서 왔고,
                        평범한 한국인들의 삶의 실질을 가지고 왔다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 환경·생명의 미술 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Environmental and ecological art — the urgency continues'
                    : '환경·생명의 미술 — 긴박함은 계속된다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In 1988, the year after 〈Save Hanryeol〉, Choe Byeongsu turned toward a
                        different kind of urgency. The democracy struggle had been one form of the
                        question of how human beings treat one another and the world they share;
                        environmental art posed the same question at a larger scale — toward the
                        living systems that sustain all of it.
                      </p>
                      <p>
                        Over the following decades, he developed an environmental and ecological
                        practice that took him across the world. Works were presented at venues
                        abroad as well as across Korea — installations engaging with climate, the
                        natural world, and what is at risk. His practice in this mode is less
                        extensively documented than the iconic banner work of 1987, but it
                        represents the majority of his creative life: a sustained engagement with
                        the living world, carried on through the same directness and handmade
                        physicality that characterized his protest banners.
                      </p>
                      <p>
                        The book 『목수, 화가에게 말 걸다』 (A Carpenter Speaks to a Painter, 2006),
                        co-authored with critic Kim Jinsong, offers the most sustained account of
                        his journey from labor to protest art to ecological practice — a biography
                        that tracks, across four decades, the through-line between political urgency
                        and environmental urgency. They are, Choe&apos;s life suggests, not
                        different concerns but the same concern at different scales.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        「한열이를 살려내라」 이듬해인 1988년, 최병수는 다른 종류의 긴박함으로
                        방향을 틀었다. 민주화 투쟁이 인간이 서로를 어떻게 대하는지에 관한 물음의 한
                        형태였다면, 환경미술은 같은 물음을 더 큰 스케일에서 제기했다 — 모든 것을
                        지탱하는 살아있는 시스템을 향해.
                      </p>
                      <p>
                        이후 수십 년 동안, 그는 세계 각지를 오가는 환경·생태 실천을 발전시켰다.
                        국내외 여러 지역에서 기후·자연계·위기에 처한 것들을 다루는 설치 작업을
                        선보였다. 이 환경미술 작업은 1987년의 아이콘적 걸개그림에 비해 기록이 덜
                        풍부하지만, 그의 창작 인생의 대부분을 차지한다 — 항쟁 걸개그림을 특징짓던
                        직접성과 손으로 만드는 물성을 그대로 간직한 채, 살아있는 세계와 지속적으로
                        대면하는 실천.
                      </p>
                      <p>
                        비평가 김진송과 함께 펴낸 책 『목수, 화가에게 말 걸다』(현실문화, 2006)는
                        노동에서 저항 미술로, 다시 생태 실천으로 이어진 그의 여정을 가장 충실하게
                        담고 있다 — 40년에 걸쳐 정치적 긴박함과 환경적 긴박함 사이의 연결선을
                        추적하는 전기다. 최병수의 삶은 그것이 서로 다른 관심이 아니라 다른 스케일의
                        같은 관심임을 보여준다.
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
                      From the scaffolding of a mural site in 1986 to the streets of 1987 to
                      environmental installations on multiple continents, Choe Byeongsu&apos;s work
                      has pursued a single conviction: that art belongs in the world, not apart from
                      it — and that the world urgently needs addressing. He joins this campaign not
                      as a subject of its cause but as a fellow artist in solidarity, so that those
                      who come after might work with the support that was absent from so much of his
                      own journey.
                    </>
                  ) : (
                    <>
                      1986년 벽화 현장의 비계에서, 1987년 거리로, 여러 대륙의 환경 설치 작업으로
                      이어지는 최병수의 작업은 하나의 확신을 추구해 왔다: 미술은 세상에서 분리된
                      것이 아니라 세상 안에 있어야 하고, 세상은 절실히 말 걸어오는 것을 필요로
                      한다는 것. 씨앗페에는 이 캠페인의 대상이 아니라 동료 예술인과의 연대자로
                      함께한다 — 다음 세대의 예술인들이 그가 걸어온 길에서 결여됐던 지지와 함께 일할
                      수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Choe Byeongsu</span>
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
                    Choe Byeongsu joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    최병수 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={CHOE_BYEONGSU_PATH}
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
