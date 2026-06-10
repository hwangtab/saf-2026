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

// 거장 작가 feature는 작가 페이지(/artworks/artist/손장섭)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const SON_JANGSEOP_PATH = `/artworks/artist/${encodeURIComponent('손장섭')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isSonJangseopArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '손장섭' ||
    n === 'son jang-sup' ||
    n === 'son jangsup' ||
    n === 'son jangseop' ||
    n.replace(/[\s-]+/g, '') === 'sonjangsup' ||
    n.replace(/[\s-]+/g, '') === 'sonjangseop'
  );
};

const PAGE_COPY = {
  ko: {
    title: '손장섭 — 역사를 목격한 풍경의 화가',
    description:
      '민중미술의 효시 그룹 ‘현실과 발언’ 창립 동인 손장섭(1941–2021). 한국 현대사를 담은 역사화에서 출발해, 한자리에서 시대를 견디며 역사를 목격한 나무와 자연 풍경으로 나아간 1세대 민중미술 거장. 그의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '손장섭(1941–2021) — 역사화에서 신목(神木)·풍경 연작으로. 민중과 자연의 시간을 화폭에 새긴 1세대 민중미술 거장.',
    ogAlt: '손장섭 대표 작품',
    twitterTitle: '손장섭',
    twitterDescription: '나무처럼 — 한자리에서 역사를 목격한 풍경의 화가 손장섭',
    keywords:
      '손장섭 화가, 현실과 발언, 민중미술, 역사화, 신목, 풍경화, 민족미술협의회, 씨앗페 온라인',
  },
  en: {
    title: 'Son Jangseop — Painter of Landscapes That Witnessed History',
    description:
      'Selected works by Son Jangseop (1941–2021), a founding member of Reality and Utterance, the group that opened Korean minjung art. From history paintings of modern Korea he moved toward trees and landscapes that stood in one place and bore witness to their era — a first-generation minjung master. View and collect his works at SAF Online.',
    ogDescription:
      'Son Jangseop (1941–2021) — from history painting to the sacred-tree and landscape series. A first-generation minjung master who inscribed the time of people and nature onto canvas.',
    ogAlt: 'Son Jangseop — featured work',
    twitterTitle: 'Son Jangseop',
    twitterDescription:
      'Like a tree — a painter of landscapes that stood in one place and witnessed history',
    keywords:
      'Son Jangseop artist, Reality and Utterance, minjung misul, Korean history painting, sacred tree, landscape painting',
  },
} as const;

