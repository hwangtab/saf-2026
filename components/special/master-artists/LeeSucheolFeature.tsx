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

// 작가 feature는 작가 페이지(/artworks/artist/이수철)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const LEE_SUCHEOL_PATH = `/artworks/artist/${encodeURIComponent('이수철')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isLeeSucheolArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '이수철' ||
    n === 'lee sucheol' ||
    n === 'lee su-cheol' ||
    n === 'lee su-chul' ||
    n.replace(/[\s-]+/g, '') === 'leesucheol'
  );
};

const PAGE_COPY = {
  ko: {
    title: '이수철 — 순수 사진, 그 존재론의 경계',
    description:
      '순수 사진의 자리에서 사진의 존재론적 경계를 확장해온 사진가 이수철. 일본 오사카예술대학교에서 사진을 전공한 그는, 카메라와 필름 없이 인화 과정만으로도 이미지를 창조하며 「기억의 여정」·「비동시성」 연작의 명상적 화면을 만들어왔다. 씨앗페 온라인에서 이수철의 작품을 만나보세요.',
    ogDescription:
      '순수 사진의 사진가 이수철. 카메라를 현상을 포착하는 하나의 메커니즘으로 보고, 인화의 물성으로 사진의 경계를 확장한다.',
    ogAlt: '이수철 대표 작품',
    twitterTitle: '이수철',
    twitterDescription: '장르의 이름을 넘어 — 순수 사진의 존재론을 묻는 사진가 이수철',
    keywords:
      '이수철 사진가, 순수 사진, 파인아트 사진, 이미지그래프, 디지그래프, 비동시성, 기억의 여정, 씨앗페 온라인',
  },
  en: {
    title: 'Lee Sucheol — Fine-Art Photography and Its Ontological Edge',
    description:
      'Selected works by Lee Sucheol, a photographer who has expanded the ontological boundary of the photographic image from the ground of fine-art photography. A graduate in photography from Osaka University of Art, he creates images through the printing process alone — without camera or film — building the meditative frames of his 〈Journey of Memory〉 and 〈Asynchronicity〉 series. View his works at SAF Online.',
    ogDescription:
      'Lee Sucheol — a fine-art photographer. He treats the camera as one mechanism among many for capturing phenomena, expanding photography through the materiality of the print.',
    ogAlt: 'Lee Sucheol — featured work',
    twitterTitle: 'Lee Sucheol',
    twitterDescription:
      'Beyond the name of a genre — Lee Sucheol asks the ontology of the photographic image',
    keywords:
      'Lee Sucheol photographer, fine-art photography, image-graph, digi-graph, asynchronicity, Journey of Memory, photographic ontology',
  },
} as const;

