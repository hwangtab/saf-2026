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

// 강석태 feature는 작가 페이지(/artworks/artist/강석태)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KANG_SEOKTAE_PATH = `/artworks/artist/${encodeURIComponent('강석태')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKangSeoktaeArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '강석태' ||
    n === 'kang seoktae' ||
    n === 'kang seok-tae' ||
    n.replace(/[\s-]+/g, '') === 'kangseoktae'
  );
};

const PAGE_COPY = {
  ko: {
    title: '강석태 — 마음의 별을 그리는 화가',
    description:
      '강석태. 생텍쥐페리의 『어린왕자』에서 길어 올린 "마음의 별" 모티프를 한국화 기법과 결합해 동화적이고 따뜻한 화면을 만들어온 회화 작가. 추계예술대학교 동양화과 졸업, 다수의 개인전, 국립현대미술관 미술은행 소장. 씨앗페 온라인에서 강석태의 작품을 감상하고 소장하세요.',
    ogDescription:
      '강석태 — 마음의 별을 그리는 화가. 2002년부터 어린왕자의 "별소년"을 자신만의 모티프로 재창조하며 20년 이상 감성과 치유의 회화를 이어온 작가.',
    ogAlt: '강석태 대표 작품',
    twitterTitle: '강석태',
    twitterDescription: '마음속에 별 하나, 그 별을 그리다 — 회화 작가 강석태',
    keywords: '강석태 화가, 강석태 어린왕자, 별소년 그림, 한국화 동양화, 마음의 별, 씨앗페 온라인',
  },
  en: {
    title: 'Kang Seoktae — A Painter of the Star in the Heart',
    description:
      "Selected works by Kang Seoktae, a painter who draws from Saint-Exupéry's The Little Prince to create warm, fairytale-like paintings on Korean paper. Graduating from Chugye University for the Arts and holding numerous solo exhibitions, his works are collected in the MMCA Art Bank. View and collect his works at SAF Online.",
    ogDescription:
      'Kang Seoktae — a painter of the star in the heart. Since 2002, he has consistently reimagined the Little Prince\'s "star boy" as his own motif — more than twenty years of painting as emotional healing.',
    ogAlt: 'Kang Seoktae — featured work',
    twitterTitle: 'Kang Seoktae',
    twitterDescription: 'A star within the heart, and the painting of it — Kang Seoktae, painter',
    keywords:
      'Kang Seoktae artist, Little Prince painting, Korean ink painting, star in the heart, dongyanghwa',
  },
} as const;