export async function buildSonJangseopMetadata({
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
  const pageUrl = buildLocaleUrl(SON_JANGSEOP_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('손장섭');
  const artwork = allArtworks.find((a) => isSonJangseopArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Son Jangseop`
      : `${artwork.title} — 손장섭`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(SON_JANGSEOP_PATH, locale, true),
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

export default async function SonJangseopFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(SON_JANGSEOP_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('손장섭');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isSonJangseopArtist(artwork.artist)
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
    { name: isEnglish ? 'Son Jangseop' : '손장섭', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${SON_JANGSEOP_PATH}#person-son-jangseop`,
    name: isEnglish ? 'Son Jangseop' : '손장섭',
    alternateName: isEnglish ? '손장섭' : 'Son Jangseop',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Son Jangseop (1941–2021) was a founding member of Reality and Utterance, the group that opened Korean minjung art. From history paintings he turned to trees and landscapes that bore witness to their era.'
      : '손장섭(1941–2021)은 민중미술의 효시 그룹 ‘현실과 발언’ 창립 동인으로, 한국 현대사를 담은 역사화에서 출발해 시대를 목격한 나무와 자연 풍경으로 나아간 1세대 민중미술 거장입니다.',
    birthDate: '1941',
    deathDate: '2021-06-01',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Gogeumdo, Wando, South Jeolla, South Korea' : '전남 완도군 고금도',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Hongik University, Dept. of Western Painting' : '홍익대학교 서양화과',
    },
    affiliation: [
      {
        '@type': 'Organization',
        name: isEnglish ? 'Reality and Utterance' : '현실과 발언',
      },
      {
        '@type': 'Organization',
        name: isEnglish
          ? "National Artists' Association (Minjok Misul Hyeopuihoe)"
          : '민족미술협의회',
      },
    ],
    knowsAbout: ['Korean minjung art', 'History painting', 'Landscape painting'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Son Jangseop — SAF Online' : '손장섭 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Son Jangseop from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 손장섭 작품들을 소개합니다.',
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

          {/* Vertical strata lines — 한자리에 선 나무, 시대의 지층 모티프 */}
          <div className="absolute top-0 left-8 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-16 h-full w-px bg-primary/30" />
          <div className="absolute top-0 right-12 h-full w-px bg-white/10" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Son Jangseop · 1941–2021' : '손장섭 · 1941–2021'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Like a tree, standing in one place
                  <br />
                  <span className="text-primary-soft">it witnessed history</span>
                </>
              ) : (
                <>
                  나무처럼, 한자리에 서서
                  <br />
                  <span className="text-primary-soft">역사를 목격하다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    From the history paintings of modern Korea to a forest of old trees.
                  </span>
                  <span className="mt-2 block">
                    The time of people and nature, layered onto a single canvas.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">한국 현대사의 역사화에서 노거수의 숲으로.</span>
                  <span className="mt-2 block">
                    민중과 자연의 시간이 한 화폭에 겹겹이 새겨진다.
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
                    History and nature —<br />
                    <span className="text-primary-strong">the time held by a single tree</span>
                  </>
                ) : (
                  <>
                    역사와 자연 —<br />
                    <span className="text-primary-strong">한 그루 나무가 품은 시간</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Son Jangseop (1941–2021) was born on Gogeumdo, an island in Wando, South
                      Jeolla province, and graduated from Hongik University&apos;s Department of
                      Western Painting. He began his career painting scenes from modern Korean
                      history, building a practice rooted in historical consciousness and a steady
                      attention to the lives of ordinary people.
                    </p>
                    <p>
                      Around 1980 he became a founding member of{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Reality and Utterance
                      </strong>{' '}
                      (현실과 발언), the group widely regarded as the opening of the Korean minjung
                      art movement. Reality and Utterance set out to restore the social dimension of
                      art, and Son took part in its exhibitions until the group disbanded in 1990.
                      In 1985 he served as the first chair of the National Artists&apos; Association
                      (민족미술협의회).
                    </p>
                    <p>
                      Through the 1980s and into the 1990s his work carried a charged historical
                      awareness and a quiet resistance to the contradictions of the present —
                      history paintings, scenes of working life, and the faces of ordinary Koreans.
                      〈Window of History — June 25〉 (1990) belongs to this period.
                    </p>
                    <p>
                      From the late 1990s, his subject shifted toward Korean nature.
                      &ldquo;Nature,&rdquo; he said, &ldquo;is the ground where the life of the
                      people unfolds and history soaks in.&rdquo; In the 2000s he built the{' '}
                      <strong className="font-bold text-charcoal">sacred-tree (神木) series</strong>{' '}
                      and a body of landscape paintings, traveling the country to paint its great
                      old trees — the juniper of Ulleungdo, the ginkgo of Yongmunsa, the yew of
                      Taebaeksan. In these canvases a tree that has stood in one place for centuries
                      becomes the witness of an era, and the strength of nature stands in for the
                      endurance of the people themselves.
                    </p>
                    <p>
                      In 2019–2020 the Gwangju Museum of Art held the retrospective{' '}
                      <em>Son Jangseop: Landscapes That Have Been History</em> (Nov 2019 – Feb
                      2020), surveying six decades of his work — from early watercolors through
                      1980s minjung painting to the sacred-tree and landscape series. He passed away
                      on June 1, 2021, at the age of eighty.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      손장섭(1941–2021)은 전남 완도군 고금도에서 태어나 홍익대학교 서양화과를
                      졸업했다. 그는 한국 현대사의 여러 장면을 소재로 한 역사화로 작업을 시작했으며,
                      역사의식과 서민의 삶에 대한 변함없는 관심을 바탕으로 자신의 화풍을 다져
                      나갔다.
                    </p>
                    <p>
                      1980년 전후, 그는{' '}
                      <strong className="font-bold text-charcoal-deep">‘현실과 발언’</strong> 창립
                      동인으로 참여했다. ‘현실과 발언’은 한국 민중미술 운동의 출발을 알린 효시
                      그룹으로 평가되며, 예술의 사회성을 복원하고자 한 모임이었다. 손장섭은 1990년
                      그룹이 해체될 때까지 동인전에 출품했고, 1985년에는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        민족미술협의회 초대 회장
                      </strong>
                      을 맡았다.
                    </p>
                    <p>
                      1980년대를 지나 1990년대까지 그의 작업은 치열한 역사의식과, 현실의 모순을 향한
                      조용한 저항을 담았다 — 역사화, 노동하는 삶의 장면, 그리고 서민의 얼굴.
                      「역사의 창-6.25」(1990)가 이 시기에 속한다.
                    </p>
                    <p>
                      1990년대 말부터 그의 소재는 한국의 자연으로 옮겨 갔다. &ldquo;자연은 민중의
                      삶이 펼쳐지고 역사가 배어 있는 현장&rdquo;이라는 것이었다. 2000년대에 그는{' '}
                      <strong className="font-bold text-charcoal">신목(神木) 연작</strong>과 일련의
                      풍경화를 구축했다. 전국의 노거수를 답사해 화폭에 담았으니 — 울릉도 향나무,
                      용문사 은행나무, 태백산 주목이 그것이다. 이 화면들에서 수백 년 한자리에 선
                      나무는 한 시대의 목격자가 되고, 자연의 강인함은 곧 민중의 끈질긴 생명력을
                      대신한다.
                    </p>
                    <p>
                      2019–2020년 광주시립미술관은 회고전 《손장섭, 역사가 된
                      풍경》(2019.11–2020.2)을 열어, 초기 수채화부터 1980년대 민중미술, 신목·풍경
                      연작까지 그의 60년 작업을 망라했다. 그는 2021년 6월 1일, 향년 80세로 별세했다.
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
                        {isEnglish ? 'History painting' : '역사화'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Scenes of modern Korean history rendered with charged historical awareness — a witness to the contradictions of an era.'
                          : '한국 현대사의 장면을 치열한 역사의식으로 그린다 — 한 시대의 모순을 증언하는 화면.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Reality and Utterance' : '현실과 발언'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A founding member of the group that opened Korean minjung art, and first chair of the National Artists’ Association in 1985.'
                          : '한국 민중미술의 효시 그룹 창립 동인. 1985년 민족미술협의회 초대 회장.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Trees & landscape' : '나무와 풍경'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The sacred-tree series and landscapes — old trees that stood in one place for centuries become witnesses of history.'
                          : '신목(神木) 연작과 풍경화 — 수백 년 한자리에 선 나무가 역사의 목격자가 된다.'}
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
                      1941
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born on Gogeumdo, Wando, South Jeolla province.'
                        : '전남 완도군 고금도 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1980
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Founding member of Reality and Utterance, the group that opened Korean minjung art.'
                        : '민중미술의 효시 그룹 ‘현실과 발언’ 창립 동인.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1985
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Serves as the first chair of the National Artists’ Association.'
                        : '민족미술협의회 초대 회장.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Paints 〈Window of History — June 25〉; Reality and Utterance disbands.'
                        : '「역사의 창-6.25」 제작; ‘현실과 발언’ 해체.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Turns toward Korean nature and landscape as a ground where life and history soak in.'
                        : '민중의 삶과 역사가 배어 있는 현장으로서 한국 자연·풍경으로 전환.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Builds the sacred-tree (神木) series, painting great old trees across the country.'
                        : '전국의 노거수를 답사한 신목(神木) 연작 구축.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 《History, as Painting in Material Trace》, Hakgojae Gallery, Seoul.'
                        : '개인전 《역사, 그 물질적 흔적으로서의 회화》, 학고재갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2019
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Retrospective 《Landscapes That Have Been History》, Gwangju Museum of Art (Nov 2019 – Feb 2020).'
                        : '회고전 《손장섭, 역사가 된 풍경》, 광주시립미술관(2019.11–2020.2).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Passes away on June 1, at the age of eighty.'
                        : '6월 1일 별세, 향년 80세.'}
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
                          Solo exhibition: <em>History, as Painting in Material Trace</em>, Hakgojae
                          Gallery, Seoul (2017)
                        </>
                      ) : (
                        <>개인전: 《역사, 그 물질적 흔적으로서의 회화》, 학고재갤러리 (2017)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Retrospective: <em>Son Jangseop: Landscapes That Have Been History</em>,
                          Gwangju Museum of Art (Nov 2019 – Feb 2020)
                        </>
                      ) : (
                        <>회고전: 《손장섭, 역사가 된 풍경》, 광주시립미술관 (2019.11–2020.2)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'His works are held in major public collections including the National Museum of Modern and Contemporary Art (MMCA), Korea.'
                        : '국립현대미술관(MMCA)을 비롯한 주요 공공 미술관에 작품이 소장되어 있다.'}
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
                  <span className="text-charcoal-deep">on history, nature, and the tree</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">역사와 자연, 그리고 나무에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 현실과 발언 — 민중미술의 출발 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Reality and Utterance — the opening of minjung art'
                    : '현실과 발언 — 민중미술의 출발'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Around 1980, a group of painters and critics formed Reality and Utterance
                        (현실과 발언). It is widely regarded as the signal that opened the Korean
                        minjung art movement — a turn away from pure formalism and toward an art
                        that could speak to its own society. Son Jangseop was among its founding
                        members.
                      </p>
                      <p>
                        For a generation, the question was what painting was for. Reality and
                        Utterance answered by insisting that art carried a social dimension, and
                        that the artist could attend to the conditions of ordinary life rather than
                        turn away from them. Son took part in the group&apos;s exhibitions until it
                        disbanded in 1990, and in 1985 he served as the first chair of the National
                        Artists&apos; Association.
                      </p>
                      <p>
                        Within this current, Son&apos;s contribution was a body of history painting:
                        scenes of modern Korea built from a sustained historical awareness. He
                        treated history not as backdrop but as subject — the ground on which the
                        lives of ordinary people were lived and remembered.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1980년 전후, 화가와 비평가들이 모여 ‘현실과 발언’을 결성했다. 이 모임은 한국
                        민중미술 운동의 출발을 알린 신호탄으로 평가된다 — 순수 형식주의에서 돌아서,
                        자기 사회를 향해 말할 수 있는 미술로의 전환. 손장섭은 그 창립 동인 가운데 한
                        사람이었다.
                      </p>
                      <p>
                        한 세대에게 물음은 ‘회화는 무엇을 위한 것인가’였다. ‘현실과 발언’은 미술이
                        사회성을 지닌다는 것, 그리고 작가가 일상의 조건에서 눈을 돌리는 대신 그것을
                        응시할 수 있다는 것으로 답했다. 손장섭은 1990년 그룹이 해체될 때까지
                        동인전에 참여했고, 1985년에는 민족미술협의회 초대 회장을 맡았다.
                      </p>
                      <p>
                        이 흐름 안에서 손장섭의 몫은 한 묶음의 역사화였다 — 지속된 역사의식으로 쌓아
                        올린 한국 현대사의 장면들. 그에게 역사는 배경이 아니라 주제였다. 서민의 삶이
                        영위되고 기억되는 바로 그 토대였다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 역사화에서 풍경으로 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish ? 'From history painting to landscape' : '역사화에서 풍경으로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Through the 1980s and 1990s, Son&apos;s work stayed close to history: scenes
                        of labour, the faces of ordinary people, and paintings of the modern Korean
                        past such as 〈Window of History — June 25〉 (1990).
                      </p>
                      <p>
                        From the late 1990s the subject shifted, but the conviction did not.
                        &ldquo;Nature,&rdquo; Son said, &ldquo;is the ground where the life of the
                        people unfolds and history soaks in.&rdquo; The landscape was not an escape
                        from history but another way of holding it. A mountain, a shoreline, an old
                        tree — each had stood through the same century his earlier paintings had
                        depicted.
                      </p>
                      <p>
                        This continuity is the through-line of his work. Where the early history
                        paintings looked at events directly, the later landscapes looked at what had
                        endured those events. The witness was no longer a crowd or a figure, but the
                        land itself.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1980년대와 1990년대를 지나는 동안, 손장섭의 작업은 역사에 가까이 있었다 —
                        노동의 장면, 서민의 얼굴, 그리고 「역사의 창-6.25」(1990)와 같은 한국
                        현대사의 회화.
                      </p>
                      <p>
                        1990년대 말부터 소재는 옮겨 갔지만, 확신은 그대로였다. &ldquo;자연은 민중의
                        삶이 펼쳐지고 역사가 배어 있는 현장&rdquo;이라고 그는 말했다. 풍경은
                        역사로부터의 도피가 아니라, 역사를 품는 또 하나의 방식이었다. 산 하나,
                        바닷가 하나, 오래된 나무 한 그루 — 저마다 그의 이전 회화가 그렸던 바로 그 한
                        세기를 견뎌 온 존재였다.
                      </p>
                      <p>
                        이 연속성이 그의 작업을 관통한다. 초기의 역사화가 사건을 직접 바라보았다면,
                        후기의 풍경은 그 사건을 견뎌 낸 것을 바라보았다. 목격자는 더 이상 군중이나
                        인물이 아니라, 땅 그 자체였다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 나무처럼 — 신목 연작 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish ? 'Like a tree — the sacred-tree series' : '나무처럼 — 신목 연작'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In the 2000s, Son traveled the country to paint its great old trees — the
                        juniper of Ulleungdo, the ginkgo of Yongmunsa, the yew of Taebaeksan. He
                        called them sacred trees (神木): not because of any cult around them, but
                        because a tree that has stood in one place for centuries has, in a literal
                        sense, witnessed the history that passed beneath it.
                      </p>
                      <p>
                        In these canvases the tree carries the weight the human figure once carried
                        in his history paintings. Its rooted endurance — the way it survives storm
                        and season without moving — becomes an image of the people&apos;s own
                        persistence. Critics have read the series as a statement that the true
                        subject of history, the thing that endures and can change the world, is
                        finally the people themselves.
                      </p>
                      <p>
                        The 2019–2020 Gwangju Museum of Art retrospective gathered six decades of
                        this work under a single title — <em>Landscapes That Have Been History</em>.
                        It was a fitting summary: in Son Jangseop&apos;s hands, a landscape is never
                        only a landscape. It is time made visible.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2000년대에 손장섭은 전국을 답사하며 노거수를 그렸다 — 울릉도 향나무, 용문사
                        은행나무, 태백산 주목. 그는 그것들을 신목(神木)이라 불렀다. 어떤 숭배 때문이
                        아니라, 수백 년 한자리에 선 나무란 말 그대로 그 아래로 흘러간 역사를 목격해
                        온 존재이기 때문이었다.
                      </p>
                      <p>
                        이 화면들에서 나무는, 한때 그의 역사화에서 인물이 짊어졌던 무게를 대신
                        감당한다. 뿌리내린 채 폭풍과 계절을 자리를 옮기지 않고 견뎌 내는 그 방식은,
                        곧 민중의 끈질긴 생명력의 이미지가 된다. 비평계는 이 연작을, 역사의 진정한
                        주체이자 세상을 바꿀 수 있는 것이 결국 민중이라는 진술로 읽는다.
                      </p>
                      <p>
                        2019–2020년 광주시립미술관 회고전은 이 60년의 작업을 하나의 제목 아래 모았다
                        — 《역사가 된 풍경》. 그것은 적절한 요약이었다. 손장섭의 손에서 풍경은 결코
                        풍경에 그치지 않는다. 그것은 보이게 된 시간이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Coda — 추모·계승 톤 (작고 작가) */}
              <div className="border-l-[6px] border-charcoal pl-8 py-3 mt-4">
                <p className="text-lg leading-[1.85] text-charcoal font-medium">
                  {isEnglish ? (
                    <>
                      From the founding of Reality and Utterance to the great old trees of his final
                      decades, Son Jangseop&apos;s work pursued a single conviction: that history is
                      carried not by the powerful but by those who endure — people, and the land
                      that holds their time. Son passed away in 2021. His works join this campaign
                      as the legacy he left behind, and the care he held all his life for people,
                      history, and nature is carried forward here as mutual aid among fellow and
                      younger artists.
                    </>
                  ) : (
                    <>
                      ‘현실과 발언’의 출발에서 말년의 노거수까지, 손장섭의 작업은 하나의 확신을
                      추구했다 — 역사를 짊어지는 것은 힘 있는 자가 아니라 견디는 존재, 곧 민중과
                      그들의 시간을 품은 땅이라는 확신. 손장섭은 2021년 작고했다. 그의 작품은 그가
                      남긴 유산으로서 씨앗페에 함께하며, 그가 평생 견지한 민중과 역사·자연에 대한
                      애정의 정신은 이곳에서 동료·후배 예술인을 위한 상호부조의 뜻으로 이어진다.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Son Jangseop</span>
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
                    Son Jangseop passed away in 2021. His works join this campaign as the legacy he
                    left behind, and every work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — so
                    that the care he held all his life for people, history, and nature continues as
                    a lifeline for an artist navigating financial exclusion today.
                  </>
                ) : (
                  <>
                    손장섭 작가는 2021년 작고했습니다. 그의 작품은 그가 남긴 유산으로서 씨앗페에
                    함께하며, 작품 판매 수익은 전액{' '}
                    <strong className="text-white">예술인 상호부조 대출 기금</strong>으로
                    이어집니다. 그가 평생 견지한 민중과 역사·자연에 대한 애정이, 오늘 금융 차별을
                    겪는 예술인 한 사람의 다음 한 달로 이어집니다.
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
                returnTo={SON_JANGSEOP_PATH}
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
