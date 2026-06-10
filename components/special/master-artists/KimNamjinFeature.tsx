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

// 거장/중견 작가 feature는 작가 페이지(/artworks/artist/김남진)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_NAMJIN_PATH = `/artworks/artist/${encodeURIComponent('김남진')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isKimNamjinArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '김남진' ||
    n === 'kim nam-jin' ||
    n === 'kim namjin' ||
    n.replace(/[\s-]+/g, '') === 'kimnamjin'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김남진 — 도시의 밤을 기록한 사진가이자 사진문화의 산파',
    description:
      '1984년부터 〈이태원의 밤〉 다큐먼트로 한국사진의 자생적 형식 실험을 이끈 사진가 김남진. 폴라로이드 누드의 이미지 전사 실험, 김남진 사진공방을 통한 현대사진 이론의 체계화, 서울국제사진페스티벌·충무로사진축제 기획 — 사진가이자 교육자, 전시기획자, 갤러리 브레송 대표인 김남진의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '도시의 밤을 기록한 사진가이자 사진문화의 산파 김남진. 〈이태원의 밤〉부터 폴라로이드 누드, 사진공방과 사진축제 기획까지.',
    ogAlt: '김남진 대표 작품',
    twitterTitle: '김남진',
    twitterDescription: '도시의 밤을 응시한 카메라 — 사진가이자 교육자, 전시기획자 김남진',
    keywords:
      '김남진 사진가, 이태원의 밤, 폴라로이드 누드, 김남진 사진공방, 서울국제사진페스티벌, 충무로사진축제, 갤러리 브레송, 사진문화포럼, 씨앗페 온라인',
  },
  en: {
    title: 'Kim Nam-jin — Photographer of the Night City and Midwife of Photo Culture',
    description:
      'Selected works by Kim Nam-jin (b. 1957), a photographer who from 1984 led one of Korean photography’s most distinctive self-grown formal experiments with his 〈Itaewon Nights〉 document. Through Polaroid nude image-transfer experiments, the systematizing of contemporary photographic theory at the Kim Nam-jin Photo Workshop, and the curating of the Seoul International Photo Festival and the Chungmuro Photo Festival, he has lived a layered identity as photographer, educator, and exhibition curator. He is the director of Gallery Bresson. View and collect his works at SAF Online.',
    ogDescription:
      'Kim Nam-jin — photographer of the night city and midwife of photo culture. From 〈Itaewon Nights〉 to Polaroid nudes, a workshop and festivals.',
    ogAlt: 'Kim Nam-jin — featured work',
    twitterTitle: 'Kim Nam-jin',
    twitterDescription:
      'A camera fixed on the night city — photographer, educator, and exhibition curator',
    keywords:
      'Kim Nam-jin photographer, Itaewon Nights, Polaroid nude, Kim Nam-jin photo workshop, Seoul International Photo Festival, Chungmuro Photo Festival, Gallery Bresson',
  },
} as const;

