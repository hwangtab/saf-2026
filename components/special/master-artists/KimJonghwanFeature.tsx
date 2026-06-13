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

// 거장 작가 feature는 작가 페이지(/artworks/artist/김종환)에서 dispatch되어 렌더된다.
// canonical/og/breadcrumb 모두 작가 페이지 URL을 가리켜 SEO 신호를 작가 페이지로 통합.
const KIM_JONGHWAN_PATH = `/artworks/artist/${encodeURIComponent('김종환')}`;

const KIM_JONGHWAN_ARTIST_KEYS = new Set(['김종환', 'kim jong-hwan', 'kim jonghwan']);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isKimJonghwanArtist = (artist: string): boolean => {
  if (!artist) return false;
  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);
  return (
    KIM_JONGHWAN_ARTIST_KEYS.has(normalized) || compact === '김종환' || compact === 'kimjonghwan'
  );
};

const PAGE_COPY = {
  ko: {
    title: '김종환 — 판화와 그림책 사이',
    description:
      '판화가 김종환. 판화공방 〈판화방〉을 운영하며 새기고 찍는 손의 노동을 이어온 중견 판화가이자, 《반쪽이》·《홍길동》 등 옛이야기 그림책의 삽화가. 판을 새기다 — 판화와 그림책 사이, 김종환의 작품을 씨앗페 온라인에서 감상하고 소장하세요.',
    ogDescription:
      '판화가 김종환. 판화공방 〈판화방〉을 운영하며 새김과 찍음의 물성을 이어온 중견 판화가이자, 옛이야기 그림책의 삽화가.',
    ogAlt: '김종환 대표 작품',
    twitterTitle: '김종환',
    twitterDescription: '판을 새기다 — 판화와 그림책 사이의 판화가 김종환',
  },
  en: {
    title: 'Kim Jong-hwan — Between Prints and Picture Books',
    description:
      'Selected works by printmaker Kim Jong-hwan. A mid-career printmaker who runs the printmaking studio 〈Panhwabang〉, carrying on the physical labour of carving and pressing, and an illustrator of folk-tale picture books. View and collect his works at SAF Online.',
    ogDescription:
      'Kim Jong-hwan — a mid-career printmaker who runs the studio 〈Panhwabang〉, devoted to the materiality of carving and pressing, and an illustrator of folk-tale picture books.',
    ogAlt: 'Kim Jong-hwan — featured work',
    twitterTitle: 'Kim Jong-hwan',
    twitterDescription: 'Carving the block — a printmaker between prints and picture books',
  },
} as const;

