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

// 작가 feature는 작가 페이지(/artworks/artist/오아)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
// DB name_ko='오아', name_en='Oa' (활동명).
const OA_PATH = `/artworks/artist/${encodeURIComponent('오아')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isOaArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return n === '오아' || n === 'oa';
};

const PAGE_COPY = {
  ko: {
    title: '오아 — 빛과 어둠의 경계를 그리는 화가',
    description:
      '빛과 어둠의 경계에 서린 감정의 결을 회화로 옮겨 온 작가 오아. 첫 개인전 〈달에서 달에게〉(2022, 아트스페이스 영)와 〈짙은 방〉을 통해 어둑하고 시적인 화면을 펼쳐 왔다. 2023년 H-EAA 전국청년작가 미술공모전 우수상 수상작가 오아의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '빛과 어둠의 경계에 서린 감정의 결을 그리는 화가 오아. 〈달에서 달에게〉의 어둑하고 시적인 화면.',
    ogAlt: '오아 대표 작품',
    twitterTitle: '오아',
    twitterDescription: '달에서 달에게 — 빛과 어둠의 경계를 그리는 화가 오아',
    keywords: '오아 화가, 달에서 달에게, 짙은 방, 빛과 어둠, 회화, 감정의 결, 씨앗페 온라인',
  },
  en: {
    title: 'Oa — Painter of the Boundary Between Light and Darkness',
    description:
      'Selected works by Oa, a painter who translates the textures of emotion that linger at the boundary between light and darkness. Through her first solo exhibition 〈From the Moon to the Moon〉 (2022, Art Space Young) and 〈Dark Room〉, she unfolds dim, poetic canvases. A 2023 H-EAA Excellence Award laureate. View and collect her works at SAF Online.',
    ogDescription:
      'Oa — painter of the textures of emotion at the boundary between light and darkness. The dim, poetic canvases of 〈From the Moon to the Moon〉.',
    ogAlt: 'Oa — featured work',
    twitterTitle: 'Oa',
    twitterDescription: 'From the moon to the moon — painting the boundary between light and dark',
    keywords:
      'Oa artist, From the Moon to the Moon, Dark Room, light and darkness, Korean contemporary painting, emotion',
  },
} as const;

export async function buildOaMetadata({
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
  const pageUrl = buildLocaleUrl(OA_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('오아');
  const artwork = allArtworks.find((a) => isOaArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Oa`
      : `${artwork.title} — 오아`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(OA_PATH, locale, true),
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