export async function buildKimNamjinMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_NAMJIN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김남진');
  const artwork = allArtworks.find((a) => isKimNamjinArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Nam-jin`
      : `${artwork.title} — 김남진`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(KIM_NAMJIN_PATH, locale, true),
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

export default async function KimNamjinFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_NAMJIN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김남진');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isKimNamjinArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Kim Nam-jin' : '김남진', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_NAMJIN_PATH}#person-kim-namjin`,
    name: isEnglish ? 'Kim Nam-jin' : '김남진',
    alternateName: isEnglish ? '김남진' : 'Kim Nam-jin',
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? 'Kim Nam-jin (b. 1957) is a Korean photographer, educator, and exhibition curator. From 1984 he developed the 〈Itaewon Nights〉 document, later experimented with Polaroid-color image-transfer nudes, founded the Kim Nam-jin Photo Workshop, and curated the Seoul International Photo Festival and the Chungmuro Photo Festival. He is the director of Gallery Bresson.'
      : '김남진(1957–)은 사진가이자 교육자, 전시기획자입니다. 1984년부터 〈이태원의 밤〉 다큐먼트를 발전시켰고, 폴라 컬러 이미지 전사를 이용한 누드 사진을 실험했으며, 김남진 사진공방을 운영하고 서울국제사진페스티벌·충무로사진축제를 기획했습니다. 현재 갤러리 브레송 대표입니다.',
    birthDate: '1957',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Gongju, South Chungcheong, South Korea' : '충남 공주',
    },
    alumniOf: {
      '@type': 'EducationalOrganization',
      name: isEnglish ? 'Korea University' : '고려대학교',
    },
    affiliation: {
      '@type': 'Organization',
      name: isEnglish ? 'Gallery Bresson' : '갤러리 브레송',
    },
    knowsAbout: isEnglish
      ? ['Documentary photography', 'Polaroid image transfer', 'Photography theory and aesthetics']
      : ['다큐먼터리 사진', '폴라로이드 이미지 전사', '사진 이론과 미학'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Nam-jin — SAF Online' : '김남진 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Nam-jin from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김남진 작품들을 소개합니다.',
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

          {/* Night-frame motif — 도시의 밤, 카메라의 프레임 */}
          <div className="absolute top-8 left-8 h-16 w-px bg-white/15" />
          <div className="absolute top-8 left-8 h-px w-16 bg-white/15" />
          <div className="absolute bottom-8 right-8 h-16 w-px bg-primary/30" />
          <div className="absolute bottom-8 right-8 h-px w-16 bg-primary/30" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Kim Nam-jin · Photographer · b. 1957' : '김남진 · 사진 · 1957–'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  The city at night,
                  <br />
                  <span className="text-primary-soft">held in a frame</span>
                </>
              ) : (
                <>
                  도시의 밤을
                  <br />
                  <span className="text-primary-soft">한 프레임에 붙들다</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    A camera fixed on the night, where a city reveals its other face.
                  </span>
                  <span className="mt-2 block">
                    Photographer, educator, curator — a maker of photo culture itself.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">도시가 다른 얼굴을 드러내는 밤을 응시한 카메라.</span>
                  <span className="mt-2 block">
                    사진가이자 교육자, 전시기획자 — 사진문화 그 자체를 일군 사람.
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
                    The night city —<br />
                    <span className="text-primary-strong">
                      a self-grown form of Korean photography
                    </span>
                  </>
                ) : (
                  <>
                    도시의 밤 —<br />
                    <span className="text-primary-strong">한국사진의 자생적 형식</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Nam-jin (b. 1957) was born in Gongju, South Chungcheong province, and
                      graduated from Korea University. He came to photography not as a technician of
                      the studio but as a documentarian of the street, drawn to the places where a
                      city sheds its daytime composure and shows another self.
                    </p>
                    <p>
                      From 1984 he began the work that would define him: the{' '}
                      <strong className="font-bold text-charcoal-deep">〈Itaewon Nights〉</strong>{' '}
                      document. In 1987 he held its first solo exhibition at the Fine Hill Gallery.
                      The series has been read as one of the successful instances of Korean
                      photography&apos;s self-grown formal experiment — a documentary language that
                      did not borrow its grammar from abroad but found it in the particular texture
                      of a Korean night.
                    </p>
                    <p>
                      He did not stop at the documentary. At the 1993 Batanggol Art Center
                      exhibition 〈Polaroid Nudes〉, he turned to{' '}
                      <strong className="font-bold text-charcoal">
                        Polaroid-color image transfer
                      </strong>
                      , lifting the emulsion and re-laying the image to arrive at a new expressive
                      form for the nude. Where 〈Itaewon Nights〉 looked outward at the city, this
                      work looked inward at the surface of the photograph itself — at what an image
                      becomes when it is moved, pressed, and made strange.
                    </p>
                    <p>
                      But Kim Nam-jin is not only a maker of images. From 1987 he ran the{' '}
                      <strong className="font-bold text-charcoal-deep">
                        Kim Nam-jin Photo Workshop
                      </strong>
                      , where he set out to systematize the currents, theories, and aesthetics of
                      contemporary photography and introduce them within Korea, training a
                      generation of photographers who came after him. To teach photography, for him,
                      was to build the intellectual ground on which photography could stand.
                    </p>
                    <p>
                      As an exhibition curator he carried this purpose into the public sphere,
                      planning and running the{' '}
                      <strong className="font-bold text-charcoal">
                        Seoul International Photo Festival
                      </strong>{' '}
                      and the{' '}
                      <strong className="font-bold text-charcoal">Chungmuro Photo Festival</strong>.
                      Today he serves as the head of the Photo Culture Forum and as director of
                      Gallery Bresson — still, at once, photographer, educator, and the midwife of a
                      culture that holds the medium together.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김남진(1957–)은 충남 공주에서 태어나 고려대학교를 졸업했다. 그는 스튜디오의
                      기술자가 아니라 거리의 다큐먼터리스트로 사진에 다가갔다 — 도시가 낮의 단정함을
                      벗고 또 다른 얼굴을 드러내는 자리에 이끌려서.
                    </p>
                    <p>
                      1984년, 그는 자신을 규정하게 될 작업을 시작했다 —{' '}
                      <strong className="font-bold text-charcoal-deep">〈이태원의 밤〉</strong>{' '}
                      다큐먼트. 1987년 파인힐 갤러리에서 그 첫 개인전을 열었다. 이 연작은 한국사진의
                      자생적 형식 실험이 성공한 사례의 하나로 평가받는다 — 문법을 밖에서 빌려오지
                      않고, 한국적 밤의 고유한 질감 속에서 찾아낸 다큐먼터리의 언어.
                    </p>
                    <p>
                      그는 다큐먼트에 머물지 않았다. 1993년 바탕골예술관 〈폴라로이드 누드〉전에서
                      그는{' '}
                      <strong className="font-bold text-charcoal">폴라 컬러의 이미지 전사</strong>로
                      향했다. 유제를 들어 올려 이미지를 다시 옮겨 앉히며, 누드 사진의 새로운
                      표현양식에 이르렀다. 〈이태원의 밤〉이 도시를 향해 밖을 바라보았다면, 이
                      작업은 사진 그 자체의 표면을 향해 안을 들여다보았다 — 이미지가 옮겨지고 눌리고
                      낯설어질 때 무엇이 되는가를.
                    </p>
                    <p>
                      그러나 김남진은 이미지를 만드는 사람이기만 한 것이 아니다. 1987년부터 그는{' '}
                      <strong className="font-bold text-charcoal-deep">김남진 사진공방</strong>을
                      운영하며, 현대사진의 제경향과 이론, 사진미학을 체계화해 국내에 소개하고,
                      자신을 뒤따르는 후배 사진가들을 길러 냈다. 그에게 사진을 가르치는 일은, 사진이
                      딛고 설 지적 토대를 짓는 일이었다.
                    </p>
                    <p>
                      전시기획자로서 그는 이 뜻을 공적 영역으로 옮겼다.{' '}
                      <strong className="font-bold text-charcoal">서울국제사진페스티벌</strong>과{' '}
                      <strong className="font-bold text-charcoal">충무로사진축제</strong>를 기획하고
                      진행했다. 오늘날 그는 사진문화포럼 대표이자 갤러리 브레송 대표로 일한다 —
                      여전히, 사진가이자 교육자이며, 사진이라는 매체를 떠받치는 문화의 산파로서.
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
                          ? '〈Itaewon Nights〉 — the night document'
                          : '〈이태원의 밤〉 — 밤의 다큐먼트'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Begun in 1984, a documentary read as one of the successful cases of Korean photography’s self-grown formal experiment.'
                          : '1984년 시작된 다큐먼트. 한국사진의 자생적 형식 실험이 성공한 사례의 하나로 평가받는다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Polaroid image transfer' : '폴라로이드 이미지 전사'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'At 〈Polaroid Nudes〉 (1993) he used Polaroid-color image transfer to arrive at a new expressive form for the nude.'
                          : '〈폴라로이드 누드〉전(1993)에서 폴라 컬러 이미지 전사로 누드 사진의 새로운 표현양식에 이르렀다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Educator & curator' : '교육자이자 전시기획자'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Through the Kim Nam-jin Photo Workshop and festivals he built the theory, training, and public ground of Korean photo culture.'
                          : '김남진 사진공방과 사진축제를 통해 한국 사진문화의 이론과 교육, 공적 토대를 일구었다.'}
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
                      1957
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Born in Gongju, South Chungcheong province.'
                        : '충남 공주 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      —
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Graduates from Korea University.' : '고려대학교 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1984
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins the 〈Itaewon Nights〉 document.'
                        : '〈이태원의 밤〉 다큐먼트 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1987
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Itaewon Nights〉 at the Fine Hill Gallery; opens the Kim Nam-jin Photo Workshop.'
                        : '파인힐 갤러리 개인전 〈이태원의 밤〉; 김남진 사진공방 운영 시작.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1993
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Polaroid Nudes〉 exhibition at the Batanggol Art Center.'
                        : '바탕골예술관 〈폴라로이드 누드〉전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      {isEnglish ? 'Curator' : '기획'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Plans and runs the Seoul International Photo Festival and the Chungmuro Photo Festival.'
                        : '서울국제사진페스티벌·충무로사진축제 기획·진행.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      {isEnglish ? 'Now' : '현재'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Head of the Photo Culture Forum and director of Gallery Bresson.'
                        : '사진문화포럼 대표이자 갤러리 브레송 대표.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'A layered practice' : '여러 겹의 활동'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Photographer: <em>Itaewon Nights</em> (from 1984), <em>Polaroid Nudes</em>{' '}
                          (1993)
                        </>
                      ) : (
                        <>사진가: 〈이태원의 밤〉(1984–), 〈폴라로이드 누드〉(1993)</>
                      )}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Educator: founder of the Kim Nam-jin Photo Workshop (1987–), systematizing contemporary photographic theory and aesthetics in Korea'
                        : '교육자: 김남진 사진공방(1987–) 운영 — 현대사진 이론·미학의 체계화와 국내 소개'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Curator: Seoul International Photo Festival, Chungmuro Photo Festival'
                        : '전시기획자: 서울국제사진페스티벌, 충무로사진축제'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? (
                        <>
                          Director:{' '}
                          <a
                            href="http://gallerybresson.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Gallery Bresson
                          </a>{' '}
                          (Chungmuro, Seoul); head of the Photo Culture Forum
                        </>
                      ) : (
                        <>
                          대표:{' '}
                          <a
                            href="http://gallerybresson.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            갤러리 브레송
                          </a>{' '}
                          (서울 충무로); 사진문화포럼 대표
                        </>
                      )}
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
                    on the night, the surface, and the ground
                  </span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">밤과 표면, 그리고 토대에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 이태원의 밤 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? '〈Itaewon Nights〉 — a self-grown documentary'
                    : '〈이태원의 밤〉 — 자생한 다큐먼트'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        When Kim Nam-jin began photographing Itaewon in 1984, he chose a subject
                        that resisted easy framing. Itaewon at night was a threshold district — a
                        place where the foreign and the local, the licit and the illicit, the
                        spectacle and the everyday pressed against one another. To document it was
                        not to illustrate a thesis but to stay long enough for the place to declare
                        itself.
                      </p>
                      <p>
                        The series matters to Korean photo history for a particular reason. It has
                        been read as one of the successful instances of the medium&apos;s{' '}
                        <strong className="font-bold text-charcoal-deep">
                          self-grown formal experiment
                        </strong>{' '}
                        — a documentary language that did not import its grammar but grew it from
                        the specific texture of a Korean night. The 1987 solo exhibition at the Fine
                        Hill Gallery set that language down in public for the first time.
                      </p>
                      <p>
                        What the work refuses is condescension. Itaewon is neither romanticised nor
                        moralised; it is looked at. The camera holds its gaze on the city&apos;s
                        other face — the face it shows only after dark — and lets the frame carry
                        the weight of that attention.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1984년 김남진이 이태원을 찍기 시작했을 때, 그는 쉽게 프레임에 담기지 않는
                        대상을 택했다. 밤의 이태원은 경계의 동네였다 — 이국과 토착, 허용과 금기,
                        스펙터클과 일상이 서로 부딪치는 자리. 그곳을 다큐먼트한다는 것은 어떤 주장을
                        예시하는 일이 아니라, 그 장소가 스스로를 드러낼 때까지 충분히 머무는
                        일이었다.
                      </p>
                      <p>
                        이 연작이 한국사진사에서 갖는 의미는 분명하다. 그것은 이 매체의{' '}
                        <strong className="font-bold text-charcoal-deep">자생적 형식 실험</strong>이
                        성공한 사례의 하나로 평가받는다 — 문법을 수입하지 않고, 한국적 밤의 고유한
                        질감에서 길러 낸 다큐먼터리의 언어. 1987년 파인힐 갤러리 개인전은 그 언어를
                        처음으로 공적인 자리에 내려놓았다.
                      </p>
                      <p>
                        이 작업이 거부하는 것은 내려다보는 시선이다. 이태원은 낭만화되지도,
                        도덕화되지도 않는다 — 다만 응시된다. 카메라는 도시의 다른 얼굴, 어두워진
                        뒤에야 드러나는 얼굴에 시선을 고정하고, 그 응시의 무게를 프레임이 감당하게
                        한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 폴라로이드 누드 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? '〈Polaroid Nudes〉 — transferring the image'
                    : '〈폴라로이드 누드〉 — 이미지를 옮기다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        At the 1993 Batanggol Art Center exhibition, Kim Nam-jin turned the camera
                        from the street to the photographic surface itself. Using{' '}
                        <strong className="font-bold text-charcoal-deep">
                          Polaroid-color image transfer
                        </strong>
                        , he lifted the emulsion from its original support and re-laid it elsewhere,
                        so that the nude appeared not as a clean print but as an image bearing the
                        marks of its own displacement.
                      </p>
                      <p>
                        The move was a formal argument. A photograph is usually asked to be
                        transparent — a window onto its subject. Transfer makes the photograph
                        opaque, foregrounding the material life of the image: the way it cracks,
                        wrinkles, and shifts colour when it is moved. The nude becomes less a body
                        than a record of what happens to a picture of a body.
                      </p>
                      <p>
                        Read alongside 〈Itaewon Nights〉, the two bodies of work describe a single
                        sensibility from opposite directions. One looks outward at a city; the other
                        looks inward at the photograph. Both refuse the smooth, finished image in
                        favour of something handled, particular, and unmistakably made.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1993년 바탕골예술관 전시에서, 김남진은 카메라를 거리에서 사진의 표면 자체로
                        돌렸다.{' '}
                        <strong className="font-bold text-charcoal-deep">
                          폴라 컬러의 이미지 전사
                        </strong>
                        를 이용해, 그는 유제를 원래의 지지체에서 들어 올려 다른 곳에 다시 옮겨
                        앉혔다. 그리하여 누드는 깨끗한 프린트가 아니라, 옮겨진 흔적을 지닌 이미지로
                        나타났다.
                      </p>
                      <p>
                        이 선택은 하나의 형식적 주장이었다. 사진은 흔히 투명할 것을 요구받는다 —
                        대상을 향한 창으로서. 전사는 사진을 불투명하게 만들고, 이미지의 물질적 삶을
                        앞으로 끌어낸다 — 옮겨질 때 갈라지고 주름지고 빛깔이 바뀌는 방식. 누드는
                        하나의 몸이라기보다, 몸의 사진에 일어난 일의 기록이 된다.
                      </p>
                      <p>
                        〈이태원의 밤〉과 나란히 놓고 보면, 두 작업은 하나의 감각을 반대 방향에서
                        그린다. 하나는 도시를 향해 밖을 바라보고, 다른 하나는 사진을 향해 안을
                        들여다본다. 둘 다 매끈하고 완결된 이미지를 거부하고, 손길이 닿은, 고유한,
                        분명히 만들어진 무엇을 택한다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 사진공방과 사진축제 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? 'Workshop and festival — building the ground'
                    : '사진공방과 사진축제 — 토대를 짓다'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        From 1987, alongside his own photography, Kim Nam-jin ran the{' '}
                        <strong className="font-bold text-charcoal-deep">
                          Kim Nam-jin Photo Workshop
                        </strong>
                        . Its purpose was not technique but theory: to gather the currents,
                        arguments, and aesthetics of contemporary photography, to systematize them,
                        and to bring them into Korean discourse. He understood that a photographic
                        culture cannot stand on images alone — it needs a shared language with which
                        to read them.
                      </p>
                      <p>
                        That conviction scaled outward into the public realm. As an exhibition
                        curator, he planned and ran the{' '}
                        <strong className="font-bold text-charcoal">
                          Seoul International Photo Festival
                        </strong>{' '}
                        and the{' '}
                        <strong className="font-bold text-charcoal">
                          Chungmuro Photo Festival
                        </strong>
                        , building stages on which Korean and international photography could meet —
                        and on which younger photographers could find an audience.
                      </p>
                      <p>
                        This is the quiet shape of his career: an artist who treated the health of
                        the whole field as part of his own work. Today, as head of the Photo Culture
                        Forum and director of Gallery Bresson, he is still doing it — keeping open
                        the rooms in which photography is shown, argued over, and passed on.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        1987년부터, 자신의 사진 작업과 나란히, 김남진은{' '}
                        <strong className="font-bold text-charcoal-deep">김남진 사진공방</strong>을
                        운영했다. 그 목적은 기술이 아니라 이론이었다 — 현대사진의 제경향과 논의,
                        미학을 모으고, 체계화하고, 한국의 담론 안으로 들여오는 것. 그는 사진문화가
                        이미지만으로는 설 수 없음을 알았다. 그것을 읽어 낼 공통의 언어가 필요하다는
                        것을.
                      </p>
                      <p>
                        그 확신은 공적 영역으로 확장되었다. 전시기획자로서 그는{' '}
                        <strong className="font-bold text-charcoal">서울국제사진페스티벌</strong>과{' '}
                        <strong className="font-bold text-charcoal">충무로사진축제</strong>를
                        기획하고 진행했다. 한국과 세계의 사진이 만나는 무대, 그리고 젊은 사진가들이
                        관객을 만나는 무대를 지었다.
                      </p>
                      <p>
                        이것이 그의 이력이 그리는 조용한 형상이다 — 매체 전체의 건강을 자신의 작업의
                        일부로 삼은 작가. 오늘날 사진문화포럼 대표이자 갤러리 브레송 대표로서, 그는
                        여전히 그 일을 한다 — 사진이 전시되고, 논의되고, 다음 세대로 건네지는 방을
                        열어 두는 일을.
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
                      From 〈Itaewon Nights〉 to the festivals he has curated, Kim Nam-jin&apos;s
                      work has pursued a single, generous question: how does a photograph hold what
                      a city shows only at night, and how does a culture hold the photograph? The
                      answer, built over four decades, is a life lived as photographer, educator,
                      and curator at once. He joins this campaign not as a subject of its cause but
                      as a fellow artist in solidarity — so that those who come after might work
                      with a little less of the weight that financial exclusion places on Korean
                      artists.
                    </>
                  ) : (
                    <>
                      〈이태원의 밤〉에서 그가 기획한 사진축제까지, 김남진의 작업은 하나의 너그러운
                      물음을 추구해 왔다 — 사진은 도시가 밤에만 드러내는 것을 어떻게 붙드는가,
                      그리고 문화는 그 사진을 어떻게 붙드는가. 40년에 걸쳐 구축된 대답은, 사진가이자
                      교육자이며 전시기획자로 동시에 살아 낸 한 삶이다. 그는 씨앗페에 이 캠페인의
                      대상으로서가 아니라, 동료 예술인과의 연대자로서 함께한다 — 다음 세대의
                      예술인들이 한국 예술인에게 지워진 금융 차별의 무게를 조금이라도 덜 짊어진 채
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
                    점의 작품을 만나보실 수 있습니다.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Nam-jin</span>
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
                    Kim Nam-jin joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김남진 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_NAMJIN_PATH}
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