export async function buildKangSeoktaeMetadata({
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
  const pageUrl = buildLocaleUrl(KANG_SEOKTAE_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('강석태');
  const artwork = allArtworks.find((a) => isKangSeoktaeArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kang Seoktae`
      : `${artwork.title} — 강석태`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KANG_SEOKTAE_PATH, locale, true),
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

export default async function KangSeoktaeFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KANG_SEOKTAE_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('강석태');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKangSeoktaeArtist(artwork.artist)
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
    { name: isEnglish ? 'Kang Seoktae' : '강석태', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KANG_SEOKTAE_PATH}#person-kang-seoktae`,
    name: isEnglish ? 'Kang Seoktae' : '강석태',
    alternateName: isEnglish ? '강석태' : 'Kang Seoktae',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Kang Seoktae is a Korean painter who draws inspiration from Antoine de Saint-Exupéry\'s The Little Prince, creating warm, fairytale-like works on Korean paper using traditional techniques such as baechae (reverse-side colouring) and tukbon (rubbing). Since 2002, he has consistently explored the motif of the "star in the heart" — reimagined as the "star boy" — across more than twenty years of painting.'
      : '강석태는 생텍쥐페리의 『어린왕자』에서 영감을 얻어 배채법과 탁본 방식 등 전통 기법으로 한지에 따뜻하고 동화적인 작품을 만들어온 한국의 회화 작가입니다. 2002년부터 "마음의 별"을 자신만의 "별소년" 모티프로 재창조하며 20년 이상 일관된 작업을 이어오고 있습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chugye University for the Arts, Dept. of Oriental Painting'
          : '추계예술대학교 미술대학 동양화과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Sejong University Graduate School, Oriental Painting'
          : '세종대학교 대학원 미술학과 동양화 전공',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chugye University for the Arts Graduate School, PhD in Cultural Arts'
          : '추계예술대학교 대학원 문화예술학 박사',
      },
    ],
    knowsAbout: ['Painting', 'Korean contemporary art', 'Oriental ink painting', 'Baechaebop'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kang Seoktae — SAF Online' : '강석태 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kang Seoktae from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 강석태 작품들을 소개합니다.',
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
        {/* Hero Section — 마음의 별, 동화적 따뜻함 / charcoal 배경에 별빛 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* Starfield motif — small dot constellations */}
          <div className="absolute top-12 left-16 w-1 h-1 rounded-full bg-white/30" />
          <div className="absolute top-24 left-40 w-1.5 h-1.5 rounded-full bg-white/20" />
          <div className="absolute top-8 right-24 w-1 h-1 rounded-full bg-white/25" />
          <div className="absolute top-32 right-48 w-1 h-1 rounded-full bg-white/20" />
          <div className="absolute top-20 right-12 w-1.5 h-1.5 rounded-full bg-white/15" />
          <div className="absolute bottom-24 left-32 w-1 h-1 rounded-full bg-white/20" />
          <div className="absolute bottom-16 right-36 w-1 h-1 rounded-full bg-white/25" />
          <div className="absolute bottom-32 left-56 w-1.5 h-1.5 rounded-full bg-white/15" />
          {/* Subtle radial glow — warm center */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(255,255,255,0.04),transparent)]" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kang Seoktae' : '강석태'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  A star within the heart,
                  <br />
                  <span className="text-primary-soft">and the painting of it</span>
                </>
              ) : (
                <>
                  마음속에 별 하나,
                  <br />
                  <span className="text-primary-soft">그 별을 그리다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The Little Prince has a star — and so, the painter believes, does every heart.
                  </span>
                  <span className="mt-2 block">
                    A painter who has spent more than twenty years drawing what cannot be seen.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">어린왕자에게는 별이 있다 — 그리고 우리 마음에도.</span>
                  <span className="mt-2 block">
                    보이지 않는 것을 그리는 일을 20년 이상 이어온 화가.
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
                    A conversation with a book —<br />
                    <span className="text-primary-strong">twenty years and still ongoing</span>
                  </>
                ) : (
                  <>
                    한 권의 책과의 대화 —<br />
                    <span className="text-primary-strong">20년, 지금도 현재진행형</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kang Seoktae is a Korean painter who has spent more than twenty years in
                      sustained dialogue with a single book: Antoine de Saint-Exupéry&apos;s{' '}
                      <em>The Little Prince</em>. The conversation began in 2002 and continues to
                      this day. His central motif — the &ldquo;star boy&rdquo; (별소년), a figure he
                      created as his own reinterpretation of the Prince — is not literary
                      illustration but an original artistic language: a way of painting the inner
                      life, that which cannot be touched but is nonetheless real.
                    </p>
                    <p>
                      He graduated from the Department of Oriental Painting at Chugye University for
                      the Arts, completed a master&apos;s in Oriental Painting at Sejong University
                      Graduate School, and holds a doctorate in Cultural Arts from Chugye University
                      for the Arts. He has taught as a visiting professor at Suwon University and as
                      an invited lecturer at Inha University — a practice that integrates theory and
                      creation, confirmed by critics who note the philosophical depth beneath the
                      warm surfaces of his paintings.
                    </p>
                    <p>
                      His primary medium is Korean paper (한지), worked through traditional
                      techniques:{' '}
                      <strong className="font-bold text-charcoal-deep">
                        baechaebop (背彩法, reverse-side colouring)
                      </strong>{' '}
                      — a classical portrait method that builds colour slowly from behind the paper,
                      yielding a natural and luminous surface — and{' '}
                      <strong className="font-bold text-charcoal">tukbon (탁본, rubbing)</strong>,
                      in which texture is transferred by pressing paper to a surface. The
                      transparency and softness of hanji, the artist has noted, is a perfect
                      material correspondent to the pure and gentle quality of the Little Prince.
                    </p>
                    <p>
                      His palette has shifted over the decades in close correspondence with his
                      life. The earliest works from 2002 were rendered in ink alone. He then moved
                      into blue — sky and cloud — before arriving at the warm, flower-filled colour
                      of recent years. The change was inseparable from becoming a father later than
                      his peers: discovering, while drawing alongside his young daughter, that he
                      had quietly begun to paint in her colours.
                    </p>
                    <p>
                      Art critic Lee Jae-eon has written of his work that it expresses inner imagery
                      while achieving a harmonious unity with life. Exhibition curator Kim Mi-hyang
                      observed that &ldquo;the boy&apos;s colour was blue.&rdquo; The warm and
                      hopeful harmony of blues, yellows, and oranges that characterises his
                      paintings works not as decoration but as consolation: the star boy is not a
                      nostalgic figure but a living presence, moving through a world that each
                      viewer may recognise as their own.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      강석태는 한 권의 책과 20년 이상 대화해온 화가다. 생텍쥐페리의 『어린왕자』와의
                      대화는 2002년에 시작되어 지금도 현재진행형이다. 그의 중심 모티프인
                      &lsquo;별소년&rsquo;은 어린왕자를 자신만의 방식으로 재창조한 창작물이다 —
                      문학의 삽화가 아니라, 내면의 삶, 손으로 잡을 수 없지만 분명히 존재하는 것을
                      그리는 하나의 회화 언어.
                    </p>
                    <p>
                      추계예술대학교 미술대학 동양화과를 졸업하고, 세종대학교 대학원 미술학과 동양화
                      전공으로 석사 학위를, 추계예술대학교 대학원에서 문화예술학 박사 학위를
                      취득했다. 수원대학교 객원교수, 인하대학교 초빙교수로 후학을 지도하며 창작과
                      이론을 겸비한 작가로서의 길을 걷고 있다. 미술평론가 이재언은 그의 작업이
                      내면의 심상을 표현하면서도 삶의 조화로운 결합을 이루어낸다고 평했다.
                    </p>
                    <p>
                      그의 주재료는 한지이며, 작업 방식으로는{' '}
                      <strong className="font-bold text-charcoal-deep">배채법(背彩法)</strong> —
                      화면 뒷면에서 색을 천천히 올리는 전통 초상화 기법으로, 자연스럽고 발광하는
                      듯한 색감을 만들어낸다 — 과{' '}
                      <strong className="font-bold text-charcoal">탁본(拓本)</strong> 방식을
                      오랫동안 사용해 왔다. 한지의 투명하고 부드러운 질감이 어린왕자의 순진하고
                      따뜻한 이미지와 완벽하게 어울린다는 것이 작가의 이야기다.
                    </p>
                    <p>
                      색채는 삶의 변화와 함께 진화했다. 2002년 초기 작품은 먹으로만 그려졌다. 이후
                      하늘과 구름을 따라 푸른 계열의 작업을 이어가다가, 최근에는 꽃으로 채워진
                      온화한 색감으로 변했다. 그 변화는 동기들보다 늦게 아빠가 된 경험과 분리되지
                      않는다: 어린 딸과 함께 그림을 그리는 시간 속에서, 자신도 모르는 사이 딸아이의
                      색감이 화폭 위에 스며들었다.
                    </p>
                    <p>
                      전시기획자 김미향은 그의 그림에서 &ldquo;소년의 색은 푸른 색이었다&rdquo;고
                      표현했다. 파란색, 노란색, 주황색이 이루는 따뜻하고 희망적인 색채의 조화는
                      장식이 아니라 위로로 기능한다 — 별소년은 향수 속의 인물이 아니라 지금 이
                      순간에도 살아 움직이는 존재이며, 보는 이 각자가 자신의 이야기로 알아보는
                      누군가이다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* 작업을 관통하는 세 가지 언어 */}
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-xl">
                <h3 className="text-2xl text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-bold font-display text-balance">
                  <span className="w-4 h-4 bg-primary rotate-45" />
                  {isEnglish ? 'Three signatures of the work' : '작업을 관통하는 세 가지 언어'}
                </h3>

                <ul className="space-y-8">
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      1
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The star boy (별소년)' : '별소년'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "The Little Prince reborn as the artist's own original figure — not illustration but invention. The star boy carries the loneliness and hope of the night sky, and serves as a guide back to the pure emotions that adult life tends to bury."
                          : '어린왕자를 작가 자신의 창작 모티프로 재탄생시킨 인물 — 삽화가 아닌 창작. 별소년은 밤하늘의 고독과 희망을 담아내며, 어른의 삶 속에서 잊혀가는 순수한 감정으로 돌아가는 길잡이다.'}
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
                          ? 'Baechaebop and hanji — tradition as warmth'
                          : '배채법과 한지 — 전통이 만드는 온기'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Colour applied from the reverse of the paper builds slowly, from behind — yielding a surface that glows rather than shines. The transparency of hanji and the indirectness of baechaebop are not merely technique but disposition: the warmth here is earned, not declared.'
                          : '종이 뒷면에서 천천히 쌓아 올리는 색은 빛나는 것이 아니라 은은히 발하는 표면을 만든다. 한지의 투명함과 배채법의 우회적인 방식은 단순한 기법이 아니라 태도다: 이 온기는 선언이 아니라 축적으로 얻어진다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Painting as healing' : '치유로서의 그림'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? "His works are collected in children's rehabilitation hospitals, public libraries, and social welfare foundations — not by accident but by intention. The art is a form of care: inviting the viewer to meet the inner child they have not yet lost."
                          : '어린이재활병원, 공공 도서관, 사회복지재단에 그의 작품이 소장된 것은 우연이 아니라 의도다. 그림은 돌봄의 한 형태다: 아직 잃지 않은 내면의 아이와 보는 이를 만나게 하는 초대.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* 작가의 시간 — timeline */}
              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1990s
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Graduates from Chugye University for the Arts, Dept. of Oriental Painting; master's at Sejong University Graduate School."
                        : '추계예술대학교 미술대학 동양화과 졸업; 세종대학교 대학원 미술학과 동양화 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Special Selection (특선), 22nd JoongAng Fine Arts Competition (중앙미술대전).'
                        : '제22회 중앙미술대전 특선.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2002
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins sustained dialogue with The Little Prince — the "star boy" series commences.'
                        : '『어린왕자』와의 대화 시작 — 별소년 연작 개시.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2003
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Young Artist Award, Oriental Painting New Millennium (동양화새천년 청년작가상).'
                        : '동양화새천년 청년작가상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2000s–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Holds solo exhibitions across major Korean galleries; PhD in Cultural Arts, Chugye University for the Arts; teaching at Suwon University and Inha University.'
                        : '국내 주요 갤러리에서 개인전 지속; 추계예술대학교 대학원 문화예술학 박사 취득; 수원대학교 객원교수·인하대학교 초빙교수 역임.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2023
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publishes Speaking to the Little Prince (어린 왕자에게 말을 걸다, Bibito) — a picture essay co-created with his daughter Kang Harin.'
                        : '딸 강하린과 함께 그림 에세이 『어린 왕자에게 말을 걸다』(비비투) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      ongoing
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "numerous solo and group exhibitions; works held in MMCA Art Bank, French Cultural Center in Korea, Korea National University of Arts, Nexon Children's Rehabilitation Hospital, and others."
                        : '다수의 개인전과 기획전 참가; 국립현대미술관 미술은행·주한프랑스문화원·한국예술종합학교·넥슨어린이재활병원 등 소장.'}
                    </span>
                  </li>
                </ol>
              </div>

              {/* 주요 소장처 */}
              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected collections' : '주요 소장처'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'MMCA Art Bank (국립현대미술관 미술은행), French Cultural Center in Korea (주한프랑스문화원), Korea National University of Arts (한국예술종합학교)'
                        : '국립현대미술관 미술은행, 주한프랑스문화원, 한국예술종합학교'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? "Nexon Children's Rehabilitation Hospital (넥슨어린이재활병원), Purme Foundation (푸르메재단), Suncheon Miracle Library (순천기적의 도서관), Yanggu Gongjon Library (양구공존 도서관)"
                        : '넥슨어린이재활병원, 푸르메재단, 순천기적의 도서관, 양구공존 도서관'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Namhae County Office (남해군청), Changwon Hanmaeum Hospital (창원한마음병원)'
                        : '남해군청, 창원한마음병원'}
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
                  <span className="text-charcoal-deep">on the work and the star within</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 안의 별에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 마음의 별 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The star in the heart — what the painting reaches for'
                    : '마음의 별 — 그림이 닿으려는 것'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        In Saint-Exupéry&apos;s telling, the Little Prince lives on a tiny planet
                        with a single rose, and counts the stars as his friends — knowing that
                        somewhere among them, his flower is tended. The stars become bearers of
                        meaning: each one, for someone, is a place of love. Kang Seoktae read this
                        not as a story about a boy in space but as a description of the interior
                        life — the part of us that clings, invisibly, to something we cannot see and
                        cannot lose.
                      </p>
                      <p>
                        His motif of the &ldquo;star in the heart&rdquo; follows from this reading.
                        It is not a decorative trope but a proposition: that every person carries
                        within them a point of warmth and orientation, something that predates adult
                        complexity and outlasts it. The star boy in his paintings is not a child
                        longing to become an adult, nor an adult longing to become a child again —
                        but a figure who holds both, simultaneously, in the same hand.
                      </p>
                      <p>
                        Art critic Lee Jae-eon has observed that his paintings achieve an inner
                        world while maintaining harmony with life — an observation that points to
                        the specific difficulty of Kang&apos;s project. Warmth in painting can
                        easily become sentimentality, and sentimentality closes the viewer off. His
                        paintings remain open because the warmth is hard-won: built from behind the
                        paper, layered slowly, never announced.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        생텍쥐페리의 이야기에서 어린왕자는 작은 별에 살며 장미 한 송이를 돌보고,
                        별들을 친구로 헤아린다 — 저 어딘가의 별에서 자신의 꽃이 보살핌을 받고 있음을
                        안다. 별은 의미의 담지자가 된다: 누군가에게 있어 각각의 별은 사랑이 있는
                        장소다. 강석태는 이것을 우주를 여행하는 소년의 이야기로 읽지 않았다. 내면의
                        삶에 대한 이야기로 읽었다 — 볼 수 없고 잃을 수 없는 무언가에, 보이지 않게
                        매달려 있는 우리 안의 부분.
                      </p>
                      <p>
                        &lsquo;마음의 별&rsquo;이라는 모티프는 이 독서에서 나온다. 장식적 표현이
                        아니라 하나의 명제다: 모든 사람은 어른의 복잡함 이전부터 존재하고 그것을
                        넘어서도 남는, 온기와 방향의 한 점을 안에 품고 있다는 것. 그의 그림에서
                        별소년은 어른이 되고 싶은 아이도, 다시 아이가 되고 싶은 어른도 아니다 —
                        양쪽을 동시에 한 손에 쥔 존재다.
                      </p>
                      <p>
                        미술평론가 이재언은 그의 그림이 내면의 심상을 표현하면서도 삶과의 조화로운
                        결합을 이루어낸다고 했다 — 강석태 작업의 핵심 어려움을 정확히 짚는 말이다.
                        그림에서의 온기는 쉽게 감상(感傷)이 되고, 감상은 보는 이를 닫아버린다. 그의
                        그림이 열려 있는 것은 온기가 힘겹게 얻어진 것이기 때문이다: 종이 뒷면에서
                        천천히, 겹겹이 쌓아, 결코 선언하지 않고 만들어진 것.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 어린왕자, 잃어버린 동심 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The Little Prince and the childhood we did not quite lose'
                    : '어린왕자와 완전히 잃지 않은 동심'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        The Little Prince is a book that reads differently at every age. As a child,
                        it is a fairytale. As an adult, it is a mirror. Kang Seoktae has described
                        how, on re-reading it, memories surface involuntarily — a sensation he calls
                        &ldquo;magical.&rdquo; What strikes him is not the narrative but this
                        mnemonic property: the book does not only tell a story, it retrieves
                        something the reader had stored away without knowing it.
                      </p>
                      <p>
                        His painting extends this property into visual form. The star boy is not
                        illustrated from the text; he is built from feeling — specifically, from the
                        desire to &ldquo;meet the happy boy inside oneself&rdquo; when the
                        accumulation of adult life — resentment, negative emotion, ordinary
                        exhaustion — has covered it over. This is not escapism but an act of
                        interior archaeology: the careful recovery of what was always there.
                      </p>
                      <p>
                        This is also why the colour has shifted. The early ink-only paintings were
                        formal and introspective. The movement through blues toward warm flower
                        tones tracks the artist&apos;s own passage through experience: marriage,
                        parenthood, drawing alongside a child who had not yet learned to suppress
                        colour. In that sense, the paintings are not illustrations of a philosophy
                        but documents of a life in which the philosophy was lived.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        『어린왕자』는 읽는 나이마다 다르게 읽히는 책이다. 아이에게는 동화.
                        어른에게는 거울. 강석태는 이 책을 다시 읽을 때마다 기억 속의 감정이 스치는
                        경험에 대해 이야기한다 — 자신이 &ldquo;마법 같다&rdquo;고 표현한 감각이다.
                        그를 사로잡는 것은 서사가 아니라 이 기억 환기의 속성이다: 책이 이야기를
                        들려주는 것이 아니라, 독자가 자신도 모르게 저장해두었던 무언가를 꺼내준다는
                        것.
                      </p>
                      <p>
                        그의 그림은 이 속성을 시각적 형태로 연장한다. 별소년은 텍스트를 삽화로 옮긴
                        것이 아니라 감정으로 구성된 존재다 — 구체적으로는, 원망과 부정적 감정,
                        일상적 소진이 덮어버린 것들 아래에서 &lsquo;내 안의 행복한 소년&rsquo;을
                        만나고 싶은 욕구에서 구성된다. 탈출이 아니라 내면 고고학의 행위다: 언제나
                        거기 있었던 것을 조심스럽게 복원하는 일.
                      </p>
                      <p>
                        그것이 색채가 변화한 이유이기도 하다. 초기 먹 작업은 형식적이고
                        내성적이었다. 푸른 계열에서 따뜻한 꽃빛 색감으로의 이동은 작가 자신의 경험 —
                        결혼, 부모됨, 아직 색감을 억누르는 법을 배우지 않은 아이와 함께 그림을
                        그리는 시간 — 을 기록한다. 그 의미에서 이 그림들은 철학의 삽화가 아니라 그
                        철학이 살아진 삶의 기록이다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 전통 기법과 현대의 언어 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Traditional technique as contemporary language — twenty years of persistence'
                    : '전통 기법, 현대의 언어 — 20년의 지속'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Korean ink painting (동양화) carries with it the weight of a long tradition
                        — and, in contemporary practice, the challenge of making that tradition
                        speak to the present. Kang Seoktae&apos;s response has been neither to
                        abandon the tradition nor to use it as pastiche, but to find within it the
                        technical means for a very contemporary subject: emotional interiority.
                      </p>
                      <p>
                        Baechaebop — the classical technique of applying colour from the reverse of
                        the paper — produces a quality impossible to replicate by direct
                        application: a softness, a glow, a sense that the colour is emerging from
                        within rather than laid on top. This is the technical correlate of what the
                        paintings are about. The star is not placed in the sky; it seems to have
                        always been there, becoming visible. The boy is not illustrated; he seems to
                        be remembered.
                      </p>
                      <p>
                        Twenty years of sustained practice with a single subject is unusual in any
                        context. It is especially unusual within the contemporary art world, which
                        tends to reward novelty and range. Kang Seoktae has chosen depth over
                        breadth: the same encounter, the same motif, the same question — approached
                        each time from a slightly different angle, with a slightly different
                        palette, and found to contain, each time, something further. He joins SAF
                        not as a subject of its cause but as a fellow artist in solidarity — so that
                        those who come after might work in a world less bounded by financial
                        exclusion, and so that depth, too, might be possible.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        동양화는 긴 전통의 무게를 짊어진다 — 그리고 현대 작업에서는 그 전통을 현재에
                        말걸게 하는 도전도 함께 짊어진다. 강석태의 응답은 전통을 버리지도 않고,
                        그것을 모사하지도 않는 방식이었다: 전통 안에서 아주 현대적인 주제, 즉 감정의
                        내면성을 위한 기술적 수단을 찾아내는 것.
                      </p>
                      <p>
                        배채법 — 종이 뒷면에서 색을 올리는 전통 기법 — 은 직접 도포로는 재현할 수
                        없는 질감을 만든다: 부드러움, 발광, 색이 위에 얹힌 것이 아니라 안에서
                        떠오르는 듯한 느낌. 이것이 그림이 말하려는 것의 기술적 대응물이다. 별은
                        하늘에 놓이지 않는다; 언제나 거기 있었던 것이 보이기 시작하는 것처럼
                        느껴진다. 소년은 그려지지 않는다; 기억되는 것처럼 느껴진다.
                      </p>
                      <p>
                        단일 주제로 20년 이상 지속하는 작업은 어느 맥락에서도 드문 일이다. 새로움과
                        범위를 보상하는 현대 미술계에서는 특히 그렇다. 강석태는 넓이 대신 깊이를
                        선택했다: 같은 만남, 같은 모티프, 같은 물음 — 매번 조금 다른 각도로, 조금
                        다른 색감으로 접근하며, 매번 더 깊은 무언가를 발견한다. 그는 씨앗페에 이
                        캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음
                        세대의 예술인들이 금융 배제의 벽 없이 일할 수 있도록, 깊이 또한 가능할 수
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
                      &ldquo;It seems to me,&rdquo; the artist has said, &ldquo;that inside all of
                      us, there lives a Little Prince. We have all become adults now — but everyone
                      was once a child.&rdquo; His paintings do not argue this; they simply make it
                      available. Twenty years on, the star boy is still travelling.
                    </>
                  ) : (
                    <>
                      작가는 이렇게 말한다: &ldquo;우리 모두의 마음속엔 하나씩의 어린왕자가 살고
                      있는 것 같습니다. 지금은 모두 어른이 되었지만, 누구나 한 번씩은
                      어린아이였지요.&rdquo; 그의 그림은 이것을 주장하지 않는다; 다만 가능하게 한다.
                      20년이 흘렀고, 별소년은 여전히 여행 중이다.
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
                GALLERY
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kang Seoktae</span>
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
                    Kang Seoktae joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    강석태 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KANG_SEOKTAE_PATH}
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