export default async function OaFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(OA_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('오아');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isOaArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Oa' : '오아', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${OA_PATH}#person-oa`,
    name: isEnglish ? 'Oa' : '오아',
    alternateName: isEnglish ? '오아' : 'Oa',
    jobTitle: isEnglish ? 'Artist' : '화가',
    description: isEnglish
      ? 'Oa is a painter who translates the textures of emotion that linger at the boundary between light and darkness through her canvases.'
      : '오아는 빛과 어둠의 경계에 서린 감정의 결을 회화로 옮겨 온 작가입니다.',
    knowsAbout: ['Contemporary painting', 'Light and darkness', 'Emotional figuration'],
    award: isEnglish
      ? '2023 H-EAA National Young Artists Art Competition, Excellence Award'
      : '2023 H-EAA 전국청년작가 미술공모전 우수상',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Oa — SAF Online' : '오아 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Oa from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 오아 작품들을 소개합니다.',
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
        {/* Hero Section — 달에서 달에게: 어둑하고 시적인 톤 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal-deep">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 빛과 어둠의 경계 모티프 — 화면을 가로지르는 미광의 선 */}
          <div className="absolute top-0 left-10 h-full w-px bg-white/10" />
          <div className="absolute top-0 left-1/2 h-full w-px bg-primary/25" />
          <div className="absolute top-0 right-14 h-full w-px bg-white/10" />
          {/* 초승달의 미광 — 우상단 은은한 빛무리 */}
          <div className="absolute -top-24 right-[-6rem] w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Oa · Painter' : '오아 · 회화'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  From the moon
                  <br />
                  <span className="text-primary-soft">to the moon</span>
                </>
              ) : (
                <>
                  달에서
                  <br />
                  <span className="text-primary-soft">달에게</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The textures of emotion that linger where light meets dark.
                  </span>
                  <span className="mt-2 block">
                    Dim, poetic canvases held at the threshold of a crescent.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">빛과 어둠이 만나는 경계에 서린 감정의 결.</span>
                  <span className="mt-2 block">초승달의 문턱에 머무는 어둑하고 시적인 화면.</span>
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
                    At the threshold —<br />
                    <span className="text-primary-strong">where light meets darkness</span>
                  </>
                ) : (
                  <>
                    경계에 서서 —<br />
                    <span className="text-primary-strong">빛이 어둠과 만나는 자리</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Oa is a painter who, working under her chosen name, translates the textures of
                      emotion that linger at the boundary between light and darkness. Her canvases
                      do not resolve into either the lit or the unlit; they hold the threshold
                      itself — the dim band where a face emerges from shadow, or recedes back into
                      it.
                    </p>
                    <p>
                      She announced this sensibility in 2022 with two solo exhibitions held the same
                      year. 〈From the Moon to the Moon〉 at Art Space Young (Seoul) gathered the
                      crescent moon as its central image — read by critics as a figure of hope, of
                      the mirror, of memory, and of another self. 〈Dark Room〉 at Art Logic Space
                      pressed further into the unlit interior, naming the very space in which her
                      images are made and seen.
                    </p>
                    <p>
                      Across her work the emotional register is carried less by event than by{' '}
                      <strong className="font-bold text-charcoal">tone</strong> — the gradation
                      between light and shadow becomes the grammar by which feeling is set down.
                      Titles such as <em>In my loneliest hours</em> (Insa Gallery, 2024) and the
                      〈Dream Drawing〉 series suggest a practice attentive to solitude, reverie,
                      and the quiet hours when the boundary between self and shadow grows thin.
                    </p>
                    <p>
                      Her exhibition history reaches beyond Korea: she showed at FOCUS ART FAIR at
                      the Carrousel du Louvre in Paris (2022) and at ASYAAF at the Hongik University
                      Museum of Modern Art (2022), alongside curated exhibitions including 〈A
                      Finding Persona〉 (Gallery Unplugged, 2024), 〈Outside the Figure〉 (Kimbosung
                      Museum, 2022), and the 띠그림전 at the Icheon Municipal Museum (2025).
                    </p>
                    <p>
                      In 2023 she was selected as one of ten artists for the H-EAA National Young
                      Artists Art Competition exhibition, and received the competition&apos;s{' '}
                      <strong className="font-bold text-charcoal-deep">Excellence Award</strong>;
                      her work entered the collection of the Hoban Cultural Foundation. A mid-career
                      painter, Oa continues to work the same narrow, luminous seam — the place where
                      light and darkness are not opposites but neighbours.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      오아는 활동명으로 작업하는 화가로, 빛과 어둠의 경계에 서린 감정의 결을 회화로
                      옮겨 왔다. 그의 화면은 밝음으로도 어둠으로도 환원되지 않는다. 그것은 경계 그
                      자체를 붙든다 — 얼굴이 어둠에서 떠오르거나 다시 그 안으로 물러나는, 어둑한 띠.
                    </p>
                    <p>
                      이 감각은 2022년, 같은 해에 열린 두 개의 개인전에서 선명해졌다. 아트스페이스
                      영(서울)의 〈달에서 달에게〉는 초승달을 중심 이미지로 불러 모았다 — 비평은 그
                      초승달을 희망이자 거울, 추억, 그리고 또 다른 자아의 형상으로 읽었다. 같은 해
                      아트로직스페이스의 〈짙은 방〉은 빛이 들지 않는 내부로 한 걸음 더 들어가, 그의
                      이미지가 만들어지고 보이는 공간 그 자체를 호명했다.
                    </p>
                    <p>
                      그의 작업에서 감정은 사건보다{' '}
                      <strong className="font-bold text-charcoal">톤</strong>으로 실린다 — 빛과
                      그림자 사이의 농담(濃淡)이 감정을 내려놓는 문법이 된다. 〈In my loneliest
                      hours〉(인사갤러리, 2024)나 〈몽상 드로잉〉 같은 제목들은 고독과 몽상, 그리고
                      자아와 그림자의 경계가 얇아지는 고요한 시간에 귀 기울이는 작업을 짐작케 한다.
                    </p>
                    <p>
                      그의 전시 이력은 한국 바깥으로도 이어진다. 파리 카루젤 뒤 루브르의 FOCUS ART
                      FAIR(2022)와 홍익대학교 현대미술관의 ASYAAF(2022)에 참여했고, 〈A Finding
                      Persona〉(갤러리 언플러그드, 2024), 〈형상의 바깥〉(금보성미술관, 2022),
                      이천시립미술관 띠그림전(2025) 등 다수의 기획전에 함께했다.
                    </p>
                    <p>
                      2023년에는 H-EAA 전국청년작가 미술공모전 선정작가 10인에 들어 출품작을
                      선보였고, 같은 공모전에서{' '}
                      <strong className="font-bold text-charcoal-deep">우수상</strong>을 수상했다.
                      작품은 호반 문화재단에 소장되어 있다. 중견의 자리에서, 오아는 여전히 같은 좁고
                      환한 이음매를 작업한다 — 빛과 어둠이 대립이 아니라 이웃인 자리를.
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
                        {isEnglish ? 'The boundary of light and dark' : '빛과 어둠의 경계'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Her canvases hold the threshold itself — the dim band where a face emerges from shadow, or recedes into it.'
                          : '밝음으로도 어둠으로도 환원되지 않는 경계 자체. 얼굴이 어둠에서 떠오르고 다시 물러나는 어둑한 띠를 붙든다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The crescent as another self' : '또 다른 자아로서의 초승달'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'In 〈From the Moon to the Moon〉 (2022) the crescent moon recurs as a figure of hope, of the mirror, of memory, and of another self.'
                          : '〈달에서 달에게〉(2022)에서 초승달은 희망이자 거울, 추억, 그리고 또 다른 자아의 형상으로 거듭 돌아온다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Solitude and reverie' : '고독과 몽상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Titles like 〈In my loneliest hours〉 and the 〈Dream Drawing〉 series attend to the quiet hours when the line between self and shadow grows thin.'
                          : '〈In my loneliest hours〉, 〈몽상 드로잉〉 같은 제목들은 자아와 그림자의 경계가 얇아지는 고요한 시간에 귀 기울인다.'}
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
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo exhibition 〈From the Moon to the Moon〉, Art Space Young, Seoul; 〈Dark Room〉, Art Logic Space, Seoul.'
                        : '첫 개인전 〈달에서 달에게〉(아트스페이스 영, 서울); 〈짙은 방〉(아트로직스페이스, 서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'FOCUS ART FAIR, Carrousel du Louvre, Paris; ASYAAF, Hongik University Museum of Modern Art; 〈Outside the Figure〉, Kimbosung Museum; 〈Encountering a Dream〉, Gallery Ilho.'
                        : 'FOCUS ART FAIR(파리 카루젤 뒤 루브르); ASYAAF(홍익대 현대미술관); 〈형상의 바깥〉(금보성미술관); 〈꿈과 마주치다〉(갤러리일호).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Selected as one of ten artists, H-EAA National Young Artists Art Competition (Art Space Hohwa); awarded the Excellence Award (Hoban Cultural Foundation).'
                        : 'H-EAA 전국청년작가 미술공모전 선정작가 10인전(아트스페이스 호화); 우수상 수상(호반문화재단).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Seeping In〉, Gallery Ilho; 〈The Shape of Play〉, Ahting Gallery; BAMA, BEXCO, Busan; 〈Reverie of Hanyang〉, Gallery 1707.'
                        : '〈스며들다〉(갤러리일호); 〈유희의 모양〉(아띵갤러리); BAMA(BEXCO 부산); 〈몽상 드 한양〉(갤러리1707).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈In my loneliest hours〉, Insa Gallery; 〈A Finding Persona〉, Gallery Unplugged; 〈Dream Drawing〉, Gallery 1707.'
                        : '〈In my loneliest hours〉(인사갤러리); 〈A Finding Persona〉(갤러리 언플러그드); 〈몽상 드로잉〉(갤러리 1707).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibition 띠그림전, Icheon Municipal Museum of Art.'
                        : '띠그림전(이천시립미술관) 참여.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & awards' : '주요 전시 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo: 〈From the Moon to the Moon〉, Art Space Young, Seoul (2022); 〈Dark Room〉, Art Logic Space, Seoul (2022)'
                        : '개인전: 〈달에서 달에게〉(아트스페이스 영, 서울, 2022); 〈짙은 방〉(아트로직스페이스, 서울, 2022)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Art fairs: FOCUS ART FAIR, Carrousel du Louvre, Paris (2022); ASYAAF, Hongik University Museum of Modern Art (2022); BAMA, BEXCO, Busan (2023)'
                        : '아트페어: FOCUS ART FAIR(파리 카루젤 뒤 루브르, 2022); ASYAAF(홍익대 현대미술관, 2022); BAMA(BEXCO 부산, 2023)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group: 〈A Finding Persona〉, Gallery Unplugged (2024); 〈In my loneliest hours〉, Insa Gallery (2024); 〈Outside the Figure〉, Kimbosung Museum (2022); 띠그림전, Icheon Municipal Museum (2025)'
                        : '단체전: 〈A Finding Persona〉(갤러리 언플러그드, 2024); 〈In my loneliest hours〉(인사갤러리, 2024); 〈형상의 바깥〉(금보성미술관, 2022); 띠그림전(이천시립미술관, 2025)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Award & collection: Excellence Award, 2023 H-EAA National Young Artists Art Competition; collection of the Hoban Cultural Foundation'
                        : '수상·소장: 2023 H-EAA 전국청년작가 미술공모전 우수상; 호반 문화재단 소장'}
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
                  <span className="text-charcoal-deep">on light, the moon, and the dim room</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">빛과 달, 그리고 짙은 방에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 경계라는 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The threshold — light and dark as neighbours'
                    : '경계라는 자리 — 이웃이 된 빛과 어둠'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Most painting decides, sooner or later, whether a thing is in the light or
                        in the dark. Oa&apos;s work resists that decision. Her surfaces are
                        organised around the band where the two meet — the narrow zone in which a
                        form is neither fully revealed nor fully withheld. It is a difficult place
                        to hold, because it has no fixed edge; it must be felt rather than drawn.
                      </p>
                      <p>
                        This is why tone, rather than line, carries the weight of her images. A
                        face, a body, a moon: each is set down not as a contour to be filled but as
                        a gradation to be tuned. The emotion of a picture arrives through how slowly
                        or sharply the light gives way to shadow. In this grammar, darkness is not
                        the absence of light but its near neighbour — the two are read together, as
                        a single continuous tissue of feeling.
                      </p>
                      <p>
                        To paint the boundary is also to refuse easy resolution. Her canvases keep
                        the viewer at the threshold, in the unresolved moment before a figure
                        settles into clarity or dissolves into the dark. That suspension is the
                        subject.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        대부분의 회화는 머잖아 결정한다. 어떤 것이 빛 속에 있는지, 어둠 속에 있는지.
                        오아의 작업은 그 결정을 거부한다. 그의 화면은 둘이 만나는 띠를 중심으로
                        조직된다 — 형상이 완전히 드러나지도, 완전히 감춰지지도 않는 좁은 영역.
                        그곳은 붙들기 어려운 자리다. 고정된 가장자리가 없기 때문이다. 그것은
                        그려지기보다 느껴져야 한다.
                      </p>
                      <p>
                        그래서 그의 이미지의 무게를 지는 것은 선이 아니라 톤이다. 얼굴, 몸, 달 —
                        하나하나는 채워야 할 윤곽이 아니라 조율해야 할 농담으로 내려놓인다. 그림의
                        감정은 빛이 어둠에게 자리를 내어주는 속도가 느린지 가파른지를 통해 도착한다.
                        이 문법에서 어둠은 빛의 부재가 아니라 빛의 가까운 이웃이다 — 둘은 함께,
                        하나의 연속된 감정의 직물로 읽힌다.
                      </p>
                      <p>
                        경계를 그린다는 것은 손쉬운 해결을 거절하는 일이기도 하다. 그의 화면은 보는
                        이를 문턱에 세워 둔다. 형상이 명료함으로 가라앉거나 어둠으로 풀어지기
                        직전의, 해소되지 않은 순간에. 그 유예가 곧 주제다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 달에서 달에게 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈From the Moon to the Moon〉 — the crescent as mirror'
                    : '〈달에서 달에게〉 — 거울이 된 초승달'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Oa&apos;s first solo exhibition, 〈From the Moon to the Moon〉 (Art Space
                        Young, Seoul, 2022), took the crescent moon as its through-line. The
                        crescent is a fitting emblem for her concerns: it is itself a boundary form
                        — a sliver of light defined entirely by the dark it edges, a body
                        half-present and half-withheld.
                      </p>
                      <p>
                        Critics reading the show described the crescent recurring as several things
                        at once: a figure of hope, a mirror, a vessel of memory, and another self.
                        The title&apos;s grammar — <em>from the moon, to the moon</em> — already
                        suggests address and reflection, one self speaking across distance to
                        another. The moon does not merely appear in the paintings; it functions as
                        the surface on which the self is glimpsed and returned.
                      </p>
                      <p>
                        Read this way, the exhibition is less a series of lunar landscapes than a
                        set of self-portraits in displacement — the artist finding her own face in
                        the thin, returning light of a crescent. The work that earned recognition at
                        the 2023 H-EAA competition extends the same enquiry: how a feeling can be
                        set down through light alone.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        오아의 첫 개인전 〈달에서 달에게〉(아트스페이스 영, 서울, 2022)는 초승달을
                        관통선으로 삼았다. 초승달은 그의 관심에 꼭 맞는 상징이다 — 그것 자체가
                        경계의 형상이기 때문이다. 자신이 가장자리에 두른 어둠에 의해 온전히 규정되는
                        한 줄기 빛, 절반은 나타나고 절반은 감춰진 몸.
                      </p>
                      <p>
                        전시를 읽은 비평은 그 초승달이 여러 가지로 동시에 되돌아온다고 적었다 —
                        희망의 형상, 거울, 추억의 그릇, 그리고 또 다른 자아. <em>달에서, 달에게</em>{' '}
                        라는 제목의 문법은 이미 부름과 비춤을 품는다. 거리를 사이에 둔 한 자아가
                        다른 자아에게 건네는 말. 달은 그림 안에 단지 등장하는 것이 아니라, 자아가
                        언뜻 비치고 되돌아오는 표면으로 작동한다.
                      </p>
                      <p>
                        이렇게 읽으면 이 전시는 달 풍경의 연작이라기보다, 자리를 옮긴 자화상의
                        묶음이다 — 작가가 초승달의 얇게 되돌아오는 빛 속에서 자신의 얼굴을 찾아내는.
                        2023년 H-EAA 공모전에서 인정받은 작업은 같은 물음을 잇는다: 감정이 어떻게
                        오직 빛만으로 내려놓일 수 있는가.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 짙은 방, 외로운 시간 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈Dark Room〉 and the loneliest hours — interior weather'
                    : '〈짙은 방〉과 외로운 시간 — 내부의 날씨'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        If 〈From the Moon to the Moon〉 looked outward to a returning light, the
                        second 2022 solo, 〈Dark Room〉 (Art Logic Space), turned inward. The title
                        names the unlit interior — the space in which the images are both made and
                        contemplated, where seeing depends on the eye adjusting to dimness rather
                        than on the scene being lit.
                      </p>
                      <p>
                        This interior register carries through her later group showings. 〈In my
                        loneliest hours〉 (Insa Gallery, 2024) names a time of day, or a state of
                        being, rather than a place; the 〈Dream Drawing〉 and 〈Reverie〉 works move
                        in the same low light, where reverie and solitude soften the line between
                        the seen and the imagined. Across these titles, the dark is not menacing but
                        intimate — a room one knows by feel.
                      </p>
                      <p>
                        Taken together, the two sides of her practice — the outward crescent and the
                        inward room — describe a single sensibility: an art tuned to the dim hours,
                        in which emotion is read in the gradations of light and the quiet that
                        gathers at the edge of darkness.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        〈달에서 달에게〉가 되돌아오는 빛을 향해 바깥을 보았다면, 2022년의 두 번째
                        개인전 〈짙은 방〉(아트로직스페이스)은 안으로 돌아섰다. 제목은 빛이 들지
                        않는 내부를 호명한다 — 이미지가 만들어지고 또 사색되는 공간, 장면이
                        밝혀지기보다 눈이 어둑함에 적응하면서 보임이 성립하는 자리.
                      </p>
                      <p>
                        이 내부의 음역은 이후의 단체전으로도 이어진다. 〈In my loneliest hours〉
                        (인사갤러리, 2024)는 장소가 아니라 하루의 한 시각, 혹은 한 상태를 이름
                        짓는다. 〈몽상 드로잉〉과 〈몽상〉 연작은 같은 낮은 빛 속을 움직인다. 몽상과
                        고독이 본 것과 상상한 것 사이의 선을 누그러뜨리는 곳. 이 제목들에서 어둠은
                        위협이 아니라 친밀함이다 — 감각으로 아는 방.
                      </p>
                      <p>
                        함께 놓고 보면, 그의 작업의 두 면 — 바깥의 초승달과 안의 방 — 은 하나의
                        감각을 그린다. 어둑한 시간에 맞춰진 예술. 감정이 빛의 농담과, 어둠의
                        가장자리에 고이는 고요 속에서 읽히는.
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
                      From the crescent of her first solo show to the dim interiors of her recent
                      work, Oa has pursued a single seam: the place where light and darkness are not
                      opposites but neighbours, and where a feeling can be set down through tone
                      alone. She joins this campaign not as a subject of its cause but as a fellow
                      artist in solidarity — so that the proceeds of her work might become a
                      low-interest lifeline for artists facing financial exclusion today.
                    </>
                  ) : (
                    <>
                      첫 개인전의 초승달에서 최근작의 어둑한 내부에 이르기까지, 오아는 하나의
                      이음매를 추구해 왔다 — 빛과 어둠이 대립이 아니라 이웃인 자리, 감정이 오직
                      톤만으로 내려놓이는 자리. 그는 씨앗페에 이 캠페인의 대상으로서가 아니라, 동료
                      예술인과의 연대자로서 함께한다 — 작품 판매 수익이 오늘 금융 차별을 겪는
                      예술인에게 저금리의 버팀목이 될 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Oa</span>
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
                    Oa joined this campaign in solidarity with fellow artists. Every work sold flows
                    directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    오아 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={OA_PATH}
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
