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

// 작가 feature는 작가 페이지(/artworks/artist/고현주)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const GO_HYEONJU_PATH = `/artworks/artist/${encodeURIComponent('고현주')}`;

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();
const isGoHyeonjuArtist = (artist: string): boolean => {
  if (!artist) return false;
  const n = normalizeArtistKey(artist);
  return (
    n === '고현주' ||
    n === 'go hyeonju' ||
    n === 'go hyeon-ju' ||
    n === 'ko hyun-ju' ||
    n === 'ko hyunju' ||
    n.replace(/[\s-]+/g, '') === 'gohyeonju'
  );
};

const PAGE_COPY = {
  ko: {
    title: '고현주 — 사진으로 전한 희망과 기억',
    description:
      '사진가 고현주(1964–2022). 안양소년원 아이들에게 사진 찍기를 가르친 〈꿈꾸는 카메라〉, 제주 4·3 체험자의 기억을 유품과 사물에 담아 기록한 《기억의 목소리》의 작가. 사진을 통한 희망과 치유, 그리고 증언의 작업을 씨앗페 온라인에서 만나보세요.',
    ogDescription:
      '사진가 고현주. 소년원 아이들에게 사진을 가르친 〈꿈꾸는 카메라〉, 제주 4·3의 기억을 사물에 담은 《기억의 목소리》 — 희망과 증언의 사진.',
    ogAlt: '고현주 대표 작품',
    twitterTitle: '고현주',
    twitterDescription:
      '사진으로 전한 희망과 기억 — 〈꿈꾸는 카메라〉·《기억의 목소리》의 작가 고현주',
    keywords:
      '고현주 사진가, 꿈꾸는 카메라, 기억의 목소리, 제주 4·3, 사진 치유, 고정희상, 씨앗페 온라인',
  },
  en: {
    title: 'Go Hyeonju — Hope and Memory, Through Photographs',
    description:
      'Photographer Go Hyeonju (1964–2022). Through 〈The Dreaming Camera〉 she taught photography to children at the Anyang Juvenile Reformatory; through 《The Voice of Memory》 she recorded the memories of Jeju 4·3 survivors in their belongings and everyday objects. Encounter her work of hope, healing, and testimony at SAF Online.',
    ogDescription:
      'Photographer Go Hyeonju. 〈The Dreaming Camera〉, teaching children to photograph; 《The Voice of Memory》, the Jeju 4·3 held in objects — photography as hope and testimony.',
    ogAlt: 'Go Hyeonju — featured work',
    twitterTitle: 'Go Hyeonju',
    twitterDescription:
      'Hope and memory through photographs — Go Hyeonju, artist of 〈The Dreaming Camera〉 and 《The Voice of Memory》',
    keywords:
      'Go Hyeonju photographer, The Dreaming Camera, The Voice of Memory, Jeju 4·3, photography and healing, Korean documentary photography',
  },
} as const;

