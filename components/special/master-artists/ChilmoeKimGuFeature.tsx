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

// 거장 작가 feature는 작가 페이지(/artworks/artist/칡뫼 김구)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko는 '칡뫼 김구'(공백 포함). '칡뫼'는 호.
const CHILMOE_KIM_GU_PATH = `/artworks/artist/${encodeURIComponent('칡뫼 김구')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isChilmoeKimGuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  const compact = n.replace(/[\s-]+/g, '');
  return (
    n === '칡뫼 김구' || compact === '칡뫼김구' || compact === 'chilmoekimgu' || compact === 'kimgu'
  );
};

const PAGE_COPY = {
  ko: {
    title: '칡뫼 김구 — 시대의 비극을 새기는 민중미술 작가',
    description:
      '민중미술의 흐름 속에서 시대의 비극과 사회적 의제를 회화로 새겨 온 작가 칡뫼 김구. 〈아프다〉·〈슬프다〉·〈바라보다〉로 이어지는 애도와 증언, 〈황무지 유령의 벌판〉의 비통한 풍경. 2023 씨앗페 기금마련전에 함께한 연대자의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '시대의 비극과 사회적 의제를 회화로 새겨 온 민중미술 작가 칡뫼 김구. 애도와 증언, 황무지의 벌판.',
    ogAlt: '칡뫼 김구 대표 작품',
    twitterTitle: '칡뫼 김구',
    twitterDescription: '황무지의 벌판 — 시대의 비극을 새기는 민중미술 작가 칡뫼 김구',
    keywords:
      '칡뫼 김구 화가, 칡뫼김구, 민중미술, 황무지 유령의 벌판, 나무아트, 10.29 이태원 넋기림전, 씨앗페 온라인',
  },
  en: {
    title: 'Chilmoe Kim Gu — Minjung Artist Inscribing the Tragedies of an Era',
    description:
      'Selected works by Chilmoe Kim Gu, who has inscribed the tragedies of an era and social issues through painting within the lineage of Korean minjung art. From the mourning and testimony of 〈It Hurts〉, 〈Sad〉, and 〈Looking〉 to the desolate fields of 〈Wasteland: Field of Phantoms〉. A fellow artist who joined the 2023 SAF fundraising exhibition. View and collect his works at SAF Online.',
    ogDescription:
      'Chilmoe Kim Gu — a minjung artist who inscribes the tragedies of an era and social issues through painting. Mourning, testimony, and the wasteland fields.',
    ogAlt: 'Chilmoe Kim Gu — featured work',
    twitterTitle: 'Chilmoe Kim Gu',
    twitterDescription:
      'Fields of a wasteland — a minjung artist inscribing the tragedies of an era',
    keywords:
      'Chilmoe Kim Gu artist, minjung misul, Korean minjung art, mourning, testimony, SAF Online',
  },
} as const;

export async function buildChilmoeKimGuMetadata({
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
  const pageUrl = buildLocaleUrl(CHILMOE_KIM_GU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('칡뫼 김구');
  const artwork = allArtworks.find((a) => isChilmoeKimGuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Chilmoe Kim Gu`
      : `${artwork.title} — 칡뫼 김구`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(CHILMOE_KIM_GU_PATH, locale, true),
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

