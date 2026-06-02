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

// 작가 feature는 작가 페이지(/artworks/artist/박성완)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const PARK_SEONGWAN_PATH = `/artworks/artist/${encodeURIComponent('박성완')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isParkSeongwanArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '박성완' ||
    n === 'park seongwan' ||
    n === 'park seong-wan' ||
    n.replace(/[\s-]+/g, '') === 'parkseongwan'
  );
};

const PAGE_COPY = {
  ko: {
    title: '박성완 — 이 땅의 풍경, 이웃의 얼굴',
    description:
      '광주·전남을 기반으로 활동하는 회화 작가 박성완. 전남대학교 예술대학 미술학과를 졸업하고 동 대학원에서 서양화를 전공한 그는, 굵고 힘 있는 필치와 생생한 색채로 지역의 일상과 풍경, 동시대 사람들의 정서와 기억을 화면에 새겨왔다. 씨앗페 온라인에서 박성완의 작품을 만나보세요.',
    ogDescription:
      '광주·전남의 삶과 풍경을 그리는 회화 작가 박성완. 굵은 필치와 생생한 색채로 평범한 일상과 공동체의 기억을 화면에 새긴다.',
    ogAlt: '박성완 대표 작품',
    twitterTitle: '박성완',
    twitterDescription: '이 땅의 풍경, 이웃의 얼굴 — 광주·전남 기반 회화 작가 박성완',
    keywords:
      '박성완 화가, 박성완 회화, Park Seongwan 작가, 전남대학교 미술, 광주 현대미술, 씨앗페 온라인',
  },
  en: {
    title: 'Park Seongwan — The Landscape of This Land, the Faces of Its People',
    description:
      'Selected works by Park Seongwan, a painter based in Gwangju and South Jeolla Province. A graduate of the Department of Fine Arts at Chonnam National University who completed his MFA in Western Painting at the same institution, he has painted regional life and landscape — the emotion and memory of everyday people — with bold brushwork and vivid colour. View his works at SAF Online.',
    ogDescription:
      'Park Seongwan — a painter of regional life and landscape. Bold brushwork and vivid colour carry the everyday scenes and communal memory of Gwangju and South Jeolla.',
    ogAlt: 'Park Seongwan — featured work',
    twitterTitle: 'Park Seongwan',
    twitterDescription:
      'The landscape of this land, the faces of its people — Park Seongwan, painter of Gwangju and South Jeolla',
    keywords:
      'Park Seongwan painter, Korean regional painting, Gwangju contemporary art, Chonnam National University art, South Jeolla landscape painting',
  },
} as const;