export async function buildGoHyeonjuMetadata({
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
  const pageUrl = buildLocaleUrl(GO_HYEONJU_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('고현주');
  const artwork = allArtworks.find((a) => isGoHyeonjuArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Go Hyeonju`
      : `${artwork.title} — 고현주`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords: copy.keywords,
    alternates: createLocaleAlternates(GO_HYEONJU_PATH, locale, true),
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

export default async function GoHyeonjuFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(GO_HYEONJU_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('고현주');
  const fullArtworks = allArtworks.filter((artwork: Artwork) => isGoHyeonjuArtist(artwork.artist));
  const ARTWORKS: ArtworkListItem[] = fullArtworks.map(
    ({ profile: _p, history: _h, profile_en: _pe, history_en: _he, ...rest }: Artwork) => rest
  );
  const artworkCountLabel = new Intl.NumberFormat(isEnglish ? 'en-US' : 'ko-KR').format(
    ARTWORKS.length
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: tBreadcrumbs('home'), url: buildLocaleUrl('/', locale) },
    { name: tBreadcrumbs('artworks'), url: buildLocaleUrl('/artworks', locale) },
    { name: isEnglish ? 'Go Hyeonju' : '고현주', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${GO_HYEONJU_PATH}#person-go-hyeonju`,
    name: isEnglish ? 'Go Hyeonju' : '고현주',
    alternateName: isEnglish ? '고현주' : 'Go Hyeonju',
    jobTitle: isEnglish ? 'Photographer' : '사진가',
    description: isEnglish
      ? 'Go Hyeonju (1964–2022) was a Korean photographer. Through 〈The Dreaming Camera〉 she taught photography to children at the Anyang Juvenile Reformatory, and through 《The Voice of Memory》 she recorded the memories of Jeju 4·3 survivors held in everyday objects and belongings.'
      : '고현주(1964–2022)는 한국의 사진가입니다. 〈꿈꾸는 카메라〉로 안양소년원 아이들에게 사진을 가르쳤고, 《기억의 목소리》로 제주 4·3 체험자의 기억을 유품과 사물에 담아 기록했습니다.',
    birthDate: '1964',
    deathDate: '2022',
    birthPlace: {
      '@type': 'Place',
      name: isEnglish ? 'Seogwipo, Jeju, South Korea' : '제주 서귀포',
    },
    knowsAbout: ['Documentary photography', 'Jeju 4·3 memory', 'Photography and healing'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    award: isEnglish ? 'The 8th Go Jeong-hui Award' : '제8회 고정희상',
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Go Hyeonju — SAF Online' : '고현주 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Go Hyeonju from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 고현주 작품들을 소개합니다.',
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
        {/* Hero Section — 빛으로 기록하다, 사진의 점광 모티프 */}
        <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-white/10 bg-charcoal">
          <div
            data-hero-sentinel="true"
            aria-hidden="true"
            className="absolute top-0 left-0 h-px w-px"
          />

          {/* 빛의 점들 — 사진의 빛, 기억의 등불 모티프 */}
          <div className="absolute top-16 left-12 w-2 h-2 bg-primary/40" aria-hidden="true" />
          <div className="absolute top-28 left-24 w-2 h-2 bg-white/15" aria-hidden="true" />
          <div className="absolute bottom-20 right-16 w-2 h-2 bg-primary/30" aria-hidden="true" />
          <div className="absolute bottom-32 right-32 w-2 h-2 bg-white/15" aria-hidden="true" />
          <div className="absolute top-1/2 right-12 w-2 h-2 bg-white/10" aria-hidden="true" />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block mb-8">
              <span className="inline-block px-6 py-3 border-l-4 border-primary bg-white text-charcoal font-bold text-lg tracking-widest shadow-xl">
                {isEnglish ? 'Go Hyeonju · 1964–2022' : '고현주 · 1964–2022'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black break-keep">
              {isEnglish ? (
                <>
                  Photographs that carry
                  <br />
                  <span className="text-primary-soft">hope and memory</span>
                </>
              ) : (
                <>
                  사진으로 전한
                  <br />
                  <span className="text-primary-soft">희망과 기억</span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">
                    She placed a camera in the hands of children, and hope in their gaze.
                  </span>
                  <span className="mt-2 block">
                    She held the memories of Jeju 4·3 in the objects people left behind.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">아이들의 손에 카메라를, 그 눈에 희망을 쥐여 주었다.</span>
                  <span className="mt-2 block">
                    제주 4·3의 기억을, 사람들이 남긴 사물에 담아 기록했다.
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
                    A camera turned toward —<br />
                    <span className="text-primary-strong">hope, healing, and testimony</span>
                  </>
                ) : (
                  <>
                    카메라가 향한 곳 —<br />
                    <span className="text-primary-strong">희망과 치유, 그리고 증언</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Go Hyeonju (1964–2022) was born in Seogwipo, Jeju. For her, photography was
                      never only a way of looking — it was a way of reaching toward people. She is
                      remembered for two bodies of work in which the camera became an instrument of
                      hope and of remembrance.
                    </p>
                    <p>
                      From 2008, she carried out{' '}
                      <strong className="font-bold text-charcoal-deep">
                        〈The Dreaming Camera〉
                      </strong>
                      , teaching children at the Anyang Juvenile Reformatory how to take
                      photographs. Rather than photographing the children herself, she put cameras
                      into their hands — so that they might frame their own world, and find in the
                      act of seeing a small return of hope. The project was gathered into a book of
                      the same title in 2012.
                    </p>
                    <p>
                      In 2016 she was given a diagnosis of cancer. Two years later, in 2018, she
                      began a new and final work: recording the memories of those who had lived
                      through <strong className="font-bold text-charcoal">Jeju 4·3</strong> — one of
                      the most painful chapters of Korea&apos;s modern history. Rather than
                      photographing the survivors directly, she photographed the objects steeped in
                      their memory: the belongings and everyday things in which a life, and a loss,
                      had settled.
                    </p>
                    <p>
                      That work became the book{' '}
                      <strong className="font-bold text-charcoal-deep">
                        《The Voice of Memory: Stories of Jeju 4·3 Steeped in Objects》
                      </strong>{' '}
                      (Munhakdongne, 2021), with text by the poet Heo Eun-sil. It received the 8th
                      Go Jeong-hui Award. Go Hyeonju passed away in 2022; the work she left remains
                      a quiet act of witness — proof that a photograph can hold both a person&apos;s
                      hope and a community&apos;s memory.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      고현주(1964–2022)는 제주 서귀포에서 태어났다. 그에게 사진은 단지 보는 방식이
                      아니라, 사람에게 다가가는 방식이었다. 그는 카메라가 희망의 도구이자 기억의
                      도구가 된 두 갈래의 작업으로 기억된다.
                    </p>
                    <p>
                      2008년부터 그는{' '}
                      <strong className="font-bold text-charcoal-deep">〈꿈꾸는 카메라〉</strong>를
                      이어 갔다. 안양소년원 아이들에게 사진 찍는 법을 가르치는 작업이었다. 그는
                      아이들을 찍는 대신, 아이들의 손에 카메라를 쥐여 주었다 — 스스로 자신의 세계를
                      프레임에 담고, 보는 행위 안에서 작은 희망을 되찾도록. 이 작업은 2012년 같은
                      제목의 책으로 묶였다.
                    </p>
                    <p>
                      2016년, 그는 암 선고를 받았다. 2년 뒤인 2018년, 그는 새로운, 그리고 마지막이
                      된 작업을 시작했다. 한국 현대사의 가장 아픈 장면 중 하나인{' '}
                      <strong className="font-bold text-charcoal">제주 4·3</strong>을 겪은 이들의
                      기억을 기록하는 일이었다. 그는 체험자를 직접 찍는 대신, 그들의 기억이 스민
                      사물을 찍었다 — 한 사람의 삶과 상실이 내려앉은 유품과 일상의 물건들을.
                    </p>
                    <p>
                      그 작업은 시인 허은실이 글을 쓴 책{' '}
                      <strong className="font-bold text-charcoal-deep">
                        《기억의 목소리: 사물에 스민 제주 4·3 이야기》
                      </strong>
                      (문학동네, 2021)로 출간되었고, 제8회 고정희상을 받았다. 고현주는 2022년 세상을
                      떠났다. 그가 남긴 작업은 조용한 증언으로 남아 있다 — 한 장의 사진이 한 사람의
                      희망과 한 공동체의 기억을 함께 담을 수 있음을 보여주는.
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
                        {isEnglish ? 'The dreaming camera' : '꿈꾸는 카메라'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Placing cameras in children’s hands at the Anyang Juvenile Reformatory — photography as a means of returning hope.'
                          : '안양소년원 아이들의 손에 카메라를 쥐여 주는 일 — 희망을 되돌려 주는 수단으로서의 사진.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The voice of memory' : '기억의 목소리'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'The memory of Jeju 4·3, held not in portraits of survivors but in the objects and belongings they left behind.'
                          : '제주 4·3의 기억을, 체험자의 초상이 아니라 그들이 남긴 사물과 유품에 담아 기록하다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Photography and healing' : '사진과 치유'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'A practice that turned the camera toward others — toward hope, toward remembrance, toward the work of mending.'
                          : '카메라를 타인에게로 돌린 작업 — 희망으로, 기억으로, 보듬는 일로 향한 사진.'}
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
                      1964
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Born in Seogwipo, Jeju.' : '제주 서귀포 출생.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2008–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins 〈The Dreaming Camera〉, teaching photography to children at the Anyang Juvenile Reformatory.'
                        : '〈꿈꾸는 카메라〉 시작 — 안양소년원 아이들에게 사진 찍기를 가르치다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2012
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The 〈Dreaming Camera〉 project is published as a book of the same title.'
                        : '〈꿈꾸는 카메라〉 작업이 같은 제목의 책으로 출간되다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2016
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Receives a diagnosis of cancer; continues her photographic work.'
                        : '암 선고를 받다. 사진 작업을 이어 가다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Begins recording the memories of Jeju 4·3 survivors through their belongings and everyday objects.'
                        : '제주 4·3 체험자의 기억을 유품과 사물에 담아 기록하는 작업을 시작하다.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Voice of Memory: Stories of Jeju 4·3 Steeped in Objects》 (Munhakdongne), with text by Heo Eun-sil, is published; receives the 8th Go Jeong-hui Award.'
                        : '《기억의 목소리: 사물에 스민 제주 4·3 이야기》(문학동네, 허은실 글) 출간; 제8회 고정희상 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2022
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish ? 'Passed away.' : '별세.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(33,118,255,0.18)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected works & recognition' : '주요 작업 및 수상'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '〈The Dreaming Camera〉 (2008–), a photography project with children at the Anyang Juvenile Reformatory; published as a book in 2012'
                        : '〈꿈꾸는 카메라〉(2008–) — 안양소년원 아이들과 함께한 사진 작업; 2012년 단행본 출간'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? '《The Voice of Memory: Stories of Jeju 4·3 Steeped in Objects》 (Munhakdongne, 2021), with text by the poet Heo Eun-sil'
                        : '《기억의 목소리: 사물에 스민 제주 4·3 이야기》(문학동네, 2021) — 시인 허은실 글'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'The 8th Go Jeong-hui Award — an award honouring women active in the arts and culture'
                        : '제8회 고정희상 수상 — 여성 문화예술인에게 주는 상'}
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
                  <span className="text-charcoal-deep">on the work and what it carried</span>
                </>
              ) : (
                <>
                  두 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">작업과 그것이 담아낸 것에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 꿈꾸는 카메라 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The dreaming camera — a lens placed in young hands'
                    : '꿈꾸는 카메라 — 어린 손에 쥐여 준 렌즈'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        From 2008, Go Hyeonju went, again and again, to the Anyang Juvenile
                        Reformatory. She did not go to photograph the children there. She went to
                        teach them to photograph. The distinction matters: to be photographed is to
                        be looked at; to photograph is to look. She wanted to give the children the
                        second of these — the position of the one who sees, who chooses, who decides
                        what is worth keeping.
                      </p>
                      <p>
                        〈The Dreaming Camera〉 was the name she gave the work. A camera in a young
                        person&apos;s hands becomes a small machine for paying attention — to a
                        corner of light, a friend&apos;s face, an ordinary afternoon. In learning to
                        frame the world, the children practised a quiet form of agency, and the act
                        of looking returned to them a measure of hope. In 2012 the project was
                        gathered into a book of the same title, so that what the children had seen
                        could be seen by others.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        2008년부터 고현주는 안양소년원으로 거듭 향했다. 그는 그곳의 아이들을 찍으러
                        간 것이 아니었다. 아이들에게 사진 찍는 법을 가르치러 갔다. 이 차이는
                        중요하다. 찍히는 것은 바라봄을 당하는 일이고, 찍는 것은 바라보는 일이다.
                        그는 아이들에게 후자를 — 보는 자, 고르는 자, 무엇을 간직할지 정하는 자의
                        자리를 — 주고 싶어 했다.
                      </p>
                      <p>
                        그가 이 작업에 붙인 이름이 〈꿈꾸는 카메라〉였다. 어린 손에 쥐어진 카메라는
                        주의를 기울이는 작은 기계가 된다 — 한 줌의 빛, 친구의 얼굴, 평범한 오후를
                        향해. 세계를 프레임에 담는 법을 익히며 아이들은 조용한 형태의 주체성을
                        연습했고, 보는 행위는 그들에게 얼마간의 희망을 되돌려 주었다. 2012년 이
                        작업은 같은 제목의 책으로 묶여, 아이들이 본 것을 다른 이들도 볼 수 있게
                        되었다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 기억의 목소리 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'The voice of memory — Jeju 4·3, held in objects'
                    : '기억의 목소리 — 사물에 담긴 제주 4·3'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Jeju 4·3 is among the most painful chapters of modern Korean history — a
                        long period of violence and loss endured by the people of the island, and
                        for many years a subject that could not be openly spoken of. To photograph
                        it is to approach something that resists the camera: a memory carried by
                        those who lived through it, much of it now beyond the reach of a single
                        image.
                      </p>
                      <p>
                        Beginning in 2018, after her 2016 diagnosis, Go Hyeonju found a way to give
                        that memory a form. Rather than turning the lens on the survivors, she
                        turned it on the things they had kept: a worn garment, a spoon, a sewing
                        machine, a chest — ordinary objects in which a life, and a grief, had
                        quietly settled. An object outlives the moment that gave it meaning; it
                        carries memory the way a vessel carries water.
                      </p>
                      <p>
                        The work became the book{' '}
                        <strong className="font-bold text-charcoal-deep">
                          《The Voice of Memory: Stories of Jeju 4·3 Steeped in Objects》
                        </strong>{' '}
                        (Munhakdongne, 2021), her photographs set alongside text by the poet Heo
                        Eun-sil, and was honoured with the 8th Go Jeong-hui Award. Approached not as
                        argument but as remembrance, it lets the objects speak — quietly, and on
                        behalf of those who can no longer.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        제주 4·3은 한국 현대사의 가장 아픈 장면 중 하나다 — 섬의 사람들이 견뎌낸 긴
                        폭력과 상실의 시간이며, 오랜 세월 동안 드러내어 말할 수 없던 주제였다.
                        그것을 사진으로 담는다는 것은 카메라에 좀처럼 잡히지 않는 무언가에 다가서는
                        일이다. 겪은 이들이 품어 온 기억은, 그 많은 부분이 이미 한 장의 이미지가
                        닿을 수 없는 곳에 있다.
                      </p>
                      <p>
                        2016년 암 선고 이후, 2018년부터 고현주는 그 기억에 형태를 부여하는 방법을
                        찾아냈다. 그는 렌즈를 체험자에게 돌리는 대신, 그들이 간직해 온 사물에 돌렸다
                        — 닳은 저고리, 숟가락, 재봉틀, 궤짝 같은, 한 사람의 삶과 슬픔이 조용히
                        내려앉은 평범한 물건들에. 사물은 그 의미를 낳은 순간보다 오래 살아남아,
                        그릇이 물을 담듯 기억을 담는다.
                      </p>
                      <p>
                        이 작업은 시인 허은실의 글과 나란히 놓인 책{' '}
                        <strong className="font-bold text-charcoal-deep">
                          《기억의 목소리: 사물에 스민 제주 4·3 이야기》
                        </strong>
                        (문학동네, 2021)로 출간되었고, 제8회 고정희상을 받았다. 주장이 아니라 추모로
                        다가선 이 작업은 사물이 말하게 한다 — 조용히, 그리고 더 이상 말할 수 없는
                        이들을 대신하여.
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
                      Between a child&apos;s first photograph and an old object that still holds a
                      memory, Go Hyeonju built a body of work about what photography can do for
                      others — return hope to one person, keep faith with another&apos;s loss. Her
                      work joins this campaign in solidarity with fellow artists, so that those who
                      come after might keep working — and keep the light on, one frame at a time.
                    </>
                  ) : (
                    <>
                      한 아이의 첫 사진과, 여전히 기억을 품은 오래된 사물 사이에서, 고현주는 사진이
                      타인을 위해 할 수 있는 일에 관한 작업을 쌓아 왔다 — 한 사람에게 희망을 되돌려
                      주고, 다른 한 사람의 상실에 신의를 지키는 일. 그의 작업은 동료 예술인과의
                      연대의 뜻으로 씨앗페에 함께한다 — 다음 세대의 예술인들이 계속 일할 수 있도록,
                      그리고 한 프레임씩, 불을 밝혀 둘 수 있도록.
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
                MEMORY
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Go Hyeonju</span>
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
                    Go Hyeonju spent her life turning the camera toward others — toward hope and
                    remembrance. Her work joins this campaign in that same spirit of solidarity.
                    Every work sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    고현주 작가는 평생 카메라를 타인에게로 — 희망과 기억으로 — 돌려 온 작가입니다.
                    그의 작업은 같은 연대의 뜻으로 씨앗페에 함께합니다. 작품 판매 수익은 전액{' '}
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
                returnTo={GO_HYEONJU_PATH}
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