export async function buildLeeSucheolMetadata({
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
  const pageUrl = buildLocaleUrl(LEE_SUCHEOL_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('이수철');
  const artwork = allArtworks.find((a) => isLeeSucheolArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Lee Sucheol`
      : `${artwork.title} — 이수철`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(LEE_SUCHEOL_PATH, locale, true),
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

export default async function LeeSucheolFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(LEE_SUCHEOL_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('이수철');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isLeeSucheolArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Lee Sucheol' : '이수철', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${LEE_SUCHEOL_PATH}#person-lee-sucheol`,
    name: isEnglish ? 'Lee Sucheol' : '이수철',
    alternateName: isEnglish ? '이수철' : 'Lee Sucheol',
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? 'Lee Sucheol is a Korean photographer working from the ground of fine-art photography. He studied photography at Osaka University of Art and has expanded the ontological boundary of the photographic image, creating works through the printing process alone — beyond the names of genres such as photograph, image-graph, or digi-graph.'
      : '이수철은 순수 사진의 자리에서 작업하는 사진가입니다. 일본 오사카예술대학교에서 사진을 전공했으며, 카메라와 필름 없이 인화 과정만으로도 이미지를 창조하는 등 사진의 존재론적 경계를 확장해 왔습니다 — 포토그래피·이미지그래프·디지그래프라는 장르의 이름을 넘어서.',
    alumniOf: [
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Osaka University of Art, Dept. of Photography'
          : '오사카예술대학교 사진학과',
      },
      {
        '@type': 'EducationalOrganization',
        name: isEnglish
          ? 'Sangmyung University, Graduate School of Art & Design (Photography — Fine Art / Image Science)'
          : '상명대학교 예술·디자인대학원 사진학과(순수/이미지사이언스전공)',
      },
    ],
    knowsAbout: ['Fine-art photography', 'Photographic printing', 'Photographic ontology'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Lee Sucheol — SAF Online' : '이수철 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Lee Sucheol from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 이수철 작품들을 소개합니다.',
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
        {/* Hero Section — 빛과 인화의 물성, 잠상이 떠오르는 화면 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 빛이 스며드는 인화 모티프 — 점광·잠상 */}
          <div
            className="absolute top-16 left-12 w-2 h-2 rounded-full bg-white/10"
            aria-hidden="true"
          />
          <div
            className="absolute top-28 left-24 w-3 h-3 rounded-full bg-primary/30"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-20 right-16 w-2 h-2 rounded-full bg-white/15"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 right-12 w-2 h-2 rounded-full bg-white/10"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Lee Sucheol' : '이수철'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Beyond the name of a genre,
                  <br />
                  <span className="text-primary-soft">the image itself</span>
                </>
              ) : (
                <>
                  장르의 이름을 넘어,
                  <br />
                  <span className="text-primary-soft">이미지 그 자체</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    The camera is only one mechanism for capturing a phenomenon.
                  </span>
                  <span className="mt-2 block">
                    What matters is the image one creates — and the message it carries.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">카메라는 현상을 포착하는 하나의 메커니즘일 뿐.</span>
                  <span className="mt-2 block">
                    중요한 것은 작가가 창조한 이미지, 그리고 그것이 전하는 메시지다.
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
                    Pure photography —<br />
                    <span className="text-primary-strong">and the edge of its ontology</span>
                  </>
                ) : (
                  <>
                    순수 사진 —<br />
                    <span className="text-primary-strong">그 존재론의 경계에서</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Lee Sucheol built the foundation of his practice in the category of{' '}
                      <strong className="font-bold text-charcoal-deep">
                        fine-art (&ldquo;pure&rdquo;) photography
                      </strong>
                      , studying photography at Osaka University of Art in Japan. &ldquo;Pure&rdquo;
                      photography, in his understanding, is less a heroic act of carrying social
                      message or the spirit of an age than an attitude focused on the inner,
                      artistic value of the medium itself.
                    </p>
                    <p>
                      From that ground he has worked to expand the{' '}
                      <strong className="font-bold text-charcoal">
                        ontological boundary of photography
                      </strong>
                      . He does not see the photograph only as a tool for capturing its subject:
                      embracing varied processes, he has made works through the printing process
                      alone — without camera or film — letting the image arrive by other means.
                    </p>
                    <p>
                      For him, whether the result is called a &ldquo;photograph,&rdquo; an
                      &ldquo;image-graph,&rdquo; or a &ldquo;digi-graph&rdquo; is not what matters.
                      So long as the artist creates an image in his own way and carries a message
                      through it, the work holds full artistic value. The camera, in this view, is
                      simply one mechanism among many for capturing a phenomenon.
                    </p>
                    <p>
                      That conviction runs through his meditative, restrained images. After Osaka,
                      he went on to complete graduate study at Sangmyung University&apos;s Graduate
                      School of Art &amp; Design (Photography — fine art / image science), and his
                      work has unfolded across series such as 〈Journey of Memory〉,
                      〈Asynchronicity Jeju〉, and 〈Trace and Light〉 — each returning to the
                      materiality of light and the print.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      이수철은{' '}
                      <strong className="font-bold text-charcoal-deep">순수(fine art) 사진</strong>
                      의 범주에서 예술적 기반을 닦았다. 일본 오사카예술대학교에서 사진을 전공한 그가
                      이해하는 &lsquo;순수&rsquo; 사진이란, 사회적 메시지나 시대정신을 직접 담는
                      지사적 행위라기보다 예술 그 자체의 내면적 가치에 집중하는 태도다.
                    </p>
                    <p>
                      그 자리에서 그는{' '}
                      <strong className="font-bold text-charcoal">사진의 존재론적 경계</strong>를
                      확장해 왔다. 그는 사진을 대상을 포착하는 도구로만 보지 않는다. 다양한
                      프로세스를 수용하며, 카메라와 필름 없이 인화 과정만으로 결과물을 만드는 등,
                      이미지가 다른 방식으로 도달하게 한다.
                    </p>
                    <p>
                      그에게 결과물이 &lsquo;포토그래피&rsquo;인지 &lsquo;이미지그래프&rsquo;·
                      &lsquo;디지그래프&rsquo;인지 하는 장르의 명칭은 중요하지 않다. 작가가 자신만의
                      방식으로 이미지를 창조해 메시지를 전달하면, 그것으로 충분한 예술적 가치를
                      지닌다. 카메라는 이 시선 안에서 현상을 포착하는 하나의 메커니즘일 뿐이다.
                    </p>
                    <p>
                      그 믿음은 절제되고 사색적인 그의 화면을 관통한다. 오사카 이후 그는 상명대학교
                      예술·디자인대학원 사진학과(순수/이미지사이언스전공)에서 학업을 이어갔으며,
                      그의 작업은 「기억의 여정」, 「비동시성 제주」, 「흔적과 빛」 같은 연작으로
                      펼쳐져 왔다 — 저마다 빛과 인화의 물성으로 돌아오면서.
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
                        {isEnglish ? 'Fine-art photography' : '순수 사진'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'An attitude focused on the inner, artistic value of the medium itself, rather than on carrying social message directly.'
                          : '사회적 메시지를 직접 담기보다, 예술 그 자체의 내면적 가치에 집중하는 태도.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Expanding the ontological edge' : '존재론의 경계 확장'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Not only capture: he makes images through the printing process alone, without camera or film, embracing varied processes.'
                          : '포착만이 아니다. 카메라·필름 없이 인화 과정만으로 이미지를 만들며, 다양한 프로세스를 수용한다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Beyond the name of a genre' : '장르의 이름을 넘어'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Photograph, image-graph, or digi-graph — the label is not the point. The created image and its message are.'
                          : '포토그래피·이미지그래프·디지그래프 — 명칭이 핵심이 아니다. 창조된 이미지와 그 메시지가 핵심이다.'}
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
                      {isEnglish ? 'Edu.' : '학력'}
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Osaka University of Art, Dept. of Photography (Japan); Sangmyung University Graduate School of Art & Design, Photography — fine art / image science.'
                        : '오사카예술대학교 사진학과 졸업(일본); 상명대학교 예술·디자인대학원 사진학과(순수/이미지사이언스전공) 졸업.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      1999
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈memories〉, Ihu Gallery — among his early solo presentations.'
                        : '개인전 「memories」, 이후갤러리 — 초기 개인전.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Epiphany of Illusion〉.'
                        : '개인전 「幻想의 Epiphany」.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2011
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Hwamong Junggyeong〉, Grimson Gallery.'
                        : '개인전 「화몽중경」, 그림손갤러리.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Asynchronicity Jeju〉, Space22 · Gallery Bresson and others.'
                        : '「비동시성제주」, 스페이스22·브레송갤러리 등.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2020
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Daydream〉, Gallery Hyeyum, Gwangju; participates in the Korea Galleries Art Fair (COEX).'
                        : '「Daydream」, 갤러리 혜윰, 광주; 화랑미술제(COEX) 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Trace and Light〉, Toma Gallery, Daegu.'
                        : '「흔적과 빛」, 토마갤러리, 대구.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Journey of Memory〉, Yeomi Gallery, Seosan (2022) · Gallery The Beam, Daejeon (2023) · Solaris Gallery, Osaka.'
                        : '「기억의 여정」, 여미갤러리 서산(2022)·더빔갤러리 대전(2023)·솔라리스갤러리 오사카.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2025
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈Hyewon Photo Album〉, invited exhibition at Space Thunder · Gallery Is.'
                        : '「혜원사진첩」, 공간썬더 초대전·이즈갤러리.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & teaching' : '주요 전시 및 강의'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions include 〈Hyewon Photo Album〉 (2025), 〈Journey of Memory〉 (Osaka · Daejeon 2023 · Seosan 2022), 〈Trace and Light〉 (Daegu, 2021), 〈Daydream〉 (Gwangju, 2020), 〈Asynchronicity Jeju〉 (2018), 〈Hwamong Junggyeong〉 (2011), 〈Epiphany of Illusion〉 (2008), and 〈memories〉 (since 1999).'
                        : '개인전: 「혜원사진첩」(2025), 「기억의 여정」(오사카·대전 2023·서산 2022), 「흔적과 빛」(대구, 2021), 「Daydream」(광주, 2020), 「비동시성제주」(2018), 「화몽중경」(2011), 「幻想의 Epiphany」(2008), 「memories」(1999~) 등.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Jeju International Photo Festival 〈Asynchronicity Jeju〉 (Gallery Simon); Jeju Asynchronicity solo exhibitions.'
                        : '제주국제사진전 「제주 비동시성」(갤러리 시몽); 「비동시성제주」 개인전 연작.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions include the 2025 New Wave exhibition (Gallery Bresson) and Insadong Art Week, the 2020 Korea Galleries Art Fair (COEX), and Contemporary Art Ruhr Media Art Fair (Zollverein, Essen, Germany, 2014).'
                        : '단체전: 2025 New Wave전(브레송갤러리)·인사동 아트위크, 2020 화랑미술제(COEX), Contemporary art ruhr Media Art Fair(Zollverein, Essen, Germany, 2014) 등.'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Teaching: lecturer at Daegu Arts University (2007–2012), Kookmin University (2008–2009), Sangmyung University Dept. of Photography & Image (2013–present), and Chungnam National University (2010–present).'
                        : '강의: 대구예술대 사진학과(2007–2012), 국민대 조형대학(2008–2009), 상명대 사진영상학과(2013–현재), 충남대 디자인창의학과(2010–현재) 강사.'}
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
                  Two essays —
                  <br />
                  <span className="text-charcoal-deep">on the work and its ground</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그 바탕에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 순수 사진이라는 자리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish ? 'The ground of pure photography' : '순수 사진이라는 자리'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Lee Sucheol studied photography at Osaka University of Art, and it was there
                        that he set the ground of his practice in fine-art — &ldquo;pure&rdquo; —
                        photography. The word can be misread. &ldquo;Pure&rdquo; here does not mean
                        empty of meaning; it names an attitude. Where some photography sets out,
                        with a kind of literati seriousness, to carry social message or the spirit
                        of an age directly, pure photography turns instead to the inner, artistic
                        value of the medium itself.
                      </p>
                      <p>
                        This is not a retreat from the world but a different way of attending to it.
                        The restraint of his images — their meditative, contemplative tone — comes
                        from this conviction: that the photograph is, before anything else, an
                        artistic object whose value lies in how it is made and what it allows the
                        viewer to feel, rather than in the slogan it might be made to serve.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        이수철은 오사카예술대학교에서 사진을 전공했고, 거기서 자신의 작업의 바탕을
                        순수 — &lsquo;파인아트&rsquo; — 사진에 두었다. 이 말은 오해되기 쉽다. 여기서
                        &lsquo;순수&rsquo;는 의미가 비어 있다는 뜻이 아니라 하나의 태도를 가리킨다.
                        어떤 사진이 지사적 진지함으로 사회적 메시지나 시대정신을 직접 담으려 한다면,
                        순수 사진은 대신 매체 그 자체의 내면적·예술적 가치로 향한다.
                      </p>
                      <p>
                        이는 세계로부터의 후퇴가 아니라 세계를 대하는 다른 방식이다. 그의 화면이
                        지닌 절제 — 명상적이고 사색적인 톤 — 는 이 믿음에서 온다. 사진은 무엇보다
                        먼저 예술적 대상이며, 그 가치는 어떤 구호에 봉사하느냐가 아니라 어떻게
                        만들어졌고 보는 이에게 무엇을 느끼게 하느냐에 있다는 믿음.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 카메라 없는 사진 — 존재론의 경계 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Photography without a camera — the ontological edge'
                    : '카메라 없는 사진 — 존재론의 경계'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        From that ground, Lee Sucheol asks a harder question: what, exactly, is a
                        photograph? Most of us assume a chain — a subject, a lens, a film or sensor,
                        a print. He has worked to loosen each link. Embracing varied processes, he
                        has made images through the printing process alone, without camera or film,
                        so that the result arrives not from capturing the world but from working the
                        material of the print itself.
                      </p>
                      <p>
                        Out of this practice comes his indifference to the names. Whether a given
                        work is called a photograph, an image-graph, or a digi-graph is, for him,
                        beside the point. The genre label describes a process; it does not measure a
                        work. What measures a work is whether the artist has created an image in his
                        own way and carried a message through it. If he has, the work holds full
                        artistic value — and the camera reveals itself as only one mechanism, among
                        many, for capturing a phenomenon.
                      </p>
                      <p>
                        This is why his series — 〈Journey of Memory〉, 〈Asynchronicity Jeju〉,
                        〈Trace and Light〉 — feel less like records than like surfaces where light
                        and the print have been allowed to do their own quiet work. The boundary of
                        photography, in his hands, is not a wall but a horizon he keeps moving
                        outward.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        그 자리에서 이수철은 더 어려운 물음을 던진다: 사진이란 정확히 무엇인가? 우리
                        대부분은 하나의 사슬을 전제한다 — 대상, 렌즈, 필름 혹은 센서, 인화. 그는 그
                        고리들을 하나씩 풀어 왔다. 다양한 프로세스를 수용하며, 카메라와 필름 없이
                        인화 과정만으로 이미지를 만들어, 결과물이 세계를 포착해서가 아니라 인화의
                        물성 자체를 다룸으로써 도달하게 한다.
                      </p>
                      <p>
                        이 작업에서 명칭에 대한 그의 무심함이 나온다. 어떤 작품이 포토그래피인지,
                        이미지그래프인지, 디지그래프인지는 그에게 핵심이 아니다. 장르의 이름은
                        프로세스를 묘사할 뿐, 작품을 가늠하지 않는다. 작품을 가늠하는 것은 작가가
                        자신만의 방식으로 이미지를 창조해 메시지를 전달했는가다. 그랬다면 그 작품은
                        충분한 예술적 가치를 지니며 — 카메라는 현상을 포착하는 여러 메커니즘 중
                        하나일 뿐임이 드러난다.
                      </p>
                      <p>
                        그래서 그의 연작 — 「기억의 여정」, 「비동시성 제주」, 「흔적과 빛」 — 은
                        기록이라기보다 빛과 인화가 저마다의 조용한 일을 하도록 허락된 표면처럼
                        느껴진다. 그의 손에서 사진의 경계는 벽이 아니라, 그가 계속 바깥으로 밀어내는
                        지평선이다.
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
                      Between the print and the image it carries, between the name of a genre and
                      the thing itself, Lee Sucheol has built a quiet, sustained body of work that
                      keeps asking what a photograph can be. He joins this campaign in solidarity
                      with fellow artists — so that the next generation of artists might keep making
                      images in their own way.
                    </>
                  ) : (
                    <>
                      인화와 그것이 담는 이미지 사이, 장르의 이름과 사물 그 자체 사이에서, 이수철은
                      사진이 무엇일 수 있는가를 계속 묻는 조용하고 꾸준한 작업을 쌓아왔다. 그는 동료
                      예술인과의 연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들이 저마다의
                      방식으로 계속 이미지를 만들 수 있도록.
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
                LIGHT
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Lee Sucheol</span>
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
                    Lee Sucheol joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    이수철 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={LEE_SUCHEOL_PATH}
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