export async function buildParkSeongwanMetadata({
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
  const pageUrl = buildLocaleUrl(PARK_SEONGWAN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('박성완');
  const artwork = allArtworks.find((a) => isParkSeongwanArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Park Seongwan`
      : `${artwork.title} — 박성완`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(PARK_SEONGWAN_PATH, locale, true),
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

export default async function ParkSeongwanFeature({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(PARK_SEONGWAN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('박성완');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isParkSeongwanArtist(artwork.artist)
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
    { name: isEnglish ? 'Park Seongwan' : '박성완', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${PARK_SEONGWAN_PATH}#person-park-seongwan`,
    name: isEnglish ? 'Park Seongwan' : '박성완',
    alternateName: isEnglish ? '박성완' : 'Park Seongwan',
    jobTitle: isEnglish ? 'Painter' : '화가',
    description: isEnglish
      ? 'Park Seongwan is a Korean painter based in Gwangju and South Jeolla Province. He graduated from the Department of Fine Arts at Chonnam National University and completed his MFA in Western Painting at the same institution. Working with bold brushwork and vivid colour, he paints the landscapes, everyday life, and communal memory of his region — drawing out the sensibility and shared history of contemporary people.'
      : '박성완은 광주와 전라남도를 기반으로 활동하는 회화 작가입니다. 전남대학교 예술대학 미술학과를 졸업하고 동 대학원에서 서양화를 전공했습니다. 굵고 힘 있는 필치와 생생한 색채로 지역의 풍경과 일상, 공동체의 기억을 화면에 새기며, 동시대를 살아가는 사람들의 정서와 역사적 감각을 그림 안에 담아왔습니다.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chonnam National University, Dept. of Fine Arts (BFA)'
          : '전남대학교 예술대학 미술학과 (학사)',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Chonnam National University, Graduate School of Fine Arts — Western Painting (MFA)'
          : '전남대학교 대학원 미술학과 서양화 전공 (석사)',
      },
    ],
    knowsAbout: [
      'Painting',
      'Landscape painting',
      'Korean contemporary painting',
      'Regional community art',
    ],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    workLocation: {
      '@type': 'Place',
      name: isEnglish ? 'Gwangju, South Korea' : '광주광역시',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Park Seongwan — SAF Online' : '박성완 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Park Seongwan from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 박성완 작품들을 소개합니다.',
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
        {/* Hero Section — 광주·전남 풍경과 대지의 색채 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 대지·지평선·풍경 모티프 — 수평의 두꺼운 선들 */}
          <div
            className="absolute bottom-24 left-0 right-0 h-[2px] bg-white/8"
            aria-hidden="true"
          />
          <div className="absolute bottom-20 left-0 right-0 h-px bg-white/5" aria-hidden="true" />
          <div className="absolute top-16 left-8 w-20 h-[3px] bg-white/10" aria-hidden="true" />
          <div className="absolute top-28 left-16 w-12 h-[2px] bg-primary/20" aria-hidden="true" />
          <div
            className="absolute bottom-32 right-10 w-24 h-[3px] bg-white/10"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-40 right-20 w-16 h-[2px] bg-primary/15"
            aria-hidden="true"
          />
          <div className="absolute top-1/3 left-6 w-[2px] h-10 bg-white/10" aria-hidden="true" />
          <div className="absolute top-1/2 right-8 w-[2px] h-14 bg-white/8" aria-hidden="true" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Park Seongwan' : '박성완'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The landscape of this land,
                  <br />
                  <span className="text-primary-soft">the faces of its people</span>
                </>
              ) : (
                <>
                  이 땅의 풍경,
                  <br />
                  <span className="text-primary-soft">이웃의 얼굴</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A painter who has spent his career looking at regional life in Gwangju and South
                    Jeolla.
                  </span>
                  <span className="mt-2 block">
                    Bold brushwork. Vivid colour. The emotion and memory of ordinary people.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    광주와 전라남도의 일상을 바라보며 화업을 이어온 회화 작가.
                  </span>
                  <span className="mt-2 block">
                    굵은 필치, 생생한 색채, 평범한 사람들의 정서와 기억.
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
                    Painting the region —<br />
                    <span className="text-primary-strong">
                      the everyday and its communal memory
                    </span>
                  </>
                ) : (
                  <>
                    지역을 그린다 —<br />
                    <span className="text-primary-strong">일상과 공동체의 기억</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Park Seongwan built the foundation of his practice at Chonnam National
                      University, where he completed a BFA in Fine Arts and then an MFA
                      concentrating in Western Painting. That training gave him a rigorous grounding
                      in the discipline of painting — in how to handle colour, how to load and drive
                      a brush, how to make a surface carry weight.
                    </p>
                    <p>
                      He has remained in the region ever since. Based in Gwangju and South Jeolla
                      Province, he has spent his career looking at the places and people around him
                      — the ordinary landscapes, the faces of neighbours and contemporaries, the
                      spaces that are being built, changed, or lost. His paintings are characterised
                      by{' '}
                      <strong className="font-bold text-charcoal-deep">
                        bold, forceful brushwork and vivid colour
                      </strong>
                      : marks that carry energy and directness, surfaces that are immediate and
                      alive.
                    </p>
                    <p>
                      But the work is not only about looking. In the everyday scenes Park Seongwan
                      paints — the construction sites, the streets, the faces met in squares and
                      markets — he draws out what lies beneath: the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        sensibility and memory of the community
                      </strong>
                      , the historical consciousness of people living through their own time. His
                      practice has been described in connection with the Gwangju Biennale&apos;s
                      regional programme as focusing on revealing &ldquo;our stories&rdquo; — the
                      shared life that belongs to a particular place and its people.
                    </p>
                    <p>
                      Across more than two decades of solo and group exhibitions — in Gwangju,
                      Damyang, Seoul, Daegu, and further afield in Malaysia, Thailand, and the
                      Philippines — Park Seongwan has steadily deepened a painterly language that is
                      rooted in place, attentive to time, and generous to the people it depicts. His
                      residency at Mali Home in Penang (2012) and subsequent international group
                      shows extended his practice beyond the region without severing its roots.
                    </p>
                    <p>
                      Most recently, his 2026 solo exhibition <em>Spring Gwangju, Autumn Daegu</em>{' '}
                      (Mon Gallery, Daegu) and his 2024 exhibition{' '}
                      <em>People Met at Candlelight Square</em> (Gallery Saenggaksangja, Gwangju)
                      demonstrate a practice in which the personal, the political, and the communal
                      are never fully separated — and in which painting remains the medium best
                      suited to holding them together.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      박성완은 전남대학교 예술대학 미술학과에서 학부를 마치고 동 대학원 서양화
                      전공으로 석사 과정을 이수하며 작업의 기반을 다졌다. 그 훈련은 색을 다루는 법,
                      붓을 싣고 움직이는 법, 화면이 무게를 지니게 하는 법을 몸으로 익히는
                      과정이었다.
                    </p>
                    <p>
                      그는 이후 줄곧 이 지역에 머물렀다. 광주와 전라남도를 기반으로, 주변의 장소와
                      사람들을 바라보며 화업을 이어왔다 — 평범한 풍경, 이웃과 동시대인들의 얼굴,
                      지어지거나 바뀌거나 사라져가는 공간들. 그의 회화는{' '}
                      <strong className="font-bold text-charcoal-deep">
                        굵고 힘 있는 필치와 생생한 색채
                      </strong>
                      로 특징지어진다 — 에너지와 직접성을 품은 자국들, 즉각적이고 살아 있는 화면.
                    </p>
                    <p>
                      그러나 작업은 단지 바라보는 것에 머물지 않는다. 공사장, 거리, 광장과 시장에서
                      만난 얼굴들 — 박성완이 그리는 일상의 장면들 속에서, 그는 그 아래 놓인 것을
                      길어 올린다:{' '}
                      <strong className="font-bold text-charcoal-deep">공동체의 정서와 기억</strong>
                      , 자신의 시대를 살아가는 사람들의 역사적 감각. 그의 작업은 광주비엔날레 지역
                      프로그램과 연관되어 &lsquo;우리의 이야기&rsquo;를 드러내는 데 초점을 둔다는
                      평가를 받은 바 있다 — 특정 장소와 그 사람들에게 속하는 공유된 삶.
                    </p>
                    <p>
                      수십 회에 걸친 개인전과 단체전을 통해 — 광주, 담양, 서울, 대구, 그리고
                      말레이시아 페낭, 태국, 필리핀에 이르기까지 — 박성완은 장소에 뿌리를 두고,
                      시간에 귀 기울이며, 묘사하는 사람들에게 너그러운 회화의 언어를 꾸준히 심화해
                      왔다. 2012년 페낭 말리홈 레지던시와 이후의 국제 단체전들은 지역에 뿌리를 잃지
                      않으면서도 작업의 시야를 확장했다.
                    </p>
                    <p>
                      최근의 2026년 개인전 《봄광주가을대구》(몬갤러리, 대구)와 2024년
                      《촛불광장에서 만난 사람들》(갤러리생각상자, 광주)은 개인적인 것과 정치적인
                      것, 공동체적인 것이 결코 완전히 분리되지 않는 실천을 보여준다 — 그리고
                      그것들을 함께 붙드는 매체로서 회화가 여전히 가장 적합함을 증명한다.
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
                        {isEnglish ? 'Regional landscape and everyday life' : '지역의 풍경과 일상'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Gwangju and South Jeolla provide the visual and emotional terrain of his practice — ordinary places and moments re-encountered through forceful, immediate painting.'
                          : '광주와 전라남도는 그의 작업이 펼쳐지는 시각적·정서적 공간이다. 평범한 장소와 순간들을 힘 있고 직접적인 회화로 다시 만난다.'}
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
                          ? "Communal memory and the people's sensibility"
                          : '공동체의 기억과 사람들의 정서'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Beneath the visible surface of landscape and scene, Park Seongwan reaches for shared history and the emotional consciousness of his contemporaries.'
                          : '풍경과 장면의 가시적 표면 아래, 박성완은 공유된 역사와 동시대인들의 정서적 감각을 길어 올린다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Bold brushwork and vivid colour' : '굵은 필치와 생생한 색채'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'His handling of paint is immediate and energetic — marks that carry the weight of the moment, surfaces that are direct and alive rather than smoothed or distanced.'
                          : '물감을 다루는 방식은 직접적이고 에너지 넘친다 — 순간의 무게를 담은 자국, 매끄럽게 다듬어지거나 거리를 둔 것이 아니라 직접적이고 살아 있는 화면.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's timeline" : '작가의 시간'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'BFA, Dept. of Fine Arts, Chonnam National University; MFA in Western Painting, Graduate School, Chonnam National University.'
                        : '전남대학교 예술대학 미술학과 학사; 동 대학원 미술학과 서양화 전공 석사.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Construction Site Picture Diary〉, Asia Culture Maru, Gwangju. Mali Home Residency, Penang, Malaysia. Eodeung Art Festival Grand Prize.'
                        : '《공사장 그림일기》, 아시아문화마루, 광주. 말리홈 레지던시, 페낭, 말레이시아. 어등미술제 대상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2015
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Under Construction〉, Space K, Gwangju; 〈Construction Site Diary〉, Kumho Gallery, Gwangju.'
                        : '《Under Construction》, 스페이스K, 광주; 《공사장 일기》, 금호갤러리, 광주.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016–17
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈RIVERS〉 Asian Contemporary Art Network, Gwangju Museum of Art. 〈Unexpected Everyday〉, Lotte Gallery, Gwangju. 〈From Berlin to Georgetown〉, China House, Penang. Korea-Thailand Contemporary Art Exhibition.'
                        : '《RIVERS》 아시아현대미술연대, 광주시립미술관. 《뜻밖의 일상》, 롯데갤러리, 광주. 《From Berlin to Georgetown》, 차이나하우스, 페낭. 한국-태국 현대미술전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020–21
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Light and the Heart&rsquo;s Hometown〉, Haedong Culture & Art Village, Damyang. 〈5·18 40th Anniversary May Art Festival〉. Honglim Creative Studio residency.'
                        : '《빛 그리고 마음의 고향-일상이상》, 해동문화예술촌, 담양. 《5·18 40주년 오월미술제》. 홍림창작스튜디오 입주작가.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈People Met at Candlelight Square〉, Gallery Saenggaksangja, Gwangju. 〈Interwoven Stories〉, Sakima Art Museum.'
                        : '《촛불광장에서 만난 사람들》, 갤러리생각상자, 광주. 《서로 엮은 이야기》, 사키마미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2026
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Spring Gwangju, Autumn Daegu〉, Mon Gallery, Daegu. 〈Acrylic Smashing〉, Gallery B, Seoul.'
                        : '《봄광주가을대구》, 몬갤러리, 대구. 《망치는 아크릴》, 갤러리B, 서울.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(14,78,207,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected awards & residencies' : '수상 및 레지던시'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2012 Eodeung Art Festival — Grand Prize'
                        : '2012 어등미술제 대상'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2020 Honglim Creative Studio Residency, Gwangju'
                        : '2020 홍림창작스튜디오 입주작가, 광주'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '2012 Mali Home Residency, Penang, Malaysia'
                        : '2012 말리홈 레지던시, 페낭, 말레이시아'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'International group exhibitions in Malaysia, Thailand, and the Philippines; featured in the 8th Gwangju Biennale 〈Man In Bo〉 (2010)'
                        : '말레이시아·태국·필리핀 국제 단체전 참여; 제8회 광주비엔날레 《만인보》 출품 (2010)'}
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
                  <span className="text-charcoal-deep">on the work and its roots</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 뿌리에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 광주·전남의 풍경 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'Gwangju and South Jeolla — the landscape as subject'
                    : '광주·전남의 풍경 — 장소를 소재로'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Seongwan has painted the landscape of the region he inhabits for more
                        than two decades. This is not a choice to stay provincial; it is a choice to
                        look carefully. The streets of Gwangju, the villages of South Jeolla, the
                        construction sites and galleries and squares where people gather — all of
                        these become, under his brush, material as rich and demanding as any.
                      </p>
                      <p>
                        His series of construction-site paintings — shown across multiple
                        exhibitions from 2012 through 2015 — took a subject that is usually
                        invisible in fine art and made it central. The temporary, the unfinished,
                        the zone between one state of a place and another: these were precisely what
                        his bold, energetic brushwork was built to render. The paintings hold the
                        site in its moment of transformation, before the scaffolding comes down and
                        the ordinary resumes.
                      </p>
                      <p>
                        In later work — <em>Landscape Beyond the Wind</em>,{' '}
                        <em>Light and the Heart&rsquo;s Hometown</em> — the landscape becomes more
                        lyrical, more interior. Place is still the subject, but what the painting
                        reaches for is the emotion and memory that settle into a landscape over
                        time: what it feels like to have grown up near these hills, to have passed
                        through these streets, to carry a place inside you.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박성완은 20여 년 넘게 자신이 살아가는 지역의 풍경을 그려왔다. 이것은 지역에
                        머물겠다는 소극적 선택이 아니라, 꼼꼼하게 바라보겠다는 적극적 선택이다.
                        광주의 거리, 전라남도의 마을, 사람들이 모이는 공사장과 갤러리와 광장 — 이
                        모든 것이 그의 붓 아래에서 어느 소재 못지않게 풍부하고 요구가 많은 재료가
                        된다.
                      </p>
                      <p>
                        2012년부터 2015년에 걸쳐 여러 전시로 선보인 공사장 연작은, 순수미술에서
                        보통은 비가시적인 소재를 중심에 놓았다. 임시적인 것, 미완성된 것, 한
                        상태에서 다른 상태로 가는 사이의 지대 — 이것들이 바로 그의 굵고 에너지
                        넘치는 필치가 그려내도록 만들어진 대상이었다. 회화들은 비계가 내려지고
                        일상이 재개되기 전의 변모의 순간에 장소를 붙잡아 둔다.
                      </p>
                      <p>
                        이후 작업들 — 《바람 밖의 풍경》, 《빛 그리고 마음의 고향》 — 에서 풍경은 더
                        서정적이고 내면적으로 된다. 장소는 여전히 소재이지만, 회화가 닿으려 하는
                        것은 시간을 거쳐 풍경 속에 가라앉는 정서와 기억이다. 이 언덕들 가까이서
                        자랐다는 것, 이 거리들을 지나왔다는 것, 장소를 몸 안에 품고 다닌다는 것이
                        어떤 느낌인지.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 동시대 사람들의 정서와 기억 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The emotion and memory of contemporary people'
                    : '동시대 사람들의 정서와 기억'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Park Seongwan&apos;s paintings are full of people. Or rather: they carry the
                        presence of people even when figures are absent — in the lit window, the
                        worn pavement, the half-finished wall. His practice has consistently
                        returned to what he has described as &ldquo;our stories&rdquo;: the
                        collective life that a particular community lives in a particular time.
                      </p>
                      <p>
                        This becomes explicit in exhibitions like{' '}
                        <em>People Met at Candlelight Square</em> (2024), which centres on figures
                        encountered in the spaces of civic gathering — the squares and streets where
                        public life is made visible. The title refers to the candlelight protests
                        that have been a recurring feature of Korean civic life; the paintings hold
                        the faces and presences of people who showed up to make history in small,
                        ordinary ways.
                      </p>
                      <p>
                        This attention to historical consciousness runs through his group show
                        participations as well — from the{' '}
                        <em>5·18 40th Anniversary May Art Festival</em> to exhibitions on climate
                        justice, on the memory of specific political moments, on the shared life of
                        communities across South Jeolla. In all of these, Park Seongwan&apos;s
                        painting is less a record than an act of witness: a way of saying that this
                        happened, these people were here, and painting can hold that.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        박성완의 회화는 사람들로 가득하다. 좀 더 정확히는: 인물이 없을 때도 사람들의
                        현존을 담고 있다 — 불 켜진 창 속에, 닳고 닳은 보도블록 위에, 반쯤 완성된
                        벽면 안에. 그의 작업은 &lsquo;우리의 이야기&rsquo; — 특정 공동체가 특정
                        시대를 살아가며 만들어내는 집단적 삶 — 로 일관되게 돌아왔다.
                      </p>
                      <p>
                        이것은 《촛불광장에서 만난 사람들》(2024)과 같은 전시에서 명시적이 된다.
                        시민적 집회의 공간에서 — 공공의 삶이 가시화되는 광장과 거리에서 — 마주친
                        인물들을 중심에 놓는다. 제목은 한국 시민 생활의 반복되는 장면인 촛불 집회를
                        가리키고, 회화들은 작고 평범한 방식으로 역사를 만들기 위해 나선 사람들의
                        얼굴과 현존을 붙잡아 둔다.
                      </p>
                      <p>
                        역사적 의식에 대한 이 주의는 단체전 참여에도 일관되게 흐른다 — 《5·18 40주년
                        오월미술제》부터 기후 정의에 관한 전시, 특정 정치적 순간의 기억에 관한 전시,
                        전라남도 전역의 공동체 삶에 관한 전시까지. 이 모든 자리에서 박성완의 회화는
                        기록이라기보다 증언의 행위다: 이런 일이 있었고, 이 사람들이 여기 있었으며,
                        회화가 그것을 품을 수 있다는 선언.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 지역성·공공성과 회화 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Locality, publicness, and the medium of painting'
                    : '지역성·공공성과 회화의 매체성'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        To paint a place for more than two decades is to make an argument: that the
                        particular matters, that what happens in Gwangju and South Jeolla is not a
                        provincial footnote but a centre of its own. Park Seongwan&apos;s sustained
                        practice in the region is itself a kind of claim — that painting rooted in
                        place can carry as much weight, can say as much, as painting rooted anywhere
                        else.
                      </p>
                      <p>
                        That claim extends to the social dimension of his work. His participation in
                        group exhibitions on civic memory, climate justice, and historical
                        commemoration — and his residencies at community-oriented spaces — reflect
                        an understanding of painting as a public medium: not a luxury object made
                        for collectors, but a way of attending to what a community experiences and
                        needs to remember.
                      </p>
                      <p>
                        This is why Park Seongwan participates in this campaign as a{' '}
                        <strong className="font-bold text-charcoal-deep">
                          fellow in solidarity
                        </strong>{' '}
                        with artists facing financial exclusion. His practice has always held that
                        art is not separate from the conditions under which people live — and that
                        those conditions, including financial ones, shape what can and cannot be
                        made. The work sold here flows into the mutual-aid fund so that the next
                        generation can keep painting.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        한 장소를 20여 년 이상 그린다는 것은 하나의 주장이다: 특수한 것이 중요하며,
                        광주와 전라남도에서 일어나는 일은 지방의 각주가 아니라 그 자체로 하나의
                        중심이라는. 박성완의 지역에서의 지속적인 실천은 그 자체로 일종의 선언이다 —
                        장소에 뿌리를 둔 회화가, 어디에 뿌리를 두든, 다른 곳에 뿌리를 둔 회화만큼
                        무게를 지닐 수 있고 많은 것을 말할 수 있다는.
                      </p>
                      <p>
                        그 선언은 작업의 사회적 차원으로 확장된다. 시민적 기억, 기후 정의, 역사적
                        추모를 다루는 단체전 참여, 그리고 공동체 지향적 공간에서의 레지던시들은 —
                        회화를 공적 매체로 이해하는 시각을 반영한다: 수집가를 위한 사치품이 아니라,
                        공동체가 경험하고 기억해야 할 것에 주의를 기울이는 방식.
                      </p>
                      <p>
                        그래서 박성완은 금융 차별에 맞서는{' '}
                        <strong className="font-bold text-charcoal-deep">연대하는 동료</strong>로서
                        이 캠페인에 함께한다. 그의 작업은 언제나 예술이 사람들이 살아가는 조건과
                        분리되지 않는다는 것을 — 그리고 그 조건들이, 재정적 조건을 포함하여, 무엇이
                        만들어질 수 있고 없는지를 결정한다는 것을 — 품고 있었다. 여기서 팔리는
                        작품은 상호부조 기금으로 이어져, 다음 세대가 계속 그림을 그릴 수 있게 한다.
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
                      From the construction sites of Gwangju to the candlelight squares of our
                      times, Park Seongwan has built a sustained practice of painting rooted in
                      place and attentive to the people who inhabit it. He joins this campaign in
                      solidarity with fellow artists — so that the next generation might keep
                      painting this land and its people.
                    </>
                  ) : (
                    <>
                      광주의 공사장에서 우리 시대의 촛불 광장까지, 박성완은 장소에 뿌리를 두고 그
                      안에 사는 사람들에 귀 기울이는 꾸준한 회화 작업을 쌓아왔다. 그는 동료
                      예술인과의 연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들이 이 땅과 그
                      사람들을 계속 그려나갈 수 있도록.
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
                LAND
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Park Seongwan</span>
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
                    Park Seongwan joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    박성완 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={PARK_SEONGWAN_PATH}
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