export async function buildKimJonghwanMetadata({
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
  const pageUrl = buildLocaleUrl(KIM_JONGHWAN_PATH, locale);

  const allArtworks = await getSupabaseArtworksByArtist('김종환');
  const artwork = allArtworks.find((a) => isKimJonghwanArtist(a.artist) && a.images[0]);
  const ogImageUrl = artwork?.images[0]
    ? resolveSeoArtworkImageUrl(artwork.images[0])
    : OG_IMAGE.url;
  const ogImageAlt = artwork
    ? locale === 'en'
      ? `${artwork.title_en || artwork.title} — Kim Jong-hwan`
      : `${artwork.title} — 김종환`
    : copy.ogAlt;

  return {
    title: { absolute: copy.title },
    description: copy.description,
    keywords:
      locale === 'en'
        ? 'Kim Jong-hwan artist, Korean printmaking, woodblock prints, silkscreen, picture book illustration, Panhwabang'
        : '김종환 판화가, 판화방, 한국 판화, 실크스크린, 그림책 삽화, 반쪽이, 씨앗페 온라인',
    alternates: createLocaleAlternates(KIM_JONGHWAN_PATH, locale, true),
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

export default async function KimJonghwanFeature({
  params,
}: {
  params: Promise<{ locale: string; artist: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const isEnglish = locale === 'en';
  const pageUrl = buildLocaleUrl(KIM_JONGHWAN_PATH, locale);
  const tBreadcrumbs = await getTranslations({ locale, namespace: 'breadcrumbs' });

  const allArtworks = await getSupabaseArtworksByArtist('김종환');
  const fullArtworks = allArtworks.filter((artwork: Artwork) =>
    isKimJonghwanArtist(artwork.artist)
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
    { name: isEnglish ? 'Kim Jong-hwan' : '김종환', url: pageUrl },
  ]);

  const artistPerson = {
    '@type': 'Person',
    '@id': `${SITE_URL}${KIM_JONGHWAN_PATH}#person-kim-jonghwan`,
    name: isEnglish ? 'Kim Jong-hwan' : '김종환',
    alternateName: isEnglish ? '김종환' : 'Kim Jong-hwan',
    jobTitle: isEnglish ? 'Printmaker' : '판화가',
    description: isEnglish
      ? 'Kim Jong-hwan is a mid-career Korean printmaker who runs the printmaking studio 〈Panhwabang〉 and also works as an illustrator of folk-tale picture books.'
      : '김종환은 판화공방 〈판화방〉을 운영하는 중견 판화가이며, 옛이야기 그림책의 삽화가로도 활동합니다.',
    affiliation: [
      {
        '@type': 'Organization',
        name: isEnglish ? 'Korea Contemporary Printmakers Association' : '한국현대판화가협회',
      },
      {
        '@type': 'Organization',
        name: isEnglish ? 'Hongik Printmakers Association' : '홍익판화가협회',
      },
    ],
    knowsAbout: ['Printmaking', 'Silkscreen', 'Picture book illustration'],
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
  };

  const exhibitionEventSchema = {
    '@context': 'https://schema.org',
    '@type': 'ExhibitionEvent',
    name: isEnglish ? 'Kim Jong-hwan — SAF Online' : '김종환 — 씨앗페 온라인',
    description: isEnglish
      ? 'Selected works by Kim Jong-hwan from the SAF Online collection.'
      : '씨앗페 온라인에 소장된 김종환 작품들을 소개합니다.',
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
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="inline-block relative mb-8">
              <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
                {isEnglish ? 'Kim Jong-hwan · Printmaker' : '김종환 · 판화가'}
              </span>
              <div className="absolute inset-0 border-4 border-primary transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-tight text-white tracking-tighter text-balance drop-shadow-sm font-display font-black">
              {isEnglish ? (
                <>
                  Carving
                  <br />
                  the Block
                </>
              ) : (
                <>
                  판을
                  <br />
                  <span className="relative inline-block px-2">
                    <span className="relative z-10 text-primary-soft">새기다</span>
                    <span className="absolute bottom-2 left-0 w-full h-4 bg-white/15 -z-0 -rotate-1" />
                  </span>
                </>
              )}
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed break-keep border-t-2 border-b-2 border-white/20 py-5 md:py-6">
              {isEnglish ? (
                <>
                  <span className="block">A blade on wood. A press on paper. An old tale.</span>
                  <span className="mt-2 block">
                    Kim Jong-hwan works between the printmaking studio and the picture book.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">나무 위의 칼. 종이 위의 압인. 옛이야기 하나.</span>
                  <span className="mt-2 block">
                    김종환은 판화공방과 그림책 사이에서 손으로 새기고 찍습니다.
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="absolute top-0 left-0 w-32 h-32 border-l-[12px] border-t-[12px] border-white/15" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-r-[12px] border-b-[12px] border-white/15" />
          <div className="absolute top-1/2 left-4 w-4 h-4 rounded-full bg-primary opacity-40" />
          <div className="absolute top-1/3 right-8 w-6 h-6 rounded-full bg-white opacity-10" />
        </section>

        <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
          {/* Bio / Narrative Section */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 mb-16 items-start">
            <div className="space-y-8">
              <h2 className="text-4xl border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-bold font-display text-balance">
                {isEnglish ? (
                  <>
                    The hand that carves —<br />
                    <span className="text-primary-strong">prints and old tales</span>
                  </>
                ) : (
                  <>
                    새기는 손 —<br />
                    <span className="text-primary-strong">판화와 옛이야기 사이</span>
                  </>
                )}
              </h2>
              <div className="text-xl leading-[1.8] text-charcoal space-y-6 font-medium">
                {isEnglish ? (
                  <>
                    <p>
                      Kim Jong-hwan studied printmaking at university and has built his practice
                      around the physical labour of the medium — carving the block, inking the
                      surface, pressing the image onto paper. Today he runs his own printmaking
                      studio, 〈Panhwabang〉, where the craft is kept as a daily discipline rather
                      than an occasional gesture.
                    </p>
                    <p>
                      He is a member of the Korea Contemporary Printmakers Association and the
                      Hongik Printmakers Association, and previously taught at Kaywon University of
                      Art &amp; Design and the affiliated Kaywon School of Arts. His work moves
                      across the printmaking disciplines — including silkscreen, the medium of the
                      EBS-sponsored workshops he led in 2024.
                    </p>
                    <p>
                      Alongside the studio practice runs a second body of work that has reached far
                      more readers than any gallery could:{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        picture-book illustration
                      </strong>
                      . He has illustrated retellings of Korean and East Asian tales —{' '}
                      <em>Banjjogi</em> (반쪽이), <em>The Goblins&apos; Wrestling Feast</em>
                      (도깨비 씨름 잔치), <em>Hong Gil-dong</em> (홍길동), <em>Han Feizi</em>
                      (한비자), <em>The +−×÷ Magic Show</em> (+-*/마술쇼),{' '}
                      <em>Joseon&apos;s Dream Held in Hanyang</em> (한양에 담긴 조선의 꿈), and{' '}
                      <em>The Golden Dragon and the Rainbow</em> (황금용과 무지개), among others —
                      as well as numerous illustrations for monthly magazines.
                    </p>
                    <p>
                      Between these two practices lies a single sensibility:{' '}
                      <strong className="font-bold text-charcoal">
                        the warmth of the carved line
                      </strong>
                      . The same hand that cuts a printing block cuts the figures of an old tale —
                      Banjjogi, Hong Gil-dong, a goblin at a wrestling match. Labour and story,
                      blade and paper, held together in one craft.
                    </p>
                    <p>
                      In 2017 he published a guide to the medium,{' '}
                      <em>
                        Everyday Printmaking — It&apos;s Okay Even If It&apos;s Your First Time
                      </em>{' '}
                      (매일판화 처음이어도 괜찮아, The Difference), and in 2003 released a print
                      collection of his own work — extending, in book form, the patient teaching
                      that his studio carries on in person.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      김종환은 대학에서 판화를 전공하고, 새기고 찍는 매체의 물성을 중심으로 작업을
                      이어온 중견 판화가입니다. 판을 새기고, 표면에 잉크를 올리고, 종이에 압인하는
                      손의 노동. 현재 그는 자신의 판화공방 〈판화방〉을 운영하며, 판화를 가끔의
                      몸짓이 아닌 매일의 규율로 지켜갑니다.
                    </p>
                    <p>
                      그는 한국현대판화가협회와 홍익판화가협회 회원이며, 이전에는 계원예술대학교와
                      계원예술학교에 출강했습니다. 그의 작업은 판화의 여러 기법을 넘나듭니다 —
                      2024년 EBS 협찬으로 세 차례 진행한 워크샵의 매체였던 실크스크린을 포함해서.
                    </p>
                    <p>
                      공방 작업과 나란히, 갤러리보다 훨씬 더 많은 독자에게 가닿은 또 하나의 작업이
                      있습니다.{' '}
                      <strong className="font-bold text-charcoal-deep border-b-2 border-charcoal-deep">
                        그림책 삽화
                      </strong>
                      입니다. 그는 한국과 동아시아 옛이야기의 다시쓰기에 그림을 그렸습니다 —
                      《반쪽이》, 《도깨비 씨름 잔치》, 《홍길동》, 《한비자》, 《+-*/마술쇼》,
                      《한양에 담긴 조선의 꿈》, 《황금용과 무지개》 등 — 그리고 월간지 삽화도 다수
                      맡았습니다.
                    </p>
                    <p>
                      두 작업 사이에는 하나의 감각이 흐릅니다.{' '}
                      <strong className="font-bold text-charcoal">새긴 선의 따뜻함</strong>
                      입니다. 판을 새기는 손이 곧 옛이야기의 인물을 새깁니다 — 반쪽이, 홍길동,
                      씨름판의 도깨비. 노동과 이야기, 칼과 종이가 하나의 손작업 안에 함께 있습니다.
                    </p>
                    <p>
                      2017년에는 전공서 《매일판화 처음이어도 괜찮아》(더디퍼런스)를 펴냈고,
                      2003년에는 자신의 작업을 묶은 김종환 판화집을 발간했습니다 — 공방이 직접
                      이어가는 인내심 있는 가르침을, 책의 형태로 펼친 것입니다.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]">
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
                        {isEnglish ? 'The materiality of carving' : '새김과 찍음의 물성'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Blade on wood, ink on surface, press on paper — the print as a record of the hand at work.'
                          : '나무 위의 칼, 표면의 잉크, 종이의 압인 — 판화는 일하는 손의 기록입니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      2
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'Old tales and picture books' : '옛이야기와 그림책'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Banjjogi, Hong Gil-dong, a wrestling goblin — folk tales carried into children’s books by the same carving hand.'
                          : '반쪽이, 홍길동, 씨름판의 도깨비 — 같은 새김의 손이 옛이야기를 그림책으로 옮깁니다.'}
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6 items-start group">
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                      3
                    </span>
                    <div>
                      <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-primary-strong transition-colors">
                        {isEnglish ? 'The studio as discipline' : '공방이라는 규율'}
                      </h4>
                      <p className="text-charcoal leading-relaxed text-lg">
                        {isEnglish
                          ? 'Running 〈Panhwabang〉 and teaching the medium — printmaking kept as a daily, shared practice.'
                          : '〈판화방〉을 운영하고 매체를 가르치며, 판화를 매일의 함께하는 작업으로 지켜갑니다.'}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-charcoal rotate-45" />
                  {isEnglish ? "The artist's path" : '작가의 길'}
                </h3>
                <ol className="space-y-4">
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2003
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publishes a print collection of his own work (김종환 판화집).'
                        : '김종환 판화집 발간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2004
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'First solo print exhibition 〈Memory of the King〉, Mac Gallery, Cheongdam, Seoul. Receives the "Lee Sang-uk Prize" at the Korea Contemporary Print Competition.'
                        : '첫 판화 개인전 〈왕의 추억〉, 청담 맥갤러리(서울). 한국현대판화공모전 ‘이상욱상’ 수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2005
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Grand Prize in the print category, Danwon Art Competition; Excellence Prize in the print category, Haengju Art Competition.'
                        : '단원미술대전 판화부문 최우수상; 행주미술대전 판화부문 우수상.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2006
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibition 〈Metamorphosis Episode〉, Alternative Space Loop, Seoul.'
                        : '개인전 〈변신 에피소드〉, 대안공간 루프(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2007
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Participates in the Seoul Art Exhibition — Printmaking, Seoul Museum of Art.'
                        : '서울미술대전-판화 참여, 서울시립미술관.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2017
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Publishes the guidebook 《Everyday Printmaking — It’s Okay Even If It’s Your First Time》 (The Difference).'
                        : '전공서 《매일판화 처음이어도 괜찮아》(더디퍼런스) 출간.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2018
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Third solo exhibition 〈Right and Wrong〉, Moon Fragment Gallery, Seoul.'
                        : '세 번째 개인전 〈옳고 그른〉, 문 프래그먼트 갤러리(서울).'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2021–
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions 〈Post-Print 2021〉 (Kim Hee-soo Art Center), 〈Meta-Print 2022〉 (Hongik Museum of Contemporary Art), and the Hongik Printmakers Exhibition (Total Museum, 2023).'
                        : '단체기획전 〈포스트프린트2021〉(김희수아트센터), 〈메타프린트2022〉(홍익대 현대미술관), 홍익판화가전(토탈미술관, 2023) 참여.'}
                    </span>
                  </li>
                  <li className="flex gap-5 items-baseline">
                    <span className="shrink-0 font-bold text-charcoal-muted text-base tabular-nums w-14">
                      2024
                    </span>
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Leads three EBS-sponsored silkscreen workshops; continues running the printmaking studio 〈Panhwabang〉.'
                        : 'EBS 협찬 실크스크린 워크샵 3회 진행; 판화공방 〈판화방〉 운영 지속.'}
                    </span>
                  </li>
                </ol>
              </div>

              <div className="bg-canvas-strong p-7 md:p-9 border-4 border-charcoal shadow-[6px_6px_0px_0px_rgba(49,57,60,0.12)]">
                <h3 className="text-xl md:text-2xl text-charcoal mb-6 flex items-center gap-3 border-b-2 border-charcoal pb-3 font-bold font-display text-balance">
                  <span className="w-3 h-3 bg-primary rotate-45" />
                  {isEnglish ? 'Selected exhibitions & collections' : '주요 전시 및 소장'}
                </h3>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Solo exhibitions: 〈Memory of the King〉, Mac Gallery (2004); 〈Metamorphosis Episode〉, Alternative Space Loop (2006); 〈Right and Wrong〉, Moon Fragment Gallery (2018)'
                        : '개인전: 〈왕의 추억〉 청담 맥갤러리(2004); 〈변신 에피소드〉 대안공간 루프(2006); 〈옳고 그른〉 문 프래그먼트 갤러리(2018)'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Group exhibitions: 〈Post-Print 2021〉 (Kim Hee-soo Art Center); 〈Meta-Print 2022〉, Korea Contemporary Printmakers Association (Hongik Museum of Contemporary Art); Hongik Printmakers Exhibition (Total Museum, 2023); 2018 60 Years of Korean Contemporary Printmaking — Making Prints (Gyeonggi Museum of Modern Art); Korea–China Print Exchange (Lu Xun Academy, China)'
                        : '단체기획전: 〈포스트프린트2021〉(김희수아트센터); 한국현대판화가협회전 〈메타프린트2022〉(홍익대 현대미술관); 홍익판화가전(토탈미술관, 2023); 2018 한국현대판화60년-판화하다(경기도미술관); 한중판화교류전(노신대학교, 중국) 등'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-primary rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Collections: Daelim Warehouse Gallery; Art Space Hue; Ansan Migrant Workers Support Center'
                        : '소장: 대림창고갤러리; 아트스페이스 휴; 안산외국인산업지원센터'}
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="shrink-0 mt-[5px] w-2 h-2 bg-charcoal rotate-45" />
                    <span className="text-charcoal text-base leading-snug break-keep">
                      {isEnglish
                        ? 'Awards: "Lee Sang-uk Prize", Korea Contemporary Print Competition (2004); Grand Prize, print category, Danwon Art Competition (2005); Excellence Prize, print category, Haengju Art Competition'
                        : '수상: 한국현대판화공모전 ‘이상욱상’(2004); 단원미술대전 판화부문 최우수상(2005); 행주미술대전 판화부문 우수상'}
                    </span>
                  </li>
                </ul>
                <div className="mt-5 border-t border-charcoal/15 pt-4 space-y-2">
                  <p className="text-sm font-bold text-charcoal break-keep">
                    {isEnglish ? '✦ Books illustrated' : '✦ 그린 책 (삽화)'}
                  </p>
                  <p className="text-sm text-charcoal-muted break-keep">
                    {isEnglish
                      ? 'Banjjogi (반쪽이), The Goblins’ Wrestling Feast (도깨비 씨름 잔치), Hong Gil-dong (홍길동), Han Feizi (한비자), The +−×÷ Magic Show (+-*/마술쇼), Joseon’s Dream Held in Hanyang (한양에 담긴 조선의 꿈), The Golden Dragon and the Rainbow (황금용과 무지개), and others — plus numerous monthly-magazine illustrations.'
                      : '《반쪽이》, 《도깨비 씨름 잔치》, 《홍길동》, 《한비자》, 《+-*/마술쇼》, 《한양에 담긴 조선의 꿈》, 《황금용과 무지개》 등 — 월간지 삽화 다수.'}
                  </p>
                </div>
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
                  <span className="text-charcoal-deep">on the block, the tale, and the studio</span>
                </>
              ) : (
                <>
                  세 편의 에세이 —
                  <br />
                  <span className="text-charcoal-deep">판과 이야기와 공방에 관하여</span>
                </>
              )}
            </h2>

            <div className="space-y-10">
              {/* 1. 새김의 물성 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    1
                  </span>
                  {isEnglish
                    ? 'The materiality of the cut — why printmaking'
                    : '새김의 물성 — 왜 판화인가'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Jong-hwan studied printmaking at university, and the choice of medium
                        has shaped everything that followed. A print is not painted but made: a
                        matrix is carved or prepared, ink is applied, and the image is pressed onto
                        paper under pressure. Each step is a physical act, a negotiation between
                        hand and material — and it is this labour, rather than any single subject,
                        that sits at the centre of his practice.
                      </p>
                      <p>
                        His work moves across the disciplines of the medium. The silkscreen
                        workshops he led in 2024, sponsored by EBS, point to a printmaker fluent in
                        more than one technique — and willing to teach it. For Kim, the value of the
                        print lies partly in its reproducibility and partly in its directness: the
                        carved line carries the trace of the tool that made it.
                      </p>
                      <p>
                        His early solo exhibitions — 〈Memory of the King〉 (2004), 〈Metamorphosis
                        Episode〉 (2006) — and the awards that accompanied them (the Lee Sang-uk
                        Prize, the Danwon Grand Prize in printmaking) mark a practitioner committed
                        to the print as a serious, sustained discipline rather than a reproductive
                        afterthought.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김종환은 대학에서 판화를 전공했고, 그 매체의 선택이 이후의 모든 것을
                        형성했습니다. 판화는 그려지는 것이 아니라 만들어집니다. 판을 새기거나
                        준비하고, 잉크를 올리고, 압력으로 종이에 찍습니다. 각 단계는 손과 재료
                        사이의 협상이자 물리적 행위입니다 — 그리고 어떤 단일한 주제가 아니라 바로 이
                        노동이 그의 작업 한가운데 있습니다.
                      </p>
                      <p>
                        그의 작업은 판화의 여러 기법을 넘나듭니다. 2024년 EBS 협찬으로 진행한
                        실크스크린 워크샵은, 한 가지 이상의 기법에 능하고 그것을 기꺼이 가르치는
                        판화가를 가리킵니다. 김종환에게 판화의 가치는 한편으로 복수성에, 한편으로
                        직접성에 있습니다 — 새긴 선은 그것을 만든 도구의 흔적을 품습니다.
                      </p>
                      <p>
                        초기 개인전 〈왕의 추억〉(2004), 〈변신 에피소드〉(2006)와 그에 따른
                        수상들(이상욱상, 단원미술대전 판화부문 최우수상)은, 판화를 복제의 부산물이
                        아니라 진지하고 지속적인 규율로 대하는 작가를 보여줍니다.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 옛이야기와 그림책 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    2
                  </span>
                  {isEnglish
                    ? 'Old tales — the illustrator’s second practice'
                    : '옛이야기 — 삽화가의 또 다른 작업'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Running parallel to the studio is a body of work that has reached many more
                        readers than any exhibition: picture-book illustration. Kim has drawn the
                        figures of Korean and East Asian folk tales — <em>Banjjogi</em> (반쪽이),{' '}
                        <em>The Goblins&apos; Wrestling Feast</em> (도깨비 씨름 잔치),{' '}
                        <em>Hong Gil-dong</em> (홍길동), <em>Han Feizi</em> (한비자) — bringing the
                        carving hand into the world of children&apos;s books.
                      </p>
                      <p>
                        The continuity between the two practices is the point. The same attention
                        that shapes a printing block shapes a goblin at a wrestling match or the
                        split figure of Banjjogi. His illustrated titles range across registers —
                        from the playful arithmetic of <em>The +−×÷ Magic Show</em> (+-*/마술쇼) to
                        historical retellings like <em>Joseon&apos;s Dream Held in Hanyang</em>
                        (한양에 담긴 조선의 꿈) and <em>The Golden Dragon and the Rainbow</em>
                        (황금용과 무지개) — alongside numerous monthly-magazine illustrations.
                      </p>
                      <p>
                        This is the warm side of the carved line. Where the studio is discipline,
                        the picture book is story; and in Kim&apos;s hands the two are made from the
                        same gesture — looking carefully enough at a figure, an old tale, a moment,
                        that it becomes worth committing to a printed page.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        공방과 나란히, 어떤 전시보다 훨씬 더 많은 독자에게 가닿은 작업이 있습니다.
                        그림책 삽화입니다. 김종환은 한국과 동아시아 옛이야기의 인물을 그렸습니다 —
                        《반쪽이》, 《도깨비 씨름 잔치》, 《홍길동》, 《한비자》 — 새기는 손을
                        어린이책의 세계로 데려갔습니다.
                      </p>
                      <p>
                        두 작업 사이의 연속성이 핵심입니다. 판을 빚는 같은 주의가, 씨름판의 도깨비나
                        반쪽이의 갈라진 형상을 빚습니다. 그가 그린 책들은 결이 다양합니다 —
                        《+-*/마술쇼》의 짓궂은 셈에서, 《한양에 담긴 조선의 꿈》과 《황금용과
                        무지개》 같은 역사·이야기의 다시쓰기까지 — 여기에 월간지 삽화도 다수.
                      </p>
                      <p>
                        이것이 새긴 선의 따뜻한 면입니다. 공방이 규율이라면 그림책은 이야기이고,
                        김종환의 손에서 둘은 같은 몸짓에서 나옵니다 — 한 인물, 한 옛이야기, 한
                        순간을, 인쇄된 한 페이지에 옮길 만큼 주의 깊게 바라보는 일.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 3. 판화방 — 공방이라는 작업 방식 */}
              <div>
                <h3 className="text-xl font-bold font-display text-charcoal-deep mb-4 flex items-center gap-3 border-b border-charcoal/20 pb-3">
                  <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-charcoal text-white text-sm font-bold">
                    3
                  </span>
                  {isEnglish
                    ? '〈Panhwabang〉 — the studio as a way of working'
                    : '〈판화방〉 — 공방이라는 작업 방식'}
                </h3>
                <div className="text-lg leading-[1.85] text-charcoal space-y-4 break-keep">
                  {isEnglish ? (
                    <>
                      <p>
                        Kim Jong-hwan runs his own printmaking studio, 〈Panhwabang〉. The name —
                        literally &ldquo;the print room&rdquo; — describes both a place and a way of
                        working: a space where the equipment, the blocks, and the patient repetition
                        of the medium are kept available, day after day.
                      </p>
                      <p>
                        Teaching has been part of that life. A member of the Korea Contemporary
                        Printmakers Association and the Hongik Printmakers Association, Kim
                        previously taught at Kaywon University of Art &amp; Design and the
                        affiliated Kaywon School of Arts, and in 2024 led three silkscreen workshops
                        sponsored by EBS. His 2017 guidebook,{' '}
                        <em>
                          Everyday Printmaking — It&apos;s Okay Even If It&apos;s Your First Time
                        </em>
                        , extends the studio&apos;s spirit onto the page: printmaking framed not as
                        a rarefied skill but as a daily practice open to anyone willing to begin.
                      </p>
                      <p>
                        His works have entered collections including the Daelim Warehouse Gallery,
                        Art Space Hue, and the Ansan Migrant Workers Support Center — the last a
                        reminder that, for Kim, the print remains a medium close to ordinary life
                        and shared labour. The studio is not a retreat from the world but a place
                        where the craft is kept open to it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        김종환은 자신의 판화공방 〈판화방〉을 운영합니다. 말 그대로 &lsquo;판화의
                        방&rsquo;인 그 이름은 장소이자 작업 방식을 가리킵니다. 도구와 판과, 매체의
                        인내심 있는 반복이 날마다 준비되어 있는 공간입니다.
                      </p>
                      <p>
                        가르치는 일은 그 삶의 일부였습니다. 한국현대판화가협회와 홍익판화가협회
                        회원인 그는 이전에 계원예술대학교와 계원예술학교에 출강했고, 2024년에는 EBS
                        협찬 실크스크린 워크샵 세 차례를 이끌었습니다. 2017년 전공서 《매일판화
                        처음이어도 괜찮아》는 공방의 정신을 책으로 옮깁니다 — 판화를 희귀한 기술이
                        아니라, 시작하려는 누구에게나 열린 매일의 작업으로 그립니다.
                      </p>
                      <p>
                        그의 작품은 대림창고갤러리, 아트스페이스 휴, 안산외국인산업지원센터 등에
                        소장되어 있습니다 — 마지막 한 곳은, 김종환에게 판화가 여전히 일상과 함께하는
                        노동에 가까운 매체임을 상기시킵니다. 공방은 세상으로부터의 후퇴가 아니라,
                        손작업을 세상에 열어두는 자리입니다.
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
                      From the printing block to the picture book, Kim Jong-hwan has pursued a
                      single craft in two directions: the discipline of the studio and the warmth of
                      an old tale, held together by the same carving hand. He joins this campaign
                      not as a subject of its cause but as a fellow artist in solidarity — so that
                      those who come after might keep working, block by block, page by page.
                    </>
                  ) : (
                    <>
                      판에서 그림책까지, 김종환은 하나의 손작업을 두 방향으로 밀고 왔습니다. 공방의
                      규율과 옛이야기의 따뜻함을, 같은 새김의 손이 함께 붙잡습니다. 그는 씨앗페에 이
                      캠페인의 대상으로서가 아니라, 동료 예술인과의 연대자로서 함께합니다 — 다음
                      세대의 예술인들이 한 판, 한 페이지씩 계속 일할 수 있도록.
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
              <span className="text-xs text-white/70 uppercase tracking-widest">Kim Jong-hwan</span>
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
                    Kim Jong-hwan joined this campaign in solidarity with fellow artists. Every work
                    sold flows directly into the{' '}
                    <strong className="text-white">artists&apos; mutual-aid loan fund</strong> — a
                    purchase becomes the next month&apos;s lifeline for an artist navigating
                    financial exclusion today.
                  </>
                ) : (
                  <>
                    김종환 작가는 동료 예술인을 위한 연대의 뜻으로 씨앗페에 함께했습니다. 작품 판매
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
                returnTo={KIM_JONGHWAN_PATH}
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