export default async function ChilmoeKimGuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(CHILMOE_KIM_GU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('칡뫼 김구');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isChilmoeKimGuArtist(artwork.artist)
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
    { name: isEnglish ? 'Chilmoe Kim Gu' : '칡뫼 김구', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${CHILMOE_KIM_GU_PATH}#person-chilmoe-kim-gu`,
    name: isEnglish ? 'Chilmoe Kim Gu' : '칡뫼 김구',
    alternateName: isEnglish ? '칡뫼 김구' : 'Chilmoe Kim Gu',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Chilmoe Kim Gu is a Korean minjung artist who has inscribed the tragedies of an era and social issues — the Itaewon disaster, division, peace, and reunification — through painting. (Chilmoe is his art name.)'
      : '칡뫼 김구는 한국 민중미술의 흐름 속에서 시대의 비극과 사회적 의제(이태원 참사·분단·평화·통일)를 회화로 새겨 온 작가입니다. (칡뫼는 호)',
    knowsAbout: ['Korean minjung art', 'Mourning and testimony', 'Peace and reunification'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Chilmoe Kim Gu — SAF Online' : '칡뫼 김구 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Chilmoe Kim Gu from the SAF Online collection.'
      : '씨앗페 온라인에서 만날 수 있는 칡뫼 김구 작품을 소개합니다.',
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

          {/* Vertical strata lines — 황무지의 벌판 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Chilmoe Kim Gu · Minjung Artist' : '칡뫼 김구 · 민중미술'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Fields of a wasteland,
                  <br />
                  <span className="text-primary-soft">inscribing the tragedies of an era</span>
                </>
              ) : (
                <>
                  황무지의 벌판,
                  <br />
                  <span className="text-primary-soft">시대의 비극을 새기다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    Mourning, testimony, and the desolate fields of a wasteland.
                  </span>
                  <span className="mt-2 block">
                    A heavy, grieving register threaded through Korean minjung art.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">애도와 증언, 그리고 황무지의 벌판.</span>
                  <span className="mt-2 block">
                    민중미술의 흐름을 가로지르는 묵직하고 비통한 톤.
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
                    Inscribing an era —<br />
                    <span className="text-primary-strong">grief, testimony, the wasteland</span>
                  </>
                ) : (
                  <>
                    시대를 새기다 —<br />
                    <span className="text-primary-strong">애도, 증언, 그리고 황무지</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Chilmoe Kim Gu is an artist who has inscribed the tragedies of an era and its
                      social issues through painting, within the lineage of Korean minjung art.
                      &lsquo;Chilmoe&rsquo; is his art name. From his earliest work he has placed
                      the grief of a time and the questions of a society at the center of the canvas
                      rather than at its margins.
                    </p>
                    <p>
                      He began in the 1980s with the 〈1980s Representative Works Exhibition〉
                      (Geurim Madang Min, 1985) and the 〈40th Liberation Anniversary Memorial
                      Street Solo Exhibition〉 (Ganghwa Market, 1985), and earlier still entered the
                      field through the 〈Dong-A Art Festival〉 (MMCA, 1982) and the 〈Indépendant
                      Exhibition〉 (MMCA, 1983). In 1986 he took part in 〈Fresh Statements by Young
                      Generations〉 at Geurim Madang Min — a hub of the era&apos;s minjung art.
                    </p>
                    <p>
                      Across the following decades he built a body of solo exhibitions with a
                      consistent thematic register:{' '}
                      <strong className="font-bold text-charcoal">
                        〈It Hurts〉 (Namu Art, 2018), 〈Sad〉 (Hwain Art, 2020), and 〈Looking〉
                        (Namu Art, 2022)
                      </strong>
                      — a sequence of mourning and testimony. The titles read like a quiet litany:
                      it hurts, it is sad, and still we look.
                    </p>
                    <p>
                      In recent years the desolate field has become his motif. 〈Wasteland: Field of
                      Idols〉 (Namu Art, 2024) and{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈Wasteland: Field of Phantoms〉 (57th Gallery, 2025)
                      </strong>{' '}
                      extend a heavy, grieving register into a landscape emptied of consolation —
                      the wasteland as a stage on which the weight of a time is laid bare.
                    </p>
                    <p>
                      Alongside his solo work he has continuously taken part in exhibitions
                      addressing the era&apos;s grief and the themes of peace and reunification: the
                      〈10.29 Itaewon Disaster Memorial Exhibition〉, the 〈70th Anniversary of
                      Armistice Curated Exhibition: Beloved Faces〉 (Imjingak), the 〈Kim Suyoung
                      100th Birthday Anniversary Exhibition〉, and the 〈DMZ International
                      Invitational: Peace, Reunification, Wish〉 at Odusan Unification Tower — a
                      practice of painting as mourning, testimony, and the carrying-forward of
                      unresolved questions.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      칡뫼 김구는 한국 민중미술의 흐름 속에서 시대의 비극과 사회적 의제를 회화로
                      새겨 온 작가다. &lsquo;칡뫼&rsquo;는 그의 호다. 그는 이른 시기부터 한 시대의
                      비통과 한 사회의 물음을 화면의 변두리가 아니라 한가운데에 놓아 왔다.
                    </p>
                    <p>
                      1980년대 〈80년대 대표작품전〉(1985 그림마당 민)과 〈광복 40주년 기념 거리
                      개인전〉(1985 강화장터)으로 본격적인 발걸음을 뗐고, 그보다 앞서 〈동아미술제〉
                      (1982 국립현대미술관)와 〈앙데팡당전〉(1983 국립현대미술관)으로 미술 현장에
                      들어섰다. 1986년에는 당대 민중미술의 거점이던 그림마당 민에서 〈젊은 세대에
                      의한 신선한 발언전〉에 참여했다.
                    </p>
                    <p>
                      이후 그는 일관된 주제의식의 개인전을 쌓아 갔다 —{' '}
                      <strong className="font-bold text-charcoal">
                        〈아프다〉(2018 나무아트), 〈슬프다〉(2020 화인아트), 〈바라보다〉(2022
                        나무아트)
                      </strong>
                      로 이어지는 애도와 증언의 연쇄. 그 제목들은 조용한 연도(連禱)처럼 읽힌다:
                      아프다, 슬프다, 그래도 바라본다.
                    </p>
                    <p>
                      근래에는 황무지의 벌판이 그의 모티프가 됐다. 〈황무지, 우상의 벌판〉(2024
                      나무아트)과{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈황무지 유령의 벌판〉(2025 57Th 갤러리)
                      </strong>
                      은 묵직하고 비통한 톤을 위안이 비워진 풍경으로 확장한다 — 한 시대의 무게가
                      고스란히 드러나는 무대로서의 황무지.
                    </p>
                    <p>
                      개인 작업과 나란히, 그는 시대의 비통과 평화·통일의 의제를 다룬 전시에 꾸준히
                      참여해 왔다: 〈10.29 이태원 참사 넋기림전〉, 〈정전 70주년 기획전시 그리운
                      얼굴전〉(임진각), 〈김수영 탄생 100주년 기념전〉, 그리고 오두산 통일전망대의
                      〈평화·통일·염원 DMZ국제초대전〉. 회화를 통한 애도이자 증언이며, 아직 풀리지
                      않은 물음을 다음으로 이어 가는 작업이다.
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
                        {isEnglish ? 'Mourning and testimony' : '애도와 증언'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? '〈It Hurts〉, 〈Sad〉, and 〈Looking〉 form a sequence of grief — painting that mourns a time and bears witness to it.'
                          : '〈아프다〉·〈슬프다〉·〈바라보다〉로 이어지는 비탄의 연쇄. 한 시대를 애도하고 증언하는 회화.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The fields of a wasteland' : '황무지의 벌판'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? '〈Wasteland: Field of Idols〉 (2024) and 〈Wasteland: Field of Phantoms〉 (2025) — a heavy, grieving landscape emptied of consolation.'
                          : '〈황무지, 우상의 벌판〉(2024)과 〈황무지 유령의 벌판〉(2025) — 위안이 비워진, 묵직하고 비통한 풍경.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Social agenda and solidarity' : '사회적 의제와 연대'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The Itaewon disaster, division, peace and reunification — themes carried through exhibitions, and a solidarity that brought him to the 2023 SAF fundraising show.'
                          : '이태원 참사·분단·평화·통일 — 전시로 이어 온 의제, 그리고 2023 씨앗페 기금마련전으로 이어진 연대.'}
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
                      1982
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Enters the field through the 〈Dong-A Art Festival〉 (MMCA).'
                        : '〈동아미술제〉(국립현대미술관) 출품으로 미술 현장에 진입.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1983
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Indépendant Exhibition〉 (MMCA).'
                        : '〈앙데팡당전〉(국립현대미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈1980s Representative Works Exhibition〉 (Geurim Madang Min); 〈40th Liberation Anniversary Memorial Street Solo Exhibition〉 (Ganghwa Market).'
                        : '〈80년대 대표작품전〉(그림마당 민); 〈광복 40주년 기념 거리 개인전〉(강화장터).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1986
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Fresh Statements by Young Generations〉 (Geurim Madang Min).'
                        : '〈젊은 세대에 의한 신선한 발언전〉(그림마당 민).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2013
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Back Alley Story〉 (Gyeongin Gallery).'
                        : '개인전 〈밤골목 이야기〉(경인미술관).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈It Hurts〉 (Namu Art); 〈DMZ International Invitational: Peace, Reunification, Wish〉 (Odusan Unification Tower).'
                        : '개인전 〈아프다〉(나무아트); 〈평화·통일·염원 DMZ국제초대전〉(오두산 통일전망대).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Sad〉 (Hwain Art).'
                        : '개인전 〈슬프다〉(화인아트).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Kim Suyoung 100th Birthday Anniversary Exhibition〉 (Le Franc).'
                        : '〈김수영 탄생 100주년 기념전〉(르프랑).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Looking〉 (Namu Art).'
                        : '개인전 〈바라보다〉(나무아트).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈SAF Artist Support Fund Exhibition〉 (Indipress); 〈10.29 Itaewon Disaster Memorial Exhibition〉; 〈70th Anniversary of Armistice: Beloved Faces〉 (Imjingak).'
                        : '〈씨앗페 예술인지원 기금마련전〉(인디프레스); 〈10.29 이태원 참사 넋기림전〉; 〈정전 70주년 기획전시 그리운 얼굴전〉(임진각).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Wasteland: Field of Idols〉 (Namu Art).'
                        : '〈황무지, 우상의 벌판〉(나무아트).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Wasteland: Field of Phantoms〉 (57th Gallery).'
                        : '〈황무지 유령의 벌판〉(57Th 갤러리).'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions' : '주요 전시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈Back Alley Story〉 (Gyeongin Gallery, 2013), 〈It Hurts〉 (Namu Art, 2018), 〈Sad〉 (Hwain Art, 2020), 〈Looking〉 (Namu Art, 2022)'
                        : '개인전: 〈밤골목 이야기〉(경인미술관, 2013), 〈아프다〉(나무아트, 2018), 〈슬프다〉(화인아트, 2020), 〈바라보다〉(나무아트, 2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Wasteland series: 〈Wasteland: Field of Idols〉 (Namu Art, 2024), 〈Wasteland: Field of Phantoms〉 (57th Gallery, 2025)'
                        : '황무지 연작: 〈황무지, 우상의 벌판〉(나무아트, 2024), 〈황무지 유령의 벌판〉(57Th 갤러리, 2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Social & peace exhibitions: 〈10.29 Itaewon Disaster Memorial〉, 〈70th Armistice: Beloved Faces〉 (Imjingak), 〈Kim Suyoung 100th Anniversary〉, 〈DMZ International Invitational: Peace, Reunification, Wish〉 (Odusan Unification Tower)'
                        : '사회·평화 전시: 〈10.29 이태원 참사 넋기림전〉, 〈정전 70주년 그리운 얼굴전〉(임진각), 〈김수영 탄생 100주년 기념전〉, 〈평화·통일·염원 DMZ국제초대전〉(오두산 통일전망대)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Early exhibitions: 〈Dong-A Art Festival〉 (MMCA, 1982), 〈Indépendant Exhibition〉 (MMCA, 1983), 〈Fresh Statements by Young Generations〉 (Geurim Madang Min, 1986)'
                        : '초기 전시: 〈동아미술제〉(국립현대미술관, 1982), 〈앙데팡당전〉(국립현대미술관, 1983), 〈젊은 세대에 의한 신선한 발언전〉(그림마당 민, 1986)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep font-medium">
                      {isEnglish
                        ? '2023 〈SAF Artist Support Fund Exhibition〉 (Indipress) — joining this campaign in solidarity'
                        : '2023 〈씨앗페 예술인지원 기금마련전〉(인디프레스) — 연대의 뜻으로 함께한 이력'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sub-essay Section — ShinHakchul 패턴 차용, 칡뫼 김구 charcoal 모티프 */}
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
              {/* 1. 민중미술의 흐름 속에서 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'Within the lineage of minjung art' : '민중미술의 흐름 속에서'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Chilmoe Kim Gu&apos;s practice belongs to the lineage of Korean minjung art
                        — the current that, from the 1980s, turned painting toward the collective
                        and the social rather than the purely formal. His early steps trace that
                        ground: the 〈Dong-A Art Festival〉 (MMCA, 1982), the 〈Indépendant
                        Exhibition〉 (MMCA, 1983), and, at Geurim Madang Min — a gathering place of
                        the era&apos;s minjung artists — 〈Fresh Statements by Young Generations〉
                        (1986).
                      </p>
                      <p>
                        In 1985 two exhibitions marked his arrival: the 〈1980s Representative Works
                        Exhibition〉 at Geurim Madang Min, and a 〈40th Liberation Anniversary
                        Memorial Street Solo Exhibition〉 staged in the open air of Ganghwa Market.
                        To bring painting out of the gallery and into a marketplace was itself a
                        gesture of the movement — art addressed to ordinary people, in the places
                        where they live.
                      </p>
                      <p>
                        From these beginnings, the through-line of his work has been a refusal to
                        look away. Whether the subject is a national grief or a quiet back alley,
                        the canvas is asked to hold the weight of a shared condition — to keep,
                        rather than to console.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        칡뫼 김구의 작업은 한국 민중미술의 흐름에 속한다 — 1980년대부터 회화를
                        순수한 조형이 아니라 집단과 사회로 향하게 한 그 물줄기에. 그의 초기 발걸음이
                        그 토대를 보여 준다: 〈동아미술제〉(국립현대미술관, 1982), 〈앙데팡당전〉
                        (국립현대미술관, 1983), 그리고 당대 민중미술가들의 회합 장소였던 그림마당
                        민에서의 〈젊은 세대에 의한 신선한 발언전〉(1986).
                      </p>
                      <p>
                        1985년, 두 전시가 그의 도착을 알렸다 — 그림마당 민의 〈80년대 대표작품전〉,
                        그리고 강화장터 한복판에서 열린 〈광복 40주년 기념 거리 개인전〉. 회화를
                        화랑 밖으로, 장터로 끌고 나온다는 것 자체가 운동의 몸짓이었다 — 사람들이
                        사는 자리에서, 보통 사람을 향해 건네는 미술.
                      </p>
                      <p>
                        이 출발점에서부터 그의 작업을 관통하는 것은 외면하지 않으려는 태도다. 대상이
                        한 나라의 비통이든 조용한 밤골목이든, 화면은 공유된 처지의 무게를 감당하도록
                        요청받는다 — 위로하기보다, 간직하기 위해.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 아프다, 슬프다, 바라보다 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈It Hurts〉, 〈Sad〉, 〈Looking〉 — a litany of mourning'
                    : '아프다, 슬프다, 바라보다 — 애도의 연도(連禱)'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Read together, the titles of three solo exhibitions form a quiet sequence:
                        〈It Hurts〉 (Namu Art, 2018), 〈Sad〉 (Hwain Art, 2020), 〈Looking〉 (Namu
                        Art, 2022). It hurts; it is sad; and still, we look. The progression is not
                        toward resolution but toward a steadier gaze — a decision to remain present
                        before what wounds.
                      </p>
                      <p>
                        This register of mourning is inseparable from the social subjects he has
                        carried into exhibition: the 〈10.29 Itaewon Disaster Memorial Exhibition〉,
                        held in remembrance of lives lost; the 〈70th Anniversary of Armistice:
                        Beloved Faces〉 at Imjingak, where the unhealed line of division becomes a
                        face to be looked at; the 〈Kim Suyoung 100th Birthday Anniversary
                        Exhibition〉, in homage to a poet of conscience.
                      </p>
                      <p>
                        Across these works, painting becomes an act of attention. To look — to
                        bara-boda — is offered not as a passive verb but as a form of fidelity: a
                        way of refusing to let grief pass unmarked.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        세 개인전의 제목을 나란히 읽으면 조용한 연쇄가 된다: 〈아프다〉(나무아트,
                        2018), 〈슬프다〉(화인아트, 2020), 〈바라보다〉(나무아트, 2022). 아프다,
                        슬프다, 그래도 바라본다. 이 진행은 해소를 향하지 않는다 — 더 단단해진 응시를
                        향한다. 상처 입히는 것 앞에 머물기로 한 결심.
                      </p>
                      <p>
                        이 애도의 톤은 그가 전시로 끌어안아 온 사회적 대상과 떼어 놓을 수 없다: 떠난
                        이들을 기리는 〈10.29 이태원 참사 넋기림전〉; 아물지 않은 분단의 선이 하나의
                        얼굴이 되어 마주보게 되는 임진각의 〈정전 70주년 그리운 얼굴전〉; 양심의
                        시인을 기리는 〈김수영 탄생 100주년 기념전〉.
                      </p>
                      <p>
                        이 작업들을 가로질러, 회화는 주목하는 행위가 된다. 바라본다는 것은 수동의
                        동사가 아니라 충실함의 한 형식으로 건네진다 — 슬픔이 표시되지 않은 채
                        지나가게 두지 않으려는 방식.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 황무지의 벌판 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'The wasteland — and a hand extended in solidarity'
                    : '황무지의 벌판 — 그리고 내민 연대의 손'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In his recent work the field of a wasteland has emerged as the central
                        motif. 〈Wasteland: Field of Idols〉 (Namu Art, 2024) and 〈Wasteland: Field
                        of Phantoms〉 (57th Gallery, 2025) extend the grieving register of the
                        earlier solo shows into a landscape stripped of consolation — a ground on
                        which the weight of a time is laid bare, neither resolved nor disguised.
                      </p>
                      <p>
                        That a wasteland can also be a field is the quiet tension the title holds: a
                        place emptied out, and yet still a place where something might be planted.
                        The motif keeps faith with the mourning that precedes it while reaching
                        toward what is not yet there.
                      </p>
                      <p>
                        It is in that same spirit that, in 2023, Chilmoe Kim Gu took part in the SAF
                        Artist Support Fund Exhibition at Indipress. He joins this campaign not as a
                        subject of its cause but as a fellow artist in solidarity — one who, having
                        attended so closely to loss, extends a hand toward the colleagues who come
                        next.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        근래의 작업에서 황무지의 벌판이 중심 모티프로 떠올랐다. 〈황무지, 우상의
                        벌판〉(나무아트, 2024)과 〈황무지 유령의 벌판〉(57Th 갤러리, 2025)은 앞선
                        개인전들의 애도 톤을 위안이 비워진 풍경으로 확장한다 — 한 시대의 무게가
                        해소되지도 가려지지도 않은 채 고스란히 드러나는 바닥.
                      </p>
                      <p>
                        황무지가 동시에 벌판일 수 있다는 것, 그 제목이 품은 조용한 긴장이다: 비워진
                        자리, 그러나 여전히 무언가 심길 수 있는 자리. 이 모티프는 앞선 애도에 대한
                        신의를 지키면서도 아직 거기 없는 것을 향해 손을 뻗는다.
                      </p>
                      <p>
                        바로 그 마음으로, 2023년 칡뫼 김구는 인디프레스에서 열린 씨앗페 예술인지원
                        기금마련전에 함께했다. 그는 이 캠페인의 대상이 아니라, 동료 예술인과의
                        연대자로 함께한다 — 상실을 그토록 가까이 들여다본 사람이, 다음에 올 동료들을
                        향해 손을 내민다.
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
                      From the street exhibition of 1985 to the wasteland fields of 2025, Chilmoe
                      Kim Gu&apos;s work has pursued a single discipline: to attend to the tragedies
                      of a time without looking away, and to keep them on the canvas. He joins this
                      campaign not as a subject of its cause but as a fellow artist in solidarity —
                      so that those who come after might work without the weight he has borne.
                    </>
                  ) : (
                    <>
                      1985년 거리의 전시에서 2025년 황무지의 벌판까지, 칡뫼 김구의 작업은 하나의
                      규율을 추구해 왔다: 한 시대의 비극을 외면하지 않고 들여다보는 것, 그리고
                      그것을 화면 위에 간직하는 것. 씨앗페에는 이 캠페인의 대상이 아니라, 동료
                      예술인과의 연대자로 함께한다 — 다음 세대의 예술인들이 그가 짊어진 무게 없이
                      일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">
                Chilmoe Kim Gu
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
                    Chilmoe Kim Gu joined this campaign in solidarity with fellow artists — having
                    already stood with it at the 2023 SAF fundraising exhibition. Every work sold
                    flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    칡뫼 김구 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다 — 이미
                    2023년 씨앗페 기금마련전으로 그 곁에 섰던 작가입니다. 작품 판매 수익은 전액{' '}
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
                returnTo={CHILMOE_KIM_GU_PATH}
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
